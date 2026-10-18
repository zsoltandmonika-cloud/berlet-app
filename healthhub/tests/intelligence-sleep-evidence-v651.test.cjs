#!/usr/bin/env node
'use strict';
/* v651 synthetic Sleep evidence regression: never uses patient records or Dropbox credentials. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const now=Date.parse('2026-10-18T12:00:00Z');
const stamp=n=>new Date(n).toISOString();
function nights(count=7){
 const result=[];
 for(let i=0;i<count;i++){
  const d=Date.parse('2026-10-18T00:00:00Z')-i*86400000;
  result.push({id:'s'+i,startTime:stamp(d-2*3600000),endTime:stamp(d+6*3600000),sourcePackage:'synthetic'});
 }
 return result;
}
function fakeIDB(rows){
 return {open(){
  const request={};
  queueMicrotask(()=>{request.result={
   objectStoreNames:{contains:()=>true},close(){},
   transaction:()=>({objectStore:()=>({openCursor(){
    const r={};let at=0;
    function next(){
     queueMicrotask(()=>{
      if(at>=rows.length)r.result=null;
      else r.result={value:rows[at++],continue:next};
      if(r.onsuccess)r.onsuccess();
     });
    }
    next();return r;
   }})})
  };if(request.onsuccess)request.onsuccess();});
  return request;
 }};
}
function boot(opts={}){
 let calls=[];
 const vault=opts.vault===false?null:{
  connected:()=>true,async downloadJson(path){calls.push(path);if(opts.throwCloud)throw Error('offline');return opts.cloud}
 };
 let writes=0;
 const window={HH_DROPBOX_VAULT:vault,indexedDB:opts.imports?fakeIDB(opts.imports):undefined,
 localStorage:{setItem(){writes++;throw Error('Read-only violation')}}};
 const globals={window,Date,Map,Set,Number,String,Math,JSON,Array,RegExp,Promise,console};
 for(let file of ['healthhub/intelligence-sleep-evidence-v651.js','healthhub/live-v389-ledger.js','healthhub/live-v390-trends.js'])
  vm.runInNewContext(fs.readFileSync(file,'utf8'),globals,{filename:file});
 return {api:window.HH_SLEEP_EVIDENCE_V651,ledger:window.HH_INTELLIGENCE_LEDGER_V389,
 trends:window.HH_INTELLIGENCE_TRENDS_V390,calls,getWrites:()=>writes};
}
const input=(p='monika')=>({
 report:{profile:p,sources:[{id:'sleep',entries:[],status:'missing',detail:''},{id:'activity',entries:[],status:'missing'}]},
 context:{profile:p,sleep:{recent:[],d7:{avgDurationMin:null}},activity:{recent:[]},metrics:{},heartRate:{},healthConnect:{}}
});
(async()=>{
 {
  const rows=nights(),b=boot({cloud:{profile:'monika',exportedAt:stamp(now-1000),records:{sleepSessions:rows}}});
  const a=input(),beforeContext=JSON.stringify(a.context);
  const report=await b.api.reconcile(a.report,a.context,'monika',{now});
  const ctx=b.api.getContext('monika',a.context);
  assert.equal(ctx.sleep.recent.length,7);
  assert.equal(ctx.sleep.evidence.source,'Dropbox Health Connect');
  assert.equal(ctx.sleep.evidence.status,'verified');
  assert.deepEqual(b.calls,['/HealthHub/profiles/monika-health-connect.json']);
  assert.equal(report.sources[0].status,'available');
  assert.equal(report.sources[0].entries[0].value,'480');
  assert.equal(b.getWrites(),0);
  assert.equal(JSON.stringify(a.context),beforeContext,'Original Health Context must stay untouched');
 }
 {
  const rows=nights(),b=boot({cloud:{profile:'monika',exportedAt:stamp(now),records:{sleepSessions:rows}}});
  const a=input();await b.api.reconcile(a.report,a.context,'monika',{now});
  const c=b.api.getContext('monika',a.context);
  const ledger=b.ledger.build(c,'monika',{now});
  const trend=b.trends.calculate(ledger,c,{now});
  assert.equal(trend.metrics.sleep_minutes.windows.d7.current.presentDays,7,'7 nights in canonical Dropbox source must reach I-03');
  assert.equal(trend.metrics.sleep_minutes.windows.d7.current.coveragePercent,100);
 }
 {
  const a=input(),b=boot({cloud:{profile:'monika',records:{sleepSessions:[]}}});
  await b.api.reconcile(a.report,a.context,'monika',{now});
  assert.equal(b.api.getContext('monika',a.context).sleep.evidence.status,'verified-empty');
  assert.equal(a.report.sources[0].status,'missing');
 }
 {
  const x=nights();
  const imports=[
   {profile:'monika',importedAt:stamp(now-86400000),bundle:{records:{sleepSessions:x.slice(0,3)}}},
   {profile:'zsolt',importedAt:stamp(now),bundle:{records:{sleepSessions:nights(2)}}},
   {profile:'monika',importedAt:stamp(now),bundle:{records:{sleepSessions:x.slice(3)}}}
  ];
  const a=input(),b=boot({vault:false,imports});
  await b.api.reconcile(a.report,a.context,'monika',{now});
  const c=b.api.getContext('monika',a.context);
  assert.equal(c.sleep.recent.length,7,'All local imports should be aggregated, not latest only');
  assert.equal(c.sleep.evidence.source,'helyi Health Connect importok');
  assert.equal(b.api.getContext('zsolt',a.context),a.context,'No cross-profile evidence');
  assert.equal(b.getWrites(),0);
 }
 {
  const a=input(),b=boot({cloud:{profile:'zsolt',records:{sleepSessions:nights()}}});
  await assert.rejects(b.api.reconcile(a.report,a.context,'monika',{now}),/profile mismatch/);
 }
 {
  const a=input(),b=boot({vault:false});
  await b.api.reconcile(a.report,a.context,'monika',{now});
  assert.equal(b.api.getContext('monika',a.context).sleep.evidence.status,'unavailable');
  assert.ok(a.report.sources[0].detail.includes('nem ellenőrizhető'));
 }
 {
  const b=boot({vault:false}),valid=b.api.normalize([...nights(1),...nights(1),
   {startTime:stamp(now-10000000000),endTime:stamp(now-9999990000)}],now);
  assert.equal(valid.length,1,'Duplicate or obsolete sessions must be ignored');
 }
 console.log('Sleep Evidence v651: synthetic canonical cloud, seven nights, local fallback, privacy and safety PASSED.');
})().catch(e=>{console.error(e);process.exitCode=1});
