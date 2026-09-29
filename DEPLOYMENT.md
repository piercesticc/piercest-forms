# Deployment

**The app's only address is https://piercesticchub.org/forms/** (behind the clinic password).

It is served by the Pierce St clinic hub, not from this repo. The hub's deploy workflow
(`piercesticc/pierce-hub` → `.github/workflows/deploy.yml`) checks this repo out beside the hub,
and its build copies `index.html` to `/forms/` and ships it with everything else.

## To publish a change

1. Make the change in `index.html` — the file that ships — and in the matching source files
   (see *Project layout* in `README.md`).
2. Commit and push to `main` of `piercesticc/piercest-forms`.
3. **Start the hub's deploy.** A push here does not trigger it — the workflow only watches the hub
   repo:

   ```bash
   gh workflow run deploy.yml --repo piercesticc/pierce-hub --ref main
   ```

   Or GitHub → piercesticc/pierce-hub → Actions → "Build and deploy the hub" → Run workflow.
   On Aura's Mac, run `gh` as the `piercesticc` account — the active `auradavee` account gets a 404:
   `GH_TOKEN=$(gh auth token --user piercesticc) gh workflow run …`
4. When the run is green, open https://piercesticchub.org/forms/ and check the change is there. The
   run log's *"Check out the ICC Forms app beside it"* step prints the commit it used.

If `index.html` is missing when the hub builds, the hub build stops with a message rather than
shipping a footer link to a 404. The full hub runbook is `pierce-hub/LAUNCH.md`.

## Notes

- The app is privacy-safe because form data stays in the browser.
- Drafts are `localStorage`, per browser. They do not follow someone to another computer or browser.
- The old GitHub Pages copy (`piercesticc.github.io/piercest-forms/`) was retired on
  29 September 2026, along with its workflow and the `build-single-file.js` generator, which could
  no longer rebuild `index.html` without dropping features.

The hub also carries a page describing the app for clinicians — `https://piercesticchub.org/icc-forms/` — and a page for the sliding fee scale at `/sliding-fee-scale/`, checked cell by cell against `feeScale` here. If the scale changes, change both.
