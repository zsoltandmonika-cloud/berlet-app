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


test('v796 live vehicle markers have a distinct ELO label and halo',()=>{
 const layers=new Map(),sources=new Map();
 const map={isStyleLoaded:()=>true,getSource:id=>sources.get(id),getLayer:id=>layers.get(id),
  addSource(id,opts){sources.set(id,{setData(data){this.data=data},data:opts.data})},
  addLayer(layer){layers.set(layer.id,layer)}};
 overlay.render(map,{ok:true,vehicles:[{id:'live1',routeId:'260',lat:47.57,lng:19.01,timestamp:'2026-10-22T17:10:54Z'}]});
 assert.ok(layers.has(overlay.sourceId+'-halo'));
 assert.equal(layers.get(overlay.sourceId+'-live-label').layout['text-field'],'ÉLŐ');
 assert.equal(sources.get(overlay.sourceId).data.features.length,1);
});
test('v796 focuses only on genuine visible vehicles when explicitly requested',()=>{
 const seen={};
 const map={resize(){seen.resize=true},getZoom:()=>14,
  flyTo(opts){seen.flyTo=opts},fitBounds(bounds,opts){seen.fitBounds=[bounds,opts]}};
 assert.equal(overlay.focus(map,[]),false);
 assert.equal(overlay.focus(map,[{lat:1000,lng:19}]),false);
 assert.equal(seen.flyTo,undefined);
 assert.equal(overlay.focus(map,[{id:'live1',routeId:'260',lat:47.571,lng:19.007}]),true);
 assert.deepEqual(seen.flyTo.center,[19.007,47.571]);
 assert.equal(seen.flyTo.zoom>=15.8,true);
 assert.equal(overlay.focus(map,[{lat:47.57,lng:19.01},{lat:47.6,lng:19.03}]),true);
 assert.deepEqual(seen.fitBounds[0],[[19.01,47.57],[19.03,47.6]]);
});
