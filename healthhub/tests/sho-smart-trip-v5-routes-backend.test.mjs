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

const migration = readFileSync("supabase/migrations/20261107120000_sho_smart_trip_google_quota_v1.sql","utf8");
test("Shared global daily 20 / monthly 200 quota is atomic",()=>{
  assert.match(migration,/pg_advisory_xact_lock/);
  assert.match(migration,/dc >= 20 OR mc >= 200/);
  assert.match(migration,/FOR UPDATE/g);
  assert.match(migration,/used=used\+1/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS public.hh_smart_trip_google_quota/);
});
test("Reservation is service-role only and counter has RLS",()=>{
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
  assert.match(migration,/REVOKE ALL ON FUNCTION .* FROM PUBLIC, anon, authenticated/);
  assert.match(migration,/GRANT EXECUTE ON FUNCTION .* TO service_role/);
});
test("No paid provider fetch before successful reservation",()=>{
  assert.match(file,/hh_smart_trip_google_reserve/);
  assert.match(file,/quota_guard_unavailable/);
  assert.match(file,/google_quota_exhausted/);
  assert.ok(file.indexOf('admin.rpc("hh_smart_trip_google_reserve")')<
    file.indexOf("await fetch(GOOGLE"));
  assert.match(file,/DAILY_CAP = 20, MONTHLY_CAP = 200/);
});
test("The request validation must accept a genuine ISO date",()=>{
  assert.ok(file.includes(String.raw`/^\d{4}-\d{2}-\d{2}T/`));
  assert.ok(file.includes(String.raw`/^Bearer [A-Za-z0-9._~+\\/=-]{20,8000}$/`));
});
