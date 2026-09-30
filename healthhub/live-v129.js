(function(){
'use strict';

/* HealthRadar parity phase 3: Léna explanation button and local explanation editor/import. */
var DB='healthhub-healthradar-v2';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toastMsg(s){try{if(window.toast)window.toast(s)}catch(e){}}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function put(store,val){var db=await openDb();try{await reqP(db.transaction(store,'readwrite').objectStore(store).put(val))}finally{db.close()}}
function fmtDate(s){if(!s)return '';var d=new Date(String(s).indexOf('T')>=0?s:s+'T00:00:00');return isNaN(d.getTime())?String(s):new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'short',day:'numeric'}).format(d)}
function arr(x){return Array.isArray(x)?x:[]}
function selectedExplanation(d){
 if(d&&d.lenaExplanationManual)return {explanation:d.lenaExplanationManual,source:'manual'};
 if(d&&d.lenaExplanationImported)return {explanation:d.lenaExplanationImported,source:d.lenaExplanationImportedSource||'built_in'};
 return null;
}
function listSection(title,items,tone){
 items=arr(items);if(!items.length)return '';
 var bg=tone==='amber'?'#fff8e8':tone==='violet'?'#f7f5ff':tone==='teal'?'#f3faf8':'#f7f9fb';
 return '<section style="margin-top:13px"><h4>'+esc(title)+'</h4><ul style="list-style:none;padding:0;margin:6px 0 0">'+items.map(function(x){return '<li style="background:'+bg+';border-radius:12px;padding:9px 10px;margin-top:6px;font-size:10px;line-height:1.45;color:#405c72">✓ '+esc(x)+'</li>'}).join('')+'</ul></section>';
}
function explanationHtml(d){
 var s=selectedExplanation(d);
 if(!s){
  return '<h2>Léna magyarázata</h2><div class="hrDetailMeta">'+esc(d.originalName||'')+'</div>'+
   '<div style="margin-top:10px;border:1px solid #f0d69b;background:#fff8e8;border-radius:14px;padding:12px"><b style="font-size:11px;color:#7c5812">Ehhez a dokumentumhoz még nincs átvitt magyarázat</b><p style="font-size:10px;line-height:1.45;color:#735f35">Az eredeti PDF megnyitható. Léna nem következtet a fájlnévből, ezért csak az eredeti HealthRadarból átvitt vagy külön ellenőrzött magyarázat jelenik meg.</p></div>'+
   '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhEditLenaExplanation(\''+d.id+'\')">Magyarázat készítése / szerkesztése</button><button class="vaultBtn" onclick="hhChooseExplanationImport()">Régi magyarázatok importálása</button></div>';
 }
 var e=s.explanation||{};
 return '<h2>Léna magyarázata</h2><div class="hrDetailMeta">'+esc(d.originalName||'')+'</div>'+
  '<div style="border:1px solid #d9efe9;background:#f3faf8;border-radius:14px;padding:12px;margin-top:9px"><small style="font-weight:800;color:#317f77;text-transform:uppercase">Röviden</small><h3 style="font-size:15px;margin:7px 0 5px;color:#0b2d50">'+esc(e.title||'Dokumentum összefoglaló')+'</h3><p style="margin:0;font-size:10px;line-height:1.5">'+esc(e.summary||'')+'</p></div>'+
  listSection('A lelet fő pontjai',e.keyFindings,'slate')+
  listSection('Mit jelent közérthetően?',e.meaning,'teal')+
  listSection('Mire érdemes figyelni?',e.attention,'amber')+
  listSection('Kérdések a következő kontrollra',e.questions,'violet')+
  '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:8px;color:#74899a"><span>Forrás: a kiválasztott eredeti PDF · '+(s.source==='manual'?'egyedileg mentett':s.source==='manual_old'?'régi HealthRadarban kézzel mentett':'beépített, ellenőrzött')+'</span><span>Ellenőrizve: '+esc(fmtDate(e.reviewedAt))+'</span></div>'+
  '<p class="privacyNote" style="background:#fff8e8;border-radius:12px;padding:9px"><b>Fontos:</b> Ez a dokumentum közérthető összefoglalása, nem új diagnózis és nem kezelési utasítás.</p>'+
  '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhEditLenaExplanation(\''+d.id+'\')">Szerkesztés</button>'+(d.lenaExplanationManual&&d.lenaExplanationImported?'<button class="vaultBtn" onclick="hhResetLenaExplanation(\''+d.id+'\')">Régi változat visszaállítása</button>':'<button class="vaultBtn" onclick="openHrDocument(\''+d.id+'\')">Eredeti PDF</button>')+'</div>';
}

