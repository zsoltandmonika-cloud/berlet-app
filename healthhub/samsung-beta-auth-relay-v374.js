(function(){
'use strict';
/* v374: OAuth code relay, NOT token handling.
   Dropbox redirects to the already-registered HealthHub HTTPS URL.
   Only a dedicated HH Samsung Beta PKCE transaction (state prefix hhbeta_)
   is forwarded to the installed native beta application. This page never
   exchanges OAuth codes, reads health records, or stores a Dropbox token. */
var q=new URLSearchParams(location.search);
var state=q.get('state')||'',code=q.get('code'),error=q.get('error');
if(!/^hhbeta_[A-Za-z0-9_-]{16,128}$/.test(state)||(!code&&!error))return;
if(code&&(code.length>4096||!/^[\w.~-]+$/.test(code)))return;
if(error&&error.length>300)return;
window.HH_SAMSUNG_BETA_OAUTH_PENDING=true;
var target=new URL('healthhubsamsungbeta://dropbox');
target.searchParams.set('state',state);
if(code)target.searchParams.set('code',code);
if(error)target.searchParams.set('error',error);
// Purge authorization parameters from the browser history before other scripts
// see them, and prohibit leaking the code in Referer headers.
var clean=new URL(location.href);
['code','state','error','error_description'].forEach(function(k){clean.searchParams.delete(k)});
try{history.replaceState(history.state,'',clean.toString())}catch(e){}
var meta=document.createElement('meta');meta.name='referrer';meta.content='no-referrer';document.head.appendChild(meta);
var nativeUrl=target.toString();
var go=function(){location.href=nativeUrl};
var show=function(){
 var div=document.createElement('div');div.setAttribute('role','dialog');
 div.setAttribute('aria-label','HH Samsung Beta Dropbox engedélyezés');
 div.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#edf7fb;color:#16405b;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;text-align:center';
 var card=document.createElement('div');
 var h=document.createElement('h2');h.textContent='🔐 HH Samsung Beta';
 var p=document.createElement('p');p.textContent=error?'A Dropbox-engedélyezést elutasítottad.':'A Dropbox engedélyezése befejeződött. A folytatáshoz térj vissza a HH Samsung Beta alkalmazásba.';
 var button=document.createElement('button');button.textContent='📱 Vissza a HH Samsung Betába';
 button.style.cssText='border:0;border-radius:12px;padding:17px;background:#187dbb;color:#fff;font-weight:700;font-size:16px;cursor:pointer';
 button.addEventListener('click',go);
 card.append(h,p,button);div.appendChild(card);document.body.appendChild(div);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
// Mobile browser navigation to custom URI may need a user gesture; fallback
// button remains on screen, no looping / arbitrary cross-origin redirect.
setTimeout(go,350);
})();
