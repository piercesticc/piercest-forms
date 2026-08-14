/* ============================================================
   Pierce St ICC Forms App — shared form engine
   Drives both forms from declarative markup:
     • autosave/restore over every [data-field] control (localStorage)
     • Clear button
     • data-show-when="triggerName:val1,val2" conditional reveals
     • data-default="today" date prefill
     • Set-folder button + Save-as-PDF export via window.FORM.build()
   All form-specific logic lives in data/<form>-schema.js as
   window.FORM. This file contains no per-form knowledge.
   ============================================================ */
(function(){
  "use strict";
  const PDF = window.ICCPDF;
  const $ = PDF.$;

  const FORM = window.FORM || {};
  const KEY = FORM.storageKey || "icc_form_v1";
  const DRAFTS_KEY = KEY + "_drafts";

  const fields = () => Array.prototype.slice.call(document.querySelectorAll("[data-field]"));
  const statusEl = () => $("status");

  // ---------- status ----------
  let statusTimer = null;
  function flash(msg, revert){
    const el = statusEl(); if(!el) return;
    el.textContent = msg;
    clearTimeout(statusTimer);
    if(revert !== false) statusTimer = setTimeout(()=>{ el.textContent = "Auto-saving on this device"; }, 1400);
  }

  // ---------- collect / save / load ----------
  function collect(){
    const data = {};
    fields().forEach(el => {
      const id = el.id;
      if(!id) return;
      if(el.type === "checkbox"){ data[id] = el.checked; }
      else if(el.type === "radio"){ if(el.checked) data[el.name] = el.value; }
      else { data[id] = el.value; }
    });
    return data;
  }
  function save(){
    try{
      localStorage.setItem(KEY, JSON.stringify(collect()));
      flash("Saved ✓");
    }catch(e){ flash("Save unavailable (private mode)", false); }
  }
  // ---------- drafts (multiple) ----------
  function getDrafts(){
    try{ const raw = localStorage.getItem(DRAFTS_KEY); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
  }
  function persistDrafts(list){ try{ localStorage.setItem(DRAFTS_KEY, JSON.stringify(list)); }catch(e){}
  }
  function saveDraft(name){
    const list = getDrafts();
    const id = Date.now().toString();
    const draft = { id, name: name || (document.getElementById('f_client') && document.getElementById('f_client').value) || `Draft ${new Date().toLocaleString()}`, created: new Date().toISOString(), data: collect() };
    list.unshift(draft);
    persistDrafts(list);
    flash("Draft saved");
    return draft;
  }
  function deleteDraft(id){
    const list = getDrafts().filter(d => d.id !== id);
    persistDrafts(list);
  }
  function loadDraft(id){
    const list = getDrafts();
    const draft = list.find(d => d.id === id);
    if(!draft) return;
    const data = draft.data || {};
    fields().forEach(el => {
      const idn = el.id;
      if(el.type === "checkbox"){ if(idn in data) el.checked = !!data[idn]; }
      else if(el.type === "radio"){ if(data[el.name] != null) el.checked = (data[el.name] === el.value); }
      else if(idn in data && data[idn] != null){ el.value = data[idn]; }
    });
    flash("Draft loaded");
    save();
    evalConditionals();
  }
  function renderDraftsPanel(){
    let panel = document.getElementById('draftsPanel');
    if(!panel){
      panel = document.createElement('div'); panel.id = 'draftsPanel'; panel.className = 'drafts-panel';
      panel.style.cssText = 'position:fixed;right:12px;top:60px;width:320px;max-height:60vh;overflow:auto;background:white;border:1px solid #bbb;padding:10px;box-shadow:0 6px 18px rgba(0,0,0,.12);z-index:9999;font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;';
      document.body.appendChild(panel);
    }
    const list = getDrafts();
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong>Drafts</strong><button id="closeDrafts" style="font-size:12px">Close</button></div>`;
    if(list.length === 0){ panel.insertAdjacentHTML('beforeend','<div style="color:#666">No drafts saved on this device.</div>'); }
    else{
      list.forEach(d => {
        const item = document.createElement('div');
        item.style.cssText = 'border-top:1px solid #eee;padding:8px 0;display:flex;justify-content:space-between;align-items:center;gap:8px;';
        const left = document.createElement('div'); left.style.flex = '1';
        left.innerHTML = `<div style="font-weight:600">${escapeHtml(d.name)}</div><div style="font-size:12px;color:#666">${new Date(d.created).toLocaleString()}</div>`;
        const actions = document.createElement('div');
        actions.innerHTML = `<button data-load="${d.id}" style="margin-right:6px">Load</button><button data-delete="${d.id}">Delete</button>`;
        item.appendChild(left); item.appendChild(actions); panel.appendChild(item);
      });
    }
    panel.querySelector('#closeDrafts').addEventListener('click', () => panel.remove());
    panel.querySelectorAll('button[data-load]').forEach(b => b.addEventListener('click', e => { const id = e.currentTarget.getAttribute('data-load'); loadDraft(id); panel.remove(); }));
    panel.querySelectorAll('button[data-delete]').forEach(b => b.addEventListener('click', e => { const id = e.currentTarget.getAttribute('data-delete'); if(confirm('Delete this draft?')){ deleteDraft(id); renderDraftsPanel(); } }));
  }
  function escapeHtml(str){ return String(str||'').replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  function load(){
    let raw;
    try{ raw = localStorage.getItem(KEY); }catch(e){ return; }
    if(!raw) return;
    let data; try{ data = JSON.parse(raw); }catch(e){ return; }
    fields().forEach(el => {
      const id = el.id;
      if(el.type === "checkbox"){ if(id in data) el.checked = !!data[id]; }
      else if(el.type === "radio"){ if(data[el.name] != null) el.checked = (data[el.name] === el.value); }
      else if(id in data && data[id] != null){ el.value = data[id]; }
    });
  }

  // ---------- defaults ----------
  function applyDefaults(){
    document.querySelectorAll('[data-default="today"]').forEach(el => {
      if(!el.value) el.value = PDF.todayISO();
    });
  }

  // ---------- conditional reveals ----------
  // data-show-when="q_stairs:In-person,Mix"  -> shown when group q_stairs is one of those.
  // Multiple OR conditions are separated by ";":
  //   data-show-when="q_si_current:Yes;q_si_past:Yes"  -> shown if EITHER is Yes.
  function currentValue(name){
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    if(checked) return checked.value;
    const el = $(name);
    if(el){ if(el.type === "checkbox") return el.checked ? "Yes" : "No"; return el.value; }
    return "";
  }
  function condMet(cond){
    const [name, valsRaw] = cond.split(":");
    const wanted = (valsRaw || "").split(",").map(s => s.trim()).filter(Boolean);
    return wanted.includes(currentValue(name.trim()));
  }
  function evalConditionals(){
    document.querySelectorAll("[data-show-when]").forEach(node => {
      const conds = node.getAttribute("data-show-when").split(";").map(s => s.trim()).filter(Boolean);
      const show = conds.some(condMet);
      node.hidden = !show;
    });
  }

  // ---------- auto-age: an age input carries data-age-of="<dobId>" ----------
  function setupAutoAge(){
    document.querySelectorAll("[data-age-of]").forEach(ageEl => {
      const dob = $(ageEl.getAttribute("data-age-of"));
      if(!dob) return;
      const recompute = () => {
        const age = PDF.ageFromDOB(dob.value);
        if(age && ageEl.value !== age){ ageEl.value = age; save(); }
      };
      dob.addEventListener("input", recompute);
      dob.addEventListener("change", recompute);
      recompute();
    });
  }

  // ---------- wire up ----------
  function init(){
    applyDefaults();
    load();
    evalConditionals();
    setupAutoAge();

    // autosave + live conditional evaluation
    document.addEventListener("input", e => {
      if(e.target.matches("[data-field]")) save();
    });
    document.addEventListener("change", e => {
      if(e.target.matches("[data-field]")){ save(); }
      evalConditionals();
    });

    // folder button
    const folderBtn = $("folderBtn"), folderLbl = $("folderLabel");
    if(folderLbl) folderLbl.textContent = PDF.folderLabel();
    if(folderBtn){
      folderBtn.addEventListener("click", async () => {
        const ok = await PDF.pickFolder();
        if(folderLbl) folderLbl.textContent = PDF.folderLabel();
        if(ok) flash("Save folder set");
      });
    }

    // clear
    const clearBtn = $("clearBtn");
    if(clearBtn){
      clearBtn.addEventListener("click", () => {
        if(!confirm("Clear all entries on this device? This cannot be undone.")) return;
        fields().forEach(el => {
          if(el.type === "checkbox" || el.type === "radio") el.checked = false;
          else el.value = "";
        });
        try{ localStorage.removeItem(KEY); }catch(e){}
        applyDefaults();
        evalConditionals();
        flash("Cleared", false);
      });
    }

    // Save draft button
    const saveDraftBtn = $("saveDraftBtn");
    if(saveDraftBtn){
      saveDraftBtn.addEventListener('click', () => {
        const suggested = (document.getElementById('f_client') && document.getElementById('f_client').value) || '';
        const name = prompt('Name this draft', suggested || `Draft ${new Date().toLocaleString()}`);
        if(name) saveDraft(name);
      });
    }

    // Drafts list button
    const draftsBtn = $("draftsBtn");
    if(draftsBtn){ draftsBtn.addEventListener('click', () => { renderDraftsPanel(); }); }

    // export PDF
    const pdfBtn = $("pdfBtn");
    if(pdfBtn){
      pdfBtn.addEventListener("click", async () => {
        save();
        if(!window.jspdf){ alert("PDF library failed to load. Make sure the 'vendor' folder sits next to this app."); return; }
        if(typeof FORM.build !== "function"){ alert("Form schema missing."); return; }
        try{
          const doc = FORM.build(PDF.get, PDF.buildDoc);
          const blob = doc.output("blob");
          const res = await PDF.saveBlob(blob, PDF.pdfFilename());
          flash(res.saved ? `Saved → ${res.folder}/${res.filename}` : `Downloaded ${res.filename}`, false);
        }catch(err){
          console.error(err);
          alert("Could not generate the PDF.\n\n" + (err && err.message ? err.message : err));
        }
      });
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
