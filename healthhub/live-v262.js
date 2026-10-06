(function(){
'use strict';
/* HealthHub v262 — deep sleep / latest-night analysis.
   Keeps the proven v170 Sleep UI and replaces only the latest-sleep summary
   with a 12h/24h multi-session night view plus available HR/SpO2 context. */

var DB='healthhub-connect-v1';
var enhanceSeq=0;
var enhancing=false;
var observerTimer=0;
var sleepWindowHours=Number(localStorage.getItem('hh-sleep-window-hours')||24)===12?12:24;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function profileKey(p){return (p==='m'||p==='monika'||(!p&&localStorage.getItem('hh-profile')==='m'))?'monika':'zsolt'}
function fmtTime(ms){var d=new Date(ms);return Number.isFinite(d.getTime())?d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):'—'}
function fmtDate(ms){var d=new Date(ms);return Number.isFinite(d.getTime())?d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'}):'—'}
function durText(min){min=Math.max(0,Math.round(min||0));var h=Math.floor(min/60),m=min%60;return h?h+' ó '+m+' p':m+' p'}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:null}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,2);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}

async function latestLocalBundle(profile){
 try{
  var db=await openDb();
  try{
   return await new Promise(function(resolve){
    var tx=db.transaction('imports'),st=tx.objectStore('imports'),rq=st.openCursor(null,'prev');
    rq.onerror=function(){resolve(null)};
    rq.onsuccess=function(){
     var c=rq.result;if(!c){resolve(null);return}
     var v=c.value;
     if(v&&v.profile===profile&&v.bundle&&v.bundle.records){resolve(v.bundle);return}
     c.continue();
    };
   });
  }finally{db.close()}
 }catch(e){return null}
}

async function loadBundle(profile){
 try{
  var v=window.HH_DROPBOX_VAULT;
  if(v&&v.connected&&v.connected()&&typeof v.downloadJson==='function'){
   var raw=await v.downloadJson('/HealthHub/profiles/'+profile+'-health-connect.json');
   if(raw&&String(raw.profile||'').toLowerCase()===profile&&raw.records)return raw;
  }
 }catch(e){if(!(e&&e.status===409))console.warn('Sleep v262 cloud read',e)}
 return await latestLocalBundle(profile);
}

function t(v){var n=Date.parse(v);return Number.isFinite(n)?n:0}
function clip(a,b,start,end){var x=Math.max(a,start),y=Math.min(b,end);return y>x?[x,y]:null}
function stageClass(v){return ({1:'awake',2:'sleep',3:'awake',4:'light',5:'deep',6:'rem'})[Number(v)]||'sleep'}
function stageName(v){return ({1:'Ébren',2:'Alvás',3:'Ágyon kívül',4:'Könnyű',5:'Mély',6:'REM'})[Number(v)]||'Alvás'}

function selectLatestCluster(sessions,hours){
 var now=Date.now(),cut=now-hours*3600000;
 var rows=(sessions||[]).filter(function(s){return s&&t(s.endTime)>=cut&&t(s.startTime)<=now&&t(s.endTime)>t(s.startTime)}).sort(function(a,b){return t(a.startTime)-t(b.startTime)});
 if(!rows.length)return [];
 /* Prefer one data origin for a night. Multiple apps can mirror the same sleep
    into Health Connect and otherwise double-count the very same minutes. */
 var latest=rows.slice().sort(function(a,b){return t(a.endTime)-t(b.endTime)}).pop();
 var src=latest&&latest.sourcePackage;
 if(src){var same=rows.filter(function(s){return !s.sourcePackage||s.sourcePackage===src});if(same.length)rows=same}
 var groups=[],g=[];
 rows.forEach(function(s){
  if(!g.length){g=[s];return}
  var prev=g[g.length-1],gap=(t(s.startTime)-t(prev.endTime))/60000;
  if(gap<=90)g.push(s);else{groups.push(g);g=[s]}
 });
 if(g.length)groups.push(g);
 groups.sort(function(a,b){return t(a[a.length-1].endTime)-t(b[b.length-1].endTime)});
 return groups[groups.length-1]||[];
}

