/* SHO Smart Valet v11 · client-encrypted ID photos, frame-fit camera and two-sided flip.
 * Official ID plaintext and passphrases stay on device; no public URLs / OCR / AI.
 */
(function(w,d){
'use strict';
const CFG=w.HH_CENTRAL_VAULT,BUCKET='hh-smart-valet-id-encrypted-v11',TABLE='hh_valet_identity_cards_v11';
const RATIO=1.586,ITERATIONS=310000,TYPES=['license','personal','taj','tax'];
const $=id=>d.getElementById(id),hu=()=>w.localStorage.getItem('sh9-language-v1')!=='en';
const text=(a,b)=>hu()?a:b;
const profile=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
const names={license:['Jogosítvány','Driving licence'],personal:['Személyi igazolvány','Identity card'],
 taj:['TAJ-kártya','TAJ health card'],tax:['Adókártya','Tax card']};
const label=type=>names[type]?.[hu()?0:1]||type;
const make=(tag,cls,value)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x};
let client,records=new Map(),kind='',item=null,storedProfile='',side='front',viewSide='front',zoom=1;
let draft={front:null,back:null},previews={front:'',back:''},decrypted={front:'',back:''},activeKey=null;
let pendingSource=null,pendingSide='',pendingURL='',media=null,inCamera=false,busy=false,request=0;
const allURLs=new Set();
function url(blob){const x=URL.createObjectURL(blob);allURLs.add(x);return x}
function revoke(x){if(!x)return;try{URL.revokeObjectURL(x)}catch(_){}allURLs.delete(x)}
function clearURLs(){for(const x of allURLs)revoke(x);pendingURL='';previews={front:'',back:''};decrypted={front:'',back:''}}
function status(value,error){const e=$('svIdStatusV11');if(e){e.textContent=value||'';e.dataset.error=error?'1':'0'}}
function human(e){
 switch(e?.message){
 case 'NO_LOGIN':return text('Jelentkezz be a Family Guardba.','Sign in to Family Guard.');
 case 'NO_ACCESS':return text('Ehhez a profilhoz nincs hozzáférés.','Profile access denied.');
 case 'BAD_PASS':return text('Rossz jelszó, vagy a titkosított kép sérült.','Wrong passphrase or encrypted photo is damaged.');
 case 'SHORT_PASS':return text('Minimum 12 karakteres titkosítási jelszó szükséges.','Use an encryption passphrase of 12 or more characters.');
 case 'EXISTS':return text('Ehhez a típushoz már van elmentett igazolvány.','An ID of this type is already saved.');
 default:return text('A művelet nem sikerült. A korábban mentett képek nem változtak.','Operation failed. Previously saved photos were not changed.');
 }
}
async function authorized(p){
 if(!w.crypto?.subtle||!CFG?.enabled||!CFG?.supabaseUrl||!CFG?.publishableKey||!w.supabase?.createClient)
  throw Error('CRYPTO_UNAVAILABLE');
 if(!client)client=w.supabase.createClient(CFG.supabaseUrl,CFG.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,
   autoRefreshToken:false,detectSessionInUrl:false}
 });
 const {data:{user}={},error}=await client.auth.getUser();
 if(error||!user?.id)throw Error('NO_LOGIN');
 const access=await client.from('hh_profile_access').select('profile_key')
  .eq('user_id',user.id).eq('profile_key',p).maybeSingle();
 if(access.error||!access.data||profile()!==p)throw Error('NO_ACCESS');
 return client;
}
const b64=arr=>btoa(Array.from(arr,x=>String.fromCharCode(x)).join(''));
const salt=txt=>Uint8Array.from(atob(txt),x=>x.charCodeAt(0));
async function derive(password,s){
 if(!password||password.length<12)throw Error('SHORT_PASS');
 const key=await w.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return w.crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:ITERATIONS,hash:'SHA-256'},
  key,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad=(rec,which)=>new TextEncoder().encode([rec.profile_key,rec.doc_type,rec.id,which].join('|'));
