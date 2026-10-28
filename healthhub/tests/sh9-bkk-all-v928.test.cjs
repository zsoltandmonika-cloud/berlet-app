'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),guardian=path.join(root,'healthhub/guardian');
const read=p=>fs.readFileSync(path.join(guardian,p),'utf8');
const renderer=require('../guardian/guardian-sh9-all-bkk-v928.js');
const validated=require('../guardian/bkk-live-v793.js');
test('v928 accepts every verified BKK vehicle mode and rejects stale/invalid coordinates',()=>{
 const now=Date.parse('2026-10-28T10:00:00Z'),timestamp=new Date(now-12000).toISOString();
 const cases=[['bus:260','260','bus'],['tram:17','17','tram'],['trolley:75','75','trolley'],['metro:M2','M2','metro'],['hev:H5','H5','hev']];
 const vehicles=cases.map(([routeKey,routeId,mode],i)=>({id:'v'+i,routeKey,routeId,mode,lat:47.5+i*.001,lng:19+i*.001,timestamp}));
 const input={generatedAt:timestamp,vehicles};
 const geo=renderer.fromVerified(input,now);
 assert.equal(geo.features.length,5);
 assert.deepEqual(geo.features.map(f=>f.properties.mode),cases.map(x=>x[2]));
 assert.equal(geo.features[0].geometry.coordinates[0],19);
 assert.equal(renderer.fromVerified({...input,generatedAt:new Date(now-120000).toISOString()},now),null);
 assert.equal(renderer.fromVerified({...input,vehicles:[...vehicles,{...vehicles[0],id:'bad',lat:100}]},now).features.length,5);
});
test('v928 validator retains old favorites 1200 limit and opts into larger SH9 cap',()=>{
 const now=Date.parse('2026-10-28T10:00:00Z'),timestamp=new Date(now-15000).toISOString();
 const vehicles=Array.from({length:1201},(_,i)=>({id:'vehicle-'+i,routeId:'260',routeKey:'bus:260',mode:'bus',lat:47.55,lng:19.01,timestamp}));
 const input={schemaVersion:1,source:'BKK Zrt., CC BY 4.0',feedType:'GTFS-RT VehiclePositions',generatedAt:timestamp,vehicles};
 assert.equal(validated.validate(input,now).ok,false);
 assert.equal(validated.validate(input,now,3500).ok,true);
 assert.equal(validated.validate(input,now,3500).vehicles.length,1201);
});
test('v928 backend only accepts bounded viewport and leaves old favorites untouched',()=>{
 const edge=fs.readFileSync(path.join(root,'supabase/functions/hh-bkk-live-v793-preview/index.ts'),'utf8');
 const client=read('guardian-live-pilot-v793.js');
 assert.match(edge,/function sh9Bounds\(raw:string\|null\)/);
 assert.match(edge,/invalid-sh9-viewport/);
 assert.match(edge,/query.get\("all"\)==="1"&&selected===null/);
 assert.match(edge,/allMode\?all\.filter/);
 assert.match(edge,/allowed\.has\(v.routeKey\)/);
 assert.match(edge,/const cap=allMode\?3500:1200/);
 assert.match(edge,/const vehicles=allMode\?chosen.map/);
 assert.match(edge,/feedCache&&Date\.now\(\)-feedCache\.at<12500/);
 assert.match(edge,/getUser\(token\)/);
 assert.match(client,/const sh9AllMode=new URLSearchParams/);
 assert.match(client,/sh9AllMode\?'all=1&bbox='\+encodeURIComponent\(bbox\)/);
 assert.match(client,/sh9AllMode\?validator\.validate\(data,Date\.now\(\),3500\):validator\.validate\(data\)/);
 assert.match(client,/sh9AllMode\?120000:15000/);
 assert.match(client,/if\(sh9AllMode\|\|d\.hidden\)return/);
 assert.match(client,/hh-sh9-all-live-enabled-v928/);
 assert.match(client,/hh-sh9-all-live-refresh-v928/);
 assert.match(client,/sh9Abort\?\.abort/);
 assert.doesNotMatch(client,/setInterval\(poll,1000\)/);
});
test('v928 overlay creates one clustered GeoJSON source, only in SH9 mode and with NO fetch or GPS',()=>{
 const src=read('guardian-sh9-all-bkk-v928.js');
 const html=read('index.html');
 const css=read('guardian-sh9-all-bkk-v928.css');
 assert.match(html,/guardian-sh9-all-bkk-v928\.js\?v=928-viewport-low-usage/);
 assert.match(html,/id="sh9AllVehiclesToggleV928"/);
 assert.match(html,/id="sh9AllVehiclesRefreshV928"/);
 assert.match(html,/guardian-sh9-all-bkk-v928\.css/);
 assert.match(src,/cluster:true,clusterRadius:48,clusterMaxZoom:14/);
 assert.match(src,/map\.getSource\(ID\)\.setData/);
 assert.match(src,/if\(new URLSearchParams\(w.location.search\).get\('sh9Transit'\)!=='1'\)return/);
 assert.doesNotMatch(src,/fetch\(|setInterval\(|getCurrentPosition\(|watchPosition\(|new maplibregl\.Map|supabase\.co/);
 assert.match(css,/:root:not\(\[data-sh9-transit="on"\]\)/);
 assert.equal([...html.matchAll(/id="guardianMap"/g)].length,1);
});
test('v928 mounted layer displays all source modes, toggle OFF hides AND signals traffic pause',()=>{
 const src=read('guardian-sh9-all-bkk-v928.js');
 const elements={},events={},sources=new Map(),layers=new Set(),calls=[];
 function el(id){return elements[id]||(elements[id]={id,textContent:'',disabled:false,handlers:{},setAttribute(k,v){this[k]=v},addEventListener(name,fn){this.handlers[name]=fn}})}
 const map={getSource:id=>sources.get(id),isStyleLoaded:()=>true,getLayer:id=>layers.has(id),on(){},
  addSource(id,opts){sources.set(id,{opts,data:opts.data,setData(v){this.data=v}});calls.push('addSource')},
  addLayer(x){layers.add(x.id)}};
 const d={hidden:false,getElementById:el,createElement:()=>({append(){},textContent:''})};
 const w={document:d,location:{search:'?sh9Transit=1'},
  HH_GUARDIAN_V761:{map},addEventListener(type,fn){events[type]=fn},
  dispatchEvent(e){calls.push(e.type)},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}}};
 vm.runInNewContext(src,{window:w,document:d,URLSearchParams,Date,Number,Set});
 const now=Date.now(),timestamp=new Date(now-15000).toISOString();
 const sample=[['bus','260'],['tram','17'],['trolley','75'],['hev','H5'],['metro','M2']].map(([mode,num],i)=>({id:'v'+i,routeId:num,routeKey:mode+':'+num,mode,lat:47.5+i*.001,lng:19.0+i*.001,timestamp}));
 events['hh-sh9-all-live-v928']({detail:{generatedAt:timestamp,vehicles:sample,truncated:false}});
 assert.equal(sources.size,1);
 assert.equal(sources.get(renderer.ID).data.features.length,5);
 el('sh9AllVehiclesToggleV928').handlers.click();
 assert.equal(sources.get(renderer.ID).data.features.length,0);
 assert.ok(calls.includes('hh-sh9-all-live-enabled-v928'));
 el('sh9AllVehiclesToggleV928').handlers.click();
 el('sh9AllVehiclesRefreshV928').handlers.click();
 assert.ok(calls.includes('hh-sh9-all-live-refresh-v928'));
 const blank={document:d,location:{search:''},addEventListener(){throw Error('Must not initialize normal Family Guard')}};
 vm.runInNewContext(src,{window:blank,document:d,URLSearchParams,Date,Number,Set});
 assert.equal(sources.size,1);
});
