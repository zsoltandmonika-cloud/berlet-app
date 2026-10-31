/* SH9 Outlook Agenda v1 | pure date/overlap model
 * Explicit data boundary: supplied caller-only Microsoft Graph event payloads.
 * No credentials or private events are committed to the SH9 repository.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object' && module.exports)module.exports=api;
 if(root)root.SH9_OUTLOOK_AGENDA_MODEL_V1=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const BLOCKING=new Set(['busy','tentative','oof','workingelsewhere']);
 function parseUtcDate(v){
  if(!v || typeof v.dateTime!=='string')return null;
  // The SH9 Graph request explicitly asks Outlook to return UTC. Never guess local offsets.
  if(v.timeZone && !['UTC','Etc/UTC','Etc/GMT'].includes(v.timeZone))return null;
  let raw=v.dateTime.trim();
  if(!/[zZ]$/.test(raw)&&!/[+-]\d\d:\d\d$/.test(raw))raw+='Z';
  const d=new Date(raw);
  return Number.isFinite(d.getTime())?d:null;
 }
 function normalize(graph){
  if(!graph || graph.isCancelled)return null;
  const start=parseUtcDate(graph.start),end=parseUtcDate(graph.end);
  if(!start||!end||end<=start)return null;
  const id=String(graph.id||'').slice(0,500);
  if(!id)return null;
  const isPrivate=String(graph.sensitivity||'').toLowerCase()==='private';
  return Object.freeze({
   id:id,
   title:isPrivate?'Privát esemény':String(graph.subject||'Névtelen esemény').slice(0,160),
   startMs:start.getTime(),endMs:end.getTime(),
   allDay:graph.isAllDay===true,
   showAs:String(graph.showAs||'busy').toLowerCase(),
   blocking:BLOCKING.has(String(graph.showAs||'busy').toLowerCase())
  });
 }
 function conflictIds(events){
  const active=(Array.isArray(events)?events:[]).filter(x=>x&&x.blocking).slice().sort((a,b)=>a.startMs-b.startMs||a.endMs-b.endMs);
  const collisions=new Set();
  for(let i=0;i<active.length;i++){
   const a=active[i];
   for(let j=i+1;j<active.length;j++){
    const b=active[j];
    if(b.startMs>=a.endMs)break; // touching start/end is NOT a collision
    if(a.startMs<b.endMs && b.startMs<a.endMs){collisions.add(a.id);collisions.add(b.id)}
   }
  }
  return collisions;
 }
 function analyze(payload){
  const source=Array.isArray(payload)?payload:[];
  const uniq=new Map();
  for(const raw of source.slice(0,500)){
   const item=normalize(raw);
   if(item)uniq.set(item.id,item);
  }
  const events=Array.from(uniq.values()).sort((a,b)=>a.startMs-b.startMs||a.endMs-b.endMs);
  return Object.freeze({events:events,conflicts:conflictIds(events)});
 }
 function todayKey(ms){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
 }
 function headline(result,now){
  const current=now instanceof Date?now.getTime():(Number.isFinite(now)?now:Date.now());
  const list=result&&Array.isArray(result.events)?result.events:[];
  const clashes=result&&result.conflicts instanceof Set?result.conflicts:new Set();
  const future=list.filter(e=>e.endMs>current);
  const relevantClashes=future.filter(e=>clashes.has(e.id));
  const next=future[0];
  if(!next)return {value:'Nincs közelgő esemény',detail:'Agenda megnyitása',status:'ready'};
  // Use the actual Budapest date and time, even for today's event and across year boundaries.
  const when=new Date(next.startMs);
  // Compact numeric date fits the 3-column, 64px SH9 ribbon on S24 screens.
  const date=todayKey(next.startMs).replace(/-/g,'.')+'.';
  const hour=next.allDay?'egész nap':new Intl.DateTimeFormat('hu-HU',{
   timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit'
  }).format(when);
  return {
   value:(relevantClashes.length?'⚠ ':'')+date+' · '+hour,
   detail:next.title,
   status:relevantClashes.length?'conflict':'ready'
  };
 }
 return Object.freeze({normalize:normalize,analyze:analyze,conflictIds:conflictIds,headline:headline,todayKey:todayKey});
});
