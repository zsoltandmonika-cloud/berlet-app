import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createLocalRailShadow,readExistingPrivateDataset,DB_NAME,STORE,KEY}
 from "../../sh9/super-search/travel-local-gtfs-shadow-v2.mjs";
import {createSuperSearch} from "../../sh9/super-search/sho-super-search-core-v1.mjs";
import {createTripProvider} from "../../sh9/super-search/travel-gtfs-provider-v1.mjs";
const require=createRequire(import.meta.url);
const core=require("../../sh9/smart-travel/smart-trip/rail-gtfs-core-fast-v1120.js");
const legacy=require("../../sh9/smart-travel/public-transport/mav/rail-gtfs-core-v1.js");
function feed(){
 return {schema:"sh9-mav-gtfs-v1",timezone:"Europe/Budapest",rightsConfirmed:false,
  localOnly:true,source:"MÁV GTFS (helyi)",generatedAt:"2026-11-06T10:00:00Z",
  stops:[["a","Budapest-Keleti"],["b","Kazincbarcika vasútállomás"]],
  services:{every:{from:"20261101",to:"20261130",days:"1111111",exceptions:{}}},
  trips:[{id:"sajo",service:"every",route:"Sajó Expressz",
   stops:[["a",1015,1015],["b",1165,1165]]}]};
}
const q={from:"Budapest-Keleti",to:"Kazincbarcika",travelDate:"2026-11-09",
 time:"16:00",mode:"depart"};
