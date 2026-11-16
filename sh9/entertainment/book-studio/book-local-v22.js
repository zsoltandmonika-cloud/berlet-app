/* Book Studio V22 · on-device EPUB/PDF import, no Microsoft or Supabase transfer.
 * Explicit copies into IndexedDB. Deletion is only user-initiated.
 * Browser data can be evicted/cleared; books are NOT encrypted at rest.
 */
(function(w,d){
 'use strict';
 const DB='sh9-book-studio-device-library-v22', STORE='books', LIMIT=80*1024*1024;
 const $=id=>d.getElementById(id);
 const profile=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return'zsolt'}};
 const state={books:new Map(),urls:new Map(),busy:false};
 const text=s=>String(s||'').trim().slice(0,200);
 const element=(tag,cls,value)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
 function openDB(){
  return new Promise((resolve,reject)=>{
   if(!w.indexedDB)return reject(Error('A böngésző nem támogatja a helyi könyvtárat.'));
   const req=w.indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))
    req.result.createObjectStore(STORE,{keyPath:'id'})};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('A telefon helyi tárhelye nem érhető el.'));
   req.onblocked=()=>reject(Error('A könyvtárat egy másik fül zárolja.'));
  });
 }
 async function tx(mode,fn){
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{
   const tr=db.transaction(STORE,mode),request=fn(tr.objectStore(STORE));
   let value;
   request.onsuccess=()=>{value=request.result};
   request.onerror=()=>reject(request.error||Error('Helyi olvasási hiba'));
   tr.oncomplete=()=>resolve(value);
   tr.onerror=()=>reject(tr.error||Error('Helyi tárhelyhiba'));
   tr.onabort=()=>reject(tr.error||Error('A böngésző megszakította a mentést'));
  })}finally{db.close()}
 }
 function publicBook(row){
  if(!row)return null;
  const {blob,cover,...book}=row;
  return {...book,source:'local'};
 }
 function flash(message,bad=false){
  const n=$('bsLocalStatus');
  if(n){n.textContent=message;n.dataset.error=bad?'1':'0'}
 }
 async function coverFor(file,format){
  if(format==='pdf'){
   if(file.size>18*1024*1024||!w.pdfjsLib)return null;
   let pdf=null;
   try{
    if(!w.pdfjsLib.GlobalWorkerOptions.workerSrc)w.pdfjsLib.GlobalWorkerOptions.workerSrc=
     'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    pdf=await w.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const page=await pdf.getPage(1),v=page.getViewport({scale:1});
    const view=page.getViewport({scale:Math.min(0.7,240/v.width)});
    const canvas=d.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));
   }catch(_){return null}finally{try{await pdf?.destroy()}catch(_){}}
  }
  if(!w.JSZip||file.size>30*1024*1024)return null;
  try{
   const zip=await w.JSZip.loadAsync(file);
   const container=zip.file('META-INF/container.xml');
   if(!container)return null;
   const xml=new DOMParser().parseFromString(await container.async('text'),'application/xml');
   const root=xml.querySelector('rootfile')?.getAttribute('full-path');
   if(!root||!zip.file(root))return null;
   const opf=new DOMParser().parseFromString(await zip.file(root).async('text'),'application/xml');
   let item=[...opf.querySelectorAll('item')].find(n=>(n.getAttribute('properties')||'').split(/\s+/).includes('cover-image'));
   if(!item){
    const coverId=[...opf.querySelectorAll('meta')].find(n=>n.getAttribute('name')==='cover')?.getAttribute('content');
    if(coverId)item=[...opf.querySelectorAll('item')].find(n=>n.getAttribute('id')===coverId);
   }
   if(!item)return null;
   const path=new URL(item.getAttribute('href'),'https://local.invalid/'+root).pathname.slice(1);
   const entry=zip.file(path);
   if(!entry)return null;
   const blob=await entry.async('blob');
   if(blob.size>5*1024*1024)return null;
   const ext=path.toLowerCase();
   return new Blob([blob],{type:ext.endsWith('.png')?'image/png':ext.endsWith('.webp')?'image/webp':'image/jpeg'});
  }catch(_){return null}
 }
 async function formatFor(file){
  const ext=/\.(epub|pdf)$/i.exec(file.name)?.[1]?.toLowerCase();
  if(!ext)throw Error('Csak EPUB vagy PDF fájl importálható.');
  if(!file.size||file.size>LIMIT)throw Error('Egy könyv maximum 80 MB lehet.');
  const b=new Uint8Array(await file.slice(0,5).arrayBuffer());
  if(ext==='pdf'&&!(b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45))
   throw Error('A fájl nem érvényes PDF.');
  if(ext==='epub'&&!(b[0]===80&&b[1]===75))throw Error('A fájl nem érvényes EPUB-csomag.');
  return ext;
 }
 async function importFiles(fileList){
  if(state.busy)return;
  const files=Array.from(fileList||[]);
  if(!files.length)return;
  state.busy=true;
  const input=$('bsLocalFileInput'),who=profile();
  if(input)input.disabled=true;
  let added=0,skipped=0,failed=0;
  try{
   try{await w.navigator?.storage?.persist?.()}catch(_){}
   const existing=await tx('readonly',s=>s.getAll());
   const fingerprints=new Set(existing.filter(x=>x.profile_key===who).map(x=>x.fingerprint));
   for(const file of files){
    try{
     if(profile()!==who)throw Error('Profilváltás miatt megszakadt az import.');
     const format=await formatFor(file);
     const fingerprint=[who,file.name,file.size,file.lastModified].join('|');
     if(fingerprints.has(fingerprint)){skipped++;continue}
     const meta=w.SH9_BOOK_METADATA_V4?.parseFilename?.(file.name)||{};
     const cover=await coverFor(file,format);
     const row={id:'local-'+w.crypto.randomUUID(),profile_key:who,source:'local',
      fingerprint,title:text(meta.title||file.name.replace(/\.(epub|pdf)$/i,'')),
      author:text(meta.author||''),file_name:text(file.name),format,
      size_bytes:file.size,blob:new Blob([file],{type:format==='pdf'?'application/pdf':'application/epub+zip'}),
      cover,progress_locator:'',progress_percent:0,bookmarks:[],
      is_favorite:false,theme:'sepia',font_size:100,updated_at:new Date().toISOString()};
     await tx('readwrite',s=>s.put(row));fingerprints.add(fingerprint);added++;
     flash('📱 Helyi importálás: '+added+'/'+files.length+' könyv mentve…');
    }catch(e){failed++;flash('Importálási hiba: '+e.message,true)}
   }
   await refresh();
   flash('✓ '+added+' könyv helyben mentve'+(skipped?' · '+skipped+' már létezett':'')+
    (failed?' · '+failed+' sikertelen':'')+'. A fájlok nem kerültek felhőbe.',!!failed);
  }catch(e){flash('A helyi könyvtár nem érhető el: '+e.message,true)}
  finally{state.busy=false;if(input){input.disabled=false;input.value=''}}
 }
 async function refresh(){
  const who=profile(),all=await tx('readonly',s=>s.getAll());
  if(profile()!==who)return;
  for(const url of state.urls.values())URL.revokeObjectURL(url);
  state.urls.clear();
  state.books=new Map(all.filter(row=>row.profile_key===who).map(row=>[row.id,publicBook(row)]));
  w.SH9_BOOKSHELF_V10?.setLocalBooks([...state.books.values()],who);
  for(const row of all){
   if(row.profile_key!==who||!row.cover?.size)continue;
   const url=URL.createObjectURL(row.cover);state.urls.set(row.id,url);
   w.SH9_BOOKSHELF_V10?.coverReady(row.id,url);
  }
  renderList();
 }
 function renderList(){
  const list=$('bsLocalList');if(!list)return;
  list.replaceChildren();
  if(!state.books.size){list.append(element('p','bs-local-empty','Még nincs telefonról importált könyv.'));return}
  for(const b of state.books.values()){
   const row=element('div','bs-local-row');
   const label=element('span','',b.title+' · '+b.format.toUpperCase());
   const open=element('button','','Olvasás');
   open.type='button';open.addEventListener('click',()=>void w.SH9_BOOK_STUDIO_V1?.openBook(b.id));
   const remove=element('button','bs-local-remove','Eltávolítás');
   remove.type='button';remove.addEventListener('click',()=>void deleteBook(b.id));
   row.append(label,open,remove);list.append(row);
  }
 }
 async function deleteBook(id){
  const b=state.books.get(id);
  if(!b||b.profile_key!==profile())return false;
  if(!w.confirm('Eltávolítod a helyi könyvtárból: '+b.title+'? Az eredeti telefonos fájl érintetlen marad.'))return false;
  await tx('readwrite',s=>s.delete(id));
  await refresh();flash('A helyi példány eltávolítva. Az eredeti fájl változatlan.');
  return true;
 }
 function getBook(id){const book=state.books.get(id);return book?.profile_key===profile()?book:null}
 async function getBlob(id){
  if(!getBook(id))throw Error('A könyv nem érhető el az aktív profilban.');
  const row=await tx('readonly',s=>s.get(id));
  if(!row||row.profile_key!==profile()||!row.blob?.size)throw Error('Helyi könyvfájl nem található.');
  return row.blob;
 }
 async function saveProgress(book,patch){
  if(book?.source!=='local'||book.profile_key!==profile())return false;
  const row=await tx('readonly',s=>s.get(book.id));
  if(!row||row.profile_key!==profile())return false;
  const allowed={};
  for(const field of ['progress_locator','progress_percent','bookmarks','is_favorite','theme','font_size','updated_at'])
   if(patch[field]!==undefined)allowed[field]=patch[field];
  await tx('readwrite',s=>s.put({...row,...allowed}));
  state.books.set(book.id,{...state.books.get(book.id),...allowed});
  return true;
 }
 async function shell(){
  const result=await w.SH9_BOOK_OFFLINE_V21?.registerShell?.();
  flash(result?.ok?'✓ Offline olvasó előkészítve. Internet nélkül is használható.':
   result?.reason||'Az offline olvasó most nem aktiválható.',!result?.ok);
 }
 if($('bsLocalFileInput')){
  $('bsLocalFileInput').addEventListener('change',event=>void importFiles(event.target.files));
  $('bsLocalShell').addEventListener('click',()=>void shell());
  void refresh().catch(e=>flash('Helyi tárhely hiba: '+e.message,true));
 }
 w.addEventListener('pagehide',()=>{for(const url of state.urls.values())URL.revokeObjectURL(url)});
 w.SH9_BOOK_LOCAL_V22=Object.freeze({getBook,getBlob,saveProgress,refresh,importFiles});
})(window,document);
