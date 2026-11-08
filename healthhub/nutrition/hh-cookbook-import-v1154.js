/* Nutrition v1154 · Explicit Studio→Nutrition single-tap receipt.
 * A same-tab, short-lived handoff; journal records still use the canonical
 * per-profile Dropbox document and its conflict-safe sync.
 */
(function(w,d){
'use strict';
if(new URLSearchParams(w.location.search).get('hhCookbookImport')!=='1')return;
const KEY='hh:recipe-studio:handoff:v1154';
let pending=false,noticeNode=null;
function notice(message,error=false,retry=false){
 if(!noticeNode){
  noticeNode=d.createElement('aside');
  noticeNode.id='hhCookbookNoticeV1154';
  noticeNode.setAttribute('role','status');
  noticeNode.setAttribute('aria-live','polite');
  const target=d.getElementById('hhBevitelHeading')?.closest('section');
  if(target)target.insertAdjacentElement('beforebegin',noticeNode);else d.body.prepend(noticeNode);
 }
 noticeNode.replaceChildren();
 const msg=d.createElement('span');msg.textContent=message;noticeNode.append(msg);
 noticeNode.dataset.error=String(error);
 if(retry){
  const button=d.createElement('button');button.type='button';button.textContent='↻ Újrapróbálás';
  button.addEventListener('click',()=>void importOne());
  noticeNode.append(button);
 }
}
async function importOne(){
 if(pending)return;pending=true;
 try{
  let item;
  try{item=JSON.parse(w.sessionStorage.getItem(KEY)||'null')}
  catch(e){throw Error('A receptátadás nem olvasható. Válaszd ki újra a receptet.')}
  if(!item||item.schema!=='healthhub.cookbook.handoff/1')
   throw Error('Nincs átadásra váró recept. Térj vissza a Recept Stúdióhoz.');
  if(!Number.isFinite(item.createdAt)||Date.now()-item.createdAt>8*60*1000||
     item.createdAt>Date.now()+15000)
   throw Error('A receptátadás lejárt. Válaszd ki újra a receptet.');
  if(item.grams!==320)throw Error('A 320 g-os alapadat nem egyezik.');
  const api=w.HH_NUTRITION_QUICK_API,vault=w.HH_NUTRITION_IMAGE_V641;
  if(!api?.recordCookbookPortion)throw Error('A Nutrition napló még nem töltődött be.');
  if(api.getProfile()!==item.profile)
   throw Error('Közben profilt váltottál. Válts vissza '+(item.profile==='monika'?'Mónika':'Zsolt')+' profiljára a naplózáshoz.');
  notice('🥗 '+item.name+' · 320 g · naplózás és képszinkron…');
  let imageRef=null,imageNote='';
  if(item.image){
   if(typeof item.image!=='string'||item.image.length>875000||
      !/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(item.image))
    throw Error('A receptkép nem megfelelő formátumú.');
   if(vault?.connected?.()&&typeof vault.save==='function'){
    try{
     imageRef=await vault.save(item.profile,item.image);
    }catch(e){
     console.warn('Cookbook image vault unavailable; keeping valid diary nutrition',e);
     imageNote=' A receptkép Dropbox-feltöltése sikertelen, a tápértéket naplóztam.';
    }
   }else{
    imageNote=' A Dropbox-képtár nincs csatlakoztatva, a recept kép nélkül került be.';
   }
   if(api.getProfile()!==item.profile)throw Error('Profilváltás történt a kép mentése közben.');
  }
  const result=api.recordCookbookPortion({
   expectedProfile:item.profile,token:item.token,recipeId:item.recipeId,
   name:item.name,grams:item.grams,finishedWeightGrams:item.finishedWeightGrams,
   nutrients:item.nutrients,meal:item.meal,imageRef
  });
  w.sessionStorage.removeItem(KEY);
  notice('✨ TADAAA! '+result.name+' · 320 g · '+Math.round(result.kcal)+' kcal a Napi naplóban.'+
   (item.imageMissing?' A receptnél nem volt átvihető ételfotó.':imageNote)+
   ' Dropbox-szinkron ellenőrzése…');
  d.getElementById('log')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  try{
   const synced=await api.syncNow?.();
   notice('✨ TADAAA! '+result.name+' · 320 g · '+Math.round(result.kcal)+' kcal.'+
     (item.imageMissing?' Nincs menthető receptfotó.':imageNote)+
     (synced?' ☁ A Dropbox-szinkron kész.':' Mentve helyben, a felhőszinkronra vár.'));
  }catch(e){
   notice('✓ '+result.name+' · 320 g rögzítve. A Dropbox-szinkron később újrapróbálkozik.');
  }
 }catch(e){
  notice('⚠ '+String(e?.message||e).slice(0,215),true,true);
 }finally{pending=false}
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>void importOne(),{once:true});
else void importOne();
})(window,document);
