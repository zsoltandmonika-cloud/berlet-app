'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../guardian'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const {validate}=require('../guardian/bkk-live-v793.js'),toggle=require('../guardian/guardian-bkk-live-per-line-v909.js');
const map=require('../guardian/bkk-live-map-v793.js'),cat=require('../guardian/bkk-catalog-v801.json');
test('official GTFS BKK catalog IDs unique by transport mode and trip id',()=>{
 const keys=new Set,ids=new Set;assert.ok(cat.routes.length>300);
 for(const r of cat.routes){
  const k=r.mode+':'+r.id;assert.ok(!keys.has(k));keys.add(k);
  for(const id of r.gtfsRouteIds){assert.ok(!ids.has(id),id);ids.add(id)}
 }
 for(const key of ['bus:19','tram:19','trolley:75','hev:H5','metro:M2'])assert.ok(keys.has(key),key);
});
test('bus, tram, trolley, HÉV and metro live positions preserve verified mode',()=>{
 const now=Date.parse('2026-10-27T22:40:00Z'),ts=new Date(now-1000).toISOString();
 const input=[['bus:19','19','bus'],['tram:19','19','tram'],['trolley:75','75','trolley'],['hev:H5','H5','hev'],['metro:M2','M2','metro']];
 const obs=input.map(([key,num,mode],i)=>({id:'id-'+i,routeId:num,routeKey:key,mode,lat:47.5+i*.001,lng:19+i*.001,timestamp:ts}));
 obs.push({id:'wrong-mode',routeId:'75',routeKey:'trolley:75',mode:'metro',lat:47.5,lng:19.0,timestamp:ts});
 const r=validate({schemaVersion:1,source:'BKK Zrt., CC BY 4.0',feedType:'GTFS-RT VehiclePositions',generatedAt:ts,vehicles:obs},now);
 assert.equal(r.ok,true);assert.deepEqual(r.vehicles.map(x=>x.routeKey),input.map(x=>x[0]));
 assert.deepEqual(map.toFeatureCollection(r.vehicles).features.map(x=>x.properties.mode),input.map(x=>x[2]));
});
test('individual live selectors scoped by profile and mode',()=>{
 for(const k of ['bus:19','tram:19','trolley:75','hev:H5','metro:M2']){
  assert.equal(toggle.enabled(k,'zsolt'),true);toggle.setEnabled(k,false,'zsolt');
  assert.equal(toggle.enabled(k,'zsolt'),false);assert.equal(toggle.enabled(k,'monika'),true);
  toggle.setEnabled(k,true,'zsolt');
 }
});
test('server keeps existing BKK feed and auth; browser sends only favorites',()=>{
 const edge=fs.readFileSync(path.join(__dirname,'../../supabase/functions/hh-bkk-live-v793-preview/index.ts'),'utf8');
 assert.match(edge,/getUser\\(token\\)/);assert.match(edge,/feedCache/);
 assert.match(edge,/bkk-catalog-v801\\.json/);assert.match(edge,/allowed\\.has\\(v\\.routeKey\\)/);
 assert.match(read('guardian-live-pilot-v793.js'),/encodeURIComponent\\(favoriteKeys\\(\\)\\.join\\(','\\)\\)/);
 assert.match(read('guardian-bkk-watchlist-v814.js'),/if\\(route&&liveFilter\\)/);
});
