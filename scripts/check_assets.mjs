import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadModule } from './load_source.mjs';

const root = path.resolve('public');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const filename = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(filename) : [filename];
});
const urls = new Set();
const collect = value => {
  if (typeof value === 'string' && value.startsWith('/portfolio-assets/')) urls.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
};
collect(await loadModule('src/data/portfolio.ts'));
collect(await loadModule('src/data/software.ts'));
for (const filename of walk('src')) {
  for (const match of fs.readFileSync(filename, 'utf8').matchAll(/\/portfolio-assets\/[^\s'"`)]+\.(?:png|jpe?g|webp|gif|webm|mp4|glb)/g)) urls.add(match[0]);
}
['draco_decoder.js', 'draco_wasm_wrapper.js', 'draco_decoder.wasm'].forEach(name => urls.add(`/vendor/draco/${name}`));
const base = process.argv.find(value => value.startsWith('--url='))?.slice(6);
let bytes = 0;
for (const url of urls) {
  const filename = path.resolve(root, `.${url}`);
  assert.ok(filename.startsWith(`${root}${path.sep}`), `Asset outside public: ${url}`);
  assert.ok(fs.existsSync(filename), `Missing asset: ${url}`);
  const size = fs.statSync(filename).size;
  assert.ok(size > 0, `Empty asset: ${url}`);
  bytes += size;
  if (base) {
    const response = await fetch(new URL(url, base), { method: 'HEAD' });
    assert.equal(response.status, 200, `HTTP ${response.status}: ${url}`);
    assert.ok(!response.headers.get('content-type')?.includes('text/html'), `HTML fallback instead of media: ${url}`);
    assert.equal(Number(response.headers.get('content-length')), size, `Unexpected asset size: ${url}`);
  }
}
const unused = walk(root).filter(filename => /\.(png|jpe?g|webp|gif|mp4|webm|glb|svg)$/i.test(filename))
  .filter(filename => !urls.has(`/${path.relative(root, filename).split(path.sep).join('/')}`));
console.log(JSON.stringify({ assets: urls.size, totalMiB: +(bytes / 1048576).toFixed(2), unusedMedia: unused.map(filename => path.relative(root, filename)), httpChecked: Boolean(base) }, null, 2));
assert.equal(unused.length, 0, 'Unreferenced public media: review before uploading');