function analyze(records,hours){
 var sessions=selectLatestCluster(records.sleepSessions||[],hours);
 if(!sessions.length)return null;
 var start=Math.min.apply(null,sessions.map(function(s){return t(s.startTime)}));
 var end=Math.max.apply(null,sessions.map(function(s){return t(s.endTime)}));
 var span=(end-start)/60000;
 var stageMins={1:0,2:0,3:0,4:0,5:0,6:0},segments=[];
 var sessionMinutes=0,gapMinutes=0,gaps=[];

 sessions.forEach(function(s,i){
  var ss=t(s.startTime),se=t(s.endTime);sessionMinutes+=(se-ss)/60000;
  var stages=Array.isArray(s.stages)?s.stages:[];
  if(stages.length){
   stages.forEach(function(x){
    var c=clip(t(x.startTime),t(x.endTime),start,end);if(!c)return;
    var k=Number(x.stage),m=(c[1]-c[0])/60000;
    if(stageMins[k]!=null)stageMins[k]+=m;
    segments.push({start:c[0],end:c[1],stage:k,label:stageName(k),cls:stageClass(k)});
   });
  }else{
   stageMins[2]+=(se-ss)/60000;
   segments.push({start:ss,end:se,stage:2,label:'Alvás',cls:'sleep'});
  }
  if(i<sessions.length-1){
   var ns=t(sessions[i+1].startTime),gap=Math.max(0,(ns-se)/60000);
   if(gap>0){gapMinutes+=gap;gaps.push({start:se,end:ns,stage:1,label:'Megszakítás',cls:'awake'});}
  }
 });
 segments=segments.concat(gaps).sort(function(a,b){return a.start-b.start});

 var explicitAwake=(stageMins[1]||0)+(stageMins[3]||0);
 var stagedSleep=(stageMins[2]||0)+(stageMins[4]||0)+(stageMins[5]||0)+(stageMins[6]||0);
 var sleepMinutes=stagedSleep>0?stagedSleep:Math.max(0,sessionMinutes-explicitAwake);
 var awakeMinutes=Math.max(0,span-sleepMinutes);
 var efficiency=span>0?Math.round(sleepMinutes/span*100):0;

 var hrs=[];
 (records.heartRate||[]).forEach(function(r){
  (r.samples||[]).forEach(function(s){var ms=t(s.time),bpm=Number(s.bpm);if(ms>=start&&ms<=end&&Number.isFinite(bpm)&&bpm>0)hrs.push(bpm)});
 });
 var spo=[];
 (records.oxygenSaturation||[]).forEach(function(r){var ms=t(r.time),v=Number(r.percent);if(ms>=start&&ms<=end&&Number.isFinite(v)&&v>0)spo.push(v)});

 return {
  sessions:sessions,start:start,end:end,span:span,sleepMinutes:sleepMinutes,awakeMinutes:awakeMinutes,
  efficiency:efficiency,stageMins:stageMins,segments:segments,gapMinutes:gapMinutes,
  hr:hrs.length?{avg:Math.round(avg(hrs)),min:Math.min.apply(null,hrs),max:Math.max.apply(null,hrs),n:hrs.length}:null,
  spo:spo.length?{avg:avg(spo),min:Math.min.apply(null,spo),max:Math.max.apply(null,spo),n:spo.length}:null
 };
}

