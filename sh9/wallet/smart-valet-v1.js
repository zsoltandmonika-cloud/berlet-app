/* SHO Smart Valet v1 · display-only premium concept.
 * Every ticket is clearly labeled DEMO. No real file upload, QR decoding,
 * sensitive data storage, external writes, background fetch or fake validity.
 * Only the ID of the user's selected SAMPLE card is stored per local profile.
 */
(function(w,d){
 'use strict';
 if(w.SHO_SMART_VALET_PREVIEW_V1)return;
 const $=id=>d.getElementById(id);
 const items=Object.freeze({
  z:Object.freeze([
   Object.freeze({id:'z-bkk',kind:'pass',icon:'🚌',hu:'Budapest-bérlet',en:'Budapest travel pass',provider:'BKK',descHu:'Helyi közlekedés · mintabérlet',descEn:'Public transport · sample pass'}),
   Object.freeze({id:'z-mav',kind:'ticket',icon:'🚆',hu:'Vasúti jegy',en:'Rail ticket',provider:'MÁV',descHu:'Belföldi utazás · mintajegy',descEn:'Domestic journey · sample ticket'}),
   Object.freeze({id:'z-sport',kind:'ticket',icon:'🏐',hu:'Sportesemény belépő',en:'Sport event ticket',provider:'Sport Central',descHu:'Mérkőzés · mintajegy',descEn:'Match entry · sample ticket'})
  ]),
  m:Object.freeze([
   Object.freeze({id:'m-bkk',kind:'pass',icon:'🚌',hu:'Budapest-bérlet',en:'Budapest travel pass',provider:'BKK',descHu:'Helyi közlekedés · mintabérlet',descEn:'Public transport · sample pass'}),
   Object.freeze({id:'m-volan',kind:'ticket',icon:'🚍',hu:'Autóbuszjegy',en:'Coach ticket',provider:'Volán',descHu:'Távolsági utazás · mintajegy',descEn:'Intercity journey · sample ticket'}),
   Object.freeze({id:'m-sport',kind:'ticket',icon:'🏐',hu:'Sportesemény belépő',en:'Sport event ticket',provider:'Sport Central',descHu:'Mérkőzés · mintajegy',descEn:'Match entry · sample ticket'})
  ])
 });
 const I=Object.freeze({
  hu:Object.freeze({
   heroSub:'Minden fontos jegy és dokumentum. Egyetlen elegáns helyen.',
   previewState:'Vizuális előnézet',demoTag:'DEMÓ / TERVEZET',
   demoNotice:'Még nincs privát dokumentumfeltöltés. Az itt látható jegyek minták, nem érvényesek.',
   quickKicker:'SMART ACCESS',quickTitle:'Gyorselérés',sampleBadge:'MINTA',
   libraryKicker:'A TE TÁRCÁD',libraryTitle:'Jegyek és bérletek',
   all:'Összes',loyalty:'Klubkártyák',identity:'Igazolványok',license:'Jogosítvány',
   coupon:'Kuponok',personalId:'Személyi igazolvány',tajId:'TAJ-kártya',taxId:'Lakcímkártya',
   idGroup:'Igazolványok',idNoUpload:'Az igazolványok biztonságos tárolása még nem aktív. Ebbe a csoportba egyelőre nem tölthető fel okmány.',health:'Egészség',card:'Bankkártyák',ticket:'Jegyek',pass:'Bérletek',document:'Dokumentumok',
   searchLabel:'Keresés a mintajegyekben',searchPlaceholder:'Keresés a tárcában…',
   newItem:'Új jegy vagy dokumentum',newItemInfo:'Biztonságos privát feltöltés a következő fejlesztési fázisban.',
   soon:'Hamarosan',realPass:'Meglévő Bérlet app megnyitása',sportLink:'Sport Central · jegyek keresése',
   vaultNote:'A Secure Vault csak hitelesítés és privát tárolás bevezetése után fogad valódi okmányokat. Fizetési kártyaadatot ne tölts fel.',
   open:'Megnyitás',pin:'Kitűzés',unpin:'Kitűzés törlése',pinned:'Kitűzve',
   close:'Bezárás',notCode:'Nem érvényes belépőkód',
   noQR:'A valódi, eredeti QR / vonalkódot a későbbi biztonságos tároló jeleníti meg.',
   sample:'Mintakártya · nem érvényes',empty:'Nincs ilyen mintakártya',
   emptySub:'Itt a későbbi privát, saját dokumentumaid jelenhetnek meg.',
   noSearch:'Nincs találat a minták között',tryOther:'Próbálj másik keresőkifejezést.',
   pinSet:'Mintakártya kitűzve a gyorseléréshez',pinGone:'Kitűzés megszüntetve',
   noData:'Még nincs elérhető mintajegy',categoryPass:'Bérlet',categoryTicket:'Jegy',
   categoryDocument:'Dokumentum',categoryCard:'Kártya',featured:'KIEMELT MINTAJEGY'
  }),
  en:Object.freeze({
   heroSub:'Your important tickets and documents, beautifully organized.',
   previewState:'Visual preview',demoTag:'DEMO / CONCEPT',
   demoNotice:'Private uploads are not enabled. All cards shown here are samples, not valid tickets.',
   quickKicker:'SMART ACCESS',quickTitle:'Quick access',sampleBadge:'SAMPLE',
   libraryKicker:'YOUR VALET',libraryTitle:'Tickets and passes',
   all:'All',loyalty:'Club cards',identity:'ID Cards',license:'Driving licence',
   coupon:'Coupons',personalId:'Identity card',tajId:'TAJ health insurance card',taxId:'Address card',
   idGroup:'ID Cards',idNoUpload:'Secure identity document storage is not active yet. Do not upload official ID documents here.',health:'Health',card:'Bank cards',ticket:'Tickets',pass:'Passes',document:'Documents',
   searchLabel:'Search sample tickets',searchPlaceholder:'Search your wallet…',
   newItem:'Add a ticket or document',newItemInfo:'Secure private uploads will be introduced in the next development phase.',
   soon:'Coming soon',realPass:'Open existing Bérlet app',sportLink:'Sport Central · find tickets',
   vaultNote:'Secure Vault will accept real documents only after authentication and private storage are implemented. Do not upload payment card information.',
   open:'Open',pin:'Pin',unpin:'Remove pin',pinned:'Pinned',
   close:'Close',notCode:'Not a valid entry code',
   noQR:'Original QR and barcodes will be displayed by the future secure storage feature.',
   sample:'Sample card · not valid',empty:'No sample cards in this category',
   emptySub:'Your private documents may appear here in a future release.',
   noSearch:'No matching sample cards',tryOther:'Try a different search term.',
   pinSet:'Sample card pinned for quick access',pinGone:'Sample pin removed',
   noData:'No sample tickets available',categoryPass:'Pass',categoryTicket:'Ticket',
   categoryDocument:'Document',categoryCard:'Card',featured:'FEATURED SAMPLE'
  })
 });
 let kind='all',selected=null,lastFocus=null,toastTimer=null,selectedIdType='';
 const profile=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}};
 const lang=()=>{try{return w.localStorage.getItem('sh9-language-v1')==='en'?'en':'hu'}catch(_){return 'hu'}};
 const t=key=>I[lang()][key]||I.hu[key]||key;
 const list=()=>items[profile()];
 const label=item=>item[lang()==='en'?'en':'hu'];
 const desc=item=>item[lang()==='en'?'descEn':'descHu'];
 // All visuals are crisp HD vectors, reusing one compact SVG icon pack.
 const iconType=item=>item.provider==='BKK'?'bus':item.provider==='MÁV'?'train':
   item.provider==='Volán'?'bus':'sport';
 function symbol(name){
  const namespace='http://www.w3.org/2000/svg';
  const svg=d.createElementNS(namespace,'svg');
  svg.setAttribute('viewBox','0 0 32 32');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('focusable','false');
  const use=d.createElementNS(namespace,'use');
  use.setAttribute('href','./smart-valet-icons-v2.svg#'+name);
  svg.appendChild(use);
  return svg;
 }
 const pinKey=()=>'sho-smart-valet-demo-pin-v1:'+profile();
 function pinId(){
  const quick=w.SHO_VALET_SMART_ACCESS_V13;
  if(quick){
   const pinned=quick.current();
   return pinned?.source==='demo'&&list().some(x=>x.id===pinned.id)?pinned.id:'';
  }
  try{
   const id=w.localStorage.getItem(pinKey())||'';
   return list().some(x=>x.id===id)?id:'';
  }catch(_){return ''}
 }
 function pinned(id){return !!id&&pinId()===id}
 function setPin(id){
  if(!list().some(x=>x.id===id))return;
  const original=sample(id);
  if(original?.provider==='BKK'&&original.kind==='pass'){
   const saved=w.SHO_VALET_EXTRA_V15?.getBudapestId?.();
   if(saved){w.SHO_VALET_SMART_ACCESS_V13?.toggle({source:'extra',id:saved});render()}
   else void w.SHO_VALET_EXTRA_V15?.openBudapest?.();
   return;
  }
  const quick=w.SHO_VALET_SMART_ACCESS_V13;
  if(quick){
   const wasPinned=quick.isPinned('demo',id);
   if(!quick.toggle({source:'demo',id}))return;
   toast(t(wasPinned?'pinGone':'pinSet'));
   return;
  }
  const value=pinned(id)?'':id;
  try{
   if(value)w.localStorage.setItem(pinKey(),value);
   else w.localStorage.removeItem(pinKey());
  }catch(_){toast(t('noData'));return}
  toast(t(value?'pinSet':'pinGone'));
  render();
 }
 function elt(tag,cls,textValue){
  const x=d.createElement(tag);if(cls)x.className=cls;
  if(textValue!==undefined)x.textContent=String(textValue);
  return x;
 }
 function btn(textValue,cls,onClick,aria){
  const x=elt('button',cls,textValue);x.type='button';
  if(aria)x.setAttribute('aria-label',aria);
  x.addEventListener('click',onClick);return x;
 }
 function toast(message){
  const node=$('svToast');node.textContent=message;node.hidden=false;
  w.clearTimeout(toastTimer);toastTimer=w.setTimeout(()=>{node.hidden=true},2400);
 }
 function sample(id){
  return list().find(x=>x.id===id)||null;
 }
 function modal(id){
  const item=sample(id);if(!item)return;
  if(item.provider==='BKK'&&item.kind==='pass'&&w.SHO_VALET_EXTRA_V15?.openBudapest){
   void w.SHO_VALET_EXTRA_V15.openBudapest();return;
  }
  selected=id;lastFocus=d.activeElement;
  $('svDialogTitle').textContent=label(item);
  $('svDialogIcon').replaceChildren(symbol(iconType(item)));
  $('svDialogMeta').textContent=item.provider+' · '+desc(item)+' · '+t('sample');
  $('svDialogPin').textContent=pinned(id)?'★ '+t('unpin'):'☆ '+t('pin');
  $('svDialog').hidden=false;
  d.body.style.overflow='hidden';
  $('svClose').focus();
 }
 function closeModal(){
  if($('svDialog').hidden)return;
  $('svDialog').hidden=true;
  d.body.style.overflow='';
  selected=null;
  if(lastFocus?.isConnected)lastFocus.focus();
 }
 function translateStatic(){
  d.documentElement.lang=lang();
  for(const node of d.querySelectorAll('[data-i18n]')){
   const key=node.dataset.i18n;
   node.textContent=t(key);
  }
  $('svSearch').placeholder=t('searchPlaceholder');
  $('svSearch').setAttribute('aria-label',t('searchLabel'));
 }
 function renderFeatured(){
  const quick=w.SHO_VALET_SMART_ACCESS_V13;
  if(quick?.renderFeatured?.())return;
  const host=$('svFeatured');host.replaceChildren();
  const target=list().find(x=>x.id===pinId())||list()[0];
  if(!target){host.append(elt('p','',t('noData')));return}
  const copy=elt('div','sv-feature-copy');
  const top=elt('div','sv-feature-top',t('featured'));copy.append(top);
  copy.append(elt('h3','',label(target)),elt('p','sv-feature-meta',target.provider+' · '+desc(target)));
  const actions=elt('div','sv-feature-actions');
  actions.append(
   btn(t('open'),'sv-btn sv-btn-primary',()=>modal(target.id)),
   btn((pinned(target.id)?'★ ':'☆ ')+t(pinned(target.id)?'unpin':'pin'),
    'sv-btn',()=>setPin(target.id))
  );
  copy.append(actions);
  const isBudapestPass=target.provider==='BKK'&&target.kind==='pass';
  const art=elt('div','sv-feature-art'+(isBudapestPass?' sv-feature-bkk':''));
  if(isBudapestPass){
   const image=elt('img','sv-feature-bkk-image');
   // v5: exact user-approved Budapest-bérlet card, not the former bus montage.
   // Keep the art decorative: the ticket itself is still clearly labeled DEMO.
   image.src=w.SHO_VALET_BKK_APPROVED_V5||'./bkk-featured-v1.webp';
   image.alt='';
   image.width=420;
   image.height=280;
   image.decoding='async';
   image.addEventListener('error',()=>{
    if(image.dataset.fallback!=='1'){
     image.dataset.fallback='1';
     image.src='./bkk-featured-v1.webp'; // browser without AVIF support
    }else art.replaceChildren(symbol(iconType(target)));
   });
   art.append(image);
  }else art.append(symbol(iconType(target)));
  art.setAttribute('aria-hidden','true');
  host.append(copy,art);
 }
 function renderCards(){
  w.SHO_VALET_ACTIVE_CATEGORY_V9=kind;
  const search=$('svSearch').value.toLocaleLowerCase(lang()).trim();
  const filtered=list().filter(item=>(kind==='all'||item.kind===kind)&&
   (!search||(label(item)+' '+desc(item)+' '+item.provider).toLocaleLowerCase(lang()).includes(search)));
  $('svCount').textContent=String(filtered.length);
  for(const b of d.querySelectorAll('[data-kind]')){
   const current=b.dataset.kind===kind;
   b.classList.toggle('active',current);
   b.setAttribute('aria-pressed',String(current));
  }
  const host=$('svCards');host.replaceChildren();
  const identity=$('svIdentityPanelV10');
  if(identity){
   identity.hidden=kind!=='identity';
   const keys={license:'license',personal:'personalId',taj:'tajId',tax:'taxId'};
   for(const child of identity.querySelectorAll('[data-id-type]')){
    const active=kind==='identity'&&child.dataset.idType===selectedIdType;
    child.classList.toggle('active',active);
    child.setAttribute('aria-pressed',String(active));
   }
   const key=keys[selectedIdType];
   $('svIdNoticeV10').textContent=kind==='identity'&&key?t(key)+' · '+t('idNoUpload'):t('idNoUpload');
  }
  const addPanel=d.querySelector('.sv-add-panel');
  if(addPanel)addPanel.hidden=['identity','health','card'].includes(kind);
  if(kind==='identity')return;
  if(kind==='loyalty'||kind==='coupon'){
   // Real retail cards and coupons are handled by the authenticated private gallery.
   // Never substitute fictional demo tickets or generate redeemable codes.
   w.dispatchEvent(new CustomEvent('sho-valet-loyalty-view',{detail:{kind}}));
   return;
  }
  if(!filtered.length){
   const box=elt('div','sv-empty');
   box.append(elt('div','sv-empty-icon','◇'),
    elt('strong','',search?t('noSearch'):t('empty')),
    elt('span','',search?t('tryOther'):t('emptySub')));
   host.append(box);
   return;
  }
  for(const item of filtered){
   const node=elt('article','sv-item');
   const opener=btn('','sv-item-main',()=>modal(item.id),t('open')+': '+label(item));
   const icon=elt('span','sv-item-glyph');icon.append(symbol(iconType(item)));icon.setAttribute('aria-hidden','true');
   const info=elt('span','sv-item-info');
   const isBkk=item.provider==='BKK'&&item.kind==='pass';
   const bkkId=isBkk?w.SHO_VALET_EXTRA_V15?.getBudapestId?.():null;
   info.append(elt('span','sv-type',t(item.kind==='pass'?'categoryPass':'categoryTicket')),
     elt('strong','',label(item)),elt('small','',isBkk?
      (bkkId?t('pinned'):t('newItem')):item.provider+' · '+t('sample')));
   opener.append(icon,info);
   const pin=btn(pinned(item.id)?'★':'☆','sv-icon-button'+(pinned(item.id)?' is-pinned':''),
      ()=>setPin(item.id),t(pinned(item.id)?'unpin':'pin')+': '+label(item));
   node.append(opener,pin);host.append(node);
  }
 }
 function render(){
  const p=profile();
  d.documentElement.setAttribute('data-sh9-golden-profile',p);
  $('svProfileName').textContent=p==='m'?'Mónika':'Zsolt';
  translateStatic();renderFeatured();renderCards();
  if(selected&&sample(selected))$('svDialogPin').textContent=(pinned(selected)?'★ ':'☆ ')+t(pinned(selected)?'unpin':'pin');
 }
 for(const idButton of d.querySelectorAll('[data-id-type]'))
  idButton.addEventListener('click',()=>{
   selectedIdType=idButton.dataset.idType;
   renderCards();
  });
 for(const button of d.querySelectorAll('[data-kind]'))
  button.addEventListener('click',()=>{
   kind=button.dataset.kind;renderCards();
   w.dispatchEvent(new CustomEvent('sho-valet-filter-change',{detail:{kind}}));
  });
 $('svSearch').addEventListener('input',renderCards);
 $('svDialogPin').addEventListener('click',()=>{if(selected)setPin(selected)});
 $('svDialogDone').addEventListener('click',closeModal);
 $('svClose').addEventListener('click',closeModal);
 $('svDialog').addEventListener('click',e=>{if(e.target?.dataset?.dismiss==='1')closeModal()});
 d.addEventListener('keydown',e=>{
  if($('svDialog').hidden)return;
  if(e.key==='Escape'){e.preventDefault();closeModal();return}
  if(e.key==='Tab'){
   const focusable=[$('svClose'),$('svDialogPin'),$('svDialogDone')];
   const i=focusable.indexOf(d.activeElement);
   if(e.shiftKey&&i<=0){e.preventDefault();focusable[focusable.length-1].focus()}
   else if(!e.shiftKey&&i===focusable.length-1){e.preventDefault();focusable[0].focus()}
  }
 });
 $('svBack').addEventListener('click',()=>{
  if(!$('svDialog').hidden){closeModal();return}
  if(w.history.length>1)w.history.back();
  else w.location.assign('/berlet-app/sh9/');
 });
 function externalUpdate(){
  closeModal();render();
  w.dispatchEvent(new CustomEvent('sho-valet-filter-change',{detail:{kind}}));
 }
 w.addEventListener('storage',e=>{
  if(e.key==='hh-profile'||e.key==='sh9-language-v1'||e.key===pinKey())externalUpdate();
 });
 w.addEventListener('sh9:profilechange',externalUpdate);
 w.addEventListener('hh-family-profile-changed',externalUpdate);
 w.addEventListener('sh9:languagechange',externalUpdate);
 w.addEventListener('sh9-language-change',externalUpdate);
 w.addEventListener('pageshow',render);
 w.SHO_SMART_VALET_PREVIEW_V1=Object.freeze({version:1,render});
 render();
})(window,document);
