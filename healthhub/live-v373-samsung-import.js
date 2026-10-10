(function(){
'use strict';
/* HealthHub v373: user-confirmed Samsung SDK JSON import into separate Dropbox files.
 * Import is explicitly triggered from Activity > Adatforrasok and is NEVER automatic.
 * No Samsung vendor SDK, health records or access tokens are published in the repo.
 * The canonical Health Connect vault files remain untouched.
 */
var pending=null,busy=false;
var ROOT='hh191Modal';
function api(){return window.HH_SAMSUNG_SOURCE_V371}
function vault(){return window.HH_DROPBOX_VAULT}
function current(){return window.hhActivity191CurrentProfile}
function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function humanDate(s){var x=new Date(s);return isNaN(x.getTime())?'—':x.toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function fmt(n,d){return Number(n).toLocaleString('hu-HU',{maximumFractionDigits:d==null?0:d})}
function panel(title,html){
 var el=document.getElementById(ROOT);
 if(!el)return;
 el.innerHTML='<div class="a191Sheet"><div class="a191SheetHead"><div><small>🔐 SAMSUNG HEALTH · BIZTONSÁGOS IMPORT</small><h3>'+safe(title)+'</h3></div><button type="button" onclick="hh191SamsungCancel()">×</button></div>'+html+'</div>';
 el.classList.add('on');
}
function message(s,error){
 var e=document.getElementById('hh373ImportStatus');
 if(e){e.textContent=s;e.style.color=error?'#b52d51':'#22654a';}
}
function fail(s){pending=null;panel('Import nem végezhető el','<div class="a191Weather"><span>⚠️ '+safe(s)+'</span></div><button type="button" class="a191Save" style="margin-top:12px;width:100%" onclick="hh191SamsungCancel()">Bezárás</button>')}
function extract(profile,raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.source!=='samsung-health-data-sdk-1.1.0')throw Error('Nem a hivatalos Samsung SDK exportformátuma.');
 if(raw.profile!==profile)throw Error('A kiválasztott HealthHub-profil és az export tulajdonosa eltér. Válts a megfelelő profilra.');
 var entries=raw.records&&raw.records.dailySummary;
 if(!Array.isArray(entries)||entries.length<1||entries.length>31)throw Error('A Samsung-export napi adatai hiányoznak vagy túl sok napot tartalmaznak.');
 if(!api()||typeof api().normalize!=='function')throw Error('A Samsung adatfogadó modul nem érhető el.');
 var verified=api().normalize(profile,raw);
 if(!verified||verified.days.size!==entries.length)throw Error('Az export dátuma vagy valamelyik napi értéke érvénytelen / ismétlődik.');
 var seen=new Set();
 entries.forEach(function(day){
  if(!day||typeof day!=='object'||typeof day.date!=='string'||seen.has(day.date))throw Error('Ismétlődő vagy hiányzó dátum.');
  var d=new Date(day.date+'T00:00:00Z');
  if(isNaN(d.getTime())||d.toISOString().slice(0,10)!==day.date)throw Error('Hibás naptári dátum.');
  seen.add(day.date);
  ['activeCaloriesKcal','activeMinutes','distanceMeters','floorsClimbed'].forEach(function(k){
   if(Object.prototype.hasOwnProperty.call(day,k)){
    var v=day[k],max=k==='activeMinutes'?1440:k==='floorsClimbed'?1000:k==='distanceMeters'?250000:25000;
    if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error('Érvénytelen vagy irreális Samsung-adat: '+k);
   }
  });
 });
 if(Date.parse(raw.exportedAt)>Date.now()+5*60000)throw Error('A telefon órája a jövőbe mutat.');
 return verified;
}
window.hh191SamsungCancel=function(){if(busy)return;pending=null;if(window.hh191CloseModal)window.hh191CloseModal()};
window.hh191SamsungImport=function(){
 if(busy)return;
 var profile=current(),db=vault();
 if(profile!=='zsolt'&&profile!=='monika'){fail('Nem sikerült azonosítani az aktív profilt.');return;}
 if(!db||typeof db.connected!=='function'||!db.connected()||typeof db.uploadJson!=='function'||typeof db.downloadJson!=='function'){
  fail('Előbb csatlakoztasd a közös Dropbox Vaultot a HealthHubban. Offline állapotban nincs feltöltés.');return;
 }
 var picker=document.createElement('input');
 picker.type='file';picker.accept='.json,application/json';picker.style.display='none';
 document.body.appendChild(picker);
 picker.addEventListener('change',async function(){
  picker.remove();
  var file=picker.files&&picker.files[0];
  if(!file)return;
  if(profile!==current()){fail('Közben megváltozott az aktív HealthHub-profil.');return;}
  try{
   if(file.size>200000)throw Error('A fájl túl nagy: legfeljebb 200 KB fogadható.');
   var raw=JSON.parse(await file.text()),v=extract(profile,raw),last=Array.from(v.days.values()).sort(function(a,b){return b.date.localeCompare(a.date)})[0];
   pending={profile:profile,raw:raw,normalized:v};
   panel((profile==='monika'?'Mónika':'Zsolt')+' · Samsung SDK import',
    '<div class="a191Weather">'+
    '<span>📄 Fájl: '+safe(file.name)+'</span>'+
    '<span>👤 Profil: '+(profile==='monika'?'Mónika':'Zsolt')+' · '+v.days.size+' nap</span>'+
    '<span>⏰ Export: '+safe(humanDate(raw.exportedAt))+'</span>'+
    '<span>Utolsó nap ('+safe(last.date)+'): '+(last.activeCaloriesKcal==null?'kcal: nincs':fmt(last.activeCaloriesKcal,1)+' kcal')+
    ', '+(last.activeMinutes==null?'aktív idő: nincs':fmt(last.activeMinutes,1)+' perc')+
    ', '+(last.floorsClimbed==null?'emelet: nincs':fmt(last.floorsClimbed,1)+' emelet')+'</span>'+
    '<span>☁️ Cél: '+safe(api().path(profile))+'</span>'+
    '<span>🔒 Csak ezen profil külön Samsung-fájlja módosul. A Health Connect-export érintetlen marad. Ez a mentés nem kapcsol be automatikus szinkront.</span>'+
    '</div>'+
    '<button type="button" id="hh373UploadButton" class="a191Save" style="width:100%;margin-top:12px" onclick="hh191SamsungConfirm()">✅ Igen, mentés a közös Dropboxba</button>'+
    '<p id="hh373ImportStatus" style="font-size:11px;line-height:1.5"></p>');
  }catch(e){fail(e&&e.message||'A JSON olvasása sikertelen.');}
 });
 picker.addEventListener('cancel',function(){picker.remove();});
 picker.click();
};
window.hh191SamsungConfirm=async function(){
 if(busy||!pending)return;
 var item=pending,profile=item.profile,db=vault(),sdk=api();
 if(profile!==current()){fail('Közben megváltozott az aktív profil. Import megszakítva.');return;}
 if(!db||!db.connected||!db.connected()){fail('A Dropbox kapcsolat megszakadt.');return;}
 busy=true;
 var button=document.getElementById('hh373UploadButton');
 if(button)button.disabled=true;
 message('⏳ Meglévő export ellenőrzése…');
 try{
  extract(profile,item.raw); // Revalidate immediately before writing.
  var existing=null;
  try{existing=await db.downloadJson(sdk.path(profile))}catch(err){if(!err||err.status!==409)throw err;}
  if(existing){
   var prev=sdk.normalize(profile,existing);
   if(!prev)throw Error('A felhőben ismeretlen formátumú Samsung-fájl van. Nem írjuk felül.');
   if(Date.parse(prev.exportedAt)>=Date.parse(item.raw.exportedAt))
    throw Error('A Dropboxban azonos vagy frissebb Samsung-export van. A korábbi fájlt nem írjuk felül.');
  }
  if(profile!==current())throw Error('Közben profilváltás történt. Import megszakítva.');
  message('⏳ Feltöltés kizárólag a(z) '+(profile==='monika'?'Mónika':'Zsolt')+' Samsung-fájlba…');
  await db.uploadJson(sdk.path(profile),item.raw);
  message('⏳ Feltöltés kész; visszaolvasás és ellenőrzés…');
  var remote=await db.downloadJson(sdk.path(profile));
  var check=extract(profile,remote);
  if(check.exportedAt!==item.normalized.exportedAt||check.days.size!==item.normalized.days.size)
   throw Error('A visszaolvasott fájl eltér a kiválasztott exporttól. Ellenőrzés szükséges.');
  pending=null;
  message('✅ '+check.days.size+' nap Samsung SDK-adat a Dropboxban. Activity frissítése…');
  if(window.hhRenderActivity191)await window.hhRenderActivity191(profile);
  // Keep the verified success message visible instead of silently closing the modal.
  message('✅ Sikeres. '+(profile==='monika'?'Mónika':'Zsolt')+' Samsung-adatai betöltődtek a HealthHub Activity-be.');
 }catch(e){
  message('⚠️ '+(e&&e.message||'Ismeretlen Dropbox-hiba')+' Ha a mentés megtörtént, ellenőrizd az Adatforrások képernyőt újrapróbálás előtt.',true);
  if(button)button.disabled=false;
 }finally{busy=false;}
};
window.HH_SAMSUNG_IMPORT_V373={validate:extract,version:'373'};
})();