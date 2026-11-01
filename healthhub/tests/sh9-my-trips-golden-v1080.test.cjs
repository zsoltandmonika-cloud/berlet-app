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

test('v1083 BKK-style Trip Plan Flow keeps existing dark SH9 theme and real segment boundaries',()=>{
 assert.match(pack,/st22-tp-flow-v1083/);
 assert.match(pack,/endpoint\(j\.from,'Kiindulópont',j\.departure,false\)/);
 assert.match(pack,/endpoint\(j\.to,'Érkezési hely',j\.arrival,true\)/);
 assert.match(pack,/const leg=j\.segments\[i\]/);
 assert.match(pack,/st22-tp-ride-flow/);
 assert.match(pack,/Felszállás/);
 assert.match(pack,/Leszállás/);
 assert.match(pack,/node\('strong','',leg\.from,board\)/);
 assert.match(pack,/node\('strong','',leg\.to,exit\)/);
 assert.match(pack,/proof\(leg\.status\)/);
 assert.match(css,/#st22TripPackDialog \.st22-tp-flow-v1083::before/);
 assert.match(css,/--st22-flow-rail/);
 assert.match(css,/\.st22-tp-tram\{--st22-mode:#edca69\}/);
 assert.match(css,/\.st22-tp-hev\{--st22-mode:#94ceb0\}/);
 assert.match(css,/\.st22-tp-walk\{--st22-mode:#dfa4d4\}/);
 assert.match(css,/#st22TripPackDialog \.st22-tp-flow-v1083 \.st22-tp-ride-stop/);
 assert.match(smart,/v=1083-bkk-flow-premium/);
 assert.match(smart,/v=1083-bkk-flow-endpoints/);
 assert.doesNotMatch(pack,/innerHTML\s*=|insertAdjacentHTML|eval\(/);
 assert.doesNotMatch(pack,/navigator\.geolocation|setInterval\(/);
});

test('v1084 palette remains and v1085 adopts canonical Golden hero with original Smart Travel artwork',()=>{
 assert.match(page,/SH9_Smart_Travel_Hero_1402x1122\.png/);
 assert.match(page,/my-trips-v1080\.css\?v=1095-volan-ticket-pair/);
 assert.match(page,/my-trips-v1080\.js\?v=1093-mav-tracking/);
 assert.match(pageCss,/aspect-ratio:1402 \/ 1122/);
 assert.match(pageCss,/filter:brightness\(1\.13\) saturate\(1\.08\)/);
 assert.match(pageCss,/backdrop-filter:blur\(14px\)/);
 assert.match(pageCss,/--mt-panel-high:rgba\(66,118,172,\.81\)/);
 assert.match(pageCss,/--mt-panel-high:rgba\(135,71,145,\.78\)/);
 assert.match(pageCss,/:root\[data-mt-profile="m"\]/);
 assert.match(pageCss,/--mt-accent:#bbe8ff/);
 assert.match(pageCss,/--mt-accent:#ffd0ee/);
 assert.match(pageCss,/\.mt-trip-actions a/);
 assert.match(pageJs,/d\.documentElement\.dataset\.mtProfile=p/);
 assert.match(pageJs,/if\(theme\)theme\.content=p==='m'\?'#241a3a':'#101d36'/);
 assert.match(pageJs,/pack\.read\(w\.localStorage,p\)/);
 assert.match(pageJs,/url\.searchParams\.set\('trip',trip\.id\)/);
 assert.doesNotMatch(pageJs,/navigator\.geolocation|fetch\(|setInterval\(/);
});

test('v1085 matches canonical SH9 hero controls, no upper-right Back and uses genuine photo avatars',()=>{
 assert.match(page,/<button id="mtProfile" class="mt-hero-profile" type="button"/);
 assert.match(page,/<img id="mtProfilePhoto" alt="Zsolt profilképe"/);
 assert.match(page,/golden-standard-avatars-v529\.js\?v=529/);
 assert.doesNotMatch(page,/<a class="mt-return"/);
 assert.doesNotMatch(page,/class="mt-hero-wordmark"/);
 assert.match(page,/<section class="mt-heading"/);
 assert.match(page,/id="mtProfileName"/);
 assert.match(page,/class="mt-quick" aria-label="My Trips gyorsműveletek"/);
 assert.match(pageCss,/aspect-ratio:1402 \/ 1122/);
 assert.match(pageCss,/\.mt-hero-profile\{/);
 assert.match(pageCss,/left:6px;bottom:9px/);
 assert.match(pageCss,/width:45px;height:45px;min-width:45px;max-width:45px/);
 assert.match(pageCss,/\.mt-quick \.mt-action\{/);
 assert.match(pageCss,/min-height:55px;height:55px;max-height:55px/);
 assert.match(pageCss,/:root\[data-mt-profile="m"\] \.mt-hero-profile/);
 assert.match(pageJs,/w\.HH_GOLDEN_AVATARS_V529\|\|\{\}/);
 assert.match(pageJs,/photo\.src=avatars\[p\]/);
 assert.match(pageJs,/button\.setAttribute\('aria-label'/);
 assert.match(pageJs,/w\.localStorage\.setItem\('hh-profile',next\)/);
 assert.match(pageJs,/if\(w\.localStorage\.getItem\('hh-profile'\)!==next\)/);
 assert.match(pageJs,/w\.dispatchEvent\(new CustomEvent\('healthhub:profile-changed'/);
 assert.match(pageJs,/w\.addEventListener\('storage',e=>/);
 assert.match(pageJs,/pack\.read\(w\.localStorage,p\)/);
 assert.match(pageJs,/url\.searchParams\.set\('trip',trip\.id\)/);
});

test('v1086 one canonical My Trips screen with per-trip multi-ticket private sync',()=>{
 const cloud=read('sh9/smart-travel/my-trips/my-trips-cloud-v1086.js');
 const sql=read('supabase/migrations/20261031200000_sh9_my_trips_private_cloud_tickets.sql');
 assert.match(pack,/function openMyTrips\(\)/);
 assert.match(pack,/w\.location\.assign\(new URL\('\.\.\/\.\.\/my-trips\/',w\.location\.href\)\.href\)/);
 assert.match(pack,/\$\('st22TripPackSaved'\)\?\.addEventListener\('click',openMyTrips\)/);
 assert.doesNotMatch(pack,/function showSaved\(/);
 assert.match(pack,/if\(selected\)show\(selected\);else openMyTrips\(\)/);
 assert.match(page,/id="mtFilesDialog"/);
 assert.match(page,/type="file" multiple accept=/);
 assert.match(page,/mtFileInput/);
 assert.match(page,/mtSyncStatus/);
 assert.match(page,/my-trips-cloud-v1086\.js/);
 assert.match(page,/supabase\.min\.js/);
 assert.match(pageJs,/Jegyek · csatolmányok/);
 assert.match(pageJs,/sh9-my-trips-open-files/);
 assert.match(pageJs,/sh9-my-trips-cloud-sync-request/);
 assert.match(pageCss,/\.mt-trip-compact/);
 assert.match(pageCss,/\.mt-trip-tickets/);
 assert.match(pageCss,/\.mt-files-dialog/);
 assert.match(cloud,/HH_CENTRAL_VAULT/);
 assert.match(cloud,/hh-guardian-family-auth-v785/);
 assert.match(cloud,/client\(\)/);
 assert.match(cloud,/auth\.getSession\(\)/);
 assert.match(cloud,/profile_key:key,trip_id:t\.id,trip_data:t/);
 assert.match(cloud,/remoteFingerprints\.get\(fingerprint\(t\)\)/);
 assert.match(cloud,/hh-my-trip-tickets/);
 assert.match(cloud,/upsert:false/);
 assert.match(cloud,/MAX_COUNT=12,MAX_BYTES=15e6,MAX_TOTAL=75e6/);
 assert.match(cloud,/await c\.storage\.from\(BUCKET\)\.download\(file\.storage_path\)/);
 assert.doesNotMatch(cloud,/getPublicUrl|createSignedUrl|service_role|sk-proj/);
 assert.doesNotMatch(cloud,/setInterval\(|navigator\.geolocation/);
 assert.match(sql,/create table if not exists public\.hh_my_trip_packs/);
 assert.match(sql,/create table if not exists public\.hh_my_trip_attachments/);
 assert.match(sql,/alter table public\.hh_my_trip_packs enable row level security/);
 assert.match(sql,/alter table public\.hh_my_trip_attachments enable row level security/);
 assert.match(sql,/hh_profile_access/);
 assert.match(sql,/storage\.buckets\(id,name,public,file_size_limit,allowed_mime_types\)/);
 assert.match(sql,/hh-my-trip-tickets.*false,15000000/);
 assert.match(sql,/hh_trip_ticket_storage_select/);
 assert.match(sql,/hh_trip_ticket_storage_insert/);
 assert.match(sql,/hh_trip_ticket_storage_delete/);
});

test('v1087 in-app PDF reader and saved-trip cloud attachment integration',()=>{
 const reader=read('sh9/smart-travel/my-trips/my-trips-pdf-v1087.js');
 const style=read('sh9/smart-travel/my-trips/my-trips-pdf-v1087.css');
 const cloud=read('sh9/smart-travel/my-trips/my-trips-cloud-v1086.js');
 assert.match(page,/id="mtReaderDialog"/);
 assert.match(page,/id="mtReaderCanvas"/);
 assert.match(page,/id="mtReaderScroll"/);
 for(const id of ['mtReaderClose','mtReaderPrev','mtReaderNext','mtReaderMinus','mtReaderPlus',
  'mtReaderFit','mtReaderDownload','mtReaderSystem','mtReaderPages','mtReaderZoom'])
  assert.ok(page.includes('id="'+id+'"'));
 assert.match(page,/my-trips-pdf-v1087\.js/);
 assert.match(page,/my-trips-pdf-v1087\.css/);
 assert.match(reader,/pdfjs-dist@6\.4\.299\/build\//);
 assert.match(reader,/getDocument\(\{data:bytes,isEvalSupported:false,enableScripting:false\}\)/);
 assert.match(reader,/w\.SH9_TRIP_PDF_VIEWER_V1087/);
 assert.match(style,/\.mt-reader\[open\]\{display:flex\}/);
 assert.match(style,/height:100dvh/);
 assert.match(cloud,/const isPdf=file\.file_type==='application\/pdf'/);
 assert.match(cloud,/await reader\.open\(data,file\.file_name\)/);
 assert.match(cloud,/storage\.from\(BUCKET\)\.download\(file\.storage_path\)/);
});

test('v1093 MÁVPlusz live trip tracking uses exact validated trip links and no guessed IDs',()=>{
 const cloud=read('sh9/smart-travel/my-trips/my-trips-cloud-v1086.js');
 const pdf=read('sh9/smart-travel/my-trips/my-trips-pdf-v1087.js');
 const valid='https://mavplusz.hu/#/trip/hkir:hkir_1054_18-2?ui_activeItinerary=-1';
 assert.match(page,/id="mtTrackingScan"/);
 assert.match(page,/id="mtTrackingSave"/);
 assert.match(page,/id="mtTrackingUrl"/);
 assert.match(pageJs,/mt-follow-link/);
 assert.match(pageJs,/mt-follow-setup/);
 assert.match(pageJs,/pack\.trackingUrl\(trip\.trackingUrl\)/);
 assert.match(pageCss,/\.mt-tracking-section/);
 assert.match(pack,/function trackingUrl\(raw\)/);
 assert.match(cloud,/async function saveTrackingLink\(p,id,raw\)/);
 assert.match(cloud,/async function scanTicketPdfs\(\)/);
 assert.match(cloud,/withCloudTracking/);
 assert.match(cloud,/\.from\(TRIPS\)\.update\(\{/);
 assert.match(pdf,/async function inspect\(file\)/);
 assert.match(pdf,/page\.getAnnotations/);
 assert.match(pdf,/page\.getTextContent/);
 assert.doesNotMatch(cloud,/api\.openai\.com|sk-proj|service_role/);
 const m={exports:{}};
 const FakeUrl=class{
  constructor(str){
   const x=/^(https?):\/\/([^/#?]+)(\/)?(\?[^#]*)?(#.*)?$/.exec(str);
   if(!x)throw Error('invalid URL');
   this.protocol=x[1]+':';this.hostname=x[2];this.port='';this.username='';this.password='';
   this.pathname=x[3]||'/';this.search=x[4]||'';this.hash=x[5]||'';this.href=str;
  }
 };
 new Function('URL','module','window',pack)(FakeUrl,m,null);
 assert.equal(m.exports.trackingUrl(valid),valid);
 assert.equal(m.exports.trackingUrl('https://evil.invalid/#/trip/hkir:hkir_1054_18-2'),'');
 assert.equal(m.exports.trackingUrl('https://mavplusz.hu/#/route/mvkzrt:122'),'');
 const itinerary={schema:'sh9.trip-pack/1',travelDate:'2026-11-01',from:'Budapest',to:'Kazincbarcika',
  segments:[{mode:'train',line:'15406',from:'Budapest',to:'Kazincbarcika'}],trackingUrl:valid};
 assert.equal(m.exports.normalize(itinerary).trackingUrl,valid);
});

test('v1094 PDF number parser does not invent train numbers from calendar dates',()=>{
 const reader=read('sh9/smart-travel/my-trips/my-trips-pdf-v1087.js');
 const snippet=reader.split(' function ticketFields(items){')[1]?.split(' // Detect only embedded text')[0];
 assert.ok(snippet,'PDF reader number extraction missing');
 const detect=new Function('function ticketFields(items){'+snippet+';return ticketNumbers;')();
 const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
 assert.deepEqual(detect([item('Járat',0,130),item('18',80,130),item('2026',120,130)]),['18']);
 assert.deepEqual(detect([item('Járat',0,130),item('2026',80,130)]),[]);
 assert.deepEqual(detect([item('Járat',0,130),item('2026',80,110)]),[]);
 assert.deepEqual(detect([item('Vonatszám:',0,130),item('15406',90,130)]),['15406']);
 assert.deepEqual(detect([item('IC',0,130),item('1054',45,130)]),['1054']);
 assert.match(page,/mt-tracking-search/);
 assert.match(pageCss,/\.mt-tracking-search/);
 assert.match(page,/my-trips-pdf-v1087\.js\?v=1095-volan-ticket-pair/);
});

test('v1095 Volán PDF 1054 / 18 labelled ticket fields, not 2026, seat or fare',()=>{
 const reader=read('sh9/smart-travel/my-trips/my-trips-pdf-v1087.js');
 const snippet=reader.split(' function ticketFields(items){')[1]?.split(' // Detect only embedded text')[0];
 assert.ok(snippet,'Missing labelled ticket field parser');
 const detect=new Function('function ticketFields(items){'+snippet+';return ticketFields;')();
 const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y]});
 const ticket=[
  item('2026.10.29. 18:33',20,200),
  item('Érvényes:',0,180),item('2026.11.01. 07:59 - 2026.11.01. 11:07',90,180),
  item('Vonat:',0,150),item('1054',80,150),
  item('Járat:',0,130),item('18',80,130),
  item('Hely:',0,110),item('034',80,110),
  item('Ár:',0,90),item('255 Ft',80,90)
 ];
 assert.deepEqual(detect(ticket),{vonat:'1054',jarat:'18',ambiguous:false,numbers:['1054','18']});
 assert.deepEqual(detect([item('Járat:',0,100),item('2026',70,100)]),
  {vonat:null,jarat:null,ambiguous:false,numbers:[]});
 assert.deepEqual(detect([item('Vonat: 1054',0,140),item('Járat: 18',0,120)]),
  {vonat:'1054',jarat:'18',ambiguous:false,numbers:['1054','18']});
 assert.match(page,/id="mtTicketVonat"/);
 assert.match(page,/id="mtTicketJarat"/);
 assert.match(page,/v=1095-volan-ticket-pair/);
 assert.match(pageCss,/\.mt-ticket-recognized/);
});

test('v1096 one-tap My Trips numeric form and exact known MÁVPlusz link',()=>{
 const cloud=read('sh9/smart-travel/my-trips/my-trips-cloud-v1086.js');
 assert.match(pageJs,/mt-tracking-inline/);
 assert.match(pageJs,/Vonat \/ viszonylat/);
 assert.match(pageJs,/📍 Követés/);
 assert.match(pageJs,/trackingDeepLink\(trip,number,service\)/);
 assert.match(page,/class="mt-tracking-section" hidden/);
 assert.match(cloud,/async function saveTrackingPair\(p,id,number,service,link\)/);
 assert.match(page,/my-trips-v1080\.js\?v=1096-two-field-follow/);
 const j=api.normalize({schema:'sh9.trip-pack/1',travelDate:'2026-11-01',
 from:'Mónika · Anyuka',to:'Otthon',segments:[{mode:'bus',line:'1054',
 from:'Kazincbarcika, Márka ABC',to:'Budapest, Kacsóh Pongrác út',departure:'07:59'}],
 trackingNumber:'1054',trackingService:'18'});
 assert.equal(j.trackingNumber,'1054');assert.equal(j.trackingService,'18');
 assert.equal(api.trackingDeepLink(j,'1054','18'),
  'https://mavplusz.hu/#/trip/hkir:hkir_1054_18-2?ui_activeItinerary=-1');
 assert.equal(api.trackingDeepLink({...j,travelDate:'2026-11-02'},'1054','18'),'');
 assert.equal(api.trackingDeepLink(j,'1055','18'),'');
 assert.equal(api.trackingDeepLink({...j,from:'Budapest',to:'Pécs',segments:[]},'1054','18'),'');
});
