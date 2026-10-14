'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'premium-glass-home-v520.js'),'utf8');
const css=fs.readFileSync(path.join(root,'premium-glass-home-v520.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(html,/premium-glass-home-v520\.js\?v=520-optin-preview/);
assert.match(source,/params\.get\('hhpremium'\)!=='1'/,'preview must be opt-in');
assert.match(css,/data-hh-premium-preview="on"/,'all preview visuals scoped');
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css,/timeline-hero-v222\.webp/,'existing approved Lena hero reused until character master is approved');
assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage\.setItem/,'preview never writes profile or health data');

class Fake {
 constructor(tag){this.tagName=tag;this.children=[];this.className='';this.dataset={};this.style={};this.listeners={};this.attributes={};this.textContent='';}
 appendChild(n){this.children.push(n);n.parentNode=this;return n}
 insertBefore(n,before){const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,n);n.parentNode=this;return n}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,cb){this.listeners[k]=cb}
 click(){this.clicked=(this.clicked||0)+1;if(this.listeners.click)this.listeners.click()}
 querySelector(k){return k==='b'?this.titleNode:null}
}
function load(query){
 let selected='z';const pageCalls=[],opened=[];
 const host=new Fake('main'),old=new Fake('div');
 old.parentNode=host;host.children=[old];
 const profile=new Fake('button');
 const avatars=[{src:'data:image/png;base64,profilez'},{src:'data:image/png;base64,profilem'}];
 const oldTiles=['Sleep','Activity','Nutrition','Ask Léna','Receptár'];
 const legacy=oldTiles.map(name=>{const e=new Fake('button');e.titleNode={textContent:name};return e});
 const healthStrip=new Fake('button');
 const document={
  readyState:'complete',documentElement:{dataset:{}},head:new Fake('head'),
  createElement(tag){return new Fake(tag)},
  getElementById(id){
   if(id==='hhPremiumGrid520')return host.children.find(n=>n.id===id)||null;
   if(id==='hhDailyHealthStrip312')return healthStrip;
   return null;
  },
  querySelector(q){
   if(q==='#home .homeModules')return old;
   if(q==='#home #heroHome .profileHit')return profile;
   return null;
  },
  querySelectorAll(q){
   if(q==='#overlay .choice img')return avatars;
   if(q==='#home .homeModules .homeModule')return legacy;
   return [];
  },
  addEventListener(){}
 };
 const location={search:query,href:'https://example.test/healthhub/index.html'+query,assign(url){opened.push(url)}};
 const window={
  location,localStorage:{getItem(k){assert.equal(k,'hh-profile');return selected}},
  show(id){pageCalls.push(id)},hhOpenActivity(){pageCalls.push('activity')},
  hhOpenLenaSmart299(){pageCalls.push('ask')},
  HH_DAILY_HEALTH_V312:{open(){pageCalls.push('dailyhealth')}},
  addEventListener(){},toast(s){opened.push('toast:'+s)}
 };
 vm.runInNewContext(source,{window,document,URLSearchParams,URL});
 return {document,host,profile,legacy,healthStrip,window,pageCalls,opened,setProfile(p){selected=p}};
}
const off=load('?hhv=407');
assert.equal(off.host.children.length,1,'default Home remains byte-for-byte unmigrated in DOM');
assert.equal(off.window.HH_PREMIUM_HOME_V520,undefined,'no preview API outside explicit opt-in');
const on=load('?hhv=407&hhpremium=1');
const grid=on.host.children.find(n=>n.id==='hhPremiumGrid520');
assert.ok(grid,'the preview Home inserts a distinct 12-tile grid');
assert.equal(grid.children.length,12);
assert.equal(grid.children.map(n=>n.dataset.key).join('|'),
 'health|records|meds|sleep|activity|digital|nutrition|ask|timeline|spark|headline|dailyhealth');
assert.equal(on.document.documentElement.dataset.hhPremiumPreview,'on');
assert.equal(on.document.documentElement.dataset.hhPremiumTiles,'12');
assert.equal(grid.children[7].children[1].textContent,'Ask Léna','Ask Lena is centered on row 3');
assert.equal(grid.children[9].dataset.group,'daily');
assert.equal(grid.children[11].dataset.group,'daily');
assert.equal(on.document.documentElement.dataset.hhpgProfile,'z');
assert.match(on.profile.style.backgroundImage,/profilez/);
on.setProfile('m');on.window.HH_PREMIUM_HOME_V520.updateProfile();
assert.equal(on.document.documentElement.dataset.hhpgProfile,'m');
assert.match(on.profile.style.backgroundImage,/profilem/);
on.window.HH_PREMIUM_HOME_V520.go('records');
on.window.HH_PREMIUM_HOME_V520.go('meds');
on.window.HH_PREMIUM_HOME_V520.go('timeline');
on.window.HH_PREMIUM_HOME_V520.go('spark');
on.window.HH_PREMIUM_HOME_V520.go('headline');
on.window.HH_PREMIUM_HOME_V520.go('activity');
on.window.HH_PREMIUM_HOME_V520.go('ask');
assert.equal(on.pageCalls.join('|'),'health|health|timeline|spark|briefing|activity|ask');
on.window.HH_PREMIUM_HOME_V520.go('sleep');
assert.equal(on.legacy[0].clicked,1,'existing Sleep route is reused');
on.window.HH_PREMIUM_HOME_V520.go('nutrition');
assert.equal(on.legacy[2].clicked,1,'existing Nutrition route is reused, not fabricated');
on.window.HH_PREMIUM_HOME_V520.go('dailyhealth');
assert.equal(on.healthStrip.clicked,1,'Daily Health opens the existing consented report');
on.window.HH_PREMIUM_HOME_V520.go('digital');
assert.equal(on.opened[0],'https://example.test/healthhub/digital-health/');
console.log('Premium Glass Home v520: opt-in, 12 tiles, actual routes, avatar profiles, unchanged default PASS');
