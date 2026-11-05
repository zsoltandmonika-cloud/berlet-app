/* SHO Smart Valet Phase 2 v7 · genuine ticket/pass/generic scan originals.
 * Authenticated Supabase Storage only. No public URLs, dynamic QR fabrication,
 * bank-card, identity-card, licence, passport or medical-record uploads.
 * Isolated from the existing fully-working premium demo / Golden dock.
 */
(function(w,d){
'use strict';
const CFG=w.HH_CENTRAL_VAULT, BUCKET='hh-smart-valet-private', TABLE='hh_valet_items';
const MAX_BYTES=15000000, ALLOWED=Object.freeze({
 pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'
});
const $=id=>d.getElementById(id), pkey=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
let client=null,current=null,currentUrl='',busy=false,rows=[],requested=0;
const i18n={
 hu:{add:'＋ Hozzáadás',choose:'Jegy, bérlet vagy dokumentum hozzáadása',
 title:'Megnevezés',type:'Kategória',ticket:'Jegy',pass:'Bérlet',document:'Egyéb dokumentum',
 pick:'📁 Fájl kiválasztása',camera:'📷 Kamera / beolvasás',save:'🔒 Biztonságos mentés',cancel:'Mégse',
 login:'A privát tárcához jelentkezz be a Family Guardban.',openLogin:'🔐 Family Guard bejelentkezés',
 invalid:'PDF, JPG, PNG vagy WebP fájl szükséges, legfeljebb 15 MB.',missing:'Válassz egy fájlt és adj meg egy nevet.',
 saveBusy:'Biztonságos feltöltés folyamatban…',saved:'TADAAA! 🎉 Az eredeti fájl privát tárolóban elmentve.',
 loaded:'Privát jegyek és dokumentumok',empty:'Ehhez a profilhoz még nincs elmentett fájl.',
 authFail:'Ehhez a profilhoz nincs hozzáférés.',error:'Nem sikerült a művelet. Az eredeti fájl változatlan.',
 open:'Megnyitás',remove:'Törlés',delSure:'Véglegesen törlöd ezt a fájlt?',sensitive:'Bankkártyát, személyi igazolványt, útlevelet, jogosítványt vagy orvosi leletet most ne tölts fel.',
 note:'Csak a saját feltöltött eredeti fájlok jelennek meg. A dinamikus belépőkódhoz az eredeti szolgáltató alkalmazása szükséges.',
 unknown:'A fájl nem nyitható meg.',preview:'Előnézet · eredeti fájl'
 },
 en:{add:'＋ Add',choose:'Add ticket, pass or document',title:'Name',type:'Category',
 ticket:'Ticket',pass:'Pass',document:'Other document',pick:'📁 Choose file',
 camera:'📷 Camera / scan',save:'🔒 Save privately',cancel:'Cancel',
 login:'Sign in to Family Guard to access your private wallet.',openLogin:'🔐 Family Guard sign-in',
 invalid:'PDF, JPG, PNG or WebP required, up to 15 MB.',missing:'Choose a file and enter a name.',
 saveBusy:'Uploading securely…',saved:'TADAAA! 🎉 Original file saved privately.',
 loaded:'Private tickets and documents',empty:'No files saved for this profile yet.',
 authFail:'This profile is not authorized.',error:'The operation failed. Original file unchanged.',
 open:'Open',remove:'Delete',delSure:'Permanently delete this file?',
 sensitive:'Do not upload credit cards, IDs, passports, driving licences or medical records yet.',
 note:'Only your own original files are shown. Dynamic entry codes require the provider app.',
 unknown:'Cannot open file.',preview:'Preview · original file'
 }};
const t=k=>(i18n[lang()]||i18n.hu)[k]||k;
function lang(){return w.localStorage.getItem('sh9-language-v1')==='en'?'en':'hu'}
function message(s,fail){const el=$('svVaultStatusV7');if(el){el.textContent=s;el.dataset.fail=fail?'1':'0'}}
function ensureClient(){
 if(client)return client;
 if(!CFG?.enabled||!CFG.supabaseUrl||!CFG.publishableKey||!w.supabase?.createClient)
  throw Error('Secure Vault is not available.');
 client=w.supabase.createClient(CFG.supabaseUrl,CFG.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,
   autoRefreshToken:false,detectSessionInUrl:false}
 });
 return client;
}
async function authorized(profile){
 const c=ensureClient();
 const {data:{user}={},error:authError}=await c.auth.getUser();
 if(authError||!user)throw Error('LOGIN_REQUIRED');
 const {data,error}=await c.from('hh_profile_access').select('profile_key')
  .eq('user_id',user.id).eq('profile_key',profile).maybeSingle();
 if(error||!data)throw Error('ACCESS_DENIED');
 return c;
}
function ext(file){return String(file?.name||'').split('.').pop().toLowerCase()}
async function fileInfo(file){
 if(!file||!Number.isInteger(file.size)||file.size<1||file.size>MAX_BYTES)throw Error('BAD_FILE');
 const e=ext(file),mime=ALLOWED[e];
 if(!mime)throw Error('BAD_FILE');
 if(file.type&&file.type!==mime&&file.type!=='application/octet-stream')throw Error('BAD_FILE');
 const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const ascii=Array.from(head).map(x=>String.fromCharCode(x)).join('');
 const valid=e==='pdf'?ascii.startsWith('%PDF-'):
  e==='png'?head.length>=8&&head.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':
  (e==='jpg'||e==='jpeg')?head.length>=3&&head[0]===255&&head[1]===216&&head[2]===255:
  e==='webp'?ascii.slice(0,4)==='RIFF'&&ascii.slice(8,12)==='WEBP':false;
 if(!valid)throw Error('BAD_FILE');
 const digest=await w.crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 const sha256=Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
 return {ext:e,mime,size:file.size,sha256};
}
function clean(v,max=160){return String(v||'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,max)}
function make(tag,klass,text){
 const e=d.createElement(tag);if(klass)e.className=klass;if(text!=null)e.textContent=String(text);return e;
}
function stateClose(){
 const picker=$('svVaultFormV7');if(picker)picker.hidden=true;
 if(currentUrl){URL.revokeObjectURL(currentUrl);currentUrl=''}
 current=null;
 $('svVaultPickedV7').textContent='';
 $('svVaultFormV7')?.reset();
}
function showPreview(file){
 if(currentUrl)URL.revokeObjectURL(currentUrl);
 currentUrl=URL.createObjectURL(file);
 const preview=$('svVaultPreviewV7');preview.replaceChildren();
 if(file.type.startsWith('image/')){
  const im=make('img');im.src=currentUrl;im.alt=t('preview');preview.append(im);
 }else{
  const label=make('span','sv-vault-file-icon-v7','📄 '+clean(file.name,80));
  preview.append(label);
 }
 $('svVaultPickedV7').textContent=clean(file.name,130)+' · '+Math.ceil(file.size/1024)+' KB';
}
async function chosen(file){
 try{
  await fileInfo(file);
  current=file;showPreview(file);
  const name=$('svVaultTitleV7');if(!name.value)name.value=clean(file.name.replace(/\.[^.]+$/,''),160);
  message('');
 }catch(_){current=null;message(t('invalid'),true)}
}
function openSheet(){
 $('svVaultFormV7').hidden=false;
 $('svVaultTitleV7').focus();
}
function makeCard(item){
 const el=make('article','sv-vault-item-v7');
 const details=make('div','sv-vault-item-copy-v7');
 details.append(make('strong',null,item.title),make('small',null,item.category+' · '+item.file_name));
 const actions=make('div','sv-vault-item-actions-v7');
 const open=make('button',null,t('open'));open.type='button';
 open.addEventListener('click',()=>openItem(item));
 const del=make('button','sv-vault-danger-v7',t('remove'));del.type='button';
 del.addEventListener('click',()=>deleteItem(item));
 actions.append(open,del);el.append(details,actions);return el;
}
async function refresh(){
 const call=++requested,profile=pkey(),list=$('svVaultPrivateListV7');
 if(!list)return;
 list.replaceChildren();message('');
 try{
  const c=await authorized(profile);
  const {data,error}=await c.from(TABLE).select('id,title,category,file_name,mime_type,storage_path,created_at')
   .eq('profile_key',profile).not('uploaded_at','is',null).order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  if(call!==requested||profile!==pkey())return;
  rows=data||[];
  if(!rows.length)list.append(make('p','sv-vault-empty-v7',t('empty')));
  else rows.forEach(item=>list.append(makeCard(item)));
  message('');
 }catch(e){
  if(call!==requested)return;
  rows=[];
  message(e.message==='LOGIN_REQUIRED'?t('login'):e.message==='ACCESS_DENIED'?t('authFail'):t('error'),true);
  if(e.message==='LOGIN_REQUIRED')list.append(make('a','sv-vault-login-v7',t('openLogin')));
  const link=list.querySelector('a');if(link)link.href='../../healthhub/guardian/';
 }
}
async function save(e){
 e.preventDefault();if(busy)return;
 const profile=pkey(),f=current,title=clean($('svVaultTitleV7').value);
 if(!f||!title){message(t('missing'),true);return}
 let info;try{info=await fileInfo(f)}catch(_){message(t('invalid'),true);return}
 busy=true;$('svVaultSubmitV7').disabled=true;message(t('saveBusy'));
 let id=null,c=null,path=null;
 try{
  c=await authorized(profile);
  id=w.crypto.randomUUID();path=profile+'/'+id+'/original.'+info.ext;
  const payload={id,profile_key:profile,category:$('svVaultCategoryV7').value,
   title,file_name:clean(f.name,180),file_ext:info.ext,mime_type:info.mime,
   byte_size:info.size,sha256:info.sha256,storage_path:path};
  const created=await c.from(TABLE).insert(payload).select('id').single();
  if(created.error)throw created.error;
  const uploaded=await c.storage.from(BUCKET).upload(path,f,{contentType:info.mime,upsert:false});
  if(uploaded.error)throw uploaded.error;
  const stamped=await c.from(TABLE).update({uploaded_at:new Date().toISOString()})
   .eq('id',id).eq('profile_key',profile).select('id').single();
  if(stamped.error)throw stamped.error;
  // Preserve original untouched; only update the list after server acknowledgment.
  stateClose();message(t('saved'));await refresh();
  message(t('saved'));
 }catch(err){
  // Only clean up the newly allocated item. Never touch pre-existing tickets.
  if(c&&id){
   if(path)try{await c.storage.from(BUCKET).remove([path])}catch(_){}
   try{await c.from(TABLE).delete().eq('id',id)}catch(_){}
  }
  message(err.code==='23505'?'Ez a fájl már megtalálható a privát tárcában.':
   err.message==='LOGIN_REQUIRED'?t('login'):err.message==='ACCESS_DENIED'?t('authFail'):t('error'),true);
 }finally{busy=false;$('svVaultSubmitV7').disabled=false}
}
async function openItem(item){
 try{
  const c=await authorized(pkey());
  if(!rows.some(r=>r.id===item.id))throw Error('ACCESS_DENIED');
  const {data,error}=await c.storage.from(BUCKET).download(item.storage_path);
  if(error||!data)throw error||Error('FILE_UNAVAILABLE');
  const blob=new Blob([data],{type:item.mime_type});
  const url=URL.createObjectURL(blob);
  const viewer=$('svVaultViewerV7');viewer.replaceChildren();
  const bar=make('div','sv-vault-viewer-actions-v7');
  const name=make('strong',null,clean(item.title,160));
  const download=make('a','sv-vault-download-v7','⬇ '+(lang()==='hu'?'Letöltés':'Download'));
  download.href=url;download.download=clean(item.file_name,180);
  const close=make('button',null,'×');close.type='button';
  function end(){viewer.hidden=true;viewer.replaceChildren();URL.revokeObjectURL(url)}
  close.setAttribute('aria-label',t('cancel'));close.addEventListener('click',end);
  bar.append(name,download,close);viewer.append(bar);
  if(item.mime_type==='application/pdf'){
   const frame=make('iframe','sv-vault-pdf-v7');
   frame.src=url;frame.title=t('preview');
   // Browser PDF viewer is optional; the original download link always remains.
   viewer.append(frame);
  }else{
   const image=make('img','sv-vault-photo-v7');
   image.src=url;image.alt=t('preview');viewer.append(image);
  }
  viewer.hidden=false;viewer.scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){message(e.message==='ACCESS_DENIED'?t('authFail'):t('unknown'),true)}
}
async function deleteItem(item){
 if(!w.confirm(t('delSure')))return;
 try{
  const c=await authorized(pkey());
  const {error:removed}=await c.storage.from(BUCKET).remove([item.storage_path]);if(removed)throw removed;
  const {error}=await c.from(TABLE).delete().eq('id',item.id).eq('profile_key',pkey());
  if(error)throw error;
  await refresh();
 }catch(_){message(t('error'),true)}
}
function init(){
 const add=$('svAdd');if(!add)return;
 const section=make('section','sv-vault-private-v7');section.id='svVaultPrivateV7';
 section.innerHTML='<div class="sv-vault-head-v7"><h2 id="svVaultHeaderV7"></h2><span>🔒 PRIVATE VAULT</span></div>'+
  '<p id="svVaultStatusV7" role="status" aria-live="polite"></p>'+
  '<div id="svVaultPrivateListV7"></div>';
 add.disabled=false;add.removeAttribute('aria-describedby');add.textContent=t('add');
 add.addEventListener('click',openSheet);
 const form=make('form','sv-vault-form-v7');form.id='svVaultFormV7';form.hidden=true;
 form.innerHTML='<h2 id="svVaultFormTitleV7"></h2><p id="svVaultCautionV7"></p>'+
 '<label><span id="svVaultNameLabelV7"></span><input id="svVaultTitleV7" required maxlength="160" autocomplete="off"></label>'+
 '<label><span id="svVaultTypeLabelV7"></span><select id="svVaultCategoryV7">'+
 '<option value="ticket" id="svVaultTicketV7"></option><option value="pass" id="svVaultPassV7"></option>'+
 '<option value="document" id="svVaultDocumentV7"></option></select></label>'+
 '<div class="sv-vault-buttons-v7"><button type="button" id="svVaultPickV7"></button>'+
 '<button type="button" id="svVaultCameraV7"></button></div>'+
 '<input type="file" id="svVaultFileV7" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" hidden>'+
 '<input type="file" id="svVaultCameraInputV7" accept="image/*" capture="environment" hidden>'+
 '<div id="svVaultPickedV7"></div><div id="svVaultPreviewV7"></div>'+
 '<div class="sv-vault-buttons-v7"><button type="submit" id="svVaultSubmitV7"></button>'+
 '<button type="button" id="svVaultCancelV7"></button></div>';
 section.append(form);
 const viewer=make('section','sv-vault-viewer-v7');viewer.id='svVaultViewerV7';viewer.hidden=true;
 section.append(viewer);
 const addPanel=add.closest('.sv-add-panel');addPanel.insertAdjacentElement('afterend',section);
 $('svVaultPickV7').addEventListener('click',()=>$('svVaultFileV7').click());
 $('svVaultCameraV7').addEventListener('click',()=>$('svVaultCameraInputV7').click());
 for(const id of ['svVaultFileV7','svVaultCameraInputV7'])
  $(id).addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';if(f)chosen(f)});
 $('svVaultCancelV7').addEventListener('click',stateClose);
 form.addEventListener('submit',save);
 function retranslate(){
  const vals={svVaultHeaderV7:'loaded',svVaultFormTitleV7:'choose',svVaultCautionV7:'sensitive',
   svVaultNameLabelV7:'title',svVaultTypeLabelV7:'type',svVaultTicketV7:'ticket',
   svVaultPassV7:'pass',svVaultDocumentV7:'document',svVaultPickV7:'pick',
   svVaultCameraV7:'camera',svVaultSubmitV7:'save',svVaultCancelV7:'cancel'};
  for(const [id,k] of Object.entries(vals))$(id).textContent=t(k);
  add.textContent=t('add');
 }
 retranslate();refresh();
 w.addEventListener('sh9:languagechange',()=>{retranslate();refresh()});
 w.addEventListener('hh-family-profile-changed',()=>{stateClose();refresh()});
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'||e.key==='sh9-language-v1'){stateClose();retranslate();refresh()}});
 w.addEventListener('pageshow',()=>refresh());
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
else init();
w.SH9_VALET_PRIVATE_V7={refresh,validate:fileInfo,allowedTypes:Object.values(ALLOWED)};
})(window,document);
