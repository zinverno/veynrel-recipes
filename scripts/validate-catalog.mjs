import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCatalog, validateEntry, verifyRecipe, publicId, semver, COMMUNITY_LIMITS } from '../lib/catalog.ts';
import { parseRecipe } from '../lib/recipe.ts';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const recipePath = e => `catalog/v1/recipes/${e.id}/${e.version}.json`;
export const entryPath = e => `catalog/v1/entries/${e.id}/${e.version}.json`;
export async function regularFile(root, relative, max) {
  const parts = relative.split('/');
  for (let n = 1; n <= parts.length; n++) {
    const stat = await fs.lstat(path.join(root, ...parts.slice(0, n)));
    if (stat.isSymbolicLink() || n < parts.length && !stat.isDirectory() || n === parts.length && (!stat.isFile() || stat.size > max)) throw Error(`Invalid resource: ${relative}`);
  }
  return fs.readFile(path.join(root, relative), 'utf8');
}
export async function validateCatalog(root = ROOT, base = process.env.CATALOG_BASE) {
  const catalog = parseCatalog(await regularFile(root, 'catalog/v1/index.json', COMMUNITY_LIMITS.index));
  const recipes = new Map(), resources = new Map([['catalog/v1/index.json', await regularFile(root, 'catalog/v1/index.json', COMMUNITY_LIMITS.index)]]);
  const archived = new Map();
  for (const id of await fs.readdir(path.join(root, 'catalog/v1/entries'))) {
    if (!publicId(id) || (await fs.lstat(path.join(root, 'catalog/v1/entries', id))).isSymbolicLink()) throw Error('Invalid entry path');
    for (const name of await fs.readdir(path.join(root, 'catalog/v1/entries', id))) {
      const version = name.slice(0, -5);
      if (!name.endsWith('.json') || !semver(version) || archived.size >= 1000) throw Error('Invalid archived version');
      const e = validateEntry(JSON.parse(await regularFile(root, `catalog/v1/entries/${id}/${name}`, COMMUNITY_LIMITS.entry + 4000)));
      if (e.id !== id || e.version !== version) throw Error('Invalid archived identity');
      const raw = await regularFile(root, recipePath(e), COMMUNITY_LIMITS.recipe);
      await verifyRecipe(e, raw); archived.set(`${id}@${version}`, e); resources.set(recipePath(e), raw);
    }
  }
  for (const e of catalog.entries) if (JSON.stringify(archived.get(`${e.id}@${e.version}`)) !== JSON.stringify(e)) throw Error('Index must match immutable archived metadata');
  for (const e of catalog.entries) recipes.set(e.recipeUrl, (await verifyRecipe(e, await regularFile(root, recipePath(e), COMMUNITY_LIMITS.recipe))).recipe);
  let count = 0;
  for (const id of await fs.readdir(path.join(root, 'catalog/v1/recipes'))) {
    if (!publicId(id) || !(await fs.lstat(path.join(root, 'catalog/v1/recipes', id))).isDirectory() || (await fs.lstat(path.join(root, 'catalog/v1/recipes', id))).isSymbolicLink()) throw Error('Invalid recipe directory');
    for (const name of await fs.readdir(path.join(root, 'catalog/v1/recipes', id))) {
      const version = name.slice(0, -5);
      if (!name.endsWith('.json') || !semver(version) || ++count > 1000) throw Error('Invalid recipe path/count');
      const r = parseRecipe(await regularFile(root, `catalog/v1/recipes/${id}/${name}`, COMMUNITY_LIMITS.recipe));
      if (r.source !== 'user' || r.id !== `user.${id}` || r.version !== version) throw Error('Invalid recipe identity');
      if (!archived.has(`${id}@${version}`)) throw Error('Missing immutable archived metadata');
    }
  }
  if (base) {
    if (!/^[a-f0-9]{40}$/u.test(base)) throw Error('Base must be a pinned commit SHA');
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 4_000_000 });
    const files = git(['ls-tree', '-r', '--name-only', base, '--', 'catalog/v1/recipes', 'catalog/v1/entries']);
    for (const file of files.trim().split('\n').filter(Boolean)) {
      if (!/^catalog\/v1\/(?:recipes|entries)\/[a-z0-9-]+\/[0-9.]+\.json$/u.test(file)) throw Error('Invalid published path');
      if (await fs.readFile(path.join(root, file), 'utf8') !== git(['show', `${base}:${file}`])) throw Error(`Published recipe is immutable: ${file}`);
    }
    if (git(['ls-tree', '--name-only', base, '--', 'catalog/v1/index.json']).trim()) {
      const previous = parseCatalog(git(['show', `${base}:catalog/v1/index.json`]));
      for (const old of previous.entries) {
        const next = catalog.entries.find(e => e.id === old.id && e.version === old.version);
        if (next && JSON.stringify(next) !== JSON.stringify(old)) throw Error(`Published metadata is immutable: ${old.id}@${old.version}`);
      }
    }
  }
  return { catalog, recipes, resources };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { catalog } = await validateCatalog(); console.log(`Validated ${catalog.entries.length} catalog entries, schemas, paths, operations, examples and SHA-256.`);
}
