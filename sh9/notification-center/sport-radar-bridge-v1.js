/* SHO Sport Central v1 · verified cross-origin MeccsRadar notice handoff.
 * Parent validates message origin and frame identity before calling accept().
 * Only public match time-change messages, never user, health or ticket data.
 */
(function(w){
 'use strict';
 if(w.SHO_RADAR_NOTIFICATION_BRIDGE_V1)return;
 const PREFIX='sho-sport-schedule-seen:v1:',MAX_AGE=21*86400000,MAX_ITEMS=250;
 const TYPE='sportcentral.schedule_change';
 function read(profile){
  try{
   const value=JSON.parse(w.localStorage?.getItem(PREFIX+profile)||'[]');
   return Array.isArray(value)?value.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.at)).slice(-MAX_ITEMS):[];
  }catch(_){return []}
 }
 function save(profile,seen){
  try{w.localStorage?.setItem(PREFIX+profile,JSON.stringify(seen.slice(-MAX_ITEMS)))}catch(_){}
 }
 function eventUrl(notice){
  const nav=notice.target?.nav==='cup'?'cup':'program';
  const query=new URLSearchParams({sportView:nav});
  const match=String(notice.target?.matchId||'');
  if(/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(match))query.set('matchId',match);
  return '/berlet-app/sh9/sport/?'+query.toString();
 }
 function valid(notice,now){
  if(!notice||typeof notice!=='object'||!['Időpont','Kupa időpont'].includes(notice.category)||
   typeof notice.id!=='string'||!/^[-A-Za-z0-9_:]{3,100}$/.test(notice.id)||
   typeof notice.title!=='string'||!notice.title.trim()||notice.title.length>140||
   typeof notice.body!=='string'||notice.body.length>320)return false;
  const ts=Date.parse(notice.createdAt);
  return Number.isFinite(ts)&&now-ts>=-60000&&now-ts<=MAX_AGE;
 }
 function accept(messages){
  const hub=w.SHO_NOTIFICATION_CORE_V1;
  if(!hub||!Array.isArray(messages))return 0;
  const now=Date.now(),validItems=messages.slice(0,40).filter(m=>valid(m,now));
  let count=0;
  // Sport is family-wide; SHO's two separate on-device inboxes both receive
  // the same public sport notice, respecting each profile's notification toggle.
  for(const p of ['z','m']){
   const prior=read(p).filter(x=>now-x.at<=MAX_AGE);
   const ids=new Set(prior.map(x=>x.id));
   let changed=false;
   for(const message of validItems){
    const id='radar:'+message.id;
    if(ids.has(id))continue;
    const entry=hub.publish({
      profile:p,type:TYPE,
      title:message.title,message:message.body||message.title,
      targetUrl:eventUrl(message),dedupeKey:id
    });
    if(entry){
      prior.push({id,at:now});ids.add(id);changed=true;count++;
    }else if(hub.preference(p,TYPE)?.enabled===false){
      // Disabled notices must not suddenly replay after enabling again.
      prior.push({id,at:now});ids.add(id);changed=true;
    }
   }
   if(changed)save(p,prior);
  }
  return count;
 }
 w.SHO_RADAR_NOTIFICATION_BRIDGE_V1=Object.freeze({version:1,accept});
})(window);
