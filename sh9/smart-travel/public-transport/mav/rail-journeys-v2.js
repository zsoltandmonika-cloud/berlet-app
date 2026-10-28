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
 const dateFmt=new Intl.DateTimeFormat('hu-HU',{weekday:'short',year:'numeric',month:'short',day:'numeric',timeZone:'Europe/Budapest'});
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
 function sameSearch(a,b){
  if(!a||!b)return false;
  return a.from===b.from&&a.to===b.to&&a.mode===b.mode&&
   (a.mode==='now'||a.when===b.when);
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
   if(!service||!number||/[<>]/.test(String(v.number??''))||!/^[\p{L}\p{N} \-\/]+$/u.test(number))return null;
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
  let last=null,feed=null,feedQuery=null,feedValidUntil=0;
  const header=departures.querySelector('.demo');
  if(header){header.textContent='Csak hitelesített vonatadat · nincs háttérlekérdezés';header.classList.add('rail-source-status');header.setAttribute('role','status');}
  function status(msg){if(header)header.textContent=msg;}
  function span(cls,val){const e=doc.createElement('span');e.className=cls;e.textContent=val;return e;}
  function btn(label,href){
   const b=doc.createElement('button');b.type='button';b.className='rail-official-action';b.textContent=label;
   b.addEventListener('click',()=>open(href));return b;
  }
  function open(href){
   let target;
   try{target=new URL(href)}catch(_){return}
   if(target.protocol!=='https:'||!(
      officialLink(target.href)||
      routeEngine?.allowedUrl?.(target.href)||
      (target.hostname==='www.google.com'&&target.pathname==='/maps/dir/'&&target.searchParams.get('api')==='1')
   ))return;
   if(/Android|iPhone|iPad/i.test(win.navigator.userAgent)){win.location.assign(href);return}
   const a=doc.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.click();
  }
  const boardUrl=()=>routeEngine?.boardFor(from.value)||routeEngine?.URLS.timetable||'https://mavplusz.hu/';
  function emptyState(){
   list.replaceChildren();
   const heading=departures.querySelector('h2');
   if(heading)heading.lastChild?.nodeType===3?heading.lastChild.textContent=' Vasúti szolgáltatások':heading.setAttribute('aria-label','Vasúti szolgáltatások');
   // Preserve the approved three photo-card positions, but NEVER show fake trains.
   const options=[
    {title:'Állomási indulások',info:'Hiteles indulások · aktuális állomás',url:()=>boardUrl()},
    {title:'MÁVPlusz menetrend',info:'Hivatalos utazástervező',url:()=>routeEngine?.URLS.timetable||'https://mavplusz.hu/'},
    {title:'Vonatinfó',info:'Valós vonatkövető térkép',url:()=>routeEngine?.URLS.liveTrains||'https://vonatinfo.mav.hu/'}
   ];
   options.forEach((item,i)=>{
    const b=doc.createElement('button');b.type='button';b.className='trainrow rail-provider-row';
    b.setAttribute('aria-label',item.title+' · hivatalos szolgáltatás megnyitása');
    const image=span('trainthumb trainthumb-'+i,'');image.setAttribute('aria-hidden','true');
    const clock=span('clocking','');
    clock.append(span('times','–:–'),span('duration','Nincs élő adat'));
    const copy=span('traincopy','');
    const title=doc.createElement('strong');title.textContent=item.title;
    copy.append(title,span('rail-train-sub',item.info));
    b.append(image,clock,copy,span('track','—'),span('arrowright','›'));
    b.addEventListener('click',()=>open(item.url()));
    list.append(b);
   });
   status('Élő adatkapcsolat: még nincs · a három kártya hivatalos szolgáltatást nyit');
  }
  function rows(data){
   list.replaceChildren();
   const heading=departures.querySelector('h2');
   if(heading)heading.lastChild?.nodeType===3?heading.lastChild.textContent=' Következő járatok':heading.setAttribute('aria-label','Következő járatok');
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
    row.setAttribute('aria-expanded','false');
    row.setAttribute('aria-label',train.service+' '+train.number+' · járat részleteinek megnyitása');
    const detail=doc.createElement('section');detail.className='rail-gtfs-detail glass';detail.hidden=true;
    detail.append(span('rail-empty-heading',train.service+' · '+train.number));
    detail.append(span('rail-leg-line','Indulás: '+dateFmt.format(new Date(train.departure))+' '+fmt(new Date(train.departure))));
    detail.append(span('rail-leg-line','Érkezés: '+dateFmt.format(new Date(train.arrival))+' '+fmt(new Date(train.arrival))));
    detail.append(span('rail-search-meta','Forrás: '+train.source+' · '+(train.live?'élő adat':'menetrendi adat')));
    detail.append(span('rail-warning',
      (train.delayMinutes!==null?'Jelzett eltérés: '+train.delayMinutes+' perc. ':'Késési adat nem áll rendelkezésre. ')+
      (train.platform?'Vágány: '+train.platform+'. ':'Vágányadat nem áll rendelkezésre. ')+
      'Az aktuális tájékoztatást mindig ellenőrizd a MÁV-nál.'));
    detail.append(btn('Hivatalos információ ↗',train.link||boardUrl()));
    row.addEventListener('click',()=>{const expanded=row.getAttribute('aria-expanded')==='true';row.setAttribute('aria-expanded',String(!expanded));detail.hidden=expanded;});
    list.append(row,detail);
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
   panel.append(span('rail-search-meta',label+' · '+dateFmt.format(new Date(q.when))+' · '+chosen));
   if(q.mode!=='now')panel.append(span('rail-warning','A dátumot és az időmódot az SH9 megőrizte. A külső Google Térkép-hivatkozás ezeket nem adja át; ott szükség esetén külön válaszd ki.'));
   panel.append(span('rail-search-source-info','A saját menetrendi találatokhoz engedélyezett GTFS vagy Google Routes adatkapcsolat szükséges. Addig a hivatalos szolgáltatások külön nyithatók meg.'));
   const actions=doc.createElement('div');actions.className='rail-empty-actions';
   actions.append(btn('Google Térkép ↗',transitLink(q)),btn('MÁVPlusz ↗','https://mavplusz.hu/'));
   panel.append(actions);
  }
  search.onclick=()=>{
   const q=currentQuery();
   if(!q){status('Válassz két különböző állomást és érvényes időpontot.');return}
   last=q;presentSearch(q);
   // Stay in SH9. External maps only open from the explicit Google Térkép action.
   // Without a licensed provider, the three approved photo cards link to separate official rail services.
   if(feed&&feedQuery&&sameSearch(feedQuery,q)&&Date.now()<feedValidUntil)rows(feed);
   else{feed=null;feedQuery=null;emptyState()}
   doc.getElementById('rail-journey-result')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  refresh.onclick=()=>{const q=currentQuery();if(!q){status('Érvényes útvonal szükséges.');return}last=q;presentSearch(q);open('https://mavplusz.hu/')};
  // Deliberately no automatic remote fetch/polling or mutable global injection.
  // An approved live provider must supply validated JSON via an explicit integration.
  function acceptProviderData(json){
   const q=last||currentQuery();
   const verified=validateFeed(json,q,new Date());
   if(!verified)return false;
   if(!sameSearch(q,currentQuery()))return false;
   feed=verified;feedQuery=q;feedValidUntil=Date.parse(verified.fetchedAt)+MAX_AGE;
   rows(feed);return true;
  }
  function showTimetable(result,q){
   if(!sameSearch(q,currentQuery()))return false;
   const isGoogle=result?.attribution==='© Google Maps';
   last=q;
   presentSearch(q);
   // Replace external-planner timing disclaimer: native GTFS schedule respects selected mode.
   const searchPanel=doc.getElementById('rail-journey-result');
   if(searchPanel){
    const warning=searchPanel.querySelector('.rail-warning');
    if(warning)warning.textContent=isGoogle?'A Google tömegközlekedési keresője a választott időpont alapján tervez. A vágány, késés és GPS nem élő adat. © Google Maps':'A helyi MÁV GTFS-menetrend a kiválasztott időpont alapján keres; késés és vágány nem élő adat.';
   }
   if(!result||result.status!=='ok'){
    emptyState();
    status(result?.status==='station-not-in-feed'
     ?'A kiválasztott állomás még nincs az engedélyezett GTFS-kivonatban.'
     :'Az engedélyezett menetrend nem olvasható. Használd a MÁVPlusz-t.');
    return false;
   }
   list.replaceChildren();
   if(!result.journeys?.length){
    const message=doc.createElement('div');message.className='rail-empty glass';
    message.append(span('rail-empty-heading','Nincs menetrendi találat az adott időszakban'),
      span('rail-empty-body',isGoogle?'A Google most nem adott vissza vasúti találatot. Próbálj másik időpontot vagy MÁVPlusz-t. © Google Maps':'A GTFS a tervezett menetrendet mutatja. Másik időponttal, vagy a MÁVPlusz segítségével keress tovább.'));
    message.append(btn('Hivatalos MÁVPlusz ↗','https://mavplusz.hu/'));
    list.append(message);
   }else result.journeys.slice(0,3).forEach((j,i)=>{
    const row=doc.createElement('button');row.className='trainrow rail-gtfs-row';row.type='button';
    row.setAttribute('aria-expanded','false');
    row.setAttribute('aria-label',j.legs[0].service+' · '+fmt(new Date(j.departure))+' · '+j.transfers+' átszállás · részletek');
    const picture=span('trainthumb trainthumb-'+i,'');picture.setAttribute('aria-hidden','true');
    const clocks=span('clocking','');
    clocks.append(span('times',fmt(new Date(j.departure))+' → '+fmt(new Date(j.arrival))),span('duration',j.durationMinutes+' perc'));
    const summary=span('traincopy','');
    const title=doc.createElement('strong');title.textContent=j.legs[0].service||'MÁV járat';
    summary.append(title,span('rail-train-sub',j.transfers===0?'Közvetlen':'Átszállás: '+j.transfers));
    row.append(picture,clocks,summary,span('track','Menetrend'),span('arrowright','›'));
    const details=doc.createElement('section');details.className='rail-gtfs-detail glass';details.hidden=true;
    details.append(span('rail-empty-heading','Útvonal részletei · tervezett menetrend'));
    j.legs.forEach((leg,n)=>{
     details.append(span('rail-leg-line',(n+1)+'. '+leg.service+
      ' · '+leg.from+' '+fmt(new Date(leg.departure))+
      ' → '+leg.to+' '+fmt(new Date(leg.arrival))));
    });
    details.append(span('rail-warning','Vágány-, késés- és vonatpozíció-adat még nincs ellenőrizve.'));
    details.append(btn('Hivatalos MÁVPlusz ↗','https://mavplusz.hu/'));
    row.addEventListener('click',()=>{
      const expanded=row.getAttribute('aria-expanded')==='true';
      row.setAttribute('aria-expanded',String(!expanded));details.hidden=expanded;
    });
    list.append(row,details);
   });
   status('Forrás: '+String(result.source||'MÁV GTFS').slice(0,120)+' · tervezett útvonal, NEM élő késés/vágány'+(isGoogle?' · © Google Maps':''));
   return true;
  }
  emptyState();
  return {acceptProviderData,currentQuery,showTimetable};

 }
 return Object.freeze({searchRequest,sameSearch,transitLink,validateFeed,officialLink,mount});
});
if(typeof document!=='undefined'&&window.SH9_MAV_JOURNEYS_V2){
 window.SH9_MAV_JOURNEYS_INSTANCE=window.SH9_MAV_JOURNEYS_V2.mount(document,window);
}
