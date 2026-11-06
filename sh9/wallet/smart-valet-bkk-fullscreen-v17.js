/* SHO Smart Valet v17 · fullscreen two-sided pass photo viewer.
 * Photo archive ONLY, not a valid digital BKK ticket or generated QR.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
let showing=false,side='front',urls={},zoom=1,dx=0,dy=0,lock=null;
const fingers=new Map();let initialDistance=0,initialZoom=1,drag=null;
function paint(){
 const img=$('svBkkFullImageV17');if(!img)return;
 img.src=side==='back'?(urls.back||urls.front):urls.front;
 img.style.transform='translate('+dx+'px,'+dy+'px) scale('+zoom+')';
 $('svBkkZoomV17').textContent=Math.round(zoom*100)+'%';
 for(const b of d.querySelectorAll('#svBkkFullDialogV17 [data-bkk-side]')){
  const chosen=b.dataset.bkkSide===side;
  b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));
  b.disabled=b.dataset.bkkSide==='back'&&!urls.back;
 }
}
function scale(value){
 zoom=Math.min(5,Math.max(1,value));
 if(zoom===1){dx=0;dy=0}
 paint();
}
function setSide(which){if(which==='back'&&!urls.back)return;side=which;zoom=1;dx=0;dy=0;paint()}
async function releaseLock(){const l=lock;lock=null;if(l)try{await l.release()}catch(_){}}
function close(){
 if(!showing)return;
 showing=false;urls={};zoom=1;dx=0;dy=0;fingers.clear();drag=null;
 const dialog=$('svBkkFullDialogV17');
 if(d.fullscreenElement===dialog&&d.exitFullscreen)void d.exitFullscreen().catch(()=>{});
 if(dialog?.open)dialog.close();
 $('svBkkFullImageV17').removeAttribute('src');void releaseLock();
}
async function keepAwake(){
 if(!('wakeLock' in navigator)||d.visibilityState!=='visible')return;
 try{lock=await navigator.wakeLock.request('screen')}catch(_){}
}
function show({frontUrl,backUrl=null,title='Budapest-bérlet',fullscreen=true}={}){
 if(typeof frontUrl!=='string'||!frontUrl.startsWith('blob:'))return false;
 init();if(showing)close();
 showing=true;urls={front:frontUrl,back:backUrl};side='front';zoom=1;dx=0;dy=0;
 $('svBkkFullTitleV17').textContent=String(title).slice(0,110);
 const dlg=$('svBkkFullDialogV17');
 dlg.showModal();paint();void keepAwake();
 if(fullscreen&&dlg.requestFullscreen)void dlg.requestFullscreen().catch(()=>{});
 return true;
}
function init(){
 if($('svBkkFullDialogV17'))return;
 const template=$('svBkkFullTemplateV17');if(!template)return;
 d.body.append(template.content.cloneNode(true));
 const dlg=$('svBkkFullDialogV17'),stage=$('svBkkImageStageV17');
 $('svBkkCloseV17').addEventListener('click',close);
 dlg.addEventListener('cancel',e=>{e.preventDefault();close()});
 for(const b of dlg.querySelectorAll('[data-bkk-side]'))b.addEventListener('click',()=>setSide(b.dataset.bkkSide));
 $('svBkkZoomInV17').addEventListener('click',()=>scale(zoom+.3));
 $('svBkkZoomOutV17').addEventListener('click',()=>scale(zoom-.3));
 $('svBkkFitV17').addEventListener('click',()=>{dx=0;dy=0;scale(1)});
 stage.addEventListener('wheel',e=>{if(!showing)return;e.preventDefault();scale(zoom+(e.deltaY<0?.2:-.2))},{passive:false});
 stage.addEventListener('dblclick',e=>{e.preventDefault();scale(zoom===1?2:1)});
 stage.addEventListener('pointerdown',e=>{
  if(!showing)return;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  stage.setPointerCapture(e.pointerId);
  if(fingers.size===1)drag={x:e.clientX,y:e.clientY,dx,dy};
  if(fingers.size===2){
   const p=[...fingers.values()];initialDistance=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);
   initialZoom=zoom;drag=null;
  }
 });
 stage.addEventListener('pointermove',e=>{
  if(!fingers.has(e.pointerId)||!showing)return;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(fingers.size===2&&initialDistance>0){
   const p=[...fingers.values()];scale(initialZoom*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/initialDistance);
  }else if(fingers.size===1&&drag&&zoom>1){
   dx=drag.dx+e.clientX-drag.x;dy=drag.dy+e.clientY-drag.y;paint();
  }
 });
 const up=e=>{fingers.delete(e.pointerId);if(fingers.size<2)initialDistance=0;drag=null};
 stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
 w.addEventListener('pagehide',close);
 w.addEventListener('sh9:profilechange',close);
 w.addEventListener('hh-family-profile-changed',close);
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')close()});
 d.addEventListener('visibilitychange',()=>{if(d.hidden)close()});
}
w.SHO_BKK_FULLSCREEN_V17=Object.freeze({show,close});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);