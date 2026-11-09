'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluate}=require('../housekeeping/housekeeping-gate-v1.cjs');
const NOW=Date.parse('2026-11-09T10:00:00Z'),ts=(minutes)=>new Date(NOW-minutes*60*1000).toISOString();
const Z='android-12345678-1234-1234-1234-123456789abc',M='android-87654321-4321-4321-4321-cba987654321';
function ok(){
 const src=()=>({familyGuard:{validated:true,lastSuccessfulAt:ts(2)},
  dropbox:{validated:true,lastSuccessfulAt:ts(2)},
  healthConnect:{validated:true,lastSuccessfulAt:ts(15)}});
 return {
  capturedAt:ts(1),
  centralDevices:[
   {profile_key:'zsolt',device_id:Z,verified_at:ts(20),last_seen_at:ts(2),state:'online'},
   {profile_key:'monika',device_id:M,verified_at:ts(20),last_seen_at:ts(2),state:'online'}
  ],
  gps:{
   zsolt:{source:'HH One Native GPS',validated:true,accuracy_m:20,updated_at:ts(2)},
   monika:{source:'HH One Native GPS',validated:true,accuracy_m:40,updated_at:ts(2)}
  },
  sync:{zsolt:src(),monika:src()},
  backup:{confirmedAt:ts(30),restoreTested:true,accounts:['zsolt','monika']},
  legacyAccounts:[
   {account:'Zsolt Dropbox',activePhones:{zsolt:Z,monika:null},archived:[],
    devices:[
     {deviceId:Z,deviceType:'android'},
     {deviceId:'web-test-unused-1',deviceType:'web'},
     {deviceId:'android-11111111-2222-3333-4444-555555555555',deviceType:'android'}
    ]},
   {account:'Mónika Dropbox',activePhones:{zsolt:null,monika:M},archived:[],
    devices:[{deviceId:M,deviceType:'android'}]}
  ]
 };
}
test('green gates mean READY FOR HUMAN REVIEW, never permission to mutate',()=>{
 const report=evaluate(ok(),NOW);
 assert.equal(report.verdict,'READY_FOR_MANUAL_REVIEW');
 assert.equal(report.safeToMutateAutomatically,false);
 assert.equal(report.protectedCount,2);
 assert.equal(report.review.length,2);
 assert.ok(report.stages.length>=6);
});
test('Mónika not yet paired blocks cleanup; Zsolt must remain protected',()=>{
 const x=ok();x.centralDevices.pop();delete x.gps.monika;
 const r=evaluate(x,NOW);
 assert.equal(r.verdict,'BLOCKED');
 assert.ok(r.blockers.some(b=>b.key==='central-monika'));
 assert.ok(r.blockers.some(b=>b.key==='gps-monika'));
 assert.ok(r.preserve.some(d=>d.id===('…'+Z.slice(-12))));
});
test('old, false or inaccurate GPS never satisfies gate',()=>{
 for(const change of [
  x=>x.gps.monika.updated_at=ts(7),
  x=>x.gps.monika.accuracy_m=101,
  x=>x.gps.monika.validated=false,
  x=>x.gps.monika.source='browser',
 ]){
  const x=ok();change(x);
  assert.ok(evaluate(x,NOW).blockers.some(b=>b.key==='gps-monika'));
 }
});
test('stale heartbeat, duplicate native ID or unconfirmed backup blocks',()=>{
 const x=ok();x.centralDevices[0].last_seen_at=ts(30);
 assert.ok(evaluate(x,NOW).blockers.some(b=>b.key==='heartbeat-zsolt'));
 const y=ok();y.centralDevices[1].device_id=Z;
 assert.ok(evaluate(y,NOW).blockers.some(b=>b.key==='duplicate-identity'));
 const z=ok();z.backup.restoreTested=false;
 assert.ok(evaluate(z,NOW).blockers.some(b=>b.key==='backup-restore'));
});
test('never expose GPS coordinates or account tokens in housekeeping snapshot',()=>{
 for(const [k,v] of [['latitude',47.5],['refresh_token','secret'],['proof_hash','aaa']]){
  const x=ok();x.gps.monika[k]=v;
  assert.throws(()=>evaluate(x,NOW),/Érzékeny adat/);
 }
});
test('a different legacy ID is review-only, not overwritten or deleted',()=>{
 const x=ok();
 x.legacyAccounts[1].activePhones.monika='android-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
 const report=evaluate(x,NOW);
 assert.equal(report.safeToMutateAutomatically,false);
 assert.ok(report.review.some(r=>r.decision==='REGISZTERELTÉRÉS'));
 assert.equal(x.legacyAccounts[1].activePhones.monika,'android-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
});
