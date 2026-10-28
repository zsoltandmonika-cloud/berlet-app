const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const volan=require(path.join(base,'volan/volan-journey-manager-v3.js'));
const mav=require(path.join(base,'mav/rail-journey-manager-v608.js'));
const html=fs.readFileSync(path.join(base,'volan/index.html'),'utf8');
const mavHtml=fs.readFileSync(path.join(base,'mav/index.html'),'utf8');
const code=fs.readFileSync(path.join(base,'volan/volan-journey-manager-v3.js'),'utf8');
const NOW=Date.parse('2026-10-28T19:00:00Z');
const plan={from:'Budapest, Népliget',to:'Kazincbarcika autóbusz-állomás',mode:'depart',
 when:'2026-10-30T16:55',ticket:'SECRET-BUS-22',car:'B5',seat:'14',note:'PRIVATE-CORKY-77'};
function store(){
 const data=new Map();
 return {data,getItem:k=>data.has(k)?data.get(k):null,
  setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
}
test('v3: standard native invisible Android pickers match exact MÁV Golden CSS, no duplicate YYYY-MM-DD labels',()=>{
 const dateRule='.datetime .rail-picker-overlay{position:absolute;inset:0;z-index:4;display:block;width:100%;height:100%;margin:0;padding:0;opacity:0;pointer-events:none';
 assert.ok(mavHtml.includes(dateRule),'Source MÁV native calendar overlay missing');
 assert.ok(html.includes(dateRule),'Volán native picker is not 1:1 with MÁV');
 for(const x of ['rail-date-trigger','rail-time-trigger','rail-date','rail-time','dateTxt','timeTxt','when']){
  assert.match(html,new RegExp('id="'+x+'"'));
 }
 assert.match(html,/toLocaleDateString\('hu-HU',\{weekday:'short',month:'short',day:'numeric'\}\)/);
 assert.match(html,/toLocaleTimeString\('hu-HU',\{hour:'2-digit',minute:'2-digit'\}\)/);
 assert.match(html,/\.datetime #when.whenInput\{display:none!important\}/);
 assert.match(html,/input\.showPicker\(\)/);
 assert.doesNotMatch(html, /\$\('dateTxt'\)\.textContent=d\|\|'Dátum'/);
});
test('v3: standard MÁV 45px avatar frame and shared profile photo source',()=>{
 const profileRule='.hero #profile.profile{position:absolute;z-index:8;top:auto;right:auto;bottom:9px;left:6px;width:45px;min-width:45px;max-width:45px;height:45px;';
 assert.ok(mavHtml.includes(profileRule));
 assert.ok(html.includes(profileRule));
 assert.match(html,/\.hero #profile.profile img\{width:41px;height:41px;display:block;object-fit:cover;border-radius:12px/);
 assert.match(html,/golden-standard-avatars-v529\.js/);
 assert.match(html,/avatars\[profile\]\|\|avatars\.z/);
 assert.match(html,/window\.SH9_VOLAN_JOURNEYS_UI\?\.render\(\)/);
});
test('v3: all-results remains inside header and has a compact standard Golden chip',()=>{
 assert.match(html,/<button id="volan-all-results" class="volan-all-results"/);
 assert.match(html,/\.departhead>button\.volan-all-results\{appearance:none;display:inline-flex/);
 assert.match(html,/flex-shrink:0;min-height:32px;max-width:125px/);
 assert.match(html,/\.departhead h2\{min-width:0;font-size:13px\}/);
 assert.doesNotMatch(html,/<a href="https:\/\/mavplusz\.hu\/"/);
});
test('v3: both save and journeys buttons appear as standard MÁV Golden row, working panel',()=>{
 assert.match(html,/id="rail-journey-save-toggle"/);
 assert.match(html,/data-go="journeys">▣ Utazásaim/);
 assert.match(html,/id="rail-journey-compose"/);
 assert.match(html,/id="rail-journey-confirm"/);
 assert.match(html,/id="rail-journey-cancel"/);
 assert.match(html,/id="rail-journey-plans"/);
 assert.match(html,/class="rail-journey-quick"/);
 assert.match(html,/\.rail-journey-quick\{display:grid;grid-template-columns:1fr 1fr/);
 assert.match(html,/window\.SH9_VOLAN_PLANNER_V3=/);
 assert.match(html,/window\.SH9_VOLAN_JOURNEYS_UI\?\.render\(\)/);
 assert.match(html,/src="\.\/volan-journey-manager-v3\.js"/);
});
test('v3: Volán trips are profile isolated and never touch original MÁV data',()=>{
 const db=store();
 const r=volan.create(db,'z',plan,NOW,.123);
 assert.equal(r.ok,true);
 assert.equal(r.journey.to,'Kazincbarcika autóbusz-állomás');
 assert.notEqual(volan.storageKey('z'),volan.storageKey('m'));
 assert.notEqual(volan.storageKey('z'),mav.storageKey('z'));
 assert.notEqual(volan.storageKey('m'),mav.storageKey('m'));
 assert.ok(volan.storageKey('z').startsWith('sh9-volan-'));
 assert.equal(volan.read(db,'z').length,1);
 assert.equal(volan.read(db,'m').length,0);
 assert.equal(mav.read(db,'z').length,0);
 assert.equal(mav.read(db,'m').length,0);
 assert.equal(volan.read(db,'z')[0].ticket,'SECRET-BUS-22');
 assert.equal(volan.read(db,'z')[0].note,'PRIVATE-CORKY-77');
 assert.ok(volan.patch(db,'z',r.journey.id,{note:'Új buszos jegyzet'}));
 assert.equal(volan.read(db,'z')[0].note,'Új buszos jegyzet');
 assert.ok(volan.remove(db,'z',r.journey.id));
 assert.equal(volan.read(db,'z').length,0);
});
test('v3: 30-trip limit and custom local dates, no fake real-time bus schedule',()=>{
 const db=store();
 for(let i=0;i<30;i++){
  assert.equal(volan.create(db,'m',{...plan,to:'Buszmegálló '+i},NOW+i,i/40).ok,true);
 }
 assert.equal(volan.read(db,'m').length,30);
 assert.equal(volan.create(db,'m',plan,NOW+40,.777).reason,'limit');
 assert.equal(volan.read(db,'z').length,0);
 assert.equal(volan.create(store(),'z',{...plan,from:'X'},NOW,.6).reason,'invalid');
 assert.equal(volan.validLocal('2026-02-30T20:11'),false);
 const nowPlan=volan.create(store(),'z',{from:plan.from,to:plan.to,mode:'now',when:'2000-01-01T00:00'},NOW,.7);
 assert.equal(nowPlan.ok,true);
 assert.notEqual(nowPlan.journey.when,'2000-01-01T00:00');
});
test('v3: sharing and calendars omit ticket and notes, bus not train branding',()=>{
 const db=store();
 const item=volan.create(db,'z',plan,NOW,.01).journey;
 const shared=volan.shareText(item);
 const ics=volan.ics(item,new Date(NOW));
 const google=volan.googleCalendarUrl(item);
 assert.match(shared,/Volán Smart Bus/);
 assert.match(ics,/TZID:Europe\/Budapest/);
 assert.match(google,/calendar\.google\.com\/calendar\/render/);
 for(const text of [shared,ics,google]){
  assert.doesNotMatch(text,/SECRET-BUS-22|PRIVATE-CORKY-77|B5/);
 }
 assert.doesNotMatch(code,/sh9-mav-saved-journeys|SH9_MAV_PLANNER|SH9_MAV_JOURNEYS_UI|SH9_MAV_DEPARTURE/);
 assert.doesNotMatch(code,/\bfetch\(|XMLHttpRequest|supabase\.co|setInterval\(|navigator\.geolocation/i);
});
test('v3: MÁV untouched; Volán buttons not falsely connected to live bus APIs',()=>{
 assert.match(mavHtml,/rail-journey-manager-v608\.js/);
 assert.match(html,/Élő adatkapcsolat: még nincs/);
 assert.match(html,/hivatkozása külön bekötésre vár/);
 assert.match(html,/16:55 nem hitelesített buszindulás/);
 assert.match(html,/class="rail-journey-quick"/);
 const nav=html.match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.equal((nav.match(/<a /g)||[]).length,5);
});

test('v4: approved Volán hero is free of redundant title and subtitle overlay',()=>{
 const hero=html.match(/<section class="hero">([\s\S]*?)<\/section>/)?.[1];
 assert.ok(hero,'Volán hero should remain visible');
 assert.match(hero,/id="volan-hero"/);
 assert.match(hero,/id="profile"/);
 assert.match(hero,/class="back"/);
 assert.doesNotMatch(hero,/class="hero-title"/);
 assert.doesNotMatch(hero,/class="hero-sub"/);
 assert.match(html,/data:image\/avif;base64,/);
});
