import { cfg, lanAddresses } from './config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import 'reflect-metadata';
import { AppModule } from './app.module';

const index = path.join(cfg.webDist, 'index.html');
let policy = { builtAt: 0, value: '' };

/**
 * Only the scripts built into the page may run. Names, notes and photos come from other people,
 * so even if one slips into the markup, the browser refuses to run it.
 */
function pagePolicy() {
  const builtAt = fs.statSync(index).mtimeMs;
  if (builtAt === policy.builtAt) return policy.value;
  const html = fs.readFileSync(index, 'utf8');
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1].replace(/\r\n?/g, '\n')).digest('base64')}'`,
  );
  const value = [
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
  policy = { builtAt, value };
  return value;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', cfg.trustProxy);
  app.disable('x-powered-by');
  app.use(cookieParser());
  // photos travel inside records until they reach the server
  app.use(express.json({ limit: '40mb' }));

  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Browsers won't add this header on a request forged from another site, which stops cross-site attacks.
  app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const safe = req.method === 'GET' || req.method === 'HEAD' || req.path.startsWith('/webhooks/');
    if (!safe && req.headers['x-moipoint'] !== '1') return res.status(403).json({ error: 'Not allowed' });
    next();
  });

  app.use('/uploads', express.static(cfg.uploadDir, { maxAge: '30d', immutable: true }));
  app.use(express.static(cfg.webDist, {
    index: false,
    setHeaders: (res, p) => {
      if (p.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
      if (p.endsWith('index.html')) res.setHeader('Content-Security-Policy', pagePolicy());
    },
  }));

  // Every other page address is the app itself, so links like /EV003 and /r/EV003/001 open it
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/dev') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Security-Policy', pagePolicy());
    res.sendFile(index);
  });

  await app.listen(cfg.port, cfg.host);
  const log = new Logger('MoiPoint');
  log.log(`Open on this laptop:  http://localhost:${cfg.port}`);
  if (cfg.host === '0.0.0.0') lanAddresses().forEach((a) => log.log(`Open on a phone (same Wi-Fi):  http://${a}:${cfg.port}`));
  if (cfg.devTools) log.log(`Dev Outbox:  http://localhost:${cfg.port}/dev/outbox`);
}

bootstrap();
