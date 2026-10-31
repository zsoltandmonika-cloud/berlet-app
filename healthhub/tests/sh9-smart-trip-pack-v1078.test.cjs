'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
const pack=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.js');
const html=read('sh9/smart-travel/public-transport/smart-trip/index.html');
const css=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.css');
const source=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.js');
const valid={
 schema:'sh9.trip-pack/1',title:'Mónika hazautazása',travelDate:'2026-11-01',
 from:'Kazincbarcika, Anyuka',to:'Budapest, Otthon',
 departure:'07:30',arrival:'12:25',arrivalStatus:'estimated',
 summary:'1054 közvetlen távolsági busz, budapesti csatlakozással.',
 segments:[
  {mode:'walk',from:'Anyuka',to:'Márka ABC',departure:'07:30',arrival:'07:35',status:'estimated',note:'3–5 perc'},
  {mode:'bus',line:'1054',from:'Márka ABC',to:'Budapest Stadion',departure:'07:59',arrival:'11:15',status:'timetable',note:'Hivatalos menetrendi terv'},
  {mode:'tram',line:'1',from:'Puskás Ferenc Stadion M',to:'Bécsi út / Vörösvári út',departure:'11:25',arrival:null,status:'estimated'},
  {mode:'bus',line:'260',from:'Bécsi út / Vörösvári út',to:'Borsmenta utca',departure:'12:08',arrival:'12:17',status:'estimated'},
  {mode:'walk',from:'Borsmenta utca',to:'Otthon',departure:'12:17',arrival:'12:25',status:'estimated'}
 ],
 alerts:[{title:'Mindenszentek',text:'A 260-as ünnepi menetrendje külön ellenőrzendő.'}],
 alternatives:['260 lekésésekor ellenőrizd a következő indulást.'],
 sources:[{name:'BKK',url:'https://bkk.hu/'},{name:'Hamis',url:'javascript:alert(1)'}]
};
function storage(){const values=new Map();return {
 getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values
}}
test('realistic ChatGPT itinerary imports with source/provenance and holiday warnings',()=>{
 const j=pack.normalize(JSON.stringify(valid));
 assert.equal(j.schema,'sh9.trip-pack/1');
 assert.equal(j.title,'Mónika hazautazása');
 assert.equal(j.segments.length,5);
 assert.equal(j.segments[1].line,'1054');
 assert.equal(j.segments[3].status,'estimated');
 assert.equal(j.alerts[0].title,'Mindenszentek');
 assert.equal(j.sources[0].url,'https://bkk.hu/');
 assert.equal(j.sources[1].url,'');
 const ticks=String.fromCharCode(96).repeat(3);
 assert.equal(pack.normalize(ticks+'json\n'+JSON.stringify(valid)+'\n'+ticks).segments.length,5);
});
test('saved trip records stay independent by profile and reimport replaces instead of duplicating',()=>{
 const db=storage();
 const a=pack.save(db,'z',valid,1793540000000,0.3);
 assert.equal(a.title,'Mónika hazautazása');
 assert.equal(pack.read(db,'z').length,1);
 assert.equal(pack.read(db,'m').length,0);
 const b=pack.save(db,'z',{...valid,summary:'Frissített figyelmeztetés'},1793540100000,0.4);
 assert.equal(a.id,b.id);
 assert.equal(pack.read(db,'z')[0].summary,'Frissített figyelmeztetés');
 pack.save(db,'m',valid,1793540200000,0.5);
 assert.equal(pack.read(db,'m').length,1);
 assert.equal(pack.remove(db,'z',a.id),true);
 assert.equal(pack.read(db,'z').length,0);
 assert.equal(pack.read(db,'m').length,1);
});
test('wrong schema, invalid segments, wrong dates and oversized data fail safely',()=>{
 for(const doc of [
  {...valid,schema:'invented/1'},
  {...valid,travelDate:'2026-13-40'},
  {...valid,segments:[valid.segments[0]]},
  {...valid,segments:[{...valid.segments[0],mode:'run'}]},
  {...valid,segments:valid.segments.map(x=>({...x,mode:'walk'}))},
  {...valid,segments:[{...valid.segments[0],departure:'25:25'},valid.segments[1]]}
 ])assert.throws(()=>pack.normalize(doc));
 assert.throws(()=>pack.normalize(' '.repeat(pack.MAX_BYTES+1)));
 assert.throws(()=>pack.normalize('not json'));
 assert.throws(()=>pack.normalize('{}'));
});
test('rendering uses textContent only, never promotes imported claims to verified live departures',()=>{
 const j=pack.normalize({...valid,title:'<img onerror=alert(1)>',segments:[valid.segments[0],valid.segments[1]]});
 assert.doesNotMatch(j.title,/<|>/);
 assert.doesNotMatch(source,/innerHTML\s*=|insertAdjacentHTML|eval\(/);
 assert.match(source,/\.textContent=String\(value\)/);
 assert.match(source,/Menetrendi adat \(AI állítása\)/);
 assert.doesNotMatch(source,/st22-tp-limitation/);
});
test('saved trips and JSON-file/paste tools exist in native SH9',()=>{
 for(const id of ['st22TripPackImport','st22TripPackSaved','st22TripPackDialog',
  'st22TripImportDialog','st22TripPackBody','st22TripPackFile','st22TripPackPaste',
  'st22TripPackCopy','st22TripPackDoImport','st22TripPackStatus'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/smart-trip-pack-v1078\.js/);
 assert.match(html,/smart-trip-pack-v1078\.css/);
 assert.match(css,/st22-tp-step/);
 assert.match(source,/cb\.writeText\(ASK\)/);
 assert.match(source,/file\.files\?\.\[0\]/);
 assert.match(source,/f\.size>MAX_BYTES/);
 assert.doesNotMatch(source,/api\.openai\.com|OPENAI_API_KEY|setInterval\(/);
});

test('ChatGPT ISO timestamps, BOM and fenced JSON safely normalize to Budapest HH:mm without editing route claims',()=>{
 const iso='2026-11-02T15:10:00+01:00';
 const raw={
  ...valid,travelDate:'2026-11-02',departure:iso,arrival:'2026-11-02T15:38:00+01:00',
  segments:valid.segments.slice(0,3).map((x,i)=>({...x,
   departure:['2026-11-02T15:10:00+01:00','2026-11-02T15:18:00+01:00','2026-11-02T15:33:00+01:00'][i],
   arrival:['2026-11-02T15:12:00+01:00','2026-11-02T15:33:00+01:00','2026-11-02T15:38:00+01:00'][i]
  }))
 };
 const out=pack.normalize('\uFEFF'+JSON.stringify(raw));
 assert.equal(out.departure,'15:10');
 assert.equal(out.arrival,'15:38');
 assert.equal(out.segments[1].departure,'15:18');
 assert.equal(out.segments[2].arrival,'15:38');
 assert.equal(out.segments[1].line,'1054');
 assert.equal(out.segments[1].status,'timetable');
 assert.equal(pack.normalize('Pretext\n'+String.fromCharCode(96).repeat(3)+'json\n'+JSON.stringify(raw)+'\n'+String.fromCharCode(96).repeat(3)).segments[1].arrival,'15:33');
 assert.equal(pack.normalize({tripPack:raw}).departure,'15:10');
 const withoutSchema={...raw};delete withoutSchema.schema;
 assert.equal(pack.normalize(withoutSchema).schema,'sh9.trip-pack/1');
 assert.throws(()=>pack.normalize({...raw,schema:'other/v1'}));
 assert.throws(()=>pack.normalize({...raw,departure:'2026-11-02T15:10:00'}));
 assert.throws(()=>pack.normalize({...raw,segments:raw.segments.map(x=>({...x,arrival:'invalid'}))}));
 let htmlError=null;try{pack.normalize('<html>Not found</html>')}catch(e){htmlError=e}
 assert.ok(htmlError);assert.match(htmlError.message,/JSON|weboldal/i);
});
test('single confirmed transport leg is importable without fabricating an extra walking segment',()=>{
 const simple={...valid,segments:[{mode:'bus',line:'9',from:'Kolosy tér',to:'Nyugati pályaudvar M',departure:'15:18',arrival:'15:33',status:'estimated'}]};
 assert.equal(pack.normalize(simple).segments.length,1);
 assert.throws(()=>pack.normalize({...simple,segments:[]}));
});
