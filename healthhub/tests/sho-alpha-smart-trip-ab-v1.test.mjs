import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {buildABPrompt} from "../../sh9/super-search/trip-ab-prompt-v1.mjs";
const require=createRequire(import.meta.url);
const handoff=require("../../sh9/smart-travel/public-transport/smart-trip/smart-trip-chatgpt-handoff-v1076.js");
const originalHtml=readFileSync("sh9/smart-travel/public-transport/smart-trip/index.html","utf8");
const alphaHtml=readFileSync("sh9/smart-travel/public-transport/smart-trip/alpha-stopwatch-v1.html","utf8");
const originalJs=readFileSync("sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js","utf8");
const alphaJs=readFileSync("sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-alpha-v1.js","utf8");
const abJs=readFileSync("sh9/smart-travel/public-transport/smart-trip/smart-trip-alpha-ab-v1.mjs","utf8");
const id="tp-lena-"+("a".repeat(32));
const q={from:"Budapest-Keleti",to:"Kazincbarcika",date:"2026-11-09",time:"16:00",mode:"depart"};
const base=handoff.prompt(q,null,"balanced","z");
test("isolated Alpha HTML preserves original Golden search, nav and style",()=>{
 assert.equal(alphaHtml.includes('id="st22Form"'),true);
 assert.equal(alphaHtml.includes('id="st22Search"'),true);
 assert.equal(alphaHtml.includes('id="st22From"'),true);
 assert.equal(alphaHtml.includes('id="st22To"'),true);
 assert.equal(alphaHtml.includes('id="st22Priority"'),true);
 assert.equal(alphaHtml.includes('id="st22SearchMethod"'),true);
 assert.match(alphaHtml,/smart-trip-ai-alpha-v1\.js/);
 assert.match(alphaHtml,/smart-trip-alpha-ab-v1\.mjs/);
 assert.doesNotMatch(originalHtml,/alpha-ab|alpha-stopwatch|trip-stopwatch|super-search/i);
 const stripped=alphaHtml.replace(/<meta name="robots" content="noindex,nofollow">\n/,'')
  .replace('SHO Alpha A/B · ','')
  .replace(/<style>\n\/\* Only the separate Alpha page uses this panel; Golden controls untouched\. \*\/[\s\S]*?<\/style>\n/,'')
  .replace('<script src="./smart-trip-ai-alpha-v1.js?v=1-ab-isolated"></script>\n<script type="module" src="./smart-trip-alpha-ab-v1.mjs?v=1-compare"></script>',
   '<script src="./smart-trip-ai-v1022.js?v=1116-profile-handoff"></script>');
 assert.equal(stripped,originalHtml);
});
test("alpha Smart Trip AI is byte-identical except read-only selected-point probe",()=>{
 const sentinel=" const local={origin:null,destination:null};";
 assert.ok(alphaJs.includes("SH9_SMART_TRIP_ALPHA_SELECTED_V1"));
 assert.ok(originalJs.includes(sentinel));
 const extra=alphaJs.slice(alphaJs.indexOf(sentinel)+sentinel.length,
  alphaJs.indexOf(" const fields=",alphaJs.indexOf(sentinel)));
 const reconstructed=alphaJs.replace(sentinel+extra,sentinel+"\n");
 assert.equal(reconstructed,originalJs);
});
test("A/B baseline prompt keeps every existing criterion and unique save id",()=>{
 const r=buildABPrompt({existingPrompt:base,id,arm:"legacy"});
 assert.equal(r.status,"ready");assert.equal(r.arm,"legacy");
 assert.ok(r.prompt.includes("1. közvetlen Volán, 2. Sajó Expressz, 3. egyéb expresszvonat"));
 assert.ok(r.prompt.includes("sh9.trip-pack/1"));
 assert.ok(r.prompt.includes("trip_id="+id));
 assert.equal(r.candidatesUsed,0);
});
test("Super prompt is shorter without stripping essential constraints",()=>{
 const normal=buildABPrompt({existingPrompt:base,id,arm:"legacy"});
 const fast=buildABPrompt({existingPrompt:base,id,arm:"super"});
 assert.equal(fast.status,"ready");
 assert.ok(fast.bytes<normal.bytes,"compact arm must be shorter");
 assert.ok(fast.savings>=70);
 for(const text of ["1. közvetlen Volán, 2. Sajó Expressz, 3. egyéb expresszvonat",
   "sh9.trip-pack/1","trip_id="+id,"public.hh_my_trip_packs",
   "Ellenőrizd SELECT-tel","Más profilt vagy táblát ne módosíts"])
  assert.ok(fast.prompt.includes(text),text);
});
test("no private GTFS details enter ChatGPT through missing license/consent",()=>{
 const raw=JSON.stringify({schema:"sh9.gtfs-candidates/1",travelDate:"2026-11-09",
  options:[{provider:"mav",kind:"sajo_express",departure:"16:00",arrival:"19:00",
   confidence:"timetable_not_live",legs:[["train","Sajó SECRET",
    "Budapest-Keleti","Kazincbarcika","16:00","19:00"]]}]});
 const r=buildABPrompt({existingPrompt:base,id,arm:"super",candidateJson:raw,
  authorizedProviders:["mav"],userApprovedExternalSharing:false});
 assert.equal(r.status,"ready");
 assert.equal(r.candidateStatus,"local_only_not_shared");
 assert.ok(!r.prompt.includes("Sajó SECRET"));
 assert.equal(r.candidatesUsed,0);
});
test("A/B START must intercept ONLY ChatGPT, never Google, native or BKK",()=>{
 assert.match(abJs,/if\(method\.value!=="chatgpt"\)return/);
 assert.match(abJs,/event\.stopImmediatePropagation\(\)/);
 assert.match(abJs,/form\.addEventListener\("submit"/);
 assert.match(abJs,/window\.open\("about:blank","_blank"\)/);
 assert.match(abJs,/clock\.start\(\{id,profile:p\}\)/);
 assert.match(abJs,/\.location\.replace\(chat\.href\)/);
 assert.match(abJs,/pollCloud\(token\)/);
});
test("A/B cloud read is scoped and only STOPs after double animation frame",()=>{
 assert.match(abJs,/auth\.getUser\(\)/);
 assert.match(abJs,/\.from\("hh_my_trip_packs"\)/);
 assert.match(abJs,/\.eq\("profile_key",key\)\.eq\("trip_id",s\.id\)/);
 assert.match(abJs,/raw\.id!==s\.id/);
 assert.match(abJs,/route\.travelDate!==s\.query\.date/);
 assert.match(abJs,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);
 assert.match(abJs,/clock\.displayed\(\{id:current\.id,method:"cloud"\}\)/);
 assert.doesNotMatch(abJs,/\.upsert\(|\.insert\(|\.update\(|\.delete\(/);
});
test("source-rights gate: GTFS prefilter is local-only",()=>{
 assert.match(abJs,/createWorkerRailShadow\(\)/);
 assert.match(abJs,/createSuperSearch\(\)/);
 assert.match(abJs,/createTripProvider/);
 assert.match(abJs,/const built=buildABPrompt\(\{existingPrompt:base,id,arm\}\)/);
 assert.doesNotMatch(abJs,/rawGTFS|\.upload\(|\.post\(/);
});
