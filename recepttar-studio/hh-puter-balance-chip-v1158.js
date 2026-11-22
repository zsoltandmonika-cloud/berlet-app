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
   el.title='Puter havi alapkeretből maradék: $'+usd.toFixed(2)+'. A külön vásárolt kreditek ebben az értékben nem látszanak, és az AI ettől még működhet.';
   el.setAttribute('aria-label','Puter havi felhasználási keret alacsony; külön vásárolt kredit lehet elérhető');
  }
  if(lastState!==low){
   lastState=low;
   d.body?.setAttribute('data-lena-puter-low-balance',low?'on':'off');
  }
 }
 async function refresh(){
  if(pending)return;
  const gate=w.LENA_PUTER_CREDIT_GATE_V1159;
  if(gate){
   const state=await gate.check();
   paint(state.remaining);
   return;
  }
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
  const msg='💳 A Puter havi alapkerete alacsony. A vásárolt kreditek ettől függetlenül használhatók, de ebben a kijelzőben nem látszanak. A valódi AI-hozzáférést az 1 próbarecept gombbal ellenőrizheted.';
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
