/* SHO Book Studio Golden V10 · actual interactive wooden bookshelf.
 * OneDrive stays the source. Clicking a book uses the existing EPUB/PDF reader.
 * No fake sample titles, no duplicate upload, no shared public Microsoft files.
 * Settings are relocated behind a single top-right button.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id),CACHE=w.SH9_BOOK_CACHE_V3;
 if(!$('bshelfRows')||!$('bshelfSettingsToggle'))return;
 const palette=['#264e5c','#50364f','#605037','#293a5a','#5a3840','#34514b','#533c55','#4b3b39'];
 const state={books:[],covers:new Map(),connected:false,loading:true,error:false,message:'☁️ OneDrive-könyvtár előkészítése…',coverScanning:false,coverDone:0,coverTotal:0,displayed:new Set(),hidden:new Set(),scope:'',account:'',profile:''};
 const main=$('bshelfFront'),admin=$('bsAdminView'),menu=$('bshelfSettingsMenu');
 const settingsBtn=$('bshelfSettingsToggle'),searchBtn=$('bshelfSearchToggle');
 const searchBox=$('bshelfSearchBox'),search=$('bshelfSearch');
 const rows=$('bshelfRows'),empty=$('bshelfEmpty'),manageList=$('bshelfManageList'),manageSearch=$('bshelfManageFilter');
 const title=x=>String(x||'').replace(/\s+/g,' ').trim();
 const clean=x=>title(x).toLocaleLowerCase('hu-HU');
 const elem=(tag,cls,txt)=>{
  const node=d.createElement(tag);
  if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=txt;
  return node;
 };
 const cols=()=>w.matchMedia?.('(min-width:700px)')?.matches?6:4;
 function navMenu(open){
  menu.hidden=!open;settingsBtn.setAttribute('aria-expanded',String(open));
 }

 function hiddenKey(account,profile){
  if(!account||!profile)return '';
  return 'sh9-book-hidden-v13:'+encodeURIComponent(String(account).toLowerCase())+':'+encodeURIComponent(String(profile));
 }
 function readHidden(scope){
  if(!scope)return new Set();
  try{
   const values=JSON.parse(w.localStorage.getItem(scope)||'[]');
   return new Set(Array.isArray(values)?values.filter(v=>typeof v==='string'&&v.length<500).slice(0,3000):[]);
  }catch(_){return new Set()}
 }
 function saveHidden(){
  if(!state.scope)return false;
  try{w.localStorage.setItem(state.scope,JSON.stringify([...state.hidden]));return true}
  catch(_){return false}
 }
 function hiddenBook(book){return state.hidden.has(book.drive_item_id||book.id)}
 function safeOneDriveUrl(value){
  if(!value)return '';
  try{
   const u=new URL(String(value));
   const host=u.hostname.toLowerCase();
   return u.protocol==='https:'&&(host==='onedrive.live.com'||host==='1drv.ms'||
     host.endsWith('.sharepoint.com')||host.endsWith('.onedrive.com'))?u.href:'';
  }catch(_){return ''}
 }
 function setBookHidden(book,hidden){
  const key=book.drive_item_id||book.id;
  const wasHidden=state.hidden.has(key);
  if(hidden)state.hidden.add(key);else state.hidden.delete(key);
  if(!saveHidden()){
   if(wasHidden)state.hidden.add(key);else state.hidden.delete(key);
   w.alert?.('A beállítás nem menthető ebben a böngészőben. Ellenőrizd a helyi tárhelyet.');
   return;
  }
  render();renderManage();
 }
 function renderManage(){
  if(!manageList)return;
  const needle=clean(manageSearch.value);
  const list=state.books.filter(b=>!needle||clean(b.title+' '+b.author).includes(needle))
   .sort((a,b)=>Number(hiddenBook(a))-Number(hiddenBook(b))||a.title.localeCompare(b.title,'hu-HU'));
  const hidden=state.books.filter(hiddenBook).length;
  $('bshelfManageCount').textContent=(state.books.length-hidden)+' a polcon · '+hidden+' elrejtve · '+state.books.length+' összesen';
  const frag=d.createDocumentFragment();
  for(const book of list){
   const row=elem('article','bshelf-manage-book');
   if(hiddenBook(book))row.classList.add('is-hidden');
   const image=elem('span','bshelf-manage-thumbnail');
   const url=state.covers.get(book.id);
   if(url){
    const img=elem('img');img.alt='';img.src=url;img.loading='lazy';image.append(img);
   }else image.append(elem('span','','📖'));
   const info=elem('div','bshelf-manage-info');
   info.append(elem('strong','',book.title),elem('small','',book.author||'OneDrive'));
   if(hiddenBook(book))info.append(elem('span','bshelf-manage-badge','Elrejtve a könyvespolcról'));
   const actions=elem('div','bshelf-manage-actions');
   const toggle=elem('button','bshelf-hide-action',hiddenBook(book)?'↩ Visszahelyezés':'⊖ Elrejtés');
   toggle.type='button';
   toggle.setAttribute('aria-label',(hiddenBook(book)?'Visszahelyezés: ':'Elrejtés: ')+book.title);
   toggle.addEventListener('click',()=>setBookHidden(book,!hiddenBook(book)));
   actions.append(toggle);
   const link=safeOneDriveUrl(book.web_url);
   if(link){
    const a=elem('a','bshelf-drive-link','☁ OneDrive ↗');
    a.href=link;a.target='_blank';a.rel='noopener noreferrer';
    a.title='Az eredeti fájl végleges törlése csak a OneDrive felületén lehetséges.';
    actions.append(a);
   }
   row.append(image,info,actions);frag.append(row);
  }
  manageList.replaceChildren(frag);
  if(!list.length)manageList.append(elem('p','bshelf-manage-noresults',state.books.length?'Nincs találat.':'Előbb csatlakoztasd a OneDrive-könyvtárat.'));
 }
 function searchPanel(open){
  searchBox.hidden=!open;searchBtn.setAttribute('aria-expanded',String(open));
  if(open)search.focus();
  else if(search.value){search.value='';render()}
 }
 function adminView(target,caption){
  navMenu(false);
  main.hidden=true;admin.hidden=false;
  admin.dataset.mode=target==='bshelfManagePanel'?'manage':'classic';
  $('bshelfManagePanel').hidden=target!=='bshelfManagePanel';
  if(target==='bshelfManagePanel')renderManage();
  $('bshelfAdminTitle').textContent=caption||'Book Studio beállítások';
  // Do not shift the address bar to an OAuth redirect route or change search.
  w.requestAnimationFrame?.(()=>{
   const section=$(target)||$('bshelfAdminBack');
   section?.scrollIntoView({behavior:'auto',block:'start'});
  });
  if(!w.requestAnimationFrame)$(target)?.scrollIntoView();
 }
 function frontView(){
  navMenu(false);
  admin.hidden=true;admin.dataset.mode='classic';main.hidden=false;
  w.scrollTo?.({top:0,behavior:'auto'});
  render();
 }
 function setStatus(message,error){
  state.message=title(message)||'☁️ Könyvtár előkészítése…';
  state.error=!!error;
  // When connection genuinely requires interaction, show the one-tap settings path.
  if(error||/kapcsolat szükséges|bejelentkezés szükséges|megerősítés szükséges|beállítása szükséges|nem sikerült|nem engedélyezte|kapcsolat bontva/i.test(state.message)){
   state.loading=false;
  }
  statusOnly();
 }
 function statusOnly(){
  const message=$('bshelfStatus'),count=$('bshelfCount');
  const n=state.books.filter(b=>!hiddenBook(b)).length;
  const hiddenCount=state.books.length-n;
  count.textContent=n? n+' könyv'+(hiddenCount?' · '+hiddenCount+' elrejtve':'')+' · ☁️ OneDrive':state.loading?'Csatlakozás…':hiddenCount?hiddenCount+' elrejtett könyv':'OneDrive';
  message.textContent=state.loading?'📚 '+(state.message.replace(/^[☁️📚📂\s]+/u,'')||'Könyvek beolvasása…'):
   n&&state.coverScanning?'🖼️ Eredeti borítók automatikusan: '+state.coverDone+'/'+state.coverTotal+' · '+state.displayed.size+' megjelenítve':
   n?'✓ '+n+' könyv · '+state.displayed.size+' borító · OneDrive':state.message;
  message.dataset.error=state.error?'1':'0';
  if(!state.loading&&!n){
   empty.hidden=false;
   const caption=empty.querySelector('span');
   caption.textContent=state.connected&&hiddenCount?
    'Az összes könyved el van rejtve. A ⚙ Könyvtár szerkesztése menüpontban visszahelyezheted őket.':
    state.connected?'Ebben a könyvtárban még nincs találat. Ellenőrizd a OneDrive mappát a beállításokban.':
    'A OneDrive csatlakoztatását és a könyvek beolvasását a ⚙ gomb alatt érheted el.';
   empty.querySelector('button').textContent=hiddenCount?'↩ Elrejtett könyvek kezelése':'⚙ OneDrive kapcsolat beállítása';
  }else empty.hidden=true;
 }
 function setConnected(on){
  state.connected=!!on;
  if(!on){state.books=[];state.covers.clear();state.displayed.clear();state.coverScanning=false;state.scope='';state.account='';state.profile='';state.hidden.clear()}
  statusOnly();render();
 }
 function setLoading(on){
  state.loading=!!on;
  if(on){state.message='📂 Könyvek beolvasása…';state.error=false;state.coverScanning=false}
  statusOnly();
 }
 function setCoverProgress(completed,total){
  state.coverScanning=total>0;state.coverDone=completed;state.coverTotal=total;
  statusOnly();
 }
 function finishCoverProgress(){
  state.coverScanning=false;statusOnly();
 }
 function coverReady(id,url){
  if(!id||!url)return;
  state.covers.set(id,url);statusOnly();
  // Scope book IDs to exact buttons, no query selector interpolation or HTML.
  for(const btn of rows.querySelectorAll('.bshelf-book')){
   if(btn.dataset.bookId!==id)continue;
   paintCover(btn,url);
  }
 }
 function paintCover(button,url){
  const img=button.querySelector('.bshelf-real-cover'),placeholder=button.querySelector('.bshelf-title-fallback');
  if(!img||img.dataset.url===url)return;
  img.dataset.url=url;
  // Never combine loading="lazy" and hidden/display:none. On Samsung Internet
  // that deadlocks: the invisible image is never fetched, so onload never fires.
  img.loading='eager';
  img.onload=()=>{
   if(img.dataset.url!==url)return;
   img.classList.add('is-loaded');
   placeholder.hidden=true;
   state.displayed.add(button.dataset.bookId);
   statusOnly();
  };
  img.onerror=()=>{
   img.classList.remove('is-loaded');
   placeholder.hidden=false;
   state.displayed.delete(button.dataset.bookId);
   statusOnly();
  };
  img.src=url;
 }
 function bookButton(book,index){
  const button=elem('button','bshelf-book');
  button.type='button';button.dataset.bookId=book.id;
  button.title=book.title+(book.author?' · '+book.author:'');
  button.setAttribute('aria-label','Olvasás: '+book.title+(book.author?', '+book.author:''));
  button.style.setProperty('--bshelf-cover-tone',palette[index%palette.length]);
  const face=elem('span','bshelf-book-face');
  const placeholder=elem('span','bshelf-title-fallback');
  placeholder.append(elem('span','bshelf-fallback-signet','✦'),
   elem('span','bshelf-fallback-title',book.title));
  if(book.author)placeholder.append(elem('span','bshelf-fallback-author',book.author));
  const image=elem('img','bshelf-real-cover');
  image.alt='';image.decoding='async';image.loading='eager';
  face.append(placeholder,image);
  if((Number(book.progress_percent)||0)>0){
   const pct=Math.min(100,Math.max(0,Number(book.progress_percent)||0));
   const bar=elem('span','bshelf-book-progress'),fill=elem('i');
   fill.style.width=pct+'%';bar.append(fill);face.append(bar);
  }
  button.append(face);
  if(book.is_favorite)button.append(elem('span','bshelf-book-mark','♥'));
  button.addEventListener('click',()=>{
   if(!state.connected)return setStatus('Microsoft-kapcsolat szükséges a könyv megnyitásához.',true);
   const reader=w.SH9_BOOK_STUDIO_V1;
   if(!reader?.openBook)return setStatus('A könyvolvasó nem töltődött be. Frissítsd az oldalt.',true);
   void reader.openBook(book.id);
  });
  const url=state.covers.get(book.id);
  if(url)paintCover(button,url);
  return button;
 }
 function render(){
  // Fresh DOM book faces need their own decoded image load events.
  state.displayed.clear();
  const key=clean(search.value);
  const visible=state.books.filter(b=>!hiddenBook(b)&&(!key||clean(b.title+' '+(b.author||'')).includes(key)));
  const perRow=cols();
  const rowCount=Math.max(4,Math.ceil(visible.length/perRow));
  const frag=d.createDocumentFragment();
  for(let rowIndex=0;rowIndex<rowCount;rowIndex++){
   const row=elem('div','bshelf-row');
   row.setAttribute('role','group');
   row.setAttribute('aria-label',(rowIndex+1)+'. polc');
   const group=visible.slice(rowIndex*perRow,(rowIndex+1)*perRow);
   if(group.length===0)row.classList.add('empty-row');
   for(const [slot,book] of group.entries())
    row.append(bookButton(book,rowIndex*perRow+slot));
   frag.append(row);
  }
  rows.replaceChildren(frag);
  statusOnly();
  if(key&&!visible.length&&state.books.length){
   empty.hidden=false;empty.querySelector('span').textContent='Nincs találat. Próbálj másik címet vagy szerzőt.';
   empty.querySelector('button').hidden=true;
  }else empty.querySelector('button').hidden=false;
 }
 function update(books,account,profile){
  // The integration only calls update AFTER Microsoft account verification.
  const nextScope=hiddenKey(account,profile);
  if(state.scope!==nextScope){state.scope=nextScope;state.account=String(account||'').toLowerCase();state.profile=String(profile||'');state.hidden=readHidden(nextScope)}
  state.books=Array.isArray(books)?books.filter(b=>b?.source==='onedrive'&&b?.id&&b?.title).map(b=>({
   id:String(b.id),title:title(b.title).slice(0,200),
   author:title(b.author).slice(0,200),
   is_favorite:!!b.is_favorite,progress_percent:Number(b.progress_percent)||0,
   drive_item_id:String(b.drive_item_id||''),web_url:String(b.web_url||'')
  })):[];
  state.loading=false;
  state.error=false;
  state.connected=true;
  render();renderManage();
 }
 function init(){
  searchBtn.addEventListener('click',()=>{navMenu(false);searchPanel(searchBox.hidden)});
  settingsBtn.addEventListener('click',()=>{searchPanel(false);navMenu(menu.hidden)});
  $('bshelfSearchClear').addEventListener('click',()=>{search.value='';render();search.focus()});
  search.addEventListener('input',render);
  $('bshelfMenuOneDrive').addEventListener('click',()=>adminView('bookStudioSettings','☁️ OneDrive kapcsolat'));
  $('bshelfMenuManage').addEventListener('click',()=>adminView('bshelfManagePanel','📚 Könyvtár szerkesztése'));
  manageSearch.addEventListener('input',renderManage);
  $('bshelfMenuCovers').addEventListener('click',()=>adminView('onedriveBooks','🖼️ Borítók és könyvtárkezelés'));
  $('bshelfMenuUploads').addEventListener('click',()=>adminView('library','＋ Külön feltöltött könyvek'));
  $('bshelfConnectAction').addEventListener('click',()=>state.books.some(hiddenBook)?adminView('bshelfManagePanel','📚 Könyvtár szerkesztése'):adminView('bookStudioSettings','☁️ OneDrive kapcsolat'));
  $('bshelfAdminBack').addEventListener('click',frontView);
  $('profileSwitch').addEventListener('click',()=>{navMenu(false);setLoading(true);state.books=[];render()});
  d.addEventListener('keydown',e=>{
   if(e.key!=='Escape')return;
   if(!menu.hidden){navMenu(false);settingsBtn.focus()}
   else if(!searchBox.hidden){searchPanel(false);searchBtn.focus()}
   else if(!admin.hidden){frontView()}
  });
  d.addEventListener('pointerdown',e=>{
   if(menu.hidden||menu.contains(e.target)||settingsBtn.contains(e.target))return;
   navMenu(false);
  });
  let lastCols=cols();
  w.addEventListener('resize',()=>{
   const now=cols();if(now===lastCols)return;
   lastCols=now;render();
  },{passive:true});
  render();
 }
 w.SH9_BOOKSHELF_V10=Object.freeze({update,coverReady,setStatus,setConnected,setLoading,setCoverProgress,finishCoverProgress,frontView});
 init();
})(window,document);