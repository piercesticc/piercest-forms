# Pierce St ICC Forms App

A small, shareable web app for Integral Counseling Center (Pierce Street) that lets any staff
member fill out a clinic form and download a clean, letterheaded **PDF** to their own computer —
ready to upload to Ensora or SharePoint.

**Four forms:**
- **Initial Contact Form** — phone-shift screening call
- **First Session Intake Form** — individual intake
- **Couple Intake Form** — two-partner intake
- **Family Intake Form** — family intake

## Privacy / PHI posture

Client data **never leaves the person's device.** There is no backend and no network call after the
page loads. Every form's PDF is generated in the browser (via bundled jsPDF) and saved locally; the
person uploads it wherever it needs to go. Entries autosave only in that browser's `localStorage`.

- Strict `Content-Security-Policy` on every page (`connect-src 'none'`) — the page structurally
  cannot send data anywhere.
- No analytics, CDNs, web fonts, or third-party assets. Everything is same-origin and bundled.
- On a shared phone-shift computer, click **Clear** after each call so the next person starts fresh.

Because the app only ever serves *blank* code, hosting it is PHI-safe.

## Two ways to distribute

1. **Email one file (simplest).** Send **`PierceStForms.html`** — a single self-contained file with
   every form, style, and the PDF library baked in. Staff save it and double-click to open. No other
   files needed. To regenerate it after any edit: `node build-single-file.js`.
2. **Host the folder (best for updates).** Deploy the whole folder to a private static URL so
   everyone uses one link and your edits propagate (see below). Use `index.html` as the entry point.

Either way, no client data ever leaves the person's device.

## Browser & OS support

Works on **Mac and Windows** in **Chrome, Edge, Firefox, and Safari**. The essential flow — fill a
form and click **Save as PDF** — uses only standard web features (a blob download), so the PDF lands
in Downloads on every browser. The optional **Set folder…** button (which files the PDF straight
into a folder you pick) works only in Chrome/Edge; in Firefox/Safari it simply downloads instead —
same PDF, same filename.

## Run it locally (no install)

Open `PierceStForms.html` (single file) or `index.html` (folder) in any browser. That's it.

## Where it lives now: the Pierce St clinic hub

Since 16 September 2026 the canonical address is **https://piercesticchub.org/forms/**, behind
the clinic's shared password. The hub's release build (`pierce-hub/build.py --launch --static`)
copies this folder's `index.html` to `/forms/` and deploys it with the rest of the hub, so:

1. Edit here as usual (`index.html` is the shipped single file — see the guard in
   `build-single-file.js`).
2. Push to `main`, then run the hub's deploy workflow — see `DEPLOYMENT.md` for the one command.
   A push here alone does not update the hub.

Drafts autosave per browser origin, so anything in progress on the old GitHub Pages address does
not carry over — export it as a PDF there first. GitHub Pages stays up as a fallback until it is
switched off in the repo settings.

## Other ways to host it

The app is plain static files, so any static host works. One-time setup, then everyone uses one link
and your updates appear for all.

**GitHub Pages** (the previous home)
1. Create a private repo, add these files, push.
2. Settings → Pages → deploy from branch (`main`, `/root`).
3. Share the resulting `https://…github.io/…/` link with staff.

**Netlify (drag-and-drop)**
1. Go to Netlify → "Add new site" → "Deploy manually".
2. Drag the whole `pierce-icc-forms` folder onto the page.
3. Share the site URL. To update, drag the folder again.

Either way the host serves static files only and never receives form data.

## Project layout

```
index.html              landing screen (choose a form)
initial-contact.html    ┐
intake.html             │ one page per form
couple.html             │  (static markup + [data-field] inputs)
family.html             ┘
assets/
  clinic.css            shared design system (all styling lives here)
  pdf.js                shared PDF engine: buildDoc() block types, slug, saveBlob
  forms.js              shared engine: autosave, Clear, data-show-when conditionals, export
data/
  ic-schema.js          ┐ per-form data: storage key, meta, filename, and build() which
  intake-schema.js      │ returns the PDF layout. This is the ONLY form-specific logic.
  couple-schema.js      │ (ic-schema.js also holds the sliding fee scale + its enhance() hook)
  family-schema.js      ┘
vendor/
  jspdf.umd.min.js      bundled PDF library (v2.5.1)
```

Each form page loads `clinic.css`, `vendor/jspdf.umd.min.js`, `assets/pdf.js`, its
`data/<form>-schema.js`, and `assets/forms.js`.

## PDF filename convention

- Initial Contact: `Initials M.D.YY.pdf` (e.g. `AZ 9.15.23.pdf`) — exactly the filing name the Phone
  Shift Manual asks for, so nothing needs renaming before it goes in the IC folder.
- Couple / Family: `Initials_Date_<FormType>.pdf` (e.g. `AZ_2026-07-16_CoupleIntake.pdf`).
- Individual Intake: `Name_Date_Intake.pdf`.

Initials/name and date come from the header fields; if a name is missing it falls back to `client`,
and the date falls back to today — a PDF always gets a sane filename.

## Editing or adding a form

1. **Add fields** to the HTML with a unique `id` and the `data-field` attribute (autosave + PDF read
   it automatically). Use `data-default="today"` on a date input to prefill today.
2. **Conditionals:** add `data-show-when="triggerName:value1,value2"` to any block to reveal it only
   when that radio/select/checkbox matches. Multiple OR conditions: separate with `;`
   (e.g. `data-show-when="q_si_current:Yes;q_si_past:Yes"`).
3. **Add it to the PDF** in the form's `data/<form>-schema.js` using the helpers in `build()`:
   `S("Section")`, `F("Label", get("id"))` for a short field, `P("Label","id")` for a narrative
   block, `it.push({type:"flag", k, v})` for a highlighted risk/refer-out callout,
   `it.push({type:"callout", k, v})` for a neutral (accent-tinted) note,
   `it.push({type:"table", title, head, rows, highlight:{row,col}, legend, note})` for a grid
   table, and `it.push({type:"sig", left, right})` for a signature line.
4. **Per-form UI (optional):** a schema may define `enhance({root, get})`. The engine calls it once
   after saved values are restored; it may return `{refresh}`, which is re-run after Clear or a
   draft load. The Initial Contact form uses this to render the fee scale into `[data-fee-scale]`
   and light up the matching band as income / dependents are typed.
5. **New form?** Copy a form's `.html` + `data/*-schema.js`, give it a unique `storageKey`, and add a
   card to `index.html`.

### Updating the sliding fee scale

The fee table lives in one place: `feeScale` in `data/ic-schema.js` (`bands` = upper income bound
per row + the five per-session fees for self / +1 / +2 / +3 / +4 dependents). Both the on-screen
table and the PDF table are generated from it. Because `index.html` inlines a copy of the schema,
update the `REG["ic"]` block there too (or back-port the bundle's extras and rebuild with `--force`).

To upgrade jsPDF, drop a new `vendor/jspdf.umd.min.js` in place.
