(function(root){
'use strict';
/* HealthHub v590 · I-08: Sleep + Digital Wellbeing evidence bridge.
   Pure, synchronous, user-consented in-memory enrichment. It receives ONLY
   the prevalidated v507 Dropbox Usage Access snapshot from v328 and existing
   v289 Health Context sleep sessions. NO fetch, write, telemetry, new AI
   request, app-detail package names, clinical inference or profile mixing.
   Raw time series never leave this client module: only bounded source-labeled
   observations enter the already authorized Ask Léna research payload. */
var SCHEMA='healthhub.ask-lena/1',PROFILE=['zsolt','monika'],DAY=86400000,HOUR=3600000;
var SOURCE='android.usage-events.observed-app-foreground',DIGITAL='healthhub.digital-wellbeing/1';
var tz=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
function parts(ms){
 var v={};tz.formatToParts(new Date(ms)).forEach(function(p){if(p.type!=='literal')v[p.type]=p.value});
 return {date:v.year+'-'+v.month+'-'+v.day,hour:Number(v.hour)};
}
function previousDay(s){var q=s.split('-').map(Number);return new Date(Date.UTC(q[0],q[1]-1,q[2]-1,12)).toISOString().slice(0,10)}
function validMs(s,now){
 if(typeof s!=='string'||!s.includes('T'))return null;
 var n=Date.parse(s);return Number.isFinite(n)&&n<=now+300000?n:null;
}
function min(ms){return Math.round(ms/60000)}
function pairNights(sessions,doc,now){
 var hours=doc.hours, seen=Object.create(null),results=[];
 // Process earliest sleep starts first, to avoid multiplying a fragmented night.
 (sessions||[]).slice().sort(function(a,b){return Date.parse(a.startTime)-Date.parse(b.startTime)}).forEach(function(s){
  if(!s)return;
  var a=validMs(s.startTime,now),b=validMs(s.endTime,now),dur=Number(s.durationMin);
  if(a===null||b===null||b<=a||b<now-31*DAY||!Number.isFinite(dur)||dur<1||dur>1440||dur*60000>b-a+3600000)return;
  var local=parts(a);
  // Night starts in the evening or early morning only; a nap is not a night.
  if(local.hour<18&&local.hour>=6)return;
  var night=local.hour<6?previousDay(local.date):local.date;
  if(seen[night])return;
  seen[night]=true;
  var sampled=hours.filter(function(h){
   if(!h||!Number.isSafeInteger(h.hourStartMs)||h.hourStartMs+HOUR>a||h.hourStartMs<a-9*HOUR)return false;
   var t=parts(h.hourStartMs);
   return t.date===night&&t.hour>=20&&t.hour<=23;
  });
  if(!sampled.length)return;
  results.push({night:night,sleepMinutes:Math.round(dur),
    eveningObservedMinutes:min(sampled.reduce(function(n,h){return n+h.observedForegroundMs},0)),
    observedEveningHours:sampled.length});
 });
 return results.sort(function(a,b){return b.night.localeCompare(a.night)}).slice(0,7);
}
function enrich(input,ctx,digital,opts){
 var profile=input&&input.profile;
 if(!input||input.schema!==SCHEMA||input.consent!==true||PROFILE.indexOf(profile)<0)
  throw Error('I-08: hozzájárulással ellenőrzött kutatási kérés szükséges.');
 if(!ctx||ctx.profile!==profile)
  throw Error('I-08: az Alvás és a kutatási profil nem egyezik.');
 if(!Array.isArray(input.extra)||!Array.isArray(input.sources))
  throw Error('I-08: a kutatási adatok formátuma hibás.');
 var now=opts&&Number.isFinite(opts.now)?opts.now:Date.now();
 var observations=ctx.sleep&&ctx.sleep.recent;
 if(observations!=null&&!Array.isArray(observations))
  throw Error('I-08: hibás alvásadatformátum.');
 if(!digital)return {payload:input,profile:profile,linkedNights:0,digitalAvailable:false,
  reason:'Nincs ellenőrzött, hozzáférhető Digitális Wellness adat ehhez a profilhoz.'};
 if(digital.profileKey!==profile)throw Error('I-08: Digital Wellbeing profilütközés.');
 if(digital.schema!==DIGITAL||digital.source!==SOURCE||digital.missingIsUnknown!==true||
  !Number.isSafeInteger(digital.collectedAtMs)||digital.collectedAtMs>now+300000||
  digital.collectedAtMs<now-31*DAY||!Array.isArray(digital.hours)||digital.hours.length>744)
  throw Error('I-08: nem ellenőrzött Digital Wellbeing forrás.');
 // Recheck the fields on the already-v507-validated in-memory snapshot.
 // For empty hourly coverage there is no digital observation to compare.
 var seen=Object.create(null);
 digital.hours.forEach(function(h){
  if(!h||!Number.isSafeInteger(h.hourStartMs)||h.hourStartMs%HOUR!==0||
   h.hourStartMs>=digital.collectedAtMs||h.hourStartMs<digital.collectedAtMs-31*DAY||
   !Number.isSafeInteger(h.observedForegroundMs)||h.observedForegroundMs<1||h.observedForegroundMs>HOUR||
   !Number.isSafeInteger(h.chatGptForegroundMs)||h.chatGptForegroundMs<0||
   h.chatGptForegroundMs>h.observedForegroundMs||
   !Number.isInteger(h.sessionFragments)||h.sessionFragments<1||
   h.sessionFragments>100000||seen[h.hourStartMs])
    throw Error('I-08: nem hitelesített vagy ismétlődő mérési órasáv.');
  seen[h.hourStartMs]=true;
 });
 if(!digital.hours.length)return {payload:input,profile:profile,linkedNights:0,
  digitalAvailable:false,reason:'Nincsenek megfigyelt órasávok.'};
 var api=root.HH_DW_VAULT_V507;
 if(!api||typeof api.summary!=='function')throw Error('I-08: a hitelesített Digitális Wellness összesítő nem érhető el.');
 var latest=digital.hours.reduce(function(n,h){return h&&Number.isSafeInteger(h.hourStartMs)?Math.max(n,h.hourStartMs+HOUR):n},0);
 var recent=latest?new Date(Math.min(latest,digital.collectedAtMs)).toISOString():'';
 var sums=[7,30].map(function(n){return api.summary(digital,n,now)});
 var facts=[{domain:'device',label:'I-08 · adatforrás és értelmezés',
  value:'Android Usage Access: megfigyelt alkalmazás-előtéridő; nem azonos a telefon gyári képernyőidejével. A hiányzó órák ismeretlenek, nem nullák. Forrásprofil: '+profile+'.'}];
 sums.forEach(function(s){
  if(!s||!s.covered)return;
  facts.push({domain:'device',label:'I-08 · Digitális Wellness · '+s.days+' nap',
   value:min(s.observed)+' perc megfigyelt előtéridő; ebből '+min(s.evening)+
    ' perc a 20–24 óra közötti rögzített idősávokban; '+s.covered+
    ' órasáv tartalmaz mérési adatot. Ez nem teljes napi lefedettség.',
   at:recent});
 });
 var nights=pairNights(Array.isArray(observations)?observations.slice(0,80):[],digital,now);
 if(nights.length){
  facts.push({domain:'trends',label:'I-08 · esti telefonhasználat és rögzített alvás',
   value:nights.length+' olyan éjszaka, amelyhez az alvás kezdete ELŐTT lezárt, 20–24 órai megfigyelt alkalmazásidő-sáv tartozik. Nem bizonyít okozati összefüggést vagy teljes esti lefedettséget.'});
  nights.slice(0,2).forEach(function(n){
   facts.push({domain:'trends',label:'I-08 · megfigyeléspár · '+n.night,
    value:n.eveningObservedMinutes+' perc megfigyelt alkalmazás-előtéridő '+n.observedEveningHours+
     ' lezárt esti órasávból; ezt követte egy '+n.sleepMinutes+
     ' perces RÖGZÍTETT alvásszakasz. Ez nem az egész éjszaka időtartama.'});
  });
 }
 // Fresh upload timestamps do not prove fresh measurements.
 var observedLast=latest?Math.min(latest,digital.collectedAtMs):0;
 var lag=observedLast?now-observedLast:Infinity;
 if(lag>48*HOUR){
  facts.push({domain:'device',label:'I-08 · Digital Wellbeing frissesség',
   value:'A legutolsó megfigyelt alkalmazásidő több mint 48 órával korábbi. A felhőbe küldés dátuma nem igazol frissebb képernyőhasználati mérést.',
   at:observedLast?new Date(observedLast).toISOString():''});
 }
 var out=Object.assign({},input,{extra:input.extra.concat(facts)});
 // Never overflow the research payload; drop low-priority new facts first.
 while(JSON.stringify({sources:out.sources,extra:out.extra}).length>16500&&facts.length){
  var toRemove=facts.pop();var idx=out.extra.lastIndexOf(toRemove);
  if(idx>=0)out.extra.splice(idx,1);
 }
 return {payload:out,profile:profile,linkedNights:nights.length,
  digitalAvailable:true,digitalFresh:lag<=48*HOUR,
  factsAdded:facts.length,readOnly:true};
}
root.HH_SLEEP_DIGITAL_INTELLIGENCE_V590=Object.freeze({enrich:enrich,version:'590'});
if(typeof module!=='undefined'&&module.exports)module.exports=root.HH_SLEEP_DIGITAL_INTELLIGENCE_V590;
})(typeof window==='undefined'?{}:window);
