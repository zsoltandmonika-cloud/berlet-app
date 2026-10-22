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
 assert.match(js,/new URL\('\.\/guardian\/family-guard-v778\.html',root\.location\.href\)/);
 assert.match(js,/if\(key==='timeline'\)return showPage\('timeline'\)/);
 assert.match(css,/\.hhpg-tile\[data-key="guardian"\]/);
 assert.match(css,/data-hhpg-profile="m"\] #home \.hhpg-tile\[data-key="guardian"\]/);
 assert.match(html,/premium-glass-home-v520\.js\?v=778-follow-gps/);
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
 assert.match(js,/https:\/\/tiles\.openfreemap\.org\/styles\/bright/);
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
 assert.ok(html.indexOf('id="guardianProfileSwitch"')>html.indexOf('<section class="intro guardian-hero"')&&html.indexOf('id="guardianProfileSwitch"')<html.indexOf('</section>'),'profile switch stays in hero bottom-left');
 assert.match(read('guardian/guardian-daylight-v773.css'),/filter:none!important/,'true daylight canvas without dark-map brightening filter');
 assert.match(js,/function toggleSatellite\(\)/);
 assert.match(js,/tiles\.maps\.eox\.at/,'EOX satellite WMTS');
 assert.match(js,/EOxCloudless 2020/,'clear source licensing');
 assert.match(html,/guardianHeroZsolt/,'actual Zsolt photo displayed in Hero monitor');
 assert.match(html,/guardianHeroMonika/,'actual Mónika photo displayed in Hero monitor');
 assert.match(js,/hz\.src=avatars\.z/,'Hero must bind canonical Zsolt photo');
 assert.match(js,/hm\.src=avatars\.m/,'Hero must bind canonical Mónika photo');
 assert.match(polish,/guardian-family-hero-approved-v768\.avif/,'approved v768 family hero remains loaded');
 assert.ok(fs.statSync(path.join(__dirname,'../assets/guardian-family-hero-approved-v768.avif')).size>50000,'approved family hero asset exists');
 assert.match(js,/const existing=layers\.find/,'reuse existing vector source');
 assert.match(js,/if\(!existing\)map\.addSource\(source/,'only load a fallback building source if needed');
 assert.match(js,/path\.length<2\?\[\]/,'empty route must not publish invalid LineString geometry');
});

