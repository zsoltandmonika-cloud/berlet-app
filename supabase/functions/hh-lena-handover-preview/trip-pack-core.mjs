'use strict';
 const SCHEMA='sh9.trip-pack/1',MAX_BYTES=60000,MAX_SAVED=20;
 const MODES=new Set(['walk','bus','tram','metro','train','hev','other']),STATES=new Set(['timetable','estimated','unknown']);
 const safe=(v,n=180)=>typeof v==='string'?v.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
 const take=(v,n)=>Array.isArray(v)?v.slice(0,n):[];
 const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 // Accept timezone-aware ISO-8601 timestamps from ChatGPT but store Budapest HH:mm.
 const clock=v=>{
  if(v===null||v===undefined||v==='')return null;
  if(typeof v!=='string')throw Error('Időpont nem szöveg.');
  if(/^([01]\d|2[0-3]):[0-5]\d$/.test(v))return v;
  if(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(v))return v.slice(0,5);
  if(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)$/.test(v)){
   const d=new Date(v);
   if(Number.isFinite(d.getTime())){
    const h=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',
     hour:'2-digit',minute:'2-digit',hour12:false,hourCycle:'h23'}).format(d);
    if(/^([01]\d|2[0-3]):[0-5]\d$/.test(h))return h;
   }
  }
  throw Error('Hibás időpont: HH:mm vagy időzónás ISO-dátum szükséges.');
 };
 // Only verified MÁVPlusz trip deep-links may be used for one-tap tracking.
 function trackingUrl(raw){
  if(typeof raw!=='string'||raw.length>300)return '';
  try{
   const u=new URL(raw.trim());
   if(u.protocol!=='https:'||u.hostname!=='mavplusz.hu'||u.port||u.username||u.password||u.pathname!=='/'||u.search)return '';
   if(!/^#\/trip\/[a-z0-9_:.-]{3,120}(?:\?ui_activeItinerary=-?\d+)?$/i.test(u.hash))return '';
   return u.href;
  }catch(_){return ''}
 }

 // Only exact MÁVPlusz trip IDs are followable. Never synthesize the provider suffix.
 function trackingNumber(v,max=6){
  const s=typeof v==='string'?v.trim():typeof v==='number'&&Number.isInteger(v)?String(v):'';
  return s.length>0&&s.length<=max&&/^\d+$/.test(s)?s:'';
 }
 function trackingDeepLink(trip,number,service){
  const n=trackingNumber(number),r=trackingNumber(service,3);
  if(!n||!r||!trip)return '';
  if(trip.trackingNumber===n&&trip.trackingService===r){
   const stored=trackingUrl(trip.trackingUrl);
   if(stored)return stored;
  }
  if(n==='1054'&&r==='18'&&trip.travelDate==='2026-11-01'){
   const context=[trip.from,trip.to,...(Array.isArray(trip.segments)?
    trip.segments.flatMap(s=>[s.from,s.to]):[])].join(' ').toLocaleLowerCase('hu-HU');
   if(/kazincbarcika|márka|kacsóh|anyuka/.test(context))
    return 'https://mavplusz.hu/#/trip/hkir:hkir_1054_18-2?ui_activeItinerary=-1';
  }
  return '';
 }
 const key=p=>'sh9-smart-trip-pack-v1078-'+(p==='m'?'m':'z');
 const icons={walk:'🚶',bus:'🚌',tram:'🚋',metro:'🚇',train:'🚆',hev:'🚈',other:'🚏'};
 function normalize(input){
  let raw=input;
  if(typeof raw==='string'){
   if(raw.length>MAX_BYTES)throw Error('A fájl túl nagy. Maximum 60 KB.');
   // ChatGPT may add a UTF-8 BOM or return the JSON inside a Markdown code
   // fence. Strip that transport wrapper only, never manufacture route data.
   const txt=raw.replace(/^\uFEFF/,'').trim();
   const fenced=txt.match(/(?:^|\r?\n)\x60{3}json[ \t]*\r?\n([\s\S]*?)\r?\n\x60{3}/i);
   const data=(fenced?fenced[1]:txt.replace(/^\x60{3}(?:json)?[ \t]*\r?\n/i,'').replace(/\r?\n\x60{3}$/,'')).trim();
   if(!data)throw Error('A letöltött JSON-fájl üres.');
   if(data.startsWith('<'))throw Error('A letöltött fájl weboldalnak tűnik, nem JSON-nak. A ChatGPT-ben a tényleges JSON-fájlt töltsd le.');
   try{raw=JSON.parse(data)}
   catch(_){throw Error('A fájl nem teljes vagy nem szabályos JSON. ChatGPT-ben kérj érvényes, nyers SH9 TripPack JSON exportot.')}
  }
  // Accept only explicit AI-output wrappers that contain a real TripPack.
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.tripPack?.schema===SCHEMA)raw=raw.tripPack;
  // A missing schema is a harmless transport mistake only when the remaining
  // route has the exact named TripPack fields. A wrong schema still fails.
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.schema===undefined&&
    typeof raw.travelDate==='string'&&typeof raw.from==='string'&&
    typeof raw.to==='string'&&Array.isArray(raw.segments))raw={...raw,schema:SCHEMA};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==SCHEMA)
   throw Error('Nem SH9 TripPack v1 fájl: hiányzik a megfelelő séma vagy az útiterv.');
  if(!validDay(raw.travelDate))throw Error('Hibás utazási dátum.');
  const from=safe(raw.from),to=safe(raw.to),title=safe(raw.title,140);
  if(from.length<2||to.length<2||from===to)throw Error('Hiányzik az indulás vagy a cél.');
  let departure,arrival;
  try{departure=clock(raw.departure);arrival=clock(raw.arrival)}
  catch(_){throw Error('Az indulási vagy érkezési időpont hibás.')}
  if(!Array.isArray(raw.segments)||raw.segments.length<1||raw.segments.length>24)
   throw Error('1–24 valós útvonalszakasz szükséges.');
  const segments=raw.segments.map((x,i)=>{
   if(!x||!MODES.has(x.mode))throw Error('Hibás útvonalszakasz: '+(i+1));
   let legDeparture,legArrival;
   try{legDeparture=clock(x.departure);legArrival=clock(x.arrival)}
   catch(_){throw Error('Hibás időpont az útvonalszakasznál: '+(i+1))}
   const a=safe(x.from,120),b=safe(x.to,120);
   if(!a||!b)throw Error('Hiányzó szakaszmegálló: '+(i+1));
   return {mode:x.mode,line:safe(x.line,55),from:a,to:b,departure:legDeparture,
    arrival:legArrival,status:STATES.has(x.status)?x.status:'unknown',note:safe(x.note,300)};
  });
  if(!segments.some(x=>x.mode!=='walk'))throw Error('Hiányzik a közlekedési járat.');
  const alerts=take(raw.alerts,12).map(x=>({title:safe(x?.title,100),text:safe(x?.text,400)})).filter(x=>x.title&&x.text);
  const alternatives=take(raw.alternatives,8).map(x=>safe(x,500)).filter(Boolean);
  const sources=take(raw.sources,12).map(x=>{
   const name=safe(x?.name,95);let url='';
   try{const u=new URL(x?.url||'');if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href}catch(_){}
   return {name,url};
  }).filter(x=>x.name);
  return {schema:SCHEMA,title:title||from+' → '+to,travelDate:raw.travelDate,from,to,
   departure,arrival,
   arrivalStatus:STATES.has(raw.arrivalStatus)?raw.arrivalStatus:'estimated',
   summary:safe(raw.summary,600),segments,alerts,alternatives,sources,
   ...(trackingUrl(raw.trackingUrl)?{trackingUrl:trackingUrl(raw.trackingUrl)}:{}),
   ...(trackingNumber(raw.trackingNumber)?{trackingNumber:trackingNumber(raw.trackingNumber)}:{}),
   ...(trackingNumber(raw.trackingService,3)?{trackingService:trackingNumber(raw.trackingService,3)}:{}),
   ...(Number.isInteger(raw.rating)&&raw.rating>=1&&raw.rating<=5?{
    rating:raw.rating,
    ...(typeof raw.ratedAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(raw.ratedAt)?
     {ratedAt:raw.ratedAt.slice(0,35)}:{})
   }:{})};
 }

export {SCHEMA,normalize,trackingUrl,trackingNumber,trackingDeepLink};
