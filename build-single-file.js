/* ============================================================
   Build index.html — one self-contained, emailable file that is
   also the site root (localhost:8000 / the Pages URL land here).
   Inlines CSS + jsPDF + the PDF engine + all four form schemas +
   all four form bodies, with a tiny in-page router. Every form's
   ids/names are prefixed so they can coexist in one document.

   Run:  node build-single-file.js
   ============================================================ */
const fs = require("fs");
const path = require("path");
const DIR = __dirname;
const read = f => fs.readFileSync(path.join(DIR, f), "utf8");

const FORMS = [
  { key:"ic",     prefix:"ic-", file:"initial-contact.html", schema:"data/ic-schema.js",     icon:"📞", title:"Initial Contact Form",       who:"Phone shift staff",  blurb:"Phone-shift screening call — contact info, therapeutic frame, screening, and financial questions." },
  { key:"intake", prefix:"in-", file:"intake.html",          schema:"data/intake-schema.js", icon:"📝", title:"First Session Intake Form",  who:"Assigned therapist", blurb:"Individual first-session intake &amp; notes — presenting concerns, history, risk, and the therapist's assessment." },
  { key:"couple", prefix:"co-", file:"couple.html",          schema:"data/couple-schema.js", icon:"💞", title:"Couple Intake Form",         who:"Assigned therapist", blurb:"Two-partner intake — partner-abuse screening, presenting issues, history, and relationship satisfaction." },
  { key:"family", prefix:"fa-", file:"family.html",          schema:"data/family-schema.js", icon:"👪", title:"Family Intake Form",         who:"Assigned counselor", blurb:"Family intake — composition, presenting issues, history, how the family handles things, and assignment." },
];

