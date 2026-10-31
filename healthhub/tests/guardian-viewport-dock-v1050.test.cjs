'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const script=fs.readFileSync(path.join(__dirname,'../guardian/guardian-map-dock-fill-v828.js'),'utf8');
const page=fs.readFileSync(path.join(__dirname,'../guardian/index.html'),'utf8');

function harness({mode='sh9',navTop=735,mapTop=270,kind='navigate',hash='',keyboard=false}={}){
 const handlers={},writes=[],cleared=[],scrolls=[],timers=[],resizeCalls=[];
 let fullscreen=false,currentNav=mode==='pending'?null:{hidden:mode==='hidden',display:mode==='hidden'?'none':'grid',top:navTop};
 const input={addEventListener(){}};
 const card={style:{setProperty(k,v){writes.push({k,v})},removeProperty(k){cleared.push(k)}},
  classList:{contains(){return fullscreen}},getBoundingClientRect(){return {top:mapTop}}};
 const legacy={display:'none',getBoundingClientRect(){return {top:0}}};
 const sh9={get hidden(){return currentNav?.hidden??true},
  get display(){return currentNav?.display??'none'},
  getBoundingClientRect(){return {top:currentNav?.top??0}}};
 const transit={hidden:mode!=='transit',display:mode==='transit'?'grid':'none',
  getBoundingClientRect(){return {top:navTop-10}}};
 const nodeStyle={setProperty(k,v,priority){writes.push({k,v,priority})},
  removeProperty(k){cleared.push(k)}};
 const mapNode={style:nodeStyle};
 const document={
  activeElement:keyboard?input:null,
  scrollingElement:{scrollTop:234},documentElement:{scrollTop:234},
  body:{classList:{contains(){return fullscreen}}},
  querySelector(q){return q==='.map-card'?card:null},
  getElementById(id){return ({guardianHHNav:mode==='legacy'?{hidden:false,display:'grid',getBoundingClientRect(){return {top:navTop}}}:legacy,
   sh9GlobalNavV24:mode==='legacy'?null:mode==='pending'&&!currentNav?null:sh9,
   sh9TransitNavV927:transit,guardianMap:mapNode,guardianMapSearchInputV819:input})[id]||null}
 };
 const window={
  location:{hash},
  performance:{getEntriesByType(){return [{type:kind}]}},
  matchMedia(){return {matches:true}},
  HH_GUARDIAN_V761:{map:{resize(){resizeCalls.push(true)}}},
  getComputedStyle(n){return {display:n.display||'grid',visibility:'visible'}},
  requestAnimationFrame(fn){fn();return 1},
  setTimeout(fn,ms){timers.push({fn,ms});return timers.length},
  addEventListener(n,fn){handlers[n]=fn},
  scrollTo(x,y){scrolls.push([x,y])},
  visualViewport:{addEventListener(){}}
 };
 vm.runInNewContext(script,{window,document,Number,Math});
 return {writes,cleared,scrolls,timers,handlers,document,card,
  get resizeCalls(){return resizeCalls.length},
  enableDock(top=735){currentNav={hidden:false,display:'grid',top}}};
}

test('normal Family Guard measures the visible SH9 dock, not retired hidden Guardian dock',()=>{
 const h=harness({mode:'sh9',navTop:735,mapTop:270});
 assert.equal(h.writes.find(w=>w.k==='height')?.v,'463px');
 assert.equal(h.writes.find(w=>w.k==='height')?.priority,'important');
 assert.ok(h.writes.some(w=>w.k==='--hh-guardian-map-dock-height-v828'&&w.v==='463px'));
});
test('legacy Guardian navigation still works when SH9 dock is not present',()=>{
 const h=harness({mode:'legacy',navTop:730,mapTop:262});
 assert.ok(h.writes.some(w=>w.k==='height'&&w.v==='466px'));
});
test('SH9 Transit navigation wins in transit-only mode',()=>{
 const h=harness({mode:'transit',navTop:730,mapTop:260});
 assert.ok(h.writes.some(w=>w.k==='height'&&w.v==='458px'));
});
test('late SH9 dock insertion gets detected on bounded follow-up layout pass',()=>{
 const h=harness({mode:'pending',navTop:735,mapTop:270});
 assert.equal(h.writes.filter(w=>w.k==='height').length,0);
 h.enableDock(735);
 h.handlers.resize();
 assert.ok(h.writes.some(w=>w.k==='height'&&w.v==='463px'));
});
test('mobile refresh returns scroll to top, then recomputes viewport against visible nav',()=>{
 const h=harness({kind:'reload'});
 h.handlers.pageshow({persisted:false});
 assert.deepEqual(h.scrolls,[[0,0]]);
 assert.equal(h.document.scrollingElement.scrollTop,0);
});
test('history navigation and deep links are not forcibly scrolled',()=>{
 const b=harness({kind:'back_forward'}),deep=harness({kind:'reload',hash:'#saved-place'});
 b.handlers.pageshow({persisted:true});
 deep.handlers.pageshow({persisted:false});
 assert.equal(b.scrolls.length,0);
 assert.equal(deep.scrolls.length,0);
});
test('keyboard focus and fullscreen never make destructive height changes',()=>{
 const h=harness({keyboard:true});
 assert.equal(h.writes.filter(w=>w.k==='height').length,0);
 h.document.activeElement=null;
 h.handlers.resize();
 assert.ok(h.writes.some(w=>w.k==='height'));
 h.document.body.classList.contains=()=>true;
 h.handlers.resize();
 assert.ok(h.cleared.includes('height'));
});
test('no GPS, auth, networking or timer polling introduced by viewport-only fix',()=>{
 assert.match(page,/guardian-map-dock-fill-v828\.js\?v=1050-sh9-visible-dock-viewport/);
 assert.match(script,/sh9GlobalNavV24/);
 assert.match(script,/getBoundingClientRect\(\)/);
 assert.doesNotMatch(script,/navigator\.geolocation|watchPosition|supabase|dropbox|fetch\(|setInterval\(/i);
});
