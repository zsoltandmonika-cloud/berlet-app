/* Léna Recept Stúdió v1158 · read-only Puter credit indicator.
 * This is OUR tiny status chip, never a style override of Puter's own
 * billing dialog. No payments, hidden SDK dialogs or sign-in side effects.
 */
(function(w,d){
 'use strict';
 const MICRO_CENTS_PER_DOLLAR=100000000;
 const LOW_BALANCE=5000000; // $0.05, same preflight threshold as v1157
 const id='lenaPuterBalanceV1158';
 let lastState=null,pending=false;
 const el=d.getElementById(id);
 if(!el)return;
 function paint(remaining){
  const low=Number.isFinite(remaining)&&remaining<LOW_BALANCE;
  el.hidden=!low;
  if(low){
   const usd=Math.max(0,remaining/MICRO_CENTS_PER_DOLLAR);
   el.title='Puter keret: $'+usd.toFixed(2)+'. Az AI-funkciók korlátozottak. A kézi receptmentés megkísérelhető; felhőszinkronhoz is szükség lehet keretre.';
   el.setAttribute('aria-label','Puter AI-keret alacsony');
  }
  if(lastState!==low){
   lastState=low;
   d.body?.setAttribute('data-lena-puter-low-balance',low?'on':'off');
  }
 }
 async function refresh(){
  if(pending)return;
  const client=w.puter;
  if(!client?.auth?.isSignedIn?.()||typeof client.auth.getMonthlyUsage!=='function'){
   el.hidden=true;return;
  }
  pending=true;
  try{
   const usage=await client.auth.getMonthlyUsage();
   const remaining=usage?.allowanceInfo?.remaining;
   if(typeof remaining==='number')paint(remaining);
  }catch(e){console.warn('Puter balance indicator unavailable:',e)}
  finally{pending=false}
 }
 el.addEventListener('click',()=>{
  const msg='💳 A Puter AI-kerete alacsony. A Recept Stúdióban a kézi szerkesztést továbbra is használhatod. Felhőmentésnél külön jelezzük, ha a keret miatt a szinkron nem sikerül.';
  if(typeof w.toast==='function')w.toast(msg);
  else w.alert?.(msg);
 });
 el.hidden=true;
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>void refresh(),{once:true});
 else void refresh();
 w.addEventListener('focus',()=>void refresh());
 d.addEventListener('visibilitychange',()=>{if(!d.hidden)void refresh()});
 w.LENA_PUTER_BALANCE_V1158=Object.freeze({refresh});
})(window,document);
