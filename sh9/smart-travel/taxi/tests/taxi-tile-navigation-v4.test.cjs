'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const client=fs.readFileSync(path.join(base,'taxi-route-v8-fare-map.js'),'utf8');
const nav=fs.readFileSync(path.resolve(base,'../../shared/sh9-golden-bottom-nav-v924.js'),'utf8');
const css=fs.readFileSync(path.resolve(base,'../../shared/sh9-golden-bottom-nav-v924.css'),'utf8');
function box(kind){
 const m=index.match(new RegExp('\\.hit--'+kind+'\\{left:([\\d.]+)%;top:([\\d.]+)%;width:([\\d.]+)%;height:([\\d.]+)%\\}'));
 assert.ok(m,'Missing '+kind+' hitbox');
 return {left:Number(m[1]),top:Number(m[2]),right:Number(m[1])+Number(m[3]),bottom:Number(m[2])+Number(m[4])};
}
test('Approved hero image is untouched; full calculator and tariff cards are tappable and nonoverlapping',()=>{
 assert.match(index,/src="\.\/assets\/SHO_Smart_Taxi_approved\.png" width="1193" height="1319"/);
 assert.match(index,/class="hit hit--calc"[^>]*data-action="calc"/);
 assert.match(index,/class="hit hit--info"[^>]*data-action="tariff"/);
 const a=box('calc'),b=box('info'),provider=box('fotaxi');
 assert.ok(a.left<5&&a.top<50&&a.bottom>70&&a.right>35,'Calculator whole card');
 assert.ok(b.left<42&&b.right>95&&b.top<50&&b.bottom>70,'Tariff whole card');
 assert.ok(a.right<=b.left,'Cards must not steal one another’s taps');
 assert.ok(a.bottom<provider.top&&b.bottom<provider.top,'Do not cover taxi-provider buttons');
 for(const x of ['fotaxi','bolt','city','uber'])assert.match(index,new RegExp('class="hit hit--'+x+'"[^>]*data-action="'+x+'"'));
});
test('Official Főtaxi badge is a separate exact-brand overlay, without rewriting the approved hero',()=>{
 assert.match(index,/src="\.\/assets\/SHO_Smart_Taxi_approved\.png" width="1193" height="1319"/);
 assert.match(index,/<img class="fotaxi-official-logo" src="\.\/assets\/fotaxi-official-red-v1\.png\?v=20261119-official-logo"/);
 assert.match(index,/\.fotaxi-official-logo\{position:absolute;z-index:2;left:6\.2%;top:75\.15%;width:18\.1%;height:7\.1%/);
 assert.match(index,/pointer-events:none;user-select:none/);
 const badge=fs.readFileSync(path.join(base,'assets','fotaxi-official-red-v1.png'));
 assert.equal(badge.toString('hex',0,8),'89504e470d0a1a0a','Supplied brand mark must be PNG');
 assert.ok(badge.length>2500,'Official logo file cannot be empty');
});

test('Every taxi provider is tappable across its full card including the logo and button',()=>{
 const kinds=['fotaxi','bolt','city','uber'];
 const ranges=kinds.map(box);
 const limits={fotaxi:[2.7,25.3],bolt:[27.7,50.4],city:[51.5,74.2],uber:[75.4,97.7]};
 for(let i=0;i<kinds.length;i++){
  const name=kinds[i],b=ranges[i];
  assert.ok(b.top>=73.3&&b.top<75,name+' must start at provider card top');
  assert.ok(b.bottom>93&&b.bottom<95,name+' must include the entire order button');
  assert.ok(b.right-b.left>22,name+' width must cover its complete card');
  assert.ok(Math.abs(b.left-limits[name][0])<.1&&Math.abs(b.right-limits[name][1])<.1,name+' boundaries');
  if(i)assert.ok(ranges[i-1].right<b.left,'Provider cards must not steal adjacent touches');
  assert.match(index,new RegExp('class="hit hit--'+name+'"[^>]*data-action="'+name+'"'));
 }
 const calc=box('calc'),info=box('info');
 assert.ok(calc.bottom<=ranges[0].top&&info.bottom<=ranges[0].top,'No overlap with fare or tariff card');
 assert.match(index,/\.hit\{position:absolute;z-index:3;/,'Ordering overlays must be above official logo');
});

test('Tariff click opens a pixel crop of the existing approved tariff tile',()=>{
 assert.match(index,/id="tariffDialog"/);
 assert.match(index,/class="taxi-tariff-zoom"/);
 assert.match(index,/\.taxi-tariff-zoom img\{[^}]*width:174\.825%;height:387\.597%/);
 assert.match(index,/\.taxi-tariff-zoom img\{[^}]*left:-69\.58%;top:-184\.11%/);
 assert.match(index,/class="info-list"/);
});
test('Obsolete three-button Taxi navigation is gone; approved five-button SHO taskbar is restored',()=>{
 assert.doesNotMatch(index,/<nav class="nav" aria-label="Smart Taxi gyorsműveletek"/);
 assert.doesNotMatch(index,/data-action="calc">🧮 Kalkulátor/);
 assert.doesNotMatch(index,/data-action="tariff">📋 Tarifa/);
 assert.match(index,/sh9-golden-bottom-nav-v924\.css/);
 assert.match(index,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(index,/chatgpt-project-shortcut-v712\.js/);
 assert.match(nav,/\['Kezdőlap','home',HOME\]/);
 assert.match(nav,/\['Vissza','back','#'\]/);
 assert.match(nav,/\['Értesítések','notifications'/);
 assert.match(nav,/\['Admin','admin'/);
 assert.match(nav,/\[askLabel\(\),'ask',ASK_FALLBACK\]/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});
test('Calculator, tariff dialogs and predictive/voice scripts still parse',()=>{
 assert.match(index,/id="calcDialog"/);
 assert.match(index,/taxi-route-v8-fare-map\.js/);
 assert.match(client,/const SpeechRecognitionAPI=window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
 assert.match(client,/const addressCache=new Map\(\)/);
 assert.match(client,/hh-sho-taxi-routes-v1/);
 const inline=index.match(/<script>\s*([\s\S]*?)<\/script>/);
 assert.ok(inline,'Missing Taxi action handlers');
 assert.doesNotThrow(()=>new vm.Script(inline[1]));
 assert.doesNotThrow(()=>new vm.Script(client));
});
test('Card clicks open their respective dialogs, and escape closes each',()=>{
 const inline=index.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
 const controls=[];
 const dialogs={calcDialog:{hidden:true,querySelector(){return{focus(){}}},addEventListener(){}},
 tariffDialog:{hidden:true,querySelector(){return{focus(){}}},addEventListener(){}}};
 const inputs={km:{value:'8',addEventListener(){}},minutes:{value:'5',addEventListener(){}},
 airport:{checked:false,addEventListener(){}},total:{textContent:''},formula:{textContent:''}};
 const doc={getElementById:id=>dialogs[id]||inputs[id]||null,querySelectorAll:q=>q==='[data-action]'?controls:[],
   addEventListener:(type,fn)=>{if(type==='keydown')doc.keydown=fn}};
 for(const act of ['calc','tariff']){
  const control={dataset:{action:act},addEventListener:(type,fn)=>{control.press=fn}};controls.push(control);
 }
 vm.runInNewContext(inline,{document:doc,Intl,Number,isFinite,navigator:{userAgent:'Linux'},location:{href:''}});
 controls[0].press();
 assert.equal(dialogs.calcDialog.hidden,false);
 assert.equal(dialogs.tariffDialog.hidden,true);
 controls[1].press();
 assert.equal(dialogs.tariffDialog.hidden,false);
 assert.equal(dialogs.calcDialog.hidden,true);
 doc.keydown({key:'Escape'});
 assert.equal(dialogs.calcDialog.hidden,true);
 assert.equal(dialogs.tariffDialog.hidden,true);
});

test('Smart Taxi premium CTA and official Főtaxi checker CTA are together, with brand marks inside',()=>{
 assert.match(index,/taxi-route-v8-fare-map\.js/);
 assert.match(client,/id="txEstimate" aria-label="Smart Taxi viteldíj-kalkulátor"/);
 assert.match(client,/Smart Taxi<br>viteldíj-kalkulátor/);
 assert.match(client,/class="tx-sho-logo" src="\.\/assets\/sho-taxi-button-v6\.webp"/);
 assert.match(client,/class="tx-fotaxi-link" id="txFotaxiOfficial"/);
 assert.match(client,/href="https:\/\/fotaxi\.hu\/utasoknak\/viteldij-kalkulator\/"/);
 assert.match(client,/class="tx-fotaxi-logo" src="\.\/assets\/fotaxi-official-red-v1\.png\?v=20261119-official-logo"/);
 assert.match(client,/background:repeating-conic-gradient\(#141414 0% 25%,#fff 0% 50%\)/);
 assert.match(client,/background:linear-gradient\(145deg,#ffe875 0%,#ffd334 52%,#ffb51c 100%\)/);
 assert.match(client,/background:linear-gradient\(120deg,#102a55 0%,#34245a 50%,#782257 100%\)/);
 const open=client.indexOf('id="txEstimate"'), official=client.indexOf('id="txFotaxiOfficial"');
 const status=client.indexOf('id="txStatus"');
 assert.ok(open>=0&&official>open&&status>official,'The two CTA buttons must be consecutive, before helper text');
 assert.match(client,/#taxiRouteV2 \.tx-fotaxi\{margin:8px 0 0;padding:0/);
 assert.doesNotMatch(client,/tx-fotaxi\{margin-top:auto/);
 assert.match(client,/border:0!important;outline:0!important;box-shadow:none!important;border-radius:0!important/);
 for(const file of ['sho-taxi-button-v6.webp']){
   const bytes=fs.readFileSync(path.join(base,'assets',file));
   assert.ok(bytes.byteLength>1000,file+' missing');
   assert.equal(bytes.toString('ascii',0,4),'RIFF');
   assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
});
test('S24 Ultra calculator popup is larger, scroll-safe and remains above the Golden Standard bottom bar',()=>{
 assert.match(index,/#calcDialog \.dialog-card\{min-height:min\(618px,calc\(100dvh - 100px\)\);display:flex;flex-direction:column\}/);
 assert.match(index,/\.dialog-card\{width:min\(100%,560px\);max-height:calc\(100dvh - 16px\);overflow:auto/);
 assert.match(index,/\.dialog\{position:fixed;inset:0;z-index:120/);
 assert.match(client,/#taxiRouteV2\{margin:8px 0 5px;color:#f8f2ff;display:flex;flex-direction:column;flex:1/);
 assert.match(client,/#taxiRouteV2 \.tx-fotaxi\{margin:8px 0 0;padding:0/);
});

test('Quota regression: no internal usage cap, coordinate autocomplete, and road-network fallback',()=>{
 const edge=fs.readFileSync(path.join(base,'backend/hh-sho-taxi-routes-v2/index.ts'),'utf8');
 assert.doesNotMatch(edge,/hh_taxi_api_reserve|daily_or_monthly_quota_reached|reserve\("suggest"\)|reserve\("estimate"\)/);
 assert.doesNotMatch(client,/A napi térképes lekérdezési keret elfogyott/);
 assert.match(edge,/if\(!await authorize\(req\)\)/);
 assert.match(edge,/async function photon\(query:string\)/);
 assert.match(edge,/router\.project-osrm\.org\/route\/v1\/driving/);
 assert.match(edge,/const \[a,b\]=await Promise\.all\(\[coordinatesFrom/);
 assert.match(edge,/OpenStreetMap \/ OSRM/);
 assert.match(edge,/if\(action==="suggest"\)/);
 assert.match(client,/Number\.isFinite\(s\.location\?\.lat\)/);
 assert.match(client,/data\[name\]=\{label:s\.label,\.\.\.\(typeof s\.placeId/);
 assert.match(client,/credit\.textContent='Címjavaslatok: '\+\(source/);
 assert.match(client,/signal:AbortSignal\.timeout\(body\.action==='estimate'\|\|body\.action==='preview'\?30000:16000\)/);
 assert.match(client,/Smart Taxi<br>viteldíj-kalkulátor/);
});

test('Uber CTA transfers existing SHO pickup/dropoff addresses without changing the Smart Taxi calculator',()=>{
 const inline=index.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
 function clickUber(fromValue,toValue){
  const inputs={
   km:{value:'8',addEventListener(){}},minutes:{value:'5',addEventListener(){}},
   airport:{checked:false,addEventListener(){}},total:{textContent:''},formula:{textContent:''},
   txFrom:{value:fromValue},txTo:{value:toValue}
  };
  const dialogs={
   calcDialog:{hidden:true,addEventListener(){},querySelector(){return {focus(){}}}},
   tariffDialog:{hidden:true,addEventListener(){},querySelector(){return {focus(){}}}}
  };
  const uber={dataset:{action:'uber'},addEventListener(type,callback){if(type==='click')this.click=callback}};
  const doc={getElementById:id=>inputs[id]||dialogs[id]||null,querySelectorAll:q=>q==='[data-action]'?[uber]:[],
   addEventListener(){}};
  const location={href:'https://zsoltandmonika-cloud.github.io/berlet-app/sh9/smart-travel/taxi/'};
  vm.runInNewContext(inline,{document:doc,location,URL,navigator:{userAgent:'Linux'},Intl,Number,isFinite});
  uber.click();
  return new URL(location.href);
 }
 const selected=clickUber('Budapest Keleti pályaudvar','Budapest Nyugati pályaudvar');
 assert.equal(selected.origin,'https://m.uber.com');
 assert.equal(selected.searchParams.get('action'),'setPickup');
 assert.equal(selected.searchParams.get('pickup[formatted_address]'),'Budapest Keleti pályaudvar');
 assert.equal(selected.searchParams.get('dropoff[formatted_address]'),'Budapest Nyugati pályaudvar');
 assert.equal(selected.searchParams.get('dropoff[nickname]'),'Budapest Nyugati pályaudvar');
 const gps=clickUber('📍 Jelenlegi helyem','Budapest Déli pályaudvar');
 assert.equal(gps.searchParams.get('pickup'),'my_location');
 assert.equal(gps.searchParams.get('dropoff[formatted_address]'),'Budapest Déli pályaudvar');
 assert.equal(clickUber('','').href,'https://m.uber.com/');
 assert.equal(clickUber('Budapest Keleti pályaudvar','').href,'https://m.uber.com/');
 assert.match(index,/taxi-route-v8-fare-map\.js\?v=20261119-fotaxi-official-v1/);
});
