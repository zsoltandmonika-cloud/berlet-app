(function(){
'use strict';
/* HealthHub private preferences transport. No patient data, credentials or tokens in GitHub.
   The remote sync is DISABLED until Supabase is configured, authenticated and
   the user EXPLICITLY chooses each profile's first cloud upload/download. */
var CFG=window.HH_CENTRAL_VAULT||{},STORE='hh-daily-health-factors-317',
 SKEY='hh-supabase-health-session-v1',SLUG=CFG.householdSlug||'zsolt-monika';
var states={m:{mode:'local',revision:0,snapshot:null,remote:null},z:{mode:'local',revision:0,snapshot:null,remote:null}};
var session=null,busy=false,lastError='',saving=null,profiles=null,household=null,container=null,autoAttempted=false;
function el(id){return document.getElementById(id)}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]})}
function active(){return CFG.enabled===true&&/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(CFG.supabaseUrl||''))&&typeof CFG.publishableKey==='string'&&CFG.publishableKey.length>12}
function url(path){return CFG.supabaseUrl.replace(/\/$/,'')+path}
function sRead(){try{return JSON.parse(sessionStorage.getItem(SKEY)||'null')}catch(e){return null}}
function sSave(v){session=v;try{if(v)sessionStorage.setItem(SKEY,JSON.stringify(v));else sessionStorage.removeItem(SKEY)}catch(e){}}
function local(){
 try{var d=JSON.parse(localStorage.getItem(STORE)||'null');if(d&&d.schema==='healthhub.daily-health-factors/1')return d}catch(e){}
 return {schema:'healthhub.daily-health-factors/1',m:{items:{},custom:[],aiOptIn:false},z:{items:{},custom:[],aiOptIn:false}};
}
function profile(d,key){return d[key]&&typeof d[key]==='object'?d[key]:{items:{},custom:[],aiOptIn:false}}
function canonical(v){return JSON.stringify(v,function(key,value){if(value&&typeof value==='object'&&!Array.isArray(value)){var sorted={};Object.keys(value).sort().forEach(function(k){sorted[k]=value[k]});return sorted}return value})}
function same(a,b){return canonical(a)===canonical(b)}
function validPayload(x){return x&&typeof x==='object'&&!Array.isArray(x)&&x.items&&typeof x.items==='object'&&!Array.isArray(x.items)&&Array.isArray(x.custom)&&typeof x.aiOptIn==='boolean'}
function call(path,opts){
 opts=opts||{};
 var headers={'apikey':CFG.publishableKey,'Content-Type':'application/json'};
 if(session&&session.access_token&&!path.startsWith('/auth/v1/'))headers.Authorization='Bearer '+session.access_token;
 if(opts.prefer)headers.Prefer=opts.prefer;
 return fetch(url(path),{method:opts.method||'GET',headers:headers,body:opts.data===undefined?undefined:JSON.stringify(opts.data),cache:'no-store'})
  .then(async function(r){
   var body=await r.text(),d;
   try{d=body?JSON.parse(body):null}catch(e){d=null}
   if(!r.ok){var x=new Error('Központi kapcsolat HTTP '+r.status);x.httpStatus=r.status;throw x}
   return d;
  });
}
async function ensureToken(){
 if(!session)throw new Error('Bejelentkezés szükséges.');
 if(Date.now() < (session.expires_at||0)*1000-75000)return;
 if(!session.refresh_token){sSave(null);throw new Error('A munkamenet lejárt. Jelentkezz be újra.')}
 var v=await call('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:session.refresh_token}});
 if(!v||!v.access_token)throw new Error('Nem sikerült frissíteni a munkamenetet.');
 sSave({access_token:v.access_token,refresh_token:v.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(v.expires_in||3600)});
}
async function login(email,password){
 if(!active())return;
 busy=true;lastError='';draw();
 try{
  var v=await call('/auth/v1/token?grant_type=password',{method:'POST',data:{email:email,password:password}});
  if(!v||!v.access_token||!v.refresh_token)throw new Error('A bejelentkezés nem sikerült.');
  sSave({access_token:v.access_token,refresh_token:v.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(v.expires_in||3600)});
  autoAttempted=true;
  await fetchCloud();
 }catch(e){lastError=e.httpStatus===400||e.httpStatus===401?'Sikertelen bejelentkezés. Ellenőrizd az e-mailt és a jelszót.':(e.message||'Központi hiba.');if(e.httpStatus===401)sSave(null)}
 finally{busy=false;draw()}
}
function logout(){
 sSave(null);profiles=null;household=null;lastError='';autoAttempted=false;
 ['m','z'].forEach(function(k){states[k]={mode:'local',revision:0,snapshot:null,remote:null}});
 draw();
}
async function fetchCloud(){
 await ensureToken();
 // Use the existing, RLS-protected HealthHub-Core schema.
 var pp=await call('/rest/v1/hh_profiles?select=profile_key');
 if(!Array.isArray(pp))throw new Error('Nem érhetők el a családi profilok.');
 profiles={};
 pp.forEach(function(p){if(p.profile_key==='monika')profiles.m='monika';if(p.profile_key==='zsolt')profiles.z='zsolt'});
 if(!profiles.m||!profiles.z)throw new Error('Hiányzik a két engedélyezett családi profil.');
 household=SLUG;
 var items=await call('/rest/v1/hh_daily_health_settings?select=profile_key,settings,revision,updated_at&profile_key=in.(monika,zsolt)');
 if(!Array.isArray(items))throw new Error('A napi egészségbeállítási tábla nem érhető el.');
 var loc=local();
 ['m','z'].forEach(function(k){
  var row=items.find(function(x){return x.profile_key===profiles[k]});
  var localCopy=profile(loc,k);
  var remote=row&&row.settings&&validPayload(row.settings)?row.settings:null;
  states[k].remote=remote;
  states[k].revision=row?Number(row.revision)||0:0;
  states[k].snapshot=remote?canonical(remote):null;
  states[k].mode=remote&&same(localCopy,remote)?'synced':remote?'choice':'first';
 });
}
async function upload(k){
 if(!profiles||!session||busy)return;
 var state=states[k],payload=profile(local(),k);
 if(!validPayload(payload)){lastError='A helyi beállítás nem értelmezhető, nincs feltöltés.';draw();return}
 busy=true;lastError='';draw();
 try{
  await ensureToken();
  var r=await call('/rest/v1/rpc/healthhub_daily_health_save',{method:'POST',data:{
   p_household_slug:SLUG,
   p_profile_key:k==='m'?'monika':'zsolt',
   p_settings:payload,
   p_expected_revision:state.revision
  }});
  if(!r||!r.ok){
   state.mode='choice';lastError='Másik eszköz időközben módosított: válaszd ki az adatforrást.';
   await fetchCloud();return;
  }
  state.revision=Number(r.revision)||state.revision+1;
  state.snapshot=canonical(payload);state.remote=payload;state.mode='synced';
 }catch(e){lastError=e.message||'Szinkronhiba';state.mode=state.mode==='synced'?'pending':state.mode}
 finally{busy=false;draw()}
}
function download(k){
 var state=states[k];
 if(!state.remote||!validPayload(state.remote))return;
 var d=local();d[k]=state.remote;
 try{localStorage.setItem(STORE,JSON.stringify(d))}
 catch(e){lastError='Nem sikerült elmenteni a letöltött adatokat.';draw();return}
 state.mode='synced';state.snapshot=canonical(state.remote);lastError='';
 if(window.HH_DAILY_HEALTH_SETTINGS_V317&&window.HH_DAILY_HEALTH_SETTINGS_V317.refresh)window.HH_DAILY_HEALTH_SETTINGS_V317.refresh();
 if(window.HH_DAILY_HEALTH_V312&&window.HH_DAILY_HEALTH_V312.render)window.HH_DAILY_HEALTH_V312.render();
 draw();
}
function localChanged(){
 if(!active()||!session||!profiles)return;
 clearTimeout(saving);
 saving=setTimeout(async function(){
  var data=local();
  for(var k of ['m','z']){
   var st=states[k];
   if(st.mode==='synced'&&st.snapshot!==canonical(profile(data,k)))await upload(k);
  }
 },900);
}
function profilePanel(k){
 var name=k==='m'?'Mónika':'Zsolt',s=states[k];
 var head='<div class="hhcs-profile"><b>'+escapeHtml(name)+'</b> ';
 if(s.mode==='synced')return head+'<span>✅ Központi mentés aktív</span></div>';
 if(s.mode==='first')return head+'<span>☁️ Még nincs központi mentés</span><button type="button" data-hh-sync-action="upload" data-hh-sync-profile="'+k+'">⬆️ Első feltöltés</button></div>';
 if(s.mode==='choice')return head+'<span>⚠️ Helyi és központi adatok eltérnek</span><div class="hhcs-actions"><button type="button" data-hh-sync-action="upload" data-hh-sync-profile="'+k+'">⬆️ Helyi megtartása</button><button type="button" data-hh-sync-action="download" data-hh-sync-profile="'+k+'">⬇️ Központi betöltése</button></div></div>';
 if(s.mode==='pending')return head+'<span>⚠️ Mentés nem sikerült</span><button type="button" data-hh-sync-action="upload" data-hh-sync-profile="'+k+'">🔄 Újrapróbálás</button></div>';
 return head+'<span>💾 Csak helyben tárolva</span></div>';
}
function draw(){
 var h=container;if(!h||!h.isConnected)return;
 if(!active()){
  h.innerHTML='<div class="hhcs-panel"><b>🔒 Központi szinkron</b><p>A biztonságos központi kapcsolat előkészítve, de még nincs aktiválva. A pipák továbbra is kizárólag ezen a készüléken tárolódnak.</p></div>';
  return;
 }
 var header='<div class="hhcs-panel"><b>🔐 Központi Health Vault</b>';
 if(!session){
  h.innerHTML=header+'<p>Az első szinkron előtt jelentkezz be az előzetesen létrehozott családi fiókkal.</p>'+
   '<form id="hhcs-login-form"><input type="email" name="email" required autocomplete="username" placeholder="E-mail cím" aria-label="E-mail cím">'+
   '<input type="password" name="password" required autocomplete="current-password" placeholder="Jelszó" aria-label="Jelszó">'+
   '<button type="submit" '+(busy?'disabled':'')+'>🔐 Bejelentkezés</button></form>'+
   (lastError?'<p class="hhcs-error" role="alert">'+escapeHtml(lastError)+'</p>':'')+'</div>';
  var form=el('hhcs-login-form');
  if(form)form.addEventListener('submit',function(e){
   e.preventDefault();var email=form.elements.email.value,password=form.elements.password.value;
   form.elements.password.value='';
   if(email&&password)login(email,password);
  });
  return;
 }
 h.innerHTML=header+'<p>A két profil külön mentődik. Az első feltöltést vagy a különböző verziók összehangolását te hagyod jóvá.</p>'+
  profilePanel('m')+profilePanel('z')+
  '<div class="hhcs-actions"><button type="button" data-hh-sync-action="refresh">🔄 Állapot ellenőrzése</button><button type="button" data-hh-sync-action="logout">Kilépés</button></div>'+
  (busy?'<p>Kapcsolódás és mentés…</p>':'')+
  (lastError?'<p class="hhcs-error" role="alert">'+escapeHtml(lastError)+'</p>':'')+'</div>';
 h.querySelectorAll('button[data-hh-sync-action]').forEach(function(b){b.disabled=busy});
}
function mount(host){
 container=host;if(!host)return;
 if(!el('hhcs-panel-style')){
  var css=document.createElement('style');css.id='hhcs-panel-style';css.textContent=
  '.hhcs-panel{border:1px solid #cfdee9;background:#f7fbfe;border-radius:12px;padding:11px;margin-top:10px;min-width:0;max-width:100%;box-sizing:border-box;font-size:11px}'+
  '.hhcs-panel p{font-size:10px;line-height:1.4;margin:6px 0;color:#527086}'+
  '.hhcs-panel form{display:grid;gap:7px;margin-top:8px}'+
  '.hhcs-panel input{width:100%;min-width:0;box-sizing:border-box;padding:10px;border:1px solid #c5d6df;border-radius:9px}'+
  '.hhcs-panel button{border:1px solid #c2dae6;background:#e6f3fc;border-radius:9px;color:#174765;padding:9px;max-width:100%;font-size:11px;font-weight:800}'+
  '.hhcs-profile{display:grid;grid-template-columns:minmax(0,1fr);gap:5px;border-top:1px solid #dfeef0;padding:9px 0}'+
  '.hhcs-profile span{font-size:10px;color:#526f80}'+
  '.hhcs-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:7px}'+
  '.hhcs-error{color:#ab2640!important;font-weight:800}';
  document.head.appendChild(css);
 }
 if(!host.dataset.hhcsBound){
  host.dataset.hhcsBound='yes';
  host.addEventListener('click',function(e){
   var b=e.target.closest('button[data-hh-sync-action]');if(!b)return;
   var a=b.dataset.hhSyncAction,k=b.dataset.hhSyncProfile;
   if(a==='upload')upload(k);
   if(a==='download')download(k);
   if(a==='logout')logout();
   if(a==='refresh'){busy=true;lastError='';fetchCloud().catch(function(err){lastError=err.message||'Nincs kapcsolat'}).finally(function(){busy=false;draw()})}
  });
 }
 draw();
 if(session&&!profiles&&!busy&&!autoAttempted){
  autoAttempted=true;busy=true;fetchCloud().catch(function(err){lastError=err.message||'Nem érhető el a központi tárhely.'}).finally(function(){busy=false;draw()});
 }
}
sSave(active()?sRead():null);
window.HH_DAILY_HEALTH_SYNC_V319={mount:mount,onLocalChange:localChanged,getStatus:function(){return {configured:active(),authenticated:!!session,m:states.m.mode,z:states.z.mode}},request:async function(path,opts){if(!active()||!session)throw new Error('Előbb jelentkezz be a Központi Health Vaultba.');await ensureToken();return call(path,opts||{})}};
})();
