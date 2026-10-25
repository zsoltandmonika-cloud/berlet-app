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
 assert.match(html,/guardian-map-search-v819\.css\?v=819-glass-fullscreen/);
 assert.match(html,/guardian-map-search-v819\.js\?v=819-search-fullscreen/);
 assert.match(code,/getMap|const map=\(\)=>w\.HH_GUARDIAN_V761&&w\.HH_GUARDIAN_V761\.map/);
 assert.match(code,/if\(!g\|\|!g\.validPlace\(place\)\)return false/);
 assert.match(code,/openFullscreen\(\)/);
 assert.match(code,/card\.requestFullscreen\(\)/);
 assert.match(code,/map\.flyTo|m\.flyTo/);
 assert.match(code,/\.resize\(/);
 assert.match(css,/100dvh/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/hh-map-search-hits-v819/);
 assert.doesNotMatch(code,/new w\.maplibregl\.Map|navigator\.geolocation|GPS_START|uploadJson|localStorage/);
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