function ensureStyle(){
 if(document.getElementById('hhSleepDeepStyle262'))return;
 var s=document.createElement('style');s.id='hhSleepDeepStyle262';
 s.textContent=
 '.hhSleepDeep262{margin:0 0 16px}'+
 '.hhSleepDeep262 .hh262Window{display:flex;justify-content:flex-end;gap:6px;margin:0 2px 8px}'+
 '.hhSleepDeep262 .hh262Window button{border:0;border-radius:999px;padding:6px 10px;background:#edf3f8;color:#65758a;font-size:11px;font-weight:900}'+
 '.hhSleepDeep262 .hh262Window button.on{background:var(--a);color:#fff}'+
 '.hh262Hero{display:flex;gap:13px;align-items:center;background:linear-gradient(135deg,#114b78,var(--a));color:#fff;border-radius:20px;padding:17px 18px;box-shadow:0 10px 24px rgba(14,61,96,.12)}'+
 '.hh262Hero .moon{font-size:28px}.hh262Hero small{display:block;font-size:9px;font-weight:900;letter-spacing:.08em;opacity:.82}.hh262Hero b{display:block;font-size:29px;line-height:1.08;margin:2px 0 6px}.hh262Hero span{font-size:10px;font-weight:800;opacity:.9}'+
 '.hh262Meta{display:flex;gap:7px;flex-wrap:wrap;margin:9px 1px 10px}.hh262Meta span{background:#eef4f8;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:850;color:#587086}'+
 '.hh262Timeline{display:flex;height:20px;border-radius:999px;overflow:hidden;background:#edf2f6;margin:4px 2px 5px;box-shadow:inset 0 0 0 1px rgba(90,110,130,.05)}'+
 '.hh262Timeline i{display:block;min-width:1px;height:100%}.hh262Timeline i.awake{background:#f3a2ae}.hh262Timeline i.light{background:#a9d2f1}.hh262Timeline i.deep{background:#4e86d8}.hh262Timeline i.rem{background:#dab0de}.hh262Timeline i.sleep{background:#7db6e6}'+
 '.hh262Times{display:flex;justify-content:space-between;font-size:9px;color:#7a8a99;margin:0 3px 10px}'+
 '.hh262StageGrid,.hh262VitalGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}.hh262StageGrid div,.hh262VitalGrid div{background:#f6f9fb;border-radius:13px;padding:9px 7px;min-width:0}.hh262StageGrid small,.hh262VitalGrid small{display:block;font-size:8px;font-weight:900;color:#7a8998}.hh262StageGrid b,.hh262VitalGrid b{display:block;font-size:15px;margin-top:3px;color:#173f60}.hh262StageGrid em{display:block;font-style:normal;font-size:8px;color:#8b98a5;margin-top:1px}'+
 '.hh262Details{background:#fff;border-radius:17px;padding:13px 14px;margin-top:10px;box-shadow:0 5px 18px rgba(28,63,87,.06)}.hh262DetailsHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.hh262DetailsHead small{font-size:9px;font-weight:900;letter-spacing:.06em;color:#7c8b99}.hh262DetailsHead b{font-size:14px;color:#173f60}.hh262DetailsHead span{font-size:9px;color:#8696a4}'+
 '.hh262NoExtra{margin-top:9px;padding:9px 10px;border-radius:12px;background:#f6f9fb;color:#738493;font-size:10px;line-height:1.35}'+
 '@media(max-width:430px){.hh262StageGrid,.hh262VitalGrid{grid-template-columns:repeat(2,1fr)}.hh262Hero b{font-size:27px}}';
 document.head.appendChild(s);
}

function pct(min,total){return total>0?Math.round((min||0)/total*100):0}
function timelineHtml(a){
 var span=a.end-a.start;if(!(span>0))return '';
 var seg=a.segments.map(function(x){
  var left=Math.max(0,(x.start-a.start)/span*100),right=Math.min(100,(x.end-a.start)/span*100),w=Math.max(.35,right-left);
  return '<i class="'+esc(x.cls)+'" style="width:'+w.toFixed(2)+'%" title="'+esc(x.label)+' · '+fmtTime(x.start)+'–'+fmtTime(x.end)+'"></i>';
 }).join('');
 return '<div class="hh262Timeline">'+seg+'</div><div class="hh262Times"><span>'+fmtTime(a.start)+'</span><span>'+fmtTime(a.end)+'</span></div>';
}
function stageGridHtml(a){
 var sm=a.stageMins,known=(sm[4]||0)+(sm[5]||0)+(sm[6]||0)+(sm[1]||0)+(sm[3]||0);
 var denom=known>0?known:a.span;
 function cell(label,k){var m=k==='awake'?a.awakeMinutes:(sm[k]||0);return '<div><small>'+label+'</small><b>'+pct(m,denom)+'%</b><em>'+durText(m)+'</em></div>'}
 return '<div class="hh262StageGrid">'+cell('KÖNNYŰ',4)+cell('MÉLY',5)+cell('REM',6)+cell('ÉBREN','awake')+'</div>';
}
function vitalsHtml(a){
 var out='';
 if(a.hr){out+='<div><small>❤️ ÁTLAG PULZUS</small><b>'+a.hr.avg+' bpm</b></div><div><small>↕ PULZUSTARTOMÁNY</small><b>'+a.hr.min+'–'+a.hr.max+'</b></div>'}
 if(a.spo){out+='<div><small>🫁 ÁTLAG SpO₂</small><b>'+a.spo.avg.toFixed(1)+'%</b></div><div><small>↓ MIN. SpO₂</small><b>'+a.spo.min.toFixed(1)+'%</b></div>'}
 return out?'<div class="hh262VitalGrid">'+out+'</div>':'<div class="hh262NoExtra">Ehhez az éjszakához most nincs időbélyegzett pulzus- vagy SpO₂-adat a szinkronizált Health Connect csomagban.</div>';
}
function blockHtml(a){
 var interruptions=Math.max(0,a.sessions.length-1);
 return '<div class="hhSleepDeep262" id="hhSleepDeep262">'+
  '<div class="hh262Window"><button class="'+(sleepWindowHours===12?'on':'')+'" onclick="hhSleepDeepWindow262(12)">12 óra</button><button class="'+(sleepWindowHours===24?'on':'')+'" onclick="hhSleepDeepWindow262(24)">24 óra</button></div>'+
  '<div class="hh262Hero"><div class="moon">🌙</div><div><small>LEGUTÓBBI ÉJSZAKA</small><b>'+durText(a.sleepMinutes)+'</b><span>'+fmtTime(a.start)+' → '+fmtTime(a.end)+' · '+fmtDate(a.end)+'</span></div></div>'+
  '<div class="hh262Meta"><span>🛏 Ablak: '+durText(a.span)+'</span><span>⚡ Hatékonyság: '+a.efficiency+'%</span><span>👁 Ébren: '+durText(a.awakeMinutes)+'</span>'+(interruptions?'<span>↪ '+interruptions+' megszakítás</span>':'')+'</div>'+
  timelineHtml(a)+stageGridHtml(a)+
  '<div class="hh262Details"><div class="hh262DetailsHead"><div><small>ÉJSZAKAI ADATOK</small><b>Pulzus és oxigénszint</b></div><span>Health Connect</span></div>'+vitalsHtml(a)+'</div>'+
 '</div>';
}

