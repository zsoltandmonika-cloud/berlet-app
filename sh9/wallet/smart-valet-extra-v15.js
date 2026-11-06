/* SHO Smart Valet v16 · the same optical workflow as the Identity submodule.
 * Health photos and deliberately redacted bank photos encrypted before upload.
 * Unredacted bank photos, PAN, CVV, PIN and expiry are never persisted.
 */
(function(w,d){
'use strict';
const CFG=w.HH_CENTRAL_VAULT,TABLE='hh_valet_extra_cards_v15',ITER=310000;
const $=id=>d.getElementById(id),profile=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
const hu=()=>w.localStorage.getItem('sh9-language-v1')!=='en';
const t=(a,b)=>hu()?a:b;
const dom=(tag,cls,txt)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const validId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'');
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const encode=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.slice(i,i+8192));return btoa(s)};
let client,category='',rows=[],busy=false,active=null,profileAtOpen='',serial=0;
let files={front:null,back:null},viewURLs=[],previewURLs={front:'',back:''},flip='front',zoom=1;
/* Device-bound, non-extractable AES key. Mirrors the ID wallet's optional password mode. */
const EXTRA_KEY_DB='sho-valet-extra-device-v16',EXTRA_KEY_STORE='keys';
function extraDB(){
 return new Promise((resolve,reject)=>{
  if(!w.indexedDB)return reject(Error('NO_INDEXED_DB'));
  const r=w.indexedDB.open(EXTRA_KEY_DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(EXTRA_KEY_STORE))
   r.result.createObjectStore(EXTRA_KEY_STORE)};
  r.onsuccess=()=>resolve(r.result);
  r.onerror=r.onblocked=()=>reject(Error('NO_INDEXED_DB'));
 });
}
async function deviceKey(action,owner,id,value){
 const db=await extraDB();
 try{
  return await new Promise((resolve,reject)=>{
   const transaction=db.transaction(EXTRA_KEY_STORE,action==='get'?'readonly':'readwrite');
   const store=transaction.objectStore(EXTRA_KEY_STORE);
   const key=owner+'|'+id;
   const request=action==='put'?store.put(value,key):action==='delete'?store.delete(key):store.get(key);
   let outcome;
   request.onsuccess=()=>{outcome=request.result};
   request.onerror=()=>reject(Error('NO_INDEXED_DB'));
   transaction.onerror=transaction.onabort=()=>reject(Error('NO_INDEXED_DB'));
   transaction.oncomplete=()=>resolve(outcome);
  });
 }finally{db.close()}
}
async function newDeviceKey(){
 return w.crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function modeOf(rec){return rec?.protection_mode==='device'?'device':'password'}
function updateProtection(){
 const enabled=$('svExtraPasswordEnabledV16').checked;
 $('svExtraPasswordFieldsV16').hidden=!enabled;
 $('svExtraDeviceHintV16').hidden=enabled;
 if(!enabled){$('svExtraPassV15').value='';$('svExtraPassConfirmV15').value=''}
}
function release(){
 viewURLs.forEach(u=>URL.revokeObjectURL(u));viewURLs=[];
 for(const side of ['front','back']){
  if(previewURLs[side])URL.revokeObjectURL(previewURLs[side]);
  previewURLs[side]='';
 }
}
function status(message,bad){
 const el=$('svExtraStatusV15');if(el){el.textContent=message||'';el.dataset.error=bad?'1':'0'}
}
function modalStatus(message,bad){
 const el=$('svExtraDialogStatusV15');if(el){el.textContent=message||'';el.dataset.error=bad?'1':'0'}
}
async function authorized(p){
 if(!w.crypto?.subtle||!CFG?.enabled||!CFG?.supabaseUrl||!CFG?.publishableKey||!w.supabase?.createClient)
  throw Error('NOT_READY');
 if(!client)client=w.supabase.createClient(CFG.supabaseUrl,CFG.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const {data:{user}={},error}=await client.auth.getUser();
 if(error||!user?.id)throw Error('NO_LOGIN');
 const {data,error:accessError}=await client.from('hh_profile_access')
  .select('profile_key').eq('user_id',user.id).eq('profile_key',p).maybeSingle();
 if(accessError||!data||profile()!==p)throw Error('NO_ACCESS');
 return client;
}
function human(e){
 switch(e?.message){
 case 'NO_LOGIN':return t('Jelentkezz be a Family Guardba.','Sign in to Family Guard.');
 case 'NO_ACCESS':return t('Nincs hozzáférés ehhez a profilhoz.','No access to this profile.');
 case 'BAD_PASS':return t('Hibás jelszó vagy sérült titkosított kép.','Wrong password or damaged encrypted image.');
 case 'NO_DEVICE_KEY':return t('A helyi kulcs nincs meg ezen az eszközön. A kép nem állítható vissza.','Local key is missing. Image cannot be recovered.');
 case 'NO_INDEXED_DB':return t('Ehhez az eszközhöz nem használható jelszó nélküli mentés.','Device-bound storage unavailable.');
 case 'NOT_READY':return t('A biztonságos tároló nem érhető el.','Secure vault is not available.');
 default:return t('Nem sikerült a művelet. A korábban mentett kártyák változatlanok.','Operation failed. Existing cards were not modified.');
 }
}
async function keyFor(pass,salt){
 if(pass.length<8)throw Error('BAD_PASS');
 const material=await w.crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
 return w.crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},
  material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad=(rec,side)=>new TextEncoder().encode([rec.profile_key,rec.id,rec.category,side].join('|'));
async function encrypt(blob,key,rec,side){
 const iv=w.crypto.getRandomValues(new Uint8Array(12));
 const bytes=new Uint8Array(await w.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(rec,side)},key,await blob.arrayBuffer()));
 const result=new Uint8Array(12+bytes.length);result.set(iv);result.set(bytes,12);
 return encode(result);
}
async function decrypt(cipher,key,rec,side){
 const bytes=decode(cipher);if(bytes.length<29)throw Error('BAD_PASS');
 try{
  const content=await w.crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),
   additionalData:aad(rec,side)},key,bytes.slice(12));
  return new Blob([content],{type:'image/jpeg'});
 }catch(_){throw Error('BAD_PASS')}
}
async function imageBlob(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12000000||file.size<100)
  throw Error('INVALID_IMAGE');
 const u=URL.createObjectURL(file),im=new Image();
 try{
  im.src=u;await im.decode();
  if(im.naturalWidth<100||im.naturalHeight<60)throw Error('INVALID_IMAGE');
  const scale=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight));
  const c=d.createElement('canvas');c.width=Math.round(im.naturalWidth*scale);c.height=Math.round(im.naturalHeight*scale);
  const ctx=c.getContext('2d');if(!ctx)throw Error('INVALID_IMAGE');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(im,0,0,c.width,c.height);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.86));
  if(!blob||blob.size>1200000)throw Error('INVALID_IMAGE');
  return blob;
 }finally{URL.revokeObjectURL(u)}
}
function close(){
 const dialog=$('svExtraDialogV15');if(dialog?.open)dialog.close();
 release();files={front:null,back:null};active=null;profileAtOpen='';flip='front';
 $('svExtraFormV15').reset();$('svExtraPasswordOpenV15').value='';
 $('svExtraImageV15').removeAttribute('src');
 $('svExtraBackImageV16').removeAttribute('src');
 $('svExtraImageV15').hidden=true;
 $('svExtraLockedV15').hidden=true;
 $('svExtraViewerV15').hidden=true;
 $('svExtraEditV15').hidden=true;
}
function renderFormType(){
 const health=category==='health',pass=category==='pass';
 $('svExtraHealthFieldsV15').hidden=false; // the SAME two-sided scanner for both groups
 $('svExtraBankFieldsV15').hidden=health||pass;
 $('svExtraDraftTitleV15').textContent=pass?t('Új Budapest-bérlet','New Budapest pass'):health?t('Új egészségkártya','New health card'):t('Új bankkártya','New bank card');
 $('svExtraDialogV15').classList.toggle('sv-extra-pass-v17',pass);
 $('svExtraSafetyV15').textContent=pass?t('🚌 Az eredeti bérletfotót tároljuk. Ez nem hivatalos mobilbérlet. Az ellenőrzéshez az eredeti dokumentum vagy hivatalos alkalmazás szükséges.', '🚌 This is a saved pass photo, not an official mobile ticket. Use the original document or official app for checks.'):health?
  t('🔐 Mindkét oldal ugyanazzal az optikai kerettel készül. A mentett képek jelszóval titkosítottak.',
   '🔐 Both sides use the same optical frame. Photos are encrypted using your password.'):
  t('💳 A bankkártya fotózása opcionális. Mielőtt mentenénk, a számot, lejáratot és CVV-t kézzel ki kell takarni. Az eredeti fotó nem kerül tárolásra.',
   '💳 Bank photos are optional. Mask card number, expiry and CVV before saving. The original is never uploaded.');
}
function openAdd(){
 if(!['health','card','pass'].includes(category)||busy)return;
 close();active=null;profileAtOpen=profile();
 renderFormType();$('svExtraEditV15').hidden=false;
 $('svExtraPasswordEnabledV16').checked=true;updateProtection();
 for(const which of ['Front','Back']){
  $('svExtra'+which+'NameV15').textContent=t('＋ Hozzáadás','＋ Add');
  $('svExtra'+which+'PreviewV16').removeAttribute('src');
  $('svExtra'+which+'PreviewV16').hidden=true;
  $('svExtra'+which+'EmptyV16').hidden=false;
 }
 modalStatus('');
 $('svExtraDialogV15').showModal();
}
async function captureSide(which,mode){
 if(busy||active||!['front','back'].includes(which))return;
 const p=profileAtOpen,cat=category;
 const api=w.SHO_VALET_OPTICAL_V16;
 if(!api?.capture){
  modalStatus(t('A közös optikai keret nem töltődött be. Frissítsd az oldalt.',
   'Shared optical scanner unavailable. Reload the page.'),true);return;
 }
 const photo=await api.capture({
  title:cat==='pass'?t('Budapest-bérlet','Budapest pass'):cat==='health'?t('Egészségkártya','Health card'):t('Bankkártya','Bank card'),
  side:which,mode,bankRedact:cat==='card',preserveWhole:cat==='pass'
 });
 if(!photo||p!==profile()||p!==profileAtOpen||cat!==category||!$('svExtraDialogV15').open||active)return;
 const cap=which==='front'?'Front':'Back';
 if(previewURLs[which])URL.revokeObjectURL(previewURLs[which]);
 previewURLs[which]=URL.createObjectURL(photo);
 files[which]=photo;
 $('svExtra'+cap+'PreviewV16').src=previewURLs[which];
 $('svExtra'+cap+'PreviewV16').hidden=false;
 $('svExtra'+cap+'EmptyV16').hidden=true;
 $('svExtra'+cap+'NameV15').textContent=t('✓ Optikai keret OK','✓ Optical fit OK');
 modalStatus(t('Kép elfogadva. Folytathatod a másik oldallal.',
  'Photo accepted. Continue with the other side.'));
}
function renderGallery(){
 const host=$('svExtraCardsV15');host.replaceChildren();
 if(!rows.length){
  host.append(dom('p','sv-extra-empty-v15',t('Még nincs mentett kártya ebben a kategóriában.','No saved cards in this category yet.')));
  return;
 }
 for(const rec of rows){
  const wrap=dom('article','sv-extra-item-v15');
  const opener=dom('button','sv-extra-card-v15 sv-id-type-v10');
  opener.type='button';opener.setAttribute('aria-label',t('Kártya megnyitása: ','Open card: ')+rec.title);
  const symbol=dom('span','sv-extra-icon-v15',rec.category==='pass'?'🚌':rec.category==='health'?'🩺':'💳');
  const info=dom('span','sv-extra-info-v15');
  info.append(dom('strong',null,rec.title),dom('small',null,rec.category==='bank'?
   (rec.issuer||'')+(rec.last_four?' · •••• '+rec.last_four:''):
   t('🔐 Titkosított előlap / hátlap','🔐 Encrypted front / back')));
  opener.append(symbol,info);
  opener.addEventListener('click',()=>void openSaved(rec.id));
  const pin=dom('button','sv-extra-pin-v15 sv-id-tile-pin-v14');
  pin.type='button';
  const quick=w.SHO_VALET_SMART_ACCESS_V13;
  const pinned=!!quick?.isPinned('extra',rec.id);
  pin.textContent=(pinned?'★ ':'☆ ')+t(pinned?'Kitűzés megszüntetése':'Kitűzés',pinned?'Remove pin':'Pin');
  pin.setAttribute('aria-pressed',String(pinned));pin.disabled=!quick;
  pin.addEventListener('click',()=>{quick?.toggle({source:'extra',id:rec.id});renderGallery()});
  wrap.append(opener,pin);host.append(wrap);
 }
}
function renderCategory(){
 const on=['health','card','pass'].includes(category);
 $('svExtraPanelV15').hidden=!on;
 $('svCards').hidden=on&&category!=='pass';
 if(!on){return}
 $('svExtraTitleV15').textContent=category==='pass'?t('Saját Budapest-bérletek','My Budapest passes'):category==='health'?t('Egészségkártyák','Health cards'):t('Bankkártyák','Bank cards');
 $('svExtraAddV15').textContent=category==='pass'?t('＋ Budapest-bérlet hozzáadása','＋ Add Budapest pass'):category==='health'?t('＋ Új egészségkártya','＋ Add health card'):t('＋ Új bankkártya','＋ Add bank card');
 $('svExtraLegacyV17').hidden=category!=='pass';
 $('svExtraHintV15').textContent=category==='pass'?t('A bérlet teljes képét megőrizzük, a kódot nem vágjuk le. A régi Bérlet appból egy kattintással átmásolhatod.', 'Full photo is kept without cropping barcodes. You can copy from the legacy pass app.'):category==='health'?
  t('TAJ-kártya: az Igazolványok között található. Itt további egészségkártyákat tárolhatsz.',
   'Your TAJ card is under ID Cards. Store additional health cards here.'):
  t('Biztonságosan maszkolt kártyanézet, teljes kártyaszám és CVV nélkül.',
   'Safe masked card view without full card number or CVV.');
 const add=d.querySelector('.sv-add-panel');if(add)add.hidden=on||category==='identity';
 const vault=$('svVaultPrivateV7');if(vault&&on)vault.hidden=true;
}
async function refresh(){
 const p=profile(),cat=category,id=++serial;
 rows=[];renderGallery();
 if(!['health','card','pass'].includes(cat))return;
 status(t('Kártyák betöltése…','Loading cards…'));
 try{
  const c=await authorized(p);
  const {data,error}=await c.from(TABLE).select('id,profile_key,category,title,issuer,last_four,created_at')
   .eq('profile_key',p).eq('category',cat==='card'?'bank':cat).order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  if(id!==serial||cat!==category||p!==profile())return;
  rows=data||[];
  $('svCount').textContent=String(rows.length);
  renderGallery();status('');
  w.dispatchEvent(new CustomEvent('sho-valet-extra-ready',{detail:{profile:p}}));
 }catch(e){
  if(id!==serial)return;
  status(human(e),true);
  $('svCount').textContent='0';
 }
}
function togglePinButton(rec){
 const quick=w.SHO_VALET_SMART_ACCESS_V13;
 const button=$('svExtraPinDialogV15');const pinned=!!quick?.isPinned('extra',rec.id);
 button.textContent=(pinned?'★ ':'☆ ')+t(pinned?'Kitűzés megszüntetése':'Kitűzés',pinned?'Remove pin':'Pin');
 button.disabled=!quick;
}
async function loadRecord(id){
 const p=profile(),c=await authorized(p);
 const {data,error}=await c.from(TABLE).select('id,profile_key,category,title,issuer,last_four,front_cipher,back_cipher,kdf_salt,protection_mode')
  .eq('id',id).eq('profile_key',p).maybeSingle();
 if(error)throw error;
 if(p!==profile())throw Error('NO_ACCESS');
 return data;
}
function bankArt(rec){
 const art=$('svExtraBankArtV15');art.replaceChildren();
 art.append(dom('span','sv-extra-bank-logo-v15','✦ '+(rec.issuer||t('Bankkártya','Bank card'))));
 art.append(dom('span','sv-extra-bank-number-v15','••••  ••••  ••••  '+(rec.last_four||'••••')));
 art.append(dom('span','sv-extra-bank-owner-v15',rec.title));
}
async function openSaved(id){
 if(!validId(id)||busy)return;
 close();modalStatus('');
 try{
  const rec=await loadRecord(id);if(!rec)return;
  if(!['health','bank','pass'].includes(rec.category))return;
  active=rec;profileAtOpen=profile();
  $('svExtraDraftTitleV15').textContent=rec.title;
  $('svExtraEditV15').hidden=true;$('svExtraViewerV15').hidden=false;
  const bank=rec.category==='bank',pass=rec.category==='pass';
 $('svExtraDialogV15').classList.toggle('sv-extra-pass-v17',pass);
 $('svExtraInspectV17').hidden=!pass;
  $('svExtraBankArtV15').hidden=!bank;
  $('svExtraHealthViewerV15').hidden=bank;
  if(bank)bankArt(rec);
  if(rec.front_cipher){
   $('svExtraPhotoViewV16').hidden=true;
   $('svExtraBankArtV15').hidden=true;
   $('svExtraHealthViewerV15').hidden=false;
   $('svExtraLockedV15').hidden=false;$('svExtraImageV15').hidden=true;
   $('svExtraUnlockV15').textContent=t('🔓 Kártya megnyitása','🔓 Unlock card');
  }else{
   $('svExtraBankArtV15').hidden=false;
   $('svExtraHealthViewerV15').hidden=true;
  }
  togglePinButton(rec);
  $('svExtraDialogV15').showModal();
  if(rec.front_cipher&&modeOf(rec)==='device')void unlock();
 }catch(e){status(human(e),true)}
}
function renderPhoto(){
 if(!active?.front_cipher)return;
 if(flip==='back'&&!viewURLs[1])flip='front';
 const front=$('svExtraImageV15'),back=$('svExtraBackImageV16');
 front.src=viewURLs[0];front.hidden=false;
 if(viewURLs[1])back.src=viewURLs[1];else back.removeAttribute('src');
 $('svExtraLockedV15').hidden=true;
 $('svExtraFlipV15').classList.toggle('is-back',flip==='back');
 $('svExtraZoomFrameV16').style.transform='scale('+zoom+')';
 for(const b of d.querySelectorAll('#svExtraSideSwitchV16 [data-side]')){
  const on=b.dataset.side===flip;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
  b.disabled=b.dataset.side==='back'&&!viewURLs[1];
 }
 $('svExtraZoomLabelV15').textContent=Math.round(zoom*100)+'%';
}
async function unlock(){
 const rec=active,p=profileAtOpen,pass=$('svExtraPasswordOpenV15').value;
 if(!rec||!rec.front_cipher||busy)return;
 const mode=modeOf(rec);
 if(mode==='password'&&pass.length<8){
  modalStatus(t('Legalább 8 karakteres jelszót adj meg.','Enter a password of at least 8 characters.'),true);return
 }
 busy=true;$('svExtraUnlockV15').disabled=true;
 try{
  const c=await authorized(p);
  let key;
  if(mode==='device'){
   const auth=await c.auth.getUser();
   if(auth.error||!auth.data?.user?.id)throw Error('NO_LOGIN');
   key=await deviceKey('get',auth.data.user.id,rec.id);
   if(!key||key.extractable||key.algorithm?.name!=='AES-GCM')throw Error('NO_DEVICE_KEY');
  }else key=await keyFor(pass,decode(rec.kdf_salt));
  const first=await decrypt(rec.front_cipher,key,rec,'front');
  const second=rec.back_cipher?await decrypt(rec.back_cipher,key,rec,'back'):null;
  if(profile()!==p||active?.id!==rec.id||!$('svExtraDialogV15').open)throw Error('NO_ACCESS');
  release();viewURLs.push(URL.createObjectURL(first));
  if(second)viewURLs.push(URL.createObjectURL(second));
  $('svExtraPasswordOpenV15').value='';flip='front';zoom=1;
  $('svExtraPhotoViewV16').hidden=false;
  renderPhoto();modalStatus(t('Kártya feloldva. A hátlaphoz használd a fordítást.','Card unlocked. Flip to see its back.'));
 }catch(e){modalStatus(human(e),true)}
 finally{busy=false;$('svExtraUnlockV15').disabled=false}
}
async function save(e){
 e.preventDefault();if(busy||!['health','card','pass'].includes(category)||active)return;
 const p=profileAtOpen,cat=category==='card'?'bank':category;
 const title=$('svExtraTitleInputV15').value.trim().slice(0,120);
 if(!title){modalStatus(t('Add meg a kártya nevét.','Enter a card name.'),true);return}
 const rec={id:w.crypto.randomUUID(),profile_key:p,category:cat,title,issuer:null,last_four:null,front_cipher:null,back_cipher:null,kdf_salt:null};
 busy=true;$('svExtraSaveV15').disabled=true;
 let deviceOwner='';
 try{
  const c=await authorized(p);
  if(cat==='pass')rec.issuer='BKK';
  if(cat==='bank'){
   rec.issuer=$('svExtraIssuerV15').value.trim().slice(0,100)||null;
   const last=$('svExtraLast4V15').value.trim();
   if(last&&!/^[0-9]{4}$/.test(last))throw Error('LAST4');
   rec.last_four=last||null;
  }
  if(files.back&&!files.front)throw Error('NO_FRONT');
  if(cat==='health'&&!files.front)throw Error('NO_FRONT');
  if(cat==='pass'&&(!files.front||!files.back))throw Error('NO_BOTH');
  if(files.front){
   const mode=$('svExtraPasswordEnabledV16').checked?'password':'device';
   rec.protection_mode=mode;
   const salt=w.crypto.getRandomValues(new Uint8Array(16));
   const pass=$('svExtraPassV15').value;
   if(mode==='password'&&(pass.length<8||pass!==$('svExtraPassConfirmV15').value))
    throw Error('PASS');
   const key=mode==='password'?await keyFor(pass,salt):await newDeviceKey();
   rec.kdf_salt=encode(salt);
   const front=await imageBlob(files.front);
   rec.front_cipher=await encrypt(front,key,rec,'front');
   if(files.back){
    const back=await imageBlob(files.back);
    rec.back_cipher=await encrypt(back,key,rec,'back');
   }
   if(mode==='device'){
    const auth=await c.auth.getUser();
    if(auth.error||!auth.data?.user?.id)throw Error('NO_LOGIN');
    deviceOwner=auth.data.user.id;
    await deviceKey('put',deviceOwner,rec.id,key);
   }
  }
  if(p!==profile()||profileAtOpen!==p||!$('svExtraDialogV15').open||
   (category==='card'?'bank':category)!==cat)throw Error('NO_ACCESS');
  const {error}=await c.from(TABLE).insert(rec);if(error)throw error;
  close();await refresh();
  status(t('TADAAA! 🎉 Kártya biztonságosan mentve.','TADAAA! 🎉 Card saved securely.'));
 }catch(err){
  if(deviceOwner)try{await deviceKey('delete',deviceOwner,rec.id)}catch(_){}
  modalStatus(err?.message==='NO_BOTH'?t('A Budapest-bérlet mindkét oldalát add hozzá.','Add both sides of the Budapest pass.'):
   err?.message==='NO_FRONT'?t('Válassz előlapfotót a közös optikai kerettel.','Choose a front photo with the shared optical scanner.'):
   err?.message==='PASS'?t('Legalább 8 karakteres, egyező jelszavak szükségesek.','Passwords must match and contain at least 8 characters.'):
   err?.message==='LAST4'?t('Az utolsó négy számjegy pontosan 4 számjegy legyen.','Last four must be exactly four digits.'):
   err?.message==='INVALID_IMAGE'?t('JPG, PNG vagy WebP kép szükséges, legfeljebb 12 MB.','Use a JPG, PNG or WebP image under 12 MB.'):
   human(err),true);
 }finally{busy=false;$('svExtraSaveV15').disabled=false}
}
async function remove(){
 if(!active||busy)return;
 if(!w.confirm(t('Véglegesen törlöd ezt a kártyát?','Permanently delete this card?')))return;
 const id=active.id,p=profileAtOpen;busy=true;
 try{
  const c=await authorized(p);
  const {error}=await c.from(TABLE).delete().eq('id',id).eq('profile_key',p);
  if(error)throw error;
  if(modeOf(active)==='device'){
   const auth=await c.auth.getUser();
   if(!auth.error&&auth.data?.user?.id)
    try{await deviceKey('delete',auth.data.user.id,id)}catch(_){}
  }
  if(w.SHO_VALET_SMART_ACCESS_V13?.isPinned('extra',id))
   w.SHO_VALET_SMART_ACCESS_V13.clear();
  close();await refresh();
 }catch(e){modalStatus(human(e),true)}
 finally{busy=false}
}
async function resolvePinned(id,p){
 if(!validId(id)||p!==profile())throw Error('NO_ACCESS');
 const c=await authorized(p);
 const {data,error}=await c.from(TABLE).select('id,profile_key,category,title,issuer,last_four,protection_mode')
  .eq('id',id).eq('profile_key',p).maybeSingle();
 if(error)throw error;
 if(p!==profile())throw Error('NO_ACCESS');
 return data?{...data,protection_mode:modeOf(data),
  subtitle:data.category==='health'?t('🔒 Titkosított egészségkártya','🔒 Encrypted health card'):
   t('💳 '+(data.issuer||'')+(data.last_four?' · •••• '+data.last_four:''),'💳 '+(data.issuer||'')+(data.last_four?' · •••• '+data.last_four:''))}:null;
}
async function previewPinned(id,p){
 if(!validId(id)||p!==profile())throw Error('NO_ACCESS');
 const rec=await loadRecord(id);
 if(!rec||modeOf(rec)!=='device'||!rec.front_cipher)return null;
 const c=await authorized(p),auth=await c.auth.getUser();
 if(auth.error||!auth.data?.user?.id)throw Error('NO_LOGIN');
 const key=await deviceKey('get',auth.data.user.id,id);
 if(!key||key.extractable||key.algorithm?.name!=='AES-GCM')return null;
 const image=await decrypt(rec.front_cipher,key,rec,'front');
 if(p!==profile())throw Error('NO_ACCESS');
 return image;
}
async function openPinned(id,p){
 const pinned=await resolvePinned(id,p);
 if(!pinned)return;
 category=pinned.category==='bank'?'card':pinned.category;
 renderCategory();await openSaved(id);
}
function init(){
 if(!$('svIdentityPanelV10'))return;
 const panel=dom('section','sv-extra-panel-v15');panel.id='svExtraPanelV15';panel.hidden=true;
 panel.innerHTML='<div class="sv-extra-top-v15"><div><small>SHO · SECURE CARDS</small><h3 id="svExtraTitleV15"></h3></div><span>🔒</span></div>'+
 '<p id="svExtraHintV15"></p><button type="button" id="svExtraAddV15" class="sv-extra-primary-v15"></button>'+
 '<p id="svExtraStatusV15" role="status" aria-live="polite"></p><div id="svExtraCardsV15" class="sv-extra-list-v15"></div>';
 $('svIdentityPanelV10').insertAdjacentElement('afterend',panel);
 const dialog=dom('dialog','sv-id-dialog-v11 sv-extra-dialog-v15');dialog.id='svExtraDialogV15';
 dialog.append(d.getElementById('svExtraUnifiedTemplateV16').content.cloneNode(true));
 d.body.append(dialog);
 $('svExtraAddV15').addEventListener('click',openAdd);
 $('svExtraCloseV15').addEventListener('click',close);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 $('svExtraFormV15').addEventListener('submit',e=>void save(e));
 $('svExtraPasswordEnabledV16').addEventListener('change',updateProtection);
 updateProtection();
 for(const side of ['Front','Back']){
  $('svExtraAdd'+side+'V15').addEventListener('click',()=>void captureSide(side.toLowerCase(),'file'));
  $('svExtraCapture'+side+'V15').addEventListener('click',()=>void captureSide(side.toLowerCase(),'camera'));
 }
 for(const button of dialog.querySelectorAll('#svExtraSideSwitchV16 [data-side]'))
  button.addEventListener('click',()=>{flip=button.dataset.side;zoom=1;renderPhoto()});
 $('svExtraUnlockV15').addEventListener('click',()=>void unlock());
 $('svExtraFlipV15').addEventListener('click',()=>{flip=flip==='front'?'back':'front';zoom=1;renderPhoto()});
 $('svExtraZoomOutV15').addEventListener('click',()=>{zoom=Math.max(1,zoom-.2);renderPhoto()});
 $('svExtraZoomInV15').addEventListener('click',()=>{zoom=Math.min(3,zoom+.2);renderPhoto()});
 $('svExtraDeleteV15').addEventListener('click',()=>void remove());
 $('svExtraPinDialogV15').addEventListener('click',()=>{
  if(!active)return;
  w.SHO_VALET_SMART_ACCESS_V13?.toggle({source:'extra',id:active.id});
  togglePinButton(active);renderGallery();
 });
 w.addEventListener('sho-valet-filter-change',e=>{
  close();category=['health','card'].includes(e.detail?.kind)?e.detail.kind:'';
  renderCategory();void refresh();
 });
 w.addEventListener('sho-valet-private-ready',()=>{
  if(['health','card'].includes(category)){
   const vault=$('svVaultPrivateV7');if(vault)vault.hidden=true;
   $('svCount').textContent=String(rows.length);
  }
 });
 w.addEventListener('sho-valet-pin-changed',renderGallery);
 const profileChange=()=>{++serial;close();rows=[];renderGallery();void refresh()};
 w.addEventListener('hh-family-profile-changed',profileChange);
 w.addEventListener('sh9:profilechange',profileChange);
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'||e.key==='sh9-language-v1'){profileChange();renderCategory()}});
 w.addEventListener('sh9:languagechange',()=>{renderCategory();renderGallery()});
 w.addEventListener('pagehide',()=>{++serial;close()});
 d.addEventListener('visibilitychange',()=>{if(d.hidden){++serial;close()}});
 renderCategory();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.SHO_VALET_EXTRA_V15=Object.freeze({resolvePinned,openPinned,previewPinned});
})(window,document);