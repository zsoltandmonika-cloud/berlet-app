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
 const u=new URL(url,API);
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
  const last=data.find(x=>x.verified);
  text('lastVerified',last?last.name.slice(0,8):'Nincs igazolt');
  text('snapshotCount',String(verified.size));
  text('status',last?
    '✓ '+verified.size+' ellenőrzött felhőmag-mentés. Ez még nem bizonyított teljes telefonos rendszer-visszaállítás.':
    'Nincs ellenőrzött felhőmag-mentés. A sikeres feltöltés önmagában nem elegendő.');
  text('authHelp','Csak olvasási Microsoft Graph-kapcsolat. Nincs felülírás, törlés vagy helyreállítás.');
 }catch(err){
  showSnapshots([]);
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
el('refresh')?.addEventListener('click',refresh);
el('prepare')?.addEventListener('click',prepare);
w.HH_BACKUP_ADMIN_V1=Object.freeze({version:'1',refresh,readOnly:true,manualStartMode:'external-authenticated-github',restoreMode:'plan-only'});
})(window,document);
