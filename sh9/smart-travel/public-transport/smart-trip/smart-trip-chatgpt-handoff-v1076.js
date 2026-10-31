/* SH9 Smart Trip AI v1076: one user search -> ChatGPT (zero OpenAI API calls).
 * Sends only the selected trip, timestamp, and when the user explicitly chose
 * a matching favorite, its coordinates. Never sends family GPS or health data.
 * ChatGPT website URL parameters are not a stable API; prompt may require Send.
 * This is an outbound handoff, NOT SH9-native AI or reply synchronization.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_SMART_TRIP_CHATGPT_V1076=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const LIMIT=1600;
 const PRIORITY={
  balanced:'Léna ajánlása: kevés várakozás és gyaloglás, kevés átszállás, jó csatlakozási biztonság',
  wait:'Lehető legkevesebb várakozás',
  transfers:'Lehető legkevesebb átszállás',
  duration:'Legrövidebb teljes menetidő',
  departure:'A legkorábbi megfelelő indulás'
 };
 const safe=s=>String(s||'').trim().replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').slice(0,120);
 function point(q,p){
  if(!p||safe(p.name)!==safe(q)||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||
    p.lat<45||p.lat>49||p.lng<16||p.lng>23)return '';
  // Share only the explicitly selected favorite coordinates, not household GPS.
  return ' (kijelölt hely koordinátája: '+p.lat.toFixed(5)+', '+p.lng.toFixed(5)+')';
 }
 function valid(q){
  if(!q||!['now','depart','arrive'].includes(q.mode)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(q.time||'')||
   !/^\d{4}-\d{2}-\d{2}$/.test(q.date||''))return false;
  const d=new Date(q.date+'T12:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===q.date&&
   safe(q.from).length>=2&&safe(q.to).length>=2&&
   safe(q.from).toLocaleLowerCase('hu-HU')!==safe(q.to).toLocaleLowerCase('hu-HU');
 }
 function prompt(q,points,priority){
  if(!valid(q))return null;
  const departure=safe(q.from)+point(q.from,points?.origin);
  const destination=safe(q.to)+point(q.to,points?.destination);
  const timing=q.mode==='arrive'?'Legkésőbb érkezés: ':q.mode==='depart'?'Indulás időpontja: ':'Indulás most, referenciaidő: ';
  const requested=PRIORITY[priority]||PRIORITY.balanced;
  // GPT already understands routing. Supply only the user's context and
  // safety-critical verification criteria; avoid overconstraining research.
  const body=[
   'Léna, tervezz egy jó, ajtótól ajtóig tartó tömegközlekedési utat.',
   'Honnan: '+departure,
   'Hová: '+destination,
   timing+q.date+' '+q.time+' (Budapest)',
   'Fontos: '+requested,
   'Adj egy legjobb útvonalat pontos járatokkal, átszállásokkal és gyaloglással; ha szükséges, B tervet.',
   'Ellenőrizd az adott nap menetrendjét és az útvonalat érintő ünnepi vagy forgalmi eltéréseket. A bizonytalan időpontokat jelöld becsültnek, adj forráslinket.'
  ].join('\n');
  return body.length<=LIMIT?body:null;
 }
 function url(q,points,priority){
  const message=prompt(q,points,priority);
  if(!message)return null;
  const u=new URL('https://chatgpt.com/');
  u.searchParams.set('q',message);
  return u.toString();
 }
 function go(q,points,priority,location){
  const target=url(q,points,priority);
  if(!target||typeof location?.assign!=='function')return false;
  try{location.assign(target);return true}catch(_){return false}
 }
 return Object.freeze({valid,prompt,url,go});
});