import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root="sh9/smart-travel/public-transport/smart-trip/";
const lena=require("../../"+root+"smart-trip-lena-touch-v1.js");
const {explainJourney,explainBkk}=lena;
const source={kind:"local-private-gtfs",verified:true,coverage:"station-to-station",live:false};
const start=Date.parse("2026-11-27T14:00:00Z");
const trip={startMs:start,endMs:start+110*60000,durationMinutes:110,transfers:1,
 interchangeWait:5,walkingMeters:null,segments:[{kind:"ride"},{kind:"ride"}]};
const item={
 departure:"2026-11-27T14:00:00Z",arrival:"2026-11-27T15:00:00Z",
 legs:[{line:"17",departure:"2026-11-27T14:00:00Z",arrival:"2026-11-27T14:20:00Z"},
       {line:"19",departure:"2026-11-27T14:25:00Z",arrival:"2026-11-27T15:00:00Z"}],
 transfer:{waitMinutes:5}
};
const feed={status:"ok",source:"BKK Zrt., CC BY 4.0",coverage:"stop-to-stop",live:false,results:[item]};
const read=p=>readFileSync(root+p,"utf8");
test("Léna Touch is read-only and provides no network, LLM or database path",()=>{
 const s=read("smart-trip-lena-touch-v1.js");
 assert.doesNotMatch(s,/fetch\s*\(|XMLHttpRequest|\.insert\s*\(|\.upsert\s*\(|api\.openai|OPENAI_API_KEY|GOOGLE_ROUTES_KEY|localStorage|sessionStorage|\.setItem\s*\(/);
 assert.deepEqual(Object.keys(lena).sort(),["explainBkk","explainJourney"]);
});
test("One verified local GTFS route receives specific, careful, personalized A-plan narrative",()=>{
 const a=explainJourney(trip,source,{profile:"m",priority:"transfers",index:0});
 assert.equal(a.title,"✨ Léna ajánlása · A terv");
 const s=a.lines.join(" ");
 assert.match(s,/Mónika/);assert.match(s,/15:00/);
 assert.match(s,/16:50/);assert.match(s,/egy átszállással/);
 assert.match(s,/5 perc/);assert.match(s,/kevés átszállás/);
 assert.match(s,/állomástól állomásig/);assert.match(s,/nem élő/);
 assert.doesNotMatch(s,/garantált|élő késésadat alapján|biztosan a legjobb/i);
 assert.equal(explainJourney(trip,source,{profile:"z",index:1}).title,"✨ Léna megjegyzése");
 assert.match(explainJourney(trip,source,{profile:"z",index:1}).lines[0],/Zsolt/);
});
test("No unknown, Google-derived or unverified source is ever narrated as our own data",()=>{
 for(const change of [
  {kind:"verified-multimodal"},{kind:"google_routes"},{kind:"synthetic-demo"},
  {verified:false},{coverage:"door-to-door"},{live:true}
 ])assert.equal(explainJourney(trip,{...source,...change},{index:0}),null);
 assert.equal(explainJourney({...trip,segments:[]},source,{index:0}),null);
 assert.equal(explainJourney({...trip,durationMinutes:-2},source,{index:0}),null);
});
test("Official BKK route gets cautious one-option summary, including walking uncertainty",()=>{
 const a=explainBkk(item,feed,{profile:"z",priority:"walk",index:0});
 assert.equal(a.title,"✨ Léna ajánlása · A terv");
 const txt=a.lines.join(" ");
 assert.match(txt,/Zsolt/);assert.match(txt,/17 → 19/);
 assert.match(txt,/kevés gyaloglás/);assert.match(txt,/5 perc/);
 assert.match(txt,/gyalogos út/);assert.match(txt,/BKK-próbajáratok/);
 assert.match(txt,/nem élő/);
 assert.match(a.provenance,/CC BY 4\.0/);
});
test("BKK narrative rejects external routes and fake provider metadata",()=>{
 assert.equal(explainBkk(item,{...feed,source:"Google Maps"},{index:0}),null);
 assert.equal(explainBkk(item,{...feed,status:"cached"},{index:0}),null);
 assert.equal(explainBkk(item,{...feed,live:true},{index:0}),null);
 assert.equal(explainBkk(item,{...feed,results:[]},{index:0}),null);
 assert.equal(explainBkk({...item,legs:[]},feed,{index:0}),null);
});
test("Existing Smart Trip search, favorite addresses and GUI remain the original controls",()=>{
 const html=read("index.html");
 const ai=read("smart-trip-ai-v1022.js");
 const result=read("smart-trip-result-v1072.js");
 const bkk=read("smart-trip-bkk-v1107.css");
 for(const id of ["st22From","st22To","st22Favorites","st22Search",
  "st22Priority","st22SearchMethod","st22Profile","st22ResultDialog"])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.ok(html.indexOf('smart-trip-lena-touch-v1.js')<
  html.indexOf('smart-trip-result-v1072.js'));
 assert.match(ai,/if\(method==='chatgpt'\)/);
 assert.match(ai,/if\(method==='google'\)/);
 assert.match(ai,/if\(method==='bkk_gtfs'\)/);
 assert.match(ai,/HH_GUARDIAN|HH_SMART_HUB_FIELDS_V806/);
 assert.match(ai,/SH9_SMART_TRIP_LENA_TOUCH_V1\?\.explainBkk/);
 assert.match(ai,/i===0/);
 assert.match(ai,/bkkTag\('button','st22-bkk-save','💾 Mentés My Tripsbe'/);
 assert.match(result,/kind:source\.kind/);
 assert.match(result,/SH9_SMART_TRIP_LENA_TOUCH_V1\?\.explainJourney/);
 assert.match(result,/lena\.lines\.forEach\(line=>node\('p','',line,rationale\)\)/);
 assert.match(bkk,/\.st22-bkk-lena\{/);
 assert.doesNotMatch(html,/enabled:true,\s*billingApproved:true/);
});
