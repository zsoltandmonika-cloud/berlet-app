/* HH ONE central family registry. Authenticated Health Vault session, no Dropbox dependency.
 * Owner-approved Zsolt pilot only. No device files, health measurements or native IDs are deleted.
 */
(function(w,d){
'use strict';
const ROOT='hhFamilyCentralV1';
let entries=[],busy=false,loading=false,started=false,error='',message='',lastFetch=0;
let mayPair=null; // null=checking, true=server authorized, false=not authorized
const vault=()=>w.HH_DAILY_HEALTH_SYNC_V319;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\x27':'&#39;'}[c]));
const auth=()=>vault()?.getStatus?.().authenticated===true;
// Authenticated profile permission is checked live against Supabase RLS, not an
// asynchronously populated local profile cache that can temporarily be null.
const validPair=/^(android-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}):([a-f0-9]{64})$/;
const label=p=>p==='monika'?'Mónika':'Zsolt';
function age(s){const t=Date.parse(s||''),n=Date.now()-t;
 return Number.isFinite(t)&&n>=0&&n<20*60000?'🟢 Friss, igazolt':'🟠 Nincs friss igazolt jelentés';}
function render(){
 const signedIn=auth();
 const status=signedIn?'Health Vault: bejelentkezve':'Health Vault-belépés szükséges';
 let html='<section class="hhFcPanel" id="'+ROOT+'"><h4>☁️ Közös családi eszközregiszter</h4>'+
  '<small>'+esc(status)+' · Dropbox-fiókoktól független</small>';
 if(error)html+='<p role="alert" class="hhFcError">'+esc(error)+'</p>';
 if(message)html+='<p role="status" class="hhFcNote">'+esc(message)+'</p>';
 for(const p of ['zsolt','monika']){
  const it=entries.find(x=>x.profile_key===p);
  html+='<div class="hhFcLine"><b>'+label(p)+'</b> · '+
   (it?esc(it.device_id.slice(-11))+' · '+age(it.last_seen_at)+
    '<small>APK: '+esc(it.build)+' · '+esc(new Date(it.last_seen_at).toLocaleString('hu-HU'))+'</small>':
    '⚪ Még nincs hitelesített Android-jelentés')+'</div>';
 }
 if(signedIn)html+='<button data-hh-reg-action="central-refresh" '+(loading?'disabled':'')+'>↻ Közös regiszter frissítése</button>';
 // Always render the pairing entry while the phone is unverified.
 // A missing session/permission is an actionable message, never a vanished button.
 if(!entries.some(x=>x.profile_key==='zsolt')){
  html+='<details class="hhFcPair"><summary>🔐 Zsolt telefon párosítása</summary>';
  if(!signedIn){
   html+='<p>Előbb jelentkezz be a központi Health Vaultba. Nem a Dropbox-belépés kell.</p>'+
    '<button data-hh-reg-action="central-login">🔐 Health Vault-belépés</button>';
  }else if(mayPair!==true){
   html+='<p>'+esc(loading||mayPair===null?
     'A Zsolt-profil jogosultságának ellenőrzése folyamatban van.':
     'Ehhez a Health Vault-fiókhoz jelenleg nem igazolt Zsolt-profil jogosultság. Jelentkezz be a saját, korábban használt fiókkal.')+'</p>'+
    '<button data-hh-reg-action="central-rights" '+(loading?'disabled':'')+'>↻ Jogosultság ellenőrzése</button>';
  }else{
   html+='<p>A natív HH ONE-ból már kimásolt párosítókódot illeszd be ide. Az Android- és Dropbox-azonosítók változatlanok.</p>'+
    '<label for="hhFcCodeV1">Telefon párosítókódja</label>'+
    '<input id="hhFcCodeV1" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="android-…:64 karakteres kód" />'+
    '<button data-hh-reg-action="central-pair" '+(busy?'disabled':'')+'>✓ Párosítás jóváhagyása</button>'+
    '<small>A jóváhagyás 20 percig érvényes; utána a telefon ellenőrző gombjával hitelesítjük.</small>';
  }
  html+='</details>';
 }else{
  html+='<p class="hhFcNote">Zsolt telefonja már szerepel a központi regiszterben. A frissességi állapot a tényleges natív jelentést mutatja.</p>';
 }
 return html+'</section>';
}
function begin(){
 if(started)return;
 started=true;
 if(auth())void refresh();
}
async function refresh(){
 if(loading||busy)return;
 if(!auth()){entries=[];mayPair=null;error='';signal();return}
 loading=true;error='';mayPair=null;signal();
 try{
  const results=await Promise.all([
   vault().request('/rest/v1/hh_family_devices_v1?select=profile_key,device_id,build,last_seen_at,state,verified_at&order=profile_key'),
   vault().request('/rest/v1/hh_profile_access?select=profile_key&profile_key=eq.zsolt')
  ]);
  const items=results[0],rights=results[1];
  if(!Array.isArray(items)||!Array.isArray(rights))throw Error('A központi regiszter vagy a jogosultságok nem olvashatók.');
  entries=items.filter(x=>['zsolt','monika'].includes(x.profile_key));
  mayPair=rights.some(x=>x.profile_key==='zsolt');
  lastFetch=Date.now();
 }catch(e){error='Központi ellenőrzési hiba: '+(e.message||'ismeretlen');}
 finally{loading=false;signal()}
}
function signal(){w.dispatchEvent(new Event('healthhub:central-device-registry-changed'))}
async function pair(){
 if(busy||!auth()||mayPair!==true)return;
 const input=d.getElementById('hhFcCodeV1');
 const raw=String(input?.value||'').trim().toLowerCase();
 const m=raw.match(validPair);
 if(!m){error='A párosítókód formátuma érvénytelen. A natív HH ONE másolás gombját használd.';signal();return}
 if(!w.crypto?.subtle){error='A biztonságos párosítás ehhez a böngészőhöz nem érhető el.';signal();return}
 // Never store the secret in localStorage, Dropbox, logs or the central device table.
 const deviceId=m[1],secret=m[2];
 if(input)input.value='';
 busy=true;error='';message='';
 try{
  const bytes=new TextEncoder().encode(secret);
  const sum=await crypto.subtle.digest('SHA-256',bytes);
  const proof=Array.from(new Uint8Array(sum),b=>b.toString(16).padStart(2,'0')).join('');
  await vault().request('/rest/v1/hh_family_device_pair_requests_v1',{method:'POST',
   prefer:'return=minimal',
   data:{profile_key:'zsolt',device_id:deviceId,proof_hash:proof}});
  message='✓ A párosítás jóváhagyva. A HH ONE telefonon nyomd meg a „Központi párosítás ellenőrzése” gombot.';
 }catch(e){error='Jóváhagyás sikertelen: '+(e.message||'hálózati hiba')}
 finally{busy=false;signal()}
}
async function click(action){
 if(action==='central-login'){vault()?.openLogin?.();return}
 if(action==='central-refresh'||action==='central-rights'){await refresh();return}
 if(action==='central-pair'){await pair()}
}
w.addEventListener('healthhub:central-auth-changed',()=>{started=false;entries=[];mayPair=null;void refresh();});
w.HH_FAMILY_DEVICE_CENTRAL_V1={render,begin,click,refresh,devices:()=>entries.slice(),lastFetch:()=>lastFetch};
// The legacy registry script is loaded before this module; announce that the
// central module is now ready so an already-open Admin does not stay stale.
w.dispatchEvent(new Event('healthhub:central-device-registry-changed'));
})(window,document);
