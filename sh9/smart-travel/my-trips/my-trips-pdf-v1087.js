/* SH9 v1087 · private PDF ticket preview. Mozilla PDF.js 6.4.299.
   One page at a time: mobile memory remains bounded. */
(function(w,d){
 'use strict';
 const dlg=d.getElementById('mtReaderDialog');if(!dlg)return;
 const $=id=>d.getElementById(id);
 const canvas=$('mtReaderCanvas'),scroller=$('mtReaderScroll');
 const CDN='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/';
 let libPromise,doc,loader,blob,fileName='',page=1,zoom=1,task,serial=0,working=false,previewUrl=null;
 const status=x=>{$('mtReaderStatus').textContent=x};
 const controls=()=>{
  $('mtReaderPrev').disabled=!doc||working||page<=1;
  $('mtReaderNext').disabled=!doc||working||page>=doc.numPages;
  $('mtReaderMinus').disabled=!doc||working||zoom<=.71;
  $('mtReaderPlus').disabled=!doc||working||zoom>=2.39;
  $('mtReaderFit').disabled=!doc||working;
  $('mtReaderPages').textContent=doc?page+' / '+doc.numPages:'…';
  $('mtReaderZoom').textContent=doc?Math.round(zoom*100)+'%':'';
  $('mtReaderDownload').disabled=!blob;
 };
 function engine(){
  if(!libPromise)libPromise=import(CDN+'pdf.min.mjs').then(m=>{
   m.GlobalWorkerOptions.workerSrc=CDN+'pdf.worker.min.mjs';return m;
  }).catch(e=>{libPromise=null;throw e});
  return libPromise;
 }
 async function discard(){
  if(task){try{task.cancel();await task.promise}catch(_){}task=null}
  if(loader){try{await loader.destroy()}catch(_){}loader=null;doc=null}
  if(previewUrl){w.URL.revokeObjectURL(previewUrl);previewUrl=null}
  canvas.width=0;canvas.height=0;blob=null;page=1;zoom=1;
 }
 async function paint(n,reset=true){
  if(!doc)return;
  const id=++serial;working=true;controls();status('PDF-oldal megjelenítése…');
  try{
   if(task){try{task.cancel();await task.promise}catch(_){}task=null}
   const p=await doc.getPage(Math.max(1,Math.min(n,doc.numPages)));
   if(id!==serial)return;
   const base=p.getViewport({scale:1}),width=Math.max(240,scroller.clientWidth-20);
   const view=p.getViewport({scale:width/base.width*zoom});
   const output=Math.min(2,w.devicePixelRatio||1.25,Math.sqrt(5000000/(view.width*view.height)));
   canvas.width=Math.max(1,Math.ceil(view.width*output));
   canvas.height=Math.max(1,Math.ceil(view.height*output));
   canvas.style.width=Math.ceil(view.width)+'px';canvas.style.height=Math.ceil(view.height)+'px';
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error('A telefon nem támogatja ezt a PDF-et.');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   task=p.render({canvasContext:ctx,canvas,viewport:view,transform:[output,0,0,output,0,0]});
   await task.promise;
   if(id!==serial)return;
   page=p.pageNumber;if(reset){scroller.scrollTop=0;scroller.scrollLeft=0}
   status(fileName+' · '+page+'. oldal');
  }catch(e){if(id===serial&&e?.name!=='RenderingCancelledException')status('⚠️ '+(e.message||'PDF megjelenítési hiba'))}
  finally{if(id===serial){working=false;task=null;controls()}}
 }
 async function open(file,name){
  const id=++serial;
  if(dlg.open)dlg.close();
  await discard();if(id!==serial)return;
  blob=file;fileName=String(name||'Menetjegy.pdf').slice(0,140);
  $('mtReaderTitle').textContent=fileName;
  status('Privát PDF betöltése…');
  if(!dlg.open)dlg.showModal();
  controls();
  try{
   const engineLib=await engine();if(id!==serial)return;
   const bytes=new Uint8Array(await blob.arrayBuffer());if(id!==serial)return;
   loader=engineLib.getDocument({data:bytes,isEvalSupported:false,enableScripting:false});
   doc=await loader.promise;if(id!==serial)return;
   await paint(1,true);
  }catch(e){if(id===serial)status('⚠️ Nem sikerült. A rendszerolvasóval megnyitható.')}
  finally{if(id===serial)controls()}
 }
 async function close(){++serial;if(dlg.open)dlg.close();await discard()}
 function temporaryUrl(){
  if(!blob)return null;
  if(!previewUrl)previewUrl=w.URL.createObjectURL(blob);
  return previewUrl;
 }
 $('mtReaderClose').addEventListener('click',()=>void close());
 dlg.addEventListener('cancel',e=>{e.preventDefault();void close()});
 $('mtReaderPrev').addEventListener('click',()=>void paint(page-1));
 $('mtReaderNext').addEventListener('click',()=>void paint(page+1));
 $('mtReaderMinus').addEventListener('click',()=>{zoom=Math.max(.7,zoom-.2);void paint(page,false)});
 $('mtReaderPlus').addEventListener('click',()=>{zoom=Math.min(2.4,zoom+.2);void paint(page,false)});
 $('mtReaderFit').addEventListener('click',()=>{zoom=1;void paint(page,false)});
 $('mtReaderDownload').addEventListener('click',()=>{
  const u=temporaryUrl();if(!u)return;
  const a=d.createElement('a');a.href=u;a.download=fileName;d.body.appendChild(a);a.click();a.remove();
 });
 $('mtReaderSystem').addEventListener('click',()=>{
  const u=temporaryUrl();if(!u)return;
  const a=d.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';d.body.appendChild(a);a.click();a.remove();
 });
 w.addEventListener('beforeunload',()=>{if(previewUrl)w.URL.revokeObjectURL(previewUrl)});
 // Ticket numbers must come from the same visual line as an explicit train label.
 // PDF.js often returns unrelated text fragments without line breaks: do not join a whole page.
 function ticketNumbers(items){
  const groups=[];
  for(const item of (items||[]).slice(0,4000)){
   const word=String(item?.str||'').replace(/\u00a0/g,' ').normalize('NFKC').trim();
   if(!word)continue;
   const pos=item.transform,y=Array.isArray(pos)?Number(pos[5]):NaN,x=Array.isArray(pos)?Number(pos[4]):NaN;
   let group=Number.isFinite(y)?groups.find(g=>Number.isFinite(g.y)&&Math.abs(g.y-y)<2.4):null;
   if(!group){group={y:Number.isFinite(y)?y:null,tokens:[]};groups.push(group)}
   group.tokens.push({word,x:Number.isFinite(x)?x:group.tokens.length});
  }
  const found=new Set();
  for(const group of groups){
   const line=group.tokens.sort((a,b)=>a.x-b.x).map(x=>x.word).join(' ').slice(0,700);
   // Reliable labels or train-category prefixes only. Years are not inferred as trains.
   const strong=/(?:\bvonat\s*(?:sz[aá]m(?:a)?)?|\bvonatsz[aá]m(?:a)?|\btrain\s*(?:no\.?|nr\.?|number)?|\b(?:IC|IR|EC|RJX|RJ|EN)\b)\s*[:#№.\-]?\s*(\d{3,6})\b/gi;
   const weak=/\bj[aá]rat\s*(?:sz[aá]m(?:a)?)?\s*[:#№.\-]?\s*(\d{3,6})\b/gi;
   for(const m of line.matchAll(strong))found.add(m[1]);
   for(const m of line.matchAll(weak)){
    const num=Number(m[1]);
    if(num>=2000&&num<=2100)continue; // calendar year, not a safe generic train match
    found.add(m[1]);
   }
  }
  return [...found].slice(0,12);
 }
 // Detect only embedded text / hyperlinks. QR images or scanned text need a separate decoder.
 async function inspect(file){
  if(!file||file.size>15000000)throw Error('Túl nagy PDF.');
  const lib=await engine();
  const loader=lib.getDocument({
   data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false
  });
  const urls=new Set(),numbers=new Set();
  try{
   const document=await loader.promise;
   for(let p=1;p<=Math.min(document.numPages,5);p++){
    const page=await document.getPage(p);
    const annotations=await page.getAnnotations({intent:'display'});
    for(const a of annotations||[])if(typeof a?.url==='string')urls.add(a.url);
    const content=await page.getTextContent();
    const text=(content.items||[]).map(x=>x.str||'').join(' ').slice(0,20000);
    for(const m of text.matchAll(/https?:\/\/mavplusz\.hu\/#\/trip\/[a-z0-9_:.-]{3,120}(?:\?ui_activeItinerary=-?\d+)?/gi))urls.add(m[0]);
    for(const number of ticketNumbers(content.items))numbers.add(number);
   }
   return {urls:[...urls],numbers:[...numbers]};
  }finally{try{await loader.destroy()}catch(_){}}
 }
 w.SH9_TRIP_PDF_VIEWER_V1087=Object.freeze({open,close,inspect,ticketNumbers});
})(window,document);
