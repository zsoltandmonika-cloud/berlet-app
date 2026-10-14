(function(root,factory){
'use strict';
var api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_ONE_SERVICE_INTELLIGENCE_V501=api;
})(typeof window==='object'?window:globalThis,function(){
'use strict';
/* Advisory-only rule engine. No medical values, remote writes or auto-remediation.
   Evidence must come from a verified connection, registered phone metadata,
   and recent v300 local operational telemetry. */
var AGE=20*60*1000,DAY=24*60*60*1000;
function stamp(x){var t=Date.parse(x||'');return Number.isFinite(t)?t:NaN}
function rec(id,kind,title,evidence,proposal,priority){
 return {id:id,kind:kind,title:title,evidence:evidence,proposal:proposal,priority:priority,status:'Javaslat · jóváhagyás szükséges'};
}
function recommend(input){
 input=input||{};
 var now=Number.isFinite(input.nowMs)?input.nowMs:Date.now(),items=[];
 var cloud=input.cloud===true, reg=input.registry, ds=Array.isArray(input.devices)?input.devices:[];
 var owners=['zsolt','monika'];
 if(!cloud){
  items.push(rec('OPS-CLOUD','Üzemeltetés','Felhőkapcsolat ellenőrzése',
   'A hitelesített Dropbox Vault kapcsolata nem igazolt.',
   'Vizsgáld meg az OAuth állapotát és a kapcsolódási hibanaplót. Adatfeltöltést ne tekints sikeresnek.', 'Magas'));
 }else if(!reg||reg.schema!=='healthhub.device_registry/1'||!reg.activePhones||!Array.isArray(reg.archived)){
  items.push(rec('OPS-REGISTRY','Üzemeltetés','Eszközregiszter ellenőrzése',
   'A v401 eszközregiszter nem olvasható vagy nem megfelelő szerkezetű.',
   'Frissítsd a Családi eszközregisztert az Adminban; ne küldj központi parancsot azonosítatlan készülékre.','Magas'));
 }else{
  owners.forEach(function(owner){
   var id=reg.activePhones[owner];
   var name=owner==='zsolt'?'Zsolt':'Mónika';
   var d=id&&ds.find(function(x){return x&&x.deviceId===id&&x.activeProfile===owner&&x.deviceType==='android'&&!reg.archived.includes(x.deviceId)});
   if(!d){
    items.push(rec('OPS-DEVICE-'+owner,'Üzemeltetés',name+' telefonjának azonosítása',
     'Nincs a profilhoz illeszkedő, nem archivált, kijelölt fizikai Android-eszköz.',
     'Ellenőrizd az Admin → Családi eszközregiszter kijelölését és a készülék legutóbbi jelentkezését.', 'Magas'));
    return;
   }
   var last=stamp(d.lastSeenAt),st=d.status||{},stAge=now-stamp(st.updatedAt);
   if(!Number.isFinite(last)||now-last>AGE||last>now+5*60*1000){
    items.push(rec('OPS-HEARTBEAT-'+owner,'Üzemeltetés',name+' kapcsolatának vizsgálata',
     'A regisztrált telefon több mint 20 perce nem adott igazolt heartbeatet, vagy az időbélyeg hibás.',
     'Ellenőrizd a hálózatot, a háttérkorlátozást és a HH Connect szinkronnaplóját. Az offline állapot nem bizonyít adatvesztést.', 'Közepes'));
   }
   if(['failed','partial','rejected'].includes(st.state)&&stAge>=0&&stAge<DAY){
    items.push(rec('OPS-COMMAND-'+owner,'Üzemeltetés',name+' utolsó szinkronhibájának elemzése',
     'A legutóbbi regisztrált parancs állapota: '+st.state+'.',
     'Vizsgáld meg a scope-onkénti naplót; csak az érintett modult próbáld újra, ne minden adatforrást egyszerre.', 'Magas'));
   }else if(['pending','queued','running'].includes(st.state)&&stAge>=0&&stAge<DAY){
    items.push(rec('OPS-WAIT-'+owner,'Üzemeltetés',name+' függőben lévő parancsa',
     'A központi parancs jelenleg '+st.state+' állapotú.',
     'Várd meg a tényleges készülék-visszaigazolást. Kerüld az ismételt, párhuzamos SYNC kéréseket.', 'Közepes'));
   }
  });
 }
 var h=input.opsHealth;
 var age=h&&now-stamp(h.at);
 if(h&&Number.isFinite(age)&&age>=0&&age<DAY&&h.errors&&h.perf){
  var errs=Number(h.errors.errors24)||0, longTasks=Number(h.perf.longTasks)||0, avg=Number(h.perf.avgLoad)||0;
  if(errs>0)items.push(rec('OPS-RUNTIME','Üzemeltetés','Böngészőhibák gyökérokelemzése',
   'A meglévő Level 3 Health Check '+errs+' hibát észlelt az elmúlt 24 órában.',
   'Nyisd meg az Admin → AI Improvement Centert, vizsgáld meg a hibanaplót, és csak tesztelt, mentett javítást élesíts.', 'Magas'));
  if(longTasks>=3||avg>2500)items.push(rec('DEV-PERFORMANCE','Fejlesztés','HealthHub felület teljesítmény-optimalizálása',
   'Level 3 telemetria: '+longTasks+' hosszú UI task, átlagos betöltés '+Math.round(avg)+' ms.',
   'Profilozd a lassú modulokat, mérd a változást frissítés előtt és után. A javaslat nem automatikus kódmódosítás.', 'Közepes'));
 }
 items.push(rec('DEV-ONE-AGENT','Fejlesztés','Egyetlen HH One Android Agent kialakítása',
  'A HealthHub Connect és a Screen Time PILOT jelenleg eltérő Android-alkalmazások; teljes összefésülés nincs telefonon igazolva.',
  'Tartsuk meg a Connect alkalmazásazonosítót és az aláírást, migráljuk a Usage Access gyűjtést, majd csak adatmegőrző kéttelefonos teszt után vezessük ki a pilotot.', 'Magas'));
 if(!items.length)items.push(rec('OPS-HEALTHY','Üzemeltetés','Nincs bizonyított aktív rendellenesség',
  'A rendelkezésre álló ellenőrzött technikai jelek nem mutatnak hibát.',
  'Folytasd a trendfigyelést; ez nem helyettesíti a modulonkénti tényleges adatfrissesség ellenőrzését.', 'Alacsony'));
 return items.slice(0,8);
}
return Object.freeze({recommend:recommend});
});
