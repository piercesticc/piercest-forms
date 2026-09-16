/* ============================================================
   Pierce St ICC Forms App — shared form engine
   Drives both forms from declarative markup:
     • autosave/restore over every [data-field] control (localStorage)
     • Clear button
     • data-show-when="triggerName:val1,val2" conditional reveals
     • data-default="today" date prefill
     • Set-folder button + Save-as-PDF export via window.FORM.build()
     • optional window.FORM.enhance({root,get}) hook for per-form UI
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

  // ---------- per-form UI hook ----------
  // A schema may define enhance({root, get}) for form-specific UI (e.g. the fee-scale
  // widget). It runs once after saved values are restored and may return {refresh},
  // which we call whenever values change without input events (Clear, draft load).
  let enhancer = null;
  function runEnhance(){
    if(typeof FORM.enhance !== "function") return;
    try{ enhancer = FORM.enhance({ root:document, get:PDF.get }) || null; }
    catch(e){ console.error("enhance() failed", e); }
  }
  function refreshEnhance(){ if(enhancer && typeof enhancer.refresh === "function") enhancer.refresh(); }

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
      // Fold the same edit into the active draft, if this form is tracking one.
      try{ autoUpdateActiveDraft(); }catch(e){ /* ignore */ }
    }catch(e){ flash("Save unavailable (private mode)", false); }
  }
  // ---------- drafts (multiple) ----------
  // Each draft carries a stable, immutable `id`; ACTIVE_KEY records which one this
  // form is editing. Autosave folds into that record, so draft identity never
  // depends on the client name or session date (both of which get edited mid-session).
  const ACTIVE_KEY = DRAFTS_KEY + "_active";
  function getDrafts(){
    try{ const raw = localStorage.getItem(DRAFTS_KEY); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
  }
  function persistDrafts(list){ try{ localStorage.setItem(DRAFTS_KEY, JSON.stringify(list)); }catch(e){} }
  function getActiveId(){ try{ return localStorage.getItem(ACTIVE_KEY) || null; }catch(e){ return null; } }
  function setActiveId(id){
    try{ if(id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY); }catch(e){}
  }
  function newDraftId(){ return 'd' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }
  function findDraft(id){ return id ? (getDrafts().find(d => d.id === id) || null) : null; }
  function getActiveDraft(){
    const id = getActiveId();
    if(!id) return null;
    const d = findDraft(id);
    if(!d) setActiveId(null);   // self-heal a pointer that outlived its record
    return d;
  }

  // display-only helpers — these never affect draft identity
  const CONNECTOR = { '&':1, 'and':1, '+':1, '/':1, 'the':1 };
  function initialsOf(name){
    const toks = String(name||'').split(/\s+/).filter(Boolean).filter(t => !CONNECTOR[t.toLowerCase()]);
    return toks.slice(0,4).map(t => t.charAt(0).toUpperCase()).join('') || 'XX';
  }
  function suggestedName(){
    const client = (document.getElementById('f_client') && document.getElementById('f_client').value) || '';
    const dateVal = (document.getElementById('f_date') && document.getElementById('f_date').value) || PDF.todayISO();
    return (client || 'Untitled') + ' · ' + dateVal;
  }

  function createDraft(name){
    const list = getDrafts();
    const now = new Date().toISOString();
    const draft = { id:newDraftId(), name:(name || suggestedName()), created:now, updated:now, data:collect() };
    list.unshift(draft);
    persistDrafts(list);
    setActiveId(draft.id);
    flash("Draft saved");
    return draft;
  }
  function updateActiveDraft(name){
    const list = getDrafts(), id = getActiveId();
    if(!id) return null;
    const draft = list.find(d => d.id === id);
    if(!draft){ setActiveId(null); return null; }
    if(name) draft.name = name;
    draft.data = collect();
    draft.updated = new Date().toISOString();
    persistDrafts(list);
    flash("Draft updated");
    return draft;
  }
  // Called on every autosave. No active draft -> no-op; autosave never creates one.
  function autoUpdateActiveDraft(){
    const list = getDrafts(), id = getActiveId();
    if(!id) return;
    const draft = list.find(d => d.id === id);
    if(!draft){ setActiveId(null); return; }
    draft.data = collect();
    draft.updated = new Date().toISOString();
    persistDrafts(list);
    flash("Draft auto-updated");
  }
  function deleteDraft(id){
    persistDrafts(getDrafts().filter(d => d.id !== id));
    if(getActiveId() === id) setActiveId(null);
  }
  // Stop tracking without deleting: the filed draft keeps the data it had at detach.
  function detachDraft(){ setActiveId(null); flash("Detached — working copy only", false); }
  function loadDraft(id){
    const draft = findDraft(id);
    if(!draft) return;
    const data = draft.data || {};
    fields().forEach(el => {
      const idn = el.id;
      if(el.type === "checkbox"){ if(idn in data) el.checked = !!data[idn]; }
      else if(el.type === "radio"){ if(data[el.name] != null) el.checked = (data[el.name] === el.value); }
      else if(idn in data && data[idn] != null){ el.value = data[idn]; }
    });
    setActiveId(id);
    // Write the working copy directly rather than via save(), so merely opening a
    // draft does not bump `updated`. `updated` means last edit, not last open.
    try{ localStorage.setItem(KEY, JSON.stringify(collect())); }catch(e){}
    flash("Draft loaded");
    evalConditionals();
    refreshEnhance();
  }
  function renderDraftsPanel(){
    let panel = document.getElementById('draftsPanel');
    if(!panel){
      panel = document.createElement('div'); panel.id = 'draftsPanel'; panel.className = 'drafts-panel';
      panel.style.cssText = 'position:fixed;right:12px;top:60px;width:360px;max-height:70vh;overflow:auto;background:#fff;border:1px solid #e6e6e6;padding:12px;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.12);z-index:9999;font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;';
      document.body.appendChild(panel);
    }
    const list = getDrafts();
    const active = getActiveDraft();
    const nameValue = active ? active.name : suggestedName();

    const banner = active
      ? `<div style="background:#eef4ff;border:1px solid #d3e2ff;color:#1f3fbf;padding:8px 10px;border-radius:6px;font-size:12.5px;margin-bottom:10px;">Auto-saving into <b>${escapeHtml(active.name)}</b></div>`
      : `<div style="background:#fff7e6;border:1px solid #ffe0a3;color:#8a5a00;padding:8px 10px;border-radius:6px;font-size:12.5px;margin-bottom:10px;">Not filed as a draft. Entries are still kept on this device — use <b>Save as new</b> to file them.</div>`;

    const btnPrimary = 'padding:6px 10px;background:#2b6eed;color:#fff;border:none;border-radius:6px;cursor:pointer';
    const btnGhost   = 'padding:6px 10px;background:#fff;color:#2b6eed;border:1px solid #2b6eed;border-radius:6px;cursor:pointer';
    const buttons = (active ? `<button id="updateDraft" style="${btnPrimary}">Update</button>` : '')
      + `<button id="newDraft" style="${active ? btnGhost : btnPrimary}">Save as new</button>`
      + (active ? `<button id="detachDraft" style="padding:6px 10px;background:#fff;color:#666;border:1px solid #ddd;border-radius:6px;cursor:pointer">Detach</button>` : '');

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong>Drafts</strong>
        <button id="closeDrafts" style="font-size:12px;background:transparent;border:none;cursor:pointer">✕</button>
      </div>
      ${banner}
      <input id="draftNameInput" placeholder="Draft name" style="width:100%;box-sizing:border-box;padding:6px;border:1px solid #ddd;border-radius:6px" value="${escapeHtml(nameValue)}" />
      <div style="display:flex;gap:8px;margin:8px 0 12px;">${buttons}</div>
      <div style="font-size:13px;color:#666;margin-bottom:8px">Saved drafts on this device</div>
    `;

    if(list.length === 0){ panel.insertAdjacentHTML('beforeend','<div style="color:#666">No drafts saved on this device.</div>'); }
    else{
      list.forEach(d => {
        const isActive = !!(active && d.id === active.id);
        const item = document.createElement('div');
        item.style.cssText = 'border-top:1px solid #f1f1f1;padding:10px 0;display:flex;gap:10px;align-items:center;'
          + (isActive ? 'background:#f7faff;' : '');
        const avatar = document.createElement('div');
        avatar.style.cssText = 'width:40px;height:40px;border-radius:50%;background:#f3f6ff;color:#1f3fbf;display:flex;align-items:center;justify-content:center;font-weight:700;border:1px solid #e6eefc;flex:0 0 auto';
        avatar.textContent = initialsOf(d.name).slice(0,3);
        const stamp = new Date(d.created).toLocaleString()
          + (d.updated && d.updated !== d.created ? ' · updated ' + new Date(d.updated).toLocaleString() : '');
        const info = document.createElement('div'); info.style.flex = '1';
        info.innerHTML = `<div style="font-weight:600">${escapeHtml(d.name)}${isActive ? ' <span style="font-weight:500;font-size:11px;color:#1f3fbf">· editing</span>' : ''}</div><div style="font-size:12px;color:#888">${escapeHtml(stamp)}</div>`;
        const actions = document.createElement('div');
        actions.innerHTML = `<button data-load="${d.id}" style="margin-right:6px;padding:6px 8px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Open</button><button data-delete="${d.id}" style="padding:6px 8px;border-radius:6px;border:1px solid #f1c0c0;background:#fff;color:#b00000;cursor:pointer">Delete</button>`;
        item.appendChild(avatar); item.appendChild(info); item.appendChild(actions); panel.appendChild(item);
      });
    }

    const draftName = () => panel.querySelector('#draftNameInput').value.trim();
    panel.querySelector('#closeDrafts').addEventListener('click', () => panel.remove());
    const updateBtn = panel.querySelector('#updateDraft');
    if(updateBtn) updateBtn.addEventListener('click', () => {
      const name = draftName();
      if(!name){ alert('Please provide a draft name.'); return; }
      updateActiveDraft(name); renderDraftsPanel();
    });
    panel.querySelector('#newDraft').addEventListener('click', () => {
      const name = draftName();
      if(!name){ alert('Please provide a draft name.'); return; }
      createDraft(name); renderDraftsPanel();
    });
    const detachBtn = panel.querySelector('#detachDraft');
    if(detachBtn) detachBtn.addEventListener('click', () => { detachDraft(); renderDraftsPanel(); });
    panel.querySelectorAll('button[data-load]').forEach(b => b.addEventListener('click', e => { loadDraft(e.currentTarget.getAttribute('data-load')); panel.remove(); }));
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
    runEnhance();

    // autosave + live conditional evaluation
    document.addEventListener("input", e => {
      if(e.target.matches("[data-field]")) save();
    });
    document.addEventListener("change", e => {
      if(e.target.matches("[data-field]")){ save(); }
      evalConditionals();
    });

    // folder buttons/labels (per-view)
    document.querySelectorAll('[id$="folderLabel"]').forEach(lbl => lbl.textContent = PDF.folderLabel());
    document.querySelectorAll('.btn-folder').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await PDF.pickFolder();
      document.querySelectorAll('[id$="folderLabel"]').forEach(lbl => lbl.textContent = PDF.folderLabel());
      if(ok) flash('Save folder set');
    }));

    // clear (per-view clear buttons)
    document.querySelectorAll('.btn-clear').forEach(b => b.addEventListener('click', () => {
      if(!confirm('Clear all entries on this device? This cannot be undone.')) return;
      fields().forEach(el => {
        if(el.type === 'checkbox' || el.type === 'radio') el.checked = false;
        else el.value = '';
      });
      try{ localStorage.removeItem(KEY); }catch(e){}
      // Detach first: a cleared form must not blank out the draft it was editing.
      setActiveId(null);
      applyDefaults();
      evalConditionals();
      refreshEnhance();
      flash('Cleared', false);
    }));

    // Drafts list buttons (per-view). Attach to any .btn-draftlist so prefixed ids work.
    document.querySelectorAll('.btn-draftlist').forEach(b => b.addEventListener('click', () => { renderDraftsPanel(); }));

    // export PDF (attach to any .btn-pdf)
    document.querySelectorAll('.btn-pdf').forEach(b => b.addEventListener('click', async () => {
      save();
      if(!window.jspdf){ alert("PDF library failed to load. Make sure the 'vendor' folder sits next to this app."); return; }
      const FORM_NOW = window.FORM || FORM || {};
      if(typeof FORM_NOW.build !== 'function'){ alert('Form schema missing.'); return; }
      try{
        const doc = FORM_NOW.build(PDF.get, PDF.buildDoc);
        const blob = doc.output('blob');
        const res = await PDF.saveBlob(blob, PDF.pdfFilename());
        flash(res.saved ? `Saved → ${res.folder}/${res.filename}` : `Downloaded ${res.filename}`, false);
      }catch(err){ console.error(err); alert('Could not generate the PDF.\n\n' + (err && err.message ? err.message : err)); }
    }));
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
