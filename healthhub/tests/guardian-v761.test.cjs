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
 assert.match(js,/new URL\('\.\/guardian\/index\.html',root\.location\.href\)/);
 assert.match(js,/if\(key==='timeline'\)return showPage\('timeline'\)/);
 assert.match(css,/\.hhpg-tile\[data-key="guardian"\]/);
 assert.match(css,/data-hhpg-profile="m"\] #home \.hhpg-tile\[data-key="guardian"\]/);
 assert.match(html,/premium-glass-home-v520\.js\?v=785-family-live/);
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
 assert.match(js,/attributionControl:false/,'native compact attribution is added separately');
 assert.match(js,/new w\.maplibregl\.AttributionControl/,'mandatory map credits accessible via native compact info button');
 assert.doesNotMatch(html,/class="guardian-map-credits"/,'old wide credits strip removed');
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
 let nextWatch=0,stopped=[],latestPosition=null,latestError=null;
 const geo={watchPosition(position,error){latestPosition=position;latestError=error;return ++nextWatch},clearWatch(id){stopped.push(id)}};
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
 // The previous 20-second geolocation timeout silently called stop() and
 // disconnected a consenting owner's Family Live sharing session.
 latestError({code:3});
 assert.equal(w.HH_GUARDIAN_V761.active,true,'20s timeout does not stop the GPS watch');
 assert.deepEqual(stopped,[],'timeout must not clearWatch');
 assert.match(controls.guardianStatus.textContent,/szabad ég alatt/);
 assert.match(controls.guardianMapLabel.textContent,/NINCS FRISS POZÍCIÓ/);
 latestPosition({coords:{latitude:47.5,longitude:19.04,accuracy:180},timestamp:Date.now()});
 assert.match(controls.guardianStatus.textContent,/100 m felett/,'inaccurate position explains waiting');
 assert.match(controls.guardianMeState.textContent,/GPS-jelre vár/,'poor accuracy must not fake LIVE');
 assert.match(controls.guardianMapLabel.textContent,/NEM ÉLŐ/);
 latestPosition({coords:{latitude:47.5,longitude:19.04,accuracy:15},timestamp:Date.now()});
 assert.equal(w.HH_GUARDIAN_V761.active,true,'fresh real position recovers same watch');
 assert.match(controls.guardianStatus.textContent,/GPS aktív/);
 latestError({code:2});
 assert.equal(w.HH_GUARDIAN_V761.active,true,'temporary missing fix does not stop a watch');
 assert.deepEqual(stopped,[],'no duplicate watch or automatic stop');
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
 assert.match(map,/attributionControl:false/,'MapLibre control added explicitly for compact display');
 assert.match(map,/new w\.maplibregl\.AttributionControl/,'native compact copyright links preserved');
 assert.match(html,/guardian-map-credits/,'v780 historical snapshot keeps its original layout');
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
 assert.match(js,/if\(d.hidden&&active\)\{stop\(true\)/,'screen-off suspends browser GPS without revoking last known location');
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
 assert.match(html,/guardian-live-v785\.js\?v=787-landmarks-session/);
 assert.match(html,/guardian-live-v785\.css\?v=785-private-live/);
 assert.match(html,/supabase-js@2\.57\.2/,'pinned browser client');
 assert.match(html,/central-vault\/config\.js/,'use existing publishable-only config');
 assert.match(canonical,/guardian-live-v785\.js/,'canonical page enables same Live');
 for(const id of ['guardianLiveLogin','guardianLiveLogout','guardianLiveStart','guardianLiveStop','guardianLiveInterval','guardianLiveOwnSpeed','guardianLiveAutoStatus','guardianLiveDisableAuto','guardianLiveResetDevice','guardianOtherState'])assert.ok(html.includes('id="'+id+'"'),'new live control '+id);
 for(const ms of [1000,3000,5000,10000,30000,60000])assert.ok(html.includes('value="'+ms+'"'));
 assert.match(live,/getUser\(\)/,'server-verified auth identity');
 assert.match(live,/hh_profile_access/,'authorized family membership');
 assert.match(live,/AUTO_KEY='hh-guardian-foreground-auto-v786'/,'remembered owner consent');
 assert.match(live,/function maybeAutoStart/,'single-tap automatic foreground entry');
 assert.match(live,/function userStopSharing/,'revocable persisted consent');
 assert.match(guardian,/function startFollowing/,'four-in-one starts map following');
 assert.match(live,/onGpsFix/,'only genuine foreground GPS callbacks allowed');
 assert.match(live,/if\(!sharing\|\|sharingProfile!==k/,'no hidden upload while disabled');
 assert.match(live,/AGE_MS=20000,LAST_KNOWN_MS=12\*60\*60\*1000/,'after 20 s mark stale, keep time-stamped last known for 12 h');
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
 assert.equal(store['hh-guardian-foreground-auto-v786'],'zsolt','first confirmation remembers auto start');
 controls.guardianLiveStop.click();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,false);
 assert.equal(store['hh-guardian-foreground-auto-v786'],undefined,'stop revokes auto start');
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


test('v786 remembered owner consent restarts foreground 4-in-1 without another dialog; stop revokes it',async()=>{
 const source=read('guardian/guardian-live-v785.js');
 const controls={},listeners={},writes=[],deletions=[];
 const make=()=>({disabled:false,hidden:false,textContent:'',value:'',classList:{add(){},remove(){}},
  setAttribute(){},addEventListener(k,fn){this[k]=fn},click(){if(this.clickListener)this.clickListener()}});
 const doc={hidden:false,getElementById(id){return controls[id]||(controls[id]=make())},
  addEventListener(k,fn){listeners[k]=fn},createElement:make};
 const store={'hh-profile':'z','hh-guardian-own-phone-profile-v785':'zsolt','hh-guardian-foreground-auto-v786':'zsolt'};
 const storage={getItem(k){return store[k]||null},setItem(k,v){store[k]=v},removeItem(k){delete store[k]}};
 const requests=()=>({select(){return this},in(){return Promise.resolve({data:[{profile_key:'zsolt'},{profile_key:'monika'}],error:null})},
  eq(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},
  upsert(payload){writes.push(payload);return Promise.resolve({error:null})},
  delete(){deletions.push('delete');return this},then(fn){return Promise.resolve({error:null}).then(fn)}});
 let follows=0,dialogs=0;
 const auth={getUser(){return Promise.resolve({data:{user:{id:'test-owner'}},error:null})},
  onAuthStateChange(){},signOut(){return Promise.resolve({error:null})}};
 const win={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://test.invalid',publishableKey:'publishable-test'},
  supabase:{createClient(){return {auth,from(){return requests()}}}},localStorage:storage,
  HH_GUARDIAN_V761:{active:false,startFollowing(){follows++}},
  HH_GOLDEN_AVATARS_V529:{z:'z-photo',m:'m-photo'},
  confirm(){dialogs++;return true},setInterval(){return 1},clearInterval(){},setTimeout(){return 1},
  addEventListener(){},location:{origin:'https://test.invalid',pathname:'/guardian/family-guard-v785.html'}};
 vm.runInNewContext(source,{window:win,document:doc,Date,Math,Number,String,Promise});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(follows,1,'saved permission starts all four features after verified auth');
 assert.equal(dialogs,0,'no repeat confirmation on same bound phone');
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,true);
 assert.equal(writes.length,0,'GPS coordinates must originate only from a real callback');
 win.HH_GUARDIAN_LIVE_V785.onGpsFix({coords:{latitude:47.5,longitude:19.05,accuracy:8,speed:0},timestamp:Date.now()});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes.length,1,'genuine GPS callback uploads after remembered opt-in');
 doc.hidden=true;listeners.visibilitychange();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,false,'hidden page never shares');
 assert.equal(deletions.length,0,'screen off never deletes the consented last known server location');
 assert.match(controls.guardianLiveStatus.textContent,/utolsó ismert hely|Böngészős GPS szünetel/i);
 assert.equal(store['hh-guardian-foreground-auto-v786'],'zsolt','hiding does not revoke user choice');
 doc.hidden=false;listeners.visibilitychange();
 assert.equal(follows,2,'foreground return starts again after prior one-time consent');
 controls.guardianLiveStop.click();
 assert.equal(store['hh-guardian-foreground-auto-v786'],undefined,'explicit stop revokes persistent consent');
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(deletions.length>=1,'explicit stop deletes the previously published GPS location');
 assert.equal(win.HH_GUARDIAN_LIVE_V785.sharing,false);
 assert.equal(dialogs,0);
});

