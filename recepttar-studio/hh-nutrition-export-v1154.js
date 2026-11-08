/* v1154 · Single-tap Léna Recept Stúdió → HealthHub diary handoff.
 * Only enabled by the explicit Étel > Léna Cookbook navigation query.
 * Never writes diary records in the Studio or calls AI during selection.
 */
(function(w,d){
'use strict';
const params=new URLSearchParams(w.location.search);
const importMode=params.get('hhNutritionImport')==='1';
// The regular editor also exposes a clear diary button on the recipe detail.
// The homepage card-click interception remains exclusive to importMode.
const profileFromStore=()=>{
 try{
  const raw=w.localStorage.getItem('hh-profile')||w.localStorage.getItem('hh-nutrition-PREVIEW-profile');
  return raw==='m'||raw==='monika'?'monika':raw==='z'||raw==='zsolt'?'zsolt':null;
 }catch(_){return null}
};
const profile=['zsolt','monika'].includes(params.get('profile'))?params.get('profile'):profileFromStore();
const MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
const meal=MEALS.includes(params.get('meal'))?params.get('meal'):null;
const storageKey='hh:recipe-studio:handoff:v1154';
let busy=false;
function notice(message,error=false){
 let el=d.getElementById('hhRecipeImportStatusV1154');
 if(!el){
  el=d.createElement('div');
  el.id='hhRecipeImportStatusV1154';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.style.cssText='margin:8px 14px 13px;padding:12px 15px;border:1px solid #83e4d388;border-radius:15px;background:linear-gradient(125deg,#153b4c,#14283b);color:#e9fff6;font:700 13px/1.45 system-ui;box-shadow:0 8px 18px #0006';
  const anchor=d.querySelector('header.app-header');
  if(anchor)anchor.insertAdjacentElement('afterend',el);else d.body.prepend(el);
  el.style.position='relative';el.style.zIndex='17';
 }
 el.style.borderColor=error?'#f5a6b0aa':'#83e4d388';
 el.textContent=message;
}
if(importMode){
 d.body.dataset.hhCookbookImport='1';
 notice('🥗 Napi naplóba mentés · Kattints egyszer a kiválasztott receptre. Alapadag: 320 g · '+(profile==='monika'?'Mónika':profile==='zsolt'?'Zsolt':'Profil kiválasztása szükséges')+'.');
}
async function jpegData(blob){
 if(!blob)return null;
 if(!/^image\/(?:jpeg|png|webp|svg\+xml)$/i.test(blob.type||''))return null;
 if(blob.size>15*1024*1024)throw Error('A recept képe túl nagy az átvitelhez.');
 return new Promise((resolve,reject)=>{
  const uri=URL.createObjectURL(blob),img=new Image();
  let completed=false;
  const finish=(value,error)=>{
   if(completed)return;completed=true;URL.revokeObjectURL(uri);
   error?reject(error):resolve(value);
  };
  img.onload=()=>{
   try{
    const dimension=Math.max(img.naturalWidth,img.naturalHeight);
    if(!dimension)throw Error('A képfájl nem olvasható.');
    let value='';
    for(const edge of [560,440,340]){
     const ratio=Math.min(1,edge/dimension);
     const c=d.createElement('canvas');
     c.width=Math.max(1,Math.round(img.naturalWidth*ratio));
     c.height=Math.max(1,Math.round(img.naturalHeight*ratio));
     const ctx=c.getContext('2d');if(!ctx)throw Error('Képkonvertálás nem támogatott.');
     ctx.fillStyle='#f3f5f5';ctx.fillRect(0,0,c.width,c.height);
     ctx.drawImage(img,0,0,c.width,c.height);
     value=c.toDataURL('image/jpeg',edge===560?.74:edge===440?.68:.60);
     const approxBytes=(value.length-'data:image/jpeg;base64,'.length)*.75;
     if(approxBytes<650000)break;
    }
    if(!/^data:image\/jpeg;base64,/.test(value)||value.length>875000)throw Error('A receptfotó túl nagy.');
    finish(value);
   }catch(e){finish(null,e)}
  };
  img.onerror=()=>finish(null,Error('A receptfotó nem tölthető be.'));
  img.src=uri;
 });
}
function source(){
 return w.LENA_RECIPE_NUTRITION_EXPORT_V1154;
}
async function choose(id){
 if(busy)return;busy=true;
 if(!profile){
  notice('⚠ Nincs kiválasztott HealthHub-profil. Nyisd meg a Táplálkozás modult, válassz profilt, majd az Étel → Léna Cookbook útvonalat.',true);
  busy=false;return;
 }
 const api=source(),recipe=api?.recipe?.(id);
 if(!recipe){notice('A recept nem érhető el. Frissítsd az oldalt.',true);busy=false;return;}
 try{
  const n=api.nutrition(id);
  let portion;
  try{portion=w.HH_COOKBOOK_PORTION_MATH_V1154.calculate(n,320)}
  catch(err){
   notice('⚠ '+String(err.message||err)+' Nyisd meg a receptet, és egyszer készítsd el a Nutri Info-t és add meg a teljes készétel-tömeget.',true);
   api.showRecipe?.(id);
   return;
  }
  notice('⏳ '+recipe.title+' · 320 g előkészítése, receptkép átvitele…');
  // Missing/offline art must NEVER block diary nutrition recording.
  let image=null,imageMissingReason='';
  try{
   const blob=await api.photo(id);
   image=await jpegData(blob);
   if(!image)imageMissingReason='A receptnél nincs menthető kép.';
  }catch(e){
   imageMissingReason='A receptkép most nem érhető el; a tápértéket ettől még naplózzuk.';
   console.warn('Cookbook image optional for diary handoff',e);
  }
  // No fabricated image for PDF-only recipes; the diary shows its glass emoji.
  const token=(w.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
  const payload={
   schema:'healthhub.cookbook.handoff/1',token,createdAt:Date.now(),
   profile,meal,recipeId:String(recipe.id).slice(0,120),
   name:String(recipe.title).slice(0,80),image,
   imageMissing:!image,imageMissingReason,grams:portion.grams,
   finishedWeightGrams:portion.finishedWeightGrams,
   nutrients:portion.nutrients,source:'estimated'
  };
  try{w.sessionStorage.setItem(storageKey,JSON.stringify(payload))}
  catch(e){throw Error('Az átmeneti biztonságos adatátadás nem sikerült. Ellenőrizd a böngésző tárhelyét.')}
  w.location.assign(new URL('../healthhub/nutrition/?hhCookbookImport=1&v=1160',w.location.href).href);
 }catch(e){
  notice('⚠ Az import nem sikerült: '+String(e?.message||e).slice(0,180),true);
 }finally{busy=false}
}
if(importMode)d.addEventListener('click',e=>{
 const card=e.target?.closest?.('#grid .card[data-recipe-id]');
 if(!card||e.target.closest('.fav'))return;
 e.preventDefault();e.stopImmediatePropagation();
 void choose(card.dataset.recipeId);
},true);
const btn=d.getElementById('hhAdd320ButtonV1160');
if(btn)btn.addEventListener('click',e=>{
 e.preventDefault();
 const id=source()?.currentRecipeId?.();
 if(!id){notice('⚠ Előbb nyiss meg egy receptet.',true);return}
 void choose(id);
});
w.HH_LENA_COOKBOOK_IMPORT_V1160=Object.freeze({
 version:1160,importMode,choose,
 profile:()=>profile,
 ready:id=>{
  try{return !!w.HH_COOKBOOK_PORTION_MATH_V1154?.calculate(source()?.nutrition?.(id),320)}
  catch(_){return false}
 }
});
})(window,document);
