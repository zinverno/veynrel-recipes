# Community UX reset

Base: main `183250019abf26f6f039002ca29b64f43d11bec0`, after PR #1 was verified merged. Branch `feat/community-ux-reset-v1`. Only static presentation, localized UI text and browser acceptance changed. No catalog bytes, schema, hashes, versions, asset limits, CI permissions, checkpoint or rulesets were changed. No Pages deployment was performed.

The landing page now puts task search and the catalog before the installation explanation. Recipe pages start with purpose and fictional before/after examples; full prompt, constraints, JSON and integrity remain accessible in disclosures. Installation instructions and JSON downloads are visibly separate and do not claim to launch Obsidian. Contribution guidance now targets the actual main branch.

RU/EN comes from existing authored catalog data; published recipes are not rewritten. The language switch controls presentation and carries the language in local links/query strings. No tracking, credentials, localStorage, fetch or backend. Without JavaScript both translations and every recipe link remain in the generated HTML.

Visual direction: compact matte graphite, restrained amethyst, system type and an independent light palette. Related primary references and adoption/rejection reasoning are in the plugin's `docs/studio-ux-references.md` (Linear March 12, 2026; Raycast May 14, 2026; current Cursor/n8n/tldraw/Obsidian/WCAG docs).

## Validation

29 existing tests passed, including asset protection and immutable publication constraints. Validation passed against both origin/main and origin/catalog-published. Local browser smoke passed with zero captured browser errors: search, categories, narrow/wide dark/light screens, Russian switch, real version-page links/JSON download, accessibility heading, contribution links and JavaScript-disabled static content. Raw report and logs: [evidence](ux-reset-evidence/).

## Local preview

From this checkout:

```sh
npm run build
mkdir -p /tmp/veynrel-catalog-preview
ln -s /tmp/veynrel-community-ux-reset/dist /tmp/veynrel-catalog-preview/veynrel-recipes
python -m http.server 8765 --bind 127.0.0.1 --directory /tmp/veynrel-catalog-preview
```

Open http://127.0.0.1:8765/veynrel-recipes/ (add `?lang=ru` for Russian). An existing preview directory should be reused rather than overwritten. Browser regression can be reproduced with `node scripts/browser-smoke.mjs /tmp/veynrel-site-<new-name>` after building.

Physical mobile, screen-reader speech and owner manual acceptance: NOT RUN. No full WCAG certification claim.
