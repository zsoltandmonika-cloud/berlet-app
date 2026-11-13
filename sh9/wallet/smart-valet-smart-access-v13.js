/* SHO Smart Valet v13 · universal per-profile Smart Access showcase.
 * Local preference contains ONLY provider + item ID. Originals are always read
 * from existing authenticated, RLS-protected providers. No URLs or secrets saved.
 */
(function(w,d){
'use strict';
const SOURCES=['demo','private','identity','extra','app'],ID_TYPES=['license','personal','taj','tax'];
const $=id=>d.getElementById(id);
const profile=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
const lang=()=>w.localStorage.getItem('sh9-language-v1')==='en'?'en':'hu';
const t=(hu,en)=>lang()==='hu'?hu:en;
const storeKey=p=>'sho-smart-valet-quick-access-v13:'+p;
const valid=entry=>!!entry&&SOURCES.includes(entry.source)&&typeof entry.id==='string'&&
  (entry.source==='app'?entry.id==='budapestgo':
   entry.source==='identity'?ID_TYPES.includes(entry.id):
   (entry.source==='private'||entry.source==='extra')?/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.id):
   /^[\w-]{1,80}$/.test(entry.id));
let renderSerial=0,imageURL='',lastProfile='',ready=false;
function read(){
 const p=profile();
 try{
  const raw=w.localStorage.getItem(storeKey(p));
  if(raw){const parsed=JSON.parse(raw);return valid(parsed)?{source:parsed.source,id:parsed.id}:null}
  // Migrate the previous demo pin, but never silently override a real pin.
  const old=w.localStorage.getItem('sho-smart-valet-demo-pin-v1:'+(p==='monika'?'m':'z'));
  if(old&&valid({source:'demo',id:old})){
   const pin={source:'demo',id:old};
   w.localStorage.setItem(storeKey(p),JSON.stringify(pin));
   w.localStorage.removeItem('sho-smart-valet-demo-pin-v1:'+(p==='monika'?'m':'z'));
   return pin;
  }
 }catch(_){}
 return null;
}
function current(){return read()}
function isPinned(source,id){const cur=read();return !!cur&&cur.source===source&&cur.id===id}
function emit(){
 w.dispatchEvent(new CustomEvent('sho-valet-pin-changed',{detail:{profile:profile(),pin:read()}}));
 const demo=w.SHO_SMART_VALET_PREVIEW_V1;
 if(demo?.render)demo.render();
 else renderFeatured();
}
function toggle(entry){
 if(!valid(entry))return false;
 const p=profile(),next=isPinned(entry.source,entry.id)?null:{source:entry.source,id:entry.id};
 try{
  if(next)w.localStorage.setItem(storeKey(p),JSON.stringify(next));
  else w.localStorage.removeItem(storeKey(p));
  // Old sample pins must never reappear after a real pin is removed.
  w.localStorage.removeItem('sho-smart-valet-demo-pin-v1:'+(p==='monika'?'m':'z'));
 }catch(_){return false}
 emit();return true;
}
function clear(){
 try{
  const p=profile();
  w.localStorage.removeItem(storeKey(p));
  w.localStorage.removeItem('sho-smart-valet-demo-pin-v1:'+(p==='monika'?'m':'z'));
 }catch(_){return false}
 emit();return true;
}
const node=(tag,cls,txt)=>{
 const e=d.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e
};
function button(txt,fn,cls){
 const e=node('button',cls||'sv-btn',txt);
 e.type='button';e.addEventListener('click',fn);return e;
}
function release(){if(imageURL){URL.revokeObjectURL(imageURL);imageURL=''}}
function badge(active){
 const e=d.querySelector('#svFeatureTitle')?.closest('.sv-section-top')?.querySelector('.sv-soft-label');
 if(e)e.textContent=active?t('KITŰZVE','PINNED'):t('MINTA','SAMPLE');
}
function placeholder(title){
 const art=node('div','sv-feature-art sv-feature-quick-art-v13');
 const icon=node('span','sv-quick-icon-v13',title==='lock'?'🔒':'▣');
 art.append(icon);
 return art;
}
function shell(pin){
 const host=$('svFeatured');
 if(!host)return null;
 host.replaceChildren();
 host.classList.add('sv-feature-quick-v13');
 badge(true);
 const copy=node('div','sv-feature-copy sv-quick-copy-v13');
 const kicker=node('div','sv-feature-top',t('KEDVENC KÁRTYÁD','YOUR FAVORITE CARD'));
 const title=node('h3',null,t('Kártya betöltése…','Loading card…'));
 const meta=node('p','sv-feature-meta',t('Privát, profilfüggő gyorselérés','Private, profile-specific quick access'));
 const actions=node('div','sv-feature-actions');
 const open=button(t('Megnyitás','Open'),()=>void openPinned(pin),'sv-btn sv-btn-primary');
 open.disabled=true;
 const remove=button('★ '+t('Kitűzés megszüntetése','Remove pin'),()=>clear(),'sv-btn');
 actions.append(open,remove);
 copy.append(kicker,title,meta,actions);
 const art=placeholder(pin.source==='identity'?'lock':'card');
 art.setAttribute('role','button');art.tabIndex=0;
 art.setAttribute('aria-label',t('Kitűzött kártya megnyitása','Open pinned card'));
 const activate=()=>{if(!open.disabled)void openPinned(pin)};
 art.addEventListener('click',activate);
 art.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();activate()}
 });
 host.append(copy,art);
 return{host,title,meta,art,open};
}
async function resolve(pin,p){
 if(pin.source==='app'&&pin.id==='budapestgo')return{
  title:'BudapestGO',category:'app',protection_mode:'none',
  subtitle:t('Hivatalos elektronikus jegyek · BKK alkalmazás','Official mobile tickets · BKK app')
 };
 if(pin.source==='private'){
  const src=w.SH9_VALET_PRIVATE_V7;
  if(!src?.resolvePinned)throw Error('NOT_READY');
  return src.resolvePinned(pin.id,p);
 }
 if(pin.source==='identity'){
  const src=w.SHO_VALET_IDENTITY_V13;
  if(!src?.resolvePinned)throw Error('NOT_READY');
  return src.resolvePinned(pin.id,p);
 }
 if(pin.source==='extra'){
  const src=w.SHO_VALET_EXTRA_V15;
  if(!src?.resolvePinned)throw Error('NOT_READY');
  return src.resolvePinned(pin.id,p);
 }
 return null;
}
async function image(pin,p,record){
 if(pin.source==='private'){
  const src=w.SH9_VALET_PRIVATE_V7;
  return src?.previewPinned?.(pin.id,p,record)||null;
 }
 if(pin.source==='identity'){
  // In password mode NEVER retrieve even a thumbnail, even after unlock.
  if(record.protection_mode!=='device')return null;
  return w.SHO_VALET_IDENTITY_V13?.previewPinned?.(pin.id,p,record)||null;
 }
 if(pin.source==='extra'){
  // Follow the same protected-thumbnail privacy rule as Identity cards.
  if(record.protection_mode!=='device')return null;
  return w.SHO_VALET_EXTRA_V15?.previewPinned?.(pin.id,p,record)||null;
 }
 return null;
}
async function openPinned(pin){
 if(!isPinned(pin.source,pin.id))return;
 if(pin.source==='app'&&pin.id==='budapestgo')return w.SHO_BUDAPESTGO_V21?.open();
 const p=profile();
 try{
  if(pin.source==='private'){
   if(!w.SH9_VALET_PRIVATE_V7?.openPinned)throw Error('NOT_READY');
   return await w.SH9_VALET_PRIVATE_V7.openPinned(pin.id,p);
  }
  if(pin.source==='identity'){
   if(!w.SHO_VALET_IDENTITY_V13?.openPinned)throw Error('NOT_READY');
   return await w.SHO_VALET_IDENTITY_V13.openPinned(pin.id,p);
  }
  if(pin.source==='extra'){
   if(!w.SHO_VALET_EXTRA_V15?.openPinned)throw Error('NOT_READY');
   return await w.SHO_VALET_EXTRA_V15.openPinned(pin.id,p);
  }
 }catch(_){
  // Auth failure is not a reason to lose a saved pin.
  const box=$('svFeatured');
  if(box)box.setAttribute('data-quick-status',t('A kártya most nem nyitható meg.','Unable to open card.'));
 }
}
function renderFeatured(){
 const pin=read(),p=profile();
 if(!pin||pin.source==='demo'){
  ++renderSerial;release();badge(false);
  $('svFeatured')?.classList.remove('sv-feature-quick-v13');
  return false;
 }
 const serial=++renderSerial;
 release();
 const ui=shell(pin);
 if(!ui)return true;
 (async()=>{
  try{
   const entry=await resolve(pin,p);
   if(serial!==renderSerial||p!==profile()||!isPinned(pin.source,pin.id))return;
   if(!entry){
    // A missing row in an authenticated lookup is NOT proof of deletion:
    // login expiry, RLS or sync delays may hide intact cloud records.
    // Preserve the local pin and never invoke a destructive fallback here.
    ui.title.textContent=t('Mentett kártya · ideiglenesen nem elérhető',
      'Saved card · temporarily unavailable');
    ui.meta.textContent=t('A kitűzés megmaradt. Ellenőrizd a felhőkapcsolatot és a profilt.',
      'Pin preserved. Check cloud sign-in and profile.');
    ui.open.disabled=true;
    return;
   }
   ui.title.textContent=String(entry.title||t('Mentett kártya','Saved card')).slice(0,150);
   ui.meta.textContent=entry.subtitle||(
    pin.source==='identity'
     ?t('Igazolvány · '+(entry.protection_mode==='password'?'Jelszóval védett':'Privát'),
        'ID card · '+(entry.protection_mode==='password'?'Password protected':'Private'))
     :t('Saját privát kártyád','Your private card'));
   ui.open.disabled=false;
   if(pin.source==='app'&&pin.id==='budapestgo'){
    ui.art.replaceChildren(node('span','sv-go-quick-icon-v21','GO'));
    ui.art.classList.add('sv-go-quick-art-v21');
    return; // Official app launcher only, never displays ticket codes or sensitive data.
   }
   if(pin.source==='extra'&&entry.category==='bank'&&entry.protection_mode!=='device'){
    const bank=node('div','sv-extra-bank-art-v15');
    bank.append(node('span','sv-extra-bank-logo-v15','✦ '+String(entry.issuer||t('Bankkártya','Bank card'))),
     node('span','sv-extra-bank-number-v15','•••• •••• •••• '+(entry.last_four||'••••')),
     node('span','sv-extra-bank-owner-v15',String(entry.title||'')));
    ui.art.replaceChildren(bank);ui.art.classList.add('sv-quick-image-v13');
    return; // mask stays visible, no bank card image or payment data involved
   }
   if(pin.source==='extra'&&entry.protection_mode==='password'){
    ui.art.replaceChildren(node('span','sv-quick-icon-v13','🔒'));
    ui.art.classList.add('sv-quick-locked-v13');
    return; // bank cards have masked metadata; health images stay password-protected
   }
   if(pin.source==='identity'&&entry.protection_mode==='password'){
    ui.art.replaceChildren(node('span','sv-quick-icon-v13','🔒'));
    ui.art.classList.add('sv-quick-locked-v13');
    return; // no photo, image URL, cached preview or query for protected IDs
   }
   const blob=await image(pin,p,entry);
   if(serial!==renderSerial||p!==profile()||!isPinned(pin.source,pin.id))return;
   if(blob instanceof Blob&&blob.type.startsWith('image/')){
    const objectURL=URL.createObjectURL(blob);imageURL=objectURL;
    const photo=node('img','sv-quick-photo-v13');
    photo.src=objectURL;photo.alt=t('Kitűzött kártya előnézete','Pinned card preview');
    ui.art.replaceChildren(photo);ui.art.classList.add('sv-quick-image-v13');
   }
  }catch(e){
   if(serial!==renderSerial||p!==profile())return;
   ui.title.textContent=t('Privát kártya','Private card');
   ui.meta.textContent=e?.message==='NOT_READY'
    ?t('Kártyatár betöltése…','Loading the private vault…')
    :t('Bejelentkezés szükséges a kártya megtekintéséhez.',
      'Sign in to view this card.');
   ui.open.disabled=e?.message==='NOT_READY';
  }
 })();
 return true;
}
function refresh(){
 if(lastProfile&&lastProfile!==profile())release();
 lastProfile=profile();
 const preview=w.SHO_SMART_VALET_PREVIEW_V1;
 if(preview?.render)preview.render();
 else renderFeatured();
}
function init(){
 if(ready)return;ready=true;
 w.addEventListener('sho-valet-private-ready',refresh);
 w.addEventListener('sho-valet-identity-ready',refresh);
 w.addEventListener('sho-valet-extra-ready',refresh);
 w.addEventListener('hh-family-profile-changed',refresh);
 w.addEventListener('sh9:profilechange',refresh);
 w.addEventListener('storage',e=>{
  if(['hh-profile','sh9-language-v1',storeKey(profile())].includes(e.key))refresh();
 });
 w.addEventListener('sh9:languagechange',refresh);
 w.addEventListener('pagehide',()=>{++renderSerial;release()});
 w.addEventListener('pageshow',refresh);
 refresh();
}
w.SHO_VALET_SMART_ACCESS_V13=Object.freeze({
 version:13,current,isPinned,toggle,clear,renderFeatured,refresh,openPinned
});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
