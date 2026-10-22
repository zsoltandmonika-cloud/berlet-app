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


test('v797 puts verified vehicles in DOM above WebGL extrusions, then removes stale markers',()=>{
 const seen=[];
 function node(tag){
  return {tag,style:{},children:[],attributes:{},append(...children){this.children.push(...children)},
   appendChild(child){this.children.push(child)},setAttribute(k,v){this.attributes[k]=v}};
 }
 const document={createElement:node};
 class FakeMarker{
  constructor(opts){this.options=opts;this.removed=false;seen.push(this)}
  setLngLat(point){this.point=point;return this}
  addTo(map){this.map=map;return this}
  remove(){this.removed=true;return this}
 }
 const map={getSource:()=>null,isStyleLoaded:()=>true,
  addLayer(){throw Error('DOM implementation must not add a map paint layer')}};
 const vehicle={id:'v260-real',routeId:'260',lat:47.56,lng:19.04};
 const deps={Marker:FakeMarker,document};
 assert.equal(overlay.render(map,{ok:true,vehicles:[vehicle]},deps),true);
 assert.equal(seen.length,1);
 assert.deepEqual(seen[0].point,[19.04,47.56]);
 assert.equal(seen[0].options.opacityWhenCovered,1);
 assert.match(seen[0].options.element.className,/hh-bkk-live-vehicle-dom-v797/);
 assert.match(seen[0].options.element.className,/hh-bkk-glass--bus/);
 const capsule=seen[0].options.element.children[0].children[0];
 assert.equal(capsule.className,'hh-bkk-glass-capsule-v800');
 assert.equal(capsule.children[1].className,'hh-bkk-glass-live-v800');
 assert.equal(capsule.children[2].textContent,'260');
 assert.equal(overlay.render(map,{ok:true,vehicles:[{...vehicle,lng:19.05}]},deps),true);
 assert.equal(seen.length,1,'reuse existing marker on refresh');
 assert.deepEqual(seen[0].point,[19.05,47.56]);
 assert.equal(overlay.render(map,{ok:true,vehicles:[]},deps),true);
 assert.equal(seen[0].removed,true,'remove vehicle when no longer in verified snapshot');
 overlay.render(map,{ok:true,vehicles:[vehicle]},deps);
 assert.equal(seen.length,2);
 overlay.clear(map);
 assert.equal(seen[1].removed,true,'clear on timeout, network error or page hiding');
});


test('v800 approved glass markers are compact, vector-based and mode-specific',()=>{
 const nodes=[];
 function node(tag){
  const el={tag,style:{},children:[],attributes:{},append(...items){this.children.push(...items)},
   appendChild(item){this.children.push(item)},setAttribute(k,v){this.attributes[k]=v}};
  nodes.push(el);return el;
 }
 const doc={createElement:node};
 for(const [routeId,mode] of [['260','bus'],['17','tram'],['19','tram'],['H5','hev']]){
  const marker=overlay.makeMarkerElement(doc,{routeId});
  assert.match(marker.className,/hh-bkk-glass-marker-v800/);
  assert.match(marker.className,new RegExp('hh-bkk-glass--'+mode));
  assert.equal(marker.attributes.role,'img');
  assert.match(marker.attributes['aria-label'],/Élő/);
  const [capsule,pin]=marker.children[0].children;
  assert.equal(capsule.className,'hh-bkk-glass-capsule-v800');
  assert.equal(pin.className,'hh-bkk-glass-pin-v800');
  const [icon,live,number]=capsule.children;
  assert.match(icon.innerHTML,/<svg /);
  assert.equal(live.className,'hh-bkk-glass-live-v800');
  assert.equal(number.textContent,routeId);
  assert.ok(!marker.children[0].children.some(el=>el.textContent==='● ÉLŐ'),'no stacked live flag');
 }
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../guardian/bkk-live-glass-v800.css'),'utf8');
 assert.match(css,/backdrop-filter:blur\(10px\)/);
 assert.match(css,/hh-bkk-glass--bus/); // default hue in shared root
 assert.match(css,/hh-bkk-glass--tram/);
 assert.match(css,/hh-bkk-glass--hev/);
 assert.match(css,/height:30px;min-width:70px/);
 assert.match(css,/pointer-events:none!important/);
});

test('v800 updates real DOM markers in place while preserving exact BKK coordinates',()=>{
 const created=[];
 function node(tag){return {tag,style:{},children:[],attributes:{},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},setAttribute(k,v){this.attributes[k]=v}}}
 class Marker{
  constructor(opts){this.opts=opts;created.push(this)}
  setLngLat(point){this.point=point;return this}
  addTo(map){this.map=map;return this}
  remove(){this.removed=true}
 }
 const deps={Marker,document:{createElement:node}};
 const map={getSource:()=>null,isStyleLoaded:()=>true};
 const vehicle={id:'real-260-800',routeId:'260',lat:47.56,lng:19.04};
 assert.equal(overlay.render(map,{ok:true,vehicles:[vehicle]},deps),true);
 assert.equal(created.length,1);
 assert.deepEqual(created[0].point,[19.04,47.56]);
 assert.equal(created[0].opts.opacityWhenCovered,1);
 assert.match(created[0].opts.element.className,/hh-bkk-glass-marker-v800/);
 assert.equal(overlay.render(map,{ok:true,vehicles:[{...vehicle,lat:47.57}]},deps),true);
 assert.equal(created.length,1);
 assert.deepEqual(created[0].point,[19.04,47.57]);
 assert.equal(overlay.render(map,{ok:true,vehicles:[]},deps),true);
 assert.equal(created[0].removed,true);
 // HÉV styling is ready, but no live HÉV may enter the feed until route verification is implemented.
 assert.equal(overlay.render(map,{ok:true,vehicles:[{id:'h5',routeId:'H5',lat:47.58,lng:19.04}]},deps),true);
 assert.equal(created.length,1);
 overlay.clear(map);
});
