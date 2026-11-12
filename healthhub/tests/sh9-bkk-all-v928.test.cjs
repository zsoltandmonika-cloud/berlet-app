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
 assert.match(client,/lastSh9RequestAt<45000/);
 assert.match(client,/if\(sh9AllMode\)\{lastSh9RequestAt=Date\.now\(\);lastSh9Bbox=bbox;\}/);
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
 assert.match(html,/guardian-sh9-all-bkk-v928\.js\?v=932-visible-map-status/);
 assert.match(html,/id="sh9AllVehiclesToggleV928"/);
 assert.match(html,/id="sh9AllVehiclesRefreshV928"/);
 assert.match(html,/guardian-sh9-all-bkk-v928\.css/);
 assert.match(src,/cluster:true,clusterRadius:48,clusterMaxZoom:14/);
 assert.match(src,/if\(source\?\.setData\)source\.setData/);
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


test('v929 uses approved floating Golden Glass BKK icons above 3D for verified vehicles, no extra requests',()=>{
 const source=read('guardian-sh9-all-bkk-v928.js');
 const events={},els={},sources=new Map(),layers=new Set(),layout=[],markers=[];
 function el(id){return els[id]||(els[id]={id,textContent:'',disabled:false,handlers:{},setAttribute(){},addEventListener(name,fn){this.handlers[name]=fn}})}
 const bounds={getWest:()=>18.95,getEast:()=>19.2,getSouth:()=>47.45,getNorth:()=>47.65};
 const map={isStyleLoaded:()=>true,getSource:id=>sources.get(id),getLayer:id=>layers.has(id),
  getBounds:()=>bounds,getZoom:()=>16,addSource(id,o){sources.set(id,{setData(d){this.data=d},data:o.data})},
  addLayer(x){layers.add(x.id)},setLayoutProperty(id,k,v){layout.push([id,k,v])},on(){},once(){}};
 class Marker{constructor(args){this.args=args;markers.push(this)}setLngLat(x){this.coords=x;return this}addTo(m){this.map=m;return this}remove(){this.removed=true}getElement(){return this.args.element}}
 const d={hidden:false,getElementById:el,createElement:()=>({append(){},textContent:''})};
 const w={document:d,location:{search:'?sh9Transit=1'},
  HH_GUARDIAN_V761:{map},maplibregl:{Marker},
  HH_BKK_LIVE_MAP_V793:{makeMarkerElement(_doc,v){return{vehicle:v,hhSetVehicle(){}}}},
  addEventListener(type,fn){events[type]=fn},
  CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},
  dispatchEvent(e){if(e.type==='hh-sh9-all-live-ready-v929')return}
 };
 vm.runInNewContext(source,{window:w,document:d,URLSearchParams,Date,Number,Set});
 assert.equal(sources.size,1);
 const timestamp=new Date(Date.now()-11000).toISOString();
 const vehicles=[['bus:260','260','bus'],['tram:17','17','tram'],['trolley:75','75','trolley'],['hev:H5','H5','hev'],['metro:M2','M2','metro']]
 .map(([routeKey,routeId,mode],i)=>({id:'v'+i,routeKey,routeId,mode,lat:47.51+i*.004,lng:19.02+i*.01,timestamp}));
 events['hh-sh9-all-live-v928']({detail:{generatedAt:timestamp,vehicles}});
 assert.equal(markers.length,5);
 assert.equal(sources.get(renderer.ID).data.features.length,5);
 assert.equal(layout.at(-1)[2],'none');
 assert.match(el('sh9AllVehiclesStatusV928').textContent,/5 ellenőrzött jármű/);
 el('sh9AllVehiclesToggleV928').handlers.click();
 assert.equal(sources.get(renderer.ID).data.features.length,0);
 assert.equal(markers.filter(m=>m.removed).length,5);
});
test('v929 shows real server errors instead of stale movement instructions',()=>{
 const live=read('guardian-live-pilot-v793.js'),ui=read('guardian-sh9-all-bkk-v928.js');
 assert.match(live,/const head=d.getElementById\('sh9TransitStatusV927'\)/);
 assert.match(live,/hh-sh9-all-live-ready-v929/);
 assert.match(ui,/emit\('hh-sh9-all-live-ready-v929'\)/);
 assert.match(ui,/last\.features\.length===0/);
 assert.match(ui,/A térkép elmozdult|új területhez Frissítés/);
 assert.match(ui,/makeMarkerElement\(d,vehicle\)/);
 assert.doesNotMatch(ui,/fetch\(|setInterval\(|watchPosition\(|getCurrentPosition\(/);
});


test('v930 city overview waits for ready map and never changes normal Family Guard',()=>{
 const live=read('guardian-live-pilot-v793.js');
 const html=read('index.html');
 assert.match(live,/if\(!sh9AllMode\)return null/);
 assert.match(live,/if\(!sh9OverviewSet&&activeMap\?\.jumpTo\)/);
 assert.match(live,/activeMap\.jumpTo\(\{center:\[19\.0467,47\.5060\],zoom:11\.6,pitch:0,bearing:0\}\)/);
 assert.match(live,/typeof activeMap\.loaded==='function'&&!activeMap\.loaded\(\)/);
 assert.match(html,/guardian-sh9-all-bkk-v928\.js\?v=932-visible-map-status/);
 assert.match(html,/guardian-sh9-all-bkk-v928\.css\?v=932-visible-map-status/);
});
test('v930 visible verified count and empty-area repair remain fail closed and throttled',()=>{
 const ui=read('guardian-sh9-all-bkk-v928.js');
 const css=read('guardian-sh9-all-bkk-v928.css');
 const live=read('guardian-live-pilot-v793.js');
 assert.match(css,/:root\[data-sh9-transit="on"\] #sh9AllVehiclesStatusV928\{/);
 assert.match(css,/clip-path:none!important/);
 assert.match(css,/position:static!important/);
 assert.match(ui,/0 ellenőrzött jármű ebben a térképrészben/);
 assert.match(ui,/if\(last\.features\.length>0\)/);
 assert.match(ui,/emit\('hh-sh9-all-live-refresh-v928'\)/);
 assert.match(live,/lastSh9WasEmpty&&bbox!==lastSh9Bbox/);
 assert.match(live,/Date\.now\(\)-lastSh9RequestAt>=8000/);
 assert.match(live,/Date\.now\(\)-lastSh9RequestAt<45000/);
 assert.match(live,/if\(sh9AllMode\)\{lastSh9RequestAt=Date\.now\(\);lastSh9Bbox=bbox;\}/);
 assert.doesNotMatch(ui,/watchPosition\(|getCurrentPosition\(|fetch\(/);
});

test('v931 all-BKK API passes only fresh signed per-trip delays, never guesses on-time',()=>{
 const ts=fs.readFileSync(path.join(root,'supabase/functions/hh-bkk-live-v793-preview/index.ts'),'utf8');
 assert.match(ts,/const vehicles=allMode\?chosen\.map/);
 assert.match(ts,/entry\.delaySeconds=p\.delaySeconds/);
 assert.match(ts,/entry\.delayObservedAt=p\.delayObservedAt/);
 assert.match(ts,/Number\.isInteger\(p\.delaySeconds\)/);
 assert.match(ts,/Date\.now\(\)-at<=90000/);
 assert.match(ts,/const update=updates\?\.trips\.get\(tripId\)/);
 assert.doesNotMatch(ts,/delaySeconds\|\|0/);
});
test('v931 shared live delay classifier is strictly green zero, amber early, red late, unknown fallback',()=>{
 const core=require('../guardian/bkk-smart-delay-v1.js');
 const now=Date.parse('2026-11-12T08:00:00Z'),stamp=new Date(now-1000).toISOString();
 assert.equal(core.classify(0,stamp,now).status,'ontime');
 assert.equal(core.classify(-120,stamp,now).status,'early');
 assert.equal(core.classify(-120,stamp,now).text,'+2p');
 assert.equal(core.classify(240,stamp,now).status,'late');
 assert.equal(core.classify(240,stamp,now).text,'−4p');
 assert.equal(core.classify(undefined,stamp,now).status,'unknown');
 assert.equal(core.classify(0,'2026-01-01T08:00:00Z',now).status,'unknown');
});
test('v931 in-map legend only in SH9, counts verified delays and leaves Family Guard hidden',()=>{
 const html=read('index.html'),css=read('guardian-sh9-all-bkk-v928.css'),
  js=read('guardian-sh9-all-bkk-v928.js');
 assert.match(html,/id="sh9BkkSmartDelayLegendV931"[^>]*hidden/);
 assert.match(html,/id="sh9BkkSmartDelayCoverageV931"/);
 assert.match(css,/:root:not\(\[data-sh9-transit="on"\]\) #sh9BkkSmartDelayLegendV931\{display:none!important\}/);
 assert.match(css,/:root\[data-sh9-transit="on"\] #sh9BkkSmartDelayLegendV931:not\(\[hidden\]\)/);
 assert.match(js,/if\(legend\)legend\.hidden=false/);
 assert.match(js,/delay\.classify\(v\.delaySeconds,v\.delayObservedAt\)/);
 assert.match(js,/verified\+\+/);
 assert.match(js,/ellenőrzött késésadat/);
 assert.doesNotMatch(js,/fetch\(|watchPosition\(|getCurrentPosition\(/);
});


test('v932 full map makes UNKNOWN delays visibly neutral and never green by default',()=>{
 const src=read('bkk-live-map-v793.js');
 const core=require('../guardian/bkk-smart-delay-v1.js');
 function simulate(query,delay,stamp){
  const win={location:{search:query},HH_BKK_SMART_DELAY_V1:core};
  vm.runInNewContext(src,{window:win,URLSearchParams,Date,Number});
  class El{
   constructor(){this.children=[];this.dataset={};this.attrs={};this.style={};this.hidden=false;}
   append(...nodes){this.children.push(...nodes)}
   appendChild(node){this.children.push(node)}
   setAttribute(k,v){this.attrs[k]=v}
  }
  const doc={createElement:()=>new El()};
  const car={id:'v1',mode:'bus',routeId:'260',lat:47.5,lng:19.01,
   ...(delay===undefined?{}:{delaySeconds:delay,delayObservedAt:stamp})};
  const node=win.HH_BKK_LIVE_MAP_V793.makeMarkerElement(doc,car);
  const badge=node.children[0].children[0];
  return {node,delta:badge.children.find(x=>x.className==='hh-bkk-smart-delay-v1')};
 }
 const fresh=new Date().toISOString();
 const unknown=simulate('?sh9Transit=1',undefined,undefined);
 assert.equal(unknown.delta.hidden,false);
 assert.equal(unknown.delta.dataset.delay,'unknown');
 assert.equal(unknown.delta.textContent,'—');
 assert.match(unknown.node.attrs['aria-label'],/késésadat nem elérhető/);
 const stale=simulate('?sh9Transit=1',0,'2020-01-01T00:00:00Z');
 assert.equal(stale.delta.dataset.delay,'unknown');
 assert.equal(stale.delta.textContent,'—');
 const exact=simulate('?sh9Transit=1',0,fresh);
 assert.equal(exact.delta.dataset.delay,'ontime');
 assert.equal(exact.delta.textContent,'0p');
 const early=simulate('?sh9Transit=1',-120,fresh);
 assert.equal(early.delta.dataset.delay,'early');
 assert.equal(early.delta.textContent,'+2p');
 const late=simulate('?sh9Transit=1',240,fresh);
 assert.equal(late.delta.dataset.delay,'late');
 assert.equal(late.delta.textContent,'−4p');
 const guardian=simulate('',undefined,undefined);
 assert.equal(guardian.delta.hidden,true);
});
test('v932 legend stays on-screen in fullscreen and labels GPS lamp separately',()=>{
 const css=read('guardian-sh9-all-bkk-v928.css');
 const glass=read('bkk-live-glass-v800.css');
 const marker=read('bkk-live-map-v793.js');
 const html=read('index.html');
 assert.match(css,/\.map-card\.hh-map-full-v819 #sh9BkkSmartDelayLegendV931:not\(\[hidden\]\)/);
 assert.match(css,/top:66px!important/);
 assert.match(css,/z-index:1200!important/);
 assert.match(glass,/data-delay="unknown"/);
 assert.match(marker,/a színes pont csak az élő járműpozíciót jelzi/);
 assert.match(html,/bkk-live-glass-v800\.css\?v=932-neutral-status/);
 assert.match(html,/guardian-sh9-all-bkk-v928\.css\?v=932-visible-map-status/);
 assert.match(html,/guardian-transit-v791\.js\?v=966-sh9-neutral-status/);
});
