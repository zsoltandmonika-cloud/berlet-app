import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const runbook=readFileSync(
  "supabase/functions/hh-smart-trip-routes-v1/first-real-transit-test.md","utf8");
const fn=readFileSync(
  "supabase/functions/hh-smart-trip-routes-v1/index.ts","utf8");
const examples=[...runbook.matchAll(/```json\n([\s\S]*?)\n```/g)];
test("Pilot runbook includes an exact, parseable one-route preflight",()=>{
  assert.ok(examples.length>=2);
  const input=JSON.parse(examples[0][1]);
  assert.equal(input.mode,"route_preflight");
  assert.equal(input.profile,"m");
  assert.deepEqual(input.origin,{lat:47.52693,lng:19.03802});
  assert.deepEqual(input.destination,{lat:48.25657,lng:20.62831});
  assert.equal(input.departureTime,"2026-11-27T15:00:00+01:00");
  assert.equal(new Date(input.departureTime).toISOString(),"2026-11-27T14:00:00.000Z");
});
test("Runbook expected zero billing matches deployed implementation",()=>{
  const expected=JSON.parse(examples[1][1]);
  assert.equal(expected.google_enabled,false);
  assert.equal(expected.google_request,false);
  assert.equal(expected.quota_consumed,0);
  assert.equal(expected.user_authorized,true);
  assert.match(fn,/google_enabled:false,google_request:false,quota_consumed:0/);
  assert.match(fn,/ATOMIC_QUOTA_AND_LEGAL_GATE_VERIFIED = false;/);
  assert.ok(fn.indexOf('.mode === "route_preflight"') <
    fn.indexOf('admin.rpc("hh_smart_trip_google_reserve")'));
  assert.ok(fn.indexOf('.mode === "route_preflight"') <
    fn.indexOf("await fetch(GOOGLE"));
});
test("Live trial still has an explicit manual go/no-go gate",()=>{
  assert.match(runbook,/NOT AUTHORIZED YET/);
  assert.match(runbook,/EEA/);
  assert.match(runbook,/No Google request, AI processing/);
});
