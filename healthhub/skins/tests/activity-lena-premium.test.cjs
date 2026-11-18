'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const skin=fs.readFileSync(path.join(__dirname,'../lena-premium-v1.css'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../activity-lena-premium-v1.css'),'utf8');
const adapter=fs.readFileSync(path.join(root,'activity-premium-glass-v533.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const one=fs.readFileSync(path.join(root,'activity-one/index.html'),'utf8');
const full=fs.readFileSync(path.join(root,'live-v191.js'),'utf8');
const fast=fs.readFileSync(path.join(root,'activity-fast/activity-engine-v3.js'),'utf8');

test('Activity V1 only loads CSS on Activity open, never on Home',async()=>{
 const links=[],events={},rootAttrs={};
 const docRoot={dataset:{},setAttribute(k,v){rootAttrs[k]=v},getAttribute(k){return rootAttrs[k]??null}};
 let opened=false,owner='m',clicks=0;
 const page={
  attrs:{},classList:{contains(k){return k==='on'&&opened}},
  setAttribute(k,v){page.attrs[k]=v},getAttribute(k){return page.attrs[k]??null}
 };
 const doc={
  documentElement:docRoot,
  getElementById(k){return k==='hhActivityPage191'?page:null},
  head:{appendChild(el){links.push(el)}},
  createElement(k){assert.equal(k,'link');return {rel:'',href:'',listeners:{},addEventListener(k,cb){this.listeners[k]=cb}}},
 };
 const w={
  location:{search:''},
  localStorage:{getItem(k){assert.equal(k,'hh-profile');return owner}},
  hhOpenActivity(){clicks++;opened=true},
  addEventListener(k,fn){events[k]=fn}
 };
 const consoleMock={warn(){}};
 vm.runInNewContext(adapter,{document:doc,window:w,location:w.location,URLSearchParams,Promise,console:consoleMock,Error});
 assert.equal(links.length,1,'only the existing v533 CSS loaded on startup');
 assert.match(links[0].href,/activity-premium-glass-v533\.css/);
 links[0].listeners.load(); // Existing Activity Glass successfully available.
 assert.equal(links.length,1,'no new CSS while Activity is not open');
 w.hhOpenActivity();
 assert.equal(clicks,1,'existing Activity action still invoked exactly once');
 assert.equal(links.length,3,'two CSS-only skin assets loaded lazily');
 assert.equal(links.filter(x=>/lena-premium-v1\.css/.test(x.href)).length,2);
 links[1].listeners.load();links[2].listeners.load();
 await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(rootAttrs['data-hh-activity-lena-premium'],'on');
 assert.equal(page.attrs['data-hh-skin'],'lena-premium');
 assert.equal(page.attrs['data-hh-profile'],'monika');
 owner='z';
 events['healthhub:profile-changed']();
 assert.equal(page.attrs['data-hh-profile'],'zsolt');
 w.hhOpenActivity();
 assert.equal(links.length,3,'further Activity openings reuse loaded CSS');
});
test('Existing glass and new Léna theme can be independently disabled',()=>{
 for(const [search,expectedLinks] of [
  ['?hhlenaactivity=0',1],
  ['?hhactivityglass=0',0]
 ]){
  const links=[],attr={},page={classList:{contains(){return true}},setAttribute(){throw Error('must remain unstyled')}};
  const doc={
   documentElement:{dataset:{},setAttribute(k,v){attr[k]=v},getAttribute(k){return attr[k]??null}},
   getElementById(k){return k==='hhActivityPage191'?page:null},
   head:{appendChild(x){links.push(x)}},
   createElement(){return {addEventListener(k,fn){this[k]=fn}}}
  };
  const w={location:{search},localStorage:{getItem(){return 'm'}},hhOpenActivity(){},addEventListener(){}};
  vm.runInNewContext(adapter,{document:doc,window:w,location:w.location,URLSearchParams,Promise,console:{warn(){}}});
  assert.equal(links.length,expectedLinks);
  if(links[0])links[0].load();
  w.hhOpenActivity();
  assert.equal(links.length,expectedLinks,'opt-out must never pull in Skin Pack CSS');
 }
});
test('Adapter keeps 4+3 KPI layout, charts, forms, data provenance and exact route',()=>{
 assert.match(skin,/--lp-accent:#97d2ff/);
 assert.match(css,/#hhActivityPage191\[data-hh-skin="lena-premium"\]/);
 assert.match(css,/#hhActivityPage191\[data-hh-skin="lena-premium"\] \.a191Top/);
 assert.match(css,/#hhActivityPage191\[data-hh-skin="lena-premium"\] \.a191Small/);
 assert.match(css,/\.a191Card/);
 assert.match(css,/\.a191Chart/);
 assert.match(css,/\.a191TimelineSummary/);
 assert.match(css,/\.a191ManualBtns button/);
 assert.match(css,/#activityGoldenTop/);
 assert.match(css,/#activityGoldenBottom/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/min-height:44px/);
 assert.match(full,/window\.hh191ManualSave=function/);
 assert.match(fast,/window\.hh191ManualSave=function/);
 assert.match(fast,/function metrics\(/);
 assert.match(fast,/function chart\(/);
 assert.match(fast,/function categoryCards\(/);
 assert.match(one,/activity-fast\/activity-engine-v3\.js/);
 assert.match(one,/activity-premium-glass-v533\.js\?v=534-lena-premium-skin-v1/);
 assert.match(index,/activity-premium-glass-v533\.js\?v=534-lena-premium-skin-v1/);
 assert.doesNotMatch(index,/\.\/skins\/lena-premium-v1\.css\?v=1/,'CSS is loaded only after Activity opens');
 const scripts=[...one.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 assert.equal(scripts.length,9,'zero new JS dependency for the lightweight Activity launch');
 assert.doesNotMatch(adapter,/(fetch\s*\(|XMLHttpRequest|supabase\.from|uploadJson|downloadJson|localStorage\.setItem|indexedDB\.open|requestPermissions\s*\()/);
 assert.match(adapter,/page\.classList\.contains\('on'\)/);
 assert.match(adapter,/hhactivityglass/);
 assert.match(adapter,/hhlenaactivity/);
 assert.match(adapter,/healthhub:profile-changed/);
});
test('Activity Skin Pack CSS is visually scoped and syntactically balanced',()=>{
 assert.doesNotMatch(css,/(^|\n)\s*(body|html|:root|\.a191Kpi|\.a191Card)\s*\{/);
 assert.doesNotMatch(css,/@import|@font-face|https?:\/\/|url\(/i);
 let depth=0;
 for(const ch of css){if(ch==='{')depth++;if(ch==='}')depth--;assert.ok(depth>=0)}
 assert.equal(depth,0);
 assert.match(css,/--lp-surface/);
 assert.match(css,/--lp-accent/);
 assert.match(css,/--lp-border/);
 const selectors=css.match(/(?:^|\n)(?:html\[data-hh-[^\n{]+)\{/g)||[];
 assert.ok(selectors.length>=20,'skin rules guarded by the opt-in Activity markers');
});
