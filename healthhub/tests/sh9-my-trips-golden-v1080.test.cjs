'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const main=read('sh9/smart-travel/index.html');
const page=read('sh9/smart-travel/my-trips/index.html');
const pageCss=read('sh9/smart-travel/my-trips/my-trips-v1080.css');
const pageJs=read('sh9/smart-travel/my-trips/my-trips-v1080.js');
const smart=read('sh9/smart-travel/public-transport/smart-trip/index.html');
const pack=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.js');
const css=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.css');
const api=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.js');
test('My Trips is a live SH9 Smart Travel tile, not a coming soon modal',()=>{
 assert.match(main,/data-name="My Trips" data-href="\.\/my-trips\/"/);
 assert.doesNotMatch(main,/data-name="My Trips" data-pending="true"/);
 assert.match(page,/<title>My Trips · SH9 Smart Travel<\/title>/);
 assert.match(page,/SH9 · SMART TRAVEL/);
 assert.match(page,/SH9_Smart_Travel_Hero_1402x1122\.png/);
 assert.match(page,/<nav class="mt-nav" aria-label="SH9 Golden Standard navigáció">/);
 assert.equal((page.match(/class="st-tile"/g)||[]).length,0);
});
test('My Trips uses existing validated profile-local TripPack records, never a duplicate store',()=>{
 assert.match(page,/smart-trip-pack-v1078\.js/);
 assert.match(pageJs,/pack\.read\(w\.localStorage,p\)/);
 assert.match(pageJs,/w\.localStorage\.getItem\('hh-profile'\)/);
 assert.match(pageJs,/sh9-smart-trip-pack-v1078-/);
 assert.match(pageJs,/url\.searchParams\.set\('trip',trip\.id\)/);
 assert.match(pack,/params\.has\('trip'\)/);
 assert.match(pack,/read\(w\.localStorage,active\(\)\)\.find\(t=>t\.id===params\.get\('trip'\)\)/);
 assert.match(pack,/params\.get\('view'\)==='my-trips'/);
 assert.match(page,/<section id="mtTripList"/);
 assert.match(page,/id="mtReload"/);
 assert.match(pageJs,/w\.addEventListener\('pageshow',render\)/);
});
test('manual in-trip progress persists across route reopen and is clearly not GPS',()=>{
 assert.match(pack,/progressKey=\(p,id\)=>key\(p\)\+'-manual-step-'/);
 assert.match(pack,/w\.localStorage\.setItem\(progressKey\(p,trip\.id\)/);
 assert.match(pack,/Utazás indítása/);
 assert.match(pack,/Következő szakasz/);
 assert.match(pack,/Utazás befejezése/);
 assert.match(pack,/nem GPS vagy élő menetrend/);
 assert.match(pageJs,/manual-step-/);
 assert.doesNotMatch(pageJs,/navigator\.geolocation|fetch\(|setInterval\(/);
});
test('golden header explicitly shows large times, derived duration, transfers and caveat',()=>{
 for(const label of ['INDULÁS','ÉRKEZÉS','TELJES MENETIDŐ','ÁTSZÁLLÁSOK','ÉRKEZÉS STÁTUSZA'])
   assert.ok(pack.includes(label));
 for(const klass of ['st22-tp-clock-grid','st22-tp-metrics','st22-tp-clock strong',
  'st22-tp-head-golden','st22-tp-current','st22-tp-done'])assert.ok(css.includes(klass));
 assert.match(pack,/Menetrendi adat \(AI állítása\)/);
 assert.doesNotMatch(pack,/st22-tp-limitation/);
 assert.match(pack,/document|body\.replaceChildren\(\)/);
 assert.match(css,/data-st22-profile="m"/);

 assert.match(pack,/st22-tp-alert-head/);
 assert.match(pack,/st22-tp-alert-icon/);
 assert.match(pack,/Fontos figyelmeztetések/);
 assert.ok(css.includes('#st22TripPackDialog .st22-tp-alerts{'));
 assert.ok(css.includes('rgba(255,119,139,.95)'));
 assert.ok(css.includes('st22-tp-alert-item + .st22-tp-alert-item'));
 assert.ok(!css.includes('rgba(87,66,37,.65)'));

 assert.match(pageCss,/data-mt-profile="m"/);
 assert.match(pageCss,/SH9 Smart Travel My Trips v1080/);
});
test('JSON import, Google and ChatGPT old controls are still mounted unchanged',()=>{
 assert.match(smart,/id="st22TripPackImport"/);
 assert.match(smart,/id="st22TripPackSaved"/);
 assert.match(smart,/smart-trip-chatgpt-handoff-v1076\.js/);
 assert.match(smart,/smart-trip-pack-v1078\.js/);
 assert.match(pack,/save\(w\.localStorage,active\(\),data\)/);
 assert.match(pack,/w\.location\.hash==='#import'/);
 assert.match(page,/smart-trip\/#import/);
 assert.doesNotMatch(pack,/api\.openai\.com|OPENAI_API_KEY/);
});
test('shared normalized JSON remains valid and saved lists are data driven',()=>{
 const raw={schema:'sh9.trip-pack/1',title:'Út',travelDate:'2026-11-01',from:'Kazincbarcika',to:'Budapest',
  departure:'07:30',arrival:'12:25',segments:[
   {mode:'walk',from:'Anyuka',to:'Márka ABC',departure:'07:30',arrival:'07:40'},
   {mode:'bus',line:'1054',from:'Márka ABC',to:'Stadion',departure:'07:59',arrival:'11:15'}]};
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 api.save(storage,'m',raw,1,0.3);
 assert.equal(api.read(storage,'m').length,1);
 assert.equal(api.read(storage,'z').length,0);
 assert.equal(api.read(storage,'m')[0].segments[1].line,'1054');
});
