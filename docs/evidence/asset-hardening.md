# Static asset validation evidence

Follow-up in existing [PR #1](https://github.com/zinverno/veynrel-recipes/pull/1), 2026-10-27. Starting HEAD: `de81435af99ea3485270d792352a024794f82f63`. Tested implementation: `c1a50735c6b0ad298b5ec0567cf0de6a1df6aef0`. The following evidence-only commit does not change the implementation or generated site.

## Verified invariants

- The fixed asset allowlist is `style.css` (65,536 bytes), `search.js` (16,384 bytes), `icon.svg` (8,192 bytes). The existing `regularFile` helper uses `lstat` on each path component, rejects symlinks and non-directory parents, and requires a regular final file within its byte limit.
- All three assets are checked and read before deleting or writing `dist`. For each asset, tests reject an internal symlink, external symlink, missing file, oversized file, directory and FIFO. Each refusal preserves the previous output file and directory contents. A symlinked `site/` is also rejected.
- Exact size limits succeed. Extra files/symlinks in `site/` are not published. A successful build removes stale output.
- Output uses captured asset content and the validator's Recipe resource map. A test changes all asset sources and one Recipe after validation, immediately before output generation: generated files still contain the validated snapshots, and the HTML never includes the replacement text.
- Catalog tree remains `fa5a56fa60d88d0c8c796b5e8b24ae9dc5df271b`. Recipe bytes, SHA-256 metadata, published versions, validator, original tests, library schemas and workflows have **no changes** from the starting HEAD.

## Results

| Check | Observed result |
| --- | --- |
| Regression before fix | All 12 initial negative cases failed against the old builder: symlink/oversized assets were accepted; missing files failed after modifying `dist`. |
| Complete test suite | **29/29 passed**, including 21 new asset/snapshot cases and all 8 existing catalog tests. [Local transcript](asset-hardening-tests.txt). |
| Local validation/build | Validation with no baseline, pinned PR base `da0e774e90df02fbe22542ae9388c8265cd7f8d0` and pinned publication `130a94c1ce6203773c3bfa1db871031136748b20` passed; build produced 11 pages. |
| CLI refusal | In a disposable checkout, `style.css` linked to a catalog Recipe: `node scripts/build-site.mjs` exited **1**, reported `Invalid resource: site/style.css`, and preserved the previous `dist` unchanged. |
| GitHub full CI | [40501052731](https://github.com/zinverno/veynrel-recipes/actions/runs/40501052731) **success**: 29 tests, PR-base and publication-baseline validation, build. |
| Pages workflow | [40501082351](https://github.com/zinverno/veynrel-recipes/actions/runs/40501082351) **success**, both build and deploy jobs. |
| Publication checkpoint | New `2ee56b1cf7bb12d2909fb2380ee7421e8259e1de` has exactly one parent, previous tip `130a94c1ce6203773c3bfa1db871031136748b20`; tree equals implementation commit tree. |
| Public output | All **25** served HTML/CSS/JS/SVG/JSON/XML/TXT resources returned HTTP 200 and matched the new local build byte-for-byte, both before and after deployment. |
| Browser regression | Isolated Chromium on the new local build: **13 checks**, zero errors; RU/EN search, category, detail/download, contribution links, accessible heading, dark/light, 1200/390 px. |

[Machine-readable receipts](asset-hardening-results.json) contain CI/deploy step conclusions, CLI result, browser assertions and public resource SHA-256 values. Browser screenshots from this rerun are not archived; existing screenshots/native evidence remain historical. The first sandbox run could not spawn required `git`/`mkfifo` subprocesses (`EPERM`); the complete suite was rerun on the host and in GitHub Actions without weakening tests.

## Audit of other paths into dist

`build-site.mjs` is the sole production writer. Its inputs are now captured allowlisted assets, the validated catalog resource map, and generated/escaped HTML plus literal sitemap/robots/marker content. The former second Recipe read for the detail page was removed. No recursive copy or `copyFile` remains in the production builder. `fs.cp` occurs only in disposable test fixtures; the importer writes catalog source files; the browser harness reads output and writes evidence outside `dist`.

In `deploy.yml`, tests, immutable-baseline validation and `npm run build` precede checkpoint creation and artifact upload. There is no failure override; the deployment job depends on successful build. Therefore an asset rejection stops publication even if an older local `dist` exists. No deliberately invalid artifact was uploaded or deployed to the real site.

## Boundary and branch protection

This validates filesystem type, path and size; it does not certify the semantics of repository-owned CSS/JS/SVG. Checkout/build code and runner remain trusted. As with the existing helper, `lstat` followed by read is not an atomic defense against a hostile process modifying the filesystem during validation. Sources are not reopened during output generation; the test covers that later mutation window only.

`catalog-published` was observed **unprotected**, with no repository rulesets. Protection was not changed. [Configuration instructions](../catalog-published-protection.md) explain deletion/force-push protection that permits the current Actions fast-forward updates, and optional separate App-only writer restrictions. No merge or auto-merge was performed. Native Obsidian was not rerun for this static-builder-only fix.

Reproduce on Linux with Node 24:

```sh
npm test
CATALOG_BASE=da0e774e90df02fbe22542ae9388c8265cd7f8d0 npm run validate
CATALOG_BASE=130a94c1ce6203773c3bfa1db871031136748b20 npm run validate
npm run build
node scripts/browser-smoke.mjs /tmp/veynrel-site-UNIQUE
```
