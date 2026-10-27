# Veynrel Studio Community Library

Public, versioned declarative Recipes for [Veynrel Studio](https://github.com/zinverno/veynrel). Catalog, static website and Obsidian adapter have separate responsibilities. The website never executes recipes or receives notes. Installation in Studio is separate from model consent, Review and Apply.

Website: https://zinverno.github.io/veynrel-recipes/ (availability is verified in the implementation PR; a URL here is not a deployment receipt).

Requires Node 24, with **no npm dependencies**:

```sh
npm test
npm run validate
npm run build
```

Serve `dist/` at `/veynrel-recipes/`. It contains real HTML pages for every recipe version, a search/filter script, stylesheet, sitemap and public JSON. No backend, analytics, CDN scripts, accounts or runtime API key. Search matches both languages and tags; every page remains readable without JavaScript.

## Layout

- `catalog/v1/index.json`: strict metadata with author-written RU/EN examples.
- `catalog/v1/recipes/<public-id>/<stable-semver>.json`: immutable Recipe v1 bytes.
- `catalog/v1/entries/<public-id>/<stable-semver>.json`: immutable metadata archive, retained even after delisting. Relisting must match it exactly.
- `lib/catalog.ts`: executable strict Catalog v1 schema, sizes, canonical addresses and SHA-256 verification. Mirrored in the plugin; `lib/recipe.ts` vendors its existing Recipe v1 validator.
- `site/`, `scripts/build-site.mjs`: escaped static HTML and responsive Graphite & Amethyst styling.
- `scripts/validate-catalog.mjs`: schema, content, identity, sizes, references, hashes, operations and immutability checks. `CATALOG_BASE=<40-character-SHA>` compares against a published Git tree.
- `scripts/import-package.mjs`: explicitly imports a Studio publication package. It never reads a vault.

## Contract

`schemaVersion: 1`, `entries` array (at most 100 version entries, 512,000 UTF-8 bytes total). Every entry has **exactly**: `id`, `version`, `name`, `description`, `author`, `category`, `tags`, `compatibility`, `purpose`, `operations`, `limitations`, `examples`, `recipeUrl`, `sha256`. Each canonical metadata entry is at most 64,000 UTF-8 bytes; publication packages are at most 256,000 bytes. Unknown keys, unsupported types and versions are rejected, including nested objects.

Public IDs are lowercase ASCII slugs, at most 48 characters. Versions use numeric stable SemVer `MAJOR.MINOR.PATCH` (each part at most six digits, no leading zeros). Recipe v1 cannot represent prereleases, ranges or floating latest. Multiple versions of one ID are allowed; duplicate ID/version pairs are not. UI groups by public ID and compares version parts numerically.

Names (120 chars), descriptions/purpose (1,200), limitations (2,000), and each input/output example (6,000) have required `en` and `ru` strings. Author is `{name,url}` (name ≤100; canonical GitHub profile only). Categories: learning/work/writing/knowledge/daily. Tags: 1–8 unique strings ≤40 characters. Compatibility is exactly `{recipeSchema:1,studioApi:1}`: Studio API is a capability contract, not the plugin release version. `operations` has exactly the recipe's replace or append action. Recipes are at most 96,000 UTF-8 bytes and also obey the existing 24,000-character Recipe manifest limit.

`recipeUrl` must equal the one fixed Pages origin and canonical ID/version path, without credentials, query, fragment, port, encoding or traversal. The downloaded Recipe must use `source:user`, `id:user.<public-id>`, the same version/name/description/operation and matching SHA-256 of exact UTF-8 bytes. It permits only one `llm_transform` and Markdown output; no tools, executable code or external HTTP operations.

Published recipe bytes and retained version metadata are immutable. Add a new version to change content. An entry may be delisted; its published JSON remains preserved. Studio never deletes installed recipes when a listing disappears.

## Publishing the website

GitHub Pages uses the `deploy.yml` workflow and the `github-pages` environment. Manual dispatch permits preview deployment from the implementation PR without merging it. The workflow validates against `catalog-published`, reserves an independent, fast-forward checkpoint chain with the exact source tree **before** deployment, then uploads and deploys the static artifact. A failed deployment may still reserve versions; this conservative behavior prevents overwriting possibly published content. Main pushes deploy only after checks. No release or tag is created.

First-time setup, if API permission is unavailable: Settings → Pages → Source: GitHub Actions; allow the chosen reviewed branch in the `github-pages` environment; run Deploy community from that branch. Repository admin can bypass branch history and change the website; this is a trust boundary, not cryptographic authentication.

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), and the implementation PR for actual deployment and native evidence.