test('v773 daylight live map keeps 3D, satellite and route visible',()=>{
 const js=read('guardian/guardian.js');
 const html=read('guardian/family-guard-v773.html');
 const daylight=read('guardian/guardian-daylight-v773.css');
 assert.match(js,/style:'https:\/\/tiles\.openfreemap\.org\/styles\/bright'/,'daylight open vector basemap');
 assert.doesNotMatch(js,/styles\/dark/,'dark default removed');
 assert.match(js,/water:'#80cbea'/,'daylight river palette');
 assert.match(js,/parks:'#a8d58e'/,'daylight park palette');
 assert.match(js,/guardian-buildings-3d/,'true 3D building extrusion preserved');
 assert.match(js,/guardian-route-casing/,'route contrast preserved on light streets');
 assert.match(js,/function toggleSatellite\(\)/,'satellite switch preserved');
 assert.match(js,/function applyGoldenMapStyle\(\)/,'profile-palette handler preserved');
 assert.match(daylight,/#guardianMap \.maplibregl-canvas\{filter:none!important\}/,'dark canvas brightness filter disabled');
 assert.match(html,/guardian-daylight-v773\.css/,'daylight CSS linked');
 assert.match(html,/guardian\.js\?v=778/,'daylight JS linked with landmark integration');
 const nav=html.slice(html.indexOf('<nav id="guardianHHNav"'),html.indexOf('</nav>'));
 assert.equal((nav.match(/<(?:a|button)\b/g)||[]).length,5,'canonical 5-slot taskbar stays intact');
 const hero=html.slice(html.indexOf('<section class="intro guardian-hero"'),html.indexOf('</section>'));
 assert.match(hero,/id="guardianProfileSwitch"/,'profile switch stays in hero');
 assert.match(html,/EOxCloudless 2020/,'historic satellite notice kept');
});

test('v776 registers landmarks with icons, map tap, and on-device storage',()=>{
 const src=read('guardian/guardian-landmarks-v776.js');
 const html=read('guardian/family-guard-v776.html');
 new Function(src);
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,6);
 assert.match(html,/guardianLandmarksSave/);
 assert.match(html,/guardian-landmarks-v776\.css/);
 assert.match(read('guardian/guardian.js'),/HH_GUARDIAN_LANDMARKS_V776\.init\(map\)/);
 assert.doesNotMatch(src,/fetch\(|sendBeacon\(|XMLHttpRequest|navigator\.geolocation|https?:\/\//);
 const buttons=['home','work','doctor','family','favorite','other'].map(kind=>({
   dataset:{guardianLandmarkKind:kind},listeners:{},setAttribute(){},
   addEventListener(e,fn){this.listeners[e]=fn},click(){this.listeners.click()}}));
 function node(tag){
  return {tagName:tag,children:[],listeners:{},style:{},textContent:'',value:'',disabled:true,hidden:false,
   setAttribute(){},addEventListener(e,fn){this.listeners[e]=fn},
   click(){if(this.listeners.click)this.listeners.click()},
   appendChild(n){this.children.push(n);this.firstChild=this.children[0];return n},
   removeChild(n){this.children.splice(this.children.indexOf(n),1);this.firstChild=this.children[0]},
   scrollIntoView(){},focus(){}};
 }
 const elements={};
 const doc={getElementById(id){return elements[id]||(elements[id]=node('div'))},
  createElement:node,querySelectorAll(){return buttons}};
 const store={};
 const win={localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},
  confirm(){return true},
  maplibregl:{Marker:class{setLngLat(c){this.coords=c;return this}addTo(){return this}remove(){}}}};
 const callbacks={},canvas={style:{}};
 let lastFlight=null;
 const map={on(e,cb){callbacks[e]=cb},getCenter(){return {lng:19.12,lat:47.52}},
  getCanvas(){return canvas},getZoom(){return 15.3},flyTo(options){lastFlight=options}};
 vm.runInNewContext(src,{window:win,document:doc,Date,Math,Number,String,Array,JSON,Object});
 win.HH_GUARDIAN_LANDMARKS_V776.init(map);
 assert.equal(doc.getElementById('guardianLandmarkName').value,'Otthon');
 doc.getElementById('guardianLandmarksSelect').click();
 callbacks.click({lngLat:{lng:19.11,lat:47.51}});
 assert.equal(doc.getElementById('guardianLandmarksSave').disabled,false);
 doc.getElementById('guardianLandmarksSave').click();
 let items=JSON.parse(store['hh-guardian-landmarks-v776']);
 assert.equal(items.length,1);assert.equal(items[0].kind,'home');
 assert.equal(items[0].lng,19.11);assert.equal(items[0].lat,47.51);
 assert.equal(doc.getElementById('guardianLandmarksCount').textContent,'1');
 const first=doc.getElementById('guardianLandmarksList').children[0];
 assert.equal(first.children[0].textContent,'🏠');
 first.children[2].click();assert.equal(lastFlight.center[0],19.11);
 buttons[1].click();
 assert.equal(doc.getElementById('guardianLandmarkName').value,'Munkahely');
 doc.getElementById('guardianLandmarksCenter').click();
 doc.getElementById('guardianLandmarksSave').click();
 items=JSON.parse(store['hh-guardian-landmarks-v776']);
 assert.equal(items.length,2);assert.equal(items[1].kind,'work');
 first.children[3].click();
 assert.equal(JSON.parse(store['hh-guardian-landmarks-v776']).length,1);
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
 controls.guardianFollow.click();
 assert.equal(nextWatch,1,'Follow explicitly starts own GPS if it was off');
 assert.equal(w.HH_GUARDIAN_V761.active,true);
 assert.equal(controls.guardianFollow['aria-pressed'],'true','Follow keeps camera tracking enabled');
 controls.guardianFollow.click();
 assert.equal(controls.guardianFollow['aria-pressed'],'false','Follow can disable camera tracking without stopping GPS');
 assert.equal(nextWatch,1,'Follow does not create a duplicate GPS watcher');
 controls.guardianFollow.click();
 assert.equal(controls.guardianFollow['aria-pressed'],'true','Follow can re-enable camera tracking');
 controls.guardianStart.click();
 assert.equal(nextWatch,1,'separate Start button stays safe when GPS is already running');
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
 w.isSecureContext=false;
 controls.guardianFollow.click();
 assert.equal(nextWatch,2,'Follow never starts GPS from insecure contexts');
 assert.equal(w.HH_GUARDIAN_V761.active,false);
 w.isSecureContext=true;
 controls.guardianFollow.click();
 assert.equal(nextWatch,3,'Follow restarts GPS after explicit new tap');
 controls.guardianStop.click();
 assert.deepEqual(stopped,[1,2,3]);
 assert.doesNotMatch(script,/fetch\(|sendBeacon|WebSocket|indexedDB\.open|setItem\('(guardian|gps|location|route)/,'no tracking upload or persistence');
 assert.match(script,/localStorage\.setItem\('hh-profile',next\)/,'only profile selection is stored');
 assert.match(script,/d\.addEventListener\('visibilitychange'/,'browser GPS stops when hidden');
 assert.match(script,/Budapest city-center discovery view, NOT a family or device coordinate/);
 assert.doesNotMatch(script,/Corky.*setLngLat|Anna.*setLngLat|Zsolt.*setLngLat/,'no fabricated family marker locations');
});
