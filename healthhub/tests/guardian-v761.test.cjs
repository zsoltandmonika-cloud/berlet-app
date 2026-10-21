'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('approved 12-tile Home replaces only Timeline entry with Guardian',()=>{
 const js=read('premium-glass-home-v520.js'),html=read('index.html'),css=read('premium-glass-home-v520.css');
 new Function(js);
 const arr=js.slice(js.indexOf('var TILES=[')+'var TILES='.length,js.indexOf('];',js.indexOf('var TILES=['))+2);
 const tiles=vm.runInNewContext(arr);
 assert.equal(tiles.length,12,'Home still has exactly twelve entries');
 assert.equal(tiles[8][0],'guardian','Guardian occupies the exact old Timeline slot');
 assert.equal(tiles[8][1],'Family Guard');
 assert.ok(!tiles.some(t=>t[0]==='timeline'),'old standalone Home tile retired, Timeline page not deleted');
 assert.match(js,/guardian:'<path/);
 assert.match(js,/if\(key==='guardian'\)/);
 assert.match(js,/new URL\('\.\/guardian\/',root\.location\.href\)/);
 assert.match(js,/if\(key==='timeline'\)return showPage\('timeline'\)/);
 assert.match(css,/\.hhpg-tile\[data-key="guardian"\]/);
 assert.match(css,/data-hhpg-profile="m"\] #home \.hhpg-tile\[data-key="guardian"\]/);
 assert.match(html,/premium-glass-home-v520\.js\?v=761-guardian-home/);
});

