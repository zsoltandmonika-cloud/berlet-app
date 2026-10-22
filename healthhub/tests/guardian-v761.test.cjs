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
 assert.match(js,/new URL\('\.\/guardian\/family-guard-v785\.html',root\.location\.href\)/);
 assert.match(js,/if\(key==='timeline'\)return showPage\('timeline'\)/);
 assert.match(css,/\.hhpg-tile\[data-key="guardian"\]/);
 assert.match(css,/data-hhpg-profile="m"\] #home \.hhpg-tile\[data-key="guardian"\]/);
 assert.match(html,/premium-glass-home-v520\.js\?v=784-premium-landmarks/);
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
 assert.doesNotMatch(html,/id="guardianSatellite"|id="guardianSatelliteNotice"/,'low-resolution satellite controls retired');
 assert.match(html,/id="guardianHHNav"/);
 assert.match(html,/id="guardianProfileSwitch" class="guardian-standard-profile"/);
 assert.doesNotMatch(html,/id="guardianAvatar"/,'no second profile switch');
 assert.match(polish,/width:min\(100vw,420px\)/,'canonical taskbar width');
 assert.match(polish,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/,'five buttons');
 assert.ok(html.indexOf('id="guardianProfileSwitch"')>html.indexOf('<section class="intro guardian-hero"')&&html.indexOf('id="guardianProfileSwitch"')<html.indexOf('</section>'),'profile switch stays in hero bottom-left');
 assert.match(read('guardian/guardian-daylight-v773.css'),/filter:none!important/,'true daylight canvas without dark-map brightening filter');
 assert.doesNotMatch(js,/function toggleSatellite|tiles\.maps\.eox\.at/,'satellite mode not offered in v780');
 assert.match(js,/attributionControl:false/,'no info icon under zoom controls; credits shown adjacent');
 assert.match(html,/guardian-map-credits/,'map data credits visible adjacent to map');
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

