/* SH9 My Trips v1080: profile-local TripPack cards in SH9 Golden styling.
 * Uses same validated storage and fullscreen viewer as Smart Trip AI.
 * No API, location polling, auto-approval, or cross-device claims.
 */
(function(w,d){
 'use strict';
 const pack=w.SH9_SMART_TRIP_PACK_V1078,root=d.getElementById('mtTripList');
 if(!pack||!root)return;
 const $=id=>d.getElementById(id);
 const active=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}};
 const node=(tag,cls,value,parent)=>{
  const e=d.createElement(tag);if(cls)e.className=cls;
  if(value!==undefined&&value!==null)e.textContent=String(value);
  if(parent)parent.appendChild(e);return e
 };
 const min=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s)?
  Number(s.slice(0,2))*60+Number(s.slice(3,5)):null;
 function stats(trip){
  const a=min(trip.departure),b=min(trip.arrival);
  const n=a===null||b===null?null:b>=a?b-a:1440-a+b;
  return {duration:n===null?'—':Math.floor(n/60)+' ó '+String(n%60).padStart(2,'0')+' p',
   transfers:Math.max(0,trip.segments.filter(s=>s.mode!=='walk').length-1)}
 }
 function phase(trip,p){
  let saved=null;
  try{saved=w.localStorage.getItem('sh9-smart-trip-pack-v1078-'+p+'-manual-step-'+trip.id)}catch(_){}
  if(saved===null)return 'Tervezett';
  const step=Number(saved);
  if(!Number.isInteger(step)||step<0||step>trip.segments.length)return 'Tervezett';
  if(step===trip.segments.length)return 'Befejezett';
  return 'Folyamatban';
 }
 function render(){
  const p=active(),items=pack.read(w.localStorage,p);
  d.documentElement.dataset.mtProfile=p;
  const theme=d.querySelector('meta[name="theme-color"]');
  if(theme)theme.content=p==='m'?'#241a3a':'#101d36';
  $('mtProfile').textContent=p==='m'?'Mónika':'Zsolt';
  $('mtCount').textContent=items.length+' útiterv';
  root.replaceChildren();
  if(!items.length){
   const empty=node('div','mt-empty',null,root);
   node('strong','','Még nincs mentett útvonalterv',empty);
   node('p','','A ChatGPT-től visszahozott TripPack JSON-t a Smart Trip AI-ban importáld. Mentés után itt is megjelenik.',empty);
   const action=node('a','','✨ Smart Trip AI megnyitása',empty);
   action.href='../public-transport/smart-trip/';
   return;
  }
  for(const trip of items){
   const card=node('article','mt-trip',null,root);
   const header=node('div','mt-trip-top',null,card);
   node('strong','',trip.title,header);
   node('span','mt-trip-badge',phase(trip,p),header);
   node('div','mt-trip-date',trip.travelDate,card);
   node('div','mt-trip-route',trip.from+' → '+trip.to,card);
   const bar=node('div','mt-trip-info',null,card),m=stats(trip);
   node('span','','⏱ '+(trip.departure||'—'),bar);
   node('span','','🏁 '+(trip.arrival||'—'),bar);
   node('span','','⇄ '+m.transfers+' átsz.',bar);
   const actions=node('div','mt-trip-actions',null,card);
   const go=node('a','','Teljes képernyős útiterv',actions);
   const url=new URL('../public-transport/smart-trip/',d.baseURI);
   url.searchParams.set('trip',trip.id);
   go.href=url.href;
  }
 }
 $('mtReload')?.addEventListener('click',render);
 w.addEventListener('pageshow',render);
 w.addEventListener('storage',render);
 render();
})(window,document);
