#!/usr/bin/env node
'use strict';
/* v330 regression: domain routing, no-PDF replies, no cross-profile mixing.
   All records below are SYNTHETIC. Does not call a network or a real user account. */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const older=fs.readFileSync(path.join(base,'live-v329.js'),'utf8');
const newer=fs.readFileSync(path.join(base,'live-v330.js'),'utf8');
const context={
 window:{addEventListener(){}},
 document:{documentElement:{dataset:{}},getElementById(){return null}},
 localStorage:{getItem(k){return k==='hh-profile'?'z':null}},
 Date,Math,Number,String,JSON,Set,Array,console
};
vm.runInNewContext(older,context,{filename:'live-v329.js'});
vm.runInNewContext(newer,context,{filename:'live-v330.js'});
const api=context.window.HH_LENA_UNIVERSAL_V330;
const report={schema:'healthhub.intelligence.context/1',profile:'zsolt',question:'',sources:[
 {id:'symptoms',entries:[{name:'Fejfájás',value:'6 / 10',observedAt:'2026-10-08T13:05:00Z',detail:'Homlok · Megszűnt'}]},
 {id:'vitals',entries:[{name:'Vérnyomás',value:'141/88',unit:'Hgmm',observedAt:'2026-10-02T07:03:00Z'},{name:'Pulzus',value:'90',unit:'/perc',observedAt:'2026-10-02T07:03:00Z'}]},
 {id:'sleep',entries:[{name:'Legutóbbi alvás',value:'320',unit:'perc',observedAt:'2026-10-09T06:00:00Z'},{name:'72 órás alvásátlag',value:'335',unit:'perc'},{name:'7 napos alvásátlag',value:'412',unit:'perc'}]},
 {id:'activity',entries:[{name:'Legutóbbi napi lépésszám',value:'6450',unit:'lépés'},{name:'7 napos napi lépésátlag',value:'4000',unit:'lépés'}]},
 {id:'environment',status:'available',entries:[{name:'Hőmérséklet',value:'14,2',unit:'°C'},{name:'Légnyomás-változás 6 óra',value:'5,5',unit:'hPa'},{name:'Európai levegőminőségi index',value:'18',unit:'AQI'},{name:'Pollen · Fűfélék',value:'0,2',unit:'szemcse/m³'}]},
 {id:'infection',entries:[{name:'Hivatalos megfigyelési időszak vége',value:'2026-09-27'}]},
 {id:'medication',entries:[{name:'Rögzített gyógyszer',value:'Fiktív készítmény · 40 mg'}]},
 {id:'records',entries:[{name:'Indexelt leletek',value:'38',unit:'db'}]}
]};
const cases=[
 ['Miért fáj a fejem?','headache'],
 ['Hogy aludtam az elmúlt éjszakákon?','sleep'],
 ['Milyen a pulzusom és a vérnyomásom?','vitals'],
 ['Hogy alakult a testsúlyom?','weight'],
 ['Mennyit mozogtam?','activity'],
 ['Milyen a pollen és a levegő?','environment'],
 ['Milyen fertőzések vannak?','infection'],
 ['Milyen gyógyszereket szedek?','medication'],
 ['Mi van a kórlapjaimban?','records'],
 ['Mit ettem tegnap?','nutrition'],
 ['Mennyi volt a képernyőidőm?','digital'],
 ['Hogy áll a memóriám?','cognitive'],
 ['Miért szédülök?','symptoms'],
 ['Mit látsz az egészségemről?','general']
];
for(const [question,kind] of cases){
 assert.equal(api.classify(question),kind,question);
 const answer=api.compose(report,question);
 assert.equal(answer.profile,'zsolt',question);
 assert(answer.title,question);
 assert(answer.assessment.length>0,question);
 assert(answer.suggestions.length>0,question);
 assert(answer.disclaimer.includes('Nem generatív AI'),question);
 if(kind==='sleep')assert(answer.facts.some(x=>x.text.includes('335')),question);
 if(kind==='environment')assert(answer.facts.some(x=>x.text.includes('5,5')),question);
 if(kind==='medication')assert(answer.facts.some(x=>x.text.includes('Fiktív készítmény')),question);
 if(kind==='nutrition')assert(answer.assessment.some(x=>x.includes('nem szerepel')),question);
}
assert.throws(()=>api.compose({...report,profile:'monika'},'Hogy aludtam?'),/Profilváltás/);
const empty=api.compose({schema:report.schema,profile:'zsolt',sources:[]},'Mennyit mozogtam?');
assert.equal(empty.facts.length,0);
assert(empty.assessment.some(x=>x.includes('nincs közvetlenül kiolvasható')));
console.log('HealthHub v330: all universal-domain / privacy / missing-data tests PASSED');