window.hhOpenLenaExplanation=async function(id){
 var d=await one('documents',id);if(!d)return;
 var o=document.getElementById('hrDetailOverlay'),c=document.getElementById('hrDetailContent');if(!o||!c)return;
 c.innerHTML=explanationHtml(d);o.classList.add('on');
};

function lines(x){return arr(x).join('\n')}
function textLines(id){return String((document.getElementById(id)||{}).value||'').split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean)}
window.hhEditLenaExplanation=async function(id){
 var d=await one('documents',id);if(!d)return;var s=selectedExplanation(d),e=s?s.explanation:{};
 var c=document.getElementById('hrDetailContent'),o=document.getElementById('hrDetailOverlay');if(!c||!o)return;
 c.innerHTML='<h2>Léna magyarázata · szerkesztés</h2><div class="hrDetailMeta">'+esc(d.originalName||'')+'</div>'+
  '<label><h4>Cím</h4><input id="hhLeTitle" value="'+esc(e.title||'')+'" maxlength="160" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px"></label>'+
  '<label><h4>Rövid összefoglaló</h4><textarea id="hhLeSummary" maxlength="2000" style="width:100%;box-sizing:border-box;min-height:90px;border:1px solid #dfe7ed;border-radius:12px;padding:9px 10px">'+esc(e.summary||'')+'</textarea></label>'+
  '<label><h4>A lelet fő pontjai</h4><textarea id="hhLeKey" style="width:100%;box-sizing:border-box;min-height:82px;border:1px solid #dfe7ed;border-radius:12px;padding:9px 10px">'+esc(lines(e.keyFindings))+'</textarea></label>'+
  '<label><h4>Mit jelent közérthetően?</h4><textarea id="hhLeMeaning" style="width:100%;box-sizing:border-box;min-height:82px;border:1px solid #dfe7ed;border-radius:12px;padding:9px 10px">'+esc(lines(e.meaning))+'</textarea></label>'+
  '<label><h4>Mire érdemes figyelni?</h4><textarea id="hhLeAttention" style="width:100%;box-sizing:border-box;min-height:82px;border:1px solid #dfe7ed;border-radius:12px;padding:9px 10px">'+esc(lines(e.attention))+'</textarea></label>'+
  '<label><h4>Kérdések a következő kontrollra</h4><textarea id="hhLeQuestions" style="width:100%;box-sizing:border-box;min-height:82px;border:1px solid #dfe7ed;border-radius:12px;padding:9px 10px">'+esc(lines(e.questions))+'</textarea></label>'+
  '<label><h4>Ellenőrzés dátuma</h4><input id="hhLeReviewed" type="date" value="'+esc(e.reviewedAt||new Date().toISOString().slice(0,10))+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 9px"></label>'+
  '<p class="privacyNote">Csak az eredeti PDF alapján ellenőrzött tartalmat ments el. Minden új sor külön felsorolási pont lesz.</p>'+
  '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhSaveLenaExplanation(\''+d.id+'\')">Magyarázat mentése</button><button class="vaultBtn" onclick="hhOpenLenaExplanation(\''+d.id+'\')">Mégse</button></div>';
 o.classList.add('on');
};
window.hhSaveLenaExplanation=async function(id){
 var d=await one('documents',id);if(!d)return;
 var title=document.getElementById('hhLeTitle').value.trim(),summary=document.getElementById('hhLeSummary').value.trim();
 if(!title||!summary){toastMsg('A cím és a rövid összefoglaló szükséges.');return}
 d.lenaExplanationManual={title:title,summary:summary,keyFindings:textLines('hhLeKey'),meaning:textLines('hhLeMeaning'),attention:textLines('hhLeAttention'),questions:textLines('hhLeQuestions'),reviewedAt:document.getElementById('hhLeReviewed').value||new Date().toISOString().slice(0,10)};
 await put('documents',d);toastMsg('Léna magyarázata mentve');window.hhOpenLenaExplanation(id);
};
window.hhResetLenaExplanation=async function(id){
 var d=await one('documents',id);if(!d)return;delete d.lenaExplanationManual;await put('documents',d);toastMsg('A régi HealthRadar-változat visszaállítva');window.hhOpenLenaExplanation(id);
};

