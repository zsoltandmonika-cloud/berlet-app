// HealthHub Intelligence v388: regression tests without real personal health data.
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sandbox={window:{},console};
vm.runInNewContext(fs.readFileSync('healthhub/live-v388-intelligence.js','utf8'),sandbox);
const gate=sandbox.window.HH_INTELLIGENCE_GATE_V388;
const now=Date.parse('2026-10-11T16:10:00+02:00');
function req(profile='monika'){return {
 schema:'healthhub.ask-lena/1',profile,consent:true,question:'Mennyi volt a mai aktivitásom?',
 sources:[
  {id:'activity',title:'Aktivitás',status:'available',entries:[{name:'Aktív perc',value:'39',observedAt:'2026-10-11'}]},
  {id:'vitals',title:'Mérések',status:'available',entries:[{name:'Vérnyomás',value:'125/82',observedAt:'2026-10-08T08:00:00+02:00'}]}
 ],extra:[{domain:'activity',label:'Mai lépések',value:'6021',at:'2026-10-11'}]
};}
function ctx(exportAt,profile='monika'){return {profile,generatedAt:'2026-10-11T16:09:00+02:00',
  healthConnect:{exportedAt:exportAt},sleep:{recent:[]}}}
{
 const original=req(),snapshot=JSON.stringify(original);
 const result=gate.prepare(original,ctx('2026-10-11T12:28:00+02:00'),{now});
 assert.equal(result.payload.sources[0].status,'stale');
 assert.ok(result.flags.some(f=>f.code==='activity_not_fresh'));
 assert.ok(result.flags.some(f=>f.code==='vitals_not_recent'));
 assert.ok(result.payload.extra.some(x=>x.domain==='device'&&x.label.includes('Health Connect export')));
 assert.equal(JSON.stringify(original),snapshot,'no mutation to health records or request');
 assert.ok(JSON.stringify({sources:result.payload.sources,extra:result.payload.extra}).length<=18000);
}
{
 const result=gate.prepare(req(),ctx('2026-10-11T16:05:00+02:00'),{now});
 assert.equal(result.payload.sources[0].status,'available','fresh HC export is not mislabeled stale');
 assert.ok(!result.flags.some(f=>f.code==='activity_not_fresh'));
}
{
 assert.throws(()=>gate.prepare(req(),ctx('2026-10-11T16:05:00+02:00','zsolt'),{now}),/profilütközés/);
 assert.throws(()=>gate.prepare({...req(),consent:false},null,{now}),/engedélyezett/);
}
{
 const result=gate.prepare(req(),ctx('2026-10-11T16:05:00+02:00'),{now});
 assert.ok(!JSON.stringify(result).includes('dropbox_refresh_token'));
 assert.equal(result.payload.profile,'monika');
}
console.log('PASS Intelligence v388: freshness, provenance, no cross-profile use, consent, non-mutation');
