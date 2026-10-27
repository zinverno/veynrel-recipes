# Protecting the publication checkpoint

`catalog-published` is an append-only chain of publication snapshots, not a source branch. `deploy.yml` validates the catalog against its previous tip, builds the site, creates a new snapshot with `git commit-tree -p origin/catalog-published`, then makes a normal fast-forward push **before** uploading the Pages artifact. It never force-pushes. The build job needs `contents: write`; the deploy job separately needs `pages: write` and `id-token: write`.

## Minimum protection compatible with the current workflow

In repository **Settings → Rules → Rulesets → New branch ruleset**:

1. Set enforcement to **Active** and target exactly `catalog-published` (`refs/heads/catalog-published` in the API).
2. Enable **Restrict deletions** and **Block force pushes**. Leave the bypass list empty, including for administrators and Apps.
3. Leave **Restrict updates** disabled, so ordinary fast-forward pushes using the current workflow's `GITHUB_TOKEN` remain permitted.
4. Do not require PRs, status checks, successful deployments or signed commits on this checkpoint branch. Its generated snapshot has a new SHA without source-branch checks or a signature, and reserving it must precede deployment. Apply source review/CI requirements to `main` instead. Exclude `catalog-published` from any broader rule imposing these requirements: matching rules stack.

This prevents deletion and history rewrites under the ruleset. **It does not restrict fast-forward updates to Actions:** any principal with repository write permission can still append a commit. The `github-actions[bot]` commit author is attribution, not authorization. Account administrators who can edit rules remain trusted.

## Optional restriction to a deployment App

For stronger writer isolation, use a dedicated installed GitHub App with repository-scoped **Contents: write** and an installation token minted only in the trusted deployment job. Use that token for checkout/push instead of assuming the built-in `GITHUB_TOKEN` can bypass restrictions.

Add a **separate** ruleset for exactly `catalog-published`: **Restrict updates**, with only that App in the bypass list, mode **Always allow** (the workflow pushes directly). Keep deletion/force-push protection in the first ruleset **without bypass**; otherwise the App would also be exempt from those safeguards. Do not expose the App key/token to fork-PR jobs. This option requires a workflow/token configuration change and is not implemented by this PR.

After enabling protection, dispatch the normal deployment workflow from a trusted source ref. Verify validation/build succeed, the checkpoint's single parent equals the previous tip, and artifact upload/deployment then succeed. Do not test destructive pushes against the real checkpoint. Protection changes themselves were not applied or tested in this fix; the observed branch was unprotected.

GitHub references: [available rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), [ruleset targeting and App bypass](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository), [App installation tokens in Actions](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow).
