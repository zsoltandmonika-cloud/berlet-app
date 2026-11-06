import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {createStopwatch,handoffPrompt} from "../../sh9/super-search/trip-stopwatch-core-v1.mjs";
const require=createRequire(import.meta.url);
const legacy=require("../../sh9/smart-travel/public-transport/smart-trip/smart-trip-chatgpt-handoff-v1076.js");
const id="tp-lena-"+"a".repeat(32);
const q={from:"Budapest-Keleti",to:"Kazincbarcika",date:"2026-11-09",time:"16:00",mode:"depart"};
test("STOP never occurs from ChatGPT handoff alone",()=>{
 let ms=100;const w=createStopwatch({clock:()=>ms});
 const s=w.start({id,profile:"z"});
 assert.equal(s.state,"searching");assert.equal(s.totalMs,0);
 ms=5000;
 assert.equal(w.displayed({id,method:"cloud"}),false);
 assert.equal(w.snapshot().state,"searching");
 assert.equal(w.snapshot().cloudSaved,false);
});
test("auto STOP requires exact correlated cloud record and a later UI paint",()=>{
 let ms=0;const w=createStopwatch({clock:()=>ms});w.start({id,profile:"m"});
 ms=2000;
 assert.equal(w.cloudObserved("tp-lena-"+"b".repeat(32)),false);
 assert.equal(w.displayed({id,method:"cloud"}),false);
 ms=25000;assert.equal(w.cloudObserved(id),true);
 assert.equal(w.snapshot().cloudObservedMs,25000);
 ms=25130;assert.equal(w.displayed({id,method:"cloud"}),true);
 assert.equal(w.snapshot().state,"finished_auto");
 assert.equal(w.snapshot().totalMs,25130);
 assert.equal(w.snapshot().uiRenderMs,130);
 assert.equal(w.snapshot().automated,true);
 assert.equal(w.snapshot().cloudSaved,true);
 assert.equal(w.displayed({id,method:"cloud"}),false);
});
test("manual paste is measured but cannot masquerade as a cloud save",()=>{
 let ms=200;const w=createStopwatch({clock:()=>ms});w.start({id,profile:"z"});
 ms=45200;
 assert.equal(w.displayed({id,method:"manual"}),true);
 assert.equal(w.snapshot().state,"finished_manual");
 assert.equal(w.snapshot().totalMs,45000);
 assert.equal(w.snapshot().cloudSaved,false);
 assert.equal(w.snapshot().automated,false);
 assert.equal(w.snapshot().cloudObservedMs,null);
});
test("timeout and cancel never produce a saved route",()=>{
 let ms=10;const w=createStopwatch({clock:()=>ms});w.start({id,profile:"z"});
 ms=300;assert.equal(w.cancel(),true);
 assert.equal(w.snapshot().state,"cancelled");
 assert.equal(w.snapshot().cloudSaved,false);
 assert.equal(w.cloudObserved(id),false);
 ms=400;w.start({id,profile:"m"});ms=600400;
 assert.equal(w.timeout(),true);
 assert.equal(w.displayed({id,method:"manual"}),false);
 assert.equal(w.snapshot().state,"timed_out");
});
test("invalid ids and unauthorized profile state are rejected",()=>{
 const w=createStopwatch();
 assert.throws(()=>w.start({id:"tp-lena-123",profile:"z"}),/invalid_request/);
 assert.throws(()=>w.start({id,profile:"admin"}),/invalid_request/);
 w.start({id,profile:"z"});
 assert.throws(()=>w.start({id,profile:"m"}),/already_running/);
});
test("handoff retains full legacy preference and inserts exact correlation trip_id",()=>{
 for(const p of ["z","m"]){
  const original=legacy.prompt(q,null,"balanced",p);
  assert.ok(original.length>500&&original.length<=2400);
  const updated=handoffPrompt({existingPrompt:original,id});
  assert.ok(updated&&updated.length<=2400);
  assert.ok(updated.includes("trip_id="+id));
  assert.ok(updated.includes("1. közvetlen Volán, 2. Sajó Expressz"));
  assert.ok(updated.includes("sh9.trip-pack/1"));
  assert.ok(updated.includes(p==="m"?"profile_key=monika":"profile_key=zsolt"));
  assert.equal(updated.includes("trip_id=egyedi tp-lena-azonosító"),false);
 }
});
test("unsupported base prompt cannot silently omit cloud verification",()=>{
 assert.equal(handoffPrompt({existingPrompt:"short",id}),null);
 assert.equal(handoffPrompt({existingPrompt:"A".repeat(2000),id}),null);
 assert.equal(handoffPrompt({existingPrompt:"trip_id=egyedi tp-lena-azonosító"+" ".repeat(2400),id}),null);
});
test("preview performs only authorized read queries without arbitrary Supabase writes",()=>{
 const js=readFileSync("sh9/super-search/trip-stopwatch-preview-v1.mjs","utf8");
 const html=readFileSync("sh9/super-search/trip-stopwatch-preview-v1.html","utf8");
 assert.match(js,/\.from\("hh_my_trip_packs"\)/);
 assert.match(js,/\.eq\("profile_key",/);
 assert.match(js,/\.eq\("trip_id",id\)/);
 assert.match(js,/\.maybeSingle\(\)/);
 assert.match(js,/auth\.getUser\(\)/);
 assert.doesNotMatch(js,/\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
 assert.doesNotMatch(js,/\bfetch\s*\(|window\.location\.assign|window\.location\.replace/);
 assert.match(html,/id="swLaunch"/);
 assert.match(html,/id="swTime"/);
 assert.match(html,/target="_blank"/);
 assert.doesNotMatch(html,/onsubmit=|onclick=/);
 assert.match(js,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);
});
