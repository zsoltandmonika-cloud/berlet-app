/* HealthHub Clinical Evidence Verification v395
 * Pure shared helper (Deno Edge + Node CI), no health-data persistence,
 * network calls, application globals, or user-specific rules.
 * An original PDF excerpt is NOT a comprehensive medical record.
 */
const MAX_ORIGINALS=8;
const compact=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
const norm=x=>compact(x).toLocaleLowerCase('hu-HU');
const numTokens=x=>(compact(x).match(/\d+(?:[.,]\d+)?/g)||[]).map(v=>v.replace(',','.'));
const validId=s=>typeof s==='string'&&/^(?:D\d+:p\d+)$/.test(s);
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
 for(const f of proposed.slice(0,32)){
  if(!f||!validId(f.sourceId)||!trusted.has(f.sourceId)){issues.push('unrecognized_source');continue;}
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
 return {facts:out.slice(0,22),rejected:issues.length,issues:issues.slice(0,12)};
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
 let content=evidenceFacts.map(f=>f.quote+' '+f.documentDate).join(' ');
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
 const eventDate=quote=>{
  const q=String(quote||'');
  const iso=q.match(/\b((?:19|20)\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/);
  if(!iso)return null;
  const y=Number(iso[1]),m=Number(iso[2]),d=Number(iso[3]);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
  return date.toISOString().slice(0,10);
 };
 return facts.map(f=>({
  sourceId:f.sourceId,documentTitle:f.documentTitle,page:f.page,
  // Do not mistake a discharge summary DATE for the underlying event time.
  eventDate:eventDate(f.quote),documentDate:f.documentDate||'',
  fact:f.fact
 })).sort((a,b)=>{
  if(a.eventDate&&b.eventDate)return a.eventDate.localeCompare(b.eventDate);
  return a.eventDate?-1:b.eventDate?1:0;
 }).slice(0,22);
}
const allowedKinds=new Set(['documented','general','possible','unknown']);
export function auditClinicalDraft(response,evidence,validated){
 const trusted=new Map(evidence.map(d=>[d.id,d]));
 const facts=Array.isArray(validated?.facts)?validated.facts:[];
 const factRefs=new Set(facts.map(f=>f.sourceId));
 const sections=[],stats={paragraphs:0,documented:0,demoted:0,unsupportedDurations:0,
  unsupportedDates:0,unsupportedClinicalNumbers:0,unsupportedDoctors:0,badCitations:0,verifiedFacts:facts.length};
 const modelSections=Array.isArray(response?.sections)?response.sections:[];
 for(const sec of modelSections.slice(0,9)){
  const heading=compact(sec?.heading).slice(0,135)||'További megállapítások';
  const paragraphs=[];
  for(const p of (Array.isArray(sec?.paragraphs)?sec.paragraphs:[]).slice(0,7)){
   let txt=compact(p?.text).slice(0,1250);
   if(txt.length<12)continue;
   const kind=allowedKinds.has(p?.kind)?p.kind:'unknown';
   const cited=Array.isArray(p?.sourceIds)?p.sourceIds.filter(validId):[];
   const unknownIds=cited.filter(id=>!trusted.has(id)||!factRefs.has(id));
   const validRefs=Array.from(new Set(cited.filter(id=>trusted.has(id)&&factRefs.has(id))));
   const invalidInline=(txt.match(/\[D\d+:p\d+\]/g)||[]).some(mark=>
    !trusted.has(mark.slice(1,-1))||!factRefs.has(mark.slice(1,-1)));
   const unsupported=unexpectedDurations(txt,facts);
   const dateExceptions=kind==='documented'?dateAllowed(txt,facts):[];
   // Other numeric medical values (EF%, vitals, device shocks) need direct
   // documentary support too, not just time values. The date metadata of a
   // genuinely cited page can explain its header date but not an invented EF.
   const relevantFacts=facts.filter(f=>validRefs.includes(f.sourceId));
   const anchoredNumbers=new Set(relevantFacts.flatMap(f=>numTokens(f.quote+' '+f.documentDate)));
   const unsupportedNumbers=kind==='documented'?
    numTokens(txt).filter(n=>!anchoredNumbers.has(n)):[];
   const medicalNames=kind==='documented'?quotedDoctorNames(txt):[];
   const citedText=relevantFacts.map(f=>f.quote).join(' ');
   const unsupportedDoctors=medicalNames.filter(n=>!norm(citedText).includes(n));
   stats.paragraphs++;
   if(unknownIds.length||invalidInline)stats.badCitations++;
   if(unsupported.length)stats.unsupportedDurations+=unsupported.length;
   if(dateExceptions.length)stats.unsupportedDates+=dateExceptions.length;
   if(unsupportedNumbers.length)stats.unsupportedClinicalNumbers+=unsupportedNumbers.length;
   if(unsupportedDoctors.length)stats.unsupportedDoctors+=unsupportedDoctors.length;
   if(unsupported.length||dateExceptions.length||unsupportedNumbers.length||unsupportedDoctors.length||unknownIds.length||invalidInline||
      (kind==='documented'&&!validRefs.length)||
      (kind==='general'&&isPersonalAssertion(txt))){
    // Quietly withhold unsupported claims from the public story.
    // Reasons remain in the private evidence audit counters, never
    // multiplied into six repetitive warning panels.
    stats.demoted++;
    continue;
   }
   if(kind==='documented')stats.documented++;
   if(kind==='possible'&&!/(lehetséges|elképzelhető|felmerülhet|nem bizonyít|összefügghet|lehetőség)/i.test(txt))
    txt='Lehetséges, hogy '+txt.charAt(0).toLowerCase()+txt.slice(1);
   // Never trust unverified freehand citation strings in the model's prose.
   txt=txt.replace(/\[D\d+:p\d+\]/g,'').trim();
   paragraphs.push({text:txt,kind,sourceIds:kind==='documented'?validRefs:[]});
  }
  if(paragraphs.length)sections.push({heading,paragraphs});
 }
 if(!sections.length)sections.push({heading:'Bizonyítékok és korlátok',
  paragraphs:[{kind:'unknown',text:'A kérdéshez nem sikerült elegendő, ellenőrzött klinikai tényt összegyűjteni. A feldolgozott dokumentumrészletek hiánya nem bizonyítja, hogy az esemény nem történt meg.',sourceIds:[]}]});
 return {sections,stats};
}
export function formatClinicalAnswer(report,index){
 const lines=[];
 for(const section of report.sections){
  // Keep topic cards from v394 while making the core read like a coherent
  // personal narrative. Labels like "Documentált tény" are NOT chapter titles.
  const paragraphs=[];
  for(const p of section.paragraphs){
   if(p.kind==='unknown')continue; // uncertainties stay in the quiet audit
   let text=compact(p.text);
   if(!text)continue;
   const refs=Array.from(new Set((p.sourceIds||[]))).map(id=>{
    const s=index.find(x=>x.id===id);
    if(!s)return '';
    return s.title+' ('+(s.documentDate||'keltezés nélkül')+', '+s.page+'. oldal)';
   }).filter(Boolean);
   if(refs.length)text+='\n*Forrás: '+refs.join('; ')+'*';
   paragraphs.push(text);
  }
  if(paragraphs.length){
   lines.push('## '+section.heading);
   lines.push(paragraphs.join('\n\n'));
  }
 }
 // Never turn every unsupported claim into its own warning. If absolutely
 // no source-backed statement is retained, state the limitation once.
 if(!lines.length)return 'A rendelkezésre álló kivonatokból ehhez a konkrét kérdéshez most nem sikerült ellenőrzött személyes eseményleírást összeállítani.';
 return lines.join('\n\n').slice(0,16500);
}
