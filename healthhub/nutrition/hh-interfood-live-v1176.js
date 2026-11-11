/* HealthHub Nutrition · Interfood Live Smart Cards v1176
 * Zero manual input: public verified menu → one click → profile-private
 * Interfood Ételeim card. Logging consumption is a second explicit action.
 * No credential handling, no cross-origin DOM access, no PUTER, no nutrient invention.
 */
(function(root,doc){
'use strict';
const id=x=>doc?.getElementById(x);
const api=()=>root.HH_NUTRITION_QUICK_API;
const UI=()=>root.HH_INTERFOOD_DIARY_V1175;
const feedUrl='./interfood-live-feed-v1176.json?cache=1176';
const nutrients=['kcal','protein','carbs','fat'];
const nameForNumber=n=>n==null?'—':Number(n).toLocaleString('hu-HU',{maximumFractionDigits:1});
let items=[],menuMeta=null,busy=false,loading=null,initDone=false;
let query='',category='all',day='all';
const limit=600;

function validSourceURL(raw){
 try{
  const u=new URL(String(raw||''));
  if(u.protocol!=='https:'||!(u.hostname==='interfood.hu'||u.hostname.endsWith('.interfood.hu')))return null;
  return u.href;
 }catch(_){return null;}
}
function validPhotoURL(raw){
 const url=validSourceURL(raw);
 if(!url)return null;
 const u=new URL(url);
 return /\.(?:jpe?g|png|webp)$/i.test(u.pathname)?url:null;
}
function cleanFood(raw){
 if(!raw||typeof raw!=='object')return null;
 const name=String(raw.name||'').trim(),code=String(raw.code||'').trim().toUpperCase();
 if(name.length<2||name.length>100||!/^[A-Z0-9]{1,8}$/.test(code))return null;
 const nut={};
 for(const key of nutrients){
  const value=raw.nutrients?.[key];
  nut[key]=value==null||value===''?null:Number(value);
  if(nut[key]!=null&&(!Number.isFinite(nut[key])||nut[key]<0||nut[key]>(key==='kcal'?5000:1000)))return null;
 }
 const date=String(raw.menuDate||'');
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const grams=raw.weightGrams==null?null:Number(raw.weightGrams);
 const weightGrams=grams!=null&&Number.isFinite(grams)&&grams>=1&&grams<=3000?grams:null;
 return {id:String(raw.id||'').slice(0,120),name,code,category:String(raw.category||'Egyéb').slice(0,60),
  menuDate:date||null,week:Number(raw.week)||null,nutrients:nut,weightGrams,
  nutritionBasis:raw.nutritionBasis==='published-per-serving'?'published-per-serving':'not-published',
  imageUrl:validPhotoURL(raw.imageUrl),sourceUrl:validSourceURL(raw.sourceUrl)||'https://rendel.interfood.hu/'};
}
function validateFeed(json){
 if(json?.schemaVersion!=='healthhub.interfood.live/1'||
   !Array.isArray(json.items)||json.items.length<8||json.items.length>5000||
   !Number.isFinite(Date.parse(json.updatedAt)))throw Error('Az Interfood Live adatforrás nem ellenőrizhető.');
 const age=Date.now()-Date.parse(json.updatedAt);
 if(age< -7200000 || age>72*3600000)throw Error('Az Interfood Live frissítése elavult; nem töltök be régi étlapot.');
 const valid=json.items.map(cleanFood).filter(Boolean);
 const dedup=[...new Map(valid.map(x=>[String(x.menuDate||json.week||'')+':'+x.code+':'+x.name,x])).values()];
 if(dedup.length<8||dedup.filter(x=>x.nutrients.kcal!=null).length<3)
  throw Error('Hiányos Interfood étlap. A korábbi kártyák változatlanul megmaradnak.');
 return {items:dedup,meta:{updatedAt:json.updatedAt,week:Number(json.week)||null,
  selectedDate:json.selectedDate||null,count:dedup.length}};
}
function notify(msg,tone='info'){
 const status=id('hhIfLiveStatus1176');
 if(status){status.textContent=msg;status.dataset.tone=tone;}
}
function uniqueValue(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'hu'))}
function renderFilters(){
 const sel=id('hhIfLiveCategory1176'),dates=id('hhIfLiveDay1176');
 if(!sel||!dates)return;
 const cats=uniqueValue(items.map(x=>x.category));
 sel.replaceChildren();
 for(const [v,label] of [['all','Összes kategória'],...cats.map(x=>[x,x])]){
  const opt=doc.createElement('option');opt.value=v;opt.textContent=label;sel.append(opt);
 }
 sel.value=cats.includes(category)?category:'all';
 const days=uniqueValue(items.map(x=>x.menuDate));
 dates.replaceChildren();
 for(const [v,label] of [['all','Minden elérhető nap'],...days.map(x=>[x,x])]){
  const opt=doc.createElement('option');opt.value=v;opt.textContent=label;dates.append(opt);
 }
 dates.value=days.includes(day)?day:'all';
 dates.hidden=days.length<2;
}
function node(tag,className,text){
 const e=doc.createElement(tag);
 if(className)e.className=className;
 if(text!=null)e.textContent=text;
 return e;
}
function cardImage(item){
 const frame=node('span','hh-if-live-photo-v1176');
 const image=item.imageUrl;
 if(image){
  const img=doc.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';
  img.referrerPolicy='no-referrer';img.src=image;
  img.onerror=()=>{img.remove();frame.append(node('span','hh-if-live-fallback-v1176','🍱'));};
  frame.append(img);
 }else frame.append(node('span','hh-if-live-fallback-v1176','🍱'));
 return frame;
}
function render(){
 const host=id('hhIfLiveCards1176');
 if(!host)return;
 const filtered=items.filter(item=>(category==='all'||item.category===category)&&
  (day==='all'||item.menuDate===day)&&
  (!query||(item.name+' '+item.code+' '+item.category).toLocaleLowerCase('hu-HU').includes(query)));
 host.replaceChildren();
 id('hhIfLiveCount1176').textContent=filtered.length+' étel';
 if(!filtered.length){
  host.append(node('div','hh-if-live-empty-v1176','Nincs találat. A keresést vagy a kategóriát módosíthatod.'));
  return;
 }
 for(const item of filtered.slice(0,limit)){
  const button=node('button','hh-if-live-item-v1176');button.type='button';
  button.setAttribute('aria-label',item.name+' · automatikus ételkártya-mentés');
  button.append(cardImage(item));
  const body=node('span','hh-if-live-copy-v1176');
  body.append(node('small',null,item.code+' · '+item.category+(item.menuDate?' · '+item.menuDate:'')));
  body.append(node('strong',null,item.name));
  const info=node('small','hh-if-live-macros-v1176',
   nameForNumber(item.nutrients.kcal)+' kcal · F '+nameForNumber(item.nutrients.protein)+
   ' g · CH '+nameForNumber(item.nutrients.carbs)+' g · Zs '+nameForNumber(item.nutrients.fat)+' g');
  body.append(info);
  const foot=node('span','hh-if-live-quick-v1176',
   '✦ 1 kattintás · kártya mentése');
  body.append(foot);button.append(body);
  button.addEventListener('click',()=>importCard(item,button));
  host.append(button);
 }
}
function sourceKey(item){
 const year=(menuMeta?.updatedAt||'').slice(0,4);
 const slug=String(item.id||'').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').slice(0,120);
 return 'ifv1:'+year+':'+(Number(item.week)||0)+':'+slug;
}
function importCard(item,button){
 if(busy||!api()?.importInterfoodLiveCard)return;
 const owner=api().getProfile?.();
 if(owner!=='monika'&&owner!=='zsolt'){notify('Előbb válaszd ki a Nutrition profilt.','error');return;}
 busy=true;button.disabled=true;
 try{
  const result=api().importInterfoodLiveCard({expectedProfile:owner,item,sourceKey:sourceKey(item)});
  if(!result?.id||result.profile!==owner)throw Error('Az ételkártya mentése nem igazolható.');
  UI()?.refreshCards?.();
  const saved=id('hhIfCards1175');
  notify('✅ '+item.name+' · '+(result.duplicate?'már megvolt':'automatikusan mentve')+
   ' az Interfood ételeim közé. A Napi naplózás külön gombbal történik.','success');
  const toast=id('hhIfToast1175');if(toast){
   toast.hidden=false;toast.dataset.state='success';
   toast.textContent='✅ '+item.name+' · '+(result.duplicate?'már mentett ételkártya':'1 kattintással mentve!');
  }
  if(saved)root.requestAnimationFrame?.(()=>saved.scrollIntoView({behavior:'smooth',block:'start'}));
 }catch(err){
  notify('⚠ '+String(err?.message||err),'error');
 }finally{busy=false;button.disabled=false;}
}
async function fetchLive(force=false){
 if(loading)return loading;
 const page=id('hhInterfoodLibraryV1175');
 if(!page)return;
 if(items.length&&!force){render();return;}
 notify('Interfood Live étlap ellenőrzése…');
 loading=(async()=>{
  try{
   const url=feedUrl+(force?'&t='+Date.now():'');
   const response=await fetch(url,{credentials:'omit',cache:'no-cache'});
   if(!response.ok)throw Error('A Live étlap még nem érhető el ('+response.status+').');
   const json=await response.json();
   const parsed=validateFeed(json);
   items=parsed.items;menuMeta=parsed.meta;
   renderFilters();render();
   const stamp=new Date(parsed.meta.updatedAt);
   notify('✓ Interfood Live · '+parsed.meta.count+' étel · frissítve: '+
    stamp.toLocaleString('hu-HU',{timeZone:'Europe/Budapest',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}),'success');
  }catch(err){
   items=[];render();
   notify('⚠ Ellenőrzött Interfood Live étlap jelenleg nem érhető el. A mentett kártyák megmaradnak. '+String(err.message||err),'error');
  }finally{loading=null;}
 })();
 return loading;
}
function install(){
 if(initDone||!doc?.body)return;
 const page=id('hhInterfoodLibraryV1175'),tile=id('hhInterfoodTileV1173');
 if(!page||!tile)return;
 initDone=true;
 const area=node('section','hh-if-live-area-v1176');
 area.id='hhIfLiveArea1176';
 area.innerHTML='<div class="hh-if-live-heading-v1176"><div><small>✦ LÉNA SMART FOOD IMPORT</small><h2>Interfood Live étlap</h2><p>Ételválasztás = automatikus kártyamentés. Nincs gépelés, fotófeltöltés vagy Puter.</p></div><button type="button" id="hhIfLiveReload1176" title="Étlap frissítése" aria-label="Interfood Live étlap frissítése">↻</button></div><p id="hhIfLiveStatus1176" role="status" aria-live="polite"></p><div class="hh-if-live-filters-v1176"><input type="search" id="hhIfLiveSearch1176" placeholder="Étel vagy ételkód keresése…" aria-label="Interfood Live ételkereső"><select id="hhIfLiveCategory1176" aria-label="Interfood ételkategória"><option value="all">Összes kategória</option></select><select id="hhIfLiveDay1176" aria-label="Interfood nap" hidden><option value="all">Minden nap</option></select><span id="hhIfLiveCount1176"></span></div><div id="hhIfLiveCards1176" class="hh-if-live-list-v1176"></div><div class="hh-if-live-footer-v1176"><a href="https://rendel.interfood.hu/" target="_blank" rel="noopener noreferrer">Rendelés az Interfoodnál ↗</a><small>A tápérték és az adagsúly az Interfood forrásából származik. Ahol a hiteles ételfotó nem hozzáférhető, kép helyett jelölőikon látszik.</small></div>';
 const tools=page.querySelector('.hh-if-library-intro-v1175');
 if(tools?.parentNode)tools.parentNode.insertBefore(area,tools);
 else page.querySelector('.hh-if-library-inner-v1175')?.append(area);
 // Smart-first: no manual setup or blank-card creation in the normal flow.
 const manualNew=id('hhIfNew1175');
 if(manualNew){manualNew.hidden=true;manualNew.setAttribute('aria-hidden','true');}
 const savedHelp=tools?.querySelector('p');
 if(savedHelp)savedHelp.textContent=
  'Válassz fent egy ételt. Léna automatikusan kártyát készít és ide menti; '+
  'a Napi naplózás csak külön érintésre történik.';
 id('hhIfLiveSearch1176').addEventListener('input',ev=>{query=ev.target.value.trim().toLocaleLowerCase('hu-HU');render();});
 id('hhIfLiveCategory1176').addEventListener('change',ev=>{category=ev.target.value;render();});
 id('hhIfLiveDay1176').addEventListener('change',ev=>{day=ev.target.value;render();});
 id('hhIfLiveReload1176').addEventListener('click',()=>fetchLive(true));
 const original=UI()?.openLibrary;
 if(typeof original==='function'){
  // Replace the Premium card's navigation only while this module is healthy.
  // Keep the existing href as a no-JS and backend-unavailable fallback.
  tile.addEventListener('click',event=>{
   event.preventDefault();
   original();
   fetchLive();
   area.scrollIntoView?.({behavior:'smooth',block:'start'});
  });
  tile.setAttribute('aria-label','Interfood Live: intelligens ételválasztás és kártyamentés');
  // Separate saved-card entry still works, with the Live feed ready above it.
  id('hhInterfoodLogV1175')?.addEventListener('click',()=>fetchLive());
 }
}
if(doc){
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
}
root.HH_INTERFOOD_LIVE_V1176=Object.freeze({validateFeed,cleanFood,sourceKey,fetchLive,render});
if(typeof module!=='undefined'&&module.exports)module.exports={validateFeed,cleanFood,validPhotoURL};
})(typeof window!=='undefined'?window:{},typeof document!=='undefined'?document:null);