test('v786 profile-scoped location preferences sync without touching device consent',()=>{
 const js=read('guardian/guardian.js'),live=read('guardian/guardian-live-v785.js');
 const html=read('guardian/family-guard-v785.html'),canonical=read('guardian/index.html');
 new Function(js);new Function(live);
 assert.match(live,/PREF_TABLE='hh_guardian_location_settings'/);
 assert.match(live,/function syncSettings\(\)/);
 assert.match(live,/function loadSettings\(\)/);
 assert.match(live,/hh-guardian-location-settings-changed/);
 assert.match(live,/\.upsert\(payload,\{onConflict:'profile_key'\}\)/);
 assert.match(js,/getLocationSettings:locationSettings/);
 assert.match(js,/applyLocationSettings/);
 assert.match(js,/notifySettings/);
 assert.match(html,/id="guardianLocationSyncStatus"/);
 assert.match(canonical,/id="guardianLocationSyncStatus"/);
 assert.match(html,/guardian-live-v785\.js\?v=787-landmarks-session/);
 assert.match(live,/AUTO_KEY='hh-guardian-foreground-auto-v786'/,'remembered foreground consent untouched');
 assert.doesNotMatch(live,/service_role|sb_secret_/,'no secrets in browser code');
});


test('v787 Landmark Sync keeps legacy places private and enables opt-in shared cloud bookmarks',()=>{
 const html=read('guardian/family-guard-v785.html'),canonical=read('guardian/index.html');
 const places=read('guardian/guardian-landmarks-v776.js');
 const sync=read('guardian/guardian-landmarks-sync-v787.js');
 const css=read('guardian/guardian-landmarks-sync-v787.css');
 new Function(places);new Function(sync);
 for(const page of [html,canonical]){
  assert.match(page,/id="guardianLandmarkScope"/);
  assert.match(page,/id="guardianLandmarkSyncStatus"/);
  assert.match(page,/value="private" selected/,'private opt-in default');
  assert.match(page,/value="shared"/);
  assert.match(page,/guardian-landmarks-sync-v787\.js/);
  assert.match(page,/guardian-landmarks-sync-v787\.css/);
 }
 assert.match(places,/const KEY='hh-guardian-landmarks-v776'/,'old local key unchanged');
 assert.match(places,/setSharedEntries/);
 assert.match(places,/setBridge/);
 assert.match(places,/Megosztod ezt a helyet/,'existing local place requires explicit confirmation');
 assert.match(sync,/hh-guardian-shared-landmarks-outbox-v787/,'offline pending is durable');
 assert.match(sync,/hh_guardian_shared_landmarks/,'separate RLS family table');
 assert.doesNotMatch(sync,/service_role|sb_secret_/);
 assert.doesNotMatch(css,/guardian-hero|hhBottomNav|guardianProfileSwitch/,'no hero or navigation changes');
});

