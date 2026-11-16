/* SHO Store Registry v1 · canonical 12-store baseline + family RLS overrides.
   Offline/local cache is a disposable snapshot, not authority or an offers API. */
(function(w){'use strict';
const CACHE='sho-store-registry-v1',TABLE='hh_shopping_store_prefs_v1',FAMILY='zsolt-monika';
const CATS=['Élelmiszer','Elektronika','Divat & Stílus','Drogéria & Szépség','Otthon & Háztartás'];
const BASE=[
 ['tesco','Tesco','bevasarlas.tesco.hu','https://bevasarlas.tesco.hu/shop/hu-hu/',['Élelmiszer','Drogéria & Szépség','Otthon & Háztartás']],
 ['aldi','ALDI','shop.aldi.hu','https://shop.aldi.hu/kezdooldal',['Élelmiszer','Drogéria & Szépség','Otthon & Háztartás']],
 ['auchan','Auchan','auchan.hu','https://auchan.hu/shop',['Élelmiszer','Elektronika','Otthon & Háztartás','Drogéria & Szépség']],
 ['kifli','Kifli','kifli.hu','https://www.kifli.hu/',['Élelmiszer','Drogéria & Szépség','Otthon & Háztartás']],
 ['dm','dm','dm.hu','https://www.dm.hu/',['Drogéria & Szépség','Otthon & Háztartás']],
 ['rossmann','Rossmann','shop.rossmann.hu','https://shop.rossmann.hu/',['Drogéria & Szépség','Otthon & Háztartás']],
 ['emag','eMAG','emag.hu','https://www.emag.hu/',['Elektronika','Otthon & Háztartás','Divat & Stílus']],
 ['alza','Alza','alza.hu','https://www.alza.hu/',['Elektronika','Otthon & Háztartás']],
 ['allegro','Allegro','allegro.hu','https://allegro.hu/',['Elektronika','Divat & Stílus','Otthon & Háztartás']],
 ['temu','Temu','temu.com','https://www.temu.com/',['Divat & Stílus','Otthon & Háztartás']],
 ['shein','SHEIN','hu.shein.com','https://hu.shein.com/',['Divat & Stílus']],
 ['shoperia','Shoperia','shoperia.hu','https://shoperia.hu/',['Drogéria & Szépség','Otthon & Háztartás']]
].map(([key,name,domain,url,cats])=>Object.freeze({key,name,domain,url,cats:Object.freeze(cats),enabled:true,is_custom:false}));
const builtin=new Map(BASE.map(s=>[s.key,s]));
function normalized(row){
 if(!row||typeof row!=='object'||!/^[a-z0-9][a-z0-9-]{1,89}$/.test(String(row.store_key||'')))return null;
 const key=row.store_key,def=builtin.get(key);
 if(def)return {...def,enabled:row.enabled!==false};
 let url;
 try{
  url=new URL(String(row.store_url||''));
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.href.length>400||url.search||url.hash)return null;
  if(url.hostname.toLowerCase()!==row.domain)return null;
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(url.hostname)||/^(?:localhost|127\.|10\.|192\.168\.)/.test(url.hostname))return null;
 }catch(_){return null}
 const name=String(row.store_name||'').trim().slice(0,80);
 if(name.length<2)return null;
 const cats=[...new Set((Array.isArray(row.categories)?row.categories:[]).filter(x=>CATS.includes(x)))];
 if(!cats.length)return null;
 return {key,name,domain:url.hostname,url:url.href,cats,enabled:row.enabled!==false,is_custom:true};
}
function merged(rows){
 const map=new Map(BASE.map(s=>[s.key,{...s}]));
 for(const row of rows||[]){
  const shop=normalized(row);
  if(shop)map.set(shop.key,shop);
 }
 return [...map.values()];
}
function readSnapshot(){
 try{const x=JSON.parse(w.localStorage.getItem(CACHE)||'null');
 return x&&Array.isArray(x.rows)&&Number.isFinite(x.at)?x:null}catch(_){return null}
}
function current(){return merged(readSnapshot()?.rows||[])}
function saveSnapshot(rows){
 const clean=(rows||[]).filter(x=>normalized(x)).map(x=>({
  store_key:x.store_key,store_name:x.store_name,store_url:x.store_url,domain:x.domain,
  categories:x.categories,enabled:x.enabled,is_custom:x.is_custom
 }));
 try{w.localStorage.setItem(CACHE,JSON.stringify({rows:clean,at:Date.now()}))}catch(_){}
 return merged(clean);
}
let client;
function getClient(){
 const cfg=w.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||!w.supabase?.createClient)return null;
 if(!client)client=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{
  storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,
  detectSessionInUrl:true,flowType:(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'?'pkce':'implicit'}catch(_){return 'implicit'}})()
 }});
 return client;
}
async function identity(){
 const db=getClient();if(!db)throw Error('Felhőkapcsolat nincs beállítva.');
 const result=await db.auth.getUser();
 if(result.error||!result.data?.user)throw Error('Családi bejelentkezés szükséges.');
 const user=result.data.user;
 const acl=await db.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
 if(acl.error)throw acl.error;
 const roles=(acl.data||[]).map(r=>r.profile_key);
 const prefer=(()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}})();
 const profile=roles.includes(prefer)?prefer:roles.find(x=>x==='zsolt'||x==='monika');
 if(!profile)throw Error('A fióknak nincs családi jogosultsága.');
 return {db,user,profile};
}
async function sync(){
 const {db}=await identity();
 const r=await db.from(TABLE).select('store_key,store_name,store_url,domain,categories,enabled,is_custom').eq('household',FAMILY).order('created_at',{ascending:true}).limit(200);
 if(r.error)throw r.error;
 return saveSnapshot(r.data||[]);
}
async function save(row){
 const {db,user,profile}=await identity();
 const safe=normalized(row);
 if(!safe)throw Error('Hibás boltadat vagy webcím.');
 const data={household:FAMILY,store_key:safe.key,store_name:safe.name,store_url:safe.url,
  domain:safe.domain,categories:[...safe.cats],enabled:safe.enabled,is_custom:safe.is_custom,updated_by_profile:profile,updated_at:new Date().toISOString()};
 const previous=await db.from(TABLE).select('id').eq('household',FAMILY).eq('store_key',safe.key).maybeSingle();
 if(previous.error)throw previous.error;
 const result=previous.data?
  await db.from(TABLE).update(data).eq('id',previous.data.id).eq('household',FAMILY):
  await db.from(TABLE).insert({...data,created_by:user.id});
 if(result.error)throw result.error;
 return sync();
}
function fromInput(name,urlText,cats){
 let url;
 try{url=new URL(String(urlText||'').trim())}catch(_){throw Error('Érvényes https:// webáruház-cím szükséges.')}
 if(url.protocol!=='https:'||url.username||url.password||url.port)
  throw Error('Csak biztonságos HTTPS webáruház-cím használható.');
 // Pasted advertisement / tracking URLs are cleaned automatically.
 url.search='';url.hash='';
 const domain=url.hostname.toLowerCase();
 if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain))throw Error('Hibás domain.');
 const key='custom-'+domain.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,74);
 if(builtin.has(key))throw Error('Ez a bolt már alapból szerepel.');
 const row={store_key:key,store_name:String(name||'').trim(),store_url:url.href,domain,categories:cats,enabled:true,is_custom:true};
 if(!normalized(row))throw Error('Hibás boltnév, URL vagy kategória.');
 return row;
}
w.SHOP_STORE_REGISTRY_V1=Object.freeze({CATS:[...CATS],BASE,current,readSnapshot,sync,save,fromInput,normalized,merged});
})(window);
