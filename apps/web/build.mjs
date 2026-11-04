// Builds the single page the browser loads, from the source files in src/.
// The script parts are joined in the fixed order in src/js/order.json, because later parts
// deliberately override earlier ones. Do not reorder them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'src');
const dist = path.join(here, 'dist');
const read = (p) => fs.readFileSync(path.join(src, p), 'utf8');

export function buildHtml() {
  const order = JSON.parse(read('js/order.json'));
  const js = order.map((f) => read(`js/${f}`)).join('\n');
  const css = read('styles/app.css');
  const manifest = JSON.parse(read('assets/shots/manifest.json'));
  const shots = manifest.items
    .map((it) => {
      const value = it.raw ?? `data:${it.mime};base64,${fs.readFileSync(path.join(src, 'assets/shots', it.file)).toString('base64')}`;
      return `${JSON.stringify(it.key)}: ${JSON.stringify(value)}`;
    })
    .join(', ');
  return read('index.template.html')
    .replace('/*@@CSS@@*/', () => css)
    .replace('<!--@@SHOTS@@-->', () => `<script>window.SHOTS={${shots}}${manifest.tail}</script>`)
    .replace('/*@@JS@@*/', () => js);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), buildHtml());
  for (const f of fs.readdirSync(path.join(here, 'public'))) {
    fs.cpSync(path.join(here, 'public', f), path.join(dist, f), { recursive: true });
  }
  console.log('built', path.join(dist, 'index.html'), fs.statSync(path.join(dist, 'index.html')).size, 'bytes');
}
