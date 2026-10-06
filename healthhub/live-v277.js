(function(){
'use strict';
/* HealthHub v1.277 — inline dual-axis weight/body-fat trend chart */
var DB='healthhub-healthradar-v2';
var PAGE='hhWeightPage270', HIST='hhWeightHistory', CARD='hhWeightTrend277';
var RANGE_KEY='hh-weight-chart-range';
var busy=false, observer=null;

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function dec(v,d){v=Number(v);return Number.isFinite(v)?v.toLocaleString('hu-HU',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function fmtDay(t){var d=new Date(t);return d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})}
function fmtPoint(t){var d=new Date(t);return d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'})}
function range(){var r=localStorage.getItem(RANGE_KEY);return /^(7d|30d|90d|all)$/.test(r||'')?r:'30d'}
function rangeLabel(r){return r==='7d'?'7 nap':r==='30d'?'30 nap':r==='90d'?'90 nap':'Összes'}
function cutoff(r){if(r==='all')return -Infinity;var n=parseInt(r,10)||30;return Date.now()-n*86400000}
function padDomain(vals,kind){
 if(!vals.length)return kind==='w'?[0,1]:[0,1];
 var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
 if(mn===mx){var p=kind==='w'?Math.max(1,mn*.015):Math.max(.8,mn*.04);return[mn-p,mx+p]}
 var p=(mx-mn)*.18;
 if(kind==='w')p=Math.max(.7,p);else p=Math.max(.5,p);
 return[mn-p,mx+p];
}
function pathFor(arr,x,y,key){
 var pts=arr.filter(function(d){return Number.isFinite(Number(d[key]))});
 return pts.map(function(d,i){return(i?'L':'M')+x(d.t).toFixed(1)+' '+y(Number(d[key])).toFixed(1)}).join(' ');
}
async function rows(){
 var db=await openDb();try{
  var st=db.transaction('measurements','readonly').objectStore('measurements'),all;
  if(st.indexNames.contains('profile'))all=await reqP(st.index('profile').getAll(pkey()));else all=(await reqP(st.getAll())).filter(function(x){return x.profile===pkey()});
  return (all||[]).map(function(x){
    return {id:x.id,t:Date.parse(x.measuredAt||0),weight:Number(x.weightKg),fat:Number(x.bodyFatPercent),source:x.source||''};
  }).filter(function(x){
    return Number.isFinite(x.t)&&Number.isFinite(x.weight)&&x.weight>0&&x.weight<=400;
  }).sort(function(a,b){return a.t-b.t});
 }finally{db.close()}
}
function style(){
 if(document.getElementById('hh-v277-style'))return;
 var s=document.createElement('style');s.id='hh-v277-style';s.textContent=
 '.hhWTrendCard{background:#fff;border:1px solid #e1ebf1;border-radius:19px;padding:12px;margin:0 0 14px;box-shadow:0 7px 18px rgba(38,73,99,.05);scroll-margin-top:68px}.hhWTrendHead{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.hhWTrendHead h3{font-size:14px;margin:0;color:#173f62}.hhWTrendHead small{display:block;margin-top:2px;font-size:8px;color:#73889a;font-weight:700}.hhWTrendLegend{display:flex;gap:9px;justify-content:flex-end;align-items:center;font-size:8px;font-weight:850;color:#5e7485;white-space:nowrap}.hhWTrendLegend i{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:3px;vertical-align:-1px}.hhWTrendLegend .w i{background:var(--a)}.hhWTrendLegend .f i{background:#19a6a6}.hhWTrendRanges{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:9px 0 5px}.hhWTrendRanges button{height:28px;border:1px solid #dce8ef;background:#f8fbfd;border-radius:9px;color:#61788a;font-size:8px;font-weight:850}.hhWTrendRanges button.on{background:color-mix(in srgb,var(--a) 12%,white);border-color:color-mix(in srgb,var(--a) 32%,#dce8ef);color:var(--a)}.hhWChartWrap{position:relative;width:100%;min-height:166px}.hhWChartSvg{display:block;width:100%;height:auto;overflow:visible}.hhWChartGrid{stroke:#e8eff4;stroke-width:1}.hhWChartAxis{fill:#7890a1;font-size:8px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-weight:700}.hhWLineW{fill:none;stroke:var(--a);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}.hhWLineF{fill:none;stroke:#19a6a6;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.hhWPtW{fill:#fff;stroke:var(--a);stroke-width:2}.hhWPtF{fill:#fff;stroke:#19a6a6;stroke-width:2}.hhWHit{fill:transparent;cursor:pointer}.hhWChartInfo{height:21px;padding-top:3px;text-align:center;font-size:8px;color:#536d80;font-weight:750}.hhWChartEmpty{height:145px;display:grid;place-items:center;text-align:center;padding:15px;color:#8193a1;font-size:9px;line-height:1.5}.hhWTrendDelta{display:flex;gap:8px;justify-content:center;margin-top:1px;font-size:8px;font-weight:800;color:#6b8293}.hhWTrendDelta b{color:#173f62}';
 document.head.appendChild(s);
}
function chartHtml(data,r){
 var filtered=data.filter(function(d){return d.t>=cutoff(r)});
 if(!filtered.length)return '<div class="hhWChartEmpty">Nincs érvényes testsúlymérés a kiválasztott időszakban.<br>A 0,0 kg-os hibás importokat nem rajzoljuk ki.</div>';
 var W=360,H=158,L=34,R=34,T=12,B=28,pw=W-L-R,ph=H-T-B;
 var ts=filtered.map(function(d){return d.t}),t0=Math.min.apply(null,ts),t1=Math.max.apply(null,ts);if(t0===t1){t0-=43200000;t1+=43200000}
 var weights=filtered.map(function(d){return d.weight}),fats=filtered.filter(function(d){return Number.isFinite(d.fat)&&d.fat>=1&&d.fat<=75}).map(function(d){return d.fat});
 var wd=padDomain(weights,'w'),fd=padDomain(fats.length?fats:[0,1],'f');
 function x(t){return L+(t-t0)/(t1-t0)*pw}
 function yw(v){return T+(wd[1]-v)/(wd[1]-wd[0])*ph}
 function yf(v){return T+(fd[1]-v)/(fd[1]-fd[0])*ph}
 var out='<svg class="hhWChartSvg" viewBox="0 0 '+W+' '+H+'" aria-label="Testsúly és testzsír trend">';
 for(var i=0;i<4;i++){
  var yy=T+i*(ph/3),wv=wd[1]-i*(wd[1]-wd[0])/3,fv=fd[1]-i*(fd[1]-fd[0])/3;
  out+='<line class="hhWChartGrid" x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+yy.toFixed(1)+'"/>';
  out+='<text class="hhWChartAxis" x="'+(L-4)+'" y="'+(yy+3).toFixed(1)+'" text-anchor="end">'+esc(dec(wv,1))+'</text>';
  if(fats.length)out+='<text class="hhWChartAxis" x="'+(W-R+4)+'" y="'+(yy+3).toFixed(1)+'" text-anchor="start">'+esc(dec(fv,1))+'%</text>';
 }
 out+='<text class="hhWChartAxis" x="'+L+'" y="'+(H-5)+'" text-anchor="start">'+esc(fmtDay(t0))+'</text>';
 out+='<text class="hhWChartAxis" x="'+(W-R)+'" y="'+(H-5)+'" text-anchor="end">'+esc(fmtDay(t1))+'</text>';
 out+='<path class="hhWLineW" d="'+pathFor(filtered,x,yw,'weight')+'"/>';
 if(fats.length)out+='<path class="hhWLineF" d="'+pathFor(filtered.filter(function(d){return Number.isFinite(d.fat)&&d.fat>=1&&d.fat<=75}),x,yf,'fat')+'"/>';
 filtered.forEach(function(d,i){
  var xx=x(d.t),wy=yw(d.weight);
  out+='<circle class="hhWPtW" cx="'+xx.toFixed(1)+'" cy="'+wy.toFixed(1)+'" r="3.2"/>';
  if(Number.isFinite(d.fat)&&d.fat>=1&&d.fat<=75)out+='<circle class="hhWPtF" cx="'+xx.toFixed(1)+'" cy="'+yf(d.fat).toFixed(1)+'" r="3.0"/>';
  out+='<circle class="hhWHit" data-chart-i="'+i+'" cx="'+xx.toFixed(1)+'" cy="'+wy.toFixed(1)+'" r="11"/>';
 });
 out+='</svg>';
 var first=filtered[0],last=filtered[filtered.length-1],dw=last.weight-first.weight;
 var ff=filtered.find(function(d){return Number.isFinite(d.fat)&&d.fat>=1&&d.fat<=75}),lf=[].concat(filtered).reverse().find(function(d){return Number.isFinite(d.fat)&&d.fat>=1&&d.fat<=75}),df=ff&&lf?lf.fat-ff.fat:null;
 out+='<div class="hhWTrendDelta"><span>Súly: <b>'+(dw>=0?'+':'')+esc(dec(dw,1))+' kg</b></span>'+(df!=null?'<span>Testzsír: <b>'+(df>=0?'+':'')+esc(dec(df,1))+'%</b></span>':'')+'</div>';
 out+='<div class="hhWChartInfo">'+esc(fmtPoint(last.t))+' · '+esc(dec(last.weight,1))+' kg'+(Number.isFinite(last.fat)&&last.fat>=1&&last.fat<=75?' · '+esc(dec(last.fat,1))+'%':'')+'</div>';
 return out;
}
async function build(){
 if(busy)return;busy=true;
 try{
  style();
  var page=document.getElementById(PAGE),hist=document.getElementById(HIST);
  if(!page||!hist||!page.classList.contains('on'))return;
  var old=document.getElementById(CARD);if(old)old.remove();
  var data=await rows(),r=range(),card=document.createElement('section');card.id=CARD;card.className='hhWTrendCard';
  card.innerHTML='<div class="hhWTrendHead"><div><h3>Testsúly &amp; testzsír trend</h3><small>Kettős skála · kg / %</small></div><div class="hhWTrendLegend"><span class="w"><i></i>Súly</span><span class="f"><i></i>Testzsír</span></div></div>'+
   '<div class="hhWTrendRanges"><button data-wrange="7d" class="'+(r==='7d'?'on':'')+'">7 nap</button><button data-wrange="30d" class="'+(r==='30d'?'on':'')+'">30 nap</button><button data-wrange="90d" class="'+(r==='90d'?'on':'')+'">90 nap</button><button data-wrange="all" class="'+(r==='all'?'on':'')+'">Összes</button></div>'+
   '<div class="hhWChartWrap">'+chartHtml(data,r)+'</div>';
  hist.parentNode.insertBefore(card,hist);
  card.querySelectorAll('[data-wrange]').forEach(function(b){b.addEventListener('click',function(){localStorage.setItem(RANGE_KEY,b.getAttribute('data-wrange'));build()})});
  var shown=data.filter(function(d){return d.t>=cutoff(r)});
  card.querySelectorAll('[data-chart-i]').forEach(function(el){el.addEventListener('click',function(){
   var d=shown[Number(el.getAttribute('data-chart-i'))];if(!d)return;
   var info=card.querySelector('.hhWChartInfo');if(info)info.textContent=fmtPoint(d.t)+' · '+dec(d.weight,1)+' kg'+(Number.isFinite(d.fat)&&d.fat>=1&&d.fat<=75?' · '+dec(d.fat,1)+'%':'');
  })});
 }catch(e){console.warn('Weight trend chart',e)}
 finally{busy=false}
}
function hook(){
 var page=document.getElementById(PAGE);if(!page)return;
 if(page.dataset.hhTrend277)return;page.dataset.hhTrend277='1';
 page.addEventListener('click',function(e){
  var b=e.target&&e.target.closest&&e.target.closest('[data-act="trend"]');
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  build().then(function(){setTimeout(function(){document.getElementById(CARD)?.scrollIntoView({behavior:'smooth',block:'start'})},60)});
 },true);
 observer=new MutationObserver(function(){if(!document.getElementById(CARD))setTimeout(build,30)});
 observer.observe(page,{childList:true,subtree:false});
 build();
}
function init(){style();hook();if(!document.getElementById(PAGE))setTimeout(init,120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('healthhub:profile-changed',function(){setTimeout(build,60)});
window.addEventListener('healthhub:measurement-saved',function(){setTimeout(build,80)});
window.addEventListener('healthhub:measurement-deleted',function(){setTimeout(build,80)});
window.hhRenderWeightTrend277=build;
document.documentElement.dataset.healthhubWeightTrend='1.277';
})();