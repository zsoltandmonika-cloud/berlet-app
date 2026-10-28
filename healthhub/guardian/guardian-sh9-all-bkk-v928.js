/* SH9 Smart Travel v928 · viewport-clustered ALL BKK mode.
   Reuse ONE existing Family Guard MapLibre instance and validated BKK snapshots.
   No own network requests, timers, location reads, Supabase client or extra map.
*/
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document)api.init(root,root.document);
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const ID='hh-sh9-all-bkk-v928',MAX=3500,AGE=90000;
const ROUTE=/^(?:bus|tram|trolley|metro|hev|other):[A-Za-z0-9_-]{1,16}$/;
const MODE_HU={bus:'Busz',tram:'Villamos',trolley:'Trolibusz',metro:'Metró',hev:'HÉV',other:'Járat'};
const EMPTY={type:'FeatureCollection',features:[]};
function fromVerified(detail,now=Date.now()){
 if(!detail||!Number.isFinite(now)||!Array.isArray(detail.vehicles)||detail.vehicles.length>MAX)return null;
 const stamp=Date.parse(detail.generatedAt);
 if(!Number.isFinite(stamp)||stamp>now+10000||now-stamp>AGE)return null;
 const seen=new Set(),features=[];
 for(const v of detail.vehicles){
  if(!v||typeof v.id!=='string'||!v.id||v.id.length>128||seen.has(v.id)||
   typeof v.routeId!=='string'||v.routeId.length>16||typeof v.routeKey!=='string'||!ROUTE.test(v.routeKey)||
   v.routeKey.split(':')[1]!==v.routeId||v.mode!==v.routeKey.split(':')[0]||
   !Number.isFinite(v.lat)||!Number.isFinite(v.lng)||Math.abs(v.lat)>90||Math.abs(v.lng)>180)continue;
  const ts=Date.parse(v.timestamp);
  if(!Number.isFinite(ts)||ts>now+10000||now-ts>AGE)continue;
  seen.add(v.id);
  features.push({type:'Feature',properties:{
   id:v.id,route:v.routeId,mode:v.mode,timestamp:v.timestamp
  },geometry:{type:'Point',coordinates:[v.lng,v.lat]}});
 }
 return {type:'FeatureCollection',features};
}
function init(w,d){
 if(new URLSearchParams(w.location.search).get('sh9Transit')!=='1')return;
 let enabled=true,last=null,truncated=false,map=null,attached=false,lastAt=null,clickBound=false;
 const $=id=>d.getElementById(id),toggle=$('sh9AllVehiclesToggleV928'),refresh=$('sh9AllVehiclesRefreshV928'),status=$('sh9AllVehiclesStatusV928');
 if(!toggle||!refresh||!status)return;
 const mapApi=()=>w.HH_GUARDIAN_V761?.map||null;
 const message=s=>{status.textContent=s};
 function applyData(){
  if(!map?.getSource?.(ID))return;
  map.getSource(ID).setData(enabled&&last?last:EMPTY);
 }
 function install(){
  const active=mapApi();
  if(!active||typeof active.getSource!=='function')return false;
  if(active!==map){map=active;attached=false;clickBound=false}
  if(!map.isStyleLoaded?.())return false;
  try{
   if(!map.getSource(ID))map.addSource(ID,{type:'geojson',data:EMPTY,cluster:true,clusterRadius:48,clusterMaxZoom:14});
   if(!map.getLayer(ID+'-clusters'))map.addLayer({
    id:ID+'-clusters',type:'circle',source:ID,filter:['has','point_count'],
    paint:{'circle-color':'#264f7d','circle-opacity':.92,'circle-radius':['step',['get','point_count'],20,20,26,70,33],
     'circle-stroke-color':'#c5e9ff','circle-stroke-width':2}
   });
   if(!map.getLayer(ID+'-count'))map.addLayer({
    id:ID+'-count',type:'symbol',source:ID,filter:['has','point_count'],
    layout:{'text-field':['get','point_count_abbreviated'],'text-size':14,'text-font':['Open Sans Bold','Arial Unicode MS Bold'],'text-allow-overlap':true},
    paint:{'text-color':'#ffffff'}
   });
   if(!map.getLayer(ID+'-vehicles'))map.addLayer({
    id:ID+'-vehicles',type:'circle',source:ID,filter:['!',['has','point_count']],
    paint:{'circle-color':['match',['get','mode'],'tram','#e7b523','hev','#269f76','trolley','#e6525c','metro','#b64a82','bus','#178de3','#568ac0'],
      'circle-radius':16,'circle-opacity':.94,'circle-stroke-width':2,'circle-stroke-color':'#fff'}
   });
   if(!map.getLayer(ID+'-route'))map.addLayer({
    id:ID+'-route',type:'symbol',source:ID,filter:['!',['has','point_count']],
    layout:{'text-field':['get','route'],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],'text-size':12,
      'text-allow-overlap':true,'text-ignore-placement':true},
    paint:{'text-color':'#fff','text-halo-color':'#153759','text-halo-width':.55}
   });
   applyData();
   if(!clickBound&&typeof map.on==='function'){
    map.on('click',ID+'-clusters',e=>{
     const feat=e?.features?.[0];const point=feat?.geometry?.coordinates;
     if(!point||!Array.isArray(point)||point.length!==2)return;
     const source=map.getSource(ID);if(!source)return;
     const cluster=feat.properties?.cluster_id;
     if(cluster==null)return;
     const follow=(_err,zoom)=>{
      if(_err||!Number.isFinite(zoom))return;
      map.easeTo?.({center:point,zoom,duration:450});
     };
     try{
      const result=source.getClusterExpansionZoom(cluster,follow);
      if(result?.then)result.then(zoom=>follow(null,zoom)).catch(()=>{});
     }catch(_){}
    });
    map.on('click',ID+'-vehicles',e=>{
     const feat=e?.features?.[0];if(!feat||!w.maplibregl?.Popup)return;
     const p=feat.properties||{},point=feat.geometry?.coordinates;
     if(!Array.isArray(point)||point.length!==2)return;
     const card=d.createElement('div');card.className='sh9-bkk-popup-v928';
     const strong=d.createElement('strong');strong.textContent=String(p.route||'BKK-járat').slice(0,16);
     const meta=d.createElement('span');meta.textContent=MODE_HU[String(p.mode)]||'Jármű';
     const note=d.createElement('small');note.textContent='Hivatalos GTFS-RT járműpozíció · nem érkezési becslés';
     card.append(strong,meta,note);
     new w.maplibregl.Popup({closeButton:true,maxWidth:'210px'}).setLngLat(point).setDOMContent(card).addTo(map);
    });
    clickBound=true;
   }
   return true;
  }catch(_){message('A térképréteg jelenleg nem tölthető be.');return false}
 }
 function syncToggle(){
  toggle.setAttribute('aria-pressed',String(enabled));
  toggle.textContent=enabled?'🟢 Összes BKK-jármű: BE':'⚪ Összes BKK-jármű: KI';
  refresh.disabled=!enabled;
 }
 function showCount(){
  if(!enabled){message('Az összes jármű megjelenítése és frissítése kikapcsolva.');return}
  if(!last){message('A kiválasztott térképrész friss BKK-adataira várunk.');return}
  const at=lastAt?new Date(lastAt).toLocaleTimeString('hu-HU'):'—';
  message(last.features.length+' ellenőrzött jármű a lekért térképrészben · '+at+
   (truncated?' · a kiszolgáló részleges választ adott':'')+
   ' · új térképrészhez koppints a Frissítés gombra');
 }
 function emit(type,detail){
  if(typeof w.CustomEvent==='function')w.dispatchEvent(new w.CustomEvent(type,{detail}));
 }
 function start(){
  if(!install()){
   const active=mapApi();
   active?.once?.('load',()=>{install();applyData()});
  }
 }
 toggle.addEventListener('click',()=>{
  enabled=!enabled;syncToggle();
  if(!enabled){last=null;truncated=false;lastAt=null;applyData();showCount()}
  else {start();showCount()}
  emit('hh-sh9-all-live-enabled-v928',{enabled});
 });
 refresh.addEventListener('click',()=>{
  if(!enabled)return;
  message('A látható térképrész friss járműadatait kérjük…');
  emit('hh-sh9-all-live-refresh-v928');
 });
 w.addEventListener('hh-sh9-all-live-v928',e=>{
  if(!enabled||d.hidden)return;
  const data=fromVerified(e.detail);
  if(!data){last=null;applyData();message('Nem kaptunk ellenőrizhető, friss BKK-járműadatot.');return}
  last=data;lastAt=e.detail.generatedAt;truncated=e.detail.truncated===true;
  start();applyData();showCount();
 });
 w.addEventListener('hh-sh9-all-live-clear-v928',()=>{
  last=null;truncated=false;lastAt=null;applyData();
  if(enabled)message('Járműadatok szünetelnek, vagy új frissítés szükséges.');
 });
 w.addEventListener('pagehide',()=>{last=null;applyData()});
 const active=mapApi();
 active?.on?.('style.load',()=>{install();applyData()});
 active?.on?.('moveend',()=>{
  if(enabled&&last)message('A térkép elmozdult · az új területhez koppints a Frissítés gombra.');
 });
 syncToggle();start();showCount();
}
return {fromVerified,init,ID};
});