test('the original Timeline opens unchanged via Health submenu',()=>{
 const js=read('health-timeline-entry-v761.js'),html=read('index.html');
 new Function(js);
 assert.match(html,/health-timeline-entry-v761\.js\?v=761-submenu/);
 assert.match(js,/querySelector\('\.quick'\)/);
 assert.match(js,/tile\.className='q hhTimelineQuick761'/);
 assert.match(js,/w\.show\('timeline'\)/);
 assert.doesNotMatch(js,/indexedDB|\.setItem\(|\.deleteDatabase\(/);
 assert.match(html,/timeline-truth-v725\.js/,'actual Timeline data pipeline remains');
});

test('the Family Guard Hero and 3D map carry both approved profiles',()=>{
 const html=read('guardian/index.html'),css=read('guardian/guardian.css'),js=read('guardian/guardian.js'),polish=read('guardian/guardian-polish-v767.css');
 new Function(js);
 assert.match(html,/LÉNA · FAMILY GUARD/);
 assert.match(html,/id="guardianMap"/);
 assert.match(html,/id="guardian3D"/);
 assert.match(html,/id="guardianFamilyPanel"/);
 assert.match(html,/id="guardianMePhoto"/);
 assert.match(html,/id="guardianOtherPhoto"/);
 assert.match(html,/Corky/);
 assert.match(html,/maplibre-gl@4\.7\.1/);
 assert.match(css,/zsolt-hh-hero-approved-v527\.png/);
 assert.match(css,/monika-hh-hero-approved-v5261\.png/);
 assert.match(css,/data-guardian-profile="m"/);
 assert.match(js,/https:\/\/tiles\.openfreemap\.org\/styles\/dark/);
 assert.match(js,/type:'fill-extrusion'/);
 assert.match(js,/function toggle3D\(\)/);
 assert.match(js,/function applyGoldenMapStyle/);
 assert.match(js,/setLayoutProperty/);
 assert.match(js,/const img=d.createElement/);
 assert.match(js,/HH_GOLDEN_AVATARS_V529/);
 assert.match(html,/id="guardianSatellite"/);
 assert.match(html,/id="guardianSatelliteNotice"/);
 assert.match(html,/id="guardianHHNav"/);
 assert.match(html,/id="guardianProfileSwitch" class="guardian-standard-profile"/);
 assert.doesNotMatch(html,/id="guardianAvatar"/,'no second profile switch');
 assert.match(polish,/width:min\(100vw,420px\)/,'canonical taskbar width');
 assert.match(polish,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/,'five buttons');
 assert.match(polish,/bottom:calc\(70px/,'left profile above taskbar');
 assert.match(polish,/brightness\(1\.38\)/,'lightened map');
 assert.match(js,/function toggleSatellite\(\)/);
 assert.match(js,/tiles\.maps\.eox\.at/,'EOX satellite WMTS');
 assert.match(js,/EOxCloudless 2020/,'clear source licensing');
 assert.match(js,/const existing=layers\.find/,'reuse existing dark-map vector source');
 assert.match(js,/if\(!existing\)map\.addSource\(source/,'only load a fallback building source if needed');
 assert.match(js,/path\.length<2\?\[\]/,'empty route must not publish invalid LineString geometry');
});

test('GPS is opt-in, memory-only, stops on background and explicit stop',()=>{
 const script=read('guardian/guardian.js');
 const controls={};
 const events={},winEvents={};
 const d={
  hidden:false,documentElement:{dataset:{}},
  createElement(){return {className:''}},
  getElementById(id){
   if(!controls[id]){
    controls[id]={
     id,addEventListener(ev,cb){this[ev]=cb},
     setAttribute(name,val){this[name]=val},
     classList:{toggle(){}},disabled:false,hidden:false,textContent:''
    };
   }
   return controls[id];
  },
  addEventListener(name,cb){events[name]=cb}
 };
 let profile='z';
 let nextWatch=0,stopped=[];
 const geo={watchPosition(){return ++nextWatch},clearWatch(id){stopped.push(id)}};
 const w={
  navigator:{geolocation:geo},isSecureContext:true,localStorage:{getItem(key){return key==='hh-profile'?profile:'z'},setItem(key,value){if(key==='hh-profile')profile=value}},
  HH_GOLDEN_AVATARS_V529:{z:'data:image/png;base64,z',m:'data:image/png;base64,m'},
  addEventListener(name,cb){winEvents[name]=cb},console:{warn(){}},
 };
 vm.runInNewContext(script,{window:w,document:d,Date,Math,Number,String,Set});
 assert.equal(nextWatch,0,'opening the Guardian must NOT request GPS');
 assert.equal(w.HH_GUARDIAN_V761.active,false);
 controls.guardianStart.click();
 assert.equal(nextWatch,1);
 assert.equal(w.HH_GUARDIAN_V761.active,true);
 controls.guardianSatellite.click();
 assert.equal(controls.guardianSatellite['aria-pressed'],'true','satellite can be activated');
 assert.equal(controls.guardianSatelliteNotice.hidden,false);
 controls.guardianSatellite.click();
 assert.equal(controls.guardianSatellite['aria-pressed'],'false','satellite can be exited');
 assert.equal(nextWatch,1,'changing map modes does not request new GPS');
 d.hidden=true;events.visibilitychange();
 assert.equal(w.HH_GUARDIAN_V761.active,false,'background never keeps browser GPS active');
 assert.deepEqual(stopped,[1]);
 d.hidden=false;controls.guardianStart.click();assert.equal(nextWatch,2);
 controls.guardianStop.click();assert.deepEqual(stopped,[1,2]);
 controls.guardianProfileSwitch.click();
 assert.equal(profile,'m','bottom-left standard profile pill switches to Mónika');
 assert.equal(nextWatch,2,'changing profile never restarts GPS');
 assert.equal(w.HH_GUARDIAN_V761.active,false);
 controls.guardianProfileSwitch.click();
 assert.equal(profile,'z','second portrait tap returns to Zsolt');
 assert.doesNotMatch(script,/fetch\(|sendBeacon|WebSocket|indexedDB\.open|setItem\('(guardian|gps|location|route)/,'no tracking upload or persistence');
 assert.match(script,/localStorage\.setItem\('hh-profile',next\)/,'only profile selection is stored');
 assert.match(script,/d\.addEventListener\('visibilitychange'/,'browser GPS stops when hidden');
 assert.match(script,/Budapest city-center discovery view, NOT a family or device coordinate/);
 assert.doesNotMatch(script,/Corky.*setLngLat|Anna.*setLngLat|Zsolt.*setLngLat/,'no fabricated family marker locations');
});