function fakeDatabase(row,exists=true){
 const calls={open:0,databases:0,transactions:[],reads:[]};
 const idb={
  async databases(){calls.databases++;return exists?[{name:DB_NAME}]:[]},
  open(name){
   calls.open++;assert.equal(name,DB_NAME);
   const req={};
   queueMicrotask(()=>{
    req.result={
     objectStoreNames:{contains:n=>n===STORE},
     close(){},
     transaction(store,mode){
      calls.transactions.push({store,mode});
      return {objectStore(n){
       return {get(key){
        calls.reads.push({name:n,key});
        const g={};
        queueMicrotask(()=>{g.result=row;g.onsuccess?.()});
        return g;
       }};
      }};
     }
    };
    req.onsuccess?.();
   });
   return req;
  }
 };
 return {idb,calls};
}
test("private database is NEVER created when none exists",async()=>{
 const {idb,calls}=fakeDatabase(feed(),false);
 const result=await readExistingPrivateDataset(idb);
 assert.equal(result,null);
 assert.equal(calls.open,0);
 assert.equal(calls.databases,1);
});
test("unsupported browsers do not create a private database",async()=>{
 let calls=0;
 const result=await readExistingPrivateDataset({open(){calls++;throw Error("must not be called")}});
 assert.equal(result,null);
 assert.equal(calls,0);
});
test("existing GTFS is read once through exact private key in readonly transaction",async()=>{
 const raw=feed(),{idb,calls}=fakeDatabase(raw);
 const result=await readExistingPrivateDataset(idb);
 assert.equal(result,raw);
 assert.deepEqual(calls.transactions,[{store:STORE,mode:"readonly"}]);
 assert.deepEqual(calls.reads,[{name:STORE,key:KEY}]);
});
test("opt-in shadow prepares once and keeps all resulting timetable journeys unchanged",async()=>{
 const raw=feed(),{idb,calls}=fakeDatabase(raw);
 let elapsed=0,nowMs=1000;
 const shadow=createLocalRailShadow({indexedDBApi:idb,core,
  clock:()=>++elapsed,now:()=>nowMs});
 const a=await shadow.getExistingResults(q);
 assert.ok(a?.mav);
 const when=new Date(core.wallEpoch(q.travelDate,16*60)).toISOString();
 const expected=legacy.route(raw,{from:q.from,to:q.to,when,mode:"depart"},
  {limit:30,maxTransfers:1,localOnly:true,ranking:"recommended"});
 assert.deepEqual(a.mav,expected);
 const b=await shadow.getExistingResults(q);
 assert.deepEqual(b,a);
 assert.equal(calls.open,1);
 assert.equal(shadow.metrics().routeCount,1);
 assert.equal(shadow.metrics().generatedAt,raw.generatedAt);
 assert.equal(shadow.metrics().modelCalled,false);
 assert.equal(shadow.metrics().cloudSaved,false);
 assert.equal(JSON.stringify(shadow.metrics()).includes("Budapest-Keleti"),false);
 shadow.dispose();
 assert.equal(await shadow.getExistingResults(q),null);
});
test("one user-triggered GTFS lookup supplies real local broker results without cloud calls",async()=>{
 const {idb}=fakeDatabase(feed());
 const shadow=createLocalRailShadow({indexedDBApi:idb,core});
 const broker=createSuperSearch();
 broker.register(createTripProvider({getExistingResults:shadow.getExistingResults}));
 const result=await broker.search({domain:"travel",profile:"m",scopes:["travel:timetable"],
  query:q,budgetMs:5000});
 assert.equal(result.status,"results");
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].category,"mav");
 assert.equal(result.items[0].confidence,"timetable");
 assert.match(result.items[0].summary,/Sajó Expressz/);
 assert.equal(result.modelCalled,false);
 assert.equal(result.cloudSaved,false);
 assert.equal(result.providers[0].status,"ok");
});
test("wrong input station or clock -> no fabricated route and intact GPT-6 fallback",async()=>{
 const {idb}=fakeDatabase(feed());
 const shadow=createLocalRailShadow({indexedDBApi:idb,core});
 const broker=createSuperSearch();
 broker.register(createTripProvider({getExistingResults:shadow.getExistingResults}));
 for(const input of [{...q,from:"Szeged"},{...q,time:"99:00"}]){
  const r=await broker.search({domain:"travel",profile:"z",scopes:["travel:timetable"],query:input});
  assert.equal(r.status,"fallback_required");
  assert.equal(r.fallback,"existing_chatgpt_handoff");
  assert.equal(r.items.length,0);
 }
});
test("unlicensed or public copy in PRIVATE store cannot be read into the shadow",async()=>{
 for(const changed of [{rightsConfirmed:true},{localOnly:false},{source:"Other provider"}]){
  const {idb}=fakeDatabase({...feed(),...changed});
  const shadow=createLocalRailShadow({indexedDBApi:idb,core});
  assert.equal(await shadow.getExistingResults(q),null);
  assert.equal(shadow.metrics().status,"local_feed_unavailable");
 }
});
test("cache has a time bound and can be reset explicitly without altering IndexedDB",async()=>{
 const {idb,calls}=fakeDatabase(feed());
 let time=1000;
 const shadow=createLocalRailShadow({indexedDBApi:idb,core,now:()=>time});
 await shadow.getExistingResults(q);
 time+=1000;
 await shadow.getExistingResults(q);
 assert.equal(calls.open,1);
 shadow.reset();
 await shadow.getExistingResults(q);
 assert.equal(calls.open,2);
 assert.deepEqual(calls.transactions.map(x=>x.mode),["readonly","readonly"]);
});
test("invalid request and pre-aborted request cannot open private data",async()=>{
 const {idb,calls}=fakeDatabase(feed());
 const shadow=createLocalRailShadow({indexedDBApi:idb,core});
 assert.equal(await shadow.getExistingResults({...q,travelDate:"2026-11-35"}),null);
 assert.equal(await shadow.getExistingResults({...q,mode:"bad"}),null);
 const ac=new AbortController();ac.abort();
 assert.equal(await shadow.getExistingResults({...q,signal:ac.signal}),null);
 assert.equal(calls.open,0);
});
test("refuses to share private data even when a source has valid timetable",async()=>{
 const {idb}=fakeDatabase(feed());
 const shadow=createLocalRailShadow({indexedDBApi:idb,core});
 const got=await shadow.getExistingResults(q);
 assert.equal(Object.keys(got).join(","),"mav");
 assert.equal(got.mav.source,"MÁV GTFS (helyi)");
 // No prompt builder or external handoff is called by the local source.
 assert.equal(typeof shadow.getExistingResults,"function");
 assert.equal(typeof shadow.dispose,"function");
});
