const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const backup=require(path.join(base,'rail-backup-v609.js'));
const departure=require(path.join(base,'rail-departure-v611.js'));
const journeys=require(path.join(base,'rail-journey-manager-v608.js'));
const personal=require(path.join(base,'rail-personal-v607.js'));
const page=fs.readFileSync(path.join(base,'index.html'),'utf8');
const journeyUI=fs.readFileSync(path.join(base,'rail-journey-manager-v608.js'),'utf8');
const NOW=new Date(),time=NOW.getTime();
function mem(){
 const map=new Map(),writes=[];
 return {map,writes,getItem:k=>map.has(k)?map.get(k):null,
  setItem(k,v){writes.push(k);map.set(k,String(v))},removeItem(k){writes.push(k);map.delete(k)}};
}
const baseTrip={from:'Budapest-Keleti',to:'Kazincbarcika',mode:'depart',when:'2026-10-30T16:55',
 ticket:'SECRET-TICKET-091',car:'3',seat:'42A',note:'PRIVATE-TRIP-NOTE'};
function seed(){
 const db=mem();
 const z=journeys.create(db,'z',baseTrip,time-1000,.23).journey;
 const m=journeys.create(db,'m',{...baseTrip,from:'Budapest-Nyugati',to:'Győr',ticket:'SECRET-M-221'},time-999,.71).journey;
 assert.ok(z&&m);
 const a={time:'2026-10-30T16:55',travel:45,buffer:20,checklist:[true,false,true,false,true],status:'onway'};
 const b={time:'2026-10-30T16:55',travel:50,buffer:25,checklist:[false,true,false,true,false],status:'prep'};
 assert.equal(departure.save(db,'z',z,a),true);
 assert.equal(departure.save(db,'m',m,b),true);
 return {db,z,m,a,b};
}
test('v612 versioned backup includes explicitly saved departure settings separately for Zsolt and Mónika',()=>{
 const {db,z,m}=seed();
 const result=backup.build(db,NOW);
 assert.equal(result.format,'sh9-mav-backup-v2');
 assert.equal(result.version,2);
 assert.deepEqual(result.profiles.z.departure,[{journeyId:z.id,time:'2026-10-30T16:55',
  travel:45,buffer:20,checklist:[true,false,true,false,true],status:'onway'}]);
 assert.deepEqual(result.profiles.m.departure,[{journeyId:m.id,time:'2026-10-30T16:55',
  travel:50,buffer:25,checklist:[false,true,false,true,false],status:'prep'}]);
 assert.equal(result.profiles.z.journeys.length,1);
 assert.equal(result.profiles.m.journeys.length,1);
 const raw=backup.encode(result);
 assert.doesNotMatch(raw,/SECRET-TICKET-091|SECRET-M-221|PRIVATE-TRIP-NOTE|"ticket":|"car":|"seat":|"note":/);
});
test('v612 import roundtrip preserves settings, profile isolation and reproduces saved home-departure estimates',()=>{
 const source=seed(),data=backup.encode(backup.build(source.db,NOW)),target=mem();
 const result=backup.restore(target,data,time);
 assert.equal(result.z.departureAdded,1);
 assert.equal(result.m.departureAdded,1);
 assert.equal(departure.load(target,'z',source.z).travel,45);
 assert.equal(departure.load(target,'m',source.m).travel,50);
 assert.deepEqual(departure.load(target,'z',source.z).checklist,[true,false,true,false,true]);
 assert.equal(departure.load(target,'z',source.z).status,'onway');
 assert.equal(departure.load(target,'m',source.m).status,'prep');
 assert.equal(departure.calculate(departure.load(target,'z',source.z).time,45,20).leaveLocal,'2026-10-30T15:50');
 assert.equal(departure.calculate(departure.load(target,'m',source.m).time,50,25).leaveLocal,'2026-10-30T15:40');
 assert.equal(target.map.has('hh-profile'),false);
 assert.equal(target.writes.length,8,'only 2 profiles x 4 known storage keys');
});
test('v612 preserves pre-existing checklists and private notes; repeated restore adds nothing',()=>{
 const source=seed(),target=seed();
 const beforeNotes=journeys.read(target.db,'z')[0].note;
 const beforeSettings=departure.readSaved(target.db,'z',target.z);
 const imported=backup.build(source.db,NOW);
 const first=backup.restore(target.db,imported,time);
 assert.equal(first.z.departureAdded,0);
 assert.equal(first.m.departureAdded,0);
 assert.deepEqual(departure.readSaved(target.db,'z',target.z),beforeSettings);
 assert.equal(journeys.read(target.db,'z')[0].note,beforeNotes);
 const second=backup.restore(target.db,imported,time);
 assert.equal(second.z.departureAdded,0);
 assert.equal(second.m.departureAdded,0);
});
test('v609 legacy v1 backup still restores using six keys and does not touch v611 settings',()=>{
 const original=seed(),arch=backup.build(original.db,NOW);
 arch.format='sh9-mav-backup-v1';arch.version=1;
 for(const id of ['z','m'])delete arch.profiles[id].departure;
 const old=backup.parse(JSON.stringify(arch),time);
 assert.equal(old.version,1);assert.equal(old.profiles.z.departure.length,0);
 const dest=mem();
 const result=backup.restore(dest,old,time);
 assert.equal(result.z.journeysAdded,1);
 assert.equal(dest.writes.length,6);
 assert.equal(dest.map.has(departure.key('z')),false);
 assert.equal(dest.map.has(departure.key('m')),false);
 assert.equal(journeys.read(dest,'z').length,1);
});
test('v612 rejects malicious, unowned and invalid departure settings before ANY writes',()=>{
 const original=backup.build(seed().db,NOW);
 const mutations=[
  a=>{a.profiles.z.departure[0].time='2026-03-29T02:30'},
  a=>{a.profiles.z.departure[0].travel=10000},
  a=>{a.profiles.z.departure[0].buffer=-1},
  a=>{a.profiles.z.departure[0].checklist=['yes',false,false,false,false]},
  a=>{a.profiles.z.departure[0].status='admin'},
  a=>{a.profiles.z.departure[0].ticket='SECRET'},
  a=>{a.profiles.z.departure[0].journeyId=a.profiles.m.journeys[0].id},
  a=>{a.profiles.z.departure.push(a.profiles.z.departure[0])},
  a=>{a.profiles.m.departure=[];a.profiles.m.departure[0]={journeyId:'invalid',time:'',travel:45,buffer:20,checklist:[false,false,false,false,false],status:'prep'}}
 ];
 for(const mutate of mutations){
  const copy=JSON.parse(JSON.stringify(original));mutate(copy);const dest=mem();
  assert.throws(()=>backup.restore(dest,copy,time));
  assert.equal(dest.writes.length,0);
 }
});
test('v612 detects conflicting trip identity to avoid migrating assistant time onto the wrong route',()=>{
 const source=seed(),archive=backup.build(source.db,NOW),dest=mem();
 dest.setItem(journeys.storageKey('z'),JSON.stringify([{
  ...source.z,to:'Miskolc-Tiszai',ticket:'LOCAL-PRIVATE',note:'KEEP-ME'
 }]));
 dest.writes.length=0;
 assert.throws(()=>backup.restore(dest,archive,time),/azonosító ütközés/);
 assert.deepEqual(dest.writes,[]);
 assert.equal(journeys.read(dest,'z')[0].note,'KEEP-ME');
});
test('v612 rollback covers all eight keys when later localStorage write fails',()=>{
 const source=seed(),archive=backup.build(source.db,NOW),dest=mem();
 personal.saveFavorite(dest,'z',{from:'Pécs',to:'Szeged'});
 const before=new Map(dest.map);
 dest.writes.length=0;
 const set=dest.setItem.bind(dest);let step=0;
 dest.setItem=(k,v)=>{step++;if(step===8)throw Error('quota');set(k,v)};
 assert.throws(()=>backup.restore(dest,archive,time),/korábbi adatok visszaálltak/);
 assert.deepEqual([...dest.map],[...before]);
});
test('v612 UI only presents explicit saved plans; no arrival-to-departure or phantom defaults',()=>{
 const s=seed(),z=journeys.read(s.db,'z')[0];
 const actual=departure.readSaved(s.db,'z',z);
 assert.ok(actual);
 assert.equal(departure.calculate(actual.time,actual.travel,actual.buffer).leaveLocal,'2026-10-30T15:50');
 const other=journeys.create(s.db,'z',{from:'Kazincbarcika',to:'Budapest-Keleti',mode:'arrive',when:'2026-10-31T18:00'},
  time-997,.99).journey;
 assert.equal(departure.readSaved(s.db,'z',other),null);
 assert.equal(departure.load(s.db,'z',other).time,'');
 assert.match(journeyUI,/assistant\?\.readSaved\(storage,active\(\),item\)/);
 assert.match(journeyUI,/if\(calculated\)card\.append/);
 assert.match(page,/class="rail-backup-preview"/);
 assert.match(page,/Smart Departure beállításai/);
 assert.match(page,/rail-trip-departure/);
 assert.match(page,/id="rail-date-trigger"/);
 assert.match(page,/bottom:9px;left:6px;width:45px/);
 assert.match(page,/mav-hero-approved\.webp/);
 assert.match(page,/rail-golden-glass-v3/);
 assert.equal(page.indexOf('src="./rail-departure-v611.js"')<page.indexOf('src="./rail-backup-v609.js"'),true);
});
