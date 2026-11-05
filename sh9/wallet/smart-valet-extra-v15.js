/* SHO Smart Valet v15 · profile-scoped health cards and masked bank cards.
 * Health photos encrypted in browser with per-card AES-GCM/PBKDF2 passphrase.
 * Bank records NEVER store PAN, CVV, PIN, expiry, magnetic data, or bank photos.
 * The database holds encrypted health photographs and RLS-protected metadata.
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
let files={front:null,back:null},viewURLs=[],flip='front',zoom=1;
function release(){viewURLs.forEach(u=>URL.revokeObjectURL(u));viewURLs=[]}
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
 $('svExtraImageV15').hidden=true;
 $('svExtraLockedV15').hidden=true;
 $('svExtraViewerV15').hidden=true;
 $('svExtraEditV15').hidden=true;
}
function renderFormType(){
 const health=category==='health';
 $('svExtraHealthFieldsV15').hidden=!health;
 $('svExtraBankFieldsV15').hidden=health;
 $('svExtraDraftTitleV15').textContent=health?t('Új egészségkártya','New health card'):t('Új bankkártya','New bank card');
 $('svExtraSafetyV15').textContent=health?
  t('🔐 A fotók csak a jelszavaddal feloldható, titkosított formában mentődnek. A jelszó elvesztése esetén nem állíthatók vissza.',
   '🔐 Photos are stored encrypted and only your password can unlock them. Lost passwords cannot be recovered.'):
  t('💳 Biztonságos kártyaazonosító: csak a bank neve, egy becenév és legfeljebb az utolsó 4 számjegy. Nem fizetésre szolgál.',
   '💳 Identification only: issuer, nickname, and optional last four digits. Not a payment method.');
}
function openAdd(){
 if(!['health','card'].includes(category)||busy)return;
 close();active=null;profileAtOpen=profile();
 renderFormType();$('svExtraEditV15').hidden=false;
 $('svExtraAddFrontV15').textContent=t('📷 Előlap · fotó / fájl','📷 Front · camera / file');
 $('svExtraAddBackV15').textContent=t('📷 Hátlap · fotó / fájl','📷 Back · camera / file');
 modalStatus('');
 $('svExtraDialogV15').showModal();
}
function renderGallery(){
 const host=$('svExtraCardsV15');host.replaceChildren();
 if(!rows.length){
  host.append(dom('p','sv-extra-empty-v15',t('Még nincs mentett kártya ebben a kategóriában.','No saved cards in this category yet.')));
  return;
 }
 for(const rec of rows){
  const wrap=dom('article','sv-extra-item-v15');
  const opener=dom('button','sv-extra-card-v15');
  opener.type='button';opener.setAttribute('aria-label',t('Kártya megnyitása: ','Open card: ')+rec.title);
  const symbol=dom('span','sv-extra-icon-v15',rec.category==='health'?'🩺':'💳');
  const info=dom('span','sv-extra-info-v15');
  info.append(dom('strong',null,rec.title),dom('small',null,rec.category==='bank'?
   (rec.issuer||'')+(rec.last_four?' · •••• '+rec.last_four:''):
   t('🔐 Titkosított előlap / hátlap','🔐 Encrypted front / back')));
  opener.append(symbol,info);
  opener.addEventListener('click',()=>void openSaved(rec.id));
  const pin=dom('button','sv-extra-pin-v15');
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
 const on=category==='health'||category==='card';
 $('svExtraPanelV15').hidden=!on;
 $('svCards').hidden=on;
 if(!on){return}
 $('svExtraTitleV15').textContent=category==='health'?t('Egészségkártyák','Health cards'):t('Bankkártyák','Bank cards');
 $('svExtraAddV15').textContent=category==='health'?t('＋ Új egészségkártya','＋ Add health card'):t('＋ Új bankkártya','＋ Add bank card');
 $('svExtraHintV15').textContent=category==='health'?
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
 if(!['health','card'].includes(cat))return;
 status(t('Kártyák betöltése…','Loading cards…'));
 try{
  const c=await authorized(p);
  const {data,error}=await c.from(TABLE).select('id,profile_key,category,title,issuer,last_four,created_at')
   .eq('profile_key',p).eq('category',cat==='card'?'bank':'health').order('created_at',{ascending:false}).limit(100);
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
 const {data,error}=await c.from(TABLE).select('id,profile_key,category,title,issuer,last_four,front_cipher,back_cipher,kdf_salt')
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
  if(!['health','bank'].includes(rec.category))return;
  active=rec;profileAtOpen=profile();
  $('svExtraDraftTitleV15').textContent=rec.title;
  $('svExtraEditV15').hidden=true;$('svExtraViewerV15').hidden=false;
  const bank=rec.category==='bank';
  $('svExtraBankArtV15').hidden=!bank;
  $('svExtraHealthViewerV15').hidden=bank;
  if(bank)bankArt(rec);
  else{
   $('svExtraLockedV15').hidden=false;$('svExtraImageV15').hidden=true;
   $('svExtraUnlockV15').textContent=t('🔓 Kártya megnyitása','🔓 Unlock card');
  }
  togglePinButton(rec);
  $('svExtraDialogV15').showModal();
 }catch(e){status(human(e),true)}
}
function renderPhoto(){
 if(!active||active.category!=='health')return;
 if(flip==='back'&&!viewURLs[1])flip='front';
 const im=$('svExtraImageV15');
 im.src=flip==='back'?viewURLs[1]:viewURLs[0];
 im.hidden=false;$('svExtraLockedV15').hidden=true;
 im.style.transform='scale('+zoom+')';
 $('svExtraFlipV15').hidden=!viewURLs[1];
 $('svExtraFlipV15').textContent=flip==='front'?t('↻ Hátlap','↻ Back'):t('↻ Előlap','↻ Front');
 $('svExtraZoomLabelV15').textContent=Math.round(zoom*100)+'%';
}
async function unlock(){
 const rec=active,p=profileAtOpen,pass=$('svExtraPasswordOpenV15').value;
 if(!rec||rec.category!=='health'||busy)return;
 if(pass.length<8){modalStatus(t('Legalább 8 karakteres jelszót adj meg.','Enter a password of at least 8 characters.'),true);return}
 busy=true;$('svExtraUnlockV15').disabled=true;
 try{
  await authorized(p);
  const key=await keyFor(pass,decode(rec.kdf_salt));
  const first=await decrypt(rec.front_cipher,key,rec,'front');
  const second=rec.back_cipher?await decrypt(rec.back_cipher,key,rec,'back'):null;
  if(profile()!==p||active?.id!==rec.id||!$('svExtraDialogV15').open)throw Error('NO_ACCESS');
  release();viewURLs.push(URL.createObjectURL(first));
  if(second)viewURLs.push(URL.createObjectURL(second));
  $('svExtraPasswordOpenV15').value='';flip='front';zoom=1;
  renderPhoto();modalStatus(t('Kártya feloldva. A hátlaphoz használd a fordítást.','Card unlocked. Flip to see its back.'));
 }catch(e){modalStatus(human(e),true)}
 finally{busy=false;$('svExtraUnlockV15').disabled=false}
}
async function save(e){
 e.preventDefault();if(busy||!['health','card'].includes(category)||active)return;
 const p=profileAtOpen,cat=category==='card'?'bank':'health';
 const title=$('svExtraTitleInputV15').value.trim().slice(0,120);
 if(!title){modalStatus(t('Add meg a kártya nevét.','Enter a card name.'),true);return}
 const rec={id:w.crypto.randomUUID(),profile_key:p,category:cat,title,issuer:null,last_four:null,front_cipher:null,back_cipher:null,kdf_salt:null};
 busy=true;$('svExtraSaveV15').disabled=true;
 try{
  const c=await authorized(p);
  if(cat==='bank'){
   rec.issuer=$('svExtraIssuerV15').value.trim().slice(0,100)||null;
   const last=$('svExtraLast4V15').value.trim();
   if(last&&!/^[0-9]{4}$/.test(last))throw Error('LAST4');
   rec.last_four=last||null;
  }else{
   if(!files.front)throw Error('NO_FRONT');
   const pass=$('svExtraPassV15').value;
   if(pass.length<8||pass!==$('svExtraPassConfirmV15').value)throw Error('PASS');
   const salt=w.crypto.getRandomValues(new Uint8Array(16)),key=await keyFor(pass,salt);
   rec.kdf_salt=encode(salt);
   const front=await imageBlob(files.front);
   rec.front_cipher=await encrypt(front,key,rec,'front');
   if(files.back){
    const back=await imageBlob(files.back);
    rec.back_cipher=await encrypt(back,key,rec,'back');
   }
  }
  if(p!==profile()||(category==='card'?'bank':'health')!==cat)throw Error('NO_ACCESS');
  const {error}=await c.from(TABLE).insert(rec);if(error)throw error;
  close();await refresh();
  status(t('TADAAA! 🎉 Kártya biztonságosan mentve.','TADAAA! 🎉 Card saved securely.'));
 }catch(err){
  modalStatus(err?.message==='NO_FRONT'?t('Válassz előlapfotót.','Choose a front photo.'):
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
  if(w.SHO_VALET_SMART_ACCESS_V13?.isPinned('extra',id))
   w.SHO_VALET_SMART_ACCESS_V13.clear();
  close();await refresh();
 }catch(e){modalStatus(human(e),true)}
 finally{busy=false}
}
async function resolvePinned(id,p){
 if(!validId(id)||p!==profile())throw Error('NO_ACCESS');
 const c=await authorized(p);
 const {data,error}=await c.from(TABLE).select('id,profile_key,category,title,issuer,last_four')
  .eq('id',id).eq('profile_key',p).maybeSingle();
 if(error)throw error;
 if(p!==profile())throw Error('NO_ACCESS');
 return data?{...data,protection_mode:data.category==='health'?'password':'masked',
  subtitle:data.category==='health'?t('🔒 Titkosított egészségkártya','🔒 Encrypted health card'):
   t('💳 '+(data.issuer||'')+(data.last_four?' · •••• '+data.last_four:''),'💳 '+(data.issuer||'')+(data.last_four?' · •••• '+data.last_four:''))}:null;
}
async function openPinned(id,p){
 if(!await resolvePinned(id,p))return;
 category=(await resolvePinned(id,p)).category==='bank'?'card':'health';
 renderCategory();await openSaved(id);
}
function init(){
 if(!$('svIdentityPanelV10'))return;
 const panel=dom('section','sv-extra-panel-v15');panel.id='svExtraPanelV15';panel.hidden=true;
 panel.innerHTML='<div class="sv-extra-top-v15"><div><small>SHO · SECURE CARDS</small><h3 id="svExtraTitleV15"></h3></div><span>🔒</span></div>'+
 '<p id="svExtraHintV15"></p><button type="button" id="svExtraAddV15" class="sv-extra-primary-v15"></button>'+
 '<p id="svExtraStatusV15" role="status" aria-live="polite"></p><div id="svExtraCardsV15" class="sv-extra-list-v15"></div>';
 $('svIdentityPanelV10').insertAdjacentElement('afterend',panel);
 const dialog=dom('dialog','sv-extra-dialog-v15');dialog.id='svExtraDialogV15';
 dialog.innerHTML='<div class="sv-extra-modal-v15"><div class="sv-extra-modal-head-v15"><div><small>SHO · SMART VALET</small><h2 id="svExtraDraftTitleV15"></h2></div><button type="button" id="svExtraCloseV15" aria-label="Bezárás">×</button></div>'+
 '<p id="svExtraDialogStatusV15" role="status" aria-live="polite"></p>'+
 '<form id="svExtraFormV15"><section id="svExtraEditV15"><label>Kártya neve / Card name<input id="svExtraTitleInputV15" maxlength="120" required autocomplete="off" placeholder="Pl. Egészségpénztár / OTP bank"></label>'+
 '<div id="svExtraHealthFieldsV15"><div class="sv-extra-photo-grid-v15"><label>ELŐLAP · FRONT<input type="file" id="svExtraFrontV15" accept="image/jpeg,image/png,image/webp" hidden><button type="button" id="svExtraAddFrontV15"></button><small id="svExtraFrontNameV15"></small></label>'+
 '<label>HÁTLAP · BACK<input type="file" id="svExtraBackV15" accept="image/jpeg,image/png,image/webp" hidden><button type="button" id="svExtraAddBackV15"></button><small id="svExtraBackNameV15"></small></label></div>'+
 '<label>🔐 Titkosítási jelszó (min. 8 karakter)<input id="svExtraPassV15" type="password" minlength="8" autocomplete="new-password"></label>'+
 '<label>Jelszó megerősítése<input id="svExtraPassConfirmV15" type="password" minlength="8" autocomplete="new-password"></label></div>'+
 '<div id="svExtraBankFieldsV15"><label>Bank / Kártyakibocsátó<input id="svExtraIssuerV15" maxlength="100" autocomplete="off" placeholder="Pl. OTP, Erste"></label>'+
 '<label>Utolsó 4 számjegy (opcionális)<input id="svExtraLast4V15" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="1234"></label></div>'+
 '<p id="svExtraSafetyV15" class="sv-extra-safety-v15"></p>'+
 '<button type="submit" id="svExtraSaveV15" class="sv-extra-primary-v15">🔒 Mentés</button></section></form>'+
 '<section id="svExtraViewerV15" hidden><div id="svExtraBankArtV15" class="sv-extra-bank-art-v15" hidden></div>'+
 '<div id="svExtraHealthViewerV15"><div id="svExtraLockedV15"><p>🔐 Jelszavas egészségkártya / Encrypted health card</p><input type="password" id="svExtraPasswordOpenV15" autocomplete="off" placeholder="Feloldó jelszó / Password"><button type="button" id="svExtraUnlockV15" class="sv-extra-primary-v15"></button></div>'+
 '<div class="sv-extra-photo-view-v15"><img id="svExtraImageV15" alt="Titkosított kártyafotó" hidden></div>'+
 '<div class="sv-extra-view-actions-v15"><button type="button" id="svExtraFlipV15" hidden>↻ Hátlap</button><button type="button" id="svExtraZoomOutV15">−</button><span id="svExtraZoomLabelV15">100%</span><button type="button" id="svExtraZoomInV15">+</button></div></div>'+
 '<div class="sv-extra-view-actions-v15"><button type="button" id="svExtraPinDialogV15">☆ Kitűzés</button><button type="button" id="svExtraDeleteV15" class="sv-extra-delete-v15">🗑 Törlés</button></div></section></div>';
 d.body.append(dialog);
 $('svExtraAddV15').addEventListener('click',openAdd);
 $('svExtraCloseV15').addEventListener('click',close);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});
 $('svExtraFormV15').addEventListener('submit',e=>void save(e));
 for(const side of ['Front','Back']){
  const id='svExtra'+side+'V15',button=$('svExtraAdd'+side+'V15');
  button.addEventListener('click',()=>$(id).click());
  $(id).addEventListener('change',e=>{
   const f=e.target.files?.[0]||null;e.target.value='';
   const which=side.toLowerCase();files[which]=f;
   $('svExtra'+side+'NameV15').textContent=f?f.name:t('Nincs kiválasztva','Not selected');
  });
 }
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
 renderCategory();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.SHO_VALET_EXTRA_V15=Object.freeze({resolvePinned,openPinned,previewPinned:async()=>null});
})(window,document);