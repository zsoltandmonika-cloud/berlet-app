/* HealthHub Nutrition v1161: deterministic, cost-free diary portion scaling.
 * Always recompute from the original entry snapshot to prevent rounding drift.
 * Unknown nutrients stay unknown, never silently become zero.
 */
(function(root){
'use strict';
const MAX_PORTION=50000;
const round=(x,places=2)=>Math.round((x+Number.EPSILON)*10**places)/10**places;
function positive(value){
 const num=Number(value);
 return Number.isFinite(num)&&num>0&&num<=MAX_PORTION?num:null;
}
function infer(entry){
 // The editor works ONLY with physical weight/volume. Never mistake
 // "1 adag", "2 darab" or a recipe count for 1/2 grams.
 const kind=entry?.kind==='drink'?'drink':'food';
 const own=positive(entry?.quantity);
 const raw=String(entry?.unit||'').trim().toLocaleLowerCase('hu');
 const grams=raw==='g'||raw==='gram'||raw==='gramm'?1:raw==='dkg'?10:raw==='kg'?1000:0;
 const ml=raw==='ml'?1:raw==='dl'?100:raw==='l'||raw==='liter'?1000:0;
 if(own!=null){
  if(grams)return {amount:own*grams,unit:'g',source:'stored-weight'};
  if(ml)return {amount:own*ml,unit:'ml',source:'stored-volume'};
  const named=raw.match(/\((\d+(?:[.,]\d+)?)\s*ml\)/i);
  if(named&&kind==='drink'){
   const size=positive(named[1].replace(',','.'));
   if(size)return {amount:own*size,unit:'ml',source:'stored-vessel'};
  }
 }
 const volume=positive(entry?.volumeMl);
 if(volume!=null)return {amount:volume,unit:'ml',source:'volume'};
 const label=String(entry?.quantityText||'');
 const match=label.match(/(\d+(?:[.,]\d+)?)\s*(kg|dkg|g|liter|dl|ml)\b/i);
 if(match){
  const n=positive(match[1].replace(',','.')),unit=match[2].toLocaleLowerCase('hu');
  const multiplier=unit==='kg'?1000:unit==='dkg'?10:unit==='dl'?100:unit==='liter'?1000:1;
  if(n!=null&&n*multiplier<=MAX_PORTION)
   return {amount:n*multiplier,unit:['liter','dl','ml'].includes(unit)?'ml':'g',source:'label'};
 }
 return {amount:null,unit:kind==='drink'?'ml':'g',source:'unknown-weight'};
}
function scale(nutrients,originalAmount,newAmount){
 const from=positive(originalAmount),to=positive(newAmount);
 if(from==null||to==null)throw Error('A mennyiségnek 0-nál nagyobbnak kell lennie, legfeljebb 50 000 lehet.');
 const ratio=to/from;
 const result={};
 for(const [key,value] of Object.entries(nutrients||{})){
  if(value==null||value===''){result[key]=null;continue}
  const num=Number(value);
  if(!Number.isFinite(num)||num<0)throw Error('Érvénytelen eredeti tápérték: '+key);
  const calc=round(num*ratio,3);
  if(!Number.isFinite(calc)||calc<0)throw Error('A tápérték átskálázása sikertelen.');
  result[key]=calc;
 }
 return result;
}
function validation(amount,unit,finishedWeightGrams){
 const q=positive(amount);
 if(q==null)throw Error('Adj meg 0-nál nagyobb mennyiséget, legfeljebb 50 000 egységet.');
 if(unit==='g'&&Number.isFinite(Number(finishedWeightGrams))&&Number(finishedWeightGrams)>0&&q>Number(finishedWeightGrams))
  throw Error('A megadott adag nagyobb az egész elkészült recept tömegénél.');
 return q;
}
root.HH_NUTRITION_DIARY_SCALE_V1161=Object.freeze({version:1161,infer,scale,validation,positive});
})(typeof window!=='undefined'?window:globalThis);
