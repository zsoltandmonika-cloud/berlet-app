'use strict';
/* Synthetic gesture/audio contract test. No user data and no speakers required.
 * Checks real scroll index changes, user gesture gating and absent mute UI.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'hh-buddy-scroll-companion-v593.js'),'utf8');
const css=fs.readFileSync(path.join(root,'hh-buddy-scroll-companion-v593.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(!source.includes('hhBuddy593Sound'),'no Buddy mute button or handler');
assert.ok(!source.includes('hh-premium-select-sound-v593'),'old persisted sound-off setting cannot strand the sound');
assert.ok(!css.includes('hhBuddy593Sound'),'no orphan mute positioning');
assert.ok(index.includes("var v='653-overlay-profile-regression-fix'"));
assert.ok(index.includes('hh-buddy-scroll-companion-v593.js?v=595-scroll-tick-clean-buddy'));

function el(tag='div',cl=''){
 const e={tagName:tag,className:cl,children:[],attrs:{},listeners:{},dataset:{},disabled:false,hidden:false};
 e.setAttribute=(k,v)=>e.attrs[k]=v;
 e.getAttribute=k=>e.attrs[k];
 e.addEventListener=(k,fn)=>e.listeners[k]=fn;
 e.appendChild=x=>{e.children.push(x);x.parentNode=e;return x};
 e.insertBefore=(x,target)=>{e.children.splice(e.children.indexOf(target),0,x);x.parentNode=e;return x};
 e.querySelector=q=>e.children.find(c=>c.className.split(' ').includes(q.slice(1)))||null;
 return e;
}
function fakeRail(cls,itemCls,starts){
 const rail=el('div',cls),items=starts.map(x=>Object.assign(el('div',itemCls),{left:x}));
 rail.getBoundingClientRect=()=>({left:0});
 rail.querySelectorAll=()=>items;
 rail.move=function(a){items.forEach((e,i)=>e.left=a[i])};
 items.forEach(x=>x.getBoundingClientRect=()=>({left:x.left}));
 return rail;
}
let clock=100,audioStarts=0,unlocks=0;
class FakeDate extends Date{static now(){return clock}}
class AudioContext{
 constructor(){this.currentTime=0;this.state='suspended';this.destination={}}
 resume(){unlocks++;this.state='running';return Promise.resolve()}
 createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){audioStarts++},stop(){}}}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
}
const track=fakeRail('hhRsmTrack','hhRsmCard',[0,320,640]);
const chips=fakeRail('hhRsmChips','hhRsmChip',[0,140,290]);
const count=el('span','hhRsmCount'),heading=el('div','hhRsmHeading');
heading.appendChild(count);
const tool=el('section','hhRsmToolbar');
tool.querySelector=q=>q==='.hhRsmHeading'?heading:null;
const content=el('div','healthSubContent');
content.querySelector=q=>q==='.hhRsmToolbar'?tool:q==='.hhRsmTrack'?track:q==='.hhRsmChips'?chips:null;
const docListeners={},cssLinks=[],created=[];
const document={
 createElement(tag){created.push(tag);return el(tag)},
 getElementById(id){return id==='healthSubContent'?content:null},
 addEventListener(k,fn){docListeners[k]=fn},
 head:{appendChild(x){cssLinks.push(x)}}
};
const window={
 location:{search:'?hhv=591-health-measurements-hero'},
 healthSectionKind:'records',
 AudioContext,
 localStorage:{getItem(){return 'off'}},
 matchMedia(){return {matches:false}},
 renderHealthSection:async()=>true
};
vm.runInNewContext(source,{window,document,URLSearchParams,Date:FakeDate,console,Promise},{timeout:3000});
async function test(){
 await window.renderHealthSection();
 assert.equal(heading.children.length,2,'Buddy is present without a third sound-control child');
 assert.equal(created.filter(x=>x==='button').length,0,'no mute button is created');
 assert.equal(typeof track.listeners.scroll,'function','card rail scroll is observed');
 assert.equal(typeof chips.listeners.scroll,'function','filter chip rail scroll is observed');
 // Programmatic moves without an input gesture must stay silent.
 track.move([-330,0,330]);track.listeners.scroll();assert.equal(audioStarts,0);
 // Touch/pointer-down unlocks the browser audio before the scroll event.
 clock=1000;track.listeners.pointerdown();
 assert.equal(unlocks,1,'WebAudio resumed from a real gesture');
 track.move([-650,-325,0]);track.listeners.scroll();
 assert.equal(audioStarts,2,'one audible 2-oscillator click on crossing a card');
 track.listeners.scroll();assert.equal(audioStarts,2,'no continuous sound while resting at a card');
 // After a throttle interval, next distinct item is audible.
 clock=1120;track.move([0,325,650]);track.listeners.scroll();
 assert.equal(audioStarts,4,'second card boundary gets its own click');
 // No sound on later non-user reflow or cloud-driven scroll changes.
 clock=6500;track.move([-340,0,340]);track.listeners.scroll();
 assert.equal(audioStarts,4,'programmatic changes after gesture timeout are silent');
 // Filter chips also click on discrete index changes during a swipe.
 clock=7000;chips.listeners.touchstart();clock=7110;
 chips.move([-150,0,150]);chips.listeners.scroll();
 assert.equal(audioStarts,6,'quick-filter rail gets a click during user scroll');
 // A deliberate chip tap retains click + three ascending tada notes.
 clock=7300;
 const chip={disabled:false,dataset:{hhKey:'labor'},getAttribute:()=> 'false'};
 chip.closest=(q)=>q==='#healthSubContent'?content:q==='.hhRsmChip'?chip:null;
 docListeners.click({target:chip});
 assert.equal(audioStarts,11,'selection click plus three tada notes');
 assert.ok(window.HH_BUDDY_SCROLL_V593.version==='595');
 console.log('HHSP1 v595 scroll ticks / sound gesture / no mute: PASS');
}
test().catch(e=>{console.error(e);process.exitCode=1});
