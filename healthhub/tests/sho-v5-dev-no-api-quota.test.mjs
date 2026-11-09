import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root="sh9/smart-travel/public-transport/smart-trip/";
const server=readFileSync("supabase/functions/hh-smart-trip-universal-v1/index.ts","utf8");
const sql=readFileSync("supabase/migrations/20261109153000_sho_v5_development_usage_counter_without_quota.sql","utf8");
const html=readFileSync(root+"index.html","utf8");
const browser=readFileSync(root+"v5/universal/smart-trip-v5-api-ui.mjs","utf8");

test("DEV: user explicitly authorizes each API call, never automatic google calls",()=>{
 assert.match(server,/DEV_TEST_ENABLED=true/);
 assert.match(server,/hh_smart_trip_google_reserve_dev/);
 assert.doesNotMatch(server,/p_expected_daily_used:0/);
 assert.doesNotMatch(server,/PILOT_UNTIL/);
 assert.match(server,/if\(!await auth\(req,/);
 assert.match(server,/req\.headers\.get\("origin"\)!==TRUSTED_ORIGIN/);
 assert.match(server,/if\(validated.mode==="diagnose"\)/);
 assert.match(server,/quota=await reserveOne/);
 assert.ok(server.indexOf("quota=await reserveOne")<server.indexOf("await providerRequest("));
 assert.doesNotMatch(server,/api\.openai\.com|chat\/completions|hh_my_trip_packs|\.insert\(/);
});
test("DEV: preserve accounting while disabling ALL application daily/monthly caps",()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.hh_smart_trip_google_reserve_dev\(\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/used=used\+1/);
 assert.doesNotMatch(sql,/dc\s*>=\s*\d+|mc\s*>=\s*\d+|dc\s*<>\s*p_expected_daily_used/);
 assert.match(sql,/REVOKE ALL.*PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE.*service_role/);
 assert.doesNotMatch(server,/daily_one_run_or_quota_exceeded/);
 assert.doesNotMatch(server,/row\.daily_used!==1/);
 assert.match(server,/development_usage_accounting_unavailable/);
});
test("DEV: visible test UI clearly states cost, user confirmation and no quotas",()=>{
 assert.match(html,/nincs SHO-s napi vagy havi API-kvótakorlát/);
 assert.match(html,/Google Routes API keresés/);
 assert.doesNotMatch(html,/max\. 1 kérés|legfeljebb 1 Google Routes-hívás naponta|2026\. november 12-én/);
 assert.match(html,/v=6-collapsed-walk-steps/);
 assert.match(browser,/development_usage_accounting_unavailable/);
 assert.doesNotMatch(browser,/daily_one_run_or_quota_exceeded/);
 assert.match(browser,/st22V5ApiConsent/);
 assert.match(browser,/st22V5ApiDiagnose/);
 assert.match(browser,/st22V5ApiSearch/);
 assert.match(browser,/if\(mode==="search"\)clearResults\(\)/);
 assert.doesNotMatch(browser,/busy=true;ready=false;clearResults\(\);clearLena\(\)/);
});
test("Production launch still needs explicit new release and quota review",()=>{
 assert.match(server,/production:false/);
 assert.match(server,/Go-live must replace this/);
 assert.match(sql,/Existing hh_smart_trip_google_reserve\(\) and _pilot\(\) remain unchanged/);
 assert.match(browser,/evaluateIndependentBkk/);
 assert.match(browser,/evaluateIndependentMav/);
});
