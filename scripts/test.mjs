// Runs every test against a throwaway database, so your own data is never touched.
//   node scripts/test.mjs          all tests
//   node scripts/test.mjs api      server rules only
//   node scripts/test.mjs ui       real browser tests only
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = path.join(root, 'apps/api');
const PORT = 4610;
const DB = 'moipoint_test';
const url = `postgresql://moipoint@localhost:5544/${DB}`;
const env = { ...process.env, DATABASE_URL: url, PORT: String(PORT), HOST: '127.0.0.1', DEV_TOOLS: '1', SEED_DEMO: '1', MESSAGE_PROVIDER: 'dev', PAYMENT_PROVIDER: 'simulate', PUBLIC_URL: `http://localhost:${PORT}` };
const sh = process.platform === 'win32';

execFileSync('node', ['scripts/db.mjs', 'start'], { cwd: root, stdio: 'inherit' });
const psql = (sql) => execFileSync('node', ['scripts/db.mjs', 'sql', sql], { cwd: root, stdio: 'ignore' });
psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
psql(`CREATE DATABASE ${DB}`);

execFileSync('node', ['apps/web/build.mjs'], { cwd: root, stdio: 'ignore' });
execFileSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: api, env, stdio: 'ignore', shell: sh });
execFileSync('npx', ['ts-node', '--transpile-only', 'prisma/seed.ts'], { cwd: api, env, stdio: 'inherit', shell: sh });
execFileSync('npx', ['nest', 'build'], { cwd: api, env, stdio: 'inherit', shell: sh });

const server = spawn('node', ['dist/main.js'], { cwd: api, env, stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

for (let i = 0; i < 60; i++) {
  const ok = await fetch(`http://localhost:${PORT}/api/state`).then((r) => r.ok).catch(() => false);
  if (ok) break;
  await new Promise((r) => setTimeout(r, 500));
}

// a second copy with testing tools off, exactly as a real server would run
const PROD_PORT = 4611;
const prod = spawn('node', ['dist/main.js'], { cwd: api, env: { ...env, PORT: String(PROD_PORT), DEV_TOOLS: '0', PUBLIC_URL: `http://localhost:${PROD_PORT}` }, stdio: 'ignore' });
process.on('exit', () => prod.kill());
for (let i = 0; i < 60; i++) {
  const ok = await fetch(`http://localhost:${PROD_PORT}/api/state`).then((r) => r.ok).catch(() => false);
  if (ok) break;
  await new Promise((r) => setTimeout(r, 500));
}

const which = process.argv[2];
const sets = { api: ['tests/api.test.mjs'], ui: ['tests/ui.test.mjs'], prod: ['tests/prod.test.mjs'] };
const files = sets[which] ?? [...sets.api, ...sets.ui, ...sets.prod];
const run = spawnSync('node', ['--test', '--test-concurrency=1', ...files], { cwd: root, env: { ...env, BASE: `http://localhost:${PORT}`, PROD_BASE: `http://localhost:${PROD_PORT}` }, stdio: 'inherit' });
stop();
prod.kill();
process.exit(run.status ?? 1);
