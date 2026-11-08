import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluate,score,candidate,classify,lenaSummary} from
 "../../sh9/smart-travel/public-transport/smart-trip/v5/real-test/engine.mjs";
const get=path=>readFileSync(path,"utf8");
const edge=get("supabase/functions/hh-smart-trip-real-pilot-v1/index.ts");
const ui=get("sh9/smart-travel/public-transport/smart-trip/v5/real-test/index.html");
const client=get("sh9/smart-travel/public-transport/smart-trip/v5/real-test/client.mjs");
const transit=(name,type,agency,line,dep,arr,from="A",to="B")=>({
 travelMode:"TRANSIT",transitDetails:{transitLine:{
  nameShort:line,vehicle:{type},agencies:[{name:agency}]},
  stopDetails:{departureTime:dep,arrivalTime:arr,
   departureStop:{name:from},arrivalStop:{name:to}},headsign:name}
});
const d="2026-11-27T";
const a=transit("Hűvösvölgy","TRAM","BKK","17",d+"14:00:00Z",d+"14:22:00Z","V","D");
const b=transit("Kazincbarcika","INTERCITY_BUS","Volánbusz","1054",d+"14:38:00Z",d+"17:45:00Z","D","K");
const c=transit("Sajó Expressz","HEAVY_RAIL","MÁV","Sajó",d+"14:43:00Z",d+"17:15:00Z","B","K");
const walk={travelMode:"WALK",distanceMeters:220,staticDuration:"240s"};
const route=(steps,seconds="14000s")=>({duration:seconds,legs:[{steps}]});
const payload={schema:"sho.smart-trip.real-test/1",source:"google_routes",
 attribution:"Google Maps",presentation:"map_free_text_only",
 ai_processing:"disabled",save:false,googleRequests:3,quotaReserved:3,
 variants:[{variant:"all",status:"ok",routes:[route([walk,a,walk,b])]},
 {variant:"bus",status:"ok",routes:[route([walk,a,walk,b])]},
 {variant:"rail",status:"ok",routes:[route([walk,a,walk,c],"13400s")]}]};
