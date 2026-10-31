/* HH One v1063: consented Google/Supabase PKCE sign-in from Android WebView.
 * Google UI runs only in the external system browser. No passwords or
 * access/refresh tokens are passed through Android intents or GitHub URLs.
 */
(function(w){
 'use strict';
 const KEY='hh-one-native-oauth-v1063';
 const REDIRECT='https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/guardian/';
 const SUPABASE='vhsrupphzcjkdrusonzh.supabase.co';
 const validCode=code=>typeof code==='string'&&/^[A-Za-z0-9._~-]{8,1024}$/.test(code);
 let busy=false;
 function active(){try{return w.sessionStorage.getItem(KEY)==='1'}catch(_){return false}}
 function initializeFromLauncher(){
  try{
   const q=new URLSearchParams(w.location.search);
   if(q.get('sh9native')==='1'&&Number(q.get('hhBuildCode'))>=40&&
      ['zsolt','monika'].includes(q.get('hhOwner')))w.sessionStorage.setItem(KEY,'1');
  }catch(_){}
 }
 initializeFromLauncher();
 async function start(client){
  if(!active()||!client?.auth?.signInWithOAuth||busy)return false;
  busy=true;
  try{
   const {data,error}=await client.auth.signInWithOAuth({
    provider:'google',options:{redirectTo:REDIRECT,skipBrowserRedirect:true}
   });
   if(error)throw error;
   const u=new URL(data?.url||'');
   if(u.protocol!=='https:'||u.hostname!==SUPABASE||u.pathname!=='/auth/v1/authorize'||
      u.searchParams.get('provider')!=='google'||
      u.searchParams.get('redirect_to')!==REDIRECT||
      u.searchParams.get('code_challenge_method')!=='s256'||
      !/^[A-Za-z0-9_-]{43,128}$/.test(u.searchParams.get('code_challenge')||'')){
    throw Error('A hitelesítési kérés nem a jóváhagyott PKCE útvonalat használja.');
   }
   w.location.assign('healthhubconnect://auth-start?url='+encodeURIComponent(u.toString()));
   return true;
  }finally{busy=false}
 }
 let completing=false;
 async function complete(code){
  if(!active()||!validCode(code)||completing)return false;
  const api=w.HH_GUARDIAN_LIVE_V785?.getClient?.();
  if(!api?.auth?.exchangeCodeForSession)return false;
  completing=true;
  try{
   const {error}=await api.auth.exchangeCodeForSession(code);
   if(error)throw error;
   w.dispatchEvent(new CustomEvent('hh-guardian-auth-changed'));
   return true;
  }catch(_){
   const target=w.document?.getElementById('guardianLiveStatus');
   if(target)target.textContent='A Google-belépés visszatérése nem igazolható. Koppints újra a Belépés gombra.';
   return false;
  }finally{completing=false}
 }
 w.HH_ONE_NATIVE_AUTH_V1063=Object.freeze({active,start,complete});
})(window);
