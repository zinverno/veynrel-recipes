# Propose a Recipe

1. Create a **user recipe** in Studio. Check its entire instruction, defaults, output action and constraints for private information or unsafe claims.
2. Open its details → **Prepare community submission**. Enter a public slug, your name and GitHub profile, category/tags, purpose, known risks and explicitly authored fictional input/output examples in **both RU and EN**. Never use personal vault notes as examples without deliberate publication rights and consent.
3. Confirm you reviewed the contents. Export the package; save the displayed JSON as `submission.json`. This exports only the recipe and your form fields. Default additional instructions are cleared. It does not collect notes, Reviews, journals, API keys, run parameters or local history. Nothing is uploaded automatically.
4. Fork this repository and create a feature branch. **Until the initial catalog PR is merged, `main` contains only the repository foundation.** In your cloned fork, start from the published implementation branch:

```sh
git remote add upstream https://github.com/zinverno/veynrel-recipes.git
git fetch upstream feat/community-library-v1
git switch -c recipe/my-recipe FETCH_HEAD
```

Use `feat/community-library-v1` as the PR base during this preview. After the initial catalog PR is merged, start from `upstream/main` and target `main`. Then with Node 24 run:

```sh
node scripts/import-package.mjs submission.json
npm test
npm run build
git diff -- catalog
```

5. Verify `catalog/v1/index.json` and your `catalog/v1/recipes/<id>/<version>.json`. Commit only intended public files. The temporary `submission.json` is ignored. Open a [pull request](https://github.com/zinverno/veynrel-recipes/compare) and complete the template.

For an update, retain the ID, increment its stable SemVer numerically, export the new version and add it alongside old versions. Never rewrite published versions or hashes. Examples are normative illustrations of intended behavior, not claims of measured LLM accuracy.

## Manual moderation

CI rejects malformed JSON, extra fields, incompatible schemas, duplicate ID/version pairs, size violations, malformed references, hash mismatches, builtin impersonation and unsupported steps/actions. CI verifies the full Recipe, not just index metadata. It refuses edits to bytes published on `catalog-published` and to existing versions on the PR base.

Reviewers must read the prompt and all examples, check authorship/licensing, scope and known risks, and check that the claimed output is possible. A passing schema does not prove instruction safety, factual quality, resistance to prompt injection or usefulness. No arbitrary JavaScript/shell/HTTP/plugin actions; no guaranteed factual accuracy; no hidden downloads or requests for credentials. Prose that resembles code is data, not executable permission.

All contributions are MIT licensed. Add a new version for corrections. A security-related listing can be delisted without deleting users' installed copies; communicate necessary action in the repository.

## Русский

Создайте пользовательский сценарий в Studio и проверьте весь текст. В «Подготовить публикацию в Community» самостоятельно заполните примеры RU/EN, назначение, риски и данные автора. Сохраните проверенный JSON пакета, импортируйте его командой выше в свой fork и откройте PR. Публикация модерируется вручную. Заметки и история не извлекаются автоматически; приватные сведения в самом промпте должен проверить автор.
