(function(){
'use strict';
/* HealthHub v303.1 — on-device performance trace.
   Technical metadata only. No clinical values or document contents are collected. */

var BUILD='1.303.2', SECTION='hhDeviceTrace3031', STYLE='hhDeviceTrace3031Style';
var busy=false, observer=null, lastTrace=null, DRIVE_ID='hh-device-trace-drive-id-v3031';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function now(){return new Date().toISOString()}
function fmt(n){n=Number(n)||0;return Math.round(n*10)/10}
function profileCode(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}
function profileName(){return profileCode()==='m'?'Mónika':'Zsolt'}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
function twoFrames(){return new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r)})})}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}

async function localState(){
 var bytes=0;
 try{
  for(var i=0;i<localStorage.length;i++){
   var k=localStorage.key(i)||'',v=localStorage.getItem(k)||'';bytes+=(k.length+v.length)*2;
  }
 }catch(e){}
 return {entries:localStorage.length,approxBytes:bytes};
}
async function idbInventory(){
 var result=[];
 try{
  if(!indexedDB.databases)return result;
  var dbs=await indexedDB.databases();
  for(var i=0;i<dbs.length;i++){
   var info=dbs[i];if(!info.name)continue;
   var row=await new Promise(function(resolve){
    var req=indexedDB.open(info.name);
    req.onerror=function(){resolve({name:info.name,error:String(req.error||'open failed')})};
    req.onsuccess=async function(){
     var db=req.result,stores=[];
     for(var j=0;j<db.objectStoreNames.length;j++){
      var name=db.objectStoreNames[j];
      try{
       var tx=db.transaction(name,'readonly'),store=tx.objectStore(name);
       var count=await new Promise(function(r){var q=store.count();q.onsuccess=function(){r(q.result)};q.onerror=function(){r(-1)}});
       stores.push({name:name,count:count,keyPath:store.keyPath||null});
      }catch(e){stores.push({name:name,error:String(e)})}
     }
     db.close();resolve({name:info.name,version:info.version,stores:stores});
    };
   });
   result.push(row);
  }
 }catch(e){}
 return result;
}
function gpuInfo(){
 try{
  var c=document.createElement('canvas'),gl=c.getContext('webgl')||c.getContext('experimental-webgl');
  if(!gl)return null;
  var ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {
   vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),
   renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)
  };
 }catch(e){return null}
}
async function eventLoopLag(){
 var gaps=[],last=performance.now();
 for(var i=0;i<18;i++){
  await wait(50);
  var t=performance.now(),gap=t-last-50;last=t;gaps.push(gap);
 }
 return {avgMs:fmt(gaps.reduce(function(a,b){return a+b},0)/gaps.length),maxMs:fmt(Math.max.apply(Math,gaps)),over20:gaps.filter(function(x){return x>20}).length};
}
async function measureProfileToggle(label,longTasks){
 var beforeCount=longTasks.length,start=performance.now(),orig=profileCode();
 if(typeof window.hhToggleProfileOneClick==='function')window.hhToggleProfileOneClick();
 else if(typeof window.setProfile==='function')window.setProfile(orig==='m'?'z':'m');
 await twoFrames();
 var clickPaint=performance.now()-start;
 await wait(700);
 return {label:label,clickToPaintMs:fmt(clickPaint),settledProfile:profileCode(),longTasks:longTasks.length-beforeCount};
}
async function measureAdminScroll(longTasks){
 var el=document.querySelector('#haOv .haSheet');if(!el)return {error:'Admin scroll container missing'};
 var frames=[],start=performance.now(),last=start,beforeCount=longTasks.length;
 var top=el.scrollTop,max=Math.max(0,el.scrollHeight-el.clientHeight);
 for(var i=0;i<=36;i++){
  var t=performance.now();frames.push(t-last);last=t;el.scrollTop=max*(i/36);await new Promise(function(r){requestAnimationFrame(r)});
 }
 for(var j=36;j>=0;j--){
  var t2=performance.now();frames.push(t2-last);last=t2;el.scrollTop=max*(j/36);await new Promise(function(r){requestAnimationFrame(r)});
 }
 el.scrollTop=top;
 return {
  totalMs:fmt(performance.now()-start),avgFrameMs:fmt(frames.reduce(function(a,b){return a+b},0)/frames.length),
  maxFrameMs:fmt(Math.max.apply(Math,frames)),over50:frames.filter(function(x){return x>50}).length,
  over100:frames.filter(function(x){return x>100}).length,longTasks:longTasks.length-beforeCount,
  scrollHeight:el.scrollHeight,clientHeight:el.clientHeight
 };
}
async function uploadDrive(trace){
 if(typeof window.hhGetGoogleDriveToken292!=='function')return {ok:false,reason:'Drive token helper unavailable'};
 try{
  var token=await window.hhGetGoogleDriveToken292(false);
  if(!token)return {ok:false,reason:'Drive not authorized'};
  var id=localStorage.getItem(DRIVE_ID)||'',name='HealthHub-Device-Performance-Trace.json';
  if(!id){
   var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'HealthHub technical performance trace. No clinical values.',appProperties:{healthhub:'device-performance-trace',schema:'1.0'}})});
   if(!cr.ok)return {ok:false,reason:'Drive create '+cr.status};
   id=(await cr.json()).id;localStorage.setItem(DRIVE_ID,id);
  }
  var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(trace,null,2)});
  if(up.status===404){localStorage.removeItem(DRIVE_ID);return uploadDrive(trace)}
  if(!up.ok)return {ok:false,reason:'Drive upload '+up.status};
  return {ok:true,file:await up.json()};
 }catch(e){return {ok:false,reason:String(e&&e.message||e)}}
}
function summaryHtml(t){
 if(!t)return 'Még nincs device trace.';
 var p1=t.actions&&t.actions[0],p2=t.actions&&t.actions[1],s=t.adminScroll||{},lag=t.eventLoop||{};
 return 'Profilváltás: <b>'+esc(p1&&p1.clickToPaintMs)+' / '+esc(p2&&p2.clickToPaintMs)+' ms</b> · '+
  'Scroll max frame: <b>'+esc(s.maxFrameMs)+' ms</b> · '+
  'Long task: <b>'+esc(t.longTaskCount)+'</b> · '+
  'Event-loop max lag: <b>'+esc(lag.maxMs)+' ms</b> · '+
  'DOM: <b>'+esc(t.domNodes)+'</b>';
}
function render(){
 var body=document.getElementById('haBody'),ov=document.getElementById('haOv');if(!body||!ov||!ov.classList.contains('on'))return;
 ensureStyle();var old=document.getElementById(SECTION);if(old)old.remove();
 var html='<section id="'+SECTION+'" class="hhDt3031"><div class="top"><div><h3>🧪 DEVICE PERFORMANCE TRACE</h3><small>Valódi böngésző/gép benchmark · csak technikai adatok</small></div><span class="badge '+(busy?'run':'')+'">'+(busy?'RUNNING':'READY')+'</span></div>'+
 '<div class="summary" id="hhDtSummary3031">'+summaryHtml(lastTrace)+'</div>'+
 '<div class="actions"><button class="primary" id="hhDtRun3031" '+(busy?'disabled':'')+'>▶ RUN DEVICE BENCHMARK</button><button id="hhDtCopy3031" '+(!lastTrace?'disabled':'')+'>⧉ COPY LAST TRACE</button></div>'+
 '<div class="note">Nem olvas ki vérnyomást, gyógyszert, lelettartalmat vagy dokumentumot. Csak teljesítménymutatókat és rekorddarabszámokat mér.</div></section>';
 body.insertAdjacentHTML('afterbegin',html);
 var run=document.getElementById('hhDtRun3031'),copy=document.getElementById('hhDtCopy3031');
 if(run)run.onclick=runTrace;
 if(copy)copy.onclick=function(){if(!lastTrace)return;navigator.clipboard&&navigator.clipboard.writeText(JSON.stringify(lastTrace,null,2));toast('Device trace másolva')};
}
function ensureStyle(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+SECTION+'{margin:0 0 10px;background:#fff;border:1px solid #d9e5ec;border-radius:16px;padding:11px;box-shadow:0 6px 16px rgba(31,65,91,.05)}'+
 '#'+SECTION+' .top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}#'+SECTION+' h3{margin:0;color:#173f62}#'+SECTION+' small{color:#768b99}'+
 '#'+SECTION+' .badge{padding:5px 7px;border-radius:999px;background:#e7f7ef;color:#18714c;font-size:7px;font-weight:900}#'+SECTION+' .badge.run{background:#fff4d8;color:#8c670f}'+
 '#'+SECTION+' .summary{margin-top:8px;font-size:7.5px;color:#5f7888;line-height:1.55}#'+SECTION+' .actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}'+
 '#'+SECTION+' button{border:1px solid #d9e4ec;background:#f7fafc;color:#31536f;border-radius:10px;padding:8px 10px;font-size:7.5px;font-weight:900}#'+SECTION+' button.primary{background:#173f62;color:#fff;border-color:#173f62}#'+SECTION+' button:disabled{opacity:.5}'+
 '#'+SECTION+' .note{margin-top:7px;font-size:6.7px;color:#8094a1}';
 document.head.appendChild(s);
}
async function runTrace(){
 if(busy)return;busy=true;render();toast('Device benchmark indul…');
 var longTasks=[],loafFrames=[],po=null,loafObserver=null,orig=profileCode();
 try{
  try{po=new PerformanceObserver(function(list){list.getEntries().forEach(function(e){longTasks.push({startTime:fmt(e.startTime),duration:fmt(e.duration),name:e.name})})});po.observe({entryTypes:['longtask']})}catch(e){}
  try{
   if(PerformanceObserver.supportedEntryTypes&&PerformanceObserver.supportedEntryTypes.indexOf('long-animation-frame')>=0){
    loafObserver=new PerformanceObserver(function(list){
     list.getEntries().forEach(function(e){
      var scripts=[];
      try{
       scripts=(e.scripts||[]).map(function(s){
        return {
         invoker:s.invoker||null,
         invokerType:s.invokerType||null,
         sourceURL:s.sourceURL||null,
         sourceFunctionName:s.sourceFunctionName||null,
         sourceCharPosition:s.sourceCharPosition||null,
         duration:fmt(s.duration||0),
         pauseDuration:fmt(s.pauseDuration||0),
         forcedStyleAndLayoutDuration:fmt(s.forcedStyleAndLayoutDuration||0)
        };
       }).sort(function(a,b){return b.duration-a.duration}).slice(0,20);
      }catch(x){}
      loafFrames.push({
       startTime:fmt(e.startTime),
       duration:fmt(e.duration),
       blockingDuration:fmt(e.blockingDuration||0),
       renderStart:fmt(e.renderStart||0),
       styleAndLayoutStart:fmt(e.styleAndLayoutStart||0),
       scripts:scripts
      });
     });
    });
    loafObserver.observe({type:'long-animation-frame',buffered:true});
   }
  }catch(e){}
  var start=performance.now(),beforeNodes=document.getElementsByTagName('*').length;
  var env={
   at:now(),build:document.querySelector('meta[name="healthhub-live-build"]')?.content||null,
   userAgent:navigator.userAgent,platform:navigator.platform,hardwareConcurrency:navigator.hardwareConcurrency||null,
   deviceMemory:navigator.deviceMemory||null,dpr:window.devicePixelRatio||1,viewport:{w:innerWidth,h:innerHeight},
   memory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null,
   gpu:gpuInfo(),scripts:document.scripts.length,liveScripts:Array.from(document.scripts).map(function(x){return x.src}).filter(function(x){return /live-v\d/.test(x)}).length
  };
  var ls=await localState(),idb=await idbInventory();
  var loop=await eventLoopLag();
  var a1=await measureProfileToggle('profileToggle1',longTasks);
  var a2=await measureProfileToggle('profileToggle2',longTasks);
  if(profileCode()!==orig&&typeof window.setProfile==='function'){window.setProfile(orig);await wait(500)}
  var scroll=await measureAdminScroll(longTasks);
  var trace={
   schema:'healthhub.device-performance-trace/1',env:env,localStorage:ls,indexedDB:idb,eventLoop:loop,
   actions:[a1,a2],adminScroll:scroll,longTaskCount:longTasks.length,longTaskTotalMs:fmt(longTasks.reduce(function(s,x){return s+x.duration},0)),
   longTasks:longTasks.slice(0,100),longAnimationFrames:loafFrames.slice(0,100),domNodes:document.getElementsByTagName('*').length,domNodesBefore:beforeNodes,
   totalBenchmarkMs:fmt(performance.now()-start)
  };
  try{localStorage.setItem('hh-device-performance-trace-v3031',JSON.stringify(trace))}catch(e){}
  lastTrace=trace;
  render();
  var up=await uploadDrive(trace);trace.driveUpload=up;
  lastTrace=trace;render();
  toast('Device benchmark kész'+(up.ok?' · Drive feltöltve':''));
 }catch(e){
  lastTrace={schema:'healthhub.device-performance-trace/1',at:now(),error:String(e&&e.stack||e)};
  render();toast('Device benchmark hiba');
 }finally{
  try{po&&po.disconnect()}catch(e){}
  try{loafObserver&&loafObserver.disconnect()}catch(e){}
  busy=false;render();
 }
}

window.hhDeviceTrace3031=runTrace;
try{lastTrace=JSON.parse(localStorage.getItem('hh-device-performance-trace-v3031')||'null')}catch(e){}
function attach(){
 var ov=document.getElementById('haOv');
 if(!ov){setTimeout(attach,500);return}
 if(observer)observer.disconnect();
 observer=new MutationObserver(function(){if(ov.classList.contains('on'))setTimeout(render,40)});
 observer.observe(ov,{attributes:true,attributeFilter:['class']});
 if(ov.classList.contains('on'))render();
}
attach();
document.documentElement.dataset.healthhubDeviceTrace='1.303.2';
})();
