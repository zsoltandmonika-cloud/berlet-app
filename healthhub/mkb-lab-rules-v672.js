(function(root){
'use strict';
/* v672: small, conservative microbiology lab extractor.
 * Reports named organisms only. Does not infer infection,
 * assign antibiotic susceptibility or diagnose illness.
 */
function norm(x){return String(x||'').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function date(x){
 var m=String(x||'').match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})(?!\d)/);
 if(!m)return null;
 var y=+m[1],mo=+m[2],d=+m[3],t=new Date(Date.UTC(y,mo-1,d));
 if(y!==t.getUTCFullYear()||mo!==t.getUTCMonth()+1||d!==t.getUTCDate())return null;
 return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
}
function candidates(page){
 var text=String(page||''),rows=[...text.matchAll(/[^\r\n]+/g)].map(m=>({text:m[0],start:m.index}));
 var samples=rows.filter(x=>/^\s*mintavetel(?:\s+ideje)?[\s_]*:/.test(norm(x.text))&&date(x.text));
 if(samples.length!==1)return [];
 var sample=samples[0],i=rows.indexOf(sample),day=date(sample.text);
 if(!rows.slice(i,i+6).some(x=>/^\s*minta[\s_]*:\s*vizelet\b/.test(norm(x.text))))return [];
 if(!rows.slice(i,i+55).some(x=>/bakterium\s+aerob\s+tenyesztese/.test(norm(x.text))))return [];
 var names=[['Escherichia coli',/escherichia\s+coli/i],
  ['Citrobacter koseri',/citrobacter\s+koseri/i],
  ['Staphylococcus aureus',/staphylococcus\s+aureus/i]],out=[],seen=new Set();
 for(var k=i;k<Math.min(rows.length,i+65);k++){
  if(!/^\s*bakterium[\s_]*:/.test(norm(rows[k].text)))continue;
  var nearby=rows.slice(k,Math.min(rows.length,k+3)).map(x=>x.text).join('\n');
  // Require both the result heading and colony-count notation. We don't
  // attach an ambiguous column's numeric count to a particular species.
  if(!/eredmeny/.test(norm(nearby))||!/csiraszam/.test(norm(nearby)))continue;
  var last=rows[Math.min(rows.length-1,k+2)];
  var excerpt=text.slice(sample.start,last.start+last.text.length);
  if(excerpt.length>1200||!text.includes(excerpt))continue;
  for(var [name,expression] of names){
   if(seen.has(name)||!expression.test(nearby))continue;
   seen.add(name);
   out.push({
    rule:'urine_culture_'+name.toLowerCase().replace(/\s+/g,'_'),
    fact_type:'laboratory',label:'Vizelettenyésztés: '+name+' ('+day+')',
    observed_date:day,
    value_text:'A vizelettenyésztési leletben szereplő baktérium: '+name,
    value_number:null,original_unit:null,excerpt,
    extraction_method:'embedded_text',time_precision:'day',
    polarity:'positive',assertion_type:'reported',review_status:'pending'
   });
  }
 }
 return out;
}
var api=Object.freeze({candidates,date});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_LAB_RULES_V672=api;
})(typeof window!=='undefined'?window:globalThis);