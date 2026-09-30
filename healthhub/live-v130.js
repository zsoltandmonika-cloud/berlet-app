(function(){
'use strict';

/* HealthRadar parity: restore the original "Mire való?" medication helper.
   The medication reference text stays in a private local JSON, not in the public site bundle. */
var DB='healthhub-healthradar-v2';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toastMsg(s){try{if(window.toast)window.toast(s)}catch(e){}}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function metaGet(key){var db=await openDb();try{return await reqP(db.transaction('meta','readonly').objectStore('meta').get(key))}finally{db.close()}}
async function metaPut(value){var db=await openDb();try{await reqP(db.transaction('meta','readwrite').objectStore('meta').put(value))}finally{db.close()}}

async function privateRef(){var x=await metaGet('private-reference');return x&&x.payload?x.payload:null}
async function findMedication(name){
  var ref=await privateRef();if(!ref)return null;
  var p=pkey(),list=(((ref.profiles||{})[p]||{}).medications)||[];
  return list.find(function(x){return x.name===name})||null;
}

window.hhMedicationPurpose=async function(name){
  var m=await findMedication(name);
  var c=document.getElementById('hrDetailContent'),o=document.getElementById('hrDetailOverlay');if(!c||!o)return;
  if(!m){
    c.innerHTML='<h2>Mire való?</h2><div class="hrDetailMeta">'+esc(name)+'</div>'+
      '<p class="privacyNote">A privát gyógyszermagyarázat még nincs betöltve ezen a készüléken.</p>'+
      '<button class="vaultBtn primary" style="width:100%" onclick="hhImportPrivateReference()">Privát gyógyszermagyarázat importálása</button>';
    o.classList.add('on');return;
  }
  c.innerHTML='<h2>'+esc(m.name)+'</h2><div class="hrDetailMeta">'+esc(m.strength||'')+' · '+esc(m.schedule||'')+'</div>'+
    (m.note?'<p class="privacyNote" style="margin-top:0">'+esc(m.note)+'</p>':'')+
    '<h4>Mire való?</h4><p>'+esc(m.purpose||'')+'</p>'+
    '<h4>Hogyan segít?</h4><p>'+esc(m.benefit||'')+'</p>'+
    '<p style="background:#fff8e8;border-radius:12px;padding:10px;margin-top:12px;font-size:10px;line-height:1.5;color:#725414"><b>Fontos:</b> '+esc(m.caution||'')+'</p>'+
    '<p class="privacyNote">Ez közérthető gyógyszermagyarázat. A gyógyszer nevét vagy adagját csak orvosi utasítás alapján módosítsátok.</p>';
  o.classList.add('on');
};

function ensurePrivateInput(){
  if(document.getElementById('hhPrivateReferenceInput'))return;
  var i=document.createElement('input');i.id='hhPrivateReferenceInput';i.type='file';i.accept='.json,application/json';i.style.display='none';
  i.onchange=async function(e){
    var f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
    try{
      var j=JSON.parse(await f.text());
      if(j.schema!=='healthhub-private-reference-v1'||!j.profiles)throw new Error('Nem megfelelő privát HealthRadar referenciafájl.');
      await metaPut({key:'private-reference',importedAt:new Date().toISOString(),payload:j});
      toastMsg('Gyógyszermagyarázatok betöltve');
      document.getElementById('hrDetailOverlay')?.classList.remove('on');
      if(window.renderHealthSection)await window.renderHealthSection();
    }catch(err){console.error(err);toastMsg(err.message||'A privát referencia nem importálható.')}
  };
  document.body.appendChild(i);
}
window.hhImportPrivateReference=function(){ensurePrivateInput();document.getElementById('hhPrivateReferenceInput').click()};

function decorate(){
  if(window.healthSectionKind!=='medications')return;
  var root=document.getElementById('healthSubContent');if(!root)return;
  var rows=root.querySelectorAll('.hrRow[onclick*="medication"]');
  rows.forEach(function(r){
    if(r.querySelector('.hhMedPurposeBtn'))return;
    var name=(r.querySelector('b')||{}).textContent||'';if(!name)return;
    var tag=r.querySelector('.hrTag'),wrap=document.createElement('span');
    wrap.style.cssText='display:flex;align-items:center;gap:4px;justify-content:flex-end;flex-wrap:wrap';
    if(tag){tag.replaceWith(wrap);wrap.appendChild(tag)}else r.appendChild(wrap);
    var b=document.createElement('button');b.type='button';b.className='hhMedPurposeBtn';b.textContent='Mire való?';
    b.style.cssText='border:0;border-radius:11px;padding:5px 8px;background:#eaf8f4;color:#317f77;font-size:7.5px;font-weight:850;white-space:nowrap;cursor:pointer';
    b.onclick=function(e){e.stopPropagation();window.hhMedicationPurpose(name)};wrap.appendChild(b);
  });
}

var prev=window.renderHealthSection;
if(typeof prev==='function'){
  window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);decorate();return r};
}
ensurePrivateInput();
setTimeout(decorate,100);
document.documentElement.dataset.healthhubMedicationPurpose='1.30';
window.HH_LIVE_BUILD='v1.30-med-purpose';
})();