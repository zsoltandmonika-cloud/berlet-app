'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
for(const file of ['activity-fast/activity-engine-v3.js','live-v191.js']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const start=source.indexOf('function metrics(c,profile,heightCm){'),end=source.indexOf('function kpi(',start);
 assert.ok(start>0&&end>start,file+' metrics source');
 const metricsCode=source.slice(start,end);
 function calculate(row,session=[]){
  const context={window:{HH_DISTANCE_ENGINE_V369:{estimate(){return {km:3.1,calibrated:true,strideCm:71}}}},
   cutMs:()=>Date.parse('2026-11-17T00:00:00Z'),periodDays:()=>1,
   mins:(a,b)=>Math.max(0,(Date.parse(b)-Date.parse(a))/60000),
   caloriesOf:()=>null,distanceOf:()=>null,pace:()=> '—',infer:()=> 'other',
   hrIn:()=>[],avg:()=>0,sumIfRecorded:()=>null,Number,Date,Math,Array,Object,console,dataRow:row,sessionData:session};
  vm.createContext(context);vm.runInContext(metricsCode+'\nthis.result=metrics({daily:[dataRow],sessions:sessionData,heart:[]},\'zsolt\',170);',context);
  return context.result;
 }
 test(file+' · missing Samsung active minutes remains unknown, not zero',()=>{
  const m=calculate({date:'2026-11-17',steps:4178,caloriesKcal:131,activeCaloriesKcal:131,activeMinutes:null});
  assert.equal(m.active,null);assert.equal(m.hasHcActiveTime,false);assert.equal(m.hasOnlySessionActiveTime,false);
  assert.match(source,/Aktív idő · nincs forrás/);
  assert.match(source,/m.active==null\?'—':Math.round\(m.active\)/);
  assert.match(source,/m.active==null\?null:n\(g.active,0\)/);
  assert.match(source,/a Samsung dokumentációja szerint nem szinkronizálódik Health Connectbe/);
 });
 test(file+' · valid measured HC active minutes survives roundtrip and zero is distinguishable',()=>{
  const m=calculate({date:'2026-11-17',steps:4178,activeMinutes:42});
  assert.equal(m.active,42);assert.equal(m.hasHcActiveTime,true);
  const zero=calculate({date:'2026-11-17',steps:0,activeMinutes:0});
  assert.equal(zero.active,0);assert.equal(zero.hasHcActiveTime,true);
  assert.match(source,/activeMinutes:x.activeMinutes==null\|\|!Number.isFinite\(Number\(x.activeMinutes\)\)\?null/);
 });
 test(file+' · measured exercise session duration remains fallback, never inferred from step count',()=>{
  const sess=[{startTime:'2026-11-17T08:00:00Z',endTime:'2026-11-17T08:35:00Z'}];
  const m=calculate({date:'2026-11-17',steps:4178,activeMinutes:null},sess);
  assert.equal(m.active,35);assert.equal(m.hasOnlySessionActiveTime,true);
 });
}
