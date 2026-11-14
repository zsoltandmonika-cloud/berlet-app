/* SHO Smart Shopping · Store Connect v2.
   Stores are official site handoffs, NOT live merchant APIs.
   Product catalog is Open Food Facts via bounded read-only Edge Function.
   No product prices, inventory, payment or orders are invented. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const API="https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/sho-shopping-products-v1";
const MERCHANTS=[
 {name:"Tesco",domain:"bevasarlas.tesco.hu",url:"https://bevasarlas.tesco.hu/shop/hu-hu/",cats:["Élelmiszer","Drogéria & Szépség","Otthon & Háztartás"]},
 {name:"Auchan",domain:"auchan.hu",url:"https://auchan.hu/shop",cats:["Élelmiszer","Elektronika","Otthon & Háztartás","Drogéria & Szépség"]},
 {name:"Kifli",domain:"kifli.hu",url:"https://www.kifli.hu/",cats:["Élelmiszer","Drogéria & Szépség","Otthon & Háztartás"]},
 {name:"dm",domain:"dm.hu",url:"https://www.dm.hu/",cats:["Drogéria & Szépség","Otthon & Háztartás"]},
 {name:"Rossmann",domain:"shop.rossmann.hu",url:"https://shop.rossmann.hu/",cats:["Drogéria & Szépség","Otthon & Háztartás"]},
 {name:"eMAG",domain:"emag.hu",url:"https://www.emag.hu/",cats:["Elektronika","Otthon & Háztartás","Divat & Stílus"]},
 {name:"Alza",domain:"alza.hu",url:"https://www.alza.hu/",cats:["Elektronika","Otthon & Háztartás"]},
 {name:"Allegro",domain:"allegro.hu",url:"https://allegro.hu/",cats:["Elektronika","Divat & Stílus","Otthon & Háztartás"]},
 {name:"Temu",domain:"temu.com",url:"https://www.temu.com/",cats:["Divat & Stílus","Otthon & Háztartás"]},
 {name:"SHEIN",domain:"hu.shein.com",url:"https://hu.shein.com/",cats:["Divat & Stílus"]},
];
const state={category:"",query:"",products:[],busy:false,callToken:0,sort:"relevance",visible:6};
const SEARCH_CACHE_PREFIX="sho-shopping-off-catalog-v2:";
const MAX_CACHE_AGE=15*60*1000;
function feedback(msg){const out=$("shoConnectMessage");if(out)out.textContent=msg}
function make(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el}
function officialSearchUrl(store,term){
 const search="site:"+store.domain+" "+term;
 return "https://www.google.com/search?q="+encodeURIComponent(search);
}
function storesFor(category){
 if(!category||category==="Akciók & Árfigyelés")return MERCHANTS;
 return MERCHANTS.filter(s=>s.cats.includes(category));
}
function storeLogo(shop){
 const logo=make("span","sho-store-logo");
 const img=document.createElement("img");
 img.src="https://www.google.com/s2/favicons?domain="+encodeURIComponent(shop.domain)+"&sz=128";
 img.alt=shop.name+" arculati ikon";
 img.loading="lazy";img.referrerPolicy="no-referrer";
 img.addEventListener("error",()=>{logo.replaceChildren(make("strong",null,shop.name.slice(0,2)))});
 logo.append(img);
 return logo;
}
function paintStores(){
 const box=$("shoStoreGrid");if(!box)return;
 box.replaceChildren();
 for(const shop of storesFor(state.category)){
  const card=make("article","sho-store");
  const brand=make("a","sho-store-brand");
  brand.href=shop.url;brand.target="_blank";brand.rel="noopener noreferrer external";
  brand.title=shop.name+" hivatalos oldalának megnyitása";
  const mark=storeLogo(shop);
  const details=make("div","sho-store-top");
  details.append(make("strong",null,shop.name),make("span",null,"Hivatalos áruház"));
  brand.append(mark,details);
  const actions=make("div","sho-store-actions");
  const open=make("a","sho-store-open","Bolt megnyitása ↗");
  open.href=shop.url;open.target="_blank";open.rel="noopener noreferrer external";
  actions.append(open);
  if(state.query){
   const find=make("a","sho-store-find","Termék keresése ⌕");
   find.href=officialSearchUrl(shop,state.query);
   find.target="_blank";find.rel="noopener noreferrer external";
   find.title="Külső webkeresés a "+shop.name+" hivatalos oldalára szűkítve";
   actions.append(find);
  }
  card.append(brand,actions);box.append(card);
 }
 const header=$("shoStoreSummary");
 if(header)header.textContent=storesFor(state.category).length+" áruház · képes üzletkártyák · külső keresés és rendelés";
}
function sortedProducts(){
 const rows=state.products.slice();
 if(state.sort==="name")rows.sort((a,b)=>a.name.localeCompare(b.name,"hu"));
 if(state.sort==="popular"){
  const hasPopularity=rows.some(p=>Number(p.popularity)>0);
  const popularity=p=>hasPopularity?(Number(p.popularity)||0):(Number(p.scanCount)||0);
  rows.sort((a,b)=>popularity(b)-popularity(a));
 }
 return rows;
}
function paintSkeleton(){
 const box=$("shoProducts");if(!box)return;
 box.replaceChildren();
 for(let i=0;i<3;i++){
  const tile=make("div","sho-product sho-product-skeleton");
  tile.setAttribute("aria-hidden","true");
  tile.append(make("div","sho-skeleton-photo"),make("div","sho-skeleton-info"));
  box.append(tile);
 }
}
function paintProducts(){
 const box=$("shoProducts");if(!box)return;
 box.replaceChildren();
 const sorted=sortedProducts();
 const counter=$("shoCatalogCount");
 if(counter)counter.textContent=sorted.length?sorted.length+" termék":"Nincs találat";
 if(!sorted.length)return;
 for(const p of sorted.slice(0,state.visible)){
  const card=make("article","sho-product");
  const visual=make("a","sho-product-visual");
  visual.href=p.url;visual.target="_blank";visual.rel="noopener noreferrer external";
  visual.title="Eredeti termékadatlap megnyitása";
  if(p.image){
   const photo=document.createElement("img");
   photo.src=p.image;photo.alt=p.name+" eredeti termékfotó";photo.loading="lazy";photo.referrerPolicy="no-referrer";
   photo.addEventListener("error",()=>visual.replaceChildren(make("span","sho-no-photo","🛒 Kép nem elérhető")));
   visual.append(photo);
  }else visual.append(make("span","sho-no-photo","🛒 Kép nem elérhető"));
  const body=make("div","sho-product-body");
  const top=make("div","sho-product-label");
  top.append(make("span","sho-verified-dot","●"),make("span",null,"Valódi termékadat · Open Food Facts"));
  body.append(top,make("strong","sho-product-name",p.name));
  body.append(make("small","sho-product-brand",[p.brand,p.quantity].filter(Boolean).join(" · ")||"Nincs megadott kiszerelés"));
  body.append(make("small","sho-product-code","Vonalkód · "+p.code));
  const popularity=Number.isFinite(Number(p.popularity))&&Number(p.popularity)>0;
  if(popularity)body.append(make("small","sho-product-popularity","↗ OFF közösségi szkennelési népszerűség: "+Math.round(Number(p.popularity))));
  const price=make("div","sho-product-price");
  price.append(make("span",null,"BOLTI ÁR"),make("strong",null,"Még nincs hiteles ár"));
  body.append(price);
  const actions=make("div","sho-product-actions");
  const add=make("button","sho-product-add","＋ Smart Basket");
  add.type="button";add.dataset.addcatalog=p.code;
  const details=make("a","sho-product-link","Termékadatlap ↗");
  details.href=p.url;details.rel="noopener noreferrer external";details.target="_blank";
  actions.append(add,details);body.append(actions);
  const stores=make("div","sho-product-merchants");
  stores.append(make("span","sho-product-merchants-title","KERESÉS AZ ÁRUHÁZAKBAN"));
  const storeLinks=make("div","sho-product-merchant-links");
  for(const shop of MERCHANTS.filter(x=>x.cats.includes("Élelmiszer")).slice(0,3)){
   const link=make("a","sho-product-merchant",shop.name+" ↗");
   link.href=officialSearchUrl(shop,p.name+" "+(p.quantity||""));
   link.target="_blank";link.rel="noopener noreferrer external";
   link.title=shop.name+" webhelyére szűkített külső keresés, nem ellenőrzött készlet vagy ár";
   storeLinks.append(link);
  }
  stores.append(storeLinks);body.append(stores);
  card.append(visual,body);box.append(card);
 }
 if(sorted.length>state.visible){
  const more=make("button","sho-catalog-more","＋ További "+Math.min(6,sorted.length-state.visible)+" termék mutatása");
  more.type="button";more.dataset.showmore="1";box.append(more);
 }
}
function showPanel(){
 const panel=$("shoStoreConnect");if(panel)panel.scrollIntoView({behavior:"smooth",block:"start"});
}
function selectCategory(cat){
 state.category=cat||"";
 state.query=String($("searchInput")?.value||"").trim();
 paintStores();
 if(cat==="Élelmiszer")feedback("Élelmiszer termékek: írd be a nevet és nyomj Keresést. Az árakat később külön áruházaktól kell ellenőriznünk.");
 else if(cat==="Akciók & Árfigyelés")feedback("Az akciók és árak automatikus lekérése még nincs bekötve. A boltok hivatalos ajánlatait külön megnyithatod.");
 else feedback("Válassz áruházat, vagy keress terméket. Áruházi ár- és kosár-API még nincs összekötve.");
 showPanel();
}
function cacheRead(cacheKey){
 try{const x=JSON.parse(sessionStorage.getItem(SEARCH_CACHE_PREFIX+cacheKey)||"null");return x&&Date.now()-x.at<MAX_CACHE_AGE?x.result:null}catch(_){return null}
}
function cacheWrite(cacheKey,result){
 try{sessionStorage.setItem(SEARCH_CACHE_PREFIX+cacheKey,JSON.stringify({at:Date.now(),result}))}catch(_){}
}
function applyResult(data,term){
 if(!data||data.ok!==true||!Array.isArray(data.products))throw Error(data?.error||"Nem sikerült lekérni a katalógust");
 state.products=data.products.filter(x=>x&&/^[0-9]{8,14}$/.test(String(x.code))&&x.name).slice(0,12);
 state.visible=6;
 paintProducts();
 const status=$("shoCatalogStatus");
 if(status)status.textContent=state.products.length?
   state.products.length+" valódi katalógustalálat · Open Food Facts · bolti ár nélkül":
   "Nincs találat a termékkatalógusban. A bolti keresők továbbra is elérhetők.";
 feedback("Keresés: "+term+" · a találatok valódi termékadatok, nem bolti készlet- vagy árinformációk.");
}
async function search(term){
 const q=String(term||"").trim().slice(0,72);
 state.query=q;paintStores();showPanel();
 const status=$("shoCatalogStatus");
 if(!q){if(status)status.textContent="Írj be egy terméket a felső keresőbe.";state.products=[];paintProducts();return}
 if(state.category&&state.category!=="Élelmiszer"&&!/^[0-9]{8,14}$/.test(q)){
  state.products=[];paintProducts();
  if(status)status.textContent="Ebben a kategóriában a bolti webkeresés használható, közvetlen termék-API még nincs.";
  feedback("A "+state.category+" kategóriában válassz áruházat és nyisd meg a keresést.");
  return;
 }
 if(q.length<3&&(!/^[0-9]{8,14}$/.test(q))){
  if(status)status.textContent="Legalább 3 karakter szükséges.";return
 }
 if(state.busy){if(status)status.textContent="Egy keresés már folyamatban van.";return}
 const token=++state.callToken,barcode=/^[0-9]{8,14}$/.test(q);
 const cacheKey=(barcode?"ean:":"q:")+q.toLocaleLowerCase("hu-HU");
 const cached=cacheRead(cacheKey);
 if(cached){applyResult(cached,q);return}
 const key=window.HH_CENTRAL_VAULT?.publishableKey;
 if(!key){if(status)status.textContent="A termékkatalógus kapcsolat beállítása hiányzik.";return}
 state.busy=true;if(status)status.textContent="Valódi termékek lekérése…";paintSkeleton();
 try{
   const u=new URL(API);
   u.searchParams.set(barcode?"barcode":"q",q);
   const response=await fetch(u.href,{
     method:"GET",headers:{apikey:key,Accept:"application/json"},
     signal:AbortSignal.timeout(12000),cache:"no-store",credentials:"omit"
   });
   const data=await response.json().catch(()=>({error:"A szolgáltatás nem adott érvényes választ."}));
   if(token!==state.callToken)return;
   if(!response.ok)throw Error(data.error||"Termékadatbázis nem érhető el (HTTP "+response.status+").");
   cacheWrite(cacheKey,data);
   applyResult(data,q);
 }catch(e){
   if(token!==state.callToken)return;
   state.products=[];paintProducts();
   if(status)status.textContent="Nem sikerült betölteni: "+(e.message||"Hálózati hiba");
   feedback("A boltok külön megnyithatók. Nincs fiktív termék vagy ár a hiba helyén.");
 }finally{state.busy=false}
}
$("shoCatalogSort")?.addEventListener("change",e=>{
 const desired=String(e.target.value||"relevance");
 state.sort=["relevance","name","popular"].includes(desired)?desired:"relevance";
 if(desired==="popular"&&!state.products.some(p=>Number(p.popularity)>0||Number(p.scanCount)>0)){
   feedback("Ehhez a kereséshez még nincs Open Food Facts szkennelési népszerűségi adat. A találatok eredeti sorrendben maradnak.");
 }
 state.visible=6;paintProducts();
});
$("shoProducts")?.addEventListener("click",e=>{
 const more=e.target.closest("[data-showmore]");if(more){state.visible+=6;paintProducts();return}
 const button=e.target.closest("[data-addcatalog]");if(!button)return;
 const p=state.products.find(x=>x.code===button.dataset.addcatalog);
 if(!p)return;
 const api=window.SHOPPING_V1;
 if(!api||typeof api.addCatalogProduct!=="function"){feedback("A kosárkapcsolat még nem töltődött be.");return}
 if(api.addCatalogProduct(p)){button.textContent="✓ Kosárba mentve";try{navigator.vibrate?.(8)}catch(_){}}
});
$("shoStoreConnect")?.querySelector("[data-sho-connect-refresh]")?.addEventListener("click",()=>search($("searchInput")?.value||""));
window.SHOP_CONNECTORS_V2=Object.freeze({search,selectCategory,stores:MERCHANTS.map(x=>x.name)});
paintStores();
})();