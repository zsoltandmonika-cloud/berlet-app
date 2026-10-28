/* SH9 MÁV Phase 2E · local-only, profile-separated Favorites PRO & Search History.
 * No network, analytics, Supabase, GPS or background timer. Preserve v1 favorites.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SH9_MAV_PERSONAL_V607=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const FAVORITES_MAX=30,HISTORY_MAX=10;
const station=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,120):'';
const label=value=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f<>]/g,'').slice(0,42):'';
const profile=id=>id==='m'?'monika':'zsolt';
const favoritesKey=id=>'sh9-mav-rail-favorites-v1-'+profile(id);
const historyKey=id=>'sh9-mav-rail-history-v1-'+profile(id);
const signature=p=>p.from.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu')+'|'+p.to.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu');
function favorite(raw){
 if(!raw||typeof raw!=='object')return null;
 const from=station(raw.from),to=station(raw.to);
 if(from.length<2||to.length<2||from.toLocaleLowerCase('hu')===to.toLocaleLowerCase('hu'))return null;
 return {from,to,label:label(raw.label)};
}
function historyItem(raw,now=Date.now()){
 const p=favorite(raw);if(!p)return null;
 const mode=['now','depart','arrive'].includes(raw.mode)?raw.mode:'now';
 const when=mode==='now'?'':typeof raw.when==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(raw.when)?raw.when:'';
 if(mode!=='now'&&!when)return null;
 const timestamp=Number(raw.timestamp);
 if(!Number.isFinite(timestamp)||timestamp<0||timestamp>now+86400000)return null;
 return {...p,mode,when,timestamp};
}
function read(storage,key){
 try{const raw=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(raw)?raw:[]}catch(_){return []}
}
function write(storage,key,items){
 try{storage.setItem(key,JSON.stringify(items));return true}catch(_){return false}
}
function loadFavorites(storage,id){
 const out=[],seen=new Set();
 for(const entry of read(storage,favoritesKey(id)).slice(0,80)){
  const p=favorite(entry);if(!p)continue;
  const k=signature(p);if(seen.has(k))continue;seen.add(k);out.push(p);
  if(out.length>=FAVORITES_MAX)break;
 }
 return out;
}
function saveFavorite(storage,id,raw){
 const p=favorite(raw);if(!p)return {ok:false,reason:'invalid'};
 const items=loadFavorites(storage,id),k=signature(p);
 if(items.some(x=>signature(x)===k))return {ok:false,reason:'duplicate'};
 if(items.length>=FAVORITES_MAX)return {ok:false,reason:'limit'};
 items.push(p);return {ok:write(storage,favoritesKey(id),items),items};
}
function moveFavorite(storage,id,index,shift){
 const arr=loadFavorites(storage,id),j=index+shift;
 if(!Number.isInteger(index)||![-1,1].includes(shift)||index<0||j<0||j>=arr.length)return false;
 [arr[index],arr[j]]=[arr[j],arr[index]];
 return write(storage,favoritesKey(id),arr);
}
function removeFavorite(storage,id,index){
 const arr=loadFavorites(storage,id);if(!Number.isInteger(index)||index<0||index>=arr.length)return false;
 arr.splice(index,1);return write(storage,favoritesKey(id),arr);
}
function renameFavorite(storage,id,index,value){
 const arr=loadFavorites(storage,id);
 if(!Number.isInteger(index)||index<0||index>=arr.length)return false;
 const name=label(value);if(!name)return false;
 arr[index]={...arr[index],label:name};
 return write(storage,favoritesKey(id),arr);
}
function loadHistory(storage,id,now=Date.now()){
 const out=[],seen=new Set();
 for(const raw of read(storage,historyKey(id)).slice(0,60)){
  const item=historyItem(raw,now);if(!item)continue;
  const k=signature(item)+'|'+item.mode+'|'+item.when;
  if(seen.has(k))continue;seen.add(k);out.push(item);
 }
 out.sort((a,b)=>b.timestamp-a.timestamp);
 return out.slice(0,HISTORY_MAX);
}
function recordSearch(storage,id,raw,now=Date.now()){
 const p=favorite(raw);if(!p)return false;
 const item=historyItem({...p,mode:raw.mode,when:raw.when,timestamp:now},now);
 if(!item)return false;
 const items=loadHistory(storage,id,now).filter(x=>!(
  signature(x)===signature(item)&&x.mode===item.mode&&x.when===item.when));
 items.unshift(item);
 return write(storage,historyKey(id),items.slice(0,HISTORY_MAX));
}
function removeHistory(storage,id,index){
 const items=loadHistory(storage,id);if(!Number.isInteger(index)||index<0||index>=items.length)return false;
 items.splice(index,1);return write(storage,historyKey(id),items);
}
function clearHistory(storage,id){return write(storage,historyKey(id),[])}
function mount(doc,win){
 const favorites=doc.getElementById('favlist'),hist=doc.getElementById('rail-history-list'),
  search=doc.getElementById('find'),save=doc.getElementById('favorite-add'),
  clear=doc.getElementById('rail-history-clear');
 const planner=win.SH9_MAV_PLANNER_V607;
 if(!favorites||!hist||!search||!save||!planner||!win.localStorage)return null;
 const storage=win.localStorage,active=()=>doc.documentElement.dataset.profile==='m'?'m':'z';
 const btn=(name,cls,callback,aria)=>{
  const b=doc.createElement('button');b.type='button';b.className=cls;b.textContent=name;
  if(aria)b.setAttribute('aria-label',aria);b.addEventListener('click',callback);return b;
 };
 function notify(message){planner.toast(message)}
 function closePanels(){for(const d of doc.querySelectorAll('.drawer'))d.classList.remove('open')}
 function loadRoute(p,rerun){
  planner.applyRoute(p);
  closePanels();
  if(rerun)search.click();
  else doc.getElementById('planner')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function renderFavorites(){
  const items=loadFavorites(storage,active());favorites.replaceChildren();
  if(!items.length){const empty=doc.createElement('p');empty.className='rail-personal-empty';empty.textContent='Még nincs kedvenc útvonal.';favorites.append(empty);return}
  items.forEach((p,i)=>{
   const box=doc.createElement('div');box.className='rail-personal-item';
   const headline=doc.createElement('div');headline.className='rail-personal-head';
   const title=p.label||p.from+' → '+p.to;
   const open=btn(title,'rail-favorite-choice',()=>loadRoute(p,false),'Kedvenc útvonal betöltése: '+title);
   headline.append(open);box.append(headline);
   if(p.label){const route=doc.createElement('span');route.className='rail-personal-caption';route.textContent=p.from+' → '+p.to;box.append(route)}
   const tools=doc.createElement('div');tools.className='rail-personal-tools';
   tools.append(
    btn('↑','rail-personal-tool',()=>{if(moveFavorite(storage,active(),i,-1))renderFavorites()},'Fel: '+title),
    btn('↓','rail-personal-tool',()=>{if(moveFavorite(storage,active(),i,1))renderFavorites()},'Le: '+title),
    btn('Átnevezés','rail-personal-tool',()=>showRename(),'Kedvenc átnevezése: '+title),
    btn('Törlés','rail-personal-tool rail-personal-delete',()=>{
     if(removeFavorite(storage,active(),i)){renderFavorites();notify('Kedvenc eltávolítva')}
    },'Kedvenc törlése: '+title)
   );
   if(i===0)tools.children[0].disabled=true;
   if(i===items.length-1)tools.children[1].disabled=true;
   box.append(tools);favorites.append(box);
   function showRename(){
    if(box.querySelector('.rail-personal-edit'))return;
    const edit=doc.createElement('div');edit.className='rail-personal-edit';
    const inp=doc.createElement('input');inp.type='text';inp.maxLength=42;inp.value=p.label||'';inp.placeholder='Kedvenc neve';
    inp.setAttribute('aria-label','Kedvenc új neve');
    const commit=()=>{
     if(renameFavorite(storage,active(),i,inp.value)){renderFavorites();notify('Kedvenc átnevezve')}
     else notify('Adj meg egy rövid nevet');
    };
    inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();commit()}});
    edit.append(inp,btn('Mentés','rail-personal-tool',commit),
     btn('Mégse','rail-personal-tool',()=>edit.remove()));
    box.append(edit);inp.focus();
   }
  });
 }
 function renderHistory(){
  hist.replaceChildren();
  const items=loadHistory(storage,active());
  if(clear)clear.disabled=!items.length;
  if(!items.length){const empty=doc.createElement('p');empty.className='rail-personal-empty';empty.textContent='Még nincs korábbi keresés.';hist.append(empty);return}
  items.forEach((p,i)=>{
   const item=doc.createElement('div');item.className='rail-personal-item';
   const title=p.from+' → '+p.to;
   const mode=p.mode==='arrive'?'Érkezés ekkor':p.mode==='depart'?'Indulás ekkor':'Indulás most';
   const rerun=btn(title,'rail-favorite-choice',()=>loadRoute(p,true),'Újrakeresés: '+title);
   const sub=doc.createElement('span');sub.className='rail-personal-caption';
   sub.textContent=mode+(p.when?' · '+p.when.slice(0,10)+' '+p.when.slice(11):'');
   const tools=doc.createElement('div');tools.className='rail-personal-tools';
   tools.append(btn('Újrakeresés','rail-personal-tool',()=>loadRoute(p,true),'Keresés újrafuttatása: '+title),
    btn('Törlés','rail-personal-tool rail-personal-delete',()=>{if(removeHistory(storage,active(),i))renderHistory()},'Előzmény törlése: '+title));
   item.append(rerun,sub,tools);hist.append(item);
  });
 }
 function render(){renderFavorites();renderHistory()}
 save.addEventListener('click',()=>{
  const outcome=saveFavorite(storage,active(),{from:doc.getElementById('from').value,to:doc.getElementById('to').value});
  if(outcome.ok){renderFavorites();notify('Kedvenc elmentve')}
  else notify(outcome.reason==='duplicate'?'Ez az útvonal már kedvenc':outcome.reason==='limit'?'Legfeljebb 30 kedvenc menthető':'Két különböző állomás szükséges');
 });
 search.addEventListener('click',()=>{
  const q=win.SH9_MAV_JOURNEYS_INSTANCE?.currentQuery();
  if(!q)return; // only valid accepted input, no fabricated timetable or navigation
  const when=q.mode==='now'?'':doc.getElementById('when').value;
  if(recordSearch(storage,active(),{from:q.from,to:q.to,mode:q.mode,when})){renderHistory()}
 });
 clear?.addEventListener('click',()=>{
  if(clearHistory(storage,active())){renderHistory();notify('Keresési előzmények törölve')}
 });
 render();
 return {render,loadFavorites:()=>loadFavorites(storage,active()),loadHistory:()=>loadHistory(storage,active())};
}
return Object.freeze({FAVORITES_MAX,HISTORY_MAX,favoritesKey,historyKey,favorite,historyItem,loadFavorites,saveFavorite,moveFavorite,removeFavorite,renameFavorite,loadHistory,recordSearch,removeHistory,clearHistory,mount});
});
if(typeof document!=='undefined'&&typeof window!=='undefined'&&window.SH9_MAV_PERSONAL_V607){
 window.SH9_MAV_PERSONAL_UI=window.SH9_MAV_PERSONAL_V607.mount(document,window);
}
