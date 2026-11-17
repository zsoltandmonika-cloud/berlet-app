/* SHO Smart Product Match V2.1 · Open Food Facts metadata, NOT store offers.
 * Pure parser/ranker for product name, brand, volume, weight and percentage.
 * Never infer merchant price, stock, availability or shopping-cart state.
 */
(function(root){
 'use strict';
 const normalize=s=>String(s||'').toLocaleLowerCase('hu-HU').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().slice(0,180);
 const tokens=s=>[...new Set(normalize(s).split(/[^a-z0-9]+/g).filter(x=>x.length>1&&!/^\d+$/.test(x)))];
 const volume=s=>{
  const v=normalize(s).replace(/(\d)\s+(?=\d{3}\b)/g,'$1').match(/(?:^|[^a-z0-9])(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|liter|l)(?:$|[^a-z])/i);
  if(!v)return null;
  const n=Number(v[1].replace(',','.'));
  const unit=v[2]==='kg'||v[2]==='g'?'g':'ml';
  const amount=n*(v[2]==='kg'?1000:v[2]==='l'||v[2]==='liter'?1000:v[2]==='cl'?10:1);
  return Number.isFinite(amount)&&amount>0?{amount,unit}:null;
 };
 const percent=s=>{
  const m=normalize(s).match(/(\d+(?:[.,]\d+)?)\s*%/);
  return m?Number(m[1].replace(',','.')):null;
 };
 const validProduct=p=>{
  if(!p||!/^\d{8,14}$/.test(String(p.code||''))||!String(p.name||'').trim())return null;
  const code=String(p.code);
  let image='';
  try{
   const url=new URL(String(p.image||''));
   if(url.protocol==='https:'&&/^(images|static)\.openfoodfacts\.org$/.test(url.hostname)
       &&!url.username&&!url.password&&url.port==='')image=url.href;
  }catch(_){}
  return {code,name:String(p.name).trim().slice(0,160),
   brand:String(p.brand||'').trim().slice(0,110),
   quantity:String(p.quantity||'').trim().slice(0,60),image,
   offUrl:'https://world.openfoodfacts.org/product/'+code};
 };
 function examine(query,p){
  const q=tokens(query),searchText=[p.name,p.brand,p.quantity].filter(Boolean).join(' ');
  const found=tokens(searchText);
  const shared=q.filter(x=>found.includes(x)).length;
  const coverage=q.length?shared/q.length:0;
  const askedVolume=volume(query),gotVolume=volume(searchText);
  const askedPercent=percent(query),gotPercent=percent(searchText);
  const quantityMismatch=Boolean(askedVolume&&gotVolume&&
   (askedVolume.unit!==gotVolume.unit||Math.abs(askedVolume.amount-gotVolume.amount)>0.001));
  const percentMismatch=askedPercent!==null&&gotPercent!==null&&askedPercent!==gotPercent;
  const quantityMatches=Boolean(askedVolume&&gotVolume&&!quantityMismatch);
  const percentMatches=askedPercent===null||(gotPercent!==null&&!percentMismatch);
  let status='review',label='Ellenőrizendő találat';
  if(quantityMismatch||percentMismatch){status='mismatch';label='Eltérő kiszerelés / összetétel'}
  else if(coverage>=0.65&&(!askedVolume||quantityMatches)&&percentMatches){
   status='likely';label='Jó termékjelölt';
  }
  return {status,label,coverage,quantityMatches,quantityMismatch,percentMismatch,
   rank:(status==='likely'?200:status==='review'?100:0)+coverage*80+(quantityMatches?15:0)};
 }
 function rankProducts(input,products){
  const uniq=new Set(),rows=[];
  for(const raw of Array.isArray(products)?products.slice(0,30):[]){
   const p=validProduct(raw);
   if(!p||uniq.has(p.code))continue;
   uniq.add(p.code);
   rows.push({...p,match:examine(input,p)});
  }
  return rows.sort((a,b)=>b.match.rank-a.match.rank||a.name.localeCompare(b.name,'hu-HU')).slice(0,12);
 }
 function searchTerms(input){
  const raw=normalize(input);
  // OFF is a public product metadata catalog, not merchant search.
  // One concise query avoids 4-query/min accountless edge-function throttling.
  return raw.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|liter|l)\b/g,' ')
   .replace(/\b\d+(?:[.,]\d+)?\s*%/g,' ')
   .replace(/\s+/g,' ').trim().slice(0,72);
 }
 const api=Object.freeze({normalize,tokens,volume,percent,validProduct,examine,rankProducts,searchTerms});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SHOP_PRODUCT_MATCH_CORE_V21=api;
})(typeof window!=='undefined'?window:null);
