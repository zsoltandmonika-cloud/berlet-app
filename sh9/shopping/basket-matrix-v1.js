/* SHO all-store Full Basket Match v2 · ALL active merchants for EVERY list item.
   Categories are informational, never a search exclusion. Routes != verified merchant hits.
   No live merchant price, result-count API, automatic order, or guessed SKU. */
(function(w,d){'use strict';
const FAMILY='zsolt-monika',LIST='hh_shopping_list_v1',LINKS='hh_shopping_merchant_links_v1',TESCO='hh_shopping_tesco_bridge_v1';
const reg=w.SHOP_STORE_REGISTRY_V1,cache=w.SHOP_LOCAL_FIRST_V1,search=w.SHOP_MERCHANT_SEARCH_V1,preferred=w.SHOP_THREE_STORE_LINKS_V2,icons=w.SHOP_SMART_LIST_ICONS_V1,$=id=>d.getElementById(id);
let shops=reg?.current().filter(s=>s.enabled)||[],items=[],links=[],tesco=[],authenticated=false,userId='',source='loading',lastCache='',visible=24,mode='duo';
let merchantIndex=new Map(),tescoIndex=new Map();
function indexLinks(){
 merchantIndex=new Map(links.map(x=>[x.store_key+':'+x.source+':'+x.item_key,x.product_url]));
 tescoIndex=new Map(tesco.map(x=>[x.item_key,x.tesco_url]));
}
function node(tag,cls,value){const n=d.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n}
function msg(s){const el=$('syncStatus');el.textContent=s;el.hidden=!/^(⚠️|🔒)/.test(s)}
function visual(item){
 const box=node('span','product-icon'),cat=String(item.category||'');
 const fallback=()=>box.replaceChildren(node('span',null,icons?.forProduct(item.name,cat)||'🛒'));
 const raw=String(item.image_url||'').trim();
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.href.length>800)throw Error('Invalid product image');
  const img=node('img');img.src=u.href;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
  img.addEventListener('error',fallback,{once:true});
  box.append(img);
 }catch(_){fallback()}
 box.setAttribute('aria-hidden','true');return box;
}
// Counts must originate from a supported, fresh, merchant-specific result provider.
// No provider is connected yet; an unknown count is NOT zero and is never fabricated.
function verifiedCount(item,shop){
 const count=w.SHOP_VERIFIED_MERCHANT_COUNTS_V1?.get?.(String(item.id),shop.key);
 if(!count||count.status!=='verified'||count.source!=='merchant'||!Number.isInteger(count.total)||count.total<0||count.total>1000000)return null;
 const at=Date.parse(count.checkedAt||'');
 if(!Number.isFinite(at)||Date.now()-at<0||Date.now()-at>15*60*1000)return null;
 return count.total;
}
function merchantLogo(shop){
 // Match the full Shopping storefront: every enabled retailer gets its brand icon.
 // Unknown/custom shops use their official domain favicon, never an empty slot.
 const asset=w.SHOP_MERCHANT_BRAND_ICONS_V1?.byKey?.(shop.key,shop.domain);
 const img=node('img','shop-logo');
 img.src=asset?.url||'https://www.google.com/s2/favicons?domain='+encodeURIComponent(shop.domain)+'&sz=128';
 img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
 img.addEventListener('error',()=>{
  const initials=String(shop.name||shop.key||'Bolt').trim().slice(0,2).toLocaleUpperCase('hu-HU');
  img.replaceWith(node('span','shop-logo-fallback',initials));
 },{once:true});
 return img;
}
// A merchant can sell items from outside its primary catalog category.
 // Without verified per-shop search results, a category must NEVER hide a merchant.
 // The only filter here is the user's explicit enabled/disabled store setting.