test('v787 shared places retry offline, sync to another client and tombstone deletions',async()=>{
 const code=read('guardian/guardian-landmarks-sync-v787.js');
 const store={'hh-profile':'z','hh-guardian-landmarks-v776':'[{"id":"local_01","kind":"home","name":"Privát otthon","lng":19,"lat":47}]'};
 const storage={getItem(k){return store[k]||null},setItem(k,v){store[k]=v},removeItem(k){delete store[k]}};
 let bridge=null,shown=[],cloud=[],fail=false;
 const api={from(name){
  assert.equal(name,'hh_guardian_shared_landmarks');
  return {
   async upsert(row){if(fail)return {error:{message:'Offline'}};cloud=cloud.filter(x=>x.id!==row.id).concat(row);return {error:null}},
   update(change){return {async eq(key,id){assert.equal(key,'id');cloud=cloud.map(x=>x.id===id?{...x,...change}:x);return {error:null}}}},
   select(){return {order(){return {async limit(){return {data:cloud,error:null}}}}}}
  }
 }};
 const live={authenticated:true,familyAuthorized:true,getClient(){return api},boundProfile:'zsolt'};
 const landmarks={setBridge(x){bridge=x},setSharedEntries(x){shown=x}};
 const events={},doc={hidden:false,getElementById(){return {textContent:''}},addEventListener(k,cb){events['doc-'+k]=cb}};
 const win={HH_GUARDIAN_LIVE_V785:live,HH_GUARDIAN_LANDMARKS_V776:landmarks,localStorage:storage,
  addEventListener(k,cb){events[k]=cb},setInterval(){return 1},setTimeout(){}};
 vm.runInNewContext(code,{window:win,document:doc,Date,Math,Number,String,Array,Map,Promise});
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok(bridge,'cloud bridge installed');
 assert.deepEqual(JSON.parse(store['hh-guardian-landmarks-v776']).map(x=>x.name),['Privát otthon']);
 fail=true;
 bridge.create({id:'shared_001',kind:'doctor',name:'Közös rendelő',lng:19.1,lat:47.5});
 assert.equal(JSON.parse(store['hh-guardian-shared-landmarks-outbox-v787']).length,1);
 await win.HH_GUARDIAN_LANDMARK_SYNC_V787.sync();
 assert.equal(cloud.length,0,'network failure cannot silently claim cloud success');
 assert.equal(JSON.parse(store['hh-guardian-shared-landmarks-outbox-v787']).length,1,'retry survives offline');
 fail=false;
 await win.HH_GUARDIAN_LANDMARK_SYNC_V787.sync();
 assert.equal(cloud.length,1);
 assert.equal(shown.length,1);
 assert.equal(shown[0].name,'Közös rendelő');
 assert.equal(JSON.parse(store['hh-guardian-shared-landmarks-outbox-v787']).length,0);
 bridge.remove('shared_001');
 await win.HH_GUARDIAN_LANDMARK_SYNC_V787.sync();
 assert.equal(shown.length,0,'shared deletion removes the remote marker');
 assert.ok(cloud[0].deleted_at,'deletion is preserved as a tombstone for later sync');
 assert.equal(JSON.parse(store['hh-guardian-landmarks-v776']).length,1,'private record never uploaded or deleted');
});


test('v789 Buddy Arrival Studio retains editable and TEST-labelled private templates',()=>{
 const html=read('guardian/family-guard-v785.html'),mirror=read('guardian/index.html');
 const js=read('guardian/guardian-arrival-studio-v788.js');
 const css=read('guardian/guardian-arrival-studio-v788.css');
 new Function(js);
 for(const page of [html,mirror]){
  assert.match(page,/id="hhArrivalStudio"/);
  assert.match(page,/id="hhArrivalSave"/);
  assert.match(page,/id="hhArrivalTest"/);
  assert.match(page,/id="hhArrivalTitle"/);
  assert.match(page,/id="hhArrivalBody"/);
  assert.match(page,/id="hhArrivalSound"/);
  assert.match(page,/id="hhArrivalVolume" type="range" min="0" max="100"/);
  assert.match(page,/id="hhArrivalVolumeValue"/);
  assert.match(page,/Buddy Smart Arrival Studio/);
  assert.match(page,/hh-arrival-test-flag">🐿️ BUDDY · SMART ARRIVAL · TESZT/);
  assert.match(page,/guardian-arrival-studio-v788\.js\?v=789-buddy-volume/);
  assert.match(page,/guardian-arrival-studio-v788\.css\?v=789-buddy-volume/);
  assert.match(page,/nutrition\/nutri-chipmunk-3d-v594\.webp/);
  for(const sound of ['mokuska','tada','chime','soft','silent'])assert.match(page,new RegExp('value="'+sound+'"'));
 }
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(js,/const KEY='hh-guardian-smart-arrival-studio-v788'/);
 assert.match(js,/sound:'mokuska'/);
 assert.match(js,/const DEFAULT_VOLUME=75/);
 assert.match(css,/hh-arrival-volume/);
 assert.doesNotMatch(js,/geolocation|watchPosition|supabase|fetch\(|sendBeacon\(/,'only local templates, never location or cloud');
});
test('v789 Studio saves independent person/event/volume templates and manual preview never fabricates an arrival',()=>{
 const src=read('guardian/guardian-arrival-studio-v788.js');
 const listeners={},store={},elements={};
 function element(id){
  return elements[id]||(elements[id]={id,value:'',checked:false,hidden:false,textContent:'',listeners:{},
   addEventListener(t,fn){this.listeners[t]=fn},click(){if(this.listeners.click)this.listeners.click()},
   change(){if(this.listeners.change)this.listeners.change()},input(){if(this.listeners.input)this.listeners.input()}});
 }
 const doc={readyState:'complete',getElementById:element,addEventListener(t,fn){listeners['d:'+t]=fn}};
 const win={
  localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},
  addEventListener(t,fn){listeners['w:'+t]=fn},
  setTimeout(fn){return 1},clearTimeout(){},confirm(){return true}
 };
 // Set defaults as rendered in the actual HTML.
 element('hhArrivalPerson').value='monika';
 element('hhArrivalPlace').value='home';
 element('hhArrivalEvent').value='arrive';
 element('hhArrivalSound').value='mokuska';
 element('hhArrivalVolume').value='75';
 for(const id of ['hhArrivalAnimation','hhArrivalQuiet','hhArrivalEnabled'])element(id).checked=true;
 element('hhArrivalTestPopup').hidden=true;
 vm.runInNewContext(src,{window:win,document:doc,Date,Math,Number,String,Array,JSON,Object});
 assert.equal(element('hhArrivalTitle').value,'Mónika hazaért! 🏡');
 assert.equal(element('hhArrivalSound').value,'mokuska');
 assert.equal(element('hhArrivalVolume').value,'75');
 assert.equal(element('hhArrivalVolumeValue').textContent,'75%');
 element('hhArrivalTitle').value='Egyedi üzenet 🌸';
 element('hhArrivalTitle').input();
 element('hhArrivalSound').value='chime';
 element('hhArrivalSound').change();
 element('hhArrivalVolume').value='95';element('hhArrivalVolume').input();
 assert.equal(element('hhArrivalVolumeValue').textContent,'95%');
 element('hhArrivalSave').click();
 let saved=JSON.parse(store['hh-guardian-smart-arrival-studio-v788']);
 assert.equal(saved['monika:home:arrive'].title,'Egyedi üzenet 🌸');
 assert.equal(saved['monika:home:arrive'].sound,'chime');
 assert.equal(saved['monika:home:arrive'].volume,95);
 element('hhArrivalPerson').value='zsolt';element('hhArrivalPerson').change();
 assert.equal(element('hhArrivalSound').value,'mokuska','new template uses requested default');
 assert.equal(element('hhArrivalVolume').value,'75','new template uses 75% volume');
 element('hhArrivalEvent').value='leave';element('hhArrivalEvent').change();
 assert.match(element('hhArrivalTitle').value,/Zsolt elindult/);
 element('hhArrivalTest').click();
 assert.equal(element('hhArrivalTestPopup').hidden,false);
 assert.match(element('hhArrivalStatus').textContent,/TESZT ELŐNÉZET/);
 assert.equal(element('hhArrivalTestTitle').textContent,element('hhArrivalTitle').value);
 element('hhArrivalTestClose').click();
 assert.equal(element('hhArrivalTestPopup').hidden,true);
 element('hhArrivalPerson').value='monika';element('hhArrivalPerson').change();
 element('hhArrivalEvent').value='arrive';element('hhArrivalEvent').change();
 assert.equal(element('hhArrivalTitle').value,'Egyedi üzenet 🌸','saved template restored by person/event');
 assert.equal(element('hhArrivalSound').value,'chime');
 assert.equal(element('hhArrivalVolume').value,'95','saved volume restores');
 saved=JSON.parse(store['hh-guardian-smart-arrival-studio-v788']);
 assert.deepEqual(Object.keys(saved),['monika:home:arrive']);
 element('hhArrivalReset').click();
 assert.equal(element('hhArrivalSound').value,'mokuska');
 assert.equal(element('hhArrivalVolume').value,'75','reset restores 75%');
 assert.equal(Object.keys(JSON.parse(store['hh-guardian-smart-arrival-studio-v788'])).length,0);
});

test('v789 Buddy volume affects ONLY manual sound preview, including true 0% mute',()=>{
 const src=read('guardian/guardian-arrival-studio-v788.js');
 const elements={},events={},store={},gainPeaks=[];
 function node(id){return elements[id]||(elements[id]={
  value:'',checked:false,hidden:false,textContent:'',listeners:{},
  addEventListener(t,fn){this.listeners[t]=fn},
  click(){this.listeners.click?.()},input(){this.listeners.input?.()}
 })}
 node('hhArrivalPerson').value='monika';node('hhArrivalPlace').value='home';node('hhArrivalEvent').value='arrive';
 node('hhArrivalSound').value='mokuska';node('hhArrivalVolume').value='75';
 for(const id of ['hhArrivalEnabled','hhArrivalQuiet','hhArrivalAnimation'])node(id).checked=true;
 let audioContexts=0;
 class FakeAudio{
  constructor(){audioContexts++}
  currentTime=0;
  createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){},stop(){}}}
  createGain(){return {gain:{
   setValueAtTime(){},exponentialRampToValueAtTime(v){if(v>0.01)gainPeaks.push(v)}
  },connect(){}}}
  get destination(){return {}}
  close(){return Promise.resolve()}
 }
 const win={AudioContext:FakeAudio,localStorage:{
   getItem(k){return store[k]||null},setItem(k,v){store[k]=v}
  },addEventListener(t,fn){events[t]=fn},setTimeout(){return 1},clearTimeout(){},confirm(){return true}};
 const doc={readyState:'complete',getElementById:node,addEventListener(t,fn){events[t]=fn}};
 vm.runInNewContext(src,{window:win,document:doc,Date,Math,Number,String,Array,JSON,Object});
 node('hhArrivalVolume').value='0';node('hhArrivalVolume').input();
 assert.equal(node('hhArrivalVolumeValue').textContent,'0%');
 node('hhArrivalTest').click();
 assert.equal(audioContexts,0,'0% must suppress all sound');
 node('hhArrivalVolume').value='75';node('hhArrivalVolume').input();
 node('hhArrivalTest').click();
 assert.equal(audioContexts,1);
 assert.ok(Math.abs(gainPeaks[0]-0.1725)<0.0001,'75% gives louder than original v788 0.045');
 node('hhArrivalVolume').value='100';node('hhArrivalVolume').input();
 node('hhArrivalTest').click();
 assert.equal(audioContexts,2);
 assert.ok(Math.abs(gainPeaks.at(-1)-0.23)<0.0001,'100% stays bounded');
 node('hhArrivalSave').click();
 assert.equal(JSON.parse(store['hh-guardian-smart-arrival-studio-v788'])['monika:home:arrive'].volume,100);
});


