const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const trips=require(path.join(root,'rail-journey-manager-v608.js'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(root,'rail-journey-manager-v608.js'),'utf8');
function storage(){
 const data=new Map();
 return {data,getItem:key=>data.get(key)||null,setItem:(key,val)=>data.set(key,val)};
}
const base={from:'Budapest-Keleti',to:'Kazincbarcika',mode:'depart',when:'2026-10-30T16:55',
 ticket:'PRIV-12345',car:'3',seat:'42',note:'Magánjegyzet: 1234'};
const at=Date.parse('2026-10-28T17:00:00.000Z');
test('Journey v608 separates Zsolt/Mónika and keeps v607 favorites/history untouched',()=>{
 const db=storage();
 const saved=trips.create(db,'z',base,at,.25);
 assert.equal(saved.ok,true);
 assert.equal(trips.read(db,'z').length,1);
 assert.deepEqual(trips.read(db,'m'),[]);
 assert.notEqual(trips.storageKey('z'),trips.storageKey('m'));
 assert.equal(trips.create(db,'m',{...base,to:'Miskolc-Tiszai'},at,.5).ok,true);
 assert.equal(trips.read(db,'m').length,1);
 assert.equal(trips.read(db,'z')[0].to,'Kazincbarcika');
 assert.equal(db.data.has('sh9-mav-rail-history-v1-zsolt'),false);
 assert.equal(db.data.has('sh9-mav-rail-favorites-v1-zsolt'),false);
});
test('Saved routes are explicitly personal plans, not invented train numbers/durations',()=>{
 const db=storage();
 const j=trips.create(db,'z',base,at,.25).journey;
 assert.equal(j.from,'Budapest-Keleti');
 assert.equal(j.to,'Kazincbarcika');
 assert.equal(j.mode,'depart');
 assert.equal(j.when,'2026-10-30T16:55');
 assert.equal(j.ticket,'PRIV-12345');
 assert.equal(j.note,'Magánjegyzet: 1234');
 assert.equal('trainNumber' in j,false);
 assert.equal('durationMinutes' in j,false);
 assert.equal(trips.modeLabel('arrive'),'Tervezett érkezés');
 assert.equal(trips.modeLabel('now'),'Indulás most (mentéskori idő)');
});
test('Stored now selection snapshots actual Budapest-local time, not stale #when input',()=>{
 const db=storage(),j=trips.create(db,'z',{...base,mode:'now',when:'2027-01-01T10:00'},at,.25).journey;
 assert.equal(j.when,trips.budapestNow(new Date(at)));
 assert.equal(j.when,'2026-10-28T18:00');
 assert.equal(j.mode,'now');
});
test('ICS export is Budapest timezone-aware, valid RFC5545 structure, excludes ticket/notes',()=>{
 const j=trips.create(storage(),'z',base,at,.6).journey;
 const out=trips.ics(j,new Date('2026-10-28T17:00:00.000Z'));
 assert.match(out,/BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
 assert.match(out,/TZID:Europe\/Budapest/);
 assert.match(out,/RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU/);
 assert.match(out,/RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU/);
 assert.match(out,/DTSTART;TZID=Europe\/Budapest:20261030T165500/);
 assert.match(out,/DTEND;TZID=Europe\/Budapest:20261030T171000/);
 assert.match(out,/DTSTAMP:20261028T170000Z/);
 assert.match(out,/STATUS:TENTATIVE/);
 assert.match(out,/Személyes tervezett útvonal/);
 assert.match(out,/END:VCALENDAR\r\n$/);
 assert.doesNotMatch(out,/PRIV-12345|Magánjegyzet|1234/);
 for(const line of out.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75,'ICS folded line over 75 octets');
 assert.equal(trips.icsEscape('A,B;C\\D\nE'),'A\\,B\\;C\\\\D\\nE');
});
test('Shared text and Google calendar template exclude sensitive notes/ticket; event is only 15-minute reminder',()=>{
 const j=trips.create(storage(),'z',{...base,mode:'arrive'},at,.5).journey;
 const text=trips.shareText(j);
 assert.match(text,/Tervezett érkezés: 2026-10-30 16:55/);
 assert.match(text,/Nem ellenőrzött MÁV-menetrend/);
 assert.doesNotMatch(text,/PRIV-12345|Magánjegyzet/);
 const url=new URL(trips.googleCalendarUrl(j));
 assert.equal(url.hostname,'calendar.google.com');
 assert.equal(url.searchParams.get('action'),'TEMPLATE');
 assert.equal(url.searchParams.get('dates'),'20261030T165500/20261030T171000');
 assert.equal(url.searchParams.get('ctz'),'Europe/Budapest');
 assert.doesNotMatch(url.toString(),/PRIV-12345|Mag%C3%A1n/);
});
test('Update & delete stay within profile; bounded fields and storage exceptions fail safely',()=>{
 const db=storage();
 const mine=trips.create(db,'z',base,at,.2).journey;
 const others=trips.create(db,'m',base,at,.3).journey;
 assert.equal(trips.patch(db,'m',mine.id,{note:'wrong profile'}),false);
 assert.equal(trips.remove(db,'m',mine.id),false);
 assert.equal(trips.patch(db,'z',mine.id,{ticket:'T'.repeat(200),car:'X'.repeat(60),seat:'W'.repeat(60),note:'N'.repeat(700)}),true);
 const newMine=trips.read(db,'z')[0];
 assert.equal(newMine.ticket.length,80);
 assert.equal(newMine.car.length,24);
 assert.equal(newMine.seat.length,24);
 assert.equal(newMine.note.length,500);
 assert.equal(trips.read(db,'m')[0].id,others.id);
 assert.equal(trips.remove(db,'z',mine.id),true);
 assert.equal(trips.read(db,'z').length,0);
 assert.equal(trips.read(db,'m').length,1);
 const blocked={getItem:()=>{throw Error('security')},setItem:()=>{throw Error('quota')}};
 assert.deepEqual(trips.read(blocked,'z'),[]);
 assert.equal(trips.create(blocked,'z',base,at,.1).reason,'storage');
});
test('Upcoming and past personal plans split by Budapest-local wall clock; invalid dates safely rejected',()=>{
 const db=storage();
 trips.create(db,'z',{...base,when:'2026-10-30T16:55'},at,.1);
 trips.create(db,'z',{...base,when:'2026-10-01T16:55'},at+1,.2);
 const {upcoming,past}=trips.splitJourneyPlans(trips.read(db,'z'),'2026-10-28T18:00');
 assert.equal(upcoming.length,1);
 assert.equal(past.length,1);
 assert.equal(upcoming[0].when,'2026-10-30T16:55');
 assert.equal(past[0].when,'2026-10-01T16:55');
 assert.equal(trips.validLocal('2026-02-30T12:00'),false);
 assert.equal(trips.validLocal('2026-10-30T25:00'),false);
 assert.equal(trips.create(db,'z',{...base,when:'2026-02-30T16:55'},at,.4).reason,'invalid');
 assert.equal(trips.create(db,'z',{...base,to:'Budapest-Keleti'},at,.4).reason,'invalid');
});
test('30 trip limit rejects silently dropping old trips; corrupted data tolerated',()=>{
 const db=storage();
 for(let i=0;i<30;i++)assert.equal(trips.create(db,'z',{...base,to:'Állomás '+i},at+i,i/100).ok,true);
 assert.equal(trips.read(db,'z').length,30);
 assert.equal(trips.create(db,'z',{...base,to:'Állomás 31'},at+31,.5).reason,'limit');
 assert.equal(trips.read(db,'z').length,30);
 db.setItem(trips.storageKey('m'),'{broken');
 assert.deepEqual(trips.read(db,'m'),[]);
});
test('Golden Glass native MÁV page has save form, profile-aware tab, and user-triggered export',()=>{
 for(const id of ['rail-journey-save-toggle','rail-journey-compose','rail-journey-confirm','rail-journey-cancel',
  'rail-trip-ticket','rail-trip-car','rail-trip-seat','rail-trip-note','rail-journey-plans'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-go="journeys"/);
 assert.match(html,/window\.SH9_MAV_JOURNEYS_UI\?\.render\(\)/);
 assert.match(html,/rail-journey-manager-v608\.js/);
 assert.match(html,/15 perces emlékeztetőt/);
 assert.match(html,/bottom:9px;left:6px;width:45px/);
 assert.match(html,/mav-hero-approved\.webp/);
 assert.match(html,/rail-golden-glass-v3/);
 assert.match(html,/id="rail-date-trigger"/);
 assert.match(html,/id="signal" class="sound"/);
 assert.doesNotMatch(src,/\bfetch\(|setInterval\(|navigator\.geolocation|supabase\.co|\.innerHTML\s*=/);
});