// ---- prefix ids/names/for + data-show-when triggers within one form's markup ----
function prefixBlock(html, p){
  return html
    .replace(/(\sid=")([^"]+)(")/g,  (m,a,v,z)=>a+p+v+z)
    .replace(/(\sfor=")([^"]+)(")/g, (m,a,v,z)=>a+p+v+z)
    .replace(/(\sname=")([^"]+)(")/g,(m,a,v,z)=>a+p+v+z)
    .replace(/(data-age-of=")([^"]+)(")/g, (m,a,v,z)=>a+p+v+z)
    .replace(/(data-show-when=")([^"]+)(")/g, (m,a,spec,z)=>{
      const out = spec.split(";").map(c=>{
        const [n,vals] = c.split(":");
        return p + n.trim() + (vals!=null ? ":"+vals : "");
      }).join(";");
      return a + out + z;
    });
}

// ---- extract the <div class="wrap">…</div> + <div class="bar">…</div> from a form page ----
function extractBody(html){
  const wrapStart = html.indexOf('<div class="wrap">');
  const barStart  = html.indexOf('<div class="bar">');
  const scriptAt  = html.indexOf('<script');
  const wrap = html.slice(wrapStart, barStart);
  const bar  = html.slice(barStart, scriptAt);
  return (wrap + bar).replace(/href="index\.html"/g, 'href="#home"');
}

// ---- assemble views + registry ----
let views = "";
let registry = "";
for(const f of FORMS){
  const body = prefixBlock(extractBody(read(f.file)), f.prefix);
  views += `\n<section class="view" id="view-${f.key}" hidden>\n${body}\n</section>\n`;
  // schema file is exactly `window.FORM = { … };` — redirect it into REG.<key>
  const schema = read(f.schema).replace(/window\.FORM\s*=\s*/, `REG[${JSON.stringify(f.key)}] = `);
  registry += `\n/* ---- ${f.key} ---- */\n${schema}\nREG[${JSON.stringify(f.key)}].__prefix = ${JSON.stringify(f.prefix)};\n`;
}

const css   = read("assets/clinic.css");
const jspdf = read("vendor/jspdf.umd.min.js");
const pdfjs = read("assets/pdf.js");

// ---- home view (form picker) ----
const cards = FORMS.map(f => `
    <a class="formcard" href="#${f.key}">
      <div class="ic">${f.icon}</div>
      <h2>${f.title}</h2>
      <p>${f.blurb}</p>
      <span class="who">${f.who}</span>
    </a>`).join("");

const homeView = `
<section class="view" id="view-home">
  <div class="wrap">
    <header class="doc">
      <div class="eyebrow">Integral Counseling Center · Pierce Street</div>
      <h1>Pierce St ICC Forms</h1>
      <div class="sub">2140 Pierce Street, San Francisco CA 94115 · 415-776-3109</div>
      <p style="margin:0;color:var(--muted);font-size:14.5px;">Choose a form. Fill it out, then download a clean PDF to upload to Ensora or SharePoint.</p>
    </header>
    <div class="cardgrid">${cards}
    </div>
    <div class="privacy">
      <b>Your entries stay on this device.</b> Nothing you type is uploaded anywhere — the PDF is created
      right here in your browser, and you save it to your own computer. On a shared phone-shift computer,
      use <b>Clear</b> after each call so the next person starts fresh.
    </div>
  </div>
</section>`;

// ---- in-page controller ----
const controller = `
(function(){
  "use strict";
  var PDF = window.ICCPDF, REG = window.__REG;
  var $$ = function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); };

  function fieldsOf(key){ return $$('#view-'+key+' [data-field]'); }
  function storeKey(key){ return 'PierceStForms:'+key; }

  function collect(key){
    var data={};
    fieldsOf(key).forEach(function(el){
      if(el.type==='checkbox'){ data[el.id]=el.checked; }
      else if(el.type==='radio'){ if(el.checked) data[el.name]=el.value; }
      else { data[el.id]=el.value; }
    });
    return data;
  }
  function save(key){
    try{ localStorage.setItem(storeKey(key), JSON.stringify(collect(key)));
      setStatus(key,'Saved ✓',true);
    }catch(e){ setStatus(key,'Save unavailable (private mode)',false); }
  }
  function load(key){
    var raw; try{ raw=localStorage.getItem(storeKey(key)); }catch(e){ return; }
    if(!raw) return; var data; try{ data=JSON.parse(raw); }catch(e){ return; }
    fieldsOf(key).forEach(function(el){
      if(el.type==='checkbox'){ if(el.id in data) el.checked=!!data[el.id]; }
      else if(el.type==='radio'){ if(data[el.name]!=null) el.checked=(data[el.name]===el.value); }
      else if(el.id in data && data[el.id]!=null){ el.value=data[el.id]; }
    });
  }
  function applyDefaults(key){
    $$('#view-'+key+' [data-default="today"]').forEach(function(el){ if(!el.value) el.value=PDF.todayISO(); });
  }

  // conditionals scoped to a view (ids/names are globally unique via prefix)
  function currentValue(name){
    var c=document.querySelector('input[name="'+name+'"]:checked'); if(c) return c.value;
    var el=document.getElementById(name); if(el){ return el.type==='checkbox'?(el.checked?'Yes':'No'):el.value; }
    return '';
  }
  function evalConds(key){
    $$('#view-'+key+' [data-show-when]').forEach(function(node){
      var show=node.getAttribute('data-show-when').split(';').some(function(cond){
        var parts=cond.split(':'), name=parts[0].trim();
        var wanted=(parts[1]||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
        return wanted.indexOf(currentValue(name))>=0;
      });
      node.hidden=!show;
    });
  }

  var statusTimers={};
  function statusEl(key){ return document.getElementById(REG[key].__prefix+'status'); }
  function setStatus(key,msg,revert){
    var el=statusEl(key); if(!el) return; el.textContent=msg;
    clearTimeout(statusTimers[key]);
    if(revert!==false) statusTimers[key]=setTimeout(function(){ el.textContent='Auto-saving on this device'; },1400);
  }

  function exportPDF(key){
    save(key);
    if(!window.jspdf){ alert('PDF library failed to load.'); return; }
    var form=REG[key], p=form.__prefix;
    var get=function(id){ return PDF.val(p+id); }; get.radio=function(n){ return PDF.radio(p+n); };
    window.FORM = Object.assign({}, form, { meta:{
      nameId:p+form.meta.nameId, dateId:p+form.meta.dateId, roleId:p+form.meta.roleId
    }});
    try{
      var doc=form.build(get, PDF.buildDoc);
      PDF.saveBlob(doc.output('blob'), PDF.pdfFilename()).then(function(res){
        setStatus(key, res.saved?('Saved → '+res.folder+'/'+res.filename):('Downloaded '+res.filename), false);
      });
    }catch(err){ console.error(err); alert('Could not generate the PDF.\\n\\n'+(err&&err.message||err)); }
  }

  function setupAutoAge(key){
    $$('#view-'+key+' [data-age-of]').forEach(function(ageEl){
      var dob=document.getElementById(ageEl.getAttribute('data-age-of'));
      if(!dob) return;
      var recompute=function(){ var age=PDF.ageFromDOB(dob.value); if(age && ageEl.value!==age){ ageEl.value=age; save(key); } };
      dob.addEventListener('input',recompute); dob.addEventListener('change',recompute); recompute();
    });
  }

  function wire(key){
    var p=REG[key].__prefix;
    applyDefaults(key); load(key); evalConds(key); setupAutoAge(key);
    var folderBtn=document.getElementById(p+'folderBtn'), folderLbl=document.getElementById(p+'folderLabel');
    if(folderLbl) folderLbl.textContent=PDF.folderLabel();
    if(folderBtn) folderBtn.addEventListener('click', function(){
      PDF.pickFolder().then(function(ok){ if(folderLbl) folderLbl.textContent=PDF.folderLabel(); if(ok) setStatus(key,'Save folder set'); });
    });
    var clearBtn=document.getElementById(p+'clearBtn');
    if(clearBtn) clearBtn.addEventListener('click', function(){
      if(!confirm('Clear all entries on this device? This cannot be undone.')) return;
      fieldsOf(key).forEach(function(el){ if(el.type==='checkbox'||el.type==='radio') el.checked=false; else el.value=''; });
      try{ localStorage.removeItem(storeKey(key)); }catch(e){}
      applyDefaults(key); evalConds(key); setStatus(key,'Cleared',false);
    });
    var pdfBtn=document.getElementById(p+'pdfBtn');
    if(pdfBtn) pdfBtn.addEventListener('click', function(){ exportPDF(key); });
    var view=document.getElementById('view-'+key);
    view.addEventListener('input', function(e){ if(e.target.matches('[data-field]')) save(key); });
    view.addEventListener('change', function(e){ if(e.target.matches('[data-field]')) save(key); evalConds(key); });
  }

  // router
  var KEYS=Object.keys(REG);
  function show(name){
    var target = (name && REG[name]) ? name : 'home';
    $$('.view').forEach(function(v){ v.hidden = (v.id !== 'view-'+target); });
    window.scrollTo(0,0);
  }
  function fromHash(){ show((location.hash||'#home').slice(1)); }
  window.addEventListener('hashchange', fromHash);

  KEYS.forEach(wire);
  fromHash();
})();
`;

const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'">
<title>Pierce St ICC Forms</title>
<style>
${css}
.view[hidden]{display:none;}
</style>
</head>
<body>
${homeView}
${views}
<script>/* jsPDF */ ${jspdf}</script>
<script>/* PDF engine */ ${pdfjs}</script>
<script>/* form registry */ window.__REG = {}; (function(){ var REG = window.__REG;
${registry}
})();</script>
<script>/* controller */ ${controller}</script>
</body>
</html>
`;

// ---- guard ----------------------------------------------------------------
// The shipped index.html has been hand-edited well past this script's template:
// it carries the drafts module, the #intake-choose view, and the prompts toggle,
// none of which exist above. Rebuilding would silently drop all three. Refuse to
// overwrite unless the caller has read that and passes --force.
const target = path.join(DIR, "index.html");
const outFlag = process.argv.indexOf("--out");
const outPath = outFlag > -1 && process.argv[outFlag + 1]
  ? path.join(DIR, process.argv[outFlag + 1])
  : target;

if (outPath === target && fs.existsSync(target) && !process.argv.includes("--force")) {
  console.error(
    "Refusing to overwrite index.html.\n\n" +
    "The shipped index.html contains features this build template does not:\n" +
    "  • the drafts module (save / open / auto-update, stable draft ids)\n" +
    "  • the #intake-choose view (Individual / Couple / Family picker)\n" +
    "  • the per-form prompts toggle\n\n" +
    "Back-port them into the `controller` template and the home view above,\n" +
    "then re-run with --force. To inspect the build first:\n" +
    "  node build-single-file.js --out build-preview.html\n"
  );
  process.exit(1);
}

fs.writeFileSync(outPath, out);
const kb = Math.round(Buffer.byteLength(out)/1024);
console.log(`Wrote ${path.basename(outPath)} (${kb} KB) — ${FORMS.length} forms bundled.`);
