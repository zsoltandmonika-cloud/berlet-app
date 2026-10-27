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
 assert.match(src,/github_account_permission_denied/);
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
 assert.match(html,/github-billing-v873\.js\?v=876-inline-vault/);
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

test('v876 loads existing Health Vault dialog in Usage Center without leaving the page',()=>{
 const html=fs.readFileSync(path.join(ROOT,'usage-control/index.html'),'utf8');
 const src=fs.readFileSync(path.join(ROOT,'usage-control/github-billing-v873.js'),'utf8');
 assert.match(html,/id="githubBillingVaultLoginV876"/);
 assert.match(html,/central-vault\/daily-health-sync\.js\?v=876-billing-inline-vault/);
 assert.ok(html.indexOf('central-vault/config.js')<html.indexOf('central-vault/daily-health-sync.js?v=876'));
 assert.ok(html.indexOf('daily-health-sync.js?v=876')<html.indexOf('github-billing-v873.js?v=876'));
 assert.match(src,/api\.openLogin\(\)/);
 assert.match(src,/api\.request\('\/rest\/v1\/hh_profiles\?select=profile_key'\)/);
 assert.doesNotMatch(src,/Lépj be a fő Admin felületen/);
 assert.doesNotMatch(src,/refresh_token\s*:/);
});
test('v876 missing session opens native Health Vault modal from Billing click (same tab)',async()=>{
 const vm=require('node:vm');
 const js=fs.readFileSync(path.join(ROOT,'usage-control/github-billing-v873.js'),'utf8');
 let loggedIn=false,openCount=0,refreshRequests=0;
 const listeners={},elements={};
 for(const id of ['githubBillingReadV873','githubBillingRowsV873','githubBillingStatusV873',
                  'githubBillingVaultLoginV876','month']){
  elements[id]={value:id==='month'?'2026-10':'',textContent:'',disabled:false,handlers:{},
   replaceChildren(){},addEventListener(type,fn){this.handlers[type]=fn;}};
 }
 const makeSession=()=>({
   access_token:'eyJ'+('a'.repeat(80)),expires_at:Math.floor(Date.now()/1000)+3600
 });
 const vaultSession={};
 const w={
   HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_public_test_value'},
   HH_DAILY_HEALTH_SYNC_V319:{
      openLogin(){openCount++},
      request:async()=>{refreshRequests++;throw new Error('no session')}
   },
   sessionStorage:{getItem:k=>vaultSession[k]||null,setItem:(k,v)=>{vaultSession[k]=v}},
   localStorage:{getItem:()=>null},
   addEventListener(name,fn){listeners[name]=fn}
 };
 const d={readyState:'complete',getElementById:id=>elements[id]};
 vm.runInNewContext(js,{window:w,document:d,Intl,Date,JSON,Number,String,Array,RegExp,Math});
 assert.equal(openCount,0);
 await elements.githubBillingReadV873.handlers.click();
 assert.equal(openCount,1);
 assert.equal(refreshRequests,1);
 assert.match(elements.githubBillingStatusV873.textContent,/ezen az oldalon/);
 elements.githubBillingVaultLoginV876.handlers.click();
 assert.equal(openCount,2);
 vaultSession['hh-supabase-health-session-v1']=JSON.stringify(makeSession());
 listeners['healthhub:central-auth-changed']();
 assert.match(elements.githubBillingStatusV873.textContent,/bejelentkezve/);
 assert.equal(w.location,undefined,'No navigation to Main Admin');
});


test('v878 Billing before/after baseline is sourced to observed Oct 27 snapshot, not a fabricated savings figure',()=>{
 const api=require(path.join(ROOT,'usage-control/github-before-after-v878.js'));
 assert.equal(api.BASE.linuxMinutes,21184);
 assert.equal(api.BASE.grossUSD,127.15);
 assert.equal(api.BASE.billedUSD,0);
 assert.equal(api.BASE.measuredAt,'2026-10-27T09:11:06Z');
 const initial=api.calculate(null);
 assert.equal(initial.status,'no_measurement');
 assert.ok(initial.beforeRate>700&&initial.beforeRate<900);
 const html=fs.readFileSync(path.join(ROOT,'usage-control/index.html'),'utf8');
 assert.match(html,/id="sh9GitHubCompareV878"/);
 assert.match(html,/github-before-after-v878\.js\?v=878-measured-comparison/);
 assert.match(html,/sh9:github-billing-measured/);
});
test('v878 normalizes partial October intervals by elapsed days and never invents dollar savings',()=>{
 const api=require(path.join(ROOT,'usage-control/github-before-after-v878.js'));
 const base={schema:'sh9.github.billing/1',period:'2026-10',currency:'USD',verified:true,
   measuredAt:'2026-10-29T09:11:06Z',actionsLinuxMinutes:22000,grossAmount:132,netAmount:0};
 const now=Date.parse('2026-10-30T10:00:00Z');
 const result=api.calculate(base,now);
 assert.equal(result.status,'measured');
 assert.equal(result.afterMinutes,816);
 assert.equal(result.afterRate,408);
 assert.ok(result.rateChangePct < -40);
 assert.equal(result.netUSD,0);
 assert.ok(!Object.keys(result).some(k=>/usdSaved|savedDollars|claimedSavedUSD/i.test(k)));
 const early={...base,measuredAt:'2026-10-27T12:11:06Z',actionsLinuxMinutes:21300};
 assert.equal(api.calculate(early,now).status,'pending');
 assert.equal(api.calculate({...base,actionsLinuxMinutes:21000},now).status,'inconsistent');
 assert.equal(api.calculate({...base,verified:false},now).status,'no_measurement');
});
test('v878 local comparison stores aggregates only and uses DST-aware Hungarian month start',()=>{
 const api=require(path.join(ROOT,'usage-control/github-before-after-v878.js'));
 const records=new Map();
 const storage={setItem:(key,val)=>records.set(key,val),getItem:key=>records.get(key)||null};
 const sample={schema:'sh9.github.billing/1',period:'2026-10',currency:'USD',verified:true,
   measuredAt:'2026-10-27T09:11:06Z',actionsLinuxMinutes:21184,grossAmount:127.15,netAmount:0,
   topSkus:[{sku:'PRIVATE DETAILS'}],unrelatedToken:'must-not-store'};
 assert.equal(api.save(storage,sample),true);
 const serialized=[...records.values()][0];
 assert.doesNotMatch(serialized,/PRIVATE DETAILS|must-not-store|topSkus|token/i);
 assert.equal(api.load(storage,'2026-10').grossAmount,127.15);
 assert.equal(api.load(storage,'2026-11'),null);
 assert.equal(api.monthStart('2026-10'),Date.parse('2026-09-30T22:00:00Z'));
 assert.equal(api.monthStart('2026-11'),Date.parse('2026-10-31T23:00:00Z'));
 const js=fs.readFileSync(path.join(ROOT,'usage-control/github-before-after-v878.js'),'utf8');
 assert.doesNotMatch(js,/fetch\(|setInterval\(|setTimeout\(|github_pat_|ghp_[A-Za-z0-9]{20,}/);
});
