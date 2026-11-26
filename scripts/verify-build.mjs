import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';

const dist = resolve('dist');
const html = await readFile(join(dist, 'index.html'), 'utf8');
assert.match(html, /VSUPRO/);
assert.ok(!(html.includes('localhost:') || html.includes('/src/')), 'Production HTML must not refer to the dev server or source files');
await stat(join(dist, '.nojekyll'));

const assets = await readdir(join(dist, 'assets'));
assert.ok(assets.some(file => /^packet\.worker-.*\.js$/.test(file)), 'Worker bundle is missing');
assert.equal(assets.filter(file => file.endsWith('.ttf')).length, 6, 'All six local fonts must be bundled');
const licenses = await readdir(join(dist, 'licenses'));
assert.equal(licenses.filter(file => file.endsWith('-OFL.txt')).length, 6, 'All font licenses must ship with the site');

let references = 0;
const files = ['index.html', ...assets.filter(name => /\.(js|css)$/.test(name)).map(name => `assets/${name}`)];
for (const name of files) {
  const file = join(dist, name), source = await readFile(file, 'utf8');
  assert.ok(!/https:\/\/(fonts\.googleapis|fonts\.gstatic)\.com/.test(source), 'Runtime fonts must be local');
  const refs = new Set([...source.matchAll(/["'(]([^"'()\s]+\.(?:js|css|ttf|svg))["')]/g)].map(match => match[1]));
  for (const reference of refs) {
    if (/^(?:https?:|data:)/.test(reference)) continue;
    assert.ok(!reference.startsWith('/'), `Root-relative asset breaks repository hosting: ${reference}`);
    const target = resolve(dirname(file), reference);
    assert.ok(target.startsWith(`${dist}/`), `Asset escapes dist: ${reference}`);
    assert.ok((await stat(target)).isFile(), `Missing asset: ${reference}`);
    references++;
  }
}
console.log(`Production checks passed: ${references} local asset references, worker bundle, six fonts, and font licenses.`);
