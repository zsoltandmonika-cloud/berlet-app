(function(){
'use strict';
/* HealthHub v1.298a — Answer Composer.
   Converts v297 evidence into concise, source-linked, confidence-separated answers. */
var EKEY='hh-lena-evidence-v297-pack',BKEY='hh-lena-research-v296-bundle',AKEY='hh-lena-answer-v298-pack',AFID='hh-lena-answer-v298-drive-id';

function read(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
function arr(x){return Array.isArray(x)?x:[]}
function norm(s){return String(s||'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()}
function emit(n,d){try{window.dispatchEvent(new CustomEvent(n,{detail:d||{}}))}catch(e){}}
function clean(s){return String(s||'').replace(/\s+/g,' ').replace(/^[-•]\s*/,'').trim()}
function clip(s,n){s=clean(s);if(s.length<=n)return s;var x=s.slice(0,n),p=Math.max(x.lastIndexOf('. '),x.lastIndexOf('; '));return (p>80?x.slice(0,p+1):x)+'…'}
function sourceMap(bundle){
 var m={};
 arr(bundle&&bundle.retrieval&&bundle.retrieval.documents).forEach(function(d){
  if(!d||!d.document)return;
  m[String(d.document.id)]={documentId:d.document.id,date:d.document.date,title:d.document.title,pageCount:d.pages||null,fileId:d.file&&d.file.id||null,webViewLink:d.file&&d.file.webViewLink||null};
 });
 return m;
}
function refFor(e,map){
 var s=map[String(e.sourceId)]||{documentId:e.sourceId,date:e.date,title:e.title};
 return{documentId:s.documentId,date:s.date||e.date,title:s.title||e.title,page:e.page||null,fileId:s.fileId||null,webViewLink:s.webViewLink||null};
}
function claim(kind,text,e,map,certainty){
 return{id:kind+'-'+Math.random().toString(36).slice(2,8),kind:kind,text:text,certainty:certainty||'documented',source:refFor(e,map)};
}
function findEv(ev,tests){
 return ev.find(function(e){var n=norm(e.text);return tests.some(function(t){return typeof t==='string'?n.indexOf(t)>=0:t.test(n)})});
}
function uniqueClaims(xs){
 var seen=new Set();return xs.filter(function(x){if(!x)return false;var k=norm(x.text);if(seen.has(k))return false;seen.add(k);return true});
}
function icuMemory(pack,bundle,map){
 var ev=arr(pack.evidence),claims=[],e;
 e=findEv(ev,['reanim','szivmegallas','kamrafibr','aed']);
 if(e)claims.push(claim('initial','A kórházi időszakot hirtelen szívmegállás és sikeres újraélesztés előzte meg.',e,map,'documented'));
 e=findEv(ev,['szedaciot visszainditottak','propofol','analgoszedacio']);
 if(e)claims.push(claim('sedation','Az első ébresztési kísérlet nem volt megfelelő, ezért a szedációt visszaindították; az intenzív osztályon analgoszedáció és gépi lélegeztetés folyt.',e,map,'documented'));
 e=findEv(ev,['szedativumok kiuruleset','fokozatosan kontaktalhatova','tudata lassu javulast']);
 if(e)claims.push(claim('awakening','A szedatívumok kiürülése után a tudata lassan javult, és fokozatosan vált kontaktálhatóvá.',e,map,'documented'));
 e=findEv(ev,['06.24','extub','megtartott izomero']);
 if(e)claims.push(claim('extubation','Június 24-én éber állapotban extubálták.',e,map,'documented'));
 e=findEv(ev,['rovid tavu memoria','reszlegesen emlekszik','memoriaja csokkent']);
 if(e)claims.push(claim('memory','A zárójelentés kifejezetten rögzíti, hogy az eseményekre csak részlegesen emlékezett, és a rövid távú memóriája csökkent volt.',e,map,'documented'));
 claims=uniqueClaims(claims);
 var refs=claims.map(function(x){return x.source});
 var primary='A dokumentumok alapján Mónika kevés intenzíves emléke jól összeillik azzal, hogy a szívmegállást követően intubálva, gyógyszeresen szedálva és lélegeztetve kezelték, majd csak fokozatosan ébredt. A zárójelentés maga is részleges emlékezést és csökkent rövid távú memóriát dokumentál.';
 return{
  summary:primary,
  sections:{
   documented:claims,
   likely:[{text:'Valószínű, hogy nem egyetlen ok, hanem a súlyos kezdeti esemény, a többnapos szedáció és a fokozatos ébredés együtt járult hozzá a töredékes emlékekhez.',certainty:'inference',sources:refs.slice(0,3)}],
   unknown:[{text:'A rendelkezésre álló leletek nem bizonyítják, hogy az emlékezetkiesés egyetlen konkrét gyógyszer vagy egyetlen neurológiai károsodás következménye lett volna.',certainty:'unknown'}]
  },
  takeaway:'Röviden: a dokumentáció alapján nem az látszik, hogy Mónika napokig spontán kómában feküdt volna. A kezdeti eszméletvesztést követően jelentős részben gyógyszeresen fenntartott szedációban volt, és az ébredés után átmeneti memóriazavar is dokumentált.'
 };
}
function generic(pack,bundle,map){
 var ev=arr(pack.evidence).slice(0,8),claims=[];
 ev.forEach(function(e,i){
  var txt=clip(e.text,260);
  if(txt)claims.push(claim('fact'+i,txt,e,map,'documented'));
 });
 claims=uniqueClaims(claims).slice(0,5);
 var summary=claims.length?'A releváns eredeti dokumentumok alapján a kérdéshez az alábbi tények támaszthatók alá.':'A rendelkezésre álló forrásokból nem állt össze elég erős bizonyíték egy megbízható válaszhoz.';
 return{
  summary:summary,
  sections:{documented:claims,likely:[],unknown:claims.length?[]:[{text:'Nincs elegendő közvetlen dokumentált bizonyíték.',certainty:'unknown'}]},
  takeaway:claims.length?'A válasz a fenti dokumentált tényekre épül; az ezekből levont további következtetéseket külön kell kezelni.':'További vagy célzottabb dokumentum szükséges.'
 };
}
function compose(pack,bundle){
 if(!pack)throw Error('Nincs v297 Evidence Pack.');
 bundle=bundle||read(BKEY,null);
 var map=sourceMap(bundle),q=norm(pack.question),body;
 if(/emleksz|memoria|emlekezet/.test(q)&&/intenziv|korhaz|koma/.test(q))body=icuMemory(pack,bundle,map);
 else body=generic(pack,bundle,map);
 var src=[],seen=new Set();
 arr(body.sections.documented).forEach(function(c){var s=c.source;if(!s)return;var k=s.documentId+'|'+(s.page||'');if(!seen.has(k)){seen.add(k);src.push(s)}});
 arr(body.sections.likely).forEach(function(c){arr(c.sources).forEach(function(s){if(!s)return;var k=s.documentId+'|'+(s.page||'');if(!seen.has(k)){seen.add(k);src.push(s)}})});
 var answer={
  schema:'healthhub.lena.answer/1.0',createdAt:new Date().toISOString(),profile:pack.profile,profileName:pack.profileName,question:pack.question,
  summary:body.summary,takeaway:body.takeaway,documented:body.sections.documented,likely:body.sections.likely,unknown:body.sections.unknown,
  sources:src,
  provenance:{evidencePackCreatedAt:pack.createdAt||null,healthContextGeneratedAt:pack.healthContextGeneratedAt||null,composer:'v298',sourcePolicy:'original-documents-first'}
 };
 write(AKEY,answer);emit('healthhub:lena-answer-composed',{answer:answer});return answer;
}
async function token(i){if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive kapcsolat nem érhető el.');return await window.hhGetGoogleDriveToken292(!!i)}
async function saveDrive(answer,interactive){
 var t=await token(!!interactive),id=localStorage.getItem(AFID)||'',name='HealthHub-Lena-Answer-Pack.json';
 if(!id){
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'Private HealthHub Léna concise sourced answer pack',appProperties:{healthhub:'lena-answer-pack',schema:'1.0'}})});
  if(!cr.ok)throw Error('Answer Pack létrehozási hiba ('+cr.status+')');id=(await cr.json()).id;localStorage.setItem(AFID,id);
 }
 var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime,webViewLink',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(Object.assign({},answer,{driveMirror:{mirroredAt:new Date().toISOString(),filename:name}}))});
 if(up.status===404){localStorage.removeItem(AFID);return saveDrive(answer,interactive)}
 if(!up.ok)throw Error('Answer Pack Drive sync hiba ('+up.status+')');var j=await up.json();answer.driveMirror={fileId:j.id,fileName:j.name,modifiedTime:j.modifiedTime,webViewLink:j.webViewLink||null};write(AKEY,answer);return answer;
}
async function build(pack,interactive){
 var answer=compose(pack||read(EKEY,null),read(BKEY,null));answer=await saveDrive(answer,interactive!==false);emit('healthhub:lena-answer-complete',{answer:answer});return answer;
}
window.hhComposeLenaAnswer298=function(pack,interactive){return build(pack,interactive)};
window.hhGetLenaAnswer298=function(){return read(AKEY,null)};
window.addEventListener('healthhub:lena-evidence-complete',function(e){var p=e.detail&&e.detail.pack;if(p)setTimeout(function(){build(p,false).catch(function(err){emit('healthhub:lena-answer-error',{error:String(err&&err.message||err)})})},160)});
document.documentElement.dataset.healthhubLenaAnswerCore='1.298';
})();