function removeLegacyLatest(surface){
 var hero=surface.querySelector('.hhSleepHeroCard');
 if(!hero)return null;
 var nodes=[hero],n=hero.nextElementSibling,guard=0;
 while(n&&guard++<5){
  if(n.classList.contains('hhSleepCard'))break;
  nodes.push(n);n=n.nextElementSibling;
 }
 return {anchor:hero,nodes:nodes};
}

async function enhance(profileOverride){
 var page=document.getElementById('hhSleepPage');if(!page)return;
 var seq=++enhanceSeq,profile=profileKey(profileOverride);
 var surface=page.querySelector('.hhSleepSurface');if(!surface)return;
 var legacy=removeLegacyLatest(surface);if(!legacy)return;
 enhancing=true;
 try{
  ensureStyle();
  var raw=await loadBundle(profile);if(seq!==enhanceSeq)return;
  var records=raw&&raw.records||{};
  var a=analyze(records,sleepWindowHours);
  if(!a)return;
  var wrap=document.createElement('div');wrap.innerHTML=blockHtml(a);var block=wrap.firstElementChild;
  surface.insertBefore(block,legacy.anchor);
  legacy.nodes.forEach(function(x){if(x&&x.parentNode===surface)x.remove()});
  document.documentElement.dataset.healthhubSleepDeep='1.262';
 }catch(e){console.warn('HealthHub Sleep v262 enhance',e)}finally{enhancing=false}
}

window.hhSleepDeepWindow262=function(hours){
 sleepWindowHours=Number(hours)===12?12:24;
 localStorage.setItem('hh-sleep-window-hours',String(sleepWindowHours));
 if(typeof window.hhRenderSleep==='function')return window.hhRenderSleep(profileKey());
 var old=document.getElementById('hhSleepDeep262');if(old)old.remove();
 return enhance();
};

/* Preserve v170 rendering and enhance only after it has completed. */
var baseRender=window.hhRenderSleep;
if(typeof baseRender==='function'){
 window.hhRenderSleep=async function(profile){
  var r=await baseRender.apply(this,arguments);
  await enhance(profile);
  return r;
 };
}
var baseOpen=window.hhOpenSleep;
if(typeof baseOpen==='function'){
 window.hhOpenSleep=function(){
  var r=baseOpen.apply(this,arguments);
  setTimeout(function(){enhance()},80);
  setTimeout(function(){enhance()},350);
  return r;
 };
}

/* Some old handlers call the lexical v170 render directly. Watch only while the
   Sleep page is visible and debounce so those paths still receive v262. */
var page=document.getElementById('hhSleepPage');
if(page&&window.MutationObserver){
 var mo=new MutationObserver(function(){
  if(enhancing||document.getElementById('hhSleepDeep262'))return;
  clearTimeout(observerTimer);observerTimer=setTimeout(function(){enhance()},60);
 });
 mo.observe(page,{childList:true,subtree:true});
}

/* Profile/cloud changes are already routed through the canonical v260 renderer. */

setTimeout(function(){enhance()},250);
window.HH_LIVE_BUILD='v262-deep-sleep-night-analysis';
})();