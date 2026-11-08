'use strict';
const test=require("node:test"),assert=require("node:assert/strict"),
 fs=require("node:fs"),path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(ROOT,"usage-control/index.html"),"utf8");
const client=fs.readFileSync(path.join(ROOT,"usage-control/google-routes-usage-v881.js"),"utf8");
const edge=fs.readFileSync(path.join(ROOT,"../supabase/functions/hh-smart-trip-usage-v881/index.ts"),"utf8");
const api=require("../usage-control/google-routes-usage-v881.js");
const datum={schema:"sh9.smart-trip.usage/1",source:"supabase_first_party_quota",
 measuredAt:"2026-11-08T06:30:00Z",period:"2026-11",timezone:"UTC",
 day:{date:"2026-11-08",reservations:4,limit:20},
 month:{reservations:4,limit:200},
 pilot:{maxRunsPerUTCDay:1,requestsPerRun:3},
 actualGoogleRequests:null,actualGoogleBillingUSD:null,billingSku:null};
test("Usage Control retains existing controls and adds Google monthly quota panel",()=>{
 for(const value of ['id="services"','id="kpis"','id="dropboxUsageRead"',
  'id="puterUsageReadV880"','id="githubBillingReadV873"',
  'id="googleRoutesUsageV881"','id="googleRoutesUsageReadV881"',
  'id="googleRoutesUsageStatusV881"','id="googleRoutesUsageRowsV881"'])
  assert.ok(html.includes(value),"missing "+value);
 assert.match(html,/google-routes-usage-v881\.js\?v=881-google-routes-quota-v1/);
 assert.match(html,/google-routes-track/);
 assert.match(html,/googleRoutesRows/);
 assert.match(html,/BASE\.concat\(manual,observed,billingRows,googleRoutesRows\)/);
 assert.match(html,/sh9:google-routes-usage-measured/);
 assert.match(html,/r\.source==='Supabase quota reservations · nem Google Billing'/);
 assert.match(html,/function csvCell\(v\)/);
 assert.match(html,/monthRows\(\)\.map\(r=>/);
});
test("Counter data is sourced first-party, not Google invoice nor a fake dollar amount",()=>{
 assert.equal(api.valid(datum,"2026-11"),true);
 assert.equal(api.valid({...datum,actualGoogleBillingUSD:0},"2026-11"),false);
 assert.equal(api.valid({...datum,actualGoogleRequests:4},"2026-11"),false);
 assert.equal(api.valid({...datum,month:{reservations:-1,limit:200}},"2026-11"),false);
 assert.equal(api.valid({...datum,period:"2026-10"},"2026-11"),false);
 assert.equal(api.valid({...datum,day:null},"2026-11"),true);
 assert.equal(api.scenario(4,"Essentials").hypotheticalUSD,0);
 assert.equal(api.scenario(4,"Pro").hypotheticalUSD,0);
 assert.equal(api.scenario(11000,"Essentials").hypotheticalUSD,5);
 assert.equal(api.scenario(5500,"Pro").hypotheticalUSD,5);
 assert.equal(api.scenario(4,"UNKNOWN"),null);
});
test("Client displays actual used versus monthly limit and percent, without polling",()=>{
 for(const word of ["Havi keret kihasználtsága","Hátralévő havi keret",
  "Havi felhasználás: ","google-routes-track","aria-valuenow",
  "A Google 5 USD-s költségriasztása nem automatikus költési plafon"])
  assert.ok(client.includes(word),"missing "+word);
 assert.match(client,/button\.addEventListener\("click"/);
 assert.match(client,/win\.fetch\(ENDPOINT/);
 assert.match(client,/hh-supabase-health-session-v1/);
 assert.match(client,/Google számlázott/);
 assert.doesNotMatch(client,/setInterval\(|setTimeout\(.*fetch|localStorage\.setItem|sessionStorage\.setItem|\.innerHTML|GOOGLE_ROUTES_KEY|service_role|sb_secret_/);
});
test("New Edge report endpoint is authenticated, read-only, no Google API usage",()=>{
 assert.match(edge,/auth\.getUser\(bearer\.slice\(7\)\)/);
 assert.match(edge,/hh_profile_access/);
 assert.match(edge,/\.in\("profile_key",\["zsolt","monika"\]\)/);
 assert.match(edge,/hh_smart_trip_google_quota/);
 assert.match(edge,/period_kind,period_start,used/);
 assert.match(edge,/schema:"sh9\.smart-trip\.usage\/1"/);
 assert.match(edge,/actualGoogleRequests:null,actualGoogleBillingUSD:null,billingSku:null/);
 assert.match(edge,/source:"supabase_first_party_quota"/);
 assert.match(edge,/if\(!await authorize\(req\)\)/);
 assert.match(edge,/req\.headers\.get\("origin"\)!==ORIGIN/);
 assert.match(edge,/method_not_allowed/);
 assert.doesNotMatch(edge,/HH_SMART_TRIP_GOOGLE_ROUTES_KEY|X-Goog-Api-Key|routes\.googleapis\.com|computeRoutes|\.rpc\(|\.insert\(|\.upsert\(|\.update\(|console\.log/);
});
