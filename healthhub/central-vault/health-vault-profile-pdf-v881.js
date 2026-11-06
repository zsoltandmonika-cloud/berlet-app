/* HealthHub v881 · two-profile, read-only private PDF archive diagnostics.
 * On-demand only. No uploads, source PDF download, background polling or auth changes. */
(function(w,d){
'use strict';
if(w.HH_VAULT_PROFILE_PDF_V881)return;
const ID='hhVaultProfilePdfV881',STYLE='hhVaultProfilePdfCssV881',URL='/functions/v1/hh-drive-oauth-v682';
const profiles=[{key:'zsolt',name:'Zsolt'},{key:'monika',name:'Mónika'}];
let epoch=0;
let checks={zsolt:{busy:false,text:'Még nincs ellenőrizve'},monika:{busy:false,text:'Még nincs ellenőrizve'}};
function vault(){return w.HH_DAILY_HEALTH_SYNC_V319}
function status(){try{return vault()?.getStatus?.()||null}catch(_){return null}}
function reset(){epoch++;checks={zsolt:{busy:false,text:'Még nincs ellenőrizve'},monika:{busy:false,text:'Még nincs ellenőrizve'}}}
function css(){
 if(d.getElementById(STYLE))return;
 const s=d.createElement('style');s.id=STYLE;s.textContent=
 '#'+ID+'{display:grid;gap:10px;border-top:1px solid #bfd9e8;margin-top:14px;padding-top:13px;color:#174b65;font:12px/1.45 system-ui}'+
 '#'+ID+' h3{font-size:15px;margin:0}#'+ID+' p{font-size:11px;color:#58768c;margin:0}'+
 '#'+ID+' .hhpdf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}'+
 '#'+ID+' .hhpdf-profile{min-width:0;display:flex;flex-direction:column;gap:7px;padding:11px;border-radius:13px;border:1px solid #a9d5ec;background:linear-gradient(150deg,#f1f9ff,#e5f3fc)}'+
 '#'+ID+' .hhpdf-profile[data-profile=monika]{border-color:#edb7d7;background:linear-gradient(150deg,#fff4fa,#fceafa)}'+
 '#'+ID+' strong{font-size:13px}#'+ID+' .hhpdf-grant{font-size:11px;font-weight:700}'+
 '#'+ID+' .hhpdf-state{font-size:11px;overflow-wrap:anywhere;white-space:normal;flex:1}'+
 '#'+ID+' button{min-height:44px;cursor:pointer;border:1px solid #7bb6d2;border-radius:10px;background:#e5f5fc;color:#174b65;padding:8px 7px;font:750 11px/1.35 system-ui}'+
 '#'+ID+' .hhpdf-profile[data-profile=monika] button{border-color:#e4a6cb;background:#fff0f8;color:#6d2855}'+
 '#'+ID+' button:disabled{opacity:.58;cursor:not-allowed}'+
 '@media(max-width:360px){#'+ID+' .hhpdf-grid{grid-template-columns:1fr}}';
 d.head.appendChild(s);
}
function mount(){
 const box=d.querySelector('#hhCentralAuthOverlayV332 .hhca-box');
 if(!box)return;
 css();
 let root=d.getElementById(ID);
 if(!root){
  root=d.createElement('section');root.id=ID;root.setAttribute('aria-label','Zsolt és Mónika külön PDF-hozzáférési ellenőrzése');
  root.addEventListener('click',e=>{
   const button=e.target.closest('button[data-hhpdf-profile]');
   if(button)void check(button.dataset.hhpdfProfile);
  });
  box.appendChild(root);
 }
 const auth=status(),allowed=Array.isArray(auth?.authorizedProfiles)?auth.authorizedProfiles:null;
 const header=d.createElement('h3');header.textContent='📄 Health Vault · PDF-archívum ellenőrzése';
 const hint=d.createElement('p');hint.textContent='Külön jogosultság és archívum, profilváltás nélkül. Nem módosít és nem tölt le leletet.';
 const grid=d.createElement('div');grid.className='hhpdf-grid';
 profiles.forEach(profile=>{
  const row=d.createElement('div');row.className='hhpdf-profile';row.dataset.profile=profile.key;
  const title=d.createElement('strong');title.textContent=profile.name;
  const grant=d.createElement('span');grant.className='hhpdf-grant';
  const loggedIn=!!auth?.authenticated,hasGrant=allowed?.includes(profile.key)===true;
  grant.textContent=!loggedIn?'🔒 Vault-bejelentkezés szükséges':
   !allowed?'⚪ Profiljogosultság ellenőrzés alatt':
   hasGrant?'✅ Profiljogosultság rendben':'🔒 Nincs profiljogosultság';
  const result=d.createElement('span');result.className='hhpdf-state';result.setAttribute('role','status');
  result.textContent=checks[profile.key].text;
  const button=d.createElement('button');button.type='button';
  button.dataset.hhpdfProfile=profile.key;
  button.textContent=checks[profile.key].busy?'⏳ Ellenőrzés…':'🔎 PDF ellenőrzése';
  button.disabled=!loggedIn||!hasGrant||checks[profile.key].busy;
  row.append(title,grant,result,button);grid.appendChild(row);
 });
 const foot=d.createElement('p');foot.textContent='A sikeres leltár-ellenőrzés nem bizonyítja minden egyes PDF megnyithatóságát.';
 root.replaceChildren(header,hint,grid,foot);
}
async function check(key){
 if(key!=='zsolt'&&key!=='monika')return;
 const auth=status(),allowed=auth?.authorizedProfiles;
 if(!auth?.authenticated||!Array.isArray(allowed)||!allowed.includes(key)||checks[key].busy){mount();return}
 const generation=epoch,requestSession=auth.authenticated;
 checks[key]={busy:true,text:'⏳ Privát Drive-archívum ellenőrzése…'};mount();
 try{
  const response=await vault().stream(URL,{action:'archive_inventory',profile:key});
  if(generation!==epoch||!status()?.authenticated||!requestSession)return;
  if(!response.ok){
   checks[key].text=response.status===409?'⚠️ Szerveroldali Drive-kapcsolat hiányzik':
    response.status===401||response.status===403?'🔒 Archívum-hozzáférés elutasítva (HTTP '+response.status+')':
    '⚠️ Archívum nem elérhető (HTTP '+Number(response.status||0)+')';
  }else{
   const data=await response.json();
   if(generation!==epoch||!status()?.authenticated)return;
   if(data?.profile!==key||!Array.isArray(data.files))throw Error('Invalid archive inventory');
   const count=data.files.filter(f=>f?.mimeType==='application/pdf'&&f.appProperties?.profile===key).length;
   checks[key].text=count>0?'✅ Archívum elérhető · '+count+' profilhoz rendelt PDF':
    '⚠️ Archívum elérhető, de nincs profilhoz rendelt PDF';
  }
 }catch(_){
  if(generation!==epoch)return;
  checks[key].text='⚠️ Archívum-ellenőrzési hiba. Újrapróbálás szükséges.';
 }finally{
  if(generation===epoch){checks[key].busy=false;mount()}
 }
}
const original=vault()?.openLogin;
if(typeof original==='function'){
 // Existing credentials, login and sync continue to be owned by Health Vault.
 vault().openLogin=function(){const result=original.apply(this,arguments);mount();return result};
}
w.addEventListener('healthhub:central-auth-changed',()=>{reset();mount()});
w.HH_VAULT_PROFILE_PDF_V881={mount};
mount();
})(window,document);
