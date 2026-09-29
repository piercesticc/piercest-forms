/* ============================================================
   Initial Contact Form — schema (data only)
   window.FORM: storage key, meta, filename (Initials_Date), the
   sliding fee scale (+ lookup helpers and the enhance() UI hook),
   and build() → jsPDF doc. Conditional sections appear only when
   relevant; risk / refer-out content renders as flag blocks.
   ============================================================ */
window.FORM = {
  storageKey: "icc_contact_v1",
  filenameSuffix: "InitialContact",
  filenameId: "initials",             // clinic convention, e.g. AZ_2026-07-16
  meta: { nameId: "f_client", dateId: "f_date", roleId: "f_staff" },

  // Sliding fee scale — the single source of truth for both the on-screen table and
  // the PDF. Each band is the (inclusive) upper bound of gross monthly income plus the
  // per-session fee by household size: self, +1, +2, +3, +4 dependents.
  feeScale: {
    cols: ["Self", "+1", "+2", "+3", "+4"],
    bands: [
      { max:1500,     fees:[ 35,  35,  35,  35,  35] },
      { max:2100,     fees:[ 35,  35,  35,  35,  35] },
      { max:2700,     fees:[ 40,  35,  35,  35,  35] },
      { max:3000,     fees:[ 45,  40,  40,  35,  35] },
      { max:3300,     fees:[ 50,  45,  40,  35,  35] },
      { max:3600,     fees:[ 55,  50,  45,  40,  35] },
      { max:3900,     fees:[ 60,  55,  50,  45,  40] },
      { max:4200,     fees:[ 65,  60,  55,  50,  45] },
      { max:4500,     fees:[ 70,  65,  55,  45,  40] },
      { max:4800,     fees:[ 75,  70,  60,  50,  40] },
      { max:5100,     fees:[ 80,  75,  65,  55,  45] },
      { max:5400,     fees:[ 85,  80,  70,  60,  50] },
      { max:5700,     fees:[ 90,  85,  75,  65,  55] },
      { max:6000,     fees:[ 95,  90,  80,  70,  60] },
      { max:6300,     fees:[100,  95,  85,  75,  65] },
      { max:6600,     fees:[110, 100,  90,  80,  70] },
      { max:6900,     fees:[115, 105,  95,  85,  75] },
      { max:7200,     fees:[120, 110, 100,  90,  80] },
      { max:7500,     fees:[130, 120, 110, 100,  90] },
      { max:7800,     fees:[135, 125, 115, 110, 100] },
      { max:8100,     fees:[140, 130, 120, 115, 110] },
      { max:8400,     fees:[145, 140, 130, 120, 115] },
      { max:8700,     fees:[150, 145, 140, 135, 130] },
      { max:Infinity, fees:[160, 155, 150, 145, 140] }
    ],
    note: "We are unable to accept Medi-Cal. Clients pay in full at each session; we provide a monthly superbill they may submit to their insurance for possible reimbursement."
  },

  // "$1,500 or under" / "$1,501 – 2,100" / "$8,701 or higher"
  feeBandLabel: function(i){
    const b = this.feeScale.bands, fmt = n => "$" + n.toLocaleString("en-US");
    if(i === 0) return fmt(b[0].max) + " or under";
    if(i === b.length - 1) return fmt(b[i-1].max + 1) + " or higher";
    return fmt(b[i-1].max + 1) + " \u2013 " + b[i].max.toLocaleString("en-US");
  },
  // Free-text income → monthly dollars. "$3,400", "3400/mo", "3.4k", "40k a year",
  // "3000-3500" (first number wins). null when nothing numeric was typed.
  parseIncome: function(text){
    const s = String(text || "").toLowerCase().replace(/,/g, "");
    const m = s.match(/(\d+(?:\.\d+)?)\s*(k)?/);
    if(!m) return null;
    let n = parseFloat(m[1]); if(m[2]) n *= 1000;
    if(/\b(yr|year|annual|annually)\b/.test(s)) n = n / 12;
    return n > 0 ? n : null;
  },
  // Free-text dependents → integer. Blank → null (unknown); "none"/"no"/"n/a" → 0.
  parseDeps: function(text){
    const s = String(text || "").trim().toLowerCase();
    if(!s) return null;
    if(/^(none|no\b|n\/a|zero|nil)/.test(s)) return 0;
    const m = s.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  },
  // → { income, deps, row, col, fee } or null when income is unreadable.
  // col / fee are null until dependents are known; 5+ dependents use the "+4" column.
  feeLookup: function(incomeText, depsText){
    const income = this.parseIncome(incomeText);
    if(income == null) return null;
    const bands = this.feeScale.bands;
    const row = bands.findIndex(b => income <= b.max);
    const deps = this.parseDeps(depsText);
    const col = deps == null ? null : Math.min(deps, this.feeScale.cols.length - 1);
    return { income, deps, row, col, fee: col == null ? null : bands[row].fees[col] };
  },

  // Per-form UI hook. The engine calls enhance({root, get}) once saved values are
  // restored; it renders the fee scale into [data-fee-scale] (two side-by-side
  // halves on wide screens) and keeps the matching band lit as income / dependents
  // are typed. Returns {refresh} so the engine can re-sync after Clear / draft load.
  enhance: function(ctx){
    const F = this, root = ctx.root || document, get = ctx.get;
    const host = root.querySelector("[data-fee-scale]");
    if(!host) return null;
    const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
    const cols = F.feeScale.cols, bands = F.feeScale.bands, half = Math.ceil(bands.length / 2);
    const table = (from, to) =>
      '<table class="fee"><thead><tr><th>Gross monthly income</th>' + cols.map(c => "<th>"+esc(c)+"</th>").join("") + "</tr></thead><tbody>"
      + bands.slice(from, to).map((b, k) => { const i = from + k;
          return '<tr data-row="'+i+'"><td>'+esc(F.feeBandLabel(i))+"</td>" + b.fees.map((f, j) => '<td data-col="'+j+'">$'+f+"</td>").join("") + "</tr>"; }).join("")
      + "</tbody></table>";
    host.innerHTML =
      '<div class="feescale-head"><div><div class="feescale-title">Sliding Fee Scale</div>'
      + '<div class="feescale-sub">Per-session fee by gross monthly household income and number of dependents</div></div>'
      + '<span class="feescale-badge">Staff reference \u00b7 do not quote to caller</span></div>'
      + '<div class="feescale-lookup idle" data-fee-lookup></div>'
      + '<div class="feescale-grid">' + table(0, half) + table(half, bands.length) + "</div>"
      + '<p class="feescale-note"><b>' + esc(F.feeScale.note.split(". ")[0]) + '.</b> ' + esc(F.feeScale.note.split(". ").slice(1).join(". ")) + "</p>";
    const lookupEl = host.querySelector("[data-fee-lookup]");
    function refresh(){
      host.querySelectorAll(".is-row, .is-hit").forEach(el => el.classList.remove("is-row", "is-hit"));
      const look = F.feeLookup(get("fin_income"), get("fin_deps"));
      if(!look){
        lookupEl.className = "feescale-lookup idle";
        lookupEl.textContent = "Enter the household income and number of dependents above and the matching band lights up here.";
        return;
      }
      const tr = host.querySelector('tr[data-row="'+look.row+'"]');
      tr.classList.add("is-row");
      if(look.col != null) tr.querySelector('td[data-col="'+look.col+'"]').classList.add("is-hit");
      lookupEl.className = "feescale-lookup";
      const inc = "$" + Math.round(look.income).toLocaleString("en-US") + "/mo";
      lookupEl.innerHTML = look.fee != null
        ? 'Scale lookup: <b>$' + look.fee + '</b> per session \u2014 ' + esc(inc) + ", " + look.deps + " dependent" + (look.deps === 1 ? "" : "s")
          + " (" + esc(F.feeBandLabel(look.row)) + " band). For the Clinic Director; the final fee is set at assignment."
        : 'Scale lookup: ' + esc(inc) + ' falls in the <b>' + esc(F.feeBandLabel(look.row)) + "</b> band \u2014 add the number of dependents to pinpoint the fee.";
    }
    const onEdit = e => { if(e.target && e.target.matches("[data-field]")) refresh(); };
    root.addEventListener("input", onEdit);
    root.addEventListener("change", onEdit);
    refresh();
    return { refresh };
  },

  build: function(get, buildDoc){
    const it = [];
    const F = (k, v) => it.push({ type:"field", k, v });
    const Fs = (k, v) => it.push({ type:"field", k, v, skipEmpty:true });
    const P = (k, v) => it.push({ type:"para", k, v });
    const S = text => it.push({ type:"section", text });
    const FLAG = (k, v) => it.push({ type:"flag", k, v });
    const r = name => get.radio(name);

    S("Contact Information");
    F("Phone", get("c_phone"));
    F("Email", get("c_email"));
    F("Home address", get("c_addr"));
    const pref = [];
    if(get("c_pref_phone") === "Yes") pref.push("Phone");
    if(get("c_pref_email") === "Yes") pref.push("Email");
    if(get("c_pref_text")  === "Yes") pref.push("Text");
    F("Preferred contact method", pref.join(", "));
    F("Clinic disclosure read to caller", get("c_disclosure"));

    S("Therapeutic Frame");
    F("Current ICP student at CIIS", r("q_icp"));
    if(r("q_icp") === "Yes") FLAG("Referral required", "Current ICP student at CIIS — cannot be seen at this clinic. Refer out.");
    F("How they heard about us", get("c_heard"));
    F("Interested in", r("q_modality"));
    if(r("q_modality") === "In-person" || r("q_modality") === "Mix"){
      F("Confirmed can climb multiple flights of stairs", get("c_stairs"));
    }
    if(get("c_goldengate") === "Yes"){
      FLAG("Referred to Golden Gate ICC", "Client cannot climb stairs — referred to Golden Gate ICC, 415-561-0230.");
    }
    F("Type of therapy", r("q_type") + (get("c_type_other") ? ` — ${get("c_type_other")}` : ""));
    F("Availability — option 1", get("c_slot1"));
    F("Availability — option 2", get("c_slot2"));
    F("Availability — option 3", get("c_slot3"));
    P("Availability notes", get("c_avail_notes"));

    // Couple / family (conditional)
    if(r("q_type") === "Couple" || r("q_type") === "Family"){
      S("For Couples / Family");
      F("Everyone open to therapy", r("q_all_open"));
      for(let i=1; i<=3; i++){
        const name = get("p"+i+"_name"), age = get("p"+i+"_age"), contact = get("p"+i+"_contact");
        if(name || age || contact){
          Fs(`Participant ${i}`, [name, age && `age ${age}`, contact].filter(Boolean).join(" · "));
        }
      }
    }
    // Child client (conditional)
    if(r("q_type") === "Family"){
      S("For a Child Client");
      F("Primary caretaker(s)", get("c_caretakers"));
      P("Family structure", get("c_family_structure"));
    }

    // Couples answer demographics / screening / suicidality per partner: Partner A
    // uses the original ids, Partner B the same ids with a "_b" suffix. Labels carry
    // the participant name when one was entered.
    const couple = r("q_type") === "Couple";
    const partners = couple
      ? [["", "Partner A", get("p1_name")], ["_b", "Partner B", get("p2_name")]]
          .map(([sfx, tag, nm]) => [sfx, tag + (nm ? ` (${nm})` : "") + ": "])
      : [["", ""]];

    S("Demographics (optional)");
    for(const [sfx, who] of partners){
      F(who + "Age", get("d_age"+sfx));
      F(who + "Birthdate", get("d_birth"+sfx));
      F(who + "Ethnicity", get("d_ethnicity"+sfx));
      F(who + "Pronouns", get("d_pronouns"+sfx));
      F(who + "Sexual orientation", get("d_orientation"+sfx));
      F(who + "Relationship status", get("d_relstatus"+sfx));
      F(who + "Emergency contact", [get("e_name"+sfx), get("e_rel"+sfx), get("e_phone"+sfx)].filter(Boolean).join(" · ") || "");
      F(who + "Emergency contact accent / soft-spoken", r("e_soft"+sfx));
    }

    S("Screening");
    for(const [sfx, who] of partners){
      P(who + "Prior therapy — what worked / what didn't", get("s_prior"+sfx));
      P(who + "What brings them in", get("s_bringsin"+sfx));
      F(who + "Currently prescribed psychiatric meds", r("q_meds"+sfx) + (get("s_meds_detail"+sfx) ? ` — ${get("s_meds_detail"+sfx)}` : ""));
      P(who + "Other substances — which / how often / how much / why", get("s_substances"+sfx));
    }
    if(couple) P("Do disagreements become physical?", get("s_conflict"));

    S("Suicidality / Risk");
    for(const [sfx, who] of partners){
      F(who + "Currently feeling suicidal", r("q_si_current"+sfx));
      F(who + "Felt suicidal in the past", r("q_si_past"+sfx));
      if(r("q_si_current"+sfx) === "Yes"){
        FLAG(who + "Currently suicidal", "Crisis resources provided (988 · SF Suicide Prevention 415-781-0500). After the call, contact Director Lisa Garbus, 415-279-4079.");
      }
      if(r("q_si_current"+sfx) === "Yes" || r("q_si_past"+sfx) === "Yes"){
        it.push({ type:"para", k:who + "Context — ideation / plan / means / time", v:get("s_si_context"+sfx) });
      }
    }
    P("Anything else important to share", get("s_anything"));

    S("Financial (fees NOT disclosed on this call)");
    F("Estimated gross monthly household income", get("fin_income"));
    F("Number of dependents", get("fin_deps"));
    const look = this.feeLookup(get("fin_income"), get("fin_deps"));
    if(look && look.fee != null){
      const inc = "$" + Math.round(look.income).toLocaleString("en-US") + "/mo";
      it.push({ type:"callout", k:"Sliding scale lookup: $" + look.fee + " per session",
        v: "Reported income " + inc + " with " + look.deps + " dependent" + (look.deps === 1 ? "" : "s")
         + " falls in the " + this.feeBandLabel(look.row) + " band. The Clinic Director sets the final fee at assignment; nothing was quoted to the caller." });
    } else if(look){
      it.push({ type:"callout", k:"Sliding scale lookup", v: "Reported income falls in the " + this.feeBandLabel(look.row)
         + " band; number of dependents not recorded, so the fee column is not pinpointed." });
    }
    it.push({
      type:"table",
      title:"Sliding Fee Scale \u2014 per-session fee by gross monthly income and dependents",
      head:["Gross monthly income"].concat(this.feeScale.cols),
      rows:this.feeScale.bands.map((b, i) => [this.feeBandLabel(i)].concat(b.fees.map(f => "$" + f))),
      highlight: look ? { row:look.row, col:(look.col == null ? null : look.col + 1) } : null,
      legend: look ? "Highlighted: band matching the reported income" + (look.col != null ? " and dependents" : "") + "." : null,
      note: this.feeScale.note
    });

    S("Staff Notes");
    P("Notes / flags for the Clinic Director", get("c_staffnotes"));

    return buildDoc("Initial Contact Form", it, { roleLabel:"Screened by", roleId:"f_staff" });
  }
};
