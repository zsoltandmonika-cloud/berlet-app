/* SH9 MÁV Smart Rail · Phase 2B itinerary and trustworthy train cards.
 * No imaginary departures/platforms. Actual train cards require a working
 * authorized same-origin feed. No hidden polling, personal data or Supabase.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_MAV_JOURNEYS_V2=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const TRUSTED=['https://mavplusz.hu/','https://jegy.mav.hu/','https://vonatinfo.mav.hu/','https://mikorindul.hu/keleti','https://mikorindul.hu/nyugati'];
 const MAX_AGE=10*60*1000;
 const station=x=>String(x??'').trim().replace(/\s+/g,' ').slice(0,120);
 const cleanText=(s,max=65)=>String(s??'').trim().replace(/[\u0000-\u001f<>]/g,'').slice(0,max);
 const validDate=(value)=>{const dt=new Date(value);return Number.isFinite(dt.getTime())?dt:null};
 const fmt=(date)=>new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}).format(date);
 function searchRequest(from,to,mode,when,now=new Date()){
  const a=station(from),b=station(to);
  if(a.length<2||b.length<2||/[<>]/.test(a+b)||a.toLocaleLowerCase('hu')===b.toLocaleLowerCase('hu'))return null;
  const selected=['now','depart','arrive'].includes(mode)?mode:'now';
  const d=selected==='now'?new Date(now):validDate(when);
  if(!d)return null;
  // Queries beyond a reasonable published-timetable horizon are rejected, not guessed.
  if(d.getTime()<now.getTime()-24*3600*1000||d.getTime()>now.getTime()+90*86400000)return null;
  return {from:a,to:b,mode:selected,when:d.toISOString(),createdAt:now.toISOString()};
 }
 function transitLink(query){
  if(!query)return null;
  return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:query.from,destination:query.to,travelmode:'transit'}).toString();
 }
 function officialLink(url){
  try{
   const u=new URL(url);
   if(u.protocol!=='https:')return false;
   return TRUSTED.some(x=>url===x);
  }catch(_){return false}
 }
 function validateFeed(payload,query,now=new Date()){
  if(!payload||payload.schema!=='sh9-mav-trains-v1'||!Array.isArray(payload.trains)||!query)return null;
  const stamp=validDate(payload.fetchedAt);
  if(!stamp||stamp>new Date(now.getTime()+30000)||now.getTime()-stamp.getTime()>MAX_AGE)return null;
  if(station(payload.from)!==query.from||station(payload.to)!==query.to)return null;
  if(!/^([a-z0-9_.-]{1,55})$/i.test(payload.provider||''))return null;
  const trainRows=payload.trains.slice(0,12).map(v=>{
   if(!v||typeof v!=='object')return null;
   const dep=validDate(v.departure),arrival=validDate(v.arrival);
   if(!dep||!arrival||arrival<=dep||arrival.getTime()-dep.getTime()>24*3600*1000)return null;
   const service=cleanText(v.service,44),number=cleanText(v.number,24);
   if(!service||!number||!/^[\p{L}\p{N} \-\/]+$/u.test(number))return null;
   const platform=(typeof v.platform==='string'||typeof v.platform==='number')?cleanText(v.platform,12):'';
   const delay=v.delayMinutes===null||v.delayMinutes===undefined?null:Number(v.delayMinutes);
   if(delay!==null&&(!Number.isInteger(delay)||delay< -15||delay>600))return null;
   return {service,number,departure:dep.toISOString(),arrival:arrival.toISOString(),
    platform:platform||null,delayMinutes:delay,source:cleanText(v.source||payload.provider,50),
    live:!!v.live,link:officialLink(v.link)?v.link:null};
  }).filter(Boolean);
  if(!trainRows.length)return null;
  return {fetchedAt:stamp.toISOString(),provider:payload.provider,trains:trainRows};
 }
 function mount(doc,win){
  const list=doc.getElementById('trainlist'),from=doc.getElementById('from'),to=doc.getElementById('to'),
        when=doc.getElementById('when'),search=doc.getElementById('find'),refresh=doc.getElementById('refresh'),
        departures=doc.getElementById('depart');
  if(!list||!from||!to||!search||!departures)return;
  const routeEngine=win.SH9_MAV_OFFICIAL_V1;
  let last=null,feed=null;
  const header=departures.querySelector('.demo');
  if(header){header.textContent='Csak hitelesített vonatadat · nincs háttérlekérdezés';header.classList.add('rail-source-status');header.setAttribute('role','status');}
  function status(msg){if(header)header.textContent=msg;}
  function span(cls,val){const e=doc.createElement('span');e.className=cls;e.textContent=val;return e;}
  function btn(label,href){
   const b=doc.createElement('button');b.type='button';b.className='rail-official-action';b.textContent=label;
   b.addEventListener('click',()=>open(href));return b;
  }
  function open(href){
   if(!href||!/^https:\/\//.test(href))return;
   if(/Android|iPhone|iPad/i.test(win.navigator.userAgent)){win.location.assign(href);return}
   const a=doc.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.click();
  }
  const boardUrl=()=>routeEngine?.boardFor(from.value)||routeEngine?.URLS.timetable||'https://mavplusz.hu/';
  function emptyState(){
   list.replaceChildren();
   const card=doc.createElement('div');card.className='rail-empty glass';
   card.append(span('rail-empty-heading','🚆 Menetrendi adatokra várva'));
   card.append(span('rail-empty-body','Hitelesített élő járatadat még nincs összekötve az SH9-cel. Korábbi mintajáratokat nem jelenítünk meg valós indulásként.'));
   const actions=doc.createElement('div');actions.className='rail-empty-actions';
   actions.append(btn('Állomási indulások ↗',boardUrl()),btn('MÁVPlusz tervező ↗','https://mavplusz.hu/'));
   card.append(actions);list.append(card);
   status('Élő adatkapcsolat: nincs · az eredeti MÁV-forrás elérhető egy érintéssel');
  }
  function rows(data){
   list.replaceChildren();
   data.trains.slice(0,3).forEach((train,i)=>{
    const row=doc.createElement('button');row.className='trainrow';row.type='button';
    row.setAttribute('aria-label',train.service+' '+train.number+' '+fmt(new Date(train.departure))+' indulás');
    const pic=span('trainthumb trainthumb-'+i,'');pic.setAttribute('aria-hidden','true');
    const clocks=span('clocking','');
    clocks.append(span('times',fmt(new Date(train.departure))+' → '+fmt(new Date(train.arrival))),span('duration',(Math.round((new Date(train.arrival)-new Date(train.departure))/60000))+' perc'));
    const copy=span('traincopy','');const name=doc.createElement('strong');name.textContent=train.service;
    copy.append(name,span('rail-train-sub',train.number+(train.delayMinutes!==null?(train.delayMinutes>0?' · +'+train.delayMinutes+' perc':' · pontos'):' · nincs késésadat')));
    const track=span('track',train.platform?'Vágány '+train.platform:'Vágány: nincs adat');
    row.append(pic,clocks,copy,track,span('arrowright','›'));
    row.addEventListener('click',()=>open(train.link||boardUrl()));list.append(row);
   });
   status('Forrás: '+data.provider+' · frissítve: '+fmt(new Date(data.fetchedAt))+(data.trains.some(t=>t.live)?' · élő adat':' · menetrendi adat'));
  }
  function mode(){return doc.querySelector('[data-mode].on')?.dataset.mode||'now'}
  function currentQuery(){return searchRequest(from.value,to.value,mode(),when?.value,new Date())}
  function presentSearch(q){
   let panel=doc.getElementById('rail-journey-result');
   if(!panel){
    panel=doc.createElement('section');panel.id='rail-journey-result';panel.className='rail-journey-result glass';
    departures.parentNode.insertBefore(panel,departures);
   }
   panel.replaceChildren();
   panel.append(span('rail-search-title','🚆 Útvonalkeresés'));
   panel.append(span('rail-search-route',q.from+' → '+q.to));
   const chosen=fmt(new Date(q.when));
   const label=q.mode==='arrive'?'Érkezés eddig':q.mode==='depart'?'Indulás ekkor':'Indulás most';
   panel.append(span('rail-search-meta',label+' · '+chosen));
   if(q.mode!=='now')panel.append(span('rail-warning','A kiválasztott időt a külső tervezőben is állítsd be: a hivatalos Google Maps URL nem fogadja át az indulás/érkezés időmódját.'));
   const actions=doc.createElement('div');actions.className='rail-empty-actions';
   actions.append(btn('Útvonalak megnyitása ↗',transitLink(q)),btn('MÁVPlusz ↗','https://mavplusz.hu/'));
   panel.append(actions);
  }
  search.onclick=()=>{
   const q=currentQuery();
   if(!q){status('Válassz két különböző állomást és érvényes időpontot.');return}
   last=q;presentSearch(q);
   doc.getElementById('rail-journey-result')?.scrollIntoView({behavior:'smooth',block:'nearest'});
   // If no feed is installed, station board remains the only genuine live source.
   if(feed)rows(feed);else emptyState();
  };
  refresh.onclick=()=>{const q=currentQuery();if(q){last=q;presentSearch(q)}else{status('Érvényes útvonal szükséges.');return}if(feed)rows(feed);else emptyState()};
  // Deliberately no automatic remote fetch/polling or mutable global injection.
  // An approved live provider must supply validated JSON via an explicit integration.
  function acceptProviderData(json){
   const q=last||currentQuery();
   const verified=validateFeed(json,q,new Date());
   if(!verified)return false;
   feed=verified;rows(feed);return true;
  }
  emptyState();
  return {acceptProviderData,currentQuery};
 }
 return Object.freeze({searchRequest,transitLink,validateFeed,officialLink,mount});
});
if(typeof document!=='undefined'&&window.SH9_MAV_JOURNEYS_V2){
 window.SH9_MAV_JOURNEYS_V2.mount(document,window);
}
