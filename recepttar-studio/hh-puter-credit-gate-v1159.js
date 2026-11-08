/* Recept Stúdió v1159 · Puter quota-safe local-first cloud gate.
 * Purpose: stop OUR metered requests when credit is empty, rather than trying
 * to hide or manipulate Puter's own billing dialog. No SDK monkeypatching.
 * Unknown balance => local-only, never retry failed cloud calls blindly.
 */
(function(w){
 'use strict';
 if(w.LENA_PUTER_CREDIT_GATE_V1159)return;
 const CUT_OFF=5000000; // 0.05 USD; Puter allowance measured in microcents.
 const TTL=20000;
 let checkedAt=0,last=null,inFlight=null;
 function state(allowed,reason,remaining){
  last=Object.freeze({allowed,reason,remaining,checkedAt:Date.now()});
  checkedAt=last.checkedAt;
  try{w.dispatchEvent(new CustomEvent('lena:puter-credit',{detail:last}))}catch(_){}
  return last;
 }
 async function check(force=false){
  const auth=w.puter?.auth;
  if(!auth?.isSignedIn?.())return state(false,'signed-out',null);
  if(!force&&last&&Date.now()-checkedAt<TTL)return last;
  if(inFlight)return inFlight;
  if(typeof auth.getMonthlyUsage!=='function')return state(false,'usage-unavailable',null);
  inFlight=(async()=>{
   try{
    const usage=await auth.getMonthlyUsage();
    const remaining=usage?.allowanceInfo?.remaining;
    if(typeof remaining!=='number'||!Number.isFinite(remaining))
     return state(false,'usage-unavailable',null);
    return state(remaining>=CUT_OFF,remaining>=CUT_OFF?'ok':'low-balance',remaining);
   }catch(e){
    console.warn('Puter quota preflight unavailable; keeping local recipes safe',e);
    return state(false,'usage-unavailable',null);
   }finally{inFlight=null}
  })();
  return inFlight;
 }
 async function permit(){return (await check()).allowed;}
 function message(){
  const reason=last?.reason;
  if(reason==='low-balance')return '💳 Puter-keret elfogyott. A recept helyben mentve, felhőszinkronra vár.';
  if(reason==='signed-out')return '💾 Helyben mentve. A felhőszinkronhoz Puter-bejelentkezés szükséges.';
  return '💾 Helyben mentve. A felhőkapcsolat jelenleg nem ellenőrizhető; szinkron később.';
 }
 function reset(){checkedAt=0;last=null}
 w.LENA_PUTER_CREDIT_GATE_V1159=Object.freeze({check,permit,message,reset,
  get last(){return last},get cutoff(){return CUT_OFF}});
})(window);
