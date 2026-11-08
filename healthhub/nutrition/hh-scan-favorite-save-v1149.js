/* HealthHub Nutrition v1149 · pure safety contract for standalone AI Scan -> Shared Favorites.
 * No storage, provider requests or journal entries from this module.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HH_NUTRITION_SCAN_FAVORITE_SAVE_V1149=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
 const KEYS=['kcal','protein','carbs','fat'];
 const clean=(value,max)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
 const key=value=>clean(value,85).normalize('NFKC').toLocaleLowerCase('hu-HU');
 function findExisting(items,name,kind){
  if(!Array.isArray(items))return null;
  return items.find(row=>!!row&&key(row.name)===key(name)&&
   (row.kind==='drink'?'drink':'food')===kind)||null;
 }
 function makePayload({name,meal,unit,items,nutrients,categories=[],notes=''}) {
  name=clean(name,85);
  const kind=unit==='ml'?'drink':'food';
  if(name.length<2||!MEALS.includes(meal)||!Array.isArray(items)||
   items.length<1||items.length>16)throw Error('Hiányos AI Scan eredmény.');
  const macros={};
  for(const k of KEYS){
   const v=nutrients?.[k],cap=k==='kcal'?5000:1000;
   if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>cap)
    throw Error('Hiányzó vagy hibás tápérték: '+k);
   macros[k]=Math.round(v*10)/10;
  }
  for(const item of items){
   if(clean(item?.name,85).length<2||!Number.isFinite(item.grams)||
    item.grams<1||item.grams>3000)
    throw Error('Ellenőrizd az összetevőket és az adagokat.');
  }
  const cats=[...new Set((Array.isArray(categories)?categories:[]).map(c=>clean(c,45)).filter(Boolean))].slice(0,12);
  return {
   name,kind,meal,categories:cats,favorite:true,
   nutrients:macros,
   ingredients:items.map(x=>clean(x.name,85)+' · '+x.grams+' '+(unit==='ml'?'ml':'g')).join(', ').slice(0,2000),
   notes:clean(notes,450),description:'AI Scan · ellenőrzött, becsült adag'
  };
 }
 function fingerprint(data){
  const {name,meal,unit,items,nutrients}=data||{};
  return JSON.stringify([key(name),meal,unit,items,nutrients]);
 }
 return {findExisting,makePayload,fingerprint};
});
