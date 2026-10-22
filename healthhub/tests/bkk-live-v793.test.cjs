const test=require('node:test');
const assert=require('node:assert/strict');
const {validate}=require('../guardian/bkk-live-v793.js');
const now=Date.parse('2026-10-22T15:00:00Z');
const base={schemaVersion:1,source:'BKK Zrt., CC BY 4.0',feedType:'GTFS-RT VehiclePositions',generatedAt:new Date(now-1000).toISOString()};
test('v793 accepts fresh valid observations for selected route IDs',()=>{
 const s={...base,vehicles:[{id:'veh-1',routeId:'260',lat:47.57,lng:19.01,timestamp:new Date(now-1000).toISOString()}]};
 assert.equal(validate(s,now).vehicles.length,1);
});
test('v793 rejects stale, missing, and untrusted data without invented vehicles',()=>{
 assert.deepEqual(validate(null,now).vehicles,[]);
 assert.equal(validate({...base,source:'other',vehicles:[]},now).ok,false);
 assert.equal(validate({...base,generatedAt:new Date(now-120000).toISOString(),vehicles:[]},now).ok,false);
});
test('v793 drops impossible GPS values, duplicates, old vehicles and unrelated routes',()=>{
 const timestamp=new Date(now-1000).toISOString();
 const s={...base,vehicles:[{id:'valid',routeId:'17',lat:47.5,lng:19,timestamp},{id:'valid',routeId:'17',lat:47.5,lng:19,timestamp},{id:'bad',routeId:'260',lat:700,lng:19,timestamp},{id:'stale',routeId:'19',lat:47.5,lng:19,timestamp:new Date(now-120000).toISOString()},{id:'other',routeId:'999',lat:47.5,lng:19,timestamp}]};
 assert.deepEqual(validate(s,now).vehicles.map(x=>x.id),['valid']);
});
