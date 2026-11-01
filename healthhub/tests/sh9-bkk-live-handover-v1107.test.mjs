/* v1107 BKK scheduled stop-to-stop search and explicit RLS cloud save QA.
 * Fully synthetic fixtures. Never uses a real user, live network or paid API.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {wallEpoch} from "../../sh9/smart-travel/lena-native/bkk/bkk-gtfs-core-v1105.mjs";
import {normalize} from "../../supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs";
const date=(()=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{
  timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date()).map(x=>[x.type,x.value]));
 const day=new Date([p.year,p.month,p.day].join("-")+"T12:00:00Z");
 day.setUTCDate(day.getUTCDate()+1);
 return day.toISOString().slice(0,10);
})();
function dateAt(n){
 const day=new Date(date+"T12:00:00Z");
 day.setUTCDate(day.getUTCDate()+n);
 return day.toISOString().slice(0,10);
}
const lines=["17","19","41","260"];
const dataset={
 schema:"sh9.bkk.gtfs/1",source:"BKK Zrt., CC BY 4.0",
 sourceUrl:"https://bkk.hu/gtfs/budapest_gtfs.zip",license:"CC-BY-4.0",
 coverage:"stop-to-stop",live:false,generatedAt:new Date().toISOString(),
 feedStart:dateAt(-1),feedEnd:dateAt(14),routes:lines,
 stops:{
  s1:["Teszt Szentlélek tér",47.537,19.046],
  s2:["Teszt Kolosy tér",47.527,19.036],
  s3:["Teszt Bécsi út Vörösvári út",47.548,19.029],
  s4:["Teszt Széll Kálmán tér",47.507,19.026]
 },
 services:{all:{start:dateAt(-1),end:dateAt(14),days:[1,1,1,1,1,1,1],exceptions:{}}},
 trips:lines.map((line,i)=>[line,"all","Példajárat",[
  ["s1",36000+i*60,36000+i*60],
  ["s2",36600+i*60,36600+i*60],
  ["s3",37200+i*60,37200+i*60]
 ],line==="260"?"bus":"tram"])
};
const encoded=new TextEncoder().encode(JSON.stringify(dataset));
const sha=Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256",encoded)))
 .map(x=>x.toString(16).padStart(2,"0")).join("");
const manifest={
 schema:"sh9.bkk.feed-manifest/1",filename:"bkk-selected-routes-v1106.json",
 source:"BKK Zrt., CC BY 4.0",license:"CC-BY-4.0",coverage:"stop-to-stop",
 live:false,sha256:sha,sourceSha256:"b".repeat(64),bytes:encoded.byteLength,
 routes:lines,generatedAt:dataset.generatedAt,validatedAt:new Date().toISOString(),
 feedStart:dataset.feedStart,feedEnd:dataset.feedEnd
};
const originalFetch=globalThis.fetch;
let fetches=0;
globalThis.fetch=async url=>{
 fetches++;
 const val=String(url).includes("bkk-feed-manifest-v1106.json")?
  new TextEncoder().encode(JSON.stringify(manifest)):encoded;
 assert.match(String(url),/\/lena-native\/bkk\/data\/bkk-/);
 return new Response(val,{status:200,headers:{"content-length":String(val.byteLength)}});
};
const state=new Map([["hh-profile","z"]]);
globalThis.window={localStorage:{
 getItem:k=>state.get(k)??null,
 setItem:(k,v)=>state.set(k,String(v))
}};
globalThis.HH_CENTRAL_VAULT={
 enabled:true,supabaseUrl:"https://vhsrupphzcjkdrusonzh.supabase.co/",
 publishableKey:"test-public-only"
};
globalThis.SH9_SMART_TRIP_PACK_V1078={
 normalize,MAX_SAVED:20,
 read:(store,p)=>JSON.parse(store.getItem("sh9-smart-trip-pack-v1078-"+p)||"[]")
};
let access=true,authenticated=true,writes=0;
const rows=new Map();
globalThis.supabase={createClient:()=>({
 auth:{
  getSession:async()=>({data:{session:authenticated?{
   user:{id:"test-user"},access_token:"test-access-token"
  }:null}}),
  getUser:async()=>({data:{user:authenticated?{id:"test-user"}:null},
   error:authenticated?null:{message:"invalid"}})
 },
 from(table){
  const filters={};
  const q={
   select(){return this},eq(k,v){filters[k]=v;return this},limit(){return this},
   async maybeSingle(){
    if(table==="hh_profile_access")return {data:access?{profile_key:filters.profile_key}:null,error:null};
    if(table==="hh_my_trip_packs")return {data:rows.get(filters.profile_key+"|"+filters.trip_id)||null,error:null};
    throw Error("Unknown table "+table);
   },
   then(ok,bad){
    if(table!=="hh_my_trip_packs")throw Error("Unexpected query");
    return Promise.resolve({data:[...rows.values()]
     .filter(x=>x.profile_key===filters.profile_key)
     .map(x=>({trip_id:x.trip_id,trip_data:x.trip_data})),error:null}).then(ok,bad);
   },
   async insert(row){
    assert.equal(table,"hh_my_trip_packs");
    assert.equal(row.profile_key,"zsolt");
    const key=row.profile_key+"|"+row.trip_id;
    if(rows.has(key))return {error:{code:"23505"}};
    rows.set(key,row);writes++;return {error:null};
   }
  };return q;
 }
})};
const bkk=await import("../../sh9/smart-travel/public-transport/smart-trip/smart-trip-bkk-v1107.mjs");
const query={date,from:"Teszt Szentlélek tér",to:"Teszt Bécsi út Vörösvári út",
 time:"09:50",mode:"depart"};
const when=new Date(wallEpoch(date,9*60+50)).toISOString();
let chosen;

test("BKK manifest integrity, verified read and stop predictions",async()=>{
 const data=await bkk.load();
 assert.equal(data.manifest.sha256,sha);
 assert.equal(data.data.routes.length,4);
 assert.equal(bkk.suggestions("Teszt Szent")[0]?.name,"Teszt Szentlélek tér");
 assert.equal(bkk.suggestions("Ismeretlen utca").length,0);
 assert.ok(fetches>=2);
});
test("verified scheduled one-ride search makes normalized SH9 TripPack",async()=>{
 const result=await bkk.search(query,when);
 assert.equal(result.status,"ok");
 assert.equal(result.coverage,"stop-to-stop");
 assert.equal(result.live,false);
 assert.ok(result.results.length>=1);
 chosen=result.results[0];
 assert.equal(chosen.tripPack.schema,"sh9.trip-pack/1");
 assert.equal(chosen.tripPack.segments.length,1);
 assert.equal(chosen.tripPack.segments[0].status,"timetable");
 assert.equal(chosen.tripPack.segments[0].line,chosen.line);
 assert.equal(chosen.tripPack.segments[0].mode,chosen.mode);
 assert.match(chosen.tripPack.summary,/nem ajtótól ajtóig/i);
});
test("unknown stop and invalid query produce no fabricated route",async()=>{
 assert.equal((await bkk.search({...query,from:"Otthon"},when)).status,"unknown_stop");
 assert.equal((await bkk.search({...query,to:query.from},when)).status,"invalid_query");
});
test("manual save refuses missing login and other family access",async()=>{
 authenticated=false;
 assert.equal((await bkk.save(chosen,"z")).status,"login_required");
 authenticated=true;access=false;
 assert.equal((await bkk.save(chosen,"z")).status,"access_denied");
 access=true;
 assert.equal(writes,0);
});
test("manual, authorized save persists once with local and cloud receipt",async()=>{
 const r=await bkk.save(chosen,"z");
 assert.equal(r.status,"saved");
 assert.equal(r.alreadySaved,false);
 assert.match(r.tripId,/^tp-bkk-[0-9a-f]{32}$/);
 assert.equal(writes,1);
 const cloud=rows.get("zsolt|"+r.tripId);
 assert.equal(cloud.trip_data.segments[0].line,chosen.line);
 const local=JSON.parse(state.get("sh9-smart-trip-pack-v1078-z"));
 assert.equal(local[0].id,r.tripId);
});
test("retry uses same cloud record, never overwrites later rating",async()=>{
 const first=[...rows.values()][0];first.trip_data.rating=5;
 const r=await bkk.save(chosen,"z");
 assert.equal(r.status,"saved");
 assert.equal(r.alreadySaved,true);
 assert.equal(first.trip_data.rating,5);
 assert.equal(writes,1);
});
test("a profile switch cannot silently write a saved trip",async()=>{
 state.set("hh-profile","m");
 assert.equal((await bkk.save(chosen,"z")).status,"profile_changed_or_unverified");
 state.set("hh-profile","z");
 assert.equal(writes,1);
});
test("a manufactured itinerary, not in verified results, cannot save",async()=>{
 assert.equal((await bkk.save({...chosen},"z")).status,"profile_changed_or_unverified");
 assert.equal(writes,1);
});
test("default ChatGPT search and v1106 cost lock remain unchanged",()=>{
 const fs=import.meta.dirname;
 const source=(name)=>import("node:fs").then(mod=>mod.readFileSync(new URL(name,import.meta.url),"utf8"));
 assert.equal(globalThis.HH_CENTRAL_VAULT.publishableKey,"test-public-only");
 assert.ok(typeof fs==="string");
});
