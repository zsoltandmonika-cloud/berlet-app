/* Family Guard v864: one primary button becomes Leszálltam after boarding. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const source=readFileSync(join(__dirname,'../guardian/guardian-active-transit-v862.js'),'utf8');
const html=readFileSync(join(__dirname,'../guardian/index.html'),'utf8');

function mobile(){
 const callbacks=new Map(),nodes=new Map(),store=new Map(),events=[];
 for(const id of ['hhActiveTransitPanelV862','hhActiveTransitBoardV862',
    'hhActiveTransitStopV862','hhActiveTransitCurrentV862',
    'hhActiveTransitStatusV862','hhActiveTransitSelectV862']){
  nodes.set(id,{hidden:false,textContent:'',
   addEventListener(type,fn){callbacks.set(id+':'+type,fn)}});
 }
 const w={
  localStorage:{getItem:()=> 'm'},
  sessionStorage:{getItem:key=>store.get(key)||null,
   setItem:(key,val)=>store.set(key,val),removeItem:key=>store.delete(key)},
  HH_GUARDIAN_LIVE_V785:{boundProfile:'monika',authenticated:false},
  document:{readyState:'complete',hidden:false,
   getElementById:id=>nodes.get(id)||null,addEventListener(){}},
  CustomEvent:class{constructor(type){this.type=type}},
  dispatchEvent:ev=>events.push(ev.type),addEventListener(){},setInterval(){}
 };
 const mod={exports:{}};
 new Function('window','module',source)(w,mod);
 return {
  api:mod.exports,button:nodes.get('hhActiveTransitBoardV862'),
  cancel:nodes.get('hhActiveTransitStopV862'),
  press:()=>callbacks.get('hhActiveTransitBoardV862:click')(),
  store,events
 };
}

test('boarding on own phone changes the SAME primary button to Leszálltam, then clears status',()=>{
 const phone=mobile();
 assert.equal(phone.button.textContent,'🚋 Felszálltam');
 assert.equal(phone.api.choose('19','tram','manual',true),true);
 assert.equal(phone.button.textContent,'🚏 Leszálltam');
 assert.equal(phone.cancel.hidden,true,'no redundant second end-trip button when boarded');
 assert.equal(phone.api.getStatus('monika').route,'19');
 phone.press();
 assert.equal(phone.button.textContent,'🚋 Felszálltam');
 assert.equal(phone.api.getStatus('monika'),null);
 assert.equal(phone.cancel.hidden,true);
 assert.equal(phone.store.has('hh-guardian-active-transit-v862'),false);
 assert.ok(phone.events.includes('hh-guardian-active-transit-updated-v862'));
});

test('planned route remains confirmable, then the same button ends it',()=>{
 const phone=mobile();
 assert.equal(phone.api.choose('260','bus','planned',false),true);
 assert.equal(phone.button.textContent,'🚋 Felszálltam a 260-re');
 assert.equal(phone.cancel.hidden,false,'planned trip can be cancelled');
 phone.press();
 assert.equal(phone.api.getStatus('monika').onboard,true);
 assert.equal(phone.button.textContent,'🚏 Leszálltam');
 phone.press();
 assert.equal(phone.api.getStatus('monika'),null);
 assert.equal(phone.button.textContent,'🚋 Felszálltam');
});

test('production uses v864 cache-busted existing route and keeps authenticated family delete',()=>{
 assert.match(html,/guardian-active-transit-v862\.js\?v=864-one-tap-alight/);
 assert.match(source,/if\(pending\?\.onboard\)\{stop\(\);return;\}/);
 assert.match(source,/if\(stopBtn\)stopBtn\.hidden=!!state\?\.onboard/);
 assert.match(source,/\.delete\(\)\.eq\('profile_key',which\)/);
 assert.doesNotMatch(source,/watchPosition\(/);
});
