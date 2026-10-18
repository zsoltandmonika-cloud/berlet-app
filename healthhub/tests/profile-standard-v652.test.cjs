#!/usr/bin/env node
'use strict';
/* v652 UI-only profile pill checks, all data synthetic. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='healthhub/';
const src=fs.readFileSync(root+'hh-profile-standard-v652.js','utf8');
const index=fs.readFileSync(root+'index.html','utf8');
const digitalIndex=fs.readFileSync(root+'digital-health/index.html','utf8');
const nutrition=fs.readFileSync(root+'nutrition/nutrition-preview-v592.js','utf8');
const meds=fs.readFileSync(root+'hh-private-medications-v593.js','utf8');
const medCtx=fs.readFileSync(root+'live-v289.js','utf8');
assert.ok(index.includes('hh-profile-standard-v652.js?v=653-fullscreen-regression-fix'),'main HealthHub loads pill');
assert.ok(digitalIndex.includes('hh-profile-standard-v652.js?v=652-unified-canonical'),'separate Digital page loads pill');
assert.ok(index.includes("var v='653-overlay-profile-regression-fix'"),'bookmarked shortcut uses current build');
assert.ok(src.includes('#hhOneRag500')&&src.includes('#hhOneFallback501')&&src.includes('#haOv.on'),'HH One admin-only gate');
assert.ok(src.includes('#hhSP299')&&src.includes('#hhProfileDock554')&&src.includes('hhHealthSubPortraitHit')&&src.includes('runnerProfile'),'old separate profile controls hidden');
assert.ok(nutrition.includes("click('profileBtn',()=>{tone('tap');setProfile("),'approved Nutrition control remains working');
assert.ok(meds.includes('healthhub:private-medications-saved')&&medCtx.includes('healthhub:private-medications-saved')&&meds.includes('purpose:purpose.value.trim()'),'private save propagates to Ask Léna context and explanation');
assert.ok(meds.includes("name.value='Rozuva-Teva 10 mg filmtabletta'"),'existing explicit prescription preset available');
assert.ok(!src.includes('localStorage.setItem('),'new global button never writes profile/medical store itself');

function fakeEnv(mode='main'){
 const els={},listeners={},scheduled=[],sounds=[],vibrates=[];
 const classes=()=>({add(){},toggle(){}});
 function el(tag,id){
  return {
   tagName:tag,id:id||'',type:'',hidden:false,textContent:'',attributes:{},parentNode:null,classList:classes(),listeners:{},
   children:[],setAttribute(k,v){this.attributes[k]=v},
   addEventListener(k,fn){this.listeners[k]=fn},
   appendChild(c){if(c.parentNode)c.parentNode.children=c.parentNode.children.filter(x=>x!==c);c.parentNode=this;this.children.push(c);if(c.id)els[c.id]=c;return c;},
   click(){this.listeners.click&&this.listeners.click()}
  };
 }
 let current='m',clicks=0;
 const hero=el('section','heroHome'),page=el('section','home');page.querySelector=q=>q==='#heroHome'?hero:null;
 const secondHero=el('section','heroT'),second=el('section','timeline');second.querySelector=q=>q==='#heroT'?secondHero:null;
 let active=[page];
 let dock=null;
 if(mode==='digital'){dock=el('button','hhDigitalProfileDock');dock.click=()=>{clicks++;current=current==='m'?'z':'m'};els.hhDigitalProfileDock=dock;}
 if(mode==='nutrition')els.profileBtn=el('button','profileBtn');
 const document={
  readyState:'complete',documentElement:{dataset:{}},head:el('head'),body:el('body'),
  createElement(tag){return el(tag)},getElementById(id){return els[id]||null},
  querySelectorAll(q){return q==='.page.on'?active:[]},
  querySelector(q){return mode==='digital'&&q==='.hero-art'?hero:null},
  addEventListener(k,fn){listeners[k]=fn}
 };
 const localStorage={getItem(k){return k==='hh-profile'?current:null}};
 class AudioContext{constructor(){this.currentTime=0;this.state='running';this.destination={}}
  createOscillator(){return{type:'',frequency:{value:null},connect(){},start(){sounds.push(this.frequency.value)},stop(){}}}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
 }
 const window={
  localStorage,AudioContext,navigator:{vibrate:x=>vibrates.push(x)},setTimeout:fn=>scheduled.push(fn),
  requestAnimationFrame:fn=>scheduled.push(fn),addEventListener(k,fn){listeners[k]=fn},
  hhToggleProfileOneClick(){clicks++;current=current==='m'?'z':'m'}
 };
 const MutationObserver=class{constructor(cb){this.cb=cb}observe(){}};
 vm.runInNewContext(src,{window,document,MutationObserver,console,Map,Date},{timeout:2000});
 function flush(){while(scheduled.length)scheduled.shift()()}
 return {els,document,window,hero,page,second,secondHero,flush,listeners,
  gotoSecond(){active=[second];window.HH_PROFILE_STANDARD_V652.refresh();flush()},
  current:()=>current,clicks:()=>clicks,sounds,vibrates};
}
{
 const e=fakeEnv(),pill=e.els.hhProfileStandard652;
 assert.equal(pill.parentNode,e.hero,'Pill anchored in visible home hero lower left');
 assert.equal(pill.textContent,'Mónika ⇄');
 pill.click();e.flush();
 assert.equal(e.current(),'z');
 assert.equal(pill.textContent,'Zsolt ⇄');
 assert.equal(e.clicks(),1,'one canonical switch');
 assert.deepEqual(e.sounds,[900],'Nutrition 900Hz tap preserved');
 assert.deepEqual(e.vibrates,[9],'Nutrition 9ms haptic preserved');
 e.gotoSecond();
 assert.equal(pill.parentNode,e.secondHero,'single reused pill follows active route');
 assert.equal(e.document.head.children.length,1,'no repeated styles');
}
{
 const e=fakeEnv('digital'),pill=e.els.hhProfileStandard652;
 assert.equal(pill.parentNode,e.hero);
 pill.click();e.flush();
 assert.equal(e.current(),'z');
 assert.equal(e.clicks(),1,'Digital original profile renderer handles change');
 assert.deepEqual(e.sounds,[900]);
}
{
 const e=fakeEnv('nutrition');
 assert.equal(e.els.hhProfileStandard652,undefined,'Nutrition retains screenshot pill without duplicate');
}
console.log('PASS: HealthHub v652 single profile pill, same touch sound, routes, admin-only HH One, saved-medication evidence.');
