/* SHO Smart Shopping · multi-store engine v1
  Eleven merchant-specific handoffs. The Tesco v3 Golden flow stays untouched.
  No merchant basket/price APIs. Family list is read-only; URLs are RLS-protected.
*/
(function(w,d){'use strict';
const $=id=>d.getElementById(id);
const FAMILY='zsolt-monika',LIST='hh_shopping_list_v1',LINKS='hh_shopping_merchant_links_v1';
const STORES={
 auchan:{name:'Auchan',domain:'auchan.hu',home:'https://auchan.hu/shop',group:'food'},
 aldi:{name:'ALDI',domain:'shop.aldi.hu',home:'https://shop.aldi.hu/kezdooldal',group:'food'},
 kifli:{name:'Kifli',domain:'kifli.hu',home:'https://www.kifli.hu/',group:'food'},
 dm:{name:'dm',domain:'dm.hu',home:'https://www.dm.hu/',group:'beauty'},
 rossmann:{name:'Rossmann',domain:'shop.rossmann.hu',home:'https://shop.rossmann.hu/',group:'beauty'},
 shoperia:{name:'Shoperia',domain:'shoperia.hu',home:'https://shoperia.hu/',group:'beauty'},
 emag:{name:'eMAG',domain:'emag.hu',home:'https://www.emag.hu/',group:'tech'},
 alza:{name:'Alza',domain:'alza.hu',home:'https://www.alza.hu/',group:'tech'},
 allegro:{name:'Allegro',domain:'allegro.hu',home:'https://allegro.hu/',group:'tech'},
 temu:{name:'Temu',domain:'temu.com',home:'https://www.temu.com/',group:'home'},
 shein:{name:'SHEIN',domain:'hu.shein.com',home:'https://hu.shein.com/',group:'fashion'}
};
const SAMPLES={
 food:[['🍌','Banán','1','kg'],['🥛','Tej 2,8%','2','l'],['☕','Szemes arabica kávé','1','kg'],['🍞','Kovászos kenyér','1','db'],['🥚','Tojás M','10','db'],['🍚','Jázmin rizs','1','kg'],['🧀','Trappista sajt','500','g'],['🍅','Koktélparadicsom','500','g'],['💧','Ásványvíz','2','l'],['🍝','Penne tészta','500','g']],
 beauty:[['🧴','Sampon','1','db'],['🫧','Tusfürdő','1','db'],['🦷','Fogkrém','1','db'],['🪥','Fogkefe','2','db'],['🧻','WC-papír','1','csomag'],['🧼','Folyékony szappan','1','db'],['🧺','Mosógél','1','db'],['🌸','Öblítő','1','db'],['🧽','Mosogatószer','1','db'],['🧴','Testápoló','1','db']],
 tech:[['📱','USB-C töltő','1','db'],['🔋','Powerbank','1','db'],['🎧','Bluetooth fülhallgató','1','db'],['💻','Laptop állvány','1','db'],['🖱️','Vezeték nélküli egér','1','db'],['⌨️','Billentyűzet','1','db'],['☕','Kávéfőző','1','db'],['🔌','Hosszabbító','1','db'],['💡','LED izzó','1','db'],['📦','SSD meghajtó','1','db']],
 home:[['💡','LED fényfüzér','1','db'],['🧺','Tárolókosár','1','db'],['🛋️','Díszpárna','1','db'],['🍽️','Konyhai rendező','1','db'],['🔌','USB-C kábel','1','db'],['📱','Telefonállvány','1','db'],['🪴','Virágtartó','1','db'],['🛁','Fürdőszobai polc','1','db'],['🪑','Székpárna','1','db'],['🧹','Takarítókefe','1','db']],
 fashion:[['👚','Női póló','1','db'],['👗','Ruha','1','db'],['👖','Farmernadrág','1','db'],['🧥','Kabát','1','db'],['👟','Sportcipő','1','pár'],['🧣','Sál','1','db'],['👜','Válltáska','1','db'],['👕','Férfi póló','1','db'],['🧦','Zokni','1','csomag'],['🧢','Sapka','1','db']]
};
const registry=w.SHOP_STORE_REGISTRY_V1;
for(const x of registry?.current()||[]){
 if(x.is_custom&&x.enabled)STORES[x.key]={name:x.name,domain:x.domain,home:x.url,group:'home',isCustom:true};
}
let key=new URL(w.location.href).searchParams.get('store')||'auchan';
if(!Object.prototype.hasOwnProperty.call(STORES,key)){
 const box=$('modeHelp');if(box)box.textContent='Ez a bolt még nincs betöltve. Lépj vissza a bevásárláshoz, és frissítsd a boltokat.';
 return;
}
const store=STORES[key],samples=SAMPLES[store.group].map(([icon,name,quantity,unit],i)=>({id:'demo-'+i,icon,name,quantity:Number(quantity),unit}));
const STATE_KEY='sho-merchant-shopping-v1:'+key;
const cfg=w.HH_CENTRAL_VAULT;
const cache=w.SHOP_LOCAL_FIRST_V1;
const nativeOAuth=(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
const api=cfg?.enabled&&w.supabase?.createClient?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:nativeOAuth?'pkce':'implicit'}}):null;
let user=null,profiles=[],rows=[],mapped=new Map(),mode='shared',cloudStatus='loading',cloudError='',cachedAt='',selected=null,showLink=false,loading=false,loadPending=false,channel=null,lastUpdate=0,visibleCount=40,lastRowTapKey='',lastRowTapAt=0;
function state(){try{const o=JSON.parse(w.sessionStorage.getItem(STATE_KEY)||'{}');return o&&typeof o==='object'?o:{}}catch(_){return {}}}
function put(o){try{w.sessionStorage.setItem(STATE_KEY,JSON.stringify(o))}catch(_){}}
function list(){return mode==='shared'?rows:samples}
function pkey(p){return String(p.id)}
function selectedState(){const all=list(),s=state(),idx=all.findIndex(p=>pkey(p)===(selected||s[mode]?.next));const i=idx>=0?idx:0;return {all,i,p:all[i]||null}}
function own(){return Boolean(api&&user&&profiles.some(x=>x==='zsolt'||x==='monika'))}
function profile(){let p='zsolt';try{p=w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){}return profiles.includes(p)?p:profiles[0]||'zsolt'}
function mk(tag,cls,text){const e=d.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e}
function msg(text){$('notice').textContent=text;$('notice').hidden=false}
function qty(p){return new Intl.NumberFormat('hu-HU',{maximumFractionDigits:2}).format(Number(p.quantity)||1)+' '+(p.unit||'db')}
function emoji(p){if(p.icon)return p.icon;const s=String(p.name).toLocaleLowerCase('hu-HU');if(/kávé/.test(s))return '☕';if(/tej|joghurt/.test(s))return '🥛';if(/banán/.test(s))return '🍌';if(/sampon|tusfürdő/.test(s))return '🧴';if(/telefon|kábel/.test(s))return '📱';if(/cipő/.test(s))return '👟';return '🛍️'}
function allowedUrl(text){
 try{const u=new URL(String(text||'').trim());if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>1000)return '';
  const host=u.hostname.toLowerCase();const ok=host===store.domain||host==='www.'+store.domain||(key==='temu'&&host==='www.temu.com');
  return ok?u.href:'';
 }catch(_){return ''}
}
// User-approved exact Auchan SKU matches; do not substitute named competing brands.
/* Native merchant result pages: never choose a product/price implicitly.
 * Search URLs are browser handoff routes, not merchant APIs.
 */
