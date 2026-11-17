/* SHO Smart Shopping · 3-store Bridge V2.
 * Read-only shared family list, no fabricated merchant catalog/prices,
 * no automatic store cart mutation. Search links use official endpoints.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id),FAMILY='zsolt-monika',TABLE='hh_shopping_list_v1';
 const links=w.SHOP_THREE_STORE_LINKS_V2;
 if(!links||!$('storeResults')||!$('searchForm'))return;
 const cfg=w.HH_CENTRAL_VAULT,itemsHost=$('familyItems'),status=$('cloudStatus');
 const nativeOAuth=(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
 const db=cfg?.enabled&&cfg.supabaseUrl&&cfg.publishableKey&&w.supabase?.createClient?
  w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
   auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,
    autoRefreshToken:true,detectSessionInUrl:true,flowType:nativeOAuth?'pkce':'implicit'}
  }):null;
 const params=new URLSearchParams(w.location.search);
 let term=links.normalizeQuery(params.get('q')),selectedId=String(params.get('item')||''),
  all=[],limit=40,busy=false,lastSync=0,loggedIn=false;
 const node=(tag,cls,txt)=>{
  const e=d.createElement(tag);if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=String(txt);
  return e;
 };
 const quantity=p=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:2}).format(Number(p.quantity)||1)+' '+(p.unit||'db');
 function updateUrl(){
  const u=new URL(w.location.href);
  if(term.length>=2)u.searchParams.set('q',term);else u.searchParams.delete('q');
  if(selectedId)u.searchParams.set('item',selectedId);else u.searchParams.delete('item');
  w.history.replaceState(w.history.state,'',u.pathname+u.search+u.hash);
 }
 function renderStores(){
  const host=$('storeResults');host.replaceChildren();
  const ready=term.length>=2;
  $('selection').textContent=ready?'🔎 '+term+' · teljes találati listák, nincs automatikus árválasztás':
   'Írj be egy terméket, vagy válassz a közös Smart Listből.';
  for(const merchant of links.stores){
   const card=node('article','merchant'+(!ready?' waiting':''));card.dataset.shop=merchant.key;
   const logo=node('span','logo',merchant.key==='tesco'?'T':merchant.key==='auchan'?'A':'S');
   logo.setAttribute('aria-hidden','true');
   const info=node('div','info');info.append(node('strong',null,merchant.name));
   info.append(node('small',null,merchant.note));
   if(merchant.key==='spar'){
    const venue=node('a','merchant-venue','🏬 SPAR üzletek a Wolton ↗');
    venue.href=links.SPAR_URL;venue.target='_blank';venue.rel='noopener noreferrer external';
    venue.title='Hivatalos Wolt SPAR áruházválasztó · nem terméktalálati lista';
    venue.setAttribute('aria-label',venue.title);
    info.append(venue);
   }
   const href=links.destination(merchant.key,term);
   const action=node('a','merchant-link',merchant.key==='spar'?'Webes találatok ↗':'Találatok ↗');
   action.href=href||'#';action.target='_blank';action.rel='noopener noreferrer external';
   action.title=merchant.key==='spar'?
    'Google webes keresés: kizárólag Wolt SPAR termékoldalak · nem élő SPAR kereső':
    merchant.name+' keresési találati listája · termék és kiszerelés ellenőrizendő: '+term;
   action.setAttribute('aria-label',action.title);
   if(!href){action.setAttribute('aria-disabled','true');action.tabIndex=-1}
   action.addEventListener('click',()=>{try{w.navigator.vibrate?.(7)}catch(_){}});
   card.append(logo,info,action);host.append(card);
  }
 }
 function renderList(){
  itemsHost.replaceChildren();
  if(!all.length){
   const text=!loggedIn?'A családi lista csak bejelentkezve érhető el. A fenti kézi áruházi keresés ettől függetlenül működik.':
    'A közös listában nincs még megvásárolandó termék.';
   itemsHost.append(node('p','empty',text));$('moreItems').hidden=true;return;
  }
  const visible=all.slice(0,limit);
  for(const item of visible){
   const btn=node('button','family-item'+(item.id===selectedId?' selected':''));
   btn.type='button';btn.dataset.item=item.id;
   const text=node('span','text');
   text.append(node('strong',null,item.name),node('small',null,quantity(item)+' · a közös Smart Listből'));
   const mark=node('span','end',item.id===selectedId?'✓':'⌕');
   mark.setAttribute('aria-hidden','true');
   btn.append(text,mark);
   btn.setAttribute('aria-label',item.name+' keresése a három áruházban');
   btn.addEventListener('click',()=>{
    selectedId=item.id;term=links.normalizeQuery(item.name);
    $('searchInput').value=term;updateUrl();renderStores();renderList();
    $('resultTitle').scrollIntoView?.({behavior:'smooth',block:'start'});
    try{w.navigator.vibrate?.(9)}catch(_){}
   });
   itemsHost.append(btn);
  }
  const more=$('moreItems');
  more.hidden=visible.length>=all.length;
  if(!more.hidden)more.textContent='＋ További '+Math.min(40,all.length-visible.length)+' termék · '+visible.length+'/'+all.length;
 }
 async function readAll(){
  if(!db)throw Error('A családi felhőkapcsolat nem elérhető.');
  const auth=await db.auth.getUser();
  if(auth.error||!auth.data?.user)throw Error('Családi bejelentkezés szükséges.');
  const acl=await db.from('hh_profile_access').select('profile_key').eq('user_id',auth.data.user.id);
  if(acl.error)throw acl.error;
  if(!(acl.data||[]).some(x=>x.profile_key==='zsolt'||x.profile_key==='monika'))
   throw Error('Nincs jogosultság a családi Smart Listhez.');
  loggedIn=true;
  const result=[],batch=250;
  for(let offset=0;offset<10000;offset+=batch){
   const r=await db.from(TABLE).select('id,name,quantity,unit,created_at')
    .eq('household',FAMILY).eq('done',false).order('created_at',{ascending:false})
    .range(offset,offset+batch-1);
   if(r.error)throw r.error;
   const rows=r.data||[];
   result.push(...rows.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.name.trim()));
   if(rows.length<batch)return result;
  }
  throw Error('A lista meghaladja a 10 000 tételt; nem mutatunk hiányos adatot.');
 }
 async function refreshList(){
  if(busy)return;
  busy=true;$('reloadList').disabled=true;
  status.textContent='☁️ Közös lista frissítése…';
  try{
   const fresh=await readAll();all=fresh;lastSync=Date.now();
   status.textContent='✓ '+all.length+' aktív termék · élő családi adatbázisból frissítve · csak olvasás';
   if(selectedId&&!all.some(x=>x.id===selectedId))selectedId='';
   renderList();
  }catch(e){
   // Never replace family data with fictional demo items or a different profile's cache.
   loggedIn=false;all=[];renderList();
   status.textContent='⚠️ '+String(e.message||e).slice(0,155)+' A kézi bolti keresés működik.';
  }finally{busy=false;$('reloadList').disabled=false}
 }
 $('searchForm').addEventListener('submit',event=>{
  event.preventDefault();const next=links.normalizeQuery($('searchInput').value);
  if(next.length<2){$('selection').textContent='Legalább két karaktert írj be.';$('searchInput').focus();return}
  term=next;selectedId='';updateUrl();renderStores();renderList();
 });
 $('moreItems').addEventListener('click',()=>{limit+=40;renderList()});
 $('reloadList').addEventListener('click',()=>void refreshList());
 w.addEventListener('pageshow',event=>{
  // Returning from the merchant page preserves selected product, no auto-cart claims.
  if(event.persisted&&Date.now()-lastSync>5*60*1000)void refreshList();
 });
 $('searchInput').value=term;renderStores();renderList();void refreshList();
 w.SHOP_THREE_STORE_BRIDGE_V2=Object.freeze({getCurrent:()=>({term,selectedId,loaded:all.length,readOnly:true})});
})(window,document);
