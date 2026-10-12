(function(){
'use strict';
/* I-07 v402 Contextual Reasoning. Read-only, cross-source links from the
 * existing patient-scoped ledger; co-occurrence is NOT cause or diagnosis.
 * Never fills gaps, infers drug interactions, or treats upload time as event time. */
function good(p){return p==='zsolt'||p==='monika'}
function ms(s){if(typeof s!=='string'||!s.includes('T'))return null;var n=Date.parse(s);return Number.isFinite(n)?n:null}
function mini(s,max){return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max||150)}
function sameTime(a,b){return ms(a)!=null&&ms(b)!=null&&Math.abs(ms(a)-ms(b))<=120*60000}
function prepare(request,context,clinical,opts){
 var p=request&&request.profile;
 if(!request||request.consent!==true||!good(p)||!context||context.profile!==p||!clinical||clinical.profile!==p)
  throw Error('I-07: nem azonosított, hozzájárulással rendelkező egészségügyi profil.');
 var engine=window.HH_INTELLIGENCE_LEDGER_V389;
 if(!engine||typeof engine.build!=='function')throw Error('I-07: az I-02 mérési napló nem érhető el.');
 var now=opts&&Number.isFinite(opts.now)?opts.now:Date.now(),ledger=engine.build(context,p,{now:now});
 var items=(ledger.observations||[]).filter(function(o){return o&&o.profile===p&&o.classification==='measured'&&ms(o.observedAt)!=null});
 var links=[],facts=[];
 function fact(label,value){facts.push({domain:'trends',label:mini(label,80),value:mini(value,230)})}
 // Use actual timestamped measurements, not estimates or day-granular
 // activity cache values. Pair BP systolic + diastolic only same source/time.
 var sys=items.filter(function(o){return o.type==='systolic_mmhg'});
 var dia=items.filter(function(o){return o.type==='diastolic_mmhg'});
 var pulse=items.filter(function(o){return o.type==='pulse_bpm'});
 for(var i=0;i<sys.length;i++){
  var a=sys[i],b=dia.find(function(x){return x.observedAt===a.observedAt&&x.sourceSystem===a.sourceSystem});
  if(!b)continue;
  var h=pulse.find(function(x){return sameTime(x.observedAt,a.observedAt)});
  if(!h)continue;
  var raw='Rögzített vérnyomás '+a.value+'/'+b.value+' Hgmm ('+a.observedAt+', '+a.sourceSystem+') és pulzus '+
   h.value+' /perc ('+h.observedAt+', '+h.sourceSystem+'). Két időbélyeges mérés legfeljebb 2 órán belül; nem bizonyít ok-okozatot vagy diagnózist.';
  links.push({kind:'temporally_close_vitals',sourceIds:[a.id,b.id,h.id],strength:'time_only'});
  fact('I-07 · Időben közeli mérések',raw);
  break;
 }
 var compares=(ledger.comparisons||[]).slice(0,2);
 compares.forEach(function(c){
  if(!c||!c.type||!c.day)return;
  links.push({kind:'source_disagreement',type:c.type,day:c.day,strength:'conflict'});
  fact('I-07 · Eltérő források',c.day+' · '+c.type+': '+c.sourceCount+' forrás eltérő értéket mutat. Ne válassz önkényesen egyetlen igaz adatot; további ellenőrzés indokolt.');
 });
 // Document date is provenance metadata; it is not proof that an event
 // occurred on that date. Never invent a clinical chronology from titles.
 var dated=(clinical.manifest||[]).filter(function(m){return m&&m.type==='original_pdf_extract'&&m.date&&m.datePrecision!=='unknown'});
 if(dated.length>=2){
  links.push({kind:'document_date_index',count:dated.length,strength:'document_dates_only'});
  fact('I-07 · Dokumentumidőrend',dated.slice(0,3).map(function(m){
   return mini(m.title,48)+' ('+mini(m.date,24)+', eredeti PDF '+m.page+'. oldal)';
  }).join('; ')+'. Ez dokumentumkeltezési sorrend, nem bizonyított klinikai eseménysor.');
 }
 var extra=Array.isArray(request.extra)?request.extra.slice():[],added=0;
 facts.slice(0,3).forEach(function(f){
  if(JSON.stringify({sources:request.sources,extra:[f].concat(extra)}).length<=16300){extra.unshift(f);added++}
 });
 var payload=Object.assign({},request,{extra:extra});
 return {payload:payload,links:links.slice(0,3),added:added,profile:p,quality:{sourceDisagreements:compares.length,
  measuredRows:items.length,proof:'recorded-data-only',causalInference:false}};
}
window.HH_CONTEXTUAL_REASONING_I07_V402={prepare:prepare,version:'402'};
})();
