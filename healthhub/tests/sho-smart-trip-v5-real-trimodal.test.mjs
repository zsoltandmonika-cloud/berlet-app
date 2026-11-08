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
 assert.equal(coach.shortestMargin,12);
 assert.equal(coach.transfers,1);
 const train=candidate(route([walk,a,walk,c]),"rail");
 assert.ok(train.sajo);
 assert.ok(Number.isFinite(score(coach,"balanced")));
 const short=transit("Kazincbarcika","INTERCITY_BUS","Volánbusz","1054",
  d+"14:26:00Z",d+"17:45:00Z");
 const tight=candidate(route([walk,a,walk,short]),"bus");
 assert.equal(tight.shortestMargin,0);
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
 assert.match(edge,/\["real_test","diagnose"\]/);
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

test("Stuck Google pilot must stop on delayed auth and display exact HTTP 503 reason",()=>{
 assert.match(client,/Promise\.race\(\[/);
 assert.match(client,/8000/);
 assert.match(client,/41[0]{3}/);
 assert.match(client,/hibakód:/);
 assert.match(client,/A keresés lezárult hibával/);
 assert.match(client,/networkStarted=true/);
 assert.match(client,/if\(!networkStarted\)alreadyRun=false/);
 assert.match(ui,/client\.mjs\?v=quality-v1/);
});

test("New and legacy Supabase env keys are supported without disclosing secrets",()=>{
 assert.match(edge,/SUPABASE_SECRET_KEYS/);
 assert.match(edge,/SUPABASE_PUBLISHABLE_KEYS/);
 assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(edge,/SUPABASE_ANON_KEY/);
 assert.match(edge,/const adminKey=supabaseKey\("admin"\)/);
 assert.match(edge,/anon=supabaseKey\("public"\)/);
 assert.match(edge,/error:"supabase_admin_secret_missing"/);
 assert.match(edge,/error:"google_routes_key_missing"/);
 assert.doesNotMatch(client,/SUPABASE_SECRET_KEYS|SUPABASE_PUBLISHABLE_KEYS/);
});
test("Free diagnostic is authenticated, fixed-fixture only, and cannot reserve quota or call Google",()=>{
 const start=edge.indexOf('if((raw as Record<string,unknown>).mode==="diagnose"){');
 const end=edge.indexOf('if(!adminKey||',start);
 assert.ok(start>edge.indexOf('if(!await authorized(req))'));
 assert.ok(end>start);
 const block=edge.slice(start,end);
 assert.match(block,/paidProviderContacted:false/);
 assert.match(block,/googleRequests:0,quotaReserved:0/);
 assert.doesNotMatch(block,/reserveQuota\s*\(|fetchVariant\s*\(|fetch\(GOOGLE/);
 const responseOnly=block.slice(block.indexOf("return json(req,200"));
 assert.doesNotMatch(responseOnly,/adminKey|SUPABASE_SECRET_KEYS|getenv|googleKey|token_value/);
 assert.match(ui,/id="diagnose"/);
 assert.match(client,/mode:"diagnose"/);
 assert.match(client,/googleRequests!==0/);
 assert.match(client,/paidProviderContacted!==false/);
 assert.match(client,/google_key:"Google Routes API-kulcs hiányzik/);
 assert.match(client,/if\(failures.length\)/);
});

test("Diagnostic re-arms only from server-confirmed zero quotas, with no Google contacts",()=>{
 const start=edge.indexOf('if((raw as Record<string,unknown>).mode==="diagnose"){');
 const end=edge.indexOf('if(!adminKey||',start);
 assert.ok(start>0&&end>start);
 const block=edge.slice(start,end);
 assert.match(block,/quotaUsedToday/);
 assert.match(block,/quotaUsedMonth/);
 assert.match(block,/newAttemptAllowed=missing.length===0&&quotaUsedToday===0/);
 assert.match(block,/quotaUsedMonth<200/);
 assert.match(block,/ready.quota_readable=quotaUsedToday!==null&&quotaUsedMonth!==null/);
 assert.match(block,/period_kind","day"/);
 assert.match(block,/period_kind","month"/);
 assert.doesNotMatch(block,/reserveQuota\s*\(|fetchVariant\s*\(|fetch\(GOOGLE/);
 assert.match(client,/typeof d.newAttemptAllowed!=="boolean"/);
 assert.match(client,/else if\(!d.newAttemptAllowed\)/);
 assert.match(client,/alreadyRun=false;\s*\$\("run"\)\.disabled=false/);
 assert.match(client,/\$\("timing"\)\.hidden=true/);
 assert.match(client,/\$\("out"\)\.hidden=true/);
});

test("Interchange slack excludes walking and impossible transfers never become A candidates",()=>{
 const departure="2026-11-27T";
 const first=transit("Városi","TRAM","BKK","17",
  departure+"14:00:00Z",departure+"14:20:00Z");
 const safe=transit("Helyközi","INTERCITY_BUS","Volánbusz","1054",
  departure+"14:33:00Z",departure+"17:15:00Z");
 const approach={travelMode:"WALK",distanceMeters:550,staticDuration:"540s"};
 const valid=candidate(route([first,approach,safe],"12000s"),"bus");
 assert.ok(valid);
 assert.equal(valid.shortestMargin,4); // 13-min gap - 9-min walk = 4-min buffer
 assert.ok(score(valid)>score({...valid,shortestMargin:12})+100);
 const impossible=transit("Helyközi","INTERCITY_BUS","Volánbusz","1054",
  departure+"14:27:00Z",departure+"17:15:00Z");
 assert.equal(candidate(route([first,approach,impossible],"12000s"),"bus"),null);
 const backwards=transit("Helyközi","INTERCITY_BUS","Volánbusz","1054",
  departure+"14:18:00Z",departure+"17:15:00Z");
 assert.equal(candidate(route([first,backwards],"12000s"),"bus"),null);
 assert.equal(candidate(route([first,{...approach,staticDuration:undefined},safe],"12000s"),"bus"),null);
});

test("Invalid transit chronology and misleading overall travel times are rejected",()=>{
 const first=transit("Városi","TRAM","BKK","17",d+"14:00:00Z",d+"14:22:00Z");
 const missing=transit("Helyközi","INTERCITY_BUS","Volánbusz","1054",
  "",d+"16:20:00Z");
 const reversed=transit("Helyközi","INTERCITY_BUS","Volánbusz","1054",
  d+"17:00:00Z",d+"16:20:00Z");
 assert.equal(candidate(route([first,missing],"13000s"),"bus"),null);
 assert.equal(candidate(route([first,reversed],"13000s"),"bus"),null);
 assert.equal(candidate(route([first,a], "10s"),"all"),null);
});

test("Last-mile walk is visible and longer destination walks are penalized",()=>{
 const short=candidate(route([walk,a,walk,b,{...walk,distanceMeters:120}]),"all");
 const long=candidate(route([walk,a,walk,b,{...walk,distanceMeters:1900}]),"all");
 assert.ok(short&&long);
 assert.equal(short.finalWalkMeters,120);
 assert.equal(long.finalWalkMeters,1900);
 assert.ok(score(long,"balanced")>score(short,"balanced")+45);
 assert.match(lenaSummary({best:long}),/célállomásnál még 1900 méter séta/);
});
test("Actual Google-provider presence must not be described as one independently checked combined route",()=>{
 assert.match(client,/nem feltétlenül ugyanazon az útvonalon/);
 assert.match(client,/Előzetes A-jelölt/);
 assert.match(ui,/Léna előzetes A-jelöltje/);
 assert.match(client,/Gyaloglás utáni átszállási tartalék/);
 assert.match(client,/Utolsó séta a célhoz/);
 const e=evaluate(payload);
 assert.equal(e.independentVerified,false);
 assert.ok(e.providerReports.every(x=>x.seen));
 assert.ok(e.candidates.every(x=>x.providers.length<=2));
});
