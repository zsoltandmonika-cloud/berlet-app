'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
async function core(){return import('file://'+path.join(ROOT,'../supabase/functions/hh-github-billing-v873/billing-core.mjs'))}
test('GitHub Billing original report sums original gross, discounts and net without inventing billed charges',async()=>{
 const {aggregateBilling}=await core();
 const data=aggregateBilling({usageItems:[
  {date:'2026-10-21',product:'Actions',sku:'Actions Linux',unitType:'minutes',quantity:20983,grossAmount:125.90,discountAmount:125.90,netAmount:0},
  {date:'2026-10-21',product:'Actions',sku:'Actions Storage',unitType:'GB-hours',quantity:123.47,grossAmount:.04,discountAmount:.04,netAmount:0}
 ]},'2026-10','2026-10-27T07:00:00Z');
 assert.equal(data.grossAmount,125.94);
 assert.equal(data.discountAmount,125.94);
 assert.equal(data.netAmount,0);
 assert.equal(data.actionsLinuxMinutes,20983);
 assert.equal(data.actionsStorageGBHours,123.47);
 assert.equal(data.currency,'USD');
 assert.equal(data.topSkus.length,2);
 assert.equal(data.lineItemCount,2);
});
test('Billing fail-closed for malformed, incomplete, or oversized report',async()=>{
 const {aggregateBilling,monthQuery}=await core();
 assert.deepEqual(monthQuery('2026-10'),{year:2026,month:10});
 assert.throws(()=>monthQuery('2026-13'),/month/);
 assert.throws(()=>aggregateBilling({},'2026-10'),/invalid/);
 assert.throws(()=>aggregateBilling({usageItems:[{}]},'2026-10'),/invalid/);
 assert.throws(()=>aggregateBilling({usageItems:[{product:'Actions',sku:'Linux',unitType:'minutes',grossAmount:1,discountAmount:0}]},'2026-10'),/invalid_amount/);
 assert.throws(()=>aggregateBilling({usageItems:Array(5001).fill({})},'2026-10'),/oversize/);
});
test('Edge gateway has strict origin, JWT, RLS-gated membership, bounded response and no secret exposure',()=>{
 const src=fs.readFileSync(path.join(ROOT,'../supabase/functions/hh-github-billing-v873/index.ts'),'utf8');
 assert.match(src,/HH_GITHUB_BILLING_PAT/);
 assert.match(src,/get\("authorization"\)/);
 assert.match(src,/\/auth\/v1\/user/);
 assert.match(src,/\/rest\/v1\/hh_profile_access/);
 assert.match(src,/github_plan_read_required/);
 assert.match(src,/get\("origin"\)/);
 assert.match(src,/origin!==ORIGIN/);
 assert.match(src,/monthQuery\(month\)/);
 assert.match(src,/size>1200000/);
 assert.match(src,/cache\.set\(key/);
 assert.doesNotMatch(src,/service_role|SUPABASE_SERVICE_ROLE_KEY|setInterval\(|user_metadata|console\.log/);
 assert.match(src,/github_billing_gateway_failed/);
});
test('Mobile UI exposes explicit Billing button, never PAT, and reuses Central Vault',()=>{
 const html=fs.readFileSync(path.join(ROOT,'usage-control/index.html'),'utf8');
 const js=fs.readFileSync(path.join(ROOT,'usage-control/github-billing-v873.js'),'utf8');
 assert.match(html,/id="githubBillingReadV873"/);
 assert.match(html,/id="githubBillingRowsV873"/);
 assert.match(html,/github-billing-v873\.js\?v=874-billing-errors/);
 assert.match(html,/central-vault\/config\.js/);
 assert.match(html,/sh9:github-billing-measured/);
 assert.match(html,/@media\(max-width:750px\)/);
 assert.match(js,/hh-supabase-health-session-v1/);
 assert.match(js,/hh-health-vault-trusted-device-v332/);
 assert.match(js,/button\.addEventListener\('click'/);
 assert.match(js,/\/functions\/v1\/hh-github-billing-v873/);
 assert.match(js,/getSession\(\)/);
 assert.doesNotMatch(js,/setInterval\(|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/);
 assert.doesNotMatch(html,/github_pat_[A-Za-z0-9_]{20,}|sk-proj-/);
});

test('v874 distinguishes invalid token, 403 permission, account limitation and GitHub rate limit',()=>{
 const server=fs.readFileSync(path.join(ROOT,'../supabase/functions/hh-github-billing-v873/index.ts'),'utf8');
 const browser=fs.readFileSync(path.join(ROOT,'usage-control/github-billing-v873.js'),'utf8');
 for(const code of ['github_token_invalid','github_account_permission_denied','github_access_forbidden',
 'github_rate_limited','github_billing_account_unavailable','github_sso_required']){
  assert.ok(server.includes(code),'server not mapping '+code);
  assert.ok(browser.includes(code),'browser not mapping '+code);
 }
 assert.match(server,/x-ratelimit-remaining/);
 assert.match(server,/resource not accessible by personal access token/);
 assert.match(server,/enhanced billing/);
 assert.doesNotMatch(server,/github_plan_read_required/);
 assert.doesNotMatch(browser,/github_plan_read_required/);
 assert.match(browser,/Plan → Read-only/);
});
