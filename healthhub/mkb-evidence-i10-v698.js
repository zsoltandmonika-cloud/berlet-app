(function(root){
'use strict';
/* HealthHub v698 · Evidence Intelligence I-10.
 * Pure, deterministic QUESTION relevance, not medical reasoning. Inputs are
 * source-attested MKB excerpts selected via a user-visible one-shot consent.
 * No network, localStorage, document data mutation, or external AI requests.
 */
function norm(s){
 return String(s==null?'':s).toLocaleLowerCase('hu-HU')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
var stop=new Set(['hogy','milyen','miert','ezek','esetben','mikor','lehet','szeretnem','tudni',
 'kell','vagy','van','volt','vagyok','most','mar','nekem','ro lam','velem','mert',
 'hogyan','mennyi','ettol','szerint','egyre','nagyon','kicsit','olyan','tudom',
 'ezzel','ennek','ezt','azt','meg','nem','egy','aki','ami','igy','akkor']);
function tokens(s){return [...new Set(norm(s).split(' ').filter(x=>x.length>=3&&!stop.has(x)))].slice(0,25)}
// Linguistic expansion only. Topic association is NOT evidence of causation.
var vocabulary=[
 ['farad','faradt','faradtsag','faradek','kimerult','gyenges','energia','alvas','pihenes'],
 ['sziv','kardiolog','kamra','ejekcio','szivelegtelen','cardiomyopath','dilatat'],
 ['vernyomas','szisztol','diasztol','hgmm','pulzus','szivfrekv'],
 ['gyogyszer','kezeles','terapia','tabletta','adag','szed'],
 ['vesefunkcio','kreatinin','egfr','vese'],
 ['cukor','glukoz','diabetes','vercukor'],
 ['echo','echokardiografia','szivultrahang','ef','ejekcio'],
 ['entresto','sacubitril','valsartan'],
 ['forxiga','dapagliflozin'],
 ['inspra','eplerenon'],
 ['concor','bisoprolol']
];
function familyFor(queryWords){
 var related=new Set();
 for(const t of queryWords){
  for(const terms of vocabulary){
   if(terms.some(v=>t.startsWith(v)||v.startsWith(t)&&t.length>=4))
    terms.forEach(v=>related.add(v));
  }
 }
 return related;
}
function valueKey(row){
 var n=Number(row&&row.valueNumber);
 return row&&row.valueNumber!==null&&row.valueNumber!==undefined&&
  Number.isFinite(n)?n:null;
}
function warnings(rows){
 var grouped=new Map(),flags=new Set();
 for(const r of rows){
  var n=valueKey(r);
  if(n===null||!r.sourceId||!r.factType||!r.date||!r.originalUnit)continue;
  var key=[r.date,norm(r.factType),norm(r.title),norm(r.originalUnit)].join('|');
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(r);
 }
 for(const group of grouped.values()){
  var values=new Set(group.map(x=>valueKey(x))),sources=new Set(group.map(x=>x.sourceId));
  if(values.size<2||sources.size<2)continue;
  group.forEach(x=>flags.add(x.sourceId+'|'+x.date+'|'+x.title));
 }
 return flags;
}
function score(row,q,related){
 var title=norm(row.title),source=norm(row.source),quote=norm(row.quote),result=0;
 for(const t of q){
  if(title.includes(t))result+=8;
  else if(quote.includes(t))result+=4;
  else if(source.includes(t))result+=2;
 }
 if(related.size){
  var similar=0;
  for(const t of related){
   if(title.includes(t))similar=Math.max(similar,3);
   else if(quote.includes(t))similar=Math.max(similar,1);
  }
  result+=similar;
 }
 return result;
}
function rank(rows,question,opts){
 var max=Math.min(5,Math.max(1,Number(opts&&opts.max)||5));
 var q=tokens(question),related=familyFor(q);
 var valid=(Array.isArray(rows)?rows:[]).filter(x=>x&&
   typeof x.date==='string'&&typeof x.title==='string'&&
   typeof x.quote==='string'&&typeof x.sourceId==='string'&&
   ['pending','verified'].includes(x.review));
 var flagged=warnings(valid);
 var scored=valid.map((r,i)=>({
  item:Object.assign({},r,{
   relevanceScore:score(r,q,related),
   caution:flagged.has(r.sourceId+'|'+r.date+'|'+r.title)?
    'Azonos napon eltérő dokumentált számszerű értékek vannak; ismételt mérés is lehet. Nem dönthető el automatikusan.':''
  }),i
 }));
 scored.sort((a,b)=>b.item.relevanceScore-a.item.relevanceScore||
  b.item.date.localeCompare(a.item.date)||a.i-b.i);
 var top=scored.slice(0,max).map(x=>x.item);
 var scores=top.filter(x=>x.relevanceScore>0).length;
 return Object.freeze({selected:top,count:valid.length,relevant:scores,
  questionReady:q.length>0,conflictSignals:top.filter(x=>x.caution).length,
  mode:'read_only_relevance_not_diagnosis'});
}
var api=Object.freeze({rank,norm,tokens});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_EVIDENCE_I10_V698=api;
})(typeof window!=='undefined'?window:globalThis);
