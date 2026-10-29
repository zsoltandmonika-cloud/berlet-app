/* SH9 Volán v1002: official MÁVPlusz itinerary-search handoff.
 * Uses source-backed OSM identities from an ACTUAL MÁVPlusz shared URL.
 * Other Hungarian locations fall back to locally imported real GTFS coordinates,
 * with approximation explicitly reported. Does not invent OSM IDs, search IDs,
 * active itineraries, tickets or reservations. No network requests on load.
 */
(function(w,d){'use strict';
const SERVICE='https://mavplusz.hu/#/?', STORE='sh9-volan-provider-places-v1002';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const known=new Map();
const safeGeo=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=45.5&&p.lat<=48.9&&p.lon>=16&&p.lon<=23;
function register(item){
 if(!item||typeof item.name!=='string'||!/^[\p{L}\p{N} .,'()-]{2,100}$/u.test(item.name)||!safeGeo(item))return false;
 const key=norm(item.name);
 if(!key)return false;
 known.set(key,Object.freeze({name:item.name,lat:Number(item.lat),lon:Number(item.lon),providerId:'OSM:'+item.name}));
 return true;
}
// Both identities below came directly from the user-provided real MÁVPlusz
// itinerary share for 2026-11-01 Kazincbarcika -> Budapest. They are NOT
// guessed town coordinates or newly fabricated OSM provider identifiers.
register({name:'Kazincbarcika',lat:48.2544414,lon:20.6223251});
register({name:'Budapest',lat:47.4978789,lon:19.0402383});
function load(){
 try{
  const records=JSON.parse(w.localStorage.getItem(STORE)||'[]');
  if(Array.isArray(records))for(const row of records.slice(0,1000))register(row);
 }catch(_){}
}
function persist(){
 try{w.localStorage.setItem(STORE,JSON.stringify([...known.values()].slice(0,1000)))}catch(_){}
}
function parseProviderPlace(raw){
 if(typeof raw!=='string'||raw.length>250)return null;
 const m=raw.match(/^[^:]{2,120}\*::(4[5-8]\.\d+),(1[6-9]\.\d+|2[0-2]\.\d+)::OSM:([^:]{2,100})$/u);
 if(!m)return null;
 const candidate={name:m[3],lat:Number(m[1]),lon:Number(m[2])};
 return safeGeo(candidate)?candidate:null;
}
/* Future Smart Search integration can learn true provider place IDs from
 * official user-provided share URLs, without extra queries or hardcoding.
 * Never use ui_activeSearch or ui_activeItinerary outside their original search.
 */
function learnOfficialShare(url){
 try{
  const u=new URL(url);
  if(u.origin!=='https://mavplusz.hu'||!u.hash.startsWith('#/?'))return {ok:false,reason:'Nem hivatalos MÁVPlusz útvonalhivatkozás'};
  const p=new URLSearchParams(u.hash.slice(3));
  const from=parseProviderPlace(p.get('fromPlace')),to=parseProviderPlace(p.get('toPlace'));
  if(!from||!to)return {ok:false,reason:'A megosztásból hiányzik legalább egy ellenőrizhető OSM helyazonosító'};
  register(from);register(to);persist();
  return {ok:true,learned:[from.name,to.name]};
 }catch(_){return {ok:false,reason:'Érvénytelen hivatkozás'}}
}
function medoid(ids,stopById){
 const valid=[];
 for(const id of ids||[]){const stop=stopById?.get(id);if(safeGeo(stop)&&stop.name)valid.push(stop)}
 if(!valid.length)return null;
 if(valid.length===1)return valid[0];
 const lat=valid.map(x=>x.lat).sort((a,b)=>a-b)[Math.floor(valid.length/2)];
 const lon=valid.map(x=>x.lon).sort((a,b)=>a-b)[Math.floor(valid.length/2)];
 let best=valid[0],score=Infinity;
 for(const s of valid){const dist=Math.pow((s.lat-lat)*1.5,2)+Math.pow(s.lon-lon,2);if(dist<score){score=dist;best=s}}
 return best;
}
function lookup(text,stopById){
 const resolver=w.SH9_VOLAN_FULL_V996?.resolvePlace;
 const place=typeof resolver==='function'?resolver(text):null;
 if(!place?.ids?.length)return {ok:false,reason:'Nem azonosítható hely: '+String(text||'')};
 const stored=known.get(norm(place.label));
 if(place.kind==='city'&&stored){
  // An official city token means city-wide journey planning, NOT a station.
  return {ok:true,label:stored.name,raw:stored.name.toLocaleUpperCase('hu-HU')+'*::'+stored.lat+','+stored.lon+'::'+stored.providerId,source:'verified-osm-city',approximate:false};
 }
 const geo=medoid(place.ids,stopById);
 if(!geo)return {ok:false,reason:'Nincs földrajzi koordináta a GTFS-ben: '+place.label};
 const label=place.kind==='stop'||place.kind==='stop-group'?geo.name:place.label;
 // OTP-compatible coordinate format, not an invented MÁVPlusz station ID.
 return {ok:true,label,raw:label+'::'+Number(geo.lat).toFixed(6)+','+Number(geo.lon).toFixed(6),source:'local-gtfs-coordinate',approximate:place.kind==='city'};
}
function build({from,to,when,mode='depart',stopById}={}){
 const origin=lookup(from,stopById),destination=lookup(to,stopById);
 if(!origin.ok||!destination.ok)return {ok:false,reason:!origin.ok?origin.reason:destination.reason};
 const date=when instanceof Date?when:new Date(when);
 if(!Number.isFinite(date.getTime()))return {ok:false,reason:'Hiányzik az érvényes keresési időpont'};
 const p={};for(const x of clock.formatToParts(date))p[x.type]=x.value;
 const params=new URLSearchParams({
  ui_itineraryView:'full',
  fromPlace:origin.raw,
  toPlace:destination.raw,
  date:p.year+'-'+p.month+'-'+p.day,
  time:p.hour+':'+p.minute,
  arriveBy:mode==='arrive'?'true':'false',
  mode:'WALK,TRANSIT',
  showIntermediateStops:'true',
  maxWalkDistance:'1609',
  ignoreRealtimeUpdates:'true',
  numItineraries:'15',
  otherThanPreferredRoutesPenalty:'900'
 });
 // Deliberately omit ui_activeSearch and ui_activeItinerary: they refer to
 // dynamically computed result sets and cannot be safely transplanted.
 return {ok:true,url:SERVICE+params.toString(),origin,destination,source:'MÁVPlusz share URL pattern',
  warning:'Az útvonalakat a MÁVPlusz tervezi újra. Nem kerül át automatikusan egy konkrét találat vagy jegy/ülőhely.',
  approximate:origin.approximate||destination.approximate};
}
function launch(query){
 const result=build(query);
 if(!result.ok){w.SH9_VOLAN_PLANNER_V3?.toast?.(result.reason);return false}
 const a=d.createElement('a');a.href=result.url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.style.display='none';d.body.append(a);a.click();a.remove();return true;
}
load();
w.SH9_VOLAN_ROUTE_SHARE_V1002=Object.freeze({build,launch,learnOfficialShare,lookup});
})(window,document);