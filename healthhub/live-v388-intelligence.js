(function(){
'use strict';
/* HealthHub Intelligence v388 · Evidence and freshness gate, phase 1.
 * Purely client-side; runs only inside the existing explicitly consented
 * Ask Léna workflow. No network requests, persistence or data modifications.
 * Never treats generatedAt as the timestamp of a physical measurement. */
var SCHEMA='healthhub.ask-lena/1';
var MAX_FUTURE_MS=5*60*1000;
var ACTIVITY_MAX_AGE_H=6;  // Scheduled sync + self-healing tolerance.
var VITALS_MAX_AGE_H=24;
var SLEEP_MAX_AGE_H=36;
function dateMs(raw){
 if(typeof raw!=='string'||!raw)return null;
 var normalized=/^\d{4}-\d\d-\d\d$/.test(raw)?raw+'T12:00:00':raw;
 var t=Date.parse(normalized);
 return Number.isFinite(t)?t:null;
}
function safe(raw,max){return String(raw==null?'':raw).replace(/\s+/g,' ').trim().slice(0,max||120)}
function recent(timestamp,now,maxHours){
 var x=dateMs(timestamp);
 return x!=null && x<=now+MAX_FUTURE_MS && now-x<=maxHours*3600000;
}
function ageHours(timestamp,now){
 var t=dateMs(timestamp);
 return t==null?null:Math.max(0,Math.round((now-t)/360000)/10);
}
function labelTime(raw){
 var d=dateMs(raw);
 return d==null?'nincs megbízható időbélyeg':new Date(d).toLocaleString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function prepare(input,context,opts){
 if(!input||input.schema!==SCHEMA||!['zsolt','monika'].includes(input.profile)||input.consent!==true)
  throw Error('Intelligence: hiányzik az engedélyezett, profilhoz kötött kutatási kérés.');
 if(context&&context.profile&&context.profile!==input.profile)
  throw Error('Intelligence: profilütközés, a kutatás megszakadt.');
 if(!Array.isArray(input.sources)||!Array.isArray(input.extra))
  throw Error('Intelligence: hibás adatforrás-formátum.');
 var now=opts&&Number.isFinite(opts.now)?opts.now:Date.now();
 var snapshot=input.sources.map(function(s){return Object.assign({},s,{
  entries:Array.isArray(s.entries)?s.entries.map(function(e){return Object.assign({},e)}):[]
 })});
 var flags=[],facts=[],hc=context&&context.healthConnect||{};
 function flag(code,detail,sourceId){
  flags.push({code:code,sourceId:sourceId||null,message:detail});
 }
 function fact(label,value,time){
  facts.push({domain:'device',label:label,value:safe(value,240),at:safe(time||'',35)});
 }
 var hcTime=typeof hc.exportedAt==='string'?hc.exportedAt:'';
 var ctxTime=context&&typeof context.generatedAt==='string'?context.generatedAt:'';
 fact('Intelligence · forrásellenőrzés','A health-context generálásának ideje nem azonos a mérések időpontjával.');
 if(ctxTime)fact('Health Context összegzés időpontja',labelTime(ctxTime),ctxTime);
 if(hcTime)fact('Health Connect export tényleges időpontja',labelTime(hcTime),hcTime);
 var activity=snapshot.find(function(s){return s.id==='activity'});
 if(activity&&activity.entries&&activity.entries.length){
  if(!recent(hcTime,now,ACTIVITY_MAX_AGE_H)){
   activity.status='stale';
   flag('activity_not_fresh','Aktivitás: a Health Connect forrás nem igazoltan friss (utolsó export: '+labelTime(hcTime)+'). A mai állapotra ebből nem szabad biztos következtetést levonni.','activity');
  }
  if(recent(hcTime,now,ACTIVITY_MAX_AGE_H))
   fact('Aktivitás adatminősége','Health Connect export 6 órán belül; külön ellenőrizd a mérés eredeti időpontját.',hcTime);
  // Context activity rows come from Health Connect; they are not Samsung
  // Health SDK live readings and must not be attributed to Samsung.
  fact('Aktivitás méréstípusa','A context Health Connect mozgásadatait tartalmazza; a Calorie Engine kcal értékei számított becslések, nem mért kalóriák.');
 }
 var vitals=snapshot.find(function(s){return s.id==='vitals'});
 if(vitals&&vitals.entries&&vitals.entries.length){
  var withTime=vitals.entries.filter(function(e){return dateMs(e.observedAt)!=null});
  var last=withTime.map(function(e){return e.observedAt}).sort(function(a,b){return dateMs(b)-dateMs(a)})[0]||'';
  if(!recent(last,now,VITALS_MAX_AGE_H)){
   flag('vitals_not_recent','A legfrissebb, időbélyeggel ellátott mérés sem igazoltan 24 órán belüli ('+labelTime(last)+'). A jelenlegi pulzusra vagy vérnyomásra ebből nem következtethetsz.','vitals');
  }
 }
 var sleep=snapshot.find(function(s){return s.id==='sleep'});
 var sleepRecent=context&&context.sleep&&context.sleep.recent;
 if(sleep&&sleep.entries&&sleep.entries.length){
  var end=Array.isArray(sleepRecent)&&sleepRecent[0]&&sleepRecent[0].endTime||'';
  if(!recent(end,now,SLEEP_MAX_AGE_H))
   flag('sleep_not_recent','Alvás: nem igazoltan friss, teljes éjszakai adat ('+labelTime(end)+'). Az egyedi szakasz nem azonos a teljes éjszakával.','sleep');
 }
 snapshot.forEach(function(s){
  if(s.status==='stale'&&!flags.some(function(f){return f.sourceId===s.id}))
   flag('source_marked_stale',safe(s.title||s.id,65)+': az adatforrás régi; nem tekinthető aktuális megfigyelésnek.',s.id);
 });
 if(flags.length){
  // The server's existing safe sanitizer accepts "device" extra entries.
  // Front-load provenance, because the legacy payload limit trims extras last.
  flags.slice(0,6).forEach(function(f){
   fact('Adatminőség · '+f.code,f.message);
  });
 }
 var ledgerApi=window.HH_INTELLIGENCE_LEDGER_V389;
 if(!ledgerApi||typeof ledgerApi.build!=='function'||typeof ledgerApi.brief!=='function')
  throw Error('Intelligence: az egységes mérési napló nem érhető el. Az AI-kutatást biztonságosan leállítottam.');
 var sdkSource=window.hhActivity191CurrentProfile===input.profile?
  window.hhActivity191SamsungSource:null;
 var ledger=ledgerApi.build(context,input.profile,{now:now,samsung:sdkSource});
 var ledgerBrief=ledgerApi.brief(ledger,now);
 var trendApi=window.HH_INTELLIGENCE_TRENDS_V390;
 if(!trendApi||typeof trendApi.calculate!=='function'||typeof trendApi.brief!=='function')
  throw Error('Intelligence: az idősoros adatellenőrzés nem érhető el. A kutatás nem indul el ellenőrizetlen adatokkal.');
 var trends=trendApi.calculate(ledger,context,{now:now});
 if(trends.profile!==input.profile)throw Error('Intelligence: trendprofil-eltérés, kérés leállítva.');
 var trendBrief=trendApi.brief(trends);
 // Only a tiny, explicitly source-labeled summary goes in the existing
 // consented AI request. Neither ledger nor time series leave the browser.
 var out=Object.assign({},input,{sources:snapshot,extra:facts.concat(ledgerBrief,trendBrief,input.extra)});
 while(JSON.stringify({sources:out.sources,extra:out.extra}).length>16500&&out.extra.length>facts.length)out.extra.pop();
 if(JSON.stringify({sources:out.sources,extra:out.extra}).length>18000)
  throw Error('Intelligence: túl sok adat a biztonságos forrásellenőrzéshez.');
 return {payload:out,flags:flags,profile:input.profile,checkedAt:new Date(now).toISOString(),
  ledgerQuality:ledger.quality,ledgerWarnings:ledger.warnings.length,sourceDisagreements:ledger.comparisons.length,
  trendsQuality:{completedThrough:trends.completedThrough,issues:trends.issues.length,
   stepCoverage7:trends.metrics.steps.windows.d7.current.coveragePercent,
   sleepCoverage7:trends.metrics.sleep_minutes.windows.d7.current.coveragePercent,
   pulseCoverage7:trends.metrics.pulse_bpm.windows.d7.current.coveragePercent},
  sourceStatus:snapshot.map(function(s){return {id:s.id,status:s.status}})};
}
window.HH_INTELLIGENCE_GATE_V388={prepare:prepare,version:'388',ageHours:ageHours};
})();


/* HealthHub Virtual Genius v1: passive, metadata-only answer quality telemetry.
 * No patient names, questions, answers, medical documents, or source excerpts stored.
 * No network calls, clinical judgement, auto-prompts, or record modification.
 * Assessment runs after answer completion, off the foreground rendering path.
 */
(function(){
 'use strict';
 if(window.HH_VIRTUAL_GENIUS_V1)return;
 var samples=[],MAX=100,startedAt=0;
 function count(rx,text){var m=String(text||'').match(rx);return m?m.length:0}
 function inspect(detail){
  detail=detail||{};
  var a=typeof detail.answer==='string'?detail.answer:'';
  var q=typeof detail.question==='string'?detail.question:'';
  if(!a.trim())return;
  // Observable writing signals, NOT validated clinical quality scores.
  var paragraphs=a.split(/\n\s*\n/).filter(function(x){return x.trim().length>0});
  var words=a.trim().split(/\s+/).length;
  var listLines=count(/^\s*(?:[-*•]|\d+[.)])\s/gm,a);
  var citations=count(/\b(?:forrás|lelet|dokumentum|zárójelentés|vizsgálat)\b/gi,a);
  var jargonExplanations=count(/\b(?:vagyis|azaz|ez azt jelenti|más szóval)\b/gi,a);
  var features={
   words:words,paragraphs:paragraphs.length,listLines:listLines,
   sourceMentions:citations,terminologyExplanations:jargonExplanations,
   hasConcludingSection:/\b(?:összefoglalva|összességében|a lényeg|röviden)\b/i.test(a),
   durationMs:startedAt?Math.max(0,Date.now()-startedAt):null
  };
  var flags=[];
  if(words<130&&q.length>60)flags.push('possibly_shallow_answer');
  if(listLines>8&&listLines>paragraphs.length*2)flags.push('fragmented_narrative');
  if(jargonExplanations===0&&words>250)flags.push('terminology_explanation_review');
  if(citations===0&&words>250)flags.push('source_reference_review');
  // Scores require verified clinical review, do not manufacture them.
  samples.push({time:new Date().toISOString(),version:'v1-pilot',
   signals:features,flags:flags,clinicalScore:null,reviewed:false});
  if(samples.length>MAX)samples.shift();
 }
 function schedule(d){
  // Do not retain the medical answer in any background queue when scheduling.
  // Event detail lives only in the existing caller's transient event object.
  var run=function(){try{inspect(d)}catch(_){}};
  if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:3500});
  else setTimeout(run,0);
 }
 window.addEventListener('healthhub:ask-lena-start',function(){startedAt=Date.now()});
 window.addEventListener('healthhub:ask-lena-complete',function(e){
  if(e&&e.detail&&e.detail.successful===true)schedule(e.detail);
 });
 window.HH_VIRTUAL_GENIUS_V1=Object.freeze({
  version:'1.0-pilot',
  report:function(){
   var flags={},total=0;
   samples.forEach(function(s){total+=s.signals.words;s.flags.forEach(function(k){flags[k]=(flags[k]||0)+1})});
   return {schema:'healthhub.virtual-genius/1',sampleCount:samples.length,
    averageWords:samples.length?Math.round(total/samples.length):null,
    anomalies:flags,clinicalQuality:'not_assessed',storage:'memory_only',
    latest:samples.length?{time:samples[samples.length-1].time,
     signals:Object.assign({},samples[samples.length-1].signals),
     flags:samples[samples.length-1].flags.slice()}:null};
  },
  clear:function(){samples=[]},
  getSignals:function(){return samples.map(function(s){
    return {time:s.time,version:s.version,signals:Object.assign({},s.signals),
     flags:s.flags.slice(),clinicalScore:s.clinicalScore};
  })}
 });
})();
