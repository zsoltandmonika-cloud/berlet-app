(function(root){
'use strict';
/* Patient-local, deterministic first-pass fact candidates.
 * A candidate is only an excerpt-backed statement for human review,
 * NOT a diagnosis, clinical interpretation, or verification.
 */
function norm(v){return String(v||'').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function parseDate(fragment){
 var m=String(fragment||'').match(/\b(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})(?!\d)/);
 if(!m)return null;
 var y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
 var dt=new Date(Date.UTC(y,mo-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;
 return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function candidates(pageText){
 var text=String(pageText||''),lines=[...text.matchAll(/[^\r\n]+/g)],out=[],seen=new Set();
 function add(kind,date,excerpt,value,number,unit){
  if(!date||!excerpt||excerpt.length>1200||!text.includes(excerpt))return;
  var types={
   vf:{label:'Kamrafibrilláció miatti reanimáció',type:'clinical_event'},
   cath:{label:'Coronarographia',type:'procedure'},
   device:{label:'CRT-D beültetés',type:'procedure'},
   ef:{label:'Bal kamrai ejekciós frakció (EF)',type:'cardiac'}
  };
  var rule=types[kind];if(!rule)return;
  var label=rule.label+' ('+date+')';
  var key=kind+'|'+date+'|'+(number==null?'':number);
  if(seen.has(key))return;
  seen.add(key);
  out.push({rule:kind,fact_type:rule.type,label,observed_date:date,
   value_text:value,value_number:number==null?null:number,
   original_unit:unit||null,excerpt,extraction_method:'embedded_text',
   time_precision:'day',polarity:'positive',assertion_type:'historical',review_status:'pending'});
 }
 for(var i=0;i<lines.length;i++){
  var raw=lines[i][0],n=norm(raw),dt=parseDate(raw);
  if(dt&&(/kamrafibrillacio.{0,50}miatt.{0,30}reanimac/.test(n)||
      /kamrafibrillacio.{0,50}miatt.{0,30}ujraeleszt/.test(n))&&
      !/nem tortent|tervezett|kizarhato|gyanu|kerdeses/.test(n)){
   add('vf',dt,raw.slice(0,850),'Leletben dokumentált reanimáció kamrafibrilláció miatt.',null,null);
  }
  var coronary=/(?:^|\s)(?:33110\s+)?coronarographia\b/.test(n);
  if(coronary&&!/tervezett|javasolt|celjabol|elojegyz/.test(n)){
   // Explicit procedure date on this row, OR in the paired "operation time" row.
   var next=lines[i+1]?.[0]||'',nextN=norm(next);
   var date=dt||(/mutet ideje|beavatkozas ideje/.test(nextN)?parseDate(next):null);
   if(date&&(dt||/mutet neme|beavatkozas|33110/.test(n))){
    var excerpt=dt?raw.slice(0,850):(raw+'\n'+next).slice(0,850);
    if(text.includes(excerpt))
     add('cath',date,excerpt,'A leletben coronarographia dokumentált beavatkozásként szerepel.',null,null);
   }
  }
  if(dt&&/(crt[\s-]?d|cardioverter.defibrillator)/.test(n)&&
     /(beultet|implant)/.test(n)&&!/tervezett|javasolt|elokeszit|indikacio/.test(n)){
   add('device',dt,raw.slice(0,850),'A lelet CRT-D beültetést dokumentál.',null,null);
  }
  if(dt&&/(\bef\b|ejekcios frakcio)/.test(n)&&
     !/tervezett|javasolt|gyanu|becsult/.test(n)){
   var ef=n.match(/\bef\s*[:=]?\s*(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\s*%/);
   if(ef){
    var x=Number(ef[1]);
    // No interpretation and no silent choice from an EF range.
    if(x>=5&&x<=85&&!/[-–]/.test(ef[0]))
     add('ef',dt,raw.slice(0,850),'A leletben megadott EF-érték.',x,'%');
   }
  }
 }
 return out;
}
const api=Object.freeze({candidates,parseDate});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_FACT_RULES_V670=api;
})(typeof window!=='undefined'?window:globalThis);
