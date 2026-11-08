/* SHO Smart Buddy Place Alerts v1 · additive frontend bridge.
 * Reuses authenticated foreground Smart Places transitions and approved 3-state RAG artwork.
 * No GPS reads, extra polling, background delivery or cross-device delivery promises.
 */
(function(w,d){
 'use strict';
 if(w.SHO_SMART_BUDDY_PLACE_ALERT_V1)return;
 const allowed=new Set(['arrival','departure']);
 let popup=null,timeout=null;
 const human=p=>p==='monika'?'Mónika':'Zsolt';
 function ensure(){
  if(popup)return popup;
  if(!d.body)return null;
  popup=d.createElement('aside');
  popup.id='shoBuddyPlacePopupV1';popup.hidden=true;
  popup.setAttribute('role','status');popup.setAttribute('aria-live','polite');popup.setAttribute('aria-atomic','true');
  const face=d.createElement('span');face.className='sho-buddy-place-face';face.setAttribute('aria-hidden','true');
  const copy=d.createElement('span');copy.className='sho-buddy-place-text';
  const label=d.createElement('small');label.className='sho-buddy-place-label';
  const title=d.createElement('strong');title.className='sho-buddy-place-title';
  const when=d.createElement('small');when.className='sho-buddy-place-when';
  copy.append(label,title,when);
  const close=d.createElement('button');close.type='button';close.className='sho-buddy-place-close';
  close.textContent='×';close.setAttribute('aria-label','Értesítés bezárása');
  close.addEventListener('click',()=>{popup.hidden=true;w.clearTimeout(timeout)});
  popup.append(face,copy,close);d.body.appendChild(popup);
  return popup;
 }
 function show(place,type,message){
  if(d.hidden||!allowed.has(type)||!place||!['monika','zsolt'].includes(place.profile)||
     !Number.isInteger(place.index)||place.index<0||place.index>=40)return false;
  const placeName=String(place.name||'').trim().slice(0,40);
  if(!placeName)return false;
  const time=Date.now(),arrived=type==='arrival',subject=human(place.profile);
  const title=subject+(arrived?' megérkezett':' elindult')+' · '+placeName;
  const text=String(message||title).slice(0,120);
  const node=ensure();
  if(!node)return false;
  node.dataset.buddyKind=type;
  node.querySelector('.sho-buddy-place-label').textContent=arrived?'🟢 ARRIVAL · MEGÉRKEZETT':'🟠 DEPARTURE · TÁVOZOTT';
  node.querySelector('.sho-buddy-place-title').textContent=text;
  node.querySelector('.sho-buddy-place-when').textContent=new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}).format(new Date(time));
  node.hidden=false;
  w.clearTimeout(timeout);timeout=w.setTimeout(()=>{if(node)node.hidden=true},6200);
  // Write only the validated event and human-readable location label, never GPS coordinates.
  // The legacy inbox is local per browser; it is not a remote family push channel.
  try{
   const hub=w.SHO_NOTIFICATION_CORE_V1;
   if(hub?.publish){
    const receiver=hub.profile();
    hub.publish({profile:receiver,type:'familyguard.'+type,title,
      message:text,dedupeKey:'buddy-place:'+place.profile+':'+place.index+':'+type+':'+Math.floor(time/180000),
      targetUrl:'/berlet-app/healthhub/guardian/'});
   }
  }catch(_){}
  return true;
 }
 w.SHO_SMART_BUDDY_PLACE_ALERT_V1=Object.freeze({show,version:'1'});
})(window,document);
