'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const rootDir=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(rootDir,'index.html'),'utf8');
const code=fs.readFileSync(path.join(rootDir,'hh-hydration-carrier-snap-v1210.js'),'utf8');
function harness(opts={}){
 const events={window:{},document:{}};
 const calls=[];
 let soundCount=0,clock=0,nextTimer=0;
 const timers=new Map();
 const top=opts.top??820,height=opts.height??550;
 const rect=()=>({top:top-win.scrollY,height,bottom:top-win.scrollY+height});
 const card={getBoundingClientRect:rect};
 const doc={
  readyState:'complete',hidden:false,activeElement:null,
  scrollingElement:{scrollHeight:2400},
  documentElement:{},
  addEventListener:(name,fn)=>{(events.document[name]??=[]).push(fn)},
  querySelector:sel=>sel==='#balanceCard > .hh-water.glass'?card:null
 };
 const gain={gain:{
  setValueAtTime(){},exponentialRampToValueAtTime(){}
 },connect(){}};
 class AudioContext{
  constructor(){this.state='running';this.currentTime=0}
  createOscillator(){return{frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
   connect(){},start(){soundCount++},stop(){},set type(v){}}}
  createGain(){return gain}
  resume(){this.state='running';return Promise.resolve()}
 }
 const win={
  innerHeight:800,innerWidth:390,scrollY:opts.startY??400,
  localStorage:{getItem:()=>opts.muted?'off':'on'},
  AudioContext,
  getComputedStyle:()=>({getPropertyValue:()=>''}),
  matchMedia:q=>({matches:false}),
  setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,due:clock+delay});return id},
  clearTimeout:id=>timers.delete(id),
  scrollTo:arg=>{calls.push(arg);if(opts.noScrollMovement)return;win.scrollY=arg.top},
  addEventListener:(name,fn)=>{(events.window[name]??=[]).push(fn)}
 };
 function emit(type,source='window',payload={}){
  for(const fn of events[source][type]||[])fn(payload);
 }
 function advance(ms=2000){
  const limit=clock+ms;let count=0;
  while(true){
   const available=[...timers.entries()].filter(([_,x])=>x.due<=limit).sort((a,b)=>a[1].due-b[1].due);
   if(!available.length)break;
   const [id,task]=available[0];timers.delete(id);clock=task.due;task.fn();
   if(++count>200)throw new Error('Timer runaway');
  }
  clock=limit;
 }
 new Function('window','document',code)(win,doc);
 return {win,doc,emit,advance,calls,card,get soundCount(){return soundCount}};
}
test('only the outer hydration carrier, with no artwork CSS or data mutation',()=>{
 assert.match(html,/hh-hydration-carrier-snap-v1210\.js\?v=1210-outer-snap-click/);
 assert.equal(html.split('hh-hydration-carrier-snap-v1210.js').length,2);
 assert.match(code,/document\.querySelector\('#balanceCard > \.hh-water\.glass'\)/);
 assert.doesNotMatch(code,/(?:\.style\.|\.innerHTML|\.replaceChildren\(|\.appendChild\()/);
 assert.doesNotMatch(code,/hhJugFrameV1202|hhGlassTapV1202|hhShowcaseTotalV1202|hhBuddyMood|\.setItem\(|delete\(/);
 assert.match(code,/hh-nutrition-PREVIEW-sound/);
});
test('manual scroll near center snaps carrier and plays exactly one click after arriving',()=>{
 const h=harness();
 h.emit('pointerdown','document');
 h.win.scrollY=600;h.emit('scroll');
 h.advance(200);
 assert.equal(h.calls.length,1);
 assert.ok(Math.abs(h.calls[0].top-731)<.001);
 assert.equal(h.calls[0].behavior,'smooth');
 assert.equal(h.soundCount,0,'no click until actually settled');
 h.emit('scrollend');
 assert.equal(h.soundCount,1);
 h.emit('scrollend');
 assert.equal(h.soundCount,1,'never double-click on duplicate scrollend');
});
test('closed or oversized viewport cannot move the carrier, unarmed script scroll cannot move it',()=>{
 const h=harness({height:850});
 h.emit('pointerdown','document');h.win.scrollY=600;h.emit('scroll');h.advance(300);
 assert.equal(h.calls.length,0);
 const j=harness();
 j.win.scrollY=600;j.emit('scroll');j.advance(300);
 assert.equal(j.calls.length,0);
});
test('muted Nutrition disables click while preserving the visual snap',()=>{
 const h=harness({muted:true});
 h.emit('touchstart','document');h.win.scrollY=600;h.emit('scroll');h.advance(200);
 assert.equal(h.calls.length,1);
 h.emit('scrollend');assert.equal(h.soundCount,0);
});
test('touch without a scroll does not move the carrier or play audio',()=>{
 const h=harness();
 h.emit('pointerdown','document');h.advance(1000);
 assert.equal(h.calls.length,0);
 assert.equal(h.soundCount,0);
});