test("All three user-requested transit operators can be recognized in REAL response shapes",()=>{
 const e=evaluate(payload);
 assert.ok(e);assert.equal(e.candidates.length,2);
 assert.deepEqual(e.providerReports.map(r=>[r.provider,r.seen]),
  [["BKK",true],["MÁV",true],["Volán",true]]);
 assert.equal(e.independentVerified,false);
 assert.equal(e.googleRequests,3);
 assert.match(lenaSummary(e),/menetrendje még nincs függetlenül visszaigazolva/);
});
test("Google results with missing provider NEVER claim all three checked",()=>{
 const e=evaluate({...payload,variants:[{variant:"all",status:"ok",routes:[route([walk,a,walk,c])]}],
  googleRequests:1});
 assert.ok(e);assert.equal(e.fullCoverage,false);
 assert.deepEqual(e.providerReports.map(r=>r.seen),[true,true,false]);
 assert.match(e.providerReports[2].note,/nem bizonyítja/i);
});
test("Fewer transfer/walking/waiting preferences change score with justified penalties",()=>{
 const coach=candidate(route([walk,a,walk,b]),"bus");
 assert.equal(coach.directVolan,true);
 assert.equal(coach.walkMeters,440);
 assert.equal(coach.shortestMargin,16);
 assert.equal(coach.transfers,1);
 const train=candidate(route([walk,a,walk,c]),"rail");
 assert.ok(train.sajo);
 assert.ok(Number.isFinite(score(coach,"balanced")));
 const short=transit("Kazincbarcika","INTERCITY_BUS","Volánbusz","1054",
  d+"14:26:00Z",d+"17:45:00Z");
 const tight=candidate(route([walk,a,walk,short]),"bus");
 assert.equal(tight.shortestMargin,4);
 assert.ok(score(tight,"balanced")>score(coach,"balanced")+80);
 const longwalk=candidate(route([{...walk,distanceMeters:2000},a,{...walk,distanceMeters:3000},b]),"bus");
 assert.ok(score(longwalk,"walk")>score(coach,"walk"));
});
test("960 Telebusz and unsafe malformed routes fail closed",()=>{
 const telebus=transit("telebus","BUS","BKK","960",d+"14:00:00Z",d+"15:00:00Z");
 assert.equal(candidate(route([telebus]),"all"),null);
 assert.equal(candidate({legs:[]},"all"),null);
 assert.equal(candidate(route([b],"bad"),"all"),null);
 assert.equal(classify(walk),null);
});
test("No spoofed provider, AI, source, or map response can be evaluated",()=>{
 for(const change of [
  {source:"synthetic-demo"},{source:"other"},
  {ai_processing:"enabled"},{presentation:"map_linked"},
  {save:true},{attribution:"Unknown"},{googleRequests:200}
 ])assert.equal(evaluate({...payload,...change}),null);
 assert.equal(evaluate({...payload,variants:[]}).best,null);
 assert.match(lenaSummary(evaluate({...payload,variants:[]})),/Nem kaptunk/);
});
test("Edge Function is 1 fixed test/day, 3 quota-reserved Google requests, without secrets in response",()=>{
 assert.match(edge,/Deno\.serve/);
 assert.match(edge,/mode!=="real_test"/);
 assert.match(edge,/2026-11-27T15:00:00\+01:00/);
 assert.match(edge,/const VARIANTS=\[/);
 for(const label of ["all","bus","rail"])assert.match(edge,new RegExp('id:"'+label+'"'));
 assert.match(edge,/HH_SMART_TRIP_GOOGLE_ROUTES_KEY/);
 assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(edge,/hh_profile_access/);
 assert.match(edge,/auth\.getUser/);
 assert.match(edge,/daily_used!==reserved/);
 assert.match(edge,/hh_smart_trip_google_reserve/);
 assert.ok(edge.indexOf("await reserveQuota(admin)")<edge.indexOf("await fetchVariant(key,variant)"));
 assert.match(edge,/googleRequests:attempted,quotaReserved:reserved/);
 assert.match(edge,/presentation:"map_free_text_only",ai_processing:"disabled",save:false/);
 assert.doesNotMatch(edge,/console\.log|console\.error|console\.warn/);
});
test("Browser is opt-in, no map, no GPT, no key, no persistence or changes to legacy searches",()=>{
 assert.match(ui,/id="agree"/);assert.match(ui,/id="run"/);
 assert.match(ui,/Legfeljebb 3|legfeljebb 3/);
 assert.match(ui,/BKK/);assert.match(ui,/MÁV/);assert.match(ui,/Volán/);
 assert.doesNotMatch(ui,/<iframe|google\.com\/maps\/dir\//i);
 assert.match(ui,/class="gm-attribution" translate="no">Google Maps<\/span>/);
 assert.match(ui,/href="\.\/privacy\.html"/);
 assert.match(ui,/href="\.\/terms\.html"/);
 for(const file of ["privacy.html","terms.html"]){
  const t=get("sh9/smart-travel/public-transport/smart-trip/v5/real-test/"+file);
  assert.match(t,/Google Maps/);
  assert.match(t,/policies\.google\.com\/privacy/);
  assert.doesNotMatch(t,/<iframe|google\.com\/maps\/dir\//i);
 }
 assert.doesNotMatch(client,/HH_SMART_TRIP_GOOGLE_ROUTES_KEY|SUPABASE_SERVICE_ROLE_KEY|localStorage\.setItem|sessionStorage\.setItem|innerHTML/);
 assert.match(client,/hh-guardian-family-auth-v785/);
 assert.match(client,/addEventListener\("click"/);
 assert.match(client,/if\(!\$\("agree"\)\.checked\)/);
 assert.match(client,/new AbortController\(/);
 assert.doesNotMatch(client,/sendToChatGPT|saveTrip|\.from\("hh_my_trip_packs"/);
});
