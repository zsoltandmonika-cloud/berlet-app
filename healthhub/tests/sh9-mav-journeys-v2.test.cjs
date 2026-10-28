const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const live=require(path.join(dir,'rail-journeys-v2.js'));
const page=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const NOW=new Date('2026-10-28T13:00:00.000Z');
function query(mode='now',when=null){return live.searchRequest('Budapest-Keleti pályaudvar','Kazincbarcika vasútállomás',mode,when,NOW)}
test('Real journey query modes now/depart/arrive preserve station pair, UTC time and mode',()=>{
 for(const mode of ['now','depart','arrive']){
  const q=query(mode,mode==='now'?null:'2026-10-30T16:55:00+01:00');
  assert.equal(q.mode,mode);assert.equal(q.from,'Budapest-Keleti pályaudvar');
  assert.equal(q.to,'Kazincbarcika vasútállomás');
  assert.match(q.when,/Z$/);
 }
 assert.equal(query('now').when,NOW.toISOString());
 assert.equal(query('arrive','not-a-date'),null);
 assert.equal(live.searchRequest('Keleti','Keleti','now',null,NOW),null);
 assert.equal(live.searchRequest('<svg>','Kazincbarcika','now',null,NOW),null);
 assert.equal(live.searchRequest('Keleti','Kazincbarcika','depart','2027-10-30T13:00:00Z',NOW),null);
});
test('Single click external transit planner gets correct actual origin and destination',()=>{
 const u=new URL(live.transitLink(query()));
 assert.equal(u.hostname,'www.google.com');
 assert.equal(u.searchParams.get('api'),'1');
 assert.equal(u.searchParams.get('origin'),'Budapest-Keleti pályaudvar');
 assert.equal(u.searchParams.get('destination'),'Kazincbarcika vasútállomás');
 assert.equal(u.searchParams.get('travelmode'),'transit');
 assert.equal(live.transitLink(null),null);
});
test('Only fresh, matching, typed authenticated-provider feed can become train cards',()=>{
 const q=query();
 const body={schema:'sh9-mav-trains-v1',from:q.from,to:q.to,provider:'licensed-mav-gtfs',
 fetchedAt:NOW.toISOString(),trains:[{number:'IC 563',service:'InterCity',
 departure:'2026-10-28T15:25:00+01:00',arrival:'2026-10-28T17:55:00+01:00',platform:'3',
 delayMinutes:9,source:'MÁV',live:true,link:'https://mavplusz.hu/'}]};
 const good=live.validateFeed(body,q,NOW);
 assert.equal(good.trains.length,1);
 assert.equal(good.trains[0].delayMinutes,9);
 assert.equal(good.trains[0].platform,'3');
 assert.equal(good.trains[0].live,true);
 assert.equal(good.trains[0].link,'https://mavplusz.hu/');
 assert.equal(live.validateFeed({...body,fetchedAt:'2026-10-28T11:00:00Z'},q,NOW),null);
 assert.equal(live.validateFeed({...body,to:'Miskolc'},q,NOW),null);
 assert.equal(live.validateFeed({...body,trains:[{...body.trains[0],number:'<script>'}]},q,NOW),null);
 assert.equal(live.validateFeed({...body,trains:[{...body.trains[0],departure:'not-a-date'}]},q,NOW),null);
 const cleaned=live.validateFeed({...body,trains:[{...body.trains[0],link:'https://evil.example'}]},q,NOW);
 assert.equal(cleaned.trains[0].link,null);
});
test('Golden native cards are provider-gated, without synthetic timetable, GPS or polling',()=>{
 assert.match(page,/rail-journeys-v2\.js/);
 assert.match(page,/rail-train-thumbs-v2\.webp/);
 assert.match(page,/mav-hero-final-approved-v2\.webp/);
 assert.match(page,/id="profile-photo"/);
 assert.match(page,/bottom:9px;left:6px;width:45px/);
 assert.match(page,/id="rail-golden-glass-v3"/);
 assert.match(page,/id="trainlist"/);
 assert.doesNotMatch(page,/const trains=\[\['16:55'/);
 assert.doesNotMatch(page,/Látványtervi adatok · nem élő menetrend/);
 const raw=fs.readFileSync(path.join(dir,'rail-journeys-v2.js'),'utf8');
 assert.match(raw,/function validateFeed\(payload,query,now=new Date\(\)\)/);
 assert.match(raw,/Csak hitelesített vonatadat/);
 assert.match(raw,/const q=currentQuery\(\)/);
 assert.doesNotMatch(raw,/open\(transitLink\(q\)\)/);
 assert.match(raw,/Google Térkép ↗/);
 assert.match(raw,/Stay in SH9/);
 assert.match(raw,/acceptProviderData/);
 assert.doesNotMatch(raw,/\bsetInterval\(|navigator\.geolocation|supabase\.co|\.innerHTML\s*=/i);
});
