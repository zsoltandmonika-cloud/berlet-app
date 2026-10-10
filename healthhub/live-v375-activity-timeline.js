(function(){
'use strict';
/* v375: Real hourly daily timeline. Old files may have daily totals ONLY.
   Never spread a daily total over hours, or confuse missing with zero.
   This module accepts measured Samsung SDK hourly steps and genuine
   timestamped HC heart samples and exercise sessions. */
function html(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function localDay(d){var x=new Date(d);return isNaN(+x)?'':x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
function nn(v){return Number.isFinite(v)?Math.round(v).toLocaleString('hu-HU'):'—'}
function shape(c,m){
 var now=new Date(),today=localDay(now);
 var hourly=new Array(24).fill(null),hrs=new Array(24).fill(null).map(function(){return []});
 (c.samsungHourlySteps||[]).forEach(function(r){var h=Number(r.hour),st=Number(r.steps);
  if(r.date===today&&Number.isInteger(h)&&h>=0&&h<24&&Number.isFinite(st)&&st>=0)hourly[h]=st;
 });
 (c.heart||[]).forEach(function(r){var d=new Date(r.time),b=Number(r.bpm);
  if(localDay(d)!==today||!Number.isFinite(b)||b<25||b>240)return;
  hrs[d.getHours()].push(b);
 });
 var beat=hrs.map(function(v){return v.length?v.reduce(function(a,b){return a+b},0)/v.length:null});
 var midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime();
 var workouts=(c.sessions||[]).filter(function(s){var a=Date.parse(s.startTime),b=Date.parse(s.endTime);return Number.isFinite(a)&&Number.isFinite(b)&&b>a&&a<tomorrow&&b>midnight})
 .slice(0,40).map(function(s){var a=Math.max(midnight,Date.parse(s.startTime)),b=Math.min(tomorrow,Date.parse(s.endTime));
 var t=String(s.title||'Edzés'),n=t.toLocaleLowerCase('hu-HU');
 var type=n.includes('fut')||n.includes('run')?'Futás':n.includes('séta')||n.includes('walk')||n.includes('gyalog')?'Séta':n.includes('túra')||n.includes('hike')?'Túra':'Edzés';
 return {from:(a-midnight)/(tomorrow-midnight)*24,to:(b-midnight)/(tomorrow-midnight)*24,type:type,source:s._samsung?'Samsung SDK':'Health Connect'};
 });
 return {today:today,hourly:hourly,beat:beat,workouts:workouts,hasSteps:hourly.some(function(v){return v!==null}),hasBeat:beat.some(function(v){return v!==null})};
}
function render(c,m){
 var data=shape(c,m);
 var w=720,h=180,l=33,r=34,top=27,base=152,usable=w-l-r;
 var maxSteps=Math.max.apply(null,data.hourly.filter(function(x){return x!=null}).concat([1]));
 var maxPulse=Math.max(120,Math.ceil(Math.max.apply(null,data.beat.filter(function(x){return x!=null}).concat([120]))/20)*20);
 var minPulse=40,plotH=base-top;
 var leftAxis='<text x="'+l+'" y="13" font-size="11" font-weight="700" fill="#1687b8">Lépés / óra</text>';
 var rightAxis=data.hasBeat?'<text x="'+(w-r)+'" y="13" text-anchor="end" font-size="11" font-weight="700" fill="#d63c7e">Pulzus (bpm)</text>':'';
 var grids='',labels='';
 for(var x=0;x<=24;x+=4){
  var px=l+x/24*usable;
  grids+='<line x1="'+px.toFixed(1)+'" y1="'+top+'" x2="'+px.toFixed(1)+'" y2="'+base+'" stroke="#e5edf4" stroke-dasharray="2 4"/>';
  labels+='<text x="'+px.toFixed(1)+'" y="'+(h-6)+'" text-anchor="middle" font-size="11" fill="#526980">'+String(x).padStart(2,'0')+':00</text>';
 }
 var bars='',bw=usable/24,filled=0;
 data.hourly.forEach(function(v,i){if(v==null)return;filled++;
  var height=v>0?Math.max(2,v/maxSteps*(plotH-15)):2;
  var x=l+i*bw+4,y=base-height;
  bars+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(5,bw-8).toFixed(1)+'" height="'+height.toFixed(1)+'" rx="3" fill="#1598e3"><title>'+String(i).padStart(2,'0')+':00–'+String(i+1).padStart(2,'0')+':00 · '+nn(v)+' mért lépés</title></rect>';
 });
 var workoutBar='';
 data.workouts.forEach(function(e,i){var from=l+e.from/24*usable,to=l+e.to/24*usable;
  if(to<=from)return;
  var ww=Math.max(3,to-from),lineY=19+(i%2)*4;
  workoutBar+='<rect x="'+from.toFixed(1)+'" y="'+lineY+'" width="'+ww.toFixed(1)+'" height="7" rx="3.5" fill="#ff9418"><title>'+html(e.type)+' · '+html(e.source)+' · '+e.from.toFixed(1)+'–'+e.to.toFixed(1)+' óra</title></rect>';
 });
 var segments=[],part=[];
 data.beat.forEach(function(v,i){
  if(v==null){if(part.length){segments.push(part);part=[]}return;}
  var x=l+(i+.5)/24*usable,yy=base-(Math.max(minPulse,Math.min(maxPulse,v))-minPulse)/(maxPulse-minPulse)*(plotH-13);
  part.push(x.toFixed(1)+','+yy.toFixed(1));
 });
 if(part.length)segments.push(part);
 var pulse=segments.map(function(p){return p.length>1?'<polyline points="'+p.join(' ')+'" fill="none" stroke="#e93d87" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>':''}).join('');
 data.beat.forEach(function(v,i){if(v==null)return;
  var x=l+(i+.5)/24*usable,yy=base-(Math.max(minPulse,Math.min(maxPulse,v))-minPulse)/(maxPulse-minPulse)*(plotH-13);
  pulse+='<circle cx="'+x.toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="3.5" fill="#e93d87"><title>'+String(i).padStart(2,'0')+':00 · Átlagpulzus '+nn(v)+' bpm, tényleges mérési mintákból</title></circle>';
 });
 var msg=[];
 if(data.hasSteps){
  var sum=data.hourly.reduce(function(a,v){return a+(v||0)},0);
  msg.push('Samsung SDK: '+filled+' órában van mért lépésadat ('+nn(sum)+' lépés az elérhető órákban).');
  msg.push('Üres órák: hiányzó adat, nem feltétlen nulla mozgás.');
 }else msg.push('Óránkénti lépésadat még nincs. A napi lépésszámot nem osztjuk szét találomra.');
 if(data.workouts.length)msg.push(data.workouts.length+' időbélyeges edzésjelölés.');
 if(data.hasBeat)msg.push('A rózsaszín pontok mért pulzusminták órás átlagai.');
 if(!data.hasSteps&&!data.hasBeat&&!data.workouts.length){
  return '<div class="a191TimelineEmpty">⏱️ A napi összesítés megvan, de az óránkénti mozgásadat még nem érkezett meg. A következő Samsung Beta-kiadás fogja gyűjteni.<br><small>Nem jelenítünk meg kitalált óránkénti lépéseket.</small></div>';
 }
 return '<div class="a191TimelineMeta"><span>📅 '+html(data.today)+'</span><span>'+html(data.hasSteps?'Samsung mért idősávok':'Időbélyeges edzés és pulzus')+'</span></div>'+
 '<svg class="a191TimelineSvg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Óránkénti mért lépések oszlopokkal, edzések narancs sávval, átlagpulzus rózsaszín vonallal">'+
 leftAxis+rightAxis+grids+
 '<line x1="'+l+'" y1="'+base+'" x2="'+(w-r)+'" y2="'+base+'" stroke="#b5c6d4"/>'+
 bars+workoutBar+pulse+labels+'</svg>'+
 '<div class="a191TimelineLegend"><span><i style="background:#1598e3"></i>Mért lépések / óra</span><span><i style="background:#ff9418"></i>Edzés időtartama</span><span><i style="background:#e93d87"></i>Órás átlagpulzus</span></div>'+
 '<div class="a191TimelineNote">'+html(msg.join(' '))+'</div>';
}
var css='.a191TimelineMeta{display:flex;justify-content:space-between;gap:5px;font:700 10px system-ui;color:#547087;margin:0 0 7px}.a191TimelineSvg{display:block;width:100%;height:auto;max-height:200px}.a191TimelineLegend{display:flex;flex-wrap:wrap;gap:5px 10px;font:600 9px system-ui;color:#40576c;margin:5px 0}.a191TimelineLegend span{display:inline-flex;align-items:center;gap:4px}.a191TimelineLegend i{display:inline-block;width:9px;height:9px;border-radius:3px}.a191TimelineNote{font:10px/1.5 system-ui;color:#56728a;margin:8px 0 0}.a191TimelineEmpty{padding:18px 12px;border:1px dashed #b5cedd;border-radius:13px;background:#f6fbff;font:600 12px/1.7 system-ui;color:#39566a}.a191TimelineEmpty small{font-weight:400}';
if(typeof document!=='undefined'){var style=document.createElement('style');style.id='hh-activity-timeline-v375';style.textContent=css;document.head.appendChild(style)}
window.HH_ACTIVITY_TIMELINE_V375={render:render,shape:shape,version:'375'};
})();
