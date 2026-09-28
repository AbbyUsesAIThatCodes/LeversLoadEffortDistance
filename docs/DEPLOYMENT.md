# Publish With GitHub Pages

The repository's **Deploy Pages** workflow installs dependencies, runs the
model/geometry checks, builds the game, and publishes only the finished `dist/`
folder. GitHub Actions is the correct Pages source for this build.

## First Deployment

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Merge the PR that adds `.github/workflows/pages.yml` into `main`. The workflow
   is already supplied by this repository; leave the workflow suggestions alone.
4. Open **Actions → Deploy Pages** and open the newest run for `main`.
5. Wait for **Test and Build** and **Publish to GitHub Pages** to succeed. The
   deployment job links to the site. **Settings → Pages → Visit site** also
   provides the authoritative published address.

The expected project URL, without a custom domain, is:

<https://AbbyUsesAIThatCodes.github.io/LeversLoadEffortDistance/>

This address becomes available after a successful deployment. Publishing does
not by itself complete the classroom release verification in Issue #3.

## Future Updates

Merging changes into `main` automatically tests, rebuilds, and redeploys the game.
PRs run the build/model checks but cannot publish a Pages deployment. Both the
artifact upload and deployment are restricted to `main`.

To retry manually, open **Actions → Deploy Pages → Run workflow**, choose
**main**, and run it. That button appears once the workflow is on the default
branch. A manual run from another branch can check its build but does not deploy.

## If the Site Does Not Appear

- If the workflow is missing, check that the deployment PR was merged into `main`.
- If no run starts, check **Settings → Actions → General** to see whether Actions
  or the required GitHub-owned actions are disabled for this repository.
- If a job is red, open it and expand the first failed step. Build failures and
  deployment failures have separate jobs, so the failing stage is clear.
- If the deployment says it is waiting for approval, review the `github-pages`
  environment's configured approval and branch rules under **Settings →
  Environments**. Follow those rules; the workflow does not bypass them.
- If Configure Pages reports that the site is missing, return to **Settings →
  Pages** and confirm the source is **GitHub Actions**.
- If the browser still shows an older version after a successful deployment,
  reload without cache (Ctrl+F5 on Windows).

The game uses relative asset paths, so the repository-name prefix is supported.
GitHub owns the publishing credentials; no personal access token or repository
secret needs to be added. Browser/device classroom checks remain separate from
this lightweight deployment workflow.

Reference: [GitHub's Custom Pages Workflow Documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Build Identity and Review Downloads

Every build reserves its own identity; same-repository PR counters live in the
`build-identity-ledger` branch. The build job uses contents write permission for
that ledger only; PR artifacts do not deploy. Download the artifact named with
the complete identifier from the Test and Build job. Its manifest and report
identify exactly what was tested. Pages carries the same manifest to the hosted
`build-manifest.json`; deploying an existing artifact does not change its ID.
See [Build Identity](BUILD_IDENTITY.md).
