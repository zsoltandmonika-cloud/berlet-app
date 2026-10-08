(function(){
'use strict';
/* HealthHub v317: private, opt-in per-profile environmental health factor editor.
   The repository contains a GENERIC catalogue only, never patient-specific diagnoses.
   Data remains in this browser's localStorage and is not encrypted or synced.
   No API request is made by this module. */
var PAGE='hhDailyHealthSettings317',STORE='hh-daily-health-factors-317',OLD='hh-daily-health-312-preferences',STYLE='hh-daily-health-settings-317-style';
var owner='m',category='Szív és keringés',seen=false;
var CATS=['Szív és keringés','Légutak és allergia','Idegrendszer és fájdalom','Hőség és általános','Egyéni'];
var TRIGGERS={
 heat:'Hőség',cold:'Hideg',air:'Levegőminőség',pollen:'Pollen',
 pressure:'Légnyomás',uv:'UV',infection:'Fertőzési helyzet',wind:'Szél'
};
var BASE=[
 ['heartfailure','Szívelégtelenség / cardiomyopathia','Szív és keringés',['heat','cold','air']],
 ['cardiacrhythm','Szívritmuszavar / ICD, CRT-D előzmény','Szív és keringés',['heat','air']],
 ['hypertension','Magas vérnyomás','Szív és keringés',['heat','cold','air']],
 ['hypotension','Alacsony vérnyomás, szédülés','Szív és keringés',['heat']],
 ['edema','Lábszárdagadás, folyadék-visszatartás','Szív és keringés',['heat']],
 ['kidney','Vese / folyadékháztartás megfigyelése','Szív és keringés',['heat']],
 ['palpitations','Szívdobogásérzés','Szív és keringés',['heat','air']],
 ['sinus','Idült orrmelléküreg-gyulladás','Légutak és allergia',['cold','pollen','air']],
 ['rhinitis','Orrdugulás / érzékeny orrnyálkahártya','Légutak és allergia',['pollen','air','cold']],
 ['hayfever','Pollenérzékenység / allergiás nátha','Légutak és allergia',['pollen']],
 ['asthma','Asztma / visszatérő hörgőpanasz (ha igazolt)','Légutak és allergia',['air','pollen','cold']],
 ['infectionrecovery','Légúti fertőzések utáni érzékenység','Légutak és allergia',['infection','air','cold']],
 ['cough','Köhögés, légszomj (tünet megfigyelése)','Légutak és allergia',['air','cold','pollen']],
 ['headache','Fejfájás / migrénes panasz','Idegrendszer és fájdalom',['pressure','heat']],
 ['dizziness','Szédülés / ájulásközeli érzés','Idegrendszer és fájdalom',['heat']],
 ['jointpain','Ízületi fájdalom / merevség','Idegrendszer és fájdalom',['cold']],
 ['shoulderpain','Vállfájdalom / mozgáskorlátozottság','Idegrendszer és fájdalom',['cold']],
 ['sleepproblems','Hőséghez kapcsolódó alvásromlás','Hőség és általános',['heat']],
 ['heatintolerance','Hőségérzékenység / kimerülés','Hőség és általános',['heat']],
 ['coldintolerance','Hidegérzékenység','Hőség és általános',['cold']],
 ['sunskin','Napfény / UV miatti bőrtünet','Hőség és általános',['uv']],
 ['outdooractivity','Kültéri aktivitás környezeti korlátozása','Hőség és általános',['heat','air','uv','wind']]
].map(function(a){return {id:a[0],title:a[1],category:a[2],triggers:a[3]}});
function el(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]})}
function decode(){
 try{var x=JSON.parse(localStorage.getItem(STORE)||'null');if(x&&x.schema==='healthhub.daily-health-factors/1')return x}catch(e){}
 return {schema:'healthhub.daily-health-factors/1',m:{items:{},custom:[],aiOptIn:false},z:{items:{},custom:[],aiOptIn:false}};
}
function record(obj,key){if(!obj[key]||typeof obj[key]!=='object')obj[key]={items:{},custom:[],aiOptIn:false};return obj[key]}
function persist(obj){
 try{localStorage.setItem(STORE,JSON.stringify(obj));return true}catch(e){return false}
}
function legacy(){try{return JSON.parse(localStorage.getItem(OLD)||'{}')||{}}catch(e){return {}}}
function saveLegacy(v){try{localStorage.setItem(OLD,JSON.stringify(v));return true}catch(e){return false}}
function getEnabled(profile){
 var r=record(decode(),profile),all=BASE.concat(r.custom||[]);
 return all.filter(function(a){return !!(r.items[a.id]&&r.items[a.id].enabled)})
 .map(function(a){return {id:a.id,title:a.title,triggers:a.triggers||[],note:String(r.items[a.id].note||'').slice(0,280)}});
}
function safeWarnList(warnings){return Array.isArray(warnings)?warnings.filter(function(x){return x&&Object.prototype.hasOwnProperty.call(TRIGGERS,x.key)}):[]}
function personal(warnings){
 var w=safeWarnList(warnings),res=[],old=legacy(),names=[['m','Mónika'],['z','Zsolt']];
 names.forEach(function(n){
  var items=getEnabled(n[0]),hits=items.filter(function(a){return a.triggers.some(function(k){return w.some(function(b){return b.key===k})})});
  if(hits.length){
   res.push('<p><b>💚 '+n[1]+' · bekapcsolt környezeti figyelő:</b> '+esc(hits.slice(0,5).map(function(x){return x.title}).join('; '))+'. A mai jelzések mellett érdemes az ismert tüneteket, az előírt tervet és a méréseket figyelni. Ez nem egyéni kockázatbecslés.</p>');
  }
 });
 if(old.allergy&&w.some(function(x){return x.key==='pollen'}))res.push('<p>🌿 <b>Mónika:</b> magas pollennél ellenőrizd a korábban előírt allergiás rutinodat'+(old.allergyName?', illetve a '+esc(String(old.allergyName).slice(0,60))+' elérhetőségét':'')+'.</p>');
 if(old.headache&&w.some(function(x){return x.key==='pressure'}))res.push('<p>🌀 <b>Zsolt:</b> légnyomásváltozáskor szükség esetén rögzítsd a fejfájást a Tünetnaplóban; az időjárás nem bizonyított kizárólagos ok.</p>');
 if(w.some(function(x){return x.key==='heat'}))res.push('<p>🌡️ Hőségben az előírt gyógyszer- és folyadékrendet ne módosítsátok önállóan. Szívbetegséggel egyéni tanács szükséges.</p>');
 if(!res.length)return '<p>Jelenleg nincs a választott tényezőkhöz kapcsolódó személyes jelzés. Ez nem zár ki egészségügyi kockázatot. A ⚙️ gombbal külön választhatjátok ki a figyelendő problémákat.</p>';
 return res.join('');
}
function promptContext(){
 var settings=decode(),out=[];
 [['m','Mónika'],['z','Zsolt']].forEach(function(pair){
  var p=record(settings,pair[0]);if(!p.aiOptIn)return;
  var a=getEnabled(pair[0]);if(!a.length)return;
  out.push(pair[1]+': '+a.map(function(i){return i.title+(i.note?' (egyéni megjegyzés: '+i.note+')':'')}).join('; '));
 });
 return out.length?'A felhasználó által KÜLÖN engedélyezett, helyben tárolt és saját kezűleg indított elemzésbe bevont figyelési tényezők: '+out.join(' | ')+'. Nem diagnosztizálhatsz és nem módosíthatsz gyógyszerezést.':'';
}
function style(){
 if(el(STYLE))return;
 var n=document.createElement('style');n.id=STYLE;
 n.textContent=
 '#'+PAGE+'{--dh-accent:#ef2e84;min-height:100vh;width:100%;max-width:100%;min-width:0;overflow-x:hidden;padding-bottom:92px;background:linear-gradient(180deg,#fff0f7,#f6fbfc);color:#16425d;box-sizing:border-box}'+
 '#'+PAGE+'[data-profile="z"]{--dh-accent:#2875ba;background:linear-gradient(180deg,#e9f4ff,#f6fbfc)}'+
 '#'+PAGE+' .dh317Hero{height:205px;position:relative;overflow:hidden;background:#e9f5fb var(--hh-role-atlas) left top/auto 200% no-repeat}'+
 '#'+PAGE+' .dh317Hero button{position:absolute;z-index:4;left:13px;top:15px;width:38px;height:38px;border:1px solid #d3e4ee;border-radius:50%;background:#ffffffcc;color:#174363;font-size:24px}'+
 '#'+PAGE+' .dh317Hero h1{position:absolute;left:55%;top:50%;transform:translateY(-50%);font-size:21px;line-height:1.18;color:#163e60;text-shadow:0 1px #fff}'+
 '#'+PAGE+' .dh317Body{width:100%;max-width:100%;min-width:0;box-sizing:border-box;padding:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px}'+
 '#'+PAGE+' .dh317Card{width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow:hidden;border:1px solid #dceae7;border-radius:17px;padding:13px;background:#fff;box-shadow:0 5px 13px #184b6510}'+
 '#'+PAGE+' .dh317Card h2{font-size:15px;margin:0 0 7px}'+
 '#'+PAGE+' .dh317Card p{font-size:11px;line-height:1.55;margin:6px 0;color:#546f7f}'+
 '#'+PAGE+' .dh317Switch{display:grid!important;width:100%;max-width:100%;min-width:0;box-sizing:border-box;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px}'+
 '#'+PAGE+' .dh317Switch button{display:block;box-sizing:border-box;width:100%;max-width:100%;min-width:0;white-space:nowrap;padding:11px 6px;border:1px solid #dce5ea;border-radius:13px;background:#f3f9fb;color:#49748d;font-size:13px;font-weight:850}'+
 '#'+PAGE+' .dh317Switch button.on{background:var(--dh-accent)!important;color:#fff!important;border-color:var(--dh-accent)!important}'+
 '#'+PAGE+' .dh317Cats{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%;max-width:100%;min-width:0;box-sizing:border-box;gap:7px;overflow:visible;padding:3px 0 9px}'+
 '#'+PAGE+' .dh317Cats button{width:100%;max-width:100%;min-width:0;box-sizing:border-box;white-space:normal!important;overflow-wrap:break-word;line-height:1.2;min-height:36px;padding:7px 5px;border:1px solid #d7e7ed;border-radius:12px;background:#eff7fa;color:#35617b;font-size:10px;font-weight:850}'+
 '#'+PAGE+' .dh317Cats button.on{background:var(--dh-accent)!important;border-color:var(--dh-accent)!important;color:#fff!important}'+
 '#'+PAGE+' .dh317Risk{padding:10px 3px;border-top:1px solid #eaf0f1}'+
 '#'+PAGE+' .dh317Risk:first-of-type{border-top:0}'+
 '#'+PAGE+' .dh317Pick{display:flex;gap:8px;align-items:flex-start;line-height:1.35;font-size:12px;font-weight:750}'+
 '#'+PAGE+' .dh317Pick input{width:19px;height:19px;accent-color:var(--dh-accent);flex:none}'+
 '#'+PAGE+' .dh317Risk small{display:block;margin:3px 0 0 27px;color:#7c90a0;font-size:9px}'+
 '#'+PAGE+' .dh317Risk textarea,#'+PAGE+' .dh317Risk input[type=text],#'+PAGE+' .dh317Row input,#'+PAGE+' .dh317Row select{width:100%;box-sizing:border-box;border:1px solid #d9e6ea;background:#fbfdfe;color:#294e64;border-radius:9px;padding:8px;font:11px system-ui;min-width:0}'+
 '#'+PAGE+' .dh317Risk textarea{min-height:52px;resize:vertical;margin-top:7px}'+
 '#'+PAGE+' .dh317Row{display:grid;gap:7px;margin:8px 0}'+
 '#'+PAGE+' .dh317Row.two{grid-template-columns:1fr 1fr}'+
 '#'+PAGE+' .dh317Add{width:100%;padding:12px;border:0;background:var(--dh-accent);color:#fff;font-weight:900;border-radius:12px}'+
 '#'+PAGE+' .dh317Del{border:0;background:#fff0f1;color:#be3c52;border-radius:9px;padding:6px 8px;font-size:10px;font-weight:800;margin-top:7px}'+
 '#'+PAGE+' .dh317Foot{font-size:10px!important;color:#7d919c!important}'+
 '#'+PAGE+' .dh317Consent{display:flex;gap:8px;align-items:flex-start;color:#18475f;font-size:11px;line-height:1.45}'+
 '#'+PAGE+' .dh317Consent input{margin-top:2px;width:18px;height:18px;accent-color:var(--dh-accent)}'+
 '#'+PAGE+' .dh317Switch button:focus-visible,#'+PAGE+' .dh317Cats button:focus-visible{outline:2px solid #153f56;outline-offset:2px}';
 document.head.appendChild(n);
}
function ensure(){
 style();var p=el(PAGE);if(p)return p;
 p=document.createElement('section');p.id=PAGE;p.className='page';(document.querySelector('.app')||document.body).appendChild(p);
 p.addEventListener('click',function(e){
  var a=e.target.closest('button[data-profile],button[data-cat],button[data-action]');if(!a)return;
  if(a.dataset.profile){owner=a.dataset.profile;draw();return}
  if(a.dataset.cat){category=a.dataset.cat;draw();return}
  if(a.dataset.action==='back'){close();return}
  if(a.dataset.action==='add'){addCustom();return}
  if(a.dataset.action==='remove'){removeCustom(a.dataset.id);return}
 });
 p.addEventListener('change',function(e){
  var t=e.target,k=t.dataset;if(!k)return;
  if(k.check)editItem(k.check,{enabled:t.checked});
  if(k.note)editItem(k.note,{note:t.value.slice(0,280)},false);
  if(k.customtitle)editCustom(k.customtitle,{title:t.value.slice(0,90)});
  if(k.customtrigger)editCustom(k.customtrigger,{triggers:[t.value]});
  if(k.action==='consent'){
   var all=decode();record(all,owner).aiOptIn=t.checked;persist(all);
  }
  if(k.legacy){var a=legacy();a[k.legacy]=k.legacy==='allergyName'?t.value.slice(0,60):!!t.checked;saveLegacy(a)}
  if(window.HH_DAILY_HEALTH_V312&&window.HH_DAILY_HEALTH_V312.render)window.HH_DAILY_HEALTH_V312.render();
 });
 return p;
}
function editItem(id,patch,rerender){
 var d=decode(),p=record(d,owner),a=p.items[id]||{};
 Object.keys(patch).forEach(function(k){a[k]=patch[k]});
 p.items[id]=a;persist(d);
 if(rerender!==false)draw();
}
function editCustom(id,patch){
 var d=decode(),p=record(d,owner),a=p.custom.find(function(x){return x.id===id});
 if(!a)return;Object.keys(patch).forEach(function(k){a[k]=patch[k]});persist(d);draw();
}
function addCustom(){
 var name=(el('dh317NewTitle')||{}).value||'',trigger=(el('dh317NewTrigger')||{}).value||'heat';
 name=name.trim().slice(0,90);
 if(!name){window.alert('Előbb add meg a figyelendő tényező nevét.');return}
 var d=decode(),p=record(d,owner),id='custom-'+Date.now()+'-'+Math.floor(Math.random()*1e5);
 p.custom.push({id:id,title:name,category:'Egyéni',triggers:[trigger]});
 p.items[id]={enabled:true,note:''};persist(d);category='Egyéni';draw();
}
function removeCustom(id){
 var d=decode(),p=record(d,owner);
 p.custom=p.custom.filter(function(x){return x.id!==id});delete p.items[id];persist(d);draw();
}
function triggerText(keys){return (keys||[]).map(function(x){return TRIGGERS[x]||x}).join(' · ')}
function triggerOptions(current){return Object.keys(TRIGGERS).map(function(k){return '<option value="'+k+'"'+(k===current?' selected':'')+'>'+esc(TRIGGERS[k])+'</option>'}).join('')}
function draw(){
 var p=ensure(),d=decode(),rec=record(d,owner),name=owner==='m'?'Mónika':'Zsolt',old=legacy();
 p.dataset.profile=owner;
 var options=BASE.concat(rec.custom||[]).filter(function(x){return x.category===category});
 var toggles=options.map(function(r){
  var v=rec.items[r.id]||{},custom=r.id.indexOf('custom-')===0;
  return '<div class="dh317Risk"><label class="dh317Pick"><input type="checkbox" data-check="'+esc(r.id)+'" '+(v.enabled?'checked':'')+'><span>'+esc(r.title)+'</span></label>'+
  '<small>Figyelt jelzések: '+esc(triggerText(r.triggers))+'</small>'+
  (v.enabled?'<textarea data-note="'+esc(r.id)+'" maxlength="280" placeholder="Saját megjegyzés (opcionális; csak ezen az eszközön)">'+esc(v.note||'')+'</textarea>':'')+
  (custom?'<div class="dh317Row two"><input type="text" data-customtitle="'+esc(r.id)+'" maxlength="90" value="'+esc(r.title)+'" aria-label="Egyéni tényező átnevezése"><select data-customtrigger="'+esc(r.id)+'" aria-label="Környezeti kiváltó jelzés">'+triggerOptions((r.triggers||[])[0])+'</select></div><button class="dh317Del" data-action="remove" data-id="'+esc(r.id)+'" type="button">Törlés</button>':'')+
  '</div>';
 }).join('')||'<p>Ebben a kategóriában még nincs egyéni tényező.</p>';
 var legacyBlock=owner==='m'?
   '<label class="dh317Consent"><input data-legacy="allergy" type="checkbox" '+(old.allergy?'checked':'')+'> Magas pollennél az előírt allergiás rutin ellenőrzése</label>'+
   '<div class="dh317Row"><input data-legacy="allergyName" type="text" maxlength="60" value="'+esc(old.allergyName||'')+'" placeholder="Előírt allergiagyógyszer neve (opcionális)"></div>':
   '<label class="dh317Consent"><input data-legacy="headache" type="checkbox" '+(old.headache?'checked':'')+'> Légnyomásváltozásnál fejfájásnapló-emlékeztető</label>';
 p.innerHTML='<div class="dh317Hero"><button data-action="back" type="button" aria-label="Vissza">‹</button><h1>⚙️ Daily Health<br>Beállítások</h1></div>'+
  '<div class="dh317Body"><div class="dh317Card"><h2>💚 Személyes figyelési tényezők</h2><p>Az ellenőrzött diagnózisokat és a feltételezett érzékenységeket te jelölöd ki. A pipa figyelést jelent, nem új diagnózist.</p>'+
  '<div class="dh317Switch"><button type="button" data-profile="m" aria-pressed="'+(owner==='m')+'" class="'+(owner==='m'?'on':'')+'">Mónika</button><button type="button" data-profile="z" aria-pressed="'+(owner==='z')+'" class="'+(owner==='z'?'on':'')+'">Zsolt</button></div></div>'+
  '<div class="dh317Card"><h2>📋 '+name+' · bekapcsolható tényezők</h2><div class="dh317Cats">'+CATS.map(function(c){return '<button data-cat="'+esc(c)+'" class="'+(c===category?'on':'')+'">'+esc(c)+'</button>'}).join('')+'</div>'+
  toggles+'</div>'+
  '<div class="dh317Card"><h2>➕ Egyéni tényező hozzáadása</h2><div class="dh317Row"><input type="text" id="dh317NewTitle" maxlength="90" placeholder="Pl. saját megfigyelési szempont"></div><div class="dh317Row"><select id="dh317NewTrigger">'+triggerOptions('pressure')+'</select></div><button class="dh317Add" type="button" data-action="add">+ Hozzáadás és bepipálás</button></div>'+
  '<div class="dh317Card"><h2>🔔 Korábbi emlékeztető</h2>'+legacyBlock+'</div>'+
  '<div class="dh317Card"><h2>🧠 Léna AI · külön hozzájárulás</h2><label class="dh317Consent"><input type="checkbox" data-action="consent" '+(rec.aiOptIn?'checked':'')+'> Külön indított Léna-elemzéskor a bekapcsolt tényezők megjelenhetnek a kitöltött kérdésben.</label>'+
  '<p class="dh317Foot">A bejelölés NEM indít automatikus adatküldést. A nyilvános, reggeli AI-jelentés személyes egészségügyi adatokat nem tartalmaz. A reggeli privát AI-elemzéshez külön biztonságos szerverintegráció szükséges.</p></div>'+
  '<div class="dh317Card"><h2>🔒 Adatvédelem</h2><p class="dh317Foot">A kipipált elemek és a megjegyzések jelenleg csak ebben a böngészőben (localStorage), titkosítás és eszközök közötti szinkronizálás nélkül tárolódnak. Ne írj ide azonosítókat, leletszámokat vagy szükségtelenül részletes személyes adatokat. A nyilvános GitHub nem kapja meg őket.</p><p class="dh317Foot">A jelzések tájékoztató jellegűek, nem diagnózisok, és nem helyettesítik a kezelőorvosi tervet. Súlyos panasz esetén ne várj reggeli AI-jelentésre.</p></div></div>';
}
function open(){
 ensure();owner=localStorage.getItem('hh-profile')==='m'?'m':'z';category='Szív és keringés';draw();
 document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on')});
 el(PAGE).classList.add('on');
 ['navTimelineBar','navHomeBar','navDetailBar'].forEach(function(id){var n=el(id);if(n)n.style.display='none'});
 var nav=el('navHealthBar');if(nav)nav.style.display='grid';
 window.scrollTo(0,0);
}
function close(){
 el(PAGE).classList.remove('on');
 if(window.HH_DAILY_HEALTH_V312&&typeof window.HH_DAILY_HEALTH_V312.open==='function')window.HH_DAILY_HEALTH_V312.open();
 else if(typeof window.show==='function')window.show('health');
}
window.hhOpenDailyHealthSettings317=open;
window.HH_DAILY_HEALTH_SETTINGS_V317={open:open,getEnabled:getEnabled,renderPersonal:personal,promptContext:promptContext};
document.documentElement.dataset.healthhubDailyHealthSettings='v317';
})();