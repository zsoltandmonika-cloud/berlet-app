const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const personal=require(path.join(root,'rail-personal-v607.js'));
const journeys=require(path.join(root,'rail-journey-manager-v608.js'));
const backup=require(path.join(root,'rail-backup-v609.js'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=fs.readFileSync(path.join(root,'rail-backup-v609.js'),'utf8');
const at=new Date('2026-10-28T17:00:00.000Z');
const trip={from:'Budapest-Keleti',to:'Kazincbarcika',mode:'depart',when:'2026-10-30T16:55',
 ticket:'PRIVATE-TICKET-774',car:'3',seat:'42B',note:'PRIVATE-HOME-NOTE-891'};
function store(){
 const values=new Map();
 return {values,
  getItem:k=>values.has(k)?values.get(k):null,
  setItem:(k,v)=>{values.set(k,String(v))},
  removeItem:k=>values.delete(k)
 };
}
function seeded(){
 const db=store();
 personal.saveFavorite(db,'z',{from:'Budapest-Keleti',to:'Kazincbarcika'});
 personal.saveFavorite(db,'m',{from:'Budapest-Nyugati',to:'Győr'});
 personal.recordSearch(db,'z',{from:trip.from,to:trip.to,mode:'depart',when:trip.when},at.getTime());
 personal.recordSearch(db,'m',{from:'Budapest-Nyugati',to:'Győr',mode:'arrive',when:'2026-11-01T19:00'},at.getTime());
 const z=journeys.create(db,'z',trip,at.getTime(),.4);
 const m=journeys.create(db,'m',{...trip,from:'Budapest-Nyugati',to:'Győr',note:'PRIVATE-MONIKA-903'},at.getTime()+1,.5);
 assert.equal(z.ok,true);assert.equal(m.ok,true);
 return {db,z:z.journey,m:m.journey};
}
test('v609 export contains both original profile keys and all 3 safe collections',()=>{
 const {db}=seeded(),result=backup.build(db,at);
 assert.equal(result.format,'sh9-mav-backup-v2');
 assert.equal(result.version,2);assert.equal(result.privacy,'redacted');
 assert.deepEqual(Object.keys(result.profiles),['z','m']);
 for(const id of ['z','m']){
  assert.equal(result.profiles[id].favorites.length,1);
  assert.equal(result.profiles[id].history.length,1);
  assert.equal(result.profiles[id].journeys.length,1);
 }
 assert.equal(result.profiles.z.journeys[0].when,'2026-10-30T16:55');
 assert.equal(result.profiles.m.history[0].mode,'arrive');
});
test('default export NEVER includes private ticket, car, seat, private note or any property with those names',()=>{
 const {db}=seeded(),json=backup.encode(backup.build(db,at));
 for(const secret of ['PRIVATE-TICKET-774','PRIVATE-HOME-NOTE-891','PRIVATE-MONIKA-903'])
  assert.equal(json.includes(secret),false);
 const obj=JSON.parse(json);
 for(const p of Object.values(obj.profiles)){
  for(const j of p.journeys)assert.deepEqual(Object.keys(j).sort(),['from','id','mode','savedAt','to','when']);
 }
 assert.doesNotMatch(json,/"(ticket|car|seat|note)":/);
});
test('strict parser round-trips exported data and imports into another phone without profile mixing',()=>{
 const first=seeded();
 const exported=backup.encode(backup.build(first.db,at));
 const parsed=backup.parse(exported,at.getTime());
 const newPhone=store(),result=backup.restore(newPhone,parsed,at.getTime());
 assert.deepEqual(result.z,{favoritesAdded:1,historyAdded:1,journeysAdded:1,favoritesTotal:1,historyTotal:1,journeysTotal:1,departureAdded:0,departureTotal:0});
 assert.deepEqual(result.m,{favoritesAdded:1,historyAdded:1,journeysAdded:1,favoritesTotal:1,historyTotal:1,journeysTotal:1,departureAdded:0,departureTotal:0});
 assert.equal(personal.loadFavorites(newPhone,'z')[0].to,'Kazincbarcika');
 assert.equal(personal.loadFavorites(newPhone,'m')[0].to,'Győr');
 assert.equal(journeys.read(newPhone,'z')[0].ticket,'');
 assert.equal(journeys.read(newPhone,'m')[0].note,'');
 assert.equal(newPhone.values.has('hh-profile'),false,'import must not change active profile');
});
test('add-only restore skips duplicates, retains local ticket/notes and is safe to repeat',()=>{
 const first=seeded(),archive=backup.build(first.db,at);
 const result=backup.restore(first.db,archive,at.getTime());
 for(const id of ['z','m'])assert.deepEqual(
  [result[id].favoritesAdded,result[id].historyAdded,result[id].journeysAdded],[0,0,0]);
 assert.equal(journeys.read(first.db,'z')[0].ticket,'PRIVATE-TICKET-774');
 assert.equal(journeys.read(first.db,'z')[0].note,'PRIVATE-HOME-NOTE-891');
 assert.equal(journeys.read(first.db,'m')[0].note,'PRIVATE-MONIKA-903');
 const repeat=backup.restore(first.db,archive,at.getTime());
 assert.equal(repeat.z.journeysAdded,0);
});
test('malformed, oversized or private-field archive is rejected before ANY storage write',()=>{
 const archive=backup.build(seeded().db,at);
 const edits=[
  o=>{o.format='fake-backup'},
  o=>{o.privacy='full'},
  o=>{delete o.profiles.m},
  o=>{o.profiles.z.favorites.push({from:'<script>',to:'Győr'})},
  o=>{o.profiles.z.journeys[0].ticket='EXPOSED'},
  o=>{o.profiles.z.journeys[0].when='2026-02-30T16:55'},
  o=>{o.profiles.z.history[0].timestamp='bad'},
  o=>{o.profiles.z.journeys.push(o.profiles.z.journeys[0])},
  o=>{o.profiles.z.journeys=Array.from({length:31},()=>({...o.profiles.z.journeys[0]}))},
  o=>{o.profiles.z.favorites[0].__dangerous__='x'}
 ];
 for(const fn of edits){
  const bad=JSON.parse(JSON.stringify(archive));fn(bad);
  const db=store();
  assert.throws(()=>backup.restore(db,bad,at.getTime()));
  assert.equal(db.values.size,0);
 }
 assert.throws(()=>backup.parse('}{',at.getTime()));
 assert.throws(()=>backup.parse('x'.repeat(backup.MAX_BYTES+1),at.getTime()),/Túl nagy/);
});
test('capacity overload rejects full restore before writing, never silently truncates saved trips',()=>{
 const db=store();
 for(let i=0;i<30;i++)assert.equal(journeys.create(db,'z',{...trip,to:'Állomás '+i},at.getTime()+i,i/100).ok,true);
 const original=new Map(db.values);
 const archive=backup.build(seeded().db,at);
 assert.throws(()=>backup.restore(db,archive,at.getTime()),/megteltek/);
 assert.deepEqual([...db.values],[...original]);
});
test('localStorage failure during eight-key import rolls back prior values',()=>{
 const archive=backup.build(seeded().db,at);
 const db=store();
 db.setItem(personal.favoritesKey('z'),JSON.stringify([{from:'Pécs',to:'Szeged'}]));
 const before=new Map(db.values);
 const original=db.setItem.bind(db);let count=0;
 db.setItem=(key,value)=>{
  count++;
  if(count===4)throw Error('quota on fourth write');
  original(key,value);
 };
 assert.throws(()=>backup.restore(db,archive,at.getTime()),/korábbi adatok visszaálltak/);
 assert.deepEqual([...db.values],[...before]);
});
test('history merge keeps the latest 10; favorite order and local private data remain stable',()=>{
 const {db}=seeded(),incoming=backup.build(seeded().db,at);
 incoming.profiles.z.favorites.push({from:'Miskolc-Tiszai',to:'Eger',label:'Hétvége'});
 incoming.profiles.z.history.push({from:'Miskolc-Tiszai',to:'Eger',label:'',mode:'now',when:'',timestamp:at.getTime()-1000});
 const c=backup.restore(db,incoming,at.getTime());
 assert.equal(c.z.favoritesAdded,1);
 assert.equal(c.z.historyAdded,1);
 assert.equal(personal.loadFavorites(db,'z')[0].to,'Kazincbarcika');
 assert.equal(personal.loadFavorites(db,'z')[1].label,'Hétvége');
 assert.equal(journeys.read(db,'z')[0].ticket,'PRIVATE-TICKET-774');
});
test('Golden UI shows explicit download, manually staged import, no automatic sync or hidden picker regressions',()=>{
 for(const id of ['rail-backup','rail-backup-download','rail-backup-file','rail-backup-apply','rail-backup-preview'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-go="rail-backup"/);
 assert.match(html,/rail-backup-v609\.js/);
 assert.match(html,/jegyszámok, foglalási adatok/);
 assert.match(html,/felhőfeltöltés nélkül/);
 assert.match(code,/apply\.disabled=true/);
 assert.match(code,/file\.addEventListener\('change',async/);
 assert.match(code,/apply\.addEventListener\('click'/);
 assert.doesNotMatch(code,/\bfetch\(|XMLHttpRequest|setInterval\(|navigator\.geolocation|supabase\.co|dropbox\.com|\.innerHTML\s*=/i);
 assert.match(html,/id="rail-date-trigger"/);
 assert.match(html,/id="rail-time-trigger"/);
 assert.match(html,/bottom:9px;left:6px;width:45px/);
 assert.match(html,/mav-hero-final-approved-v2\.webp/);
 assert.match(html,/rail-golden-glass-v3/);
});
