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
 taj:['TAJ-kártya','TAJ health card'],tax:['Lakcímkártya','Address card']};
const label=type=>names[type]?.[hu()?0:1]||type;
const make=(tag,cls,value)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x};
let client,records=new Map(),loadedProfile='',kind='',item=null,storedProfile='',side='front',viewSide='front',zoom=1;
let draft={front:null,back:null},previews={front:'',back:''},decrypted={front:'',back:''},activeKey=null;
let pendingSource=null,pendingSide='',pendingURL='',media=null,inCamera=false,busy=false,request=0;
const allURLs=new Set(),tileURLs=new Map();
function url(blob){const x=URL.createObjectURL(blob);allURLs.add(x);return x}
function revoke(x){if(!x)return;try{URL.revokeObjectURL(x)}catch(_){}allURLs.delete(x)}
function clearURLs(){for(const x of allURLs)revoke(x);pendingURL='';previews={front:'',back:''};decrypted={front:'',back:''}}
function status(value,error){const e=$('svIdStatusV11');if(e){e.textContent=value||'';e.dataset.error=error?'1':'0'}}
function human(e){
 switch(e?.message){
 case 'NO_LOGIN':return text('Jelentkezz be a Family Guardba.','Sign in to Family Guard.');
 case 'NO_ACCESS':return text('Ehhez a profilhoz nincs hozzáférés.','Profile access denied.');
 case 'BAD_PASS':return text('Rossz jelszó, vagy a titkosított kép sérült.','Wrong passphrase or encrypted photo is damaged.');
 case 'SHORT_PASS':return text('Minimum 8 karakteres jelszó szükséges.','Use a passphrase of at least 8 characters.');
 case 'NO_DEVICE_KEY':return text('A helyi titkosítási kulcs nincs meg ezen az eszközön. A kép nem állítható vissza.','Device encryption key is missing. The photo cannot be recovered.');
 case 'NO_INDEXED_DB':return text('A készülék nem támogatja a jelszó nélküli biztonságos mentést. Kapcsold be a jelszót.','Device storage is unavailable. Enable password protection.');
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
 if(!password||password.length<8)throw Error('SHORT_PASS');
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
 const bytes=new Uint8Array(await cipher.arrayBuffer());if(bytes.length<29)throw Error('BAD_PASS');
 try{
  const plain=await w.crypto.subtle.decrypt({
   name:'AES-GCM',iv:bytes.slice(0,12),additionalData:aad(rec,which),tagLength:128},key,bytes.slice(12));
  return new Blob([plain],{type:'image/jpeg'});
 }catch(_){throw Error('BAD_PASS')}
}

/* An unextractable AES CryptoKey may be stored by structured clone in IndexedDB
 * without exposing raw key bytes to JavaScript. This mode is DEVICE-BOUND:
 * losing site storage, moving browser or changing phone loses access permanently.
 * Every operation still requires authenticated owner/profile access. */
const KEY_DB='sho-valet-private-identity-device-v12',KEY_STORE='keys';
function keyID(userID,id){return userID+'|'+id}
function openKeyDB(){
 return new Promise((resolve,reject)=>{
  if(!w.indexedDB)return reject(Error('NO_INDEXED_DB'));
  const req=w.indexedDB.open(KEY_DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(KEY_STORE))
   req.result.createObjectStore(KEY_STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(Error('NO_INDEXED_DB'));
  req.onblocked=()=>reject(Error('NO_INDEXED_DB'));
 });
}
async function deviceKey(action,owner,recordID,value){
 const db=await openKeyDB();
 try{
  return await new Promise((resolve,reject)=>{
   const mode=action==='get'?'readonly':'readwrite';
   const tr=db.transaction(KEY_STORE,mode),store=tr.objectStore(KEY_STORE);
   const id=keyID(owner,recordID);
   const req=action==='put'?store.put(value,id):
    action==='delete'?store.delete(id):store.get(id);
   let result;
   req.onsuccess=()=>{result=req.result};
   req.onerror=()=>reject(Error('NO_INDEXED_DB'));
   tr.oncomplete=()=>resolve(result);
   tr.onerror=()=>reject(Error('NO_INDEXED_DB'));
   tr.onabort=()=>reject(Error('NO_INDEXED_DB'));
  });
 }finally{db.close()}
}
async function deviceAESKey(){
 return w.crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function protectionMode(rec){return rec?.protection_mode==='device'?'device':'password'}
function removeTilePreview(type){
 const old=tileURLs.get(type);
 if(old)revoke(old);
 tileURLs.delete(type);
 const tile=d.querySelector('.sv-id-type-v10[data-id-type="'+type+'"]');
 tile?.querySelector('.sv-id-photo-v11')?.remove();tile?.classList.remove('has-photo');
}
function clearTilePreviews(){for(const type of TYPES)removeTilePreview(type)}
function updatePasswordSwitch(){
 const checked=$('svIdPasswordEnabledV12').checked;
 $('svIdPasswordFieldsV12').hidden=!checked;
 $('svIdDeviceHintV12').hidden=checked;
 if(!checked){
  $('svIdPassV11').value='';
  $('svIdPassConfirmV11').value='';
 }
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
 const pass=$('svIdPassV11'),confirmation=$('svIdPassConfirmV11'),unlock=$('svIdUnlockPassV11');
 if(pass)pass.value='';if(confirmation)confirmation.value='';if(unlock)unlock.value='';
 $('svIdCropV11').hidden=true;$('svIdViewV11').hidden=true;
 $('svIdDraftV11').hidden=true;$('svIdUnlockV11').hidden=true;
 const img=$('svIdImageFrontV11');if(img)img.removeAttribute('src');
 const back=$('svIdImageBackV11');if(back)back.removeAttribute('src');
 // Password-protected IDs never have an exposed tile preview. Device-key
 // thumbnails belong to the authenticated gallery, not to this dialog session.
 if(item&&protectionMode(item)==='password')removeTilePreview(kind);
}
function close(){
 $('svIdDialogV11')?.close();lock();kind='';item=null;
}
function updateTilePinButtons(){
 const quick=w.SHO_VALET_SMART_ACCESS_V13;
 for(const type of TYPES){
  const button=d.querySelector('.sv-id-tile-pin-v14[data-pin-for="'+type+'"]');
  if(!button)continue;
  // Visible on every tile; enabled only for saved IDs loaded through RLS.
  const saved=!!records.get(type)?.front_saved_at;
  const selected=!!quick?.isPinned('identity',type);
  button.disabled=!saved||!quick;
  button.textContent=(selected?'★ ':'☆ ')+text(
   selected?'Kitűzés megszüntetése':'Kitűzés',
   selected?'Remove pin':'Pin');
  button.setAttribute('aria-pressed',String(selected));
  button.setAttribute('aria-label',label(type)+' · '+button.textContent);
  button.title=!saved
   ?text('Előbb töltsd fel az igazolványt.','Save this ID first.')
   :button.textContent;
 }
}
function updateTiles(){
 for(const type of TYPES){
  const tile=d.querySelector('.sv-id-type-v10[data-id-type="'+type+'"]');if(!tile)continue;
  tile.querySelector('.sv-id-state-v11')?.remove();
  const rec=records.get(type);
  const sides=rec?(rec.front_saved_at?1:0)+(rec.back_saved_at?1:0):0;
  tile.append(make('small','sv-id-state-v11',rec
    ?(protectionMode(rec)==='password'?'🔒 ':'')+sides+'/2 '+text('oldal','sides')
    :text('＋ Hozzáadás','＋ Add')));
 }
 updateTilePinButtons();
}

async function loadTilePreviews(p,id,c){
 for(const rec of records.values()){
  if(protectionMode(rec)!=='device'||!rec.front_saved_at)continue;
  try{
   const {data:{user}={},error:authError}=await c.auth.getUser();
   if(authError||!user)continue;
   const key=await deviceKey('get',user.id,rec.id);
   if(!key||key.extractable||key.algorithm?.name!=='AES-GCM')continue;
   const result=await c.storage.from(BUCKET).download(rec.front_storage_path);
   if(result.error||!result.data)continue;
   const blob=await decrypt(result.data,key,rec,'front');
   if(request!==id||profile()!==p||records.get(rec.doc_type)?.id!==rec.id)return;
   showPreview(rec.doc_type,blob);
  }catch(_){/* Never leak encrypted/card data on a failed device-key lookup. */}
 }
}
async function refresh(){
 const id=++request,p=profile();
 // A temporary network/auth failure must not erase already loaded ID tiles.
 // But on a REAL profile switch, never show the old person's protected metadata.
 if(loadedProfile!==p){
  clearTilePreviews();records=new Map();loadedProfile=p;updateTiles();
 }
 try{
  const c=await authorized(p);
  const result=await c.from(TABLE).select(
   'id,profile_key,doc_type,kdf_salt,protection_mode,front_storage_path,back_storage_path,front_saved_at,back_saved_at')
   .eq('profile_key',p).limit(12);
  if(result.error)throw result.error;
  if(id!==request||p!==profile())return;
  // The cloud list has been verified; swap as a unit to avoid empty flashes.
  clearTilePreviews();
  records=new Map((result.data||[]).filter(x=>TYPES.includes(x.doc_type)).map(x=>[x.doc_type,x]));
  updateTiles();
  const notice=$('svIdNoticeV10');
  if(notice)notice.textContent=text(
    '🔐 Az igazolványok ellenőrzött felhőrekordjai betöltve.',
    '🔐 Verified private ID records loaded.');
  await loadTilePreviews(p,id,c);
  w.dispatchEvent(new CustomEvent('sho-valet-identity-ready',{detail:{profile:p}}));
 }catch(e){
  if(id!==request||p!==profile())return;
  // Preserve same-profile previously verified cards and their pins.
  const node=$('svIdNoticeV10');
  if(node)node.textContent='⚠️ '+human(e)+' '+
    text('Az elmentett igazolványok a felhőben maradnak. A kártyákat újraellenőrzés után töltjük be.',
         'Saved IDs remain in private cloud. Retry to load the card gallery.');
  updateTiles();
 }
}
function refreshPinButton(){
 const btn=$('svIdPinV13');if(!btn)return;
 btn.hidden=!item;
 if(!item)return;
 const api=w.SHO_VALET_SMART_ACCESS_V13;
 const pinned=api?.isPinned('identity',kind);
 btn.textContent=(pinned?'★ ':'☆ ')+text(
  pinned?'Kitűzés megszüntetése':'Kitűzés',
  pinned?'Remove pin':'Pin');
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
 $('svIdPasswordEnabledV12').checked=true;
 updatePasswordSwitch();
 if(item){
  const device=protectionMode(item)==='device';
  $('svIdUnlockPasswordLabelV12').hidden=device;
  $('svIdUnlockHintV12').textContent=device
   ?text('🔓 A kártya helyi titkosítási kulccsal nyílik meg ezen az eszközön.',
      '🔓 This card unlocks with the local device key.')
   :text('🔐 Jelszavas kártya: az előlap a csempén rejtve marad.',
      '🔐 Password-protected card: front thumbnail stays hidden.');
  $('svIdUnlockButtonV11').textContent=device
    ?text('🔓 Megnyitás ezen az eszközön','🔓 Open on this device')
    :text('🔓 Jelszavas feloldás','🔓 Unlock with password');
 }
 status('');
 renderDraft();
 refreshPinButton();
 $('svIdDialogV11').showModal();
 if(item&&protectionMode(item)==='device')void unlock();
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
 // One canonical optical frame for Identity, Health and Bank categories.
 const shared=w.SHO_VALET_OPTICAL_V16;
 if(shared?.capture){
  const originalKind=kind,originalProfile=storedProfile,originalItem=item;
  void shared.capture({title:label(kind),side:which,mode}).then(async blob=>{
   if(!blob||originalKind!==kind||originalProfile!==storedProfile||
      originalItem!==item||!$('svIdDialogV11')?.open)return;
   draft[which]=blob;
   if(item&&which==='back'&&activeKey)await saveBack();
   else{
    renderDraft();
    status(text('Kép a közös optikai keretből. Ellenőrizd a négy sarkot.',
     'Image fitted using the unified optical frame. Check all four corners.'));
   }
  });
  return;
 }
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
 const mode=$('svIdPasswordEnabledV12').checked?'password':'device';
 if(mode==='password'){
  if(password.length<8){status(human(Error('SHORT_PASS')),true);return}
  if(password!==$('svIdPassConfirmV11').value){
   status(text('A két titkosítási jelszó nem egyezik.','Encryption passphrases do not match.'),true);
   return;
  }
 }
 busy=true;$('svIdSaveV11').disabled=true;status(text('Titkosítás és privát feltöltés…','Encrypting and uploading…'));
 let c,rec,created=false,uploaded=[],deviceOwner='',deviceKeySaved=false;
 try{
  c=await authorized(p);if(item||records.has(type))throw Error('EXISTS');
  const uuid=w.crypto.randomUUID(),s=w.crypto.getRandomValues(new Uint8Array(16));
  const root=p+'/'+type+'/'+uuid+'/';
  rec={id:uuid,profile_key:p,doc_type:type,kdf_salt:b64(s),protection_mode:mode,
   front_storage_path:root+'front.enc',back_storage_path:root+'back.enc'};
  const key=mode==='password'?await derive(password,s):await deviceAESKey();
  const front=await encrypt(draft.front,key,rec,'front');
  const back=draft.back?await encrypt(draft.back,key,rec,'back'):null;
  if(p!==profile())throw Error('NO_ACCESS');
  if(mode==='device'){
   const auth=await c.auth.getUser();
   if(auth.error||!auth.data.user)throw Error('NO_LOGIN');
   deviceOwner=auth.data.user.id;
   await deviceKey('put',deviceOwner,uuid,key);
   deviceKeySaved=true;
  }
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
  // Show the actual front photo immediately after saving, only for this already
  // unlocked in-memory session. Reopening later requires the passphrase again.
  const savedAt=new Date().toISOString();
  item={...rec,front_saved_at:savedAt,back_saved_at:back?savedAt:null};
  records.set(type,item);activeKey=key;
  refreshPinButton();
  decrypted.front=url(draft.front);
  if(draft.back)decrypted.back=url(draft.back);
  $('svIdImageFrontV11').src=decrypted.front;
  if(decrypted.back)$('svIdImageBackV11').src=decrypted.back;
  $('svIdPassV11').value='';$('svIdPassConfirmV11').value='';
  $('svIdDraftV11').hidden=true;
  $('svIdUnlockV11').hidden=true;
  $('svIdViewV11').hidden=false;
  $('svIdAddBackV11').hidden=!!back;
  flipTo('front');zoomBy(0);
  // Password-protected IDs must NEVER expose front thumbnails, even when unlocked.
  if(mode==='device')showPreview(type,draft.front);
  await refresh();
  status(text('TADAAA! 🔐 Mentve. Koppints a kártyára a hátlapért.',
    'Saved encrypted. Tap the card for its back side.'));
 }catch(e){
  if(c&&created&&rec){
   if(uploaded.length)try{await c.storage.from(BUCKET).remove(uploaded)}catch(_){}
   try{await c.from(TABLE).delete().eq('id',rec.id).eq('profile_key',p)}catch(_){}
  }
  if(deviceKeySaved&&deviceOwner&&rec)
   try{await deviceKey('delete',deviceOwner,rec.id)}catch(_){}
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
function showPreview(tileType,photoBlob){
 const rec=records.get(tileType);
 // Defence in depth: a protected card cannot display a thumbnail.
 if(!rec||protectionMode(rec)!=='device'||!photoBlob||profile()!==rec.profile_key)return;
 const tile=d.querySelector('.sv-id-type-v10[data-id-type="'+tileType+'"]');
 if(!tile)return;
 removeTilePreview(tileType);
 const thumbnailURL=URL.createObjectURL(photoBlob);
 tileURLs.set(tileType,thumbnailURL);
 const img=make('img','sv-id-photo-v11');
 img.alt=text('Előlap előnézet','Front preview');
 img.src=thumbnailURL;
 tile.querySelector('svg')?.insertAdjacentElement('afterend',img);
 tile.classList.add('has-photo');
}
async function unlock(){
 if(!item||busy)return;
 const password=$('svIdUnlockPassV11').value;
 const mode=protectionMode(item),id=item.id,type=kind,p=storedProfile;
 if(mode==='password'&&password.length<8){status(human(Error('SHORT_PASS')),true);return}
 busy=true;$('svIdUnlockButtonV11').disabled=true;
 try{
  const c=await authorized(p);
  let key;
  if(mode==='device'){
   const auth=await c.auth.getUser();
   if(auth.error||!auth.data.user)throw Error('NO_LOGIN');
   key=await deviceKey('get',auth.data.user.id,id);
   if(!key||key.extractable||key.algorithm?.name!=='AES-GCM')throw Error('NO_DEVICE_KEY');
  }else{
   key=await derive(password,salt(item.kdf_salt));
  }
  const one=await c.storage.from(BUCKET).download(item.front_storage_path);
  if(one.error||!one.data)throw Error('BAD_PASS');
  const front=await decrypt(one.data,key,item,'front');
  let back=null;
  if(item.back_saved_at){
   const two=await c.storage.from(BUCKET).download(item.back_storage_path);
   if(two.error||!two.data)throw Error('BAD_PASS');
   back=await decrypt(two.data,key,item,'back');
  }
  if(profile()!==p||kind!==type||item?.id!==id||!$('svIdDialogV11').open)
   throw Error('NO_ACCESS');
  decrypted.front=url(front);
  if(back)decrypted.back=url(back);
  activeKey=key;
  $('svIdImageFrontV11').src=decrypted.front;
  if(decrypted.back)$('svIdImageBackV11').src=decrypted.back;
  $('svIdUnlockPassV11').value='';
  $('svIdUnlockV11').hidden=true;$('svIdViewV11').hidden=false;
  $('svIdAddBackV11').hidden=!!item.back_saved_at;
  flipTo('front');zoomBy(0);
  if(mode==='device')showPreview(type,front);
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
async function resolvePinnedRow(type,p){
 if(!TYPES.includes(type)||p!==profile())throw Error('NO_ACCESS');
 const c=await authorized(p);
 const {data,error}=await c.from(TABLE).select(
  'id,profile_key,doc_type,kdf_salt,protection_mode,front_storage_path,back_storage_path,front_saved_at,back_saved_at')
  .eq('profile_key',p).eq('doc_type',type).maybeSingle();
 if(error)throw error;
 if(p!==profile())throw Error('NO_ACCESS');
 return data||null;
}
async function resolvePinned(type,p){
 const rec=await resolvePinnedRow(type,p);
 return rec?{id:rec.id,doc_type:type,protection_mode:protectionMode(rec),
  title:label(type),subtitle:protectionMode(rec)==='password'
   ?text('🔒 Jelszóval védett igazolvány','🔒 Password-protected identity card')
   :text('🔓 Saját igazolvány · helyi kulcs','🔓 ID · device-encrypted')}:null;
}
async function previewPinned(type,p){
 const rec=await resolvePinnedRow(type,p);
 // Protected ID pictures are never decoded for Smart Access, even when unlocked.
 if(!rec||protectionMode(rec)!=='device'||!rec.front_saved_at)return null;
 const c=await authorized(p);
 const auth=await c.auth.getUser();
 if(auth.error||!auth.data.user)throw Error('NO_LOGIN');
 const key=await deviceKey('get',auth.data.user.id,rec.id);
 if(!key||key.extractable||key.algorithm?.name!=='AES-GCM')return null;
 const result=await c.storage.from(BUCKET).download(rec.front_storage_path);
 if(result.error||!result.data)throw result.error||Error('NO_ACCESS');
 const photo=await decrypt(result.data,key,rec,'front');
 if(p!==profile())throw Error('NO_ACCESS');
 return photo;
}
async function openPinned(type,p){
 const rec=await resolvePinnedRow(type,p);
 if(!rec)throw Error('NO_ACCESS');
 records.set(type,rec);updateTiles();
 open(type);
}
async function removeCard(){
 // Removing ciphertext needs account authorization, not the lost decryption key.
 if(!item||busy)return;
 if(!w.confirm(text('Végleg törlöd az igazolvány mindkét oldalát?','Permanently delete both ID sides?')))return;
 busy=true;try{
  const c=await authorized(storedProfile);
  const paths=[item.front_saved_at?item.front_storage_path:null,item.back_saved_at?item.back_storage_path:null].filter(Boolean);
  if(paths.length){
   const r=await c.storage.from(BUCKET).remove(paths);if(r.error)throw r.error;
  }
  const auth=await c.auth.getUser();
  if(auth.error||!auth.data.user)throw Error('NO_LOGIN');
  const r=await c.from(TABLE).delete().eq('id',item.id).eq('profile_key',storedProfile);
  if(r.error)throw r.error;
  if(protectionMode(item)==='device')
   try{await deviceKey('delete',auth.data.user.id,item.id)}catch(_){}
  close();await refresh();
 }catch(e){status(human(e),true)}finally{busy=false}
}
function init(){
 const parent=$('svIdentityPanelV10'),tpl=$('svIdTemplateV11');
 if(!parent||!tpl)return;
 function pilotNotice(){
  const node=$('svIdNoticeV10');
  if(node)node.textContent=text(
   '🔐 Igazolványok: opcionális jelszó (min. 8 karakter). Jelszóval rejtett, nélküle látható előlap.',
   '🔐 ID Cards: optional password (min. 8 characters). Protected cards hide their front thumbnail.');
 }
 w.addEventListener('sho-valet-filter-change',pilotNotice);
 if(!w.crypto?.subtle){
  $('svIdNoticeV10').textContent=text('Biztonságos titkosítás ezen az eszközön nem elérhető.','Secure encryption is unavailable on this device.');return;
 }
 const dialog=make('dialog','sv-id-dialog-v11');dialog.id='svIdDialogV11';
 dialog.append(tpl.content.cloneNode(true));d.body.append(dialog);
 for(const button of parent.querySelectorAll('[data-id-type]'))
  button.addEventListener('click',()=>open(button.dataset.idType));
 for(const button of parent.querySelectorAll('.sv-id-tile-pin-v14[data-pin-for]')){
  button.addEventListener('click',event=>{
   event.stopPropagation();
   const type=button.dataset.pinFor;
   if(button.disabled||!records.get(type)?.front_saved_at)return;
   w.SHO_VALET_SMART_ACCESS_V13?.toggle({source:'identity',id:type});
   updateTilePinButtons();
  });
 }
 $('svIdCloseV11').addEventListener('click',close);
 $('svIdPinV13').addEventListener('click',()=>{
  if(!item)return;
  w.SHO_VALET_SMART_ACCESS_V13?.toggle({source:'identity',id:kind});
  refreshPinButton();
 });
 w.addEventListener('sho-valet-pin-changed',()=>{
  refreshPinButton();
  updateTilePinButtons();
 });
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
 $('svIdPasswordEnabledV12').addEventListener('change',updatePasswordSwitch);
 updatePasswordSwitch();
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
 $('svIdDeleteLockedV12').addEventListener('click',()=>void removeCard());
 w.addEventListener('hh-family-profile-changed',()=>{close();clearTilePreviews();void refresh()});
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'){close();clearTilePreviews();void refresh()}});
 w.addEventListener('pagehide',()=>{close();clearTilePreviews()});
 d.addEventListener('visibilitychange',()=>{
  if(d.hidden){close();clearTilePreviews()}
  else void refresh();
 });
 pilotNotice();void refresh();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.SHO_VALET_IDENTITY_V13=Object.freeze({resolvePinned,previewPinned,openPinned});
w.SHO_VALET_ID_V11=Object.freeze({version:13,cardAspect:RATIO,encrypted:true,passwordOptional:true});
})(window,document);
