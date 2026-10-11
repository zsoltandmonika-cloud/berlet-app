(function(){
'use strict';
/* HealthHub Intelligence v389, I-02: in-memory evidence ledger.
 * The ledger describes the data we ALREADY have; it never fetches, changes,
 * transmits or persists personal records. Measurement time != export time.
 * Observations from distinct sources are kept separate even when they conflict.
 */
var SCHEMA='healthhub.intelligence.ledger/1';
var LIMIT=170,MAX_FUTURE=5*60000;
var BOUNDS={
 steps:[0,150000],distance_m:[0,250000],active_minutes:[0,1440],
 active_kcal:[0,25000],weight_kg:[20,350],systolic_mmhg:[45,300],
 diastolic_mmhg:[25,200],pulse_bpm:[20,260],oxygen_percent:[30,100],
 glucose_mmol_l:[1,50],sleep_minutes:[1,1440]
};
function okProfile(p){return p==='zsolt'||p==='monika'}
function num(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);return Number.isFinite(n)?n:null}
function isoTime(v){if(typeof v!=='string'||!/\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v))return null;var t=Date.parse(v);return Number.isFinite(t)?t:null}
function isDay(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 var t=Date.parse(s+'T12:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s;
}
function localDay(t){var d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function text(v,max){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,max||120)}
function originName(v){
 var x=text(v,45).toLowerCase();
 if(/omron/.test(x))return 'omron';
 if(/beurer/.test(x))return 'beurer';
 if(/manual|kézi|kezi/.test(x))return 'manual';
 if(/samsung/.test(x))return 'samsung-health';
 if(/health.?connect/.test(x))return 'health-connect';
 return 'healthradar-record';
}
function within(v,type){var b=BOUNDS[type],n=num(v);return b&&n!=null&&n>=b[0]&&n<=b[1]?n:null}
function build(context,profile,options){
 if(!okProfile(profile))throw Error('Intelligence Ledger: ismeretlen profil.');
 if(context&&context.profile&&context.profile!==profile)
  throw Error('Intelligence Ledger: profilütközés.');
 var now=options&&Number.isFinite(options.now)?options.now:Date.now();
 var hc=context&&context.healthConnect||{};
 var hcExport=typeof hc.exportedAt==='string'&&isoTime(hc.exportedAt)!=null?hc.exportedAt:null;
 var created=context&&context.generatedAt||null;
 var items=[],warnings=[],comparisons=[],duplicates=0,byId=new Map();
 function warn(code,info){if(warnings.length<14)warnings.push({code:code,detail:text(info,180)})}
 function add(type,value,unit,at,source,classification,exportedAt,detail){
  if(items.length>=LIMIT)return;
  var n=within(value,type);if(n==null)return;
  var precision=isDay(at)?'day':isoTime(at)!=null?'instant':null;
  if(!precision){warn('missing_measurement_time',type+' · '+source);return}
  if(precision==='day'&&at>localDay(now)){warn('future_date',type);return}
  if(precision==='instant'&&isoTime(at)>now+MAX_FUTURE){warn('future_measurement',type);return}
  var id=[profile,type,source,at,unit].join('|'),previous=byId.get(id);
  if(previous){
   if(previous.value===n){duplicates++;return}
   warn('same_source_conflict',type+' · ugyanaz a forrás és időpont eltérő értékkel');
   id+='|alternative-'+String(items.length+1);
  }
  var row={
   id:id,profile:profile,type:type,value:n,unit:unit,
   observedAt:at,observedPrecision:precision,
   exportedAt:isoTime(exportedAt)!=null?exportedAt:null,
   sourceSystem:source,classification:classification,
   dataPath:detail||null
  };
  items.push(row);byId.set(id,row);
 }
 if(!context){
  warn('missing_context','Nem áll rendelkezésre profillal ellenőrzött Health Context.');
 }else{
  var a=context.activity&&context.activity.recent||[];
  if(!Array.isArray(a))a=[];
  a.slice(0,35).forEach(function(d){
   if(!d||!isDay(d.date))return;
   // v289 activity.recent is a local and HC cache merge. Do not mislabel
   // its individual observations as proven Samsung Health measurements.
   var source='healthhub-activity-cache';
   if(num(d.steps)>0)add('steps',d.steps,'lépés',d.date,source,'reported',hcExport,'activity.recent');
   if(num(d.distanceKm)>0)add('distance_m',Number(d.distanceKm)*1000,'m',d.date,source,'reported',hcExport,'activity.recent');
   if(num(d.activeMinutes)>0)add('active_minutes',d.activeMinutes,'perc',d.date,source,'reported',hcExport,'activity.recent');
   if(num(d.activeCaloriesKcal)>0)add('active_kcal',d.activeCaloriesKcal,'kcal',d.date,source,'reported',hcExport,'activity.recent');
   // v289 normalizes missing/unknown values to zero. Zero is not proof of
   // an actual zero measurement; keep it unknown and don't label measured.
  });
  var m=context.metrics||{},wt=m.weight&&m.weight.latest,bp=m.bloodPressure&&m.bloodPressure.latest;
  var pulse=m.pulse&&m.pulse.latest,gl=m.glucose&&m.glucose.latest,ox=m.oxygen&&m.oxygen.latest;
  if(wt)add('weight_kg',wt.weightKg,'kg',wt.measuredAt,originName(wt.source),'measured',null,'weight.latest');
  if(bp){
   var bpSource=originName(bp.source);
   add('systolic_mmhg',bp.systolic,'Hgmm',bp.measuredAt,bpSource,'measured',null,'bloodPressure.latest');
   add('diastolic_mmhg',bp.diastolic,'Hgmm',bp.measuredAt,bpSource,'measured',null,'bloodPressure.latest');
  }
  if(pulse)add('pulse_bpm',pulse.value,'/perc',pulse.measuredAt,'healthradar-record','measured',null,'pulse.latest');
  if(gl)add('glucose_mmol_l',gl.bloodGlucose,'mmol/L',gl.measuredAt,originName(gl.source),'measured',null,'glucose.latest');
  if(ox)add('oxygen_percent',ox.oxygenSaturation,'%',ox.measuredAt,originName(ox.source),'measured',null,'oxygen.latest');
  var hr=context.heartRate&&context.heartRate.latest;
  if(hr)add('pulse_bpm',hr.bpm,'/perc',hr.time,'health-connect-heart-rate','measured',hcExport,'heartRate.latest');
  var sleep=context.sleep&&context.sleep.recent||[];
  if(Array.isArray(sleep))sleep.slice(0,14).forEach(function(x){
   if(!x)return;
   // Each row is an interval, NOT necessarily a whole night's sleep.
   if(isoTime(x.startTime)==null||isoTime(x.endTime)==null||
    isoTime(x.endTime)<=isoTime(x.startTime))return;
   add('sleep_minutes',x.durationMin,'perc',x.endTime,'health-connect-sleep-session','derived',hcExport,
    'sleep.recent · alvásszakasz');
  });
 }
 var sdk=options&&options.samsung;
 if(sdk&&sdk.status==='ready'&&sdk.data&&sdk.data.profile===profile&&
    sdk.data.days&&typeof sdk.data.days.forEach==='function'){
  var sdkStamp=sdk.data.exportedAt;
  if(isoTime(sdkStamp)!=null&&isoTime(sdkStamp)<=now+MAX_FUTURE){
   var sdkDays=0;
   sdk.data.days.forEach(function(row,date){
    if(sdkDays++>=31||!isDay(date))return;
    var src='samsung-health-data-sdk';
    if(row.activeCaloriesKcal!=null)add('active_kcal',row.activeCaloriesKcal,'kcal',date,src,'measured',sdkStamp,'samsung.dailySummary');
    if(row.activeMinutes!=null)add('active_minutes',row.activeMinutes,'perc',date,src,'reported',sdkStamp,'samsung.dailySummary');
    if(row.distanceMeters!=null)add('distance_m',row.distanceMeters,'m',date,src,'measured',sdkStamp,'samsung.dailySummary');
   });
  }else warn('invalid_samsung_export','A Samsung SDK export időbélyege hiányzik vagy jövőbeli.');
 }else if(sdk&&sdk.status==='ready'&&sdk.data&&sdk.data.profile!==profile){
  warn('sdk_profile_mismatch','A másik profil Samsung-adatait nem használjuk fel.');
 }
 // Different source measurements remain distinct. A difference can be
 // informative but it is not proof that one sensor is faulty.
 var groups=new Map();
 items.forEach(function(x){
  if(x.observedPrecision!=='day'||!['active_kcal','active_minutes','distance_m','steps'].includes(x.type))return;
  var key=x.type+'|'+x.observedAt;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(x);
 });
 groups.forEach(function(group,key){
  var uniqueSources=new Set(group.map(function(v){return v.sourceSystem}));
  if(uniqueSources.size<2)return;
  var values=group.map(function(v){return v.value}),span=Math.max.apply(null,values)-Math.min.apply(null,values);
  var type=group[0].type,threshold={active_kcal:30,active_minutes:10,distance_m:150,steps:300}[type];
  if(span<threshold)return;
  var current=group.slice().sort(function(a,b){return (isoTime(b.exportedAt)||0)-(isoTime(a.exportedAt)||0)})[0];
  var comparison={type:type,day:group[0].observedAt,sourceCount:uniqueSources.size,
   difference:Math.round(span*10)/10,
   newestSnapshotSource:current.sourceSystem,
   newestSnapshotAt:current.exportedAt,
   note:'Külön források eltérő eredményei, nem bizonyított mérési hiba.'};
  comparisons.push(comparison);
 });
 comparisons.sort(function(a,b){return b.day.localeCompare(a.day)});
 var classificationCounts={measured:0,reported:0,derived:0,estimated:0};
 items.forEach(function(x){classificationCounts[x.classification]++});
 var sourceCount=new Set(items.map(function(x){return x.sourceSystem})).size;
 var result={schema:SCHEMA,profile:profile,checkedAt:new Date(now).toISOString(),
  contextGeneratedAt:created,healthConnectExportedAt:hcExport,
  observations:items,quality:{count:items.length,uniqueSources:sourceCount,
   duplicatesSkipped:duplicates,classification:classificationCounts,
   sourceDisagreements:comparisons.length},comparisons:comparisons.slice(0,8),warnings:warnings};
 if(!hcExport&&items.some(function(x){return x.sourceSystem==='healthhub-activity-cache'}))
  warn('activity_export_unverified','Az aktivitási rekordok szinkronidőpontja nem ellenőrizhető.');
 return result;
}
function brief(ledger,now){
 if(!ledger||ledger.schema!==SCHEMA)return [];
 var q=ledger.quality,flags=ledger.warnings||[],out=[];
 function put(label,value,at){
  out.push({domain:'device',label:text(label,90),value:text(value,240),at:text(at||'',35)});
 }
 put('Intelligence Ledger · I-02','Profilonként ellenőrzött, helyben összeállított '+q.count+
  ' adatbejegyzés, '+q.uniqueSources+' forrás, '+q.duplicatesSkipped+' azonos ismétlés kihagyva. Mért: '+q.classification.measured+
  ', forrásból közölt: '+q.classification.reported+', számított: '+q.classification.derived+'.');
 put('Mérések időpontja ≠ export ideje','Napi mozgásnál csak a nap ismert; a Health Connect export ideje a küldés időpontja, nem a mozgás ideje.',ledger.healthConnectExportedAt);
 if(!ledger.healthConnectExportedAt)
  put('Aktivitás eredete','A Health Connect export időpontja hiányzik. A mai aktivitás frissessége nem bizonyított.');
 (ledger.comparisons||[]).slice(0,2).forEach(function(c){
  put('Eltérő adatforrások · '+c.type,c.day+': '+c.difference+
   ' egység eltérés, '+c.sourceCount+' külön forrás; nem bizonyítja, hogy egyik mérés hibás.',c.newestSnapshotAt);
 });
 flags.slice(0,2).forEach(function(f){put('Adatminőségi figyelmeztetés · '+f.code,f.detail)});
 return out.slice(0,6);
}
window.HH_INTELLIGENCE_LEDGER_V389={build:build,brief:brief,version:'389'};
})();
