import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {evaluateRoutes,explainChoice,stat,buildMapsUrl} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/v5-pilot-core.mjs";
import {fakeResponse} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/v5-demo-fixture.mjs";
const require=createRequire(import.meta.url);
const google=require("../../sh9/smart-travel/public-transport/smart-trip/smart-trip-multimodal-v1073.js");
const query={
 from:"Egy demo kiindulópont",to:"Egy demo cél",mode:"depart",
 date:"2026-11-27",time:"15:15",priority:"balanced",
 when:"2026-11-27T14:15:00Z"
};
const fixture=fakeResponse(query.when);
test("V5 uses the unchanged official Google response normalizer",()=>{
 assert.equal(google.normalizeRoutes(fixture,query).length,4);
});
test("Four distinct synthetic Google-shaped routes are ranked, with direct Volán first",()=>{
 const candidates=evaluateRoutes(fixture,query,google);
 assert.equal(candidates.length,4);
 assert.equal(candidates[0].metrics.directVolan,true);
 assert.ok(candidates.some(x=>x.metrics.sajoExpress));
 assert.ok(candidates.some(x=>x.metrics.transfers>0));
 assert.equal(candidates[0].source,"google-routes");
});
test("Alternative routes preserve source order identity while allowing SHO display order",()=>{
 const ranked=evaluateRoutes(fixture,query,google);
 const original=fixture.routes.map(x=>JSON.stringify(x));
 assert.equal(ranked.length,4);
 assert.deepEqual(fixture.routes.map(x=>JSON.stringify(x)),original);
 assert.equal(ranked[0].ordinal,1);
});
test("Explicit fewer transfers preference respects direct link and no invented transfers",()=>{
 const ranked=evaluateRoutes(fixture,{...query,priority:"transfers"},google);
 assert.equal(ranked[0].metrics.transfers,0);
 assert.ok(ranked.every(x=>x.metrics.transfers>=0));
});
test("Explicit less walking preference keeps complete route metrics",()=>{
 const ranked=evaluateRoutes(fixture,{...query,priority:"walk"},google);
 assert.ok(ranked.every(x=>x.metrics.walkMeters>=0));
 assert.ok(ranked.every(x=>x.metrics.durationMin>0));
});
test("Ranker rejects empty or invalid provider response rather than inventing routes",()=>{
 assert.deepEqual(evaluateRoutes({routes:[]},query,google),[]);
 assert.deepEqual(evaluateRoutes({routes:[{legs:[]}]},query,google),[]);
});
test("Missing normalizer fails closed",()=>{
 assert.throws(()=>evaluateRoutes(fixture,query,{}),/missing_existing_google_adapter/);
});
test("Léna demo is explicitly labeled non-real and never claims live verification",()=>{
 const r=evaluateRoutes(fixture,query,google);
 const s=explainChoice(r[0],{profile:"m",demo:true});
 assert.match(s,/Szemléltető minta/);
 assert.match(s,/Mónika/);
 assert.doesNotMatch(s,/élő|késésmentes|garantált/i);
});
test("No route returns an honest no-result message",()=>{
 assert.match(explainChoice(null),/Nincs ellenőrzött/);
});
test("Maps URL opens official domain, no API key, and no route data readback",()=>{
 const u=new URL(buildMapsUrl(query));
 assert.equal(u.origin,"https://www.google.com");
 assert.equal(u.pathname,"/maps/dir/");
 assert.equal(u.searchParams.get("travelmode"),"transit");
 assert.equal(u.searchParams.get("destination"),query.to);
 assert.equal(u.searchParams.has("key"),false);
});
test("Synthetic fixture has no real provider GTFS and route samples are visibly DEMO",()=>{
 const content=readFileSync("sh9/smart-travel/public-transport/smart-trip/v5/v5-demo-fixture.mjs","utf8");
 assert.match(content,/FICTIONAL/);
 assert.match(content,/DEMO/);
 assert.doesNotMatch(content,/GTFS|MISKOLC-KELETI|service_role/);
});
test("Isolated V5 preview has no cloud writer, no backend key and no map+routes mixing",()=>{
 const dir="sh9/smart-travel/public-transport/smart-trip/v5/";
 const html=readFileSync(dir+"index.html","utf8");
 const js=readFileSync(dir+"v5-live-pilot.mjs","utf8");
 const core=readFileSync(dir+"v5-pilot-core.mjs","utf8");
 const prod=readFileSync("sh9/smart-travel/public-transport/smart-trip/index.html","utf8");
 assert.match(html,/Google Routes API: KIKAPCSOLVA/);
 assert.match(html,/AI-hívás: KIKAPCSOLVA/);
 assert.match(html,/My Trips mentés: KIKAPCSOLVA/);
 assert.doesNotMatch(html,/<iframe|google\.com\/maps\/embed/i);
 assert.doesNotMatch(js,/fetch\(|\.insert\(|\.upsert\(|localStorage\.|sessionStorage\.|\.setItem\(/);
 assert.doesNotMatch(core,/fetch\(|\.insert\(|\.upsert\(|localStorage\.|sessionStorage\./);
 assert.doesNotMatch(prod,/v5-live-pilot|v5-pilot-core/);
 for(const src of ["../../mav/rail-gtfs-core-v1.js","../smart-trip-multimodal-v1073.js","./v5-live-pilot.mjs"]){
  assert.ok(html.includes('src="'+src+'"'));
  assert.equal(path.posix.normalize(dir+src).startsWith("sh9/smart-travel/public-transport/"),true);
 }
});
