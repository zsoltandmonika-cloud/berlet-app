/* SHO Smart Entertainment · Upcoming pinned event, local-first and explicit booking status.
 * Standalone module: does not change existing MediaRadar, Family Hub or other SHO integrations.
 * Only the user's selected status is displayed; a planned event is never implied to be booked.
 */
(function(window,document){
'use strict';
const STORAGE='sho-entertainment-upcoming-v1';
const $=id=>document.getElementById(id);
const dialog=$('upcomingEditor'),form=$('upcomingForm'),section=$('upcoming');
if(!dialog||!form||!section)return;
const initial=Object.freeze({
 id:'theatre-elvalt',
 title:'Elvált nők klubja · PREMIER',
 date:'2026-11-13T19:00',
 venue:'RaM-ArT Színház · Budapest, Kárpát utca 23.',
 status:'planned',
 url:'https://ramart.hu/elvalt-nok-klubja/',
 poster:'https://ramart.hu/wp-content/uploads/2026/06/elvalt-nok-klubja.jpg'
});
let current=read(),restoreFocus=null;
function read(){
 try{
  const stored=window.localStorage.getItem(STORAGE);
  if(stored===null)return null; // no default stale event; the featured card now has a timeless editorial fallback
  const item=JSON.parse(stored);
  if(item&&typeof item==='object'&&typeof item.title==='string'&&typeof item.date==='string'){
   const end=new Date(item.date).getTime();
   // A past event is retained in local storage for history but no longer shown as upcoming.
   if(!Number.isFinite(end)||end<Date.now()-3*60*60*1000)return null;
   return item;
  }
  return null;
 }catch(_){return Object.assign({},initial)}
}
function save(value){
 current=value;
 try{window.localStorage.setItem(STORAGE,JSON.stringify(value))}catch(_){}
 paint();
}
function safeURL(raw){
 try{
  const url=new URL(raw,window.location.origin);
  return url.protocol==='https:'?url.href:'';
 }catch(_){return ''}
}
function time(value){
 const d=new Date(value);
 return Number.isNaN(d.getTime())?null:d;
}
function pretty(value){
 const d=time(value);
 if(!d)return 'Időpont megadása szükséges';
 return new Intl.DateTimeFormat('hu-HU',{month:'long',day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit'}).format(d);
}
function countdown(value){
 const d=time(value);
 if(!d)return 'Nincs érvényes időpont';
 const diff=d.getTime()-Date.now(),mins=Math.ceil(diff/60000);
 if(mins<-180)return 'Már lezajlott · új program kitűzhető';
 if(mins<=0)return 'Most kezdődik';
 if(mins<60)return 'Kezdés ' + mins + ' perc múlva';
 if(mins<1440)return 'Kezdés ' + Math.floor(mins/60) + ' óra ' + (mins%60) + ' perc múlva';
 return 'Kezdés ' + Math.floor(mins/1440) + ' nap múlva';
}
function paint(){
 const active=!!current;
 section.classList.toggle('empty-pin',!active);
 $('upTitle').textContent=active?current.title:'Nincs kitűzött következő program';
 $('upVenue').textContent=active?(current.venue||'Helyszín még nincs megadva'):'Válasszatok egy előadást, vagy adjatok meg egy saját programot.';
 const dt=$('upDate');dt.textContent=active?pretty(current.date):'';dt.dateTime=active?current.date:'';
 const state=$('upState');state.textContent=active?(current.status==='booked'?'Jegy megvan ✓':'Tervezett program'):'Nincs kitűzve';
 state.classList.toggle('booked',active&&current.status==='booked');
 $('upCountdown').textContent=active?countdown(current.date):'';
 const detail=$('upDetails'),safe=active?safeURL(current.url):'';
 detail.hidden=!safe;if(safe)detail.href=safe;
 $('upPoster').style.setProperty('--upimg',active&&safeURL(current.poster)?'url("'+safeURL(current.poster)+'")':'linear-gradient(120deg,#3f1748,#12244a)');
 $('upEdit').textContent=active?'✎ Szerkesztés':'📌 Program kitűzése';
 document.querySelectorAll('.pin-event').forEach(button=>{
  const match=active&&button.dataset.pinId===current.id;
  button.setAttribute('aria-pressed',String(!!match));
  button.textContent=match?'📍':'📌';
  button.title=match?'Jelenleg kitűzött program szerkesztése':'Kitűzés következő programként';
 });
}
function openEditor(seed){
 restoreFocus=document.activeElement;
 const x=seed||current||{title:'',date:'',venue:'',status:'planned',url:'',poster:'',id:'manual'};
 form.dataset.eventId=x.id||'manual';
 form.dataset.poster=x.poster||'';
 $('bookingTitle').value=x.title||'';
 $('bookingDate').value=x.date||'';
 $('bookingVenue').value=x.venue||'';
 $('bookingStatus').value=x.status==='booked'?'booked':'planned';
 $('bookingUrl').value=x.url||'';
 dialog.hidden=false;
 document.body.style.overflow='hidden';
 $('bookingTitle').focus();
}
function closeEditor(){
 dialog.hidden=true;document.body.style.overflow='';
 if(restoreFocus&&typeof restoreFocus.focus==='function')restoreFocus.focus();
}
function getPoster(card){
 const raw=card.style.getPropertyValue('--img')||'';
 const match=raw.match(/^url\(['"]?(.+?)['"]?\)$/);
 return match?safeURL(match[1]):'';
}
document.querySelectorAll('.card').forEach(card=>{
 const id=card.dataset.id;
 if(!id)return;
 const button=document.createElement('button');
 button.type='button';
 button.className='pin-event';
 button.dataset.pinId=id;
 button.title='Kitűzés következő programként';
 button.setAttribute('aria-label','📌 Kitűzés következő programként');
 const favourite=card.querySelector('.fav');
 if(favourite)favourite.insertAdjacentElement('afterend',button);
 else card.insertAdjacentElement('afterbegin',button);
 button.addEventListener('click',()=>{
  const title=card.querySelector('.card-body b')?.textContent.trim()||'Új program';
  const info=card.querySelector('.card-body small')?.textContent.trim()||'';
  const venue=id==='theatre-elvalt'?initial.venue:id==='cinema-etele-premium'?'Etele Cinema Premium · Etele Plaza':info;
  const anchor=card.querySelector('.cta[href]'),url=anchor?anchor.href:'';
  const hint=card.dataset.eventDate||'';
  const stamped=id==='theatre-elvalt'?initial.date:(hint?hint+'T'+(/\b\d{1,2}:\d{2}\b/.exec(info)?.[0]||'19:00'):'');
  openEditor({id:id,title:title,date:stamped,venue:venue,status:'planned',url:url,poster:getPoster(card)});
 });
});
$('upEdit').addEventListener('click',()=>openEditor());
$('cancelBooking').addEventListener('click',closeEditor);
$('clearBooking').addEventListener('click',()=>{save(null);closeEditor()});
dialog.addEventListener('click',event=>{if(event.target===dialog)closeEditor()});
document.addEventListener('keydown',event=>{if(dialog.hidden)return;if(event.key==='Escape'){event.preventDefault();closeEditor()}});
form.addEventListener('submit',event=>{
 event.preventDefault();
 const title=$('bookingTitle').value.trim(),date=$('bookingDate').value,venue=$('bookingVenue').value.trim();
 const rawURL=$('bookingUrl').value.trim();
 const url=rawURL?safeURL(rawURL):'';
 if(!title||!time(date)){window.alert('Adj meg programcímet és valós időpontot.');return}
 if(rawURL&&!url){window.alert('Csak https:// kezdetű, biztonságos programoldal menthető.');return}
 save({
  id:form.dataset.eventId||'manual',title:title.slice(0,130),date:date,
  venue:venue.slice(0,160),status:$('bookingStatus').value==='booked'?'booked':'planned',
  url:url,poster:safeURL(form.dataset.poster)
 });
 closeEditor();
});
window.addEventListener('storage',event=>{if(event.key===STORAGE){current=read();paint()}});
window.addEventListener('pageshow',paint);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')paint()});
window.setInterval(()=>{if(document.visibilityState==='visible')paint()},60000);
paint();
})(window,document);
