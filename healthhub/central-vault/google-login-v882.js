/* HealthHub v882: Google sign-in for the existing private Health Vault.
 * Browser-only, explicit OAuth; no new user/profile, no server mutation.
 * One-shot Supabase OAuth session is verified before handing off to the
 * existing Health Vault token manager. Health Vault owns all subsequent refreshes.
 */
(function(w,d){
'use strict';
if(w.HH_VAULT_GOOGLE_V882)return;
const CFG=w.HH_CENTRAL_VAULT||{},PENDING='hh-vault-google-pending-v882',
 SKEY='hh-supabase-health-session-v1',REM='hh-health-vault-trusted-device-v332',
 ROOT='hhVaultGoogleV882',INLINE='hhVaultGoogleInlineV882',CSS='hhVaultGoogleStyleV882';
let sdkPromise=null,api=null,busy=false,message='',installed=false;
const vault=()=>w.HH_DAILY_HEALTH_SYNC_V319;
function textOnly(x){return String(x||'').slice(0,140)}
function pending(){
 try{const p=JSON.parse(w.sessionStorage.getItem(PENDING)||'null');
  return p&&p.schema===1&&typeof p.at==='number'&&typeof p.remember==='boolean'?p:null;
 }catch(_){return null}
}
function clearPending(){try{w.sessionStorage.removeItem(PENDING)}catch(_){}}
function enabled(){return CFG.enabled===true&&/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(CFG.supabaseUrl||''))&&typeof CFG.publishableKey==='string'&&CFG.publishableKey.length>12}
function nativeView(){
 try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}
}
function loadSdk(){
 if(w.supabase&&typeof w.supabase.createClient==='function')return Promise.resolve(w.supabase);
 if(sdkPromise)return sdkPromise;
 sdkPromise=new Promise((resolve,reject)=>{
  const script=d.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.2/dist/umd/supabase.min.js';
  script.async=true;script.onload=()=>w.supabase?.createClient?resolve(w.supabase):reject(Error('sdk_unavailable'));
  script.onerror=()=>reject(Error('sdk_unavailable'));
  d.head.appendChild(script);
 }).catch(e=>{sdkPromise=null;throw e});
 return sdkPromise;
}
async function client(){
 if(api)return api;
 if(!enabled())throw Error('vault_not_configured');
 const lib=await loadSdk();
 // OAuth tokens are kept in memory only until the existing Vault manager
 // adopts the fresh, server-validated session after the browser redirect.
 api=lib.createClient(CFG.supabaseUrl,CFG.publishableKey,{
  auth:{storageKey:'hh-health-vault-oauth-one-shot-v882',persistSession:false,
   autoRefreshToken:false,detectSessionInUrl:true,flowType:'implicit'}
 });
 return api;
}
function css(){
 if(d.getElementById(CSS))return;
 const s=d.createElement('style');s.id=CSS;s.textContent=
 '#'+ROOT+'{border-top:1px solid #c3d8e6;padding:12px 0 5px;margin-top:11px;display:grid;gap:8px;color:#174b65;font:12px system-ui}'+
 '#'+ROOT+' p{margin:0;font-size:11px;line-height:1.45;color:#53748b}'+
 '#'+ROOT+' button{border:1px solid #82b9d5;background:#ecf7fd;border-radius:12px;min-height:46px;padding:10px;color:#195574;font:750 13px system-ui;cursor:pointer}'+
 '#'+ROOT+' button:disabled{opacity:.62;cursor:wait}'+
 '#'+ROOT+' .hhvg-error{color:#a03646;font-weight:650;overflow-wrap:anywhere}'+
 '#'+INLINE+'{margin:10px 0;padding:12px;border:1px solid #a8cadc;border-radius:13px;background:#e7f4fc;color:#164f70;font:12px system-ui}'+
 '#'+INLINE+' button{width:100%;min-height:44px;border:1px solid #7eaccd;border-radius:11px;background:#fff;color:#17536b;font:750 13px system-ui;padding:9px}'+
 '#'+INLINE+' button:disabled{opacity:.58}'+
 '#'+INLINE+' p{font-size:11px;margin:7px 0 0;color:#45687f}';
 d.head.appendChild(s);
}
function mount(){
 const box=d.querySelector('#hhCentralAuthOverlayV332 .hhca-box');
 if(!box)return;
 css();
 let root=d.getElementById(ROOT);
 if(!root){
  root=d.createElement('section');root.id=ROOT;
  root.setAttribute('aria-label','Google-bejelentkezés a Health Vaultba');
  box.appendChild(root);
 }
 const state=vault()?.getStatus?.();
 root.hidden=!!state?.authenticated;
 if(root.hidden)return;
 root.replaceChildren();
 const button=d.createElement('button');button.type='button';
 button.textContent=busy?'⏳ Google-bejelentkezés…':'🔐 Belépés Google-fiókkal';
 button.disabled=busy||!enabled()||nativeView();
 button.addEventListener('click',()=>{void start()});
 const hint=d.createElement('p');
 hint.textContent=nativeView()?
  'A Google-belépést most a telefon Chrome böngészőjében nyisd meg a HealthHubhoz.':
  'A meglévő, erre a HealthHub-Core projektre jogosult Google-fiókkal. Új fiók és külön Vault-jelszó nem szükséges.';
 root.append(button,hint);
 if(message){
  const feedback=d.createElement('p');feedback.className='hhvg-error';
  feedback.setAttribute('role','alert');feedback.textContent=message;root.appendChild(feedback);
 }
}
function mountInline(host){
 if(!host||!host.parentNode)return;
 const loggedIn=!!vault()?.getStatus?.()?.authenticated;
 let root=d.getElementById(INLINE);
 if(loggedIn){if(root)root.remove();return}
 css();
 if(!root){
  root=d.createElement('section');root.id=INLINE;root.setAttribute('aria-label','Google-belépés a Health Vaultba');
  host.parentNode.insertBefore(root,host.nextSibling);
 }
 root.replaceChildren();
 const button=d.createElement('button');button.type='button';button.disabled=busy||nativeView();
 button.textContent=busy?'⏳ Google-bejelentkezés…':'🔐 Belépés Google-fiókkal';
 button.addEventListener('click',()=>{void start()});
 const hint=d.createElement('p');hint.textContent=nativeView()?'A Google-belépéshez nyisd meg a HealthHubot Chrome-ban.':
  'Egy Google-belépéssel hozzáférhetsz a jogosult egészségügyi profilokhoz.';
 root.append(button,hint);
 if(message){const p=d.createElement('p');p.textContent=message;p.setAttribute('role','alert');root.appendChild(p)}
}
function errorMessage(err){
 if(err?.message==='no_profile')return 'A kiválasztott Google-fiókhoz nincs Health Vault-profiljogosultság. Másik Google-fiókkal próbáld.';
 if(err?.message==='sdk_unavailable')return 'A Google-belépési modul nem töltődött be. Ellenőrizd a kapcsolatot.';
 if(err?.message==='vault_not_configured')return 'A Health Vault központi kapcsolata nem elérhető.';
 if(err?.message==='no_oauth_session')return 'A Google-azonosítás nem fejeződött be. Indítsd újra a belépést.';
 if(err?.message==='auth_invalid')return 'A Google-azonosítás nem igazolható. Próbáld újra.';
 if(err?.message==='storage_blocked')return 'A böngésző nem engedi a biztonságos munkamenet tárolását.';
 return 'Nem sikerült a Google-belépés. Ellenőrizd a fiókot és a kapcsolatot.';
}
async function start(){
 if(busy)return;
 if(nativeView()){message='Az alkalmazáson belüli bejelentkezés helyett nyisd meg a HealthHubot Chrome-ban.';mount();return}
 busy=true;message='';mount();
 try{
  const auth=await client();
  const remember=!!(d.querySelector('#hhcaLoginV332 input[name=remember]')||d.querySelector('#hhcs-login-form input[name=remember]'))?.checked;
  w.sessionStorage.setItem(PENDING,JSON.stringify({schema:1,at:Date.now(),remember}));
  const {error}=await auth.auth.signInWithOAuth({
   provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}
  });
  if(error)throw error;
  // Supabase navigates to Google; callback is completed only on a return visit.
 }catch(e){
  clearPending();message=errorMessage(e);busy=false;mount();
 }
}
async function finish(){
 const marker=pending();if(!marker)return false;
 if(Date.now()-marker.at>10*60*1000||Date.now()<marker.at-30000){
  clearPending();return false;
 }
 busy=true;message='';mount();
 try{
  const auth=await client();
  const {data:sessionData,error:sessionErr}=await auth.auth.getSession();
  const session=sessionData?.session;
  if(sessionErr||!session?.access_token||!session?.refresh_token)throw Error('no_oauth_session');
  const {data:userData,error:userErr}=await auth.auth.getUser();
  if(userErr||!userData?.user?.id||session.user?.id!==userData.user.id)throw Error('auth_invalid');
  // Server-side RLS ensures no unapproved profile or newly created/empty
  // OAuth account can enter the private original-PDF viewer.
  const {data:grants,error:grantErr}=await auth.from('hh_profiles').select('profile_key');
  if(grantErr||!Array.isArray(grants))throw Error('auth_invalid');
  if(!grants.some(x=>x?.profile_key==='zsolt'||x?.profile_key==='monika'))throw Error('no_profile');
  const expires=Math.floor(Number(session.expires_at)||Date.now()/1000+Number(session.expires_in||3600));
  if(!Number.isFinite(expires)||expires<=Date.now()/1000+60)throw Error('auth_invalid');
  const bridge=JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token,expires_at:expires});
  w.sessionStorage.setItem(SKEY,bridge);
  if(w.sessionStorage.getItem(SKEY)!==bridge)throw Error('storage_blocked');
  if(marker.remember){
   w.localStorage.setItem(REM,'yes');
   w.localStorage.setItem(SKEY,bridge);
  }else{
   w.localStorage.removeItem(SKEY);
   w.localStorage.removeItem(REM);
  }
  clearPending();
  // Existing v680 Vault manager reads this verified session on reload,
  // fetches per-profile RLS permissions, and owns all token renewal.
  w.location.reload();
  return true;
 }catch(e){
  clearPending();message=errorMessage(e);busy=false;
  if(vault()?.openLogin) vault().openLogin();
  mount();return false;
 }
}
const originalMount=vault()?.mount;
if(typeof originalMount==='function'){
 vault().mount=function(host){const value=originalMount.apply(this,arguments);mountInline(host);return value};
}
const previous=vault()?.openLogin;
if(typeof previous==='function'){
 vault().openLogin=function(){const result=previous.apply(this,arguments);mount();return result};
 installed=true;
}
w.HH_VAULT_GOOGLE_V882={start,finish,mount,mountInline,installed};
if(pending())void finish();
})(window,document);
