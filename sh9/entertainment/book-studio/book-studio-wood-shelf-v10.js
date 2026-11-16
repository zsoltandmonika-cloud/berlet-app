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
 const state={books:[],remoteBooks:[],localBooks:[],covers:new Map(),connected:false,loading:true,error:false,message:'☁️ OneDrive-könyvtár előkészítése…',coverScanning:false,coverDone:0,coverTotal:0,displayed:new Set(),hidden:new Set(),scope:'',account:'',profile:'',sortMode:'title',customOrder:[],sortScope:'',offline:false};
 const main=$('bshelfFront'),admin=$('bsAdminView'),menu=$('bshelfSettingsMenu');
 const settingsBtn=$('bshelfSettingsToggle'),searchBtn=$('bshelfSearchToggle'),sortBtn=$('bshelfSortToggle'),sortMenu=$('bshelfSortMenu');
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
  if(open)closeSort();
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
  const list=sortBooks(state.books.filter(b=>!needle||clean(b.title+' '+b.author).includes(needle)))
   .sort((a,b)=>Number(hiddenBook(a))-Number(hiddenBook(b)));
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
   if(!hiddenBook(book)){
    const up=elem('button','bshelf-order-action','↑'),down=elem('button','bshelf-order-action','↓');
    up.type=down.type='button';
    up.setAttribute('aria-label','Könyv előrébb: '+book.title);
    down.setAttribute('aria-label','Könyv hátrébb: '+book.title);
    up.title='Egy hellyel előrébb';down.title='Egy hellyel hátrébb';
    up.addEventListener('click',()=>moveBook(book,-1));
    down.addEventListener('click',()=>moveBook(book,1));
    actions.append(up,down);
   }
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

 // Arrange the wooden bookshelf only; never rename, move or delete OneDrive files.
 // Like the existing hide feature, preferences are local per Microsoft account
 // AND SHO profile. The default remains alphabetical for older installations.
 const SORT_MODES=new Set(['title','titleDesc','author','favorites','reading','manual']);
 const bookKey=book=>book.drive_item_id||book.id;
 const titleCompare=(a,b)=>a.title.localeCompare(b.title,'hu-HU',{numeric:true,sensitivity:'base'});
 function sortStorageKey(hiddenScope){
  return hiddenScope?hiddenScope.replace(/^sh9-book-hidden-v13:/,'sh9-book-sort-v17:'):'';
 }
 function loadSort(hiddenScope){
  state.sortScope=sortStorageKey(hiddenScope);
  state.sortMode='title';state.customOrder=[];
  if(!state.sortScope)return;
  try{
   const item=JSON.parse(w.localStorage.getItem(state.sortScope)||'{}');
   if(SORT_MODES.has(item.mode))state.sortMode=item.mode;
   if(Array.isArray(item.order))state.customOrder=
    [...new Set(item.order.filter(x=>typeof x==='string'&&x.length<500))].slice(0,3000);
  }catch(_){}
  paintSortSelection();
 }
 function saveSort(){
  if(!state.sortScope)return false;
  try{
   w.localStorage.setItem(state.sortScope,JSON.stringify({
    mode:state.sortMode,order:state.customOrder.slice(0,3000)
   }));
   return true;
  }catch(_){
   w.alert?.('A sorrend nem menthető. Ellenőrizd a böngésző tárhelyét.');
   return false;
  }
 }
 function sortBooks(books){
  const list=books.slice(),mode=state.sortMode;
  if(mode==='manual'){
   const positions=new Map(state.customOrder.map((key,index)=>[key,index]));
   return list.sort((a,b)=>{
    const ai=positions.get(bookKey(a)),bi=positions.get(bookKey(b));
    return (ai===undefined?Number.MAX_SAFE_INTEGER:ai)-
     (bi===undefined?Number.MAX_SAFE_INTEGER:bi)||titleCompare(a,b);
   });
  }
  return list.sort((a,b)=>{
   if(mode==='titleDesc')return -titleCompare(a,b);
   if(mode==='author')return a.author.localeCompare(b.author,'hu-HU',{sensitivity:'base'})||titleCompare(a,b);
   if(mode==='favorites')return Number(b.is_favorite)-Number(a.is_favorite)||titleCompare(a,b);
   if(mode==='reading'){
    const active=x=>Number(x.progress_percent)>0&&Number(x.progress_percent)<100?1:0;
    return active(b)-active(a)||
     Number(b.progress_percent)-Number(a.progress_percent)||titleCompare(a,b);
   }
   return titleCompare(a,b);
  });
 }
 function paintSortSelection(){
  const lookup={title:'bshelfSortTitle',titleDesc:'bshelfSortTitleDesc',
   author:'bshelfSortAuthor',favorites:'bshelfSortFavorites',
   reading:'bshelfSortReading',manual:'bshelfSortManual'};
  for(const [mode,id] of Object.entries(lookup)){
   const button=$(id);if(!button)continue;
   button.setAttribute('aria-pressed',String(mode===state.sortMode));
   button.classList.toggle?.('selected',mode===state.sortMode);
  }
 }
 function openSort(on){
  sortMenu.hidden=!on;
  sortBtn.setAttribute('aria-expanded',String(on));
  paintSortSelection();
 }
 function closeSort(){openSort(false)}
 function ensureManualOrder(){
  // Keep manual placement for existing books; newly imported books are
  // appended. The OneDrive scan can gain books between sessions.
  const reference=sortBooks(state.books);
  if(state.sortMode!=='manual'||!state.customOrder.length){
   state.customOrder=reference.map(bookKey);
  }else{
   const known=new Set(state.customOrder);
   for(const book of reference){
    const key=bookKey(book);
    if(!known.has(key)){state.customOrder.push(key);known.add(key)}
   }
  }
 }
 function setSortMode(mode){
  if(!SORT_MODES.has(mode))return;
  if(mode==='manual')ensureManualOrder();
  state.sortMode=mode;
  if(saveSort()){render();renderManage()}
  closeSort();
 }
 function moveBook(book,direction){
  if(!state.books.length)return;
  // On first arrow press, preserve the CURRENT visible order before switching
  // to 'Saját sorrend'; imported new books can also be moved.
  ensureManualOrder();
  const visibleOrdered=sortBooksManual(state.books).filter(b=>!hiddenBook(b));
  const index=visibleOrdered.findIndex(b=>bookKey(b)===bookKey(book));
  const other=visibleOrdered[index+direction];
  if(index<0||!other)return;
  const from=state.customOrder.indexOf(bookKey(book));
  const to=state.customOrder.indexOf(bookKey(other));
  if(from<0||to<0)return;
  [state.customOrder[from],state.customOrder[to]]=[state.customOrder[to],state.customOrder[from]];
  state.sortMode='manual';
  if(saveSort()){render();renderManage();paintSortSelection()}
 }
 function sortBooksManual(books){
  const idx=new Map(state.customOrder.map((key,i)=>[key,i]));
  return books.slice().sort((a,b)=>
   (idx.get(bookKey(a))??Number.MAX_SAFE_INTEGER)-
   (idx.get(bookKey(b))??Number.MAX_SAFE_INTEGER)||titleCompare(a,b));
 }
 function searchPanel(open){
  searchBox.hidden=!open;searchBtn.setAttribute('aria-expanded',String(open));
  if(open)search.focus();
  else if(search.value){search.value='';render()}
 }
 function adminView(target,caption){
  navMenu(false);
  main.hidden=true;admin.hidden=false;
  admin.dataset.mode=target==='bshelfManagePanel'?'manage':target==='bshelfOfflinePanel'?'offline':'classic';
  $('bshelfManagePanel').hidden=target!=='bshelfManagePanel';
  $('bshelfOfflinePanel').hidden=target!=='bshelfOfflinePanel';
  if(target==='bshelfOfflinePanel')void w.SH9_BOOK_OFFLINE_V21?.inspect();
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
  const source=state.offline?'📱 Helyi könyvtár':'☁️ OneDrive';
  count.textContent=n? n+' könyv'+(hiddenCount?' · '+hiddenCount+' elrejtve':'')+' · '+source:state.loading?'Csatlakozás…':hiddenCount?hiddenCount+' elrejtett könyv':source;
  message.textContent=state.loading?'📚 '+(state.message.replace(/^[☁️📚📂\s]+/u,'')||'Könyvek beolvasása…'):
   n&&state.coverScanning?'🖼️ Eredeti borítók automatikusan: '+state.coverDone+'/'+state.coverTotal+' · '+state.displayed.size+' megjelenítve':
   n?'✓ '+n+' könyv · '+state.displayed.size+' borító · '+source:state.message;
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
 function setOffline(on){state.offline=!!on;statusOnly()}
 function setConnected(on){
  state.connected=!!on;
  if(!on){state.remoteBooks=[];state.books=state.localBooks.slice();state.covers.clear();state.displayed.clear();state.coverScanning=false;state.scope='';state.account='';state.profile='';state.hidden.clear();state.sortScope='';state.sortMode='title';state.customOrder=[]}
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
   if(book.source!=='local'&&!state.connected)return setStatus('Microsoft-kapcsolat szükséges a könyv megnyitásához.',true);
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
  const visible=sortBooks(state.books.filter(b=>!hiddenBook(b)&&(!key||clean(b.title+' '+(b.author||'')).includes(key))));
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
  if(state.scope!==nextScope){state.scope=nextScope;state.account=String(account||'').toLowerCase();state.profile=String(profile||'');state.hidden=readHidden(nextScope);loadSort(nextScope)}
  state.remoteBooks=Array.isArray(books)?books.filter(b=>b?.source==='onedrive'&&b?.id&&b?.title).map(b=>({
   id:String(b.id),title:title(b.title).slice(0,200),
   author:title(b.author).slice(0,200),
   is_favorite:!!b.is_favorite,progress_percent:Number(b.progress_percent)||0,
   drive_item_id:String(b.drive_item_id||''),web_url:String(b.web_url||''),source:'onedrive'
  })):[];
  state.books=[...state.localBooks,...state.remoteBooks];
  state.loading=false;
  state.error=false;
  state.connected=true;
  render();renderManage();
 }
 function setLocalBooks(books,profile){
  const current=(()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return'zsolt'}})();
  if(profile!==current)return;
  state.localBooks=Array.isArray(books)?books.filter(b=>b?.source==='local'&&b?.profile_key===current&&b?.id&&b?.title).map(b=>({
   id:String(b.id),title:title(b.title).slice(0,200),author:title(b.author).slice(0,200),
   source:'local',profile_key:current,is_favorite:!!b.is_favorite,
   progress_percent:Number(b.progress_percent)||0,drive_item_id:''
  })):[];
  state.books=[...state.localBooks,...state.remoteBooks];
  if(state.localBooks.length)state.loading=false;
  render();renderManage();
 }
 function init(){
  searchBtn.addEventListener('click',()=>{navMenu(false);closeSort();searchPanel(searchBox.hidden)});
  settingsBtn.addEventListener('click',()=>{searchPanel(false);closeSort();navMenu(menu.hidden)});
  sortBtn.addEventListener('click',()=>{navMenu(false);searchPanel(false);openSort(sortMenu.hidden)});
  $('bshelfSearchClear').addEventListener('click',()=>{search.value='';render();search.focus()});
  search.addEventListener('input',render);
  for(const [id,mode] of [['bshelfSortTitle','title'],['bshelfSortTitleDesc','titleDesc'],
    ['bshelfSortAuthor','author'],['bshelfSortFavorites','favorites'],
    ['bshelfSortReading','reading'],['bshelfSortManual','manual']]){
   $(id).addEventListener('click',()=>setSortMode(mode));
  }
  $('bshelfMenuOneDrive').addEventListener('click',()=>adminView('bookStudioSettings','☁️ OneDrive kapcsolat'));
  $('bshelfMenuOffline').addEventListener('click',()=>adminView('bshelfOfflinePanel','📱 Offline könyvtár'));
  $('bshelfMenuManage').addEventListener('click',()=>adminView('bshelfManagePanel','📚 Könyvtár szerkesztése'));
  manageSearch.addEventListener('input',renderManage);
  $('bshelfMenuCovers').addEventListener('click',()=>adminView('onedriveBooks','🖼️ Borítók és könyvtárkezelés'));
  $('bshelfMenuUploads').addEventListener('click',()=>adminView('library','＋ Külön feltöltött könyvek'));
  $('bshelfConnectAction').addEventListener('click',()=>state.books.some(hiddenBook)?adminView('bshelfManagePanel','📚 Könyvtár szerkesztése'):adminView('bookStudioSettings','☁️ OneDrive kapcsolat'));
  $('bshelfAdminBack').addEventListener('click',frontView);
  $('profileSwitch').addEventListener('click',()=>{navMenu(false);setLoading(true);state.localBooks=[];state.remoteBooks=[];state.books=[];render()});
  d.addEventListener('keydown',e=>{
   if(e.key!=='Escape')return;
   if(!sortMenu.hidden){closeSort();sortBtn.focus()}
   else if(!menu.hidden){navMenu(false);settingsBtn.focus()}
   else if(!searchBox.hidden){searchPanel(false);searchBtn.focus()}
   else if(!admin.hidden){frontView()}
  });
  d.addEventListener('pointerdown',e=>{
   if(!menu.hidden&&!menu.contains(e.target)&&!settingsBtn.contains(e.target))navMenu(false);
   if(!sortMenu.hidden&&!sortMenu.contains(e.target)&&!sortBtn.contains(e.target))closeSort();
  });
  let lastCols=cols();
  w.addEventListener('resize',()=>{
   const now=cols();if(now===lastCols)return;
   lastCols=now;render();
  },{passive:true});
  render();
 }
 w.SH9_BOOKSHELF_V10=Object.freeze({update,setLocalBooks,coverReady,setStatus,setConnected,setOffline,setLoading,setCoverProgress,finishCoverProgress,frontView,openAdmin:adminView});
 init();
})(window,document);