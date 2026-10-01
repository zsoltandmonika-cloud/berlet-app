(function(){
'use strict';

/* HealthRadar parity: measurement filters, trend chart and period summary. */
var DB='healthhub-healthradar-v2', BRIDGE_DB='healthhub-connect-v1';
var state=window.hhMeasurementState||{metric:'pulse',period:'90d'};
window.hhMeasurementState=state;
if(!['7d','30d','90d'].includes(state.period))state.period='90d';

var METRICS=[
  {key:'bloodPressure',label:'Vérnyomás',short:'Vérnyomás',unit:'Hgmm'},
  {key:'pulse',label:'Pulzus',short:'Pulzus',unit:'/perc'},
  {key:'weightKg',label:'Testsúly',short:'Testsúly',unit:'kg'},
  {key:'bloodGlucose',label:'Vércukor',short:'Vércukor',unit:'mmol/l'},
  {key:'oxygenSaturation',label:'Véroxigén',short:'SpO₂',unit:'%'},
  {key:'steps',label:'Lépések',short:'Lépések',unit:'lépés'}
];
var PERIODS=[
  {key:'7d',label:'Heti'},{key:'30d',label:'Havi'},{key:'90d',label:'3 hónap'}
];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridgeDb(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE_DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function byProfile(store,p){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).index('profile').getAll(p))}finally{db.close()}}
async function stepsByProfile(p){try{var db=await openBridgeDb();try{var all=await reqP(db.transaction('activity','readonly').objectStore('activity').getAll())||[];return all.filter(function(x){return x.profile===p&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))})}finally{db.close()}}catch(e){return[]}}
function n(x){return x==null||x===''?null:Number(x)}
function has(m,x){if(m==='bloodPressure')return n(x.systolic)!=null&&n(x.diastolic)!=null;if(m==='steps')return n(x.steps)!=null;return n(x[m])!=null}
function metric(){return METRICS.find(function(x){return x.key===state.metric})||METRICS[1]}
function periodStart(){
  if(state.period==='all')return null;
  var d=new Date();
  if(state.period==='6m')d.setMonth(d.getMonth()-6);
  else if(state.period==='1y')d.setFullYear(d.getFullYear()-1);
  else d.setDate(d.getDate()-parseInt(state.period,10));
  return d.getTime();
}
function fmtNum(v){return new Intl.NumberFormat('hu-HU',{maximumFractionDigits:1}).format(v)}
function fmtDate(s){var d=new Date(s);return isNaN(d.getTime())?String(s||''):new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(d)}
function fmtDateTime(s){var d=new Date(s);return isNaN(d.getTime())?String(s||''):new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function downsample(a,max){
  if(a.length<=max)return a;
  var out=[],step=(a.length-1)/(max-1);
  for(var i=0;i<max;i++)out.push(a[Math.round(i*step)]);
  return out;
}
function valueText(m,x){
  if(!x)return '—';
  if(m==='bloodPressure')return fmtNum(n(x.systolic))+'/'+fmtNum(n(x.diastolic))+' Hgmm';
  if(m==='steps')return Math.round(n(x.steps)||0).toLocaleString('hu-HU')+' lépés';
  var mm=METRICS.find(function(z){return z.key===m});
  return fmtNum(n(x[m]))+' '+mm.unit;
}
function metricIcon(k){
  if(k==='bloodPressure')return '🫀';
  if(k==='pulse')return '❤️';
  if(k==='weightKg')return '⚖️';
  if(k==='bloodGlucose')return '🩸';
  if(k==='oxygenSaturation')return '🫁';
  if(k==='steps')return '🚶';
  return '•';
}

function ensureStyle(){
 if(document.getElementById('hh-v136-style'))return;
 var s=document.createElement('style');s.id='hh-v136-style';
 s.textContent=
 '.hhMeasToolbar{display:flex;flex-wrap:wrap;gap:6px;justify-content:space-between;align-items:flex-start;margin-bottom:10px}'+
 '.hhMeasChips{display:flex;flex-wrap:wrap;gap:5px}.hhMeasChip{border:1px solid #dbe5ed;background:#fff;color:#425f77;border-radius:13px;padding:6px 9px;font-size:8px;font-weight:750;cursor:pointer}.hhMeasChip.on{background:#eaf8f4;border-color:#9fded2;color:#26766e}'+
 '.hhLatestMetrics{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-bottom:10px}@media(min-width:760px){.hhLatestMetrics{grid-template-columns:repeat(6,1fr)}}'+
 '.hhMetricCard{border:1px solid #edf1f4;background:#fff;border-radius:14px;padding:10px;box-shadow:0 5px 14px rgba(38,74,101,.05)}.hhMetricCard .mi{width:27px;height:27px;border-radius:9px;background:#f3f6fb;display:grid;place-items:center;font-size:14px;margin-bottom:6px}.hhMetricCard small{display:block;font-size:7.2px;color:#72879a}.hhMetricCard b{display:block;font-size:11px;color:#183c5d;margin-top:3px}.hhMetricCard em{display:block;font-style:normal;font-size:6.9px;color:#8a9aaa;margin-top:3px}'+
 '.hhTrendGrid{display:grid;grid-template-columns:1fr;gap:9px}@media(min-width:760px){.hhTrendGrid{grid-template-columns:minmax(0,1fr) 170px}}'+
 '.hhChartBox{border:1px solid #edf1f4;background:#fff;border-radius:15px;padding:10px;min-width:0}.hhChartBox svg{width:100%;height:220px;display:block}.hhChartTitle{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:5px}.hhChartTitle h3{margin:2px 0 0}'+
 '.hhSummary{border:1px solid #edf1f4;background:#f8fafc;border-radius:15px;padding:11px}.hhSummary h4{margin:0 0 8px;font-size:8px;letter-spacing:.09em;text-transform:uppercase;color:#7562ad}.hhSumRow{border-top:1px solid #e6ebf0;padding:8px 0}.hhSumRow:first-of-type{border-top:0}.hhSumRow small{display:block;font-size:6.7px;text-transform:uppercase;color:#95a3b0;font-weight:800}.hhSumRow b{display:block;font-size:9px;margin-top:2px;color:#1f3b55}'+
 '.hhMeasList{margin-top:10px}';
 document.head.appendChild(s);
}

function rowTime(x){return x&&x.measuredAt?x.measuredAt:(x&&x.date?x.date+'T12:00:00':'')}
function latestCard(label,key,latest,unit){
 return '<div class="hhMetricCard"><span class="mi">'+metricIcon(key)+'</span><small>'+esc(label)+'</small><b>'+esc(latest?valueText(key,latest):'—')+'</b><em>'+esc(latest?(key==='steps'?fmtDate(rowTime(latest)):fmtDateTime(rowTime(latest))):'Még nincs adat')+'</em></div>';
}
function linePath(points,w,h,pad,min,max,key){
 if(!points.length)return '';
 var span=max-min||1;
 return points.map(function(x,i){
   var xx=pad+(w-pad*2)*(points.length===1?.5:i/(points.length-1));
   var v=key==='systolic'||key==='diastolic'?n(x[key]):n(x[state.metric]);
   var yy=pad+(h-pad*2)*(1-(v-min)/span);
   return (i?'L':'M')+xx.toFixed(1)+' '+yy.toFixed(1);
 }).join(' ');
}
function chartSvg(rows){
 var m=metric(),w=620,h=220,pad=28,vals=[];
 rows.forEach(function(x){
   if(state.metric==='bloodPressure'){vals.push(n(x.systolic),n(x.diastolic))}
   else vals.push(n(x[state.metric]));
 });
 vals=vals.filter(function(x){return x!=null});
 if(!vals.length)return '<div class="hrEmpty">Nincs adat ebben az időszakban.</div>';
 var min=Math.min.apply(null,vals),max=Math.max.apply(null,vals),gap=(max-min)*.12||1;min-=gap;max+=gap;
 var pts=downsample(rows,100);
 var grid='';
 for(var i=0;i<5;i++){var y=pad+(h-pad*2)*(i/4),v=max-(max-min)*(i/4);grid+='<line x1="'+pad+'" y1="'+y+'" x2="'+(w-pad)+'" y2="'+y+'" stroke="#edf1f4" stroke-width="1"/><text x="2" y="'+(y+3)+'" font-size="8" fill="#8a9aaa">'+esc(fmtNum(v))+'</text>'}
 var paths='';
 if(state.metric==='bloodPressure'){
   paths='<path d="'+linePath(pts,w,h,pad,min,max,'systolic')+'" fill="none" stroke="#e7897f" stroke-width="2.2"/>'+
         '<path d="'+linePath(pts,w,h,pad,min,max,'diastolic')+'" fill="none" stroke="#77c9b9" stroke-width="2.2"/>';
 }else{
   paths='<path d="'+linePath(pts,w,h,pad,min,max,state.metric)+'" fill="none" stroke="#b0739d" stroke-width="2.4"/>';
 }
 var first=fmtDate(rowTime(rows[0])),last=fmtDate(rowTime(rows[rows.length-1]));
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-label="'+esc(m.label)+' trend">'+grid+paths+
 '<text x="'+pad+'" y="'+(h-5)+'" font-size="8" fill="#8a9aaa">'+esc(first)+'</text>'+
 '<text x="'+(w-pad)+'" y="'+(h-5)+'" text-anchor="end" font-size="8" fill="#8a9aaa">'+esc(last)+'</text></svg>';
}
function summaryHtml(rows){
 var m=metric();
 if(!rows.length)return '<div class="hhSummary"><h4>Időszak összegzése</h4><div class="hrEmpty">Nincs adat.</div></div>';
 if(state.metric==='bloodPressure'){
   var s=rows.map(function(x){return n(x.systolic)}),d=rows.map(function(x){return n(x.diastolic)});
   var latest=rows[rows.length-1],first=rows[0];
   return '<div class="hhSummary"><h4>Időszak összegzése</h4>'+
    sum('Legutóbbi',valueText('bloodPressure',latest))+
    sum('Átlag',fmtNum(avg(s))+'/'+fmtNum(avg(d))+' Hgmm')+
    sum('Minimum / maximum',fmtNum(Math.min.apply(null,s))+'–'+fmtNum(Math.max.apply(null,s))+' / '+fmtNum(Math.min.apply(null,d))+'–'+fmtNum(Math.max.apply(null,d)))+
    sum('Változás',(n(latest.systolic)-n(first.systolic)>0?'+':'')+fmtNum(n(latest.systolic)-n(first.systolic))+' / '+(n(latest.diastolic)-n(first.diastolic)>0?'+':'')+fmtNum(n(latest.diastolic)-n(first.diastolic))+' Hgmm')+
    sum('Mérések',rows.length+' db')+'</div>';
 }
 var vals=rows.map(function(x){return n(x[state.metric])}),latest=vals[vals.length-1],first=vals[0],unit=m.unit;
 return '<div class="hhSummary"><h4>Időszak összegzése</h4>'+
  sum('Legutóbbi',state.metric==='steps'?Math.round(latest).toLocaleString('hu-HU')+' '+unit:fmtNum(latest)+' '+unit)+
  sum('Átlag',state.metric==='steps'?Math.round(avg(vals)).toLocaleString('hu-HU')+' '+unit:fmtNum(avg(vals))+' '+unit)+
  sum('Minimum / maximum',state.metric==='steps'?Math.round(Math.min.apply(null,vals)).toLocaleString('hu-HU')+' / '+Math.round(Math.max.apply(null,vals)).toLocaleString('hu-HU')+' '+unit:fmtNum(Math.min.apply(null,vals))+' / '+fmtNum(Math.max.apply(null,vals))+' '+unit)+
  sum('Változás',state.metric==='steps'?((latest-first>0?'+':'')+Math.round(latest-first).toLocaleString('hu-HU')+' '+unit):((latest-first>0?'+':'')+fmtNum(latest-first)+' '+unit))+
  sum(state.metric==='steps'?'Napok':'Mérések',rows.length+' db')+'</div>';
}
function sum(label,val){return '<div class="hhSumRow"><small>'+esc(label)+'</small><b>'+esc(val)+'</b></div>'}

window.hhSetMeasurementMetric=function(k){state.metric=k;window.renderHealthSection&&window.renderHealthSection()}
window.hhSetMeasurementPeriod=function(k){state.period=k;window.renderHealthSection&&window.renderHealthSection()}

async function render(){
 if(window.healthSectionKind!=='measurements')return;
 ensureStyle();
 var root=document.getElementById('healthSubContent');if(!root)return;
 var all=await byProfile('measurements',pkey()),stepRows=await stepsByProfile(pkey());
 all.sort(function(a,b){return new Date(a.measuredAt)-new Date(b.measuredAt)});
 stepRows.sort(function(a,b){return String(a.date).localeCompare(String(b.date))});
 var latest={
   bloodPressure:[...all].reverse().find(function(x){return has('bloodPressure',x)}),
   pulse:[...all].reverse().find(function(x){return has('pulse',x)}),
   weightKg:[...all].reverse().find(function(x){return has('weightKg',x)}),
   bloodGlucose:[...all].reverse().find(function(x){return has('bloodGlucose',x)}),
   oxygenSaturation:[...all].reverse().find(function(x){return has('oxygenSaturation',x)}),
   steps:[...stepRows].reverse().find(function(x){return has('steps',x)})
 };
 var start=periodStart();
 var sourceRows=state.metric==='steps'?stepRows:all;
 var rows=sourceRows.filter(function(x){return has(state.metric,x)&&(start==null||new Date(rowTime(x)).getTime()>=start)});
 var recent=state.metric==='steps'?[]:[...rows].reverse().slice(0,12);
 var m=metric();

 root.innerHTML='<div class="hrSectionCard"><div style="font-size:7px;font-weight:900;letter-spacing:.13em;color:#317f77;text-transform:uppercase">TRENDNÉZET</div><h3 style="margin:4px 0 3px">Egészségügyi trendek</h3><small style="color:#70869a">Heti, havi és 3 havi változások egy helyen.</small>'+
 '<div class="hhLatestMetrics" style="margin-top:10px">'+
  latestCard('Vérnyomás','bloodPressure',latest.bloodPressure,'Hgmm')+
  latestCard('Pulzus','pulse',latest.pulse,'/perc')+
  latestCard('Testsúly','weightKg',latest.weightKg,'kg')+
  latestCard('Vércukor','bloodGlucose',latest.bloodGlucose,'mmol/l')+
  latestCard('Véroxigén','oxygenSaturation',latest.oxygenSaturation,'%')+
  latestCard('Lépések','steps',latest.steps,'lépés')+
 '</div>'+
 '<div class="hhMeasToolbar"><div class="hhMeasChips">'+METRICS.map(function(x){return '<button class="hhMeasChip '+(state.metric===x.key?'on':'')+'" onclick="hhSetMeasurementMetric(\''+x.key+'\')">'+esc(x.short)+'</button>'}).join('')+'</div>'+
 '<div class="hhMeasChips">'+PERIODS.map(function(x){return '<button class="hhMeasChip '+(state.period===x.key?'on':'')+'" onclick="hhSetMeasurementPeriod(\''+x.key+'\')">'+esc(x.label)+'</button>'}).join('')+'</div></div>'+
 '<div class="hhTrendGrid"><div class="hhChartBox"><div class="hhChartTitle"><div><div style="font-size:7px;font-weight:900;letter-spacing:.13em;color:#317f77;text-transform:uppercase">Vizuális trend</div><h3>'+esc(m.label)+'</h3></div><span class="hrTag">'+esc(PERIODS.find(function(x){return x.key===state.period}).label)+'</span></div>'+chartSvg(rows)+'<p class="privacyNote" style="margin-bottom:0">A grafikon a rögzített értékeket mutatja; nem helyettesít orvosi értékelést.</p></div>'+summaryHtml(rows)+'</div>'+
 (state.metric==='steps'?'<div class="hhMeasList"><h3>Napi lépések</h3>'+(rows.length?[...rows].reverse().slice(0,12).map(function(x){return '<div class="hrRow"><div class="hrIco">🚶</div><div><b>'+esc(valueText('steps',x))+'</b><small>'+esc(fmtDate(rowTime(x)))+'</small></div><span class="hrTag">Lépések</span></div>'}).join(''):'<div class="hrEmpty">Nincs lépésadat ebben az időszakban.</div>')+'</div>':'<div class="hhMeasList"><h3>Legutóbbi mérések</h3>'+(recent.length?recent.map(function(x){return '<div class="hrRow clickable" onclick="openHrDetail(\'measurement\',\''+esc(x.id)+'\')"><div class="hrIco">📈</div><div><b>'+esc(valueText(state.metric,x))+'</b><small>'+esc(fmtDateTime(x.measuredAt))+(x.notes?' · '+esc(x.notes):'')+'</small></div><span class="hrTag">'+esc(m.short)+'</span></div>'}).join(''):'<div class="hrEmpty">Nincs mérés ebben az időszakban.</div>')+'</div>')+'</div>';
 if(window.hhEnsureHealthProfileSwitches)window.hhEnsureHealthProfileSwitches();
}

var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);await render();return r};
}
ensureStyle();setTimeout(render,150);
document.documentElement.dataset.healthhubMeasurements='1.69';
window.HH_LIVE_BUILD='v1.69-trend-view';
})();