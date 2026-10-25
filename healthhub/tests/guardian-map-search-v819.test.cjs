const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../guardian');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const search=require('../guardian/guardian-map-search-v819.js');

test('v819 prioritizes genuine Budapest-area candidates without inventing a place',()=>{
 const a={name:'Outside',lat:46.1,lng:18.5},b={name:'Budapest',lat:47.5,lng:19.05};
 assert.deepEqual(search.budapestFirst([a,b]),[b,a]);
 assert.deepEqual(search.budapestFirst([]),[]);
 assert.deepEqual(search.budapestFirst(null),[]);
 assert.equal(search.version,'819');
});

test('v819 search is over the SAME MapLibre map and expands it on a verified result only',()=>{
 const html=read('index.html'),code=read('guardian-map-search-v819.js'),css=read('guardian-map-search-v819.css');
 const mapStart=html.indexOf('<section class="map-card"'),end=html.indexOf('</section>',mapStart);
 const block=html.slice(mapStart,end);
 assert.ok(mapStart>=0&&end>mapStart);
 for(const id of ['guardianMap','guardianMapSearchInputV819','guardianMapSearchResultsV819',
  'guardianMapSearchMicV819','guardianMapSearchGoV819','guardianMapSearchExitV819',
  'guardianMapSearchNavigateV819'])
  assert.equal((block.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'missing '+id);
 assert.match(html,/guardian-map-search-v819\.css\?v=823-favorites-glass/);
 assert.match(html,/guardian-map-search-v819\.js\?v=823-favorites-first/);
 assert.match(code,/getMap|const map=\(\)=>w\.HH_GUARDIAN_V761&&w\.HH_GUARDIAN_V761\.map/);
 assert.match(code,/if\(!g\|\|!g\.validPlace\(place\)\)return false/);
 assert.match(code,/openFullscreen\(\)/);
 assert.match(code,/card\.requestFullscreen\(\)/);
 assert.match(code,/map\.flyTo|m\.flyTo/);
 assert.match(code,/\.resize\(/);
 assert.match(css,/100dvh/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/hh-map-search-hits-v819/);
 assert.doesNotMatch(code,/new w\.maplibregl\.Map|navigator\.geolocation|GPS_START|uploadJson|\.setItem\(/);
});

test('v819 only binds existing Smart Travel destination after verified Photon selection',()=>{
 const searchCode=read('guardian-map-search-v819.js');
 const fields=read('guardian-smart-hub-fields-v806.js');
 assert.match(searchCode,/g\.searchUrl\(value\)/);
 assert.match(searchCode,/g\.normalizeResults\(await response\.json\(\)\)/);
 assert.match(searchCode,/hh-guardian-map-destination-v819/);
 assert.match(fields,/hh-guardian-map-destination-v819/);
 assert.match(fields,/selectPlace\(e\.detail,'destination'\)/);
 assert.match(searchCode,/SpeechRecognition\|\|w\.webkitSpeechRecognition/);
 assert.match(searchCode,/e\.key==='Enter'/);
 assert.match(searchCode,/e\.key==='Escape'/);
 assert.match(searchCode,/if\(results\.length\)select\(results\[0\]\)/);
 assert.match(searchCode,/setFullscreen\(false\)/);
 assert.match(searchCode,/hhSmartHubDestinationV802/);
});

test('v820 selecting a verified address pauses map camera follow but not GPS collection',()=>{
 const guardian=read('guardian.js');
 const address=read('guardian-map-search-v819.js');
 const found=guardian.match(/function pauseCameraForMapSearch\(\)\{([\s\S]*?)\n\}/);
 assert.ok(found,'dedicated pause-camera method required');
 assert.match(found[1],/follow=false;renderButtons\(\);notifySettings\(\);return true/);
 assert.doesNotMatch(found[1],/stop\(|clearWatch|active=false|onGpsStopped|publish|upload/);
 assert.match(guardian,/startFollowing,pauseCameraForMapSearch,getLocationSettings/);
 assert.match(address,/HH_GUARDIAN_V761\?\.pauseCameraForMapSearch\?\.\(\)/);
 assert.ok(address.indexOf('if(!g||!g.validPlace(place))return false')<
  address.indexOf('pauseCameraForMapSearch'),'reject fake coordinates before camera change');
 assert.ok(address.indexOf('pauseCameraForMapSearch')<
  address.indexOf("new w.CustomEvent('hh-guardian-map-destination-v819'"));
});

test('v821 glass search is compact, profile-tinted and preserves fullscreen UX',()=>{
 const css=read('guardian-map-search-v819.css');
 const html=read('index.html');
 assert.match(html,/guardian-map-search-v819\.css\?v=823-favorites-glass/);
 assert.match(css,/width:min\(82%,410px\)/,'bar should be shorter than map width');
 assert.match(css,/height:39px;min-height:39px/,'low controls');
 assert.match(css,/padding:5px 7px;border:1px solid var\(--hh-map-shell-border\)/,'no thick purple outer ring');
 assert.match(css,/:root\[data-guardian-profile="m"\] \.hh-map-search-v819/,'Mónika pink skin');
 assert.match(css,/--hh-map-action:/,'glassy action tones');
 assert.match(css,/--hh-map-input:/,'glass input background');
 assert.match(css,/\.hh-map-search-hits-v819\[hidden\]/,'suggestion collapse preserved');
 assert.match(css,/hh-map-search-nav-v819\[hidden\]/,'routing action visibility preserved');
 assert.match(css,/safe-area-inset-bottom/,'full-size S24 safe area');
 assert.match(css,/body \.map-card #guardianMap \.maplibregl-ctrl-bottom-right/,'map controls stay visible above bar');
});

test('v822 search is lower, slimmer and more glassy for both profiles without helper text',()=>{
 const css=read('guardian-map-search-v819.css'),html=read('index.html');
 assert.match(html,/guardian-map-search-v819\.css\?v=823-favorites-glass/);
 assert.match(css,/width:min\(82%,410px\)/,'keep proportional narrow search capsule');
 assert.match(css,/right:auto;bottom:2px/,'lower bar towards map bottom');
 assert.match(css,/bottom:calc\(2px \+ env\(safe-area-inset-bottom\)\)/,'maintain Android fullscreen safe area');
 assert.match(css,/blur\(24px\) saturate\(1\.4\)/,'stronger translucent glass effect');
 assert.match(css,/--hh-map-shell-border:rgba\(184,225,255,.33\)/,'Zsolt pale blue glass line');
 assert.match(css,/--hh-map-shell-border:rgba\(255,211,246,.37\)/,'Mónika subtle pink glass line');
 assert.match(css,/\.hh-map-search-status-v819\{[\s\S]*?clip-path:inset\(50%\)!important/,'helper text not visually shown');
 assert.match(html,/id="guardianMapSearchStatusV819"[^>]*aria-live="polite"/,'announcements still accessible');
 assert.match(css,/@media\(max-width:385px\)/,'small devices keep comfortable controls');
 assert.doesNotMatch(read('guardian-map-search-v819.js'),/new w\.maplibregl\.Map|navigator\.geolocation/);
});

test('v823 favorites search uses only previously stored verified same-profile destinations',()=>{
 const fields=require('../guardian/guardian-smart-hub-fields-v806.js');
 const fixture={
  'hh-profile':'m',
  'hh-smart-arrival-favorite-places-v806-m':JSON.stringify([
   {label:'Otthon',place:{name:'Bécsi út 123',subtitle:'Budapest III.',lat:47.53,lng:19.039}},
   {label:'Munkahely',place:{name:'Bécsi Corner',subtitle:'Budapest',lat:47.52722,lng:19.03805}},
   {label:'Rossz hely',place:{name:'Hamis',lat:999,lng:19.1}}
  ]),
  'hh-smart-arrival-favorite-places-v806-z':JSON.stringify([
   {label:'Titkos zsolt cím',place:{name:'Zsolt címe',lat:47.50,lng:19.01}}
  ])
 };
 const storage={getItem:k=>fixture[k]??null};
 const monika=fields.listFavoritePlaces(storage);
 assert.deepEqual(monika.map(p=>p.displayName),['Otthon','Munkahely']);
 assert.ok(monika.every(p=>p.profile==='m'&&p.source==='favorite'));
 assert.ok(search.matchSaved(monika,'home').some(x=>x.displayName==='Otthon'));
 assert.ok(search.matchSaved(monika,'MUNKAHELY').some(x=>x.displayName==='Munkahely'));
 assert.ok(search.matchSaved(monika,'becsi').some(x=>x.displayName==='Munkahely'));
 assert.equal(search.matchSaved(monika,'titkos').length,0,'Zsolt saved addresses not visible in Mónika profile');
 fixture['hh-profile']='z';
 const zsolt=fields.listFavoritePlaces(storage);
 assert.deepEqual(zsolt.map(p=>p.displayName),['Titkos zsolt cím']);
 assert.equal(search.matchSaved(zsolt,'Otthon').length,0);
 assert.equal(search.matchSaved([{name:'Invalid',lat:Infinity,lng:19}],'' ).length,0);
 assert.equal(fields.listFavoritePlaces({getItem(){throw Error('offline')}}).length,0);
});

test('v823 favorites remain first and same-location OSM candidates do not duplicate',()=>{
 const saved=[{displayName:'Otthon',name:'Ellenőrzött hely',lat:47.53,lng:19.038,source:'favorite'}];
 const raw=[{name:'OSM duplicate',lat:47.53,lng:19.038},
  {name:'Másik utca',lat:47.531,lng:19.04}];
 assert.deepEqual(search.combineResults(saved,raw).map(p=>p.displayName||p.name),
  ['Otthon','Másik utca']);
 assert.equal(search.normalizeTerm('BÉCSI ÚT'),'becsi ut');
});

test('v823 search offers favorites instantly while official address search remains optional',()=>{
 const code=read('guardian-map-search-v819.js'),fields=read('guardian-smart-hub-fields-v806.js');
 const places=read('guardian-landmarks-v776.js'),html=read('index.html'),css=read('guardian-map-search-v819.css');
 assert.match(fields,/function listFavoritePlaces\(storage\)/);
 assert.match(fields,/listFavoritePlaces,init,version:'806'/);
 assert.match(code,/g\.listFavoritePlaces\(w\.localStorage\)/);
 assert.match(code,/showResults\(saved\);/);
 assert.match(code,/localMatches\(input\.value\)/);
 assert.match(code,/input\.addEventListener\('focus'/);
 assert.match(code,/g\.normalizeResults\(await response\.json\(\)\)/);
 assert.match(code,/if\(live\?\.authenticated&&live\?\.familyAuthorized\)/);
 assert.match(places,/get sharedEntries\(\)\{return shared\.map/);
 assert.doesNotMatch(places,/get privateEntries\(\)/,'no new unscoped private landmark access');
 assert.match(code,/place\.profile!==g\.profileId\(w\.localStorage\)/,'block stale profile access');
 assert.match(code,/function invalidateProfile\(\)/);
 assert.match(html,/placeholder="Cím, Otthon, Munkahely…"/);
 assert.match(html,/guardian-map-search-v819\.css\?v=823-favorites-glass/);
 assert.match(html,/guardian-map-search-v819\.js\?v=823-favorites-first/);
 assert.match(css,/\.hh-map-search-hit-icon-v823/);
 assert.match(css,/\.hh-map-search-hit-tag-v823/);
 assert.match(css,/:root\[data-guardian-profile="m"\] \.hh-map-search-hits-v819/);
 assert.match(css,/backdrop-filter:blur\(26px\) saturate\(1\.35\)/);
 assert.doesNotMatch(code,/navigator\.geolocation|GPS_START|uploadJson|\.setItem\(/);
});
