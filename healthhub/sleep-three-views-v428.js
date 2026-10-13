(function(){
'use strict';
/* HealthHub v428: read-only, opt-in three-view Sleep dashboard.
 * Inputs are the existing, profile-validated Sleep records from live-v170.
 * No network requests, writes, profile switching, or invented sleep durations.
 */
var enabled=false;
try{enabled=new URLSearchParams(window.location.search).get('hh_sleep_v428_preview')==='1'}catch(e){}
window.HH_SLEEP_V428_ENABLED=enabled;
var TIMEZONE='Europe/Budapest',DAY=86400000,MINUTE=60000;
var colors={1:'#ec8293',4:'#8ec7ea',5:'#265c9b',6:'#b89be8'};
var names={1:'Ébren',4:'Könnyű',5:'Mély',6:'REM'};
var selected={zsolt:'',monika:''},lastData={zsolt:[],monika:[]};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function t(v){var d=Date.parse(v);return Number.isFinite(d)?d:NaN}
function dateKey(ms){
 if(!Number.isFinite(ms))return '';
 return new Intl.DateTimeFormat('sv-SE',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(ms);
}
function hour(ms){
 return Number(new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,hour:'2-digit',hourCycle:'h23'}).format(ms));
}
function clock(ms){return Number.isFinite(ms)?new Intl.DateTimeFormat('hu-HU',{timeZone:TIMEZONE,hour:'2-digit',minute:'2-digit'}).format(ms):'—'}
function dateFull(ms){return Number.isFinite(ms)?new Intl.DateTimeFormat('hu-HU',{timeZone:TIMEZONE,month:'short',day:'numeric',weekday:'short'}).format(ms):'—'}
function minText(ms){
 if(ms==null||!Number.isFinite(ms))return 'Nincs fázisadat';
 var n=Math.max(0,Math.round(ms/MINUTE)),h=Math.floor(n/60),m=n%60;
 return h?h+' ó '+m+' p':m+' p';
}
function valid(rows,now){
 return (Array.isArray(rows)?rows:[]).filter(function(r){
  var a=t(r&&r.startTime),b=t(r&&r.endTime);
  return Number.isFinite(a)&&Number.isFinite(b)&&a<b&&b<now+5*MINUTE&&a<=now;
 }).slice().sort(function(a,b){return t(a.endTime)-t(b.endTime)});
}
function union(intervals){
 intervals.sort(function(a,b){return a[0]-b[0]});
 var out=[];
 intervals.forEach(function(x){
  var last=out[out.length-1];
  if(last&&x[0]<=last[1])last[1]=Math.max(last[1],x[1]);
  else out.push(x.slice());
 });
 return out;
}
function intervals(rows,start,end,allowed){
 var out=[];
 (rows||[]).forEach(function(r){
  (Array.isArray(r.stages)?r.stages:[]).forEach(function(s){
   var k=Number(s.stage),a=t(s.startTime),b=t(s.endTime);
   if(allowed.indexOf(k)<0||!Number.isFinite(a)||!Number.isFinite(b))return;
   a=Math.max(a,t(r.startTime),start);b=Math.min(b,t(r.endTime),end);
   if(b>a)out.push([a,b]);
  });
 });
 return union(out);
}
function duration(rows,start,end){
 if(!(end>start)||!rows||!rows.length)return null;
 var periods=intervals(rows,start,end,[2,4,5,6]);
 if(!periods.length)return null; // Do not call 'time in bed' measured sleep.
 return periods.reduce(function(v,r){return v+r[1]-r[0]},0);
}
function nightCandidate(s){
 var a=t(s.startTime),b=t(s.endTime),len=b-a;
 if(!(len>=90*MINUTE&&len<=16*60*MINUTE))return false;
 // Budapest local 21:00-09:00; sampled to handle midnight/DST.
 var night=0,total=0;
 for(var x=a;x<b;x+=15*MINUTE){
  var mid=Math.min(b,x+15*MINUTE/2),h=hour(mid);
  if(h>=21||h<9)night++;
  total++;
 }
 return total>0&&night/total>=0.60;
}
function latestNight(rows){
 var nights=rows.filter(nightCandidate);
 if(!nights.length)return null;
 // Attach clearly related nighttime sleep fragments only (<=90min gap).
 var groups=[];
 nights.forEach(function(s){
  var a=t(s.startTime),b=t(s.endTime),g=groups[groups.length-1];
  if(g&&a-g.end<=90*MINUTE&&b-g.start<=16*60*MINUTE){
   g.end=Math.max(g.end,b);g.sessions.push(s);
  }else groups.push({start:a,end:b,sessions:[s]});
 });
 var best=groups[groups.length-1];
 return {startTime:new Date(best.start).toISOString(),endTime:new Date(best.end).toISOString(),
  stages:best.sessions.reduce(function(out,s){return out.concat(Array.isArray(s.stages)?s.stages:[])},[]),
  sessions:best.sessions};
}
function summary(rows,now){
 var list=valid(rows,now),last=list[list.length-1]||null,night=latestNight(list),since=now-DAY;
 var lastActual=last?duration([last],t(last.startTime),t(last.endTime)):null;
 var nightActual=night?duration(night.sessions,t(night.startTime),t(night.endTime)):null;
 var current=list.filter(function(s){return t(s.endTime)>since&&t(s.startTime)<now});
 var daily=duration(current,since,now);
 return {list:list,last:last,night:night,lastActual:lastActual,nightActual:nightActual,
  daily:daily,from:since,to:now,inWindow:current};
}
function card(number,title,value,detail,kind,sub){
 return '<article class="hh428Card hh428Card--'+kind+'">'+
  '<div class="hh428CardTop"><span class="hh428Num">0'+number+'</span><h4>'+esc(title)+'</h4><span class="hh428Kind">'+esc(sub)+'</span></div>'+
  '<strong class="hh428Value">'+esc(value)+'</strong>'+
  '<p>'+esc(detail)+'</p></article>';
}
function stageBlocks(rows,start,end){
 var all=[];
 (rows||[]).forEach(function(r){
  (Array.isArray(r.stages)?r.stages:[]).forEach(function(s){
   var k=Number(s.stage),a=t(s.startTime),b=t(s.endTime);
   if(k===7||k===3)k=1;
   if(!colors[k]||!Number.isFinite(a)||!Number.isFinite(b))return;
   a=Math.max(a,start,t(r.startTime));b=Math.min(b,end,t(r.endTime));
   if(b<=a)return;
   // A single, flat ribbon matching the existing HealthHub sleep-stage timeline.
   // Empty 24-hour intervals remain neutral, never misrepresented as sleep.
   all.push('<i class="hh428Stage" style="left:'+((a-start)/(end-start)*100).toFixed(3)+
    '%;width:'+((b-a)/(end-start)*100).toFixed(3)+'%;background:'+colors[k]+
    '" title="'+esc(names[k]+' · '+clock(a)+'–'+clock(b))+'"></i>');
  });
 });
 return all.join('');
}
function legend(){
 return '<div class="hh428Legend">'+[1,4,5,6].map(function(k){
  return '<span><i style="background:'+colors[k]+'"></i>'+names[k]+'</span>';
 }).join('')+'</div>';
}
function timebar(rows,start,end,label){
 var blocks=stageBlocks(rows,start,end);
 return '<div class="hh428Timebar" role="img" aria-label="'+esc(label)+'">'+
  (blocks||'<span class="hh428NoStage">Nincs részletes fázisadat.</span>')+'</div>'+
  '<div class="hh428Axis"><span>'+esc(clock(start))+'</span><span>'+esc(clock(start+6*3600000))+
  '</span><span>'+esc(clock(start+12*3600000))+'</span><span>'+esc(clock(start+18*3600000))+
  '</span><span>'+esc(clock(end))+'</span></div>';
}
function activeProfile(){
 try{if(typeof window.cur==='string'&&(window.cur==='m'||window.cur==='z'))return window.cur==='m'?'monika':'zsolt'}catch(e){}
 return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
function top(rows,profile){
 if(!enabled||['zsolt','monika'].indexOf(profile)<0)return '';
 var now=Date.now(),s=summary(rows,now),last=s.last,night=s.night;
 var lastDetail=last?dateFull(t(last.endTime))+' · '+clock(t(last.startTime))+'–'+clock(t(last.endTime)):'Nincs szinkronizált alvásadat.';
 var nightDetail=night?dateFull(t(night.endTime))+' · '+clock(t(night.startTime))+'–'+clock(t(night.endTime)):'Nincs azonosítható éjjeli alvás.';
 var dailyDetail=s.inWindow.length?s.inWindow.length+' alvásrekord · gördülő 24 óra':'Nincs 24 órán belüli mért alvás.';
 var note='<span class="hh428Note">A színes szakaszok mért alvásfázisok; az üres részek nem jelentenek rögzített alvást. Az átfedéseket csak egyszer számoljuk.</span>';
 return '<section class="hh428Panel" data-hh428-profile="'+esc(profile)+'">'+
 '<div class="hh428Head"><span class="hh428Eyebrow">🌙 SLEEP · GYORS ÁTTEKINTÉS</span><h3>A pihenésed három nézetben</h3>'+
 '<p>Éjszakai alvás és nappali szunyókálás külön, valódi Health Connect-adatokból.</p></div>'+
 '<div class="hh428Cards">'+
 card(1,'Utolsó alvás',minText(s.lastActual),lastDetail,'last','legfrissebb')+
 card(2,'Éjjeli alvás',minText(s.nightActual),nightDetail,'night','fő pihenés')+
 card(3,'Elmúlt 24 óra',minText(s.daily),dailyDetail,'day','összesen')+
 '</div><div class="hh428ChartCard"><div class="hh428ChartHeader"><b>⏱️ Az elmúlt 24 óra alvásidővonala</b><small>Éjjel + nappal</small></div>'+
 timebar(s.inWindow,s.from,s.to,'Az elmúlt 24 órában rögzített alvásfázisok idővonala')+legend()+note+'</div></section>';
}
function dateList(profile,now){
 var dates=[],today=dateKey(now).split('-').map(Number);
 for(var n=29;n>=0;n--){
  // Use the current Budapest LOCAL date even when UTC is still yesterday.
  var base=Date.UTC(today[0],today[1]-1,today[2]-n,12);
  dates.push(dateKey(base));
 }
 return Array.from(new Set(dates));
}
function calendarHtml(profile){
 var rows=lastData[profile]||[],now=Date.now(),dates=dateList(profile,now),groups={};
 rows.forEach(function(s){
  var key=dateKey(t(s.endTime));
  if(key)(groups[key]||(groups[key]=[])).push(s);
 });
 var keys=dates.filter(function(k){return (groups[k]||[]).length>0});
 var chosen=dates.includes(selected[profile])?selected[profile]:(keys[keys.length-1]||dates[dates.length-1]);
 selected[profile]=chosen;
 var pills=dates.map(function(k){
  var count=(groups[k]||[]).length,on=k===chosen;
  return '<button type="button" class="hh428Day'+(on?' active':'')+'" data-hh428-day="'+esc(k)+'" aria-pressed="'+on+
   '" aria-label="'+esc(k+' · '+count+' alvásrekord')+'" '+(!count?'disabled':'')+'><b>'+
   esc(k.slice(5))+'</b><small>'+(count?'● '+count:'–')+'</small></button>';
 }).join('');
 var sessions=(groups[chosen]||[]).slice().sort(function(a,b){return t(a.startTime)-t(b.startTime)});
 var details=sessions.length?sessions.map(function(s,i){
  var a=t(s.startTime),b=t(s.endTime),measured=duration([s],a,b);
  return '<article class="hh428Record"><h5>'+esc(String(i+1)+'. '+clock(a)+'–'+clock(b))+
   '</h5><div class="hh428RecordMeta">Tényleges alvás: <b>'+esc(minText(measured))+'</b> · Teljes időszak: '+esc(minText(b-a))+'</div>'+
   '<div class="hh428RecordBar" role="img" aria-label="Alvásfázis-idővonal">'+
   (stageBlocks([s],a,b)||'<small>Ehhez a rekordhoz nincs részletes alvásfázis.</small>')+'</div>'+
   '<div class="hh428RecordAxis"><span>'+esc(clock(a))+'</span><span>'+esc(clock(b))+'</span></div>'+
   '<small class="hh428Source">Forrás: '+esc(s.sourcePackage||'Health Connect')+'</small></article>';
 }).join(''):'<p class="hh428Empty">Erre a napra nincs mért alvás.</p>';
 return '<div class="hh428CalendarNav" aria-label="30 napos alvásnaptár">'+pills+'</div>'+
  '<div class="hh428CalendarResult"><h4>'+esc(chosen)+' · '+sessions.length+' alvásrekord</h4>'+
  (sessions.length>1?'<p class="hh428Split">A külön alvásokat nem vonjuk össze automatikusan.</p>':'')+
  details+legend()+'</div>';
}
function calendar(rows,profile){
 if(!enabled||['zsolt','monika'].indexOf(profile)<0)return '';
 lastData[profile]=valid(rows,Date.now());
 // The latest wake days must be visible first after opening the screen.
 requestAnimationFrame(function(){var nav=document.querySelector('#hhSleepPage .hh428CalendarNav');if(nav&&!nav.dataset.hh428Initial){nav.scrollLeft=nav.scrollWidth;nav.dataset.hh428Initial='1';}});
 return '<section class="hh428Calendar hhSleepCard" data-hh428-profile="'+esc(profile)+'">'+
  '<div class="hh428CalendarTitle"><span>📆 30 NAPOS ALVÁSNAPTÁR</span><h3>Alvásaid napokra bontva</h3>'+
  '<p>Ébredési dátum szerint. Koppints egy napra a külön alvások részleteiért.</p></div>'+
  '<div class="hh428CalendarBody">'+calendarHtml(profile)+'</div></section>';
}
document.addEventListener('click',function(e){
 var button=e.target&&e.target.closest&&e.target.closest('[data-hh428-day]');if(!button)return;
 var parent=button.closest('[data-hh428-profile]');
 if(!parent)return;
 var profile=parent.getAttribute('data-hh428-profile');
 if(profile!==activeProfile())return; // No cross-profile changes from a stale card.
 selected[profile]=button.getAttribute('data-hh428-day');
 var body=parent.querySelector('.hh428CalendarBody');
 if(!body)return;
 // Replace the result and pill state without re-fetching Dropbox or resetting scroll.
 var scroller=body.querySelector('.hh428CalendarNav'),left=scroller?scroller.scrollLeft:0;
 body.innerHTML=calendarHtml(profile);
 var next=body.querySelector('.hh428CalendarNav');
 if(next)next.scrollLeft=left;
});
window.HH_SLEEP_V428={top:top,calendar:calendar,night:function(rows){return latestNight(valid(rows,Date.now()))},
 // Pure calculation exposed for regression tests; never stores measurements remotely.
 summarize:function(rows,now){return summary(rows,now==null?Date.now():now)}};
})();
