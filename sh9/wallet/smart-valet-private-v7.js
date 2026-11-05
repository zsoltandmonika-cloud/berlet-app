/* SHO Smart Valet Phase 2 v7 · genuine ticket/pass/generic scan originals.
 * Authenticated Supabase Storage only. No public URLs, dynamic QR fabrication,
 * bank-card, identity-card, licence, passport or medical-record uploads.
 * Isolated from the existing fully-working premium demo / Golden dock.
 */
(function(w,d){
'use strict';
// v8 general availability: each original operation still requires Supabase
// authenticated user + profile ACL + private storage RLS.
const CFG=w.HH_CENTRAL_VAULT, BUCKET='hh-smart-valet-private', TABLE='hh_valet_items';
const MAX_BYTES=15000000, ALLOWED=Object.freeze({
 pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'
});
const $=id=>d.getElementById(id), pkey=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
let client=null,current=null,currentUrl='',busy=false,rows=[],requested=0;
let activeCategory='all',loyaltyLimit=12,loyaltySerial=0;
const loyaltyURLs=new Set();
const i18n={
 hu:{add:'＋ Hozzáadás',choose:'Jegy, bérlet vagy dokumentum hozzáadása',
 title:'Megnevezés',type:'Kategória',ticket:'Jegy',pass:'Bérlet',document:'Egyéb dokumentum',
 loyalty:'Klubkártya',loyaltyTitle:'Klubkártyáid',loyaltyAdd:'＋ Klubkártya hozzáadása',
 coupon:'Kupon',couponTitle:'Kuponjaid',couponAdd:'＋ Kupon hozzáadása',
 couponEmpty:'Még nincs kuponod. Adj hozzá egy eredeti kuponképet vagy PDF-et.',
 couponScan:'Az eredeti kupont és annak QR- vagy vonalkódját nagyíthatod. A kód érvényességét a kibocsátó határozza meg.',
 couponOpen:'Kupon megnyitása',couponMore:'További kuponok',
 loyaltyEmpty:'Még nincs klubkártyád. Add hozzá az elsőt fényképről vagy képfájlból.',
 loyaltyScan:'A kártya eredeti QR- vagy vonalkódját teljes képernyőn, nagyítva mutatjuk.',
 loyaltyOpen:'Kártya és kód megnyitása',loyaltyMore:'További kártyák',
 pick:'📁 Fájl kiválasztása',camera:'📷 Kamera / beolvasás',save:'🔒 Biztonságos mentés',cancel:'Mégse',
 login:'A privát tárcához jelentkezz be a Family Guardban.',openLogin:'🔐 Family Guard bejelentkezés',
 invalid:'PDF, JPG, PNG vagy WebP fájl szükséges, legfeljebb 15 MB.',missing:'Válassz egy fájlt és adj meg egy nevet.',
 saveBusy:'Biztonságos feltöltés folyamatban…',saved:'TADAAA! 🎉 Az eredeti fájl privát tárolóban elmentve.',
 loaded:'Privát jegyek és dokumentumok',empty:'Ehhez a profilhoz még nincs elmentett fájl.',
 authFail:'Ehhez a profilhoz nincs hozzáférés.',error:'Nem sikerült a művelet. Az eredeti fájl változatlan.',
 open:'Megnyitás',pin:'Kitűzés',unpin:'Kitűzés megszüntetése',remove:'Törlés',delSure:'Véglegesen törlöd ezt a fájlt?',sensitive:'Bankkártyát, személyi igazolványt, útlevelet, jogosítványt vagy orvosi leletet most ne tölts fel.',
 note:'Csak a saját feltöltött eredeti fájlok jelennek meg. A dinamikus belépőkódhoz az eredeti szolgáltató alkalmazása szükséges.',
 unknown:'A fájl nem nyitható meg.',preview:'Előnézet · eredeti fájl'
 },
 en:{add:'＋ Add',choose:'Add ticket, pass or document',title:'Name',type:'Category',
 ticket:'Ticket',pass:'Pass',document:'Other document',
 loyalty:'Club card',loyaltyTitle:'Your club cards',loyaltyAdd:'＋ Add club card',
 coupon:'Coupon',couponTitle:'Your coupons',couponAdd:'＋ Add coupon',
 couponEmpty:'No coupons yet. Add an original coupon image or PDF.',
 couponScan:'View and zoom the original coupon and barcode/QR. The issuer determines validity.',
 couponOpen:'Open coupon',couponMore:'More coupons',
 loyaltyEmpty:'No club cards yet. Add one using a photo or image file.',
 loyaltyScan:'We show the original QR/barcode image full-screen, with zoom.',
 loyaltyOpen:'Open card and code',loyaltyMore:'More cards',pick:'📁 Choose file',
 camera:'📷 Camera / scan',save:'🔒 Save privately',cancel:'Cancel',
 login:'Sign in to Family Guard to access your private wallet.',openLogin:'🔐 Family Guard sign-in',
 invalid:'PDF, JPG, PNG or WebP required, up to 15 MB.',missing:'Choose a file and enter a name.',
 saveBusy:'Uploading securely…',saved:'TADAAA! 🎉 Original file saved privately.',
 loaded:'Private tickets and documents',empty:'No files saved for this profile yet.',
 authFail:'This profile is not authorized.',error:'The operation failed. Original file unchanged.',
 open:'Open',pin:'Pin',unpin:'Remove pin',remove:'Delete',delSure:'Permanently delete this file?',
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
 if(['loyalty','coupon','identity'].includes(activeCategory)&&$('svVaultPrivateV7'))
  $('svVaultPrivateV7').hidden=true;
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
function openSheet(category){
 if(activeCategory==='identity')return; // Official identity documents require a separate, stricter vault.
 const form=$('svVaultFormV7');
 form.hidden=false;
 if($('svVaultPrivateV7'))$('svVaultPrivateV7').hidden=false;
 const retail=['loyalty','coupon'];
 const chosen=retail.includes(category)?category:retail.includes(activeCategory)?activeCategory:null;
 if(chosen)$('svVaultCategoryV7').value=chosen;
 $('svVaultTitleV7').focus();
 form.scrollIntoView({block:'center',behavior:'smooth'});
}
function pinLabel(id){
 const api=w.SHO_VALET_SMART_ACCESS_V13;
 return (api?.isPinned('private',id)?'★ '+t('unpin'):'☆ '+t('pin'));
}
function pinButton(item){
 const button=make('button','sv-quick-pin-v13',pinLabel(item.id));
 button.type='button';button.dataset.pinSource='private';button.dataset.pinId=item.id;
 button.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  w.SHO_VALET_SMART_ACCESS_V13?.toggle({source:'private',id:item.id});
  button.textContent=pinLabel(item.id);
 });
 return button;
}
function refreshPinLabels(){
 for(const btn of d.querySelectorAll('[data-pin-source="private"][data-pin-id]')){
  btn.textContent=pinLabel(btn.dataset.pinId);
 }
}
function makeCard(item){
 const el=make('article','sv-vault-item-v7');
 const details=make('div','sv-vault-item-copy-v7');
 details.append(make('strong',null,item.title),make('small',null,item.category+' · '+item.file_name));
 if(item.source_module==='my_trips'&&/^tp-[A-Za-z0-9-]{1,67}$/.test(item.source_context_id||'')){
  const origin=make('a','sv-vault-origin-v8','↗ '+(lang()==='hu'?'Utazásaim · eredeti útvonal':'My Trips · original trip'));
  origin.href='../smart-travel/my-trips/?valetTrip='+encodeURIComponent(item.source_context_id);
  details.append(origin);
 }
 const actions=make('div','sv-vault-item-actions-v7');
 const open=make('button',null,t('open'));open.type='button';
 open.addEventListener('click',()=>openItem(item));
 const del=make('button','sv-vault-danger-v7',t('remove'));del.type='button';
 del.addEventListener('click',()=>deleteItem(item));
 actions.append(open,pinButton(item),del);el.append(details,actions);return el;
}

function discardLoyaltyImages(){
 ++loyaltySerial;
 for(const url of loyaltyURLs)try{URL.revokeObjectURL(url)}catch(_){}
 loyaltyURLs.clear();
}
async function renderLoyalty(profile,client,call){
 const panel=$('svLoyaltyPanelV9'),feed=$('svLoyaltyScrollerV9');
 if(!panel||!feed)return;
 discardLoyaltyImages();
 const category=activeCategory;
 panel.hidden=!['loyalty','coupon'].includes(category);
 if(panel.hidden)return;
 const coupon=category==='coupon';
 $('svLoyaltyTitleV9').textContent=t(coupon?'couponTitle':'loyaltyTitle');
 $('svLoyaltyTipV9').textContent=t(coupon?'couponScan':'loyaltyScan');
 $('svLoyaltyAddV9').textContent=t(coupon?'couponAdd':'loyaltyAdd');
 const serial=loyaltySerial;
 feed.replaceChildren();
 const cards=rows.filter(x=>x.category===category);
 $('svLoyaltyCountV9').textContent=String(cards.length);
 $('svCount').textContent=String(cards.length);
 if(!cards.length){feed.append(make('p','sv-vault-empty-v7',t(coupon?'couponEmpty':'loyaltyEmpty')));return}
 for(const item of cards.slice(0,loyaltyLimit)){
  const button=make('button','sv-loyalty-card-v9');
  button.type='button';button.setAttribute('aria-label',t(coupon?'couponOpen':'loyaltyOpen')+': '+item.title);
  const art=make('div','sv-loyalty-art-v9');
  const image=item.mime_type.startsWith('image/')?make('img'):null;
  if(image){image.alt='';image.loading='lazy';art.append(image)}
  else art.append(make('span','sv-loyalty-pdf-v9','📄 PDF'));
  const copy=make('span','sv-loyalty-copy-v9');
  copy.append(make('strong',null,item.title),make('small',null,item.file_name));
  const action=make('span','sv-loyalty-action-v9','▣');
  button.append(art,copy,action);
  const wrap=make('div','sv-loyalty-pin-wrap-v13');
  wrap.append(button,pinButton(item));feed.append(wrap);
  button.addEventListener('click',()=>openItem(item));
  if(image){
   // Never expose public image URLs. Previews are downloaded via authenticated RLS Storage.
   client.storage.from(BUCKET).download(item.storage_path).then(({data,error})=>{
    if(error||!data||serial!==loyaltySerial||call!==requested||
       activeCategory!==category||pkey()!==profile||!button.isConnected)return;
    const url=URL.createObjectURL(data);loyaltyURLs.add(url);image.src=url;
   }).catch(()=>{});
  }
 }
 const more=$('svLoyaltyMoreV9');
 more.hidden=cards.length<=loyaltyLimit;
 more.textContent=t(coupon?'couponMore':'loyaltyMore');
}
function setCategory(kind){
 activeCategory=['all','loyalty','coupon','identity','health','card','ticket','pass','document'].includes(kind)?kind:'all';
 loyaltyLimit=12;
 if(activeCategory==='identity')stateClose(); // No identity originals enter the generic upload form.
 // This legacy demo display remains separate from real private documents.
 // Its filter state drives the secured original file list too.
 refresh();
}
async function refresh(){
 const call=++requested,profile=pkey(),list=$('svVaultPrivateListV7');
 if(!list)return;
 list.replaceChildren();message('');
 if(activeCategory==='identity'){
  discardLoyaltyImages();
  const gallery=$('svLoyaltyPanelV9'),vault=$('svVaultPrivateV7');
  if(gallery)gallery.hidden=true;
  if(vault)vault.hidden=true;
  list.hidden=true;
  $('svCount').textContent='0';
  return;
 }
 try{
  const c=await authorized(profile);
  const {data,error}=await c.from(TABLE).select('id,title,category,file_name,mime_type,storage_path,created_at,source_module,source_context_id')
   .eq('profile_key',profile).not('uploaded_at','is',null).order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  if(call!==requested||profile!==pkey())return;
  rows=data||[];
  const section=$('svVaultPrivateV7');
  if(section)section.hidden=['loyalty','coupon'].includes(activeCategory)&&$('svVaultFormV7').hidden;
  const visible=activeCategory==='all'?rows:rows.filter(item=>item.category===activeCategory);
  if(['loyalty','coupon'].includes(activeCategory)){
   list.hidden=true;
  }else{
   list.hidden=false;
   if(!visible.length)list.append(make('p','sv-vault-empty-v7',t('empty')));
   else visible.forEach(item=>list.append(makeCard(item)));
  }
  await renderLoyalty(profile,c,call);
  message('');
  w.dispatchEvent(new CustomEvent('sho-valet-private-ready',{detail:{profile}}));
 }catch(e){
  if(call!==requested)return;
  rows=[];
  discardLoyaltyImages();
  const feed=$('svLoyaltyScrollerV9'),panel=$('svLoyaltyPanelV9');
  if(feed)feed.replaceChildren();
  if(panel&&['loyalty','coupon'].includes(activeCategory)){
   panel.hidden=false;
   if(feed)feed.append(make('p','sv-vault-empty-v7',
    e.message==='LOGIN_REQUIRED'?t('login'):e.message==='ACCESS_DENIED'?t('authFail'):t('error')));
   $('svLoyaltyCountV9').textContent='0';
   $('svCount').textContent='0';
  }
  message(e.message==='LOGIN_REQUIRED'?t('login'):e.message==='ACCESS_DENIED'?t('authFail'):t('error'),true);
  if(e.message==='LOGIN_REQUIRED')list.append(make('a','sv-vault-login-v7',t('openLogin')));
  const link=list.querySelector('a');if(link)link.href='../../healthhub/guardian/';
 }
}
async function save(e){
 e.preventDefault();if(busy)return;
 const profile=pkey(),f=current,title=clean($('svVaultTitleV7').value);
 if(activeCategory==='identity')return; // secure identity handling is not implemented
 if(!f||!title){message(t('missing'),true);return}
 let info;try{info=await fileInfo(f)}catch(_){message(t('invalid'),true);return}
 busy=true;$('svVaultSubmitV7').disabled=true;message(t('saveBusy'));
 let id=null,c=null,path=null;
 try{
  c=await authorized(profile);
  id=w.crypto.randomUUID();path=profile+'/'+id+'/original.'+info.ext;
  const category=$('svVaultCategoryV7').value;
  if(!['ticket','pass','document','loyalty','coupon'].includes(category))throw Error('INVALID_CATEGORY');
  const payload={id,profile_key:profile,category,
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
  if(!rows.some(r=>r.id===item.id)){
   // A Smart Access shortcut can open a stored card even if another category is
   // selected, but only after a fresh authenticated owner/profile RLS read.
   const verified=await resolvePinned(item.id,pkey());
   if(!verified)throw Error('ACCESS_DENIED');
   item=verified;
  }
  message('🔐 '+(lang()==='hu'?'Eredeti dokumentum megnyitása…':'Opening original document…'));
  const {data,error}=await c.storage.from(BUCKET).download(item.storage_path);
  if(error||!data)throw error||Error('FILE_UNAVAILABLE');
  const reader=w.SHO_PRIVATE_DOCUMENT_READER_V1;
  if(!reader?.open)throw Error('READER_NOT_READY');
  // Preserve the exact private Blob bytes; PDF.js renders it in memory.
  const quick=w.SHO_VALET_SMART_ACCESS_V13;
  const pin=quick?{
   label:()=>pinLabel(item.id),
   toggle:()=>quick.toggle({source:'private',id:item.id})
  }:null;
  await reader.open(data,item.file_name,{mime:item.mime_type,pin});
  message('');
 }catch(e){
  if(e?.message==='ACCESS_DENIED')message(t('authFail'),true);
  else if(e?.message==='READER_NOT_READY')message('⚠️ Belső PDF-olvasó nem töltődött be. Frissítsd az oldalt.',true);
  else message('⚠️ '+t('unknown')+(e?.status?' · '+e.status:''),true);
 }
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
async function resolvePinned(id,profile){
 if(profile!==pkey()||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))throw Error('ACCESS_DENIED');
 const c=await authorized(profile);
 const {data,error}=await c.from(TABLE)
  .select('id,title,category,file_name,mime_type,storage_path,created_at,source_module,source_context_id')
  .eq('id',id).eq('profile_key',profile).not('uploaded_at','is',null).maybeSingle();
 if(error)throw error;
 if(!data)return null;
 if(profile!==pkey())throw Error('ACCESS_DENIED');
 return{...data,subtitle:t(data.category==='loyalty'?'loyalty':
  data.category==='coupon'?'coupon':data.category==='ticket'?'ticket':
  data.category==='pass'?'pass':'document')+' · '+data.file_name};
}
async function previewPinned(id,profile){
 const entry=await resolvePinned(id,profile);
 if(!entry||!entry.mime_type?.startsWith('image/'))return null;
 const c=await authorized(profile);
 const {data,error}=await c.storage.from(BUCKET).download(entry.storage_path);
 if(error)throw error;
 if(pkey()!==profile)throw Error('ACCESS_DENIED');
 return data;
}
async function openPinned(id,profile){
 const entry=await resolvePinned(id,profile);
 if(!entry)throw Error('ACCESS_DENIED');
 return openItem(entry);
}
function init(){
 const add=$('svAdd');if(!add)return;
 // Category selection may happen before auth/CDN dependencies load.
 activeCategory=['all','loyalty','coupon','identity','health','card','ticket','pass','document']
  .includes(w.SHO_VALET_ACTIVE_CATEGORY_V9)?w.SHO_VALET_ACTIVE_CATEGORY_V9:'all';
 const host=$('svCards');
 const panel=make('section','sv-loyalty-panel-v9');panel.id='svLoyaltyPanelV9';panel.hidden=true;
 panel.innerHTML='<div class="sv-loyalty-head-v9"><div><span class="sv-loyalty-kicker-v9">SHO · SMART CARDS</span><h3 id="svLoyaltyTitleV9"></h3></div><span class="sv-loyalty-count-v9" id="svLoyaltyCountV9">0</span></div>'+
 '<p id="svLoyaltyTipV9" class="sv-loyalty-tip-v9"></p>'+
 '<button type="button" class="sv-loyalty-add-v9" id="svLoyaltyAddV9"></button>'+
 '<div id="svLoyaltyScrollerV9" class="sv-loyalty-scroller-v9" aria-live="polite"></div>'+
 '<button type="button" class="sv-loyalty-more-v9" id="svLoyaltyMoreV9" hidden></button>';
 host.insertAdjacentElement('afterend',panel);
 $('svLoyaltyAddV9').addEventListener('click',()=>openSheet(activeCategory));
 $('svLoyaltyMoreV9').addEventListener('click',()=>{loyaltyLimit+=12;refresh()});
 const section=make('section','sv-vault-private-v7');section.id='svVaultPrivateV7';
 section.innerHTML='<div class="sv-vault-head-v7"><h2 id="svVaultHeaderV7"></h2><span>🔒 PRIVATE VAULT</span></div>'+
  '<p id="svVaultStatusV7" role="status" aria-live="polite"></p>'+
  '<div id="svVaultPrivateListV7"></div>';
 add.disabled=false;add.removeAttribute('aria-describedby');add.textContent=t('add');
 add.addEventListener('click',openSheet);
 const addTile=add.closest('.sv-add-panel');
 if(addTile){
  addTile.classList.add('sv-add-panel-live-v8');
  addTile.addEventListener('click',event=>{
   // The actual Hozzáadás button already has its own handler.
   if(event.target.closest('button,a,input,select'))return;
   openSheet();
  });
 }
 const form=make('form','sv-vault-form-v7');form.id='svVaultFormV7';form.hidden=true;
 form.innerHTML='<h2 id="svVaultFormTitleV7"></h2><p id="svVaultCautionV7"></p>'+
 '<label><span id="svVaultNameLabelV7"></span><input id="svVaultTitleV7" required maxlength="160" autocomplete="off"></label>'+
 '<label><span id="svVaultTypeLabelV7"></span><select id="svVaultCategoryV7">'+
 '<option value="ticket" id="svVaultTicketV7"></option><option value="pass" id="svVaultPassV7"></option>'+
 '<option value="document" id="svVaultDocumentV7"></option>'+
 '<option value="loyalty" id="svVaultLoyaltyV9"></option>'+
 '<option value="coupon" id="svVaultCouponV10"></option></select></label>'+
 '<div class="sv-vault-buttons-v7"><button type="button" id="svVaultPickV7"></button>'+
 '<button type="button" id="svVaultCameraV7"></button></div>'+
 '<input type="file" id="svVaultFileV7" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" hidden>'+
 '<input type="file" id="svVaultCameraInputV7" accept="image/*" capture="environment" hidden>'+
 '<div id="svVaultPickedV7"></div><div id="svVaultPreviewV7"></div>'+
 '<div class="sv-vault-buttons-v7"><button type="submit" id="svVaultSubmitV7"></button>'+
 '<button type="button" id="svVaultCancelV7"></button></div>';
 section.append(form);
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
   svVaultPassV7:'pass',svVaultDocumentV7:'document',svVaultLoyaltyV9:'loyalty',
   svVaultCouponV10:'coupon',
   svLoyaltyTitleV9:'loyaltyTitle',svLoyaltyTipV9:'loyaltyScan',
   svLoyaltyAddV9:'loyaltyAdd',svVaultPickV7:'pick',
   svVaultCameraV7:'camera',svVaultSubmitV7:'save',svVaultCancelV7:'cancel'};
  for(const [id,k] of Object.entries(vals))$(id).textContent=t(k);
  add.textContent=t('add');
  const description=d.querySelector('.sv-add-copy p');
  if(description)description.textContent=lang()==='hu'?
   'Jegy, bérlet vagy PDF feltöltése, illetve fényképezése. Privát tárolás.':
   'Upload or photograph a ticket, pass or PDF. Private storage.';
 }
 retranslate();refresh();
 w.addEventListener('sho-valet-filter-change',e=>setCategory(e.detail?.kind||'all'));
 w.addEventListener('sho-valet-pin-changed',refreshPinLabels);
 w.addEventListener('sh9:languagechange',()=>{retranslate();refresh()});
 w.addEventListener('hh-family-profile-changed',()=>{stateClose();discardLoyaltyImages();refresh()});
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'||e.key==='sh9-language-v1'){
  stateClose();discardLoyaltyImages();retranslate();refresh()}});
 w.addEventListener('pageshow',()=>refresh());
 w.addEventListener('pagehide',discardLoyaltyImages);
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
else init();
w.SH9_VALET_PRIVATE_V7={refresh,validate:fileInfo,allowedTypes:Object.values(ALLOWED),
 resolvePinned,previewPinned,openPinned};
})(window,document);
