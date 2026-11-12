/* SHO Entertainment v1189: editable pinned feature plus next-event fallback.
 * Only the two approved image panels are decoration: real anchors and the
 * original upcoming-event workflow remain intact. No fake bookings. */
(function(window,document){'use strict';
const section=document.querySelector('.pixel-extension'),dialog=document.getElementById('shoFeatureDialog');
if(!section||!dialog)return;
const $=id=>document.getElementById(id),key='sho-entertainment-featured-v1189',nextKey='sho-entertainment-upcoming-v1';
const open=$('pixelFeatureLink'),edit=$('pixelFeatureEdit'),text=$('pixelFeatureCustom'),kicker=$('pixelFeatureKicker'),title=$('pixelFeatureTitle'),note=$('pixelFeatureNote');
const form=$('shoFeatureForm'),save=$('shoFeatureSave'),cancel=$('shoFeatureCancel'),clear=$('shoFeatureClear');
function safeLink(value){
 if(value==='#mozi')return '#mozi';
 try{const u=new URL(value,location.href);return u.protocol==='https:'?u.href:''}catch(_){return ''}
}
function stored(){
 try{const raw=JSON.parse(localStorage.getItem(key)||'null');return raw&&typeof raw.title==='string'&&safeLink(raw.url)?raw:null}catch(_){return null}
}
function nextProgram(){
 try{
  const raw=localStorage.getItem(nextKey);if(!raw)return null;
  const p=JSON.parse(raw);if(!p||typeof p.title!=='string'||!p.date)return null;
  const t=new Date(p.date).getTime();
  if(!Number.isFinite(t)||t<Date.now()-3*3600e3)return null;
  return {title:p.title,note:[p.venue||'',new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t))].filter(Boolean).join(' · '),url:safeLink(p.url)||'#mozi',kicker:'📌 KÖVETKEZŐ PROGRAMUNK'};
 }catch(_){return null}
}
function paint(){
 const featured=stored(),p=featured||nextProgram();
 section.dataset.custom=p?'true':'false';
 if(p){
  kicker.textContent=p.kicker||'📌 KIEMELT AJÁNLATUNK';
  title.textContent=p.title;
  note.textContent=p.note||'Részletek és programok';
  open.href=safeLink(p.url)||'#mozi';
  open.setAttribute('aria-label',(p.title||'Kiemelt ajánlat')+' megnyitása');
  open.target=open.href.startsWith('https://')?'_blank':'_self';
  if(open.target==='_blank')open.rel='noopener noreferrer';else open.removeAttribute('rel');
 }else{
  open.href='#mozi';open.target='_self';open.removeAttribute('rel');
  open.setAttribute('aria-label','Kiemelt ajánlatunk: premierek és különleges programok');
 }
}
function showDialog(){
 const old=stored();
 $('featureTitleInput').value=old?.title||'';
 $('featureNoteInput').value=old?.note||'';
 $('featureUrlInput').value=old?.url==='#mozi'?'':old?.url||'';
 try{dialog.showModal()}catch(_){dialog.setAttribute('open','')}
 $('featureTitleInput').focus();
}
edit?.addEventListener('click',()=>{try{navigator.vibrate?.(8)}catch(_){}showDialog()});
save?.addEventListener('click',()=>{});
form.addEventListener('submit',event=>{
 event.preventDefault();
 const title=$('featureTitleInput').value.trim(),note=$('featureNoteInput').value.trim(),urlInput=$('featureUrlInput').value.trim();
 const url=urlInput?safeLink(urlInput):'#mozi';
 if(!title||!url){alert('A kiemelt ajánlathoz címet és érvényes HTTPS hivatkozást adj meg.');return}
 try{localStorage.setItem(key,JSON.stringify({title:title.slice(0,85),note:note.slice(0,100),url}))}catch(_){}
 dialog.close();paint();
});
cancel?.addEventListener('click',()=>dialog.close());
clear?.addEventListener('click',()=>{try{localStorage.removeItem(key)}catch(_){}dialog.close();paint()});
window.addEventListener('storage',event=>{if(event.key===key||event.key===nextKey)paint()});
window.addEventListener('pageshow',paint);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')paint()});
const originalTitle=$('upTitle'),originalDate=$('upDate');
if(originalTitle&&originalDate&&typeof MutationObserver!=='undefined'){
 const observer=new MutationObserver(paint);
 observer.observe(originalTitle,{childList:true,characterData:true,subtree:true});
 observer.observe(originalDate,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['datetime']});
}
paint();
})(window,document);
