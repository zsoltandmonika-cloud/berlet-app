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
 const state={books:[],covers:new Map(),connected:false,loading:true,error:false,message:'☁️ OneDrive-könyvtár előkészítése…'};
 const main=$('bshelfFront'),admin=$('bsAdminView'),menu=$('bshelfSettingsMenu');
 const settingsBtn=$('bshelfSettingsToggle'),searchBtn=$('bshelfSearchToggle');
 const searchBox=$('bshelfSearchBox'),search=$('bshelfSearch');
 const rows=$('bshelfRows'),empty=$('bshelfEmpty');
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
 function searchPanel(open){
  searchBox.hidden=!open;searchBtn.setAttribute('aria-expanded',String(open));
  if(open)search.focus();
  else if(search.value){search.value='';render()}
 }
 function adminView(target,caption){
  navMenu(false);
  main.hidden=true;admin.hidden=false;
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
  admin.hidden=true;main.hidden=false;
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
  const n=state.books.length;
  count.textContent=n? n+' könyv · ☁️ OneDrive':state.loading?'Csatlakozás…':'OneDrive';
  message.textContent=state.loading?'📚 '+(state.message.replace(/^[☁️📚📂\s]+/u,'')||'Könyvek beolvasása…'):
   n?'✓ '+n+' könyv az eredeti OneDrive-gyűjteményből':state.message;
  message.dataset.error=state.error?'1':'0';
  if(!state.loading&&!n){
   empty.hidden=false;
   const caption=empty.querySelector('span');
   caption.textContent=state.connected?'Ebben a könyvtárban még nincs találat. Ellenőrizd a OneDrive mappát a beállításokban.':
    'A OneDrive csatlakoztatását és a könyvek beolvasását a ⚙ gomb alatt érheted el.';
  }else empty.hidden=true;
 }
 function setConnected(on){
  state.connected=!!on;
  if(!on){state.books=[];state.covers.clear()}
  statusOnly();render();
 }
 function setLoading(on){
  state.loading=!!on;
  if(on){state.message='📂 Könyvek beolvasása…';state.error=false;}
  statusOnly();
 }
 function coverReady(id,url){
  if(!id||!url)return;
  state.covers.set(id,url);
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
  img.onload=()=>{
   if(img.dataset.url!==url)return;
   img.hidden=false;placeholder.hidden=true;
  };
  img.onerror=()=>{
   img.hidden=true;placeholder.hidden=false;
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
  image.alt='';image.decoding='async';image.loading='lazy';image.hidden=true;
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
  const key=clean(search.value);
  const visible=state.books.filter(b=>!key||clean(b.title+' '+(b.author||'')).includes(key));
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
 function update(books){
  // The integration only calls update AFTER Microsoft account verification.
  state.books=Array.isArray(books)?books.filter(b=>b?.source==='onedrive'&&b?.id&&b?.title).map(b=>({
   id:String(b.id),title:title(b.title).slice(0,200),
   author:title(b.author).slice(0,200),
   is_favorite:!!b.is_favorite,progress_percent:Number(b.progress_percent)||0
  })):[];
  state.loading=false;
  state.error=false;
  state.connected=true;
  render();
 }
 function init(){
  searchBtn.addEventListener('click',()=>{navMenu(false);searchPanel(searchBox.hidden)});
  settingsBtn.addEventListener('click',()=>{searchPanel(false);navMenu(menu.hidden)});
  $('bshelfSearchClear').addEventListener('click',()=>{search.value='';render();search.focus()});
  search.addEventListener('input',render);
  $('bshelfMenuOneDrive').addEventListener('click',()=>adminView('bookStudioSettings','☁️ OneDrive kapcsolat'));
  $('bshelfMenuCovers').addEventListener('click',()=>adminView('onedriveBooks','🖼️ Borítók és könyvtárkezelés'));
  $('bshelfMenuUploads').addEventListener('click',()=>adminView('library','＋ Külön feltöltött könyvek'));
  $('bshelfConnectAction').addEventListener('click',()=>adminView('bookStudioSettings','☁️ OneDrive kapcsolat'));
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
 w.SH9_BOOKSHELF_V10=Object.freeze({update,coverReady,setStatus,setConnected,setLoading,frontView});
 init();
})(window,document);