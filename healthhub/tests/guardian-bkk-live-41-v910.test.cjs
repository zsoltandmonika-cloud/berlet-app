'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../guardian');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {validate}=require('../guardian/bkk-live-v793.js');
const liveFilter=require('../guardian/guardian-bkk-live-per-line-v909.js');
const map=require('../guardian/bkk-live-map-v793.js');
const now=Date.parse('2026-10-27T21:30:00.000Z'),date=new Date(now-1000).toISOString();
test('41 and 1 GTFS-RT positions are source-validated, 999 unsupported',()=>{
 const snap={schemaVersion:1,source:'BKK Zrt., CC BY 4.0',feedType:'GTFS-RT VehiclePositions',generatedAt:date,
  vehicles:[{id:'tram41',routeId:'41',lat:47.49,lng:19.02,timestamp:date},
   {id:'tram1',routeId:'1',lat:47.52,lng:19.08,timestamp:date},
   {id:'invalid',routeId:'999',lat:47.5,lng:19.04,timestamp:date}]};
 const v=validate(snap,now);
 assert.equal(v.ok,true);assert.deepEqual(v.vehicles.map(x=>x.routeId),['41','1']);
 assert.deepEqual(map.toFeatureCollection(v.vehicles).features.map(x=>x.properties.route),['41','1']);
});
test('per-profile favorite live controls for 41 and 1 are independent',()=>{
 assert.equal(liveFilter.enabled('41','zsolt'),true);
 assert.equal(liveFilter.setEnabled('41',false,'zsolt'),true);
 assert.equal(liveFilter.enabled('41','zsolt'),false);
 assert.equal(liveFilter.enabled('41','monika'),true);
 assert.equal(liveFilter.enabled('1','zsolt'),true);
 assert.equal(liveFilter.setEnabled('41',true,'zsolt'),true);
});
test('all 5 original routes remain catalogued, but live tracking now universal',()=>{
 const catalog=require('../guardian/bkk-catalog-v801.json');
 for(const id of ['260','17','19','1','41'])assert.ok(catalog.routes.some(z=>z.id===id&&z.gtfsRouteIds.length));
 const edge=fs.readFileSync(path.join(__dirname,'../../supabase/functions/hh-bkk-live-v793-preview/index.ts'),'utf8');
 assert.match(edge,/bkk-catalog-v801\\.json/);
 assert.match(read('guardian-live-pilot-v793.js'),/favoriteKeys\\(\\)/);
 assert.match(read('guardian-bkk-watchlist-v814.js'),/if\\(route&&liveFilter\\)/);
});
