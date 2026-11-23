/* SHO Backup Center v1: read-only recovery discovery, no privileged POST and no restore execution.
 * Reuse the user's already authorized Book Studio Microsoft Files.Read session.
 * The static Github Pages UI can NEVER safely hold backup/restore service credentials.
 */
(function(w,d){
'use strict';
const EXPECTED_ACCOUNT='zsolt.monika@outlook.com';
const EXPECTED_DRIVE='BC1FF24AF37EA2B0';
const CONFIG_KEY='sh9-book-ms-config-v2';
const TOKEN_KEY='sh9-book-ms-access-v2';
const API='https://graph.microsoft.com/v1.0';
const RUN_RE=/^\d{8}T\d{6}Z-\d{1,18}$/;
const verified=new Set();
const el=id=>d.getElementById(id);
const text=(id,value)=>{const n=el(id);if(n)n.textContent=String(value)};
function jsonGet(store,key){try{return JSON.parse(store?.getItem(key)||'null')}catch(_){return null}}
function auth(){
 const cfg=jsonGet(w.localStorage,CONFIG_KEY),session=jsonGet(w.sessionStorage,TOKEN_KEY);
 if(!cfg||!session||String(cfg.account||'').toLowerCase()!==EXPECTED_ACCOUNT||
   String(session.account||'').toLowerCase()!==EXPECTED_ACCOUNT||
   cfg.clientId!==session.clientId||!session.accessToken||
   !Number.isFinite(session.expires)||session.expires<Date.now()+45000){
  throw Error('Ehhez a OneDrive-ellenőrzéshez a közös Outlook-fiókkal nyisd meg és csatlakoztasd előbb a SHO Book Studiót.');
 }
 return session.accessToken;
}
async function graph(url,token){
 const u=new URL(url[0]==='/'?url.slice(1):url,API+'/');
 if(u.origin!=='https://graph.microsoft.com'||!u.pathname.startsWith('/v1.0/'))
  throw Error('Érvénytelen Graph-hivatkozás');
 const res=await w.fetch(u.toString(),{method:'GET',headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'follow'});
 if(!res.ok){if([401,403].includes(res.status))throw Error('A OneDrive-olvasás nem engedélyezett vagy átmenetileg nem elérhető (HTTP '+res.status+').');throw Error('OneDrive lekérdezési hiba: HTTP '+res.status)}
 return res;
}
async function readJson(url,token){return (await graph(url,token)).json()}
async function readStatus(folderId,token){
 try{
  const folder=await readJson('/me/drive/items/'+encodeURIComponent(folderId)+'/children?$select=id,name,file&$top=100',token);
  const list=Array.isArray(folder.value)?folder.value:[];
  const item=list.find(v=>v?.name==='status.json'&&v.file&&v.id);
  if(!item)return null;
  const status=await readJson('/me/drive/items/'+encodeURIComponent(item.id)+'/content',token);
  if(status?.schema!=='sho-backup-status/1'||status?.status!=='CLOUD_CORE_VERIFIED'||
    status?.read_back_verified!==true||status?.full_system!==false||
    !/^[a-f0-9]{64}$/.test(status?.encrypted_archive_sha256||''))return null;
  return status;
 }catch(_){return null} // Failing to read is NEVER considered verified.
}
function clearNode(node){if(node)node.replaceChildren()}
function block(tag,cls,value){
 const x=d.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x;
}
function showSnapshots(items){
 const root=el('backups');clearNode(root);
 if(!items.length){root.appendChild(block('p','muted','Nem található mentési mappa. A manuális backup még nem készült el.'));return}
 for(const item of items){
  const row=block('div','snapshot');
  const detail=block('div');
  detail.appendChild(block('strong','',item.name));
  detail.appendChild(block('small',item.verified?'✓ CLOUD_CORE_VERIFIED · visszaolvasva':'Nem ellenőrzött, vagy a status.json nem olvasható'));
  const button=block('button','secondary',item.verified?'Visszaállításra kiválasztom':'Nem választható');
  button.type='button';button.disabled=!item.verified;
  if(item.verified)button.addEventListener('click',()=>{
    el('restoreId').value=item.name;el('prepare').disabled=false;
    el('restoreOutput').hidden=true;
  });
  row.append(detail,button);root.appendChild(row);
 }
}
async function refreshStaging(token){
 const target=el('stagingRuns');
 if(!target)return;
 clearNode(target);
 let folders;
 try{
  folders=await readJson('/me/drive/root:/SHO/Backups/restic-staging-runs:/children?$select=id,name,folder&$top=100',token);
 }catch(e){
  target.appendChild(block('p','muted','Nincs még külön Restic próbamentés, vagy nem olvasható.'));
  return;
 }
 const runs=(Array.isArray(folders.value)?folders.value:[])
  .filter(x=>x?.folder&&RUN_RE.test(x.name||'')&&typeof x.id==='string')
  .sort((a,b)=>b.name.localeCompare(a.name)).slice(0,30);
 if(!runs.length){
  target.appendChild(block('p','muted','Még nem található próbamentés.'));
  return;
 }
 for(const run of runs){
  const row=block('div','snapshot');
  let label='Nem ellenőrzött · nem állítható vissza';
  try{
   const list=await readJson('/me/drive/items/'+encodeURIComponent(run.id)+'/children?$select=id,name,file&$top=100',token);
   const statusFile=(Array.isArray(list.value)?list.value:[]).find(x=>x?.name==='status.json'&&x.file&&x.id);
   if(statusFile){
    const st=await readJson('/me/drive/items/'+encodeURIComponent(statusFile.id)+'/content',token);
    if(st?.schema==='sho-restic-staging-status/1'&&st?.backup_id===run.name&&
       st?.status==='STAGING_INCREMENTAL_REPO_DATA_VERIFIED'&&
       st?.read_back_verified===true&&st?.full_system===false&&
       st?.metadata_restore_smoke_tested===true&&Array.isArray(st?.snapshot_ids)&&st.snapshot_ids.length>=5)
     label='✓ Restic-adatok ellenőrizve · '+(st.backup_kind==='pre_development'?'Fejlesztés előtt':'Próbamentés')+' · teljes restore MÉG NEM igazolt';
   }
  }catch(_){ /* Never promote unreadable states to verified. */ }
  row.appendChild(block('strong','',run.name));
  row.appendChild(block('small',label));
  target.appendChild(row);
 }
}
async function refresh(){
 const btn=el('refresh');btn.disabled=true;
 text('status','OneDrive jogosultság és mentési pontok ellenőrzése...');
 verified.clear();el('restoreId').value='';el('prepare').disabled=true;el('restoreOutput').hidden=true;
 try{
  const token=auth();
  // Confirm the actual destination DRIVE, not just a configurable UI e-mail.
  const drive=await readJson('/me/drive?$select=id,driveType,owner',token);
  if(String(drive.id||'').toUpperCase()!==EXPECTED_DRIVE)
   throw Error('Nem a HealthHub közös OneDrive-jához kapcsolódtál. A mentési lista nem nyitható meg.');
  const folders=await readJson('/me/drive/root:/SHO/Backups:/children?$select=id,name,folder,lastModifiedDateTime&$top=200',token);
  const items=(Array.isArray(folders.value)?folders.value:[])
    .filter(x=>x?.folder&&RUN_RE.test(x.name||'')&&typeof x.id==='string')
    .sort((a,b)=>b.name.localeCompare(a.name)).slice(0,42);
  const data=[];
  // Read-only; metadata checks can't silently qualify a backup as valid.
  for(const item of items){
   const status=await readStatus(item.id,token);
   const good=!!status&&status.backup_id===item.name;
   if(good)verified.add(item.name);
   data.push({name:item.name,verified:good});
  }
  showSnapshots(data);
  await refreshStaging(token);
  const last=data.find(x=>x.verified);
  text('lastVerified',last?last.name.slice(0,8):'Nincs igazolt');
  text('snapshotCount',String(verified.size));
  text('status',last?
    '✓ '+verified.size+' ellenőrzött felhőmag-mentés. Ez még nem bizonyított teljes telefonos rendszer-visszaállítás.':
    'Nincs ellenőrzött felhőmag-mentés. A sikeres feltöltés önmagában nem elegendő.');
  text('authHelp','Csak olvasási Microsoft Graph-kapcsolat. Nincs felülírás, törlés vagy helyreállítás.');
 }catch(err){
  showSnapshots([]);
  const staging=el('stagingRuns');if(staging){clearNode(staging);staging.appendChild(block('p','muted','OneDrive kapcsolat nem elérhető.'));}
  text('lastVerified','Nem igazolt');text('snapshotCount','0');
  text('status','⚠️ '+String(err?.message||err));
 }finally{btn.disabled=false}
}
function prepare(){
 const id=el('restoreId').value;
 if(!verified.has(id)||!RUN_RE.test(id))return;
 if(!w.confirm('A '+id+' mentés helyreállítási tervét készíted elő. Az éles SHO nem módosul. Folytatod?'))return;
 const msg='Kiválasztott helyreállítási pont: '+id+
 '\n1. OneDrive: status.json + sha256.txt + backup.tar.zst.age azonosítása'+
 '\n2. Offline dekódolás és teljes SHA-256 ellenőrzés'+
 '\n3. Külön tesztprojektbe történő próbahelyreállítás'+
 '\n4. Klinikai adat-, modul- és hozzáférésellenőrzés'+
 '\n5. Éles rendszer csak új, kifejezett jóváhagyással állítható vissza.'+
 '\nÁllapot: terv elkészült; restore NEM indult.';
 const out=el('restoreOutput');out.textContent=msg;out.hidden=false;
}

// Server-side manual full backup control: never send a GitHub PAT to this browser.
const BRIDGE="https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-backup-control-v1";
const VAULT_SESSION="hh-supabase-health-session-v1";
let dispatchReady=false,dispatchBusy=false;
function vaultAccess(){
 const cfg=w.HH_CENTRAL_VAULT;
 if(!cfg?.publishableKey||cfg.supabaseUrl!=="https://vhsrupphzcjkdrusonzh.supabase.co")
  throw Error('A HealthHub központi beléptetés nincs betöltve.');
 const session=jsonGet(w.sessionStorage,VAULT_SESSION);
 const local=jsonGet(w.localStorage,VAULT_SESSION);
 const s=[session,local].filter(x=>x?.access_token&&
   Number(x.expires_at||0)*1000>Date.now()+60000)
   .sort((a,b)=>Number(b.expires_at||0)-Number(a.expires_at||0))[0];
 if(!s)throw Error('A mentés indításához jelentkezz be a HealthHub Central Vaultba.');
 return {token:s.access_token,key:cfg.publishableKey};
}
function manualMessage(value){text('manualStatus',value)}
async function control(mode,operation){
 const auth=vaultAccess();
 const base=BRIDGE+(mode?'?mode='+encodeURIComponent(mode):'');
 const params={method:operation?'POST':'GET',headers:{
   apikey:auth.key,Authorization:'Bearer '+auth.token,
   ...(operation?{'Content-Type':'application/json'}:{})
 },cache:'no-store',...(operation?{body:JSON.stringify({operation})}:{})};
 const response=await w.fetch(base,params);
 let data;try{data=await response.json()}catch(_){data=null}
 if(!response.ok){
  if([401,403].includes(response.status))throw Error('Nincs engedélyezett admin-belépés (HTTP '+response.status+').');
  if(response.status===409)throw Error('Már folyamatban van vagy nemrég indult mentés.');
  if(response.status===503)throw Error('A mentési háttérszolgáltatás még nincs beállítva vagy jelenleg nem érhető el.');
  throw Error('A mentési műveletet a szerver elutasította (HTTP '+response.status+').');
 }
 return data;
}
function dispatchButton(ready){
 dispatchReady=ready===true;
 for(const id of ['manualDirect','predevDirect']){
  const b=el(id);if(b)b.disabled=!dispatchReady||dispatchBusy;
 }
}
async function checkManual(){
 dispatchButton(false);
 text('runnerState','Ellenőrzés...');
 const btn=el('manualCheck');if(btn)btn.disabled=true;
 manualMessage('Admin-jogosultság és mentési futtató ellenőrzése...');
 try{
  const data=await control('readiness');
  const ready=data?.ready===true&&data?.workflow_active===true&&data?.runner_config_confirmed===true;
  dispatchButton(ready);
  text('runnerState',ready?'Privát · kész':'Nem üzemel');
  manualMessage(ready?'✓ Admin-jogosultság ellenőrizve. Kézi mentés indítható.':
    '⚠️ A mentési futtató még nincs teljesen beállítva. Kézi indítás zárolva.');
 }catch(e){dispatchButton(false);text('runnerState','Zárolt');manualMessage('⚠️ '+String(e?.message||e))}
 finally{if(btn)btn.disabled=false}
}
async function startManual(kind='manual'){
 if(!dispatchReady||dispatchBusy)return;
 const op=kind==='pre_development'?'start_predevelopment_full_backup':'start_manual_full_backup';
 dispatchBusy=true;dispatchButton(false);
 manualMessage(kind==='pre_development'?'Fejlesztés előtti teljes mentés kérése elküldve...':'Kézi teljes mentés indítási kérése elküldve...');
 try{
  const result=await control('',op);
  if(result?.status!=='ACCEPTED_NOT_VERIFIED'||result?.backup_kind!==(kind==='pre_development'?'pre_development':'manual'))
   throw Error('A szerver nem igazolta vissza a megfelelő mentési kérés elfogadását.');
  manualMessage('✓ '+(kind==='pre_development'?'Fejlesztés előtti':'Kézi')+' mentésindítás elfogadva. A backup még NEM kész. Fejlesztést csak ellenőrzött OneDrive mentés és szükség esetén restore-próba után kezdj.');
 }catch(e){manualMessage('⚠️ '+String(e?.message||e))}
 finally{dispatchBusy=false;dispatchButton(false)}
}
async function checkRun(){
 const b=el('manualRunStatus');if(b)b.disabled=true;
 manualMessage('Legutóbbi mentési futás állapotának ellenőrzése...');
 try{
  const data=await control('last_run');
  const run=data?.last_run;
  if(!run){manualMessage('Még nincs GitHub mentési futás.');return}
  const safe=String(run.status||'ismeretlen').slice(0,40);
  const conclusion=run.conclusion?String(run.conclusion).slice(0,40):'még nincs';
  manualMessage('GitHub futás: '+safe+' · eredmény: '+conclusion+
    ' · '+String(run.created_at||'').slice(0,22)+
    '. GitHub siker esetén is külön OneDrive-visszaellenőrzés szükséges.');
 }catch(e){manualMessage('⚠️ '+String(e?.message||e))}
 finally{if(b)b.disabled=false}
}
el('manualCheck')?.addEventListener('click',checkManual);
el('manualDirect')?.addEventListener('click',()=>startManual('manual'));
el('predevDirect')?.addEventListener('click',()=>startManual('pre_development'));
el('manualRunStatus')?.addEventListener('click',checkRun);

el('refresh')?.addEventListener('click',refresh);
el('prepare')?.addEventListener('click',prepare);
// Readiness is a non-mutating check; it runs once as the admin opens the panel,
 // making the pre-development backup a genuine single-click action when ready.
 if(el('manualCheck')&&el('predevDirect')&&
    (w.sessionStorage?.getItem(VAULT_SESSION)||w.localStorage?.getItem(VAULT_SESSION))){
  void checkManual();
 }
w.HH_BACKUP_ADMIN_V1=Object.freeze({version:'3',refresh,checkManual,startManual,checkRun,manualStartMode:'private-runner-owner-authenticated',restoreMode:'plan-only'});
})(window,document);
