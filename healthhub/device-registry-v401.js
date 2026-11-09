(function(){
'use strict';
/* HealthHub v401: reversible, explicit phone registry for remote sync.
   NEVER deletes any Dropbox device, status, command, or health record.
   Two phones may share an Android model, so selection is by exact deviceId,
   NOT by model, guessed name, or last-seen timestamp. */
var ROOT='/HealthHub/orchestrator';
var PATH=ROOT+'/device-registry-v401.json';
var PANEL='hhDeviceRegistry401', STYLE='hhDeviceRegistry401Style';
var registry=null,devices=[],loading=false,writing=false,syncing=false,error='',note='',observer=null,timer=null,interactionUntil=0;
var idOK=function(id){return typeof id==='string'&&/^[a-zA-Z0-9-]{1,90}$/.test(id)};
var clean=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]})};
var online=function(d){var n=Date.parse(d.lastSeenAt||'');var age=Date.now()-n;return Number.isFinite(n)&&age>=0&&age<=20*60000};
var stamp=function(s){var n=Date.parse(s||'');return Number.isFinite(n)?new Date(n).toLocaleString('hu-HU'):'Nincs adat'};
var stub=function(){return {schema:'healthhub.device_registry/1',activePhones:{zsolt:null,monika:null},archived:[],history:[],updatedAt:null}};
var api=function(){return window.HH_DROPBOX_VAULT};
var cloud=function(){var v=api();return !!(v&&v.connected&&v.connected()&&v.uploadJson&&v.downloadJson)};
var isPhone=function(d,p){return !!(d&&d.deviceType==='android'&&idOK(d.deviceId)&&(p?d.activeProfile===p:['zsolt','monika'].includes(d.activeProfile)))};
function normalize(r){
 if(r==null)return stub();
 if(r.schema!=='healthhub.device_registry/1'||!r.activePhones||typeof r.activePhones!=='object'||Array.isArray(r.activePhones)||!Array.isArray(r.archived)||!Array.isArray(r.history))throw Error('Eszközregiszter sérült vagy ismeretlen verzió. Nem írjuk felül.');
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
 var sel=chosen(d),fresh=online(d);
 var evidence=fresh?(sel?'🟢 friss jelentés a KIJELÖLT telefontól':'🟣 friss jelentés, de NINCS kijelölve'):
   (sel?'🟠 a KIJELÖLT telefon jelentése elavult':'⚪ csak régi készülékjelentés');
 return '<small>Utolsó Android-jelentés: '+clean(stamp(d.lastSeenAt))+
  '<br><span class="hhRegSignal504">'+evidence+'</span><br>Parancs: '+clean(state)+
  ' · APK: '+clean(d.build||'verzió ismeretlen')+
  '<br><span class="hhRegEvidence504">A jelentkezés nem bizonyít sikeres Health Connect adatfeltöltést.</span></small>';
}
function row(d,p){
 var active=chosen(d),archived=!!(registry&&registry.archived.includes(d.deviceId)),fresh=online(d);
 var tag=active?'✅ KIJELÖLT FŐ TELEFON':archived?'📦 ARCHIVÁLT':
   fresh?'🟣 FRISS, DE NINCS KIJELÖLVE':'⚪ KORÁBBI REGISZTRÁCIÓ';
 var notice=!active&&!archived&&fresh?
  '<p class="hhRegSuggestion504">Ellenőrizhető új Android-bejegyzés. Ha ez a profil aktuális fizikai telefonja, a Kijelölés gombbal teheted fő telefonná.</p>':
  active&&!fresh?'<p class="hhRegAlert504">Ennek a kijelölt telefonnak nincs friss jelentése. A régi PENDING vagy DONE parancs nem friss kapcsolat.</p>':'';
 return '<div class="hhRegRow401'+(active&&!fresh?' hhRegStale504':!active&&fresh?' hhRegCandidate504':'')+'"><div><b>'+label(d)+'</b><small>'+tag+'</small>'+badge(d)+notice+'</div><div class="hhRegBtns401">'+
 (active?'<button data-hh-reg-action="sync" data-id="'+clean(d.deviceId)+'">🔄 SYNC NOW</button>':
 '<button data-hh-reg-action="'+(archived?'restore':'choose')+'" data-id="'+clean(d.deviceId)+'">'+(archived?'↩ Visszaállítás':'✓ Kijelölés fő telefonnak')+'</button>')+
 (!active&&!archived?'<button data-hh-reg-action="archive" data-id="'+clean(d.deviceId)+'">📦 Archiválás</button>':'')+
 '</div></div>';
}
function elIsInteracting(){
 var el=document.getElementById(PANEL),a=document.activeElement;
 return !!(el&&a&&el.contains(a)&&a.matches&&a.matches('button,summary,input,select,textarea'));
}
function panel(force){
 // Avoid replacing the card and buttons while Admin is being scrolled.
 if(document.getElementById(PANEL)&&window.hhAdminScrollActiveV748?.())return;
 var ov=document.getElementById('haOv'),body=document.getElementById('haBody');
 if(!ov||!body||!ov.classList.contains('on'))return;
 if((!force&&(Date.now()<interactionUntil||elIsInteracting()))||
    (elIsInteracting()&&document.activeElement?.matches?.('input,textarea,select')))return;
 var el=document.getElementById(PANEL);
 if(!el){el=document.createElement('section');el.id=PANEL;var anchor=document.getElementById('hhSyncOrchestrator305');if(anchor)anchor.insertAdjacentElement('beforebegin',el);else body.prepend(el)}
 var suffix=cloud()&&typeof api().accountHint==='function'?api().accountHint():null;
 var accountNotice=suffix?'Webes Dropbox fiókazonosító vége: '+clean(suffix):'Webes Dropbox azonosító nem elérhető';
 var nativeCount=devices.filter(function(d){return d&&d.deviceType==='android'}).length;
 var central=window.HH_FAMILY_DEVICE_CENTRAL_V1;
  // Pairing is available in a separate Admin dialog; never mount secret inputs here.
  var centralRows=central&&typeof central.devices==='function'?central.devices():[];
  var verified=centralRows.filter(function(x){return x&&['zsolt','monika'].includes(x.profile_key)&&x.device_id&&x.verified_at});
  var centralReady=verified.length>0;
  var html='<div class="hhRegHead401"><div><h3>📱 Családi telefonok</h3><small>Hitelesített központi eszközök · a Dropbox-kapcsolattól független</small></div><span>🔐 Központi</span></div>';
  if(!centralReady)html+='<p class="hhRegNote401">Központi hitelesítés ellenőrzésre vár. A régi Dropbox-listából nem következtetünk újrapárosításra.</p>';
  ['zsolt','monika'].forEach(function(p){
   var row=verified.find(function(x){return x.profile_key===p}),name=p==='zsolt'?'💙 Zsolt':'🩷 Mónika';
   var age=row?Date.now()-Date.parse(row.last_seen_at||''):Infinity;
   var fresh=row&&row.state==='online'&&Number.isFinite(age)&&age>=0&&age<=20*60000;
   html+='<p class="hhRegCentralStatus401"><strong>'+name+'</strong> · '+
    (row?(fresh?'✅ Hitelesítve · online':'🟠 Hitelesítve · friss kapcsolat nem igazolt'):'⚪ Központi állapot még nem ellenőrzött')+
    (row?'<small>HH One '+clean(row.build||'?')+' · utolsó jelzés: '+clean(stamp(row.last_seen_at))+'</small>':'')+'</p>';
  });
  html+='<details class="hhRegLegacyDetails"><summary>☁️ Régi Dropbox-kapcsolatok és diagnosztika · kibontás</summary>'+
   '<p class="hhRegNote401">Csak régi Dropbox-regisztráció és távoli parancs. A hiányzó bejegyzés nem jelent hiányzó telefonpárosítást.</p>'+
   '<p class="hhRegNote401">'+accountNotice+' · régi Android-jelentések: '+nativeCount+'</p>';
 if(error)html+='<p class="hhRegWarn401" role="alert">'+clean(error)+'</p>';
 if(note)html+='<p class="hhRegNote401" role="status">'+clean(note)+'</p>';
 if(!registry)html+='<p class="hhRegNote401">A regiszter még nem töltődött be; addig távoli parancs nem indul.</p>';
 if(registry&&cloud()&&nativeCount===0){
   html+='<p class="hhRegWarn401">Ebben a webes Dropbox-fiókban nincs Android-jelentés. Ha a natív HH ONE igazolt jelentést, a két Dropbox-fiók valószínűleg eltér. A natív telefonazonosítót ne töröld. Eszközadatot nem törlünk.</p>';
   html+='<div class="hhRegReconcile401"><label for="hhRegExpectedAccount401">Működő családi Dropbox-fiók azonosítójának utolsó 8 karaktere</label>'+
     '<input id="hhRegExpectedAccount401" type="text" maxlength="8" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="8 karakter" />'+
     '<button type="button" data-hh-reg-action="account-switch">🔐 Biztonságos Dropbox-egyeztetés</button>'+
     '<small>A meglévő webes kapcsolat csak ellenőrzött egyezés után cserélődik. Mónika eszköze és az egészségügyi adatok nem törlődnek.</small></div>';
  }
  if(cloud()&&api().repairNote&&api().repairNote())html+='<p class="hhRegWarn401" role="alert">'+clean(api().repairNote())+'</p>';
 // Legacy diagnostics are collapsed by default and cannot invalidate a verified pair.
 ['zsolt','monika'].forEach(function(p){
  var name=p==='zsolt'?'Zsolt':'Mónika',items=candidates(p);
  var primary=registry&&registry.activePhones[p];
  var excluded=registry&&Array.isArray(registry.archived)?registry.archived:[];
  var selected=items.find(function(d){return d.deviceId===primary&&!excluded.includes(d.deviceId)});
  var freshSelected=selected&&online(selected);
  var recentOther=items.filter(function(d){return !chosen(d)&&!excluded.includes(d.deviceId)&&online(d)})
   .sort(function(a,b){return Date.parse(b.lastSeenAt||0)-Date.parse(a.lastSeenAt||0)});
  var oldOthers=items.filter(function(d){return !chosen(d)&&!recentOther.includes(d)&&!excluded.includes(d.deviceId)});
   var oldArchived=items.filter(function(d){return excluded.includes(d.deviceId)});
  var state=freshSelected?'✅ kijelölt fő telefon frissen jelentkezett':
   primary?'⚠️ kijelölt fő telefonja nem adott friss jelentést':'⚠️ nincs kijelölt fő telefon';
  html+='<div class="hhRegGroup401"><h4>'+name+' · '+state+'</h4>';
  if(primary&&!selected)html+='<p class="hhRegAlert504">A mentett eszközazonosító: …'+clean(primary.slice(-11))+' · ehhez jelenleg nincs azonosítható Android-jelentés. Alkalmazásadat-törlés új azonosítót eredményezhet. Az eredeti regisztrációt nem töröljük.</p>';
  if(!freshSelected&&recentOther.length){
   html+='<p class="hhRegAlert504">⚠️ '+name+': a kijelölt telefon nem jelentkezik frissen, '+
      'de '+recentOther.length+' másik, friss Android-bejegyzés található. '+
      'Ellenőrizd a készüléket és a profilt, majd szükség esetén jelöld ki az új fő telefont. '+
      'Ez nem történik meg automatikusan.</p>';
  }
  if(selected)html+=row(selected,p);
  if(recentOther.length){
   html+='<h5 class="hhRegCandidateTitle504">🟣 Friss, de NEM kijelölt telefon'+(recentOther.length>1?'ok':'')+'</h5>';
   html+=recentOther.map(function(d){return row(d,p)}).join('');
  }
  if(oldOthers.length){
   html+='<details class="hhRegOld504"><summary>Korábbi regisztrációk ('+oldOthers.length+') · kibontás</summary>'+
       oldOthers.map(function(d){return row(d,p)}).join('')+'</details>';
  }
  if(oldArchived.length)html+='<details class="hhRegOld504"><summary>📦 Archivált telefonbejegyzések ('+oldArchived.length+')</summary>'+oldArchived.map(function(d){return row(d,p)}).join('')+'</details>';
   if(!items.length){
   html+='<p class="hhRegNoNative401">'+(primary?
      'A korábban kijelölt telefonhoz most nincs ellenőrizhető Android-bejegyzés. ':
      'Még nem érkezett ellenőrizhető Android-jelentés ehhez a profilhoz. ')+
      'Nyisd meg a <b>HH One / HH Connect natív alkalmazást</b> ezen a telefonon, '+
      'ellenőrizd a tulajdonosprofilt és a Dropbox-kapcsolatot, indíts kézi szinkront, '+
      'majd nyomd meg itt az <b>Állapot frissítése</b> gombot. '+
      'A webes kliens nem helyettesíti az Android-eszközjelentést.</p>';
  }
  html+='</div>';
 });
 var web=devices.filter(function(d){return d.deviceType!=='android'}),others=devices.filter(function(d){return d.deviceType==='android'&&!isPhone(d)});
 var legacy=web.concat(others),hidden=registry&&registry.archived||[];
  var normalLegacy=legacy.filter(function(d){return !hidden.includes(d.deviceId)});
  var archivedLegacy=legacy.filter(function(d){return hidden.includes(d.deviceId)});
  html+='<details class="hhRegMinor401"><summary>💻 Webes kapcsolatok ('+normalLegacy.length+') és archiváltak ('+archivedLegacy.length+')</summary>'+
  '<p>A webes kliensek nem minősülnek fizikai HealthHub Connect telefonnak. Csak megtekinthetők, távoli Android sync célpontként nem választhatók.</p>'+
  normalLegacy.map(function(d){return '<p>'+label(d)+' · '+clean(stamp(d.lastSeenAt))+
   ' <button data-hh-reg-action="archive" data-id="'+clean(d.deviceId)+'">✕ Eltávolítás a listából</button></p>'}).join('')+
  (archivedLegacy.length?'<details class="hhRegArchived"><summary>📦 Archivált webes bejegyzések ('+archivedLegacy.length+')</summary>'+
   archivedLegacy.map(function(d){return '<p>'+label(d)+' <button data-hh-reg-action="restore" data-id="'+clean(d.deviceId)+'">↩ Visszaállítás</button></p>'}).join('')+'</details>':'')+'</details>';
 html+='<div class="hhRegBottom401"><button type="button" data-hh-reg-action="refresh">↻ Állapot frissítése</button>'+
 (registry&&registry.history.length?'<button type="button" data-hh-reg-action="undo">↩ Utolsó változás visszavonása</button>':'')+'</div>'+
 '<p class="hhRegNote401">A kézi eltávolítás archiválás, nem felhőfájl-törlés. Minden művelet előtt biztonsági mentés készül. A kijelölés és az archiválás csak külön Dropbox-metaadat; nem töröl eszköz- vagy egészségügyi adatot. Nincs automatikus duplikátum-összevonás. Először nyisd meg a HealthHub Connectet a céltelefonon, és a friss utolsó jelentkezés alapján azonosítsd. A PENDING nem jelent kész szinkront, és a DONE sem bizonyít friss Samsung Health-adatot.</p>';
 html+='</details>';
 if(el.innerHTML===html)return;
  var typedSuffix=el.querySelector('#hhRegExpectedAccount401')?.value||'';
 // Preserve visual position and expanded sections on background refresh.
 var openDetails=Array.from(el.querySelectorAll('details')).map(function(d,i){return d.open?i:-1}).filter(function(i){return i>=0});
 var top=body.scrollTop,left=body.scrollLeft;
 el.innerHTML=html;
  if(typedSuffix&&el.querySelector('#hhRegExpectedAccount401'))
   el.querySelector('#hhRegExpectedAccount401').value=typedSuffix;
 var details=el.querySelectorAll('details');
 openDetails.forEach(function(i){if(details[i])details[i].open=true});
 // Passive refreshes must not force scroll coordinates and bounce the Admin panel.
 if(force&&!window.hhAdminScrollActiveV748?.()&&(body.scrollTop!==top||body.scrollLeft!==left))
  body.scrollTo({top:top,left:left,behavior:'instant'});
}
function style(){
 if(document.getElementById(STYLE))return;
 var x=document.createElement('style');x.id=STYLE;x.textContent=
 '#'+PANEL+'{position:relative;isolation:isolate;z-index:66;pointer-events:auto;background:#fff;border:1px solid #dce8ee;border-radius:17px;padding:12px;margin:10px 0;color:#173f62;font:inherit}'+
 '#'+PANEL+' button{border:1px solid #c9dce9;border-radius:10px;padding:8px 10px;background:#f3f9fc;color:#173f62;font-size:11px;font-weight:800;cursor:pointer;touch-action:manipulation;min-height:38px}'+
 '.hhRegLegacyDetails{margin-top:10px;padding:8px;border:1px dashed #abc9df;border-radius:12px;background:#f5f9fc}.hhRegLegacyDetails>summary{cursor:pointer;font-size:12px;font-weight:700;color:#285379}.hhRegLegacyDetails[open]>summary{margin-bottom:9px}'+
  '.hhFcPanel{border:1px solid #bed8ee;border-radius:14px;padding:12px;background:linear-gradient(135deg,#eff8ff,#e9f2fa);margin-bottom:12px;color:#183b65}.hhFcPanel h4{margin:0 0 5px;font-size:14px}.hhFcPanel small{font-size:10px;display:block;color:#547391;line-height:1.5}.hhFcPanel p{font-size:11px;line-height:1.5}.hhFcPanel button{margin-top:6px}.hhFcLine{padding:9px;margin:7px 0;border-radius:9px;background:#fff;font-size:11px}.hhFcPair summary{font-weight:700;cursor:pointer;font-size:11px}.hhFcPair input{width:100%;box-sizing:border-box;border:1px solid #bad0e2;padding:10px;border-radius:9px;min-height:44px;background:#fff}.hhFcPair label{font-size:11px;display:block;margin:8px 0}.hhFcError{color:#a02b42!important}.hhFcNote{color:#1d6b50!important}.hhRegArchived{margin:8px 0}.hhRegMinor401 p button{margin:4px 0 4px 8px}'+
  '.hhRegReconcile401{display:flex;flex-direction:column;align-items:stretch;gap:7px;padding:10px;border:1px solid #bddef3;border-radius:12px;background:#eef7fd;margin:10px 0}.hhRegReconcile401 label{font-size:11px;font-weight:750}.hhRegReconcile401 input{font:inherit;font-size:14px;min-height:38px;padding:8px;border:1px solid #bcd1e0;border-radius:8px;color:#173f62;background:white}.hhRegReconcile401 small{font-size:10px;line-height:1.4;color:#527188}'+
  '.hhRegCentralStatus401{padding:11px;margin:7px 0;border-radius:12px;background:linear-gradient(120deg,#e8f4fd,#fbe9f4);border:1px solid #aac7db;color:#193e5c;font-size:12px}.hhRegCentralStatus401 strong{font-size:13px}.hhRegCentralStatus401 small{display:block;color:#4c6980;font-size:10px;margin-top:5px}'+
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
  if(action!=='undo'&&(!d||!idOK(d.deviceId)||(action==='choose'&&!isPhone(d))))
    throw Error('A bejegyzés nem azonosítható. Frissítsd az eszközlistát.');
  var next=normalize(current),pre={activePhones:Object.assign({},current.activePhones),archived:current.archived.slice()};
  if(action==='choose'){
   if(next.activePhones[d.activeProfile]===d.deviceId&&!next.archived.includes(d.deviceId))return;
   if(!online(d))throw Error('Csak friss Android-jelentésű telefon jelölhető ki. Előbb nyisd meg a HH One Connectet a készüléken.');
   if(!confirm('Ez a '+(d.activeProfile==='zsolt'?'Zsolt':'Mónika')+' profil MOST HASZNÁLT fizikai telefonja?\n\n'+
      'Új Android ID: '+d.deviceId+'\nUtolsó jelentés: '+stamp(d.lastSeenAt)+
      '\nAPK: '+(d.build||'ismeretlen')+
      '\n\nA régi kijelölés megváltozik, de semmilyen eszköz- vagy egészségadatot nem törlünk.'))return;
   next.activePhones[d.activeProfile]=d.deviceId;
   var other=d.activeProfile==='zsolt'?'monika':'zsolt';
   if(next.activePhones[other]===d.deviceId)next.activePhones[other]=null;
   next.archived=next.archived.filter(function(x){return x!==d.deviceId});
  }else if(action==='archive'){
   if(Object.values(next.activePhones).includes(d.deviceId))throw Error('A kijelölt fő telefon nem archiválható. Előbb válassz másikat.');
   if(next.archived.includes(d.deviceId))return;
   if(!confirm('Eltávolítod a régi kapcsolatot az aktív listából? Biztonsági mentés készül, nem törlünk fájlokat.\n'+d.deviceId))return;
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
  // A successful upload is not proof that Dropbox now returns this selection.
  var verified;
  try{verified=await read()}
  catch(e){throw Error('A mentést nem sikerült visszaellenőrizni: '+String(e.message||e).slice(0,160))}
  if(verified.activePhones.zsolt!==next.activePhones.zsolt||
     verified.activePhones.monika!==next.activePhones.monika||
     JSON.stringify(verified.archived.slice().sort())!==JSON.stringify(next.archived.slice().sort()))
   throw Error('A visszaolvasott Dropbox-regiszter eltér a kijelöléstől. A mentés nem igazolt.');
  registry=verified;devices=present;error='';note='✓ Kijelölés mentve és Dropboxból visszaellenőrizve.';
  window.dispatchEvent(new CustomEvent('healthhub:device-registry-updated',{detail:{action:action}}));
 }catch(e){note='';error=String(e.message||e)}
 finally{writing=false;panel(true)}
}
async function sync(id){
 if(writing||loading||syncing)return;
 syncing=true;
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
 finally{syncing=false}
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
  if(action.startsWith('central-')){
    var center=window.HH_FAMILY_DEVICE_CENTRAL_V1;
    if(center)void center.click(action);
    return;
   }
   if(action==='account-switch'){
   var input=document.getElementById('hhRegExpectedAccount401');
   var expected=String(input&&input.value||'').trim();
   if(!/^[A-Za-z0-9_-]{8}$/.test(expected)){error='Pontosan 8 karakteres fiókazonosító szükséges.';panel(true);return}
   if(!api()||typeof api().switchToAccount!=='function'){error='A biztonságos Dropbox-egyeztetés nem érhető el. Frissítsd a HealthHub oldalát.';panel(true);return}
   error='';
   api().switchToAccount(expected).catch(function(e){error=String(e.message||e);panel(true)});
   return;
  }
  if(action==='refresh')refresh(true);else if(action==='sync')sync(id);
  else saveChange(action,id);
 });
 // Central heartbeat changes repaint read-only phone status; no Dropbox writes.
  window.addEventListener('healthhub:central-device-registry-changed',function(){panel(false)});
  observer=new MutationObserver(function(mutations){
   // Read once when the Admin genuinely opens, not on every unrelated class change.
   if(mutations.some(function(m){return m.oldValue!==null})&&ov.classList.contains('on')&&!registry)refresh();
  });
 observer.observe(ov,{attributes:true,attributeOldValue:true,attributeFilter:['class']});
 // No background child-list observer that re-injects the registry during Admin remounts.
 // Intentionally no 60s automatic Dropbox registry refresh: explicit tap only.
  timer=null;
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
