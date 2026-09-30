(function(){
'use strict';

/* HealthRadar parity: personal & safety profile card + GP contact/edit.
   Reads/writes only the private local IndexedDB profile store. */
var DB='healthhub-healthradar-v2';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function toastMsg(s){try{if(window.toast)window.toast(s)}catch(e){}}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function put(store,val){var db=await openDb();try{await reqP(db.transaction(store,'readwrite').objectStore(store).put(val))}finally{db.close()}}
function age(b){
 if(!b)return '—';var d=new Date(b+'T00:00:00'),n=new Date(),a=n.getFullYear()-d.getFullYear();
 if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;
 return a>=0?a+' év':'—';
}
function stat(label,value){return '<div class="hrStat"><small>'+esc(label)+'</small><b>'+esc(value||'—')+'</b></div>'}
function telHref(s){return 'tel:'+String(s||'').replace(/[^+\d]/g,'')}
function mailHref(s){return 'mailto:'+encodeURIComponent(String(s||''))}
function input(id,label,value,type){
 type=type||'text';
 return '<label><h4>'+esc(label)+'</h4><input id="'+id+'" type="'+type+'" value="'+esc(value||'')+'" style="width:100%;box-sizing:border-box;height:42px;border:1px solid #dfe7ed;border-radius:12px;padding:0 10px"></label>';
}
function textarea(id,label,value){
 return '<label><h4>'+esc(label)+'</h4><textarea id="'+id+'" style="width:100%;box-sizing:border-box;min-height:76px;border:1px solid #dfe7ed;border-radius:12px;padding:9px 10px">'+esc(value||'')+'</textarea></label>';
}

function ensureOverlay(){
 if(document.getElementById('hhProfileOverlay'))return;
 var o=document.createElement('div');o.id='hhProfileOverlay';o.className='hrDetailOverlay';
 o.onclick=function(e){if(e.target===o)o.classList.remove('on')};
 o.innerHTML='<div class="hrDetailSheet"><div class="hrSheetHandle"></div><button class="hrClose" onclick="document.getElementById(\'hhProfileOverlay\').classList.remove(\'on\')">×</button><div id="hhProfileContent"></div></div>';
 document.body.appendChild(o);
}

window.hhEditHealthProfile=async function(){
 ensureOverlay();
 var p=await one('profiles',pkey());if(!p)return;
 var c=document.getElementById('hhProfileContent');
 c.innerHTML='<h2>Profil szerkesztése</h2><div class="hrDetailMeta">'+esc(pname())+'</div>'+
  '<div class="hrStatGrid">'+
   input('hhPfBirth','Születési dátum',p.birthDate,'date')+
   input('hhPfHeight','Magasság (cm)',p.heightCm,'number')+
   input('hhPfWeight','Testsúly (kg)',p.weightKg,'number')+
   input('hhPfBlood','Vércsoport',p.bloodType)+
  '</div>'+
  textarea('hhPfMedAllergy','Gyógyszerérzékenység / allergia',p.medicationAllergies)+
  textarea('hhPfFoodAllergy','Ételérzékenység',p.foodAllergies)+
  textarea('hhPfConditions','Ismert betegségek',p.knownConditions)+
  '<h4>Háziorvos</h4>'+
  input('hhPfDoc','Háziorvos neve',p.doctorName)+
  input('hhPfClinic','Rendelő neve',p.clinicName)+
  input('hhPfAddress','Rendelő címe',p.clinicAddress)+
  '<div class="hrStatGrid">'+input('hhPfPhone','Telefon',p.doctorPhone,'tel')+input('hhPfEmail','E-mail',p.doctorEmail,'email')+'</div>'+
  '<h4>BetegRENDELÉS</h4>'+
  '<div class="hrStatGrid">'+
   input('hhPfMon','Hétfő',p.officeHoursMonday)+
   input('hhPfTue','Kedd',p.officeHoursTuesday)+
   input('hhPfWed','Szerda',p.officeHoursWednesday)+
   input('hhPfThu','Csütörtök',p.officeHoursThursday)+
   input('hhPfFri','Péntek',p.officeHoursFriday)+
  '</div>'+
  '<p class="privacyNote">A módosítások csak ezen a készüléken, a privát HealthRadar-tárban maradnak.</p>'+
  '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhSaveHealthProfile()">Mentés</button><button class="vaultBtn" onclick="document.getElementById(\'hhProfileOverlay\').classList.remove(\'on\')">Mégse</button></div>';
 document.getElementById('hhProfileOverlay').classList.add('on');
};

window.hhSaveHealthProfile=async function(){
 var p=await one('profiles',pkey());if(!p)return;
 var val=function(id){return (document.getElementById(id)||{}).value||''};
 p.birthDate=val('hhPfBirth')||p.birthDate;
 p.heightCm=val('hhPfHeight')?Number(val('hhPfHeight')):null;
 p.weightKg=val('hhPfWeight')?Number(val('hhPfWeight')):null;
 p.bloodType=val('hhPfBlood');
 p.medicationAllergies=val('hhPfMedAllergy');
 p.foodAllergies=val('hhPfFoodAllergy');
 p.knownConditions=val('hhPfConditions');
 p.doctorName=val('hhPfDoc');p.clinicName=val('hhPfClinic');p.clinicAddress=val('hhPfAddress');
 p.doctorPhone=val('hhPfPhone');p.doctorEmail=val('hhPfEmail');
 p.officeHoursMonday=val('hhPfMon');p.officeHoursTuesday=val('hhPfTue');p.officeHoursWednesday=val('hhPfWed');p.officeHoursThursday=val('hhPfThu');p.officeHoursFriday=val('hhPfFri');
 p.updatedAt=new Date().toISOString();
 await put('profiles',p);
 document.getElementById('hhProfileOverlay').classList.remove('on');
 toastMsg('Egészségügyi profil mentve');
 if(window.renderHealthSection)await window.renderHealthSection();
};

async function renderProfileCard(){
 if(window.healthSectionKind!=='overview')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var p=await one('profiles',pkey());if(!p)return;
 var old=document.getElementById('hhPersonalSafetyCard');if(old)old.remove();

 var card=document.createElement('div');card.id='hhPersonalSafetyCard';card.className='hrSectionCard';
 var days=[
  ['Hétfő',p.officeHoursMonday],['Kedd',p.officeHoursTuesday],['Szerda',p.officeHoursWednesday],
  ['Csütörtök',p.officeHoursThursday],['Péntek',p.officeHoursFriday]
 ];
 card.innerHTML='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">'+
  '<div><div style="font-size:7px;font-weight:900;letter-spacing:.13em;color:#b85e54;text-transform:uppercase">Saját egészségügyi profil · '+esc(pname())+'</div><h3 style="margin:4px 0 3px">Személyes és biztonsági adatok</h3><small style="color:#70869a">Születési adatok, érzékenységek, vércsoport és háziorvosi elérhetőség egy helyen.</small></div>'+
  '<button class="vaultBtn primary" onclick="hhEditHealthProfile()">✎ Profil szerkesztése</button></div>'+
  '<div class="hrStatGrid" style="margin-top:10px">'+
   stat('Életkor',age(p.birthDate))+stat('Magasság',p.heightCm?p.heightCm+' cm':'—')+stat('Testsúly',p.weightKg?p.weightKg+' kg':'—')+stat('Vércsoport',p.bloodType||'—')+
  '</div>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px;margin-top:9px">'+
   '<div style="border:1px solid #f0dfac;background:#fffaf0;border-radius:12px;padding:9px;font-size:8px"><b>Gyógyszerérzékenység:</b> '+esc(p.medicationAllergies||'Nincs megadva')+'</div>'+
   '<div style="border:1px solid #f0dfac;background:#fffaf0;border-radius:12px;padding:9px;font-size:8px"><b>Ételérzékenység:</b> '+esc(p.foodAllergies||'Nincs megadva')+'</div>'+
  '</div>'+
  '<div style="margin-top:10px;border:1px solid #cfeae4;background:#f3fbf8;border-radius:14px;padding:10px">'+
   '<div style="font-size:7px;font-weight:900;letter-spacing:.1em;color:#317f77;text-transform:uppercase">◷ BetegRENDELÉS</div>'+
   '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;margin-top:8px">'+
    days.map(function(d){return '<div style="background:#fff;border-radius:12px;padding:8px;box-shadow:0 4px 12px rgba(31,65,91,.06)"><b style="display:block;font-size:8px;color:#61778d">'+esc(d[0])+'</b><span style="font-size:8px">'+esc(d[1]||'—')+'</span></div>'}).join('')+
   '</div>'+
   '<div class="vaultTools" style="margin-top:8px">'+
    (p.doctorPhone?'<a class="vaultBtn primary" style="text-align:center;text-decoration:none" href="'+esc(telHref(p.doctorPhone))+'">☎ Háziorvos hívása</a>':'')+
    (p.doctorEmail?'<a class="vaultBtn" style="text-align:center;text-decoration:none" href="'+esc(mailHref(p.doctorEmail))+'">✉ E-mail a háziorvosnak</a>':'')+
   '</div>'+
   '<p class="privacyNote" style="margin-bottom:0">'+esc([p.doctorName,p.clinicName,p.clinicAddress].filter(Boolean).join(' · '))+'</p>'+
  '</div>';

 root.insertBefore(card,root.firstChild);
}

var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);await renderProfileCard();return r};
}
ensureOverlay();
setTimeout(renderProfileCard,120);
document.documentElement.dataset.healthhubProfileCard='1.33';
window.HH_LIVE_BUILD='v1.33-profile-card';
})();