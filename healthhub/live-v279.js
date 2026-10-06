(function(){
'use strict';
/* HealthHub v1.281 — framed live camera, 10–15x pan/zoom, display-only OCR capture */
var CAM_ID='hhWeightLiveCam279', STYLE_ID='hh-v279-style';
var stream=null, opening=false, zoom=10, panX=0, panY=0, pointers=new Map(), pinchStartDist=0, pinchStartZoom=10;

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy)}
function toast(s){if(window.toast)window.toast(s)}
function style(){
 if(document.getElementById(STYLE_ID))return;
 var s=document.createElement('style');s.id=STYLE_ID;s.textContent=
 '.hhWCam279{display:none;position:fixed;inset:0;z-index:9200;background:linear-gradient(180deg,#071a29,#0b2d50);color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;overscroll-behavior:none;touch-action:none}.hhWCam279.on{display:flex;flex-direction:column}.hhWCam279 *{box-sizing:border-box}'+
 '.hhWCamTop{height:64px;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;padding:8px 12px;flex:0 0 auto}.hhWCamClose{width:42px;height:42px;border:0;border-radius:50%;background:#ffffff18;color:#fff;font-size:25px}.hhWCamTitle{text-align:center}.hhWCamTitle b{display:block;font-size:15px}.hhWCamTitle small{display:block;font-size:8px;color:#b9d6e8;margin-top:2px;letter-spacing:.08em}.hhWCamProfile{font-size:9px;font-weight:900;color:#b9d6e8;text-align:right}'+
 '.hhWCamStage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:2px 14px 8px}.hhWCamScale{position:relative;width:min(92vw,390px);aspect-ratio:1000/1024;background:url("./assets/weight-scale-v275.svg?v=275") center/contain no-repeat;filter:drop-shadow(0 18px 34px rgba(0,0,0,.38));user-select:none;-webkit-user-select:none}.hhWCamWindow{position:absolute;left:27%;top:5.37%;width:46%;height:28.32%;overflow:hidden;border-radius:14px;background:#041018;box-shadow:0 0 0 3px rgba(255,255,255,.96),0 0 0 7px rgba(29,198,255,.45),0 0 24px rgba(29,198,255,.58);touch-action:none}.hhWCamWindow video{position:absolute;left:50%;top:50%;max-width:none!important;max-height:none!important;transform-origin:center center;display:block}.hhWCamGuide{position:absolute;inset:0;pointer-events:none;border:1px dashed rgba(255,255,255,.88);border-radius:11px}.hhWCamGuide:before,.hhWCamGuide:after{content:"";position:absolute;background:rgba(255,255,255,.55)}.hhWCamGuide:before{left:50%;top:0;bottom:0;width:1px}.hhWCamGuide:after{top:50%;left:0;right:0;height:1px}.hhWCamGhost{position:absolute;inset:0;pointer-events:none;display:grid;grid-template-rows:1fr 1fr;color:rgba(255,255,255,.18);font-weight:900;text-align:center}.hhWCamGhost span{display:grid;place-items:center;font-size:clamp(18px,7vw,30px)}.hhWCamGhost span:first-child{border-bottom:1px solid rgba(255,255,255,.18)}'+
 '.hhWCamHint{text-align:center;padding:0 26px 7px;font-size:10px;line-height:1.42;color:#d8edf7;flex:0 0 auto}.hhWCamHint b{color:#fff}.hhWCamHint small{display:block;color:#96bbcf;margin-top:3px;font-size:8px}.hhWCamControls{padding:0 18px 4px;display:grid;grid-template-columns:54px 1fr 54px;gap:9px;align-items:center;flex:0 0 auto}.hhWCamControls button{height:34px;border:1px solid #ffffff2b;background:#ffffff10;color:#dceef7;border-radius:10px;font-size:9px;font-weight:850}.hhWCamZoom{display:grid;grid-template-columns:42px 1fr;align-items:center;gap:7px}.hhWCamZoom b{font-size:9px;text-align:center;color:#fff}.hhWCamZoom input{width:100%;accent-color:#39c3ff}'+
 '.hhWCamBottom{padding:5px 18px calc(18px + env(safe-area-inset-bottom));display:grid;grid-template-columns:1fr 84px 1fr;align-items:center;flex:0 0 auto}.hhWCamFallback{justify-self:start;border:0;background:transparent;color:#b9d6e8;font-size:9px;font-weight:800}.hhWCamShot{width:72px;height:72px;border-radius:50%;border:5px solid #fff;background:#fff3;box-shadow:0 0 0 3px #ffffff38;justify-self:center;position:relative}.hhWCamShot:after{content:"";position:absolute;inset:8px;border-radius:50%;background:#fff}.hhWCamReady{justify-self:end;font-size:9px;font-weight:850;color:#8ee4ff}.hhWCam279.loading .hhWCamShot{opacity:.45;pointer-events:none}';
 document.head.appendChild(s);
}
function ui(){
 style();var o=document.getElementById(CAM_ID);if(o)return o;
 o=document.createElement('div');o.id=CAM_ID;o.className='hhWCam279';
 o.innerHTML=
 '<div class="hhWCamTop"><button class="hhWCamClose" type="button" aria-label="Bezárás">×</button><div class="hhWCamTitle"><b>Mérleg kijelző beolvasása</b><small>HEALTHHUB · KAMERA OCR</small></div><div class="hhWCamProfile"></div></div>'+
 '<div class="hhWCamStage"><div class="hhWCamScale"><div class="hhWCamWindow"><video playsinline muted autoplay></video><div class="hhWCamGhost"><span>00.0 kg</span><span>00.0 %</span></div><div class="hhWCamGuide"></div></div></div></div>'+
 '<div class="hhWCamHint"><b>Igazítsd a valódi mérleg kijelzőjét a világító ablakba.</b><small>Egy ujjal mozgatás · két ujjal zoom · vagy használd a csúszkát.</small></div>'+
 '<div class="hhWCamControls"><button class="hhWCamMinus" type="button">−</button><div class="hhWCamZoom"><b>1,0×</b><input type="range" min="10" max="15" step="0.1" value="10"></div><button class="hhWCamReset" type="button">Közép</button></div>'+
 '<div class="hhWCamBottom"><button class="hhWCamFallback" type="button">Natív kamera</button><button class="hhWCamShot" type="button" aria-label="Fotó készítése"></button><div class="hhWCamReady">KIJELZŐ OCR</div></div>';
 document.body.appendChild(o);
 o.querySelector('.hhWCamClose').addEventListener('click',closeCamera);
 o.querySelector('.hhWCamFallback').addEventListener('click',function(){closeCamera();if(window.hhWeightOcrNative278)window.hhWeightOcrNative278()});
 o.querySelector('.hhWCamShot').addEventListener('click',capture);
 var slider=o.querySelector('.hhWCamZoom input');
 slider.addEventListener('input',function(){zoom=clamp(Number(slider.value)||10,10,15);clampPan();layoutVideo()});
 o.querySelector('.hhWCamMinus').addEventListener('click',function(){zoom=clamp(zoom-.5,10,15);syncZoom();clampPan();layoutVideo()});
 o.querySelector('.hhWCamReset').addEventListener('click',function(){zoom=10;panX=0;panY=0;syncZoom();layoutVideo()});
 var w=o.querySelector('.hhWCamWindow');
 w.addEventListener('pointerdown',pointerDown);
 w.addEventListener('pointermove',pointerMove);
 w.addEventListener('pointerup',pointerUp);
 w.addEventListener('pointercancel',pointerUp);
 return o;
}
function syncZoom(){
 var o=document.getElementById(CAM_ID);if(!o)return;
 var slider=o.querySelector('.hhWCamZoom input'),label=o.querySelector('.hhWCamZoom b');
 if(slider)slider.value=zoom.toFixed(2);
 if(label)label.textContent=zoom.toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+'×';
}
function layoutVideo(){
 var o=document.getElementById(CAM_ID),w=o&&o.querySelector('.hhWCamWindow'),v=o&&o.querySelector('video');if(!w||!v||!v.videoWidth||!v.videoHeight)return;
 var bw=w.clientWidth,bh=w.clientHeight,base=Math.max(bw/v.videoWidth,bh/v.videoHeight);
 v.style.width=(v.videoWidth*base)+'px';
 v.style.height=(v.videoHeight*base)+'px';
 v.style.transform='translate(-50%,-50%) translate('+panX+'px,'+panY+'px) scale('+zoom+')';
 syncZoom();
}
function clampPan(){
 var o=document.getElementById(CAM_ID),w=o&&o.querySelector('.hhWCamWindow'),v=o&&o.querySelector('video');if(!w||!v||!v.videoWidth||!v.videoHeight)return;
 var bw=w.clientWidth,bh=w.clientHeight,base=Math.max(bw/v.videoWidth,bh/v.videoHeight);
 var dw=v.videoWidth*base*zoom,dh=v.videoHeight*base*zoom;
 var mx=Math.max(0,(dw-bw)/2),my=Math.max(0,(dh-bh)/2);
 panX=clamp(panX,-mx,mx);panY=clamp(panY,-my,my);
}
function pointerDown(e){
 var w=e.currentTarget;try{w.setPointerCapture(e.pointerId)}catch(_){}
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY});
 if(pointers.size===2){var a=Array.from(pointers.values());pinchStartDist=Math.max(1,dist(a[0],a[1]));pinchStartZoom=zoom}
}
function pointerMove(e){
 if(!pointers.has(e.pointerId))return;e.preventDefault();
 var p=pointers.get(e.pointerId),oldX=p.x,oldY=p.y;p.x=e.clientX;p.y=e.clientY;pointers.set(e.pointerId,p);
 if(pointers.size===1){panX+=p.x-oldX;panY+=p.y-oldY;clampPan();layoutVideo();return}
 if(pointers.size>=2){var a=Array.from(pointers.values()),d=Math.max(1,dist(a[0],a[1]));zoom=clamp(pinchStartZoom*d/pinchStartDist,10,15);clampPan();layoutVideo()}
}
function pointerUp(e){
 pointers.delete(e.pointerId);
 if(pointers.size===1){var p=Array.from(pointers.values())[0];p.px=p.x;p.py=p.y}
 if(pointers.size<2){pinchStartDist=0;pinchStartZoom=zoom}
}
function stopTracks(){
 if(stream){try{stream.getTracks().forEach(function(t){t.stop()})}catch(_){}stream=null}
 var o=document.getElementById(CAM_ID),v=o&&o.querySelector('video');if(v)v.srcObject=null;
}
function closeCamera(){
 stopTracks();pointers.clear();var o=document.getElementById(CAM_ID);if(o)o.classList.remove('on','loading');opening=false;
}
async function openCamera(){
 if(opening)return;opening=true;
 var o=ui(),v=o.querySelector('video'),p=o.querySelector('.hhWCamProfile');if(p)p.textContent=pname();
 zoom=10;panX=0;panY=0;syncZoom();o.classList.add('on','loading');
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
  closeCamera();if(window.hhWeightOcrNative278)window.hhWeightOcrNative278();return;
 }
 try{
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
  v.srcObject=stream;
  await new Promise(function(ok){if(v.readyState>=1)return ok();v.onloadedmetadata=function(){ok()}});
  await v.play().catch(function(){});
  o.classList.remove('loading');opening=false;
  clampPan();layoutVideo();
 }catch(e){
  console.warn('HealthHub framed camera unavailable',e);closeCamera();toast('Beágyazott kamera nem érhető el · natív kamera indul');if(window.hhWeightOcrNative278)window.hhWeightOcrNative278();
 }
}
async function capture(){
 var o=document.getElementById(CAM_ID),w=o&&o.querySelector('.hhWCamWindow'),v=o&&o.querySelector('video');
 if(!w||!v||!v.videoWidth||!v.videoHeight)return;
 o.classList.add('loading');
 var outW=920,outH=580,base=Math.max(outW/v.videoWidth,outH/v.videoHeight);
 var dw=v.videoWidth*base*zoom,dh=v.videoHeight*base*zoom;
 var px=panX/Math.max(1,w.clientWidth)*outW,py=panY/Math.max(1,w.clientHeight)*outH;
 var x=(outW-dw)/2+px,y=(outH-dh)/2+py;
 var c=document.createElement('canvas');c.width=outW;c.height=outH;var g=c.getContext('2d',{alpha:false});
 g.fillStyle='#000';g.fillRect(0,0,outW,outH);g.drawImage(v,x,y,dw,dh);
 var src=c.toDataURL('image/jpeg',.96);
 closeCamera();
 if(typeof window.hhWeightOcrProcessSource278==='function')await window.hhWeightOcrProcessSource278(src);
 else {toast('OCR modul nem érhető el');if(window.hhWeightOcrNative278)window.hhWeightOcrNative278()}
}
window.hhOpenWeightCamera279=openCamera;
window.hhCloseWeightCamera279=closeCamera;
window.addEventListener('resize',function(){if(document.getElementById(CAM_ID)?.classList.contains('on')){clampPan();layoutVideo()}});
document.addEventListener('visibilitychange',function(){if(document.hidden)closeCamera()});
style();ui();
document.documentElement.dataset.healthhubWeightCamera='1.281';
})();