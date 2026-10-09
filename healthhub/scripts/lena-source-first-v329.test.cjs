#!/usr/bin/env node
'use strict';
/* v329: synthetic, local-only regression. No private data and no network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','live-v329.js'),'utf8');
function app(profile){
 const window={addEventListener:()=>{}};
 const document={documentElement:{dataset:{}},getElementById:()=>null};
 const localStorage={getItem:k=>k==='hh-profile'?(profile==='monika'?'m':'z'):null};
 vm.runInNewContext(src,{window,document,localStorage,Date,Math,Number,String,RegExp,Array,JSON,console},{filename:'live-v329.js'});
 return window.HH_LENA_LOCAL_ANSWER_V329;
}
function source(id,entries,status='available'){return{id,entries,status}}
const report={schema:'healthhub.intelligence.context/1',profile:'zsolt',question:'Miért fáj a fejem?',sources:[
 source('symptoms',[{name:'Fejfájás',value:'6 / 10',observedAt:'2026-10-08T13:05:00Z',detail:'Homlok / fejtető · Megszűnt'}]),
 source('vitals',[
  {name:'Vérnyomás',value:'141/88',unit:'Hgmm',observedAt:'2026-10-02T07:03:00Z'},
  {name:'Pulzus',value:'90',unit:'/perc',observedAt:'2026-10-02T07:03:00Z'},
  {name:'Véroxigén',value:'92',unit:'%',observedAt:'2026-10-08T23:21:00Z'}]),
 source('sleep',[]),source('activity',[]),
 source('environment',[
  {name:'Légnyomás-változás 6 óra',value:'5,5',unit:'hPa',observedAt:'2026-10-09T07:00:00Z'},
  {name:'Hőmérséklet',value:'14,2',unit:'°C',observedAt:'2026-10-09T07:00:00Z'}])
]};
const a=app('zsolt').compose(report,report.question);
assert.equal(a.mode,'deterministic-local-preview');
assert.equal(a.profile,'zsolt');
assert(a.facts.some(x=>x.text.includes('6 / 10')));
assert(a.facts.some(x=>x.text.includes('141/88 Hgmm')));
assert(a.facts.some(x=>x.text.includes('5,5 hPa')));
assert(a.assessment.some(x=>x.includes('nem mai mérés')));
assert(a.assessment.some(x=>x.includes('légnyomás')));
assert(a.warnings.some(x=>x.includes('92 %')&&x.includes('pulzoximéterrel')));
assert(a.warnings.some(x=>x.includes('112')));
assert(a.suggestions.length>=2);
assert.throws(()=>app('monika').compose(report,report.question),/Profilváltás/);
const empty=app('zsolt').compose({schema:'healthhub.intelligence.context/1',profile:'zsolt',sources:[],question:'Miért fáj a fejem?'},'Miért fáj a fejem?');
assert(!empty.facts.length);
assert(empty.assessment.some(x=>x.includes('nem talál ki számokat')));
console.log('HealthHub v329 source-first answer: all deterministic tests PASSED.');
