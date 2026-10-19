(function(root){
'use strict';
/* HealthHub MKB → Ask Léna v677. Pure, tightly bounded transfer formatter.
 * The ONLY caller must first consume the one-shot MKB UI checkbox grant.
 * Facts are secondary PENDING-review observations even with correct SHA.
 * This module makes no requests and never persists/infers health records.
 */
function clean(v,n){return String(v==null?'':v).replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,n)}
function validDay(s){
 if(typeof s!=='string'||!/^20\d{2}-\d\d-\d\d$/.test(s))return false;
 var dt=Date.parse(s+'T12:00:00Z');
 return Number.isFinite(dt)&&new Date(dt).toISOString().slice(0,10)===s&&dt<=Date.now()+86400000;
}
function pack(input,profile,granted,question){
 if(!input||input.schema!=='healthhub.ask-lena/1'||input.consent!==true||
  !['monika','zsolt'].includes(profile)||input.profile!==profile||
  typeof question!=='string'||question.trim().length<3||
  !Array.isArray(input.extra)||!Array.isArray(input.sources))
  throw Error('I-09: hiányzik az engedélyezett és egyező profilú AI-kérés.');
 if(!Array.isArray(granted)||!granted.length)
  return {payload:input,added:0,limited:false};
 var items=[],seen=new Set();
 for(const row of granted.slice(0,5)){
  if(!row||!validDay(row.date)||!row.title||!row.quote||
   !Number.isInteger(Number(row.page))||Number(row.page)<1||
   !['pending','verified'].includes(row.review))continue;
  var title=clean(row.title,55),source=clean(row.source||'Eredeti PDF',45),
   quote=clean(row.quote,105);
  if(title.length<3||quote.length<12)continue;
  var key=row.date+'|'+title+'|'+source+'|'+row.page;
  if(seen.has(key))continue;seen.add(key);
  var status=row.review==='verified'?'ellenőrzött státusz':'szakmai ellenőrzésre vár';
  var header=row.date+' · '+title+' · '+status+' · PDF '+source+
   ' · '+row.page+'. oldal · rövid forrásrészlet: «';
  var remaining=235-header.length-1;
  if(remaining<16)continue;
  var value=header+quote.slice(0,remaining)+'»';
  var item={
   domain:'documents',
   label:'I-09 · Orvosi forrástény (PDF-eredet, nem önálló diagnózis)',
   value:value,at:row.date
  };
  if(item.value.length<35)continue;
  items.push(item);
 }
 if(!items.length)return {payload:input,added:0,limited:true};
 // Preserve the client's existing clinical sources but cap total request
 // and the server's 72-extra-item budget. No hidden downsampling or partial
 // disclosure: either all validated granted entries fit or none are added.
 var original=input.extra.slice();
 if(original.length+items.length>72)
  return {payload:input,added:0,limited:true};
 var next=Object.assign({},input,{extra:items.concat(original)});
 if(JSON.stringify({sources:next.sources,extra:next.extra}).length>17500)
  return {payload:input,added:0,limited:true};
 return {payload:next,added:items.length,limited:false};
}
var api=Object.freeze({pack,validDay});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_AI_CONTEXT_V677=api;
})(typeof window!=='undefined'?window:globalThis);
