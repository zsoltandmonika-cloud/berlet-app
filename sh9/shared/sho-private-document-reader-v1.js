/* SHO common private-original document reader v1.
 * For Smart Valet, My Trips, future Sport Central and Events.
 * Receives ONLY an already authenticated Blob, never public storage links.
 * In-memory PDF.js canvas renderer, one page at a time, bounded pixels.
 */
(function(w,d){
 'use strict';
 const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/';
 let libPromise=null,dialog=null,canvas=null,scroller=null,statusNode=null;
 let pdf=null,loader=null,renderTask=null,activeBlob=null,activeURL=null;
 let page=1,zoom=1,serial=0,painting=false,title='',kind='application/pdf';
 const $=id=>d.getElementById(id);
 const node=(tag,klass,txt)=>{const e=d.createElement(tag);if(klass)e.className=klass;
  if(txt!==undefined)e.textContent=txt;return e};
 const hu=()=>{try{return w.localStorage.getItem('sh9-language-v1')!=='en'}catch(_){return true}};
 const label=(h,en)=>hu()?h:en;
 function setStatus(t){if(statusNode)statusNode.textContent=t}
 const btn=(id,text,fn)=>{const b=node('button',null,text);b.type='button';b.id=id;b.addEventListener('click',fn);return b};
 function build(){
  if(dialog)return;
  dialog=node('dialog','sho-private-reader-v1');dialog.id='shoPrivateReaderV1';
  dialog.setAttribute('aria-label',label('SHO belső jegy- és dokumentumolvasó','SHO internal document reader'));
  const head=node('header','sho-pr-head');
  const brand=node('div','sho-pr-brand');
  brand.append(node('small',null,'SMART HUB ONE · PRIVATE READER'));
  const ttl=node('strong',null,'');ttl.id='shoPrTitleV1';brand.append(ttl);
  const closeBtn=btn('shoPrCloseV1','×',()=>void close());
  closeBtn.setAttribute('aria-label',label('Bezárás','Close'));
  head.append(brand,closeBtn);
  const controls=node('div','sho-pr-controls');
  const prev=btn('shoPrPrevV1','‹',()=>void paint(page-1,true));
  const count=node('span');count.id='shoPrPagesV1';
  const next=btn('shoPrNextV1','›',()=>void paint(page+1,true));
  const minus=btn('shoPrMinusV1','−',()=>{zoom=Math.max(.7,zoom-.2);void paint(page,false)});
  const percent=node('span');percent.id='shoPrZoomV1';
  const plus=btn('shoPrPlusV1','+',()=>{zoom=Math.min(2.4,zoom+.2);void paint(page,false)});
  const fit=btn('shoPrFitV1',label('Igazítás','Fit'),()=>{zoom=1;void paint(page,false)});
  controls.append(prev,count,next,minus,percent,plus,fit);
  scroller=node('div','sho-pr-scroll');scroller.id='shoPrScrollV1';
  canvas=node('canvas','sho-pr-canvas');canvas.id='shoPrCanvasV1';
  scroller.append(canvas);
  const foot=node('footer','sho-pr-footer');
  statusNode=node('p');statusNode.id='shoPrStatusV1';
  const download=btn('shoPrDownloadV1',label('⬇ Letöltés','⬇ Download'),()=>downloadOriginal());
  foot.append(statusNode,download);
  dialog.append(head,controls,scroller,foot);
  d.body.append(dialog);
  dialog.addEventListener('cancel',e=>{e.preventDefault();void close()});
  w.addEventListener('hh-family-profile-changed',()=>{void close()});
  w.addEventListener('storage',e=>{if(e.key==='hh-profile')void close()});
  w.addEventListener('beforeunload',()=>{if(activeURL)w.URL.revokeObjectURL(activeURL)});
 }
 function buttons(){
  const enabled=!!pdf&&!painting;
  $('shoPrPrevV1').disabled=!enabled||page<=1;
  $('shoPrNextV1').disabled=!enabled||page>=pdf.numPages;
  $('shoPrMinusV1').disabled=!enabled||zoom<=.71;
  $('shoPrPlusV1').disabled=!enabled||zoom>=2.39;
  $('shoPrFitV1').disabled=!enabled;
  $('shoPrPagesV1').textContent=pdf?page+' / '+pdf.numPages:'…';
  $('shoPrZoomV1').textContent=pdf?Math.round(zoom*100)+'%':'';
  $('shoPrDownloadV1').disabled=!activeBlob;
 }
 function engine(){
  if(!libPromise)libPromise=import(PDFJS+'pdf.min.mjs').then(m=>{
   m.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.mjs';
   return m;
  }).catch(e=>{libPromise=null;throw e});
  return libPromise;
 }
 async function discard(){
  if(renderTask){try{renderTask.cancel();await renderTask.promise}catch(_){}renderTask=null}
  if(loader){try{await loader.destroy()}catch(_){}loader=null}
  pdf=null;
  if(activeURL){w.URL.revokeObjectURL(activeURL);activeURL=null}
  activeBlob=null;canvas.width=0;canvas.height=0;
  page=1;zoom=1;painting=false;
  scroller.replaceChildren(canvas);
 }
 async function paint(number,reset){
  if(!pdf)return;
  const id=++serial;painting=true;buttons();setStatus(label('PDF-oldal megjelenítése…','Rendering PDF page…'));
  try{
   if(renderTask){try{renderTask.cancel();await renderTask.promise}catch(_){}renderTask=null}
   const p=await pdf.getPage(Math.min(Math.max(1,number),pdf.numPages));
   if(id!==serial)return;
   const normal=p.getViewport({scale:1});
   const available=Math.max(240,scroller.clientWidth-24);
   const viewport=p.getViewport({scale:available/normal.width*zoom});
   const ratio=Math.max(0.5,Math.min(2,w.devicePixelRatio||1,Math.sqrt(4500000/(viewport.width*viewport.height))));
   canvas.width=Math.max(1,Math.round(viewport.width*ratio));
   canvas.height=Math.max(1,Math.round(viewport.height*ratio));
   canvas.style.width=Math.round(viewport.width)+'px';
   canvas.style.height=Math.round(viewport.height)+'px';
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error(label('Canvas nem támogatott','Canvas unavailable'));
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   renderTask=p.render({canvasContext:ctx,canvas,viewport,transform:[ratio,0,0,ratio,0,0]});
   await renderTask.promise;
   if(id!==serial)return;
   page=p.pageNumber;
   if(reset){scroller.scrollTop=0;scroller.scrollLeft=0}
   setStatus(title+' · '+page+'. '+label('oldal','page'));
  }catch(e){
   if(id===serial&&e?.name!=='RenderingCancelledException')
    setStatus('⚠️ '+label('A PDF nem rajzolható meg. Az eredeti letölthető.','PDF rendering failed. Original remains downloadable.'));
  }finally{if(id===serial){painting=false;renderTask=null;buttons()}}
 }
 async function open(file,name,options){
  if(!(file instanceof Blob)||!file.size)throw Error('EMPTY_PRIVATE_FILE');
  build();
  const id=++serial;
  if(dialog.open)dialog.close();
  await discard();
  if(id!==serial)return;
  activeBlob=file;title=String(name||'document.pdf').replace(/[\u0000-\u001f<>]/g,' ').slice(0,140);
  kind=String(options?.mime||file.type||'application/pdf');
  $('shoPrTitleV1').textContent=title;
  dialog.showModal();
  setStatus(label('Privát fájl megnyitása…','Opening private file…'));buttons();
  if(kind.startsWith('image/')){
   activeURL=w.URL.createObjectURL(file);
   const img=node('img','sho-pr-image');
   img.src=activeURL;img.alt=title;
   scroller.replaceChildren(img);
   $('shoPrPagesV1').textContent='1 / 1';
   setStatus(title);return;
  }
  if(kind!=='application/pdf'){setStatus(label('Nem támogatott fájltípus','Unsupported file type'));return}
  try{
   const lib=await engine();if(id!==serial)return;
   const bytes=new Uint8Array(await file.arrayBuffer());if(id!==serial)return;
   loader=lib.getDocument({data:bytes,isEvalSupported:false,enableScripting:false});
   pdf=await loader.promise;
   if(id!==serial)return;
   await paint(1,true);
  }catch(e){
   if(id===serial)setStatus('⚠️ '+label('A PDF nem tölthető be; az eredeti letölthető.','PDF could not be rendered; original can be downloaded.'));
  }finally{if(id===serial)buttons()}
 }
 function downloadOriginal(){
  if(!activeBlob)return;
  const url=activeURL||w.URL.createObjectURL(activeBlob),temporary=!activeURL;
  const a=node('a');a.href=url;a.download=title;d.body.append(a);a.click();a.remove();
  if(temporary)w.setTimeout(()=>w.URL.revokeObjectURL(url),60000);
 }
 async function close(){
  ++serial;
  if(dialog?.open)dialog.close();
  if(canvas&&scroller)await discard();
 }
 w.SHO_PRIVATE_DOCUMENT_READER_V1=Object.freeze({open,close,version:'1'});
})(window,document);
