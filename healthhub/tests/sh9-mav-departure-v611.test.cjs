const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const departure=require(path.join(base,'rail-departure-v611.js'));
const journey=require(path.join(base,'rail-journey-manager-v608.js'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const source=fs.readFileSync(path.join(base,'rail-departure-v611.js'),'utf8');
const journeyCode=fs.readFileSync(path.join(base,'rail-journey-manager-v608.js'),'utf8');
const UTC=Date.parse('2026-10-28T17:00:00.000Z');
const trip={from:'Budapest-Keleti',to:'Kazincbarcika',mode:'depart',when:'2026-10-30T16:55'};
function memory(){
 const data=new Map(),writes=[];
 return {data,writes,getItem:k=>data.get(k)||null,setItem(k,v){writes.push(k);data.set(k,v)},removeItem:k=>data.delete(k)};
}
function seed(store,profile='z',item=trip,entropy=.2){
 const result=journey.create(store,profile,item,UTC,entropy);
 assert.equal(result.ok,true);return result.journey;
}
test('v611 accurately calculates 16:55 - 45m - 20m = 15:50 Budapest, no live train assumptions',()=>{
 const c=departure.calculate('2026-10-30T16:55',45,20,new Date('2026-10-30T12:50:00Z'));
 assert.equal(c.stationTime,'2026-10-30T16:55');
 assert.equal(c.leaveLocal,'2026-10-30T15:50');
 assert.equal(c.leaveAt,'2026-10-30T14:50:00.000Z');
 assert.equal(c.remainingMinutes,120);
 assert.equal(departure.remainingLabel(c),'Hátralévő idő: 2 óra 0 perc');
 assert.equal(c.elapsed,false);
 assert.match(departure.remainingLabel(departure.calculate('2026-10-30T16:55',45,20,new Date('2026-10-30T15:00:00Z'))),/elmúlt/);
});
test('v611 uses actual Budapest DST time without silently accepting nonexistent spring hour',()=>{
 assert.equal(departure.instantForBudapest('2026-03-29T02:30'),null);
 assert.equal(departure.instantForBudapest('2026-03-29T03:30').toISOString(),'2026-03-29T01:30:00.000Z');
 assert.equal(departure.instantForBudapest('2026-10-25T02:30').toISOString(),'2026-10-25T00:30:00.000Z');
 assert.equal(departure.localBudapest(new Date('2026-10-30T15:55:00Z')),'2026-10-30T16:55');
 assert.equal(departure.calculate('2026-03-29T02:30',30,10),null);
 assert.equal(departure.calculate('2026-10-30T16:55',0,20),null);
 assert.equal(departure.calculate('2026-10-30T16:55',45,0),null);
});
test('departure mode alone preloads planned time; arrival and Now require own station time',()=>{
 assert.equal(departure.localFromTrip({...trip,mode:'depart'}),'2026-10-30T16:55');
 assert.equal(departure.localFromTrip({...trip,mode:'arrive'}),'');
 assert.equal(departure.localFromTrip({...trip,mode:'now'}),'');
 assert.equal(departure.localFromTrip({...trip,mode:'depart',when:'2026-03-29T02:30'}),'');
});
test('Profile-local saved settings: Zsolt and Mónika stay isolated, values bounded, checklist/status persisted',()=>{
 const store=memory(),a=seed(store,'z',trip,.1),b=seed(store,'m',trip,.2);
 assert.notEqual(departure.key('z'),departure.key('m'));
 const saved={time:'2026-10-30T16:55',travel:50,buffer:15,
  checklist:[true,false,true,false,true],status:'onway'};
 assert.equal(departure.save(store,'z',a,saved),true);
 assert.equal(departure.load(store,'z',a).travel,50);
 assert.deepEqual(departure.load(store,'z',a).checklist,[true,false,true,false,true]);
 assert.equal(departure.load(store,'z',a).status,'onway');
 assert.equal(departure.load(store,'m',b).travel,45);
 assert.deepEqual(departure.load(store,'m',b).checklist,[false,false,false,false,false]);
 assert.equal(departure.load(store,'m',b).status,'prep');
 assert.equal(departure.load(store,'m',b).time,trip.when);
 assert.deepEqual(departure.safeSettings({travel:500,buffer:-6,status:'hacked',checklist:[]}),
  {time:'',travel:45,buffer:20,checklist:[false,false,false,false,false],status:'prep'});
 assert.equal(store.writes.filter(k=>k===departure.key('m')).length,0);
});
test('Saved trip notes, ticket and seat stay out of local departure settings and calendar',()=>{
 const store=memory(),a=seed(store,'z',{...trip,ticket:'TICKET-SECRET',note:'PRIVATE-MEMO',seat:'42B'},.3);
 departure.save(store,'z',a,{time:trip.when,travel:45,buffer:20,checklist:[true],status:'prep'});
 const raw=store.getItem(departure.key('z'));
 assert.doesNotMatch(raw,/TICKET-SECRET|PRIVATE-MEMO|42B/);
 const c=departure.calculate(trip.when,45,20,new Date('2026-10-29T12:00:00Z'));
 const item=departure.calendarItem(a,c);
 const ics=journey.ics(item,new Date('2026-10-29T12:00:00Z'));
 assert.match(ics,/DTSTART;TZID=Europe\/Budapest:20261030T155000/);
 assert.match(ics,/DTEND;TZID=Europe\/Budapest:20261030T160500/);
 assert.match(ics,/Otthon/);
 assert.match(ics,/STATUS:TENTATIVE/);
 assert.doesNotMatch(ics,/TICKET-SECRET|PRIVATE-MEMO|42B/);
});
test('Corrupt/blocked local storage does not overwrite other modules or expose secrets',()=>{
 const store=memory(),a=seed(store);
 store.setItem(departure.key('z'),'{broken}');
 assert.equal(departure.load(store,'z',a).travel,45);
 assert.equal(departure.load(store,'z',a).time,trip.when);
 const blocked={getItem(){throw Error('security')},setItem(){throw Error('quota')}};
 assert.equal(departure.load(blocked,'z',a).buffer,20);
 assert.equal(departure.save(blocked,'z',a,{time:trip.when,travel:45,buffer:20}),false);
 assert.equal(store.getItem(journey.storageKey('z')).includes('Kazincbarcika'),true);
});
function ui(){
 const storage=memory(),z=seed(storage,'z',trip,.2),m=seed(storage,'m',{...trip,to:'Miskolc-Tiszai',mode:'arrive'},.3);
 const nodes=new Map(),messages=[],intervals=new Map();
 class Node{
  constructor(name){this.name=name;this.children=[];this.value='';this.checked=false;this.dataset={};
   this.events={};this.textContent='';this.disabled=false;this.attributes={};this.hidden=false;
   this.classList={classes:new Set(),add:k=>this.classList.classes.add(k),
    remove:k=>this.classList.classes.delete(k),contains:k=>this.classList.classes.has(k)};}
  append(...children){this.children.push(...children)}
  replaceChildren(...children){this.children=[];this.append(...children)}
  addEventListener(name,fn){this.events[name]=fn}
  setAttribute(name,value){this.attributes[name]=value}
  querySelectorAll(query){if(query==='input[type="checkbox"]')return this.children.flatMap(x=>x.children.filter(y=>y.type==='checkbox'));return []}
  querySelector(query){if(query==='[aria-pressed="true"]')return this.children.find(x=>x.attributes['aria-pressed']==='true')||null;return null}
  scrollIntoView(){}
  click(){this.events.click?.();this.clicked=true}
  remove(){}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id)};
 for(const id of ['rail-departure','rail-departure-station-time','rail-departure-travel','rail-departure-buffer',
 'rail-departure-remaining','rail-departure-summary','rail-departure-route','rail-departure-note',
 'rail-departure-save','rail-departure-refresh','rail-departure-calendar','rail-departure-checklist','rail-departure-status'])
  get(id);
 get('rail-departure').classList.add('drawer');
 const doc={getElementById:get,documentElement:{dataset:{profile:'z'}},createElement:tag=>new Node(tag),
  querySelectorAll:sel=>sel==='.drawer'?[get('rail-departure')]:[],
  addEventListener(name,fn){this[name]=fn},body:{append(){}}};
 let index=0;
 const win={localStorage:storage,SH9_MAV_JOURNEY_MANAGER_V608:journey,
  SH9_MAV_PLANNER_V607:{toast:s=>messages.push(s)},
  setInterval(fn,ms){assert.equal(ms,60000);intervals.set(++index,fn);return index},
  clearInterval(n){intervals.delete(n)},URL:{createObjectURL:()=>'/blob',revokeObjectURL(){}},
  Blob,
 };
 return {doc,win,get,storage,z,m,messages,intervals};
}
test('UI only opens for trip belonging to active profile; saved checkboxes/states and no phantom time',()=>{
 const e=ui(),mounted=departure.mount(e.doc,e.win);
 assert.ok(mounted);
 assert.equal(mounted.open(e.m),false,'cannot open Mónika saved trip under Zsolt profile');
 assert.equal(mounted.open(e.z),true);
 assert.equal(e.get('rail-departure-station-time').value,trip.when);
 assert.equal(e.get('rail-departure-travel').value,'45');
 assert.equal(e.get('rail-departure-buffer').value,'20');
 assert.match(e.get('rail-departure-summary').textContent,/15:50/);
 assert.equal(e.get('rail-departure-checklist').children.length,5);
 assert.equal(e.get('rail-departure-status').children.length,4);
 const first=e.get('rail-departure-checklist').children[0].children[0];first.checked=true;first.events.change();
 assert.equal(departure.load(e.storage,'z',e.z).checklist[0],true);
 e.get('rail-departure-status').children[1].events.click();
 assert.equal(departure.load(e.storage,'z',e.z).status,'onway');
 assert.equal(e.intervals.size,1);
 e.doc.documentElement.dataset.profile='m';mounted.profileChanged();
 assert.equal(e.intervals.size,0);
 assert.equal(e.get('rail-departure').classList.contains('open'),false);
 assert.equal(mounted.open(e.m),true);
 assert.equal(e.get('rail-departure-station-time').value,'');
 assert.equal(e.get('rail-departure-calendar').disabled,true);
 assert.match(e.get('rail-departure-note').textContent,/nem tartalmaz tervezett vonatindulást/);
});
test('v611 Golden Glass drawer + BKK link, original 5 taskbar and working native calendar are unchanged',()=>{
 for(const id of ['rail-departure','rail-departure-station-time','rail-departure-travel',
 'rail-departure-buffer','rail-departure-checklist','rail-departure-status','rail-departure-calendar',
 'rail-departure-remaining','rail-departure-refresh'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/href="\.\.\/bkk\/" id="rail-departure-bkk"/);
 assert.match(html,/rail-departure-v611\.js/);
 assert.match(journeyCode,/SH9_MAV_DEPARTURE_UI\?\.open\(item\)/);
 assert.match(html,/SH9_MAV_DEPARTURE_UI\?\.profileChanged\(\)/);
 assert.match(html,/id="rail-date-trigger"/);
 assert.match(html,/id="rail-time-trigger"/);
 assert.match(html,/bottom:9px;left:6px;width:45px/);
 assert.match(html,/rail-golden-glass-v3/);
 assert.match(html,/mav-hero-approved\.webp/);
 assert.doesNotMatch(source,/\bfetch\(|XMLHttpRequest|navigator\.geolocation|supabase\.co|dropbox\.com|\.innerHTML\s*=/i);
 const nav=html.match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.equal((nav.match(/<a /g)||[]).length,5);
});
