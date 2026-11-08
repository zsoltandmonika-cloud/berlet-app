/* Nutrition v1148 · pure AI Scan -> Favorites draft mapper.
 * Does not persist, log, charge providers or touch the profile.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HH_NUTRITION_SCAN_FAVORITE_V1148=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
 const KEYS=['kcal','protein','carbs','fat'];
 const caps={kcal:5000,protein:500,carbs:1000,fat:500};
 const clean=(value,max)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
 function mapDraft(data,calculate){
  if(!data||typeof calculate!=='function'||!Array.isArray(data.items)||
   data.items.length<1||data.items.length>16)throw Error('Hiányos AI Scan eredmény.');
  const name=clean(data.name,80),meal=data.meal;
  if(name.length<2||!MEALS.includes(meal))throw Error('Érvénytelen ételnév vagy étkezés.');
  const unit=data.unit==='ml'?'ml':'g';
  for(const item of data.items){
   if(clean(item?.name,85).length<2||!Number.isFinite(item.grams)||
    item.grams<1||item.grams>3000)throw Error('Ellenőrizd az összetevők mennyiségét.');
  }
  const measured=calculate(data.items),nutrients={};
  for(const key of KEYS){
   const n=measured?.[key];
   if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>caps[key])
    throw Error('Hiányzó vagy érvénytelen '+key+' érték. Javítsd az AI Scan eredményét.');
   nutrients[key]=Math.round(n*10)/10;
  }
  const ingredients=data.items.map(x=>clean(x.name,85)+' · '+x.grams+' '+unit).join(', ').slice(0,2000);
  const details=clean(data.notes,115);
  return {
   name,meal,kind:unit==='ml'?'drink':'food',category:unit==='ml'?'Italok':'Főételek',
   nutrients,ingredients,
   description:clean('AI Scan · becsült adag'+(details?' · '+details:''),160),
   imageData:null
  };
 }
 return {mapDraft};
});
