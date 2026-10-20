#!/usr/bin/env node
'use strict';
/* Synthetic-only: never import real patient medical or meal records. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../timeline-truth-v725.js'),'utf8');
const index=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
assert(index.includes('timeline-truth-v725.js'),'The live HealthHub page must load the real-data timeline');
assert(!src.includes('540 kcal')&&!src.includes('620 kcal')&&!src.includes('118/76'),'Legacy sample measurements must never appear in the new timeline');
const window={localStorage:{getItem:k=>k==='hh-profile'?'z':null}};
const document={getElementById:id=>id==='timeline'?{id}:null,readyState:'loading',addEventListener(){}};
vm.runInNewContext(src,{window,document,Date,Intl,Number,Map,Array,Set,Promise}, {timeout:4000});
const api=window.HH_TIMELINE_TRUTH_V725.model;
const profile='zsolt';
const local={schemaVersion:'healthhub.nutrition/1',profileKey:profile,entries:[
 {id:'synthetic-lunch',date:'2026-10-20',time:'12:45',profile:profile,kind:'food',meal:'Ebéd',
  name:'SYNTHETIC LUNCH',quantityText:'150 g',nutrients:{kcal:360},source:'estimated'},
 {id:'synthetic-supper',date:'2026-10-20',time:'18:17',kind:'food',meal:'Vacsora',
  name:'SYNTHETIC DINNER',nutrients:{kcal:200}},
 {id:'synthetic-old',date:'2026-10-19',time:'08:12',kind:'drink',meal:'Reggeli',
  name:'SYNTHETIC COFFEE',nutrients:{kcal:66}},
 {id:'deleted',date:'2026-10-20',time:'13:00',name:'SYNTHETIC DELETED',deleted:true,meal:'Ebéd',nutrients:{kcal:900}},
 {id:'other-profile',profile:'monika',date:'2026-10-20',time:'14:00',name:'WRONG PROFILE',nutrients:{kcal:3000}},
 {id:'invalid-date',date:'invalid',time:'16:00',name:'WRONG DATE',nutrients:{kcal:999}}
]};
assert(api.liveNutrition(local,profile));
assert(!api.liveNutrition({...local,profileKey:'monika'},profile));
const rows=api.nutritionRows(local,profile);
assert.equal(rows.length,3);
const today=api.limitRange(rows,'1','',new Date('2026-10-20T21:30:00'));
assert.equal(today.length,2);
assert.equal(today.find(x=>x.meal==='Ebéd').kcal,360);
assert.equal(today.find(x=>x.meal==='Ebéd').time,'12:45');
assert.equal(api.nutritionSummary(today).kcal,560);
assert.equal(api.limitRange(rows,'7','',new Date('2026-10-20T21:30:00')).length,3);
assert.equal(api.limitRange(rows,'custom','2026-10-19',new Date('2026-10-20T21:30:00')).length,1);
const older={id:'synthetic-lunch',updatedAt:'2026-10-20T12:45:00',nutrients:{kcal:350}};
const newer={id:'synthetic-lunch',updatedAt:'2026-10-20T12:46:00',nutrients:{kcal:360}};
assert.equal(api.byId([older],[newer]).length,1,'Cloud & local must not duplicate the same ID');
assert.equal(api.byId([older],[newer])[0].nutrients.kcal,360);
const symptoms={schema:'healthhub.master.symptoms/1',events:[
 {id:'sym-a',profile, eventAt:'2026-10-20T16:00:00+02:00',symptom:'SYNTHETIC SYMPTOM'},
 {id:'sym-b',profile:'monika',eventAt:'2026-10-20T16:05:00+02:00',symptom:'WRONG PROFILE'},
 {id:'sym-c',profile,eventAt:'2026-10-20T16:10:00+02:00',symptom:'DELETED',deletedAt:'2026-10-20T16:11:00Z'}
]};
assert.equal(api.symptomRows(symptoms,profile).length,1);
const reports={documents:[
 {id:'report-a',profile,documentDate:'2026-10-20',originalName:'SYNTHETIC REPORT'},
 {id:'report-b',profile:'monika',documentDate:'2026-10-20',originalName:'WRONG PROFILE'},
 {id:'report-c',profile,updatedAt:'2026-10-20T12:00:00Z',originalName:'UPLOAD TIME ONLY'},
 {id:'report-d',profile,documentDate:'2026-10-20',deleted:true}
]};
assert.equal(api.reportRows(reports,profile).length,1,'Only medically dated, profile-safe reports');
assert(!index.includes('v725-no-placeholder'),'Unexpected test placeholder');
const bodyData={schemaVersion:'healthhub.nutrition/1',profileKey:profile,body:[
 {id:'bb-example',kind:'stool',date:'2026-10-20',time:'11:10',bristol:'4',note:'SYNTETIKUS'},
 {id:'aj-example',kind:'urine',date:'2026-10-20',time:'13:25',urineColor:'3',note:''},
 {id:'deleted-body',kind:'stool',date:'2026-10-20',time:'13:30',bristol:'1',deleted:true},
 {id:'wrong-person-body',profile:'monika',kind:'urine',date:'2026-10-20',time:'13:45',urineColor:'8'}
]};
const br=api.bodyRows(bodyData,profile);
assert.equal(br.length,2,'Separate BODY observations must not include deleted or wrong-profile rows');
assert.equal(br[0].grade,4);
assert.equal(br[1].grade,3);
assert.equal(api.observationRag(br[0]).tone,'green');
assert.equal(api.observationRag({...br[0],grade:1}).tone,'red');
assert.equal(api.observationRag({...br[0],grade:5}).tone,'amber');
assert.equal(api.observationRag({...br[0],grade:null}).tone,'unknown');
assert.equal(api.observationRag(br[1]).tone,'green');
assert.equal(api.observationRag({...br[1],grade:5}).tone,'amber');
assert.equal(api.observationRag({...br[1],grade:8}).tone,'red');
const compact=api.observationGroup([br[1],br[0]]);
assert(compact.includes('✓')&&compact.includes('BB')&&compact.includes('Bristol Bar'));
assert(compact.includes('AJ')&&compact.includes('Apple Juice'));
assert(compact.indexOf('Bristol Bar')<compact.indexOf('Apple Juice'),'Always stack BB above AJ');
assert(compact.includes('hhTruthRag-green'));
assert(compact.includes('nem diagnózis'));
assert.equal(api.statCards([...today,...br],'all')[2].value,'560 kcal','BODY checks must not add calories');
assert.equal(api.statCards(br,'observation')[0].value,'2','Body observations count independently');
console.log('PASS v725: verified diary data, compact BB/AJ, RAG indicators, non-diagnostic semantics, filtered totals and profile isolation');
