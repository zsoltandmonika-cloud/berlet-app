(function(){
'use strict';
/* HealthHub v1.295a — Léna Research Router core. No LLM/API required. */
var REQ='hh-lena-research-v295-last',FID='hh-lena-research-v295-drive-id';
function pk(p){if(p==='m'||p==='monika')return'monika';if(p==='z'||p==='zsolt')return'zsolt';return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pn(p){return pk(p)==='monika'?'Mónika':'Zsolt'}
function norm(s){return String(s||'').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9áéíóöőúüű\s.-]/gi,' ').replace(/\s+/g,' ').trim()}
function arr(x){return Array.isArray(x)?x:[]}
function ctx(p){try{return JSON.parse(localStorage.getItem('hh-lena-context-v289-'+pk(p))||'null')}catch(e){return null}}
function amap(){try{return JSON.parse(localStorage.getItem('hh-lena-doc-drive-v294-map')||'{}')||{}}catch(e){return{}}}
function today(){var d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),x=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+x}
function isoDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function ago(days){var d=new Date();d.setDate(d.getDate()-days);return isoDate(d)}
function timeframe(q){
 var n=norm(q),r={mode:'all',from:null,to:null,label:'teljes előzmény',years:[]},m;
 var ys=n.match(/\b(20\d{2})\b/g)||[];r.years=Array.from(new Set(ys));
 if((m=n.match(/\b(20\d{2})[-.\/ ](0?[1-9]|1[0-2])[-.\/ ]([0-2]?\d|3[01])\b/))){var mm=String(m[2]).padStart(2,'0'),dd=String(m[3]).padStart(2,'0');r.mode='date';r.from=r.to=m[1]+'-'+mm+'-'+dd;r.label=r.from;return r}
 if(/72\s*ora|3\s*nap|harom\s*nap/.test(n)){r.mode='recent';r.from=ago(3);r.to=today();r.label='utolsó 72 óra';return r}
 if(/7\s*nap|egy\s*het|utobbi\s*het|mult\s*het/.test(n)){r.mode='recent';r.from=ago(7);r.to=today();r.label='utolsó 7 nap';return r}
 if(/30\s*nap|egy\s*honap|utobbi\s*honap/.test(n)){r.mode='recent';r.from=ago(30);r.to=today();r.label='utolsó 30 nap';return r}
 if(/90\s*nap|3\s*honap|harom\s*honap/.test(n)){r.mode='recent';r.from=ago(90);r.to=today();r.label='utolsó 90 nap';return r}
 if(/ma\b|mai\b/.test(n)){r.mode='date';r.from=r.to=today();r.label='ma';return r}
 if(/tegnap/.test(n)){r.mode='date';r.from=r.to=ago(1);r.label='tegnap';return r}
 if(/mostanaban|mostani|jelenleg|aktual|friss|most\b/.test(n)){r.mode='recent';r.from=ago(30);r.to=today();r.label='jelenlegi / utolsó 30 nap';return r}
 if(r.years.length){r.mode='year';r.from=Math.min.apply(null,r.years.map(Number))+'-01-01';r.to=Math.max.apply(null,r.years.map(Number))+'-12-31';r.label=r.years.join(', ');return r}
 return r;
}
var DOMAINS=[
 {id:'icu',label:'intenzív / kórházi esemény',kw:['intenziv','korhaz','zaro','zarojelentes','coma','koma','szedacio','altatas','intub','extubal','ujraeleszt','reanim','eszmelet','neurolog','osztaly'],cats:['emergency','cardiology','general'],src:['documents','medications']},
 {id:'cardio',label:'szív és kardiológia',kw:['sziv','kardio','ef','ejekcios','ritmus','crt','icd','defibr','kamrafibr','pulzus','heart','ekg','szivelegtelenseg'],cats:['cardiology','emergency'],src:['documents','heartRate','bloodPressure','medications']},
 {id:'bp',label:'vérnyomás',kw:['vernyomas','szisztoles','diasztoles','hgmm'],cats:['cardiology','general'],src:['bloodPressure','heartRate','medications','documents']},
 {id:'sleep',label:'alvás',kw:['alvas','aludt','ebred','ebredes','horkol'],cats:['general'],src:['sleep','heartRate','oxygen']},
 {id:'activity',label:'aktivitás',kw:['aktivitas','lepes','seta','futas','mozgas','edzes','kaloria'],cats:['general','cardiology'],src:['activity','heartRate','weight']},
 {id:'weight',label:'testsúly / testösszetétel',kw:['testsuly','suly','kg','zsir','bodyfat','testzsir','fogy','hizas'],cats:['endocrinology','general','cardiology'],src:['weight','activity','medications','documents']},
 {id:'lab',label:'labor',kw:['labor','verkep','crp','kreatinin','egfr','bilirubin','enzim','koleszterin','hemoglobin','vizelet','tenyesztes'],cats:['laboratory'],src:['documents']},
 {id:'glucose',label:'vércukor',kw:['vercukor','glukoz','cukor','diabetes'],cats:['laboratory','endocrinology'],src:['glucose','documents','medications']},
 {id:'oxygen',label:'oxigén / légzés',kw:['oxigen','spo2','szaturacio','legzes','legszomj','tudo','pneumonia'],cats:['emergency','general','cardiology'],src:['oxygen','heartRate','documents']},
 {id:'meds',label:'gyógyszerek',kw:['gyogyszer','tabletta','adag','entresto','concor','forxiga','spirono','tolura','bisoprolol','enalapril','antibiotikum'],cats:['cardiology','general'],src:['medications','documents']},
 {id:'ent',label:'fül-orr-gégészet',kw:['orr','ful','sinus','orrdugulas','allergia','gege'],cats:['ent'],src:['documents','medications']},
 {id:'urology',label:'urológia',kw:['urolog','vizelet','hugy','prosztata','meatus'],cats:['urology','laboratory'],src:['documents','medications']},
 {id:'ortho',label:'mozgásszervi',kw:['ortoped','reuma','vall','ujj','izulet','fajdalom'],cats:['orthopedics','rheumatology'],src:['documents','medications']}
];
var STOP=new Set(['hogy','miert','mikor','volt','van','most','es','vagy','egy','az','a','de','is','meg','mit','milyen','monika','zsolt','nekem','neki','szerint','lehet','tudod','nezd','megnezned','kerlek']);
function tokens(q){
 var n=norm(q),t=n.split(' ').filter(function(x){return x.length>2&&!STOP.has(x)});
 // Hungarian colloquial symptom: "fáj a fejem" vs indexed "fejfájás".
 // Boost only head-related terms, never arbitrary "pain" documents.
 if(/\b(fejem|fej|fejfaj\w*|migren\w*)\b/.test(n)&&!t.includes('fej'))t.push('fej');
 return t;
}
function detectProfile(q,f){var n=norm(q);if(/\bmonika\b/.test(n))return'monika';if(/\bzsolt\b/.test(n))return'zsolt';return pk(f)}
function domains(q){var n=norm(q),out=[];DOMAINS.forEach(function(d){var hit=d.kw.filter(function(k){return n.indexOf(k)>=0}).length;if(hit)out.push({id:d.id,label:d.label,score:hit,cats:d.cats,src:d.src})});return out.sort(function(a,b){return b.score-a.score})}
function inRange(d,t){if(!d)return t.mode==='all';if(t.from&&String(d)<t.from)return false;if(t.to&&String(d)>t.to)return false;return true}
function candidates(c,q,ds,t,p){
 var docs=arr(c&&c.documents&&c.documents.index),tk=tokens(q),cats=new Set();ds.forEach(function(d){d.cats.forEach(function(x){cats.add(x)})});var map=amap();
 return docs.map(function(d){
  var s=0,title=norm(d.title),ex=norm(d.explanation&&d.explanation.summary),date=d.date||'';
  if(t.mode!=='all'){if(inRange(date,t))s+=8;else if(t.mode==='year')s-=5}
  if(cats.has(d.category))s+=7;
  tk.forEach(function(x){if(title.indexOf(x)>=0)s+=4;if(ex.indexOf(x)>=0)s+=2});
  ds.forEach(function(x){if(title.indexOf(norm(x.label).split(' ')[0])>=0)s+=1});
  var ar=d.driveArchive||(map[String(d.id)]?{fileId:map[String(d.id)].fileId,fileName:map[String(d.id)].fileName,syncedAt:map[String(d.id)].syncedAt}:null);
  return{id:d.id,date:date,category:d.category,title:d.title,score:s,driveArchive:ar||null,hasExplanation:!!d.explanation};
 }).filter(function(x){return x.score>0}).sort(function(a,b){return b.score-a.score||String(b.date).localeCompare(String(a.date))}).slice(0,8);
}
function analyze(question,forcedProfile){
 var q=String(question||'').trim();if(!q)throw Error('A kérdés üres.');
 var p=detectProfile(q,forcedProfile),c=ctx(p),t=timeframe(q),ds=domains(q),src=new Set(['healthContext']);
 ds.forEach(function(d){d.src.forEach(function(x){src.add(x)})});
 if(/lelet|dokument|korhaz|regen|korabban|elozmeny|tortent|mutet|vizsgalat|eredmeny|zarojelentes/.test(norm(q))||t.mode==='year')src.add('documents');
 if(!ds.length){src.add('documents');src.add('measurements')}
 var cand=candidates(c,q,ds,t,p);
 var packet={
  schema:'healthhub.lena.research-request/1.0',
  createdAt:new Date().toISOString(),profile:p,profileName:pn(p),question:q,
  route:{timeframe:t,domains:ds.map(function(d){return{id:d.id,label:d.label,score:d.score}}),sources:Array.from(src),requiresOriginalDocuments:src.has('documents'),candidateDocuments:cand},
  context:{generatedAt:c&&c.generatedAt||null,healthConnect:c&&c.healthConnect||null,documentCount:c&&c.documents&&c.documents.count||0,signals:arr(c&&c.signals).slice(0,8)},
  instructions:[
   'A Health Contextből először a friss állapotot és trendeket ellenőrizd.',
   src.has('documents')?'A jelölt eredeti dokumentumokat szükség szerint nyisd meg a Drive archívumból, ne csak a rövid összefoglalót használd.':'Dokumentum megnyitása csak akkor szükséges, ha a kérdés közben történeti információ kell.',
   'Az időpontokat és mérések dátumát mindig külön kezeld: a legutóbbi érték nem feltétlenül friss.',
   'Egészségügyi következtetésnél különítsd el a dokumentált tényt, az összefüggést és a bizonytalan magyarázatot.',
   'A válaszban nevezd meg a felhasznált eredeti leleteket és dátumokat.'
  ]
 };
 localStorage.setItem(REQ,JSON.stringify(packet));
 try{window.dispatchEvent(new CustomEvent('healthhub:lena-research-routed',{detail:packet}))}catch(e){}
 return packet;
}
async function mirror(packet,interactive){
 if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive kapcsolat nem érhető el.');
 var token=await window.hhGetGoogleDriveToken292(!!interactive),id=localStorage.getItem(FID)||'',name='HealthHub-Lena-Research-Request.json';
 if(!id){
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'Private HealthHub Léna research request',appProperties:{healthhub:'lena-research-request',schema:'1.0'}})});
  if(!cr.ok)throw Error('Research fájl létrehozási hiba ('+cr.status+')');id=(await cr.json()).id;localStorage.setItem(FID,id);
 }
 var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime,webViewLink',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(Object.assign({},packet,{driveMirror:{mirroredAt:new Date().toISOString(),filename:name}}))});
 if(up.status===404){localStorage.removeItem(FID);return mirror(packet,interactive)}
 if(!up.ok)throw Error('Research Drive sync hiba ('+up.status+')');
 var r=await up.json();packet.driveMirror={fileId:r.id,fileName:r.name,modifiedTime:r.modifiedTime,webViewLink:r.webViewLink||null};localStorage.setItem(REQ,JSON.stringify(packet));return packet;
}
window.hhRouteLenaResearch295=analyze;
window.hhMirrorLenaResearch295=function(packet,interactive){return mirror(packet||JSON.parse(localStorage.getItem(REQ)||'null'),interactive!==false)};
window.hhGetLenaResearch295=function(){try{return JSON.parse(localStorage.getItem(REQ)||'null')}catch(e){return null}};
document.documentElement.dataset.healthhubLenaResearchCore='1.295';
})();