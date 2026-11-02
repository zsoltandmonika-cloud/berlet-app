'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'usage-control/puter-usage-v880.js'),'utf8');
const html=fs.readFileSync(path.join(root,'usage-control/index.html'),'utf8');
const api=require(path.join(root,'usage-control/puter-usage-v880.js'));
const DATE='2026-11-02T10:30:00Z';
test('Puter is a distinct SH9 provider with user-initiated controls',()=>{
 assert.match(html,/id:'puter',name:'Puter'/);
 assert.match(html,/id="puterUsageV880"/);
 assert.match(html,/id="puterConnectV880"/);
 assert.match(html,/id="puterUsageReadV880"/);
 assert.match(html,/id="puterUsageSummaryV880"/);
 assert.match(html,/puter-usage-v880\.js\?v=880-puter-account-usage/);
 assert.match(src,/read\.addEventListener\('click',measure\)/);
 assert.match(src,/login\.addEventListener\('click',signIn\)/);
 assert.doesNotMatch(src,/setInterval|localStorage|sessionStorage|API_KEY|service_role/);
});
test('Monthly credit is account allowance, not a billed charge',()=>{
 const result=api.normalize({
  allowanceInfo:{monthUsageAllowance:300000000,remaining:180000000},
  usage:{'ai.chat':{count:12,cost:800000}},
  appTotals:{app1:{count:12,total:800000}}
 },{used:1073741824,capacity:5368709120},DATE);
 assert.equal(result.schema,'sh9.puter.usage/1');
 assert.equal(result.rows.length,2);
 assert.equal(result.rows[0].used,1.2);
 assert.equal(result.rows[0].limit,3);
 assert.equal(result.rows[0].unit,'USD kredit / hó');
 assert.equal(result.rows[0].provider,'puter');
 assert.equal(result.rows[0].source,'Puter auth.getMonthlyUsage');
 assert.equal(result.rows[0].period,'2026-11');
 assert.equal(result.display.remainingUSD,1.8);
 assert.equal(result.display.api[0].count,12);
 assert.equal(result.display.api[0].usedUSD,0.008);
 assert.equal(result.display.apps[0].usedUSD,0.008);
 assert.equal(result.rows[1].unit,'GB tárhely');
 assert.equal(result.rows[1].used,1);
 assert.equal(result.rows[1].limit,5);
 assert.equal(result.rows[1].source,'Puter fs.space');
 assert.ok(html.includes("r.source==='Dropbox /users/get_space_usage'"));
 assert.ok(html.includes("'Puter auth.getMonthlyUsage','Puter fs.space'"));
 assert.ok(!result.rows.some(x=>/számlázott|költség/i.test(x.metric)));
});
test('Invalid or absent allowance cannot become invented usage',()=>{
 const invalid=api.normalize({allowanceInfo:{monthUsageAllowance:100,remaining:200}},null,DATE);
 assert.equal(invalid.rows.length,0);assert.equal(invalid.display.creditValid,false);
 const empty=api.normalize({usage:{}},null,DATE);
 assert.equal(empty.rows.length,0);
 const storage=api.normalize({allowanceInfo:{monthUsageAllowance:0,remaining:0}},
  {used:1024,capacity:1073741824},DATE);
 assert.equal(storage.rows.length,1);assert.equal(storage.rows[0].metric,'Puter teljes fióktárhely');
 assert.throws(()=>api.normalize({},null,'not-a-date'),/Érvénytelen mérési időpont/);
});
test('The per-app breakdown is not treated as account-wide costs',()=>{
 const x=api.normalize({allowanceInfo:{monthUsageAllowance:100000000,remaining:100000000},
  usage:{'ai.chat':{count:1,cost:2500000}},
  appTotals:{another:{count:1,total:2500000}}},null,DATE);
 assert.equal(x.rows.length,1);
 assert.equal(x.rows[0].used,0);
 assert.equal(x.display.api[0].usedUSD,0.025);
 assert.match(html,/alkalmazásszintű API-bontás nem fiókszintű összesítő/);
 assert.match(src,/current calling.app/);
 assert.doesNotMatch(src,/getDetailedAppUsage\(/);
});
