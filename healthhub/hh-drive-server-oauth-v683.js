(function(){
'use strict';
// v683: OPT-IN management of confidential server Google OAuth.
// Does not replace or change working browser Drive connectivity until
// OAuth server secrets and verified end-to-end gateway are available.
// Neither authorization codes nor access/refresh tokens enter storage.
var ID='hhGoogleDriveOffline683',loading=false,seen=false,version=0;
var lastInventory=null;
function selectedProfile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function showInventory(profile,message){
 lastInventory={profile:profile,message:message};
 var line=el('hhDriveInventoryResultV686');
 if(line&&selectedProfile()===profile){line.hidden=false;line.textContent=message;}
}
function renderInventory(){
 var line=el('hhDriveInventoryResultV686');if(!line)return;
 var match=lastInventory&&lastInventory.profile===selectedProfile();
 line.hidden=!match;
 if(match)line.textContent=lastInventory.message;
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
 var resultLine=document.createElement('div');
 resultLine.id='hhDriveInventoryResultV686';resultLine.hidden=true;
 resultLine.setAttribute('role','status');
 resultLine.setAttribute('aria-live','polite');
 resultLine.style.cssText='margin:10px 0 4px;padding:10px;border:1px solid rgba(133,202,227,.48);border-radius:10px;background:rgba(5,29,46,.7);font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere';
 host.append(title,status,btn,inventory,resultLine,hint);
 parent.insertAdjacentElement('afterend',host);
 renderInventory();
 inventory.addEventListener('click',async function(){
  if(loading||!ready())return;
  var who=selectedProfile();
  var auth=vault().getStatus();
  if(!auth.authorizedProfiles.includes(who)){
   showInventory(who,'🔒 A kiválasztott profilhoz nincs Vault-jogosultság.');return;
  }
  loading=true;inventory.disabled=true;btn.disabled=true;
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
    ' · '+pdfs.length+' PDF.\\nA Google-token a szerveren maradt, az eredeti dokumentumok változatlanok.');
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
 version++;lastInventory=null;renderInventory();if(el(ID))refresh();
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
