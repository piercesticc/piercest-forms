/* ============================================================
   Family Intake Form — schema (data only)
   ============================================================ */
window.FORM = {
  storageKey: "icc_family_v1",
  filenameSuffix: "FamilyIntake",
  filenameId: "initials",
  meta: { nameId: "f_client", dateId: "f_date", roleId: "f_therapist" },

  build: function(get, buildDoc){
    const it = [];
    const F = (k, v) => it.push({ type:"field", k, v });
    const P = (k, id) => it.push({ type:"para", k, v:get(id) });
    const S = text => it.push({ type:"section", text });

    S("Adult A");
    F("Name", get("a_name"));
    F("Address", get("a_addr"));
    F("Home phone", get("a_home"));
    F("Work phone", get("a_work"));
    F("Age", get("a_age"));

    S("Adult B");
    F("Name", get("b_name"));
    F("Address", get("b_addr"));
    F("Home phone", get("b_home"));
    F("Work phone", get("b_work"));
    F("Age", get("b_age"));

    S("Household");
    F("Child's name(s)", get("fm_children_names"));
    F("Combined monthly income (net)", get("fm_income"));
    F("Number of dependents", get("fm_deps"));
    F("Times available for sessions", get("fm_avail"));

    S("Presenting & Family Composition");
    P("Presenting issues (each family member)", "fm_presenting");
    P("Family composition", "fm_composition");
    P("Step or blended family", "fm_blended");
    P("Children in family (name, gender, ages, live in home?)", "fm_children");

    S("History");
    P("History of the family's relationship", "fm_history");
    P("Substance use / abuse history", "fm_substance");
    P("Psychological history (depression, SI, hospitalizations, prior therapy)", "fm_psychhx");
    F("Individual therapist(s)", get("fm_indtherapist"));
    P("Psychiatric medications", "fm_meds");
    P("Strong points of relationships (each member)", "fm_strong");

    S("Relationship — How Things Are Handled");
    P("Areas to change (each member)", "fm_change");
    P("Communication / Trust", "fm_comm");
    P("Decision making", "fm_decision");
    P("Discipline (rules set up & enforced)", "fm_discipline");

    S("Additional Questions");
    P("Stresses / coping skills", "fm_stress");
    P("Depression (motivation, appetite, sleep)", "fm_depression");
    P("Relationship issues", "fm_relissues");
    P("Abuse issues", "fm_abuse");
    P("Interpersonal relationships", "fm_interpersonal");
    P("Medical history", "fm_medical");

    S("Action Taken & Assignment");
    P("Action taken", "fm_action");
    F("Intake only", get("fm_intakeonly"));
    P("If intake only — explanation", "fm_intakeexp");
    P("If referred out — agency/counselor & reason", "fm_referout");
    F("Assigned ICC counselor", get("fm_assigned"));
    F("Regular ongoing fee $", get("fm_fee"));
    F("Date of intake", get("fm_idate"));
    it.push({ type:"sig", left:"Signature of intake counselor", right:"Date" });
    F("Intake counselor (printed)", get("fm_tname"));

    return buildDoc("Family Intake Form", it, { roleLabel:"Counselor", roleId:"f_therapist" });
  }
};
