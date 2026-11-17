/* SHO Basket Match V2.1 · real Open Food Facts product candidates.
 * Deliberately on-demand: underlying Edge function limits calls/minute.
 * OFF product identity/photo != Tesco/Auchan live store offer or price.
 * No merchant scraping, checkout/cart write, guessed price or fake match.
 */
(function(w,d){
 'use strict';
 const core=w.SHOP_PRODUCT_MATCH_CORE_V21;
 const stores=w.SHOP_THREE_STORE_LINKS_V2;
 const endpoint='https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/sho-shopping-products-v1';
 const cachePrefix='sho-product-match-v21:',cacheMs=10*60*1000;
 const maxCallsPerMinute=2,requestTimes=[];
 const mk=(tag,cls,value)=>{
  const el=d.createElement(tag);if(cls)el.className=cls;
  if(value!==undefined)el.textContent=String(value);
  return el;
 };
 function status(ui,msg){
  ui.status.hidden=false;ui.status.textContent=msg;
 }
 function cacheRead(query){
  try{
   const x=JSON.parse(w.sessionStorage.getItem(cachePrefix+query)||'null');
   return x&&Array.isArray(x.rows)&&Date.now()-x.at>=0&&Date.now()-x.at<cacheMs?x.rows:null;
  }catch(_){return null}
 }
 function cacheSave(query,rows){
  try{w.sessionStorage.setItem(cachePrefix+query,JSON.stringify({at:Date.now(),rows:rows.slice(0,30)}))}catch(_){}
 }
 function picture(p){
  const frame=mk('div','bc-photo');
  const fallback=()=>{
   frame.replaceChildren(mk('span','bc-placeholder','🛍️'));
   frame.append(mk('small',null,'Nincs katalógusfotó'));
  };
  if(!p.image){fallback();return frame}
  const img=mk('img');
  img.src=p.image;img.alt=p.name+' · Open Food Facts termékfotó';
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.addEventListener('error',fallback,{once:true});
  frame.append(img,mk('small','bc-photo-credit','Open Food Facts fotó'));
  return frame;
 }
 function link(label,href,cls){
  const a=mk('a',cls,label);
  a.href=href;
  a.target='_blank';a.rel='noopener noreferrer external';
  return a;
 }
 function paint(rows,item,ui){
  const ranked=core.rankProducts(item.name,rows);
  // Hide known wrong fat % / pack size. Review candidates must still share
  // substantive words with the user's requested item.
  const candidates=ranked.filter(p=>p.match.status==='likely'||
   p.match.status==='review'&&p.match.coverage>=0.35).slice(0,4);
  ui.cards.replaceChildren();
  if(!candidates.length){
   status(ui,'Nincs megfelelő vonalkódos termékjelölt. A Tesco és Auchan keresése változatlanul elérhető.');
   return 0;
  }
  for(const p of candidates){
   const card=mk('article','bc-product');
   card.dataset.match=p.match.status;
   card.append(picture(p));
   const info=mk('div','bc-body');
   info.append(mk('strong','bc-name',p.name));
   info.append(mk('small','bc-meta',[p.brand,p.quantity].filter(Boolean).join(' · ')||'A márka/kiszerelés ellenőrzendő'));
   const flag=mk('span','bc-match',
    p.match.status==='likely'?'✓ Jó termékjelölt':'? Ellenőrizendő jelölt');
   flag.dataset.match=p.match.status;
   info.append(flag);
   const actions=mk('div','bc-actions');
   // Tesco: original full-product search; Auchan: broader native search.
   const full=[p.name,p.brand,p.quantity].filter(Boolean).join(' ').slice(0,140);
   const urlTesco=stores.destination('tesco',full);
   const urlAuchan=stores.destination('auchan',p.name);
   if(urlTesco)actions.append(link('Tesco keresés ↗',urlTesco,'bc-tesco'));
   if(urlAuchan)actions.append(link('Auchan keresés ↗',urlAuchan,'bc-auchan'));
   actions.append(link('Vonalkódos adatlap ↗',p.offUrl,'bc-off'));
   info.append(actions);
   info.append(mk('small','bc-disclaimer',
    'Katalógusjelölt, nem bolti ajánlat. A kiszerelést, árat és elérhetőséget a webshopban ellenőrizd.'));
   card.append(info);
   ui.cards.append(card);
  }
  status(ui,'📸 '+candidates.length+' katalógusjelölt · Open Food Facts (ODbL), termékfotók CC BY-SA · nincs ellenőrzött bolti ár');
  return candidates.length;
 }
 async function show(item,ui){
  if(!ui?.cards||!ui.status||!ui.button||!core||!stores){
   if(ui?.status)status(ui,'A termékkatalógus nem érhető el. A bolti keresők változatlanul működnek.');
   return;
  }
  const term=String(item?.name||'').trim().slice(0,140);
  const q=core.searchTerms(term);
  if(q.length<3){status(ui,'Legalább három karakterből álló terméknév szükséges.');return}
  const cached=cacheRead(q);
  if(cached){paint(cached,{name:term},ui);return}
  const key=w.HH_CENTRAL_VAULT?.publishableKey;
  if(!key){status(ui,'A képes katalógus kapcsolat nincs beállítva. A bolti keresőlinkek használhatók.');return}
  const now=Date.now();
  while(requestTimes.length&&now-requestTimes[0]>=60000)requestTimes.shift();
  if(requestTimes.length>=maxCallsPerMinute){
   status(ui,'A képes katalógus lekérése korlátozott. Egy perc múlva új terméket is kereshetsz. A bolti keresők működnek.');
   return;
  }
  requestTimes.push(now);
  ui.button.disabled=true;
  status(ui,'📡 Katalógusfotók és vonalkódos termékadatok lekérése…');
  const controller=new AbortController(),timer=w.setTimeout(()=>controller.abort(),11000);
  try{
   const u=new URL(endpoint);
   u.searchParams.set(/^\d{8,14}$/.test(q)?'barcode':'q',q);
   const response=await w.fetch(u.href,{
    method:'GET',headers:{apikey:key,Accept:'application/json'},
    cache:'no-store',credentials:'omit',signal:controller.signal
   });
   const json=await response.json().catch(()=>null);
   if(!response.ok||json?.ok!==true||!Array.isArray(json.products))
    throw Error('A katalógusszolgáltatás most nem érhető el.');
   cacheSave(q,json.products);
   paint(json.products,{name:term},ui);
  }catch(_){
   status(ui,controller.signal.aborted?
    'A katalógus lekérése túllépte az időkorlátot. A bolti keresők tovább működnek.':
    'A katalógus nem elérhető. Nem jelenítünk meg becsült terméket vagy árat.');
  }finally{
   w.clearTimeout(timer);
   ui.button.disabled=false;
  }
 }
 w.SHOP_BASKET_CANDIDATES_V21=Object.freeze({show});
})(window,document);
