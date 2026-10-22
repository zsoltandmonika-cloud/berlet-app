const test=require('node:test');
const assert=require('node:assert/strict');
const overlay=require('../guardian/bkk-live-map-v793.js');
test('v793 live overlay uses only verified real positions',()=>{
 const layers=new Map(),sources=new Map();
 const map={isStyleLoaded:()=>true,getSource:id=>sources.get(id),getLayer:id=>layers.get(id),
  addSource(id,opts){sources.set(id,{setData(data){this.data=data},data:opts.data})},
  addLayer(layer){layers.set(layer.id,layer)}};
 assert.equal(overlay.render(map,{ok:false,vehicles:[]}),false);
 assert.equal(sources.size,0);
 assert.equal(overlay.render(map,{ok:true,vehicles:[{id:'v1',routeId:'260',lat:47.57,lng:19.01,timestamp:'2026-10-22T15:00:00Z'}]}),true);
 assert.deepEqual(sources.get(overlay.sourceId).data.features[0].geometry.coordinates,[19.01,47.57]);
 overlay.clear(map);assert.deepEqual(sources.get(overlay.sourceId).data.features,[]);
});
test('v793 map never inserts positions before MapLibre style is ready',()=>{
 const map={isStyleLoaded:()=>false,getSource:()=>null};
 assert.equal(overlay.render(map,{ok:true,vehicles:[]}),false);
});
