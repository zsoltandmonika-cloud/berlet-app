const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const place=require('../guardian/guardian-smart-hub-v802.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../guardian',p),'utf8');

test('v802 route name converts into a Google Maps transit direction link without a bus number',()=>{
 const result=place.urls('Bécsi Corner');
 assert.ok(result);
 const parsed=new URL(result.directions);
 assert.equal(parsed.origin,'https://www.google.com');
 assert.equal(parsed.pathname,'/maps/dir/');
 assert.equal(parsed.searchParams.get('api'),'1');
 assert.equal(parsed.searchParams.get('destination'),'Bécsi Corner Budapest');
 assert.equal(parsed.searchParams.get('travelmode'),'transit');
 assert.equal(parsed.searchParams.has('origin'),false,'device chooses origin with consent in Google Maps');
 assert.ok(result.search.startsWith('https://www.google.com/maps/search/'));
 assert.ok(result.street.startsWith('https://www.instantstreetview.com/s/'));
});
test('v802 destination input is safely encoded and never interpreted as markup',()=>{
 const result=place.urls('  Bécsi Corner & <script>  ');
 assert.ok(result.directions.includes('%26'));
 assert.ok(result.directions.includes('%3Cscript%3E'));
 assert.equal(place.urls(''),null);
 assert.equal(place.urls('a'),null);
 assert.equal(place.urls('x\u0000y'),null);
 assert.ok(place.searchTerm('MOM Park').includes('Budapest'));
});
test('v803 replaces external destination handoff with native HealthHub search',()=>{
 const html=read('index.html'),js=read('guardian-smart-hub-native-v803.js'),css=read('guardian-smart-hub-native-v803.css');
 assert.ok(html.includes('hhSmartHubDestinationV802'));
 assert.ok(html.includes('hhSmartHubFromV806') && html.includes('hhSmartHubToV806'));
 assert.ok(html.includes('guardian-smart-hub-fields-v806.js?v=825-script-parser-repair'));
 assert.ok(html.includes('guardian-smart-hub-native-v803.css?v=803-native-b'));
 assert.ok(html.includes('hhSmartHubNativeResultsV803'));
 assert.ok(html.includes('OpenStreetMap-alapú Photon'));
 assert.ok(!html.includes('id="hhSmartHubDirectionsV802"'));
 assert.ok(!html.includes('id="hhSmartHubStreetV802"'));
 assert.ok(!html.includes('<script defer src="./guardian-smart-hub-v802.js'));
 assert.ok(html.includes('hhTransitRoute260'));
 assert.ok(html.includes('bkk-live-glass-v800.css'));
 assert.ok(js.includes("input.addEventListener('input'"));
 assert.ok(js.includes("form.addEventListener('submit'"));
 assert.ok(!js.includes('geolocation.getCurrentPosition'));
 assert.ok(!js.includes('localStorage.setItem'));
 assert.ok(css.includes('backdrop-filter:blur(10px)'));
});
