import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file = readFileSync("supabase/functions/hh-smart-trip-routes-v1/index.ts","utf8");
test("V5 paid Google provider remains fail-closed at source",()=>{
  assert.match(file,/const ATOMIC_QUOTA_AND_LEGAL_GATE_VERIFIED = false;/);
  assert.match(file,/if \(!ATOMIC_QUOTA_AND_LEGAL_GATE_VERIFIED \|\|/);
  assert.match(file,/provider_not_enabled/);
});
test("V5 route backend requires user and family profile access",()=>{
  assert.match(file,/client\.auth\.getUser/);
  assert.match(file,/hh_profile_access/);
  assert.match(file,/is_anonymous/);
  assert.match(file,/Origin/);
});
test("V5 provider key is server-side only, no persistence or LLM forwarding",()=>{
  assert.match(file,/Deno\.env\.get/);
  assert.match(file,/X-Goog-Api-Key/);
  assert.doesNotMatch(file,/OPENAI_API_KEY|api\.openai\.com|from\("hh_my_trips"\)|\.insert\(/);
});
test("V5 request bounds and provider timeout",()=>{
  assert.match(file,/body\.length > 2500/);
  assert.match(file,/12000/);
  assert.match(file,/180000/);
});
