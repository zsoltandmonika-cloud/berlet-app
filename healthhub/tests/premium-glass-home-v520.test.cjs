'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'premium-glass-home-v520.js'),'utf8');
const css=fs.readFileSync(path.join(root,'premium-glass-home-v520.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(html,/premium-glass-home-v520\.js\?v=594-nutrition-golden-live-beta/);
assert.ok(source.includes("params.get('hhpremium')==='0'"),'approved Home is default; classic is opt-out');
assert.match(css,/data-hh-premium-preview="on"/,'all preview visuals scoped');
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.ok(css.includes('timeline-hero-v222.webp'),'Zsolt base preview hero remains unchanged');
const uploadedAsset=path.join(root,'assets','monika-hh-hero-approved-v5261.png');
assert.ok(fs.existsSync(uploadedAsset),'exact uploaded Mónika Hero PNG must exist before merging this PR');
const png=fs.readFileSync(uploadedAsset);
assert.equal(require('node:crypto').createHash('sha256').update(png).digest('hex'),'bb61deaf03db5121c76570bee2449d67060e6c407d0c1a1b7537150bbf46aa5e','asset bytes must exactly match Mónika approved uploaded PNG');
assert.ok(css.includes('monika-hh-hero-approved-v5261.png'),'Mónika Premium Home uses the user-selected exact Mónika Hero PNG');

// v527: reject a generated lookalike, tint, or modified rendition.
const zAsset=path.join(root,'assets','zsolt-hh-hero-approved-v527.png');
assert.ok(fs.existsSync(zAsset),'exact Zsolt PNG must be present before merge');
const zBytes=fs.readFileSync(zAsset);
assert.equal(zBytes.length,3036484,'Zsolt image byte count must match user-uploaded source');
assert.equal(require('node:crypto').createHash('sha256').update(zBytes).digest('hex'),
 'ec4144d464340ae9b95f52dfdaba775d88d0499c436ad3eac3c6132e335f930a',
 'Zsolt Hero image must be exactly the chosen original PNG');
const zCss=fs.readFileSync(path.join(root,'premium-zsolt-hero-v527.css'),'utf8');
assert.ok(source.includes('premium-zsolt-hero-v527.css?v=527-exact-zsolt-blue'));
assert.ok(zCss.includes('zsolt-hh-hero-approved-v527.png'),'Zsolt-only light-blue hero CSS');
assert.ok(zCss.includes('[data-hhpg-profile="z"]'),'Zsolt-only theme');
assert.ok(zCss.includes('#hhOneRag500')&&zCss.includes('#hhOneFallback501'),'light-blue HH ONE');
assert.doesNotMatch(zCss,/data-hhpg-profile="m"/,'never restyle Mónika');

const monikaHeroSection=css.split('/* v523 · Reconnect Mónika')[1];
assert.ok(monikaHeroSection,'approved Budapest hero override present');
assert.match(monikaHeroSection,/data-hhpg-profile="m"/,'Mónika only');
assert.doesNotMatch(monikaHeroSection,/data-hhpg-profile="z"/,'no Zsolt image changes');
assert.match(monikaHeroSection,/background-size:cover!important/,'photo fills the Hero without stretching');
assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage\.setItem/,'preview never writes profile or health data');
assert.match(source,/premium-glass-home-v520\.css\?v=5261-exact-monika-hero/,'rose preview CSS cache busted');
const pink=css.split('/* v521 · Mónika\'s Budapest-night rose light:')[1];
assert.ok(pink,'Mónika-only glass enhancements exist');
assert.match(pink,/data-hhpg-profile="m"/,'pink is exclusively under Mónika data attribute');
assert.doesNotMatch(pink,/data-hhpg-profile="z"/,'no Zsolt palette overrides in the new section');
assert.match(pink,/#heroHome::after/,'soft matching rose glow around original hero without replacing Léna');
assert.match(pink,/pointer-events:none/,'hero glow never blocks the profile switch');
assert.match(pink,/\.hhpg-tile\[data-group="daily"\]/,'Daily cards get delicate matching rose treatment');
assert.match(pink,/\.hhpg-tile:focus-visible/,'keyboard focus stays visible for Mónika');
const lines=pink.split('\n').filter(line=>/^html\[data-hh-premium-preview="on"\]/.test(line));
assert.ok(lines.length>=10,'profile-specific selectors cover whole experience');
assert.ok(lines.every(line=>line.includes('[data-hhpg-profile="m"]')),
 'all new overrides require opt-in and Mónika profile');


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
 const profile=new Fake('button'),timelineProfile=new Fake('button'),healthProfile=new Fake('button'),hero=new Fake('div');
 const styles={};
 hero.style={
  getPropertyValue(k){return styles[k]||''},
  setProperty(k,v,priority){assert.equal(priority,'important');styles[k]=v},
  _values:styles
 };
 hero.style.setProperty('background-image','url("./assets/hero-home-z-approved-v215.webp?v=215")','important');
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
   if(q==='#home #heroHome')return hero;
   return null;
  },
  querySelectorAll(q){
   if(q==='#overlay .choice img')return avatars;
   if(q==='.page .hero .profileHit')return [profile,timelineProfile,healthProfile];
   if(q==='#home .homeModules .homeModule')return legacy;
   return [];
  },
  addEventListener(){}
 };
 const location={search:query,href:'https://example.test/healthhub/index.html'+query,assign(url){opened.push(url)}};
 const window={
  listeners:{},
  MutationObserver:class{constructor(cb){hero.mutationCallback=cb}observe(target){assert.equal(target,hero)}},
  location,localStorage:{getItem(k){assert.equal(k,'hh-profile');return selected}},
  show(id){pageCalls.push(id)},hhOpenActivity(){pageCalls.push('activity')},
  hhOpenLenaSmart299(){pageCalls.push('ask')},
  HH_DAILY_HEALTH_V312:{open(){pageCalls.push('dailyhealth')}},
  addEventListener(key,fn){this.listeners[key]=fn},toast(s){opened.push('toast:'+s)}
 };
 vm.runInNewContext(source,{window,document,URLSearchParams,URL});
 return {document,host,hero,profile,timelineProfile,healthProfile,legacy,healthStrip,window,pageCalls,opened,setProfile(p){selected=p}};
}
const off=load('?hhpremium=0');
assert.equal(off.host.children.length,1,'explicit classic fallback never mounts Premium tiles');
assert.equal(off.window.HH_PREMIUM_HOME_V520,undefined,'classic fallback has no Premium API');
const on=load('?hhv=528');
const explicitPremium=load('?hhpremium=1');
assert.equal(explicitPremium.host.children.find(n=>n.id==='hhPremiumGrid520').children.length,12,'older preview bookmarks remain valid');
const grid=on.host.children.find(n=>n.id==='hhPremiumGrid520');

