/* Family Guard TV read-only owner-origin helper.
 * ONLY this page (on already-authorized HealthHub GitHub Pages origin) reads
 * native HH One / Outlook Dropbox. No permission request, no geolocation,
 * no token transfer, no writes, no independent TV pairing.
 * Owner must explicitly press Allow and type TV-only 120-bit consent secret.
 */
(function(w,d){
 'use strict';
 const TV_REMOTE_ORIGIN='https://mediaradar.pages.dev';
 const CODEC=w.SHO_GUARDIAN_RO_CODEC_V1;
 const INTERVAL=12000;
 const $=id=>d.getElementById(id);
 let seq=0,secret='',timer=null,busy=false,enabled=false,gate=false;
 function status(s){$('sourceStatus').textContent=String(s||'');}
 function trustedOpener(){
  if(!w.opener||w.opener.closed)return false;
  try{return new URL(d.referrer).origin===TV_REMOTE_ORIGIN;}catch(_){return false;}
 }
 function publish(event){
  if(!trustedOpener())return false;
  try{w.opener.postMessage(event,TV_REMOTE_ORIGIN);return true;}catch(_){return false;}
 }
 function available(){
  return !!(CODEC&&w.crypto?.subtle&&w.crypto?.getRandomValues&&
   w.HH_GUARDIAN_GPS_ROUTER_V1177?.connected?.()&&trustedOpener());
 }
 async function readProfile(profile){
  const route=w.HH_GUARDIAN_GPS_ROUTER_V1177;
  let result;
  try{
   if(!route?.connected?.())return CODEC.sanitizedNative(profile,{status:'not-connected'});
   // The established Guardian router verifies route, source and physical owner.
   result=await route.read(profile);
  }catch(_){result={status:'error'};}
  return CODEC.sanitizedNative(profile,result);
 }
 async function poll(){
  if(busy||!enabled||!gate)return;
  busy=true;
  try{
   if(!available()){stop('A családi Outlook-kapcsolat vagy a TV-vezérlő már nem elérhető.');return;}
   const now=Date.now();
   const profiles=await Promise.all(['zsolt','monika'].map(readProfile));
   if(!enabled||!gate||!secret)return;
   const payload={v:1,at:Date.now(),profiles};
   const envelope=await CODEC.seal(secret,payload,++seq,Date.now(),w.crypto);
   if(!enabled||!gate||!trustedOpener())return;
   if(!publish({kind:'SHO_GUARDIAN_RO_HELPER_CIPHERTEXT_V1',envelope})){
    stop('A párosított telefonos távirányító bezáródott.');return;
   }
   const ok=profiles.filter(x=>x.status==='ok').length;
   const revoked=profiles.filter(x=>x.status==='revoked').length;
   status('✅ Titkosított, olvasási célú adatok elküldve a TV-nek. Hitelesített forrás: '+
    ok+'/2'+(revoked?', visszavonva: '+revoked:'')+
    '. Utolsó ellenőrzés: '+new Date(now).toLocaleTimeString('hu-HU')+
    '. A TV külön jelzi, hogy ÉLŐ vagy NEM ÉLŐ.');
  }catch(_){
   status('⚠ Privát helyadat nem olvasható vagy nem titkosítható. A TV-n nincs igazolt új adat.');
  }finally{busy=false;}
 }
 function stop(message){
  const had=enabled;
  enabled=false;secret='';seq=0;gate=false;
  $('tvCode').value='';
  $('startShare').disabled=false;$('stopShare').disabled=true;
  if(timer!==null){w.clearInterval(timer);timer=null;}
  if(had)publish({kind:'SHO_GUARDIAN_RO_HELPER_STOP_V1'});
  status(message||'⏹ Megosztás leállítva. A TV-nek nem marad meg a kódja vagy GPS-adata.');
 }
 function start(){
  if(enabled)return;
  if(!trustedOpener()){
   status('⚠ Ezt az oldalt a már párosított SHO telefonos távirányítóból kell megnyitni.');return;
  }
  if(!CODEC||!w.crypto?.subtle||!w.crypto?.getRandomValues){
   status('⚠ Ez a böngésző nem tudja biztonságosan titkosítani a családi helyadatokat.');return;
  }
  if(!w.HH_GUARDIAN_GPS_ROUTER_V1177?.connected?.()){
   status('⚠ Ezen a telefonos böngészőn nincs aktív, engedélyezett Outlook Dropbox-kapcsolat. Előbb a meglévő Family Guardot csatlakoztasd.');
   return;
  }
  try{secret=CODEC.normalizeCode($('tvCode').value);}
  catch(_){status('⚠ Másold be pontosan a TV-n látható 24 karakteres titkos kódot.');return;}
  // A code is a short-lived TV DISPLAY authorization, never a new GPS permission.
  $('tvCode').value='';
  $('startShare').disabled=true;$('stopShare').disabled=false;
  gate=true;enabled=true;seq=0;
  status('🔐 Engedélyezve, csak meglévő HH One natív fájlok olvasása…');
  poll();timer=w.setInterval(poll,INTERVAL);
 }
 function init(){
  $('startShare').addEventListener('click',start);
  $('stopShare').addEventListener('click',()=>stop());
  w.addEventListener('pagehide',()=>stop('Megosztás leállítva.'));
  if(!trustedOpener()){
   gate=false;$('startShare').disabled=true;
   status('⚠ Nem megbízható megnyitás. Nyisd meg a TV-re párosított SHO Remote gombjával.');
  }else if(!w.HH_GUARDIAN_GPS_ROUTER_V1177?.connected?.()){
   status('⚠ Outlook Dropbox: ezen a böngészőn nincs aktív hozzáférés. Nem olvasunk személyes adatot.');
  }else status('🔐 Outlook Dropbox rendelkezésre áll. Kód + Engedélyezés szükséges; nincs automatikus adatmegosztás.');
 }
 init();
})(window,document);