/* SHO Smart Shopping · multi-store engine v1
  Nine merchant-specific handoffs. The Tesco v3 Golden flow stays untouched.
  No merchant basket/price APIs. Family list is read-only; URLs are RLS-protected.
*/
(function(w,d){'use strict';
const $=id=>d.getElementById(id);
const FAMILY='zsolt-monika',LIST='hh_shopping_list_v1',LINKS='hh_shopping_merchant_links_v1';
const STORES={
 auchan:{name:'Auchan',domain:'auchan.hu',home:'https://auchan.hu/shop',group:'food'},
 kifli:{name:'Kifli',domain:'kifli.hu',home:'https://www.kifli.hu/',group:'food'},
 dm:{name:'dm',domain:'dm.hu',home:'https://www.dm.hu/',group:'beauty'},
 rossmann:{name:'Rossmann',domain:'shop.rossmann.hu',home:'https://shop.rossmann.hu/',group:'beauty'},
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
let key=new URL(w.location.href).searchParams.get('store')||'auchan';
if(!Object.prototype.hasOwnProperty.call(STORES,key))key='auchan';
const store=STORES[key],samples=SAMPLES[store.group].map(([icon,name,quantity,unit],i)=>({id:'demo-'+i,icon,name,quantity:Number(quantity),unit}));
const STATE_KEY='sho-merchant-shopping-v1:'+key;
const cfg=w.HH_CENTRAL_VAULT;
const nativeOAuth=(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
const api=cfg?.enabled&&w.supabase?.createClient?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:nativeOAuth?'pkce':'implicit'}}):null;
let user=null,profiles=[],rows=[],mapped=new Map(),mode='demo',modeTouched=false,selected=null,showLink=false,loading=false,loadPending=false,channel=null,lastUpdate=0,visibleCount=40,lastRowTapKey='',lastRowTapAt=0;
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
  case 'kifli':return 'https://www.kifli.hu/kereses?q='+encoded+'&companyId=1';
  case 'dm':return 'https://www.dm.hu/search?query='+encoded+'&searchType=product';
  case 'rossmann':return 'https://shop.rossmann.hu/talalatok?q='+encoded;
  case 'emag':return 'https://www.emag.hu/search/'+encoded;
  case 'alza':return 'https://www.alza.hu/search.htm?exps='+encoded;
  case 'allegro':return 'https://allegro.hu/kereses?string='+encoded;
  case 'temu':return 'https://www.temu.com/hu/search_result.html?search_key='+encoded;
  case 'shein':return 'https://hu.shein.com/pdsearch/'+encoded+'/';
  default:return store.home;
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
 const box=$('items');box.replaceChildren();if(!a.all.length){box.append(mk('p','empty','A közös Smart List jelenleg üres vagy nem elérhető.'));return}
 const total=Math.min(a.all.length,Math.max(visibleCount,a.i+1));
 for(let i=0;i<total;i++){
  const p=a.all[i],row=mk('button','product'+(i===a.i?' chosen':''));row.type='button';row.onclick=()=>activateRow(i);
  row.setAttribute('aria-label','Termék: '+p.name+'. Egy koppintás kiválaszt, dupla koppintás az áruház keresési találatait nyitja meg.');
  row.title='Dupla kattintás: a bolt saját találati listája';
  const icon=mk('span','product-icon',emoji(p));const info=mk('span','product-info');info.append(mk('strong',null,p.name),mk('small',null,qty(p)));
  row.append(icon,info,mk('span','product-link',directUrlFor(p)?'🔗':'⌕'));box.append(row);
 }
 if(total<a.all.length){const more=mk('button','more','＋ További '+Math.min(40,a.all.length-total)+' termék · '+total+'/'+a.all.length);more.type='button';more.onclick=()=>{visibleCount=total+40;render()};box.append(more)}
}
function render(){
 $('storeTitle').textContent=store.name+' Smart Shopping';
 $('storeName').textContent=store.name;
 $('storeHome').href=store.home;
 $('storeDomain').textContent=store.domain;
 $('modeShared').setAttribute('aria-pressed',String(mode==='shared'));
 $('modeDemo').setAttribute('aria-pressed',String(mode==='demo'));
 $('sharedCount').textContent=rows.length+' aktív tétel';
 const a=selectedState();$('position').textContent=a.p?(a.i+1)+' / '+a.all.length:'0 / 0';
 $('icon').textContent=a.p?emoji(a.p):'🛒';
 $('itemName').textContent=a.p?a.p.name:'Nincs termék';
 $('itemQty').textContent=a.p?qty(a.p):'';
 const saved=a.p?directUrlFor(a.p):'';
 const go=$('go');go.href=a.p?(saved||linkFor(a.p)):store.home;go.textContent=saved?'↗ Mentett termék · külön':'↗ Találatok a boltban';
 $('searchMethod').textContent='🔎 '+store.name+' saját találati listája · termék kiválasztása a boltban';
 $('prev').disabled=!a.p||a.all.length<2;$('next').disabled=!a.p||a.all.length<2;
 $('edit').disabled=!a.p;
 $('editor').hidden=!showLink||!a.p;
 $('linkInput').value=saved;
 $('auth').hidden=own();
 $('authMessage').textContent=user?'Ehhez a családi profilhoz nincs mentési jogosultság.':'A közös terméklink mentéséhez bejelentkezés szükséges.';
 $('modeHelp').textContent=mode==='shared'?'☁️ Teljes közös Smart List · '+rows.length+' aktív tétel.':'✨ 10 példatermék · nincs Smart List-módosítás.';
 draw(a);
}
function setMode(next){mode=next;modeTouched=true;selected=null;showLink=false;visibleCount=40;const s=state();s.mode=mode;put(s);render()}
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
 if(!own())return;if(loading){loadPending=true;return}loading=true;
 try{
  const [listRows,links]=await Promise.all([
   fetchAll(LIST,'id,name,quantity,unit,category,created_at',true),
   fetchAll(LINKS,'id,store_key,source,item_key,product_url,name_snapshot',false)
  ]);
  rows=listRows;mapped=new Map(links.map(x=>[x.source+':'+x.item_key,x]));
  if(!modeTouched&&!state().mode&&rows.length)mode='shared';
  lastUpdate=Date.now();render();
 }catch(e){msg('Felhőadat nem elérhető: '+String(e.message||e).slice(0,110))}
 finally{loading=false;if(loadPending){loadPending=false;void loadCloud()}}
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
 if(!api){render();msg('Keresés elérhető, a felhőkapcsolat most nem működik.');return}
 try{
  const r=await api.auth.getUser();user=r.error?null:r.data?.user||null;profiles=[];
  if(user){const acl=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
   if(!acl.error)profiles=(acl.data||[]).map(x=>x.profile_key).filter(x=>x==='zsolt'||x==='monika')}
  if(own()){await loadCloud();subscribe()}else{rows=[];mapped.clear();if(channel){api.removeChannel(channel);channel=null}render()}
 }catch(e){msg('Bejelentkezési hiba: '+String(e.message||e).slice(0,100))}
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
w.addEventListener('pageshow',()=>{selected=null;render();if(own()&&Date.now()-lastUpdate>5000)void loadCloud()});
d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'&&own()&&Date.now()-lastUpdate>5000)void loadCloud()});
w.addEventListener('storage',e=>{if(e.key==='hh-guardian-family-auth-v785')void authSync()});
if(api)api.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN'||e==='SIGNED_OUT')setTimeout(()=>void authSync(),0)});
const previousMode=state().mode;if(previousMode==='demo'||previousMode==='shared'){mode=previousMode;modeTouched=true}
render();void authSync();
})(window,document);