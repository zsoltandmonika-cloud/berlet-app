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
test('v802 is visible within existing v800 Family Guard and clearly labels external providers',()=>{
 const html=read('index.html'),script=read('guardian-smart-hub-v802.js'),css=read('guardian-smart-hub-v802.css');
 assert.ok(html.includes('hhSmartHubDestinationV802'));
 assert.ok(html.includes('hhSmartHubDestinationInputV802'));
 assert.ok(html.includes('guardian-smart-hub-v802.js?v=802-destination-a'));
 assert.ok(html.includes('guardian-smart-hub-v802.css?v=802-destination-a'));
 assert.ok(html.includes('hhSmartHubStreetV802'));
 assert.ok(html.includes('Google Térkép azonosítja'));
 assert.ok(html.includes('Nem élő kamera'));
 assert.ok(html.includes('hhTransitRoute260'));
 assert.ok(html.includes('bkk-live-glass-v800.css'));
 assert.ok(script.includes('input.addEventListener(\'input\',update)'));
 assert.ok(script.includes('form.addEventListener(\'submit\''));
 assert.ok(!script.includes('geolocation.getCurrentPosition'));
 assert.ok(!script.includes('localStorage.setItem'));
 assert.ok(css.includes('backdrop-filter:blur(12px)'));
});
