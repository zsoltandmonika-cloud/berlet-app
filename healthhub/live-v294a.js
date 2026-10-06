(function(){
'use strict';
var HR='healthhub-healthradar-v2',MK='hh-lena-doc-drive-v294-map',SK='hh-lena-doc-drive-v294-state';
var RK='hh-lena-doc-drive-v294-root',MFK='hh-lena-doc-drive-v294-monika-folder',ZFK='hh-lena-doc-drive-v294-zsolt-folder';
var run=false,stop=false;
function jget(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}}
function jset(k,v){localStorage.setItem(k,JSON.stringify(v))}
function pk(p){return p==='m'||p==='monika'?'monika':p==='z'||p==='zsolt'?'zsolt':(localStorage.getItem('hh-profile')==='m'?'monika':'zsolt')}
function pn(p){return pk(p)==='monika'?'Mónika':'Zsolt'}
function sig(d){return String(d.sha256||[d.sizeBytes||0,d.uploadedAt||'',d.originalName||'',d.documentDate||'',d.category||'',d.profile||''].join('|'))}
function req(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function odb(){return new Promise(function(ok,no){var r=indexedDB.open(HR);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function docs(db){return db.objectStoreNames.contains('documents')?await req(db.transaction('documents','readonly').objectStore('documents').getAll())||[]:[]}
async function blob(db,id){return db.objectStoreNames.contains('documentBlobs')?await req(db.transaction('documentBlobs','readonly').objectStore('documentBlobs').get(id)):null}
async function tok(i){if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive kapcsolat nem érhető el');return await window.hhGetGoogleDriveToken292(!!i)}
async function gf(u,o,i){var t=await tok(!!i);o=o||{};o.headers=Object.assign({},o.headers||{},{Authorization:'Bearer '+t});return await fetch(u,o)}
function qe(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
async function folder(name,parent,key,kind){
 var id=localStorage.getItem(key)||'';if(id)return id;
 var q="mimeType='application/vnd.google-apps.folder' and trashed=false and name='"+qe(name)+"'"+(parent?" and '"+qe(parent)+"' in parents":"");
 var r=await gf('https://www.googleapis.com/drive/v3/files?spaces=drive&pageSize=10&fields=files(id,name)&q='+encodeURIComponent(q),{},false);
 if(!r.ok)throw Error('Drive mappakeresési hiba ('+r.status+')');
 var a=(await r.json()).files||[],f=a[0];
 if(!f){
  var m={name:name,mimeType:'application/vnd.google-apps.folder',appProperties:{healthhub:'lena-archive',kind:kind}};
  if(parent)m.parents=[parent];
  r=await gf('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m)},false);
  if(!r.ok)throw Error('Drive mappa létrehozási hiba ('+r.status+')');f=await r.json();
 }
 localStorage.setItem(key,f.id);return f.id;
}
async function folders(){await tok(true);var root=await folder('HealthHub Lena Archive',null,RK,'root');return{root:root,monika:await folder('Monika',root,MFK,'monika'),zsolt:await folder('Zsolt',root,ZFK,'zsolt')}}
function meta(d,parent){var a={healthhub:'lena-document',documentId:String(d.id),profile:pk(d.profile),category:String(d.category||'general'),documentDate:String(d.documentDate||''),sourceType:String(d.sourceType||'original')};if(d.sha256)a.sha256=String(d.sha256);return{name:d.originalName||('HealthHub-'+d.id),parents:[parent],mimeType:d.contentType||'application/pdf',description:'Private HealthHub original medical document · '+pn(d.profile)+' · '+String(d.documentDate||''),appProperties:a}}
async function create(d,parent,b){
 var bd='hh294_'+Date.now()+Math.random().toString(36).slice(2),m=meta(d,parent);
 var body=new Blob(['--'+bd+'\r\n','Content-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(m),'\r\n','--'+bd+'\r\n','Content-Type: '+(d.contentType||b.type||'application/octet-stream')+'\r\n\r\n',b,'\r\n','--'+bd+'--'],{type:'multipart/related; boundary='+bd});
 var r=await gf('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+bd},body:body},false);
 if(!r.ok)throw Error('Drive dokumentumfeltöltési hiba ('+r.status+')');return await r.json();
}
async function update(d,id,b){
 var r=await gf('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,webViewLink,modifiedTime',{method:'PATCH',headers:{'Content-Type':d.contentType||b.type||'application/octet-stream'},body:b},false);
 if(r.status===404)return null;if(!r.ok)throw Error('Drive dokumentumfrissítési hiba ('+r.status+')');return await r.json();
}
function state(s){if(arguments.length){jset(SK,s);try{window.dispatchEvent(new Event('healthhub:lena-archive-state'))}catch(e){}}return jget(SK,{})}
function amap(m){if(arguments.length)jset(MK,m);return jget(MK,{})}
async function sync(){
 if(run)return;run=true;stop=false;var db=null;
 try{
  var fs=await folders();db=await odb();
  var ds=(await docs(db)).filter(function(d){return d&&d.id&&d.profile&&(d.sourceType==='original'||!d.sourceType)});
  ds.sort(function(a,b){return String(a.documentDate||a.uploadedAt||'').localeCompare(String(b.documentDate||b.uploadedAt||''))});
  var m=amap(),todo=[],already=0;ds.forEach(function(d){var x=m[d.id];x&&x.fileId&&x.signature===sig(d)?already++:todo.push(d)});
  var s={running:true,total:ds.length,done:already,pending:todo.length,uploaded:0,updated:0,skipped:already,failed:0,missingBlob:0,startedAt:new Date().toISOString(),folders:fs};state(s);
  for(var i=0;i<todo.length;i++){
   if(stop){s.running=false;s.stopped=true;state(s);break}
   var d=todo[i];s.currentName=d.originalName||d.id;state(s);
   try{
    var br=await blob(db,d.id);
    if(!br||!br.blob){s.failed++;s.missingBlob++;s.done++;state(s);continue}
    var prev=m[d.id],res=null,upd=false;if(prev&&prev.fileId){res=await update(d,prev.fileId,br.blob);upd=!!res}
    if(!res)res=await create(d,pk(d.profile)==='monika'?fs.monika:fs.zsolt,br.blob);
    m[d.id]={fileId:res.id,fileName:res.name||d.originalName,webViewLink:res.webViewLink||null,profile:pk(d.profile),signature:sig(d),sha256:d.sha256||null,sizeBytes:d.sizeBytes||br.blob.size,syncedAt:new Date().toISOString()};amap(m);
    upd?s.updated++:s.uploaded++;s.done++;s.pending=Math.max(0,ds.length-s.done);state(s);br=null;await new Promise(function(r){setTimeout(r,50)});
   }catch(e){s.failed++;s.done++;s.lastError=String(e&&e.message||e);state(s)}
  }
  if(!stop){s.running=false;s.completed=true;s.currentName='';s.completedAt=new Date().toISOString();state(s);try{window.dispatchEvent(new CustomEvent('healthhub:lena-archive-complete',{detail:{folders:fs,map:m,state:s}}))}catch(e){}}
 }catch(e){var s2=state();s2.running=false;s2.lastError=String(e&&e.message||e);state(s2)}
 finally{run=false;if(db)try{db.close()}catch(e){}}
}
window.hhSyncFullLenaArchive294=sync;
window.hhStopLenaArchive294=function(){stop=true};
window.hhGetLenaArchiveMap294=function(){return amap()};
window.hhGetLenaArchiveState294=function(){return state()};
document.documentElement.dataset.healthhubLenaArchiveCore='1.294';
})();