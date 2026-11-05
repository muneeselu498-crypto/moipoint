// Builds the page for Vercel. Vercel serves the page and passes /api and /uploads on to the Moi Point
// server, so the browser only ever sees one address. Logins stay first-party and nothing in the app changes.
//   API_ORIGIN=https://api.moipoint.in node vercel-build.mjs
// The output uses Vercel's Build Output API (.vercel/output), so Vercel needs no other settings.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHtml } from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = process.env.API_ORIGIN;
const api = String(raw || '').trim().replace(/\/+$/, '');
if (!raw) {
  console.error('API_ORIGIN is not set for this build. In Vercel: Settings → Environment Variables → add API_ORIGIN = https://api.moipoint.in for Production and Preview, then redeploy.');
  process.exit(1);
}
// passwords travel from Vercel to the server, so the server must be on https, with just its address and no path
if (!/^https:\/\/[^/\s]+$/.test(api)) {
  console.error(`API_ORIGIN is "${raw}", but it must be the server's https address only, like https://api.moipoint.in (no http, no IP:port, no /api at the end).`);
  process.exit(1);
}

const out = path.join(here, '.vercel', 'output');
const site = path.join(out, 'static');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(site, { recursive: true });
const html = buildHtml();
fs.writeFileSync(path.join(site, 'index.html'), html);
for (const f of fs.readdirSync(path.join(here, 'public'))) fs.cpSync(path.join(here, 'public', f), path.join(site, f), { recursive: true });

// The same page rules the server sends (pagePolicy in apps/api/src/main.ts). Keep the two in step.
const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
  (m) => `'sha256-${createHash('sha256').update(m[1].replace(/\r\n?/g, '\n')).digest('base64')}'`,
);
const policy = [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(' ')}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' data: blob:",
  'frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com',
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const page = { 'Content-Security-Policy': policy, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-cache' };
const config = {
  version: 3,
  routes: [
    // the server's data and saved files, passed straight through
    { src: '^/api/(.*)$', dest: `${api}/api/$1` },
    { src: '^/uploads/(.*)$', dest: `${api}/uploads/$1` },
    { src: '^/sw\\.js$', headers: { 'Cache-Control': 'no-cache' }, continue: true },
    { src: '^/(index\\.html)?$', headers: page, continue: true },
    { handle: 'filesystem' },
    // every other address is the app itself, so /EV050 and /r/EV050/001 open it
    { src: '^/(.*)$', dest: '/index.html', headers: page },
  ],
};
fs.writeFileSync(path.join(out, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
console.log(`Vercel output ready: ${fs.readdirSync(site).length} files, /api and /uploads go to ${api}`);
