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
  if(numTokens(claim).some(n=>!quoteNums.has(n))){issues.push('unsupported_numeric_claim');continue;}
  const key=f.sourceId+'|'+norm(quote);
  if(seen.has(key))continue;seen.add(key);
  out.push({sourceId:f.sourceId,quote,fact:claim,documentTitle:source.title,
   documentDate:source.documentDate,page:source.page});
 }
 return {facts:out.slice(0,22),rejected:issues.length,issues:issues.slice(0,12)};
}
function sourceNumerics(evidenceFacts){return new Set(evidenceFacts.flatMap(f=>numTokens(f.quote)))}
function unexpectedDurations(text,facts){
 // Only exact durations in retained original source quotes qualify as
 // person-specific facts. Vague/unsupported numbers are not inferred.
 const allowed=sourceNumerics(facts);
 const rx=/\b(\d+(?:[.,]\d+)?)\s*(?:perc(?:ig|en|et|cel)?|órá?(?:ig|n|t)?|nap(?:ig|on|ot)?|hét(?:ig|en)?)\b/gi;
 const bad=[];let m;
 while((m=rx.exec(text)))if(!allowed.has(m[1].replace(',','.')))bad.push(m[0]);
 return bad;
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
const allowedKinds=new Set(['documented','general','possible','unknown']);
export function auditClinicalDraft(response,evidence,validated){
 const trusted=new Map(evidence.map(d=>[d.id,d]));
 const facts=Array.isArray(validated?.facts)?validated.facts:[];
 const factRefs=new Set(facts.map(f=>f.sourceId));
 const sections=[],stats={paragraphs:0,documented:0,demoted:0,unsupportedDurations:0,
  unsupportedDates:0,badCitations:0,verifiedFacts:facts.length};
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
   stats.paragraphs++;
   if(unknownIds.length||invalidInline)stats.badCitations++;
   if(unsupported.length)stats.unsupportedDurations+=unsupported.length;
   if(dateExceptions.length)stats.unsupportedDates+=dateExceptions.length;
   if(unsupported.length||dateExceptions.length||unknownIds.length||invalidInline||
      (kind==='documented'&&!validRefs.length)||
      (kind==='general'&&isPersonalAssertion(txt))){
    paragraphs.push({text:'Ez a konkrét, személyes állítás a rendelkezésre álló eredeti leletkivonatokból nem igazolható. A pontos részlethez az eredeti dokumentum és szükség esetén orvosi értelmezés kell.',kind:'unknown',sourceIds:[]});
    stats.demoted++;
    continue;
   }
   if(kind==='documented')stats.documented++;
   if(kind==='possible'&&!/(lehetséges|elképzelhető|felmerülhet|nem bizonyít|összefügghet|lehetőség)/i.test(txt))
    txt='Lehetséges magyarázat: '+txt;
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
 const lines=[],labels={documented:'📄 Dokumentált tény',general:'🧠 Általános orvosi magyarázat',
  possible:'🔎 Lehetséges értelmezés',unknown:'❔ Nem igazolt / hiányzó adat'};
 for(const section of report.sections){
  lines.push('## '+section.heading);
  for(const p of section.paragraphs){
   const refs=(p.sourceIds||[]).filter(id=>index.some(s=>s.id===id)).map(id=>{
    const s=index.find(x=>x.id===id);
    return '['+id+'] '+s.title+' · '+(s.documentDate||'dátum nem igazolt')+
     ' · '+s.page+'. oldal';
   });
   lines.push('**'+labels[p.kind]+'**\n'+p.text+(refs.length?'\nForrás: '+refs.join('; '):''));
  }
 }
 const x=report.stats;
 if(x.demoted>0)lines.push('## Bizonyítékellenőrzés\n'+
  x.demoted+' állítás esetében hiányzott a megfelelő bizonyíték; ezeket nem kezeljük biztos személyes tényként.');
 return lines.join('\n\n').slice(0,16500);
}
