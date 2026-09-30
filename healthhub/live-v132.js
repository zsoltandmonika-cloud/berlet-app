(function(){
'use strict';

/* HealthRadar parity: richer Health overview using only local private stores. */
var DB='healthhub-healthradar-v2';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function getOne(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function getByProfile(store,p){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).index('profile').getAll(p))}finally{db.close()}}
async function privateRef(){try{var x=await getOne('meta','private-reference');return x&&x.payload?x.payload:null}catch(e){return null}}
function age(birth){
 if(!birth)return '';
 var d=new Date(birth+'T00:00:00'),n=new Date(),a=n.getFullYear()-d.getFullYear();
 if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;
 return a>=0?a+' év':'';
}
function stat(label,value){return '<div class="hrStat"><small>'+esc(label)+'</small><b>'+esc(value||'—')+'</b></div>'}
function splitConditions(s){return String(s||'').split(';').map(function(x){return x.trim()}).filter(Boolean)}

async function renderOverview(){
 if(window.healthSectionKind!=='overview')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var p=pkey(),profile=await getOne('profiles',p),ref=await privateRef();
 var pr=ref&&ref.profiles&&ref.profiles[p]?ref.profiles[p]:{};
 var meds=pr.medications||[],devices=pr.devices||[];
 var docs=await getByProfile('documents',p),meas=await getByProfile('measurements',p),apps=await getByProfile('appointments',p);
 var cond=splitConditions(profile&&profile.knownConditions);
 var title=document.getElementById('healthSubTitle');if(title)title.textContent='Egészségügyi összkép';

 var html='<div class="hrSectionCard"><h3>👤 '+esc(pname())+' profil</h3>'+
  '<div class="hrStatGrid">'+
  stat('Életkor',age(profile&&profile.birthDate))+
  stat('Magasság',profile&&profile.heightCm?profile.heightCm+' cm':'—')+
  stat('Testsúly',profile&&profile.weightKg?profile.weightKg+' kg':'—')+
  stat('Vércsoport',profile&&profile.bloodType||'—')+
  '</div>'+
  '<div class="privacyNote" style="margin-top:9px"><b>Gyógyszerérzékenység:</b> '+esc((profile&&profile.medicationAllergies)||'Nincs megadva')+'<br><b>Ételérzékenység:</b> '+esc((profile&&profile.foodAllergies)||'Nincs megadva')+'</div>'+
  '</div>';

 html+='<div class="hrSectionCard"><h3>❤️ Kiemelt egészségügyi előzmény</h3>';
 if(cond.length){
   html+='<div style="display:grid;gap:7px">'+cond.map(function(x){return '<div style="border:1px solid #f2d9d5;background:#fff8f6;border-radius:13px;padding:10px;font-size:9px;line-height:1.5;color:#5f3a35">✓ '+esc(x)+'</div>'}).join('')+'</div>';
 }else{
   html+='<div class="hrEmpty">Nincs rögzített kiemelt egészségügyi előzmény.</div>';
 }
 html+='</div>';

 html+='<div class="hrSectionCard"><h3>🛡️ Biztonsági információ</h3>';
 if(devices.length){
   html+=devices.map(function(d){return '<div class="hrRow clickable" onclick="openHealthSection(\'devices\')"><div class="hrIco">⌚</div><div><b>'+esc(d.name)+'</b><small>'+esc([d.type,d.implantedAt].filter(Boolean).join(' · '))+'</small></div><span class="hrTag">'+esc(d.status||'eszköz')+'</span></div>'}).join('');
 }else{
   html+='<div class="hrEmpty">Nincs rögzített kiemelt eszköz vagy biztonsági megjegyzés.</div>';
 }
 html+='</div>';

 html+='<div class="hrSectionCard"><h3>💊 Aktuális gyógyszerek</h3>';
 if(meds.length){
   html+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin:5px 0 10px">'+meds.map(function(m){return '<button type="button" class="vaultBtn" style="padding:6px 9px" onclick="hhMedicationPurpose(\''+esc(m.name)+'\')">'+esc(m.name+(m.strength?' · '+m.strength:''))+'</button>'}).join('')+'</div>'+
    '<button class="vaultBtn primary" style="width:100%" onclick="openHealthSection(\'medications\')">Teljes gyógyszerlista</button>';
 }else{
   html+='<div class="hrEmpty">A privát gyógyszerlista még nincs betöltve ezen a készüléken.</div>';
 }
 html+='</div>';

 html+='<div class="hrSectionCard"><h3>📊 Karton állapota</h3>'+
  '<div class="hrStatGrid">'+stat('Leletek',String(docs.length))+stat('Mérések',String(meas.length))+stat('Időpontok',String(apps.length))+stat('Gyógyszerek',String(meds.length))+'</div>'+
  '</div>';

 root.innerHTML=html;
 if(window.hhEnsureHealthProfileSwitches)window.hhEnsureHealthProfileSwitches();
}

var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);await renderOverview();return r};
}
setTimeout(renderOverview,120);
document.documentElement.dataset.healthhubOverview='1.32';
window.HH_LIVE_BUILD='v1.32-overview';
})();