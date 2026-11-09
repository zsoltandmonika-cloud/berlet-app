import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root="sh9/smart-travel/public-transport/smart-trip/";
const html=readFileSync(root+"index.html","utf8");
const ctrl=readFileSync(root+"smart-trip-ai-v1022.js","utf8");
const ui=readFileSync(root+"v5/universal/smart-trip-v5-inline-v1.mjs","utf8");
const server=readFileSync("supabase/functions/hh-smart-trip-universal-v1/index.ts","utf8");

test("entire V5 confirmation/diagnostic screen is gone; results stay inside existing planner",()=>{
 for(const old of ["st22V5ApiDialog","st22V5ApiConsent","st22V5ApiDiagnose",
  "st22V5ApiSearch","st22V5LenaPanel","st22V5Test"])
  assert.doesNotMatch(html,new RegExp(old));
 assert.match(html,/id="st22Results"/);
 assert.match(html,/id="st22JourneyList"/);
 assert.match(html,/id="st22Status"/);
 assert.match(html,/id="st22V5CostNote"/);
 assert.match(html,/smart-trip-v5-inline-v1\.mjs\?v=2-brands-ticket-timeline/);
 assert.doesNotMatch(html,/smart-trip-v5-api-ui\.mjs/);
 assert.match(ctrl,/response\?\.status==='started'/);
 assert.match(ctrl,/if\(results\)results\.hidden=false/);
});

test("Google calls occur only from explicit Smart Trip submit, not typing or prefetch",()=>{
 assert.match(ctrl,/if\(method==='google_api_v5'\)/);
 assert.match(ctrl,/SH9_SMART_TRIP_V5_API\?\.open/);
 assert.match(ui,/body:JSON\.stringify\(\{mode:"search",consent:true,query\}\)/);
 assert.match(ui,/if\(active\)return \{status:"started"\}/);
 assert.match(ui,/nodes\.search\.disabled=true/);
 assert.match(ui,/void run\(prepared\.query,token,controller\)/);
 assert.match(ui,/provider\?\.addEventListener\("change",\(\)=>/);
 assert.match(ui,/el\.addEventListener\("input",cancel\)/);
 assert.doesNotMatch(ui,/showModal|setInterval|mode:"diagnose"|\.insert\(|\.upsert\(/);
 assert.match(ui,/29000/);
});

test("authenticated, access-controlled, metered backend remains intact",()=>{
 assert.match(ui,/hh-guardian-family-auth-v785/);
 assert.match(ui,/db\.auth\.getSession\(\)/);
 assert.match(ui,/hh-smart-trip-universal-v1/);
 assert.match(server,/if\(!await auth\(req,/);
 assert.match(server,/quota=await reserveOne/);
 assert.match(server,/hh_smart_trip_google_reserve_dev/);
 assert.match(server,/DEV_TEST_ENABLED=true/);
});

test("Google response is displayed from a separate source, walking summarized and no model connection",()=>{
 const visual=readFileSync(root+"v5/universal/smart-trip-v5-premium-render-v1.mjs","utf8");
 assert.match(visual,/summarizeGoogleWalks\(route\)/);
 assert.match(visual,/walkSectionLabel\(part\.phase\)/);
 assert.match(visual,/summary\.totalWalkMeters/);
 assert.match(visual,/summary\.transfers/);
 assert.match(visual,/Google Maps/);
 assert.match(visual,/My Trips mentés nincs/);
 assert.doesNotMatch(ui,/api\.openai\.com|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(ui,/evaluateIndependentBkk|evaluateIndependentMav/);
});
