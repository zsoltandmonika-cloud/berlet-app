(function(){
'use strict';
/* HealthHub Intelligence I-03 · v390
 * Read-only temporal evidence with explicit completeness. NO missing=zero,
 * NO extrapolation of a partial day, NO diagnostic or causal inference.
 * Canonical input is the already checked, patient-scoped I-02 ledger.
 */
var SCHEMA='healthhub.intelligence.trends/1';
var ZONE='Europe/Budapest',DAY=86400000;
var TYPES=['steps','active_minutes','pulse_bpm','sleep_minutes'];
var LABEL={steps:'Lépések',active_minutes:'Aktív idő',pulse_bpm:'Mért pulzus',sleep_minutes:'Rögzített alvásszakaszok'};
var UNIT={steps:'lépés/nap',active_minutes:'perc/nap',pulse_bpm:'ütés/perc',sleep_minutes:'perc/éjszaka'};
function num(v){var n=Number(v);return v==null||v===''||!Number.isFinite(n)?null:n}
function dayPart(ms){
 var d=new Date(ms);
 if(!Number.isFinite(d.getTime()))return null;
 var p=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
 function v(k){return p.find(function(x){return x.type===k}).value}
 return v('year')+'-'+v('month')+'-'+v('day');
}
function hourPart(ms){
 var p=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
 return Number(p.find(function(x){return x.type==='hour'}).value);
}
function dayUTC(day){return Date.parse(day+'T00:00:00Z')}
function plusDay(day,delta){return new Date(dayUTC(day)+delta*DAY).toISOString().slice(0,10)}
function validDay(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(dayUTC(s))&&new Date(dayUTC(s)).toISOString().slice(0,10)===s}
function validInstant(s,now){
 var t=typeof s==='string'?Date.parse(s):NaN;
 return Number.isFinite(t)&&t<=now+5*60000?t:null;
}
function rounded(n){return Math.round(n*10)/10}
function windowDays(today,days,back){
 var out=[],y=plusDay(today,-1-back*days);
 for(var i=0;i<days;i++)out.push(plusDay(y,-i));
 return out;
}
function average(xs){return xs.length?rounded(xs.reduce(function(a,b){return a+b},0)/xs.length):null}
function collectDays(ledger,type,today,now){
 var rows=new Map(),obs=Array.isArray(ledger&&ledger.observations)?ledger.observations:[];
 obs.forEach(function(x){
  if(!x||x.profile!==ledger.profile||x.type!==type||x.observedPrecision!=='day'||!validDay(x.observedAt))return;
  if(x.observedAt>today||x.observedAt<plusDay(today,-180))return;
  // Only comparable values from the same provenance class. Samsung's
  // independently exported current-day snapshot stays in I-02 evidence,
  // not silently combined with HealthHub activity cache aggregates.
  if(x.sourceSystem!=='healthhub-activity-cache')return;
  var value=num(x.value);if(value==null||value<0)return;
  if(!rows.has(x.observedAt))rows.set(x.observedAt,value);
 });
 return rows;
}
function sleepNights(context,today,now){
 var sessions=context&&context.sleep&&context.sleep.recent;
 if(!Array.isArray(sessions))return {days:new Map(),sessions:0,fragmented:0,warning:'Nincs részletes, időbélyeges alvásadat.'};
 var nights=new Map(),seen=new Set(),sessionCount=0,omitted=0;
 sessions.slice(0,80).forEach(function(s){
  var a=validInstant(s&&s.startTime,now),b=validInstant(s&&s.endTime,now);
  if(a==null||b==null||a>=b||b-a>16*3600000){omitted++;return}
  var key=a+'|'+b;if(seen.has(key))return;seen.add(key);
  var hour=hourPart(a);
  // Daytime naps are a separate phenomenon. Night starts 18:00 and
  // continues to noon next day in Budapest local time.
  if(hour>=12&&hour<18){omitted++;return}
  var night=dayPart(a);if(hour>=18)night=plusDay(night,1);
  if(night>today||night<plusDay(today,-180))return;
  if(!nights.has(night))nights.set(night,[]);
  nights.get(night).push([a,b]);sessionCount++;
 });
 var days=new Map(),fragmented=0;
 nights.forEach(function(parts,night){
  parts.sort(function(a,b){return a[0]-b[0]});
  var intervals=[];
  parts.forEach(function(p){
   var x=intervals[intervals.length-1];
   if(x&&p[0]<=x[1])x[1]=Math.max(x[1],p[1]);
   else intervals.push(p.slice());
  });
  var minutes=Math.round(intervals.reduce(function(a,p){return a+(p[1]-p[0])/60000},0));
  if(intervals.length>1)fragmented++;
  if(minutes>0&&minutes<=960)days.set(night,{minutes:minutes,segments:intervals.length});
 });
 return {days:days,sessions:sessionCount,fragmented:fragmented,
  warning:omitted?omitted+' nappali vagy ellenőrizhetetlen alvásszakasz kihagyva.':null};
}
function pulseDays(ledger,today,now){
 var map=new Map(),obs=Array.isArray(ledger&&ledger.observations)?ledger.observations:[];
 obs.forEach(function(x){
  if(!x||x.profile!==ledger.profile||x.type!=='pulse_bpm'||x.observedPrecision!=='instant'||x.classification!=='measured')return;
  var ms=validInstant(x.observedAt,now);if(ms==null)return;
  var date=dayPart(ms);if(date>today||date<plusDay(today,-180))return;
  if(!map.has(date))map.set(date,[]);
  map.get(date).push(x.value);
 });
 var out=new Map();map.forEach(function(values,day){var n=average(values.map(num).filter(function(x){return x!=null&&x>=20&&x<=260}));if(n!=null)out.set(day,n)});
 return out;
}
function seriesWindow(points,today,length,back){
 var keys=windowDays(today,length,back);
 var values=keys.filter(function(d){return points.has(d)}).map(function(d){return points.get(d)});
 var coverage=values.length,threshold=Math.ceil(length*.7),enough=coverage>=threshold;
 return {days:length,range:{from:keys[keys.length-1],to:keys[0]},
  presentDays:coverage,missingDays:length-coverage,coveragePercent:Math.round(coverage*100/length),
  thresholdDays:threshold,adequate:enough,
  observedMean:average(values),comparableMean:enough?average(values):null};
}
function assess(map,today,length){
 var current=seriesWindow(map,today,length,0),prior=seriesWindow(map,today,length,1);
 var trend={available:false,percent:null,description:'Nincs elég összehasonlítható, lezárt nap mindkét időszakban.'};
 if(current.adequate&&prior.adequate){
  var a=current.comparableMean,b=prior.comparableMean;
  if(b>0){
   var change=rounded((a-b)/b*100);
   trend={available:true,percent:change,description:Math.abs(change)<5?'hasonló':
    change>0?'emelkedés':'csökkenés'};
  }else if(a===0){
   trend={available:true,percent:0,description:'mindkét időszakban nulla (csak hitelesített adatokból)'};
  }
 }
 return {current:current,previous:prior,trend:trend};
}
function calculate(ledger,context,opts){
 if(!ledger||ledger.schema!=='healthhub.intelligence.ledger/1'||!['zsolt','monika'].includes(ledger.profile))
  throw Error('Intelligence Trend: hiányzó vagy érvénytelen profilhoz kötött mérési napló.');
 if(context&&context.profile&&context.profile!==ledger.profile)
  throw Error('Intelligence Trend: profilütközés.');
 var now=opts&&Number.isFinite(opts.now)?opts.now:Date.now(),today=dayPart(now),issues=[],records={};
 var sleep=sleepNights(context,today,now);
 var datasets={
  steps:collectDays(ledger,'steps',today,now),
  active_minutes:collectDays(ledger,'active_minutes',today,now),
  pulse_bpm:pulseDays(ledger,today,now),
  sleep_minutes:new Map(Array.from(sleep.days,function(kv){return[kv[0],kv[1].minutes]}))
 };
 TYPES.forEach(function(type){
  var map=datasets[type];
  records[type]={type:type,label:LABEL[type],unit:UNIT[type],measuredDays:map.size,
   windows:{d7:assess(map,today,7),d30:assess(map,today,30),d90:assess(map,today,90)}};
 });
 var todaySteps=datasets.steps.has(today)?datasets.steps.get(today):null;
 if(todaySteps!=null)issues.push('A mai '+todaySteps+' lépés résznapos adat; nem szerepel a lezárt napok átlagában.');
 if(sleep.fragmented)issues.push(sleep.fragmented+' éjszakán több különálló alvásszakasz szerepel; a köztük lévő ébrenlétet nem számoljuk alvásnak.');
 if(sleep.warning)issues.push(sleep.warning);
 if(records.pulse_bpm.windows.d7.current.presentDays<5)
  issues.push('Pulzustrendhez nincs elég napon rögzített időbélyeges pulzusadat. Nem feltételezünk nyugalmi pulzust.');
 if(records.steps.windows.d90.current.presentDays<63)
  issues.push('A 90 napos aktivitástrendhez nincs elég adat: az aktuális helyi Health Context csak korlátozott előzményt tartalmaz.');
 var quality={sleepRecordedSessions:sleep.sessions,sleepFragmentedNights:sleep.fragmented,
  todayPartialSteps:todaySteps,
  noCausalClaims:true,noMissingEqualsZero:true};
 return {schema:SCHEMA,profile:ledger.profile,generatedAt:new Date(now).toISOString(),
  completedThrough:plusDay(today,-1),today:today,metrics:records,quality:quality,issues:issues.slice(0,8)};
}
function brief(result){
 if(!result||result.schema!==SCHEMA)return [];
 var out=[];
 function put(label,value){out.push({domain:'trends',label:label,value:value,at:result.completedThrough})}
 put('Intelligence trendablakok','Csak lezárt napok és forrással igazolt mérések; a mai résznap és a hiányzó napok nem nullák.');
 ['steps','active_minutes','sleep_minutes','pulse_bpm'].forEach(function(type){
  var m=result.metrics[type],w=m.windows.d7,c=w.current,t=w.trend;
  var stat=m.label+': '+c.presentDays+'/7 nap ('+c.coveragePercent+'% lefedettség). ';
  stat+=c.adequate?'A tényleges napok átlaga '+c.comparableMean+' '+m.unit+'. ':'A 7 napos átlag nem hitelesíthető. ';
  if(t.available)stat+='Az előző 7 naphoz képest '+t.description+' ('+t.percent+'%), önmagában nem ok-okozat.';
  else stat+='A korábbi héttel nem összevethető.';
  if(type==='sleep_minutes')stat+=' Az érték rögzített szakaszok összege, nem bizonyított teljes éjszakai alvás.';
  put('I-03 · '+m.label,stat.slice(0,230));
 });
 var d30=result.metrics.steps.windows.d30.current;
 put('I-03 · 30/90 nap','Lépésadat: 30 nap '+d30.presentDays+'/30, 90 nap '+result.metrics.steps.windows.d90.current.presentDays+'/90. Elégtelen fedettségnél nincs trendszámítás.');
 return out.slice(0,6);
}
window.HH_INTELLIGENCE_TRENDS_V390={calculate:calculate,brief:brief,version:'390'};
})();
