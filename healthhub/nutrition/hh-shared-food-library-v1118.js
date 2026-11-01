/* Nutrition v1118 · Shared household food library.
 * One Dropbox document and shared JPEG vault. Never read or write profile diaries.
 * Sync uses Dropbox revisions; failed remote writes never show as cloud success.
 */
(function(root){
'use strict';
const KEY='hh-nutrition-shared-food-library-v1118',SCHEMA='healthhub.nutrition.shared-foods/1';
const cloud=()=>root.HH_NUTRITION_CLOUD_V626;
const now=()=>new Date().toISOString();
const fresh=()=>({schemaVersion:SCHEMA,updatedAt:'1970-01-01T00:00:00Z',items:{}});
const cleanText=(v,max=85)=>String(v||'').trim().replace(/\s+/g,' ').slice(0,max);
const validId=id=>typeof id==='string'&&/^f-[a-z0-9-]{8,70}$/.test(id);
function normalize(data){
 const out=fresh();
 if(!data||data.schemaVersion!==SCHEMA||!data.items||typeof data.items!=='object'||Array.isArray(data.items))return out;
 out.updatedAt=cleanText(data.updatedAt,45)||out.updatedAt;
 for(const [id,r] of Object.entries(data.items).slice(0,2000)){
  if(!validId(id)||!r||typeof r!=='object')continue;
  const name=cleanText(r.name),cats=[...new Set((Array.isArray(r.categories)?r.categories:[]).map(x=>cleanText(x,45)).filter(Boolean))].slice(0,12);
  if(name.length<2||(!cats.length&&!r.favorite))continue;
  const nutrients={};let valid=true;
  for(const k of ['kcal','protein','carbs','fat']){
   const n=Number(r.nutrients?.[k]);
   if(!Number.isFinite(n)||n<0||n>(k==='kcal'?5000:1000)){valid=false;break}
   nutrients[k]=Math.round(n*10)/10;
  }
  if(!valid)continue;
  const imageRef=cloud()?.checkImageRef&&r.imageRef?(()=>{try{cloud().checkImageRef('shared',r.imageRef);return r.imageRef}catch(_){return null}})():null;
  out.items[id]={id,name,categories:cats,favorite:!!r.favorite,kind:r.kind==='drink'?'drink':'food',
   meal:cleanText(r.meal,35)||'Ebéd',nutrients,ingredients:cleanText(r.ingredients,2000),imageRef,
   notes:cleanText(r.notes,450),createdAt:cleanText(r.createdAt,45),updatedAt:cleanText(r.updatedAt,45)};
 }
 return out;
}
function cache(data){
 const next=normalize(data);
 try{root.localStorage.setItem(KEY,JSON.stringify(next))}catch(_){}
 root.dispatchEvent?.(new CustomEvent('healthhub:shared-foods-updated',{detail:{count:Object.keys(next.items).length}}));
 return next;
}
let current=fresh(),loading=null;
try{current=normalize(JSON.parse(root.localStorage.getItem(KEY)||'null'))}catch(_){}
function items(){return Object.values(current.items).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))}
async function load(force=false){
 if(loading)return loading;
 if(!force&&Object.keys(current.items).length)return items();
 if(!cloud()?.connected())return items();
 loading=(async()=>{const remote=await cloud().downloadSharedFoods();current=cache(remote.data||fresh());return items()})();
 try{return await loading}finally{loading=null}
}
function newId(){
 const uid=root.crypto?.randomUUID?.().toLowerCase()||String(Date.now())+'-'+Math.random().toString(36).slice(2);
 return 'f-'+uid.replace(/[^a-z0-9-]/g,'').slice(0,65);
}
async function upsert(input){
 if(!cloud()?.connected())throw Error('A közös mentéshez Dropbox-kapcsolat szükséges.');
 if(!input||typeof input!=='object')throw Error('Hiányzó ételadat');
 const id=validId(input.id)?input.id:newId();
 const trial=normalize({schemaVersion:SCHEMA,items:{[id]:{...input,id}}});
 const row=trial.items[id];
 if(!row)throw Error('Ellenőrizd az étel nevét, kategóriáját és tápértékét.');
 for(let attempt=0;attempt<4;attempt++){
  const remote=await cloud().downloadSharedFoods();
  const data=normalize(remote.data||fresh());
  row.createdAt=data.items[id]?.createdAt||now();row.updatedAt=now();
  data.items[id]={...row};data.updatedAt=now();
  try{
   await cloud().uploadSharedFoods(data,remote.rev);
   current=cache(data);
   return {...row};
  }catch(e){if(e.status===409&&attempt<3)continue;throw e}
 }
 throw Error('Két egyidejű mentés ütközött, próbáld újra.');
}
/* Optional Puter Recepttár publication. Separate provider: never report success without readback. */
async function publishRecipeStudio(item,photoBlob){
 const puter=root.puter;
 if(!puter?.auth||!puter?.fs?.write||!puter?.kv?.set||!puter?.kv?.get)
  throw Error('A Recepttár Puter szolgáltatása ezen a képernyőn nem érhető el.');
 if(!puter.auth.isSignedIn())await puter.auth.signIn();
 if(!puter.auth.isSignedIn())throw Error('A Recepttár Puter-bejelentkezése hiányzik.');
 if(!photoBlob||!photoBlob.size)throw Error('A Recepttárhoz ételfotó szükséges.');
 const rid='scan-'+item.id;
 const cardPath='lena-recepttar/'+rid+'/card.jpg';
 await puter.fs.write(cardPath,photoBlob,{createMissingParents:true,overwrite:true});
 const value={id:rid,title:item.name,category:item.categories[0]||'Ételek',cardPath,
  originalName:item.name+'.jpg',createdAt:Date.now(),updatedAt:now(),sharedFoodId:item.id,
  readable:{status:'unprocessed',ingredients:[],steps:[],notes:[]}};
 await puter.kv.set('lena:recipe:'+rid,value);
 const check=await puter.kv.get('lena:recipe:'+rid);
 if(!check||check.id!==rid||check.title!==item.name)throw Error('A Puter mentés ellenőrzése sikertelen.');
 return {id:rid,category:value.category};
}
root.HH_SHARED_FOOD_LIBRARY_V1118=Object.freeze({version:'1118',getItems:items,load,upsert,publishRecipeStudio,normalize});
})(window);
