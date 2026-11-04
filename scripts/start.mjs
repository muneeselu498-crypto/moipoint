// Starts everything Moi Point needs on this computer. Run with: npm start
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = path.join(root, 'apps/api');
const sh = process.platform === 'win32';
const step = (text) => console.log(`\n> ${text}`);
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: sh && cmd === 'npx' });

if (!fs.existsSync(path.join(api, '.env'))) {
  step('Creating apps/api/.env from the example');
  fs.copyFileSync(path.join(api, '.env.example'), path.join(api, '.env'));
}
step('Starting the database');
run('node', ['scripts/db.mjs', 'start']);
step('Updating the database');
run('npx', ['prisma', 'generate'], api);
run('npx', ['prisma', 'migrate', 'deploy'], api);
run('npx', ['ts-node', '--transpile-only', 'prisma/seed.ts'], api);
step('Building the app');
run('node', ['apps/web/build.mjs']);
run('npx', ['nest', 'build'], api);

step('Starting Moi Point. Press Ctrl+C to stop.\n');
const server = spawn('node', ['dist/main.js'], { cwd: api, stdio: 'inherit' });
server.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => server.kill());
