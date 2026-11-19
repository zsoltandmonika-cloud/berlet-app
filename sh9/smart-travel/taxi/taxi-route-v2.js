/* SHO Taxi · címalapú viteldíj v2 · approved hero image left untouched. */
(()=>{'use strict';
const dialog=document.getElementById('calcDialog');
if(!dialog||document.getElementById('taxiRouteV2'))return;
const css=`
#calcDialog .fields,#calcDialog .option,#calcDialog .result,#calcDialog>.sub{display:none!important}
#calcDialog .dialog-card>.sub{display:none!important}
#taxiRouteV2{margin:8px 0 5px;color:#f8f2ff}
#taxiRouteV2 .tx-field{display:block;margin:12px 0 4px;font-weight:800;font-size:12px;color:#f4c9e6}
#taxiRouteV2 .tx-entry{display:flex;gap:6px;position:relative}
#taxiRouteV2 .tx-entry input{min-width:0;width:100%;height:46px;border-radius:11px;border:1px solid #bd75a7;background:#0c0e22;color:#fff;font:600 14px Inter,system-ui,sans-serif;padding:9px 11px;outline:0}
#taxiRouteV2 .tx-entry input:focus{border-color:#ff71bf;box-shadow:0 0 0 2px #f36ab633}
#taxiRouteV2 .tx-entry input::placeholder{color:#a9a1b5;font-weight:400}
#taxiRouteV2 .tx-gps{flex:0 0 auto;color:#fff;font-size:13px;font-weight:800;border:1px solid #f88dcc;border-radius:11px;background:#412343;padding:0 10px;cursor:pointer}
#taxiRouteV2 .tx-sugs{margin:3px 0 0;padding:0;list-style:none;background:#17152b;border-radius:11px;overflow:hidden;box-shadow:0 10px 20px #0009}
#taxiRouteV2 .tx-sugs:empty{display:none}
#taxiRouteV2 .tx-sugs button{display:block;width:100%;padding:11px 10px;text-align:left;border:0;border-bottom:1px solid #996b9755;background:#241b37;color:white;font-size:12px;line-height:1.35;cursor:pointer}
#taxiRouteV2 .tx-go{width:100%;min-height:49px;margin:15px 0 8px;border-radius:12px;border:1px solid #ffb2d7;background:linear-gradient(120deg,#ff339f,#b10069);font-size:15px;font-weight:850;color:white;cursor:pointer}
#taxiRouteV2 .tx-go:disabled{opacity:.65;cursor:wait}
#taxiRouteV2 .tx-status{min-height:15px;margin:4px 0 10px;font-size:12px;line-height:1.45;color:#f4c9e6}
#taxiRouteV2 .tx-cost{padding:13px 12px;border:1px solid #ff80ca;border-radius:15px;background:linear-gradient(130deg,#521739,#281439);text-align:center}
#taxiRouteV2 .tx-big{font-size:27px;font-weight:900;color:#fff;line-height:1.4}
#taxiRouteV2 .tx-meta{font-size:13px;color:#f5d4e9;line-height:1.6}
#taxiRouteV2 .tx-note{font-size:11px;color:#e5c9db;margin-top:7px;line-height:1.4}
#taxiRouteV2 .tx-map{display:inline-block;margin-top:9px;font-size:12px;color:#ffd1ed}
#taxiRouteV2 .tx-external{display:block;margin:12px 2px 1px;text-align:center;font-size:12px;color:#ffc2e8}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const panel=document.createElement('section');panel.id='taxiRouteV2';
panel.innerHTML=`
<label class="tx-field" for="txFrom">Honnan?</label>
<div class="tx-entry"><input id="txFrom" placeholder="Indulási cím…" autocomplete="off" spellcheck="false"><button class="tx-gps" id="txGps" type="button" aria-label="Jelenlegi helyem GPS alapján">📍 GPS</button></div><ul class="tx-sugs" id="txFromSug"></ul>
<label class="tx-field" for="txTo">Hová?</label>
<div class="tx-entry"><input id="txTo" placeholder="Úticél címe…" autocomplete="off" spellcheck="false"></div><ul class="tx-sugs" id="txToSug"></ul>
<button class="tx-go" type="button" id="txEstimate">🚕 Várható viteldíj kiszámítása</button>
<p class="tx-status" id="txStatus" role="status" aria-live="polite">A távolságot és a menetidőt automatikusan számoljuk.</p>
<div class="tx-cost" id="txCost" hidden><div class="tx-meta">Várható viteldíj</div><div class="tx-big" id="txAmount"></div><div class="tx-meta" id="txMeta"></div><div class="tx-note">Tájékoztató becslés, a végleges összeget a taxaméter mutatja.</div><a class="tx-map" id="txMap" target="_blank" rel="noopener noreferrer">🗺️ Útvonal megnyitása a térképen ↗</a></div>
<a class="tx-external" href="https://fotaxi.hu/utasoknak/viteldij-kalkulator/" target="_blank" rel="noopener noreferrer">Főtaxi hivatalos címalapú kalkulátor ↗</a>
`;
dialog.querySelector('.dialog-card>.fields')?.before(panel);
const el=id=>document.getElementById(id), status=s=>{el('txStatus').textContent=s};
const data={from:null,to:null},endpoint='https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-sho-taxi-routes-v1';
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
async function request(body){
 const c=client();const {data:session,error:authError}=await c.auth.getSession();
 if(authError||!session?.session?.access_token)
  throw Error('A kalkulátorhoz jelentkezz be a Family Guardban.');
 const r=await fetch(endpoint,{method:'POST',headers:{
 'Content-Type':'application/json','Authorization':'Bearer '+session.session.access_token,
 'apikey':window.HH_CENTRAL_VAULT.publishableKey},
 body:JSON.stringify(body),signal:AbortSignal.timeout(14000)});
 const out=await r.json().catch(()=>({}));
 if(!r.ok){
  if(r.status===401||r.status===403)throw Error('A bejelentkezés lejárt, lépj be a Family Guardba.');
  if(r.status===429)throw Error('A napi térképes lekérdezési keret elfogyott.');
  if(out.error==='provider_unconfigured'||out.error==='provider_unavailable')
    throw Error('A Google útvonal-szolgáltatás nem elérhető. Használd a Főtaxi kalkulátorát.');
  throw Error('Az útvonal most nem számítható. Használd a Főtaxi kalkulátorát.');
 }
 return out;
}
for(const name of ['from','to']){
 const input=el(name==='from'?'txFrom':'txTo'),list=el(name==='from'?'txFromSug':'txToSug');
 let timer=0,serial=0;
 input.addEventListener('input',()=>{
  data[name]=null;list.replaceChildren();el('txCost').hidden=true;
  clearTimeout(timer);const q=input.value.trim(),ticket=++serial;
  if(q.length<4)return;
  timer=setTimeout(async()=>{
   try{
    const ans=await request({action:'suggest',query:q});
    if(ticket!==serial||input.value.trim()!==q)return;
    list.replaceChildren();
    for(const s of (ans.suggestions||[])){
     const li=document.createElement('li'),b=document.createElement('button');
     b.type='button';b.textContent=s.label;
     b.addEventListener('click',()=>{input.value=s.label;data[name]={label:s.label,placeId:s.placeId};
      list.replaceChildren();clearTimeout(timer);serial++});
     li.appendChild(b);list.appendChild(li);
    }
   }catch(e){if(ticket===serial)status(e.message||'A címjavaslat jelenleg nem elérhető. A cím kézzel is beírható.');}
  },550);
 });
 input.addEventListener('blur',()=>setTimeout(()=>list.replaceChildren(),230));
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
  el('txCost').hidden=false;status('Útvonal kiszámítva. A viteldíj becslés, nem fix ár.');
 }catch(e){status(e.message||'Jelenleg nem sikerült számítani.');}
 finally{btn.disabled=false}
});
})();