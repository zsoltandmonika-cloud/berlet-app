/* Family Guard v1033 · manual MapTiler Satellite toggle, no polling/GPS.
 * Adds/removes a raster overlay on existing MapLibre style, NOT map.setStyle:
 * family/BKK/GPS markers, trails, 3D buildings and labels stay in place.
 * MapTiler key is never committed or saved in localStorage. One browser-tab
 * session only. Require MapTiler origin-restricted browser key.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id);
 const button=$('guardianSatelliteV1033');
 const card=button?.closest('.map-card');
 const dialog=$('guardianSatelliteConfigV1033');
 const field=$('guardianSatelliteKeyV1033');
 const ok=$('guardianSatelliteSaveV1033');
 const cancel=$('guardianSatelliteCancelV1033');
 const error=$('guardianSatelliteErrorV1033');
 const logo=$('guardianSatelliteLogoV1033');
 if(!button||!card||!dialog||!field||!ok||!cancel)return;
 const SOURCE='hh-guardian-satellite-tiles-v1033';
 const LAYER='hh-guardian-satellite-raster-v1033';
 const STORE='hh-maptiler-satellite-key-session-v1033';
 const DEVICE_STORE='hh-maptiler-browser-key-device-v1035';
 const REMEMBER='hh-maptiler-remember-device-v1035';
 const remember=$('guardianSatelliteRememberV1035');
 const forget=$('guardianSatelliteForgetV1035');
 const tileJsonUrl='https://api.maptiler.com/tiles/satellite-v2/tiles.json';
 let on=false,working=false,key=null,cachedMeta=null;
 const map=()=>w.HH_GUARDIAN_V761?.map||null;
 const msg=(s)=>{if(error)error.textContent=s||''};
 function kvalid(v){return /^[a-zA-Z0-9_-]{10,160}$/.test(v)}
 // The MapTiler browser key is public when used in raster URLs, not a
 // Supabase user token or password. Device storage is opt-in/explicit and is
 // safe only when the key is restricted to our GitHub Pages origin.
 try{
  const device=w.localStorage?.getItem(DEVICE_STORE);
  const fromSession=w.sessionStorage?.getItem(STORE);
  if(kvalid(device))key=device;
  else if(kvalid(fromSession))key=fromSession;
  if(remember)remember.checked=w.localStorage?.getItem(REMEMBER)!=='off';
 }catch(_){}
 function saveKey(value){
  try{
   if(remember?.checked!==false){
    w.localStorage?.setItem(DEVICE_STORE,value);
    w.localStorage?.setItem(REMEMBER,'on');
   }else{
    w.localStorage?.removeItem(DEVICE_STORE);
    w.localStorage?.setItem(REMEMBER,'off');
   }
  }catch(_){/* Private/incognito mode: still works in this tab. */}
  try{w.sessionStorage?.setItem(STORE,value)}catch(_){}
 }
 function forgetKey(){
  key=null;cachedMeta=null;
  try{w.localStorage?.removeItem(DEVICE_STORE)}catch(_){}
  try{w.sessionStorage?.removeItem(STORE)}catch(_){}
  field.value='';
  disable();
  msg('A mentett műholdkulcsot töröltük erről a készülékről.');
 }
 // Upgrade previously-used session keys without requesting another entry,
 // honoring the explicit request to remember the trusted browser device.
 if(key&&remember?.checked!==false)saveKey(key);
 function setVisual(value){
  on=!!value;
  button.setAttribute('aria-pressed',String(on));
  button.setAttribute('aria-label',on?'Műholdnézet kikapcsolása':'Műholdnézet bekapcsolása');
  card.dataset.hhSatellite=on?'on':'off';
  if(logo){
   if(on){
    const img=$('guardianSatelliteLogoImgV1033');
    if(img&&!img.getAttribute('src'))img.src=img.dataset.src;
   }
   logo.hidden=!on;
  }
 }
 function setBusy(value){
  working=!!value;button.disabled=working;ok.disabled=working;
  button.setAttribute('aria-busy',String(working));
 }
 function closeDialog(){
  try{if(dialog.open)dialog.close()}catch(_){dialog.removeAttribute('open')}
 }
 function showDialog(message){
  msg(message||'');field.value='';
  try{if(!dialog.open)dialog.showModal()}catch(_){dialog.setAttribute('open','')}
 }
 async function validateKey(value){
  // One small request on explicit user action only; use the returned TileJSON,
  // never request it again during this map session.
  const url=tileJsonUrl+'?key='+encodeURIComponent(value);
  const res=await w.fetch(url,{method:'GET',mode:'cors',cache:'default'});
  if(!res.ok)throw Error(res.status===403?'A kulcs hibás, vagy a domain nincs engedélyezve.':
    res.status===429?'Elérted a MapTiler lekérdezési korlátját.':'A műholdas térképszolgáltató nem elérhető (HTTP '+res.status+').');
  const meta=await res.json();
  if(!Array.isArray(meta.tiles)||!meta.tiles.length)throw Error('A műholdas térképréteg leírása hiányos.');
  return meta;
 }
 function ensureSource(m,meta,value){
  if(!m.getSource(SOURCE)){
   // Use MapTiler's official 512px raster endpoint with the one user-provided key.
   // A private provider key is never written to a repository or URL bar.
   const template='https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key='+encodeURIComponent(value);
   m.addSource(SOURCE,{
    type:'raster',tiles:[template],tileSize:512,minzoom:0,maxzoom:22,
    attribution:'<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">© MapTiler</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>'
   });
  }
  if(!m.getLayer(LAYER)){
   const layers=m.getStyle()?.layers||[];
   // Preserve 3D extrusion and street name labels above satellite imagery,
   // and the Family Guard route lines/marker overlays above that.
   const before=m.getLayer('guardian-buildings-3d')?'guardian-buildings-3d':
    (layers.find(l=>l.type==='symbol'&&l.id)?.id||
      layers.find(l=>/^guardian-route-/.test(l.id))?.id);
   m.addLayer({id:LAYER,type:'raster',source:SOURCE,layout:{visibility:'visible'},
    paint:{'raster-opacity':1,'raster-fade-duration':250}},before);
  }else m.setLayoutProperty(LAYER,'visibility','visible');
 }
 function activate(m,meta,value){
  ensureSource(m,meta,value);
  setVisual(true);
 }
 function disable(){
  const m=map();
  if(m?.getLayer?.(LAYER))m.setLayoutProperty(LAYER,'visibility','none');
  setVisual(false);
 }
 async function turnOn(value){
  if(working)return;
  const m=map();
  if(!m){showDialog('A Family Guard térkép még nem áll készen.');return}
  setBusy(true);
  try{
   const meta=cachedMeta&&value===key?cachedMeta:await validateKey(value);
   if(!m.isStyleLoaded?.()){
    // MapLibre may still be loading the initial street map. Do not alter it
    // until its style is ready; no background retries or repeated tile calls.
    await new Promise((resolve,reject)=>{
     const finish=()=>{m.off('load',finish);resolve()};
     m.on('load',finish);
     // If we missed the event while attaching, still finish immediately.
     if(m.isStyleLoaded?.())finish();
    });
   }
   ensureSource(m,meta,value);
   key=value;cachedMeta=meta;
   saveKey(value);
   setVisual(true);closeDialog();msg('');
  }catch(e){
   setVisual(false);
   showDialog(e?.message||'Nem sikerült betölteni a műholdas térképet.');
  }finally{setBusy(false)}
 }
 button.addEventListener('click',()=>{
  if(working)return;
  if(on){disable();return}
  if(!key){showDialog('Adj meg egy, a GitHub Pages domainre korlátozott MapTiler API-kulcsot.');return}
  void turnOn(key);
 });
 ok.addEventListener('click',()=>{
  const value=field.value.trim();
  if(!kvalid(value)){msg('Adj meg egy érvényes MapTiler böngészős API-kulcsot.');return}
  void turnOn(value);
 });
 field.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ok.click()}});
 if(forget)forget.addEventListener('click',forgetKey);
 if(remember)remember.addEventListener('change',()=>{
  if(remember.checked&&key)saveKey(key);
  if(!remember.checked){
   try{w.localStorage?.removeItem(DEVICE_STORE);w.localStorage?.setItem(REMEMBER,'off')}catch(_){}
  }
 });
 cancel.addEventListener('click',closeDialog);
 setVisual(false);
})(window,document);
