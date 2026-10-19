(function(){
'use strict';
/* v694: deliberate local-original restoration. No background writes or
   bulk sync. Device proof stays private; user explicitly confirms upload. */
var ID='hhPdfRepair694',busy=false,candidates=[],profileAtPreview=null,observer=null;
var MAX=8*1024*1024;
function el(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function name(p){return p==='monika'?'Mónika':'Zsolt'}
function vault(){return window.HH_DAILY_HEALTH_SYNC_V319}
function current(p){return profile()===p}
function goodHash(s){return /^[a-f0-9]{64}$/.test(String(s||''))}
function report(s){var out=el('hhPdfRepairStatus694');if(out)out.textContent=String(s||'')}
function bytesSha(buffer){return crypto.subtle.digest('SHA-256',buffer).then(function(h){
 return Array.from(new Uint8Array(h),function(n){return n.toString(16).padStart(2,'0')}).join('');
})}
function base64(bytes){
 var chunks=[];for(var i=0;i<bytes.length;i+=32768)
  chunks.push(String.fromCharCode.apply(null,bytes.subarray(i,i+32768)));
 return btoa(chunks.join(''));
}
function readFour(p){
 return new Promise(function(resolve,reject){
  var open=indexedDB.open('healthhub-healthradar-v2',1),db=null,docs=[],keys=[];
  open.onerror=function(){reject(Error('A helyi lelettár nem nyitható meg.'))};
  open.onsuccess=function(){
   db=open.result;
   if(!db.objectStoreNames.contains('documents')||!db.objectStoreNames.contains('documentBlobs')){
    db.close();reject(Error('Hiányzik a helyi eredeti PDF-tár.'));return;
   }
   var tx=db.transaction(['documents','documentBlobs'],'readonly');
   var req1=tx.objectStore('documents').getAll(),req2=tx.objectStore('documentBlobs').getAll();
   req1.onsuccess=function(){docs=req1.result||[]};
   req2.onsuccess=function(){keys=req2.result||[]};
   tx.onerror=function(){db.close();reject(Error('Lelettár olvasási hiba.'))};
   tx.onabort=function(){db.close();reject(Error('Lelettár olvasás megszakadt.'))};
   tx.oncomplete=function(){
    db.close();
    var map=new Map(keys.filter(function(k){return k&&k.blob&&k.id}).map(function(k){return [k.id,k.blob]}));
    var rows=docs.filter(function(d){return d&&d.profile===p&&map.has(d.id)})
     .map(function(d){return {metadata:d,blob:map.get(d.id)}});
    resolve(rows);
   };
  };
 });
}
async function inspect(){
 if(busy)return;busy=true;candidates=[];profileAtPreview=null;
 var b=el('hhPdfRepairScan694'),u=el('hhPdfRepairRun694');
 if(b)b.disabled=true;if(u)u.disabled=true;
 var p=profile();report('Ellenőrzés folyamatban. Eredeti leleteket nem módosítok…');
 try{
  var api=vault(),auth=api&&api.getStatus&&api.getStatus();
  if(!api||!api.stream||!auth||!auth.authenticated||
     !Array.isArray(auth.authorizedProfiles)||!auth.authorizedProfiles.includes(p))
   throw Error('Health Vault profiljogosultság szükséges.');
  var rows=await readFour(p);
  if(!current(p))throw Error('Közben profilváltás történt.');
  if(rows.length!==4)throw Error('Pontosan négy helyi eredetit vártunk, de '+rows.length+
   ' található. Biztonságból nincs automatikus kijelölés.');
  var verified=[];
  for(var pair of rows){
   var d=pair.metadata,b=pair.blob;
   if(!current(p))throw Error('Közben profilváltás történt.');
   if(!/\.pdf$/i.test(String(d.originalName||''))||
      !goodHash(d.sha256)||b.size<5||b.size>MAX)
    throw Error('Az egyik PDF metaadata hiányos vagy nagyobb mint 8 MB. Nincs automatikus javítás.');
   var bytes=new Uint8Array(await b.arrayBuffer());
   if(bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70||bytes[4]!==45||
      await bytesSha(bytes.buffer)!==String(d.sha256).toLowerCase())
    throw Error('Az egyik helyi eredeti PDF SHA-256 ellenőrzése sikertelen.');
   verified.push({metadata:d,bytes:bytes});
  }
  var response=await api.stream('/functions/v1/hh-drive-oauth-v682',
   {action:'archive_inventory',profile:p});
  if(!current(p))throw Error('Közben profilváltás történt.');
  if(!response.ok)throw Error('Privát Drive-leltár nem elérhető (HTTP '+response.status+').');
  var inventory=await response.json();
  if(!inventory||inventory.profile!==p||!Array.isArray(inventory.files))
   throw Error('Nem sikerült a helyes Drive-profil igazolása.');
  var hashes=new Set(inventory.files.filter(function(f){return f&&
   f.mimeType==='application/pdf'&&f.appProperties&&f.appProperties.profile===p})
   .map(function(f){return String(f.appProperties.sha256||'').toLowerCase()}).filter(goodHash));
  candidates=verified.filter(function(x){return !hashes.has(String(x.metadata.sha256).toLowerCase())});
  profileAtPreview=p;
  report('✅ '+name(p)+' · 4 helyi eredeti PDF bájtszinten ellenőrizve.\n'+
   (4-candidates.length)+' már az archívumhoz rendelhető SHA-256 alapján.\n'+
   candidates.length+' eredeti PDF hiányzik a megfelelő SHA-256 címkével rendelkező Drive-archívumból.\n'+
   (candidates.length?'A feltöltés csak a külön jóváhagyó gombra indul.':'Nem kell feltöltés.'));
  if(u)u.disabled=candidates.length===0;
 }catch(e){candidates=[];profileAtPreview=null;report('⚠ '+String(e&&e.message||e))}
 finally{busy=false;if(b)b.disabled=false}
}
async function repair(){
 if(busy||!candidates.length||profileAtPreview!==profile())return;
 var p=profileAtPreview,count=candidates.length;
 if(!window.confirm('A '+count+' ellenőrzött '+name(p)+' PDF-et feltöltjük a privát Google Drive-archívumba.\nNem törlünk és nem írunk felül semmit. Folytatod?'))return;
 busy=true;var b=el('hhPdfRepairScan694'),u=el('hhPdfRepairRun694');
 if(b)b.disabled=true;if(u)u.disabled=true;
 var archived=0,verified=0,skipped=0;
 try{
  for(var original of candidates){
   if(!current(p))throw Error('Profilváltás: a javítás megállt.');
   var d=original.metadata,bytes=original.bytes;
   report('Biztonságos helyreállítás: '+(archived+skipped+1)+'/'+count+
    ' · ellenőrzött: '+verified+' · megszakítás bármikor lehetséges profilváltással.');
   var response=await vault().stream('/functions/v1/hh-drive-repair-v694',{
    action:'repair_upload_original_v694',profile:p,documentId:d.id,
    originalName:d.originalName,sha256:String(d.sha256).toLowerCase(),
    base64:base64(bytes)});
   if(!current(p))throw Error('Profilváltás: a javítás megállt.');
   var info=await response.json().catch(function(){return null});
   if(!response.ok||!info||info.ok!==true)
    throw Error('A szerver elutasította a javítást (HTTP '+response.status+
      (info&&info.error?' · '+String(info.error).slice(0,50):'')+').');
   if(info.result==='already_archived'){skipped++;continue}
   if(info.result!=='archived'||!/^[A-Za-z0-9_-]{8,200}$/.test(String(info.fileId||'')))
    throw Error('A Drive feltöltése nem igazolható.');
   archived++;
   // Verify downloaded bytes using the existing read-only server gateway.
   var proof=await vault().stream('/functions/v1/hh-drive-oauth-v682',{
    action:'archive_document',profile:p,documentId:d.id,fileId:info.fileId});
   if(!current(p))throw Error('Profilváltás: a javítás megállt.');
   if(!proof.ok)throw Error('Az eredeti feltöltődött, de a visszaolvasás még nem igazolt.');
   var downloaded=await proof.arrayBuffer();
   if(downloaded.byteLength!==bytes.length||await bytesSha(downloaded)!==
      String(d.sha256).toLowerCase())throw Error('A feltöltött PDF bájtellenőrzése nem egyezik.');
   verified++;
  }
  report('✅ Javítási kör befejeződött: '+archived+' archivált PDF; '+
   verified+' visszaolvasással ellenőrzött; '+skipped+
   ' már archivált.\nMost a mobilon teszteljük ugyanazt a négy leletet.');
  candidates=[];profileAtPreview=null;
 }catch(e){report('⚠ A javítás részben vagy egészben megállt.\nArchivált: '+
   archived+' · visszaolvasással igazolt: '+verified+' · már meglévő: '+
   skipped+'.\nOk: '+String(e&&e.message||e)+
   '\nÚjabb próbálkozás előtt futtasd ismét a csak olvasásos ellenőrzést.')}
 finally{busy=false;if(b)b.disabled=false;if(u)u.disabled=true}
}
function mount(){
 var ov=el('haOv'),body=el('haBody');
 if(!ov||!body||!ov.classList.contains('on')||el(ID))return;
 var p=document.createElement('section');p.id=ID;
 p.style.cssText='margin:12px 0;padding:14px;border:1px solid rgba(155,220,240,.34);border-radius:18px;background:linear-gradient(135deg,#14273f,#213651);color:#eaf4ff;font:12px/1.6 system-ui';
 var title=document.createElement('h3');title.textContent='🛠️ Négy eredeti PDF helyreállítása · v694';
 title.style.cssText='font-size:15px;margin:0 0 5px';
 var hint=document.createElement('p');hint.textContent='Csak a PC-n meglévő 4 eredeti lelet. Előzetes SHA-256 ellenőrzés; feltöltés kizárólag külön jóváhagyással.';
 var check=document.createElement('button');check.id='hhPdfRepairScan694';
 check.type='button';check.textContent='🔎 Négy helyi PDF ellenőrzése';check.addEventListener('click',inspect);
 var upload=document.createElement('button');upload.id='hhPdfRepairRun694';
 upload.type='button';upload.textContent='🔐 Hiányzó eredetiek archiválása';upload.disabled=true;
 upload.addEventListener('click',repair);
 [check,upload].forEach(function(b){b.style.cssText='padding:10px;margin:5px 6px 5px 0;min-height:44px;border:1px solid #8fc6df;background:#226083;color:#fff;border-radius:10px;font-weight:700'});
 var out=document.createElement('div');out.id='hhPdfRepairStatus694';
 out.textContent='Nem futott ellenőrzés. A telefon helyett Mónika PC-jén indítsd.';
 out.style.cssText='margin-top:8px;white-space:pre-wrap;overflow-wrap:anywhere';
 out.setAttribute('role','status');
 p.append(title,hint,check,upload,out);
 var after=el('hhPdfDeviceAudit691');if(after&&after.parentNode===body)after.after(p);else body.insertBefore(p,body.firstChild);
}
function install(){
 var ov=el('haOv');if(!ov){setTimeout(install,400);return}
 if(observer)observer.disconnect();
 observer=new MutationObserver(mount);observer.observe(ov,{attributes:true,attributeFilter:['class']});
 var body=el('haBody');if(body)new MutationObserver(mount).observe(body,{childList:true});
 mount();
}
window.addEventListener('healthhub:profile-changed',function(){
 candidates=[];profileAtPreview=null;var button=el('hhPdfRepairRun694');
 if(button)button.disabled=true;
 report('Profilváltás történt; új ellenőrzés szükséges.');
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();