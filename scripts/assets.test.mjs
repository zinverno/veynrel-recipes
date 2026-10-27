import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { buildSite } from './build-site.mjs';
import { ROOT, recipePath, validateCatalog } from './validate-catalog.mjs';

const assets = [['style.css', 64 * 1024], ['search.js', 16 * 1024], ['icon.svg', 8 * 1024]];
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'veynrel-assets-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const dir of ['catalog', 'site']) await fs.cp(path.join(ROOT, dir), path.join(root, dir), { recursive: true });
  await fs.mkdir(path.join(root, 'dist'));
  await fs.writeFile(path.join(root, 'dist/previous.txt'), 'previous build');
  return root;
}
async function refusesBeforeOutput(root) {
  await assert.rejects(buildSite(root));
  assert.deepEqual(await fs.readdir(path.join(root, 'dist')), ['previous.txt']);
  assert.equal(await fs.readFile(path.join(root, 'dist/previous.txt'), 'utf8'), 'previous build');
}
for (const [name, max] of assets) {
  for (const invalid of ['internal symlink', 'external symlink', 'missing file', 'oversized file', 'directory', 'FIFO']) {
    test(`static asset ${name}: rejects ${invalid} before changing dist`, async t => {
      const root = await fixture(t), asset = path.join(root, 'site', name);
      await fs.unlink(asset);
      if (invalid === 'internal symlink') {
        const target = path.join(root, 'private-fixture.txt'); await fs.writeFile(target, 'synthetic repository-private data'); await fs.symlink(target, asset);
      } else if (invalid === 'external symlink') {
        const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'veynrel-outside-fixture-'));
        t.after(() => fs.rm(outside, { recursive: true, force: true }));
        const target = path.join(outside, 'private-fixture.txt'); await fs.writeFile(target, 'synthetic outside-repository data'); await fs.symlink(target, asset);
      } else if (invalid === 'oversized file') await fs.writeFile(asset, Buffer.alloc(max + 1, 65));
      else if (invalid === 'directory') await fs.mkdir(asset);
      else if (invalid === 'FIFO') execFileSync('mkfifo', [asset]);
      await refusesBeforeOutput(root);
    });
  }
}

test('static assets: rejects a symlinked site directory before changing dist', async t => {
  const root = await fixture(t);
  await fs.rename(path.join(root, 'site'), path.join(root, 'site-original'));
  await fs.symlink('site-original', path.join(root, 'site'));
  await refusesBeforeOutput(root);
});

test('static assets: accepts exact size limits and publishes only fixed allowlist', async t => {
  const root = await fixture(t);
  for (const [name, max] of assets) await fs.writeFile(path.join(root, 'site', name), Buffer.alloc(max, 65));
  await fs.writeFile(path.join(root, 'site/unlisted.txt'), 'not public');
  await fs.symlink('../catalog/v1/index.json', path.join(root, 'site/unlisted-link'));
  const { output } = await buildSite(root);
  for (const [name, max] of assets) assert.deepEqual(await fs.readFile(path.join(output, name)), Buffer.alloc(max, 65));
  for (const name of ['unlisted.txt', 'unlisted-link', 'previous.txt']) await assert.rejects(fs.stat(path.join(output, name)), { code: 'ENOENT' });
});

test('build writes captured assets and Recipe JSON without reopening source files', async t => {
  const root = await fixture(t), { catalog } = await validateCatalog(root);
  const recipe = recipePath(catalog.entries[0]);
  const before = new Map();
  for (const relative of [...assets.map(([name]) => `site/${name}`), recipe]) before.set(relative, await fs.readFile(path.join(root, relative), 'utf8'));
  const rm = fs.rm;
  t.mock.method(fs, 'rm', async (...args) => {
    if (args[0] === path.join(root, 'dist')) {
      // Mutate sources after validation, immediately before output generation.
      for (const relative of before.keys()) await fs.writeFile(path.join(root, relative), 'SOURCE_CHANGED_AFTER_VALIDATION');
    }
    return rm(...args);
  });
  let output;
  try { ({ output } = await buildSite(root)); } finally { t.mock.restoreAll(); }
  for (const [relative, raw] of before) assert.equal(await fs.readFile(path.join(output, relative.replace(/^site\//u, '')), 'utf8'), raw);
  const e = catalog.entries[0];
  const html = await fs.readFile(path.join(output, `recipes/${e.id}/${e.version}/index.html`), 'utf8');
  assert(!html.includes('SOURCE_CHANGED_AFTER_VALIDATION'));
});
