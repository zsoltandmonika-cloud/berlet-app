/* SHO Smart Product Match V2.1
 * Reuses active read-only OFF Edge Function; no merchant data feed.
 * Product cards contain catalog photos and official result-page handoffs.
 * No SKU assumption, no fabricated live prices, and no cart operations.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id);
 const core=w.SHOP_PRODUCT_MATCH_CORE_V21,stores=w.SHOP_THREE_STORE_LINKS_V2,
  bridge=w.SHOP_THREE_STORE_BRIDGE_V2;
 const box=$('productMatchCards'),status=$('matchStatus'),counter=$('matchCount');
 if(!core||!stores||!bridge||!box||!status||!counter)return;
 const endpoint='https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/sho-shopping-products-v1';
 const cachePrefix='sho-product-match-v21:',cacheAgeMs=10*60*1000;
 let productRows=[],currentTerm='',token=0,controller=null,sort='relevance';
 let timer=null;
 const queries=[];
 const mk=(tag,cls,value)=>{
  const x=d.createElement(tag);if(cls)x.className=cls;
  if(value!==undefined)x.textContent=String(value);
  return x;
 };
 const feedback=(value)=>{status.textContent=value};
 function cacheRead(query){
  try{
   const saved=JSON.parse(w.sessionStorage.getItem(cachePrefix+query)||'null');
   return saved&&Array.isArray(saved.rows)&&Date.now()-saved.at<cacheAgeMs?saved.rows:null;
  }catch(_){return null}
 }
 function cacheSave(query,rows){
  try{w.sessionStorage.setItem(cachePrefix+query,JSON.stringify({at:Date.now(),rows}))}catch(_){}
 }
 function clearRequest(){
  token++;
  if(timer!==null){w.clearTimeout(timer);timer=null}
  if(controller){controller.abort();controller=null}
 }
 function picture(p){
  const frame=mk('div','pm-media');
  function unavailable(){
   frame.replaceChildren(mk('span','pm-placeholder','🛍️'));
   frame.append(mk('span','pm-source','OFF · nincs fotó'));
  }
  if(!p.image){unavailable();return frame}
  const img=mk('img');img.src=p.image;
  img.alt=p.name+' · Open Food Facts termékfotó';
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.addEventListener('error',unavailable,{once:true});
  frame.append(img,mk('span','pm-source','Fotó · Open Food Facts'));
  return frame;
 }
 function sortedRows(){
  const copy=productRows.slice();
  if(sort==='name')copy.sort((a,b)=>a.name.localeCompare(b.name,'hu-HU'));
  else if(sort==='quantity')copy.sort((a,b)=>
   Number(b.match.quantityMatches)-Number(a.match.quantityMatches)||
   b.match.rank-a.match.rank);
  return copy;
 }
 function paint(){
  box.replaceChildren();
  const rows=sortedRows();
  counter.textContent=rows.length?rows.length+' termékjelölt':'OFF katalógus';
  if(!rows.length)return;
  for(const p of rows){
   const card=mk('article','pm-card');card.dataset.match=p.match.status;
   card.append(picture(p));
   const body=mk('div','pm-body');
   body.append(mk('strong','pm-name',p.name));
   body.append(mk('small','pm-info',[p.brand,p.quantity].filter(Boolean).join(' · ')||'Márka/kiszerelés nincs megadva'));
   const badge=mk('span','pm-match',
    (p.match.status==='likely'?'✓ ':p.match.status==='mismatch'?'⚠️ ':'🔎 ')+p.match.label);
   badge.dataset.match=p.match.status;
   body.append(badge);
   const price=mk('div','pm-no-price');
   price.append(mk('small',null,'TESCO / AUCHAN ÁR'),mk('strong',null,'Nincs ellenőrzött bolti ár'));
   body.append(price);
   const actions=mk('div','pm-actions');
   const full=[p.name,p.brand,p.quantity].filter(Boolean).join(' ').slice(0,140);
   for(const [key,label] of [['tesco','Tesco találatok ↗'],['auchan','Auchan találatok ↗'],['spar','SPAR / Wolt webes találatok ↗']]){
    const a=mk('a',key==='spar'?'pm-spar-link':null,label);
    // Tesco's existing successful exact search stays unchanged.
    // Auchan: avoid concatenated OFF brand and quantity over-filtering.
    // SPAR: Wolt venue pages are indexed via clearly labeled Google search.
    const wanted=key==='tesco'?full:p.name;
    a.href=stores.destination(key,wanted);
    a.target='_blank';a.rel='noopener noreferrer external';
    a.setAttribute('aria-label',key==='spar'?
     'SPAR termékoldalak keresése Google-ban, a Wolt SPAR-oldalaira szűrve':
     p.name+' keresése a '+key+' hivatalos találati listájában');
    actions.append(a);
   }
   const off=mk('a','pm-off-link','Open Food Facts adatlap ↗');
   off.href=p.offUrl;off.target='_blank';off.rel='noopener noreferrer external';
   off.title='Eredeti, vonalkódos Open Food Facts termékadatlap; nem áruházi ajánlat';
   actions.append(off);
   body.append(actions);
   body.append(mk('small','pm-action-help',
    p.match.status==='mismatch'?'⚠️ Nem azonos kiszerelés/összetétel. A boltnál külön ellenőrizd.':
    'Tesco/Auchan: bolti kereső. SPAR: Wolt-oldalakra szűrt külső webkeresés. Kiszerelés, ár és kosár ellenőrizendő.'));
   card.append(body);box.append(card);
  }
 }
 function message(text){
  box.replaceChildren(mk('div','pm-loading',text));
  counter.textContent='OFF katalógus';
 }
 function apply(rows,term){
  productRows=core.rankProducts(term,rows);
  paint();
  if(!productRows.length){
   message('A termékkatalógusban nincs ellenőrizhető jelölt. A Tesco és Auchan hivatalos keresése továbbra is működik.');
  }
  feedback(productRows.length?
   '📸 '+productRows.length+' termékjelölt az Open Food Facts adatbázisából · bolti ár és készlet nélkül':
   'Nincs megfelelő Open Food Facts termékadat. A bolti keresés változatlanul elérhető.');
 }
 async function search(input){
  const term=stores.normalizeQuery(input),query=core.searchTerms(term);
  if(term===currentTerm&&productRows.length)return;
  currentTerm=term;clearRequest();productRows=[];
  if(query.length<3){
   feedback('Írj be legalább három karaktert, vagy válassz terméket a Smart Listből.');
   message('A képes termékkatalógus keresésre kész.');return;
  }
  const cached=cacheRead(query);
  if(cached){apply(cached,term);return}
  const key=w.HH_CENTRAL_VAULT?.publishableKey;
  if(!key){
   feedback('⚠️ A termékkatalógus kapcsolat nincs beállítva. A bolti keresők ettől függetlenül működnek.');
   message('Nincs hitelesíthető katalóguskapcsolat.');return;
  }
  const now=Date.now();
  while(queries.length&&now-queries[0]>60000)queries.shift();
  if(queries.length>=3){
   feedback('⏳ A katalógus lekérési korlátja miatt most a Tesco/Auchan keresőit használd. A katalógus később frissíthető.');
   message('A katalóguskeresés átmenetileg korlátozott.');return;
  }
  queries.push(now);
  feedback('📡 Open Food Facts termékfotók és kiszerelések keresése…');
  message('🔎 Valódi termékadatok betöltése…');
  const id=token;
  const abort=new AbortController();controller=abort;
  const timeout=w.setTimeout(()=>abort.abort(),11000);
  try{
   const u=new URL(endpoint),barcode=/^\d{8,14}$/.test(query);
   u.searchParams.set(barcode?'barcode':'q',query);
   const response=await w.fetch(u.href,{
    method:'GET',headers:{apikey:key,Accept:'application/json'},
    signal:abort.signal,cache:'no-store',credentials:'omit'
   });
   const payload=await response.json().catch(()=>({ok:false,error:'A termékszolgáltatás hibás választ adott.'}));
   if(token!==id)return;
   if(!response.ok||payload.ok!==true||!Array.isArray(payload.products))
    throw Error(String(payload.error||'A termékkatalógus nem érhető el.').slice(0,120));
   cacheSave(query,payload.products);
   apply(payload.products,term);
  }catch(e){
   if(token!==id)return;
   feedback('⚠️ '+(abort.signal.aborted?'A katalógus lekérése túllépte az időkorlátot.':String(e.message||e))+
    ' · A hivatalos bolti keresés működik.');
   message('Nem jelenítünk meg becsült vagy kitalált termékeket.');
  }finally{
   w.clearTimeout(timeout);
   if(controller===abort)controller=null;
  }
 }
 function schedule(){
  const term=bridge.getCurrent()?.term||'';
  if(term===currentTerm&&productRows.length)return;
  clearRequest();
  timer=w.setTimeout(()=>{timer=null;void search(term)},320);
 }
 $('searchForm').addEventListener('submit',schedule);
 $('familyItems').addEventListener('click',event=>{
  if(event.target.closest?.('[data-item]'))schedule();
 });
 $('matchSort').addEventListener('change',event=>{
  sort=['relevance','name','quantity'].includes(event.target.value)?event.target.value:'relevance';
  paint();
 });
 void search(bridge.getCurrent()?.term||'');
 w.SHOP_PRODUCT_MATCH_V21=Object.freeze({refresh:()=>schedule(),getState:()=>({
  term:currentTerm,count:productRows.length,source:'Open Food Facts',merchantPrices:false
 })});
})(window,document);