test('v781 clear shared 3D/flat map palette and visible map data credits',()=>{
 const js=read('guardian/guardian.js');
 const html=read('guardian/family-guard-v781.html');
 const daylight=read('guardian/guardian-daylight-v773.css');
 assert.match(js,/style:'https:\/\/tiles\.openfreemap\.org\/styles\/bright'/,'daylight open vector basemap');
 assert.doesNotMatch(js,/styles\/dark/,'dark default removed');
 assert.match(js,/water:'#9fc4f1'/,'clean daylight blue for lakes');
 assert.match(js,/parks:'#cfe4b5'/,'soft park greens');
 assert.match(js,/roadPrimary:'#f8d987'/,'arterial roads are warm and distinct');
 assert.match(js,/roadSecondary:'#ffecc8'/,'secondary roads differentiated');
 assert.match(js,/roadLocal:'#fffdf8'/,'local streets remain bright');
 assert.match(js,/buildingFootprint:'#bfc1c3'/,'building footprints contrast against streets');
 assert.match(js,/guardian-buildings-3d/,'true 3D building extrusion preserved');
 assert.match(js,/guardian-route-casing/,'route contrast preserved on light streets');
 assert.doesNotMatch(js,/function toggleSatellite\(\)/,'satellite switch removed');
 assert.match(js,/function applyGoldenMapStyle\(\)/,'profile-palette handler preserved');
 assert.match(daylight,/#guardianMap \.maplibregl-canvas\{filter:none!important\}/,'dark canvas brightness filter disabled');
 assert.match(html,/guardian-daylight-v773\.css/,'daylight CSS linked');
 assert.match(html,/guardian\.js\?v=783/,'latest style JS loaded');
 const nav=html.slice(html.indexOf('<nav id="guardianHHNav"'),html.indexOf('</nav>'));
 assert.equal((nav.match(/<(?:a|button)\b/g)||[]).length,5,'canonical 5-slot taskbar stays intact');
 const hero=html.slice(html.indexOf('<section class="intro guardian-hero"'),html.indexOf('</section>'));
 assert.match(hero,/id="guardianProfileSwitch"/,'profile switch stays in hero');
 assert.match(html,/id="guardianMapLabel" hidden aria-hidden="true"/,'unwanted corner label hidden');
 assert.doesNotMatch(html,/id="guardianSatellite"/,'satellite button removed');
 assert.match(html,/guardian-premium-v780\.css/,'premium glass design loaded');
 assert.match(html,/guardian-control-icon/,'vector icon controls present');
 assert.match(html,/guardian-map-palette-v781\.css/,'adjacent copyright line styled');
 assert.match(html,/© OpenStreetMap-közreműködők/,'OSM attribution visible');
 assert.match(html,/© OpenMapTiles/,'OpenMapTiles attribution visible');
 assert.match(js,/attributionControl:false/,'native under-zoom icon removed');
});

test('v776 registers landmarks with icons, map tap, and on-device storage',()=>{
 const src=read('guardian/guardian-landmarks-v776.js');
 const html=read('guardian/family-guard-v776.html');
 new Function(src);
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,9);
 assert.match(html,/guardianLandmarksSave/);
 assert.match(html,/guardian-landmarks-v776\.css/);
 assert.match(read('guardian/guardian.js'),/HH_GUARDIAN_LANDMARKS_V776\.init\(map\)/);
 assert.doesNotMatch(src,/fetch\(|sendBeacon\(|XMLHttpRequest|navigator\.geolocation|https?:\/\//);
 const buttons=['home','work','doctor','family','favorite','bus','tram','shopping','other'].map(kind=>({
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
 controls.guardian3D.click();
 assert.equal(controls.guardian3D['aria-pressed'],'false','3D can be disabled');
 controls.guardian3D.click();
 assert.equal(controls.guardian3D['aria-pressed'],'true','3D can be re-enabled');
 assert.equal(nextWatch,1,'switching 3D never requests another GPS watcher');
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

test('v779 compact profile switch stays inside Hero without affecting map or taskbar',()=>{
 const html=read('guardian/family-guard-v779.html'),canonical=read('guardian/index.html');
 const css=html.slice(html.indexOf('<style id="guardian-profile-hero-v772">'),html.indexOf('</style>'));
 assert.match(css,/bottom:4px!important;left:4px!important/);
 assert.match(css,/inset:auto auto 4px 4px!important/);
 assert.match(css,/height:28px!important;min-height:28px!important/);
 assert.match(css,/padding:0 8px!important/);
 assert.match(css,/font:750 10px\/1 system-ui/);
 assert.match(canonical,/inset:auto auto 4px 4px!important/);
 assert.match(html,/guardian-landmarks-v776\.js/);
 assert.match(html,/guardian\.js\?v=783-neon-avatars/);
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,9);
 const nav=html.slice(html.indexOf('<nav id="guardianHHNav"'),html.indexOf('</nav>'));
 assert.equal((nav.match(/<(?:a|button)\b/g)||[]).length,5);
});


test('v780 premium place categories retain browser bookmark storage and add bus tram shopping',()=>{
 const src=read('guardian/guardian-landmarks-v776.js');
 const html=read('guardian/family-guard-v780.html');
 const css=read('guardian/guardian-premium-v780.css');
 assert.match(src,/const KEY='hh-guardian-landmarks-v776'/,'never migrate or drop previously saved landmarks');
 for(const kind of ['bus','tram','shopping']){
  assert.ok(src.includes(kind+':{icon:'),'recognized persisted category');
  assert.ok(html.includes('data-guardian-landmark-kind="'+kind+'"'),'category selectable');
 }
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,9);
 assert.match(css,/guardian-landmarks-emoji/,'glass medallions for all categories');
 assert.doesNotMatch(html,/id="guardianSatellite"/);
 assert.doesNotMatch(html,/3D BUDAPEST · FELFEDEZŐ NÉZET/,'top corner prose removed');
 const map=read('guardian/guardian.js');
 assert.match(map,/attributionControl:false/,'MapLibre info icon removed in favor of adjacent source credit');
 assert.match(html,/guardian-map-credits/,'provider credits remain legible under the map');
});

test('v781 2D and 3D share one map color palette',()=>{
 const script=read('guardian/guardian.js');
 const palette=script.slice(script.indexOf('function mapColors(){'),script.indexOf('function applyGoldenMapStyle(){'));
 const toggle=script.slice(script.indexOf('function toggle3D(){'),script.indexOf('function enableFollow(){'));
 assert.ok(palette.includes("roadPrimary:'#f8d987'"));
 assert.ok(palette.includes("roadSecondary:'#ffecc8'"));
 assert.ok(palette.includes("roadLocal:'#fffdf8'"));
 assert.ok(palette.includes("roofLow:'#c9cbcd'"));
 assert.doesNotMatch(palette,/threeD|satellite/,'no alternate palette for flat vs 3D');
 assert.match(toggle,/threeD=!threeD/,'only switches view mode');
 assert.doesNotMatch(toggle,/setStyle\(|mapColors\(/,'toggling 3D must not reload colors');
 assert.match(script,/visibility',threeD\?'visible':'none'/,'building extrusion is visible in 3D only');
 assert.match(script,/pitch:threeD\?58:0/,'flat camera pitch when 3D disabled');
 assert.match(script,/\['get','class'\]/,'transportation class-based road coloring');
 const html=read('guardian/family-guard-v781.html');
 const mapEnd=html.indexOf('</section>',html.indexOf('<section class="map-card"'));
 const credit=html.indexOf('class="guardian-map-credits"');
 const places=html.indexOf('<section class="guardian-landmarks"');
 assert.ok(credit>mapEnd&&credit<places,'source credits directly follow the map');
 assert.doesNotMatch(html.slice(html.indexOf('<section class="map-card"'),mapEnd),/maplibregl-ctrl-attrib/);
 assert.match(html,/guardian-premium-v780\.css/,'glass controls retained');
 assert.match(html,/inset:auto auto 4px 4px!important/,'approved small hero profile switch untouched');
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,9);
});

test('v782 compact upper-right controls and premium glass MapLibre zoom stay in corners',()=>{
 const page=read('guardian/family-guard-v782.html');
 const css=read('guardian/guardian-controls-v782.css');
 const earlier=read('guardian/guardian-premium-v780.css');
 const js=read('guardian/guardian.js');
 assert.match(page,/data-family-guard-build="v782"/);
 assert.match(page,/guardian-controls-v782\.css\?v=782-compact-corners/);
 assert.match(css,/width:89px!important/,'top-right button width shrinks from previous 99px');
 assert.match(css,/height:39px!important/,'top-right button height shrinks from previous 43px');
 assert.match(css,/right:4px!important/,'top buttons closer to outer right edge');
 assert.match(css,/\.map-card \.map-follow \{top:5px!important\}/);
 assert.match(css,/\.map-card \.map-3d \{top:47px!important\}/);
 assert.match(css,/\.map-card \.map-family \{top:89px!important\}/);
 assert.match(css,/flex-basis:27px!important/,'glass button icon badges reduced');
 assert.match(css,/#guardianMap \.maplibregl-ctrl-bottom-right\{/);
 assert.match(css,/bottom:2px!important/,'MapLibre group moved toward bottom edge');
 assert.match(css,/right:2px!important/,'MapLibre group moved toward right edge');
 assert.match(css,/#guardianMap \.maplibregl-ctrl-bottom-right \.maplibregl-ctrl-group button\{/);
 assert.match(css,/height:38px!important/,'zoom touch-target kept usable');
 assert.match(css,/filter:none!important/,'zoom control surface must not invert its glass colors');
 assert.match(css,/\.maplibregl-ctrl-icon\{/,'only glyph inverted for contrast');
 assert.match(css,/:root\[data-guardian-profile="m"\]/,'rose variant retained');
 assert.match(css,/backdrop-filter:blur\(17px\) saturate\(1\.4\)/,'premium translucent glass for zoom group');
 assert.match(earlier,/guardian-control-icon/,'existing outlined SVG button symbols preserved');
 assert.match(js,/attributionControl:false/,'tiny info icon must remain removed');
 assert.match(page,/guardian-map-credits/,'map credit row must remain outside map');
 assert.match(page,/guardian-map-palette-v781\.css/,'v781 cartographic colors preserved');
 assert.match(page,/inset:auto auto 4px 4px!important/,'approved hero corner switch unchanged');
 assert.doesNotMatch(page,/id="guardianSatellite"/,'removed satellite mode must not return');
 assert.equal((page.match(/data-guardian-landmark-kind=/g)||[]).length,9);
 const nav=page.slice(page.indexOf('<nav id="guardianHHNav"'),page.indexOf('</nav>'));
 assert.equal((nav.match(/<(?:a|button)\b/g)||[]).length,5,'canonical five-slot dock unchanged');
});

test('v783 live person GPS marker uses circular authentic photo and profile-specific neon badge',()=>{
 const js=read('guardian/guardian.js');
 const html=read('guardian/family-guard-v783.html');
 const css=read('guardian/guardian-avatars-v783.css');
 new Function(js);
 assert.match(html,/guardian-avatars-v783\.css\?v=783-neon-profile-ring/);
 assert.match(html,/guardian\.js\?v=783-neon-avatars/);
 assert.match(css,/\.guardian-position\[data-guardian-person="m"\]/,'Mónika has independent magenta style');
 assert.match(css,/--guardian-pin:#ff28c7/,'vivid pink ring');
 assert.match(css,/--guardian-pin:#13baff/,'cyan blue ring for Zsolt');
 assert.match(css,/border-radius:50%!important/,'portrait is circular');
 assert.match(css,/\.guardian-position-label/,'name badge with a color-matched glass treatment');
 assert.match(css,/\.guardian-position-photo img/,'photo clip kept circular');
 assert.match(css,/prefers-reduced-motion:reduce/,'no required motion animation');
 assert.match(js,/makeOwnPositionNode\(\)/,'actual live GPS marker builder used');
 assert.doesNotMatch(css,/\.guardian-landmark-pin/,'saved-place pins untouched');
 const elements={},events={};
 function node(tag){
  return {
   tagName:tag,children:[],className:'',attrs:{},classList:{toggle(){}},textContent:'',hidden:false,
   setAttribute(k,v){this.attrs[k]=v},
   appendChild(child){this.children.push(child);return child},
   querySelector(sel){
    if(sel==='img')return this.children.flatMap(x=>x.children||[]).find(x=>x.tagName==='img')||null;
    if(sel==='.guardian-position-label')return this.children.find(x=>x.className==='guardian-position-label')||null;
    return null;
   },
   addEventListener(ev,cb){this[ev]=cb},
   remove(){this.removed=true},
  };
 }
 const doc={
  hidden:false,documentElement:{dataset:{}},
  getElementById(id){return elements[id]||(elements[id]=node('div'))},
  createElement:node,
  addEventListener(name,cb){events[name]=cb},
 };
 let profile='z',onFix=null;
 const created=[];
 class FakeMap{
  addControl(){}
  on(name,cb){this[name]=cb}
  getZoom(){return 15}
  easeTo(){}
 }
 class FakeMarker{
  constructor(opts){this.element=opts.element;created.push(this);}
  setLngLat(coord){this.coord=coord;return this}
  addTo(){return this}
  getElement(){return this.element}
  remove(){this.removed=true}
 }
 const win={
  isSecureContext:true,
  navigator:{userAgent:'Test',geolocation:{watchPosition(cb){onFix=cb;return 1},clearWatch(){}}},
  maplibregl:{Map:FakeMap,Marker:FakeMarker,NavigationControl:class{}},
  localStorage:{
   getItem(key){return key==='hh-profile'?profile:null},
   setItem(key,value){if(key==='hh-profile')profile=value},
  },
  HH_GOLDEN_AVATARS_V529:{z:'existing-zsolt-photo',m:'existing-monika-photo'},
  addEventListener(){},console:{warn(){}},
 };
 vm.runInNewContext(js,{window:win,document:doc,Date,Math,Number,String,Set});
 // Never creates a GPS position before the user taps Follow.
 assert.equal(created.length,0);
 elements.guardianFollow.click();
 assert.equal(typeof onFix,'function');
 onFix({coords:{latitude:47.5,longitude:19.04,accuracy:5},timestamp:Date.now()});
 assert.equal(created.length,1);
 const z=created[0].element;
 assert.equal(z.className,'guardian-position');
 assert.equal(z.attrs['data-guardian-person'],'z');
 assert.equal(z.children[0].className,'guardian-position-photo');
 assert.equal(z.children[0].children[0].src,'existing-zsolt-photo');
 assert.equal(z.children[1].textContent,'Zsolt');
 assert.equal(created[0].coord[0],19.04);
 elements.guardianProfileSwitch.click();
 assert.equal(profile,'m');
 assert.equal(created[0].removed,true,'switch never repaints a previous phone fix as the other profile');
 assert.equal(created.length,1,'switch does not request a new fix');
 elements.guardianFollow.click();
 onFix({coords:{latitude:47.51,longitude:19.05,accuracy:4},timestamp:Date.now()});
 assert.equal(created.length,2);
 const m=created[1].element;
 assert.equal(m.attrs['data-guardian-person'],'m');
 assert.equal(m.children[0].children[0].src,'existing-monika-photo');
 assert.equal(m.children[1].textContent,'Mónika');
 assert.equal(m.attrs.role,'img');
 assert.match(m.attrs['aria-label'],/saját készülék GPS-pozíciója/,'marker shows only this device, never another person remotely');
 assert.equal(created[1].coord[0],19.05);
 // No extra upload or background tracking introduced by a cosmetic feature.
 assert.doesNotMatch(js,/sendBeacon|new WebSocket|fetch\(/);
 assert.match(js,/if\(d.hidden&&active\)\{stop\(\)/);
 assert.match(html,/guardian-map-palette-v781\.css/,'approved color map untouched');
 assert.match(html,/guardian-controls-v782\.css/,'approved glass map controls untouched');
 assert.match(html,/inset:auto auto 4px 4px!important/,'approved miniature hero switch untouched');
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,9);
});

test('v784 nine distinct hand-drawn translucent SVG landmarks keep existing bookmarks and user photos',()=>{
 const src=read('guardian/guardian-icons-v784.js');
 const landmarks=read('guardian/guardian-landmarks-v776.js');
 const css=read('guardian/guardian-icons-v784.css');
 const html=read('guardian/family-guard-v784.html');
 const hero=read('guardian/guardian-avatars-v783.css');
 new Function(src);new Function(landmarks);
 assert.match(html,/data-family-guard-build="v784"/);
 assert.match(html,/guardian-icons-v784\.css\?v=784-glass-location-medallions/);
 assert.match(html,/guardian-icons-v784\.js\?v=784-translucent-svg-icons/);
 assert.match(html,/guardian-landmarks-v776\.js\?v=784-svg-place-icons/);
 assert.ok(html.indexOf('guardian-icons-v784.js')<html.indexOf('guardian-landmarks-v776.js'),'vector renderer must load before local bookmarks');
 assert.match(html,/guardian-avatars-v783\.css/,'approved neon people avatars kept');
 assert.match(html,/golden-standard-avatars-v529\.js/,'approved real family photos kept');
 assert.match(hero,/guardian-position-photo/,'v783 people marker stays intact');
 assert.match(html,/guardian-controls-v782\.css/,'existing premium map buttons kept');
 assert.match(html,/guardian-map-palette-v781\.css/,'same 2D and 3D map colors kept');
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,9);
 assert.match(css,/backdrop-filter:blur\(13px\) saturate\(1\.5\)/,'translucent lens on actual map place pins');
 assert.match(css,/rgba\(var\(--gic-rgb\),\.26\)/,'map remains visible beneath semi-transparent icons');
 assert.doesNotMatch(css,/\.guardian-position|guardianProfileSwitch|guardian-hero|hhBottomNav/,'do not restyle people, hero or dock');
 assert.match(landmarks,/const KEY='hh-guardian-landmarks-v776'/,'all old saved places remain usable');
 assert.doesNotMatch(src,/navigator\.geolocation|localStorage|fetch\(|XMLHttpRequest|sendBeacon/);
 const kinds=['home','work','doctor','family','favorite','bus','tram','shopping','other'];
 function node(tag){
  return {tagName:tag,innerHTML:'',textContent:'',className:'',dataset:{},attributes:{},
   children:[],listeners:{},style:{},disabled:true,hidden:false,
   setAttribute(k,v){this.attributes[k]=v},
   addEventListener(k,fn){this.listeners[k]=fn},
   click(){if(this.listeners.click)this.listeners.click()},
   appendChild(child){this.children.push(child);this.firstChild=this.children[0];return child},
   removeChild(child){this.children.splice(this.children.indexOf(child),1);this.firstChild=this.children[0]},
   scrollIntoView(){},focus(){},
  };
 }
 const choices=kinds.map(kind=>{
  const el=node('button'),medal=node('span');
  medal.className='guardian-landmarks-emoji';el.dataset.guardianLandmarkKind=kind;
  el.querySelector=(sel)=>sel==='.guardian-landmarks-emoji'?medal:null;
  el.medal=medal;return el;
 });
 const nodes={};const doc={
  getElementById(id){return nodes[id]||(nodes[id]=node('div'))},
  createElement:node,
  querySelectorAll(sel){return sel==='[data-guardian-landmark-kind]'?choices:[]}
 };
 const initial=[{id:'saved_bus_01',kind:'bus',name:'Régi buszmegálló',lng:19.10,lat:47.50}];
 const storage={'hh-guardian-landmarks-v776':JSON.stringify(initial)};
 const markers=[];
 const win={
  localStorage:{getItem(k){return storage[k]||null},setItem(k,v){storage[k]=v}},
  confirm(){return true},
  maplibregl:{Marker:class {
   constructor(opts){this.element=opts.element;markers.push(this)}
   setLngLat(c){this.coords=c;return this}
   addTo(){return this}
   remove(){this.removed=true}
  }}
 };
 const context={window:win,document:doc,Date,Math,Number,String,Array,JSON,Object};
 vm.runInNewContext(src,context);
 assert.equal(win.HH_GUARDIAN_ICONS_V784.kinds.length,9);
 kinds.forEach((kind,i)=>{
  assert.equal(choices[i].attributes['data-guardian-icon-kind'],kind);
  assert.equal(choices[i].medal.attributes['data-guardian-icon-kind'],kind);
  assert.ok(choices[i].medal.innerHTML.startsWith('<svg '),'vector icon markup generated');
 });
 const bus=choices[kinds.indexOf('bus')].medal.innerHTML;
 const tram=choices[kinds.indexOf('tram')].medal.innerHTML;
 assert.notEqual(bus,tram,'tramway has a distinct pictogram from bus');
 assert.ok(bus.includes('M4 10.5h16'),'bus windows visible');
 assert.ok(tram.includes('M8 5 12 2'),'tram overhead guide visible');
 const malicious=node('span');assert.equal(win.HH_GUARDIAN_ICONS_V784.draw(malicious,'<img src=x>'),false,'only curated icon names accepted');
 assert.equal(malicious.innerHTML,'');
 vm.runInNewContext(landmarks,context);
 const callbacks={};const map={
  on(ev,cb){callbacks[ev]=cb},
  getCenter(){return {lng:19.11,lat:47.51}},
  getCanvas(){return {style:{}}},
  getZoom(){return 15.3},
  flyTo(){}
 };
 win.HH_GUARDIAN_LANDMARKS_V776.init(map);
 assert.equal(markers.length,1,'previously saved location pin restored');
 assert.equal(markers[0].element.attributes['data-guardian-icon-kind'],'bus');
 assert.match(markers[0].element.innerHTML,/<svg/);
 const saved=doc.getElementById('guardianLandmarksList').children[0];
 assert.equal(saved.children[0].attributes['data-guardian-icon-kind'],'bus','saved place list uses same icon');
 assert.equal(saved.children[1].textContent,'Régi buszmegálló');
 assert.equal(JSON.parse(storage['hh-guardian-landmarks-v776'])[0].name,'Régi buszmegálló','no migration/rewrite of stored location');
 choices[6].click();assert.equal(doc.getElementById('guardianLandmarkName').value,'Villamosmegálló');
 doc.getElementById('guardianLandmarksCenter').click();
 doc.getElementById('guardianLandmarksSave').click();
 const updated=JSON.parse(storage['hh-guardian-landmarks-v776']);
 assert.equal(updated.length,2);
 assert.equal(updated[0].kind,'bus');
 assert.equal(updated[1].kind,'tram');
});

test('v785 Family Live exposes consented auth, six intervals, correct original photos, speed and fresh-only markers',()=>{
 const html=read('guardian/family-guard-v785.html'),canonical=read('guardian/index.html');
 const live=read('guardian/guardian-live-v785.js'),css=read('guardian/guardian-live-v785.css');
 const guardian=read('guardian/guardian.js');
 new Function(live);
 assert.match(html,/data-family-guard-build="v785"/);
 assert.match(html,/guardian-live-v785\.js\?v=785-optin-family-live/);
 assert.match(html,/guardian-live-v785\.css\?v=785-private-live/);
 assert.match(html,/supabase-js@2\.57\.2/,'pinned browser client');
 assert.match(html,/central-vault\/config\.js/,'use existing publishable-only config');
 assert.match(canonical,/guardian-live-v785\.js/,'canonical page enables same Live');
 for(const id of ['guardianLiveLogin','guardianLiveLogout','guardianLiveStart','guardianLiveStop','guardianLiveInterval','guardianLiveOwnSpeed','guardianLiveResetDevice','guardianOtherState'])assert.ok(html.includes('id="'+id+'"'),'new live control '+id);
 for(const ms of [1000,3000,5000,10000,30000,60000])assert.ok(html.includes('value="'+ms+'"'));
 assert.match(live,/getUser\(\)/,'server-verified auth identity');
 assert.match(live,/hh_profile_access/,'authorized family membership');
 assert.match(live,/onGpsFix/,'only genuine foreground GPS callbacks allowed');
 assert.match(live,/if\(!sharing\|\|sharingProfile!==k/,'no hidden upload while disabled');
 assert.match(live,/AGE_MS=20000/,'remove stale people after 20 seconds');
 assert.match(live,/\.upsert\(payload,\{onConflict:'profile_key'\}\)/,'one latest position per authorized profile');
 assert.match(live,/\.delete\(\)\.eq\('profile_key',k\)\.eq\('owner_id',uid\)/,'stop clears the sender-owned position');
 assert.match(live,/document|d\.hidden/,'foreground only');
 assert.match(live,/HH_GOLDEN_AVATARS_V529/,'original profile photos reused');
 assert.doesNotMatch(css,/guardian-hero|guardianProfileSwitch|hhBottomNav/,'no design regression');
 assert.match(guardian,/HH_GUARDIAN_LIVE_V785\.onGpsFix\(pos\)/);
 assert.match(guardian,/HH_GUARDIAN_LIVE_V785\.onProfileChanged\(\)/);
 assert.match(guardian,/HH_GUARDIAN_LIVE_V785\.mountMap\(map\)/);
 assert.match(html,/guardian-icons-v784\.css/,'approved nine glass icons retained');
 assert.match(html,/guardian-avatars-v783\.css/,'neon identity markers retained');
 assert.match(html,/guardian-map-palette-v781\.css/,'2D/3D daylight style retained');
 assert.equal((html.match(/data-guardian-landmark-kind=/g)||[]).length,9,'all saved-place categories stay');
});
test('v785 never uploads on page load or sign-in; publishes real data only after own-phone consent',async()=>{
 const code=read('guardian/guardian-live-v785.js');
 const controls={};
 function make(tag){
  return {tagName:tag,children:[],className:'',textContent:'',value:'',hidden:false,disabled:false,
   classList:{add(){},remove(){}},appendChild(child){this.children.push(child);return child},
   setAttribute(){},addEventListener(ev,fn){this[ev]=fn}};
 }
 const doc={hidden:false,getElementById(id){return controls[id]||(controls[id]=make('button'))},
  createElement:make,addEventListener(){}};
 const store={'hh-profile':'z'},actions=[],row={};
 const storage={getItem(k){return store[k]||null},setItem(k,v){store[k]=v},removeItem(k){delete store[k]}};
 const makeQuery=()=>({
  select(){return this},in(){return Promise.resolve({data:[{profile_key:'zsolt'},{profile_key:'monika'}],error:null})},
  eq(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},
  upsert(data){actions.push({method:'upsert',data});return Promise.resolve({data,error:null})},
  delete(){actions.push({method:'delete'});return this},then(fn){return Promise.resolve({error:null}).then(fn)}
 });
 const api={auth:{getUser(){return Promise.resolve({data:{user:{id:'owner-1'}},error:null})},
  onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},signOut(){return Promise.resolve({error:null})}},
  from(table){return makeQuery()}
 };
 const win={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://fake.example',publishableKey:'public-key'},
  supabase:{createClient(){return api}},localStorage:storage,
  HH_GUARDIAN_V761:{active:true},location:{origin:'https://example.com',pathname:'/healthhub/guardian/family-guard-v785.html'},
  HH_GOLDEN_AVATARS_V529:{z:'z-photo',m:'m-photo'},confirm(){return true},setInterval(){return 1},clearInterval(){},setTimeout(){return 2},
  addEventListener(){}};
 vm.runInNewContext(code,{window:win,document:doc,Date,Math,Number,String,Promise});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(actions.filter(x=>x.method==='upsert').length,0,'authentication never initiates sharing');
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,false);
 controls.guardianLiveStart.click();
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,true,'own-phone tap is necessary');
 const fix={coords:{latitude:47.5,longitude:19.05,accuracy:9,speed:2},timestamp:Date.now()};
 win.HH_GUARDIAN_LIVE_V785.onGpsFix(fix);
 await new Promise(resolve=>setImmediate(resolve));
 const writes=actions.filter(x=>x.method==='upsert');
 assert.equal(writes.length,1);
 assert.equal(writes[0].data.profile_key,'zsolt');
 assert.equal(writes[0].data.owner_id,'owner-1');
 assert.equal(writes[0].data.latitude,47.5);
 assert.equal(writes[0].data.speed_kmh,7.2);
 assert.equal(store['hh-guardian-own-phone-profile-v785'],'zsolt');
 controls.guardianLiveStop.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,false);
 assert.ok(actions.some(x=>x.method==='delete'),'stop deletes own latest location');
 const n=actions.filter(x=>x.method==='upsert').length;
 win.HH_GUARDIAN_LIVE_V785.onGpsFix(fix);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(actions.filter(x=>x.method==='upsert').length,n,'off means no more uploads');
 store['hh-profile']='m';
 win.HH_GUARDIAN_LIVE_V785.onProfileChanged();
 controls.guardianLiveStart.click();
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,false,'cannot silently pretend other person owns phone');
 assert.match(controls.guardianLiveStatus.textContent,/telefon/);
});
