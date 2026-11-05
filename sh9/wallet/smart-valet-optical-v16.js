/* SHO Smart Valet v16 · one shared optical card scanner for all 3 submodules.
 * Same camera guide, 1.586 card fit, crop/position/zoom and accept action.
 * Bank photos are masked on-device BEFORE the consumer receives any image.
 */
(function(w,d){
'use strict';
const RATIO=1.586, $=id=>d.getElementById(id);
const t=(hu,en)=>w.localStorage.getItem('sh9-language-v1')==='en'?en:hu;
let running=false,finish=null,source=null,sourceURL='',renderURL='',stream=null,purpose='health',side='front',title='';
let imageBlob=null,rects=[],working=false,pointer=null;const URLs=new Set();
const revoke=u=>{if(u){URL.revokeObjectURL(u);URLs.delete(u)}};
const objectURL=blob=>{const u=URL.createObjectURL(blob);URLs.add(u);return u};
function stop(){const vid=$('svOptVideoV16');if(vid){vid.pause();vid.srcObject=null}
 if(stream){stream.getTracks().forEach(track=>track.stop());stream=null}
 $('svOptCameraV16').hidden=true;
}
function cleanup(){
 stop();revoke(sourceURL);revoke(renderURL);
 for(const u of [...URLs])revoke(u);
 sourceURL='';renderURL='';source=null;imageBlob=null;rects=[];pointer=null;
 for(const id of ['svOptFileV16','svOptCameraInputV16'])if($(id))$(id).value='';
 const dialog=$('svOptDialogV16');if(dialog?.open)dialog.close();
 running=false;working=false;
}
function end(blob){
 const resolve=finish;finish=null;cleanup();if(resolve)resolve(blob||null);
}
function notice(hu,en,bad=false){
 const n=$('svOptStatusV16');n.textContent=t(hu,en);n.dataset.error=bad?'1':'0';
}
async function fileImage(f){
 if(!f||!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size<100||f.size>12000000)
  throw Error('IMAGE');
 const bytes=new Uint8Array(await f.slice(0,16).arrayBuffer());
 const valid=f.type==='image/jpeg'?(bytes[0]===255&&bytes[1]===216&&bytes[2]===255):
  f.type==='image/png'?(bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'):
  (String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP');
 if(!valid)throw Error('IMAGE');
 return f;
}
function cropStyle(){
 const im=$('svOptCropImageV16');
 im.style.objectPosition=$('svOptX').value+'% '+$('svOptY').value+'%';
 im.style.transform='scale('+$('svOptZoom').value+')';
}
async function showSource(f){
 try{
  source=await fileImage(f);
  revoke(sourceURL);sourceURL=objectURL(source);
  $('svOptCropImageV16').src=sourceURL;
  ['svOptX','svOptY'].forEach(id=>$(id).value='50');$('svOptZoom').value='1';
  $('svOptCropV16').hidden=false;$('svOptMaskV16').hidden=true;
  cropStyle();stop();
  notice('Igazítsd a képet a kártyakerethez.','Fit the photo inside the card frame.');
 }catch(_){notice('Csak érvényes JPG, PNG vagy WebP, maximum 12 MB.','Valid JPG, PNG or WebP up to 12 MB required.',true)}
}
async function camera(){
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('CAMERA');
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
  if(!running){stop();return}
  const v=$('svOptVideoV16');v.srcObject=stream;
  $('svOptCameraV16').hidden=false;await v.play();
 }catch(_){stop();$('svOptCameraInputV16').click()}
}
function snapshot(){
 const v=$('svOptVideoV16'),guide=$('svOptGuideV16');if(!v.videoWidth||!v.videoHeight)return;
 const vr=v.getBoundingClientRect(),fr=guide.getBoundingClientRect();
 const scale=Math.max(vr.width/v.videoWidth,vr.height/v.videoHeight);
 const ox=(vr.width-v.videoWidth*scale)/2,oy=(vr.height-v.videoHeight*scale)/2;
 const sx=Math.max(0,(fr.left-vr.left-ox)/scale),sy=Math.max(0,(fr.top-vr.top-oy)/scale);
 const sw=Math.min(v.videoWidth-sx,fr.width/scale),sh=Math.min(v.videoHeight-sy,fr.height/scale);
 if(sw<80||sh<55)return;
 const c=d.createElement('canvas');c.width=1500;c.height=Math.round(1500/RATIO);
 const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(v,sx,sy,sw,sh,0,0,c.width,c.height);
 c.toBlob(blob=>{stop();if(running&&blob)void showSource(blob)},'image/jpeg',.92);
}
async function imageOf(blob){
 const url=objectURL(blob),im=new Image();im.src=url;await im.decode();
 return{image:im,width:im.naturalWidth,height:im.naturalHeight,url};
}
async function cropped(){
 if(!source||working)return;
 working=true;$('svOptAcceptCropV16').disabled=true;
 try{
  const src=await imageOf(source);
  try{
   const z=Number($('svOptZoom').value),x=Number($('svOptX').value)/100,y=Number($('svOptY').value)/100;
   let cw=Math.min(src.width,src.height*RATIO),ch=cw/RATIO;cw/=z;ch/=z;
   const c=d.createElement('canvas');
   c.width=Math.min(1800,Math.max(900,Math.round(cw)));c.height=Math.round(c.width/RATIO);
   const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(src.image,(src.width-cw)*x,(src.height-ch)*y,cw,ch,0,0,c.width,c.height);
   const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.92));
   if(!blob||blob.size>1800000)throw Error('IMAGE');
   if(!running)return;
   imageBlob=blob;
   if(purpose==='bank'){
    $('svOptCropV16').hidden=true;$('svOptMaskV16').hidden=false;
    rects=[];revoke(renderURL);renderURL=objectURL(blob);
    const im=$('svOptMaskImageV16');im.src=renderURL;
    const cn=$('svOptMaskCanvasV16');cn.width=c.width;cn.height=c.height;
    paintMask();notice('Takard ki a kártyaszámot, lejáratot, CVV-t és minden érzékeny adatot!',
     'Mask the card number, expiry, CVV and any other sensitive information!');
   }else end(blob);
  }finally{revoke(src.url)}
 }catch(_){notice('A képkivágás nem sikerült.','Image crop failed.',true)}
 finally{working=false;$('svOptAcceptCropV16').disabled=false}
}
function paintMask(){
 const c=$('svOptMaskCanvasV16'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
 ctx.fillStyle='#080b1d';
 for(const r of rects)ctx.fillRect(r.x,r.y,r.w,r.h);
 if(pointer){
  ctx.fillStyle='rgba(8,11,29,.88)';
  ctx.fillRect(Math.min(pointer.x,pointer.toX),Math.min(pointer.y,pointer.toY),
   Math.abs(pointer.toX-pointer.x),Math.abs(pointer.toY-pointer.y));
 }
 $('svOptUndoV16').disabled=rects.length===0;
 $('svOptMaskCountV16').textContent=t('Kitakart területek: ','Masked areas: ')+rects.length;
}
function pos(e){
 const c=$('svOptMaskCanvasV16'),r=c.getBoundingClientRect();
 return{x:Math.max(0,Math.min(c.width,(e.clientX-r.left)/r.width*c.width)),
  y:Math.max(0,Math.min(c.height,(e.clientY-r.top)/r.height*c.height))};
}
function maskDown(e){
 if(!running||!imageBlob)return;
 e.preventDefault();const p=pos(e);pointer={x:p.x,y:p.y,toX:p.x,toY:p.y};
 $('svOptMaskCanvasV16').setPointerCapture(e.pointerId);paintMask();
}
function maskMove(e){if(!pointer)return;const p=pos(e);pointer.toX=p.x;pointer.toY=p.y;paintMask()}
function maskUp(e){
 if(!pointer)return;
 const p=pos(e),x=Math.min(pointer.x,p.x),y=Math.min(pointer.y,p.y);
 const width=Math.abs(p.x-pointer.x),height=Math.abs(p.y-pointer.y);pointer=null;
 if(width>=12&&height>=12)rects.push({x,y,w:width,h:height});
 paintMask();
}
async function acceptMasked(){
 if(!imageBlob||!rects.length){
  notice('Legalább egy kitakart terület szükséges. Ellenőrizd az összes érzékeny adatot!',
   'At least one redaction required. Check every sensitive field!',true);return;
 }
 if(working)return;working=true;
 try{
  const src=await imageOf(imageBlob);
  try{
   const c=d.createElement('canvas');c.width=src.width;c.height=src.height;
   const ctx=c.getContext('2d');ctx.drawImage(src.image,0,0);
   ctx.fillStyle='#080b1d';
   for(const r of rects)ctx.fillRect(r.x,r.y,r.w,r.h);
   const safe=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.91));
   if(!safe||safe.size>1800000)throw Error('IMAGE');
   if(running)end(safe);
  }finally{revoke(src.url)}
 }catch(_){notice('A kitakart kép mentése nem sikerült.','Redacted photo could not be processed.',true)}
 finally{working=false}
}
function init(){
 if($('svOptDialogV16'))return;
 const dlg=d.createElement('dialog');dlg.className='sv-id-dialog-v11 sv-opt-dialog-v16';dlg.id='svOptDialogV16';
 dlg.innerHTML='<header class="sv-id-head-v11"><div><small>SHO · UNIFIED OPTICAL FRAME</small><h2 id="svOptTitleV16"></h2></div><button type="button" id="svOptCloseV16" aria-label="Bezárás">×</button></header>'+
 '<p id="svOptStatusV16" class="sv-id-status-v11" role="status" aria-live="polite"></p>'+
 '<section id="svOptCropV16" class="sv-id-crop-v11" hidden><h3>Kártya optikai igazítása · Optical card fit</h3>'+
 '<p>1.586:1 keret. Ellenőrizd a négy sarkot és az adatokat.</p>'+
 '<div class="sv-id-crop-frame-v11"><img id="svOptCropImageV16" alt="Kártya keretbe igazítása"></div>'+
 '<label>Vízszintes igazítás<input type="range" id="svOptX" min="0" max="100" value="50"></label>'+
 '<label>Függőleges igazítás<input type="range" id="svOptY" min="0" max="100" value="50"></label>'+
 '<label>Nagyítás<input type="range" id="svOptZoom" min="1" max="1.4" step=".05" value="1"></label>'+
 '<div><button type="button" id="svOptCancelCropV16">Mégse</button><button type="button" class="sv-id-primary-v11" id="svOptAcceptCropV16">✓ Kép elfogadása</button></div></section>'+
 '<section id="svOptMaskV16" class="sv-id-crop-v11" hidden><h3>🔒 Adatok kitakarása · Secure redaction</h3>'+
 '<p>A fotó csak helyben látható. Húzz sötét kitakaró téglalapokat minden kártyaszámra, lejáratra és CVV-re. Az eredeti fotó sosem kerül tárolásra.</p>'+
 '<div class="sv-id-crop-frame-v11 sv-opt-mask-frame-v16"><img id="svOptMaskImageV16" alt="Kitakarásra váró kép"><canvas id="svOptMaskCanvasV16" aria-label="Rajzolj kitakaró területeket" role="img"></canvas></div>'+
 '<span id="svOptMaskCountV16"></span><div><button type="button" id="svOptUndoV16">↶ Visszavonás</button><button type="button" id="svOptSaveMaskV16" class="sv-id-primary-v11">🔒 Kitakart kép elfogadása</button></div></section>'+
 '<div class="sv-id-camera-overlay-v11" id="svOptCameraV16" hidden>'+
 '<video id="svOptVideoV16" autoplay muted playsinline></video><div id="svOptGuideV16" class="sv-id-camera-guide-v11"><span id="svOptGuideTextV16"></span></div>'+
 '<div class="sv-id-camera-actions-v11"><button type="button" id="svOptCancelCameraV16">Mégse</button><button type="button" id="svOptSnapV16">◉ Fotó</button></div></div>'+
 '<input type="file" hidden accept="image/jpeg,image/png,image/webp" id="svOptFileV16">'+
 '<input type="file" hidden accept="image/*" capture="environment" id="svOptCameraInputV16">';
 d.body.append(dlg);
 $('svOptCloseV16').addEventListener('click',()=>end(null));
 dlg.addEventListener('cancel',e=>{e.preventDefault();end(null)});
 $('svOptCancelCropV16').addEventListener('click',()=>end(null));
 $('svOptCancelCameraV16').addEventListener('click',()=>end(null));
 $('svOptSnapV16').addEventListener('click',snapshot);
 for(const id of ['svOptFileV16','svOptCameraInputV16'])
  $(id).addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';if(f)void showSource(f);else end(null)});
 for(const id of ['svOptX','svOptY','svOptZoom'])$(id).addEventListener('input',cropStyle);
 $('svOptAcceptCropV16').addEventListener('click',()=>void cropped());
 $('svOptUndoV16').addEventListener('click',()=>{rects.pop();paintMask()});
 $('svOptSaveMaskV16').addEventListener('click',()=>void acceptMasked());
 const mask=$('svOptMaskCanvasV16');
 mask.addEventListener('pointerdown',maskDown);
 mask.addEventListener('pointermove',maskMove);
 mask.addEventListener('pointerup',maskUp);
 mask.addEventListener('pointercancel',()=>{pointer=null;paintMask()});
 w.addEventListener('pagehide',()=>{if(running)end(null)});
 d.addEventListener('visibilitychange',()=>{if(d.hidden&&running)end(null)});
}
async function capture(options={}){
 if(running)return null;
 init();running=true;
 title=String(options.title||t('Kártya','Card')).slice(0,90);
 side=options.side==='back'?'back':'front';
 purpose=options.bankRedact?'bank':'health';
 const label=title+' · '+(side==='front'?t('ELŐLAP','FRONT'):t('HÁTLAP','BACK'));
 $('svOptTitleV16').textContent=label;
 $('svOptGuideTextV16').textContent=label;
 $('svOptCropV16').hidden=true;$('svOptMaskV16').hidden=true;
 notice('Kártya optikai szkennelése','Optical card scanning');
 $('svOptDialogV16').showModal();
 return new Promise(resolve=>{
  finish=resolve;
  if(options.mode==='file')$('svOptFileV16').click();else void camera();
 });
}
w.SHO_VALET_OPTICAL_V16=Object.freeze({capture,ratio:RATIO,version:16});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);