/* SHO all-store Full Basket Match v2 · ALL active merchants for EVERY list item.
   Categories are informational, never a search exclusion. Routes != verified merchant hits.
   No live merchant price, result-count API, automatic order, or guessed SKU. */
(function(w,d){'use strict';
const FAMILY='zsolt-monika',LIST='hh_shopping_list_v1',LINKS='hh_shopping_merchant_links_v1',TESCO='hh_shopping_tesco_bridge_v1';
const reg=w.SHOP_STORE_REGISTRY_V1,cache=w.SHOP_LOCAL_FIRST_V1,search=w.SHOP_MERCHANT_SEARCH_V1,$=id=>d.getElementById(id);
let shops=reg?.current().filter(s=>s.enabled)||[],items=[],links=[],tesco=[],authenticated=false,userId='',source='loading',lastCache='',visible=50;
let merchantIndex=new Map(),tescoIndex=new Map();
function indexLinks(){
 merchantIndex=new Map(links.map(x=>[x.store_key+':'+x.source+':'+x.item_key,x.product_url]));
 tescoIndex=new Map(tesco.map(x=>[x.item_key,x.tesco_url]));
}
function node(tag,cls,value){const n=d.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n}
function msg(s){$('syncStatus').textContent=s}
// A merchant can sell items from outside its primary catalog category.
 // Without verified per-shop search results, a category must NEVER hide a merchant.
 // The only filter here is the user's explicit enabled/disabled store setting.
function eligible(item){return shops}
function exact(link,shop){
 if(!link)return '';
 try{const url=new URL(String(link));
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.href.length>1000)return '';
  const host=url.hostname.toLowerCase(),root=String(shop.domain).replace(/^www\./,'');
  return (host===root||host==='www.'+root||host===shop.domain)?url.href:'';
 }catch(_){return ''}
}
function saved(item,shop){
 const raw=shop.key==='tesco'?tescoIndex.get('shared:'+String(item.id)):merchantIndex.get(shop.key+':shared:'+String(item.id));
 return exact(raw,shop);
}
function routes(){return items.reduce((sum,item)=>sum+eligible(item).length,0)}
function counters(){
 $('productsCount').textContent=items.length;
 $('storesCount').textContent=shops.length;
 $('routesCount').textContent=routes();
 render();
}
async function getClient(){
 const cfg=w.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||!w.supabase?.createClient)throw Error('Felhőkapcsolat nincs beállítva.');
 const native=(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
 const db=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{
  storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:native?'pkce':'implicit'}});
 const auth=await db.auth.getUser();
 if(auth.error||!auth.data?.user)throw Error('Családi bejelentkezés szükséges.');
 const user=auth.data.user;
 const acl=await db.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
 if(acl.error||!(acl.data||[]).some(x=>x.profile_key==='zsolt'||x.profile_key==='monika'))throw Error('Nincs családi hozzáférési jogosultság.');
 return {db,user};
}
async function fetchEvery(db,table,cols){
 const result=[],size=250;
 for(let offset=0;offset<10000;offset+=size){
  const r=await db.from(table).select(cols).eq('household',FAMILY).order('created_at',{ascending:false}).range(offset,offset+size-1);
  if(r.error)throw r.error;
  const batch=r.data||[];result.push(...batch);if(batch.length<size)return result;
 }
 throw Error('A családi adatlista túl hosszú a biztonságos beolvasáshoz.');
}
async function localRead(uid){
 if(!cache)return;
 try{
  const result=await Promise.all([cache.read(uid,'list'),cache.read(uid,'links:all'),cache.read(uid,'links:tesco')]);
  const [a,b,c]=result;
  if(Array.isArray(a?.rows)){items=a.rows.filter(x=>x&&x.id&&x.name);source='cached';lastCache=a.syncedAt||''}
  if(Array.isArray(b?.rows))links=b.rows;
  if(Array.isArray(c?.rows))tesco=c.rows;
  indexLinks();
 }catch(_){}
 counters();
 if(source==='cached')msg('📱 Helyi kosármásolat · '+(lastCache?new Date(lastCache).toLocaleString('hu-HU'):'ismeretlen frissesség')+'. A bolti árakat nem ellenőriztük.');
}
async function refresh(){
 counters();
 if(!reg||!search){msg('A dinamikus áruházlista nem tölthető be.');return}
 try{
  const {db,user}=await getClient();
  authenticated=true;userId=user.id;
  await localRead(userId);
  const storePromise=reg.sync().then(x=>{shops=x.filter(s=>s.enabled);counters()}).catch(()=>{});
  try{
   const list=await fetchEvery(db,LIST,'id,name,quantity,unit,category,created_at');
   items=list;source='ready';if(cache)void cache.write(userId,'list',{rows:list});
   msg('☁️ Közös Smart List szinkronizálva · '+items.length+' aktív termék.');
  }catch(e){
   if(source==='cached')msg('📱 Helyi kosármásolatot használunk. Nincs új szinkron: '+String(e.message||e).slice(0,90));
   else msg('⚠️ A családi bevásárlólista nem érhető el: '+String(e.message||e).slice(0,90));
  }
  const results=await Promise.allSettled([
   fetchEvery(db,LINKS,'store_key,source,item_key,product_url,name_snapshot,created_at'),
   fetchEvery(db,TESCO,'source,item_key,tesco_url,created_at')
  ]);
  if(results[0].status==='fulfilled'){links=results[0].value;if(cache)void cache.write(userId,'links:all',{rows:links})}
  if(results[1].status==='fulfilled'){tesco=results[1].value;if(cache)void cache.write(userId,'links:tesco',{rows:tesco})}
  indexLinks();
  await storePromise;
  counters();
 }catch(e){
  authenticated=false;
  msg('🔒 A közös Smart Listhez családi bejelentkezés és kapcsolat szükséges: '+String(e.message||e).slice(0,90));
  counters();
 }
}
function render(){
 const box=$('results');box.replaceChildren();
 let allPairs=0,knownPairs=0;
 for(const item of items){for(const shop of eligible(item)){allPairs++;if(saved(item,shop))knownPairs++}}
 $('matchSummary').textContent=source==='loading'&&!items.length?'A közös bevásárlólista betöltése…':items.length+' termék × '+shops.length+' aktív áruház = '+allPairs+' lehetséges keresés. '+knownPairs+' családilag mentett terméklink (ellenőrizendő). A kategória nem zár ki boltot. Találat nélküli boltot csak ellenőrzött 0 találat alapján lehet automatikusan elrejteni; élő bolti találati adat még nincs bekötve.';
 for(const item of items.slice(0,visible)){
  const active=eligible(item),known=active.filter(shop=>saved(item,shop)).length;
  const detail=node('details','product'),summary=node('summary'),heading=node('span');
  heading.append(node('strong',null,item.name),node('small',null,(item.quantity||1)+' '+(item.unit||'db')+' · '+active.length+' aktív áruház · keresésre vár'));
  summary.append(heading,node('b',null,known+' mentett'));
  detail.append(summary);
  const list=node('div','shops');
  for(const shop of active){
   const row=node('div','shop'),label=node('div');
   label.append(node('strong',null,shop.name),node('small',null,search.native(shop.key)?'Bolti keresés · találatok még nem ellenőrzöttek':'Webkeresés · találatok még nem ellenőrzöttek'));
   // Make the entire retailer surface a real, keyboard-accessible link.
   // The saved SKU shortcut remains a separate sibling link, never a nested anchor.
   const action=node('a','shop-main');
   action.href=search.url(shop.key,shop,item.name);
   action.rel='noopener noreferrer external';action.target='_blank';
   action.title=shop.name+' · a termék keresési találatainak megnyitása';
   action.setAttribute('aria-label',shop.name+' · '+item.name+' keresési találatok megnyitása');
   action.append(label,node('span','shop-cta','🔎 Keresés'));
   row.append(action);list.append(row);
   const existing=saved(item,shop);
   if(existing){
    const direct=node('a','saved','🔗 Mentett');
    direct.href=existing;direct.rel='noopener noreferrer external';direct.target='_blank';
    direct.title='Felhasználó által korábban elmentett termékoldal; nem automatikusan ellenőrzött termékegyezés';
    row.append(direct);
   }
  }
  detail.append(list);box.append(detail);
 }
 if(items.length>visible){const more=node('button','more','＋ További '+Math.min(50,items.length-visible)+' termék');more.type='button';more.onclick=()=>{visible+=50;render()};box.append(more)}
}
// The matrix is the result screen; opening it is already the user action.
// No redundant second prepare click, and no extra network request.
void refresh();
})(window,document);