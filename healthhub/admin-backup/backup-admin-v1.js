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
// V4: The actual production-isolated restic-partial-runs folder holds
// five different component backups. Never promote any of these to full_system.
const MONITOR_FORMATS=Object.freeze([
 {key:'dropbox',title:'☁️ Dropbox · 2 vault',code:'PARTIAL_RESTIC_READ_DATA_AND_FULL_FILE_RESTORE_VERIFIED',valid:s=>Array.isArray(s.snapshot_ids)&&s.snapshot_ids.length===1&&s.sources?.length===2},
 {key:'git',title:'🧩 GitHub · 4 repo + 25 Edge',code:'GIT_EDGE_PARTIAL_RESTIC_READBACK_AND_RESTORE_VERIFIED',valid:s=>s.git_repositories===4&&s.edge_functions_listed===25&&s.edge_bodies_included===25},
 {key:'db',title:'🗄️ PostgreSQL · adatok',code:'LOGICAL_POSTGRES_READONLY_DATA_RESTIC_SHA256_RESTORE_PASS',valid:s=>s.pg_dump===false&&s.tables>=113&&s.verified_files>=118&&s.rows>=0},
 {key:'schema',title:'🛡️ PostgreSQL · séma és RLS',code:'POSTGRES_SCHEMA_CATALOG_RESTIC_SHA256_RESTORE_PASS',valid:s=>s.pg_dump===false&&s.catalog_categories===15&&s.catalog_files_verified===16},
 {key:'storage',title:'📦 Supabase Storage · 7 tároló',code:'STORAGE_RESTIC_READ_DATA_FULL_SHA256_RESTORE_PASS',valid:s=>s.file_count===203&&s.postgres_dump_included===false}
]);
const resticVerified=new Map();
const SNAPSHOT_HEX=/^[a-f0-9]{64}$/;
function timeOfRun(id){
 const m=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z-/.exec(id||'');
 if(!m)return 'ismeretlen';
 const iso=m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':'+m[6]+'Z';
 const stamp=new Date(iso);
 if(Number.isNaN(stamp.getTime()))return 'ismeretlen';
 return stamp.toLocaleString('hu-HU',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function validateResticStatus(s,runId){
 if(!s||s.backup_id!==runId||s.full_system!==false)return null;
 const snapshots=Array.isArray(s.snapshot_ids)?s.snapshot_ids:[s.snapshot_id||s.snapshot];
 if(!snapshots.length||!snapshots.every(x=>typeof x==='string'&&SNAPSHOT_HEX.test(x)))return null;
 const match=MONITOR_FORMATS.find(x=>x.code===s.status&&x.valid(s));
 return match?{runId,kind:match.key,title:match.title,snapshots,when:timeOfRun(runId),status:s}:null;
}
async function readResticRun(folder,token){
 try{
  const list=await readJson('/me/drive/items/'+encodeURIComponent(folder.id)+'/children?$select=id,name,file&$top=20',token);
  const statusFile=(Array.isArray(list.value)?list.value:[]).find(v=>v?.name==='status.json'&&v.file&&v.id);
  if(!statusFile)return null;
  const status=await readJson('/me/drive/items/'+encodeURIComponent(statusFile.id)+'/content',token);
  return validateResticStatus(status,folder.name);
 }catch(_){return null} // Missing/invalid/forbidden never counts as a verified backup.
}
async function refreshStaging(token){
 const target=el('stagingRuns');
 if(!target)return [];
 clearNode(target);resticVerified.clear();
 const base='/me/drive/root:/SHO/Backups/restic-partial-runs:/children?$select=id,name,folder&$top=200';
 let folders;
 try{folders=await readJson(base,token)}
 catch(e){
  target.appendChild(block('p','warn','⚠️ A tényleges Restic-státuszmappa nem olvasható. Ellenőrizd a OneDrive-jogosultságot.'));
  return [];
 }
 const runs=(Array.isArray(folders.value)?folders.value:[])
  .filter(x=>x?.folder&&RUN_RE.test(x.name||'')&&typeof x.id==='string')
  .sort((a,b)=>b.name.localeCompare(a.name)).slice(0,40);
 const result=new Array(runs.length);
 let cursor=0;
 async function worker(){
  while(cursor<runs.length){
   const idx=cursor++;
   result[idx]=await readResticRun(runs[idx],token);
  }
 }
 await Promise.all(Array.from({length:Math.min(4,runs.length)},()=>worker()));
 const valid=result.filter(Boolean);
 for(const s of valid){resticVerified.set(s.runId,s);verified.add(s.runId)}
 for(const kind of MONITOR_FORMATS){
  const last=valid.find(v=>v.kind===kind.key);
  const row=block('div','snapshot monitor-item');
  const details=block('div');
  details.appendChild(block('strong','',kind.title));
  details.appendChild(block('small',last?
   '✓ SHA-256 restore PASS jelentve · '+last.when+' · '+last.snapshots[0].slice(0,8):
   '⚠️ Nincs ellenőrzött mentési státusz az utolsó 40 futásban'));
  const btn=block('button','secondary',last?'Helyreállítási terv':'Nem választható');
  btn.type='button';btn.disabled=!last;
  if(last)btn.addEventListener('click',()=>{
    el('restoreId').value=last.runId;
    el('prepare').disabled=false;
    el('restoreOutput').hidden=true;
  });
  row.append(details,btn);target.appendChild(row);
 }
 const bad=runs.length-valid.length;
 const summary=block('p',bad?'warn':'muted',
  'Ellenőrzött részmentések: '+valid.length+' / '+runs.length+
  ' megvizsgált futás. '+(bad?'Nem ellenőrzött vagy hiányos státusz: '+bad+'. ':'')+
  'Ez nem teljes adatbázis-restore és nem 100%-os rendszermentés.');
 target.appendChild(summary);
 return valid;
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
  const restic=await refreshStaging(token);
  const categories=new Set(restic.map(x=>x.kind));
  const latestRestic=restic[0];
  const legacyLast=data.find(x=>x.verified);
  text('lastVerified',latestRestic?latestRestic.when:(legacyLast?legacyLast.name.slice(0,8):'Nincs igazolt'));
  text('snapshotCount',String(verified.size));
  text('schedule','5 ütemezés · 00:15–04:15');
  text('status',restic.length?
    '✓ '+categories.size+'/5 mentési terület igazolt OneDrive-státusszal; '+restic.length+' Restic részmentés. Az éjszakai ütemezett futások külön validálandók. NEM teljes PostgreSQL vagy SHO restore.':
    (legacyLast?'Korábbi felhőmag-mentés látható, de új Restic-státusz nem igazolt.':
    '⚠️ Nincs olvasható, igazolt Restic-státusz. A mentések meglétét itt még nem bizonyítottuk.'));
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
 const restic=resticVerified.get(id);
 const msg=restic?
  'Mentési komponens: '+restic.title+' · '+restic.when+
  '\nRestic snapshot: '+restic.snapshots.join(', ')+
  '\n1. OneDrive: SHO/Backups/restic-partial-v1 titkosított Restic-tár'
  +'\n2. Snapshot integritásellenőrzése és visszaállítása külön, nem éles környezetbe'
  +'\n3. Fájl SHA-256 és tartalmi ellenőrzés; komponensfüggő helyreállítási sorrend'
  +'\n4. PostgreSQL teljes helyreállításához natív dump és izolált teszt szükséges'
  +'\n5. Éles SHO csak új, kifejezett jóváhagyással változhat'
  +'\nÁllapot: CSAK terv, restore NEM indult.':
  'Kiválasztott helyreállítási pont: '+id+
  '\n1. OneDrive: korábbi, külön formátumú felhőmag-mentés ellenőrzése'+
  '\n2. Teljes SHA-256 ellenőrzés'+
  '\n3. Külön tesztprojektbe történő próbahelyreállítás'+
  '\n4. Éles rendszer csak új, kifejezett jóváhagyással állítható vissza.'+
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
  manualMessage('✓ '+(kind==='pre_development'?'Fejlesztés előtti':'Kézi')+' mentésindítás elfogadva. A backup még NEM igazolt, a mentés még NEM kész. Fejlesztést csak ellenőrzött OneDrive mentés és szükség esetén restore-próba után kezdj.');
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
w.HH_BACKUP_ADMIN_V1=Object.freeze({version:'4',refresh,checkManual,startManual,checkRun,manualStartMode:'private-runner-owner-authenticated',restoreMode:'plan-only'});
})(window,document);
