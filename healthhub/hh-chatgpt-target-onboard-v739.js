/* v739: visible user-initiated destination Dropbox authorization.
   This is NOT a sync. It never reads or transfers clinical records. */
(function(w,d){
'use strict';
const getAuth=()=>w.HH_CHATGPT_TARGET_AUTH_V739;
function mount(){
 const host=d.getElementById('hhAnalytics732');
 if(!host||d.getElementById('hhTargetAuth739')||!getAuth())return;
 const panel=d.createElement('section');
 panel.id='hhTargetAuth739';
 panel.style.cssText='padding:14px;margin-top:12px;border-radius:13px;border:1px solid #83a9ce;background:#10304d;color:#e6f4ff;font:12px/1.6 system-ui';
 const title=d.createElement('h4');title.textContent='🔐 ChatGPT cél Dropbox · v739';
 const notice=d.createElement('p');
 notice.textContent='Ez a külön engedély csak a céloldali Dropbox hitelesítését készíti elő. Egészségügyi fájlokat nem másol. Az új alkalmazás Full Dropbox hozzáférést kér, ezért csak a kívánt célfiókkal engedélyezd.';
 const button=d.createElement('button');button.type='button';
 button.textContent='🔗 Cél Dropbox engedélyezése';
 button.style.cssText='background:#225b83;color:white;border:1px solid #91c9ec;border-radius:10px;padding:10px 12px';
 const check=d.createElement('button');check.type='button';
 check.textContent='🔎 Kapcsolat állapota';
 check.style.cssText=button.style.cssText+';margin-left:8px';
 const status=d.createElement('p');status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 status.textContent='A cél Dropbox-kapcsolat nincs ellenőrizve.';
 const syncNote=d.createElement('p');syncNote.textContent='A célfájlok olvashatósága és az automatikus adatfrissítés még nincs igazolva.';
 const note=d.createElement('small');note.textContent='Az App key már be van állítva. App secretet vagy tokent soha ne adj meg itt.';
 panel.append(title,notice,button,check,status,syncNote,note);
 host.append(panel);
 button.addEventListener('click',()=>{
  button.disabled=true;
  status.textContent='Dropbox engedélyezés indítása…';
  void getAuth().authorize().catch(e=>{status.textContent='⚠ '+String(e.message||e);button.disabled=false});
 });
 check.addEventListener('click',()=>{
  void getAuth().read().then(auth=>{
   status.textContent=auth?'✓ Célfiók OAuth-hitelesítés tárolva. Azonosító vége: '+
    String(auth.accountId||'').slice(-8)+'. A célmappa hozzáférése még nincs tesztelve.':
    'Nincs tárolt célfiók-hitelesítés.';
  }).catch(e=>{status.textContent='⚠ '+String(e.message||e)});
 });
}
w.HH_CHATGPT_TARGET_ONBOARD_V739={version:'739',mount};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
w.setInterval(()=>{if(!d.hidden)mount()},4500);
})(window,document);