function ensureImport(){
 if(document.getElementById('hhExplanationImportInput'))return;
 var i=document.createElement('input');i.id='hhExplanationImportInput';i.type='file';i.accept='.json,application/json';i.style.display='none';
 i.onchange=async function(e){var f=e.target.files&&e.target.files[0];e.target.value='';if(f)await window.hhImportExplanationPackage(f)};
 document.body.appendChild(i);
}
window.hhChooseExplanationImport=function(){ensureImport();document.getElementById('hhExplanationImportInput').click()};
window.hhImportExplanationPackage=async function(file){
 try{
  var pkg=JSON.parse(await file.text()),items=Array.isArray(pkg.explanations)?pkg.explanations:[];
  if(!items.length)throw new Error('A fájlban nincs HealthRadar magyarázat.');
  var done=0,missing=0;
  for(var i=0;i<items.length;i++){
   var x=items[i],d=await one('documents',x.id);if(!d){missing++;continue}
   if(x.explanation){d.lenaExplanationImported=x.explanation;d.lenaExplanationImportedSource=x.source||'built_in';await put('documents',d);done++}
  }
  toastMsg(done+' Léna-magyarázat importálva'+(missing?', '+missing+' dokumentum nem található':'')+'.');
  document.getElementById('hrDetailOverlay')?.classList.remove('on');
  if(window.renderHealthSection)await window.renderHealthSection();
 }catch(e){console.error(e);toastMsg('Magyarázat-import hiba: '+(e.message||e))}
};

function decorateExplanationButtons(){
 if(window.healthSectionKind!=='records')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var rows=root.querySelectorAll('.hrRow[onclick*="hhOpenDocumentDetail"]');
 rows.forEach(function(r){
  if(r.querySelector('.hhLenaExplainBtn'))return;
  var onclick=r.getAttribute('onclick')||'',m=onclick.match(/hhOpenDocumentDetail\('([^']+)'\)/);if(!m)return;
  var id=m[1],tail=r.querySelector('.hrTag');
  var wrap=document.createElement('span');wrap.style.cssText='display:flex;align-items:center;gap:4px;justify-content:flex-end;flex-wrap:wrap';
  if(tail){tail.replaceWith(wrap);wrap.appendChild(tail)}
  else r.appendChild(wrap);
  var b=document.createElement('button');b.type='button';b.className='hhLenaExplainBtn';
  b.textContent='✨ Léna magyarázata';b.style.cssText='border:0;border-radius:11px;padding:5px 7px;background:#eaf8f4;color:#317f77;font-size:7.5px;font-weight:850;white-space:nowrap;cursor:pointer';
  b.onclick=function(e){e.stopPropagation();window.hhOpenLenaExplanation(id)};wrap.appendChild(b);
 });
}
var prevRender=window.renderHealthSection;
if(typeof prevRender==='function'){
 window.renderHealthSection=async function(){var r=await prevRender.apply(this,arguments);decorateExplanationButtons();return r};
}
ensureImport();
setTimeout(decorateExplanationButtons,100);
document.documentElement.dataset.healthhubLenaExplain='1.29';
window.HH_LIVE_BUILD='v1.29-lena-explain';
})();