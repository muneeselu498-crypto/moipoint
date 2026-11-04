// Runs a private PostgreSQL just for Moi Point, in .local/pgdata on its own port.
// It uses the PostgreSQL programs already on this computer and never touches other databases.
//   node scripts/db.mjs start | stop | status | reset
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.MOIPOINT_DB_PORT || 5544);
const DATA = path.join(root, '.local', 'pgdata');
const LOG = path.join(root, '.local', 'postgres.log');
const DB = 'moipoint';
const USER = 'moipoint';

function findBin() {
  if (process.env.PGBIN) return process.env.PGBIN;
  const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['pg_ctl'], { encoding: 'utf8' });
  if (onPath.status === 0) return path.dirname(onPath.stdout.split(/\r?\n/)[0].trim());
  if (process.platform === 'win32') {
    const base = 'C:\\Program Files\\PostgreSQL';
    if (fs.existsSync(base)) {
      const v = fs.readdirSync(base).sort((a, b) => Number(b) - Number(a))[0];
      if (v) return path.join(base, v, 'bin');
    }
  }
  throw new Error('PostgreSQL programs not found. Install PostgreSQL, or set PGBIN to its bin folder.');
}
const bin = (name) => path.join(findBin(), process.platform === 'win32' ? `${name}.exe` : name);
const run = (name, args, opts = {}) => execFileSync(bin(name), args, { stdio: 'pipe', encoding: 'utf8', ...opts });

function listening() {
  return new Promise((resolve) => {
    const s = net.connect({ port: PORT, host: '127.0.0.1' });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });
}

async function start() {
  if (await listening()) { console.log(`Database already running on port ${PORT}`); return; }
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  if (!fs.existsSync(path.join(DATA, 'PG_VERSION'))) {
    console.log('Creating the Moi Point database folder...');
    run('initdb', ['-D', DATA, '-U', USER, '--auth=trust', '--encoding=UTF8', '--locale=C']);
    fs.appendFileSync(path.join(DATA, 'postgresql.conf'), `\nport = ${PORT}\nlisten_addresses = 'localhost'\n`);
  }
  // pg_ctl -w keeps the handle open on Windows, so start it detached and wait on the port instead
  const child = spawnSync(bin('pg_ctl'), ['-D', DATA, '-l', LOG, '-o', `-p ${PORT}`, '-W', 'start'], { stdio: 'ignore', windowsHide: true });
  if (child.status !== 0 && child.status !== null) throw new Error(`pg_ctl start failed (${child.status}). See ${LOG}`);
  for (let i = 0; i < 60 && !(await listening()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await listening())) throw new Error(`Database did not start. See ${LOG}`);
  const has = run('psql', ['-h', 'localhost', '-p', String(PORT), '-U', USER, '-d', 'postgres', '-tAc', `select 1 from pg_database where datname='${DB}'`]).trim();
  if (has !== '1') run('createdb', ['-h', 'localhost', '-p', String(PORT), '-U', USER, DB]);
  console.log(`Database ready: postgresql://${USER}@localhost:${PORT}/${DB}`);
}

function stop() {
  if (!fs.existsSync(path.join(DATA, 'PG_VERSION'))) return console.log('No database folder yet.');
  const r = spawnSync(bin('pg_ctl'), ['-D', DATA, '-m', 'fast', 'stop'], { encoding: 'utf8' });
  console.log(r.status === 0 ? 'Database stopped' : 'Database was not running');
}

async function reset() {
  stop();
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log('Database folder removed');
  await start();
}

const cmd = process.argv[2] || 'status';
if (cmd === 'start') await start();
else if (cmd === 'stop') stop();
else if (cmd === 'reset') await reset();
else if (cmd === 'sql') console.log(run('psql', ['-h', 'localhost', '-p', String(PORT), '-U', USER, '-d', 'postgres', '-c', process.argv[3]]));
else console.log((await listening()) ? `running on ${PORT}` : 'stopped');
