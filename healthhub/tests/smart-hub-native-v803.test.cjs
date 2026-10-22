const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const native=require('../guardian/guardian-smart-hub-native-v803.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../guardian',p),'utf8');

test('v803 native destination search never needs route numbers or personal GPS',()=>{
 assert.equal(native.queryText('Bécsi Corner'),'Bécsi Corner');
 assert.equal(native.queryText('a'),null);
 assert.equal(native.queryText('ab'),null);
 assert.equal(native.queryText('    '),null);
 assert.equal(native.queryText('B\u0000écsi Corner'),null);
 const url=new URL(native.searchUrl('Bécsi Corner'));
 assert.equal(url.hostname,'photon.komoot.io');
 assert.equal(url.pathname,'/api/');
 assert.equal(url.searchParams.get('q'),'Bécsi Corner');
 assert.equal(url.searchParams.get('limit'),'6');
 assert.equal(url.searchParams.has('lang'),false,'Photon public endpoint rejects lang=hu with HTTP 400');
 assert.equal(url.searchParams.get('lat'),'47.506');
 assert.equal(url.searchParams.get('lon'),'19.0467');
 assert.ok(!url.searchParams.has('key'));
 assert.ok(!url.searchParams.has('user'));
});

test('v803 renders only source-backed, finite coordinate Photon data',()=>{
 const document={type:'FeatureCollection',features:[
  {geometry:{type:'Point',coordinates:[19.0380536,47.5272224]},properties:{name:'Bécsi Corner',street:'Bécsi út',city:'Budapest',countrycode:'HU',osm_id:3370619,osm_type:'R'}},
  {geometry:{type:'Point',coordinates:[19.0380536,47.5272224]},properties:{name:'Bécsi Corner',street:'Bécsi út',city:'Budapest',countrycode:'HU',osm_id:3370619,osm_type:'R'}},
  {geometry:{type:'Point',coordinates:[Infinity,47.5]},properties:{name:'Invalid'}},
  {geometry:{type:'Point',coordinates:[19.03,999]},properties:{name:'Off planet'}},
  {geometry:{type:'Point',coordinates:[15,49]},properties:{name:'Not in Hungary',countrycode:'SK'}},
  {geometry:{type:'LineString',coordinates:[19,47]},properties:{name:'Not a point'}}
 ]};
 const parsed=native.normalizeResults(document);
 assert.equal(parsed.length,1);
 assert.equal(parsed[0].name,'Bécsi Corner');
 assert.ok(parsed[0].subtitle.includes('Bécsi út'));
 assert.deepEqual([parsed[0].lng,parsed[0].lat],[19.0380536,47.5272224]);
 assert.deepEqual(native.normalizeResults({}),[]);
});

test('v803 uses own MapLibre destination marker, preserves v800 live buses and marks routing unfinished',()=>{
 const html=read('index.html'),js=read('guardian-smart-hub-native-v803.js'),css=read('guardian-smart-hub-native-v803.css');
 assert.ok(html.includes('hhSmartHubNativeResultsV803'));
 assert.ok(html.includes('hhSmartHubSelectedV803'));
 assert.ok(html.includes('guardian-smart-hub-native-v803.js?v=803-native-c'));
 assert.ok(!html.includes('id="hhSmartHubDirectionsV802"'));
 assert.ok(html.includes('bkk-live-glass-v800.css'));
 assert.ok(js.includes('HH_GUARDIAN_V761.map'));
 assert.ok(js.includes('new Marker({element:node'));
 assert.ok(js.includes('textContent=item.name'));
 assert.ok(js.includes('BKK-útvonaltervezés ehhez a célhoz a következő fejlesztés'));
 assert.ok(js.includes('DEBOUNCE_MS=1000,MIN_GAP_MS=1400'));
 assert.ok(js.includes('w.fetch(searchUrl(value)'));
 assert.ok(!js.includes('maps.google.com'));
 assert.ok(!js.includes('geolocation'));
 assert.ok(!js.includes('localStorage'));
 assert.ok(css.includes('.hh-smart-hub-map-pin-v803'));
});

test('v803.1 no unsupported geocoder locale reaches live Photon endpoint',()=>{
 const u=new URL(native.searchUrl('Bécsi Corner'));
 assert.equal(u.searchParams.has('lang'),false);
 assert.equal(u.searchParams.get('q'),'Bécsi Corner');
});