// The legacy v216 Home sets the image using INLINE !important, which previously
// defeated the v523 stylesheet override. Assert the real canonical switch event
// changes both the theme and the inline image without leaking profiles.
assert.equal(typeof on.window.listeners['healthhub:profile-changed'],'function');
assert.equal(on.hero.style.getPropertyValue('height'),'228px');
on.setProfile('m');
on.window.listeners['healthhub:profile-changed']();
assert.equal(on.document.documentElement.dataset.hhpgProfile,'m');
assert.ok(on.hero.style.getPropertyValue('background-image').includes('monika-hh-hero-approved-v5261.png'));
on.hero.style.setProperty('background-image','url("./assets/hero-home-m-approved-v215.webp?v=215")','important');
on.hero.mutationCallback();
assert.ok(on.hero.style.getPropertyValue('background-image').includes('monika-hh-hero-approved-v5261.png'),'legacy delayed repaint repaired');
on.setProfile('z');
on.window.listeners['healthhub:profile-changed']();
assert.equal(on.document.documentElement.dataset.hhpgProfile,'z');
assert.ok(!on.hero.style.getPropertyValue('background-image').includes('monika-hh-hero-approved-v5261.png'),'Zsolt image restored');
assert.ok(on.hero.style.getPropertyValue('background-image').includes('zsolt-hh-hero-approved-v527.png'),'exact Zsolt image selected');
on.hero.style.setProperty('background-image','url("./assets/hero-home-z-approved-v215.webp?v=215")','important');
on.hero.mutationCallback();
assert.ok(on.hero.style.getPropertyValue('background-image').includes('zsolt-hh-hero-approved-v527.png'),'Zsolt legacy repaint corrected');
on.setProfile('m');on.window.listeners['healthhub:profile-changed']();
assert.ok(on.hero.style.getPropertyValue('background-image').includes('monika-hh-hero-approved-v5261.png'),'Mónika exact asset still used');
on.setProfile('z');on.window.listeners['healthhub:profile-changed']();
assert.ok(on.hero.style.getPropertyValue('background-image').includes('zsolt-hh-hero-approved-v527.png'),'repeated switches return Zsolt image');

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
assert.match(on.timelineProfile.style.backgroundImage,/profilez/,'Timeline switch uses the same Zsolt avatar');
assert.match(on.healthProfile.style.backgroundImage,/profilez/,'Health switch uses the same Zsolt avatar');
on.setProfile('m');on.window.HH_PREMIUM_HOME_V520.updateProfile();
assert.equal(on.document.documentElement.dataset.hhpgProfile,'m');
assert.match(on.profile.style.backgroundImage,/profilem/);
assert.match(on.timelineProfile.style.backgroundImage,/profilem/,'Timeline updates to Mónika with the same source');
assert.match(on.healthProfile.style.backgroundImage,/profilem/,'Health updates to Mónika with the same source');
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
console.log('Premium Glass Home v528: default on, opt-out classic, 12 routes, two profiles, approved images PASS');
