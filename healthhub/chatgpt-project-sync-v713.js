/* HealthHub v713: sync Ask Léna ChatGPT Project URL only, no medical data. */
(function(root){
 'use strict';
 const SCHEMA='healthhub.chatgpt-project-link/1';
 const PATH='/HealthHub/master/ask-lena-chatgpt-project.json';
 const LOCAL='hh-chatgpt-project-shortcut-v712',PENDING='hh-chatgpt-project-link-pending-v713';
 const api=()=>root.HH_CHATGPT_PROJECT_SHORTCUT_V712;
 let working=null,rerun=false,lastAttempt=0;
 function clean(v){if(!api()||!api().normalizeProjectUrl)throw Error('ChatGPT Shortcut hiányzik');return api().normalizeProjectUrl(v)}
 function valid(r){
  if(!r||r.schema!==SCHEMA||typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt))||typeof r.projectUrl!=='string')throw Error('Sérült/ismeretlen felhőbeállítás');
  const u=clean(r.projectUrl);if(u!==r.projectUrl)throw Error('Érvénytelen felhő projektcím');
  return {schema:SCHEMA,projectUrl:u,updatedAt:r.updatedAt};
 }
 function pending(){try{let s=root.localStorage.getItem(PENDING);return s?valid(JSON.parse(s)):null}catch(_){return null}}
 function vault(){let v=root.HH_DROPBOX_VAULT;try{return v&&v.connected&&v.connected()&&v.downloadJson&&v.uploadJson?v:null}catch(_){return null}}
 function display(s){let x=document.getElementById('hhChatGptProjectStatus712');if(x)x.textContent=s}
 function apply(r){root.localStorage.setItem(LOCAL,r.projectUrl);if(api()&&api().refresh)api().refresh()}
 function newer(a,b){return Date.parse(a?.updatedAt||0)>Date.parse(b?.updatedAt||0)}
 async function read(v){
  let raw;try{raw=await v.downloadJson(PATH)}catch(e){
   if(e&&(e.status===409||e.status===404)&&/not_found|path|missing|404/i.test(String(e.message||'')))return null;
   throw e;
  }
  return raw==null?null:valid(raw);
 }
 async function sync(){
  const v=vault();
  if(!v){if(pending())display('📱 Projektcím helyileg mentve; Dropbox-kapcsolatra vár.');return 'offline'}
  const local=pending(),remote=await read(v);
  if(local){
   if(remote&&(!newer(local,remote))){
    apply(remote);root.localStorage.removeItem(PENDING);
    display('☁️ Frissebb projektcím betöltve a Dropboxból.');return 'remote';
   }
   // Recheck before overwriting remote, minimizing stale-device clobber.
   const check=await read(v);
   if(check&&!newer(local,check)){
    apply(check);root.localStorage.removeItem(PENDING);
    display('☁️ Frissebb projektcím betöltve a Dropboxból.');return 'remote';
   }
   await v.uploadJson(PATH,local);
   const verified=await read(v);
   if(!verified||verified.projectUrl!==local.projectUrl||verified.updatedAt!==local.updatedAt)
    throw Error('Dropbox mentés visszaellenőrzése sikertelen');
   root.localStorage.removeItem(PENDING);apply(local);
   display('✅ Ask Léna-projektcím mentve és visszaellenőrizve a Dropboxban.');return 'uploaded';
  }
  if(remote){apply(remote);display('☁️ Ask Léna-projektcím betöltve a Dropboxból.');return 'remote'}
  // Never promote an old local HealthHub developer Project without an explicit edit.
  display('☁️ Még nincs felhőben projektcím. Állítsd be az új Ask Léna-projektet a ⚙ gombbal.');return 'empty';
 }
 function schedule(force){
  if(!force&&Date.now()-lastAttempt<10000)return working||Promise.resolve('throttled');
  if(working){rerun=true;return working}
  lastAttempt=Date.now();
  working=sync().catch(e=>{display('⚠️ Dropbox szinkronhiba: '+String(e.message||e).slice(0,140));return 'error'})
   .finally(()=>{working=null;if(rerun){rerun=false;lastAttempt=0;schedule(true)}});
  return working;
 }
 function edited(ev){
  let url;try{url=clean(ev?.detail?.url)}catch(_){return}
  root.localStorage.setItem(PENDING,JSON.stringify({schema:SCHEMA,projectUrl:url,updatedAt:new Date().toISOString()}));
  lastAttempt=0;schedule(true);
 }
 root.addEventListener('healthhub:chatgpt-project-saved',edited);
 root.addEventListener('healthhub:ask-lena-open',()=>schedule(true));
 root.addEventListener('focus',()=>schedule(false));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(true),{once:true});
 else schedule(true);
 setTimeout(()=>schedule(true),2500);
 root.HH_CHATGPT_PROJECT_SYNC_V713={path:PATH,valid,read,sync,schedule,pending};
})(window);
