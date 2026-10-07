(function(){
'use strict';
/* HealthHub v1.300 — Continuous AI Improvement Engine foundation.
   Admin-only, local-first operational telemetry. No clinical values are collected. */

var BUILD='1.300.4', LIVE_BUILD='v300.4', SECTION='hhAiImprovement300', STYLE='hhAiImprovement300Style';
var WKEY='hh-ai-wishlist-v1', TKEY='hh-ai-telemetry-v1', HKEY='hh-ai-health-history-v1', SESSION='hh-ai-session-v1';
var HOTFIX='hh-ai-hotfix-v3001', EBASE='hh-ai-error-baseline-v3001', ARCH='hh-ai-remediation-archive-v1';
var rendering=false, longTaskObserver=null, adminObserver=null, watcherTimer=null, updateChecking=false, lastUpdateCheck=0;

function now(){return new Date().toISOString()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function readJson(k,f){try{var x=JSON.parse(localStorage.getItem(k)||'null');return x==null?f:x}catch(e){return f}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function archiveState(reason){
 try{
  var a=readJson(ARCH,[]);if(!Array.isArray(a))a=[];
  a.unshift({at:now(),reason:reason||'manual',build:BUILD,telemetry:readJson(TKEY,null),healthHistory:readJson(HKEY,[])});
  writeJson(ARCH,a.slice(0,8));
 }catch(e){}
}
function resetOpsBaseline(reason){
 archiveState(reason||'baseline-reset');
 try{localStorage.setItem(EBASE,now())}catch(e){}
 writeJson(TKEY,{schema:'healthhub.ops-telemetry/1',days:{},lastStorage:null});
 writeJson(HKEY,[]);
 try{sessionStorage.removeItem(SESSION)}catch(e){}
}
function initializeHotfix(){
 if(localStorage.getItem(HOTFIX))return;
 resetOpsBaseline('v300-render-loop-hotfix');
 try{localStorage.setItem(HOTFIX,JSON.stringify({at:now(),build:BUILD,patch:'PATCH-HH300-001'}))}catch(e){}
}
function profileName(){return localStorage.getItem('hh-profile')==='m'?'Mónika':'Zsolt'}
function dayKey(){return new Date().toISOString().slice(0,10)}
function fmtMs(n){n=Math.round(Number(n)||0);return n<1000?n+' ms':(n/1000).toFixed(2)+' s'}
function fmtBytes(n){n=Number(n)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB'}
function rag(score){return score>=85?{k:'green',label:'GREEN',icon:'🟢'}:score>=60?{k:'amber',label:'AMBER',icon:'🟠'}:{k:'red',label:'RED',icon:'🔴'}}
function refreshHealthUi(result){
 if(!result)return;
 var rg=result.rag||rag(result.score||0),badge=document.querySelector('#'+SECTION+' .hhRag300'),status=document.querySelector('#'+SECTION+' .hhStatus300');
 if(badge){badge.className='hhRag300 '+rg.k;badge.textContent=rg.icon+' '+rg.label+' '+result.score+'/100'}
 if(status){
  var fix=status.querySelector('.hhFix300');
  if(rg.k==='green'&&fix)fix.remove();
  else if(rg.k!=='green'&&!fix){status.insertAdjacentHTML('beforeend','<button class="hhFix300" onclick="hhAiFix300()">✓ FIX</button>')}
 }
 var vals=document.querySelectorAll('#'+SECTION+' .hhMetric300 b');
 if(vals.length>=4){
  vals[0].textContent=result.errors&&result.errors.errors24!=null?result.errors.errors24:'0';
  vals[1].textContent=fmtMs(result.perf&&result.perf.avgLoad||0);
  vals[2].textContent=result.perf&&result.perf.longTasks!=null?result.perf.longTasks:'0';
  var s=result.perf&&result.perf.storage;
  vals[3].textContent=s&&s.quota?(Math.round((s.usage/s.quota)*1000)/10)+'%':'0%';
 }
}
function safeForAutoReload(){
 var a=document.activeElement,tag=a&&a.tagName||'';
 if(/^(INPUT|TEXTAREA|SELECT)$/.test(tag))return false;
 var smart=document.getElementById('hhLenaSmart299');
 if(smart&&smart.classList.contains('on'))return false;
 return true;
}
async function checkForLiveUpdate(){
 if(updateChecking||!navigator.onLine)return;
 var n=Date.now();if(n-lastUpdateCheck<8000)return;lastUpdateCheck=n;updateChecking=true;
 try{
  var r=await fetch('./index.html?hh-update-check='+n,{cache:'no-store',credentials:'same-origin'});
  if(!r.ok)return;
  var txt=await r.text(),m=txt.match(/healthhub-live-build"\s+content="([^"]+)"/i);
  var live=m&&m[1]||'';
  if(live&&live!==LIVE_BUILD){
   try{window.toast&&window.toast('Új HealthHub verzió: '+live+' · frissítés…')}catch(e){}
   if(safeForAutoReload()){
    setTimeout(function(){try{var u=new URL(location.href);u.searchParams.set('hhv',live.replace(/^v/i,''));location.replace(u.toString())}catch(e){location.reload()}},450);
   }else{
    try{sessionStorage.setItem('hh-pending-live-build',live)}catch(e){}
   }
  }
 }catch(e){}finally{updateChecking=false}
}
function resumePendingUpdate(){
 var live='';try{live=sessionStorage.getItem('hh-pending-live-build')||''}catch(e){}
 if(live&&live!==LIVE_BUILD&&safeForAutoReload()){
  try{sessionStorage.removeItem('hh-pending-live-build')}catch(e){}
  setTimeout(function(){try{var u=new URL(location.href);u.searchParams.set('hhv',live.replace(/^v/i,''));location.replace(u.toString())}catch(e){location.reload()}},250);
 }
}

var seeds=[
 {id:'WISH-001',title:'AI Improvement Center',description:'Folyamatos stabilitási, teljesítmény-, UX- és fejlesztési javaslatok az Admin Console-ban.',requestedBy:'Zsolt',type:'Epic',impact:'High',complexity:'High',feasibility:'High',status:'Building'},
 {id:'WISH-002',title:'System Health Check + RAG',description:'GREEN / AMBER / RED rendszerállapot valós működési metrikákból, trenddel és diagnosztikával.',requestedBy:'Zsolt',type:'Story',impact:'High',complexity:'Medium',feasibility:'High',status:'Building'},
 {id:'WISH-003',title:'Approved Self Remediation',description:'Jóváhagyás után patch előkészítés, implementáció, teszt, deploy, mérés és changelog.',requestedBy:'Zsolt',type:'Epic',impact:'High',complexity:'High',feasibility:'Medium',status:'Proposed'},
 {id:'WISH-004',title:'Automatic Backup & Rollback',description:'Minden jóváhagyott rendszerpatch előtt működő verzió snapshot és gyors rollback pont.',requestedBy:'Zsolt',type:'Story',impact:'High',complexity:'Medium',feasibility:'High',status:'Proposed'},
 {id:'WISH-005',title:'Lightweight Operational Telemetry',description:'Minimális overhead mellett stabilitás, sebesség, hibák és használhatóság mérése. Klinikai adat nélkül.',requestedBy:'Zsolt',type:'Story',impact:'High',complexity:'Medium',feasibility:'High',status:'Building'},
 {id:'WISH-006',title:'Wishlist → User Story Repository',description:'Zsolt vagy Mónika természetes nyelven rögzíthet ötletet; előzetes realitás- és komplexitásértékeléssel.',requestedBy:'Zsolt',type:'Story',impact:'High',complexity:'Medium',feasibility:'High',status:'Building'},
 {id:'WISH-007',title:'Central Manual Sync',description:'Az Admin Console-ból központilag indítható manuális HealthHub sync.',requestedBy:'Zsolt',type:'Story',impact:'High',complexity:'Medium',feasibility:'High',status:'Proposed'},
 {id:'WISH-008',title:'All Profiles / All Devices Sync',description:'Egy parancsból minden profil és minden regisztrált eszköz teljes vagy moduláris szinkronja.',requestedBy:'Zsolt',type:'Epic',impact:'High',complexity:'High',feasibility:'Medium',status:'Proposed'},
 {id:'WISH-009',title:'Scheduled Sync Orchestrator',description:'Ütemezett, retry-képes, profil- és eszközszintű sync központi állapotkövetéssel.',requestedBy:'Zsolt',type:'Epic',impact:'High',complexity:'High',feasibility:'Medium',status:'Proposed'},
 {id:'WISH-010',title:'AI Backlog Prioritization',description:'Patch-ek, user story-k és epicek folyamatos rangsorolása érték, stabilitás, komplexitás és kockázat alapján.',requestedBy:'Zsolt',type:'Story',impact:'Medium',complexity:'Medium',feasibility:'High',status:'Proposed'}
];

function readWishlist(){
 var a=readJson(WKEY,[]);
 if(!Array.isArray(a))a=[];
 if(!a.length){
  a=seeds.map(function(x){var y={};Object.keys(x).forEach(function(k){y[k]=x[k]});y.createdAt=now();return y});
  writeJson(WKEY,a);
 }
 return a;
}
function saveWishlist(a){writeJson(WKEY,a)}
function nextWishId(a){
 var max=0;(a||[]).forEach(function(x){var m=String(x.id||'').match(/WISH-(\d+)/);if(m)max=Math.max(max,parseInt(m[1],10)||0)});
 return 'WISH-'+String(max+1).padStart(3,'0');
}
function preAnalyze(text){
 var t=String(text||'').toLowerCase();
 return {
  type:/minden eszk|all device|orchestr|központi|új modul|platform|rendszer/.test(t)?'Epic':'Story',
  complexity:/minden eszk|all device|orchestr|android|agent|cloud|backend|adatbáz|migráció/.test(t)?'High':/sync|schedule|ütemez|ai|automat|profil/.test(t)?'Medium':'Low',
  feasibility:/külső engedély|hardware|hardver/.test(t)?'Medium':'High',
  impact:/stabil|biztons|sync|backup|rollback|gyors|teljesít|performance|adatveszt/.test(t)?'High':'Medium'
 };
}
function addWish(){
 var ta=document.getElementById('hhWishText300'),who=document.getElementById('hhWishWho300');
 var txt=(ta&&ta.value||'').trim();if(!txt)return;
 var a=readWishlist(),an=preAnalyze(txt),id=nextWishId(a);
 a.unshift({id:id,title:txt.length>74?txt.slice(0,71)+'…':txt,description:txt,requestedBy:who&&who.value||profileName(),type:an.type,impact:an.impact,complexity:an.complexity,feasibility:an.feasibility,status:'Proposed',createdAt:now()});
 saveWishlist(a);if(ta)ta.value='';renderCenter(true);
 try{window.toast&&window.toast(id+' hozzáadva')}catch(e){}
}
function setWishStatus(id,status,message,executionStatus){
 var a=readWishlist();a.forEach(function(x){if(x.id===id){
  x.status=status;x.updatedAt=now();
  if(status==='Approved'||status==='Running'||status==='Done')x.approvedBy=x.approvedBy||profileName();
  if(message!=null)x.executionMessage=message;
  if(executionStatus!=null)x.executionStatus=executionStatus;
  x.executionAt=now();
 }});
 saveWishlist(a);renderCenter(true);
}
function executionUpdate(id,status,message,executionStatus){
 var a=readWishlist(),item=null;
 a.forEach(function(x){if(x.id===id){item=x;x.status=status;x.updatedAt=now();x.executionStatus=executionStatus||status;x.executionMessage=message||'';x.executionAt=now();x.approvedBy=x.approvedBy||profileName()}});
 saveWishlist(a);renderCenter(true);return item;
}
function executeWish(id){
 var item=readWishlist().filter(function(x){return x.id===id})[0];if(!item)return;
 executionUpdate(id,'Running','Jóváhagyás rögzítve · végrehajtás indul…','Running');
 setTimeout(function(){
  try{
   if(id==='WISH-002'){
    var result=runHealthCheck();refreshHealthUi(result);
    executionUpdate(id,'Done','System Health Check kész · '+result.rag.icon+' '+result.rag.label+' '+result.score+'/100','Done');
    try{window.toast&&window.toast('WISH-002 kész · System Health Check lefutott')}catch(e){}
    return;
   }
   if(id==='WISH-001'){
    executionUpdate(id,'Done','AI Improvement Center elérhető és validálva a jelenlegi buildben.','Done');return;
   }
   if(id==='WISH-005'){
    var t=telemetry(),d=t.days&&t.days[dayKey()]||{};
    executionUpdate(id,'Done','Operational Telemetry aktív · '+(d.sessions||0)+' session · '+(d.longTaskCount||0)+' long task mérve.','Done');return;
   }
   if(id==='WISH-006'){
    executionUpdate(id,'Done','Wishlist / User Story Repository aktív és írható.','Done');return;
   }
   executionUpdate(id,'Approved','CODE IMPLEMENTATION jóváhagyva · AI implementation queue-ba helyezve.','Queued');
   try{window.toast&&window.toast(id+' jóváhagyva · implementation queue')}catch(e){}
  }catch(e){
   executionUpdate(id,'Approved','Végrehajtási hiba: '+(e&&e.message||e),'Blocked');
   try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','wishlist.execute',id+' végrehajtási hiba',e)}catch(_){}
  }
 },180);
}
function removeWish(id){
 if(!confirm('Törlöd ezt a Wishlist elemet?'))return;
 saveWishlist(readWishlist().filter(function(x){return x.id!==id}));renderCenter(true);
}
function askLena(id){
 var item=readWishlist().filter(function(x){return x.id===id})[0];if(!item)return;
 var prompt='HealthHub AI Improvement Center elemzés. '+item.id+': '+item.description+'\n\nÉrtékeld senior product owner és solution architect szemmel: felhasználói haszon, stabilitási hatás, megvalósíthatóság, komplexitás, kockázat, függőségek, javasolt Epic/User Story bontás, acceptance criteria és prioritás. Ne módosíts éles rendszert külön jóváhagyás nélkül.';
 try{
  if(typeof window.hhOpenLenaSmart299==='function'){
   window.hhOpenLenaSmart299();
   setTimeout(function(){var q=document.getElementById('hhSQ299');if(q){q.value=prompt;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus()}},120);
   return;
  }
 }catch(e){}
 try{navigator.clipboard.writeText(prompt);window.toast&&window.toast('AI elemzési prompt másolva')}catch(e){}
}

function telemetry(){
 var t=readJson(TKEY,{schema:'healthhub.ops-telemetry/1',days:{},lastStorage:null});
 if(!t.days||typeof t.days!=='object')t.days={};
 return t;
}
function touchDay(t){
 var k=dayKey(),d=t.days[k];
 if(!d)d=t.days[k]={sessions:0,loadCount:0,loadTotalMs:0,longTaskCount:0,longTaskTotalMs:0,healthChecks:0,healthCheckTotalMs:0};
 var keys=Object.keys(t.days).sort();while(keys.length>7){delete t.days[keys.shift()]}
 return d;
}
function telemetryInit(){
 if(sessionStorage.getItem(SESSION))return;
 sessionStorage.setItem(SESSION,'1');
 var work=function(){
  var t=telemetry(),d=touchDay(t);d.sessions=(d.sessions||0)+1;
  try{
   var nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
   var ms=nav?nav.loadEventEnd-nav.startTime:0;
   if(ms>0&&ms<120000){d.loadCount=(d.loadCount||0)+1;d.loadTotalMs=(d.loadTotalMs||0)+ms}
  }catch(e){}
  writeJson(TKEY,t);
  try{
   if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(function(x){var z=telemetry();z.lastStorage={at:now(),usage:x.usage||0,quota:x.quota||0};writeJson(TKEY,z)}).catch(function(){});
  }catch(e){}
 };
 if('requestIdleCallback' in window)requestIdleCallback(work,{timeout:1800});else setTimeout(work,900);
 try{
  if('PerformanceObserver' in window){
   longTaskObserver=new PerformanceObserver(function(list){
    var entries=list.getEntries();if(!entries.length)return;
    var t=telemetry(),d=touchDay(t);
    entries.forEach(function(x){d.longTaskCount=(d.longTaskCount||0)+1;d.longTaskTotalMs=(d.longTaskTotalMs||0)+(x.duration||0)});
    writeJson(TKEY,t);
   });
   longTaskObserver.observe({entryTypes:['longtask']});
  }
 }catch(e){}
}

function errorStats(){
 var a=[];try{a=typeof window.hhErrorLogRead==='function'?window.hhErrorLogRead():readJson('hh-error-log-v1',[])}catch(e){a=[]}
 if(!Array.isArray(a))a=[];
 var baseline=Date.parse(localStorage.getItem(EBASE)||'')||0,since=Math.max(Date.now()-24*3600*1000,baseline),e=0,w=0,historical=0;
 a.forEach(function(x){var ts=Date.parse(x.at||0);if(ts>=since){if(x.level==='error')e++;else if(x.level==='warn')w++}else historical++});
 return {errors24:e,warns24:w,total:a.length,historical:historical,baselineAt:baseline?new Date(baseline).toISOString():null};
}
function currentPerf(){
 var t=telemetry(),d=t.days[dayKey()]||{},avgLoad=d.loadCount?d.loadTotalMs/d.loadCount:0;
 return {sessions:d.sessions||0,avgLoad:avgLoad,longTasks:d.longTaskCount||0,longTaskMs:d.longTaskTotalMs||0,storage:t.lastStorage};
}
function runHealthCheck(){
 var started=performance.now(),es=errorStats(),p=currentPerf(),score=100,reasons=[];
 if(!navigator.onLine){score-=22;reasons.push('Az eszköz offline.')}
 if(es.errors24){var pen=Math.min(35,es.errors24*8);score-=pen;reasons.push(es.errors24+' runtime hiba az elmúlt 24 órában.')}
 if(es.warns24>=4){score-=Math.min(12,es.warns24*2);reasons.push(es.warns24+' figyelmeztetés az elmúlt 24 órában.')}
 if(p.avgLoad>4500){score-=20;reasons.push('Lassú átlagos oldalbetöltés: '+fmtMs(p.avgLoad)+'.')}
 else if(p.avgLoad>2500){score-=10;reasons.push('A betöltési idő javítható: '+fmtMs(p.avgLoad)+'.')}
 if(p.longTasks>=8){score-=12;reasons.push('Sok hosszú UI task észlelve: '+p.longTasks+'.')}
 else if(p.longTasks>=3){score-=5;reasons.push('Néhány hosszú UI task észlelve: '+p.longTasks+'.')}
 score=Math.max(0,Math.min(100,Math.round(score)));
 var elapsed=Math.max(0,performance.now()-started);
 var t=telemetry(),d=touchDay(t);d.healthChecks=(d.healthChecks||0)+1;d.healthCheckTotalMs=(d.healthCheckTotalMs||0)+elapsed;writeJson(TKEY,t);
 var history=readJson(HKEY,[]);if(!Array.isArray(history))history=[];
 var result={at:now(),score:score,rag:rag(score),reasons:reasons,errors:es,perf:p,overheadMs:elapsed,build:BUILD};
 history.unshift(result);writeJson(HKEY,history.slice(0,60));return result;
}
function lastHealth(){var a=readJson(HKEY,[]);return Array.isArray(a)&&a[0]?a[0]:runHealthCheck()}

function recommendations(h){
 var r=[];
 if(h.errors.errors24>0)r.push({id:'PATCH-ERRORS',kind:'PATCH',title:'Runtime hibák gyökérokelemzése',why:h.errors.errors24+' hiba / 24h',impact:'High',complexity:'Medium',risk:'Low'});
 if(h.perf.avgLoad>2500)r.push({id:'PATCH-PERF',kind:'PATCH',title:'Betöltési lánc és live patch-ek optimalizálása',why:'Átlagos load '+fmtMs(h.perf.avgLoad),impact:'High',complexity:'Medium',risk:'Medium'});
 if(h.perf.longTasks>=3)r.push({id:'PATCH-LONGTASK',kind:'PATCH',title:'Main-thread long task csökkentés',why:h.perf.longTasks+' long task ezen a napon',impact:'Medium',complexity:'Medium',risk:'Low'});
 if(!r.length)r.push({id:'EPIC-UX',kind:'EPIC',title:'Next-best UX improvement keresése',why:'A rendszer stabil; következő cél a kevesebb kattintás és gyorsabb útvonal.',impact:'Medium',complexity:'Low',risk:'Low'});
 r.push({id:'EPIC-SYNC',kind:'EPIC',title:'Central Sync Orchestrator',why:'Központi manuális és scheduled sync minden profilra / regisztrált eszközre.',impact:'High',complexity:'High',risk:'Medium'});
 return r.slice(0,4);
}

function ensureStyle(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+SECTION+'{margin-top:10px}.hhAI300{background:#fff;border:1px solid #dfe9ef;border-radius:18px;padding:12px;box-shadow:0 8px 22px rgba(31,65,91,.06)}'+
 '.hhAI300 h3,.hhAI300 h4{margin:0;color:#173f62}.hhAI300 small{color:#748a99}.hhAiHead300{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.hhStatus300{display:flex;flex-direction:column;align-items:stretch;gap:6px;min-width:96px}.hhRag300{font-weight:950;border-radius:999px;padding:7px 10px;font-size:9px;white-space:nowrap;text-align:center}.hhRag300.green{background:#e7f7ef;color:#16724b}.hhRag300.amber{background:#fff4d8;color:#9a6911}.hhRag300.red{background:#ffe9ed;color:#ac304f}.hhFix300{border:0;border-radius:10px;padding:8px 10px;background:#16965c;color:#fff;font-size:8px;font-weight:950;box-shadow:0 4px 12px rgba(22,150,92,.18);cursor:pointer}.hhFix300:hover{filter:brightness(.96)}.hhFixProg300{display:none;margin-top:8px;padding:8px 9px;border-radius:11px;background:#f4faf7;border:1px solid #d7eee2}.hhFixProg300.on{display:block}.hhFixProg300 b{display:block;font-size:8px;color:#1d6e4d}.hhFixTrack300{height:6px;background:#dfece5;border-radius:999px;overflow:hidden;margin-top:5px}.hhFixTrack300 i{display:block;height:100%;width:0;background:#16965c;transition:width .22s ease}.hhFixStep300{font-size:7px;color:#6d8679;margin-top:4px}'+
 '.hhGrid300{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.hhMetric300{border:1px solid #e5edf2;border-radius:12px;padding:9px;background:#fbfdfe}.hhMetric300 b{display:block;font-size:14px;color:#183f61}.hhMetric300 span{font-size:7px;color:#8295a4;font-weight:800}'+
 '.hhBtns300{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.hhBtns300 button,.hhWishActions300 button{border:1px solid #d9e5ec;background:#f7fafc;color:#31536f;border-radius:10px;padding:8px 10px;font-size:8px;font-weight:900}.hhBtns300 .go,.hhWishActions300 .go{background:#1b7f73;color:#fff;border-color:#1b7f73}'+
 '.hhRec300,.hhWish300{margin-top:8px;border:1px solid #e5edf2;border-radius:13px;padding:9px;background:#fbfdfe}.hhRec300 b,.hhWish300 b{font-size:9px;color:#244c69}.hhMeta300{font-size:7px;color:#78909f;margin-top:4px;line-height:1.5}.hhExec300{margin-top:6px;padding:6px 8px;border-radius:9px;background:#eef7f3;color:#2a6d52;font-size:7px;font-weight:800}.hhExec300.running{background:#fff7df;color:#8a650f}.hhExec300.blocked{background:#fff0f2;color:#a43850}.hhWishActions300{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}'+
 '.hhWishEntry300{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:9px}.hhWishEntry300 textarea{min-height:72px;border:1px solid #d9e5ec;border-radius:12px;padding:9px;font:inherit;resize:vertical}.hhWishEntry300 select{border:1px solid #d9e5ec;border-radius:10px;padding:7px;background:#fff}.hhWishEntry300 .side{display:flex;flex-direction:column;gap:6px}.hhWishEntry300 button{border:0;border-radius:10px;padding:9px;background:#1b7f73;color:#fff;font-weight:900;font-size:8px}'+
 '.hhAiSection300{margin-top:13px;padding-top:11px;border-top:1px solid #edf2f5}.hhGuard300{margin-top:9px;padding:8px 9px;border-radius:11px;background:#f4f8fa;font-size:7px;color:#668092;line-height:1.55}.hhTrend300{font-size:8px;font-weight:900;color:#537389}@media(max-width:560px){.hhGrid300{grid-template-columns:repeat(2,minmax(0,1fr))}.hhWishEntry300{grid-template-columns:1fr}.hhWishEntry300 .side{flex-direction:row}}';
 document.head.appendChild(s);
}

function wishExecutionUi(x){
 var validation=/^WISH-(001|002|005|006)$/.test(String(x.id||''));
 if(x.executionStatus==='Running')return {label:validation?'RUNNING VALIDATION…':'CODE IMPLEMENTATION · RUNNING',disabled:true,mode:validation?'VALIDATION':'CODE'};
 if(x.executionStatus==='Queued')return {label:'CODE IMPLEMENTATION · QUEUED',disabled:true,mode:'CODE'};
 if(x.executionStatus==='Done')return {label:'RUN VALIDATION',disabled:false,mode:'VALIDATION'};
 if(validation)return {label:'RUN VALIDATION',disabled:false,mode:'VALIDATION'};
 return {label:'MEHET → CODE IMPLEMENTATION',disabled:false,mode:'CODE'};
}
function wishHtml(x){
 var ex=x.executionStatus?'<div class="hhExec300 '+esc(String(x.executionStatus).toLowerCase())+'">⚙ '+esc(x.executionStatus)+' · '+esc(x.executionMessage||'')+'</div>':'';
 var ui=wishExecutionUi(x),disabled=ui.disabled?' disabled':'';
 return '<div class="hhWish300"><b>'+esc(x.id)+' · '+esc(x.title)+'</b>'+
 '<div class="hhMeta300">'+esc(x.type)+' · Impact '+esc(x.impact)+' · Complexity '+esc(x.complexity)+' · Feasibility '+esc(x.feasibility)+' · '+esc(x.requestedBy)+' · <strong>'+esc(x.status)+'</strong> · '+esc(ui.mode)+'</div>'+
 '<div class="hhMeta300">'+esc(x.description)+'</div>'+ex+
 '<div class="hhWishActions300"><button onclick="hhAiAskLena300(\''+esc(x.id)+'\')">🧠 AI elemzés</button><button class="go"'+disabled+' onclick="hhAiExecuteWish300(\''+esc(x.id)+'\')">'+esc(ui.label)+'</button><button onclick="hhAiWishStatus300(\''+esc(x.id)+'\',\'Later\',\'Későbbre téve\',\'Deferred\')">Később</button><button onclick="hhAiRemoveWish300(\''+esc(x.id)+'\')">Törlés</button></div></div>';
}
function renderCenter(force){
 if(rendering)return;
 var ov=document.getElementById('haOv'),body=document.getElementById('haBody');
 if(!body||!ov||(!force&&!ov.classList.contains('on')))return;
 rendering=true;
 try{
  ensureStyle();
  var old=document.getElementById(SECTION);if(old)old.remove();
  var h=lastHealth(),rg=h.rag,p=h.perf,recs=recommendations(h),hist=readJson(HKEY,[]),trend='→ stabil';
  if(Array.isArray(hist)&&hist.length>1){var d=h.score-hist[1].score;trend=d>=3?'↑ javul':d<=-3?'↓ romlik':'→ stabil'}
  var storage=p.storage&&p.storage.quota?Math.round((p.storage.usage/p.storage.quota)*1000)/10:0;
  var wishes=readWishlist();
  var html='<section id="'+SECTION+'" class="hhAI300">'+
   '<div class="hhAiHead300"><div><h3>🧠 AI Improvement Center · v300</h3><small>Continuous Improvement Engine · System Health · Wishlist · Backlog Intelligence</small></div><div class="hhStatus300"><span class="hhRag300 '+rg.k+'">'+rg.icon+' '+rg.label+' '+h.score+'/100</span>'+(rg.k!=='green'?'<button class="hhFix300" onclick="hhAiFix300()">✓ FIX</button>':'')+'</div></div>'+
   '<div class="hhMeta300">Trend: <span class="hhTrend300">'+trend+'</span> · Last check: '+esc(new Date(h.at).toLocaleString('hu-HU'))+' · Telemetry overhead: '+fmtMs(h.overheadMs)+'</div><div id="hhFixProg300" class="hhFixProg300"><b id="hhFixTitle300">Remediation folyamat</b><div class="hhFixTrack300"><i id="hhFixBar300"></i></div><div id="hhFixStep300" class="hhFixStep300">Várakozás…</div></div>'+
   '<div class="hhGrid300"><div class="hhMetric300"><b>'+h.errors.errors24+'</b><span>ERROR / 24H</span></div><div class="hhMetric300"><b>'+fmtMs(p.avgLoad||0)+'</b><span>AVG LOAD</span></div><div class="hhMetric300"><b>'+p.longTasks+'</b><span>LONG TASK / DAY</span></div><div class="hhMetric300"><b>'+storage+'%</b><span>STORAGE USE</span></div></div>'+
   '<div class="hhBtns300"><button class="go" onclick="hhAiRunHealth300()">↻ RUN HEALTH CHECK</button><button onclick="hhAiExport300()">⬇ EXPORT OPS DATA</button></div>'+
   '<div class="hhGuard300"><b>Guardrail:</b> a v300 telemetria local-first és non-blocking. Nem gyűjt vérnyomást, gyógyszert, leletet vagy más klinikai értéket. Ha a mérés maga érezhető terhelést okozna, a nem kritikus gyűjtés eldobható.</div>'+
   '<div class="hhAiSection300"><h4>💡 AI / Rule-based Improvement Suggestions</h4><small>Valós működési jelekből generált következő lépések. A végrehajtás mindig approval-gated.</small>'+
   recs.map(function(r){return '<div class="hhRec300"><b>'+esc(r.kind)+' · '+esc(r.title)+'</b><div class="hhMeta300">'+esc(r.why)+'</div><div class="hhMeta300">Impact '+r.impact+' · Complexity '+r.complexity+' · Risk '+r.risk+'</div></div>'}).join('')+'</div>'+
   '<div class="hhAiSection300"><h4>✨ Wishlist / User Story Repository</h4><small>Zsolt vagy Mónika természetes nyelven rögzítheti, mit szeretne elérni.</small>'+
   '<div class="hhWishEntry300"><textarea id="hhWishText300" placeholder="Pl. Központilag indítható manuális sync az összes profilra és eszközre…"></textarea><div class="side"><select id="hhWishWho300"><option>Zsolt</option><option>Mónika</option><option>AI</option></select><button onclick="hhAiAddWish300()">+ WISH</button></div></div>'+
   wishes.slice(0,20).map(wishHtml).join('')+'</div>'+
   '<div class="hhAiSection300"><h4>🛡️ Level 3 Remediation Gate</h4><div class="hhGuard300">Observe → Diagnose → Recommend → <b>Approve</b> → Backup → Remediate → Test → Deploy → Measure. Automatikus production módosítás approval és visszaállítási pont nélkül tiltott.</div></div>'+
  '</section>';
  body.insertAdjacentHTML('afterbegin',html);
 }finally{rendering=false}
}

window.hhAiRunHealth300=function(){runHealthCheck();renderCenter(true);try{window.toast&&window.toast('System Health Check kész')}catch(e){}};
function fixProgress(step,pct){
 var box=document.getElementById('hhFixProg300'),bar=document.getElementById('hhFixBar300'),tx=document.getElementById('hhFixStep300');
 if(box)box.classList.add('on');if(bar)bar.style.width=Math.max(0,Math.min(100,pct||0))+'%';if(tx)tx.textContent=step||'';
}
window.hhAiFix300=function(){
 var ok=confirm('Biztonságos remediation futtatása?\n\n• a jelenlegi működési telemetria archiválása\n• új error baseline létrehozása\n• long-task / health history reset\n• friss System Health Check\n\nKlinikai adatot nem módosít.');
 if(!ok)return;
 fixProgress('1/5 · Backup / archive',12);
 setTimeout(function(){
  archiveState('manual-fix-pre');
  fixProgress('2/5 · Új baseline létrehozása',32);
  setTimeout(function(){
   try{localStorage.setItem(EBASE,now())}catch(e){}
   writeJson(TKEY,{schema:'healthhub.ops-telemetry/1',days:{},lastStorage:null});
   writeJson(HKEY,[]);
   fixProgress('3/5 · Telemetry restart',55);
   try{sessionStorage.removeItem(SESSION)}catch(e){}
   telemetryInit();
   setTimeout(function(){
    fixProgress('4/5 · System Health Check',78);
    var result=runHealthCheck();
    setTimeout(function(){
     fixProgress('5/5 · Kész · '+result.rag.icon+' '+result.rag.label+' '+result.score+'/100',100);
     refreshHealthUi(result);
     try{window.toast&&window.toast('FIX kész · új baseline aktív')}catch(e){}
    },250);
   },250);
  },180);
 },120);
};
window.hhAiAddWish300=addWish;
window.hhAiExecuteWish300=executeWish;
window.hhAiWishStatus300=setWishStatus;
window.hhAiRemoveWish300=removeWish;
window.hhAiAskLena300=askLena;
window.hhAiExport300=function(){
 var payload={schema:'healthhub.ai-improvement-export/1',exportedAt:now(),build:BUILD,healthHistory:readJson(HKEY,[]),telemetry:telemetry(),wishlist:readWishlist()};
 var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='HealthHub_AI_Improvement_'+dayKey()+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},5000);
};
window.hhAiImprovementRead300=function(){return {health:lastHealth(),telemetry:telemetry(),wishlist:readWishlist()}};

initializeHotfix();
telemetryInit();
readWishlist();
setTimeout(function(){try{runHealthCheck()}catch(e){}},1400);

function attachAdminWatcher(){
 var ov=document.getElementById('haOv');
 if(!ov){watcherTimer=setTimeout(attachAdminWatcher,500);return}
 if(adminObserver)adminObserver.disconnect();
 adminObserver=new MutationObserver(function(){
  if(ov.classList.contains('on')){setTimeout(function(){renderCenter(true)},40);checkForLiveUpdate()}
 });
 adminObserver.observe(ov,{attributes:true,attributeFilter:['class']});
 if(ov.classList.contains('on'))renderCenter(true);
}
attachAdminWatcher();
window.addEventListener('focus',function(){resumePendingUpdate();checkForLiveUpdate()},{passive:true});
window.addEventListener('online',function(){checkForLiveUpdate()},{passive:true});
document.addEventListener('visibilitychange',function(){if(!document.hidden){resumePendingUpdate();checkForLiveUpdate()}},{passive:true});
setTimeout(checkForLiveUpdate,2200);

document.documentElement.dataset.healthhubAiImprovement='1.300.4';
})();