async function encrypt(blob,key,rec,which){
 const iv=w.crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await w.crypto.subtle.encrypt(
  {name:'AES-GCM',iv,additionalData:aad(rec,which),tagLength:128},key,await blob.arrayBuffer());
 return new Blob([iv,new Uint8Array(ciphertext)],{type:'application/octet-stream'});
}
async function decrypt(cipher,key,rec,which){
 const bytes=new Uint8Array(await cipher.arrayBuffer());if(bytes.length<33)throw Error('BAD_PASS');
 try{
  const plain=await w.crypto.subtle.decrypt({
   name:'AES-GCM',iv:bytes.slice(0,12),additionalData:aad(rec,which),tagLength:128},key,bytes.slice(12));
  return new Blob([plain],{type:'image/jpeg'});
 }catch(_){throw Error('BAD_PASS')}
}
function stopCamera(){
 inCamera=false;
 if(media){for(const t of media.getTracks())t.stop();media=null}
 const v=$('svIdVideoV11');if(v){v.pause();v.srcObject=null}
 $('svIdCaptureV11').hidden=true;
}
function lock(){
 stopCamera();clearURLs();
 draft={front:null,back:null};activeKey=null;pendingSource=null;pendingSide='';
 const pass=$('svIdPassV11'),unlock=$('svIdUnlockPassV11');
 if(pass)pass.value='';if(unlock)unlock.value='';
 $('svIdCropV11').hidden=true;$('svIdViewV11').hidden=true;
 $('svIdDraftV11').hidden=true;$('svIdUnlockV11').hidden=true;
 const img=$('svIdImageFrontV11');if(img)img.removeAttribute('src');
 const back=$('svIdImageBackV11');if(back)back.removeAttribute('src');
 const tile=d.querySelector('.sv-id-type-v10[data-id-type="'+kind+'"]');
 tile?.querySelector('.sv-id-photo-v11')?.remove();
}
function close(){
 $('svIdDialogV11')?.close();lock();kind='';item=null;
}
function updateTiles(){
 for(const type of TYPES){
  const tile=d.querySelector('.sv-id-type-v10[data-id-type="'+type+'"]');if(!tile)continue;
  tile.querySelector('.sv-id-state-v11')?.remove();
  const rec=records.get(type);
  const sides=rec?(rec.front_saved_at?1:0)+(rec.back_saved_at?1:0):0;
  tile.append(make('small','sv-id-state-v11',rec?sides+'/2 '+text('oldal','sides'):text('＋ Hozzáadás','＋ Add')));
 }
}
async function refresh(){
 const id=++request,p=profile();
 try{
  const c=await authorized(p);
  const result=await c.from(TABLE).select(
   'id,profile_key,doc_type,kdf_salt,front_storage_path,back_storage_path,front_saved_at,back_saved_at')
   .eq('profile_key',p).limit(12);
  if(result.error)throw result.error;
  if(id!==request||p!==profile())return;
  records=new Map((result.data||[]).filter(x=>TYPES.includes(x.doc_type)).map(x=>[x.doc_type,x]));
 }catch(_){if(id!==request)return;records=new Map()}
 updateTiles();
}
function open(type){
 if(!TYPES.includes(type)||busy)return;
 if($('svIdDialogV11').open)close();
 kind=type;item=records.get(type)||null;storedProfile=profile();side='front';
 draft={front:null,back:null};activeKey=null;clearURLs();
 $('svIdTitleV11').textContent=label(type);
 $('svIdDraftV11').hidden=!!item;
 $('svIdUnlockV11').hidden=!item;
 $('svIdViewV11').hidden=true;$('svIdCropV11').hidden=true;
 status('');
 renderDraft();
 $('svIdDialogV11').showModal();
}
function renderDraft(){
 for(const x of ['front','back']){
  const id=x==='front'?'Front':'Back',im=$('svId'+id+'PreviewV11');
  revoke(previews[x]);previews[x]=draft[x]?url(draft[x]):'';
  im.hidden=!draft[x];if(draft[x])im.src=previews[x];else im.removeAttribute('src');
  $('svId'+id+'EmptyV11').hidden=!!draft[x];
 }
 $('svIdSaveV11').disabled=!draft.front||busy;
}
function choose(which,mode){
 if(!['front','back'].includes(which))return;
 side=which;
 if(mode==='camera')void startCamera();
 else{$('svIdFileV11').value='';$('svIdFileV11').click()}
}
async function startCamera(){
 const video=$('svIdVideoV11');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('CAMERA_UNAVAILABLE');
  media=await navigator.mediaDevices.getUserMedia({video:{
   facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
  if(!kind){stopCamera();return}
  video.srcObject=media;
  $('svIdCaptureSideV11').textContent=label(kind)+' · '+(side==='front'?text('Előlap','Front'):text('Hátlap','Back'));
  $('svIdCaptureV11').hidden=false;inCamera=true;
  await video.play();
 }catch(_){stopCamera();$('svIdCameraFallbackV11').value='';$('svIdCameraFallbackV11').click()}
}
function shot(){
 const v=$('svIdVideoV11'),frame=$('svIdCameraGuideV11');
 if(!inCamera||!v.videoWidth||!v.videoHeight)return;
 const vr=v.getBoundingClientRect(),fr=frame.getBoundingClientRect();
 const scale=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
 const ox=(vr.width-v.videoWidth*scale)/2,oy=(vr.height-v.videoHeight*scale)/2;
 const sx=Math.max(0,(fr.left-vr.left-ox)/scale),sy=Math.max(0,(fr.top-vr.top-oy)/scale);
 const sw=Math.min(v.videoWidth-sx,fr.width/scale),sh=Math.min(v.videoHeight-sy,fr.height/scale);
 if(sw<80||sh<55)return;
 const canvas=d.createElement('canvas');canvas.width=1500;canvas.height=Math.round(1500/RATIO);
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(v,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
 const which=side;
 canvas.toBlob(blob=>{stopCamera();if(blob)edit(blob,which)},'image/jpeg',.92);
}
async function edit(file,which){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12000000||!file.size){
  status(text('JPG, PNG vagy WebP, legfeljebb 12 MB.','JPG, PNG or WebP, up to 12 MB.'),true);return;
 }
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const word=Array.from(bytes,x=>String.fromCharCode(x)).join('');
 const valid=file.type==='image/jpeg'?(bytes[0]===255&&bytes[1]===216&&bytes[2]===255):
  file.type==='image/png'?(bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'):
  (word.slice(0,4)==='RIFF'&&word.slice(8,12)==='WEBP');
 if(!valid){status(text('A kiválasztott kép formátuma nem megfelelő.','Invalid image signature.'),true);return}
 revoke(pendingURL);pendingURL=url(file);pendingSource=file;pendingSide=which;
 const im=$('svIdCropImageV11');im.src=pendingURL;
 for(const id of ['svIdCropX','svIdCropY'])$(id).value='50';
 $('svIdCropZoom').value='1';
 $('svIdCropV11').hidden=false;cropStyle();
 $('svIdCropV11').scrollIntoView({behavior:'smooth',block:'start'});
}
function cropStyle(){
 const im=$('svIdCropImageV11');
 im.style.objectPosition=$('svIdCropX').value+'% '+$('svIdCropY').value+'%';
 im.style.transform='scale('+$('svIdCropZoom').value+')';
}
async function drawImage(blob){
 if(w.createImageBitmap){
  try{const b=await w.createImageBitmap(blob,{imageOrientation:'from-image'});
   return {image:b,width:b.width,height:b.height,close:()=>b.close()}}catch(_){}
 }
 const u=url(blob),img=make('img');img.src=u;await img.decode();
 return{image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>revoke(u)};
}
async function acceptCrop(){
 if(!pendingSource)return;
 const btn=$('svIdCropAcceptV11');btn.disabled=true;
 try{
  const image=await drawImage(pendingSource);
  try{
   const z=Number($('svIdCropZoom').value),x=Number($('svIdCropX').value)/100,y=Number($('svIdCropY').value)/100;
   let cw=Math.min(image.width,image.height*RATIO),ch=cw/RATIO;cw/=z;ch/=z;
   const canvas=d.createElement('canvas');
   canvas.width=Math.min(1800,Math.max(900,Math.round(cw)));
   canvas.height=Math.round(canvas.width/RATIO);
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('CANVAS');
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(image.image,(image.width-cw)*x,(image.height-ch)*y,cw,ch,0,0,canvas.width,canvas.height);
   const result=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
   if(!result||result.size>7500000)throw Error('IMAGE_TOO_BIG');
   draft[pendingSide]=result;
   $('svIdCropV11').hidden=true;revoke(pendingURL);pendingURL='';pendingSource=null;
   if(item&&pendingSide==='back'&&activeKey){
    await saveBack();
   }else{
    renderDraft();
    status(text('Keretkitöltős kép kész. Ellenőrizd a sarkokat.','Frame-filling photo ready. Check the corners.'));
   }
  }finally{image.close()}
 }catch(_){status(text('Nem sikerült az automatikus igazítás.','Could not fit the photo.'),true)}
 finally{btn.disabled=false}
}
function cancelCrop(){
 $('svIdCropV11').hidden=true;revoke(pendingURL);pendingSource=null;pendingURL='';
}
async function save(){
 if(busy||!draft.front)return;
 const p=storedProfile,type=kind,password=$('svIdPassV11').value;
 if(password.length<12){status(human(Error('SHORT_PASS')),true);return}
 busy=true;$('svIdSaveV11').disabled=true;status(text('Titkosítás és privát feltöltés…','Encrypting and uploading…'));
 let c,rec,created=false,uploaded=[];
 try{
  c=await authorized(p);if(item||records.has(type))throw Error('EXISTS');
  const uuid=w.crypto.randomUUID(),s=w.crypto.getRandomValues(new Uint8Array(16));
  const root=p+'/'+type+'/'+uuid+'/';
  rec={id:uuid,profile_key:p,doc_type:type,kdf_salt:b64(s),
   front_storage_path:root+'front.enc',back_storage_path:root+'back.enc'};
  const key=await derive(password,s);
  const front=await encrypt(draft.front,key,rec,'front');
  const back=draft.back?await encrypt(draft.back,key,rec,'back'):null;
  if(p!==profile())throw Error('NO_ACCESS');
  const inserted=await c.from(TABLE).insert(rec).select('id').single();
  if(inserted.error)throw inserted.error;
  created=true;
  for(const [which,blob] of [['front',front],['back',back]]){
   if(!blob)continue;
   const path=which==='front'?rec.front_storage_path:rec.back_storage_path;
   const up=await c.storage.from(BUCKET).upload(path,blob,
    {contentType:'application/octet-stream',upsert:false});
   if(up.error)throw up.error;uploaded.push(path);
   const field=which+'_saved_at',marked=await c.from(TABLE).update({[field]:new Date().toISOString()})
    .eq('id',rec.id).eq('profile_key',p).select('id').single();
   if(marked.error)throw marked.error;
  }
  // Photos and passphrase are discarded after saving; opening requires the passphrase.
  close();await refresh();open(type);
  status(text('TADAAA! 🔐 Titkosított mentés elkészült.','Saved encrypted. Unlock your photos to view.'));
 }catch(e){
  if(c&&created&&rec){
   if(uploaded.length)try{await c.storage.from(BUCKET).remove(uploaded)}catch(_){}
   try{await c.from(TABLE).delete().eq('id',rec.id).eq('profile_key',p)}catch(_){}
  }
  status(e?.code==='23505'?human(Error('EXISTS')):human(e),true);
 }finally{busy=false;$('svIdSaveV11').disabled=!draft.front}
}
function flipTo(which){
 if(which==='back'&&!decrypted.back){
  status(text('A hátlap még nincs mentve.','The back has not been saved yet.'),true);return;
 }
 viewSide=which;$('svIdFlipV11').classList.toggle('is-back',which==='back');
 for(const b of d.querySelectorAll('#svIdViewV11 [data-id-side]')){
  const on=b.dataset.idSide===which;
  b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 }
}
function showPreview(tileType,photo){
 const tile=d.querySelector('.sv-id-type-v10[data-id-type="'+tileType+'"]');
 if(!tile)return;
 tile.querySelector('.sv-id-photo-v11')?.remove();
 const img=make('img','sv-id-photo-v11');img.alt=text('Előlap előnézet','Front preview');img.src=photo;
 tile.querySelector('svg')?.insertAdjacentElement('afterend',img);
}
async function unlock(){
 if(!item||busy)return;
 const password=$('svIdUnlockPassV11').value;
 if(password.length<12){status(human(Error('SHORT_PASS')),true);return}
 busy=true;$('svIdUnlockButtonV11').disabled=true;
 try{
  const c=await authorized(storedProfile),key=await derive(password,salt(item.kdf_salt));
  const one=await c.storage.from(BUCKET).download(item.front_storage_path);
  if(one.error||!one.data)throw Error('BAD_PASS');
  const front=await decrypt(one.data,key,item,'front');
  let back=null;
  if(item.back_saved_at){
   const two=await c.storage.from(BUCKET).download(item.back_storage_path);
   if(two.error||!two.data)throw Error('BAD_PASS');
   back=await decrypt(two.data,key,item,'back');
  }
  if(profile()!==storedProfile)throw Error('NO_ACCESS');
  decrypted.front=url(front);
  if(back)decrypted.back=url(back);
  activeKey=key;
  $('svIdImageFrontV11').src=decrypted.front;
  if(decrypted.back)$('svIdImageBackV11').src=decrypted.back;
  $('svIdUnlockPassV11').value='';
  $('svIdUnlockV11').hidden=true;$('svIdViewV11').hidden=false;
  $('svIdAddBackV11').hidden=!!item.back_saved_at;
  flipTo('front');zoomBy(0);showPreview(kind,decrypted.front);
  status(text('Érintsd meg a kártyát: előlap ↔ hátlap.','Tap the card: front ↔ back.'));
 }catch(e){status(human(e),true)}
 finally{busy=false;$('svIdUnlockButtonV11').disabled=false}
}
function zoomBy(step){
 zoom=step===0?1:Math.min(3,Math.max(1,zoom+step));
 $('svIdZoomFrameV11').style.transform='scale('+zoom+')';
 $('svIdZoomStatusV11').textContent=Math.round(zoom*100)+'%';
}
async function saveBack(){
 if(!item||!activeKey||!draft.back||busy)return;
 busy=true;let clientForCleanup=null,uploaded=false,marked=false;
 try{
  const c=await authorized(storedProfile);clientForCleanup=c;
  const cipher=await encrypt(draft.back,activeKey,item,'back');
  const upload=await c.storage.from(BUCKET).upload(item.back_storage_path,cipher,
   {contentType:'application/octet-stream',upsert:false});
  if(upload.error)throw upload.error;
  uploaded=true;
  const result=await c.from(TABLE).update({back_saved_at:new Date().toISOString()})
   .eq('id',item.id).eq('profile_key',storedProfile).select('id').single();
  if(result.error)throw result.error;
  marked=true;
  decrypted.back=url(draft.back);
  $('svIdImageBackV11').src=decrypted.back;
  item.back_saved_at=new Date().toISOString();
  $('svIdAddBackV11').hidden=true;
  flipTo('back');await refresh();status(text('Hátlap titkosítva mentve.','Back saved encrypted.'));
 }catch(e){
  if(uploaded&&!marked&&clientForCleanup){
   try{await clientForCleanup.storage.from(BUCKET).remove([item.back_storage_path])}catch(_){}
  }
  status(human(e),true);
 }finally{busy=false}
}
async function removeCard(){
 if(!item||!activeKey||busy)return;
 if(!w.confirm(text('Végleg törlöd az igazolvány mindkét oldalát?','Permanently delete both ID sides?')))return;
 busy=true;try{
  const c=await authorized(storedProfile);
  const paths=[item.front_saved_at?item.front_storage_path:null,item.back_saved_at?item.back_storage_path:null].filter(Boolean);
  if(paths.length){
   const r=await c.storage.from(BUCKET).remove(paths);if(r.error)throw r.error;
  }
  const r=await c.from(TABLE).delete().eq('id',item.id).eq('profile_key',storedProfile);
  if(r.error)throw r.error;
  close();await refresh();
 }catch(e){status(human(e),true)}finally{busy=false}
}
function init(){
 const parent=$('svIdentityPanelV10'),tpl=$('svIdTemplateV11');
 if(!parent||!tpl)return;
 if(!w.crypto?.subtle){
  $('svIdNoticeV10').textContent=text('Biztonságos titkosítás ezen az eszközön nem elérhető.','Secure encryption is unavailable on this device.');return;
 }
 const dialog=make('dialog','sv-id-dialog-v11');dialog.id='svIdDialogV11';
 dialog.append(tpl.content.cloneNode(true));d.body.append(dialog);
 for(const button of parent.querySelectorAll('[data-id-type]'))
  button.addEventListener('click',()=>open(button.dataset.idType));
 $('svIdCloseV11').addEventListener('click',close);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 for(const b of dialog.querySelectorAll('[data-side][data-mode]'))
  b.addEventListener('click',()=>choose(b.dataset.side,b.dataset.mode));
 for(const id of ['svIdFileV11','svIdCameraFallbackV11']){
  $(id).addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';if(file)edit(file,side)});
 }
 $('svIdBackExtraInputV11').addEventListener('change',e=>{
  const file=e.target.files?.[0];e.target.value='';if(file)edit(file,'back');
 });
 $('svIdCancelCameraV11').addEventListener('click',stopCamera);
 $('svIdSnapV11').addEventListener('click',shot);
 for(const id of ['svIdCropX','svIdCropY','svIdCropZoom'])$(id).addEventListener('input',cropStyle);
 $('svIdCropAcceptV11').addEventListener('click',()=>void acceptCrop());
 $('svIdCropCancelV11').addEventListener('click',cancelCrop);
 $('svIdSaveV11').addEventListener('click',()=>void save());
 $('svIdUnlockButtonV11').addEventListener('click',()=>void unlock());
 $('svIdFlipV11').addEventListener('click',()=>flipTo(viewSide==='front'?'back':'front'));
 for(const b of dialog.querySelectorAll('[data-id-side]'))
  b.addEventListener('click',()=>flipTo(b.dataset.idSide));
 $('svIdZoomOutV11').addEventListener('click',()=>zoomBy(-.2));
 $('svIdZoomInV11').addEventListener('click',()=>zoomBy(.2));
 $('svIdZoomFitV11').addEventListener('click',()=>zoomBy(0));
 $('svIdAddBackV11').addEventListener('click',()=>{
  if(!item||!activeKey)return;
  $('svIdBackExtraInputV11').value='';$('svIdBackExtraInputV11').click();
 });
 $('svIdDeleteV11').addEventListener('click',()=>void removeCard());
 w.addEventListener('hh-family-profile-changed',()=>{close();void refresh()});
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'){close();void refresh()}});
 w.addEventListener('pagehide',close);
 d.addEventListener('visibilitychange',()=>{if(d.hidden&&!$('svIdViewV11').hidden)close()});
 void refresh();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.SHO_VALET_ID_V11=Object.freeze({version:11,cardAspect:RATIO,encrypted:true});
})(window,document);
