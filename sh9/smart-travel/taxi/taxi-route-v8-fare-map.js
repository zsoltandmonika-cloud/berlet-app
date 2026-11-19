/* SHO Taxi · címalapú viteldíj v2 · approved hero image left untouched. */
(()=>{'use strict';
const dialog=document.getElementById('calcDialog');
if(!dialog||document.getElementById('taxiRouteV2'))return;
const css=`
#calcDialog .fields,#calcDialog .option,#calcDialog .result,#calcDialog>.sub{display:none!important}
#calcDialog .taxi-dialog-scroll>.sub{display:none!important}
#taxiRouteV2{margin:8px 0 5px;color:#f8f2ff;display:flex;flex-direction:column;flex:1;min-height:0}
#taxiRouteV2 .tx-field{display:block;margin:12px 0 4px;font-weight:800;font-size:12px;color:#f4c9e6}
#taxiRouteV2 .tx-label-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:11px 0 4px}
#taxiRouteV2 .tx-label-row .tx-field{margin:0}
#taxiRouteV2 .tx-favorite{min-height:27px;padding:3px 11px;border:1px solid #d37cb99c;
 background:linear-gradient(120deg,#453051,#241733);box-shadow:inset 0 1px #fff2;
 color:#ffe4ab;border-radius:9px;font-size:11px;font-weight:800;
 white-space:nowrap;cursor:pointer;touch-action:manipulation}
#taxiRouteV2 .tx-favorite:active{background:#87437c}
#taxiRouteV2 .tx-favorite:focus-visible{outline:2px solid #fff;outline-offset:2px}
#taxiRouteV2 .tx-entry{display:flex;gap:6px;position:relative}
#taxiRouteV2 .tx-entry input{min-width:0;width:100%;height:46px;border-radius:11px;border:1px solid #bd75a7;background:#0c0e22;color:#fff;font:600 14px Inter,system-ui,sans-serif;padding:9px 11px;outline:0}
#taxiRouteV2 .tx-entry input:focus{border-color:#ff71bf;box-shadow:0 0 0 2px #f36ab633}
#taxiRouteV2 .tx-entry input::placeholder{color:#a9a1b5;font-weight:400}
#taxiRouteV2 .tx-gps,#taxiRouteV2 .tx-mic{flex:0 0 auto;min-width:42px;min-height:46px;color:#fff;font-size:16px;font-weight:800;border:1px solid #f88dcc;border-radius:11px;background:#412343;padding:0 8px;cursor:pointer;touch-action:manipulation}
#taxiRouteV2 .tx-gps{font-size:12px}
#taxiRouteV2 .tx-mic.listening{background:#bd145f;box-shadow:0 0 0 3px #fc5eae33}
#taxiRouteV2 .tx-mic:disabled{opacity:.45;cursor:not-allowed}
#taxiRouteV2 .tx-sugs button:focus-visible,#taxiRouteV2 .tx-sugs button.is-highlight{outline:2px solid #ff8cc9;outline-offset:-2px;background:#493157}
#taxiRouteV2 .tx-sugs{max-height:225px;overflow-y:auto;overscroll-behavior:contain}
#taxiRouteV2 .tx-sugs[hidden]{display:none!important}
#taxiRouteV2 .tx-entry input{flex:1}
#taxiRouteV2 .tx-entry button:focus-visible{outline:2px solid #ffd1ed;outline-offset:2px}

#taxiRouteV2 .tx-sugs{margin:3px 0 0;padding:0;list-style:none;background:#17152b;border-radius:11px;overflow-x:hidden;overflow-y:auto;box-shadow:0 10px 20px #0009}
#taxiRouteV2 .tx-sugs:empty{display:none}
#taxiRouteV2 .tx-sugs button{display:block;width:100%;padding:11px 10px;text-align:left;border:0;border-bottom:1px solid #996b9755;background:#241b37;color:white;font-size:12px;line-height:1.35;cursor:pointer}
#taxiRouteV2 .tx-sugs .tx-credit{padding:7px 11px 8px;text-align:right;font-size:11px;color:#e2bedc;list-style:none;background:#17152b}
#taxiRouteV2 .tx-go{width:100%;min-height:62px;margin:14px 0 0;border-radius:13px;
 border:1px solid #af9ce9;background:linear-gradient(120deg,#102a55 0%,#34245a 50%,#782257 100%);
 display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 13px;
 box-shadow:inset 0 1px rgba(255,255,255,.22),0 5px 16px #02020c7a;
 font-size:15px;font-weight:850;color:#fff;cursor:pointer;touch-action:manipulation}
#taxiRouteV2 .tx-go:focus-visible{outline:3px solid #e4b9ff;outline-offset:3px}
#taxiRouteV2 .tx-sho-logo{display:block;width:94px;height:auto;max-height:44px;object-fit:contain;flex:0 0 auto}
#taxiRouteV2 .tx-go-label{display:block;min-width:0;text-align:center;line-height:1.25;text-wrap:balance;
 text-shadow:0 1px 2px #080b1f}
#taxiRouteV2 .tx-go:disabled{opacity:.65;cursor:wait}
#taxiRouteV2 .tx-status{min-height:15px;margin:10px 1px 7px;font-size:12px;line-height:1.45;color:#f4c9e6}
#taxiRouteV2 .tx-cost{padding:13px 12px;border:1px solid #ff80ca;border-radius:15px;background:linear-gradient(130deg,#521739,#281439);text-align:center}
#taxiRouteV2 .tx-big{font-size:27px;font-weight:900;color:#fff;line-height:1.4}
#taxiRouteV2 .tx-meta{font-size:13px;color:#f5d4e9;line-height:1.6}
#taxiRouteV2 .tx-note{font-size:11px;color:#e5c9db;margin-top:7px;line-height:1.4}
#taxiRouteV2 .tx-map{display:inline-block;margin-top:9px;font-size:12px;color:#ffd1ed}
/* The optional route preview sits directly below the estimated fare. */
#taxiRouteV2 .tx-route-map{overflow:hidden;margin:10px 0 0;border:1px solid #b48edf91;
 border-radius:17px;background:#151a36;box-shadow:0 6px 20px #0008}
#taxiRouteV2 .tx-route-map[hidden]{display:none!important}
#taxiRouteV2 .tx-route-map-head{display:flex;align-items:center;justify-content:space-between;
 gap:7px;min-height:49px;padding:8px 11px;background:linear-gradient(115deg,#241d44,#421b50)}
#taxiRouteV2 .tx-route-map-head strong{display:block;color:#fff;font-size:13px;line-height:1.2}
#taxiRouteV2 .tx-route-map-head small{display:block;color:#e5c7ea;font-size:10px;margin-top:3px;
 white-space:normal;line-height:1.3}
#taxiRouteV2 .tx-route-map-legend{font-size:12px;color:#ebd5f3;white-space:nowrap}
#taxiRouteV2 .tx-route-map-tools{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-shrink:0}
#taxiRouteV2 .tx-map-theme-toggle{display:inline-flex;align-items:center;justify-content:center;
 width:34px;height:34px;flex:0 0 34px;padding:0;border:1px solid #f09edab8;
 background:linear-gradient(145deg,#553262,#281d4f);box-shadow:inset 0 1px #ffffff34;
 color:#fff;border-radius:10px;font-size:18px;cursor:pointer;touch-action:manipulation}
#taxiRouteV2 .tx-map-theme-toggle:focus-visible{outline:2px solid #fff;outline-offset:2px}
#taxiRouteV2 .tx-map-theme-toggle:active{background:#87427b}
@media(max-width:370px){#taxiRouteV2 .tx-route-map-legend{font-size:11px}
 #taxiRouteV2 .tx-route-map-tools{gap:4px}}
#taxiRouteV2 .tx-route-map-canvas{position:relative;height:clamp(325px,calc(46dvh + 15px),435px);
 background:linear-gradient(135deg,#152643,#252543)}
#taxiRouteV2 .tx-route-map[data-state="loading"] .tx-route-map-canvas::before,
#taxiRouteV2 .tx-route-map[data-state="error"] .tx-route-map-canvas::before{
 content:"Útvonal betöltése…";position:absolute;z-index:2;inset:0;display:flex;align-items:center;
 justify-content:center;text-align:center;padding:18px;background:#10152ab8;color:#ecd1f3;
 font-size:12px;pointer-events:none}
#taxiRouteV2 .tx-route-map[data-state="error"] .tx-route-map-canvas::before{
 content:"A térképes előnézet nem elérhető. A Google Maps link továbbra is működik."}
.tx-route-pin{width:29px;height:29px;display:flex;align-items:center;justify-content:center;
 border:2px solid #fff;border-radius:50% 50% 50% 5px;color:white;font-weight:900;font-size:13px;
 transform:rotate(-45deg);box-shadow:0 3px 13px #0d0c23a8}
.tx-route-pin-origin{background:#046ecc}
.tx-route-pin-destination{background:#fb0b91}
.tx-route-pin{font-size:0}
.tx-route-pin::after{content:attr(data-label);transform:rotate(45deg);font-size:13px}
#taxiRouteV2 .tx-route-map .maplibregl-ctrl-attrib{font-size:9px}
#taxiRouteV2 .tx-route-map .maplibregl-ctrl-attrib a{color:#253b6f}
/* Főtaxi official calculator: yellow Budapest taxi-button with real checker stripe. */
#taxiRouteV2 .tx-fotaxi{margin:8px 0 0;padding:0;text-align:center}
#taxiRouteV2 .tx-fotaxi-link{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;
 width:100%;min-height:62px;padding:12px 11px;border-radius:13px;border:1px solid #fff3a0;
 background:linear-gradient(145deg,#ffe875 0%,#ffd334 52%,#ffb51c 100%);
 box-shadow:inset 0 1px rgba(255,255,255,.8),0 4px 14px #09020888;
 color:#231700;text-decoration:none;text-align:center;font-size:14px;line-height:1.25;font-weight:900;
 text-shadow:0 1px rgba(255,255,255,.35);touch-action:manipulation}
#taxiRouteV2 .tx-fotaxi-link::before,#taxiRouteV2 .tx-fotaxi-link::after{
 content:'';position:absolute;left:10px;right:10px;height:7px;
 background:repeating-conic-gradient(#141414 0% 25%,#fff 0% 50%) 0 0/14px 14px;
 border-radius:2px;pointer-events:none}
#taxiRouteV2 .tx-fotaxi-link::before{top:0}
#taxiRouteV2 .tx-fotaxi-link::after{bottom:0}
#taxiRouteV2 .tx-fotaxi-link:focus-visible{outline:3px solid #fff;outline-offset:3px}
#taxiRouteV2 .tx-fotaxi-link:active{filter:brightness(1.07)}
#taxiRouteV2 .tx-fotaxi-logo{display:block;width:95px;height:43px;max-width:33%;margin:0;
 border:0!important;outline:0!important;box-shadow:none!important;border-radius:0!important;
 background:transparent!important;object-fit:contain;flex:0 0 auto}
#taxiRouteV2 .tx-fotaxi-text{display:block;text-align:center;line-height:1.2}
@media(max-width:360px){#taxiRouteV2 .tx-fotaxi-link{font-size:12.5px;gap:7px}#taxiRouteV2 .tx-go{gap:7px;font-size:14px}#taxiRouteV2 .tx-sho-logo{width:82px}#taxiRouteV2 .tx-fotaxi-logo{width:82px;height:auto}}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const panel=document.createElement('section');panel.id='taxiRouteV2';
panel.innerHTML=`
<div class="tx-label-row"><label class="tx-field" for="txFrom">Honnan?</label><button class="tx-favorite" id="txFromFav" type="button" aria-controls="txFromSug" aria-label="Kedvenc indulási címek">⭐ Kedvencek</button></div>
<div class="tx-entry"><input id="txFrom" placeholder="Indulási cím…" autocomplete="off" autocapitalize="words" spellcheck="false" role="combobox" aria-haspopup="listbox" aria-autocomplete="list" aria-controls="txFromSug" aria-expanded="false"><button class="tx-mic" id="txFromMic" type="button" aria-label="Indulási cím bemondása" title="Indulási cím bemondása">🎙️</button><button class="tx-gps" id="txGps" type="button" aria-label="Jelenlegi helyem GPS alapján">📍 GPS</button></div><ul class="tx-sugs" id="txFromSug" role="listbox" aria-label="Indulási címjavaslatok"></ul>
<div class="tx-label-row"><label class="tx-field" for="txTo">Hová?</label><button class="tx-favorite" id="txToFav" type="button" aria-controls="txToSug" aria-label="Kedvenc célcímek">⭐ Kedvencek</button></div>
<div class="tx-entry"><input id="txTo" placeholder="Úticél címe…" autocomplete="off" autocapitalize="words" spellcheck="false" role="combobox" aria-haspopup="listbox" aria-autocomplete="list" aria-controls="txToSug" aria-expanded="false"><button class="tx-mic" id="txToMic" type="button" aria-label="Célcím bemondása" title="Célcím bemondása">🎙️</button></div><ul class="tx-sugs" id="txToSug" role="listbox" aria-label="Célcímjavaslatok"></ul>
<button class="tx-go" type="button" id="txEstimate" aria-label="Smart Taxi viteldíj-kalkulátor">
<img class="tx-sho-logo" src="./assets/sho-taxi-button-v6.webp" width="142" height="54" alt="" aria-hidden="true">
<span class="tx-go-label">Smart Taxi<br>viteldíj-kalkulátor</span></button>
<div class="tx-fotaxi">
<a class="tx-fotaxi-link" id="txFotaxiOfficial" href="https://fotaxi.hu/utasoknak/viteldij-kalkulator/" target="_blank" rel="noopener noreferrer" aria-label="Főtaxi hivatalos címalapú viteldíj-kalkulátor megnyitása új lapon">
<img class="tx-fotaxi-logo" src="./assets/fotaxi-official-red-v1.png?v=20261119-official-logo" width="95" height="43" alt="" aria-hidden="true"><span class="tx-fotaxi-text">Főtaxi viteldíj-kalkulátor ↗</span></a>
</div>
<p class="tx-status" id="txStatus" role="status" aria-live="polite">Írj be legalább 3 karaktert, vagy mondd be a címet a mikrofonba.</p>
<div class="tx-cost" id="txCost" hidden><div class="tx-meta">Várható viteldíj</div><div class="tx-big" id="txAmount"></div><div class="tx-meta" id="txMeta"></div><div class="tx-note">Tájékoztató becslés, a végleges összeget a taxaméter mutatja.</div><a class="tx-map" id="txMap" target="_blank" rel="noopener noreferrer">🗺️ Útvonal megnyitása a térképen ↗</a></div>
<section class="tx-route-map" id="txRouteMapSection" hidden aria-label="Az indulás és érkezés közti közúti útvonal térképe" data-state="loading">
<div class="tx-route-map-head"><div><strong>🗺️ Az útvonal térképen</strong><small id="txRouteMapStatus" role="status" aria-live="polite">Útvonal előnézete…</small></div><div class="tx-route-map-tools"><span class="tx-route-map-legend">🔵 A → 🩷 B</span><button class="tx-map-theme-toggle" type="button" id="txRouteMapTheme" data-taxi-map-theme aria-label="Világos térkép bekapcsolása" title="Világos térkép bekapcsolása">☀️</button></div></div>
<div class="tx-route-map-canvas" id="txRouteMapCanvas" role="region" aria-label="Interaktív térkép a közúti útvonallal"></div>
</section>
`;
dialog.querySelector('.taxi-dialog-scroll>.fields')?.before(panel);
window.SHO_TAXI_MAP_THEME_V1?.refreshButtons?.();
const el=id=>document.getElementById(id), status=s=>{el('txStatus').textContent=s};
const data={from:null,to:null},endpoint='https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-sho-taxi-routes-v1';
const routePreviewEndpoint='https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-sho-taxi-route-preview-v1';
let cli;
function client(){
 if(cli)return cli;const cfg=window.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase?.createClient)
  throw Error('A térképes kapcsolat jelenleg nem áll rendelkezésre.');
 cli=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{
 storageKey:'hh-guardian-family-auth-v785',persistSession:true,
 autoRefreshToken:false,detectSessionInUrl:false}});
 return cli;
}
async function request(body,url=endpoint){
 const c=client();const {data:session,error:authError}=await c.auth.getSession();
 if(authError||!session?.session?.access_token)
  throw Error('A kalkulátorhoz jelentkezz be a Family Guardban.');
 const r=await fetch(url,{method:'POST',headers:{
 'Content-Type':'application/json','Authorization':'Bearer '+session.session.access_token,
 'apikey':window.HH_CENTRAL_VAULT.publishableKey},
 body:JSON.stringify(body),signal:AbortSignal.timeout(body.action==='estimate'||body.action==='preview'?30000:16000)});
 const out=await r.json().catch(()=>({}));
 if(!r.ok){
  if(r.status===401||r.status===403)throw Error('A bejelentkezés lejárt, lépj be a Family Guardba.');
  if(r.status===429)throw Error('A külső térképszolgáltató ideiglenesen korlátozza a kéréseket.');
  if(out.error==='provider_unconfigured'||out.error==='provider_unavailable')
    throw Error('A címkereső jelenleg nem elérhető. A cím kézzel is megadható.');
  throw Error('Az útvonal most nem számítható ki. Használd a Főtaxi kalkulátorát.');
 }
 return out;
}

const addressCache=new Map();
const CACHE_TTL_MS=120000;
const favoriteMatches=(query='',limit=6)=>{
 try{return window.SHO_TAXI_FAVORITES_V1?.find?.(query,limit)||[]}catch(_){return []}
};
function mergedSuggestions(query,online=[]){
 const favorites=favoriteMatches(query,3),seen=new Set();
 return [...favorites,...(Array.isArray(online)?online:[])].filter(item=>{
  if(!item||typeof item.label!=='string')return false;
  const key=item.location&&Number.isFinite(item.location.lat)&&Number.isFinite(item.location.lng)?
   item.location.lat.toFixed(5)+':'+item.location.lng.toFixed(5):
   item.label.toLocaleLowerCase('hu-HU');
  if(seen.has(key))return false;
  seen.add(key);return true;
 }).slice(0,7);
}
let listening=null;
const SpeechRecognitionAPI=window.SpeechRecognition||window.webkitSpeechRecognition;
function startSpeech(name){
 const input=el(name==='from'?'txFrom':'txTo'),mic=el(name==='from'?'txFromMic':'txToMic');
 if(!SpeechRecognitionAPI){
  status('A böngésző nem támogatja a saját hangfelismerőt. Használd a Samsung billentyűzet mikrofonját.');
  input.focus();return;
 }
 if(listening){try{listening.stop()}catch(_){}listening=null;document.querySelectorAll('#taxiRouteV2 .tx-mic').forEach(b=>b.classList.remove('listening'));return;}
 try{
  const recognition=new SpeechRecognitionAPI();
  recognition.lang='hu-HU';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
  listening=recognition;mic.classList.add('listening');mic.setAttribute('aria-pressed','true');
  status('🎙️ Hallgatlak. Mondd be a címet magyarul.');
  recognition.onresult=event=>{
   let transcript='',final=false;
   for(let i=event.resultIndex||0;i<event.results.length;i++){
    const result=event.results[i];
    if(result&&result[0]&&result[0].transcript){transcript+=result[0].transcript;final=final||result.isFinal;}
   }
   transcript=transcript.trim().slice(0,130);
   if(!transcript)return;
   input.value=transcript;
   if(final){
    input.dispatchEvent(new Event('input',{bubbles:true}));
    status('Cím felismerve: '+transcript+' · válassz a megjelenő címekből.');
   }
  };
  recognition.onerror=event=>{
   if(event.error!=='aborted'){
    status(event.error==='not-allowed'?'A mikrofonengedély hiányzik. Engedélyezd a mikrofont, vagy használd a billentyűzet diktálását.':'A beszédfelismerés nem sikerült. A billentyűzet mikrofonja is használható.');
   }
  };
  recognition.onend=()=>{
   if(listening===recognition)listening=null;
   mic.classList.remove('listening');mic.setAttribute('aria-pressed','false');
  };
  recognition.start();
 }catch(_){
  listening=null;mic.classList.remove('listening');mic.setAttribute('aria-pressed','false');
  status('A hangfelismerés itt nem indítható. Használd a Samsung billentyűzet mikrofonját.');
  input.focus();
 }
}
for(const name of ['from','to']){
 const input=el(name==='from'?'txFrom':'txTo'),list=el(name==='from'?'txFromSug':'txToSug');
 const mic=el(name==='from'?'txFromMic':'txToMic');
 const favButton=el(name==='from'?'txFromFav':'txToFav');
 mic.addEventListener('click',()=>startSpeech(name));
 if(!SpeechRecognitionAPI)mic.title='Használd a Samsung billentyűzet mikrofonját';
 let timer=0,serial=0,results=[],selected=-1;
 const clearList=()=>{
  list.replaceChildren();results=[];selected=-1;
  input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');
 };
 function choose(s){
  clearTimeout(timer);serial++;clearList();
  input.value=s.label;data[name]={label:s.label,...(typeof s.placeId==='string'?{placeId:s.placeId}:{}),...(s.location?{location:s.location}:{})};
  el('txCost').hidden=true;
  status((s.favorite?'⭐ '+s.displayName+' · ':'📍 ')+s.label+' · cím kiválasztva');
  if(name==='from'&&!el('txTo').value.trim())el('txTo').focus();
 }
 function render(items,source,maxItems=5){
  clearList();results=items.filter(s=>s&&typeof s.label==='string'&&
   (typeof s.placeId==='string'||(Number.isFinite(s.location?.lat)&&Number.isFinite(s.location?.lng)))).slice(0,maxItems);
  results.forEach((s,i)=>{
   const li=document.createElement('li'),b=document.createElement('button');
   b.type='button';b.role='option';b.id=(name==='from'?'txFromOption':'txToOption')+i;
   b.textContent=(s.favorite?'⭐ '+s.displayName+' · ':'📍 ')+s.label;
   b.setAttribute('aria-selected','false');
   b.addEventListener('mousedown',e=>e.preventDefault());
   b.addEventListener('click',()=>choose(s));li.appendChild(b);list.appendChild(li);
  });
  if(results.length){const credit=document.createElement('li');credit.className='tx-credit';credit.setAttribute('role','presentation');credit.textContent='Címjavaslatok: '+(source||'OpenStreetMap / Photon');list.appendChild(credit);}
  input.setAttribute('aria-expanded',String(results.length>0));
  if(results.length)status((source==='Kedvenceim'?'⭐ ':'🔎 ')+results.length+' címtalálat · koppints a megfelelő címre.');
  else status(source==='Kedvenceim'?'Még nincs mentett családi kedvenc cím.':'Nincs címtalálat. Próbáld az utcanév vagy város másik alakját.');
 }
 favButton?.addEventListener('click',()=>{
  clearTimeout(timer);serial++;
  render(favoriteMatches('',40),'Kedvenceim',40);
 });
 input.addEventListener('input',()=>{
  data[name]=null;clearList();el('txCost').hidden=true;
  clearTimeout(timer);const q=input.value.trim(),ticket=++serial;
  if(q.length<3){
   const local=favoriteMatches(q,7);
   if(local.length)render(local,'Kedvenceim',7);
   else if(q.length)status('Írj még '+(3-q.length)+' karaktert a címjavaslatokhoz.');
   return;
  }
  const instant=favoriteMatches(q,3);
  if(instant.length)render(instant,'Kedvenceim',3);
  const key=q.toLocaleLowerCase('hu-HU');
  const cached=addressCache.get(key);
  if(cached&&Date.now()-cached.time<CACHE_TTL_MS){render(mergedSuggestions(q,cached.items),cached.source,7);return;}
  if(!instant.length)status('🔎 Címjavaslatok keresése…');
  timer=setTimeout(async()=>{
   try{
    const ans=await request({action:'suggest',query:q});
    if(ticket!==serial||input.value.trim()!==q)return;
    addressCache.set(key,{time:Date.now(),items:ans.suggestions||[],source:ans.source});
    if(addressCache.size>80)addressCache.delete(addressCache.keys().next().value);
    render(mergedSuggestions(q,ans.suggestions||[]),ans.source,7);
   }catch(e){if(ticket===serial){
    if(instant.length)render(favoriteMatches(q,7),'Kedvenceim',7);
    else{clearList();status(e.message||'A címjavaslat jelenleg nem elérhető. A cím kézzel is beírható.');}
   }}
  },380);
 });
 input.addEventListener('focus',()=>{
  const q=input.value.trim();
  if(!q){const f=favoriteMatches('',6);if(f.length)render(f,'Kedvenceim',6);return;}
  const cached=addressCache.get(q.toLocaleLowerCase('hu-HU'));
  if(q.length>=3&&cached&&Date.now()-cached.time<CACHE_TTL_MS&&list.childElementCount===0)
   render(mergedSuggestions(q,cached.items),cached.source,7);
  else if(q.length<3){const f=favoriteMatches(q,6);if(f.length)render(f,'Kedvenceim',6);}
 });
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'){clearList();return;}
  if(!results.length)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();
   selected=event.key==='ArrowDown'?(selected+1)%results.length:(selected-1+results.length)%results.length;
   Array.from(list.querySelectorAll('button')).forEach((b,i)=>{
    b.classList.toggle('is-highlight',i===selected);
    b.setAttribute('aria-selected',String(i===selected));
   });
   input.setAttribute('aria-activedescendant',(name==='from'?'txFromOption':'txToOption')+selected);
  }else if(event.key==='Enter'){
   event.preventDefault();choose(results[selected>=0?selected:0]);
  }
 });
 input.addEventListener('blur',()=>{
  setTimeout(()=>{if(document.activeElement!==input)clearList()},230);
 });
}
el('txGps').addEventListener('click',()=>{
 if(!navigator.geolocation){status('A böngésző nem támogatja a GPS-t. Adj meg címet.');return}
 status('GPS-pozíció lekérése…');
 navigator.geolocation.getCurrentPosition(pos=>{
  data.from={label:'Jelenlegi helyem',location:{lat:pos.coords.latitude,lng:pos.coords.longitude}};
  el('txFrom').value='📍 Jelenlegi helyem';el('txFromSug').replaceChildren();status('Kiindulópont GPS-ről betöltve.');
 },()=>status('A GPS nem érhető el, add meg a kiindulási címet.'),{enableHighAccuracy:true,timeout:10000,maximumAge:120000});
});
el('txEstimate').addEventListener('click',async()=>{
 const from=data.from||{address:el('txFrom').value.trim(),label:el('txFrom').value.trim()};
 const to=data.to||{address:el('txTo').value.trim(),label:el('txTo').value.trim()};
 if((!from.placeId&&!from.location&&(!from.address||from.address.length<5))||
    (!to.placeId&&!to.location&&(!to.address||to.address.length<5))){
  status('Add meg a kiindulási és a célcímet.');return;
 }
 const btn=el('txEstimate');btn.disabled=true;el('txCost').hidden=true;
 window.SHO_TAXI_RESULT_MAP_V1?.cancel?.();
 el('taxiDialogScroll')?.classList.remove('has-result');
 status('Útvonal és forgalmi menetidő számítása…');
 try{
  const x=await request({action:'estimate',from,to});
  const nf=n=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:0}).format(n);
  el('txAmount').textContent=nf(x.estimatedFareFt)+' Ft';
  el('txMeta').textContent=x.distanceKm+' km · '+x.travelMinutes+' perc'+(x.airportFare?' · repülőtéri alapdíj':'');
  const origin=from.location?from.location.lat+','+from.location.lng:(from.label||from.address||el('txFrom').value);
  const destination=to.label||to.address||el('txTo').value;
  el('txMap').href='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+
   '&destination='+encodeURIComponent(destination)+'&travelmode=driving';
  const note=el('txCost').querySelector('.tx-note');
  if(note)note.textContent=x.disclaimer||'Tájékoztató becslés, a végleges összeget a taxaméter mutatja.';
  el('txCost').hidden=false;status('Útvonal kiszámítva · '+(x.source||'térképes útvonal')+'.');
  const viewport=el('taxiDialogScroll');
  viewport?.classList.add('has-result');
  // TADÁÁ and the scrolling fare result are tied to a successful calculation only.
  window.SHO_TAXI_RESULT_MAP_V1?.tadaa?.();
  window.SHO_TAXI_RESULT_MAP_V1?.show?.(()=>
    request({action:'preview',from,to},routePreviewEndpoint));
  if(viewport){
   const toFareTop=()=>{
    const delta=el('txCost').getBoundingClientRect().top-viewport.getBoundingClientRect().top;
    viewport.scrollTo({top:Math.max(0,viewport.scrollTop+delta-6),behavior:'smooth'});
   };
   requestAnimationFrame(()=>requestAnimationFrame(toFareTop));
  }
 }catch(e){status(e.message||'Jelenleg nem sikerült számítani.');}
 finally{btn.disabled=false}
});
})();