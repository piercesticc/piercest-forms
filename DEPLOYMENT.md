# Deployment guide

**Canonical address: https://piercesticchub.org/forms/** (behind the clinic password).

The app is served by the Pierce St clinic hub, not from this repo directly. The hub's release
build copies this folder's `index.html` to `/forms/` and ships it with everything else.

## To publish a change

1. Edit `index.html` here (it is the hand-maintained single file — the build script refuses to
   overwrite it without `--force`). Keep the per-form source files (`initial-contact.html`,
   `data/*-schema.js`, …) in step with it.
2. Commit and push to `main` of `piercesticc/piercest-forms`.
3. **Pushing here does not redeploy the hub.** The hub's GitHub Action checks this repo out at
   build time, but only runs on pushes to the hub repo. Start it by hand:
   `gh workflow run deploy.yml --repo piercesticc/pierce-hub --ref main`
   (or GitHub → piercesticc/pierce-hub → Actions → "Build and deploy the hub" → Run workflow).
   Run `gh` as the `piercesticc` account — see `pierce-hub/LAUNCH.md`.
4. When the run is green, open https://piercesticchub.org/forms/ and check the change is there.

If `index.html` is missing when the hub builds, the hub build stops with a message rather than
shipping a footer link to a 404.

## GitHub Pages (previous home, transitional fallback)

The workflow in [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) still
publishes this repo to `https://piercesticc.github.io/piercest-forms/` on every push to `main`.
Once staff have moved over, turn it off in the repo's Settings → Pages and delete the workflow.

## Notes

- The app is privacy-safe because form data stays in the browser.
- Drafts are `localStorage`, per browser origin — they do not follow from the GitHub address to
  the hub address. Export in-progress work as a PDF before switching.
- Staff should use the published URL and not a local file.

The hub also carries a page describing the app for clinicians — `https://piercesticchub.org/icc-forms/` — and a page for the sliding fee scale at `/sliding-fee-scale/`, checked cell by cell against `feeScale` here. If the scale changes, change both.
