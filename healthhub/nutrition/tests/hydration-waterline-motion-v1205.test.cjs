'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(base,'hh-hydration-showcase-v1202.js'),'utf8');
const css=fs.readFileSync(path.join(base,'hh-hydration-showcase-v1202.css'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');

test('v1205 lowers the jug EXACTLY 5px beyond v1204 across all widths without moving glass',()=>{
 assert.ok(css.includes('top:calc(clamp(49px,17vw,70px) + 5px)'));
 assert.ok(css.includes('top:calc(clamp(45px,15vw,59px) + 5px)'));
 assert.ok(html.includes('hh-hydration-showcase-v1202.css?v=1205-jug-plus5-watermotion'));
 assert.ok(html.includes('hh-hydration-showcase-v1202.js?v=1205-waterline-ramp'));
 assert.ok(css.includes('.hh-glass-tap-v1202{'));
 assert.ok(css.includes('.hh-showcase-summary-v1202{'));
 assert.doesNotMatch(script,/localStorage|sessionStorage|fetch\(/);
});

test('water genuinely MOVES between frames on add and empty, with identical jug master',async()=>{
 const listeners=new Map(),observers=[],frames=[],tasks=[],calls={add:0,empty:0};
 let rid=0;
 function node(name){
  return {
   name,textContent:name==='amount'?'0 ml':'',value:name==='goal'?'2000':'',
   attrs:new Map(),listeners:{},
   setAttribute(key,value){this.attrs.set(key,value)},
   getAttribute(key){return this.attrs.get(key)||''},
   addEventListener(key,fn){this.listeners[key]=fn},
   click(){if(this.listeners.click)this.listeners.click()},
   appendChild(child){this.child=child},
   insertBefore(child){this.inserted=child},
   classList:{add(){},remove(){}},
   get offsetWidth(){return 210},
   style:{},
  };
 }
 const ids=new Map();
 for(const id of ['hhWaterShowcaseV1202','hhJugTapV1202','hhGlassTapV1202',
 'waterQuickAdd','hhJarReset','hhJugFrameV1202','hhShowcaseTotalV1202',
 'hhShowcaseTargetV1202','hhShowcasePctV1202','hhShowcaseBarV1202',
 'hhShowcaseStagesV1202','hhShowcaseGoalDetailsV1202',
 'hhShowcaseGoalEditV1202','hhWaterTarget','hhWaterAmount','hhWaterGoal']){
   ids.set(id,node(id==='hhWaterAmount'?'amount':id==='hhWaterGoal'?'goal':id));
 }
 const jug=ids.get('hhJugTapV1202'),glass=ids.get('hhGlassTapV1202'),frame=ids.get('hhJugFrameV1202');
 const oldAdd=ids.get('waterQuickAdd'),oldReset=ids.get('hhJarReset');
 oldAdd.click=()=>{calls.add++};
 oldReset.click=()=>{calls.empty++};
 const gauge=node('gauge');
 gauge.setAttribute('aria-label','Kancsó vízszintje: 0%, az utolsó ürítés óta 0 ml');
 const goalEditor=node('edit');
 const document={
  readyState:'complete',
  getElementById:id=>ids.get(id)||null,
  querySelector:query=>query==='#balanceCard .hh-water-gauge'?gauge:query==='#balanceCard .hh-water-goal-edit'?goalEditor:null,
  createElement:tag=>{
   assert.equal(tag,'canvas');
   return {getContext:()=>({drawImage(){}}),toBlob:fn=>fn({type:'image/png'})};
  }
 };
 const window={
  matchMedia:()=>({matches:false}),
  addEventListener(){},
  requestAnimationFrame:fn=>{tasks.push({id:++rid,fn});return rid},
  cancelAnimationFrame:id=>{const i=tasks.findIndex(x=>x.id===id);if(i>=0)tasks.splice(i,1)}
 };
 class FakeImage{set src(_value){if(this.onload)this.onload()}}
 class FakeMutationObserver{
  constructor(fn){this.fn=fn}
  observe(target){target._notify=this.fn;observers.push(target)}
 }
 let blob=0;
 const URL={createObjectURL:()=>('blob:jug_'+(++blob)),revokeObjectURL(){}};
 const ctx={window,document,MutationObserver:FakeMutationObserver,Image:FakeImage,URL,Map,Promise,Math,Number,String,Array,encodeURIComponent};
 vm.runInNewContext(script,ctx);
 assert.equal(typeof glass.listeners.click,'function');
 glass.click();jug.click();
 assert.deepEqual(calls,{add:1,empty:1},'original handlers are called directly, not duplicated');
 function next(ms){const task=tasks.shift();assert.ok(task,'expected requestAnimationFrame');task.fn(ms)}
 function setMl(ml){gauge.setAttribute('aria-label','Kancsó vízszintje: '+Math.round(ml/20)+'%, az utolsó ürítés óta '+ml+' ml');gauge._notify();}
 function waterline(){
  const src=decodeURIComponent(frame.src);
  const match=src.match(/M65 (\d+(?:\.\d+)?) Q158/);
  // At exactly 0 ml the common jug master correctly has no water path.
  if(!match&&src.includes('<svg'))return 306;
  assert.ok(match,'SVG from the common master has an interpolated waterline');
  return Number(match[1]);
 }
 setMl(250);
 assert.equal(tasks.length,1,'adding 250ml starts an actual animation');
 next(100);const y0=waterline();
 next(425);const yMiddle=waterline();
 assert.ok(y0>yMiddle&&yMiddle>283,'waterline moves upward between empty and 250ml, not jumps',JSON.stringify({y0,yMiddle}));
 next(750);await Promise.resolve();
 assert.equal(ids.get('hhShowcaseStagesV1202').textContent,'1 / 8');
 assert.match(frame.src,/^blob:jug_/,'after the animation settles the PNG still frame is used');
 setMl(0);
 assert.equal(tasks.length,1,'emptying starts an animation');
 next(900);const from=waterline();
 next(1160);const midway=waterline();
 assert.ok(midway>from&&midway<306,'emptying gradually lowers the waterline');
 next(1440);await Promise.resolve();
 assert.equal(ids.get('hhShowcaseStagesV1202').textContent,'0 / 8');
 assert.match(frame.src,/^blob:jug_/,'empty state returns to pre-rendered PNG');
 assert.ok(script.includes('if(display||from<0||from===level'),'reduced-motion and first paint are protected');
});
