'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const client=fs.readFileSync(path.join(base,'taxi-route-v6-brand-buttons.js'),'utf8');
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
 assert.match(index,/taxi-route-v6-brand-buttons\.js/);
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
 assert.match(index,/taxi-route-v6-brand-buttons\.js/);
 assert.match(client,/id="txEstimate" aria-label="Smart Taxi viteldíj-kalkulátor"/);
 assert.match(client,/Smart Taxi<br>viteldíj-kalkulátor/);
 assert.match(client,/class="tx-sho-logo" src="\.\/assets\/sho-taxi-button-v6\.webp"/);
 assert.match(client,/class="tx-fotaxi-link" id="txFotaxiOfficial"/);
 assert.match(client,/href="https:\/\/fotaxi\.hu\/utasoknak\/viteldij-kalkulator\/"/);
 assert.match(client,/class="tx-fotaxi-logo" src="\.\/assets\/fotaxi-inline-button-v6\.webp"/);
 assert.match(client,/background:repeating-conic-gradient\(#141414 0% 25%,#fff 0% 50%\)/);
 assert.match(client,/background:linear-gradient\(145deg,#ffe875 0%,#ffd334 52%,#ffb51c 100%\)/);
 assert.match(client,/background:linear-gradient\(120deg,#102a55 0%,#34245a 50%,#782257 100%\)/);
 const open=client.indexOf('id="txEstimate"'), official=client.indexOf('id="txFotaxiOfficial"');
 const status=client.indexOf('id="txStatus"');
 assert.ok(open>=0&&official>open&&status>official,'The two CTA buttons must be consecutive, before helper text');
 assert.match(client,/#taxiRouteV2 \.tx-fotaxi\{margin:8px 0 0;padding:0/);
 assert.doesNotMatch(client,/tx-fotaxi\{margin-top:auto/);
 assert.match(client,/border:0!important;outline:0!important;box-shadow:none!important;border-radius:0!important/);
 for(const file of ['sho-taxi-button-v6.webp','fotaxi-inline-button-v6.webp']){
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
