import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {createMatrixSearch,parseRules,quickLenaTouch} from "../../sh9/super-search/matrix-v4/matrix-search-engine-v4.mjs";
const require=createRequire(import.meta.url);
const pack=require("../../sh9/smart-travel/public-transport/smart-trip/smart-trip-pack-v1078.js");
const rules=JSON.parse(readFileSync("sh9/super-search/matrix-v4/matrix-rules-v4.json","utf8"));
const graph={originNode:"work",destinationNode:"home",nodes:[
 {id:"work",name:"Munkahely"}, {id:"kolosy",name:"Kolosy tér"},
 {id:"keleti",name:"Budapest-Keleti"}, {id:"stadion",name:"Stadion"},
 {id:"kaz",name:"Kazincbarcika autóbusz-állomás"},
 {id:"home",name:"Célcím"}
]};
const request={from:"Munkahely",to:"Célcím",date:"2026-11-27",time:"15:15",
 mode:"depart",profile:"m",priority:"balanced"};
const iso=t=>"2026-11-27T"+t+":00+01:00";
function leg(provider,mode,line,fromNode,toNode,depart,arrive,opts={}){
 return {provider,mode,line,fromNode,toNode,departure:iso(depart),
  arrival:iso(arrive),verified:true,
  source:provider==="bkk"?"BKK Zrt., CC BY 4.0":provider==="mav"?"MÁV GTFS":"Volán GTFS",
  sourceUrl:provider==="bkk"?"https://opendata.bkk.hu/data-sources":
   provider==="mav"?"https://mavplusz.hu/":"https://www.mavcsoport.hu/",
  ...(mode==="walk"?{geometryVerified:true,walkMeters:opts.meters??300}:
  {timetableVerified:true}),...opts};
}
const access=[
 leg("bkk","tram","17","work","kolosy","15:20","15:28"),
 leg("bkk","tram","19","kolosy","keleti","15:35","16:10")
];
const stadion=leg("bkk","bus","260","work","stadion","15:30","16:00");
const egress=leg("bkk","walk","Gyalog","kaz","home","19:35","19:42",{meters:310});
const mav=leg("mav","train","Sajó Expressz","keleti","kaz","16:55","19:15");
const volan=leg("volan","bus","1054","stadion","kaz","16:30","19:30");
const services=({
 bkk={status:"ok",routes:[{legs:access},{legs:[stadion]},{legs:[egress]}]},
 mavResult={status:"ok",routes:[{legs:[mav]}]},
 volanResult={status:"ok",routes:[{legs:[volan]}]}
}={})=>({
 bkk:async()=>bkk,mav:async()=>mavResult,volan:async()=>volanResult
});
const execute=(s=services(),r=request,g=graph)=>createMatrixSearch({rules,services:s}).run({request:r,graph:g});
test("V4 commands are explicit, versioned and strict",()=>{
 assert.deepEqual(rules.commands.P,["BKK","MAV","VOLAN"]);
 assert.equal(rules.commands.T,"sh9.trip-pack/1");
 assert.ok(parseRules(rules));
 assert.equal(parseRules({...rules,connections:{...rules.connections,mustMatchVerifiedCanonicalNodeId:false}}),null);
});
test("Parallel sources join at explicitly verified nodes to one TripPack v1",async()=>{
 const r=await execute();
 assert.equal(r.status,"ready");
 assert.equal(r.selection.category,"direct_volan");
 assert.equal(r.tripPack.schema,"sh9.trip-pack/1");
 assert.equal(r.tripPack.segments[0].line,"260");
 assert.equal(r.tripPack.segments[1].line,"1054");
 assert.equal(r.tripPack.segments[2].mode,"walk");
 assert.equal(r.tripPack.from,request.from);
 assert.equal(r.tripPack.to,request.to);
 assert.equal(r.tripPack.travelDate,request.date);
 assert.equal(r.tripPack.sources.length,2);
 assert.equal(r.tripPack.alternatives.length,0);
 assert.ok(r.telemetry.totalMs>=0);
});
test("Existing TripPack v1078 parses the V4 output without migration",async()=>{
 const r=await execute();
 const normalized=pack.normalize(r.tripPack);
 assert.equal(normalized.schema,"sh9.trip-pack/1");
 assert.equal(normalized.segments.length,3);
 assert.equal(normalized.segments.at(-1).status,"estimated");
 assert.equal(normalized.arrival,"19:42");
});
test("One missing or unverified walking connector rejects door-to-door claim",async()=>{
 const bkk={status:"ok",routes:[{legs:access},{legs:[stadion]}]};
 const noWalk=await execute(services({bkk}));
 assert.equal(noWalk.status,"no_verified_complete_route");
 assert.equal(noWalk.tripPack,null);
 const badWalk=leg("bkk","walk","Gyalog","kaz","home","19:35","19:42",
  {meters:310,geometryVerified:false});
 const result=await execute(services({bkk:{status:"ok",routes:[{legs:access},
  {legs:[stadion]},{legs:[badWalk]}]}}));
 assert.equal(result.status,"no_verified_complete_route");
});
test("Different canonical interchange node cannot be silently merged",async()=>{
 const wrong=leg("volan","bus","1054","keleti","kaz","16:30","19:30");
 const onlyVolan=await execute(services({
 bkk:{status:"ok",routes:[{legs:[stadion]},{legs:[egress]}]},
 mavResult:{status:"not_covered",routes:[]},
 volanResult:{status:"ok",routes:[{legs:[wrong]}]}
 }));
 assert.equal(onlyVolan.status,"no_verified_complete_route");
});
test("Eight-minute intercity transfer buffer prevents impossible connection",async()=>{
 const late=leg("bkk","bus","260","work","stadion","15:30","16:25");
 const result=await execute(services({
 bkk:{status:"ok",routes:[{legs:[late]},{legs:[egress]}]},
 mavResult:{status:"not_covered",routes:[]}
 }));
 assert.equal(result.status,"no_verified_complete_route");
 assert.ok(result.telemetry.invalidConnections>=1);
});
test("Prefer verified direct Volán; use Sajó if Volán is unavailable",async()=>{
 const noVolan=await execute(services({
 volanResult:{status:"not_covered",routes:[]}
 }));
 assert.equal(noVolan.status,"ready");
 assert.equal(noVolan.selection.category,"sajo_express");
 assert.ok(noVolan.tripPack.segments.some(l=>l.line==="Sajó Expressz"));
});
test("BKK MAV VOLAN begin concurrently without awaiting each other",async()=>{
 const invoked=[],completions={};
 const s=Object.fromEntries(["bkk","mav","volan"].map(name=>[name,
  ()=>new Promise(resolve=>{invoked.push(name);completions[name]=resolve})]));
 const pending=createMatrixSearch({rules,services:s}).run({request,graph});
 await Promise.resolve();
 await Promise.resolve();
 assert.deepEqual(invoked,["bkk","mav","volan"]);
 completions.volan({status:"ok",routes:[{legs:[volan]}]});
 completions.mav({status:"ok",routes:[{legs:[mav]}]});
 completions.bkk({status:"ok",routes:[{legs:access},{legs:[stadion]},{legs:[egress]}]});
 const result=await pending;
 assert.equal(result.status,"ready");
});
test("A provider failure must not hide another verified itinerary",async()=>{
 const result=await execute({
 ...services(),mav:async()=>{throw Error("test unavailable")}
 });
 assert.equal(result.status,"ready");
 assert.equal(result.selection.category,"direct_volan");
 assert.equal(result.telemetry.providerStatus.mav,"error");
});
test("No source, stale clocks or unverifiable data never produces a fake route",async()=>{
 const no=await execute({});
 assert.equal(no.status,"no_verified_complete_route");
 assert.equal(no.tripPack,null);
 const unverified={...volan,timetableVerified:false};
 const out=await execute(services({
 mavResult:{status:"no_feed",routes:[]},
 volanResult:{status:"ok",routes:[{legs:[unverified]}]}
 }));
 assert.equal(out.status,"no_verified_complete_route");
});
test("Cancelled searches cannot emit a ready TripPack",async()=>{
 const ctrl=new AbortController();ctrl.abort();
 const out=await createMatrixSearch({rules,services:services()}).run({
  request,graph,signal:ctrl.signal});
 assert.equal(out.status,"cancelled");
 assert.equal(out.tripPack,null);
});
test("Arrival-constrained searches respect requested Budapest clock",async()=>{
 const tooEarly=await execute(services(),{...request,mode:"arrive",time:"19:20"});
 assert.equal(tooEarly.status,"no_verified_complete_route");
 const possible=await execute(services(),{...request,mode:"arrive",time:"19:45"});
 assert.equal(possible.status,"ready");
});
test("Short Léna story is nonblocking, deterministic and does not claim live delay",async()=>{
 const a=await execute();
 const story=quickLenaTouch(a.tripPack,{name:"Mónika"});
 assert.match(story,/Mónika/);
 assert.match(story,/indulás előtt/);
 assert.doesNotMatch(story,/garantált|élő adatok szerint|biztosan/);
 assert.equal(quickLenaTouch(null),"");
});
test("Production Smart Trip contains no V4 reference",()=>{
 const prod=readFileSync("sh9/smart-travel/public-transport/smart-trip/index.html","utf8");
 assert.doesNotMatch(prod,/matrix-search-engine-v4|matrix-rules-v4/);
});
