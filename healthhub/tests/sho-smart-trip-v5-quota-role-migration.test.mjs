import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync(
 "supabase/migrations/20261108015100_fix_smart_trip_google_quota_secret_key_role.sql","utf8"
);
test("Quota SQL uses service-role-only EXECUTE permission instead of obsolete JWT/session guard",()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.hh_smart_trip_google_reserve\(\)/);
 assert.match(sql,/SECURITY DEFINER/);
 assert.match(sql,/SET search_path TO ''/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.hh_smart_trip_google_reserve\(\) FROM PUBLIC, anon, authenticated;/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.hh_smart_trip_google_reserve\(\) TO service_role;/);
 assert.doesNotMatch(sql,/IF current_setting\('request\.jwt\.claim\.role'/);
 assert.doesNotMatch(sql,/session_user\s*<>\s*'service_role'/);
 assert.doesNotMatch(sql,/GRANT EXECUTE.* TO (?:PUBLIC|anon|authenticated)/);
});
test("Atomic quota protection is preserved without changing daily/monthly caps",()=>{
 assert.match(sql,/pg_catalog\.pg_advisory_xact_lock\(846207, 5200\)/);
 assert.match(sql,/IF dc >= 20 OR mc >= 200 THEN/);
 assert.match(sql,/INSERT INTO public\.hh_smart_trip_google_quota/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/SET used=used\+1/);
 assert.match(sql,/RETURN QUERY SELECT false,dc,mc/);
 assert.match(sql,/RETURN QUERY SELECT true,dc\+1,mc\+1/);
 assert.doesNotMatch(sql,/DROP\s+(?:TABLE|FUNCTION)|DISABLE ROW LEVEL SECURITY/i);
});
test("Google pilot still reserves quota before every paid provider request",()=>{
 const edge=readFileSync(
  "supabase/functions/hh-smart-trip-real-pilot-v1/index.ts","utf8"
 );
 assert.match(edge,/admin\.rpc\("hh_smart_trip_google_reserve"\)/);
 assert.ok(edge.indexOf("await reserveQuota(admin)")>0);
 assert.ok(edge.indexOf("await reserveQuota(admin)")<edge.indexOf("await fetchVariant(key,variant)"));
 assert.match(edge,/quota\.daily_used!==reserved/);
});
