import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {normalizeUniversalQuery,googleMapsHandoff} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/universal-request.mjs";
const base="sh9/smart-travel/public-transport/smart-trip/";
const live=readFileSync(base+"index.html","utf8");
const pilot=readFileSync(base+"v5/universal/index.html","utf8");
const js=readFileSync(base+"v5/universal/universal-client.mjs","utf8");
test("live V5 search is integrated directly; standalone legacy page is not linked",()=>{
 assert.doesNotMatch(live,/id="st22V5Test"/);
 assert.match(live,/value="google_api_v5"/);
 assert.match(live,/smart-trip-v5-inline-v1\.mjs/);
 assert.match(live,/id="st22Form"/);
 assert.match(live,/id="st22Search"/);
 assert.match(live,/id="st22SearchMethod"/);
 assert.match(live,/id="st22TripPackImport"/);
 assert.match(live,/id="st22TripPackSaved"/);
 assert.match(live,/smart-trip-ai-v1022\.js/);
 assert.match(live,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(live,/st22-v5-inline-results-style/);
 assert.doesNotMatch(live,/id="st22V5ApiDialog"/);
});
test("test target and its module dependencies are present",()=>{
 for(const name of ["index.html","universal-client.mjs","universal-request.mjs"])
  assert.ok(existsSync(base+"v5/universal/"+name),name);
 assert.match(pilot,/id="from"/);
 assert.match(pilot,/id="to"/);
 assert.match(pilot,/id="my-location"/);
 assert.match(pilot,/id="mode"/);
 assert.match(pilot,/id="maps"/);
 assert.match(pilot,/href="\.\.\/\.\.\/"/);
 assert.match(pilot,/src="\.\/universal-client\.mjs"/);
});
test("public release cannot generate a billable provider request, start AI, or save trips",()=>{
 assert.doesNotMatch(pilot,/gateway-client\.mjs|supabase\.min\.js|central-vault\/config/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|sendBeacon|\.insert\s*\(|\.upsert\s*\(/);
 for(const source of [pilot,js])
  assert.doesNotMatch(source,/routes\.googleapis\.com|\/functions\/v1\/|OPENAI_API_KEY|HH_SMART_TRIP_GOOGLE_ROUTES_KEY/);
 assert.match(pilot,/még nincs bekapcsolva/);
 assert.match(pilot,/nem kész automatikus/);
});
test("free user-initiated Maps directions works for arbitrary routes",()=>{
 const now=new Date("2026-11-09T12:00:00Z");
 for(const [from,to] of [
  ["Budapest, Bécsi út 100","Kazincbarcika, Fő tér 1"],
  ["Debrecen, Kossuth tér","Szeged, Dugonics tér"],
  ["47.52693, 19.03802","48.25657, 20.62831"]]){
  const q=normalizeUniversalQuery({from,to,profile:"m",mode:"depart",
   date:"2026-11-27",time:"15:00",priority:"balanced"},{now});
  assert.equal(q.status,"ok");
  const url=new URL(googleMapsHandoff(q.query));
  assert.equal(url.hostname,"www.google.com");
  assert.equal(url.searchParams.get("api"),"1");
  assert.equal(url.searchParams.get("travelmode"),"transit");
 }
});