function normalizedProductName(text){
 return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/(\d),(\d)/g,'$1.$2').replace(/\s+/g,' ').trim();
}
function searchUrl(term){
 const q=String(term||'').trim().slice(0,160),encoded=encodeURIComponent(q);
 switch(key){
  case 'auchan':return 'https://auchan.hu/shop/search?q%5B%5D='+encodeURIComponent(encoded);
  case 'aldi':return 'https://www.google.com/search?q='+encodeURIComponent('site:shop.aldi.hu '+q); // Native search route not verified
  case 'kifli':return 'https://www.kifli.hu/kereses?q='+encoded+'&companyId=1';
  case 'dm':return 'https://www.dm.hu/search?query='+encoded+'&searchType=product';
  case 'rossmann':return 'https://shop.rossmann.hu/talalatok?q='+encoded;
  case 'emag':return 'https://www.emag.hu/search/'+encoded;
  case 'alza':return 'https://www.alza.hu/search.htm?exps='+encoded;
  case 'allegro':return 'https://allegro.hu/kereses?string='+encoded;
  case 'temu':return 'https://www.temu.com/hu/search_result.html?search_key='+encoded;
  case 'shein':return 'https://hu.shein.com/pdsearch/'+encoded+'/';
  case 'shoperia':return 'https://www.google.com/search?q='+encodeURIComponent('site:shoperia.hu '+q); // Native search route not verified
  default:return store.isCustom?'https://www.google.com/search?q='+encodeURIComponent('site:'+store.domain+' '+q):store.home;
 }
}
function directUrlFor(p){
 // Explicitly saved product URL is an optional shortcut, never default on double tap.
 const exact=allowedUrl(mapped.get(mode+':'+pkey(p))?.product_url);
 if(exact)return exact;
 // Exact-name family pairing survives new Smart List UUIDs, no guessed substitution.
 const name=normalizedProductName(p.name);
 for(const pair of mapped.values()){
  if(normalizedProductName(pair.name_snapshot)===name){
   const learned=allowedUrl(pair.product_url);
   if(learned)return learned;
  }
 }
 return '';
}
function linkFor(p){return searchUrl(p.name)}
function select(i){const p=list()[i];if(!p)return;lastRowTapKey='';lastRowTapAt=0;selected=pkey(p);showLink=false;render()}
function activateRow(i){
 const p=list()[i];if(!p)return;
 const k=mode+':'+pkey(p),now=Date.now();
 const doubleTap=lastRowTapKey===k&&now-lastRowTapAt>=0&&now-lastRowTapAt<=450;
 lastRowTapKey=k;lastRowTapAt=now;
 if(!doubleTap){selected=pkey(p);showLink=false;render();return}
 lastRowTapKey='';lastRowTapAt=0;
 selected=pkey(p);recordOpen();
 w.location.assign(linkFor(p)); // same-tab navigation from real user tap
}
function shift(delta){const a=selectedState();if(a.p)select((a.i+delta+a.all.length)%a.all.length)}
function recordOpen(){
 const a=selectedState();if(!a.p)return;
 const s=state(),v=s[mode]&&typeof s[mode]==='object'?s[mode]:{};
 v.next=pkey(a.all[(a.i+1)%a.all.length]);s[mode]=v;s.mode=mode;
 put(s);selected=null;
}
function draw(a){
 const box=$('items');box.replaceChildren();if(!a.all.length){
  const hint=mode==='shared'?(cloudStatus==='loading'?'☁️ A közös bevásárlólista betöltése…':cloudStatus==='auth'?'🔒 A közös listához jelentkezz be a családi fiókba.':cloudStatus==='error'?'⚠️ A családi felhőlista nem tölthető be. Próbáld újra az oldal frissítésével.':'A közös Smart Listben jelenleg nincs megvásárolandó termék.'):'Nincs mintatermék.';
  box.append(mk('p','empty',hint));return}
 const total=Math.min(a.all.length,Math.max(visibleCount,a.i+1));
 for(let i=0;i<total;i++){
  const p=a.all[i],row=mk('button','product'+(i===a.i?' chosen':''));row.type='button';row.onclick=()=>activateRow(i);
  row.setAttribute('aria-label','Termék: '+p.name+'. Egy koppintás kiválaszt, dupla koppintás az áruház keresési találatait nyitja meg.');
  row.title=(key==='shoperia'||key==='aldi'||store.isCustom)?'Dupla kattintás: boltra szűrt webkeresés':'Dupla kattintás: a bolt saját találati listája';
  const icon=mk('span','product-icon',emoji(p));const info=mk('span','product-info');info.append(mk('strong',null,p.name),mk('small',null,qty(p)));
  row.append(icon,info,mk('span','product-link',directUrlFor(p)?'🔗':'⌕'));box.append(row);
 }
 if(total<a.all.length){const more=mk('button','more','＋ További '+Math.min(40,a.all.length-total)+' termék · '+total+'/'+a.all.length);more.type='button';more.onclick=()=>{visibleCount=total+40;render()};box.append(more)}
}
function render(){
 $('storeTitle').textContent=store.name+' Smart Shopping';
 $('storeName').textContent=store.name;
 $('storeHome').href=store.home;
 // Store domain is displayed through the linked shop URL and dynamic search help.
 $('modeShared').setAttribute('aria-pressed',String(mode==='shared'));
 $('modeDemo').setAttribute('aria-pressed',String(mode==='demo'));
 $('sharedCount').textContent=rows.length+' aktív tétel';
 const a=selectedState();$('position').textContent=a.p?(a.i+1)+' / '+a.all.length:'0 / 0';
 $('icon').textContent=a.p?emoji(a.p):'🛒';
 $('itemName').textContent=a.p?a.p.name:'Nincs termék';
 $('itemQty').textContent=a.p?qty(a.p):'';
 const saved=a.p?directUrlFor(a.p):'';
 const go=$('go');go.href=a.p?linkFor(a.p):store.home;go.textContent=saved?'↗ Találatok · mentett külön':(key==='shoperia'||key==='aldi'||store.isCustom)?'↗ '+store.name+' webkeresés':'↗ Találatok a boltban';
 $('searchMethod').textContent=(key==='shoperia'||key==='aldi'||store.isCustom)?'🔎 '+store.name+' termékek · boltra szűrt webkeresés (a natív keresőútvonal még nem igazolt)':'🔎 '+store.name+' saját találati listája · termék kiválasztása a boltban';
  if($('searchCaption'))$('searchCaption').textContent=(key==='shoperia'||key==='aldi'||store.isCustom)?'👆 Dupla koppintás: boltra szűrt webes találatok; a konkrét terméket és ár szerinti rendezést az áruház oldalán választhatod.':'👆 Dupla koppintás: az összes megfelelő áruházi találat, nem egy előre kiválasztott termék. Az ár szerinti rendezést a bolt oldalán állíthatod.';
  if($('freeSearchHelp'))$('freeSearchHelp').textContent=(key==='shoperia'||key==='aldi'||store.isCustom)?store.domain+'-ra szűrt külső webkeresést nyitunk. A rendelés az áruház saját oldalán történik.':'A keresés a kiválasztott áruház saját webhelyének találati listáját nyitja meg. A rendezés és a kosárba helyezés a bolt oldalán történik, nem a SHO-ban.';
 $('prev').disabled=!a.p||a.all.length<2;$('next').disabled=!a.p||a.all.length<2;
 $('edit').disabled=!a.p;
 $('editor').hidden=!showLink||!a.p;
 $('linkInput').value=saved;
 $('auth').hidden=own();
 $('authMessage').textContent=user?'Ehhez a családi profilhoz nincs mentési jogosultság.':'A közös terméklink mentéséhez bejelentkezés szükséges.';
 $('modeHelp').textContent=mode!=='shared'?'✨ 10 példatermék · nincs Smart List-módosítás.':cloudStatus==='loading'?'☁️ A közös Smart List szinkronizálása…':cloudStatus==='cached'?'📱 Helyi lista · utolsó szinkron: '+(cachedAt?new Date(cachedAt).toLocaleString('hu-HU'):'ismeretlen')+' · nem élő áradat':cloudStatus==='auth'?'🔒 A közös bevásárlólistához családi bejelentkezés szükséges.':cloudStatus==='error'?'⚠️ Felhőhiba: '+cloudError:rows.length?'☁️ Teljes közös Smart List · '+rows.length+' aktív tétel.':'☁️ A közös Smart List jelenleg üres.';
 draw(a);
}
function setMode(next){mode=next;selected=null;showLink=false;visibleCount=40;const s=state();s.mode=mode;put(s);render()}
async function fetchAll(table,cols,active){
 const out=[],size=250;
 for(let offset=0;offset<10000;offset+=size){
  let q=api.from(table).select(cols).eq('household',FAMILY);
  if(table===LINKS)q=q.eq('store_key',key);
  if(active)q=q.eq('done',false);
  const r=await q.order('created_at',{ascending:false}).range(offset,offset+size-1);
  if(r.error)throw r.error;
  const page=r.data||[];out.push(...page);if(page.length<size)return out;
 }
 throw Error('A lista meghaladja a 10 000 tételt; a hiányos betöltés nem megengedett.');
}
async function loadCloud(){
 if(!own())return;
 if(loading){loadPending=true;return}
 loading=true;cloudStatus=rows.length?'cached':'loading';cloudError='';render();
 try{
  if(cache&&!rows.length){
   const local=await cache.read(user.id,'list');
   if(Array.isArray(local?.rows)){
    rows=local.rows.filter(x=>x&&x.id&&x.name);
    cachedAt=local.syncedAt||'';cloudStatus='cached';render();
   }
  }
  if(cache&&!mapped.size){
   const saved=await cache.read(user.id,'links:'+key);
   if(Array.isArray(saved?.rows))mapped=new Map(saved.rows.map(x=>[x.source+':'+x.item_key,x]));
  }
 }catch(_){}
 try{
  const listRows=await fetchAll(LIST,'id,name,quantity,unit,category,created_at',true);
  rows=listRows;cloudStatus='ready';cachedAt='';lastUpdate=Date.now();render();
  if(cache)void cache.write(user.id,'list',{rows:listRows});
  try{
   const links=await fetchAll(LINKS,'id,store_key,source,item_key,product_url,name_snapshot',false);
   mapped=new Map(links.map(x=>[x.source+':'+x.item_key,x]));
   if(cache)void cache.write(user.id,'links:'+key,{rows:links});
   render();
  }catch(_){msg('☁️ A lista betöltve, a mentett terméklinkek helyi másolatból érhetők el.')}
 }catch(e){
  if(rows.length||cloudStatus==='cached'){cloudStatus='cached';render();msg('📱 Helyi lista · friss szerveradat nem érhető el.')}
  else{cloudStatus='error';cloudError=String(e.message||e).slice(0,100);render();msg('Felhőlista nem elérhető: '+cloudError)}
 }finally{loading=false;if(loadPending){loadPending=false;void loadCloud()}}
}
async function save(){
 const a=selectedState();if(!a.p)return;
 if(!own()){msg('A közös mentéshez jelentkezz be.');return}
 const raw=$('linkInput').value.trim(),safe=raw?allowedUrl(raw):'';
 if(raw&&!safe){msg('Csak a '+store.name+' hivatalos HTTPS-terméklinkje menthető.');return}
 const id=mode+':'+pkey(a.p),previous=mapped.get(id);$('save').disabled=true;
 try{
  let q;if(previous){
   q=api.from(LINKS).update({product_url:safe,updated_by_profile:profile(),updated_at:new Date().toISOString()})
    .eq('id',previous.id).eq('household',FAMILY).eq('store_key',key).select('id,store_key,source,item_key,product_url,name_snapshot').single();
  }else{
   q=api.from(LINKS).insert({household:FAMILY,store_key:key,source:mode,item_key:pkey(a.p),
    name_snapshot:String(a.p.name).slice(0,180),product_url:safe,updated_by_profile:profile(),created_by:user.id})
    .select('id,store_key,source,item_key,product_url,name_snapshot').single();
  }
  const result=await q;if(result.error)throw result.error;mapped.set(id,result.data);showLink=false;render();
  msg(safe?'🔗 '+store.name+' terméklink mentve a családi felhőbe.':'A mentett terméklink törölve.');
 }catch(e){if(String(e.code||'')==='23505'){void loadCloud();msg('A másik eszköz már mentette. Frissítve, próbáld újra.')}else msg('Mentés sikertelen: '+String(e.message||e).slice(0,85))}
 finally{$('save').disabled=false}
}
function subscribe(){if(channel||!own())return;channel=api.channel('sho-store-links-'+key+'-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:LIST},()=>void loadCloud()).on('postgres_changes',{event:'*',schema:'public',table:LINKS},e=>{if(e.new?.store_key===key||e.old?.store_key===key)void loadCloud()}).subscribe()}
async function authSync(){
 if(!api){cloudStatus='error';cloudError='A családi felhőkapcsolat nem elérhető.';render();msg('Keresés elérhető, a felhőkapcsolat most nem működik.');return}
 try{
  const r=await api.auth.getUser();user=r.error?null:r.data?.user||null;profiles=[];
  if(user){const acl=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
   if(!acl.error)profiles=(acl.data||[]).map(x=>x.profile_key).filter(x=>x==='zsolt'||x==='monika')}
  if(own()){await loadCloud();subscribe()}else{cloudStatus='auth';rows=[];mapped.clear();if(channel){api.removeChannel(channel);channel=null}render()}
 }catch(e){cloudStatus='error';cloudError=String(e.message||e).slice(0,100);render();msg('Bejelentkezési hiba: '+cloudError)}
}
$('modeShared').onclick=()=>setMode('shared');
$('modeDemo').onclick=()=>setMode('demo');
$('prev').onclick=()=>shift(-1);$('next').onclick=()=>shift(1);
$('go').addEventListener('click',()=>{if(selectedState().p)recordOpen()});
$('edit').onclick=()=>{showLink=!showLink;render();if(showLink)$('linkInput').focus()};
$('editor').addEventListener('submit',e=>{e.preventDefault();void save()});
$('cancel').onclick=()=>{showLink=false;render()};
$('restart').onclick=()=>{const s=state();s[mode]={next:''};put(s);selected=null;visibleCount=40;render();msg('Az első termék következik.')};
$('fullSearch').addEventListener('submit',e=>{e.preventDefault();const v=$('freeQuery').value.trim();if(v.length<2)return;w.location.assign(searchUrl(v))});
$('signIn').onclick=async()=>{
 if(!api)return msg('Felhőkapcsolat nem elérhető.');
 try{
  if(nativeOAuth){const ok=await w.HH_ONE_NATIVE_AUTH_V1063?.start?.(api);if(!ok)throw Error('Natív belépés nem elérhető.');return}
  const r=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname+w.location.search}});
  if(r.error)throw r.error;
 }catch(e){msg('Belépés sikertelen: '+String(e.message||e).slice(0,90))}
};
w.addEventListener('pageshow',()=>{selected=null;render();if(own()&&Date.now()-lastUpdate>5*60*1000)void loadCloud()});
d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'&&own()&&Date.now()-lastUpdate>5*60*1000)void loadCloud()});
w.addEventListener('storage',e=>{if(e.key==='hh-guardian-family-auth-v785')void authSync()});
if(api)api.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN'||e==='SIGNED_OUT')setTimeout(()=>void authSync(),0)});
// Every Smart Shopping entry opens the real shared family list by default.
// Demo remains explicitly selectable, but cannot persist over a later store entry.
render();void authSync();
})(window,document);