/* HealthHub Clinical Evidence Verification v395
 * Pure shared helper (Deno Edge + Node CI), no health-data persistence,
 * network calls, application globals, or user-specific rules.
 * An original PDF excerpt is NOT a comprehensive medical record.
 */
const MAX_ORIGINALS=12;
const compact=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
const norm=x=>compact(x).toLocaleLowerCase('hu-HU');
const numTokens=x=>(compact(x).match(/\d+(?:[.,]\d+)?/g)||[]).map(v=>v.replace(',','.'));
const validId=s=>typeof s==='string'&&/^(?:D\d+:p\d+|S\d+)$/.test(s);
const originalId=s=>typeof s==='string'&&/^D\d+:p\d+$/.test(s);
const secondaryId=s=>typeof s==='string'&&/^S\d+$/.test(s);
export function buildEvidenceIndex(documents,profile){
 if(!['zsolt','monika'].includes(profile))throw Error('unknown_profile');
 const original=(Array.isArray(documents)?documents:[]).filter(x=>
  x&&x.type==='original_pdf_extract'&&x.documentId&&Number.isInteger(x.page)&&x.page>=1&&
  typeof x.text==='string'&&x.text.length>=30).slice(0,MAX_ORIGINALS);
 return original.map((d,i)=>Object.freeze({
  id:'D'+(i+1)+':p'+d.page,documentId:String(d.documentId).slice(0,100),
  page:d.page,title:String(d.title||'Ismeretlen dokumentum').slice(0,170),
  documentDate:String(d.date||'').slice(0,35),
  datePrecision:String(d.datePrecision||'unknown').slice(0,10),
  text:compact(d.text).slice(0,2450),
  profile
 }));
}
export function verifyExtractedFacts(response,evidence){
 const trusted=new Map(evidence.map(d=>[d.id,d])),out=[],seen=new Set(),issues=[];
 const proposed=Array.isArray(response?.facts)?response.facts:[];
 for(const f of proposed.slice(0,48)){
  if(!f||!originalId(f.sourceId)||!trusted.has(f.sourceId)){issues.push('unrecognized_source');continue;}
  const source=trusted.get(f.sourceId),quote=compact(f.quote),claim=compact(f.fact);
  if(quote.length<18||quote.length>480||claim.length<10||claim.length>390){issues.push('invalid_claim_length');continue;}
  if(!norm(source.text).includes(norm(quote))){issues.push('quote_not_in_source');continue;}
  // Every number in the fact must be present in the exact excerpt, including
  // uncertain durations and dates. No invented 20-minute ischemia interval.
  const quoteNums=new Set(numTokens(quote));
  if(numTokens(claim).some(n=>!quoteNums.has(n))||unexpectedDurations(claim,[{quote}]).length){issues.push('unsupported_numeric_claim');continue;}
  const key=f.sourceId+'|'+norm(quote);
  if(seen.has(key))continue;seen.add(key);
  out.push({sourceId:f.sourceId,quote,fact:claim,documentTitle:source.title,
   documentDate:source.documentDate,page:source.page});
 }
 return {facts:out.slice(0,40),rejected:issues.length,issues:issues.slice(0,12)};
}
function durationValues(text){
 // A cardiac EF of 20% does NOT validate a 20-minute cardiac arrest.
 // Numerical precision is accepted only with the same temporal unit.
 const rx=/\b(\d+(?:[.,]\d+)?)\s*(perc(?:ig|en|et|cel)?|óra(?:ig|n|t)?|órá(?:ig|n|t)?|nap(?:ig|on|ot)?|hét(?:ig|en)?)\b/gi;
 const values=[];let m;
 while((m=rx.exec(String(text||'')))){
  const unit=m[2].toLocaleLowerCase('hu-HU');
  const category=unit.startsWith('perc')?'perc':unit.startsWith('ór')?'óra':
   unit.startsWith('nap')?'nap':'hét';
  values.push({value:m[1].replace(',','.'),unit:category,phrase:m[0]});
 }
 return values;
}
function unexpectedDurations(text,facts){
 const allowed=new Set(facts.flatMap(f=>durationValues(f.quote).map(v=>v.value+':'+v.unit)));
 return durationValues(text).filter(v=>!allowed.has(v.value+':'+v.unit)).map(v=>v.phrase);
}
function datesIn(text){
 return compact(text).match(/(?:19|20)\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/g)||[];
}
function dateAllowed(text,evidenceFacts){
 let content=evidenceFacts.map(f=>f.quote).join(' ');
 const normalizeDate=s=>s.replace(/[^\d]/g,'');
 let dates=new Set((content.match(/(?:19|20)\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/g)||[]).map(normalizeDate));
 return datesIn(text).filter(date=>!dates.has(normalizeDate(date)));
}
function isPersonalAssertion(s){
 return /\b(Mónika|Zsolt|nálad|veled|téged|a te|benned|agyad|szíved|voltál|kaptál|beültették|mentők|újraélesztettek)\b/i.test(s);
}
function quotedDoctorNames(text){
 const names=String(text||'').match(/\b(?:Dr\.?|dr\.?)\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]+){1,3}/gu)||[];
 return names.map(n=>norm(n).replace(/^dr\.?\s*/,'')); 
}
export function buildEventCandidates(validated){
 const facts=Array.isArray(validated?.facts)?validated.facts:[];
 function eventDate(quote){
  const q=String(quote||'');
  const iso=q.match(/\b((?:19|20)\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/);
  if(!iso)return null;
  const y=Number(iso[1]),m=Number(iso[2]),d=Number(iso[3]);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
  return date.toISOString().slice(0,10);
 }
 function eventTime(quote){
  // Time must be explicitly in the source quote; do not extrapolate
  // a time of event from hospital/discharge document metadata.
  const q=String(quote||''),t=q.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if(!t)return null;
  return String(Number(t[1])).padStart(2,'0')+':'+t[2];
 }
 return facts.map(f=>({
  sourceId:f.sourceId,documentTitle:f.documentTitle,page:f.page,
  eventDate:eventDate(f.quote),eventTime:eventTime(f.quote),
  documentDate:f.documentDate||'',fact:f.fact
 })).sort((a,b)=>{
  if(a.eventDate&&b.eventDate){
   const d=a.eventDate.localeCompare(b.eventDate);if(d)return d;
   if(a.eventTime&&b.eventTime)return a.eventTime.localeCompare(b.eventTime);
   return a.eventTime?-1:b.eventTime?1:0;
  }
  return a.eventDate?-1:b.eventDate?1:0;
 }).slice(0,40);
}
/* Second-tier evidence is a previously saved AI/JSON interpretation.
 * Its literal wording can ground a REPORTED claim, never a documented
 * hospital fact; stored summaries must not silently become original PDFs. */
export function buildSecondaryIndex(documents,profile){
 if(!['zsolt','monika'].includes(profile))throw Error('unknown_profile');
 const seen=new Set();
 return (Array.isArray(documents)?documents:[]).filter(d=>
  d&&d.type==='json_summary'&&typeof d.documentId==='string'&&
  typeof d.text==='string'&&d.text.trim().length>=45&&d.title)
  .filter(d=>{if(seen.has(d.documentId))return false;seen.add(d.documentId);return true})
  .slice(0,8).map((d,i)=>Object.freeze({
   id:'S'+(i+1),documentId:d.documentId.slice(0,100),
   title:String(d.title).slice(0,170),
   documentDate:String(d.date||'').slice(0,35),
   text:compact(d.text).slice(0,2100),profile,
   provenance:'prior_json_summary_not_original'
  }));
}
export function verifySecondaryFacts(response,index){
 const trusted=new Map(index.map(x=>[x.id,x])),facts=[],issues=[],seen=new Set();
 for(const f of (Array.isArray(response?.facts)?response.facts:[]).slice(0,52)){
  if(!f||!secondaryId(f.sourceId)||!trusted.has(f.sourceId)){issues.push('unrecognized_secondary_source');continue}
  const src=trusted.get(f.sourceId),quote=compact(f.quote),fact=compact(f.fact);
  if(quote.length<18||quote.length>500||fact.length<10||fact.length>390){issues.push('secondary_claim_length');continue}
  if(!norm(src.text).includes(norm(quote))){issues.push('secondary_quote_not_in_text');continue}
  const nums=new Set(numTokens(quote));
  if(numTokens(fact).some(n=>!nums.has(n))||unexpectedDurations(fact,[{quote}])){
   issues.push('secondary_unsupported_number');continue;
  }
  if(quotedDoctorNames(fact).some(n=>!norm(quote).includes(n))){
   issues.push('secondary_unsupported_doctor');continue;
  }
  const key=f.sourceId+'|'+norm(quote);
  if(seen.has(key))continue;seen.add(key);
  facts.push({sourceId:f.sourceId,quote,fact,
   documentTitle:src.title,documentDate:src.documentDate,
   sourceType:'prior_json_summary_not_original'});
 }
 return {facts:facts.slice(0,40),rejected:issues.length,issues:issues.slice(0,10)};
}
const allowedKinds=new Set(['documented','reported','general','possible','unknown']);
export function auditClinicalDraft(response,evidence,validated,secondary=[],secondaryValidation={facts:[]}){
 const trusted=new Map(evidence.map(d=>[d.id,d]));
 const summaries=new Map(secondary.map(d=>[d.id,d]));
 const facts=Array.isArray(validated?.facts)?validated.facts:[];
 const summaryFacts=Array.isArray(secondaryValidation?.facts)?secondaryValidation.facts:[];
 const factRefs=new Set(facts.map(f=>f.sourceId));
 const summaryRefs=new Set(summaryFacts.map(f=>f.sourceId));
 const sections=[],stats={paragraphs:0,documented:0,reported:0,secondaryFacts:summaryFacts.length,demoted:0,unsupportedDurations:0,
  unsupportedDates:0,unsupportedClinicalNumbers:0,unsupportedDoctors:0,badCitations:0,verifiedFacts:facts.length};
 const modelSections=Array.isArray(response?.sections)?response.sections:[];
 for(const sec of modelSections.slice(0,9)){
  const heading=compact(sec?.heading).slice(0,135)||'További megállapítások';
  const paragraphs=[];
  for(const p of (Array.isArray(sec?.paragraphs)?sec.paragraphs:[]).slice(0,7)){
   const rawText=compact(p?.text).slice(0,1250);
   // Strip citation markers BEFORE numeric validation, while validating the
   // raw citation separately. [D1:p3] is a reference, not a 1/3 result.
   let txt=rawText.replace(/\[(?:D\d+:p\d+|S\d+)\]/g,'').trim();
   if(txt.length<12)continue;
   const kind=allowedKinds.has(p?.kind)?p.kind:'unknown';
   const cited=Array.isArray(p?.sourceIds)?p.sourceIds.filter(validId):[];
   const checkedRefs=kind==='documented'?factRefs:kind==='reported'?summaryRefs:new Set();
   const sourceIndex=kind==='documented'?trusted:kind==='reported'?summaries:new Map();
   const unknownIds=cited.filter(id=>!sourceIndex.has(id)||!checkedRefs.has(id));
   const validRefs=Array.from(new Set(cited.filter(id=>sourceIndex.has(id)&&checkedRefs.has(id))));
   const invalidInline=(rawText.match(/\[(?:D\d+:p\d+|S\d+)\]/g)||[]).some(mark=>
    !sourceIndex.has(mark.slice(1,-1))||!checkedRefs.has(mark.slice(1,-1)));
   const relevantFacts=(kind==='reported'?summaryFacts:facts).filter(f=>validRefs.includes(f.sourceId));
   const referencedFacts=kind==='documented'||kind==='reported';
   const unsupported=unexpectedDurations(txt,referencedFacts?relevantFacts:facts);
   const dateExceptions=referencedFacts?dateAllowed(txt,relevantFacts):[];
   // Other numeric medical values (EF%, vitals, device shocks) need direct
   // documentary support too, not just time values. The date metadata of a
   // genuinely cited page can explain its header date but not an invented EF.
   const anchoredNumbers=new Set(relevantFacts.flatMap(f=>numTokens(f.quote)));
   const unsupportedNumbers=referencedFacts?
    numTokens(txt).filter(n=>!anchoredNumbers.has(n)):[];
   const medicalNames=referencedFacts?quotedDoctorNames(txt):[];
   const citedText=relevantFacts.map(f=>f.quote).join(' ');
   const unsupportedDoctors=medicalNames.filter(n=>!norm(citedText).includes(n));
   stats.paragraphs++;
   if(unknownIds.length||invalidInline)stats.badCitations++;
   if(unsupported.length)stats.unsupportedDurations+=unsupported.length;
   if(dateExceptions.length)stats.unsupportedDates+=dateExceptions.length;
   if(unsupportedNumbers.length)stats.unsupportedClinicalNumbers+=unsupportedNumbers.length;
   if(unsupportedDoctors.length)stats.unsupportedDoctors+=unsupportedDoctors.length;
   if(unsupported.length||dateExceptions.length||unsupportedNumbers.length||unsupportedDoctors.length||unknownIds.length||invalidInline||
      (referencedFacts&&!validRefs.length)||
      (kind==='general'&&isPersonalAssertion(txt))){
    // Quietly withhold unsupported claims from the public story.
    // Reasons remain in the private evidence audit counters, never
    // multiplied into six repetitive warning panels.
    stats.demoted++;
    continue;
   }
   if(kind==='documented')stats.documented++;
   if(kind==='reported')stats.reported++;
   if(kind==='possible'&&!/(lehetséges|elképzelhető|felmerülhet|nem bizonyít|összefügghet|lehetőség)/i.test(txt))
    txt='Lehetséges, hogy '+txt.charAt(0).toLowerCase()+txt.slice(1);
   // Never trust unverified freehand citation strings in the model's prose.
   txt=txt.replace(/\[(?:D\d+:p\d+|S\d+)\]/g,'').trim();
   paragraphs.push({text:txt,kind,sourceIds:referencedFacts?validRefs:[]});
  }
  if(paragraphs.length)sections.push({heading,paragraphs});
 }
 if(!sections.length)sections.push({heading:'Bizonyítékok és korlátok',
  paragraphs:[{kind:'unknown',text:'A kérdéshez nem sikerült elegendő, ellenőrzött klinikai tényt összegyűjteni. A feldolgozott dokumentumrészletek hiánya nem bizonyítja, hogy az esemény nem történt meg.',sourceIds:[]}]});
 return {sections,stats};
}
export function formatClinicalAnswer(report,index,secondary=[]){
 const lines=[];
 for(const section of report.sections){
  // Keep topic cards from v394 while making the core read like a coherent
  // personal narrative. Labels like "Documentált tény" are NOT chapter titles.
  const paragraphs=[],summarySources=new Set();
  for(const p of section.paragraphs){
   if(p.kind==='unknown')continue; // uncertainties stay in the quiet audit
   let text=compact(p.text);
   if(!text)continue;
   const refs=Array.from(new Set((p.sourceIds||[]))).map(id=>{
    if(secondaryId(id)){
     const d=secondary.find(x=>x.id===id);
     if(d)summarySources.add(d.title+' (korábbi JSON-értelmezés, nem eredeti lelet)');
     return '';
    }
    const d=index.find(x=>x.id===id);
    return d?d.title+' ('+(d.documentDate||'keltezés nélkül')+', '+d.page+'. oldal)':'';
   }).filter(Boolean);
   if(refs.length)text+='\n**Forrás:** '+refs.join('; ');
   paragraphs.push(text);
  }
  if(paragraphs.length){
   lines.push('## '+section.heading);
   if(summarySources.size)paragraphs.push('**Másodlagos forrás:** '+Array.from(summarySources).slice(0,3).join('; '));
   lines.push(paragraphs.join('\n\n'));
  }
 }
 // Never turn every unsupported claim into its own warning. If absolutely
 // no source-backed statement is retained, state the limitation once.
 if(!lines.length)return 'A rendelkezésre álló kivonatokból ehhez a konkrét kérdéshez most nem sikerült ellenőrzött személyes eseményleírást összeállítani.';
 return lines.join('\n\n').slice(0,26000);
}
