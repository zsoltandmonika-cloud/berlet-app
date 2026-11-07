import test from "node:test";
import assert from "node:assert/strict";
import {createBkkAdapter,createLocalGTFSAdapter,pairsFor,whenIso} from
 "../../sh9/super-search/matrix-v4/matrix-existing-sources-v4.mjs";
const graph={originNode:"work",destinationNode:"home",nodes:[
 {id:"work",name:"Work",feedStops:{bkk:"Munkahely megálló"}},
 {id:"kolosy",name:"Kolosy tér",feedStops:{bkk:"Kolosy tér"}},
 {id:"keleti",name:"Keleti",feedStops:{mav:"Budapest-Keleti",bkk:"Keleti pályaudvar"}},
 {id:"stadion",name:"Stadion",feedStops:{volan:"Budapest, Stadion"}},
 {id:"kaz",name:"Kazincbarcika",feedStops:{mav:"Kazincbarcika",volan:"Kazincbarcika"}},
 {id:"home",name:"Otthon"}],
 searchPairs:{
  bkk:[{fromNode:"work",toNode:"keleti",
   fromStop:"Munkahely megálló",toStop:"Keleti pályaudvar"}],
  mav:[{fromNode:"keleti",toNode:"kaz",
   fromStop:"Budapest-Keleti",toStop:"Kazincbarcika"}],
  volan:[{fromNode:"stadion",toNode:"kaz",
   fromStop:"Budapest, Stadion",toStop:"Kazincbarcika"}]
 }};
const q={from:"Munkahely",to:"Otthon",date:"2026-11-27",
 time:"15:15",mode:"depart",profile:"m",priority:"balanced"};
const t=(hm)=>"2026-11-27T"+hm+":00+01:00";
test("Real GTFS adapter uses injected existing core, with exactly authorized stop pair",async()=>{
 let read=0,route=0,when=null;
 const core={
  wallEpoch:()=>Date.parse(t("15:15")),
  validate:()=>({ok:true}),
  route:(_d,query,opts)=>{
   route++;when=query.when;
   assert.equal(query.from,"Budapest-Keleti");
   assert.equal(query.to,"Kazincbarcika");
   assert.equal(opts.localOnly,true);
   assert.equal(opts.maxTransfers,1);
   return {status:"ok",journeys:[{legs:[{
    service:"Sajó Expressz",from:"Budapest-Keleti",to:"Kazincbarcika",
    departure:t("16:55"),arrival:t("19:20")
   }]}]};
  }
 };
 const adapter=createLocalGTFSAdapter("mav",{
  core,readExistingLocalDataset:async()=>{read++;return {source:"MÁV GTFS (helyi)"}}
 });
 const r=await adapter({request:q,graph});
 assert.equal(r.status,"ok");
 assert.equal(r.routes.length,1);
 assert.equal(r.routes[0].legs[0].provider,"mav");
 assert.equal(r.routes[0].legs[0].fromNode,"keleti");
 assert.equal(r.routes[0].legs[0].toNode,"kaz");
 assert.equal(read,1);assert.equal(route,1);
 assert.equal(when,t("15:15").replace("+01:00","Z")===when?when:new Date(t("15:15")).toISOString());
});
test("Private Volán adapter reads only provided local feed; never posts to cloud",async()=>{
 let invoked=0;
 const adapter=createLocalGTFSAdapter("volan",{
  core:{
   wallEpoch:()=>Date.parse(t("15:15")),
   validate:()=>({ok:true}),
   route:()=>{invoked++;return {status:"ok",journeys:[{legs:[{
    service:"1054",from:"Budapest, Stadion",to:"Kazincbarcika",
    departure:t("16:30"),arrival:t("19:30")
   }]}]}}
  },
  readExistingLocalDataset:async()=>({source:"Volán GTFS (helyi)",localOnly:true})
 });
 const r=await adapter({request:q,graph});
 assert.equal(r.status,"ok");
 assert.equal(r.routes[0].legs[0].line,"1054");
 assert.equal(invoked,1);
});
test("BKK existing verified result converts to canonical interchange nodes",async()=>{
 const adapter=createBkkAdapter({
  whenResolver:()=>new Date(t("15:15")).toISOString(),
  search:async(x,when)=>{
   assert.equal(x.from,"Munkahely megálló");
   assert.equal(x.to,"Keleti pályaudvar");
   assert.ok(Number.isFinite(Date.parse(when)));
   return {status:"ok",source:"BKK Zrt., CC BY 4.0",
    coverage:"stop-to-stop",live:false,
    results:[{legs:[
     {line:"17",mode:"tram",from:"Munkahely megálló",to:"Kolosy tér",
      departure:t("15:20"),arrival:t("15:28")},
     {line:"19",mode:"tram",from:"Kolosy tér",to:"Keleti pályaudvar",
      departure:t("15:35"),arrival:t("16:10")}
    ]}]};
  }
 });
 const r=await adapter({request:q,graph});
 assert.equal(r.status,"ok");
 assert.equal(r.routes[0].legs.length,2);
 assert.equal(r.routes[0].legs[0].toNode,"kolosy");
 assert.equal(r.routes[0].legs[1].fromNode,"kolosy");
});
test("Unknown BKK transfer stop never becomes invented canonical location",async()=>{
 const adapter=createBkkAdapter({
  whenResolver:()=>new Date(t("15:15")).toISOString(),
  search:async()=>({status:"ok",source:"BKK Zrt., CC BY 4.0",
   coverage:"stop-to-stop",live:false,results:[{legs:[
   {line:"17",mode:"tram",from:"Munkahely megálló",to:"Not Known",
    departure:t("15:20"),arrival:t("15:28")},
   {line:"19",mode:"tram",from:"Not Known",to:"Keleti pályaudvar",
    departure:t("15:35"),arrival:t("16:10")}
   ]}]})
 });
 const r=await adapter({request:q,graph});
 assert.equal(r.status,"not_covered");
 assert.equal(r.routes.length,0);
});
test("No explicit stop pairs means NO provider read, not an inferred search",async()=>{
 let count=0;
 const adapter=createLocalGTFSAdapter("mav",{
  core:{wallEpoch:()=>Date.now(),validate:()=>true,route:()=>null},
  readExistingLocalDataset:()=>{count++;return {}}
 });
 const result=await adapter({request:q,graph:{nodes:graph.nodes}});
 assert.equal(result.status,"no_verified_hubs");
 assert.equal(count,0);
});
test("Existing data source rejecting invalid/old private GTFS fails closed",async()=>{
 let calls=0;
 const adapter=createLocalGTFSAdapter("mav",{
  core:{wallEpoch:()=>Date.parse(t("15:15")),validate:()=>false,
   route:()=>{calls++;return {status:"ok",journeys:[]}}},
  readExistingLocalDataset:async()=>({source:"MÁV GTFS"})
 });
 const r=await adapter({request:q,graph});
 assert.equal(r.status,"local_feed_unavailable");
 assert.equal(calls,0);
});
test("Cancelled signal prevents any private local dataset read",async()=>{
 let calls=0;
 const adapter=createLocalGTFSAdapter("mav",{
  core:{wallEpoch:()=>Date.now(),validate:()=>true,route:()=>null},
  readExistingLocalDataset:()=>{calls++;return {}}
 });
 const ctrl=new AbortController();ctrl.abort();
 assert.equal((await adapter({request:q,graph,signal:ctrl.signal})).status,"cancelled");
 assert.equal(calls,0);
});
