(function(){
'use strict';
/* HealthHub Sleep Premium Glass v531 | CSS-only opt-out visual adapter.
 * Does not create, clone, hide or transform Sleep records, canvases, SVG,
 * charts, tiles, source timestamps, profile data, or the Sleep Helper.
 * Legacy view: ?hhsleepglass=0 (no writes or sync effects).
 */
(function(){
 'use strict';
 var params;
 try{params=new URLSearchParams(location.search)}catch(e){params=null}
 if(params&&params.get('hhsleepglass')==='0')return;
 var root=document.documentElement;
 function updateProfile(){
  var p='z';
  try{p=localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(e){}
  root.setAttribute('data-hh-sleep-profile',p);
 }
 var link=document.createElement('link');
 link.rel='stylesheet';link.href='./sleep-premium-glass-v531.css?v=532-golden-sleep-hero';
 link.dataset.hhSleepPremium='531';
 link.addEventListener('load',function(){
  updateProfile();
  root.setAttribute('data-hh-sleep-glass','on');
  root.dataset.hhSleepPremiumBuild='v531';
 },{once:true});
 link.addEventListener('error',function(){console.warn('Sleep Premium Glass CSS unavailable; retaining original Sleep UI.')},{once:true});
 document.head.appendChild(link);
 window.addEventListener('healthhub:profile-changed',updateProfile);
 document.addEventListener('hh:profile-changed',updateProfile);
 window.addEventListener('storage',function(e){if(e.key==='hh-profile')updateProfile()});
 // Canonical Sleep's profile switch dispatches the event synchronously.
 // The original data and render functions remain the only authorities.
})();


/* HealthHub Sleep v433 Golden Standard: default production UI for BOTH profiles.
 * Inputs remain the existing profile-validated Health Connect / Dropbox records.
 * No network requests, writes, profile switching, or invented sleep durations.
 * Explicit manual display fallback: ?hh_sleep_v428_preview=0 (or hh_sleep_legacy=1).
 * Never change sync state or erase data when switching between display versions.
 */
var enabled=true;
try{
 var flags=new URLSearchParams(window.location.search);
 enabled=flags.get('hh_sleep_v428_preview')!=='0'&&flags.get('hh_sleep_legacy')!=='1';
}catch(e){enabled=true}
window.HH_SLEEP_V428_ENABLED=enabled;
var TIMEZONE='Europe/Budapest',DAY=86400000,MINUTE=60000;
var colors={1:'#ec8293',4:'#8ec7ea',5:'#265c9b',6:'#b89be8'};
var names={1:'Ébren',4:'Könnyű',5:'Mély',6:'REM'};
var selected={zsolt:'',monika:''},lastData={zsolt:[],monika:[]},expandedHistory={zsolt:'',monika:''};
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
/* Visual viewport only: the 24h sleep total is ALWAYS computed over
 * [now-24h, now]. Zooming must never change the rolling summary. */
function timelineViewport(rows,from,to){
 var ranges=(Array.isArray(rows)?rows:[]).map(function(r){
  return [Math.max(from,t(r.startTime)),Math.min(to,t(r.endTime))];
 }).filter(function(p){return Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[1]>p[0]});
 if(!ranges.length)return {start:from,end:to,zoom:false};
 var first=Math.min.apply(null,ranges.map(function(p){return p[0]}));
 var last=Math.max.apply(null,ranges.map(function(p){return p[1]}));
 var span=last-first,day=to-from;
 if(span>=day*.90)return {start:from,end:to,zoom:false};
 // 5% padding, minimum 15 and maximum 45 minutes each side.
 // If a nap is very short, show at least a 2.5-hour interval.
 var pad=Math.max(15*MINUTE,Math.min(45*MINUTE,span*.05));
 var start=Math.max(from,first-pad),end=Math.min(to,last+pad);
 var minimum=150*MINUTE;
 if(end-start<minimum){
  var middle=(first+last)/2;
  start=Math.max(from,middle-minimum/2);
  end=Math.min(to,start+minimum);
  start=Math.max(from,end-minimum);
 }
 // Align outer boundaries with quarter hours for legible scales.
 var quarter=15*MINUTE;
 start=Math.max(from,Math.floor(start/quarter)*quarter);
 end=Math.min(to,Math.ceil(end/quarter)*quarter);
 return {start:start,end:end,zoom:end-start<day*.97};
}
function timelineTicks(rows,start,end){
 var points=[];
 (rows||[]).forEach(function(r){
  var a=Math.max(start,t(r.startTime)),b=Math.min(end,t(r.endTime));
  if(Number.isFinite(a)&&Number.isFinite(b)&&b>a)points.push(a,b);
 });
 points.sort(function(a,b){return a-b});
 var kept=[],lastAt=[-Infinity,-Infinity];
 points.forEach(function(ms){
  var x=(ms-start)/(end-start);
  if(kept.some(function(prev){return prev.ms===ms}))return;
  // Keep true start and end markers. Close labels get a second row instead
  // of disappearing, while the flat ribbon retains its original height.
  var row=x-lastAt[0]>=.13?0:(x-lastAt[1]>=.13?1:-1);
  if(row<0)return;
  kept.push({ms:ms,x:x,row:row});lastAt[row]=x;
 });
 // Bound crowding if a wearable provides many small fragmented sessions.
 if(kept.length>8)kept=[kept[0]].concat(kept.slice(1,-1).filter(function(_,i){return i%Math.ceil((kept.length-2)/6)===0}).slice(0,6),[kept[kept.length-1]]);
 if(!kept.length)kept=[{ms:start,x:0,row:0},{ms:end,x:1,row:0}];
 return kept.map(function(p){
  var pct=p.x*100,align=p.x<.07?' hh430Tick--left':p.x>.93?' hh430Tick--right':'';
  return '<span class="hh430Tick'+(p.row?' hh430Tick--second':'')+align+'" style="left:'+pct.toFixed(3)+'%" aria-label="'+esc(clock(p.ms))+'">'+esc(clock(p.ms))+'</span>';
 }).join('');
}
function timebar(rows,start,end,label){
 // The caller gives the full rolling-24h window; only this visualization zooms.
 var view=timelineViewport(rows,start,end),a=view.start,b=view.end;
 var blocks=stageBlocks(rows,a,b),ticks=timelineTicks(rows,a,b);
 var rangeLabel=(dateKey(a)===dateKey(b)?clock(a)+'–'+clock(b):dateKey(a)+' '+clock(a)+' – '+dateKey(b)+' '+clock(b));
 return '<div class="hh430ViewportLabel">'+
  '<span>'+(view.zoom?'🔎 Automatikusan nagyított idővonal':'Teljes 24 órás idővonal')+'</span>'+
  '<small>'+esc(rangeLabel)+'</small></div>'+
  '<div class="hh428Timebar" role="img" aria-label="'+esc(label+'. '+(view.zoom?'Nagyított':'24 órás')+' idősáv: '+rangeLabel)+'">'+
  (blocks||'<span class="hh428NoStage">Nincs részletes fázisadat.</span>')+'</div>'+
  '<div class="hh430Axis'+(ticks.includes('hh430Tick--second')?' hh430Axis--two':'')+'" aria-label="Alvásrekordok kezdetének és végének időpontja">'+
  ticks+'</div>';
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
 /* Nonclinical visual cue: actual measured nightly sleep, never time-in-bed. */
 var measured=s.nightActual,rag=measured==null||!Number.isFinite(measured)?'unknown':
  measured<5*60*MINUTE?'red':measured<7*60*MINUTE?'amber':'green';
 var ragLabel={unknown:'Nincs mérés',red:'Rövid alvás',amber:'Figyelendő',green:'Megfelelő idő'}[rag];
 var ragHint='Tájékoztató alvásidő-jelzés a legutóbbi mért éjszakai alvás alapján; nem orvosi minősítés.';
 var note='<span class="hh428Note">A 24 órás összesítés változatlan. A grafikon a mért időszakokra közelít, az időpontokat arányosan helyezi el. Az üres részek nem jelentenek mért alvást.</span>';
 return '<section class="hh428Panel" data-hh428-profile="'+esc(profile)+'" data-sleep-rag="'+rag+'">'+
 '<div class="hh428Head"><span class="hh428Eyebrow">🌙 SLEEP · GYORS ÁTTEKINTÉS</span><span class="hhSleepRag569" title="'+esc(ragHint)+'" aria-label="Alvásidő jelzés: '+esc(ragLabel)+'"><i class="hhSleepRag569Dot" aria-hidden="true"></i>'+esc(ragLabel)+'</span><h3>A pihenésed három nézetben</h3>'+
 '<p>Éjszakai alvás és nappali szunyókálás külön, valódi Health Connect-adatokból.</p></div>'+
 '<div class="hh428Cards">'+
 card(1,'Utolsó alvás',minText(s.lastActual),lastDetail,'last','legfrissebb')+
 card(2,'Éjjeli alvás',minText(s.nightActual),nightDetail,'night','fő pihenés')+
 card(3,'Elmúlt 24 óra',minText(s.daily),dailyDetail,'day','összesen')+
 '</div><div class="hh428ChartCard"><div class="hh428ChartHeader"><b>⏱️ Az elmúlt 24 óra alvásai</b><small>Éjjel + nappal</small></div>'+
 timebar(s.inWindow,s.from,s.to,'Az elmúlt 24 órában rögzített alvásfázisok idővonala')+legend()+note+'</div></section>';
}
/* v431: both real sleep timelines are part of the main review, before
 * Léna's conclusion. Full session span != measured sleeping minutes. */
function recentTimelines(rows,profile){
 if(!enabled||['zsolt','monika'].indexOf(profile)<0)return '';
 var data=summary(rows,Date.now()),night=data.night,last=data.last;
 if(!night&&!last)return '';
 function bar(label,part,sessions,number){
  if(!part)return '<article class="hh431RecentItem"><div class="hh431RecentHeading"><b><span class="hh431Index">'+number+'</span>'+esc(label)+'</b></div><p class="hh431Missing">Nincs azonosítható alvási időszak.</p></article>';
  var start=t(part.startTime),end=t(part.endTime);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return '';
  var measured=duration(sessions,start,end),blocks=stageBlocks(sessions,start,end);
  return '<article class="hh431RecentItem">'+
   '<div class="hh431RecentHeading"><b><span class="hh431Index">'+number+'</span>'+esc(label)+'</b>'+
   '<strong>'+esc(minText(measured))+'</strong></div>'+
   '<div class="hh431RecentMeta">'+esc(dateFull(end))+' · '+esc(clock(start))+'–'+esc(clock(end))+
    ' · '+esc(minText(end-start))+' teljes időszak</div>'+
   '<div class="hh431RecentBar" role="img" aria-label="'+esc(label+': '+clock(start)+'–'+clock(end))+'">'+
    (blocks||'<span class="hh431Missing">Nincs alvásfázis-adat</span>')+'</div>'+
   '<div class="hh431RecentAxis"><span>'+esc(clock(start))+'</span><span>'+esc(clock(end))+'</span></div>'+
   '</article>';
 }
 var same=night&&last&&night.sessions.some(function(r){
  return r===last||(r.startTime===last.startTime&&r.endTime===last.endTime);
 });
 return '<section class="hh431RecentPanel hhSleepCard" aria-label="Legutóbbi fő és utolsó alvás idővonalai">'+
  '<header class="hh431RecentHeader"><small>🌙 ALVÁSI IDŐVONALAK</small><h3>Két fontos alvásod részletesen</h3>'+
  '<p>A fő éjjeli és a legutóbbi alvás külön idővonala, egységes színekkel.</p></header>'+
  bar('Fő (éjjeli) alvás',night,night?night.sessions:[],1)+
  bar('Utolsó alvás',last,last?[last]:[],2)+
  (same?'<p class="hh431SameNote">A két megjelenítés ugyanahhoz az alvásrekordhoz kapcsolódik. A 24 órás összesítésben csak egyszer szerepel.</p>':'')+
  legend()+'</section>';
}
/* Text is derived solely from existing, selected-profile records; no separate
 * diagnosis, made-up overnight score, or double-counting of naps. */
function lenaComment(rows,profile){
 if(!enabled||['zsolt','monika'].indexOf(profile)<0)return '';
 var data=summary(rows,Date.now()),name=profile==='monika'?'Mónika':'Zsolt';
 var night=data.night,last=data.last,parts=[];
 if(night){
  parts.push('A legutóbbi fő éjjeli alvásod '+minText(data.nightActual)+
   ' tényleges alvás volt ('+clock(t(night.startTime))+'–'+clock(t(night.endTime))+').');
 }else{
  parts.push('A rendelkezésre álló adatokból most nem azonosítható egyértelmű fő éjjeli alvás.');
 }
 if(last){
  var same=night&&night.sessions.some(function(r){
   return r===last||(r.startTime===last.startTime&&r.endTime===last.endTime);
  });
  if(same){
   parts.push('Az utolsó alvás egyben az éjjeli fő alvásod is.');
  }else{
   parts.push('A legutóbbi, külön rögzített alvásod '+minText(data.lastActual)+
    ' volt ('+clock(t(last.startTime))+'–'+clock(t(last.endTime))+').');
  }
 }
 if(data.daily!=null){
  parts.push('Az elmúlt gördülő 24 órában összesen '+minText(data.daily)+' mért alvás látható'+
    (data.inWindow.length>1?' '+data.inWindow.length+' érintett rekordból.':'.'));
 }else{
  parts.push('Az elmúlt 24 óra összes alvásidejéhez nincs elegendő alvásfázis-adat.');
 }
 if(data.nightActual!=null&&data.nightActual<6*60*MINUTE){
  parts.push('Az éjjeli alvás rövid volt; a nappali pihenés hozzáadódik a napi alváshoz, de nem feltétlenül helyettesíti az egybefüggő éjszakai pihenést.');
 }
 var combined=parts.join(' ');
 var addressed=name+', '+combined.slice(0,1).toLocaleLowerCase('hu-HU')+combined.slice(1);
 return '<aside class="hh431Lena" aria-label="Léna összegzése mindhárom alvásnézet alapján">'+
  '<span class="hh431LenaMood" aria-hidden="true">😴</span><div class="hh431LenaText">'+
  '<b>💬 Léna · A teljes pihenésedről</b>'+
  '<p>'+esc(addressed)+'</p>'+
  '<small>Health Connect mérési adatok alapján, nem diagnózis. Az alvásindex a fő éjjeli alvás külön becsült mutatója.</small>'+
  '</div></aside>';
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
  '<div class="hh428CalendarResult"><details class="hh431HistoryDetails"'+(expandedHistory[profile]===chosen?' open':'')+'>'+
  '<summary>'+esc(chosen)+' · '+sessions.length+' alvásrekord · részletek</summary>'+
  (sessions.length>1?'<p class="hh428Split">A külön alvásokat nem vonjuk össze automatikusan.</p>':'')+
  details+legend()+'</details></div>';
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
 expandedHistory[profile]=selected[profile];
 var body=parent.querySelector('.hh428CalendarBody');
 if(!body)return;
 // Replace the result and pill state without re-fetching Dropbox or resetting scroll.
 var scroller=body.querySelector('.hh428CalendarNav'),left=scroller?scroller.scrollLeft:0;
 body.innerHTML=calendarHtml(profile);
 var next=body.querySelector('.hh428CalendarNav');
 if(next)next.scrollLeft=left;
});
window.HH_SLEEP_V428={top:top,calendar:calendar,recentTimelines:recentTimelines,lenaComment:lenaComment,night:function(rows){return latestNight(valid(rows,Date.now()))},
 // Pure calculation exposed for regression tests; never stores measurements remotely.
 summarize:function(rows,now){return summary(rows,now==null?Date.now():now)},
 timelineViewport:timelineViewport,timelineTicks:timelineTicks};
})();
