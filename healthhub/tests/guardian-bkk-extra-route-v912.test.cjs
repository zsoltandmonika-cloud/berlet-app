'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../guardian'),read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const api=require('../guardian/guardian-bkk-extra-route-v912.js');
const network=require('../guardian/bkk-network-v806.json');
test('v912 existing BKK directed GTFS stop patterns cover tram 41, HEV H5 and metro M2 without invented track geometry',()=>{
 const parsed=api.parse(network,new Date(network.generatedAt).getTime()+1000);
 assert.ok(parsed instanceof Map);for(const key of ['tram:41','hev:H5','metro:M2','trolley:75','bus:19','tram:19'])assert.ok(parsed.has(key),key);
 assert.notEqual(parsed.get('bus:19'),parsed.get('tram:19'));
 assert.match(network.limitations,/One most-frequent stop pattern/);
});
test('v912 Watchlist offers independent Mutasd and Élő toggle for any source-backed BKK favorite',()=>{
 const s=read('guardian-bkk-watchlist-v814.js');
 assert.match(s,/if\(route\)\{/);
 assert.match(s,/extra\.showLine\(key\)/);
 assert.match(s,/extra\.setLineVisible\(key,false\)/);
 assert.match(s,/if\(route&&liveFilter\)/);
 assert.match(read('index.html'),/guardian-bkk-extra-route-v912\.js/);
});
test('v912 popup is opt-in, source-aware, and does not invent vehicle locations/ETA',()=>{
 const e=read('guardian-bkk-extra-route-v912.js'),m=read('bkk-live-map-v793.js');
 assert.match(e,/sematikus/);
 assert.match(e,/setDOMContent\(root\)/);
 assert.match(m,/setDOMContent\(el\)/);
 assert.match(m,/stopPropagation/);
 assert.match(read('guardian-transit-v791.js'),/routeDetailsPopup/);
 assert.match(m,/hhSetVehicle/);
 assert.doesNotMatch(e,/geolocation|setInterval\(|Math\.random\(/);
});
