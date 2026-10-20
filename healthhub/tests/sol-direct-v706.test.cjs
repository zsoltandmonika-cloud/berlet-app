#!/usr/bin/env node
'use strict';
// Sol v706 synthetic UI flow, no patient data, secrets or OpenAI requests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const code=fs.readFileSync(path.resolve(__dirname,'../live-v331.js'),'utf8');
const from=code.indexOf('async function runSolDirect(');
const to=code.indexOf('async function run(opts){',from);
assert(from>0&&to>from,'dedicated direct Sol function present');
const fn=code.slice(from,to);
const entry=code.slice(to,to+3200);
assert(entry.indexOf("return runSolDirect(question,p,q,result,err)")>0);
assert(entry.indexOf("return runSolDirect(question,p,q,result,err)")<entry.indexOf('var svc=window.HH_DAILY_HEALTH_SYNC_V319;'));
assert(entry.includes("new URLSearchParams(window.location.search).get('hhSolQA')==='v1'"));
assert(!fn.includes('showLocalAnswer('),'no offline fallback in direct Sol mode');
assert(!fn.includes('bridge.run('));
assert(!fn.includes('qualityEngine.preflight('));
assert(!fn.includes('evidence.prepare('));
assert(!fn.includes('clinicalEngine.assemble('));
assert(/renderAnswerText\(text,85000\)/.test(fn));
const question='Mi történt 2024. június 17-én?';
const sample='2024. június 17-én dokumentáltan történt egy súlyos esemény [D1:p1]. '.repeat(4);
const done={model:'gpt-6.1-sol',generatedAt:'2026-10-20T10:00:00Z',evidenceAudit:{
 mode:'sol-full-corpus-preview-v705',citationIdsValidated:true,sourceDocuments:164,
 sourcePages:269,totalSourcePages:269,unreadablePages:0,hashVerifiedPages:269,visualReviewPages:135,citedPages:1}};
function stream(events){
 const content=events.map(([event,data])=>'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n').join('');
 const chunks=[content.slice(0,23),content.slice(23,61),content.slice(61)];
 let pos=0;
 const reader={read:async function(){
  if(pos>=chunks.length)return {done:true};
  return {done:false,value:new TextEncoder().encode(chunks[pos++])};
 }};
 return {ok:true,headers:{get:()=> 'text/event-stream; charset=utf-8'},
  body:{getReader:()=>reader}};
}
function harness({consent=true,authenticated=true,allowed=true,response=stream([['delta',{text:sample}],['done',done]])}={}){
 const texts=[],errors=[],calls=[],events=[];
 const elements={
 hhAi331Text:{textContent:''},hhAi331Foot:{textContent:''},
 hhRun299:{disabled:false}
 };
 const result={classList:{add:()=>{},remove:()=>{}}};
 const q={disabled:false,blur:()=>{}};
 const svc={
  getStatus:()=>({authenticated,authorizedProfiles:allowed?['monika']:[]}),
  openLogin:()=>{},
  stream:async(...args)=>{calls.push(args);return response}
 };
 const ctx={
  epoch:0,active:null,AbortController,TextDecoder,TextEncoder,Date,Number,
  window:{HH_DAILY_HEALTH_SYNC_V319:svc,confirm:()=>consent,dispatchEvent:x=>events.push(x.type)},
  CustomEvent:function(type){this.type=type;},
  el:id=>elements[id]||null,
  profile:()=> 'monika',
  renderAnswerText:(text,limit)=> texts.push({text,limit}),
  setTimeout:(cb)=>{if(typeof cb==='function')cb();},
  alignAnswerTop:()=>{},
  print:()=>{},
  safe:(x,max)=>String(x).slice(0,max||200),
  showError:x=>errors.push(x),
  errorText:(x,status)=>String(x||status)
 };
 vm.runInNewContext(fn+';this.exposed=runSolDirect;',ctx);
 return {run:()=>ctx.exposed(question,'monika',q,result,null),calls,errors,texts,events,q};
}
(async()=>{
 const good=harness();await good.run();
 assert.equal(good.calls.length,1,'exactly one server call');
 assert.equal(good.calls[0][0],'/functions/v1/hh-sol-full-corpus-preview');
 assert.equal(good.calls[0][1].fullCorpusConsent,true);
 assert.equal(good.calls[0][1].profile,'monika');
 assert.equal(good.calls[0][1].question,question);
 assert.equal(good.calls[0][1].sources,undefined,'does not send legacy health data');
 assert.equal(good.calls[0][1].documentEvidence,undefined,'backend owns source acquisition');
 assert.equal(good.errors.length,0,'valid model and audit must succeed');
 assert(good.texts.some(x=>x.text===sample&&x.limit===85000));
 assert(good.events.includes('healthhub:ask-lena-complete'));
 const no=harness({consent:false});await no.run();assert.equal(no.calls.length,0);
 const auth=harness({authenticated:false});await auth.run();assert.equal(auth.calls.length,0);
 const forbidden=harness({allowed:false});await forbidden.run();assert.equal(forbidden.calls.length,0);
 const err=harness({response:stream([['error',{error:'sol_preview_failed',reason:'sol_api_400'}]])});
 await err.run();assert(err.errors[0].includes('sol_api_400'));assert.equal(err.events.includes('healthhub:ask-lena-complete'),false);
 const interrupted=harness({response:stream([['delta',{text:sample}]])});
 await interrupted.run();assert(interrupted.errors[0].includes('nem érkezett teljes'));assert(!interrupted.events.includes('healthhub:ask-lena-complete'));
 console.log('PASS: Sol v706 direct consented route, strict completion, no offline fallback, authenticated profile gate');
})().catch(e=>{console.error(e);process.exitCode=1});
