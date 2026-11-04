/* SHO Web Push v3 pilot · opt-in, authenticated, browser-mediated permission.
 * The Family Guard session is reused; no user JWT, endpoints or keys are logged.
 */
(function(w,d){
'use strict';
if(w.SHO_WEBPUSH_V3)return;
const $=id=>d.getElementById(id);
const SW='/berlet-app/sh9/sw.js',SCOPE='/berlet-app/sh9/';
const SESSION_KEY='hh-guardian-family-auth-v785';
const PROJECT_JS='/berlet-app/healthhub/central-vault/config.js?v=785';
const SUPABASE_JS='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.2/dist/umd/supabase.min.js';
let client=null,publicKey='',busy=false,loadInProgress=null,lastProfile='',lastMessage='',initialized=false;
const en=()=>{try{return w.localStorage.getItem('sh9-language-v1')==='en'}catch(_){return false}};
const words=()=>en()?{
 status:'Background push',intro:'Opt-in notification on Android, even while SHO is closed.',
 support:'Check support',enable:'Enable',disable:'Disable',test:'Send test',
 waiting:'Open Settings to check Android push support.',
 unsupported:'This browser does not support PWA background push.',
 login:'Sign in through Family Guard first. Permissions have NOT been requested.',
 loading:'Checking secure connection and browser support…',
 denied:'Notifications are blocked. Allow them in Android/browser site settings.',
 off:'Off · no device registered for this profile.',
 on:'On · this device is registered for this profile.',
 server:'Push gateway unavailable. Permission was not requested.',
 registered:'Push enabled for the active profile.',
 unregistered:'Push disabled on this device.',
 sent:'Test push requested; delivery depends on Android/browser.',
 sendFailed:'Test push could not be sent.',
 blocked:'Permission not granted. Nothing was subscribed.',
 error:'Push operation failed. Previous settings were not changed.',
 awaiting:'Ready. Tap Enable to request Android permission.',
 limited:'Foreground or background system notification; browser may restrict delivery.'
}:{status:'Android háttérértesítések',intro:'Külön engedéllyel akkor is jelezhet, amikor a SHO zárva van.',
 support:'Támogatás ellenőrzése',enable:'Bekapcsolás',disable:'Kikapcsolás',test:'Próba küldése',
 waiting:'A Beállítások fülön ellenőrizhető a háttérértesítés.',
 unsupported:'Ez a böngésző nem támogatja a PWA háttérértesítést.',
 login:'Előbb jelentkezz be a Family Guardba. Értesítési engedélyt nem kértünk.',
 loading:'Biztonságos kapcsolat és böngészőtámogatás ellenőrzése…',
 denied:'Az értesítés tiltva van. Engedélyezd az Android/böngésző webhelybeállításaiban.',
 off:'Kikapcsolva · ehhez a profilhoz nincs regisztrált készülék.',
 on:'Bekapcsolva · a készülék ehhez a profilhoz van rendelve.',
 server:'A push-kiszolgáló nem érhető el. Nem kértünk engedélyt.',
 registered:'Push bekapcsolva az aktív profilhoz.',
 unregistered:'Push kikapcsolva ezen a készüléken.',
 sent:'Próbaüzenet elküldve; megérkezése az Androidtól és a böngészőtől függ.',
 sendFailed:'A tesztüzenetet nem sikerült kézbesíteni.',
 blocked:'Nem kaptunk engedélyt. Nem történt regisztráció.',
 error:'Push művelet sikertelen. A korábbi beállítás megmaradt.',
 awaiting:'Készen áll. A Bekapcsolás kérheti az Android engedélyét.',
 limited:'Rendszerértesítés; a böngésző korlátozhatja a kézbesítést.'
};
function profile(){try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}}
function supports(){
 return w.isSecureContext===true&&'serviceWorker' in navigator&&
  typeof w.Notification!=='undefined'&&typeof w.PushManager!=='undefined';
}
function status(value){lastMessage=value;if($('ncPushStatus'))$('ncPushStatus').textContent=value}
function toggle(on,subscribed=false){
 if(!$('ncPushEnable'))return;
 $('ncPushEnable').hidden=!!subscribed;
 $('ncPushDisable').hidden=!subscribed;
 $('ncPushTest').disabled=!subscribed||busy;
 $('ncPushEnable').disabled=!on||busy;
 $('ncPushCheck').disabled=busy;
}
function loadScript(src){
 return new Promise((resolve,reject)=>{
  const script=d.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;d.head.appendChild(script);
 });
}
async function getClient(){
 if(client)return client;
 if(loadInProgress)return loadInProgress;
 loadInProgress=(async()=>{
  try{
   if(!w.HH_GUARDIAN_LIVE_V785?.getClient?.()&&!w.localStorage.getItem(SESSION_KEY))return null;
   const linked=w.HH_GUARDIAN_LIVE_V785?.getClient?.();
   if(linked){client=linked;return client}
   if(!w.HH_CENTRAL_VAULT)await loadScript(PROJECT_JS);
   const cfg=w.HH_CENTRAL_VAULT;
   if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey)return null;
   if(!w.supabase?.createClient)await loadScript(SUPABASE_JS);
   if(!w.supabase?.createClient)return null;
   client=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{
    storageKey:SESSION_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false
   }});
   return client;
  }catch(_){return null}finally{loadInProgress=null}
 })();
 return loadInProgress;
}
async function invoke(action,details={}){
 const api=await getClient();if(!api)throw Error('login');
 const {data:{user},error:userError}=await api.auth.getUser();
 if(userError||!user)throw Error('login');
 const {data,error}=await api.functions.invoke('sho-webpush-v3',{body:{action,profile:profile(),...details}});
 if(error||!data||data.error)throw Error(data?.error||'gateway');
 return data;
}
function unbase64url(value){
 const text=String(value).replace(/-/g,'+').replace(/_/g,'/');
 const decoded=w.atob(text+'='.repeat((4-text.length%4)%4));
 return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
async function currentSubscription(){
 const registration=await navigator.serviceWorker.getRegistration(SCOPE);
 return registration?.pushManager?await registration.pushManager.getSubscription():null;
}
async function refresh(){
 if(busy)return;
 const wds=words();lastProfile=profile();publicKey='';
 $('ncPushTitle').textContent=wds.status;$('ncPushDescription').textContent=wds.intro;
 $('ncPushCheck').textContent=wds.support;$('ncPushEnable').textContent=wds.enable;
 $('ncPushDisable').textContent=wds.disable;$('ncPushTest').textContent=wds.test;
 toggle(false);status(wds.loading);
 if(!supports()){status(wds.unsupported);return}
 if(w.Notification.permission==='denied'){status(wds.denied);return}
 try{
  const result=await invoke('config');
  if(profile()!==lastProfile)return;
  if(typeof result.publicKey!=='string'||result.publicKey.length<60)throw Error('no_key');
  publicKey=result.publicKey;
  const sub=await currentSubscription();
  if(!sub){toggle(true,false);status(wds.off);return}
  const remote=await invoke('status',{endpoint:sub.endpoint});
  if(profile()!==lastProfile)return;
  toggle(true,remote.subscribed===true);
  status(remote.subscribed===true?wds.on:wds.off);
 }catch(err){
  const e=String(err?.message||'');
  status(e==='login'?wds.login:wds.server);
  toggle(false);
 }
}
async function enable(){
 if(busy||!publicKey||!supports())return;
 const target=profile(),wds=words();
 if(w.Notification.permission==='denied'){status(wds.denied);return}
 busy=true;toggle(false);status(wds.loading);
 try{
  // Permission is requested ONLY from an explicit button click.
  const permission=await w.Notification.requestPermission();
  if(permission!=='granted'){status(wds.blocked);return}
  if(profile()!==target)throw Error('profile_changed');
  const registration=await navigator.serviceWorker.register(SW,{scope:SCOPE});
  const existing=await registration.pushManager.getSubscription();
  const subscription=existing||await registration.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:unbase64url(publicKey)
  });
  const asJson=subscription.toJSON();
  await invoke('subscribe',{endpoint:subscription.endpoint,keys:asJson.keys});
  if(profile()!==target)return;
  status(wds.registered);
 }catch(_){status(wds.error)}
 finally{busy=false;void refresh()}
}
async function disable(){
 if(busy||!supports())return;
 const target=profile(),wds=words();busy=true;toggle(false);status(wds.loading);
 try{
  const subscription=await currentSubscription();
  if(subscription){
   await invoke('unsubscribe',{endpoint:subscription.endpoint});
   // Do not delete a subscription assigned to a different profile on this browser.
   if(profile()===target)await subscription.unsubscribe();
  }
  status(wds.unregistered);
 }catch(_){status(wds.error)}
 finally{busy=false;void refresh()}
}
async function test(){
 if(busy)return;busy=true;toggle(false);status(words().loading);
 try{
  const sub=await currentSubscription();
  if(!sub)throw Error('missing_subscription');
  const result=await invoke('test',{endpoint:sub.endpoint});
  status(result.delivered>0?words().sent:words().sendFailed);
 }catch(_){status(words().sendFailed)}
 finally{busy=false;w.setTimeout(()=>{void refresh()},2500)}
}
function init(){
 if(initialized||!$('ncPushTitle'))return;initialized=true;
 $('ncPushCheck').addEventListener('click',()=>{void refresh()});
 $('ncPushEnable').addEventListener('click',()=>{void enable()});
 $('ncPushDisable').addEventListener('click',()=>{void disable()});
 $('ncPushTest').addEventListener('click',()=>{void test()});
 const panel=$('ncSettingsPanel');
 if(typeof MutationObserver!=='undefined'){
  const observer=new MutationObserver(()=>{
   if(!panel.hidden){void refresh()}
  });
  observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
 }
 w.addEventListener('sh9:profilechange',()=>{if(!panel.hidden)void refresh()});
 w.addEventListener('hh-family-profile-changed',()=>{if(!panel.hidden)void refresh()});
 w.addEventListener('storage',event=>{if(event.key==='hh-profile'&&!panel.hidden)void refresh()});
 w.addEventListener('sh9:languagechange',()=>{if(!panel.hidden)void refresh()});
 status(words().waiting);
}
w.SHO_WEBPUSH_V3=Object.freeze({version:3,supported:supports,refresh});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
