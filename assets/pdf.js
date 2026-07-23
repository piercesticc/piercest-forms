/* ============================================================
   Pierce St ICC Forms App — shared PDF engine
   Ported from the "Session Companion" buildDoc/slug/saveBlob
   pipeline. Form-agnostic: reads window.FORM for meta + naming.
   Adds a "flag" block type for risk / refer-out callouts.
   ============================================================ */
(function(){
  "use strict";

  const $ = id => document.getElementById(id);

  // ----- value getters -----
  const val = id => {
    const el = $(id);
    if(!el) return "";
    if(el.type === "checkbox") return el.checked ? "Yes" : "No";
    return (el.value || "").trim();
  };
  const radio = name => {
    const s = document.querySelector(`input[name="${name}"]:checked`);
    return s ? s.value : "";
  };
  // convenience getter passed to schema builders: get(id) -> string
  const get = id => val(id);
  get.radio = radio;

  // ----- filename helpers -----
  function todayISO(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  // Parse a free-text birthdate (MM/DD/YYYY, YYYY-MM-DD, M/D/YY, etc.) → Date or null.
  function parseDOB(s){
    s = (s || "").trim(); if(!s) return null;
    function mk(y, mo, da){ const d = new Date(y, mo-1, da); return (d.getFullYear()===y && d.getMonth()===mo-1 && d.getDate()===da) ? d : null; }
    let m;
    if(m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/)) return mk(+m[1], +m[2], +m[3]);       // ISO-ish
    if(m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/)){                                    // M/D/Y
      let y = +m[3];
      if(y < 100){ y += (y <= (new Date().getFullYear() % 100) ? 2000 : 1900); }
      return mk(y, +m[1], +m[2]);
    }
    const d = new Date(s); return isNaN(d.getTime()) ? null : d;
  }
  function ageFromDOB(s){
    const dob = parseDOB(s); if(!dob) return "";
    const t = new Date();
    let a = t.getFullYear() - dob.getFullYear();
    if(t.getMonth() < dob.getMonth() || (t.getMonth() === dob.getMonth() && t.getDate() < dob.getDate())) a--;
    return (a >= 0 && a <= 130) ? String(a) : "";
  }
  function metaCfg(){ return (window.FORM && window.FORM.meta) || {}; }
  function clientNameRaw(){ const m = metaCfg(); return (val(m.nameId||"") || "").trim(); }
  function dateRaw(){ const m = metaCfg(); return (val(m.dateId||"") || "").trim(); }

  function initials(){
    const name = clientNameRaw();
    if(!name) return "";
    const parts = name.split(/\s+/).filter(Boolean);
    if(parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    return parts[0].slice(0,2).toUpperCase();
  }
  function nameSlug(){
    return ((clientNameRaw() || "client").replace(/[^\w-]+/g,"_").slice(0,40)) || "client";
  }
  function dateSlug(){
    return (dateRaw() || todayISO()).replace(/[^\w-]+/g,"-");
  }
  // id used in filenames + folder name
  function slug(){
    const mode = (window.FORM && window.FORM.filenameId) || "name";
    const who = mode === "initials" ? (initials() || nameSlug()) : nameSlug();
    return `${who}_${dateSlug()}`;
  }
  function pdfFilename(){
    const suffix = (window.FORM && window.FORM.filenameSuffix) || "Form";
    return `${slug()}_${suffix}.pdf`;
  }

  // ----- save folder (File System Access API) + download fallback -----
  let baseDir = null;
  function hasDirPicker(){ return typeof window.showDirectoryPicker === "function"; }
  async function pickFolder(){
    if(!hasDirPicker()){
      alert("Automatic folder saving needs Chrome or Edge.\n\nIn other browsers the PDF simply downloads to your Downloads folder with the Initials_Date filename — you can then upload it wherever it needs to go.");
      return false;
    }
    try{ baseDir = await window.showDirectoryPicker({mode:"readwrite"}); return true; }
    catch(e){ return false; /* user cancelled */ }
  }
  function folderLabel(){ return baseDir ? `▸ ${baseDir.name}/` : "not set — PDF will download"; }
  async function targetDir(){
    if(!baseDir) return null;
    try{
      let perm = await baseDir.queryPermission({mode:"readwrite"});
      if(perm !== "granted"){ perm = await baseDir.requestPermission({mode:"readwrite"}); if(perm !== "granted") return null; }
      return baseDir;
    }catch(e){ return null; }
  }
  async function saveBlob(blob, filename){
    const dir = await targetDir();
    if(dir){
      try{
        const fh = await dir.getFileHandle(filename, {create:true});
        const ws = await fh.createWritable(); await ws.write(blob); await ws.close();
        return {saved:true, filename, folder:baseDir.name};
      }catch(e){ /* fall through to download */ }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
    return {saved:false, filename};
  }

  // ----- the PDF document builder -----
  // meta: {roleLabel, roleId}  -> prints "Client · Date · <roleLabel>: <value>"
  function buildDoc(title, items, meta){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:"pt", format:"letter"});
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    const M = 54, cw = pageW - M*2, ACC = [58,90,120], WARN = [192,88,79], WARNBG = [251,236,236];
    let y = M;
    const need = h => { if(y + h > pageH - 50){ doc.addPage(); y = M; } };

    // org header
    doc.setTextColor(...ACC); doc.setFont("helvetica","bold"); doc.setFontSize(13);
    doc.text("Integral Counseling Center", M, y); y += 15;
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text("2140 Pierce Street, San Francisco, CA 94115  ·  415-776-3109", M, y); y += 16;
    doc.setDrawColor(...ACC); doc.setLineWidth(1.2); doc.line(M, y, pageW-M, y); y += 20;

    // title + meta line
    doc.setTextColor(...ACC); doc.setFont("helvetica","bold"); doc.setFontSize(15);
    doc.text(title, M, y); y += 16;
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(90);
    const m = meta || {};
    const roleLabel = m.roleLabel || "Therapist";
    const roleId = metaCfg().roleId || m.roleId;   // prefer active window.FORM (bundle-safe)
    const roleVal = roleId ? (val(roleId) || "—") : "—";
    doc.text(`Client: ${clientNameRaw() || "—"}      Date: ${dateRaw() || "—"}      ${roleLabel}: ${roleVal}`, M, y);
    y += 8;
    doc.setTextColor(40);

    items.forEach(it => {
      if(it.type === "section"){
        need(28); y += 12;
        doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...ACC);
        doc.text(String(it.text).toUpperCase(), M, y);
        doc.setDrawColor(205); doc.setLineWidth(.5); doc.line(M, y+4, pageW-M, y+4);
        y += 16; doc.setTextColor(40);

      } else if(it.type === "field"){
        if(it.skipEmpty && !String(it.v || "").trim()) return;
        doc.setFontSize(10);
        const label = it.k + ":  ";
        doc.setFont("helvetica","bold"); const lw = doc.getTextWidth(label); doc.setFont("helvetica","normal");
        const lines = doc.splitTextToSize(String(it.v || "—"), cw - lw);
        need(lines.length*13 + 2);
        doc.setFont("helvetica","bold"); doc.text(label, M, y);
        doc.setFont("helvetica","normal"); doc.text(lines, M+lw, y);
        y += lines.length*13 + 3;

      } else if(it.type === "para"){
        if(it.skipEmpty && !String(it.v || "").trim()) return;
        doc.setFontSize(10);
        const hasLabel = it.k && it.k.trim();
        need(hasLabel ? 15 : 13);
        if(hasLabel){ doc.setFont("helvetica","bold"); doc.text(it.k, M, y); y += 13; }
        doc.setFont("helvetica","normal");
        const lines = doc.splitTextToSize(String(it.v || "—"), cw);
        lines.forEach(ln => { need(13); doc.text(ln, M, y); y += 13; });
        y += 5;

      } else if(it.type === "flag"){
        // risk / refer-out callout: tinted box, colored left bar, bold red label.
        // (No emoji — jsPDF's built-in Helvetica has no ⚠ glyph.)
        doc.setFontSize(10);
        const label = "! " + String(it.k || "Flag").toUpperCase();
        const body = String(it.v || "").trim();
        const bodyLines = body ? doc.splitTextToSize(body, cw - 20) : [];
        const boxH = 16 + (bodyLines.length ? bodyLines.length*13 + 6 : 4);
        need(Math.min(boxH, 60) + 6); // keep label + first lines together
        const top = y - 10;
        doc.setFillColor(...WARNBG); doc.rect(M, top, cw, boxH, "F");
        doc.setFillColor(...WARN); doc.rect(M, top, 3, boxH, "F");
        doc.setTextColor(...WARN); doc.setFont("helvetica","bold");
        doc.text(label, M+12, y+2); y += 15;
        if(bodyLines.length){
          doc.setFont("helvetica","normal"); doc.setTextColor(110,40,36);
          bodyLines.forEach(ln => { need(13); doc.text(ln, M+12, y); y += 13; });
        }
        doc.setTextColor(40); y += 8;

      } else if(it.type === "sig"){
        need(46); y += 22; const colW = (cw - 30)/2;
        doc.setDrawColor(60); doc.setLineWidth(.5);
        doc.line(M, y, M+colW, y); doc.line(M+colW+30, y, pageW-M, y);
        y += 12; doc.setFontSize(9); doc.setTextColor(80);
        doc.text(it.left || "", M, y); doc.text(it.right || "", M+colW+30, y);
        doc.setTextColor(40); y += 6;
      }
    });

    // footers
    const total = doc.internal.getNumberOfPages();
    for(let p=1; p<=total; p++){
      doc.setPage(p); doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(120);
      doc.text("Confidential — contains protected health information", M, pageH-30);
      doc.text(`Page ${p} of ${total}`, pageW-M, pageH-30, {align:"right"});
    }
    return doc;
  }

  // expose
  window.ICCPDF = {
    $, val, radio, get, buildDoc, saveBlob, slug, pdfFilename,
    pickFolder, folderLabel, hasDirPicker, todayISO, ageFromDOB
  };
})();
