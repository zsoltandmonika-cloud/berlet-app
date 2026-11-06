/* SHO Smart Valet v22 | Private cloud backup status.
   Read-only metadata check for the current profile; no uploads, deletes or copies.
   This proves committed records, NOT recovery of device-bound encryption keys. */
(function(w,d){
'use strict';
if(w.SHO_VALET_CLOUD_STATUS_V22)return;
const ID='svCloudStatusV22',CFG=w.HH_CENTRAL_VAULT||{};
const $=id=>d.getElementById(id);
const profile=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
const hungarian=()=>w.localStorage.getItem('sh9-language-v1')!=='en';
const t=(hu,en)=>hungarian()?hu:en;
let client=null,epoch=0,scheduled=null,busy=false;
function make(tag,className,value){
 const el=d.createElement(tag);if(className)el.className=className;
 if(value!==undefined)el.textContent=value;return el;
}
function host(){
 let el=$(ID);if(el)return el;
 const library=d.querySelector('.sv-section[aria-labelledby="svLibraryTitle"]');
 if(!library)return null;
 el=make('section','sv-cloud-v22');
 el.id=ID;el.dataset.state='checking';
 el.setAttribute('aria-label','Központi mentés ellenőrzése');
 const dot=make('span','sv-cloud-indicator-v22','☁️');dot.setAttribute('aria-hidden','true');
 const body=make('div','sv-cloud-copy-v22');
 const title=make('strong','sv-cloud-title-v22',t('Központi mentés: ellenőrzésre vár','Cloud backup: pending check'));
 title.id='svCloudTitleV22';title.setAttribute('role','status');title.setAttribute('aria-live','polite');
 const detail=make('small','sv-cloud-detail-v22',
  t('Mentési rekordok ellenőrzése a privát Supabase tárhelyen.','Checking saved records in private Supabase storage.'));
 detail.id='svCloudDetailV22';
 body.append(title,detail);
 const button=make('button','sv-cloud-recheck-v22','↻');
 button.type='button';button.id='svCloudRefreshV22';
 button.setAttribute('aria-label',t('Központi mentés újraellenőrzése','Recheck cloud backup'));
 button.title=t('Újraellenőrzés','Recheck');button.addEventListener('click',()=>{void check()});
 el.append(dot,body,button);
 const categories=library.querySelector('.sv-categories');
 if(categories)library.insertBefore(el,categories);
 else library.appendChild(el);
 return el;
}
function display(mode,title,detail){
 const el=host();if(!el)return;
 el.dataset.state=mode;el.dataset.profile=profile();
 $('svCloudTitleV22').textContent=title;
 $('svCloudDetailV22').textContent=detail;
 const b=$('svCloudRefreshV22');if(b)b.disabled=mode==='checking';
}
function checkQuery(c,table,fields,key){
 return c.from(table).select(fields).eq('profile_key',key).limit(1000);
}
async function check(){
 const key=profile(),serial=++epoch;
 if(scheduled!==null){clearTimeout(scheduled);scheduled=null}
 busy=true;
 display('checking',t('☁️ Központi mentés ellenőrzése…','☁️ Checking cloud backup…'),
  t('Zsolt és Mónika rekordjait külön ellenőrizzük.','Records are verified per profile.'));
 try{
  if(!CFG.enabled||!CFG.supabaseUrl||!CFG.publishableKey||!w.supabase?.createClient)
   throw Error('NOT_READY');
  if(!client)client=w.supabase.createClient(CFG.supabaseUrl,CFG.publishableKey,{
   auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,
    autoRefreshToken:false,detectSessionInUrl:false}
  });
  const {data:userData,error:authError}=await client.auth.getUser();
  if(authError||!userData?.user?.id)throw Error('LOGIN_REQUIRED');
  const grant=await client.from('hh_profile_access').select('profile_key')
   .eq('user_id',userData.user.id).eq('profile_key',key).maybeSingle();
  if(grant.error||!grant.data)throw Error('ACCESS_DENIED');
  const results=await Promise.all([
   checkQuery(client,'hh_valet_items','id,uploaded_at',key),
   checkQuery(client,'hh_valet_identity_cards_v11','id,protection_mode,front_saved_at',key),
   checkQuery(client,'hh_valet_extra_cards_v15','id,category,protection_mode',key)
  ]);
  if(serial!==epoch||key!==profile())return;
  if(results.some(r=>r.error||!Array.isArray(r.data)))throw Error('QUERY_FAILED');
  const [files,ids,extra]=results.map(r=>r.data);
  const pending=files.filter(x=>!x.uploaded_at).length+
   ids.filter(x=>!x.front_saved_at).length;
  const complete=files.length+ids.length+extra.length-pending;
  const deviceBound=ids.filter(x=>x.front_saved_at&&x.protection_mode==='device').length+
   extra.filter(x=>x.protection_mode==='device').length;
  const limited=results.some(r=>r.data.length===1000);
  const fileCount=t(complete+' mentési rekord',''+complete+' saved records');
  if(pending){
   display('warning',t('⚠️ Központi mentés: ellenőrizendő','⚠️ Cloud backup: needs attention'),
    t(fileCount+' · '+pending+' befejezetlen mentés.',''+fileCount+' · '+pending+' incomplete saves.'));
  }else if(!complete){
   display('empty',t('☁️ Központi mentés: üres','☁️ Cloud backup: empty'),
    t('Nincs befejezett privát kártyamentés ennél a profilnál.','No completed private card saves for this profile.'));
  }else if(deviceBound){
   display('caution',t('☁️ Felhő: '+complete+' mentett elem','☁️ Cloud: '+complete+' saved items'),
    t(deviceBound+' kártya feloldókulcsa csak ezen az eszközön lehet. A böngészőadatokat ne töröld!',
      deviceBound+' cards may have device-only keys. Do not erase browser data!')+
    (limited?' · '+t('1000-es listakorlát','1000-row limit'):''));
  }else{
   display('ok',t('✅ Központi mentés: '+complete+' rekord','✅ Cloud backup: '+complete+' records'),
    t('A privát szerver mentési rekordjai elérhetők. Nem PDF-visszaállítási próba.',
      'Private server records are accessible; file restore is not tested.')+
    (limited?' · '+t('1000-es listakorlát','1000-row limit'):''));
  }
 }catch(e){
  if(serial!==epoch||key!==profile())return;
  const code=e?.message;
  const needsLogin=code==='LOGIN_REQUIRED',unauthorized=code==='ACCESS_DENIED',notReady=code==='NOT_READY';
  display(notReady?'checking':needsLogin||unauthorized?'locked':'error',
   notReady?t('☁️ Felhőmentés: kapcsolat előkészítése','☁️ Preparing cloud connection'):
   needsLogin?t('🔐 Központi mentés: belépés szükséges','🔐 Cloud backup: sign-in needed'):
   unauthorized?t('🔒 Nincs profil-hozzáférés','🔒 No profile access'):
   t('⚠️ Felhőmentés nem ellenőrizhető','⚠️ Cloud backup not verified'),
   notReady?t('A privát tároló betöltése után ellenőrizzük.','Verification starts after private storage loads.'):
   needsLogin?t('A Smart Valet a Family Guard Google-belépését használja.','Smart Valet uses Family Guard Google sign-in.'):
   t('A felhőmentés állapota jelenleg nem igazolható.','Cloud backup status could not be confirmed.'));
 }finally{
  if(serial===epoch){busy=false;const b=$('svCloudRefreshV22');if(b)b.disabled=false}
 }
}
function schedule(){
 epoch++;
 display('checking',t('☁️ Központi mentés: ellenőrzés…','☁️ Cloud backup: checking…'),
  t('Aktuális profil ellenőrzése','Checking current profile'));
 if(scheduled!==null)clearTimeout(scheduled);
 scheduled=setTimeout(()=>{scheduled=null;void check()},220);
}
function init(){
 if(!host())return;
 for(const name of ['sho-valet-private-ready','sho-valet-identity-ready','sho-valet-extra-ready'])
  w.addEventListener(name,e=>{if(e?.detail?.profile===profile())schedule()});
 w.addEventListener('hh-family-profile-changed',schedule);
 w.addEventListener('sh9:profilechange',schedule);
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')schedule()});
 w.addEventListener('pageshow',schedule);
 w.addEventListener('online',schedule);
 d.addEventListener('visibilitychange',()=>{if(!d.hidden)schedule()});
 schedule();
}
w.SHO_VALET_CLOUD_STATUS_V22={check,refresh:schedule};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
