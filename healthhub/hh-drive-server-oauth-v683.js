(function(){
'use strict';
// v683: OPT-IN management of confidential server Google OAuth.
// Does not replace or change working browser Drive connectivity until
// OAuth server secrets and verified end-to-end gateway are available.
// Neither authorization codes nor access/refresh tokens enter storage.
var ID='hhGoogleDriveOffline683',loading=false,seen=false,version=0;
var lastInventory=null,lastPdfProof=null;
function showPdfProof(profile,message){
 lastPdfProof={profile:profile,message:message};
 renderInventory();
}
function validateCurrentProfile(profile){
 if(profile!==selectedProfile())throw Error('Közben profilváltás történt.');
 var state=vault()?.getStatus?.();
 if(!state||!state.authenticated||!state.authorizedProfiles?.includes(profile))
  throw Error('Health Vault profiljogosultság szükséges.');
}
function safeGatewayError(result,status){
 var value=result&&typeof result.error==='string'&&/^[a-z_]{3,70}$/.test(result.error)?' · '+result.error:'';
 return 'Szerveroldali Google Drive HTTP '+status+value;
}
async function pdfResponse(action,who,fileId){
 var response=await vault().stream('/functions/v1/hh-drive-oauth-v682',
  {action:action,profile:who,fileId:fileId});
 if(!response.ok){
  var problem=await response.json().catch(function(){return null});
  throw Error(safeGatewayError(problem,response.status));
 }
 return response;
}
function selectedProfile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function showInventory(profile,message,canProbe){
 lastInventory={profile:profile,message:message,canProbe:canProbe===true};
 renderInventory();
}
function renderInventory(){
 var line=el('hhDriveInventoryResultV686'),proof=el('hhDrivePdfProofResultV688'),
  button=el('hhDrivePdfProofV688');
 var profile=selectedProfile();
 var match=!!(lastInventory&&lastInventory.profile===profile);
 if(line){line.hidden=!match;if(match)line.textContent=lastInventory.message;}
 if(button)button.hidden=!(match&&lastInventory.canProbe);
 var proofMatch=!!(lastPdfProof&&lastPdfProof.profile===profile);
 if(proof){proof.hidden=!proofMatch;if(proofMatch)proof.textContent=lastPdfProof.message;}
}
function el(id){return document.getElementById(id)}
function vault(){return window.HH_DAILY_HEALTH_SYNC_V319}
function ready(){
 var v=vault(),s=v&&v.getStatus&&v.getStatus();
 return !!(v&&v.stream&&s&&s.authenticated&&
   Array.isArray(s.authorizedProfiles)&&s.authorizedProfiles.length>0);
}
function create(){
 var panel=el('hhMkbBatch662'),host=el(ID);
 if(!panel||host||!ready())return;
 var parent=panel.querySelector('.connections');
 if(!parent)return;
 host=document.createElement('div');host.id=ID;
 host.style.cssText='margin:10px 0;padding:12px;border:1px solid rgba(142,203,224,.3);border-radius:12px;background:rgba(8,31,51,.36);color:#ddf1ff;font:12px/1.55 system-ui';
 var title=document.createElement('strong');
 title.textContent='🔐 Tartós Google Drive-kapcsolat · szerveroldali';
 var status=document.createElement('div');status.id='hhGoogleDriveOfflineStatus683';
 status.textContent='⏳ Szerveroldali kapcsolat állapotának ellenőrzése…';
 var btn=document.createElement('button');btn.id='hhGoogleDriveOfflineButton683';
 btn.type='button';btn.hidden=true;btn.style.cssText='margin-top:8px;min-height:44px;border:1px solid #77bdd5;background:#236986;color:white;border-radius:10px;padding:8px 13px;font-weight:750;cursor:pointer';
 var hint=document.createElement('small');
 hint.textContent='A meglévő Drive-kapcsolat változatlan. Google-engedélyt kizárólag a gomb megnyomásakor kérünk; megújító token nem kerül a böngészőbe.';
 hint.style.cssText='display:block;color:#b4d4e3;margin-top:6px';
 var inventory=document.createElement('button');inventory.id='hhDriveInventoryV685';
 inventory.type='button';inventory.hidden=true;
 inventory.style.cssText='margin-top:8px;min-height:44px;border:1px solid #77bdd5;background:#285168;color:white;border-radius:10px;padding:8px 13px;font-weight:750;cursor:pointer';
 inventory.textContent='🔎 Privát Drive-leltár ellenőrzése (csak olvasás)';
 var proofButton=document.createElement('button');proofButton.id='hhDrivePdfProofV688';
 proofButton.type='button';proofButton.hidden=true;
 proofButton.textContent='🔐 Egy PDF SHA-256 próbaolvasása (csak olvasás)';
 proofButton.style.cssText='margin-top:8px;min-height:44px;border:1px solid #77bdd5;background:#285168;color:white;border-radius:10px;padding:8px 13px;font-weight:750;cursor:pointer';
 var proofResult=document.createElement('div');
 proofResult.id='hhDrivePdfProofResultV688';proofResult.hidden=true;
 proofResult.setAttribute('role','status');proofResult.setAttribute('aria-live','polite');
 proofResult.style.cssText='margin:10px 0 4px;padding:10px;border:1px solid rgba(133,202,227,.48);border-radius:10px;background:rgba(5,29,46,.7);font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere';
 var resultLine=document.createElement('div');
 resultLine.id='hhDriveInventoryResultV686';resultLine.hidden=true;
 resultLine.setAttribute('role','status');
 resultLine.setAttribute('aria-live','polite');
 resultLine.style.cssText='margin:10px 0 4px;padding:10px;border:1px solid rgba(133,202,227,.48);border-radius:10px;background:rgba(5,29,46,.7);font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere';
 host.append(title,status,btn,inventory,resultLine,proofButton,proofResult,hint);
 parent.insertAdjacentElement('afterend',host);
 renderInventory();

 proofButton.addEventListener('click',async function(){
  if(loading||!ready())return;
  var who=selectedProfile();
  if(!lastInventory||lastInventory.profile!==who||!lastInventory.canProbe){
   showPdfProof(who,'⚠ Előbb ellenőrizd a privát Drive-leltárt.');
   return;
  }
  loading=true;proofButton.disabled=true;inventory.disabled=true;btn.disabled=true;
  try{
   validateCurrentProfile(who);
   showPdfProof(who,'⏳ Privát MKB SHA-256 lenyomat és eredeti PDF összehasonlítása…');
   // SHA must come from already verified private source data, never from Drive metadata.
   var rows=await vault().request('/rest/v1/hh_kb_documents?select=source_file_id,sha256,size_bytes,status,text_integrity_status'+
    '&profile_key=eq.'+encodeURIComponent(who)+'&limit=1000',{method:'GET'});
   if(!Array.isArray(rows))throw Error('A privát MKB ellenőrzőadat nem elérhető.');
   var hashes=new Map();
   rows.forEach(function(d){
    if(!d||typeof d.source_file_id!=='string'||!/^drive_[a-zA-Z0-9_-]{8,200}$/.test(d.source_file_id)||
       !/^[a-fA-F0-9]{64}$/.test(String(d.sha256||''))||
       d.status!=='complete'||d.text_integrity_status!=='verified')return;
    hashes.set(d.source_file_id.slice(6),d);
   });
   validateCurrentProfile(who);
   var inventoryResponse=await pdfResponse('archive_inventory',who);
   var data=await inventoryResponse.json();
   if(data?.profile!==who||!Array.isArray(data.files))throw Error('A Drive-leltár érvénytelen.');
   var candidates=data.files.filter(function(f){
    var d=f&&hashes.get(f.id),n=Number(f&&f.size);
    return d&&f.mimeType==='application/pdf'&&
     Number.isSafeInteger(n)&&n>=5&&n<=25000000&&n===Number(d.size_bytes);
   });
   candidates.sort(function(a,b){return Number(a.size)-Number(b.size)});
   var target=candidates[0];
   if(!target)throw Error('Nincs méret- és SHA-256 ellenőrzésre alkalmas indexelt PDF.');
   validateCurrentProfile(who);
   showPdfProof(who,'⏳ Egy ellenőrzött PDF letöltése kizárólag olvasásra…');
   var pdf=await pdfResponse('archive_pdf',who,target.id);
   if(!/application\/pdf/i.test(pdf.headers.get('content-type')||''))
    throw Error('Az átjáró nem PDF-et szolgáltatott.');
   var bytes=await pdf.arrayBuffer();
   validateCurrentProfile(who);
   if(bytes.byteLength!==Number(target.size))throw Error('Az eredeti PDF mérete eltér.');
   var b=new Uint8Array(bytes);
   if(b.length<5||b[0]!==37||b[1]!==80||b[2]!==68||b[3]!==70||b[4]!==45)
    throw Error('Érvénytelen PDF-aláírás.');
   var actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
    .map(function(v){return v.toString(16).padStart(2,'0')}).join('');
   var expected=String(hashes.get(target.id).sha256).toLowerCase();
   if(actual!==expected)throw Error('A PDF SHA-256 lenyomata NEM egyezik az eredetivel.');
   validateCurrentProfile(who);
   showPdfProof(who,'✅ Hiteles eredeti PDF próbaolvasás: '+(who==='monika'?'Mónika':'Zsolt')+
    ' · 1 PDF · '+bytes.byteLength.toLocaleString('hu-HU')+
    ' bájt.\\nSHA-256: pontos egyezés a privát MKB eredeti lenyomatával. Nincs módosítás vagy újraimportálás.');
  }catch(e){
   if(selectedProfile()===who)
    showPdfProof(who,'⚠ PDF próbaolvasás nem igazolt: '+
     String(e&&e.message||e||'ismeretlen hiba').slice(0,190)+
     '.\\nEredeti dokumentum és MKB változatlan.');
  }finally{loading=false;proofButton.disabled=false;inventory.disabled=false;btn.disabled=false}
 });

 inventory.addEventListener('click',async function(){
  if(loading||!ready())return;
  var who=selectedProfile();
  var auth=vault().getStatus();
  if(!auth.authorizedProfiles.includes(who)){
   showInventory(who,'🔒 A kiválasztott profilhoz nincs Vault-jogosultság.');return;
  }
  loading=true;inventory.disabled=true;btn.disabled=true;
  lastPdfProof=null;renderInventory();
  try{
   showInventory(who,'⏳ A '+(who==='monika'?'Mónika':'Zsolt')+' profil PDF-leltárának ellenőrzése… Várd meg a végleges eredményt.');
   var response=await vault().stream('/functions/v1/hh-drive-oauth-v682',
    {action:'archive_inventory',profile:who});
   if(!response.ok){
    var problem=await response.json().catch(function(){return null});
    var code=problem&&typeof problem.error==='string'&&/^[a-z_]{3,70}$/.test(problem.error)?' · '+problem.error:'';
    throw Error('Szerveroldali leltár HTTP '+response.status+code);
   }
   var result=await response.json();
   if(localStorage.getItem('hh-profile')!==(who==='monika'?'m':'z'))
    throw Error('Profilváltás történt.');
   if(result.profile!==who||!Array.isArray(result.files))
    throw Error('Érvénytelen leltárválasz.');
   var pdfs=result.files.filter(function(f){return f&&f.mimeType==='application/pdf'});
   if(pdfs.length!==result.files.length)throw Error('Eltérő fájltípus a leltárban.');
   showInventory(who,'✅ Szerveroldali Drive-leltár: '+(who==='monika'?'Mónika':'Zsolt')+
    ' · '+pdfs.length+' PDF.\\nA Google-token a szerveren maradt, az eredeti dokumentumok változatlanok.',true);
  }catch(e){
   if(selectedProfile()===who)
    showInventory(who,'⚠ A privát Drive-leltár nem igazolható: '+
     String(e&&e.message||'kapcsolati hiba').slice(0,135)+'.\\nDokumentum nem módosult.');
  }finally{loading=false;inventory.disabled=false;btn.disabled=false}
 });

 btn.addEventListener('click',async function(){
  if(loading||!ready())return;
  loading=true;btn.disabled=true;
  try{
   status.textContent='⏳ Biztonságos Google-engedélyezési kapcsolat indítása…';
   var answer=await send('start');
   if(!ready())throw Error('Vault újraengedélyezés szükséges');
   var address=String(answer?.authorization_url||'');
   if(!/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/.test(address))
    throw Error('Nem hitelesített Google OAuth-cím');
   window.location.assign(address);
  }catch(_){
   status.textContent='⚠ A Google Cloud OAuth-beállítás még nem teljes, vagy a Vault-jogosultság megszakadt.';
   loading=false;btn.disabled=false;
  }
 });
 refresh();
}
async function send(action){
 var v=vault(),response=await v.stream('/functions/v1/hh-drive-oauth-v682',{action});
 if(!response.ok)throw Error('secure_oauth_unavailable');
 var value=await response.json();
 if(!value||typeof value!=='object')throw Error('invalid_reply');
 return value;
}
async function refresh(){
 var host=el(ID),status=el('hhGoogleDriveOfflineStatus683'),
  btn=el('hhGoogleDriveOfflineButton683'),inventory=el('hhDriveInventoryV685');
 if(!host||!status||!btn||!ready())return;
 // Keep the previous read-only inventory result visible during token status refresh.
 renderInventory();
 var request=++version;
 try{
  var state=await send('status');
  if(version!==request||!el(ID))return;
  if(!state.configured){
   status.textContent='🛠 A szerveroldali OAuth előkészítve. A Google Cloud kliens és a Supabase-titkok konfigurálása szükséges.';
   btn.hidden=true;
  }else if(state.connected){
   // Validate a real server-side refresh and Drive identity, not just existence of a saved row.
   status.textContent='⏳ Titkosított engedély mentve. Google-hozzáférés szerveroldali ellenőrzése…';
   btn.textContent='🔄 Google-engedély újrakiadása';btn.hidden=false;
   var verified=await send('check');
   if(version!==request||!el(ID))return;
   var valid=!!(verified&&verified.connected===true&&!verified.reauthorizationNeeded);
   status.textContent=valid
    ? '✅ Tartós Google-engedély aktív. A szerver önállóan megújította a hozzáférést és ellenőrizte a Google-fiókot. A Drive-adatútvonal átállítása még külön feladat.'
    : '⚠ A titkosított engedély megvan, de a szerveroldali Google-hozzáférés nem igazolható. Használd a Google-engedély újrakiadása gombot.';
   if(inventory)inventory.hidden=!valid;
  }else{
   status.textContent='🔒 A szerver készen áll. Egyszeri Google-jóváhagyás szükséges.';
   btn.textContent='🔐 Egyszeri Google-engedélyezés';btn.hidden=false;
  }
 }catch(_){
  if(version===request&&el(ID)){
   status.textContent='⚠ A szerveroldali Drive-állapot most nem kérdezhető le.';
   btn.hidden=true;
  }
 }
}
function mount(){
 if(!ready())return;
 create();
}
window.addEventListener('healthhub:central-auth-changed',function(){
 version++;if(el(ID))refresh();else mount();
});
window.addEventListener('healthhub:profile-changed',function(){
 version++;lastInventory=null;lastPdfProof=null;renderInventory();if(el(ID))refresh();
});
window.addEventListener('healthhub:google-drive-token-changed',function(){if(el(ID))refresh()});
function watch(){
 var admin=el('haOv');if(!admin)return;
 if(!seen){
  seen=true;new MutationObserver(mount).observe(admin,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 }
 mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});
else watch();
})();
