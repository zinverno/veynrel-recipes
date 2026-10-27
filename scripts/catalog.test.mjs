import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { validateCatalog, ROOT, recipePath, entryPath } from './validate-catalog.mjs';
import { buildSite, escape } from './build-site.mjs';
import { parseCatalog, verifyRecipe, sha256, allowedResource, compareVersions } from '../lib/catalog.ts';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'veynrel-catalog-test-'));
  for (const dir of ['catalog', 'site']) await fs.cp(path.join(ROOT, dir), path.join(root, dir), { recursive: true });
  t.after(() => fs.rm(root, { recursive: true, force: true })); return root;
}
test('all public recipes have valid schemas, bilingual examples, hashes and safe operations', async () => {
  const { catalog, recipes } = await validateCatalog(); assert.equal(catalog.entries.length, recipes.size); assert(catalog.entries.length > 0);
  assert(compareVersions('1.10.0', '1.9.0') > 0);
});
test('invalid fields, versions, paths, types, duplicate IDs/versions and oversized data fail closed', async () => {
  const { catalog } = await validateCatalog(), e = catalog.entries[0];
  for (const patch of [{ id: '../escape' }, { version: '1.01.0' }, { version: 'latest' }, { version: '1.0.0-beta' }, { operations: ['shell'] }, { compatibility: { recipeSchema: 2, studioApi: 1 } }, { author: { name: 'X', url: 'http://localhost' } }, { examples: {} }, { extra: 1 }, { tags: ['x', 'x'] }, { description: { en: 'x'.repeat(1201), ru: 'x' } }]) {
    assert.throws(() => parseCatalog(JSON.stringify({ schemaVersion: 1, entries: [{ ...e, ...patch }] })));
  }
  assert.throws(() => parseCatalog('{')); assert.throws(() => parseCatalog('я'.repeat(512_000)));
  assert.throws(() => parseCatalog(JSON.stringify({ schemaVersion: 1, entries: [e, e] })));
  for (const url of ['http://127.0.0.1', 'https://169.254.169.254', e.recipeUrl + '?x=1', e.recipeUrl.replace('/recipes/', '/recipes/../'), e.recipeUrl.replace('github.io', 'github.io.evil')]) assert(!allowedResource(url));
});
test('hash mismatches and executable/foreign manifests are refused', async () => {
  const { catalog } = await validateCatalog(), e = catalog.entries[0], raw = await fs.readFile(path.join(ROOT, recipePath(e)), 'utf8');
  await assert.rejects(verifyRecipe(e, raw + ' '));
  for (const patch of [{ source: 'builtin', id: 'builtin.fake' }, { steps: [{ type: 'javascript', prompt: 'x' }] }, { steps: [{ type: 'llm_transform', prompt: 'x', url: 'http://localhost' }] }, { output: { format: 'markdown', action: 'delete' } }, { id: 'user.foreign' }]) {
    const bad = JSON.stringify({ ...JSON.parse(raw), ...patch }); await assert.rejects(verifyRecipe({ ...e, sha256: await sha256(bad) }, bad));
  }
});
test('missing files and symlinks cannot escape catalog validation', async t => {
  const root = await fixture(t), e = (await validateCatalog(root)).catalog.entries[0], file = path.join(root, recipePath(e));
  await fs.rename(file, file + '.old'); await assert.rejects(validateCatalog(root)); await fs.symlink(file + '.old', file); await assert.rejects(validateCatalog(root));
});
test('published bytes and metadata are immutable against a pinned baseline', async t => {
  const root = await fixture(t), git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '-q']); git(['add', 'catalog', 'site']); git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']); const base = git(['rev-parse','HEAD']).trim();
  await validateCatalog(root, base);
  const e = (await validateCatalog(root)).catalog.entries[0], file = path.join(root, recipePath(e));
  await fs.appendFile(file, '\n'); await assert.rejects(validateCatalog(root, base)); git(['restore', '--', recipePath(e)]);
  const idx = path.join(root,'catalog/v1/index.json'), catalog = JSON.parse(await fs.readFile(idx,'utf8')); catalog.entries[0].purpose.en = 'Changed without a version'; await fs.writeFile(idx,JSON.stringify(catalog));
  await assert.rejects(validateCatalog(root,base));
  await fs.writeFile(path.join(root,entryPath(catalog.entries[0])),JSON.stringify(catalog.entries[0]));
  await assert.rejects(validateCatalog(root,base), /immutable/);
});
test('generated static pages have working internal links and escaped untrusted content', async t => {
  const root = await fixture(t), idx = path.join(root, 'catalog/v1/index.json'), catalog = JSON.parse(await fs.readFile(idx, 'utf8'));
  const e = catalog.entries[0], file = path.join(root, recipePath(e)), recipe = JSON.parse(await fs.readFile(file, 'utf8')), attack = '<img src=x onerror="alert(1)"> & \'quote\'';
  e.name.en = recipe.name.en = attack; e.description.en = recipe.description.en = attack; recipe.steps[0].prompt = attack; e.examples.input.en = attack;
  const raw = JSON.stringify(recipe); e.sha256 = await sha256(raw); await fs.writeFile(file, raw); await fs.writeFile(idx, JSON.stringify(catalog)); await fs.writeFile(path.join(root,entryPath(e)),JSON.stringify(e));
  await fs.writeFile(path.join(root,'catalog/v1/examples/unchecked.html'),'<script>alert(1)</script>');
  const { output, pages } = await buildSite(root); assert.equal(pages, catalog.entries.length + 3);
  await assert.rejects(fs.stat(path.join(output,'catalog/v1/examples/unchecked.html')));
  const files = await fs.readdir(output, { recursive: true });
  for (const file of files.filter(f => f.endsWith('.html'))) {
    const html = await fs.readFile(path.join(output, file), 'utf8'); assert(!html.includes('<img')); assert(html.includes('Content-Security-Policy'));
    for (const [, link] of html.matchAll(/(?:href|src)="(\/veynrel-recipes\/[^"#]*)"/gu)) {
      const target = link.slice('/veynrel-recipes/'.length); assert((await fs.stat(path.join(output, target.endsWith('/') || !target ? target+'index.html' : target))).isFile(), link);
    }
  }
  const detail = await fs.readFile(path.join(output, `recipes/${e.id}/${e.version}/index.html`),'utf8'); assert(detail.includes(escape(attack)));
});
