/* HealthHub Smart Arrival v801: source-verified full BKK line search + per-profile favorites.
 * Discovery is NOT a promise of live tracking on routes beyond 260, 17 and 19.
 * Personal favorites are stored locally on this device, not uploaded or shared.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_BKK_CATALOG_V801=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const SOURCE='BKK Zrt., CC BY 4.0';
 const STORE='hh-bkk-route-favorites-v801';
 const MODES=new Set(['bus','tram','trolley','metro','hev','rail','other']);
 const FEATURED=new Set(['bus:260','tram:17','tram:19']);
 const knownKey=id=>id==='260'?'bus:260':id==='17'?'tram:17':id==='19'?'tram:19':null;
 const keyOf=route=>route.mode+':'+route.id;
 function normalizedKey(value){
  if(typeof value!=='string'||value.length>40)return null;
  if(/^(bus|tram|trolley|metro|hev|rail|other):[^:]+$/.test(value))return value;
  return knownKey(value);
 }
 const PAGE_SIZE=18;
 const $=id=>w&&w.document&&w.document.getElementById(id);
 let routes=[],profile='zsolt',mode='all',query='',shown=PAGE_SIZE,loaded=false;
 let favorites={zsolt:['bus:260'],monika:['bus:260']};
 function scrub(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU').trim()}
 function validate(doc){
  if(!doc||doc.schemaVersion!==1||doc.source!==SOURCE||!Array.isArray(doc.routes)||doc.routes.length<3||doc.routes.length>3000)return null;
  const generated=Date.parse(doc.generatedAt);
  if(!Number.isFinite(generated)||generated>Date.now()+60000||Date.now()-generated>45*86400000)return null;
  const seen=new Set(),clean=[];
  for(const route of doc.routes){
   if(!route||typeof route.id!=='string'||!route.id||route.id.length>16||
      !MODES.has(route.mode)||!Array.isArray(route.gtfsRouteIds)||!route.gtfsRouteIds.length)continue;
   const uid=route.mode+':'+route.id;
   if(seen.has(uid))continue;
   seen.add(uid);
   clean.push({id:route.id,mode:route.mode,name:String(route.name||'').slice(0,120),
    directions:Array.isArray(route.directions)?route.directions.filter(x=>typeof x==='string').slice(0,10):[]});
  }
  if(!['260','17','19'].every(id=>clean.some(r=>r.id===id)))return null;
  return {routes:clean,generatedAt:doc.generatedAt};
 }
 function search(lines,term,filter='all'){
  const q=scrub(term);
  return lines.filter(r=>(filter==='all'||r.mode===filter) &&
   (!q||scrub(r.id+' '+r.name+' '+r.directions.join(' ')).includes(q)));
 }
 function readPrefs(){
  try{
   const saved=JSON.parse(w.localStorage.getItem(STORE)||'null');
   if(saved){
    for(const p of ['zsolt','monika'])
     if(Array.isArray(saved[p]))
      favorites[p]=[...new Set(saved[p].map(normalizedKey).filter(Boolean))].slice(0,150);
   }else{
    // One-time migration: retain existing choices from the earlier three-line selector.
    const original=JSON.parse(w.localStorage.getItem('hh-guardian-transit-selected-profiles-v801')||'null');
    if(original)for(const p of ['zsolt','monika'])
     if(Array.isArray(original[p]))favorites[p]=original[p].map(knownKey).filter(Boolean);
   }
  }catch(_){}
 }
 function savePrefs(){
  try{w.localStorage.setItem(STORE,JSON.stringify(favorites))}catch(_){}
 }
 function pickProfile(){
  const field=$('hhTransitProfileV791');
  return field&&field.value==='monika'?'monika':field&&field.value==='zsolt'?'zsolt':
   w.localStorage&&w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
 }
 function updateCore(key,value){
  if(!FEATURED.has(key))return;
  const core=w.HH_GUARDIAN_TRANSIT_V790;
  if(core&&typeof core.toggleLine==='function')core.toggleLine(key.split(':')[1],value);
 }
 function onTrackedChange(id,enabled){
  const key=knownKey(id);
  if(!key)return;
  const set=new Set(favorites[profile]);
  if(enabled)set.add(key);else set.delete(key);
  favorites[profile]=[...set];savePrefs();
  if(loaded)render();
 }
 function toggleFavorite(routeId,routeMode){
  const key=routeMode+':'+routeId;
  const set=new Set(favorites[profile]);
  const enabled=!set.has(key);
  if(enabled)set.add(key);else set.delete(key);
  favorites[profile]=[...set].slice(0,150);savePrefs();
  updateCore(key,enabled);
  render();
 }
 function setProfile(next){
  if(next!=='zsolt'&&next!=='monika')return;
  profile=next;render();
 }
 function render(){
  const host=$('hhBkkCatalogResultsV801'),counter=$('hhBkkCatalogMetaV801');
  if(!host||!w.document)return;
  host.replaceChildren();
  const searched=search(routes,query,mode);
  const preferred=favorites[profile];
  const list=!query&&mode==='all'?[...searched].sort((a,b)=>
   Number(preferred.includes(keyOf(b)))-Number(preferred.includes(keyOf(a)))):searched;
  const modeNames={bus:'Busz',tram:'Villamos',trolley:'Troli',metro:'Metró',hev:'HÉV',rail:'Vasút',other:'Egyéb'};
  for(const route of list.slice(0,shown)){
   const article=w.document.createElement('article');article.className='hh-bkk-catalog-row-v801';
   const badge=w.document.createElement('span');
   badge.className='hh-bkk-catalog-number-v801 hh-bkk-mode-'+route.mode;
   badge.textContent=route.id;
   const copy=w.document.createElement('div');copy.className='hh-bkk-catalog-copy-v801';
   const title=w.document.createElement('strong');
   title.textContent=modeNames[route.mode]||'Járat';
   const detail=w.document.createElement('small');
   detail.textContent=route.directions.length?route.directions.slice(0,2).join(' ↔ '):route.name||'BKK menetrendi járat';
   const scope=w.document.createElement('span');scope.className='hh-bkk-catalog-scope-v801';
   scope.textContent=FEATURED.has(keyOf(route))?'Élő térkép + kedvenc':'Kedvenc · térképes bővítés később';
   copy.append(title,detail,scope);
   const btn=w.document.createElement('button');btn.type='button';
   const selected=preferred.includes(keyOf(route));
   btn.className='hh-bkk-catalog-star-v801';
   btn.setAttribute('aria-pressed',String(selected));
   btn.setAttribute('aria-label',(selected?'Eltávolítás a kedvencekből: ':'Kedvencekhez adás: ')+route.id);
   btn.textContent=selected?'★':'☆';
   btn.addEventListener('click',()=>toggleFavorite(route.id,route.mode));
   article.append(badge,copy,btn);host.append(article);
  }
  if(counter)counter.textContent=!loaded?'A hivatalos BKK-járatlista betöltése…':
   list.length+' találat · '+favorites[profile].length+' kedvenc · '+(profile==='zsolt'?'Zsolt':'Mónika');
  const more=$('hhBkkCatalogMoreV801');
  if(more){more.hidden=list.length<=shown;more.disabled=!loaded;}
  const empty=$('hhBkkCatalogEmptyV801');
  if(empty)empty.hidden=list.length>0||!loaded;
  if(w.document.querySelectorAll)
   for(const btn of w.document.querySelectorAll('[data-hh-bkk-catalog-mode]'))
    btn.setAttribute('aria-pressed',String(btn.getAttribute('data-hh-bkk-catalog-mode')===mode));
 }
 async function load(){
  const urls=[
   new URL('./bkk-catalog-v801.json',w.location.href).href,
   'https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-catalog-v801.json'
  ];
  for(const url of urls){
   try{
    const res=await w.fetch(url,{cache:'no-cache'});
    if(!res.ok)continue;
    const result=validate(await res.json());
    if(result){routes=result.routes;loaded=true;render();return}
   }catch(_){}
  }
  const meta=$('hhBkkCatalogMetaV801');
  if(meta)meta.textContent='A hiteles BKK-járatlista jelenleg nem érhető el. Kedvenceket csak betöltött járatlistából lehet választani.';
 }
 function init(){
  if(!$('hhBkkCatalogV801')||!w.fetch||!w.document)return;
  readPrefs();profile=pickProfile();render();
  const searchBox=$('hhBkkCatalogSearchV801');
  if(searchBox)searchBox.addEventListener('input',()=>{
   query=String(searchBox.value||'').slice(0,80);shown=PAGE_SIZE;render();
  });
  if(w.document.querySelectorAll)
   for(const btn of w.document.querySelectorAll('[data-hh-bkk-catalog-mode]'))
    btn.addEventListener('click',()=>{
     mode=btn.getAttribute('data-hh-bkk-catalog-mode')||'all';shown=PAGE_SIZE;render();
    });
  const more=$('hhBkkCatalogMoreV801');
  if(more)more.addEventListener('click',()=>{shown+=PAGE_SIZE;render()});
  const profileSelect=$('hhTransitProfileV791');
  if(profileSelect)profileSelect.addEventListener('change',()=>{profile=pickProfile();render()});
  if(w.addEventListener)w.addEventListener('storage',e=>{
   if(e.key==='hh-profile'){profile=pickProfile();render()}
   if(e.key===STORE){readPrefs();render()}
  });
  load();
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {validate,search,setProfile,onTrackedChange,keyOf,get favoriteIds(){return [...favorites[profile]]},version:'801.1'};
});
