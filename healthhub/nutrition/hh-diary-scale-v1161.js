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
 const own=positive(entry?.quantity);
 if(own!=null){
  const unit=String(entry.unit||'g').trim().slice(0,40)||'g';
  return {amount:own,unit,source:'stored'};
 }
 const volume=positive(entry?.volumeMl);
 if(volume!=null)return {amount:volume,unit:'ml',source:'volume'};
 const text=String(entry?.quantityText||'');
 const match=text.match(/(\d+(?:[.,]\d+)?)\s*(g|ml|dkg|kg)\b/i);
 if(match){
  const val=positive(match[1].replace(',','.'));
  if(val!=null)return {amount:val,unit:match[2].toLowerCase(),source:'label'};
 }
 const servings=text.match(/(\d+(?:[.,]\d+)?)\s*(?:adag|porció|db)\b/i);
 if(servings){
  const count=positive(servings[1].replace(',','.'));
  if(count!=null)return {amount:count,unit:'adag',source:'serving'};
 }
 return {amount:1,unit:'adag',source:'fallback'};
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
