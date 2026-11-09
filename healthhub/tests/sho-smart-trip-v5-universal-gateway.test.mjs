import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeUniversalQuery,toGoogleTransitRequest} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/universal/universal-request.mjs";
import {
 normalizeRequest,sanitizeGoogleResponse,GOOGLE_FIELD_MASK,
 ROUTES_URL,RESULT_SCHEMA
} from "../../supabase/functions/hh-smart-trip-universal-v1/core.mjs";
const NOW=Date.parse("2026-11-09T12:10:00Z");
const user=(from,to,options={})=>normalizeUniversalQuery({
 from,to,date:"2026-11-27",time:"15:00",mode:"depart",
 profile:"m",priority:"balanced",...options
},{now:new Date(NOW)});
function request(from="Budapest, Bécsi út 100",to="Kazincbarcika, Fő tér 1",
 options={}){
 const item=user(from,to,options);
 assert.equal(item.status,"ok");
 return {mode:"search",consent:true,query:item.query};
}
const validate=arg=>normalizeRequest(arg,{now:NOW});
const route=(line="17",agency="BKK")=>({
 duration:"5400s",legs:[{steps:[
  {travelMode:"WALK",staticDuration:"300s",distanceMeters:330},
  {travelMode:"TRANSIT",transitDetails:{
   stopDetails:{
    departureTime:"2026-11-27T14:15:00Z",
    arrivalTime:"2026-11-27T14:48:00Z",
    departureStop:{name:"Kolosy tér"},arrivalStop:{name:"Margit híd"}
   },
   transitLine:{nameShort:line,vehicle:{type:"TRAM"},agencies:[{name:agency}]}
  }}
 ]}]
});
test("universal Edge gateway accepts arbitrary city addresses and numeric GPS input",()=>{
 const cases=[
  ["Budapest, Bécsi út 100","Kazincbarcika, Fő tér 1"],
  ["Debrecen, Kossuth tér","Szeged, Dugonics tér"],
  ["Győr, Baross út 17","Pécs, Király utca 5"],
  ["47.52693,19.03802","48.25657,20.62831"],
  ["48.148596,17.107748","50.083333,14.416667"]
 ];
 for(const [a,b] of cases){
  const result=validate(request(a,b));
  assert.equal(result.ok,true,a+" -> "+b);
  assert.equal(result.profile,"m");
  assert.equal(result.googlePayload.travelMode,"TRANSIT");
  assert.ok(result.googlePayload.origin&&result.googlePayload.destination);
  assert.equal(result.googlePayload.departureTime,"2026-11-27T14:00:00.000Z");
  assert.equal(result.googlePayload.intermediates,undefined);
 }
});
test("the frontend and backend agree on exact Google transit request fields",()=>{
 const raw=request("Budapest, Bécsi út 100","Szeged",{
  mode:"arrive",priority:"transfers",profile:"z"
 });
 const server=validate(raw);
 assert.equal(server.ok,true);
 const frontend=toGoogleTransitRequest(raw.query,{now:new Date(NOW)});
 assert.deepEqual(server.googlePayload,frontend);
 assert.equal(server.googlePayload.arrivalTime,"2026-11-27T14:00:00.000Z");
 assert.equal(server.googlePayload.departureTime,undefined);
 assert.equal(server.profile,"z");
});
test("untrusted browser query must never forge a coordinate or time or extra billing calls",()=>{
 const good=request();
 const variants=[
  {...good,consent:false},
  {...good,mode:"extra"},
  {...good,foo:"yes"},
  {...good,query:{...good.query,origin:{kind:"coordinates",label:"Home",lat:48,lng:200}}},
  {...good,query:{...good.query,origin:{kind:"coordinates",label:"Home",lat:48,lng:19,secret:"yes"}}},
  {...good,query:{...good.query,when:"2026-11-27T18:00:00.000Z"}},
  {...good,query:{...good.query,maximumElapsedMs:500000}},
  {...good,query:{...good.query,transit:false}},
  {...good,query:{...good.query,extra:"forgot"}},
  {...good,query:{...good.query,date:"2026-11-26"}},
  {...good,query:{...good.query,origin:{kind:"address",label:"javascript:console.log(1)"}}}
 ];
 for(const item of variants)assert.equal(validate(item).ok,false);
});
test("diagnosis is a separate no-Google request type, still authenticated/opt-in",()=>{
 const diag=validate({...request(),mode:"diagnose"});
 assert.equal(diag.ok,true);
 assert.equal(diag.mode,"diagnose");
});
test("Google Routes raw content is bounded to map-free, attributed, non-AI display",()=>{
 const out=sanitizeGoogleResponse({routes:[route()]});
 assert.equal(out.schema,RESULT_SCHEMA);
 assert.equal(out.attribution,"Google Maps");
 assert.equal(out.ai_processing,"disabled");
 assert.equal(out.save,false);
 assert.equal(out.independentlyVerified,false);
 assert.equal(out.presentation,"map_free_text_only");
 assert.equal(out.routes.length,1);
 assert.equal(out.routes[0].durationSeconds,5400);
 assert.equal(out.routes[0].steps[0].meters,330);
 assert.equal(out.routes[0].steps[1].line,"17");
 assert.equal(out.routes[0].steps[1].agency,"BKK");
 assert.equal(out.googleRequests,1);
 assert.equal(out.quotaReserved,1);
});
test("Google result normalization rejects malformed transport and oversized responses",()=>{
 assert.equal(sanitizeGoogleResponse({routes:new Array(9).fill(route())}),null);
 assert.equal(sanitizeGoogleResponse({notRoutes:1}),null);
 assert.equal(sanitizeGoogleResponse({routes:[{duration:"300s",legs:[]}]}).routes.length,0);
 assert.equal(sanitizeGoogleResponse({routes:[{...route(),duration:"invalid"}]}).routes.length,0);
 assert.equal(sanitizeGoogleResponse({routes:[{...route(),legs:[{steps:[
  {travelMode:"TRANSIT",transitDetails:{stopDetails:{
   departureTime:"2026-11-27T15:00:00Z",arrivalTime:"2026-11-27T14:00:00Z",
   departureStop:{name:"A"},arrivalStop:{name:"B"}}}}]}]}]}).routes.length,0);
 const escaping=route("<script>","Fake <company>");
 const sanitized=sanitizeGoogleResponse({routes:[escaping]});
 assert.equal(sanitized.routes[0].steps[1].line,"script");
 assert.equal(sanitized.routes[0].steps[1].agency,"Fake  company");
});
test("server code makes no provider call when disabled, missing profile, or no quota reservation",()=>{
 const src=readFileSync("supabase/functions/hh-smart-trip-universal-v1/index.ts","utf8");
 assert.match(src,/HH_SMART_TRIP_UNIVERSAL_ENABLED/);
 assert.match(src,/HH_SMART_TRIP_UNIVERSAL_BILLING_VERIFIED/);
 assert.match(src,/HH_SMART_TRIP_UNIVERSAL_EEA_REVIEW_APPROVED/);
 assert.match(src,/auth\.getUser/);
 assert.match(src,/hh_profile_access/);
 assert.match(src,/hh_smart_trip_google_reserve_pilot/);
 assert.match(src,/p_expected_daily_used:0/);
 assert.match(src,/req\.signal\.aborted/);
 assert.match(src,/if\(!quota\.ok\)return/);
 assert.ok(src.indexOf("if(!(status.enabled&&status.billingReviewed&&status.eeaReviewed))")<
  src.indexOf("await reserveOne(admin)"));
 assert.ok(src.indexOf("await reserveOne(admin)")<
  src.indexOf("await providerRequest("));
 const before=src.slice(0,src.indexOf("if(validated.mode==="+'"diagnose"'+")"));
 assert.doesNotMatch(before,/await providerRequest/);
 const diagnoseBlock=src.slice(src.indexOf('if(validated.mode==="diagnose")'),src.indexOf('if(!(status.enabled'));
 assert.doesNotMatch(diagnoseBlock,/await providerRequest|await reserveOne/);
 assert.doesNotMatch(src,/console\.log|console\.warn|console\.error|localStorage|sessionStorage/);
 assert.equal(ROUTES_URL,"https://routes.googleapis.com/directions/v2:computeRoutes");
 assert.match(GOOGLE_FIELD_MASK,/routes\.legs\.steps\.transitDetails/);
});
test("gateway has no AI or My Trips access and does not auto-deploy",()=>{
 const src=readFileSync("supabase/functions/hh-smart-trip-universal-v1/index.ts","utf8");
 assert.doesNotMatch(src,/openai\.com|gemini|\/chat\/completions|hh_my_trip_packs|\.upsert\s*\(|\.insert\s*\(/i);
 const workflow=readFileSync(".github/workflows/sho-smart-trip-v5-parallel-qa.yml","utf8");
 assert.doesNotMatch(workflow,/supabase\s+functions\s+deploy|SUPABASE_ACCESS_TOKEN/);
});
