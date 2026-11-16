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
let epubLocsReady=false,pageChanging=false,turnTimer=0,curlEpoch=0;
const SOUND_KEY='sh9-book-page-sound-v4',THEME_PREF_KEY='sh9-book-explicit-theme-v20:';let pageAudio=null;
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
 const recent=books.find(b=>lastExplicitBookmark(b));
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
  const zip=await w.JSZip.loadAsync(f);
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
   progress_percent:0,bookmarks:[],is_favorite:false,theme:'sepia',font_size:100};
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
// V20: opening position is determined by an EXPLICIT saved bookmark.
// Automatic reading progress is still recorded for the UI, but it never
// silently becomes the next opening location.
function lastExplicitBookmark(book){
 const marks=Array.isArray(book?.bookmarks)?book.bookmarks:[];
 for(let i=marks.length-1;i>=0;i--){
  const loc=marks[i]?.locator;
  if(typeof loc!=='string'||!loc.trim())continue;
  if(book.format==='pdf'&&!/^[1-9]\d*$/.test(loc.trim()))continue;
  return loc.trim();
 }
 return '';
}
// Historic "dark" values were populated by the old default on every book.
// Only an explicit V20 selection of dark can override the new Sepia default.
// Existing Light/Sepia selections remain intact.
const themePrefKey=book=>THEME_PREF_KEY+
 encodeURIComponent(String(book?.profile_key||profile()))+':'+
 encodeURIComponent(String(book?.drive_id||'upload'))+':'+
 encodeURIComponent(String(book?.id||''));
