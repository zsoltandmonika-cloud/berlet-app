/* v739: visible user-initiated destination Dropbox authorization.
   This is NOT a sync. It never reads or transfers clinical records. */
(function(w,d){
'use strict';
const getAuth=()=>w.HH_CHATGPT_TARGET_AUTH_V739;
const TARGET_FOLDER='/HealthHub-ChatGPT-Analytics';
async function verifyTargetFolder(){
 const auth=getAuth();
 if(!auth)throw Error('A cél Dropbox OAuth modul még nem töltődött be.');
 const stored=await auth.read();
 if(!stored)throw Error('Először engedélyezd a cél Dropboxot.');
 const token=await auth.accessToken();
 const res=await w.fetch('https://api.dropboxapi.com/2/files/get_metadata',{
  method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({path:TARGET_FOLDER,include_deleted:false})
 });
 if(!res.ok)throw Error('A cél Dropboxból nem olvasható a mappa (HTTP '+res.status+'). Ellenőrizd a fiókot és a jogosultságokat.');
 const m=await res.json();
 if(m['.tag']!=='folder'||String(m.path_lower||'').toLowerCase()!==TARGET_FOLDER.toLowerCase()||typeof m.id!=='string')
  throw Error('A cél Dropbox nem a várt mappát adta vissza.');
 return {id:m.id,path:m.path_display||TARGET_FOLDER,oauthAccountSuffix:String(stored.accountId||'').slice(-8)};
}
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
 check.textContent='🔎 Célmappa valódi olvasási teszt';
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
  check.disabled=true;
  status.textContent='A célmappa olvashatóságának ellenőrzése…';
  void verifyTargetFolder().then(info=>{
   status.textContent='✓ A céloldali Dropbox API elérte a mappát: '+info.path+
    ' · Dropbox mappaazonosító: '+info.id+
    ' · OAuth-fiók vége: '+info.oauthAccountSuffix+
    '. Ez NEM bizonyít automatikus adatmásolást.';
  }).catch(e=>{status.textContent='⚠ '+String(e.message||e)})
    .finally(()=>{check.disabled=false});
 });
}
w.HH_CHATGPT_TARGET_ONBOARD_V739={version:'740',mount,verifyTargetFolder};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
w.setInterval(()=>{if(!d.hidden)mount()},4500);
})(window,document);