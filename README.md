# Pierce St ICC Forms App

A small web app for Integral Counseling Center (Pierce Street) that lets any staff member fill out
a clinic form and download a clean, letterheaded **PDF** to their own computer — ready to upload to
Ensora or SharePoint.

**Live at https://piercesticchub.org/forms/**, behind the clinic hub's shared password. That is the
only address. To publish a change, see [DEPLOYMENT.md](DEPLOYMENT.md).

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

## Browser & OS support

Works on **Mac and Windows** in **Chrome, Edge, Firefox, and Safari**. The essential flow — fill a
form and click **Save as PDF** — uses only standard web features (a blob download), so the PDF lands
in Downloads on every browser. The optional **Set folder…** button (which files the PDF straight
into a folder you pick) works only in Chrome/Edge; in Firefox/Safari it simply downloads instead —
same PDF, same filename.

## Run it locally (no install)

Open `index.html` in any browser. That is the whole app, exactly as the hub serves it.

## Project layout

```
index.html              THE APP. One self-contained file: every form, the styles, jsPDF, the PDF
                        engine, all four schemas, the drafts module, the intake chooser and the
                        prompts toggle. This is the only file the hub ships.
initial-contact.html    ┐
intake.html             │ per-form source pages — the same form markup without the "ic-"/"in-"/
couple.html             │ "co-"/"fa-" id prefixes index.html uses. Each opens on its own for
family.html             ┘ testing one form in isolation.
assets/
  clinic.css            shared design system
  pdf.js                shared PDF engine: buildDoc() block types, slug, filenames, saveBlob
  forms.js              shared engine: autosave, Clear, data-show-when conditionals, export
data/
  ic-schema.js          ┐ per-form data: storage key, meta, filename, and build() which
  intake-schema.js      │ returns the PDF layout. This is the ONLY form-specific logic.
  couple-schema.js      │ (ic-schema.js also holds the sliding fee scale + its enhance() hook)
  family-schema.js      ┘
vendor/
  jspdf.umd.min.js      bundled PDF library (v2.5.1)
```

**`index.html` carries its own inlined copies** of the CSS, `pdf.js`, `forms.js` (extended) and
every schema. There is no build step that regenerates it: an edit to a form, a schema or an engine
file has to be made **in `index.html` too** — inside that form's `<section class="view"
id="view-…">`, with the form's id prefix, or in the `REG["…"]` block for a schema. Keep the source
files in step with it so the two never disagree.

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
   (e.g. `data-show-when="q_si_current:Yes;q_si_past:Yes"`). In `index.html` the trigger names carry
   the form's prefix (`ic-q_si_current`).
3. **Add it to the PDF** in the form's schema using the helpers in `build()`:
   `S("Section")`, `F("Label", get("id"))` for a short field, `P("Label","id")` for a narrative
   block, `it.push({type:"flag", k, v})` for a highlighted risk/refer-out callout,
   `it.push({type:"callout", k, v})` for a neutral (accent-tinted) note,
   `it.push({type:"table", title, head, rows, highlight:{row,col}, legend, note})` for a grid
   table, and `it.push({type:"sig", left, right})` for a signature line.
4. **Per-form UI (optional):** a schema may define `enhance({root, get})`. The engine calls it once
   after saved values are restored; it may return `{refresh}`, which is re-run after Clear or a
   draft load. The Initial Contact form uses this to render the fee scale into `[data-fee-scale]`
   and light up the matching band as income / dependents are typed.
5. **Couples on the Initial Contact form:** questions asked of each partner use the base id for
   Partner A and the same id with a `_b` suffix for Partner B, shown only when the type of therapy
   is Couple. The PDF loops over both partners.
6. **Make every change in `index.html` as well** (see *Project layout*), then publish per
   `DEPLOYMENT.md`.

### Updating the sliding fee scale

The fee table lives in `feeScale` in `data/ic-schema.js` (`bands` = upper income bound per row + the
five per-session fees for self / +1 / +2 / +3 / +4 dependents). Both the on-screen table and the PDF
table are generated from it. Update the `REG["ic"]` block in `index.html` to match, and the hub's
`/sliding-fee-scale/` page, which is checked cell by cell against it.

To upgrade jsPDF, replace `vendor/jspdf.umd.min.js` and the copy inlined in `index.html`.
