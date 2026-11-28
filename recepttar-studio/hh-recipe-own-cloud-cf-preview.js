/* Léna Recept Stúdió · HealthHub-owned cloud v1
 * Own recipe/metadata writes use Supabase REST + private Storage, NEVER Puter.
 * AI still uses Puter separately. No secret/service-role token in this browser.
 * Local IndexedDB remains the source for offline unsynced edits.
 */
(function(w){
 'use strict';
 const CFG=w.HH_CENTRAL_VAULT||{},BASE=String(CFG.supabaseUrl||'').replace(/\/$/,''),
 KEY=String(CFG.publishableKey||''),HOUSE='zsolt-monika',
 SESSION='hh-supabase-health-session-v1',REM='hh-health-vault-trusted-device-v332',
 BUCKET='hh-recipe-studio-v1', TABLE='hh_recipe_studio_recipes_v1',KV='hh_recipe_studio_kv_v1';
 let userCache=null,cacheToken='',refreshing=null;
 function session(){
   let a=null,b=null;
   try{a=JSON.parse(w.sessionStorage.getItem(SESSION)||'null')}catch(_){}
   try{if(w.localStorage.getItem(REM)==='yes')b=JSON.parse(w.localStorage.getItem(SESSION)||'null')}catch(_){}
   return a?.access_token&&b?.access_token?(Number(a.expires_at||0)>=Number(b.expires_at||0)?a:b):(a?.access_token?a:b);
 }
 function saveSession(v,remember){
   // Same session and trusted-device keys as HealthHub Central Vault v332.
   if(remember===true)w.localStorage.setItem(REM,'yes');
   if(remember===false){w.localStorage.removeItem(REM);w.localStorage.removeItem(SESSION)}
   w.sessionStorage.setItem(SESSION,JSON.stringify(v));
   if(w.localStorage.getItem(REM)==='yes')w.localStorage.setItem(SESSION,JSON.stringify(v));
   userCache=null;cacheToken='';
 }
 async function signIn(email,password,remember){
   if(!BASE||!KEY)throw Error('A HealthHub központi kapcsolat hiányzik.');
   if(!String(email||'').trim()||!password)throw Error('Az e-mail és a jelszó megadása kötelező.');
   // Validate candidate login before replacing a previously connected account.
   const loginResponse=await fetch(BASE+'/auth/v1/token?grant_type=password',{
     method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
     body:JSON.stringify({email:String(email).trim(),password}),cache:'no-store'
   });
   if(!loginResponse.ok){
     if([400,401].includes(loginResponse.status))throw Error('Hibás e-mail-cím vagy jelszó.');
     throw Error('HealthHub bejelentkezési hiba (HTTP '+loginResponse.status+').');
   }
   const data=await loginResponse.json();
   if(!data?.access_token||!data?.refresh_token)throw Error('Érvénytelen HealthHub munkamenet.');
   const headers={apikey:KEY,Authorization:'Bearer '+data.access_token};
   const profiles=await fetch(BASE+'/rest/v1/hh_profiles?select=profile_key&limit=2',{
     headers,cache:'no-store'
   });
   if(!profiles.ok)throw Error('A HealthHub-profiljogosultságok nem ellenőrizhetők (HTTP '+profiles.status+').');
   const allowed=await profiles.json();
   if(!Array.isArray(allowed)||!allowed.some(v=>v?.profile_key==='zsolt'||v?.profile_key==='monika'))
     throw Error('Ehhez a fiókhoz nincs engedélyezett családi HealthHub-profil.');
   const next={access_token:data.access_token,refresh_token:data.refresh_token,
     expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
   saveSession(next,remember===true);
   w.dispatchEvent?.(new Event('healthhub:central-auth-changed'));
   return user();
 }

 async function access(){
   if(!BASE||!KEY)throw Error('A HealthHub központi tároló nincs konfigurálva.');
   let s=session();
   if(!s?.access_token)throw Error('A HealthHub-ba be kell jelentkezni a központi mentéshez.');
   if(Number(s.expires_at||0)>Date.now()/1000+70)return s.access_token;
   if(!s.refresh_token)throw Error('A HealthHub bejelentkezés lejárt.');
   if(!refreshing){
     const renew=async()=>{
       // Read again after a different tab has refreshed the shared session.
       const fresh=session();
       if(fresh?.refresh_token!==s.refresh_token&&Number(fresh?.expires_at)>Date.now()/1000+70)return fresh.access_token;
       const res=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',
         headers:{'apikey':KEY,'Content-Type':'application/json'},
         body:JSON.stringify({refresh_token:s.refresh_token}),cache:'no-store'});
       if(!res.ok)throw Error('A HealthHub-munkamenet megújítása sikertelen: '+res.status);
       const value=await res.json();
       if(!value.access_token||!value.refresh_token)throw Error('Érvénytelen HealthHub-munkamenet.');
       const next={access_token:value.access_token,refresh_token:value.refresh_token,
         expires_at:Math.floor(Date.now()/1000)+Number(value.expires_in||3600)};
       saveSession(next);return next.access_token;
     };
     // Reuse the same lock as HealthHub Central Vault to avoid two-tab refresh races.
     const locks=w.navigator?.locks;
     refreshing=(locks?.request?locks.request('hh-private-vault-token-refresh',renew):renew())
       .finally(()=>{refreshing=null});
   }
   return refreshing;
 }
 async function request(path,options){
   const token=await access(),opts=options||{},headers={
     'apikey':KEY,'Authorization':'Bearer '+token,...(opts.headers||{})
   };
   const res=await fetch(BASE+path,{method:opts.method||'GET',headers,body:opts.body,cache:'no-store'});
   if(!res.ok){
     let body='';try{const data=await res.json();body=String(data.message||data.error||data.msg||'')}catch(_){}
     throw Error('HealthHub tároló: HTTP '+res.status+(body?' · '+body.slice(0,140):''));
   }
   if(opts.blob)return res.blob();
   const t=await res.text();try{return t?JSON.parse(t):null}catch(_){return t}
 }
 async function user(){
   const token=await access();
   if(userCache&&cacheToken===token)return userCache;
   const data=await request('/auth/v1/user');
   if(!data?.id)throw Error('Érvénytelen HealthHub felhasználó.');
   userCache={id:String(data.id),email:String(data.email||'')};cacheToken=token;
   return userCache;
 }
 async function account(){try{return 'sb:'+ (await user()).id}catch(_){return null}}
 async function available(){return !!(await account())}
 function encodedPath(path){return String(path).split('/').map(encodeURIComponent).join('/')}
 async function download(path){
   if(!path||!String(path).startsWith(HOUSE+'/'))throw Error('Nem saját receptkép.');
   return request('/storage/v1/object/'+BUCKET+'/'+encodedPath(path),{blob:true})
 }
 function extension(blob){
   const mime=String(blob?.type||'image/jpeg').toLowerCase();
   if(mime==='image/png')return 'png';
   if(mime==='image/webp')return 'webp';
   if(mime==='application/pdf')return 'pdf';
   return 'jpg';
 }
 async function upload(id,kind,blob){
   if(!blob)return null;
   if(!/^[A-Za-z0-9_-]{2,90}$/.test(String(id)))throw Error('Érvénytelen receptazonosító.');
   if(blob.size>25*1024*1024)throw Error('A receptkép túl nagy a privát tárhelyhez.');
   const path=HOUSE+'/'+id+'/'+kind+'.'+extension(blob);
   await request('/storage/v1/object/'+BUCKET+'/'+encodedPath(path),{
     method:'POST',headers:{'Content-Type':blob.type||'image/jpeg','x-upsert':'true'},body:blob
   });
   // Read back before the recipe is marked synced.
   const check=await download(path);
   if(check.size!==blob.size)throw Error('Receptkép visszaellenőrzése sikertelen.');
   return path;
 }
 async function putRecipe(row){
   if(!row?.blob)throw Error('Hiányzik a receptkártya képe.');
   const who=await user(),id=String(row.id);
   const cardPath=await upload(id,'card',row.blob);
   const heroPath=row.heroBlob?await upload(id,'hero',row.heroBlob):null;
   const processPath=row.processBlob?await upload(id,'process',row.processBlob):null;
   const payload={
     id,household:HOUSE,title:String(row.title||'').trim().slice(0,300),
     category:String(row.category||'Egyéb').slice(0,120),
     card_path:cardPath,hero_path:heroPath,process_path:processPath,
     mime:row.mime||row.blob.type||'image/jpeg',
     original_name:row.originalName||row.title+'.jpg',
     readable:row.readable||null,studio_data:row.studioData||null,
     youtube_id:String(row.youtubeId||''),updated_at:new Date().toISOString(),
     created_at:new Date(row.createdAt||Date.now()).toISOString(),created_by:who.id
   };
   if(!payload.title)throw Error('A recept címe hiányzik.');
   const saved=await request('/rest/v1/'+TABLE+'?on_conflict=id',{method:'POST',
     headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},
     body:JSON.stringify(payload)});
   if(!Array.isArray(saved)||saved[0]?.card_path!==cardPath)throw Error('Recept-adatbázis visszaellenőrzése sikertelen.');
   return saved[0];
 }
 async function listRecipes(){
   const rows=await request('/rest/v1/'+TABLE+'?select=*&order=updated_at.desc&limit=3000');
   return (rows||[]).map(v=>({
     id:v.id,title:v.title,category:v.category,cardPath:v.card_path,
     heroPath:v.hero_path,processPath:v.process_path,mime:v.mime,
     originalName:v.original_name,createdAt:v.created_at,updatedAt:v.updated_at,
     readable:v.readable,studioData:v.studio_data,youtubeId:v.youtube_id||'',storage:'supabase'
   }));
 }
 async function listValues(prefix){
   const query=new URLSearchParams({select:'key,value',key:'like.'+String(prefix)+'*',limit:'3000'});
   const rows=await request('/rest/v1/'+KV+'?'+query.toString());
   return (rows||[]).map(r=>({key:r.key,value:r.value}));
 }
 async function getValue(key){
   const q=new URLSearchParams({select:'value',key:'eq.'+String(key),limit:'1'});
   const rows=await request('/rest/v1/'+KV+'?'+q.toString());
   return rows?.[0]?.value||null;
 }
 function canonical(value){
   if(Array.isArray(value))return value.map(canonical);
   if(value&&typeof value==='object'){
     const next={};for(const k of Object.keys(value).sort())next[k]=canonical(value[k]);return next;
   }
   return value;
 }
 async function putValue(key,value){
   const who=await user(),payload={key:String(key),value,household:HOUSE,
     updated_at:new Date().toISOString(),created_by:who.id};
   const result=await request('/rest/v1/'+KV+'?on_conflict=key',{method:'POST',
     headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'},
     body:JSON.stringify(payload)});
   if(!Array.isArray(result)||result[0]?.key!==key||JSON.stringify(canonical(result[0]?.value))!==JSON.stringify(canonical(value)))
     throw Error('Recept-beállítás visszaellenőrzése sikertelen.');
   return true;
 }
 async function deleteValue(key){
   const q=new URLSearchParams({key:'eq.'+String(key)});
   await request('/rest/v1/'+KV+'?'+q.toString(),{method:'DELETE'});
 }
 async function deleteRecipe(id){
   const q=new URLSearchParams({select:'card_path,hero_path,process_path',id:'eq.'+id});
   const rows=await request('/rest/v1/'+TABLE+'?'+q.toString()),item=rows?.[0];
   if(!item)return false;
   const match=new URLSearchParams({id:'eq.'+id});
   await request('/rest/v1/'+TABLE+'?'+match.toString(),{method:'DELETE'});
   const paths=[item.card_path,item.hero_path,item.process_path].filter(Boolean);
   if(paths.length){
     try{
       await request('/storage/v1/object/'+BUCKET,{method:'DELETE',
         headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:paths})});
     }catch(e){console.warn('Privát receptképek törlése később pótolható:',e)}
   }
   return true;
 }
 async function cookbookAi(payload){
   const token=await access();
   const res=await fetch(BASE+'/functions/v1/cookbook-ai-pilot-v1',{method:'POST',
    headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(70000)});
   const value=await res.json().catch(()=>({ok:false,error:'provider_unavailable'}));
   if(!res.ok||value?.ok!==true){
    const code=String(value?.error||'http_'+res.status).slice(0,120),e=Error(code+' (HTTP '+res.status+')');e.code=code;e.status=res.status;throw e;
   }
   return value;
 }
 w.HH_RECIPE_OWN_CLOUD_V1=Object.freeze({
   account,available,user,signIn,download,putRecipe,listRecipes,getValue,putValue,listValues,deleteValue,deleteRecipe,cookbookAi
 });
})(window);
