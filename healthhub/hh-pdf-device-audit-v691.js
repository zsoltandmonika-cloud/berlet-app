(function(){
'use strict';
/* v691: explicit read-only per-device PDF evidence. No medical titles/content,
   tokens, full account IDs, filenames or hashes leave the Admin panel. */
var ID='hhPdfDeviceAudit691',CSS='hhPdfDeviceAudit691Css',busy=false,observer=null;
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function el(id){return document.getElementById(id)}
function validActive(p){return profile()===p}
function reportText(lines){return lines.join('\n')}
function statusText(text){var out=el('hhPdfDeviceOutput691');if(out)out.textContent=String(text||'')}
function build(){
 var m=document.querySelector('meta[name="healthhub-live-build"]');
 return m&&m.content||'ismeretlen';
}
function viewerRuntime(){
 var f=window.openHrDocument;
 return typeof f==='function'&&Function.prototype.toString.call(f).includes('pdfFromPrivateDriveV690');
}
function loadedViewer(){
 var list=Array.from(document.querySelectorAll('script[src]'));
 var s=list.filter(function(x){return /(?:^|\/)live-v201\.js(?:\?|$)/.test(x.getAttribute('src')||'')});
 return s.length?s[s.length-1].getAttribute('src').split('?v=')[1]||'verzió nélkül':'NEM található';
}
function localState(p){
 return new Promise(function(resolve,reject){
  var r=indexedDB.open('healthhub-healthradar-v2',1),db=null,tx=null,docs=[],keys=[];
  r.onerror=function(){reject(Error('A helyi IndexedDB nem nyitható meg.'))};
  r.onsuccess=function(){
   db=r.result;
   if(!db.objectStoreNames.contains('documents')||!db.objectStoreNames.contains('documentBlobs')){
    db.close();resolve({count:0,blobs:0,missing:0,ids:[],issue:'A helyi dokumentumtár hiányzik.'});return;
   }
   try{
    tx=db.transaction(['documents','documentBlobs'],'readonly');
    var store=tx.objectStore('documents');
    var qr=store.indexNames.contains('profile')?store.index('profile').getAll(p):store.getAll();
    var kr=tx.objectStore('documentBlobs').getAllKeys();
    qr.onsuccess=function(){docs=qr.result||[]};
    kr.onsuccess=function(){keys=kr.result||[]};
    tx.oncomplete=function(){
     db.close();
     var rows=docs.filter(function(d){return d&&d.profile===p&&typeof d.id==='string'});
     var have=new Set(keys.map(String)),missing=rows.filter(function(d){return !have.has(d.id)});
     resolve({count:rows.length,blobs:rows.length-missing.length,
      missing:missing.length,ids:rows.map(function(d){return d.id}),
      missingIds:missing.map(function(d){return d.id})});
    };
    tx.onerror=function(){db.close();reject(Error('Helyi dokumentumtár olvasási hiba.'))};
    tx.onabort=function(){db.close();reject(Error('Helyi dokumentumtár ellenőrzés megszakadt.'))};
   }catch(e){try{db.close()}catch(_){}reject(Error('Helyi dokumentumtár ellenőrzés nem támogatott.'))}
  };
 });
}
async function accountFingerprint(){
 var token=null;
 try{token=JSON.parse(localStorage.getItem('hh-dropbox-token-v2')||'null')}catch(_){}
 if(!token||!token.refresh_token)return 'nincs Dropbox token';
 var value=typeof token.account_id==='string'?token.account_id:'';
 if(!/^dbid:[A-Za-z0-9_-]{8,200}$/.test(value))return 'bejelentkezve; fiókazonosító nem elérhető';
 if(!crypto||!crypto.subtle)return 'bejelentkezve; ellenőrző kód nem számítható';
 var bytes=new TextEncoder().encode('HH-V691-AUDIT:'+value);
 var h=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return 'DBX-'+Array.from(h.slice(0,6),function(x){return x.toString(16).padStart(2,'0')}).join('').toUpperCase();
}
async function cloudProfileExists(p){
 var v=window.HH_DROPBOX_VAULT;
 if(!v||!v.connected||!v.connected()||!v.accessToken)return 'nincs aktív Dropbox kapcsolat';
 var token=await v.accessToken();
 var url='https://api.dropboxapi.com/2/files/get_metadata';
 var response=await fetch(url,{method:'POST',cache:'no-store',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({path:'/HealthHub/profiles/'+p+'-vault.json',include_deleted:false})});
 if(response.status===409)return 'nem található a csatlakozott Dropboxban';
 if(response.status===401||response.status===403)return 'Dropbox jogosultság elutasítva (HTTP '+response.status+')';
 if(!response.ok)return 'Dropbox fájlmetaadat hiba (HTTP '+response.status+')';
 var meta=await response.json();
 return meta&&meta['.tag']==='file'?'fájl létezik (metaadat igazolva)':'nem igazolt fájltípus';
}
async function driveMatch(p,local){
 var api=window.HH_DAILY_HEALTH_SYNC_V319,s=api&&api.getStatus&&api.getStatus();
 if(!api||!api.stream||!s||!s.authenticated)return 'Health Vault nincs hitelesítve';
 if(!Array.isArray(s.authorizedProfiles)||!s.authorizedProfiles.includes(p))
  return 'Health Vault profiljogosultság HIÁNYZIK';
 var response=await api.stream('/functions/v1/hh-drive-oauth-v682',
  {action:'archive_inventory',profile:p});
 if(!response.ok)return 'Drive-leltár nem elérhető (HTTP '+response.status+')';
 var data=await response.json();
 if(!validActive(p))return 'Profilváltás történt; ellenőrzés megszakadt';
 if(data.profile!==p||!Array.isArray(data.files))return 'Érvénytelen Drive-leltár';
 var tags=new Map(),pdf=0;
 data.files.forEach(function(f){
  if(!f||f.mimeType!=='application/pdf')return;
  pdf++;
  if(f.appProperties&&f.appProperties.profile===p){
   var id=String(f.appProperties.documentId||'');
   if(id)tags.set(id,(tags.get(id)||0)+1);
  }
 });
 var localIds=new Set(local.ids),missing=local.missingIds||[];
 var matched=missing.filter(function(id){return tags.get(id)===1}).length;
 var ambiguous=missing.filter(function(id){return (tags.get(id)||0)>1}).length;
 return pdf+' eredeti PDF; '+tags.size+' dokumentumazonosító-címke; '+
  matched+'/'+missing.length+' helyben hiányzó PDF-hez pontos Drive-találat'+
  (ambiguous?' · '+ambiguous+' kétértelmű azonosító':'')+
  (missing.length&&matched===0?' · ID-KAPCSOLAT NEM IGAZOLT':'');
}
async function run(){
 if(busy)return;busy=true;var p=profile(),button=el('hhPdfDeviceRun691');
 if(button)button.disabled=true;
 statusText('Ellenőrzés folyamatban (csak olvasás)…');
 var lines=['HealthHub v691 · készülék-PDF diagnosztika','Ellenőrizve: '+new Date().toLocaleString('hu-HU'),
  'Eszköz: '+(/Android|iPhone|Mobile/i.test(navigator.userAgent||'')?'mobil':'asztali böngésző'),
  'Profil: '+pname(p),'Build: '+build(),
  'Betöltött PDF-modul: '+loadedViewer(),
  'Aktív PDF-olvasó v690: '+(viewerRuntime()?'IGEN':'NEM / felülírva')];
 try{
  var svc=window.HH_DAILY_HEALTH_SYNC_V319,a=svc&&svc.getStatus&&svc.getStatus();
  lines.push('Health Vault belépés: '+(a&&a.authenticated?'IGEN':'NEM'));
  lines.push('Aktív profil engedélyezve: '+(a&&Array.isArray(a.authorizedProfiles)&&a.authorizedProfiles.includes(p)?'IGEN':'NEM'));
  lines.push('Dropbox fiókellenőrző kód: '+await accountFingerprint());
  if(!validActive(p))throw Error('Profilváltás történt.');
  var local=await localState(p);
  if(!validActive(p))throw Error('Profilváltás történt.');
  lines.push('Helyi leletindex: '+local.count+' · eredeti helyi PDF: '+local.blobs+' · hiányzó PDF: '+local.missing);
  if(local.issue)lines.push('Helyi tárhely: '+local.issue);
  for(var q of ['zsolt','monika']){
   try{lines.push('Dropbox '+pname(q)+' profilfájl: '+await cloudProfileExists(q))}
   catch(e){lines.push('Dropbox '+pname(q)+' profilfájl: nem ellenőrizhető ('+String(e&&e.message||'hiba').slice(0,60)+')')}
   if(!validActive(p))throw Error('Profilváltás történt.');
  }
  try{lines.push('Google Drive '+pname(p)+' ID-kapcsolat: '+await driveMatch(p,local))}
  catch(e){lines.push('Drive ID-kapcsolat: nem ellenőrizhető ('+String(e&&e.message||'hiba').slice(0,60)+')')}
  if(!validActive(p))throw Error('Profilváltás történt.');
  lines.push('Következtetés: azonos profil esetén a PC és a telefon jelentését hasonlítsuk össze.');
 }catch(e){lines.push('ELLENŐRZÉS LEÁLLT: '+String(e&&e.message||'hiba').slice(0,100))}
 finally{busy=false;if(button)button.disabled=false;statusText(reportText(lines))}
}
function mount(){
 var overlay=el('haOv'),body=el('haBody');
 if(!overlay||!body||!overlay.classList.contains('on'))return;
 var existing=el(ID);if(existing)return;
 if(!el(CSS)){
  var style=document.createElement('style');style.id=CSS;
  style.textContent='#'+ID+'{padding:14px;margin:12px 0;border:1px solid rgba(152,205,238,.28);border-radius:18px;background:linear-gradient(135deg,#13283f,#1a3550);color:#e9f5ff;font:12px/1.5 system-ui;overflow-wrap:anywhere}'+
   '#'+ID+' h3{font-size:15px;margin:0 0 5px;color:#fff}#'+ID+' p{font-size:11px;margin:0 0 10px;color:#c1daeb}'+
   '#'+ID+' button{border:1px solid #87bdd3;border-radius:10px;background:#1e6388;color:white;padding:9px 11px;font-weight:750;min-height:39px;margin-right:6px}'+
   '#'+ID+' button:disabled{opacity:.5}#hhPdfDeviceOutput691{margin:10px 0 0;white-space:pre-wrap;font:11px/1.65 ui-monospace,SFMono-Regular,monospace;color:#e0eef8}';
  document.head.appendChild(style);
 }
 var panel=document.createElement('section');panel.id=ID;
 var heading=document.createElement('h3');heading.textContent='🔎 PDF · Készülékdiagnosztika v691';
 var note=document.createElement('p');note.textContent='PC és telefon összehasonlítása. Csak olvasás · eredeti PDF és token nem kerül a jelentésbe.';
 var button=document.createElement('button');button.id='hhPdfDeviceRun691';button.type='button';button.textContent='🔍 Ellenőrzés indítása';button.addEventListener('click',run);
 var copy=document.createElement('button');copy.type='button';copy.textContent='📋 Jelentés másolása';
 copy.addEventListener('click',async function(){
  var text=el('hhPdfDeviceOutput691')&&el('hhPdfDeviceOutput691').textContent||'';
  if(!text||text.indexOf('Ellenőrizve:')<0)return;
  try{await navigator.clipboard.writeText(text);copy.textContent='✅ Kimásolva'}
  catch(_){copy.textContent='Kijelölés és másolás szükséges'}
 });
 var out=document.createElement('div');out.id='hhPdfDeviceOutput691';out.setAttribute('role','status');out.textContent='Az ellenőrzés még nem futott le.';
 panel.append(heading,note,button,copy,out);
 var next=el('hhConnectionCenter355');if(next&&next.parentNode===body)next.after(panel);
 else body.insertBefore(panel,body.firstChild);
}
function init(){
 var overlay=el('haOv');if(!overlay){setTimeout(init,450);return}
 if(observer)observer.disconnect();
 observer=new MutationObserver(mount);observer.observe(overlay,{attributes:true,attributeFilter:['class']});
 var body=el('haBody');if(body)new MutationObserver(mount).observe(body,{childList:true});
 mount();
}
window.addEventListener('healthhub:profile-changed',function(){
 var out=el('hhPdfDeviceOutput691');if(out)out.textContent='Profil megváltozott. Új készülékdiagnosztika szükséges.';
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();