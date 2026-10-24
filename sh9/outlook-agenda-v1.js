/* SH9 Outlook Agenda v1 · read-only Microsoft Graph client for the WEB Start Page.
 * This code NEVER transfers ChatGPT connector access into GitHub Pages and
 * NEVER uploads private events into GitHub. Microsoft OAuth SPA app registration required.
 * Android's native packaged WebView needs a separate, explicitly approved auth bridge.
 */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 const model=w.SH9_OUTLOOK_AGENDA_MODEL_V1;
 const get=id=>d.getElementById(id);
 const card=get('sh9CalendarCell'),summary=get('sh9CalendarSummary'),value=get('sh9CalendarValue'),sub=get('sh9CalendarSub');
 const modal=get('sh9AgendaDialog'),close=get('sh9AgendaClose'),status=get('sh9AgendaStatus');
 const list=get('sh9AgendaList'),connect=get('sh9AgendaConnect'),save=get('sh9AgendaSave');
 const clientInput=get('sh9AgendaClientId'),accountInput=get('sh9AgendaAccount'),configBox=get('sh9AgendaSetup');
 const refreshBtn=get('sh9AgendaRefresh'),disconnect=get('sh9AgendaDisconnect');
 if(!model||!card||!summary||!value||!sub||!modal||!close||!status||!list||!connect||!save||!clientInput||!accountInput||!configBox||!refreshBtn||!disconnect)return;
 const CONFIG_KEY='sh9-ms-calendar-config-v1',TOKEN_KEY='sh9-ms-calendar-session-v1',FLOW_KEY='sh9-ms-calendar-oauth-flow-v1';
 const TRUST_KEY='sh9-ms-calendar-prior-approval-v2',SILENT_ATTEMPT_KEY='sh9-ms-calendar-silent-attempt-v2';
 const PERSIST=w.SH9_OUTLOOK_PERSISTENCE_V2;
 const SILENT_RETRY_MS=4*60*60*1000;
 const NATIVE=new URLSearchParams(w.location.search).get('sh9native')==='1';
 const ID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const AUTHORITY='https://login.microsoftonline.com/consumers/oauth2/v2.0/';
 const GRAPH='https://graph.microsoft.com/v1.0/';
 const SCOPES='openid profile offline_access User.Read Calendars.Read';
 const TZ='Europe/Budapest';
 let cfg=null,token=null,expiresAt=0,refreshToken=null,refreshIssuedAt=0;
 let loading=false,lastSync=0,renewing=null,result=model.analyze([]),open=false,focusFrom=null;
 function local(key){try{return w.localStorage.getItem(key)}catch(e){return null}}
 function saveLocal(key,data){try{w.localStorage.setItem(key,data);return true}catch(e){return false}}
 function session(key){try{return w.sessionStorage.getItem(key)}catch(e){return null}}
 function saveSession(key,data){try{w.sessionStorage.setItem(key,data);return true}catch(e){return false}}
 function dropSession(key){try{w.sessionStorage.removeItem(key)}catch(e){}}
 function loadConfig(){
  try{const s=JSON.parse(local(CONFIG_KEY)||'null');
   if(s&&ID_RE.test(s.clientId)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.account)){return {clientId:s.clientId,account:s.account.toLowerCase()}}
  }catch(e){}
  return null;
 }
 cfg=loadConfig();
 function setStatus(text){status.textContent=text}
 function setCard(title,detail,kind){
  value.textContent=title;sub.textContent=detail;
  card.dataset.status=kind||'pending';
  card.setAttribute('aria-label','Naptár · '+title+' · '+detail+' · Agenda megnyitása');
 }
 function disconnectSession(){
  token=null;expiresAt=0;refreshToken=null;refreshIssuedAt=0;
  lastSync=0;dropSession(TOKEN_KEY);result=model.analyze([]);
 }
 async function forgetStoredSession(){
  disconnectSession();
  try{w.localStorage.removeItem(TRUST_KEY);w.localStorage.removeItem(SILENT_ATTEMPT_KEY)}catch(_){}
  if(PERSIST)await PERSIST.clear(w);
 }
 async function storeToken(raw,originalIssuedAt){
  if(!raw||!raw.access_token)throw new Error('Microsoft token válasz hiányos');
  token=raw.access_token;
  expiresAt=Date.now()+Math.max(60,Number(raw.expires_in)||3600)*1000;
  saveSession(TOKEN_KEY,JSON.stringify({accessToken:token,expiresAt:expiresAt,clientId:cfg.clientId,account:cfg.account}));
  if(raw.refresh_token){
   refreshToken=raw.refresh_token;
   // SPA refresh-token lifetime is non-sliding: rotation never resets the 24h window.
   refreshIssuedAt=originalIssuedAt||Date.now();
  }
 }
 async function persistRefreshAfterVerify(){
  if(refreshToken&&PERSIST&&cfg)
   await PERSIST.save(w,cfg.clientId,cfg.account,refreshToken,refreshIssuedAt);
 }
 async function reloadStoredSession(){
  if(!cfg||!PERSIST)return false;
  const saved=await PERSIST.load(w,cfg.clientId,cfg.account);
  if(!saved)return false;
  refreshToken=saved.refreshToken;refreshIssuedAt=saved.issuedAt;
  return true;
 }
 async function getAccessToken(){
  if(tokenReady())return true;
  if(NATIVE||!cfg)return false;
  if(renewing)return renewing;
  renewing=(async()=>{
   if(!refreshToken)await reloadStoredSession();
   if(!refreshToken||Date.now()-refreshIssuedAt>=23*60*60*1000)return false;
   try{
    const raw=await jsonRequest(AUTHORITY+'token',{
     method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
     body:new URLSearchParams({client_id:cfg.clientId,grant_type:'refresh_token',
      refresh_token:refreshToken,scope:SCOPES}).toString()
    });
    await storeToken(raw,refreshIssuedAt);
    // Never use calendar details before checking actual signed-in account.
    await verifyAccount();
    await persistRefreshAfterVerify();
    return tokenReady();
   }catch(e){
    token=null;expiresAt=0;dropSession(TOKEN_KEY);
    if(/HTTP 400|HTTP 401/.test(escapeMessage(e))){
     refreshToken=null;refreshIssuedAt=0;
     if(PERSIST)await PERSIST.clear(w);
    }
    return false;
   }
  })().finally(()=>{renewing=null});
  return renewing;
 }
 function priorApproved(){
  try{const x=JSON.parse(local(TRUST_KEY)||'null');
   return !!(cfg&&x&&x.clientId===cfg.clientId&&x.account===cfg.account)}catch(_){return false}
 }
 async function silentlyResumeMicrosoft(){
  if(NATIVE||!priorApproved()||!cfg)return false;
  // If a live refresh credential merely hit a network error, do not redirect.
  if(refreshToken&&refreshIssuedAt&&Date.now()-refreshIssuedAt<23*60*60*1000)return false;
  const last=Number(local(SILENT_ATTEMPT_KEY)||0);
  if(last>0&&Date.now()-last<SILENT_RETRY_MS)return false;
  // One top-level prompt=none attempt, no redirect loops and no browser iframes.
  saveLocal(SILENT_ATTEMPT_KEY,String(Date.now()));
  await beginAuth(true);
  return true;
 }
 function resumeSession(){
  if(!cfg)return;
  try{
   const p=JSON.parse(session(TOKEN_KEY)||'null');
   if(p&&p.clientId===cfg.clientId&&p.account===cfg.account&&typeof p.accessToken==='string'&&p.expiresAt>Date.now()+45000){
    token=p.accessToken;expiresAt=p.expiresAt;
   }else dropSession(TOKEN_KEY);
  }catch(e){dropSession(TOKEN_KEY)}
 }
 function tokenReady(){return !!token&&expiresAt>Date.now()+45000}
 function escapeMessage(e){return e&&e.message?String(e.message).slice(0,180):'Nem sikerült betölteni a naptárt'}
 function urlBase(){return new URL('./',w.location.href).href}
 function base64url(bytes){
  let binary='';bytes.forEach(x=>{binary+=String.fromCharCode(x)});
  return w.btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
 }
 function randomString(n){
  const buf=new Uint8Array(n);w.crypto.getRandomValues(buf);return base64url(buf);
 }
 async function beginAuth(silent){
  if(NATIVE){setStatus('Az SH9 APK-ban a Microsoft-bejelentkezéshez külön natív hitelesítési kapcsolat szükséges. A webes változat Chrome-ban előkészítve.');return}
  if(!cfg){setStatus('Előbb add meg a Microsoft alkalmazásazonosítóját és a kapcsolni kívánt fiókot.');return}
  if(!w.isSecureContext||!w.crypto||!w.crypto.subtle){setStatus('Biztonságos HTTPS kapcsolat szükséges a Microsoft-belépéshez.');return}
  const verifier=randomString(48),state=randomString(24);
  const dig=await w.crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge=base64url(new Uint8Array(dig));
  const redirectUri=urlBase();
  if(!saveSession(FLOW_KEY,JSON.stringify({verifier:verifier,state:state,at:Date.now(),clientId:cfg.clientId,redirectUri:redirectUri}))){setStatus('A böngésző nem engedélyezi az ideiglenes biztonságos munkamenetet.');return}
  const u=new URL(AUTHORITY+'authorize');
  u.searchParams.set('client_id',cfg.clientId);
  u.searchParams.set('response_type','code');
  u.searchParams.set('redirect_uri',redirectUri);
  u.searchParams.set('response_mode','query');
  u.searchParams.set('scope',SCOPES);
  u.searchParams.set('code_challenge_method','S256');
  u.searchParams.set('code_challenge',challenge);
  u.searchParams.set('state',state);
  if(silent)u.searchParams.set('prompt','none');
  w.location.assign(u.href);
 }
 async function jsonRequest(url,opts){
  const r=await w.fetch(url,Object.assign({cache:'no-store',credentials:'omit'},opts||{}));
  if(!r.ok)throw new Error('Microsoft szolgáltatás: HTTP '+r.status);
  return await r.json();
 }
 function safelyStripAuthQuery(){
  const u=new URL(w.location.href);
  for(const k of ['code','state','error','error_description','session_state'])u.searchParams.delete(k);
  w.history.replaceState(w.history.state,'',u.pathname+u.search+u.hash);
 }
 async function handleCallback(){
  const params=new URLSearchParams(w.location.search);
  if(!params.has('code')&&!params.has('error'))return false;
  let saved=null;
  try{saved=JSON.parse(session(FLOW_KEY)||'null')}catch(e){}
  dropSession(FLOW_KEY);
  const code=params.get('code'),returnedState=params.get('state'),error=params.get('error');
  safelyStripAuthQuery();
  if(error){
   setCard('Újraengedélyezés szükséges','Microsoft-belépés ›','pending');
   setStatus(error==='login_required'||error==='interaction_required'||error==='consent_required'?
    'A Microsoft munkamenete lejárt. A naptárhoz egyszeri megerősítés szükséges.':
    'Microsoft-belépés nem fejeződött be: '+error);
   return true;
  }
  if(!code||!saved||!cfg||saved.clientId!==cfg.clientId||returnedState!==saved.state||Date.now()-saved.at>10*60*1000||saved.redirectUri!==urlBase()){
   setStatus('A Microsoft-belépés biztonsági ellenőrzése sikertelen. Kapcsolódj újra.');return true;
  }
  try{
   const body=new URLSearchParams({client_id:cfg.clientId,grant_type:'authorization_code',code:code,code_verifier:saved.verifier,redirect_uri:saved.redirectUri,scope:SCOPES});
   const auth=await jsonRequest(AUTHORITY+'token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
   await storeToken(auth);
   await verifyAccount();
   await persistRefreshAfterVerify();
   saveLocal(TRUST_KEY,JSON.stringify({clientId:cfg.clientId,account:cfg.account}));
   await sync(true);
  }catch(e){await forgetStoredSession();setCard('Nincs összekötve','Microsoft hitelesítés sikertelen','error');setStatus('Belépési hiba: '+escapeMessage(e))}
  return true;
 }
 async function verifyAccount(){
  if(!tokenReady()||!cfg)throw new Error('A kapcsolat lejárt');
  const me=await jsonRequest(GRAPH+'me?$select=mail,userPrincipalName,otherMails',{headers:{Authorization:'Bearer '+token}});
  const addresses=[me.mail,me.userPrincipalName,...(Array.isArray(me.otherMails)?me.otherMails:[])].filter(Boolean).map(x=>String(x).toLowerCase());
  if(!addresses.includes(cfg.account))throw new Error('Másik Microsoft-fiók jelentkezett be. A naptár nem jeleníthető meg.');
 }
 async function fetchEvents(){
  const now=Date.now(),start=new Date(now-24*3600000).toISOString(),end=new Date(now+14*86400000).toISOString();
  let next=new URL(GRAPH+'me/calendar/calendarView');
  next.searchParams.set('startDateTime',start);
  next.searchParams.set('endDateTime',end);
  next.searchParams.set('$top','100');
  next.searchParams.set('$select','id,subject,start,end,isAllDay,showAs,isCancelled,sensitivity');
  const events=[];
  for(let page=0;next&&page<5;page++){
   if(next.protocol!=='https:'||next.hostname!=='graph.microsoft.com'||!next.pathname.startsWith('/v1.0/'))throw new Error('Nem megbízható naptáradat-hivatkozás');
   const data=await jsonRequest(next.href,{headers:{Authorization:'Bearer '+token,Prefer:'outlook.timezone="UTC"'}});
   if(!Array.isArray(data.value))throw new Error('Hiányzó Outlook-események');
   events.push(...data.value);
   next=data['@odata.nextLink']?new URL(data['@odata.nextLink']):null;
  }
  return events;
 }
 function displayTime(ms){return new Intl.DateTimeFormat('hu-HU',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(new Date(ms))}
 function displayDay(ms){return new Intl.DateTimeFormat('hu-HU',{timeZone:TZ,weekday:'long',month:'long',day:'numeric'}).format(new Date(ms))}
 function append(tag,cls,txt,parent){
  const el=d.createElement(tag);if(cls)el.className=cls;
  if(txt!=null)el.textContent=String(txt);
  parent.appendChild(el);return el;
 }
 function renderEvents(){
  list.replaceChildren();
  if(!result.events.length){append('p','sh9-agenda-empty','Nincs megjeleníthető esemény a következő 14 napban.',list);return}
  let currentDay='';
  for(const ev of result.events){
   const day=model.todayKey(ev.startMs);
   if(day!==currentDay){currentDay=day;append('h3','sh9-agenda-day',displayDay(ev.startMs),list)}
   const isConflict=result.conflicts.has(ev.id);
   const card=append('article','sh9-agenda-event'+(isConflict?' is-conflict':''),null,list);
   const time=ev.allDay?'Egész nap':displayTime(ev.startMs)+' – '+displayTime(ev.endMs);
   append('time','sh9-agenda-hour',time,card);
   append('p','sh9-agenda-subject',ev.title,card);
   if(isConflict)append('span','sh9-agenda-collision','⚠️ Átfedő időpont',card);
  }
 }
 async function sync(force){
  if(NATIVE||!cfg)return;
  if(loading||(!force&&lastSync&&Date.now()-lastSync<9*60*1000))return;
  loading=true;setCard('Frissítés…','Outlook események','loading');setStatus('Outlook naptár betöltése…');
  try{
   if(!await getAccessToken()){
    setCard('Kapcsolat megújítása','Microsoft megerősítés szükséges','pending');
    setStatus('A naptár hozzáférése lejárt. Koppints a Microsoft-belépésre; a fiókot megjegyeztük.');
    return;
   }
   let raws;
   try{raws=await fetchEvents()}catch(e){
    if(!/HTTP 401/.test(escapeMessage(e)))throw e;
    // Expired/invalid Graph token: exactly one refresh and one retry.
    token=null;expiresAt=0;dropSession(TOKEN_KEY);
    if(!await getAccessToken())throw e;
    raws=await fetchEvents();
   }
   result=model.analyze(raws);
   lastSync=Date.now();
   const h=model.headline(result);
   setCard(h.value,h.detail,h.status);
   setStatus('Kapcsolódva · '+cfg.account+' · naptár automatikusan megújítható · csak olvasás');
   renderEvents();
  }catch(e){
   const msg=escapeMessage(e);
   if(/HTTP 401/.test(msg)){token=null;expiresAt=0;dropSession(TOKEN_KEY);
    setCard('Kapcsolat lejárt','Microsoft-megerősítés szükséges','pending')}
   else setCard('Naptár nem elérhető','Újrapróbálás az Agendában','error');
   setStatus('Nem sikerült a frissítés: '+msg);
  }finally{loading=false;setupState()}
 }
 function setupState(){
  configBox.hidden=!!cfg;
  if(cfg){clientInput.value=cfg.clientId;accountInput.value=cfg.account}
  connect.hidden=NATIVE;
  refreshBtn.hidden=NATIVE;
  disconnect.hidden=!cfg;
  if(NATIVE)setStatus('APK üzemmód: a személyes Outlook-naptár külön natív Microsoft-hitelesítést igényel. Nincs automatikus kapcsolat.');
  else if(cfg&&!tokenReady())setStatus('A naptár olvasásához jelentkezz be Microsoft-fiókoddal. Csak Calendars.Read jogosultságot kérünk az eseményekhez.');
  else if(!cfg)setStatus('A Microsoft alkalmazásazonosító (Client ID) és a célfiók megadása szükséges. Privát naptáradat nem kerül a GitHubra.');
 }
 function show(){
  focusFrom=d.activeElement;modal.hidden=false;open=true;setupState();renderEvents();
  close.focus();
 }
 function hide(){
  modal.hidden=true;open=false;
  if(focusFrom&&typeof focusFrom.focus==='function')focusFrom.focus();
 }
 // The packaged SH9 WebView has no browser OAuth session. Route its calendar
 // tap to the real SH9 Agenda in the system browser, via the trusted native host.
 if(NATIVE){
  card.addEventListener('click',()=>{
   const url=new URL('./',w.location.href);
   url.searchParams.set('sh9external','calendar');
   url.searchParams.set('sh9calendar','1');
   w.location.assign(url.href);
  });
  card.setAttribute('aria-label','Outlook Agenda megnyitása a telefon böngészőjében');
  sub.textContent='Agenda a böngészőben ›';
 } else {
  card.addEventListener('click',show);
 }
 close.addEventListener('click',hide);
 modal.addEventListener('click',e=>{if(e.target===modal)hide()});
 d.addEventListener('keydown',e=>{
  if(!open)return;
  if(e.key==='Escape'){hide();return}
  if(e.key==='Tab'){
   const focusables=Array.from(modal.querySelectorAll('button:not([hidden]):not([disabled]),input:not([hidden]):not([disabled]),a[href]')).filter(x=>x.getClientRects().length);
   if(!focusables.length)return;
   const first=focusables[0],last=focusables[focusables.length-1];
   if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus()}
  }
 });
 save.addEventListener('click',()=>{
  const clientId=clientInput.value.trim(),account=accountInput.value.trim().toLowerCase();
  if(!ID_RE.test(clientId)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)){setStatus('Érvényes Microsoft Application Client ID és e-mail cím szükséges.');return}
  // Forget an earlier account before binding a new one, never re-use its tokens.
  void (async()=>{
   await forgetStoredSession();
   if(!saveLocal(CONFIG_KEY,JSON.stringify({clientId:clientId,account:account}))){setStatus('A böngésző nem engedi a helyi beállítás mentését.');return}
   cfg={clientId:clientId,account:account};
   setupState();setStatus('Beállítás mentve. Következő Microsoft-belépéskor engedélyezheted az automatikus megújítást.');
  })();
 });
 connect.addEventListener('click',()=>{void beginAuth().catch(e=>setStatus('Nem indítható a Microsoft-belépés: '+escapeMessage(e)))});
 refreshBtn.addEventListener('click',()=>{void sync(true)});
 disconnect.addEventListener('click',()=>{
  void forgetStoredSession();cfg=null;try{w.localStorage.removeItem(CONFIG_KEY)}catch(e){}
  configBox.hidden=false;clientInput.value='';accountInput.value='';
  setCard('Nincs összekötve','Koppints: Outlook Agenda','pending');setupState();list.replaceChildren();
 });
 if(NATIVE){setCard('Outlook Agenda','Megnyitás a böngészőben ›','pending')}
 else{
  resumeSession();
  const callback=new URLSearchParams(w.location.search);
  if(callback.has('code')||callback.has('error')){
   void handleCallback().then(()=>setupState());
  }else{
   void (async()=>{
    if(!cfg){setCard('Nincs összekötve','Koppints: Outlook Agenda','pending');return}
    if(tokenReady()||await getAccessToken())await sync(true);
    else{
     setCard('Kapcsolat megújítása','Microsoft munkamenet ellenőrzése','pending');
     // After 24h a first-party Microsoft SSO visit may avoid any password entry.
     if(!await silentlyResumeMicrosoft()){
      setCard('Kapcsolat megújítása','Koppints: Microsoft-belépés','pending');
      setupState();
     }
    }
   })();
  }
  w.setInterval(()=>{if(!d.hidden)void sync(false)},10*60*1000);
  d.addEventListener('visibilitychange',()=>{if(!d.hidden)void sync(false)});
  // Direct links from the SH9 Android shell bring up the existing, private
  // browser session without copying credentials into a native WebView.
  if(new URLSearchParams(w.location.search).get('sh9calendar')==='1')show();
 }
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
