'use strict';
/* HHSP1 v594: both old and permanent mobile entry links must load the
 * approved Buddy/scroll selector by default, with an explicit classic fallback.
 * Synthetic UI only, no private profile or patient data.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scroll=fs.readFileSync(path.join(root,'health-scroll-select-v592.js'),'utf8');
const buddy=fs.readFileSync(path.join(root,'hh-buddy-scroll-companion-v593.js'),'utf8');

assert.ok(html.includes('content="v652-global-profile-pill"'),'HTML build identifies the current version');
assert.ok(html.includes("var v='652-global-profile-pill'"),'bootstrap rewrites legacy hhv URL to current build');
assert.ok(html.includes("u.searchParams.set('hhv',v)"),'existing shortcut URL is normalized without changing app path');
assert.ok(html.includes("history.replaceState(history.state,'',u.toString())"),'canonical build URL is updated without new navigation');
assert.ok(html.includes('health-scroll-select-v592.js?v=594-default-buddy-live'),'scroll selector fetches new source instead of stale cached v593');
assert.ok(html.includes('hh-buddy-scroll-companion-v593.js?v=595-scroll-tick-clean-buddy'),'Buddy fetches new source instead of stale cached v593');
assert.ok(html.indexOf('hh-private-medications-v593.js')<html.indexOf('health-scroll-select-v592.js'));
assert.ok(html.indexOf('health-scroll-select-v592.js')<html.indexOf('hh-buddy-scroll-companion-v593.js'));
function activate(source,search){
 const loaded=[],listeners={};
 const document={
  head:{appendChild(x){loaded.push(x)}},
  documentElement:{dataset:{}},
  createElement(tag){return {tag,style:{},className:'',setAttribute(){},addEventListener(){}}},
  addEventListener(name,fn){listeners[name]=fn},
  getElementById(){return null}
 };
 const window={
  location:{search},
  localStorage:{getItem(){return 'z'}},
  renderHealthSection:async()=>{},
  addEventListener(){},matchMedia(){return {matches:false}}
 };
 vm.runInNewContext(source,{window,document,URLSearchParams,console,Date},{timeout:2000});
 return {window,document,loaded,listeners};
}
for(const url of ['', '?hhv=591-health-measurements-hero','?hhv=594-default-scroll-buddy','?hhscrollselect=1']){
 const s=activate(scroll,url),b=activate(buddy,url);
 assert.ok(s.window.HH_HEALTH_SCROLL_SELECT_V592,'scroll UI must be default for '+url);
 assert.ok(b.window.HH_BUDDY_SCROLL_V593,'Buddy must be default for '+url);
 assert.equal(s.loaded.length,1,'scroll CSS must load for '+url);
 assert.equal(b.loaded.length,1,'Buddy CSS must load for '+url);
 assert.equal(typeof b.listeners.click,'function','Buddy user-click sound listener installed for '+url);
}
for(const url of ['?hhscrollselect=0','?hhpremium=0','?hhscrollselect=0&hhpremium=0']){
 const s=activate(scroll,url),b=activate(buddy,url);
 assert.equal(s.window.HH_HEALTH_SCROLL_SELECT_V592,undefined,'scroll fallback with '+url);
 assert.equal(b.window.HH_BUDDY_SCROLL_V593,undefined,'Buddy fallback with '+url);
 assert.equal(s.loaded.length,0,'no scroll CSS with '+url);
 assert.equal(b.loaded.length,0,'no Buddy CSS with '+url);
}
console.log('HHSP1 v594 old mobile shortcut, default scroll/Buddy and explicit fallback PASS');
