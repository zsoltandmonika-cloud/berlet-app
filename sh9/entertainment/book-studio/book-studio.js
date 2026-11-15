/* SHO Book Studio v1 · private, profile-scoped EPUB/PDF library.
 * Auth: same HH family session; data and file operations require hh_profile_access.
 * DRM and offline file persistence are deliberately not claimed.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id),TABLE='hh_book_studio_books',BUCKET='hh-book-studio';
const MAX_BYTES=25*1024*1024;
const PDF_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const PALETTE=[['#162f6b','#7756a5'],['#56254d','#b85b63'],['#114e58','#3484a7'],['#59321d','#b27643'],['#1a4135','#59846a'],['#33235a','#a65e96']];
let api=null,books=[],busy=false,favoritesOnly=false,loadedProfile='',readerVersion=0;
let current=null,currentLocation='',epubBook=null,rendition=null,pdfDoc=null,pdfPage=1,pdfTask=null,pdfVersion=0,fontSize=100;
let saveTimer=0,writeQueue=Promise.resolve(),openCoverUrls=new Map(),refreshToken=0,toastTimer=0;
const profile=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return'zsolt'}};
const short=p=>p==='monika'?'m':'z';
const setStatus=(s,warn)=>{$('cloudState').textContent=s;$('cloudState').classList.toggle('warn',!!warn)};
const clean=s=>String(s||'').trim().replace(/[\x00-\x1f<>]/g,' ').slice(0,180);
const node=(tag,cls,txt)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
function toast(s){const x=$('toast');x.textContent=s;x.hidden=false;clearTimeout(toastTimer);toastTimer=w.setTimeout(()=>x.hidden=true,3800)}
function client(){
 const c=w.HH_CENTRAL_VAULT;
 if(!c?.enabled||!c.supabaseUrl||!c.publishableKey||!w.supabase?.createClient)throw Error('A felhőszolgáltatás nem tölthető be.');
 if(!api)api=w.supabase.createClient(c.supabaseUrl,c.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}
 });
 return api;
}
async function authorized(p){
 const c=client(),{data:{user}={},error}=await c.auth.getUser();
 if(error||!user?.id)throw Error('Jelentkezz be a Family Guardba az SHO-n belül.');
 const a=await c.from('hh_profile_access').select('profile_key').eq('user_id',user.id).eq('profile_key',p).maybeSingle();
 if(a.error||!a.data)throw Error('Ehhez a profilhoz nincs felhőhozzáférés.');
 return c;
}
function clearCovers(){for(const u of openCoverUrls.values())URL.revokeObjectURL(u);openCoverUrls.clear()}
function paintProfile(){
 const p=profile();d.documentElement.dataset.profile=short(p);
 $('profileSwitch').textContent=(p==='monika'?'Mónika':'Zsolt')+' ⟲';
}
async function loadBooks(){
 const token=++refreshToken,p=profile();
 clearCovers();paintProfile();setStatus('Kapcsolódás…',true);
 $('bookGrid').replaceChildren();$('emptyState').hidden=true;
 try{
  const c=await authorized(p);
  const {data,error}=await c.from(TABLE).select('*').eq('profile_key',p).order('updated_at',{ascending:false}).limit(500);
  if(error)throw Error(error.message);
  if(token!==refreshToken)return;
  loadedProfile=p;books=data||[];setStatus('🔒 Privát felhő',false);
  renderBooks();
  for(const b of books.filter(b=>b.cover_path)){void loadCover(b,p,token,c)}
 }catch(e){
  if(token!==refreshToken)return;
  loadedProfile='';books=[];setStatus('🔒 Bejelentkezés szükséges',true);
  $('emptyState').hidden=false;
  $('emptyState').querySelector('h3').textContent='A könyvtár nem érhető el.';
  $('emptyState').querySelector('p').textContent=e.message;
  $('bookCount').textContent='0 könyv';$('resumeSection').hidden=true;
  $('uploadFile').disabled=true;
  return;
 }
 $('uploadFile').disabled=false;
}
async function loadCover(b,p,token,c){
 try{
  const {data,error}=await c.storage.from(BUCKET).download(b.cover_path);
  if(error)throw error;
  const u=URL.createObjectURL(data);
  if(token!==refreshToken){URL.revokeObjectURL(u);return}
  openCoverUrls.set(b.id,u);
  const el=$('cover-'+b.id);
  if(el){el.style.backgroundImage='url("'+u+'")';el.classList.add('has-art')}
 }catch(_){/* Decorative cover remains when artwork is unavailable. */}
}
function renderBooks(){
 if(!loadedProfile)return;
 const filter=$('searchBooks').value.toLocaleLowerCase('hu-HU').trim();
 const shown=books.filter(b=>(!favoritesOnly||b.is_favorite)&&
  (!filter||(b.title+' '+(b.author||'')).toLocaleLowerCase('hu-HU').includes(filter)));
 $('bookCount').textContent=books.length+' könyv';
 $('bookGrid').replaceChildren();
 $('emptyState').hidden=!!shown.length;
 $('emptyState').querySelector('h3').textContent=books.length?'Nincs találat.':'A könyvespolc még üres.';
 $('emptyState').querySelector('p').textContent=books.length?'Módosítsd a keresést vagy a kedvencek szűrőjét.':'Adj hozzá egy DRM-mentes EPUB-ot vagy PDF-et.';
 const recent=books.find(b=>b.progress_locator&&Number(b.progress_percent)>=0);
 $('resumeSection').hidden=!recent;
 if(recent){
  $('resumeTitle').textContent=recent.title;$('resumeAuthor').textContent=recent.author||'Ismeretlen szerző';
  $('resumeProgress').style.width=Math.max(0,Math.min(100,Number(recent.progress_percent)||0))+'%';
  $('resumeButton').onclick=()=>void openBook(recent.id);
 }
 for(const b of shown){
  const article=node('article','book-card'),cover=node('button','cover'),idx=b.id.split('').reduce((s,c)=>s+c.charCodeAt(0),0)%PALETTE.length;
  cover.id='cover-'+b.id;cover.type='button';cover.style.setProperty('--tone1',PALETTE[idx][0]);cover.style.setProperty('--tone2',PALETTE[idx][1]);
  cover.setAttribute('aria-label',b.title+' megnyitása');
  if(openCoverUrls.has(b.id)){cover.style.backgroundImage='url("'+openCoverUrls.get(b.id)+'")';cover.classList.add('has-art')}
  cover.append(node('span','cover-mark',b.format==='pdf'?'✦':'❖'),node('strong','',b.title),node('small','',b.author||'SHO BOOK STUDIO'));
  cover.addEventListener('click',()=>void openBook(b.id));
  article.append(cover,node('h3','',b.title),node('p','',b.author||'Ismeretlen szerző'));
  const actions=node('div','card-actions');
  const open=node('button','open','Olvasás →');open.type='button';open.addEventListener('click',()=>void openBook(b.id));
  const fav=node('button',b.is_favorite?'faved':'',b.is_favorite?'♥':'♡');fav.type='button';
  fav.setAttribute('aria-label',b.is_favorite?'Kedvenc eltávolítása':'Kedvencekhez adás');
  fav.addEventListener('click',()=>void toggleFavorite(b));
  const del=node('button','delete','🗑');del.type='button';del.setAttribute('aria-label',b.title+' törlése');del.addEventListener('click',()=>void deleteBook(b));
  actions.append(open,fav,del);article.append(actions);
  const prog=node('div','card-progress');const fill=node('span');fill.style.width=Math.max(0,Math.min(100,Number(b.progress_percent)||0))+'%';prog.append(fill);article.append(prog);
  $('bookGrid').append(article);
 }
}
async function toggleFavorite(b){
 try{
  const c=await authorized(profile()),value=!b.is_favorite;
  const {error}=await c.from(TABLE).update({is_favorite:value,updated_at:new Date().toISOString()}).eq('id',b.id).eq('profile_key',profile());
  if(error)throw error;
  b.is_favorite=value;renderBooks();
 }catch(e){toast('Nem sikerült menteni: '+e.message)}
}
async function deleteBook(b){
 if(!w.confirm('Végleg törlöd ezt a könyvet a felhőből?\n\n'+b.title))return;
 try{
  const p=profile(),c=await authorized(p);
  if(current?.id===b.id)await closeReader();
  const {error}=await c.from(TABLE).delete().eq('id',b.id).eq('profile_key',p);
  if(error)throw error;
  const paths=[b.storage_path,b.cover_path].filter(Boolean);
  const removed=await c.storage.from(BUCKET).remove(paths);
  if(removed.error)toast('A könyv törölve, de a fájltakarítás ellenőrzést igényel.');
  books=books.filter(x=>x.id!==b.id);
  const cover=openCoverUrls.get(b.id);if(cover){URL.revokeObjectURL(cover);openCoverUrls.delete(b.id)}
  renderBooks();
 }catch(e){toast('Törlési hiba: '+e.message)}
}
async function fileFormat(f){
 const ext=(f.name.split('.').pop()||'').toLowerCase();
 if(!['epub','pdf'].includes(ext)||!f.size||f.size>MAX_BYTES)throw Error('Csak EPUB/PDF, maximum 25 MB tölthető fel.');
 const header=new Uint8Array(await f.slice(0,8).arrayBuffer());
 if(ext==='pdf'&&String.fromCharCode(...header.slice(0,5))!=='%PDF-')throw Error('A fájl nem érvényes PDF.');
 if(ext==='epub'&&(header[0]!==80||header[1]!==75))throw Error('A fájl nem érvényes EPUB/ZIP.');
 if(ext==='epub'){
  if(!w.JSZip||!w.ePub)throw Error('Az EPUB feldolgozó nem elérhető.');
  const zip=await w.JSZip.loadAsync(file);
  const mt=zip.file('mimetype');
  if(!mt||(await mt.async('string')).trim()!=='application/epub+zip')throw Error('A fájl nem szabványos EPUB.');
 }
 if(ext==='pdf'&&!w.pdfjsLib)throw Error('A PDF-olvasó nem elérhető.');
 return ext;
}
function coverCanvas(source,width,height){
 const maxW=440,maxH=590,ratio=Math.min(maxW/width,maxH/height,1);
 const cv=d.createElement('canvas');cv.width=Math.round(width*ratio);cv.height=Math.round(height*ratio);
 cv.getContext('2d').drawImage(source,0,0,cv.width,cv.height);
 return new Promise(resolve=>cv.toBlob(resolve,'image/jpeg',.8));
}
async function extractMetadata(file,ext){
 let title=clean(file.name.replace(/\.[^.]+$/,'')),author='',cover=null;
 if(ext==='epub'&&w.ePub){
  let book;
  try{
   book=w.ePub(await file.arrayBuffer());
   const meta=await book.loaded.metadata;
   title=clean(meta?.title)||title;author=clean(meta?.creator);
   const imgUrl=await book.coverUrl();
   if(imgUrl){
    const img=new Image();img.src=imgUrl;
    try{await img.decode();cover=await coverCanvas(img,img.naturalWidth,img.naturalHeight)}catch(_){}
   }
  }catch(_){}finally{try{book?.destroy()}catch(_){}}
 }else if(ext==='pdf'&&w.pdfjsLib){
  let docPdf=null;
  try{
   w.pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER;
   docPdf=await w.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   const page=await docPdf.getPage(1);
   const vp=page.getViewport({scale:1});
   const ratio=Math.min(440/vp.width,590/vp.height,1);
   const canvas=d.createElement('canvas');canvas.width=Math.max(1,Math.round(vp.width*ratio));canvas.height=Math.max(1,Math.round(vp.height*ratio));
   await page.render({canvasContext:canvas.getContext('2d'),viewport:page.getViewport({scale:ratio})}).promise;
   cover=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));
  }catch(_){}finally{try{await docPdf?.destroy()}catch(_){}}
 }
 return {title,author,cover};
}
async function importBook(file){
 if(busy)return;
 busy=true;$('uploadFile').disabled=true;$('importStatus').textContent='Könyv előkészítése…';
 let stored=null,coverPath=null,c=null;
 try{
  const p=profile(),ext=await fileFormat(file);
  c=await authorized(p);
  const meta=await extractMetadata(file,ext),id=w.crypto.randomUUID(),path=p+'/'+id+'.'+ext;
  $('importStatus').textContent='Privát felhőfeltöltés…';
  const upload=await c.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:ext==='pdf'?'application/pdf':'application/epub+zip'});
  if(upload.error)throw Error(upload.error.message);
  stored=path;
  if(meta.cover&&meta.cover.size<2000000){
   const pathCover=p+'/'+id+'.cover.jpg';
   const result=await c.storage.from(BUCKET).upload(pathCover,meta.cover,{upsert:false,contentType:'image/jpeg'});
   if(!result.error)coverPath=pathCover;
  }
  const row={id,profile_key:p,title:meta.title,author:meta.author,file_name:clean(file.name),
   format:ext,storage_path:path,cover_path:coverPath,size_bytes:file.size,progress_locator:null,
   progress_percent:0,bookmarks:[],is_favorite:false,theme:'dark',font_size:100};
  const {error}=await c.from(TABLE).insert(row);
  if(error)throw Error(error.message);
  $('importStatus').textContent='✓ A könyv biztonságosan mentve';
  toast('📚 '+meta.title+' hozzáadva!');
  await loadBooks();
 }catch(e){
  if(c&&stored)await c.storage.from(BUCKET).remove([stored,coverPath].filter(Boolean));
  $('importStatus').textContent='Feltöltési hiba: '+e.message;toast('Feltöltési hiba: '+e.message);
 }finally{busy=false;$('uploadFile').value='';$('uploadFile').disabled=!!(!loadedProfile)}
}
function updateReaderUI(){
 if(!current)return;
 $('readerTitle').textContent=current.title;$('readerAuthor').textContent=current.author||'Ismeretlen szerző';
 $('readerTheme').value=current.theme||'dark';$('reader').dataset.theme=current.theme||'dark';
 fontSize=current.font_size||100;
 showBookmarks();
}
function showBookmarks(){
 const list=$('bookmarkList');list.replaceChildren();
 list.append(node('option','','Könyvjelzők…'));list.firstElementChild.value='';
 (current?.bookmarks||[]).forEach((b,i)=>{
  const o=node('option','',b.label||'Könyvjelző '+(i+1));o.value=b.locator;list.append(o);
 });
}
function position(locator,percent,label){
 if(!current)return;
 currentLocation=String(locator||'');
 current.progress_locator=currentLocation;
 current.progress_percent=Math.max(0,Math.min(100,Math.round(Number(percent)||0)));
 $('readerProgress').textContent=current.progress_percent+'%';
 $('pageLabel').textContent=label||'Olvasás';
 clearTimeout(saveTimer);saveTimer=w.setTimeout(()=>void queueSave(),850);
}
function queueSave(){
 clearTimeout(saveTimer);saveTimer=0;
 if(!current)return writeQueue;
 const p=profile(),id=current.id,patch={
  progress_locator:current.progress_locator,progress_percent:current.progress_percent,
  bookmarks:current.bookmarks||[],theme:current.theme||'dark',font_size:current.font_size||100,
  updated_at:new Date().toISOString()
 };
 writeQueue=writeQueue.catch(()=>{}).then(async()=>{
  const c=await authorized(p);
  const {error}=await c.from(TABLE).update(patch).eq('id',id).eq('profile_key',p);
  if(error)throw Error(error.message);
 }).catch(e=>{toast('A könyvjelző / pozíció nem menthető: '+e.message)});
 return writeQueue;
}
function applyTheme(){
 const theme=current?.theme||'dark';$('reader').dataset.theme=theme;
 if(rendition){
  const ink=theme==='dark'?'#f8f2ff':theme==='sepia'?'#493f30':'#24222c';
  const bg=theme==='dark'?'#17182b':theme==='sepia'?'#eee4cc':'#f8f8f8';
  rendition.themes.default({body:{'background-color':bg,color:ink,'font-family':'Georgia,serif'}});
  rendition.themes.fontSize(fontSize+'%');
 }
 if(pdfDoc)void renderPDF();
}
async function openBook(id){
 const b=books.find(x=>x.id===id);if(!b||busy)return;
 await closeReader();
 const version=++readerVersion;
 current={...b,bookmarks:Array.isArray(b.bookmarks)?b.bookmarks.slice():[]};
 currentLocation=current.progress_locator||'';pdfPage=1;pdfDoc=null;rendition=null;epubBook=null;
 $('reader').hidden=false;d.body.style.overflow='hidden';$('readerMessage').hidden=false;
 $('readerMessage').textContent='A könyv letöltése a privát felhőből…';
 $('epubStage').hidden=true;$('pdfStage').hidden=true;$('pdfStage').replaceChildren();$('epubStage').replaceChildren();
 updateReaderUI();$('closeReader').focus();
 try{
  const c=await authorized(b.profile_key);
  const {data,error}=await c.storage.from(BUCKET).download(b.storage_path);
  if(error)throw Error(error.message);
  if(version!==readerVersion)return;
  const bytes=await data.arrayBuffer();
  if(b.format==='epub'){
   if(!w.ePub)throw Error('Az EPUB-olvasó nem töltődött be.');
   $('epubStage').hidden=false;
   epubBook=w.ePub(bytes);
   rendition=epubBook.renderTo('epubStage',{width:'100%',height:'100%',flow:'paginated',spread:'none',allowScriptedContent:false});
   rendition.on('relocated',loc=>{
    if(version!==readerVersion||!loc?.start)return;
    const count=epubBook?.spine?.length||1;
    const approx=((loc.start.index||0)+(loc.start.displayed?.page||1)/(loc.start.displayed?.total||1))/count*100;
    position(loc.start.cfi,approx,'EPUB · '+Math.round(approx)+'%');
   });
   $('readerMessage').hidden=true;applyTheme();
   await rendition.display(b.progress_locator||undefined);
  }else{
   if(!w.pdfjsLib)throw Error('A PDF-olvasó nem töltődött be.');
   w.pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER;
   pdfDoc=await w.pdfjsLib.getDocument({data:new Uint8Array(bytes)}).promise;
   if(version!==readerVersion)return;
   pdfPage=Math.min(pdfDoc.numPages,Math.max(1,Number.parseInt(b.progress_locator,10)||1));
   $('pdfStage').hidden=false;$('readerMessage').hidden=true;
   await renderPDF();
  }
 }catch(e){
  if(version!==readerVersion)return;
  $('readerMessage').hidden=false;$('readerMessage').textContent='Nem nyitható meg: '+e.message;
  toast(e.message);
 }
}
async function renderPDF(){
 if(!pdfDoc||!current)return;
 const version=++pdfVersion;
 if(pdfTask){try{pdfTask.cancel()}catch(_){}}
 try{
  const page=await pdfDoc.getPage(pdfPage);
  if(version!==pdfVersion)return;
  const normal=page.getViewport({scale:1}),available=Math.max(200,$('readerContent').clientWidth-32);
  const scale=(available/normal.width)*(fontSize/100),v=page.getViewport({scale});
  const pixelRatio=Math.min(w.devicePixelRatio||1,2);
  const canvas=d.createElement('canvas');
  canvas.width=Math.round(v.width*pixelRatio);canvas.height=Math.round(v.height*pixelRatio);
  canvas.style.width=Math.round(v.width)+'px';canvas.style.height=Math.round(v.height)+'px';
  const ctx=canvas.getContext('2d');ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  pdfTask=page.render({canvasContext:ctx,viewport:v});
  await pdfTask.promise;
  if(version!==pdfVersion)return;
  $('pdfStage').replaceChildren(canvas);
  $('readerContent').scrollTop=0;
  position(String(pdfPage),100*pdfPage/pdfDoc.numPages,'PDF · '+pdfPage+' / '+pdfDoc.numPages);
 }catch(e){if(e?.name!=='RenderingCancelledException')toast('PDF-megjelenítési hiba: '+e.message)}
}
async function pageMove(step){
 try{
  if(rendition){await (step<0?rendition.prev():rendition.next());return}
  if(pdfDoc){pdfPage=Math.max(1,Math.min(pdfDoc.numPages,pdfPage+step));await renderPDF()}
 }catch(e){toast('Lapozási hiba: '+e.message)}
}
async function jumpTo(locator){
 if(!current||!locator)return;
 try{
  if(rendition)await rendition.display(locator);
  else if(pdfDoc){pdfPage=Math.min(pdfDoc.numPages,Math.max(1,Number(locator)||1));await renderPDF()}
 }catch(e){toast('A könyvjelző nem nyitható meg: '+e.message)}
}
async function closeReader(){
 if(!current){$('reader').hidden=true;d.body.style.overflow='';return}
 ++readerVersion;
 clearTimeout(saveTimer);await queueSave();
 for(const b of books)if(b.id===current.id){Object.assign(b,current);break}
 if(rendition){try{rendition.destroy()}catch(_){}rendition=null}
 if(epubBook){try{epubBook.destroy()}catch(_){}epubBook=null}
 if(pdfTask){try{pdfTask.cancel()}catch(_){}pdfTask=null}
 if(pdfDoc){try{await pdfDoc.destroy()}catch(_){}pdfDoc=null}
 $('reader').hidden=true;d.body.style.overflow='';current=null;currentLocation='';
 renderBooks();
}
async function mark(){
 if(!current||!currentLocation)return toast('Előbb nyiss meg egy oldalt!');
 const marks=Array.isArray(current.bookmarks)?current.bookmarks:[];
 if(marks.some(m=>m.locator===currentLocation))return toast('Ehhez az oldalhoz már van könyvjelző.');
 const label=($('pageLabel').textContent||'Oldal')+' · '+new Date().toLocaleDateString('hu-HU');
 current.bookmarks=[...marks,{locator:currentLocation,label}].slice(-80);
 showBookmarks();await queueSave();toast('🔖 Könyvjelző mentve.');
}
function setFont(delta){
 if(!current)return;
 fontSize=Math.min(160,Math.max(75,fontSize+delta));current.font_size=fontSize;
 applyTheme();void queueSave();
}
$('profileSwitch').addEventListener('click',async()=>{
 await closeReader();
 const next=profile()==='zsolt'?'m':'z';
 try{w.localStorage.setItem('hh-profile',next)}catch(_){return}
 void loadBooks();
});
$('uploadFile').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)void importBook(file)});
$('searchBooks').addEventListener('input',renderBooks);
$('favOnly').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;$('favOnly').setAttribute('aria-pressed',String(favoritesOnly));renderBooks()});
$('closeReader').addEventListener('click',()=>void closeReader());
$('prevPage').addEventListener('click',()=>void pageMove(-1));
$('nextPage').addEventListener('click',()=>void pageMove(1));
$('readerTheme').addEventListener('change',()=>{if(!current)return;current.theme=$('readerTheme').value;applyTheme();void queueSave()});
$('smallerText').addEventListener('click',()=>setFont(-10));
$('biggerText').addEventListener('click',()=>setFont(10));
$('addBookmark').addEventListener('click',()=>void mark());
$('bookmarkList').addEventListener('change',()=>{const l=$('bookmarkList');void jumpTo(l.value);l.value=''});
d.addEventListener('keydown',e=>{
 if($('reader').hidden||e.target?.matches('input,textarea,select'))return;
 if(e.key==='Escape'){e.preventDefault();void closeReader()}
 if(e.key==='ArrowRight'){e.preventDefault();void pageMove(1)}
 if(e.key==='ArrowLeft'){e.preventDefault();void pageMove(-1)}
});
let resizeTimer=0;
w.addEventListener('resize',()=>{if(!pdfDoc)return;clearTimeout(resizeTimer);resizeTimer=w.setTimeout(()=>void renderPDF(),220)});
w.addEventListener('storage',e=>{if(e.key==='hh-profile'&&short(profile())!==d.documentElement.dataset.profile)void closeReader().then(loadBooks)});
w.addEventListener('pagehide',()=>{if(current)void queueSave();clearCovers()});
paintProfile();void loadBooks();
})(window,document);