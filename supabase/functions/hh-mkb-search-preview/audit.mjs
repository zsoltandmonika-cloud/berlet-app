/* HealthHub Clinical Evidence Verification v395
 * Pure shared helper (Deno Edge + Node CI), no health-data persistence,
 * network calls, application globals, or user-specific rules.
 * An original PDF excerpt is NOT a comprehensive medical record.
 */
const MAX_ORIGINALS=12;
const compact=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
const norm=x=>compact(x).toLocaleLowerCase('hu-HU');
const MONTHS={január:1,február:2,március:3,április:4,május:5,június:6,
 július:7,augusztus:8,szeptember:9,október:10,november:11,december:12};
const NUM_DATE=/(?:19|20)\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/g;
const HUN_DATE=/((?:19|20)\d{2})\.\s*(január|február|március|április|május|június|július|augusztus|szeptember|október|november|december)\s+(\d{1,2})/giu;
function dateKey(y,m,d){
 const t=new Date(Date.UTC(Number(y),Number(m)-1,Number(d)));
 if(t.getUTCFullYear()!==Number(y)||t.getUTCMonth()+1!==Number(m)||t.getUTCDate()!==Number(d))return null;
 return String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function dateMatches(input){
 const s=String(input||''),dates=[];
 for(const m of s.matchAll(new RegExp(NUM_DATE.source,'g'))){
  const p=m[0].split(/[.\/-]/),key=dateKey(p[0],p[1],p[2]);
  if(key)dates.push(key);
 }
 for(const m of s.matchAll(new RegExp(HUN_DATE.source,'giu'))){
  const key=dateKey(m[1],MONTHS[m[2].toLocaleLowerCase('hu-HU')],m[3]);
  if(key)dates.push(key);
 }
 return dates;
}
function noCalendarDates(x){
 return compact(x)
  .replace(NUM_DATE,v=>{const p=v.split(/[.\/-]/);return dateKey(p[0],p[1],p[2])?' ':v})
  .replace(HUN_DATE,(v,y,month,d)=>dateKey(y,MONTHS[month.toLocaleLowerCase('hu-HU')],d)?' ':v);
}
const numTokens=x=>(noCalendarDates(x).match(/\d+(?:[.,]\d+)?/g)||[]).map(v=>v.replace(',','.'));
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
  if(numTokens(claim).some(n=>!quoteNums.has(n))||dateAllowed(claim,[{quote}]).length||
   unexpectedDurations(claim,[{quote}]).length){issues.push('unsupported_numeric_claim');continue;}
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
function dateAllowed(text,evidenceFacts){
 const allowed=new Set(dateMatches(evidenceFacts.map(f=>f.quote).join(' ')));
 return dateMatches(text).filter(date=>!allowed.has(date));
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
  return dateMatches(q)[0]||null;
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
  if(numTokens(fact).some(n=>!nums.has(n))||dateAllowed(fact,[{quote}]).length||
     unexpectedDurations(fact,[{quote}]).length){
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
/* v679 Golden Standard: audited story FIRST, then verifiable fact inventory,
 * then distinct medical interpretation. Narrative is restricted to already
 * audited documentary/reported paragraphs; no generic model guess can turn
 * into a patient's personal history. Original quote/text are never fabricated.
 */
export function formatClinicalAnswer(report,index,secondary=[],validated={facts:[]},summaryValidation={facts:[]}){
 const sections=Array.isArray(report?.sections)?report.sections:[];
 const originals=Array.isArray(index)?index:[];
 const summaries=Array.isArray(secondary)?secondary:[];
 const primaryFacts=Array.isArray(validated?.facts)?validated.facts:[];
 const secondaryFacts=Array.isArray(summaryValidation?.facts)?summaryValidation.facts:[];
 const story=[],seen=new Set(),interpretation=[],seenInterpretation=new Set();
 const trusted=new Map(originals.map(x=>[x.id,x]));
 const summaryIndex=new Map(summaries.map(x=>[x.id,x]));
 const sourceId=e=>String(e||'');
 // Audited 'documented' and 'reported' paragraphs must have a validated
 // original or secondary reference. This is a further failsafe after
 // auditClinicalDraft, not a replacement for its numeric/date/name checks.
 const allowedPrimary=new Set(primaryFacts.map(x=>sourceId(x.sourceId)));
 const allowedSecondary=new Set(secondaryFacts.map(x=>sourceId(x.sourceId)));
 for(const section of sections){
  for(const p of section.paragraphs||[]){
   const raw=compact(p?.text);
   if(raw.length<12)continue;
   const refs=(Array.isArray(p?.sourceIds)?p.sourceIds:[]).map(sourceId);
   if(p.kind==='documented'||p.kind==='reported'){
    const allowed=p.kind==='documented'?allowedPrimary:allowedSecondary;
    const known=p.kind==='documented'?trusted:summaryIndex;
    if(!refs.length||refs.some(r=>!allowed.has(r)||!known.has(r)))continue;
    const text=p.kind==='reported'?'Egy korábbi leletmagyarázat beszámolója szerint '+raw.charAt(0).toLowerCase()+raw.slice(1):raw;
    const key=norm(text);
    if(!seen.has(key)){seen.add(key);story.push(text)}
   }else if(p.kind==='general'||p.kind==='possible'){
    const explanation=(p.kind==='possible'&&!/(lehetséges|elképzelhető|felmerülhet|nem bizonyít|összefügghet|lehetőség)/i.test(raw))?
     'Lehetséges, hogy '+raw.charAt(0).toLowerCase()+raw.slice(1):raw;
    const key=norm(explanation);
    if(!seenInterpretation.has(key)){seenInterpretation.add(key);interpretation.push(explanation)}
   }
  }
 }
 const lines=['## A leletek története'];
 if(story.length){
  // A gentle explanation can make the narrative readable, but stays
  // explicitly qualified and is also repeated in the separate audit layer.
  // No extra personal facts are introduced by these connective sentences.
  const body=story.slice(0,16);
  if(interpretation.length)body.push('Az ismertetett leletrészletek lehetséges orvosi jelentése: '+interpretation.slice(0,2).join(' '));
  lines.push(body.join('\n\n'));
 }
 else lines.push('A rendelkezésre álló, ellenőrzött leletrészletekből ehhez a kérdéshez nem állítható össze megbízható, személyes eseménytörténet. A hiányzó adatokat nem helyettesítem feltételezésekkel.');
 lines.push('## Dokumentált tények');
 if(primaryFacts.length){
  const facts=[],unique=new Set();
  for(const fact of primaryFacts){
   const d=trusted.get(fact.sourceId);
   if(!d||!fact.quote||!norm(d.text).includes(norm(fact.quote)))continue;
   const key=fact.sourceId+'|'+norm(fact.quote);
   if(unique.has(key))continue;unique.add(key);
   // The exact patient-facing quotation is the final checkable fact.
   facts.push('**Eredeti PDF:** '+compact(fact.quote).slice(0,450)+
    '\n**Forrás:** '+compact(d.title)+' · '+d.page+'. oldal'+
    (d.documentDate?' · dokumentum keltezése: '+compact(d.documentDate).replace(/[.\s]+$/,''):'')+
    '. A dokumentum keltezése nem feltétlenül az esemény vagy mintavétel napja.');
  }
  if(facts.length)lines.push(facts.slice(0,28).map((f,i)=>(i+1)+'. '+f).join('\n\n'));
  else lines.push('Az elérhető dokumentumrészletek között ehhez a kérdéshez nem volt újra ellenőrizhető eredeti PDF-idézet.');
  if(facts.length>28)lines.push('További '+(facts.length-28)+' ellenőrzött részletet a rövid, mobilos nézet nem sorol fel; a forrásindex továbbra is változatlan.');
 }else{
  lines.push('Ehhez a kérdéshez most nincs szó szerint visszaellenőrzött, eredeti PDF-részlet.');
 }
 if(secondaryFacts.length){
  const items=[],seenSecondary=new Set();
  for(const fact of secondaryFacts){
   const d=summaryIndex.get(fact.sourceId);
   if(!d||!fact.quote||!norm(d.text).includes(norm(fact.quote)))continue;
   const key=fact.sourceId+'|'+norm(fact.quote);
   if(seenSecondary.has(key))continue;seenSecondary.add(key);
   items.push('**Másodlagos beszámoló (nem eredeti PDF):** '+compact(fact.quote).slice(0,250)+
    '\n**Forrás:** '+compact(d.title));
  }
  if(items.length)lines.push('**Korábbi értelmezésekben szereplő, még nem elsődlegesen igazolt adatok:**\n\n'+items.slice(0,10).join('\n\n'));
 }
 lines.push('## Orvosi értelmezés');
 if(interpretation.length)lines.push(interpretation.slice(0,9).join('\n\n'));
 else lines.push('Az elérhető idézetek alapján nem adható megalapozott, személyre szabott további orvosi következtetés. Az eredményeket tünetekkel és vizsgálati körülményekkel együtt lehet értelmezni.');
 lines.push('*A pontos PDF-szövegegyezés nem egyenlő szakmai diagnózissal. Kérdéses adatot csak ellenőrzésre váróként kezelünk.*');
 return lines.join('\n\n').slice(0,26000);
}
