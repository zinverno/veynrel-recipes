import fs from 'node:fs/promises';
import path from 'node:path';
import { object, ensure } from '../lib/recipe.ts';
import { parseCatalog, verifyRecipe, bytes, COMMUNITY_LIMITS } from '../lib/catalog.ts';
import { ROOT, recipePath, entryPath } from './validate-catalog.mjs';

const input = process.argv[2];
if (!input || (await fs.stat(input)).size > COMMUNITY_LIMITS.publication) throw Error('Usage: node scripts/import-package.mjs submission.json (max 256 KB)');
const raw = await fs.readFile(input, 'utf8'); ensure(bytes(raw) <= COMMUNITY_LIMITS.publication, 'size');
const v = JSON.parse(raw); ensure(object(v, ['schemaVersion', 'entry', 'recipe']) && v.schemaVersion === 1 && typeof v.recipe === 'string', 'recipe');
const { entry } = await verifyRecipe(v.entry, v.recipe);
const indexPath = path.join(ROOT, 'catalog/v1/index.json'), index = parseCatalog(await fs.readFile(indexPath, 'utf8'));
ensure(!index.entries.some(e => e.id === entry.id && e.version === entry.version), 'conflict');
const next = JSON.stringify({ schemaVersion: 1, entries: [...index.entries, entry] }, null, 2) + '\n'; parseCatalog(next);
const dest = path.join(ROOT, recipePath(entry)); await fs.mkdir(path.dirname(dest), { recursive: true });
const archive = path.join(ROOT, entryPath(entry)); await fs.mkdir(path.dirname(archive), { recursive: true });
await fs.writeFile(dest, v.recipe, { flag: 'wx' }); await fs.writeFile(archive, JSON.stringify(entry, null, 2) + '\n', { flag: 'wx' }); await fs.writeFile(indexPath, next);
console.log('Imported public package. Run npm test && npm run build, inspect git diff, then open your PR.');
