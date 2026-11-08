/* HealthHub Nutrition v1150 · Compact diary artwork from existing Favorites.
 * Purely presentational: no diary mutations, sync writes, AI calls, or uploads.
 * The same image vault, profile color and saved imageRef are reused.
 */
(function(root,doc){
 'use strict';
 const FAV='quick:',SHARED='quick:shared-',OWN='user:';
 const $=sel=>doc.querySelectorAll(sel);
 const shared=()=>root.HH_SHARED_FOOD_LIBRARY_V1118;
 const vault=()=>root.HH_NUTRITION_IMAGE_V641;
 const active=()=>root.HH_NUTRITION_QUICK_API?.getProfile?.();
 const regex=/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;
 let sharedLoad=null,sharedRefreshStarted=false;
 const isPhoto=(value)=>typeof value==='string'&&value.length<1300000&&regex.test(value);
 function resolve(entry,data,sharedItems=[]){
  if(!entry||typeof entry!=='object')return null;
  // v1154: Keep the imported cookbook photo with its immutable diary snapshot.
  // Unlike a Favorite, this image belongs to this exact imported portion.
  if(entry.cookbookImport?.recipeId){
   return {id:entry.id,kind:'cookbook',scope:'personal',
    imageRef:entry.cookbookImport.imageRef||null,image:'',
    icon:entry.icon||'🥘',theme:'meal'};
  }
  const id=typeof entry.quickRecipeId==='string'?entry.quickRecipeId:
   (typeof entry.foodId==='string'?entry.foodId:'');
  if(id.startsWith(SHARED)){
   const sourceId=id.slice(SHARED.length);
   const item=Array.isArray(sharedItems)?sharedItems.find(x=>x.id===sourceId):null;
   return {id,sourceId,kind:'favorite',scope:'shared',
    imageRef:item?.imageRef||null,image:'',icon:entry.icon||'🍽️',theme:item?.kind==='drink'?'coffee':'meal'};
  }
  if(id.startsWith(FAV)){
   const item=Array.isArray(data?.quickRecipes)?data.quickRecipes.find(x=>x.id===id):null;
   return {id,kind:'favorite',scope:'personal',imageRef:item?.imageRef||null,
    image:item?.image||'',icon:item?.icon||entry.icon||'🍽️',theme:item?.theme||'meal'};
  }
  // Own foods should show the same saved image when they have one.
  if(id.startsWith(OWN)){
   const item=Array.isArray(data?.catalog)?data.catalog.find(x=>x.id===id):null;
   if(!item?.imageRef)return null;
   return {id,kind:'personal-food',scope:'personal',imageRef:item.imageRef,
    image:'',icon:item.icon||entry.icon||'🍽️',theme:item.kind==='drink'?'coffee':'meal'};
  }
  return null;
 }
 function showImage(frame,src,profile,key){
  if(!src||frame.dataset.artKey!==key||active()!==profile)return;
  const img=doc.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';
  img.className='hh-diary-fav-photo-v1150';img.src=src;
  img.onerror=()=>{img.remove();if(frame.dataset.artKey===key)delete frame.dataset.artKey};
  // If an older image loaded out of order, do not let it overwrite the latest.
  frame.querySelector('.hh-diary-fav-photo-v1150')?.remove();
  frame.append(img);
 }
 function useImage(frame,visual,profile){
  if(isPhoto(visual.image)){
   const key='inline:'+visual.id+':'+visual.image.length;
   if(frame.dataset.artKey===key)return;
   frame.dataset.artKey=key;showImage(frame,visual.image,profile,key);
   return;
  }
  if(!visual.imageRef)return;
  const store=vault(),scope=visual.scope==='shared'?'shared':profile,ref=visual.imageRef;
  if(!store?.refValid?.(scope,ref)||typeof store.load!=='function')return;
  const key=scope+':'+String(ref.sha256||'');
  if(frame.dataset.artKey===key)return;
  frame.dataset.artKey=key;
  // Lazy images are decoded by the browser; Dropbox image-vault shares its
  // blob cache across Favorites, Diary and all existing Nutrition consumers.
  store.load(scope,ref).then(url=>{
   if(frame.isConnected===false)return;
   showImage(frame,url,profile,key);
  }).catch(()=>{
   if(frame.dataset.artKey===key)delete frame.dataset.artKey;
  });
 }
 function requestShared(){
  const library=shared();
  if(sharedRefreshStarted||!library?.load)return;
  sharedRefreshStarted=true;
  // One non-blocking remote refresh per page when an old shared favorite has
  // no local image metadata. The diary itself renders before this finishes.
  sharedLoad=Promise.resolve().then(()=>library.load(true)).catch(()=>{}).finally(()=>{sharedLoad=null});
 }
 function attach(left,entry,profile,data){
  if(!left||!entry||!['monika','zsolt'].includes(profile))return;
  const visual=resolve(entry,data,shared()?.getItems?.()||[]);
  if(!visual)return;
  const frame=doc.createElement('span');frame.className='hh-diary-fav-frame-v1150';
  frame.dataset.theme=visual.theme||'meal';
  frame.dataset.kind=visual.kind;
  frame.setAttribute('aria-hidden','true');
  if(visual.scope==='shared')frame.dataset.sharedId=visual.sourceId;
  const emoji=doc.createElement('span');emoji.className='hh-diary-fav-emoji-v1150';
  emoji.textContent=visual.icon||'🍽️';frame.append(emoji);
  const copy=doc.createElement('span');copy.className='hh-diary-fav-copy-v1150';
  while(left.firstChild)copy.append(left.firstChild);
  const title=copy.querySelector('strong');
  if(title)title.textContent=entry.name||'Étel';
  left.classList.add('hh-diary-fav-row-v1150');
  left.append(frame,copy);
  useImage(frame,visual,profile);
  if(visual.sourceId&&!visual.imageRef)requestShared();
 }
 function updateShared(){
  const sharedItems=shared()?.getItems?.()||[],profile=active();
  if(!['monika','zsolt'].includes(profile)||!sharedItems.length)return;
  $('.hh-diary-fav-frame-v1150[data-shared-id]').forEach(frame=>{
   const item=sharedItems.find(x=>x.id===frame.dataset.sharedId);
   if(!item)return;
   useImage(frame,{id:SHARED+item.id,scope:'shared',imageRef:item.imageRef,image:''},profile);
  });
 }
 // An asynchronously synced household image updates the current visible diary
 // thumbnail only. Never redraw the whole diary or change its scroll position.
 root.addEventListener?.('healthhub:shared-foods-updated',updateShared);
 root.HH_NUTRITION_DIARY_FAVORITE_ART_V1150=Object.freeze({version:'1150',resolve,attach,updateShared});
})(window,document);
