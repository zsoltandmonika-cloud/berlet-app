#!/usr/bin/env node
'use strict';
/* Synthetic-only: no real user data, cloud requests, AI API calls or secrets. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const sources={};
for(const file of ['ask-lena-safe-fallback-v511.js','live-v329.js','live-v330.js',
 'live-v393-research.js','intelligence-i06-narrative-v402.js','live-v331.js','index.html'])
 sources[file]=fs.readFileSync(path.join(base,file),'utf8');
const context={
 window:{addEventListener(){}},
 document:{documentElement:{dataset:{}},getElementById(){return null}},
 localStorage:{getItem(k){return k==='hh-profile'?'z':null}},
 Date,Math,Number,String,JSON,Array,Set,Map,console
};
vm.createContext(context);
for(const file of ['live-v329.js','live-v330.js','ask-lena-safe-fallback-v511.js',
 'live-v393-research.js','intelligence-i06-narrative-v402.js'])
 vm.runInContext(sources[file],context,{filename:file});
const api=context.window.HH_ASK_LENA_SAFE_FALLBACK_V511;
const research=context.window.HH_DEEP_RESEARCH_V393,narrative=context.window.HH_NARRATIVE_INTELLIGENCE_I06_V402;
const q='Miért vagyok mostanában ilyen fáradt?';
const request={schema:'healthhub.ask-lena/1',profile:'zsolt',consent:true,question:q,
 photo:null,depth:'detailed',originalDocumentsConsent:false,
 documentEvidence:[{type:'json_summary',text:'sensitive synthetic'}],
 sources:[{id:'sleep',title:'Alvás',status:'ready',entries:[
  {name:'Utolsó alvás',value:'320',unit:'perc',observedAt:'2026-10-14T06:30:00Z'}]}],
 extra:[{domain:'documents',value:'mock clinical data'}]};
assert.equal(api.eligibleRetry('invalid_or_no_consent',400,request,q,'zsolt'),true);
assert.equal(api.eligibleRetry('forbidden_profile',403,request,q,'zsolt'),false);
assert.equal(api.eligibleRetry('rate_limit',429,request,q,'zsolt'),false);
assert.equal(api.eligibleRetry('invalid_or_no_consent',400,{...request,consent:false},q,'zsolt'),false);
assert.equal(api.eligibleRetry('invalid_or_no_consent',400,request,q,'monika'),false);
assert.equal(api.eligibleRetry('invalid_or_no_consent',400,{...request,photo:{mime:'image/jpeg'}},q,'zsolt'),false);
assert.equal(api.eligibleRetry('invalid_or_no_consent',400,request,'x'.repeat(1201),'zsolt'),false);
const simple=api.compact(request,q,'zsolt');
assert.equal(simple.profile,'zsolt');
assert.equal(simple.question,q);
assert.equal(simple.consent,true);
assert.equal(simple.sources.length,1);
assert.equal(simple.sources[0].entries.length,1);
for(const x of ['photo','photoConsent','originalDocumentsConsent','documentEvidence','researchMode','depth'])
 assert.ok(!Object.prototype.hasOwnProperty.call(simple,x),'no unconsented or high-detail transfer: '+x);
assert.equal(simple.extra.length,0);
assert.throws(()=>api.compact(request,q,'monika'),/hozzájárulás/);
assert.throws(()=>api.compact({...request,consent:false},q,'zsolt'),/hozzájárulás/);
const report={schema:'healthhub.intelligence.context/1',profile:'zsolt',question:q,sources:[
 {id:'sleep',entries:[{name:'Legutóbbi alvás',value:'320',unit:'perc',observedAt:'2026-10-14T06:30:00Z'},
 {name:'72 órás alvásátlag',value:'340',unit:'perc'}]},
 {id:'activity',entries:[]}
]};
const local=api.localAnswer(report,q,'zsolt',context.window.HH_LENA_UNIVERSAL_V330);
assert.equal(local.mode,'local-non-generative');
assert.match(local.text,/fáradtságodat nem lehet egyetlen okkal/);
assert.match(local.text,/320 perc/,'measured personal value');
assert.match(local.text,/mérési idő:/,'dated facts');
assert.match(local.disclaimer,/NEM ChatGPT-től/,'no fake AI answer');
assert.equal(api.localAnswer({...report,profile:'monika'},q,'zsolt',context.window.HH_LENA_UNIVERSAL_V330),null);
const unknown=api.localAnswer(null,q,'zsolt',context.window.HH_LENA_UNIVERSAL_V330);
assert.ok(!unknown.text.includes('320 perc'),'never fabricate personal measurements');
assert.match(api.provenance(simple,true,'simplified'),/Egyszerűsített, valódi AI-válasz/);
assert.match(api.provenance(simple,true,'simplified'),/Személyes többlet/);
assert.match(api.provenance(simple,true,'simplified'),/AI hozzáadott érték/);
assert.match(api.provenance(simple,true,'simplified'),/webkeresés: nem történt/);
assert.doesNotMatch(api.provenance({...simple,sources:[]},true,'standard'),/Személyes többlet/);
const plan=research.decide(q);
const researchResult=research.apply(request,q,{originals:0},plan);
assert.equal(researchResult.payload.question,q,'I-04 may not append prompt instructions');
assert.equal(researchResult.modelPromptAdded,0);
const narrativeResult=narrative.apply(researchResult.payload,q,plan,{quality:{originals:0}});
assert.equal(narrativeResult.payload.question,q,'I-06 may not append prompt instructions');
assert.throws(()=>narrative.apply({...request,question:'a'.repeat(1201)},q,plan,null),/1200/);
assert.match(sources['live-v331.js'],/showLocalAnswer\(question,p/);
assert.match(sources['live-v331.js'],/safeFallback\.eligibleRetry/);
assert.match(sources['live-v331.js'],/provenance\.provenance\(replyData/);
assert.match(sources['live-v331.js'],/event:.*nothing_this_is_impossible|healthhub:ask-lena-complete/);
const boot=sources['index.html'];
const safeSrc=boot.indexOf('ask-lena-safe-fallback-v511.js?v=511-safety-qa');
const aiSrc=boot.indexOf('live-v331.js?v=511-safe-fallback-answer-first');
assert.ok(safeSrc>0&&aiSrc>safeSrc,'fallback bootstrap before AI composer');
console.log('PASS v511: original question first; consent-checked one-time simplified AI retry; no photo/PDF leakage; profile isolation; labelled local fallback and provenance');
