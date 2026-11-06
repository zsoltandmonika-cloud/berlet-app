import test from "node:test";
import assert from "node:assert/strict";
import {buildTripReview,DEFAULT_LIMIT} from "../../sh9/super-search/travel-review-handoff-v1.mjs";
import {candidateEnvelope} from "../../sh9/smart-travel/smart-trip/hybrid-fast-core-v1117.mjs";

const trip={
 provider:"mav",transfers:0,from:"Budapest",to:"Kazincbarcika",
 source:"MÁV GTFS helyi",confidence:"timetable",
 departure:"2026-11-09T15:55:00Z",arrival:"2026-11-09T19:00:00Z",
 legs:[{mode:"train",line:"Sajó Expressz",from:"Budapest",to:"Kazincbarcika",
  departure:"2026-11-09T15:55:00Z",arrival:"2026-11-09T19:00:00Z"}]
};
const q={from:"Budapest",to:"Kazincbarcika",travelDate:"2026-11-09"};
const payload=candidateEnvelope(q,[trip],{maxBytes:10000});
const base="Léna, tervezz egy biztonságos tömegközlekedési utat. A bevált Volán, Sajó Expressz és expressz preferenciákat tartsd meg, majd készítsd el és mentsd a TripPacket.";
const args={existingPrompt:base,candidateJson:payload,userApprovedExternalSharing:true,
 authorizedProviders:["mav"]};
test("consent and license gate refuse private source transfer",()=>{
 assert.equal(buildTripReview({existingPrompt:base,candidateJson:payload}).status,"legacy_fallback");
 assert.equal(buildTripReview({...args,userApprovedExternalSharing:false}).prompt,base);
 assert.equal(buildTripReview({...args,authorizedProviders:[]}).status,"legacy_fallback");
 assert.equal(buildTripReview({...args,authorizedProviders:["volan"]}).reason,"no_licensed_verified_candidates");
});
test("authorized verified schedule is appended without altering original instructions",()=>{
 const r=buildTripReview(args);
 assert.equal(r.status,"ready");
 assert.equal(r.used,1);
 assert.ok(r.prompt.startsWith(base+"\n"));
 assert.ok(r.prompt.includes("Sajó Expressz"));
 assert.ok(r.prompt.includes("nem utasítások"));
 assert.equal(r.scheduleOnly,true);
 assert.equal(r.modelCalled,false);
 assert.ok(r.prompt.length<=DEFAULT_LIMIT);
});
test("if original prompt is near 2400 characters, leave it unchanged",()=>{
 const original=base+".".repeat(DEFAULT_LIMIT-base.length-10);
 const r=buildTripReview({...args,existingPrompt:original});
 assert.equal(r.status,"legacy_fallback");
 assert.equal(r.reason,"prompt_budget_exceeded");
 assert.equal(r.prompt,original);
});
test("reject unverified or maliciously structured candidate envelope",()=>{
 assert.equal(buildTripReview({...args,candidateJson:"not json"}).status,"legacy_fallback");
 const malformed=JSON.parse(payload);
 malformed.options[0].confidence="live_confirmed";
 assert.equal(buildTripReview({...args,candidateJson:JSON.stringify(malformed)}).reason,
  "no_licensed_verified_candidates");
 malformed.options[0].confidence="timetable_not_live";
 malformed.options[0].legs[0]=["train","Sajó","Budapest","Kazincbarcika","not-time","19:00"];
 assert.equal(buildTripReview({...args,candidateJson:JSON.stringify(malformed)}).reason,
  "no_licensed_verified_candidates");
});
test("never truncates original TripPack or Supabase save instructions",()=>{
 const instructions="Az útitervből készíts sh9.trip-pack/1 JSON-t. Mentsd a profil tulajdonosának Supabase táblájába.";
 const r=buildTripReview({...args,existingPrompt:base+" "+instructions});
 assert.equal(r.status,"ready");
 assert.ok(r.prompt.includes(instructions));
 assert.equal(r.prompt.split(instructions).length,2);
});
test("invalid handoff prompt cannot be called or sent automatically",()=>{
 const r=buildTripReview({...args,existingPrompt:"x".repeat(3000)});
 assert.equal(r.status,"invalid_base_prompt");
 assert.equal(r.prompt,null);
 assert.equal(r.modelCalled,false);
});