test('v790 BKK Transit preserves approved Guardian design and offers 260/17/19 selectable routes',()=>{
 const html=read('guardian/family-guard-v785.html'),other=read('guardian/index.html');
 const js=read('guardian/guardian-transit-v790.js'),css=read('guardian/guardian-transit-v790.css');
 const guardian=read('guardian/guardian.js');
 new Function(js);
 for(const page of [html,other]){
  assert.match(page,/id="hhTransitPanel"/);
  assert.match(page,/id="hhTransitRoute260" checked/);
  assert.match(page,/id="hhTransitRoute17"/);
  assert.match(page,/id="hhTransitRoute19"/);
  assert.match(page,/id="hhTransitShow260"/);
  assert.match(page,/id="hhTransitShow17"/);
  assert.match(page,/id="hhTransitShow19"/);
  if(page===other)assert.match(page,/guardian-transit-v791\.js\?v=817-1-41-static/);
  else assert.match(page,/guardian-transit-v790\.js\?v=790-bkk-static-gtfs/);
  assert.match(page,/guardian-transit-v790\.css\?v=790-bkk-route-choices/);
  assert.match(page,/BKK Zrt., CC BY 4\.0/);
  if(page===other)assert.match(page,/ÉLŐ járműjelölők/);
  else assert.match(page,/nem élő busz-/);
  assert.match(page,/<section class="intro guardian-hero"/,'do not remove existing Family Guard Hero');
 }
 assert.match(js,/hh-guardian-transit-selected-v790/);
 assert.match(js,/bkk-routes-v790\.json/);
 assert.match(js,/source!==SOURCE/);
 assert.doesNotMatch(js,/watchPosition|navigator\.geolocation|service_role|sb_secret_|VehiclePositions/,'must not fabricate live location or require API key');
 assert.doesNotMatch(css,/\.guardian-hero|#guardianHHNav/,'do not override original Hero or dock');
 assert.match(guardian,/get map\(\)\{return map\}/,'reuses the existing MapLibre engine');
});
test('v790 BKK Transit map renders only validated GTFS geometry and persists checkboxes',async()=>{
 const src=read('guardian/guardian-transit-v790.js');
 const docElements={},storage={},events={},handlers={},sources=new Map(),layers=new Map(),visibility=[];
 let fitted=null;
 const fake={
  schemaVersion:1,source:'BKK Zrt., CC BY 4.0',generatedAt:'2026-10-22T10:00:00+00:00',
  routes:Object.fromEntries(['260','17','19'].map((id,i)=>[id,{
   name:id,mode:i?'tram':'bus',color:i?'#d4ac18':'#167ec5',variants:[
    {direction:'0',headsign:id+' cél',shape:[[19+i*.01,47.5],[19.002+i*.01,47.51]],
     stops:[{id:'p'+id,name:id+' megálló',lng:19+i*.01,lat:47.5}]}
   ]}]))
 };
 function el(id){return docElements[id]||(docElements[id]={
  value:'',checked:false,disabled:true,textContent:'',listeners:{},
  addEventListener(t,fn){this.listeners[t]=fn},change(){this.listeners.change?.()},
  click(){this.listeners.click?.()}
 })}
 el('hhTransitRoute260').checked=true;
 const map={
  on(t,id,fn){if(typeof id==='function')handlers[t]=id;else handlers[t+':'+id]=fn},
  isStyleLoaded(){return true},
  getSource(id){return sources.get(id)},
  getLayer(id){return layers.get(id)},
  addSource(id,source){sources.set(id,source)},
  addLayer(layer){layers.set(layer.id,layer)},
  setLayoutProperty(id,key,val){visibility.push({id,key,val})},
  fitBounds(b){fitted=b}
 };
 const doc={readyState:'complete',getElementById:el,addEventListener(t,f){events[t]=f}};
 const win={
  HH_GUARDIAN_V761:{map},
  fetch:async()=>({ok:true,json:async()=>fake}),
  location:{href:'https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/guardian/family-guard-v785.html'},
  localStorage:{getItem(k){return storage[k]||null},setItem(k,v){storage[k]=v}},
  setTimeout(){return 1}
 };
 vm.runInNewContext(src,{window:win,document:doc,URL,Date,Math,Number,String,Array,Set,Map,Promise});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(el('hhTransitRoute260').checked,true);
 assert.equal(el('hhTransitRoute17').checked,false);
 assert.equal(layers.get('hh-bkk-route-260-main').layout.visibility,'visible');
 assert.equal(layers.get('hh-bkk-route-17-main').layout.visibility,'none');
 assert.equal(sources.get('hh-bkk-route-260').data.features[0].geometry.coordinates[0][0],19);
 el('hhTransitRoute17').checked=true;el('hhTransitRoute17').change();
 assert.equal(storage['hh-guardian-transit-selected-v790'],'["260","17"]');
 assert.ok(visibility.some(x=>x.id==='hh-bkk-route-17-main'&&x.val==='visible'));
 el('hhTransitShow19').click();
 assert.deepEqual(JSON.parse(storage['hh-guardian-transit-selected-v790']),['260','17','19']);
 assert.ok(fitted&&fitted.length===2,'full route fits when user clicks Mutasd');
 assert.match(el('hhTransitStatus').textContent,/Nem élő járműkövetés/);
});
test('v790 invalid BKK data never becomes a fictional line on the map',async()=>{
 const src=read('guardian/guardian-transit-v790.js');
 const doc={readyState:'complete',getElementById(){return {checked:false,disabled:false,textContent:'',addEventListener(){}}}};
 const map={isStyleLoaded(){return true},on(){},getSource(){return null},getLayer(){return null},
  addSource(){throw Error('no source must be created')},addLayer(){throw Error('no layer must be created')}};
 const win={HH_GUARDIAN_V761:{map},localStorage:{getItem(){return null},setItem(){}},
  fetch:async()=>({ok:true,json:async()=>({schemaVersion:1,source:'incorrect',routes:{}})}),
  location:{href:'https://example.com/guardian/index.html'},setTimeout(){}};
 vm.runInNewContext(src,{window:win,document:doc,URL,Date,Math,Number,String,Array,Set,Map,Promise});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(JSON.stringify(win.HH_GUARDIAN_TRANSIT_V790.selected),'["260"]');
});


test('v794 Transit shows selectable routes immediately with no redundant panel controls or instructions',()=>{
 const html=read('guardian/index.html');
 const js=read('guardian/guardian-transit-v791.js');
 const css=read('guardian/guardian-transit-v791.css');
 new Function(js);
 for(const id of ['260','17','19']){
  assert.match(html,new RegExp('id="hhTransitRoute'+id+'"'));
  assert.match(html,new RegExp('id="hhTransitShow'+id+'"'));
 }
 assert.doesNotMatch(html,/hhTransitDetails|hh-transit-subtitle/);
 assert.match(html,/hhTransitCardsV791/);
 assert.doesNotMatch(html,/hh-transit-sheet-grip|hh-transit-sheet-actions|guardian-transit-sheet-v791\\.js|hh-transit-subtitle|Pipáld ki, melyik járat/);
 assert.doesNotMatch(html,/<summary>🚌 HealthHub Transit/);
 assert.match(css,/max-height:none!important/);
 assert.match(js,/function badgeFeatures\(id\)/);
 assert.match(js,/hh-bkk-badges-/);
 assert.match(js,/hh-guardian-transit-direction-v791/);
 assert.match(js,/nem élő helyzet/);
 assert.doesNotMatch(js,/navigator\\.geolocation|watchPosition|VehiclePositions|sb_secret_/);
});

test('v792 transit overlay survives late MapLibre style readiness and explains route loading',()=>{
 const js=read('guardian/guardian-transit-v791.js');
 assert.match(js,/map\.on\('idle'/);
 assert.match(js,/map\.on\('load',showSelected\)/);
 assert.match(js,/showSelected\(\);\s*if\(!\(map\.getLayer/);
 assert.match(js,/térképrétege még töltődik/);
});


test('v795 live pilot has visible status before route selectors and detects loading failures',()=>{
 const html=read('guardian/index.html');
 const loader=read('guardian/guardian-transit-v791.js');
 const pilot=read('guardian/guardian-live-pilot-v793.js');
 new Function(loader);new Function(pilot);
 assert.match(html,/guardian-transit-v791\.js\?v=817-1-41-static/);
 assert.match(loader,/hhLivePilot/);
 assert.match(loader,/script\.onerror/);
 assert.match(loader,/817-1-41-static/);
 assert.match(loader,/get\('hhLivePilot'\)!=='off'/);
 assert.match(pilot,/get\('hhLivePilot'\)==='off'/);
 assert.match(pilot,/holder\.prepend\(bar\)/);
 assert.match(pilot,/BKK élő helyzet/);
 assert.doesNotMatch(pilot,/ÉLŐ BKK TESZT/);
 assert.match(pilot,/Family Live részben/);
 assert.doesNotMatch(html,/hh-transit-sheet-grip|hh-transit-sheet-actions|hhTransitDetails/);
});


test('v796 live-only focus button shows real vehicles without changing v794 defaults',()=>{
 const html=read('guardian/index.html');
 const pilot=read('guardian/guardian-live-pilot-v793.js');
 const overlay=read('guardian/bkk-live-map-v793.js');
 new Function(pilot);new Function(overlay);
 assert.match(pilot,/hhBkkFocusV796/);
 assert.match(pilot,/renderer\.focus\(mapApi\.map,lastVehicles\)/);
 assert.match(pilot,/focusButton\.hidden=lastVehicles\.length===0/);
 assert.match(pilot,/scrollIntoView/);
 assert.match(overlay,/ÉLŐ/);
 assert.match(overlay,/function focus\(map,vehicles\)/);
 assert.doesNotMatch(html,/hh-transit-sheet-grip|hhTransitDetails/);
});


test('v799 canonical Family Guard enables live BKK automatically and keeps transport-colored direction checks',()=>{
 const html=read('guardian/index.html');
 const js=read('guardian/guardian-transit-v791.js');
 const live=read('guardian/guardian-live-pilot-v793.js');
 const css=read('guardian/guardian-transit-v791.css');
 new Function(js);new Function(live);
 assert.match(html,/guardian-transit-v791\.js\?v=817-1-41-static/);
 assert.match(html,/guardian-transit-v791\.css\?v=799-transport-color/);
 assert.match(js,/get\('hhLivePilot'\)!=='off'/);
 assert.match(live,/get\('hhLivePilot'\)==='off'/);
 assert.match(live,/BKK élő helyzet/);
 assert.doesNotMatch(live,/ÉLŐ BKK TESZT/);
 assert.match(js,/hh-transit-dir--/);
 for(const [kind,color] of [['bus','#279ff0'],['tram','#ffcb2c'],['hev','#36bf80']]){
  assert.ok(css.includes('.hh-transit-dir--'+kind+' input[type=checkbox]{accent-color:'+color+'}'),kind);
 }
 assert.match(html,/ÉLŐ járműjelölők/);
 assert.doesNotMatch(html,/hh-transit-sheet-grip|hhTransitDetails/);
});

test('v800 original Family Guard loads the approved compact live glass set',()=>{
 const html=read('guardian/index.html');
 const transit=read('guardian/guardian-transit-v791.js');
 const live=read('guardian/bkk-live-map-v793.js');
 const glass=read('guardian/bkk-live-glass-v800.css');
 new Function(transit);new Function(live);
 assert.match(html,/bkk-live-glass-v800\.css\?v=800-approved-set/);
 assert.match(html,/guardian-transit-v791\.js\?v=817-1-41-static/);
 assert.match(transit,/url\.searchParams\.set\('v','817-1-41-static'\)/);
 assert.match(live,/hh-bkk-glass-marker-v800/);
 assert.match(live,/ICONS=Object\.freeze/);
 assert.match(glass,/hh-bkk-glass--tram/);
 assert.match(glass,/hh-bkk-glass--hev/);
 assert.match(glass,/height:30px;min-width:70px/);
 assert.doesNotMatch(html,/hh-transit-sheet-grip|hhTransitDetails/);
});

test('Android Guardian button targets a real handled HH One native settings deep-link',()=>{
 const guardian=read('guardian/guardian.js');
 const native=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
 const manifest=read('android-bridge/app/src/main/AndroidManifest.xml');
 const html=read('guardian/index.html');
 assert.match(guardian,/healthhubconnect:\/\/settings/);
 assert.doesNotMatch(guardian,/healthhubconnect:\/\/guardian/);
 assert.match(native,/u\.host == "settings"/);
 assert.match(manifest,/android:host="settings"/);
 assert.match(html,/HH One · GPS és Android-engedélyek/);
});

test('v811 same-device profile mismatch is visible and never assumes Monika owns Zsolt phone',async()=>{
 const source=read('guardian/guardian-live-v785.js');
 const html=read('guardian/index.html');
 const script=read('guardian/guardian.js');
 for(const id of ['guardianLiveGpsDetail811','guardianLiveOwnerHelp811','guardianLiveResolveOwner811'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(script,/onGpsSignal\?\.\('inaccurate',accuracy\)/);
 assert.match(script,/onGpsSignal\?\.\(code===3\?'timeout':'unavailable'\)/);
 assert.match(source,/ownerMismatch=!!owner&&owner!==me/);
 const controls={};
 const store={'hh-profile':'m','hh-guardian-own-phone-profile-v785':'zsolt'};
 const element=()=>({textContent:'',disabled:false,hidden:false,
  classList:{add(){},remove(){}},addEventListener(k,fn){this[k]=fn},setAttribute(){}});
 const document={hidden:false,getElementById(id){return controls[id]||(controls[id]=element())},
  createElement:element,addEventListener(){}};
 const api={
  auth:{getUser(){return Promise.resolve({data:{user:{id:'user-1'}},error:null})},onAuthStateChange(){}},
  from(){return {select(){return this},in(){return Promise.resolve({data:[{profile_key:'monika'},{profile_key:'zsolt'}],error:null})},
   eq(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},
   upsert(){throw Error('GPS cannot upload without consent')},delete(){throw Error('Cannot remove other person position')}}}
 };
 const window={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://test.invalid',publishableKey:'public'},
  supabase:{createClient(){return api}},localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v},removeItem(k){delete store[k]}},
  setInterval(){return 1},clearInterval(){},setTimeout(){return 1},addEventListener(){},
  confirm(){throw Error('No automatic phone reassignment')},
  location:{origin:'https://test.invalid',pathname:'/healthhub/guardian/'}
 };
 vm.runInNewContext(source,{window,document,Date,Math,Number,String,Promise});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(controls.guardianLiveResolveOwner811.hidden,false,'direct fix link visible');
 assert.equal(controls.guardianLiveStart.disabled,true,'wrong owner cannot publish another person');
 assert.match(controls.guardianLiveIdentity.textContent,/NEM egyezik/);
 window.HH_GUARDIAN_LIVE_V785.onGpsSignal('timeout');
 assert.match(controls.guardianLiveGpsDetail811.textContent,/20 mp időtúllépés/);
 window.HH_GUARDIAN_LIVE_V785.onGpsSignal('inaccurate',185);
 assert.match(controls.guardianLiveGpsDetail811.textContent,/185 m/);
 window.HH_GUARDIAN_LIVE_V785.onGpsSignal('fix');
 assert.match(controls.guardianLiveGpsDetail811.textContent,/megfelelő pontosságú valódi pozíció/);
 assert.equal(window.HH_GUARDIAN_LIVE_V785.sharing,false,'GPS hardware alone never gives permission to share');
});

test('v812 foreground GPS timeout triggers one bounded network fix and offers safe retry',()=>{
 const code=read('guardian/guardian.js'),html=read('guardian/index.html');
 assert.match(html,/id="guardianRetryGps812"/);
 assert.match(html,/guardian\.js\?v=813-default-follow-3d-family/);
 const controls={},events={};
 function make(){
  return {textContent:'',disabled:false,hidden:false,
   classList:{toggle(){}},setAttribute(){},
   addEventListener(k,fn){this[k]=fn},
   click(){if(this.click)this.click()}}
 }
 const doc={hidden:false,documentElement:{dataset:{}},
  getElementById(id){return controls[id]||(controls[id]={
   textContent:'',disabled:false,hidden:false,classList:{toggle(){}},
   addEventListener(k,fn){this[k]=fn},setAttribute(){},
  })},createElement(){return make()},addEventListener(k,fn){events[k]=fn}};
 const watches=[],oneshots=[],cleared=[],fixes=[];
 const geo={
  watchPosition(success,error,options){watches.push({success,error,options});return watches.length},
  clearWatch(id){cleared.push(id)},
  getCurrentPosition(success,error,options){oneshots.push({success,error,options})}
 };
 const local={'hh-profile':'m'};
 const win={navigator:{geolocation:geo},isSecureContext:true,
  localStorage:{getItem(k){return local[k]||null},setItem(k,v){local[k]=v}},
  HH_GUARDIAN_LIVE_V785:{onGpsSignal(){},onGpsFix(pos){fixes.push(pos)},onGpsStopped(){},onGpsPaused(){},onProfileChanged(){}},
  addEventListener(){},console:{warn(){}}
 };
 vm.runInNewContext(code,{window:win,document:doc,Date,Math,Number,String,Set});
 assert.equal(oneshots.length,0,'no unsolicited network location request on page load');
 controls.guardianStart.click();
 assert.equal(watches.length,1);
 assert.equal(oneshots.length,0,'native precise watcher gets first opportunity');
 watches[0].error({code:3});
 assert.equal(watches.length,1,'timeout must not start a second watcher');
 assert.equal(oneshots.length,1,'fallback runs once after real timeout');
 assert.equal(oneshots[0].options.enableHighAccuracy,false);
 assert.equal(oneshots[0].options.maximumAge,0,'never accept cached coordinates by default');
 watches[0].error({code:3});
 assert.equal(oneshots.length,1,'repeated timeouts are bounded to one network request per session');
 oneshots[0].success({coords:{latitude:47.5,longitude:19.05,accuracy:7},timestamp:Date.now()-30000});
 assert.equal(fixes.length,0,'stale recovery fix never shared');
 assert.match(controls.guardianStatus.textContent,/Régi vagy dátum nélküli helyadat/);
 assert.equal(controls.guardianRetryGps812.hidden,false,'retry visible while awaiting a fresh fix');
 controls.guardianRetryGps812.click();
 assert.deepEqual(cleared,[1],'old watcher is disposed before explicit new one');
 assert.equal(watches.length,2);
 assert.equal(oneshots.length,2,'explicit retry starts a new low-accuracy one-shot');
 oneshots[1].success({coords:{latitude:47.5,longitude:19.05,accuracy:180},timestamp:Date.now()});
 assert.equal(fixes.length,0,'coarse GPS cannot upload as Family Live');
 assert.match(controls.guardianStatus.textContent,/100 m felett/);
 watches[1].success({coords:{latitude:47.5,longitude:19.05,accuracy:8},timestamp:Date.now()});
 assert.equal(fixes.length,1,'fresh accurate fix from active watcher is forwarded');
 assert.equal(controls.guardianRetryGps812.hidden,true,'retry hidden after valid current location');
 controls.guardianStop.click();
 assert.deepEqual(cleared,[1,2]);
 watches[1].success({coords:{latitude:48,longitude:20,accuracy:5},timestamp:Date.now()});
 assert.equal(fixes.length,1,'stopped callback cannot leak location');
});

test('v813 canonical Family Guard loads Follow, 3D and Family expanded without auto GPS or sharing',()=>{
 const html=read('guardian/index.html');
 const guardian=read('guardian/guardian.js');
 const live=read('guardian/guardian-live-v785.js');
 const follow=html.match(/<button id="guardianFollow"[^>]+>/)?.[0]||'';
 const mode3d=html.match(/<button id="guardian3D"[^>]+>/)?.[0]||'';
 const family=html.match(/<button id="guardianFamilyButton"[^>]+>/)?.[0]||'';
 const panel=html.match(/<section class="family-panel" id="guardianFamilyPanel"[^>]+>/)?.[0]||'';
 assert.match(follow,/aria-pressed="true"/,'Follow selected on startup');
 assert.match(mode3d,/aria-pressed="true"/,'3D selected on startup');
 assert.match(family,/aria-expanded="true"/,'Family expanded on startup');
 assert.doesNotMatch(panel,/\shidden(?:\s|=|>)/,'Family panel must show on startup');
 assert.match(guardian,/follow=true;threeD=true;\s*const familyPanel=/);
 assert.match(guardian,/if\(familyPanel\)familyPanel\.hidden=false/);
 assert.match(guardian,/familyButton\.setAttribute\('aria-expanded','true'\)/);
 assert.match(guardian,/theme\(\);renderButtons\(\);initMap\(\)/);
 assert.doesNotMatch(live,/applyLocationSettings\(data\)/,'stale cloud setting must not override launch view');
 assert.match(live,/function maybeAutoStart\(\)/,'existing opt-in own-phone foreground sharing remains');
 assert.match(live,/if\(sharing\|\|d\.hidden\|\|!user\|\|!access\.includes\(self\(\)\)\|\|!autoEnabled\(\)\)return/);
 assert.match(html,/guardian\.js\?v=813-default-follow-3d-family/);
 assert.match(html,/guardian-live-v785\.js\?v=813-default-follow-3d-family/);
});

test('v818 Family Live is above profile member cards without moving GPS consent controls',()=>{
 const html=read('guardian/index.html');
 const panelStart=html.indexOf('<section class="family-panel" id="guardianFamilyPanel"');
 const panelEnd=html.indexOf('<section class="gps-panel"',panelStart);
 assert.ok(panelStart>0&&panelEnd>panelStart);
 const panel=html.slice(panelStart,panelEnd);
 const header=panel.indexOf('class="family-panel-head"');
 const live=panel.indexOf('class="guardian-live-v785"');
 const grid=panel.indexOf('class="family-grid"');
 const corkyNote=panel.indexOf('class="family-note"');
 assert.ok(header>=0&&header<live&&live<grid&&grid<corkyNote,
  'Family header -> live GPS -> member cards -> Corky note');
 for(const id of ['guardianMeCard','guardianOtherCard','guardianCorkyCard',
  'guardianLiveStart','guardianLiveStop','guardianLiveInterval','guardianLiveIdentity',
  'guardianLiveResetDevice','guardianLiveDisableAuto']){
  assert.equal(html.split('id="'+id+'"').length-1,1,'must preserve '+id);
 }
 assert.match(html,/guardian-live-first-v818/);
 assert.doesNotMatch(panel,/class="family-grid"[\\s\\S]*class="guardian-live-v785"/,
  'member cards must not precede consent controls');
});

test('v827 foreground resumes approved owner after temporary auth loss, never another profile',async()=>{
 const source=read('guardian/guardian-live-v785.js');
 const controls={},listeners={},windowListeners={},store={
  'hh-profile':'m',
  'hh-guardian-own-phone-profile-v785':'monika',
  'hh-guardian-foreground-auto-v786':'monika'
 };
 function el(){return {disabled:false,hidden:false,textContent:'',value:'',
  classList:{add(){},remove(){}},addEventListener(k,fn){this[k]=fn},
  setAttribute(){},click(){if(this.click)this.click()}}}
 const doc={hidden:false,getElementById(id){return controls[id]||(controls[id]=el())},
  addEventListener(k,fn){listeners[k]=fn},createElement:el};
 const storage={getItem(k){return store[k]??null},setItem(k,v){store[k]=v},removeItem(k){delete store[k]}};
 let authCalls=0,follows=0,dialogs=0;
 const auth={
  async getUser(){
   authCalls++;
   if(authCalls===1)return {data:{user:null},error:{message:'temporary offline'}};
   return {data:{user:{id:'own-m'}},error:null}
  },
  onAuthStateChange(){},signOut(){return Promise.resolve({error:null})}
 };
 const api={auth,from(){return {select(){return this},
  in(){return Promise.resolve({data:[{profile_key:'monika'},{profile_key:'zsolt'}],error:null})},
  eq(){return this},maybeSingle(){return Promise.resolve({data:null,error:null})},
  upsert(){return Promise.resolve({error:null})},
  delete(){return Promise.resolve({error:null})}
 }}};
 const win={
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.invalid',publishableKey:'publishable-test'},
  supabase:{createClient(){return api}},localStorage:storage,
  HH_GUARDIAN_V761:{active:false,startFollowing(){follows++}},
  HH_GOLDEN_AVATARS_V529:{z:'z-photo',m:'m-photo'},
  confirm(){dialogs++;return true},setInterval(){return 1},clearInterval(){},
  setTimeout(){return 1},addEventListener(k,fn){windowListeners[k]=fn},
  location:{origin:'https://example.invalid',pathname:'/guardian/index.html'}
 };
 vm.runInNewContext(source,{window:win,document:doc,Date,Math,Number,String,Promise});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(follows,0,'transient auth failure must not begin GPS/host upload');
 assert.equal(authCalls,1);
 assert.match(controls.guardianLiveAutoStatus.textContent,/Google-bejelentkezés/);
 windowListeners.pageshow();
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(authCalls,2,'foreground retry rechecks auth');
 assert.equal(follows,1,'same already consented Monika phone resumes location');
 assert.equal(dialogs,0,'no repeat permission dialog');
 store['hh-profile']='z';
 windowListeners.storage({key:'hh-profile'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(follows,1,'switching to Zsolt on Mónika phone must NOT start own GPS again');
 assert.match(controls.guardianLiveIdentity.textContent,/NEM egyezik/);
 assert.match(controls.guardianLiveAutoStatus.textContent,/telefon.*Mónika/);
 assert.equal(store['hh-guardian-foreground-auto-v786'],'monika','profile switch does not revoke own consent');
});

test('v827 clearly distinguishes GPS follow camera from authorized automatic GPS start',()=>{
 const live=read('guardian/guardian-live-v785.js'),guardian=read('guardian/guardian.js');
 const html=read('guardian/index.html');
 assert.match(live,/function resumeOwnPhoneAutoFollow\(\)/);
 assert.match(live,/if\(!user\)\{if\(api\)refreshAuth\(\);return\}/);
 assert.match(live,/w\.addEventListener\('pageshow',resumeOwnPhoneAutoFollow\)/);
 assert.match(live,/else\{resetPolling\(\);resumeOwnPhoneAutoFollow\(\)\}/);
 assert.match(live,/function maybeAutoStart\(\)\{/);
 assert.match(live,/if\(sharing\|\|d\.hidden\|\|!user\|\|!access\.includes\(self\(\)\)\|\|!autoEnabled\(\)\)return/);
 assert.match(live,/ownerMismatch\?/,'owner mismatch is clearly signaled');
 assert.match(live,/Automatikus GPS: KI/);
 assert.match(live,/Automatikus GPS: BE/);
 assert.match(guardian,/follow=true;threeD=true;/,'default map view is Follow + 3D, not GPS capture');
 assert.match(guardian,/if\(!active\)\{start\(\);return\}/,'only consented owner can call startFollowing');
 assert.match(html,/id="guardianLiveAutoStatus"/);
 assert.doesNotMatch(live,/service_role|sb_secret_/);
});
