import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 SCHEMA,MAX_SEARCH_MS,normalizeLocation,budapestInstant,
 normalizeUniversalQuery,toGoogleTransitRequest,googleMapsHandoff
} from "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/universal-request.mjs";
const NOW=new Date("2026-11-09T11:00:00.000Z");
const raw=(from,to,options={})=>({
 from,to,date:"2026-11-27",time:"15:15",mode:"depart",
 profile:"m",priority:"balanced",...options
});
test("accepts unrelated arbitrary street addresses without hardcoded fixture",()=>{
 const samples=[
  ["Budapest, Bécsi út 100","Kazincbarcika, Fő tér 1"],
  ["Szeged, Dugonics tér 13","Pécs, Széchenyi tér 1"],
  ["Győr, Baross Gábor út 12","Balatonfüred, Tagore sétány"],
  ["Miskolc, Tiszai pályaudvar","Budapest, Népliget autóbusz-állomás"],
  ["Kecskemét, Rákóczi út 5","Debrecen, Egyetem tér 1"],
  ["47.52693, 19.03802","48.25657, 20.62831"],
  ["50.083333, 14.416667","48.148596, 17.107748"]
 ];
 for(const [from,to] of samples){
  const r=normalizeUniversalQuery(raw(from,to),{now:NOW});
  assert.equal(r.status,"ok",from+" → "+to);
  assert.equal(r.query.schema,SCHEMA);
  assert.equal(r.query.addressResolution,"unverified_until_provider_response");
  assert.equal(r.query.maximumElapsedMs,30_000);
  const body=toGoogleTransitRequest(r.query,{now:NOW});
  assert.equal(body.travelMode,"TRANSIT");
  assert.equal(body.computeAlternativeRoutes,true);
  assert.ok(body.origin&&body.destination);
  assert.ok(googleMapsHandoff(r.query).startsWith("https://www.google.com/maps/dir/"));
 }
});
test("coordinates are numeric; typed text cannot forge geocoded credentials",()=>{
 assert.deepEqual({...normalizeLocation("47.52693,19.03802")},
  {kind:"coordinates",label:"47.52693,19.03802",lat:47.52693,lng:19.03802});
 assert.equal(normalizeLocation("91, 19"),null);
 assert.equal(normalizeLocation("47.50, 181"),null);
 assert.equal(normalizeLocation("0, 0").kind,"coordinates");
 assert.equal(normalizeLocation({kind:"coordinates",lat:NaN,lng:19}),null);
 assert.equal(normalizeLocation({kind:"address",label:"Budapest",lat:47,lng:19}).kind,"address");
});
test("Budapest timezone conversion survives DST and refuses nonexistent/ambiguous wall times",()=>{
 assert.deepEqual(budapestInstant("2026-11-27","15:00"),
  {status:"ok",iso:"2026-11-27T14:00:00.000Z"});
 assert.deepEqual(budapestInstant("2026-07-10","15:00"),
  {status:"ok",iso:"2026-07-10T13:00:00.000Z"});
 assert.equal(budapestInstant("2026-03-29","02:30").status,"nonexistent_dst_time");
 assert.equal(budapestInstant("2026-10-25","02:30").status,"ambiguous_dst_time");
 assert.equal(budapestInstant("2026-02-31","15:00").status,"invalid_local_time");
});
test("routes requests respect transit, departure/arrival, profile and time horizon",()=>{
 const a=normalizeUniversalQuery(raw("Budapest, Bécsi út 100","Szeged",
  {priority:"transfers",mode:"arrive"}),{now:NOW});
 assert.equal(a.status,"ok");
 const body=toGoogleTransitRequest(a.query,{now:NOW});
 assert.equal(body.arrivalTime,"2026-11-27T14:15:00.000Z");
 assert.equal(body.departureTime,undefined);
 assert.equal(body.transitPreferences.routingPreference,"FEWER_TRANSFERS");
 assert.equal(body.origin.address,"Budapest, Bécsi út 100");
 assert.equal(body.destination.address,"Szeged");
 const later=normalizeUniversalQuery(raw("Budapest","Szeged",{date:"2027-06-01"}),{now:NOW});
 assert.equal(later.status,"ok"); // intake allows future dates, provider has limits
 assert.equal(toGoogleTransitRequest(later.query,{now:NOW}),null);
 const now=normalizeUniversalQuery(raw("Budapest","Szeged",{mode:"now",date:"",time:""}),
  {now:NOW});
 assert.equal(now.status,"ok");
 assert.equal(now.query.when,NOW.toISOString());
});
test("invalid, past, ambiguous and malicious location inputs fail closed",()=>{
 for(const [from,to] of [
  ["","Szeged"],["Budapest","Budapest"],["Árvíztűrő tükörfúrógép","Arvizturo tukorfurogep"],
  ["http://example.com/x","Szeged"],["<img src=x>","Szeged"],
  ["Budapest\nX","Szeged"],["Budapest",""],
  ["1234567890".repeat(30),"Szeged"]
 ]){
  const r=normalizeUniversalQuery(raw(from,to),{now:NOW});
  assert.notEqual(r.status,"ok",from+" → "+to);
 }
 assert.equal(normalizeUniversalQuery(raw("Budapest","Szeged",
  {date:"2026-11-01"}),{now:NOW}).status,"time_in_past");
 assert.equal(normalizeUniversalQuery(raw("Budapest","Szeged",
  {date:"2026-03-29",time:"02:30"}),{now:new Date("2026-01-01T00:00:00Z")}).status,
  "nonexistent_dst_time");
});
test("Google Maps URL is user-click-only; does not pretend to read back routes or encode departure time",()=>{
 const r=normalizeUniversalQuery(raw("Budapest, Kossuth Lajos tér 1",
  "47.52693,19.03802"),{now:NOW});
 assert.equal(r.status,"ok");
 const uri=new URL(googleMapsHandoff(r.query));
 assert.equal(uri.origin,"https://www.google.com");
 assert.equal(uri.searchParams.get("api"),"1");
 assert.equal(uri.searchParams.get("travelmode"),"transit");
 assert.equal(uri.searchParams.get("destination"),"47.52693,19.03802");
 assert.equal(uri.searchParams.get("origin"),"Budapest, Kossuth Lajos tér 1");
 assert.equal(uri.searchParams.has("departure_time"),false);
 assert.equal(uri.searchParams.has("key"),false);
});
test("isolated UI never calls paid Maps, a Google geocoder, GPT, or My Trips",()=>{
 assert.equal(MAX_SEARCH_MS,30000);
 const root="sh9/smart-travel/public-transport/smart-trip/v5/universal/";
 const core=readFileSync(root+"universal-request.mjs","utf8");
 const client=readFileSync(root+"universal-client.mjs","utf8");
 const html=readFileSync(root+"index.html","utf8");
 for(const source of [core,client,html]){
  assert.doesNotMatch(source,/routes\.googleapis\.com|\/functions\/v1\/|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY/);
  assert.doesNotMatch(source,/\.insert\s*\(|\.upsert\s*\(|localStorage\.setItem|sessionStorage\.setItem/);
 }
 assert.doesNotMatch(client,/fetch\s*\(|XMLHttpRequest|sendBeacon/);
 assert.match(html,/Ez az általános címbevitel tesztje/);
 assert.match(html,/nem kész automatikus/);
 assert.match(client,/getCurrentPosition/);
 assert.match(html,/target="_blank"/);
});