function eligible(item){return mode==='all'?shops:shops.filter(shop=>shop.key==='tesco'||shop.key==='auchan')}
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
 $('storesCount').textContent=eligible().length;
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
async function fetchEvery(db,table,cols,activeOnly=false){
 const result=[],size=250;
 for(let offset=0;offset<10000;offset+=size){
  let q=db.from(table).select(cols).eq('household',FAMILY);
  if(activeOnly)q=q.eq('done',false);
  const r=await q.order('created_at',{ascending:false}).range(offset,offset+size-1);
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
  if(Array.isArray(a?.rows)){items=a.rows.filter(x=>x&&x.id&&x.name&&x.done!==true);source='cached';lastCache=a.syncedAt||''}
  if(Array.isArray(b?.rows))links=b.rows;
  if(Array.isArray(c?.rows))tesco=c.rows;
  indexLinks();
 }catch(_){}
 counters();
 if(source==='cached')msg('📱 Helyi kosármásolat · '+(lastCache?new Date(lastCache).toLocaleString('hu-HU'):'ismeretlen frissesség')+'. A bolti árakat nem ellenőriztük.');
}
async function refresh(){
 counters();
 if(!reg||!search){msg('⚠️ A dinamikus áruházlista nem tölthető be.');return}
 try{
  const {db,user}=await getClient();
  authenticated=true;userId=user.id;
  await localRead(userId);
  const storePromise=reg.sync().then(x=>{shops=x.filter(s=>s.enabled);counters()}).catch(()=>{});
  try{
   const list=await fetchEvery(db,LIST,'id,name,quantity,unit,category,image_url,created_at',true);
   items=list.filter(x=>x&&x.id&&x.name&&x.done!==true);source='ready';if(cache)void cache.write(userId,'list',{rows:list});
   msg('☁️ Közös Smart List szinkronizálva · '+items.length+' aktív termék.');
  }catch(e){
   if(source==='cached')msg('⚠️ Helyi kosármásolatot használunk. Nincs új szinkron: '+String(e.message||e).slice(0,90));
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
 if(!items.length){
  box.append(node('p','basket-empty',source==='loading'?'A közös Smart List betöltése…':
   source==='cached'?'A helyi másolatban nincs aktív bevásárolandó termék.':
   'A közös bevásárlólistában nincs aktív tétel. A megvásárolt termékek nem kerülnek a Kosár Matchbe.'));
  return;
 }
 for(const item of items.slice(0,visible)){
  const active=eligible(item).filter(shop=>verifiedCount(item,shop)!==0);
  const counts=active.map(shop=>verifiedCount(item,shop));
  const known=counts.every(n=>n!==null),total=known?counts.reduce((sum,n)=>sum+n,0):null;
  const detail=node('details','product'),summary=node('summary'),heading=node('span');
  detail.open=mode==='duo';
  heading.append(node('strong',null,item.name),node('small',null,(item.quantity||1)+' '+(item.unit||'db')+' · '+active.length+' bolti keresés'));
  const badge=node('b','match-hit-badge',total===null?'Keresés ↗':total.toLocaleString('hu-HU')+' ellenőrzött találat');
  if(total===null)badge.title='A boltok még nem adnak hiteles találatszámot. A keresési linkek működnek.';
  summary.append(visual(item),heading,badge);
  detail.append(summary);
  const list=node('div','shops');
  for(const shop of active){
   const row=node('div','shop'),label=node('div');
   const count=verifiedCount(item,shop);
   label.append(node('strong',null,shop.name));
   // Make the entire retailer surface a real, keyboard-accessible link.
   // The saved SKU shortcut remains a separate sibling link, never a nested anchor.
   const action=node('a','shop-main');
   action.href=(shop.key==='tesco'||shop.key==='auchan')&&preferred?.destination?.(shop.key,item.name)||search.url(shop.key,shop,item.name);
   action.rel='noopener noreferrer external';action.target='_blank';
   action.title=shop.name+' · a termék keresési találatainak megnyitása';
   action.setAttribute('aria-label',shop.name+' · '+item.name+' keresési találatok megnyitása');
   const logo=merchantLogo(shop);
   if(logo)action.append(logo);
   const cta=node('span','shop-cta'+(count===null?'':' count-known'),count===null?'🔎 Keresés':'🔎 '+count.toLocaleString('hu-HU')+' találat');
   if(count===null)cta.title='Hivatalos bolti keresés; a termék, a kiszerelés és az ár a webshopban ellenőrizendő.';
   action.append(label,cta);
   row.append(action);list.append(row);
   const existing=saved(item,shop);
   if(existing){
    const direct=node('a','saved','🔗 Mentett');
    direct.href=existing;direct.rel='noopener noreferrer external';direct.target='_blank';
    direct.title='Felhasználó által korábban elmentett termékoldal; nem automatikusan ellenőrzött termékegyezés';
    row.append(direct);
   }
  }
  // On demand only: the shared OFF metadata endpoint is rate-limited and
  // cannot responsibly be queried for every item on a 100+ product list.
  // No page-layout change to the already working Tesco/Auchan direct links.
  const candidateZone=node('section','basket-candidate-zone');
  const candidateButton=node('button','basket-candidate-show','📸 Képes termékjelöltek');
  candidateButton.type='button';
  candidateButton.title='Vonalkódos Open Food Facts termékjelöltek, nem bolti ajánlatok';
  const candidateStatus=node('p','basket-candidate-status');
  candidateStatus.hidden=true;candidateStatus.setAttribute('role','status');
  const candidateCards=node('div','basket-candidate-grid');
  candidateButton.onclick=()=>{
   const service=w.SHOP_BASKET_CANDIDATES_V21;
   if(service?.show)void service.show(item,{button:candidateButton,status:candidateStatus,cards:candidateCards});
   else{candidateStatus.hidden=false;candidateStatus.textContent='A képes katalógus nem töltődött be. A bolti keresőgombok továbbra is működnek.'}
  };
  candidateZone.append(candidateButton,candidateStatus,candidateCards);
  detail.append(list,candidateZone);box.append(detail);
 }
 if(items.length>visible){const more=node('button','more','＋ További '+Math.min(50,items.length-visible)+' termék');more.type='button';more.onclick=()=>{visible+=50;render()};box.append(more)}
}
function setMode(next){
 mode=next==='all'?'all':'duo';
 visible=24;
 const duo=$('focusDuo'),all=$('focusAll');
 duo?.setAttribute('aria-pressed',String(mode==='duo'));
 all?.setAttribute('aria-pressed',String(mode==='all'));
 duo?.classList.toggle('basket-mode-active',mode==='duo');
 all?.classList.toggle('basket-mode-active',mode==='all');
 const hint=$('basketModeCaption');
 if(hint)hint.textContent=mode==='duo'?
  'Tesco és Auchan · egy termék, két közvetlen bolti keresés. Mindkettő elsőre látható.':
  'Minden engedélyezett bolt · a termékeket nyisd meg a többi áruház keresőjéhez.';
 counters();
}
$('focusDuo')?.addEventListener('click',()=>setMode('duo'));
$('focusAll')?.addEventListener('click',()=>setMode('all'));
// The matrix is the result screen; opening it is already the user action.
// Neither storefront price feeds nor auto-cart APIs are connected.
setMode('duo');void refresh();
})(window,document);