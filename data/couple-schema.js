/* ============================================================
   Couple Intake Form — schema (data only)
   ============================================================ */
window.FORM = {
  storageKey: "icc_couple_v1",
  filenameSuffix: "CoupleIntake",
  filenameId: "initials",
  meta: { nameId: "f_client", dateId: "f_date", roleId: "f_therapist" },

  build: function(get, buildDoc){
    const it = [];
    const F = (k, v) => it.push({ type:"field", k, v });
    const P = (k, id) => it.push({ type:"para", k, v:get(id) });
    const S = text => it.push({ type:"section", text });
    const r = name => get.radio(name);

    S("Administrative");
    F("Contact #", get("cp_contact"));
    F("Semester assigned", get("cp_sem"));
    F("Reviewed limits to confidentiality & mandated reporting", get("cp_conf"));

    S("Partner A");
    F("Name", get("a_name"));
    F("Address", get("a_addr"));
    F("Home phone", get("a_home"));
    F("Work phone", get("a_work"));
    F("Age", get("a_age"));
    F("Date of birth", get("a_dob"));
    F("Occupation", get("a_occ"));

    S("Partner B");
    F("Name", get("b_name"));
    F("Address", get("b_addr"));
    F("Home phone", get("b_home"));
    F("Work phone", get("b_work"));
    F("Age", get("b_age"));
    F("Date of birth", get("b_dob"));
    F("Occupation", get("b_occ"));

    S("Household");
    F("Messages okay at which number(s)", get("cp_messages"));
    F("Combined monthly income (net)", get("cp_income"));
    F("Number of dependents", get("cp_deps"));
    F("Other sources of income / support", get("cp_income2"));
    F("Times available for sessions", get("cp_avail"));

    S("Intimate Partner Abuse Screening");
    F("Violence in this relationship (now or ever)", r("q_ipv"));
    if(r("q_ipv") === "Yes"){
      it.push({ type:"flag", k:"Intimate partner violence — screen positive", v:get("ipv_desc") || "Positive screen — see supervisor re: conjoint therapy & safety planning." });
    }

    S("Presenting & Relationship");
    P("Couples presenting issues (each partner)", "cp_presenting");
    P("Each partner's hopes and fears for therapy", "cp_hopes");
    P("Strong points of the relationship (each partner)", "cp_strong");
    P("History of the relationship", "cp_history");

    S("Substance Use / Abuse History");
    F("Nicotine — how often", get("cp_nic"));
    F("Nicotine — begin/end", get("cp_nic2"));
    F("Caffeine — how often", get("cp_caf"));
    F("Caffeine — begin/end", get("cp_caf2"));
    F("Cannabis — how often", get("cp_can"));
    F("Cannabis — begin/end", get("cp_can2"));
    F("Alcohol — what", get("cp_alc_what"));
    F("Alcohol — drinks per week", get("cp_alc_much"));
    F("Alcohol — begin/end", get("cp_alc_be"));
    P("Other drugs", "cp_drugs");
    P("Self-report & interest in moderating", "cp_moderating");

    S("Psychological History");
    P("Psychological history (SI, hospitalizations, prior therapy)", "cp_psychhx");
    F("Individual therapist / psychiatrist(s)", get("cp_indtherapist"));
    P("Psychiatric medications", "cp_meds");
    F("Psychiatrist / MD prescribing meds", get("cp_md"));
    F("Prescriber phone", get("cp_mdphone"));
    P("Anything else important to know", "cp_else");

    S("Additional Areas — Family History");
    P("Family of origin, history", "cp_foo");
    P("Substance use/abuse by family in FOO", "cp_foo_substance");
    P("Abuse of client or family members in FOO", "cp_foo_abuse");

    S("Current Relationship Issues — Satisfaction");
    P("Social interactions with friends", "cp_sat_social");
    P("Communication with each other", "cp_sat_comm");
    P("Anger and disagreements", "cp_sat_anger");
    P("Affectionate interactions", "cp_sat_affection");
    P("Sexual interactions", "cp_sat_sex");
    P("Trust", "cp_sat_trust");

    S("Therapist's Assessment");
    P("Appearance, behavior, affect, mood, thought content, impression", "cp_assess");
    F("Regular appointment time & day", get("cp_appt"));
    F("Regular ongoing fee $", get("cp_fee"));
    F("Date(s) of intake", get("cp_idate"));
    F("Intake only", get("cp_intakeonly"));
    P("If intake only — explanation", "cp_intakeexp");
    P("If referred out — agency/therapist & reason", "cp_referout");
    it.push({ type:"sig", left:"Signature of intake therapist", right:"Date" });
    F("Intake therapist (printed)", get("cp_tname"));

    return buildDoc("Couple Intake Form", it, { roleLabel:"Therapist", roleId:"f_therapist" });
  }
};
