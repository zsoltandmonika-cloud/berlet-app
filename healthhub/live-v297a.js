(function(){
'use strict';
/* HealthHub v1.297a — Clinical Relevance + Evidence Engine */
var REQ='hh-lena-research-v295-last',BUNDLE='hh-lena-research-v296-bundle',PACK='hh-lena-evidence-v297-pack',PFID='hh-lena-evidence-v297-drive-id';
var oldRoute=window.hhRouteLenaResearch295;

function read(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
function pk(p){return p==='m'||p==='monika'?'monika':p==='z'||p==='zsolt'?'zsolt':(localStorage.getItem('hh-profile')==='m'?'monika':'zsolt')}
function norm(s){return String(s||'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s.-]/g,' ').replace(/\s+/g,' ').trim()}
function arr(x){return Array.isArray(x)?x:[]}
function ctx(p){try{return JSON.parse(localStorage.getItem('hh-lena-context-v289-'+pk(p))||'null')}catch(e){return null}}
function amap(){return read('hh-lena-doc-drive-v294-map',{})}
function emit(n,d){try{window.dispatchEvent(new CustomEvent(n,{detail:d||{}}))}catch(e){}}
function days(a,b){var x=Date.parse(a),y=Date.parse(b);return isFinite(x)&&isFinite(y)?Math.abs(x-y)/86400000:99999}
function qtokens(q){
 var stop=new Set(['hogy','miert','mikor','volt','van','most','egy','az','es','vagy','meg','monika','zsolt','neki','nekem','olyan','keveset','keves','rol','bol','ban','ben']);
 var n=norm(q),t=n.split(' ').filter(function(x){return x.length>2&&!stop.has(x)});
 // Headache-related inflections should find explicitly head-related original reports.
 if(/\b(fejem|fej|fejfaj\w*|migren\w*)\b/.test(n)&&!t.includes('fej'))t.push('fej');
 return t;
}
function domainCats(packet){
 var d=arr(packet&&packet.route&&packet.route.domains).map(function(x){return x.id}),s=new Set();
 if(d.includes('icu'))['emergency','cardiology','general','laboratory'].forEach(function(x){s.add(x)});
 if(d.includes('cardio'))['cardiology','emergency'].forEach(function(x){s.add(x)});
 if(d.includes('lab'))s.add('laboratory');
 if(d.includes('urology'))['urology','laboratory'].forEach(function(x){s.add(x)});
 if(d.includes('ent'))s.add('ent');
 if(d.includes('ortho'))['orthopedics','rheumatology'].forEach(function(x){s.add(x)});
 return s;
}
function directScore(d,q,tk,cats){
 var title=norm(d.title),ex=norm(d.explanation&&d.explanation.summary),s=0;
 tk.forEach(function(x){if(title.includes(x))s+=7;if(ex.includes(x))s+=2});
 if(cats.has(d.category))s+=4;
 var n=norm(q);
 if(/intenziv|koma|szedacio|ebreszt|intub|extub|ujraeleszt|reanim/.test(n)){
  if(/intenziv|zaro|reanim|mento|omsz|korhaz|cardio/.test(title))s+=8;
  if(/labor|gyogyszerjavaslat|watch|ekg/.test(title)&&!/intenziv|reanim/.test(title))s-=3;
 }
 return s;
}
function refine(packet){
 if(!packet||!packet.profile)return packet;
 var c=ctx(packet.profile),docs=arr(c&&c.documents&&c.documents.index),tk=qtokens(packet.question),cats=domainCats(packet),map=amap();
 if(!docs.length)return packet;
 var first=docs.map(function(d){return{d:d,s:directScore(d,packet.question,tk,cats)}}).sort(function(a,b){return b.s-a.s||String(b.d.date||'').localeCompare(String(a.d.date||''))});
 var anchor=first[0]&&first[0].s>=7?first[0].d:null,explicit=packet.route&&packet.route.timeframe&&packet.route.timeframe.mode!=='all';
 // Temporal clustering helps reconstruct intensive-care event sequences, but can
 // falsely label unrelated lab/EKG reports as evidence for general symptoms.
 var temporalCluster=!!(anchor&&!explicit&&arr(packet.route&&packet.route.domains).some(function(x){return x.id==='icu'}));
 var scored=docs.map(function(d){
  var s=directScore(d,packet.question,tk,cats),dist=anchor&&anchor.date&&d.date?days(anchor.date,d.date):99999;
  if(temporalCluster){
   if(dist===0)s+=14;else if(dist<=3)s+=12;else if(dist<=14)s+=10;else if(dist<=45)s+=7;else if(dist<=120)s+=3;else if(dist>365)s-=8;
   if(d.date&&anchor.date&&String(d.date).slice(0,4)===String(anchor.date).slice(0,4))s+=2;
  }
  var tf=packet.route&&packet.route.timeframe||{};
  if(explicit&&d.date){if(tf.from&&d.date<tf.from)s-=10;if(tf.to&&d.date>tf.to)s-=10;if((!tf.from||d.date>=tf.from)&&(!tf.to||d.date<=tf.to))s+=10}
  var ar=d.driveArchive||(map[String(d.id)]?{fileId:map[String(d.id)].fileId,fileName:map[String(d.id)].fileName,syncedAt:map[String(d.id)].syncedAt}:null);
  if(ar&&ar.fileId)s+=1;
  return{id:d.id,date:d.date,category:d.category,title:d.title,score:s,driveArchive:ar||null,hasExplanation:!!d.explanation,anchorDistanceDays:dist<99999?Math.round(dist):null};
 }).filter(function(x){return x.score>2}).sort(function(a,b){return b.score-a.score||String(b.date||'').localeCompare(String(a.date||''))});
 // Only originals actually archived on Drive can be read by the existing v296 retriever.
 // Previously the first eight scored documents could all be local-only, hiding
 // older but relevant archived originals and falsely reporting "no Drive record".
 var accessible=scored.filter(function(d){return !!(d.driveArchive&&d.driveArchive.fileId)});
 packet.route.candidateDocuments=accessible.length?accessible.slice(0,8):scored.slice(0,8);
 packet.route.retrievalReadiness={
  relevantDocuments:scored.length,
  archivedRelevantDocuments:accessible.length,
  note:accessible.length?'archived relevant originals selected':'relevant originals are not archived or accessible from this device'
 };
 packet.route.relevance={engine:'v297',anchorDocument:anchor?{id:anchor.id,date:anchor.date,title:anchor.title}:null,temporalClustering:temporalCluster,refinedAt:new Date().toISOString()};
 write(REQ,packet);emit('healthhub:lena-research-refined',packet);return packet;
}
if(typeof oldRoute==='function'){
 window.hhRouteLenaResearch295=function(q,p){return refine(oldRoute(q,p))};
}

var CONCEPTS={
 sedation:['szedacio','szedalt','propofol','analgoszedacio','altatas','sedativ'],
 awakening:['ebreszt','kontaktal','tudat','eszmelet','gcs'],
 memory:['memoria','emleksz','emlek','rovid tavu'],
 resuscitation:['reanim','szivmegallas','kamrafibr','defibr','aed','cpr'],
 ventilation:['intub','extub','legeztet','respir'],
 infection:['pneumonia','infekcio','crp','antibiot','klebsiella','staphylococcus'],
 cardiac:['ejekcios','ef','szivelegtelenseg','kardi','ritmus','btszb','crt']
};
function pages(text){
 var out=[],re=/\[Page\s+(\d+)\]\s*([\s\S]*?)(?=\[Page\s+\d+\]|$)/g,m;
 while((m=re.exec(String(text||''))))out.push({page:Number(m[1]),text:m[2].trim()});
 return out.length?out:[{page:null,text:String(text||'')}];
}
function passages(doc,q){
 var tk=qtokens(q),qn=norm(q),out=[];
 pages(doc.text).forEach(function(pg){
  var chunks=pg.text.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÖŐÚÜŰ0-9])/).filter(function(x){return x.length>35});
  chunks.forEach(function(x){
   var n=norm(x),s=0,concepts=[];
   tk.forEach(function(t){if(n.includes(t))s+=5});
   Object.keys(CONCEPTS).forEach(function(k){var hit=CONCEPTS[k].some(function(w){return n.includes(w)});if(hit){concepts.push(k);s+=/intenziv|emleksz|memoria|koma|szedacio|ebreszt/.test(qn)?3:1}});
   if(/epikrizis|diagn|terapia/.test(n))s+=1;
   if(s>0)out.push({sourceId:doc.document.id,title:doc.document.title,date:doc.document.date,page:pg.page,score:s,concepts:concepts,text:x.trim()});
  });
 });
 return out.sort(function(a,b){return b.score-a.score}).slice(0,4);
}
function timeline(evidence){
 var out=[],seen=new Set(),re=/(20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}|\b\d{2}[.]\d{2}[.]\b)/;
 evidence.forEach(function(e){var m=e.text.match(re);if(!m)return;var k=m[1]+'|'+e.text.slice(0,90);if(seen.has(k))return;seen.add(k);out.push({dateText:m[1],sourceId:e.sourceId,title:e.title,page:e.page,text:e.text})});
 return out.slice(0,12);
}
function srcLabel(e,i){return'['+(i+1)+'] '+e.date+' · '+e.title+(e.page?' · '+e.page+'. oldal':'')}
function compose(bundle,evidence,tline){
 var qn=norm(bundle.question),lines=[],sources=[];
 var used=[];
 function addConcept(label,concept){
  var e=evidence.find(function(x){return x.concepts&&x.concepts.includes(concept)&&!used.includes(x)});if(!e)return;
  used.push(e);lines.push('• '+label+': '+e.text);sources.push(e);
 }
 if(/emleksz|memoria/.test(qn)&&/intenziv|korhaz|koma/.test(qn)){
  lines.push('A dokumentumok alapján több, egymást követő tényező magyarázhatja, hogy Mónikának kevés emléke maradt az intenzív osztályos időszakról.');
  addConcept('Súlyos kezdeti esemény','resuscitation');
  addConcept('Gyógyszeres szedáció és gépi lélegeztetés','sedation');
  addConcept('Fokozatos ébredés','awakening');
  addConcept('Dokumentált memóriazavar','memory');
  lines.push('A leletek nem jelölnek meg egyetlen kizárólagos okot. A dokumentált szívmegállás, újraélesztés, szedáció és az ezt követő lassú tudati javulás együtt olyan kórházi időszakot ír le, amelyből eleve töredékes emlékek maradhattak.');
 }else{
  lines.push('A források alapján a kérdéshez ezek a legerősebb dokumentált tények:');
  evidence.slice(0,5).forEach(function(e){lines.push('• '+e.text);sources.push(e)});
 }
 var uniq=[];sources.forEach(function(e){if(!uniq.some(function(x){return x.sourceId===e.sourceId&&x.page===e.page}))uniq.push(e)});
 return{text:lines.join('\n\n'),sources:uniq.map(srcLabel),sourceItems:uniq};
}
async function token(i){if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive kapcsolat nem érhető el.');return await window.hhGetGoogleDriveToken292(!!i)}
async function saveDrive(pack,interactive){
 var t=await token(!!interactive),id=localStorage.getItem(PFID)||'',name='HealthHub-Lena-Evidence-Pack.json';
 if(!id){
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'Private HealthHub Léna evidence and sourced answer pack',appProperties:{healthhub:'lena-evidence-pack',schema:'1.0'}})});
  if(!cr.ok)throw Error('Evidence Pack létrehozási hiba ('+cr.status+')');id=(await cr.json()).id;localStorage.setItem(PFID,id);
 }
 var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime,webViewLink',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(Object.assign({},pack,{driveMirror:{mirroredAt:new Date().toISOString(),filename:name}}))});
 if(up.status===404){localStorage.removeItem(PFID);return saveDrive(pack,interactive)}
 if(!up.ok)throw Error('Evidence Pack Drive sync hiba ('+up.status+')');var j=await up.json();pack.driveMirror={fileId:j.id,fileName:j.name,modifiedTime:j.modifiedTime,webViewLink:j.webViewLink||null};write(PACK,pack);return pack;
}
async function build(bundle,interactive){
 bundle=bundle||read(BUNDLE,null);if(!bundle)throw Error('Nincs v296 forráscsomag.');
 var docs=arr(bundle.retrieval&&bundle.retrieval.documents).filter(function(x){return x.status==='ok'&&x.text});
 var ev=[];docs.forEach(function(d){ev=ev.concat(passages(d,bundle.question))});
 ev=ev.sort(function(a,b){return b.score-a.score});
 var seen=new Set();ev=ev.filter(function(e){var k=e.sourceId+'|'+e.page+'|'+e.text.slice(0,80);if(seen.has(k))return false;seen.add(k);return true}).slice(0,12);
 var tl=timeline(ev),answer=compose(bundle,ev,tl);
 var pack={schema:'healthhub.lena.evidence-pack/1.0',createdAt:new Date().toISOString(),profile:bundle.profile,profileName:bundle.profileName,question:bundle.question,route:bundle.route,healthContextGeneratedAt:bundle.healthContext&&bundle.healthContext.generatedAt||null,evidence:ev,timeline:tl,answerDraft:answer,sources:answer.sourceItems.map(function(x){return{documentId:x.sourceId,date:x.date,title:x.title,page:x.page}})};
 write(PACK,pack);pack=await saveDrive(pack,interactive!==false);emit('healthhub:lena-evidence-complete',{pack:pack});return pack;
}
window.hhRefineLenaResearch297=refine;
window.hhBuildLenaEvidence297=function(bundle,interactive){return build(bundle,interactive)};
window.hhGetLenaEvidence297=function(){return read(PACK,null)};
window.addEventListener('healthhub:lena-retrieval-complete',function(e){var b=e.detail&&e.detail.bundle;if(b)setTimeout(function(){build(b,false).catch(function(err){emit('healthhub:lena-evidence-error',{error:String(err&&err.message||err)})})},180)});
document.documentElement.dataset.healthhubLenaEvidenceCore='1.297';
})();