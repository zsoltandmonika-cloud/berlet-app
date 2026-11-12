/* HealthHub Smart Lunch v1179 · private Outlook Bridge receiver.
 * Only server-sanitized food snapshots enter the profile-private Nutrition journal.
 * The Microsoft refresh token and original message body never enter this page.
 */
(function(root,doc){
'use strict';
const ENDPOINT='/functions/v1/hh-interfood-outlook-bridge-v1179';
const vault=()=>root.HH_DAILY_HEALTH_SYNC_V319;
const api=()=>root.HH_NUTRITION_QUICK_API;
const cloud=()=>root.HH_NUTRITION_CLOUD_V626;
const ID=id=>doc?.getElementById(id);
const authorized=()=>{
 const status=vault()?.getStatus?.();
 return !!(status?.authenticated&&status.authorizedProfiles?.includes('monika'));
};
const monika=()=>api()?.getProfile?.()==='monika';
let running=false,lastQuery=0,connected=false,configured=false,lastError='',lastSync=null;
function show(message,action){
 const bar=ID('hhIfOutlookBridge1179');
 if(!bar)return;
 const label=ID('hhIfOutlookMessage1179'),button=ID('hhIfOutlookAction1179');
 bar.hidden=!monika();
 label.textContent=message;
 button.hidden=!action;
 button.textContent=action?.text||'';
 button.onclick=action?.click||null;
}
/* v1180: Keep private Vault login in the existing collapsed Nutrition settings.
 * Never imply the device is authorized merely because the Outlook server is connected. */
function hideBridge(){
 const bar=ID('hhIfOutlookBridge1179');
 if(bar)bar.hidden=true;
}
function installVaultControls(){
 const settings=ID('hhNutritionSettingsV1180');
 if(!settings||ID('hhIfVaultSettingsV1180'))return;
 const row=doc.createElement('div');
 row.id='hhIfVaultSettingsV1180';
 row.className='hh-if-vault-settings-v1180';
 row.hidden=true;
 row.style.cssText='margin:10px 0;padding:10px;border:1px solid rgba(160,203,234,.3);border-radius:12px;font-size:12px;line-height:1.5';
 const info=doc.createElement('span');
 info.id='hhIfVaultInfoV1180';
 const button=doc.createElement('button');
 button.type='button';
 button.id='hhIfVaultLoginV1180';
 button.className='mini';
 button.textContent='🔐 Google-belépés';
 button.style.marginLeft='8px';
 button.addEventListener('click',openLogin);
 row.append(info,button);
 settings.insertBefore(row,settings.children[1]||null);
}
function setVaultControls(visible,message='Ezen a készüléken jelentkezz be a Központi Health Vaultba a Google-fiókoddal.',login=true){
 const row=ID('hhIfVaultSettingsV1180');
 if(!row)return;
 row.hidden=!visible||!monika();
 const info=ID('hhIfVaultInfoV1180');
 if(info)info.textContent=message;
 const button=ID('hhIfVaultLoginV1180');
 if(button)button.hidden=!login;
}
async function send(action){
 const v=vault();
 if(!v?.stream)throw Error('Központi Health Vault kapcsolat nem érhető el.');
 const response=await v.stream(ENDPOINT,{action});
 const result=await response.json().catch(()=>({error:'invalid_response'}));
 if(!response.ok)throw Error(String(result?.error||'request_failed'));
 return result;
}
function openLogin(){
 if(vault()?.openLogin)vault().openLogin();
 else setVaultControls(true,'A Health Vault bejelentkezési modul nem érhető el.',false);
}
function errorText(error){
 const code=String(error?.message||error);
 if(code==='setup_required')return '🔧 Az Outlook alkalmazás egyszeri rendszergazdai beállítása szükséges.';
 if(code==='unauthorized')return '🔒 A Health Vaultban Mónika profiljának jogosultsága szükséges.';
 if(code==='order_fetch_failed')return '⚠ A rendelések átmenetileg nem tölthetők le.';
 return '⚠ Az Outlook adatkapcsolat nem érhető el. A mentett ételkártyák megmaradnak.';
}
async function importOrders(){
 if(!monika()||!authorized())return {skipped:'profile_or_auth'};
 if(!cloud()?.connected()){
  show('⚠ A privát Dropbox Nutrition-szinkron csatlakoztatása szükséges.');
  return {skipped:'dropbox'};
 }
 const profile=api()?.getProfile?.();
 if(profile!=='monika'||!api()?.importConfirmedInterfoodOrder)return {skipped:'no_api'};
 const result=await send('orders');
 if(api()?.getProfile?.()!==profile)return {skipped:'profile_changed'};
 let added=0,seen=0,errors=0;
 for(const meal of result.orders||[]){
  if(api()?.getProfile?.()!==profile)break;
  if(meal.code&&meal.name&&meal.menuDate&&meal.nutrients){
   try{
    const item=api().importConfirmedInterfoodOrder({expectedProfile:profile,order:meal});
    if(!item.duplicate)added++;
    seen++;
   }catch(_){errors++;}
  }
 }
 root.HH_INTERFOOD_SMART_LUNCH_V1178?.render?.();
 root.HH_INTERFOOD_DIARY_V1175?.refreshCards?.();
 return {added,seen,errors};
}
async function refresh({afterConnect=false}={}){
 if(running)return;
 if(!monika()){hideBridge();setVaultControls(false);return;}
 running=true;
 try{
  if(!vault()?.getStatus?.()?.authenticated){
   // Only a device-specific session is missing. Do not crowd Smart Lunch.
   hideBridge();setVaultControls(true);return;
  }
  if(!authorized()){
   hideBridge();
   setVaultControls(true,'Mónika Health Vault-jogosultságának ellenőrzése folyamatban.',false);
   return;
  }
  setVaultControls(false);
  const status=await send('status');
  configured=status.configured===true;connected=status.connected===true;
  lastSync=status.lastSyncAt||null;lastError=status.lastError||'';
  if(!configured){
   show('🔧 Outlook Bridge: a Microsoft-kapcsolat rendszergazdai beállítása hiányzik.');
   return;
  }
  if(!connected){
   show('🔐 Interfood Outlook: egyszeri Microsoft-engedélyezés.',
    {text:'Outlook összekötése',click:connect});return;
  }
  show('✓ Outlook automatikus · '+(lastSync?
   'utoljára ellenőrizve: '+new Date(lastSync).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):
   'első rendelésellenőrzés folyamatban'));
  if(afterConnect){
   try{await send('sync-now')}catch(_){/* Scheduled server job retries. */}
  }
  const imported=await importOrders();
  if(imported?.seen){
   show('✓ Outlook szinkron · '+imported.seen+' rendelési étel a privát gyűjteményben'+
    (imported.added?' · '+imported.added+' új':'')+'.');
  }
  if(imported?.errors)show('⚠ '+imported.errors+' étel ellenőrzést igényel; nem készült hibás kártya.');
  else if(connected&&!imported?.skipped){
   // No persistent technical row when automation is healthy: one premium tile
   // and the conditional daily Smart Lunch card only.
   root.setTimeout(()=>{const bar=ID('hhIfOutlookBridge1179'),btn=ID('hhIfOutlookAction1179');
    if(bar&&btn?.hidden&&connected&&monika())bar.hidden=true;
   },4000);
  }
 }catch(err){
  show(errorText(err),{text:'↻ Újrapróbálás',click:()=>refresh()});
 }finally{lastQuery=Date.now();running=false;}
}
async function connect(){
 if(!authorized()||!monika())return openLogin();
 show('🔐 Microsoft-engedélyezés megnyitása…');
 try{
  const data=await send('connect'),url=new URL(data.authorizeUrl||'');
  if(url.protocol!=='https:'||url.hostname!=='login.microsoftonline.com'||
   !url.pathname.startsWith('/consumers/oauth2/v2.0/authorize'))
   throw Error('invalid_authorize_url');
  root.location.assign(url.href);
 }catch(err){show(errorText(err),{text:'↻ Újra',click:connect});}
}
function install(){
 const anchor=ID('hhSmartLunchV1178')||ID('hhInterfoodTileV1173');
 if(!anchor||ID('hhIfOutlookBridge1179'))return;
 const bar=doc.createElement('div');
 bar.id='hhIfOutlookBridge1179';bar.className='hh-if-outlook-bridge-v1179';
 bar.hidden=true;bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');
 const line=doc.createElement('span');line.id='hhIfOutlookMessage1179';
 const btn=doc.createElement('button');btn.type='button';btn.id='hhIfOutlookAction1179';btn.hidden=true;
 bar.append(line,btn);anchor.insertAdjacentElement('afterend',bar);
 installVaultControls();
 const success=new URLSearchParams(root.location.search).get('outlook_bridge');
 if(success){
  try{const u=new URL(root.location.href);u.searchParams.delete('outlook_bridge');
   root.history.replaceState(root.history.state,'',u.pathname+u.search+u.hash)}catch(_){}
  if(success==='connected'){
   show('🔐 Outlook engedélyezve. A rendeléseket ellenőrzöm.');
   root.setTimeout(()=>refresh({afterConnect:true}),850);
  }else show('⚠ A Microsoft-kapcsolódás nem sikerült ('+
   String(success).replace(/[^a-z_]/g,'').slice(0,40)+').');
 }
 if(!success)root.setTimeout(()=>refresh(),650);
 root.addEventListener?.('healthhub:profile-changed',()=>refresh());
 root.addEventListener?.('healthhub:central-auth-changed',()=>refresh());
 root.addEventListener?.('focus',()=>{if(Date.now()-lastQuery>180000)refresh()});
 doc.addEventListener?.('visibilitychange',()=>{if(!doc.hidden&&Date.now()-lastQuery>180000)refresh()});
 root.setInterval?.(()=>{if(!doc.hidden&&Date.now()-lastQuery>300000)refresh()},300000);
}
if(doc){if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',install,{once:true});else install();}
root.HH_INTERFOOD_OUTLOOK_BRIDGE_V1179=Object.freeze({refresh,importOrders,connect});
})(typeof window!=='undefined'?window:{},typeof document!=='undefined'?document:null);
