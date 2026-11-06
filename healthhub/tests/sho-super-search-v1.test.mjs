import test from "node:test";
import assert from "node:assert/strict";
import {createSuperSearch,VERSION} from "../../sh9/super-search/sho-super-search-core-v1.mjs";
import {createTripProvider} from "../../sh9/super-search/travel-gtfs-provider-v1.mjs";
import {createSportScheduleProvider} from "../../sh9/super-search/sport-public-provider-v1.mjs";

const q={from:"Budapest",to:"Kazincbarcika",travelDate:"2026-11-09"};
const ITEM={id:"example",title:"Verified train",summary:"Timetable only",
 source:"Official timetable",sourceUrl:"https://example.com/timetable",
 confidence:"timetable",category:"train",startsAt:"2026-11-09T15:55:00Z",
 endsAt:"2026-11-09T19:00:00Z"};
const publicTravel=(run=async()=>({status:"ok",items:[ITEM]}))=>({
 id:"mav_gtfs",domain:"travel",scope:"travel:timetable",privacy:"local_private",search:run
});
const req=(overrides={})=>({domain:"travel",profile:"z",scopes:["travel:timetable"],
 query:q,...overrides});

test("creates isolated broker and rejects duplicate or malformed providers",()=>{
 const broker=createSuperSearch();
 assert.equal(broker.version,VERSION);
 assert.equal(broker.register(publicTravel()).id,"mav_gtfs");
 assert.throws(()=>broker.register(publicTravel()),/invalid_provider/);
 assert.throws(()=>broker.register({...publicTravel(),id:"INVALID!",search:()=>{}}),/invalid_provider/);
 assert.throws(()=>broker.register({...publicTravel(),id:"x2",scope:"wallet:ids"}),/invalid_provider/);
});
test("health, wallet and tasks remain closed without authenticated adapters",async()=>{
 const broker=createSuperSearch();
 broker.register({id:"health_docs",domain:"health",scope:"health:records",
  privacy:"sensitive",search:()=>{throw Error("MUST_NOT_RUN")}});
 for(const domain of ["health","wallet","tasks"]){
  const result=await broker.search({...req(),domain,scopes:[domain+":records"]});
  assert.equal(result.status,"private_domain_not_connected");
  assert.equal(result.items.length,0);
 }
});
test("profile and scope are required, not inferred from other modules",async()=>{
 const broker=createSuperSearch();let called=0;
 broker.register(publicTravel(()=>{called++;return {status:"ok",items:[ITEM]}}));
 assert.equal((await broker.search(req({profile:"admin"}))).status,"invalid_request");
 assert.equal((await broker.search(req({scopes:[]}))).status,"no_authorized_provider");
 assert.equal((await broker.search(req({query:null}))).status,"invalid_request");
 assert.equal(called,0);
});
test("private source results cannot be cached by an untrusted setting",()=>{
 const broker=createSuperSearch();
 assert.throws(()=>broker.register({...publicTravel(),cacheMs:1000}),/private_cache_forbidden/);
});
test("independent public and local providers run concurrently and return provenance",async()=>{
 const broker=createSuperSearch(),partials=[];
 let firstStarted=false,secondStarted=false;
 broker.register(publicTravel(async()=>{firstStarted=true;await new Promise(r=>setTimeout(r,12));
  assert.equal(secondStarted,true);return {status:"ok",items:[ITEM]}}));
 broker.register({id:"volan_gtfs",domain:"travel",scope:"travel:timetable",
  privacy:"local_private",async search(){
   secondStarted=true;await new Promise(r=>setTimeout(r,8));return {status:"ok",items:[{
    ...ITEM,id:"coach",title:"Direct bus",category:"bus",source:"Volán timetable"
   }]};
  }});
 const result=await broker.search(req({onPartial:x=>partials.push(x)}));
 assert.equal(result.status,"results");
 assert.equal(result.items.length,2);
 assert.equal(result.modelCalled,false);
 assert.equal(result.cloudSaved,false);
 assert.equal(result.providers.length,2);
 assert.equal(partials.length,2);
 assert.ok(result.items.every(x=>x.provider&&x.source));
 assert.equal(firstStarted,true);
});
test("source assertion never upgrades a stale timetable to verified",async()=>{
 const broker=createSuperSearch({now:()=>Date.parse("2026-11-10T12:00:00Z")});
 broker.register(publicTravel(async()=>({status:"ok",items:[
  {...ITEM,validUntil:"2026-11-09T12:00:00Z",secretAccessToken:"DO_NOT_EXPOSE"},
  {...ITEM,id:"new",validUntil:"2026-11-11T12:00:00Z"}
 ]})));
 const r=await broker.search(req());
 assert.equal(r.items[0].stale,true);
 assert.equal(r.items[0].confidence,"unknown");
 assert.equal(r.items[1].stale,false);
 assert.equal(JSON.stringify(r).includes("DO_NOT_EXPOSE"),false);
});
test("missing verified route returns the unchanged GPT-6 handoff as fallback",async()=>{
 const broker=createSuperSearch();
 broker.register(publicTravel(()=>({status:"not_covered"})));
 const r=await broker.search(req());
 assert.equal(r.status,"fallback_required");
 assert.equal(r.fallback,"existing_chatgpt_handoff");
 assert.equal(r.items.length,0);
});
test("hard budget prevents slow provider from injecting late results",async()=>{
 const broker=createSuperSearch();
 broker.register(publicTravel(()=>new Promise(resolve=>
   setTimeout(()=>resolve({status:"ok",items:[ITEM]}),180))));
 const r=await broker.search(req({budgetMs:100}));
 assert.equal(r.status,"timeout");
 assert.equal(r.items.length,0);
 assert.equal(r.providers[0].status,"timeout");
 assert.equal(r.timedOut,true);
});
test("an aborted request cancels without using late provider results",async()=>{
 const broker=createSuperSearch();broker.register(publicTravel(async()=>({status:"ok",items:[ITEM]})));
 const controller=new AbortController();controller.abort();
 const r=await broker.search(req({signal:controller.signal}));
 assert.equal(r.status,"cancelled");
});
test("public schedule cache is bounded, time-scoped and does not mix search domains",async()=>{
 let wall=10000,calls=0;
 const broker=createSuperSearch({now:()=>wall});
 broker.register(createSportScheduleProvider({getPublicSchedule:async()=>{
  calls++;return [{id:"match1",title:"Public match",public:true,verified:true,
  startsAt:"2026-11-09T17:00:00Z",source:"Public schedule",sport:"volleyball"}]
 },cacheMs:1000}));
 const ask={domain:"sport",profile:"m",scopes:["sport:schedule"],
 query:{date:"2026-11-09",category:"volleyball"}};
 assert.equal((await broker.search(ask)).status,"results");
 assert.equal((await broker.search(ask)).status,"results");
 assert.equal(calls,1);
 wall+=1001;
 await broker.search(ask);
 assert.equal(calls,2);
 assert.equal(broker.clearPublicCache(),1);
});
test("sport public adapter excludes unverified and private events",async()=>{
 const broker=createSuperSearch();
 broker.register(createSportScheduleProvider({getPublicSchedule:async()=>[
  {id:"x1",title:"No consent",public:false,verified:true,source:"Sport",
   startsAt:"2026-11-09T17:00:00Z"},
  {id:"x2",title:"Unverified",public:true,verified:false,source:"Sport",
   startsAt:"2026-11-09T17:00:00Z"},
  {id:"x3",title:"Verified public",public:true,verified:true,source:"Sport",
   sourceUrl:"https://example.com/match",startsAt:"2026-11-09T18:00:00Z"}
 ]}));
 const r=await broker.search({domain:"sport",profile:"z",query:{date:"2026-11-09"},scopes:["sport:schedule"]});
 assert.equal(r.items.length,1);
 assert.equal(r.items[0].title,"Verified public");
 assert.equal(r.items[0].confidence,"verified_public");
});
test("Smart Trip adapter reads already computed verified GTFS outputs only",async()=>{
 const broker=createSuperSearch();
 const source={mav:{
  status:"ok",source:"MÁV GTFS (helyi)",generatedAt:"2026-11-07T10:00:00Z",
  journeys:[{legs:[{service:"Sajó Expressz",tripId:"sajo-1",
   from:"Budapest",to:"Kazincbarcika",departure:"2026-11-09T15:55:00Z",
   arrival:"2026-11-09T19:00:00Z"}]}]
 }};
 let obtained=0;
 broker.register(createTripProvider({getExistingResults:async()=>{obtained++;return source}}));
 const r=await broker.search(req());
 assert.equal(obtained,1);
 assert.equal(r.status,"results");
 assert.equal(r.items.length,1);
 assert.equal(r.items[0].confidence,"timetable");
 assert.match(r.items[0].summary,/Sajó Expressz/);
 assert.equal(r.items[0].startsAt,"2026-11-09T15:55:00.000Z");
});
test("Trip adapter never fabricates a cross-provider door-to-door route",async()=>{
 const broker=createSuperSearch();
 broker.register(createTripProvider({getExistingResults:async()=>({})}));
 const r=await broker.search(req({query:{from:"Budapest, home",to:"Kazincbarcika, home",travelDate:"2026-11-09"}}));
 assert.equal(r.status,"fallback_required");
 assert.equal(r.fallback,"existing_chatgpt_handoff");
 assert.equal(r.items.length,0);
});
test("limits results, sanitizes provider text and does not call the model",async()=>{
 const broker=createSuperSearch();
 broker.register(publicTravel(async()=>({status:"ok",items:Array.from({length:100},(_,i)=>({
  ...ITEM,id:"x"+i,title:"<script>bad</script> event "+i,
  sourceUrl:"javascript:alert(1)",password:"NOPE"
 }))})));
 const r=await broker.search(req());
 assert.ok(r.items.length<=12);
 assert.ok(r.items.every(x=>!x.title.includes("<")));
 assert.ok(r.items.every(x=>x.sourceUrl===null));
 assert.equal(JSON.stringify(r).includes("NOPE"),false);
 assert.equal(r.modelCalled,false);
});
test("no external web or GPT-6 API is called by a search without providers",async()=>{
 const broker=createSuperSearch();
 const r=await broker.search(req());
 assert.equal(r.status,"no_authorized_provider");
 assert.equal(r.items.length,0);
});
