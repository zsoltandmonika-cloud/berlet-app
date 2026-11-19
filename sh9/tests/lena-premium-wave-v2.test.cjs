'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const get=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const css=get('sh9/shared/lena-premium-wave-v2.css');
const js=get('sh9/shared/lena-premium-wave-v2.js');
const sleep=get('healthhub/sleep-premium-v1172.css');
const activityV1=get('healthhub/skins/activity-lena-premium-v1.css');
const activityV2=get('healthhub/skins/activity-lena-benchmark-v2.css');
const activityLoader=get('healthhub/activity-premium-glass-v533.js');
const guardian=get('healthhub/guardian/index.html');
const guardianV1=get('healthhub/guardian/guardian-lena-premium-v1182.css');
const guardianLower=get('healthhub/guardian/guardian-lena-premium-lower-v1183.css');
const guardianV2=get('healthhub/guardian/guardian-lena-benchmark-v1184.css');

test('Eleven core and important SHO subpages opt in without nav/layout rebuild',()=>{
 const pages={
  'sh9/index.html':'launcher','sh9/smart-travel/index.html':'travel',
  'sh9/shopping/index.html':'shopping','sh9/sport/index.html':'sport',
  'sh9/wallet/index.html':'wallet','sh9/entertainment/index.html':'entertainment',
  'sh9/family-hub/index.html':'family','healthhub/nutrition/index.html':'nutrition',
  'sh9/notification-center/index.html':'notifications',
  'sh9/smart-travel/my-trips/index.html':'mytrips',
  'sh9/entertainment/book-studio/index.html':'books'
 };
 for(const [file,module] of Object.entries(pages)){
  const html=get(file);
  assert.match(html,new RegExp('<body(?: class="bshelf-v10-page")? data-lp-v2="on" data-lp-module="'+module+'">'),file);
  assert.match(html,/sh9\/shared\/lena-premium-wave-v2\.css\?v=2-sleep1173/,file);
  assert.match(html,/sh9\/shared\/lena-premium-wave-v2\.js\?v=2-owner/,file);
  assert.equal((html.match(/lena-premium-wave-v2\.css\?/g)||[]).length,1,file);
  assert.equal((html.match(/lena-premium-wave-v2\.js\?/g)||[]).length,1,file);
  assert.match(css,new RegExp('body\\[data-lp-module="'+module+'"\\]'),file+' has matching scoped styles');
 }
 const main=get('sh9/index.html');
 assert.equal((main.match(/<button class="tile(?: [^"]*)?" data-module="/g)||[]).length,12,'same SHO main module tiles');
 assert.match(main,/data-sh9-golden-bottom-nav="on"/);
 assert.match(main,/id="sh9CalendarCell"/);
 assert.match(main,/id="sh9OtaIndicatorV1043"/);
 assert.match(main,/id="hu"/);
 assert.match(main,/id="en"/);
 assert.match(main,/class="sho-unified-dock"/);
 assert.doesNotMatch(css,/\.tile\{[^\n]*height:/,'do not change tile dimensions');
});
test('Wave is EXACT reference used in approved Sleep v1173',()=>{
 const m=sleep.match(/#hhSleepPage\.hhSleepPage \.hhSleepTop:after\{[\s\S]*?background:url\("([^"]+)"\) center\/100% 100% no-repeat/);
 assert.ok(m,'approved source exposes its original wave');
 for(const [file,str] of [
  ['SHO',css],['Activity',activityV2],['Family Guard',guardianV2]
 ])assert.ok(str.includes(m[1]),file+' embeds the exact approved vector wave');
 assert.match(css,/--lpv-wave:/);
 assert.match(css,/\.module-board/);
 assert.match(css,/\.module-grid \.tile::after/);
 assert.match(activityV2,/\.a191Body::before/);
 assert.match(activityV2,/\.a191Top \.a191Kpi:nth-child\(2\)/);
 assert.match(guardianV2,/#hhTransitPanel\.hh-transit-panel/);
 assert.match(guardianV2,/#guardianAdminControlsV963/);
 assert.match(guardian,/<link rel="stylesheet" href="\.\/guardian-lena-benchmark-v1184\.css\?v=1184-sleep-v1173-wave">/);
});
test('No runtime data, GPS, booking, health or security changes from Wave v2 skin',()=>{
 for(const [file,str] of [['SHO CSS',css],['Activity CSS',activityV2],['Guardian CSS',guardianV2]]){
  assert.doesNotMatch(str,/fetch\(|XMLHttpRequest|localStorage|indexedDB|supabase|requestPermissions|@import|@font-face/);
  let d=0;for(const ch of str){if(ch==='{')d++;else if(ch==='}')d--;assert.ok(d>=0,file+' no negative brace')}
  assert.equal(d,0,file+' all CSS blocks balance');
 }
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
 assert.match(css,/data-lp-v2="on"/);
 assert.match(guardianV2,/:root:not\(\[data-sh9-transit="on"\]\)/);
 assert.doesNotMatch(guardianV2,/#guardianTrioV845|#guardianPackBluetoothV1053|#guardianMap\b|#guardianMapSearchV819/);
 assert.match(guardianV1,/#guardianTrioV845/);
 assert.match(guardianLower,/guardian-admin-controls-v963/);
 assert.match(activityLoader,/activity-lena-benchmark-v2\.css\?v=2-sleep1173/);
 assert.match(activityV1,/\.a191Kpi/);
 assert.doesNotMatch(js,/localStorage\.setItem|fetch\(|XMLHttpRequest|navigator\.|setInterval|setTimeout|requestPermissions/);
});
test('V2 owner palette responds to profile without touching user data',()=>{
 const attrs={};
 const listeners={},store={'hh-profile':'m'};
 const el={getAttribute(k){return attrs[k]??null},setAttribute(k,v){attrs[k]=v}};
 let observer=null;
 class Obs{constructor(fn){observer=fn}observe(target,opts){
  assert.equal(target,el);
  assert.ok(opts.attributeFilter.includes('data-sh9-golden-profile'));
 }}
 const doc={documentElement:el};
 const w={addEventListener(type,cb){listeners[type]=cb}};
 const loc={getItem(k){assert.equal(k,'hh-profile');return store[k]}};
 vm.runInNewContext(js,{document:doc,window:w,localStorage:loc,MutationObserver:Obs});
 assert.equal(attrs['data-lpv-owner'],'m');
 attrs['data-sh9-golden-profile']='z';observer();
 assert.equal(attrs['data-lpv-owner'],'z');
 delete attrs['data-sh9-golden-profile'];store['hh-profile']='m';
 listeners['healthhub:profile-changed']();
 assert.equal(attrs['data-lpv-owner'],'m');
 store['hh-profile']='z';
 listeners['storage']({key:'hh-profile'});
 assert.equal(attrs['data-lpv-owner'],'z');
 assert.match(css,/:root\[data-lpv-owner="m"\]/);
});
test('The pristine Sleep benchmark is not re-imported or rewritten',()=>{
 const standalone=get('healthhub/sleep-one/index.html');
 assert.match(standalone,/sleep-premium-v1172\.css\?v=1173-lena-demo-fidelity/);
 assert.doesNotMatch(standalone,/lena-premium-wave-v2/);
 const central=get('healthhub/index.html');
 assert.doesNotMatch(central,/lena-premium-wave-v2/);
 assert.match(guardian,/guardian-lena-premium-v1182\.css\?v=1182-guardian-energy-bluetooth/);
 assert.match(guardian,/guardian-lena-premium-lower-v1183\.css\?v=1183-full-scroll/);
});
