/* ============================================================
   Initial Contact Form — schema (data only)
   window.FORM: storage key, meta, filename (Initials_Date), and
   build() → jsPDF doc. Conditional sections appear only when
   relevant; risk / refer-out content renders as flag blocks.
   ============================================================ */
window.FORM = {
  storageKey: "icc_contact_v1",
  filenameSuffix: "InitialContact",
  filenameId: "initials",             // clinic convention, e.g. AZ_2026-07-16
  meta: { nameId: "f_client", dateId: "f_date", roleId: "f_staff" },

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

    S("Demographics (optional)");
    F("Age", get("d_age"));
    F("Birthdate", get("d_birth"));
    F("Ethnicity", get("d_ethnicity"));
    F("Pronouns", get("d_pronouns"));
    F("Sexual orientation", get("d_orientation"));
    F("Relationship status", get("d_relstatus"));
    F("Emergency contact", [get("e_name"), get("e_rel"), get("e_phone")].filter(Boolean).join(" · ") || "");
    F("Emergency contact accent / soft-spoken", r("e_soft"));

    S("Screening");
    P("Prior therapy — what worked / what didn't", get("s_prior"));
    P("What brings them in", get("s_bringsin"));
    if(r("q_type") === "Couple") P("Do disagreements become physical?", get("s_conflict"));
    F("Currently prescribed psychiatric meds", r("q_meds") + (get("s_meds_detail") ? ` — ${get("s_meds_detail")}` : ""));
    P("Other substances — which / how often / how much / why", get("s_substances"));

    S("Suicidality / Risk");
    F("Currently feeling suicidal", r("q_si_current"));
    F("Felt suicidal in the past", r("q_si_past"));
    if(r("q_si_current") === "Yes"){
      FLAG("Currently suicidal", "Crisis resources provided (988 · SF Suicide Prevention 415-781-0500). After the call, contact Director Lisa Garbus, 415-279-4079.");
    }
    if(r("q_si_current") === "Yes" || r("q_si_past") === "Yes"){
      it.push({ type:"para", k:"Context — ideation / plan / means / time", v:get("s_si_context") });
    }
    P("Anything else important to share", get("s_anything"));

    S("Financial (fees NOT disclosed on this call)");
    F("Estimated gross monthly household income", get("fin_income"));
    F("Number of dependents", get("fin_deps"));

    S("Staff Notes");
    P("Notes / flags for the Clinic Director", get("c_staffnotes"));

    return buildDoc("Initial Contact Form", it, { roleLabel:"Screened by", roleId:"f_staff" });
  }
};
