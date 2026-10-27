# Public website evidence

Published website https://zinverno.github.io/veynrel-recipes/ passed **13 browser checks** in isolated Chromium: real static pages, RU/EN search, categories, JSON download, contribution links, accessible heading, dark/light and 1200/390 px layouts. **Zero browser errors.** Recorded browser requests are bodyless GETs to the site origin only. See [raw report](browser-public.json), screenshots and [checksums](SHA256SUMS).

Deployment [40441180389](https://github.com/zinverno/veynrel-recipes/actions/runs/40441180389) succeeded from `a29a537815d5ca2f0ba5b28e6066823eb8873204`. The initially rejected deployment was caused by the automatically created environment policy allowing only main; the exact implementation branch was added, preserving the existing policy. No PR was merged.

Catalog validation: **8 tests passed**, covering full metadata/Recipe contracts, invalid operations/fields/versions/URLs/sizes, hashes, links, symlinks, version immutability, delisting archives and untrusted HTML escaping. The build publishes only verified catalog resources.

The Veynrel native harness additionally used the production HTTPS transport to install a public Recipe, restart Obsidian and run it through existing consent/Review/Apply/Undo in a disposable synthetic vault. It exported a publication package that imported, validated and generated a new page in a separate test copy. That synthetic submission was not published. Model-quality evaluation was not performed.

Reproduce with Node 24 and Chromium installed:

```sh
npm test
npm run build
SITE_PUBLIC=1 node scripts/browser-smoke.mjs /tmp/veynrel-site-UNIQUE
```

The earlier local favicon 404 was fixed with the owned SVG icon. An initial public harness search failure was a readiness race; the final harness waits for the deferred search script to initialize. No assertions were weakened.