function initialTheme(book){
 try{
  const selected=w.localStorage.getItem(themePrefKey(book));
  if(['dark','light','sepia'].includes(selected))return selected;
 }catch(_){}
 return book?.theme==='light'?'light':'sepia';
}
function rememberTheme(book,theme){
 if(!book||!['dark','light','sepia'].includes(theme))return;
 try{w.localStorage.setItem(themePrefKey(book),theme)}catch(_){}
}
function updateReaderUI(){
 if(!current)return;
 $('readerTitle').textContent=current.title;$('readerAuthor').textContent=current.author||'Ismeretlen szerző';
 $('readerTheme').value=current.theme||'sepia';$('reader').dataset.theme=current.theme||'sepia';
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
 const scrub=$('readerScrub');
 if(!scrub.matches(':active')){scrub.value=String(current.progress_percent);scrub.style.setProperty('--progress',current.progress_percent+'%');$('readerScrubPercent').textContent=current.progress_percent+'%'}
 clearTimeout(saveTimer);saveTimer=w.setTimeout(()=>void queueSave(),850);
}
function queueSave(){
 clearTimeout(saveTimer);saveTimer=0;
 if(!current)return writeQueue;
 const p=profile(),id=current.id,patch={
  progress_locator:current.progress_locator,progress_percent:current.progress_percent,
  bookmarks:current.bookmarks||[],theme:current.theme||'sepia',font_size:current.font_size||100,
  updated_at:new Date().toISOString()
 };
 const snapshot={...current,bookmarks:current.bookmarks?.slice()||[]};
 writeQueue=writeQueue.catch(()=>{}).then(async()=>{
  if(snapshot.source==='onedrive'){
   const drive=w.SH9_BOOK_STUDIO_DRIVE_V2;
   if(!drive)throw Error('A OneDrive-kapcsolat nem elérhető.');
   await drive.saveProgress(snapshot,patch);return;
  }
  const c=await authorized(p);
  const {error}=await c.from(TABLE).update(patch).eq('id',id).eq('profile_key',p);
  if(error)throw Error(error.message);
 }).catch(e=>{toast('A könyvjelző / pozíció nem menthető: '+e.message)});
 return writeQueue;
}
function soundEnabled(){try{return w.localStorage.getItem(SOUND_KEY)!=='off'}catch(_){return true}}
function updateSoundButton(){
 const b=$('readerSound');if(!b)return;
 b.textContent=soundEnabled()?'🔊 Lapozóhang: BE':'🔇 Lapozóhang: KI';
 b.setAttribute('aria-pressed',String(soundEnabled()));
 b.title='Halk könyvlap hang, bármikor kikapcsolható.';
}
function playPageTurnSound(){
 if(!soundEnabled())return;
 try{
  const AudioContext=w.AudioContext||w.webkitAudioContext;
  if(!AudioContext)return;
  if(!pageAudio)pageAudio=new AudioContext();
  if(pageAudio.state==='suspended')void pageAudio.resume().catch(()=>{});
  const t=pageAudio.currentTime,duration=.145,rate=pageAudio.sampleRate;
  const samples=Math.ceil(rate*duration),buffer=pageAudio.createBuffer(1,samples,rate),channel=buffer.getChannelData(0);
  for(let i=0;i<samples;i++){
   const pos=i/samples;
   channel[i]=((Math.random()*2-1)*.58+Math.sin(i*.066)*.13)*(1-pos)*Math.sin(Math.PI*Math.min(1,pos*2));
  }
  const src=pageAudio.createBufferSource(),filter=pageAudio.createBiquadFilter(),volume=pageAudio.createGain();
  src.buffer=buffer;filter.type='lowpass';filter.frequency.value=1300;filter.Q.value=.45;
  volume.gain.setValueAtTime(.0001,t);
  volume.gain.exponentialRampToValueAtTime(.017,t+.03);
  volume.gain.exponentialRampToValueAtTime(.0001,t+duration);
  src.connect(filter);filter.connect(volume);volume.connect(pageAudio.destination);
  src.start(t);src.stop(t+duration+.005);
 }catch(_){/* Sound is optional: no audio fault can interrupt paging. */}
}
// V19: EPUB.js/PDF.js remains the only source of page content.
// The page-curl overlay is cosmetic and never copies or stretches the text.
const CURL_DURATION=460,CURL_PREPARE=125;
const reducedCurl=()=>!!w.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const waitCurl=ms=>new Promise(resolve=>w.setTimeout(resolve,ms));
function resetCurl(){
 const r=$('reader'),layer=$('readerPageCurl');
 if(r)r.classList.remove('curl-active','curl-next','curl-prev','curl-peek','curl-peek-next','curl-peek-prev');
 if(layer){
  layer.hidden=true;
  for(const key of ['--curl-peek-opacity','--curl-peek-ratio','--curl-peek-slide','--curl-peek-angle'])
   layer.style.removeProperty(key);
 }
}
function beginCurl(step){
 const r=$('reader'),layer=$('readerPageCurl');
 if(reducedCurl()||!r||r.hidden||!layer)return false;
 r.classList.remove('curl-active','curl-next','curl-prev','curl-peek','curl-peek-next','curl-peek-prev');
 layer.hidden=false;
 void layer.offsetWidth;
 r.classList.add('curl-active',step>0?'curl-next':'curl-prev');
 return true;
}
function previewCurl(dx,width){
 const r=$('reader'),layer=$('readerPageCurl');
 if(reducedCurl()||pageChanging||!current||!layer||!r||r.hidden)return;
 const strength=Math.min(.78,Math.max(0,Math.abs(dx)/Math.max(160,width)));
 if(strength<.075){if(r.classList.contains('curl-peek'))resetCurl();return}
 const forward=dx<0;
 if(!r.classList.contains('curl-peek')||
   r.classList.contains('curl-peek-next')!==forward){
  r.classList.remove('curl-next','curl-prev','curl-active','curl-peek-next','curl-peek-prev');
  r.classList.add('curl-peek',forward?'curl-peek-next':'curl-peek-prev');
 }
 layer.hidden=false;
 layer.style.setProperty('--curl-peek-ratio',String(strength));
 layer.style.setProperty('--curl-peek-opacity',String(.13+strength*.47));
 layer.style.setProperty('--curl-peek-slide',(forward?-strength*35:strength*35).toFixed(1)+'px');
 layer.style.setProperty('--curl-peek-angle',(forward?-15-strength*69:15+strength*69).toFixed(1)+'deg');
}
function applyTheme(){
 const theme=current?.theme||'sepia';$('reader').dataset.theme=theme;
 if(rendition){
  const ink=theme==='dark'?'#fff7ed':theme==='sepia'?'#34281f':'#1d2230';
  const bg=theme==='dark'?'#252d3c':theme==='sepia'?'#f1e5c9':'#fffdf8';
  rendition.themes.default({
   body:{'background-color':bg,color:ink,'font-family':'Georgia,serif','line-height':'1.62','padding':'0 3.5%','margin':'0','text-align':'left'},
   p:{color:ink,'line-height':'1.62','margin-bottom':'.7em'},
   h1:{color:ink,'font-family':'Georgia,serif','line-height':'1.25','margin-top':'.65em','margin-bottom':'.5em'},
   h2:{color:ink,'font-family':'Georgia,serif','line-height':'1.3','margin-top':'.65em','margin-bottom':'.5em'},
   h3:{color:ink,'font-family':'Georgia,serif','line-height':'1.3','margin-top':'.65em','margin-bottom':'.5em'},
   a:{color:theme==='dark'?'#a5d9ff':'#345c96'}
  });
  rendition.themes.fontSize(fontSize+'%');
 }
 if(pdfDoc)void renderPDF();
}
async function openBook(id){
 const b=books.find(x=>x.id===id)||w.SH9_BOOK_STUDIO_DRIVE_V2?.getBook(id);if(!b||busy)return;
 await closeReader();
 const version=++readerVersion;
 current={...b,bookmarks:Array.isArray(b.bookmarks)?b.bookmarks.slice():[]};
 // A fresh open starts at the beginning unless the reader actually added
 // a bookmark with the 🔖 + control; use the latest such bookmark if present.
 const openAt=lastExplicitBookmark(current);
 current.theme=initialTheme(current);
 current.progress_locator=openAt;
 current.progress_percent=openAt?Math.max(0,Number(current.progress_percent)||0):0;
 currentLocation=openAt;pdfPage=1;pdfDoc=null;rendition=null;epubBook=null;epubLocsReady=false;
 $('reader').classList.remove('focus-mode','turn-forward','turn-backward');
 $('readerFocus').setAttribute('aria-pressed','false');
 $('readerScrub').disabled=true;$('readerScrub').value=String(current.progress_percent||0);
 $('readerScrubPercent').textContent=(current.progress_percent||0)+'%';
 $('chapterList').hidden=true;$('chapterList').replaceChildren();
 $('reader').hidden=false;d.body.style.overflow='hidden';$('readerMessage').hidden=false;
 $('readerMessage').textContent=b.source==='onedrive'?'A könyv előkészítése a OneDrive-ról vagy a helyi könyvtárból…':'A könyv letöltése a privát felhőből…';
 $('epubStage').hidden=true;$('pdfStage').hidden=true;$('pdfStage').replaceChildren();$('epubStage').replaceChildren();
 updateReaderUI();$('closeReader').focus();
 try{
  let data;
  if(b.source==='onedrive'){
   data=await w.SH9_BOOK_STUDIO_DRIVE_V2.download(b);
  }else{
   const c=await authorized(b.profile_key);
   const reply=await c.storage.from(BUCKET).download(b.storage_path);
   if(reply.error)throw Error(reply.error.message);
   data=reply.data;
  }
  if(version!==readerVersion)return;
  const bytes=await data.arrayBuffer();
  if(b.format==='epub'){
   if(!w.ePub)throw Error('Az EPUB-olvasó nem töltődött be.');
   $('epubStage').hidden=false;
   epubBook=w.ePub(bytes);
   rendition=epubBook.renderTo('epubStage',{width:'100%',height:'100%',flow:'paginated',spread:'none',allowScriptedContent:false});
   rendition.on('rendered',()=>{for(const content of rendition.getContents?.()||[])bindChapterGestures(content.document)});
   rendition.on('relocated',loc=>{
    if(version!==readerVersion||!loc?.start)return;
    const count=epubBook?.spine?.length||1;
    const approx=((loc.start.index||0)+(loc.start.displayed?.page||1)/(loc.start.displayed?.total||1))/count*100;
    let precise=approx;
    if(epubLocsReady){try{precise=epubBook.locations.percentageFromCfi(loc.start.cfi)*100}catch(_){}}
    position(loc.start.cfi,precise,'EPUB · '+Math.round(precise)+'%');
   });
   $('readerMessage').hidden=true;applyTheme();
   await rendition.display(openAt||undefined);
   void epubBook.loaded.navigation.then(navigation=>{
    if(version!==readerVersion)return;
    const select=$('chapterList');select.replaceChildren();
    const opt=node('option','','☷ Fejezetek');opt.value='';select.append(opt);
    const add=(items,depth=0)=>{for(const t of items||[]){if(!t.href)continue;
     const o=node('option',('chapter-depth-'+Math.min(depth,3)),('  '.repeat(Math.min(depth,3)))+t.label);o.value=t.href;select.append(o);add(t.subitems,depth+1)}};
    add(navigation.toc);select.hidden=select.options.length<=1;
   }).catch(()=>{});
   void epubBook.locations.generate(1600).then(()=>{if(version!==readerVersion)return;epubLocsReady=true;$('readerScrub').disabled=false}).catch(()=>{});
  }else{
   if(!w.pdfjsLib)throw Error('A PDF-olvasó nem töltődött be.');
   w.pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER;
   pdfDoc=await w.pdfjsLib.getDocument({data:new Uint8Array(bytes)}).promise;
   if(version!==readerVersion)return;
   pdfPage=Math.min(pdfDoc.numPages,Math.max(1,Number.parseInt(openAt,10)||1));
   $('pdfStage').hidden=false;$('readerMessage').hidden=true;
   $('readerScrub').disabled=false;
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
 if(pageChanging||!current||(!rendition&&!pdfDoc))return;
 // Do not animate an impossible PDF page beyond the first/last page.
 if(pdfDoc&&(pdfPage+step<1||pdfPage+step>pdfDoc.numPages))return;
 pageChanging=true;
 const token=++curlEpoch,version=readerVersion,r=$('reader');
 const started=Date.now();
 const curl=beginCurl(step);
 playPageTurnSound();
 r.classList.remove('turn-forward','turn-backward');
 r.classList.add(step>0?'turn-forward':'turn-backward');
 try{
  // Unfold the corner before revealing EPUB.js / PDF.js's real next page.
  if(curl)await waitCurl(CURL_PREPARE);
  if(token!==curlEpoch||version!==readerVersion)return;
  if(rendition)await (step<0?rendition.prev():rendition.next());
  else if(pdfDoc){pdfPage+=step;await renderPDF()}
  if(curl&&token===curlEpoch&&version===readerVersion){
   const remaining=CURL_DURATION-(Date.now()-started);
   if(remaining>0)await waitCurl(remaining);
  }
 }catch(e){
  if(token===curlEpoch&&version===readerVersion)toast('Lapozási hiba: '+e.message);
 }finally{
  if(token===curlEpoch){
   resetCurl();
   r.classList.remove('turn-forward','turn-backward');
   pageChanging=false;
  }
 }
}
function bindChapterGestures(doc){
 if(!doc||doc.documentElement?.dataset?.shoSwipeBound)return;
 doc.documentElement.dataset.shoSwipeBound='1';
 let x=null,y=null,at=0;
 doc.addEventListener('touchstart',e=>{
  if(!current||pageChanging||e.touches.length!==1)return;
  x=e.touches[0].clientX;y=e.touches[0].clientY;at=Date.now();
 },{passive:true});
 doc.addEventListener('touchmove',e=>{
  if(x===null||e.touches.length!==1)return;
  const dx=e.touches[0].clientX-x,dy=e.touches[0].clientY-y;
  if(Math.abs(dx)>15&&Math.abs(dx)>Math.abs(dy)*1.35)
   previewCurl(dx,doc.documentElement?.clientWidth||w.innerWidth||400);
  else if(Math.abs(dy)>25&&$('reader').classList.contains('curl-peek'))resetCurl();
 },{passive:true});
 doc.addEventListener('touchend',e=>{
  if(x===null||e.changedTouches.length!==1)return;
  const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;
  x=null;y=null;
  if($('reader').classList.contains('curl-peek'))resetCurl();
  if(Date.now()-at<850&&Math.abs(dx)>55&&Math.abs(dy)<75)
   void pageMove(dx<0?1:-1);
 },{passive:true});
 doc.addEventListener('touchcancel',()=>{
  x=null;y=null;
  if($('reader').classList.contains('curl-peek'))resetCurl();
 },{passive:true});
 doc.addEventListener('click',e=>{
  if(!rendition||!current||e.target?.closest?.('a,button,input,select,textarea,[contenteditable]'))return;
  const selection=doc.getSelection?.();if(selection&&!selection.isCollapsed)return;
  const width=doc.documentElement?.clientWidth||1,x=e.clientX;
  if(x<width*.13)void pageMove(-1);else if(x>width*.87)void pageMove(1);
 });
}
async function jumpTo(locator){
 if(!current||!locator)return;
 try{
  if(rendition)await rendition.display(locator);
  else if(pdfDoc){pdfPage=Math.min(pdfDoc.numPages,Math.max(1,Number(locator)||1));await renderPDF()}
 }catch(e){toast('A könyvjelző nem nyitható meg: '+e.message)}
}
async function closeReader(){
 ++curlEpoch;resetCurl();
 if(!current){$('reader').hidden=true;d.body.style.overflow='';return}
 ++readerVersion;
 clearTimeout(saveTimer);await queueSave();
 if(current.source==='onedrive'){
  const entry=w.SH9_BOOK_STUDIO_DRIVE_V2?.getBook(current.id);
  if(entry)Object.assign(entry,current);
 }else for(const b of books)if(b.id===current.id){Object.assign(b,current);break}
 if(rendition){try{rendition.destroy()}catch(_){}rendition=null}
 if(epubBook){try{epubBook.destroy()}catch(_){}epubBook=null}
 if(pdfTask){try{pdfTask.cancel()}catch(_){}pdfTask=null}
 if(pdfDoc){try{await pdfDoc.destroy()}catch(_){}pdfDoc=null}
 $('reader').hidden=true;d.body.style.overflow='';current=null;currentLocation='';
 epubLocsReady=false;pageChanging=false;clearTimeout(turnTimer);
 $('reader').classList.remove('focus-mode','turn-forward','turn-backward');
 renderBooks();w.SH9_BOOK_STUDIO_DRIVE_V2?.render();
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
 void loadBooks();void (w.SH9_BOOK_STUDIO_DRIVE_V2?.profileChanged?.()||w.SH9_BOOK_STUDIO_DRIVE_V2?.reload?.());
});
$('uploadFile').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)void importBook(file)});
$('searchBooks').addEventListener('input',renderBooks);
$('favOnly').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;$('favOnly').setAttribute('aria-pressed',String(favoritesOnly));renderBooks()});
$('closeReader').addEventListener('click',()=>void closeReader());
$('prevPage').addEventListener('click',()=>void pageMove(-1));
$('nextPage').addEventListener('click',()=>void pageMove(1));
$('readerTheme').addEventListener('change',()=>{if(!current)return;current.theme=$('readerTheme').value;rememberTheme(current,current.theme);applyTheme();void queueSave()});
$('smallerText').addEventListener('click',()=>setFont(-10));
$('biggerText').addEventListener('click',()=>setFont(10));
$('addBookmark').addEventListener('click',()=>void mark());
$('bookmarkList').addEventListener('change',()=>{const l=$('bookmarkList');void jumpTo(l.value);l.value=''});
$('chapterList').addEventListener('change',()=>{const l=$('chapterList');void jumpTo(l.value);l.value=''});
$('readerFocus').addEventListener('click',()=>{const x=$('reader').classList.toggle('focus-mode');$('readerFocus').setAttribute('aria-pressed',String(x))});
$('readerSound').addEventListener('click',()=>{
 try{w.localStorage.setItem(SOUND_KEY,soundEnabled()?'off':'on')}catch(_){}
 updateSoundButton();
});
$('readerScrub').addEventListener('input',()=>{$('readerScrubPercent').textContent=$('readerScrub').value+'%';$('readerScrub').style.setProperty('--progress',$('readerScrub').value+'%')});
$('readerScrub').addEventListener('change',async()=>{
 if(!current)return;const p=Number($('readerScrub').value)/100;
 try{
  if(pdfDoc){pdfPage=Math.max(1,Math.min(pdfDoc.numPages,Math.round(p*pdfDoc.numPages)||1));await renderPDF()}
  else if(rendition&&epubLocsReady)await rendition.display(epubBook.locations.cfiFromPercentage(p));
 }catch(e){toast('Ugrási hiba: '+e.message)}
});
let touchX=null,touchY=null;
$('readerContent').addEventListener('touchstart',e=>{
 if(!current||pageChanging||e.touches.length!==1)return;
 touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;
},{passive:true});
$('readerContent').addEventListener('touchmove',e=>{
 if(touchX===null||e.touches.length!==1)return;
 const dx=e.touches[0].clientX-touchX,dy=e.touches[0].clientY-touchY;
 if(Math.abs(dx)>15&&Math.abs(dx)>Math.abs(dy)*1.35)
  previewCurl(dx,$('readerContent').clientWidth||w.innerWidth||400);
 else if(Math.abs(dy)>25&&$('reader').classList.contains('curl-peek'))resetCurl();
},{passive:true});
$('readerContent').addEventListener('touchend',e=>{
 if(!current||touchX===null||e.changedTouches.length!==1)return;
 const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;
 touchX=null;touchY=null;
 if($('reader').classList.contains('curl-peek'))resetCurl();
 if(Math.abs(dx)>55&&Math.abs(dy)<65)void pageMove(dx<0?1:-1);
},{passive:true});
$('readerContent').addEventListener('touchcancel',()=>{
 touchX=null;touchY=null;
 if($('reader').classList.contains('curl-peek'))resetCurl();
},{passive:true});
d.addEventListener('keydown',e=>{
 if($('reader').hidden||e.target?.matches('input,textarea,select'))return;
 if(e.key==='Escape'){e.preventDefault();void closeReader()}
 if(e.key==='ArrowRight'){e.preventDefault();void pageMove(1)}
 if(e.key==='ArrowLeft'){e.preventDefault();void pageMove(-1)}
 if(e.key==='f'||e.key==='F'){$('readerFocus').click()}
});
let resizeTimer=0;
w.addEventListener('resize',()=>{if(!pdfDoc)return;clearTimeout(resizeTimer);resizeTimer=w.setTimeout(()=>void renderPDF(),220)});
w.addEventListener('storage',e=>{if(e.key==='hh-profile'&&short(profile())!==d.documentElement.dataset.profile)void closeReader().then(()=>{void loadBooks();void (w.SH9_BOOK_STUDIO_DRIVE_V2?.profileChanged?.()||w.SH9_BOOK_STUDIO_DRIVE_V2?.reload?.())})});
w.addEventListener('pagehide',()=>{if(current)void queueSave();clearCovers()});
w.SH9_BOOK_STUDIO_V1=Object.freeze({openBook,authorized,profile});
updateSoundButton();paintProfile();
// Airplane mode is a pure local reader; do not try the unrelated Supabase
// upload library while the user is reading offline OneDrive EPUB/PDFs.
if(w.navigator?.onLine===false){
 setStatus('📱 Helyi olvasás',false);
}else void loadBooks();
})(window,document);