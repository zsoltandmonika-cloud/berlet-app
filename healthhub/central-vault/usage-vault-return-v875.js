/* SH9 v875: same-tab return to Billing after the existing Health Vault login.
 * No tokens in URLs, no duplicate sign-in UI or extra data sync. */
(function(w,d){
 'use strict';
 let requested=false;
 try{requested=new URL(w.location.href).searchParams.get('hhvault')==='usage'}catch(_){}
 if(!requested)return;
 const dest=new URL('./usage-control/index.html',w.location.href).href;
 let moved=false;
 function connected(){
  if(moved)return;
  const vault=w.HH_DAILY_HEALTH_SYNC_V319;
  if(!vault||typeof vault.getStatus!=='function'||!vault.getStatus().authenticated)return;
  moved=true;
  w.location.replace(dest);
 }
 function start(){
  const vault=w.HH_DAILY_HEALTH_SYNC_V319;
  if(!vault||typeof vault.openLogin!=='function'||typeof vault.getStatus!=='function')return;
  w.addEventListener('healthhub:central-auth-changed',connected);
  if(vault.getStatus().authenticated)connected();
  else vault.openLogin();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})(window,document);
