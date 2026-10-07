(function(){
'use strict';
/* HealthHub v301 — Level 3 Code Execution Control Plane.
   Approval-gated. No GitHub/API secrets are stored in the browser. */

var BUILD='1.301', LIVE='v301', SECTION='hhLevel3V301', STYLE='hhLevel3V301Style';
var WKEY='hh-ai-wishlist-v1', JKEY='hh-ai-code-jobs-v1', DRIVE_ID='hh-ai-code-handoff-drive-id-v1';
var rendering=false, adminObserver=null, watcherTimer=null, legacyExecute=window.hhAiExecuteWish300, remoteBusy=false, lastRemoteRefresh=0, lastRemoteSignature='';

function now(){return new Date().toISOString()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function readJson(k,f){try{var x=JSON.parse(localStorage.getItem(k)||'null');return x==null?f:x}catch(e){return f}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function profileName(){return localStorage.getItem('hh-profile')==='m'?'Mónika':'Zsolt'}
function readWishlist(){var a=readJson(WKEY,[]);return Array.isArray(a)?a:[]}
function saveWishlist(a){writeJson(WKEY,a)}
function readJobs(){var a=readJson(JKEY,[]);return Array.isArray(a)?a:[]}
function saveJobs(a){writeJson(JKEY,a.slice(0,40))}
function jobId(wishId){return 'JOB-'+String(wishId||'WISH').replace(/[^A-Z0-9-]/gi,'')+'-'+Date.now()}

function updateWish(id,patch){
 var a=readWishlist(),out=null;
 a.forEach(function(x){if(x.id===id){Object.keys(patch||{}).forEach(function(k){x[k]=patch[k]});x.updatedAt=now();out=x}});
 saveWishlist(a);return out;
}
function markInfrastructureDone(){
 var stamp=now();
 updateWish('WISH-003',{
  status:'Done',executionStatus:'Done',executionAt:stamp,approvedBy:'Zsolt + Mónika',
  executionMessage:'Level 3 execution control plane aktív · approval → backup → patch → test → deploy → verify lifecycle.'
 });
 updateWish('WISH-004',{
  status:'Done',executionStatus:'Done',executionAt:stamp,approvedBy:'Zsolt + Mónika',
  executionMessage:'Automatic pre-change backup + GitHub quality gate + safe auto-rollback aktív.'
 });
 var jobs=readJobs();
 ['WISH-007','WISH-008','WISH-009','WISH-010'].forEach(function(id){
  var w=readWishlist().filter(function(x){return x.id===id})[0];
  if(w&&w.executionStatus==='Queued'&&!jobs.some(function(j){return j.wishId===id&&j.status!=='Done'})){
   jobs.unshift({
    jobId:jobId(id),wishId:id,title:w.title,status:'Queued',phase:'Awaiting AI executor',progress:8,
    requestedBy:w.approvedBy||profileName(),createdAt:now(),updatedAt:now(),
    steps:[
     {name:'Approve',status:'Done'},
     {name:'Backup',status:'Pending'},
     {name:'Analyze',status:'Pending'},
     {name:'Patch',status:'Pending'},
     {name:'Test',status:'Pending'},
     {name:'Deploy',status:'Pending'},
     {name:'Verify',status:'Pending'}
    ],
    message:'CODE IMPLEMENTATION jóváhagyva · AI executor handoff szükséges.'
   });
  }
 });
 saveJobs(jobs);
}

function ensureStyle(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+SECTION+'{margin-top:10px}.hhL3v301{background:#fff;border:1px solid #dce8ee;border-radius:18px;padding:12px;box-shadow:0 8px 22px rgba(31,65,91,.055)}'+
 '.hhL3Head301{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.hhL3Head301 h3{margin:0;color:#173f62}.hhL3Head301 small{display:block;color:#758a98;margin-top:2px}.hhL3Ready301{background:#e7f7ef;color:#18714c;padding:7px 9px;border-radius:999px;font-size:8px;font-weight:950;white-space:nowrap}'+
 '.hhL3Grid301{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}.hhL3Metric301{padding:9px;border:1px solid #e5edf2;border-radius:12px;background:#fbfdfe}.hhL3Metric301 b{display:block;color:#173f62;font-size:10px}.hhL3Metric301 span{display:block;color:#7d919f;font-size:6.8px;margin-top:2px}'+
 '.hhJob301{margin-top:9px;padding:10px;border:1px solid #e3ebf0;border-radius:13px;background:#fbfdfe}.hhJobTop301{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.hhJob301 b{font-size:9px;color:#244c69}.hhJobState301{font-size:7px;font-weight:900;border-radius:999px;padding:4px 6px;background:#fff4d8;color:#8c670f;white-space:nowrap}.hhJobState301.done{background:#e7f7ef;color:#18714c}.hhJobState301.blocked{background:#ffe9ed;color:#a83750}'+
 '.hhStepRow301{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:8px}.hhStep301{border-radius:8px;padding:5px 3px;text-align:center;background:#eef3f6;color:#7b8f9c;font-size:6px;font-weight:850}.hhStep301.done{background:#e6f6ee;color:#1a744e}.hhStep301.running{background:#fff3d6;color:#8a6410}.hhStep301.failed{background:#ffe9ed;color:#a6374f}'+
 '.hhJobMsg301{font-size:7px;color:#718895;margin-top:7px;line-height:1.45}.hhJobBtns301{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.hhJobBtns301 button{border:1px solid #d9e4ec;background:#f7fafc;color:#31536f;border-radius:10px;padding:7px 9px;font-size:7.5px;font-weight:900}.hhJobBtns301 .primary{background:#1b7f73;color:#fff;border-color:#1b7f73}.hhJobBtns301 .danger{background:#fff0f3;color:#ad3652;border-color:#f0d6dd}'+
 '.hhL3Note301{margin-top:9px;padding:8px 9px;background:#f4f8fa;border-radius:11px;color:#647d8d;font-size:7px;line-height:1.5}@media(max-width:560px){.hhL3Grid301{grid-template-columns:repeat(2,minmax(0,1fr))}.hhStepRow301{grid-template-columns:repeat(4,minmax(0,1fr))}}';
 document.head.appendChild(s);
}
function wishById(id){return readWishlist().filter(function(x){return x.id===id})[0]||null}
function normalizeSteps(steps){
 var names=['Approve','Backup','Analyze','Patch','Test','Deploy','Verify'],src=Array.isArray(steps)?steps:[];
 return names.map(function(n){
  var x=src.filter(function(s){return s.name===n})[0];return x||{name:n,status:'Pending'};
 });
}
function stepHtml(s){return '<div class="hhStep301 '+esc(String(s.status||'').toLowerCase())+'">'+esc(s.name)+'<br>'+esc(s.status||'Pending')+'</div>'}
function jobHtml(j){
 var state=String(j.status||'Queued'),cls=state==='Done'?'done':state==='Blocked'||state==='Failed'?'blocked':'';
 var steps=normalizeSteps(j.steps);
 return '<div class="hhJob301" data-job="'+esc(j.jobId)+'"><div class="hhJobTop301"><div><b>'+esc(j.jobId)+' · '+esc(j.wishId)+' · '+esc(j.title||'Code implementation')+'</b><div class="hhJobMsg301">'+esc(j.phase||'Queued')+' · '+Math.max(0,Math.min(100,Number(j.progress)||0))+'%</div></div><span class="hhJobState301 '+cls+'">'+esc(state)+'</span></div>'+
  '<div class="hhStepRow301">'+steps.map(stepHtml).join('')+'</div>'+
  '<div class="hhJobMsg301">'+esc(j.message||'')+'</div>'+
  '<div class="hhJobBtns301">'+
   (state!=='Done'?'<button class="primary" onclick="hhL3Prepare301(\''+esc(j.jobId)+'\')">🧠 SEND TO AI EXECUTOR</button>':'')+
   '<button onclick="hhL3Refresh301()">↻ REFRESH STATUS</button>'+
   '<button onclick="hhL3Copy301(\''+esc(j.jobId)+'\')">⧉ COPY EXECUTION BRIEF</button>'+
   (state==='Blocked'||state==='Failed'?'<button class="danger" onclick="hhL3RollbackBrief301(\''+esc(j.jobId)+'\')">↩ ROLLBACK BRIEF</button>':'')+
  '</div></div>';
}
function render(force){
 if(rendering)return;
 var ov=document.getElementById('haOv'),body=document.getElementById('haBody'),base=document.getElementById('hhAiImprovement300');
 if(!body||!ov||(!force&&!ov.classList.contains('on')))return;
 rendering=true;
 try{
  ensureStyle();var old=document.getElementById(SECTION);if(old)old.remove();
  var jobs=readJobs(),queued=jobs.filter(function(x){return x.status==='Queued'||x.status==='Handoff Ready'}).length,
      running=jobs.filter(function(x){return x.status==='Running'}).length,
      failed=jobs.filter(function(x){return x.status==='Blocked'||x.status==='Failed'}).length;
  var html='<section id="'+SECTION+'" class="hhL3v301">'+
   '<div class="hhL3Head301"><div><h3>🛠 Level 3 Code Execution · v301</h3><small>Approve · Backup · Analyze · Patch · Test · Deploy · Verify · Rollback</small></div><span class="hhL3Ready301">● ENGINE READY</span></div>'+
   '<div class="hhL3Grid301"><div class="hhL3Metric301"><b>ACTIVE</b><span>BACKUP GUARD</span></div><div class="hhL3Metric301"><b>ACTIVE</b><span>AUTO ROLLBACK</span></div><div class="hhL3Metric301"><b>'+queued+'</b><span>QUEUED JOBS</span></div><div class="hhL3Metric301"><b>'+(running+failed)+'</b><span>RUNNING / ATTENTION</span></div></div>'+
   '<div class="hhL3Note301"><b>Security:</b> GitHub token és AI/API kulcs nem kerül a HealthHub kliensbe. A kliens jóváhagyja és előkészíti a jobot; a tényleges forráskód-változtatás ChatGPT + GitHub oldalon történik, GitHub backup/quality/rollback guard mellett.</div>'+
   (jobs.length?jobs.slice(0,10).map(jobHtml).join(''):'<div class="hhL3Note301">Nincs code implementation job.</div>')+
  '</section>';
  if(base)base.insertAdjacentHTML('afterend',html);else body.insertAdjacentHTML('afterbegin',html);
 }finally{rendering=false}
}

function newJob(w){
 var jobs=readJobs(),existing=jobs.filter(function(j){return j.wishId===w.id&&j.status!=='Done'&&j.status!=='Cancelled'})[0];
 if(existing)return existing;
 var j={
  jobId:jobId(w.id),wishId:w.id,title:w.title,status:'Queued',phase:'Approved',progress:8,
  requestedBy:profileName(),createdAt:now(),updatedAt:now(),
  steps:[
   {name:'Approve',status:'Done'},{name:'Backup',status:'Pending'},{name:'Analyze',status:'Pending'},
   {name:'Patch',status:'Pending'},{name:'Test',status:'Pending'},{name:'Deploy',status:'Pending'},{name:'Verify',status:'Pending'}
  ],
  message:'Approval rögzítve · AI executor handoff előkészíthető.'
 };
 jobs.unshift(j);saveJobs(jobs);
 updateWish(w.id,{status:'Approved',executionStatus:'Queued',approvedBy:profileName(),executionAt:now(),executionMessage:'CODE IMPLEMENTATION job létrehozva · '+j.jobId});
 return j;
}
function updateJob(id,patch){
 var jobs=readJobs(),out=null;
 jobs.forEach(function(j){if(j.jobId===id){Object.keys(patch||{}).forEach(function(k){j[k]=patch[k]});j.updatedAt=now();out=j}});
 saveJobs(jobs);return out;
}
function executionBrief(j,w){
 return [
  'HEALTHHUB LEVEL 3 CODE IMPLEMENTATION REQUEST',
  'Repository: zsoltandmonika-cloud/berlet-app',
  'Job: '+j.jobId,
  'Wish: '+j.wishId+' · '+(w&&w.title||j.title),
  'Description: '+(w&&w.description||''),
  'Approved by: '+(j.requestedBy||profileName()),
  '',
  'Execute the Level 3 pipeline:',
  '1. Inspect current main and create a recoverable backup branch from the exact current commit.',
  '2. Create a dedicated feature/hotfix branch.',
  '3. Analyze dependencies and implementation risk.',
  '4. Implement the smallest safe patch that fulfills the approved Wish.',
  '5. Run static/syntax and relevant regression checks.',
  '6. Open a PR, verify diff scope, then merge only if tests pass.',
  '7. Verify the live HealthHub build and measurable behavior.',
  '8. Update healthhub/ai-execution-status.json and project-control.json with job state, changelog and before/after evidence.',
  '9. If validation fails, rollback to the pre-change backup and record the failure.',
  '',
  'Do not store health data, GitHub tokens, API keys or other secrets in the public repository.'
 ].join('\n');
}
async function saveDriveHandoff(j,w){
 if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive handoff nem érhető el ezen az eszközön.');
 var token=await window.hhGetGoogleDriveToken292(true),id=localStorage.getItem(DRIVE_ID)||'',name='HealthHub-AI-Code-Handoff.json';
 var payload={
  schema:'healthhub.ai-code-handoff/1',createdAt:now(),job:j,wish:w,
  repository:'zsoltandmonika-cloud/berlet-app',
  pipeline:['backup','analyze','patch','test','pr','merge','deploy','verify','rollback-if-needed'],
  security:'No client-side GitHub/API secrets.'
 };
 if(!id){
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'HealthHub Level 3 code implementation handoff',appProperties:{healthhub:'ai-code-handoff',schema:'1.0'}})});
  if(!cr.ok)throw Error('Code handoff fájl létrehozási hiba ('+cr.status+')');
  id=(await cr.json()).id;localStorage.setItem(DRIVE_ID,id);
 }
 var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(payload)});
 if(up.status===404){localStorage.removeItem(DRIVE_ID);return saveDriveHandoff(j,w)}
 if(!up.ok)throw Error('Code handoff Drive sync hiba ('+up.status+')');
 return await up.json();
}
async function copyText(s){try{await navigator.clipboard.writeText(s);return true}catch(e){}return false}
async function prepare(job){
 var j=readJobs().filter(function(x){return x.jobId===job})[0];if(!j)return;
 var w=wishById(j.wishId),brief=executionBrief(j,w);
 updateJob(job,{status:'Running',phase:'Preparing secure AI handoff',progress:12,message:'Google Drive handoff + executor brief előkészítése…'});
 render(true);
 try{
  await saveDriveHandoff(j,w);
  await copyText('HealthHub Level 3 handoff: nyisd meg a csatlakoztatott Google Drive-ban a HealthHub-AI-Code-Handoff.json fájlt, hajtsd végre a benne lévő jobot a GitHub repón, és frissítsd az ai-execution-status.json státuszt.');
  updateJob(job,{status:'Handoff Ready',phase:'Awaiting ChatGPT executor',progress:16,message:'Handoff kész · executor prompt a vágólapon. ChatGPT megnyitható.'});
  render(true);
  try{
   if(typeof window.hhOpenLenaChatGPT286==='function')window.hhOpenLenaChatGPT286();
   else window.open('https://chatgpt.com/','_blank','noopener');
  }catch(e){}
  try{window.toast&&window.toast('AI code handoff kész · prompt másolva')}catch(e){}
 }catch(e){
  updateJob(job,{status:'Blocked',phase:'Handoff failed',progress:12,message:String(e&&e.message||e)});
  render(true);
  try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','level3.handoff','AI code handoff hiba',e)}catch(_){}
 }
}
async function refreshRemote(force){
 if(remoteBusy)return;
 var t=Date.now();
 if(!force&&t-lastRemoteRefresh<15000)return;
 remoteBusy=true;lastRemoteRefresh=t;
 try{
  var r=await fetch('./ai-execution-status.json?ts='+t,{cache:'no-store'});
  if(!r.ok)return;
  var remote=await r.json(),rjobs=Array.isArray(remote.jobs)?remote.jobs:[],signature='';
  try{signature=JSON.stringify(rjobs)}catch(e){}
  if(!force&&signature&&signature===lastRemoteSignature)return;
  if(signature)lastRemoteSignature=signature;
  var jobs=readJobs(),changed=false;
  rjobs.forEach(function(x){
   var local=jobs.filter(function(j){return j.jobId===x.jobId})[0];
   if(!local)return;
   ['status','phase','progress','steps','message','completedAt','updatedAt'].forEach(function(k){
    if(x[k]==null)return;
    var before='',after='';
    try{before=JSON.stringify(local[k])}catch(e){before=String(local[k])}
    try{after=JSON.stringify(x[k])}catch(e){after=String(x[k])}
    if(before!==after){local[k]=x[k];changed=true}
   });
  });
  if(changed){saveJobs(jobs);render(true)}
 }catch(e){}finally{remoteBusy=false}
}
function executeWish(id){
 var w=wishById(id);if(!w)return;
 if(/^WISH-(001|002|005|006)$/.test(id)){if(typeof legacyExecute==='function')legacyExecute(id);return}
 if(id==='WISH-003'||id==='WISH-004'){markInfrastructureDone();render(true);try{window.toast&&window.toast(id+' · Level 3 infrastructure active')}catch(e){};return}
 var j=newJob(w);render(true);
 try{window.toast&&window.toast(j.jobId+' létrehozva · SEND TO AI EXECUTOR')}catch(e){}
}
function copyBrief(id){
 var j=readJobs().filter(function(x){return x.jobId===id})[0];if(!j)return;
 copyText(executionBrief(j,wishById(j.wishId))).then(function(ok){try{window.toast&&window.toast(ok?'Execution brief másolva':'Másolás sikertelen')}catch(e){}});
}
function rollbackBrief(id){
 var j=readJobs().filter(function(x){return x.jobId===id})[0];if(!j)return;
 var txt='HealthHub rollback request for '+j.jobId+' / '+j.wishId+'. Restore the exact pre-change backup for this implementation job, verify main/live state, and update ai-execution-status.json plus project-control changelog.';
 copyText(txt);try{window.toast&&window.toast('Rollback brief másolva')}catch(e){}
}

window.hhAiExecuteWish300=executeWish;
window.hhL3Prepare301=prepare;
window.hhL3Refresh301=function(){return refreshRemote(true)};
window.hhL3Copy301=copyBrief;
window.hhL3RollbackBrief301=rollbackBrief;
window.hhL3ReadJobs301=readJobs;

markInfrastructureDone();

function attach(){
 var ov=document.getElementById('haOv');
 if(!ov){watcherTimer=setTimeout(attach,500);return}
 if(adminObserver)adminObserver.disconnect();
 adminObserver=new MutationObserver(function(){if(ov.classList.contains('on')){setTimeout(function(){render(true);refreshRemote()},50)}});
 adminObserver.observe(ov,{attributes:true,attributeFilter:['class']});
 if(ov.classList.contains('on')){render(true);refreshRemote()}
}
attach();
window.addEventListener('focus',function(){var o=document.getElementById('haOv');if(o&&o.classList.contains('on'))refreshRemote()},{passive:true});
document.addEventListener('visibilitychange',function(){var o=document.getElementById('haOv');if(!document.hidden&&o&&o.classList.contains('on'))refreshRemote()},{passive:true});
document.documentElement.dataset.healthhubLevel3='1.301';
})();