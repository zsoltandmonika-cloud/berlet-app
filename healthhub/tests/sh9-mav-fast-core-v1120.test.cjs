const test=require("node:test");
const assert=require("node:assert/strict");
const legacy=require("../../sh9/smart-travel/public-transport/mav/rail-gtfs-core-v1.js");
const fast=require("../../sh9/smart-travel/smart-trip/rail-gtfs-core-fast-v1120.js");

function feed({privateData=false}={}){
 return {
  schema:"sh9-mav-gtfs-v1",timezone:"Europe/Budapest",
  generatedAt:"2026-10-28T10:00:00Z",rightsConfirmed:!privateData,
  localOnly:privateData,source:"MÁV GTFS · authorized regression fixture",
  stops:[["A","Budapest-Keleti"],["H","Miskolc-Tiszai"],
         ["B","Kazincbarcika vasútállomás"],["N","Budapest-Nyugati"]],
  services:{
   wd:{from:"20261001",to:"20261130",days:"1111100",exceptions:{"20261030":2}},
   holiday:{from:"20261001",to:"20261130",days:"0000000",exceptions:{"20261031":1}}
  },
  trips:[
   {id:"direct",service:"wd",route:"Sajó Expressz",headsign:"Kazincbarcika",
    stops:[["A",1015,1015],["H",1095,1096],["B",1165,1165]]},
   {id:"transfer-1",service:"wd",route:"IR 302",headsign:"Miskolc",
    stops:[["A",1040,1040],["H",1120,1120]]},
   {id:"transfer-2",service:"wd",route:"S 410",headsign:"Kazincbarcika",
    stops:[["H",1130,1130],["B",1175,1175]]},
   {id:"overnight",service:"wd",route:"E 909",headsign:"Kazincbarcika",
    stops:[["A",1505,1505],["B",1590,1590]]},
   {id:"holiday-only",service:"holiday",route:"H 111",headsign:"Kazincbarcika",
    stops:[["A",800,800],["B",850,850]]}
  ]
 };
}
const cases=[
 ["2026-10-28T14:50:00Z","depart"],
 ["2026-10-28T14:50:00Z","now"],
 ["2026-10-28T18:40:00Z","arrive"],
 ["2026-10-28T22:50:00Z","depart"],
 ["2026-10-30T14:50:00Z","depart"],
 ["2026-10-31T11:15:00Z","depart"],
 ["2026-11-05T14:50:00Z","depart"],
 ["2026-10-25T01:30:00Z","arrive"]
];
function query(when,mode){return {from:"Budapest-Keleti pályaudvar",to:"Kazincbarcika",when,mode}}
test("compiler exports the original primitives without modifying them",()=>{
 for(const name of ["TZ","normalize","short","budapestDay","dayShift","wallEpoch","serviceActive",
  "validate","stationIds","rankJourneys","route"]){
  assert.equal(typeof fast[name],typeof legacy[name],name);
 }
 assert.equal(typeof fast.prepare,"function");
 assert.equal(fast.wallEpoch("2026-10-25",210),legacy.wallEpoch("2026-10-25",210));
});
test("all chronological and preference rankings match legacy on repeat and across days",()=>{
 const f=feed(),token=fast.prepare(f);
 assert.ok(token);
 for(let pass=0;pass<2;pass++)for(const [when,mode] of cases){
  for(const ranking of ["chronological","recommended","arrival","earliest","transfers","duration"]){
   const q=query(when,mode),options={limit:25,maxTransfers:1,ranking};
   assert.deepEqual(fast.route(token,q,options),legacy.route(f,q,options),
    `pass=${pass},mode=${mode},when=${when},ranking=${ranking}`);
  }
 }
});
test("direct and one-transfer behavior matches legacy exactly",()=>{
 const f=feed(),token=fast.prepare(f);
 for(const maxTransfers of [0,1]){
  const q=query("2026-10-28T14:50:00Z","depart"),opts={maxTransfers,limit:60,ranking:"recommended"};
  const expected=legacy.route(f,q,opts),got=fast.route(token,q,opts);
  assert.deepEqual(got,expected);
  assert.ok(got.journeys.every(j=>j.transfers<=maxTransfers));
 }
});
test("strict source-rights gate still blocks private GTFS without localOnly on route",()=>{
 const f=feed({privateData:true});
 assert.equal(fast.prepare(f),null);
 const token=fast.prepare(f,{allowPrivate:true});
 assert.ok(token);
 assert.equal(fast.route(token,query("2026-10-28T14:50:00Z","depart")).status,"invalid-feed");
 const opts={localOnly:true,ranking:"recommended",limit:60};
 assert.deepEqual(fast.route(token,query("2026-10-28T14:50:00Z","depart"),opts),
  legacy.route(f,query("2026-10-28T14:50:00Z","depart"),opts));
});
test("opaque prepared tokens cannot be forged and do not expose route contents",()=>{
 const f=feed(),t=fast.prepare(f);
 assert.deepEqual(Object.keys(t),[]);
 assert.equal(fast.route({},query("2026-10-28T14:50:00Z","depart")).status,"invalid-feed");
 assert.equal(JSON.stringify(t),"{}");
});
test("prepared snapshot is independent from caller mutations to source JSON",()=>{
 const f=feed(),original=structuredClone(f),token=fast.prepare(f);
 f.trips[0].stops[1][1]=1500;
 f.trips[0].stops[1][2]=1500;
 f.stops[0][1]="Changed";
 f.services.wd.days="0000000";
 assert.deepEqual(fast.route(token,query("2026-10-28T14:50:00Z","depart")),
  legacy.route(original,query("2026-10-28T14:50:00Z","depart")));
});
test("raw GTFS route still produces exactly same result as original engine",()=>{
 const f=feed();for(const [when,mode] of cases){
  assert.deepEqual(fast.route(f,query(when,mode),{ranking:"recommended"}),
   legacy.route(f,query(when,mode),{ranking:"recommended"}))
 }
});
test("invalid feed input or dates never become a valid prepared timetable",()=>{
 for(const broken of [
  {...feed(),rightsConfirmed:false,localOnly:false},
  {...feed(),services:{}},
  {...feed(),trips:[{id:"bad",service:"wd",route:"X",stops:[["A",10,11],["B",8,9]]}]},
  {...feed(),timezone:"Etc/UTC"}
 ])assert.equal(fast.prepare(broken),null);
});
test("after day-cache eviction the same journey results still match legacy",()=>{
 const f=feed(),token=fast.prepare(f);
 for(const when of ["2026-10-28T14:50:00Z","2026-10-31T11:15:00Z",
  "2026-10-28T14:50:00Z"]){
  const q=query(when,"depart");
  assert.deepEqual(fast.route(token,q,{ranking:"recommended"}),
   legacy.route(f,q,{ranking:"recommended"}))
 }
});
test("ambiguous stations and missing stations never become fabricated matches",()=>{
 const f=feed(),token=fast.prepare(f);
 for(const from of ["Budapest","Gépállomás","Miskolc-Tiszai"]){
  const q={...query("2026-10-28T14:50:00Z","depart"),from};
  assert.deepEqual(fast.route(token,q,{ranking:"recommended"}),
   legacy.route(f,q,{ranking:"recommended"}));
 }
});
