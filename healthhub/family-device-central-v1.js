/* HH ONE central family registry. Authenticated Health Vault session, no Dropbox dependency.
 * Owner-approved Zsolt pilot only. No device files, health measurements or native IDs are deleted.
 */
(function(w,d){
'use strict';
const ROOT='hhFamilyCentralV1';
let entries=[],busy=false,loading=false,started=false,error='',message='',lastFetch=0;
const vault=()=>w.HH_DAILY_HEALTH_SYNC_V319;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\x27':'&#39;'}[c]));
const auth=()=>vault()?.getStatus?.().authenticated===true;
const permitted=()=>vault()?.getStatus?.().authorizedProfiles||[];
const validPair=/^(android-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}):([a-f0-9]{64})$/;
const label=p=>p==='monika'?'Mónika':'Zsolt';
function age(s){const t=Date.parse(s||''),n=Date.now()-t;
 return Number.isFinite(t)&&n>=0&&n<20*60000?'🟢 Friss, igazolt':'🟠 Nincs friss igazolt jelentés';}
function render(){
 const status=auth()?'Hitelesített központi Health Vault':'Központi Health Vault-belépés szükséges';
 let html='<section class="hhFcPanel" id="'+ROOT+'"><h4>☁️ Közös családi eszközregiszter</h4>'+
  '<small>'+esc(status)+' · Dropbox-fiókoktól független</small>';
 if(error)html+='<p role="alert" class="hhFcError">'+esc(error)+'</p>';
 if(message)html+='<p role="status" class="hhFcNote">'+esc(message)+'</p>';
 if(!auth()){
  html+='<p>A közös regiszterhez jelentkezz be a meglévő központi Health Vaultba. A Dropbox nem változik.</p>'+
   '<button data-hh-reg-action="central-login">🔐 Health Vault-belépés</button>';
 }else{
  for(const p of ['zsolt','monika']){
   const it=entries.find(x=>x.profile_key===p);
   html+='<div class="hhFcLine"><b>'+label(p)+'</b> · '+
    (it?esc(it.device_id.slice(-11))+' · '+age(it.last_seen_at)+
     '<small>APK: '+esc(it.build)+' · '+esc(new Date(it.last_seen_at).toLocaleString('hu-HU'))+'</small>':
     '⚪ Még nincs hitelesített Android-jelentés')+'</div>';
  }
  html+='<button data-hh-reg-action="central-refresh" '+(loading?'disabled':'')+'>↻ Közös regiszter frissítése</button>';
  if(permitted().includes('zsolt')&&!entries.some(x=>x.profile_key==='zsolt')){
   html+='<details class="hhFcPair"><summary>🔐 Zsolt telefon párosítása</summary>'+
    '<p>A natív HH ONE-ban koppints a „Központi párosítókód másolása” gombra, majd az ott kapott kódot illeszd be. A telefonazonosító és a Dropbox változatlan.</p>'+
    '<label for="hhFcCodeV1">Telefon párosítókódja</label>'+
    '<input id="hhFcCodeV1" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="android-…:64 karakteres kód" />'+
    '<button data-hh-reg-action="central-pair" '+(busy?'disabled':'')+'>✓ Párosítás jóváhagyása</button>'+
    '<small>Ez a jóváhagyás csak 20 percig érvényes. A telefon ezután maga igazolja a párosítást.</small>'+
    '</details>';
  }
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
 if(!auth()){entries=[];error='';signal();return}
 loading=true;error='';
 try{
  const items=await vault().request('/rest/v1/hh_family_devices_v1?select=profile_key,device_id,build,last_seen_at,state,verified_at&order=profile_key');
  if(!Array.isArray(items))throw Error('A központi eszközlista nem olvasható.');
  entries=items.filter(x=>['zsolt','monika'].includes(x.profile_key));
  lastFetch=Date.now();
 }catch(e){error='Központi lista hiba: '+(e.message||'ismeretlen');}
 finally{loading=false;signal()}
}
function signal(){w.dispatchEvent(new Event('healthhub:central-device-registry-changed'))}
async function pair(){
 if(busy||!auth()||!permitted().includes('zsolt'))return;
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
 if(action==='central-refresh'){await refresh();return}
 if(action==='central-pair'){await pair()}
}
w.addEventListener('healthhub:central-auth-changed',()=>{started=false;entries=[];void refresh();});
w.HH_FAMILY_DEVICE_CENTRAL_V1={render,begin,click,refresh,devices:()=>entries.slice(),lastFetch:()=>lastFetch};
})(window,document);
