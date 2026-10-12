(function(){
'use strict';
/* HealthHub v401: reversible, explicit phone registry for remote sync.
   NEVER deletes any Dropbox device, status, command, or health record.
   Two phones may share an Android model, so selection is by exact deviceId,
   NOT by model, guessed name, or last-seen timestamp. */
var ROOT='/HealthHub/orchestrator';
var PATH=ROOT+'/device-registry-v401.json';
var PANEL='hhDeviceRegistry401', STYLE='hhDeviceRegistry401Style';
var registry=null,devices=[],loading=false,writing=false,error='',note='',observer=null,timer=null,interactionUntil=0;
var idOK=function(id){return typeof id==='string'&&/^[a-zA-Z0-9-]{1,90}$/.test(id)};
var clean=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]})};
var online=function(d){var n=Date.parse(d.lastSeenAt||'');return Number.isFinite(n)&&Date.now()-n<=20*60000};
var stamp=function(s){var n=Date.parse(s||'');return Number.isFinite(n)?new Date(n).toLocaleString('hu-HU'):'Nincs adat'};
var stub=function(){return {schema:'healthhub.device_registry/1',activePhones:{zsolt:null,monika:null},archived:[],history:[],updatedAt:null}};
var api=function(){return window.HH_DROPBOX_VAULT};
var cloud=function(){var v=api();return !!(v&&v.connected&&v.connected()&&v.uploadJson&&v.downloadJson)};
var isPhone=function(d,p){return !!(d&&d.deviceType==='android'&&idOK(d.deviceId)&&(p?d.activeProfile===p:['zsolt','monika'].includes(d.activeProfile)))};
function normalize(r){
 if(r==null)return stub();
 if(r.schema!=='healthhub.device_registry/1'||!r.activePhones||!Array.isArray(r.archived)||!Array.isArray(r.history))throw Error('Eszközregiszter sérült vagy ismeretlen verzió. Nem írjuk felül.');
 var out=Object.assign({},r);
 out.activePhones={zsolt:idOK(r.activePhones.zsolt)?r.activePhones.zsolt:null,monika:idOK(r.activePhones.monika)?r.activePhones.monika:null};
 out.archived=r.archived.filter(idOK);
 out.history=r.history.slice(-15);
 return out;
}
async function read(){
 if(!cloud())throw Error('Dropbox Vault nincs csatlakoztatva.');
 try{return normalize(await api().downloadJson(PATH))}catch(e){
  if(e&&e.status===409&&/not_found|path/.test(String(e.message||'')))return stub();
  throw e;
 }
}
function chosen(d,r){var x=r||registry;return !!(isPhone(d)&&x&&x.activePhones[d.activeProfile]===d.deviceId&&!x.archived.includes(d.deviceId))}
function candidates(p){return devices.filter(function(d){return isPhone(d,p)})}
function label(d){
 return clean(d.name||d.platform||'Android')+' <span class="hhRegId401">· '+clean(d.deviceId.slice(-11))+'</span>';
}
function badge(d){
 var state=String(d.status&&d.status.state||'nincs parancs').toLowerCase();
 var expires=state==='pending'&&Date.now()-Date.parse(d.status.updatedAt||0)>24*3600*1000;
 if(expires)state='régi pending';
 return '<small>Utolsó jelentkezés: '+clean(stamp(d.lastSeenAt))+' · '+(online(d)?'🟢 jelenleg elérhetőnek tűnik':'⚪ nincs friss jelentkezés')+'<br>Parancs: '+clean(state)+' · '+clean(d.build||'verzió ismeretlen')+'</small>';
}
function row(d,p){
 var active=chosen(d),archived=!!(registry&&registry.archived.includes(d.deviceId));
 var tag=active?'✅ KIJELÖLT':archived?'📦 ARCHIVÁLT':'NINCS KIJELÖLVE';
 return '<div class="hhRegRow401"><div><b>'+label(d)+'</b><small>'+tag+'</small>'+badge(d)+'</div><div class="hhRegBtns401">'+
 (active?'<button data-hh-reg-action="sync" data-id="'+clean(d.deviceId)+'">🔄 SYNC NOW</button>':
 '<button data-hh-reg-action="'+(archived?'restore':'choose')+'" data-id="'+clean(d.deviceId)+'">'+(archived?'↩ Visszaállítás':'✓ Kijelölés')+'</button>')+
 (!active&&!archived?'<button data-hh-reg-action="archive" data-id="'+clean(d.deviceId)+'">📦 Archiválás</button>':'')+
 '</div></div>';
}
function panel(force){
 var ov=document.getElementById('haOv'),body=document.getElementById('haBody');
 if(!ov||!body||!ov.classList.contains('on'))return;
 if(!force&&Date.now()<interactionUntil)return;
 var el=document.getElementById(PANEL);
 if(!el){el=document.createElement('section');el.id=PANEL;var anchor=document.getElementById('hhSyncOrchestrator305');if(anchor)anchor.insertAdjacentElement('beforebegin',el);else body.prepend(el)}
 var html='<div class="hhRegHead401"><div><h3>📱 Családi eszközregiszter · v401</h3><small>Biztonságos housekeeping · fizikai telefononként egy kijelölt eszköz</small></div><span>'+(cloud()?'☁️ Dropbox':'⚪ Offline')+'</span></div>';
 if(error)html+='<p class="hhRegWarn401" role="alert">'+clean(error)+'</p>';
 if(note)html+='<p class="hhRegNote401" role="status">'+clean(note)+'</p>';
 if(!registry)html+='<p class="hhRegNote401">A regiszter még nem töltődött be; addig távoli parancs nem indul.</p>';
 ['zsolt','monika'].forEach(function(p){
  var name=p==='zsolt'?'Zsolt':'Mónika',items=candidates(p);
  var primary=registry&&registry.activePhones[p];
  var matched=items.some(function(d){return d.deviceId===primary});
  html+='<div class="hhRegGroup401"><h4>'+name+' · '+(matched?'✅ kijelölt telefon':primary?'⚠️ kijelölt telefon nem jelentkezett':'⚪ kijelölés szükséges')+'</h4>'+
  (items.length?items.map(function(d){return row(d,p)}).join(''):'<p>Ehhez a profilhoz nincs regisztrált Android-készülék.</p>')+'</div>';
 });
 var web=devices.filter(function(d){return d.deviceType!=='android'}),others=devices.filter(function(d){return d.deviceType==='android'&&!isPhone(d)});
 html+='<details class="hhRegMinor401"><summary>💻 Webes kliensek ('+web.length+') és ismeretlen Android ('+others.length+')</summary>'+
  '<p>A webes kliensek nem minősülnek fizikai HealthHub Connect telefonnak. Csak megtekinthetők, távoli Android sync célpontként nem választhatók.</p>'+
  web.concat(others).map(function(d){return '<p>'+label(d)+' · '+clean(stamp(d.lastSeenAt))+'</p>'}).join('')+'</details>';
 html+='<div class="hhRegBottom401"><button type="button" data-hh-reg-action="refresh">↻ Állapot frissítése</button>'+
 (registry&&registry.history.length?'<button type="button" data-hh-reg-action="undo">↩ Utolsó változás visszavonása</button>':'')+'</div>'+
 '<p class="hhRegNote401">A kijelölés és az archiválás csak külön Dropbox-metaadat; nem töröl eszköz- vagy egészségügyi adatot. Nincs automatikus duplikátum-összevonás. A PENDING nem jelent kész szinkront, és a DONE sem bizonyít friss Samsung Health-adatot.</p>';
 el.innerHTML=html;
}
function style(){
 if(document.getElementById(STYLE))return;
 var x=document.createElement('style');x.id=STYLE;x.textContent=
 '#'+PANEL+'{position:relative;isolation:isolate;z-index:66;pointer-events:auto;background:#fff;border:1px solid #dce8ee;border-radius:17px;padding:12px;margin:10px 0;color:#173f62;font:inherit}'+
 '#'+PANEL+' button{border:1px solid #c9dce9;border-radius:10px;padding:8px 10px;background:#f3f9fc;color:#173f62;font-size:11px;font-weight:800;cursor:pointer;touch-action:manipulation;min-height:38px}'+
 '.hhRegHead401{display:flex;justify-content:space-between;gap:8px;align-items:start}.hhRegHead401 h3{font-size:15px;margin:0 0 4px}.hhRegHead401 small,.hhRegRow401 small{font-size:10px;color:#648094;line-height:1.5;display:block}.hhRegHead401 span{font-size:9px;white-space:nowrap}.hhRegGroup401{background:#f5f9fc;padding:9px;border-radius:13px;margin-top:10px}.hhRegGroup401 h4{font-size:13px;margin:0 0 8px}.hhRegRow401{background:#fff;border:1px solid #e3edf2;padding:10px;border-radius:11px;margin-top:6px;overflow-wrap:anywhere}.hhRegRow401 b{font-size:11px}.hhRegId401{color:#698399;font-size:9px}.hhRegBtns401,.hhRegBottom401{display:flex;flex-wrap:wrap;gap:7px;margin-top:7px}.hhRegMinor401{margin:12px 2px}.hhRegMinor401 summary{font-size:11px;cursor:pointer}.hhRegMinor401 p,.hhRegNote401{color:#627f91;background:#f5f9fc;padding:9px;border-radius:9px;font-size:10px;line-height:1.55}.hhRegWarn401{color:#a13333;background:#ffeceb;padding:9px;border-radius:9px;font-size:11px}';
 document.head.appendChild(x);
}
async function refresh(force){
 if(loading||writing||!cloud()) {if(!cloud()){error='Dropbox Vault nincs csatlakoztatva.';panel()}return}
 loading=true;try{
  var results=await Promise.all([read(),window.hhOrchestratorDevices305?window.hhOrchestratorDevices305():Promise.resolve([])]);
  registry=results[0];devices=results[1].filter(function(d){return d&&idOK(d.deviceId)});
  error='';
 }catch(e){error=String(e.message||e);registry=null}
 finally{loading=false;panel(!!force)}
}
async function saveChange(action,dev){
 if(writing||loading) return;
 if(!cloud()){error='Dropbox Vault nincs csatlakoztatva.';panel(true);return}
 writing=true;
 try{
  var current=await read();
  var present=await window.hhOrchestratorDevices305();
  var d=present.find(function(x){return dev&&x.deviceId===dev});
  if(action!=='undo'&&(!d||!isPhone(d)))throw Error('A telefon nem azonosítható. Frissítsd az eszközlistát.');
  var next=normalize(current),pre={activePhones:Object.assign({},current.activePhones),archived:current.archived.slice()};
  if(action==='choose'){
   if(next.activePhones[d.activeProfile]===d.deviceId&&!next.archived.includes(d.deviceId))return;
   if(!confirm('Biztosan a '+(d.activeProfile==='zsolt'?'Zsolt':'Mónika')+' profil fő telefonja legyen ez a készülék?\nAzonosító: '+d.deviceId))return;
   next.activePhones[d.activeProfile]=d.deviceId;
   var other=d.activeProfile==='zsolt'?'monika':'zsolt';
   if(next.activePhones[other]===d.deviceId)next.activePhones[other]=null;
   next.archived=next.archived.filter(function(x){return x!==d.deviceId});
  }else if(action==='archive'){
   if(Object.values(next.activePhones).includes(d.deviceId))throw Error('A kijelölt fő telefon nem archiválható. Előbb válassz másikat.');
   if(next.archived.includes(d.deviceId))return;
   if(!confirm('Archiválod a régi regisztrációt? Nem törlünk fájlokat.\n'+d.deviceId))return;
   next.archived.push(d.deviceId);
  }else if(action==='restore'){
   if(!next.archived.includes(d.deviceId))return;
   if(!confirm('Visszaállítod a regisztrációt a választható listába?'))return;
   next.archived=next.archived.filter(function(x){return x!==d.deviceId});
  }else if(action==='undo'){
   if(!next.history.length)throw Error('Nincs visszavonható változás.');
   if(!confirm('Visszavonod az eszközregiszter legutóbbi módosítását?'))return;
   var last=next.history.pop();
   if(!last.before||!last.before.activePhones||!Array.isArray(last.before.archived))throw Error('Sérült változástörténet.');
   next.activePhones=last.before.activePhones;next.archived=last.before.archived;
  }else throw Error('Ismeretlen művelet.');
  if(action!=='undo')next.history.push({at:new Date().toISOString(),action:action,deviceId:d.deviceId,before:pre});
  next.history=next.history.slice(-15);
  next.updatedAt=new Date().toISOString();
  // Snapshot happens BEFORE the mutable registry file is updated.
  var backup=ROOT+'/device-registry-backup-'+next.updatedAt.replace(/[:.]/g,'-')+'-'+Math.random().toString(36).slice(2,8)+'.json';
  await api().uploadJson(backup,{schema:'healthhub.device_registry.backup/1',savedAt:next.updatedAt,previous:current});
  await api().uploadJson(PATH,next);
  registry=next;devices=present;note='✓ Mentés és regiszterfrissítés kész. Visszavonható.';
  window.dispatchEvent(new CustomEvent('healthhub:device-registry-updated',{detail:{action:action}}));
 }catch(e){error=String(e.message||e)}
 finally{writing=false;panel(true)}
}
async function sync(id){
 if(writing||loading)return;
 try{
  if(!cloud())throw Error('Dropbox nem csatlakozik.');
  var fresh=await read(),all=await window.hhOrchestratorDevices305();
  var d=all.find(function(x){return x.deviceId===id});
  if(!d||!chosen(d,fresh))throw Error('Csak a kijelölt fizikai telefon szinkronizálható.');
  if(!confirm('Szinkronkérés a '+(d.activeProfile==='zsolt'?'Zsolt':'Mónika')+' telefonjára?\nEz nem azonnali végrehajtás.'))return;
  await window.hhOrchestratorDispatchScope355(d.activeProfile,d.deviceId,'health');
  note='✓ Távoli kérés feladva. Ellenőrizd a telefon visszajelzését.';
  await refresh(true);
 }catch(e){error=String(e.message||e);panel(true)}
}
function attach(){
 var ov=document.getElementById('haOv'),body=document.getElementById('haBody');
 if(!ov||!body){setTimeout(attach,600);return}
 style();
 body.addEventListener('pointerdown',function(e){if(e.target.closest&&e.target.closest('#'+PANEL+' button'))interactionUntil=Date.now()+1700},{passive:true});
 body.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('button[data-hh-reg-action]');
  if(!b||!b.closest('#'+PANEL))return;
  var action=b.getAttribute('data-hh-reg-action'),id=b.getAttribute('data-id');
  if(action==='refresh')refresh(true);else if(action==='sync')sync(id);
  else saveChange(action,id);
 });
 observer=new MutationObserver(function(){if(ov.classList.contains('on'))refresh()});
 observer.observe(ov,{attributes:true,attributeFilter:['class']});
 timer=setInterval(function(){if(ov.classList.contains('on')&&document.visibilityState==='visible'&&Date.now()>interactionUntil)refresh()},60000);
 if(ov.classList.contains('on'))refresh();
}
window.hhDeviceRegistry401={
 isSelected:function(d){return chosen(d)},
 ensureSelected:async function(d){return chosen(d,await read())},
 reload:refresh,
 registry:function(){return registry}
};
attach();
document.documentElement.dataset.healthhubDeviceRegistry='v401';
})();
