(function(){
'use strict';
/* HealthHub Clinical Intelligence I-04 / v391
 * Consent-bound evidence provenance for the existing Ask Lena request.
 * Never creates a diagnosis or a drug interaction claim. Never fetches,
 * stores or modifies source health records, and never sends new source text.
 * Original PDF excerpts are handled only by the separately authorized v364
 * retriever. This module validates and labels that retriever's result.
 */
var VERSION='391',MAX_DOCS=16,MAX_FUTURE=300000;
function str(v,n){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n||120)}
function isProfile(p){return p==='zsolt'||p==='monika'}
function validCalendarDate(raw){
 if(typeof raw!=='string'||!/^(19|20)\d{2}-\d{2}-\d{2}$/.test(raw))return false;
 var ms=Date.parse(raw+'T12:00:00Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===raw;
}
function parseDocDate(raw,precision){
 var date=str(raw,35),precisionValue=['minute','day','month','year','unknown'].includes(precision)?precision:'unknown';
 if(!date)return {date:'',precision:'unknown',valid:false};
 if(precisionValue==='minute'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(date)){
  var t=Date.parse(date),calendarOk=validCalendarDate(date.slice(0,10));
  var valueOk=calendarOk&&Number.isFinite(t)&&/^\d{2}:[0-5]\d/.test(date.slice(11));
  return {date:valueOk?date:'',precision:valueOk?'minute':'unknown',valid:valueOk};
 }
 if(validCalendarDate(date))return {date:date,precision:'day',valid:true};
 if(precisionValue==='month'&&/^(19|20)\d{2}-\d{2}$/.test(date)&&Number(date.slice(5))<=12&&Number(date.slice(5))>0)
  return {date:date,precision:'month',valid:true};
 if(precisionValue==='year'&&/^(19|20)\d{2}$/.test(date))
  return {date:date,precision:'year',valid:true};
 return {date:'',precision:'unknown',valid:false};
}
function validPage(n){return Number.isInteger(n)&&n>=1&&n<=5000}
function stamp(s){var t=Date.parse(s);return typeof s==='string'&&Number.isFinite(t)?t:null}
function explainDate(doc){
 if(!doc.date)return 'A klinikai esemény pontos dátuma nincs igazolva';
 if(doc.datePrecision==='year')return doc.date+' · csak év pontosságú';
 if(doc.datePrecision==='month')return doc.date+' · csak hónap pontosságú';
 return doc.date+(doc.datePrecision==='minute'?' · óra/perc':' · nap pontosságú');
}
function assemble(request,context,opts){
 if(!request||request.schema!=='healthhub.ask-lena/1'||request.consent!==true||!isProfile(request.profile))
  throw Error('Clinical Intelligence: hiányzik a hitelesített profilhoz kötött AI-jóváhagyás.');
 var profile=request.profile;
 if(!context||context.profile!==profile)
  throw Error('Clinical Intelligence: nem áll rendelkezésre az egyező profilhoz tartozó egészségügyi kontextus.');
 if(opts&&opts.expectedProfile&&opts.expectedProfile!==profile)
  throw Error('Clinical Intelligence: profilváltás észlelve, a feldolgozás leállítva.');
 var now=opts&&Number.isFinite(opts.now)?opts.now:Date.now(),warnings=[],manifest=[],transmit=[];
 var rawDocs=Array.isArray(request.documentEvidence)?request.documentEvidence:[];
 var allowOriginal=request.originalDocumentsConsent===true;
 var seen=new Set(),rejected=0,originals=0,summaries=0;
 rawDocs.slice(0,MAX_DOCS).forEach(function(row){
  if(!row||!['json_summary','original_pdf_extract'].includes(row.type)){rejected++;return}
  if(row.type==='original_pdf_extract'&&!allowOriginal){
   rejected++;warnings.push('A nem engedélyezett eredeti PDF-kivonatot kizártuk.');return;
  }
  var name=str(row.title,200),body=str(row.text,2450),documentId=str(row.documentId,100);
  if(!name||body.length<30||!documentId){rejected++;return}
  var pdf=row.type==='original_pdf_extract';
  if(pdf&&!validPage(row.page)){
   rejected++;warnings.push('Oldaljelölés nélküli PDF-kivonat kihagyva: nem hivatkozható hitelesen.');return;
  }
  var key=profile+'|'+documentId+'|'+row.type+'|'+(pdf?row.page:'summary');
  if(seen.has(key)){rejected++;return}seen.add(key);
  var clinical=parseDocDate(row.date,row.datePrecision);
  var upload=stamp(row.uploadDate),future=upload!=null&&upload>now+MAX_FUTURE;
  var dated=clinical.valid&&!(clinical.precision==='minute'&&stamp(clinical.date)>now+MAX_FUTURE);
  if(!dated&&row.date)warnings.push('Egy forrás megadott klinikai dátuma nem ellenőrizhető; nem használjuk eseménydátumként.');
  if(future)warnings.push('Jövőbeli dokumentum-feltöltési időpontot mellőztünk.');
  var normalized={type:row.type,documentId:documentId,title:name,
   date:dated?clinical.date:'',datePrecision:dated?clinical.precision:'unknown',
   uploadDate:upload!=null&&!future?str(row.uploadDate,35):'',
   datesMentioned:Array.isArray(row.datesMentioned)?row.datesMentioned.slice(0,8).map(function(t){return str(t,30)}):[],
   text:body};
  if(pdf)normalized.page=row.page;
  transmit.push(normalized);
  if(pdf)originals++;else summaries++;
  manifest.push({
   id:'E'+manifest.length+1,documentId:documentId,title:name,type:row.type,
   trust:pdf?'eredeti PDF tényleges kivonata':'korábban mentett JSON-magyarázat',
   date:normalized.date,datePrecision:normalized.datePrecision,
   uploadDate:normalized.uploadDate,page:pdf?row.page:null,
   dateMeaning:explainDate(normalized)
  });
 });
 if(rawDocs.length>MAX_DOCS)warnings.push('Csak az első tizenhat kérdéshez rangsorolt leletet vizsgáltuk.');
 // All medication fields are self-reported PROFILE records, not a clinically
 // reconciled list. Do not assume that they are still being taken or that a
 // recorded interaction or a treatment plan has been verified.
 var meds=Array.isArray(context.medications)?context.medications:[];
 var medicationCount=meds.filter(function(x){return x&&str(x.name,85)}).length;
 var medStatuses=meds.slice(0,12).filter(function(x){return x&&x.name}).map(function(x){
  return {name:str(x.name,85),status:str(x.status,48)||'nincs megerősített szedési státusz',
   scheduleGiven:!!str(x.schedule,80)};
 });
 if(medicationCount)warnings.push('A gyógyszerlista profiladat, nem igazolt gyógyszeregyeztetés. Nem bizonyítja az aktuális szedést.');
 if(!originals&&summaries)warnings.push('Nincs engedélyezett eredeti PDF-kivonat: a korábbi JSON-magyarázat nem eredeti klinikai bizonyíték.');
 if(!originals&&!summaries)warnings.push('Ehhez a kérdéshez nem érkezett eredeti lelet vagy JSON-magyarázat. A leletindex címei nem igazolnak diagnózist.');
 var facts=[
  {domain:'documents',label:'I-04 · klinikai forrásminőség',
   value:'Eredeti PDF-kivonat: '+originals+', korábbi JSON-magyarázat: '+summaries+
    ', kimaradt: '+rejected+'. Forráshiány esetén nem állítható dokumentált diagnózis.'},
  {domain:'documents',label:'I-04 · dátumok jelentése',
   value:'A klinikai leletdátum, szövegben említett dátum és a fájl feltöltési dátuma három külön adat; puszta dátumemlítés nem bizonyított eseménydátum.'}
 ];
 manifest.slice(0,3).forEach(function(m){
  facts.push({domain:'documents',label:'I-04 · Forrás '+m.id,
   value:str(m.title,80)+' · '+str(m.trust,54)+' · '+str(m.dateMeaning,90)+
    (m.page?' · '+m.page+'. oldal':'')});
 });
 if(medicationCount){
  facts.push({domain:'medication',label:'I-04 · gyógyszerlista státusza',
   value:medicationCount+' profilban szereplő készítmény. Aktuális szedés, dózis, interakció és módosítás nem igazolt. Orvosi egyeztetés szükséges a megváltoztatáshoz.'});
 }
 // Prevent extra data from implicitly bypassing existing server size cap.
 var originalExtra=Array.isArray(request.extra)?request.extra:[];
 var next=Object.assign({},request,{
  documentEvidence:transmit,
  originalDocumentsConsent:allowOriginal,
  extra:facts.concat(originalExtra)
 });
 while(JSON.stringify({sources:next.sources,extra:next.extra}).length>16500&&next.extra.length>facts.length)
  next.extra.pop();
 if(JSON.stringify({sources:next.sources,extra:next.extra}).length>18500)
  throw Error('Clinical Intelligence: túl sok adat a biztonságos klinikai bizonyítékellenőrzéshez.');
 return {payload:next,profile:profile,checkedAt:new Date(now).toISOString(),
  manifest:manifest,medications:medStatuses,medicationCount:medicationCount,
  warnings:warnings.slice(0,8),quality:{originals:originals,summaries:summaries,
   rejected:rejected,medications:medicationCount,
   originalConsent:allowOriginal,sourceCount:manifest.length}};
}
// A local evidence ledger can be shown with the completed answer. Titles,
// dates and page numbers are sourced from previously selected docs, never
// invented reference links or unverified answer citations.
function createPanel(report,activeProfile){
 if(!report||report.profile!==activeProfile)return null;
 var details=document.createElement('details');details.id='hhClinicalProof391';
 details.style.cssText='margin-top:12px;border:1px solid #c9dfe8;border-radius:14px;padding:11px 13px;background:#f7fcff;color:#244b64;font:12px/1.55 inherit';
 var title=document.createElement('summary');title.style.cssText='cursor:pointer;font-weight:800;font-size:12px';
 title.textContent='📚 Clinical Evidence I-04 · '+report.quality.originals+' eredeti PDF-kivonat · '+
  report.quality.summaries+' korábbi magyarázat · '+report.quality.medications+' gyógyszerlista-tétel';
 details.appendChild(title);
 function add(text,emphasis){
  var p=document.createElement('p');p.style.margin='7px 0 3px';p.textContent=text;
  if(emphasis)p.style.color='#a04c20';
  details.appendChild(p);
 }
 report.manifest.slice(0,8).forEach(function(m){
  add('['+m.id+'] '+m.trust+': '+m.title+' · '+m.dateMeaning+
   (m.page?' · '+m.page+'. oldal':'')+
   (m.uploadDate?' · feltöltés: '+m.uploadDate+' (nem klinikai esemény)':''));
 });
 if(!report.manifest.length)add('Ehhez a kérdéshez nem került feldolgozásra hiteles eredeti lelet. A leletcím nem bizonyít megállapítást.',true);
 report.warnings.slice(0,4).forEach(function(w){add('⚠ '+w,true)});
 add('Ez a forráslista az AI részére átadott kivonatokat igazolja, nem azt, hogy az AI válaszának minden állítása klinikailag bizonyított. A gyógyszerlista nem helyettesíti az orvosi gyógyszeregyeztetést.');
 return details;
}
window.HH_CLINICAL_EVIDENCE_V391={assemble:assemble,createPanel:createPanel,version:VERSION};
})();
