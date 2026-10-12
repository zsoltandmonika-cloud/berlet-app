(function(){
'use strict';
/* v407 background-on-open ingestion. Patient data only sent via existing
 * authenticated HealthHub profile vault, NEVER to public GitHub or analytics.
 */
var API='https://www.googleapis.com/drive/v3/files';
var PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
var PDFWORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
var TESS='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
var CORE=window.HH_KB_CORE_V407,st={running:false,stop:false,done:0,total:0,error:'',current:'',last:null},
 pdfLibPromise=null,ocrWorker=null,ocrLoader=null,folderCache={},listeners=[];
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function active(p){if(p!==profile())throw Error('Profilváltás: a feldolgozás leállt.');
 var service=window.HH_DAILY_HEALTH_SYNC_V319,auth=service&&service.getStatus&&service.getStatus();
 if(!service||!auth||!auth.authenticated)throw Error('Előbb lépj be a Központi Health Vaultba.');
 if(auth.authorizedProfiles&&!auth.authorizedProfiles.includes(p))throw Error('A profil nem engedélyezett.');
 return service}
function emit(){var detail={running:st.running,stop:st.stop,done:st.done,total:st.total,
 current:st.current,error:st.error,last:st.last};
 window.dispatchEvent(new CustomEvent('healthhub:kb-progress',{detail:detail}));
}
function title(s){return String(s||'').slice(0,340)}
function escapeQuery(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
async function drive(url,options,p){
 active(p);var get=window.hhGetGoogleDriveToken292;
 if(typeof get!=='function')throw Error('Google Drive csatlakozás szükséges.');
 var token=await get(false);if(!token)throw Error('A Google Drive csatlakozás lejárt.');
 active(p);var r=await fetch(url,Object.assign({cache:'no-store'},options||{},{
 headers:Object.assign({},options&&options.headers||{},{Authorization:'Bearer '+token})
 }));
 if(!r.ok)throw Error('Google Drive HTTP '+r.status);
 return r;
}
async function filesByQuery(q,p,fields,one){
 var out=[],page='';
 do{
  var params=new URLSearchParams({q:q,spaces:'drive',fields:fields||'nextPageToken,files(id,name,mimeType,size,modifiedTime,md5Checksum,appProperties,parents)',pageSize:'1000'});
  if(page)params.set('pageToken',page);
  var response=await drive(API+'?'+params.toString(),{},p),data=await response.json();
  out.push(...(data.files||[]));page=data.nextPageToken||'';
  if(one)break;
 }while(page&&out.length<5000);
 return out;
}
async function archiveFolder(p){
 if(folderCache[p])return folderCache[p];
 var key='hh-lena-doc-drive-v294-'+p+'-folder';
 var id=localStorage.getItem(key)||'';
 if(id){folderCache[p]=id;return id}
 // Read existing archive only. Never create a new folder during ingestion.
 var roots=await filesByQuery("name='HealthHub Lena Archive' and mimeType='application/vnd.google-apps.folder' and trashed=false",p,null,true);
 if(roots.length!==1)throw Error('A Drive HealthHub-archívummappája nem egyértelmű. Előbb ellenőrizd az archívumot.');
 var name=p==='monika'?'Monika':'Zsolt';
 var folders=await filesByQuery("name='"+name+"' and '"+escapeQuery(roots[0].id)+"' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",p,null,true);
 if(folders.length!==1)throw Error('A profilhoz tartozó Drive-mappa nem egyértelmű.');
 id=folders[0].id;folderCache[p]=id;return id;
}
async function listFiles(p){
 var folder=await archiveFolder(p);
 var q="'"+escapeQuery(folder)+"' in parents and mimeType='application/pdf' and trashed=false";
 var rows=await filesByQuery(q,p);
 return rows.filter(x=>x&&x.id&&x.mimeType==='application/pdf'&&(!x.appProperties?.profile||x.appProperties.profile===p))
 .map(x=>({id:x.id,name:title(x.name),size:Number(x.size)||null,modified:x.modifiedTime||null,
  documentId:x.appProperties&&x.appProperties.documentId||null,parent:folder,sha256:x.appProperties&&x.appProperties.sha256||null}));
}
async function blobFor(file,p){
 active(p);
 const id=encodeURIComponent(file.id);
 // Verify the file still resides under the authorized patient archive folder.
 var metaResp=await drive(API+'/'+id+'?fields=id,name,mimeType,size,parents,appProperties,modifiedTime',{},p);
 var m=await metaResp.json(),folder=await archiveFolder(p);
 if(m.mimeType!=='application/pdf'||!Array.isArray(m.parents)||!m.parents.includes(folder)||
    m.appProperties&&m.appProperties.profile&&m.appProperties.profile!==p)
  throw Error('A dokumentum archív/profil-azonossága nem ellenőrizhető.');
 if(Number(m.size)>25000000)throw Error('25 MB feletti PDF: külön feldolgozás szükséges.');
 var response=await drive(API+'/'+id+'?alt=media',{},p);
 var bytes=await response.arrayBuffer();
 if(new Uint8Array(bytes).slice(0,4).map(x=>String.fromCharCode(x)).join('')!=='%PDF')
  throw Error('A fájl nem érvényes PDF.');
 return bytes;
}
async function hash(bytes){
 if(!crypto||!crypto.subtle)throw Error('SHA-256 ellenőrzéshez HTTPS szükséges.');
 return CORE.checksumBytes(await crypto.subtle.digest('SHA-256',bytes));
}
async function pdfjs(){
 if(pdfLibPromise)return pdfLibPromise;
 pdfLibPromise=import(PDFJS).then(lib=>{lib.GlobalWorkerOptions.workerSrc=PDFWORKER;return lib})
 .catch(e=>{pdfLibPromise=null;throw e});
 return pdfLibPromise;
}
async function readDocuments(p){
 return await active(p).request('/rest/v1/hh_kb_documents?select=id,profile_key,source_file_id,source_modified_at,sha256,status,total_pages,pages_indexed,duplicate_of,visual_pages,source_class&profile_key=eq.'+p+'&limit=1000',{method:'GET'});
}
