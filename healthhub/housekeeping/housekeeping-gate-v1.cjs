'use strict';
/**
 * HH ONE housekeeping readiness gate v1.
 * READ ONLY: accepts an operator-supplied sanitized snapshot; NEVER connects to
 * Dropbox, Supabase or the phones. Never deletes, archives, changes permissions,
 * resets device IDs, runs OTA or dispatches a remote command.
 * Sensitive snapshots are NOT committed to GitHub and NOT stored by this tool.
 */
const fs=require('node:fs');
const PROFILES=Object.freeze(['zsolt','monika']);
const MAX_AGE={snapshot:30*60*1000,central:20*60*1000,gps:5*60*1000,
 family:10*60*1000,dropbox:60*60*1000,health:24*60*60*1000,backup:72*60*60*1000};
const NATIVE=/^android-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const FORBIDDEN=/"(?:latitude|longitude|access_token|refresh_token|proof_hash|pair_secret|secret|password|coordinates)"\s*:/i;
function stamp(t){const n=Date.parse(t||'');return Number.isFinite(n)?n:NaN}
function recent(t,now,max){const n=stamp(t);return Number.isFinite(n)&&n<=now+5000&&now-n<=max}
function idTail(v){return typeof v==='string'?'…'+v.slice(-12):'—'}
function evaluate(snapshot,now=Date.now()){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))
  throw Error('A housekeeping-jelentéshez strukturált snapshot szükséges.');
 // Fail closed on accidental GPS coordinates, credential material or raw health data.
 if(FORBIDDEN.test(JSON.stringify(snapshot)))throw Error('Érzékeny adat a snapshotban: csak időbélyegek és eszköz-metaadatok engedélyezettek.');
 const blockers=[],findings=[],review=[];
 const fail=(key,reason)=>blockers.push({key,reason});
 const central=Array.isArray(snapshot.centralDevices)?snapshot.centralDevices:[];
 const gps=snapshot.gps||{},sync=snapshot.sync||{},backup=snapshot.backup||{};
 const legacy=Array.isArray(snapshot.legacyAccounts)?snapshot.legacyAccounts:[];
 if(!recent(snapshot.capturedAt,now,MAX_AGE.snapshot))
  fail('snapshot','A minta hiányzik vagy 30 percnél régebbi.');
 const verified={};
 for(const p of PROFILES){
  const rows=central.filter(d=>d&&d.profile_key===p&&d.verified_at&&NATIVE.test(d.device_id||''));
  if(rows.length!==1)fail('central-'+p,p+': pontosan egy hitelesített fizikai telefon szükséges.');
  const d=rows.length===1?rows[0]:null;
  if(d){
   verified[p]=d.device_id;
   if(d.state!=='online'||!recent(d.last_seen_at,now,MAX_AGE.central))
    fail('heartbeat-'+p,p+': nincs 20 percen belüli igazolt natív heartbeat.');
  }
  const loc=gps[p]||{};
  if(loc.source!=='HH One Native GPS'||loc.validated!==true||
     !(typeof loc.accuracy_m==='number'&&loc.accuracy_m>=0&&loc.accuracy_m<=100)||
     !recent(loc.updated_at,now,MAX_AGE.gps))
   fail('gps-'+p,p+': 5 percen belüli, hitelesített és ellenőrzött natív GPS-adat kell.');
  const s=sync[p]||{};
  for(const [key,label,max] of [
   ['familyGuard','Family Guard',MAX_AGE.family],
   ['dropbox','Dropbox',MAX_AGE.dropbox],
   ['healthConnect','Health Connect',MAX_AGE.health]
  ]){
   if(s[key]?.validated!==true||!recent(s[key]?.lastSuccessfulAt,now,max))
    fail('sync-'+p+'-'+key,p+': '+label+' utolsó sikeres műveletének visszaigazolása hiányzik vagy régi.');
  }
 }
 if(verified.zsolt&&verified.monika&&verified.zsolt===verified.monika)
  fail('duplicate-identity','Zsolt és Mónika ugyanazzal az Android-ID-val nem lehetnek külön telefonok.');
 if(!recent(backup.confirmedAt,now,MAX_AGE.backup))
  fail('backup-time','Nincs legfeljebb 72 órás, ellenőrzött helyreállítási mentés.');
 if(backup.restoreTested!==true)
  fail('backup-restore','A mentés visszaolvashatósága nincs igazolva.');
 const backed=new Set(Array.isArray(backup.accounts)?backup.accounts:[]);
 for(const p of PROFILES)if(!backed.has(p))fail('backup-'+p,p+': fiókspecifikus mentés nincs igazolva.');
 for(const a of legacy){
  if(!a||typeof a!=='object')continue;
  const account=String(a.account||'ismeretlen').slice(0,40);
  const active=a.activePhones||{},archived=new Set(a.archived||[]);
  const ds=Array.isArray(a.devices)?a.devices:[];
  for(const d of ds){
   if(!d||typeof d.deviceId!=='string')continue;
   const name=idTail(d.deviceId);
   const protectedId=Object.values(verified).includes(d.deviceId)||
     Object.values(active).includes(d.deviceId);
   if(protectedId){
    findings.push({account,id:name,decision:'MEGŐRZENDŐ',reason:'Központilag hitelesített vagy a régi regiszterben aktív.'});
   }else if(archived.has(d.deviceId)){
    findings.push({account,id:name,decision:'MÁR ARCHIVÁLT',reason:'Semmit nem kell törölni.'});
   }else{
    review.push({account,id:name,kind:d.deviceType==='web'?'BÖNGÉSZŐ':'NEM KIJELÖLT NATÍV',
     decision:'KÉZI FELÜLVIZSGÁLAT',reason:'Csak mentés és tulajdonosi jóváhagyás után, visszavonhatóan archiválható.'});
   }
  }
  for(const p of PROFILES){
   const selected=active[p];
   if(selected&&verified[p]&&selected!==verified[p])
    review.push({account,profile:p,decision:'REGISZTERELTÉRÉS',
     reason:'A Dropbox-kijelölés nem egyezik a hitelesített natív ID-val. Nincs automatikus átírás.'});
  }
 }
 return {
  schema:'healthhub.housekeeping.readiness/1',
  verdict:blockers.length?'BLOCKED':'READY_FOR_MANUAL_REVIEW',
  safeToMutateAutomatically:false,
  sources:'operator-confirmed sanitized live snapshot (read-only)',
  blockers,protectedCount:findings.filter(x=>x.decision==='MEGŐRZENDŐ').length,
  preserve:findings,review,
  stages:[
   '0. Két natív telefon és minden adatfolyam hitelesítése',
   '1. Fiókonkénti mentés és visszaolvasási próba',
   '2. Régi eszközök/duplikált webes sorok kézi felülvizsgálata',
   '3. Csak nem aktív ID-k visszavonható archiválása a meglévő v401 Adminban',
   '4. Parancs-, státusz- és cache-maradványok külön kockázati értékelése; nincs automatikus törlés',
   '5. GPS, Health Connect, Dropbox, OTA és RAG visszamérése mindkét profilon',
   '6. Eltérés esetén az archiválás visszavonása és előző mentés visszaállítása'
  ],
  dataPolicy:'Telefonazonosító, token, egészségügyi adat, GPS-koordináta, parancs és előzmény nem törölhető automatikusan.'
 };
}
if(require.main===module){
 if(!process.argv[2]){
  process.stdout.write('HH ONE housekeeping v1: read-only audit. Pass a sanitized JSON snapshot path. No live access and no cleanup performed.\n');
 }else{
  const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const report=evaluate(input);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.verdict!=='READY_FOR_MANUAL_REVIEW')process.exitCode=2;
 }
}
module.exports={evaluate,PROFILES,MAX_AGE};
