/* ============================================================
   First Session Intake Form — schema (data only)
   Defines window.FORM: storage key, meta line, filename, and
   build() which returns a jsPDF doc via the shared buildDoc().
   Full-record policy: every field prints ("—" when blank).
   ============================================================ */
window.FORM = {
  storageKey: "icc_intake_v2",
  filenameSuffix: "Intake",
  filenameId: "name",                 // Client name + date, e.g. Jane_Doe_2026-07-16
  meta: { nameId: "f_client", dateId: "f_date", roleId: "f_therapist" },

  build: function(get, buildDoc){
    const it = [];
    const F = (k, id) => it.push({ type:"field", k, v:get(id) });
    const P = (k, id) => it.push({ type:"para",  k, v:get(id) });
    const S = text => it.push({ type:"section", text });
    const YN = b => b ? "Yes" : "No";

    S("Administrative");
    F("Reviewed limits to confidentiality", "c_conf");
    F("Semester assigned", "f_sem");
    F("Contact #", "f_contact");
    F("Telehealth — client's location", "f_loc");

    S("Contact Information");
    F("Name(s)", "i_names");
    F("Date of birth", "i_dob");
    F("Age", "i_age");
    F("Home phone", "i_home");
    F("Work phone", "i_work");
    F("Address", "i_addr");
    F("Email", "i_email");
    F("Messages okay?", "i_msg");
    F("Legal guardian/parent (if minor)", "i_guard");
    F("Referred by", "i_ref");
    F("Monthly household income (net)", "i_income");
    F("Additional support/income", "i_income2");
    F("Number of dependents", "i_deps");

    S("Presenting Concerns");
    P("Reasons for seeking therapy", "i_reasons");
    P("Goals, hopes, expectations", "i_goals");
    P("Concerns, fears, ambivalence about therapy", "i_concerns");

    S("Therapy History");
    P("Previous / concurrent therapy", "i_thxhist");

    S("Psychiatric & Psychological History");
    P("Hospitalizations / psychotic behavior", "i_psychhist");
    P("Suicidal / homicidal / violent behavior", "i_risk");
    P("Psychiatric medications", "i_meds");
    F("Psychiatrist / prescribing MD", "i_md");
    F("Prescriber phone", "i_mdphone");
    P("Body image / disordered eating", "i_eating");

    S("Medical History");
    P("Major illness, disabilities, hospitalizations, current meds", "i_medical");

    S("Substance Use / Abuse History");
    F("Nicotine — how often", "i_nic");
    F("Nicotine — begin/end", "i_nic2");
    F("Caffeine — how often", "i_caf");
    F("Caffeine — begin/end", "i_caf2");
    P("Alcohol — what / how much / how often / begin–end", "i_alc");
    P("Other drugs — what / how much / how often / how long", "i_drugs");
    P("Willingness to cut back", "i_cutback");

    S("Family & Identity");
    P("Family history", "i_family");
    P("Identity (culture, sexuality, gender, background)", "i_identity");
    P("Anything else important", "i_else");

    S("Additional Areas Explored");
    P("Stresses / coping skills", "a_stress");
    P("Depression (motivation, appetite, sleep)", "a_depr");
    P("Relationship issues", "a_rel");
    P("Abuse issues", "a_abuse");
    P("Interpersonal / intimate relationships", "a_interp");
    P("Gender expression", "a_gender");

    S("Therapist's Assessment");
    P("Appearance, behavior, affect, mood, thought content, impression", "t_assess");
    F("Regular appointment day & time", "t_appt");
    F("Regular ongoing fee $", "t_fee");
    F("Date(s) of intake", "t_idate");
    F("Intake only", "t_intakeonly");
    P("If intake only — explanation", "t_intakeexp");
    P("If referred out — agency/therapist & reason", "t_referout");
    it.push({ type:"sig", left:"Signature of intake therapist", right:"Date" });
    F("Intake therapist (printed)", "t_tname");

    S("First Progress Note & Follow-up");
    F("Sent GFE (Good Faith Estimate)", "p1");
    F("Reviewed consent documents & clinic policies", "p2");
    F("Assessed substance misuse / psych history / suicidality", "p3");
    F("Emailed Clinic Director to check in", "d1");
    F("Uploaded Intake Questionnaire to Ensora (by 4th mtg)", "d2");
    P("Additional notes / next steps", "p_notes");

    return buildDoc("First Session Intake Form", it, { roleLabel:"Therapist", roleId:"f_therapist" });
  }
};
