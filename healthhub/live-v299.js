(function(){
'use strict';
/* HealthHub v323: dedicated Ask Léna research page with honest local RAG readiness.
   The existing v289/295/296/297/298 research pipeline still owns the content.
   No medical data are sent to a public GitHub file. Google Drive handoff is opt-in. */
var PAGE='hhLenaSmart299',CSS='hh-ask-v323-style',HKEY='hh-lena-v299-handoff',HFID='hh-lena-v299-handoff-id';
var busy=false,previousPage='home',rec=null,recognitionStarted=0,recognitionHadText=false,recognitionError='',lastSpeech='',driveVerified=false,driveIssue='',driveCheckedProfile='',questionBeforeSpeech='';
function el(id){return document.getElementById(id)}
function pk(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pn(p){return p==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function getLocal(k,fallback){try{var j=JSON.parse(localStorage.getItem(k)||'null');return j===null?fallback:j}catch(e){return fallback}}
function styles(){
 if(el(CSS))return;
 var s=document.createElement('style');s.id=CSS;
 s.textContent=
 '#'+PAGE+'{--ask-accent:#0b9186;min-height:100vh;background:linear-gradient(180deg,#e9f5f6 0%,#f7fafc 260px);color:#153c59;box-sizing:border-box;padding-bottom:108px;overflow-x:hidden}'+
 '#'+PAGE+' .askHero{background:linear-gradient(135deg,#092d53,#11677a);color:white;padding:18px 16px 23px}'+
 '#'+PAGE+' .askHeroInner{max-width:820px;margin:0 auto}.askBack{border:1px solid #ffffff55;background:#ffffff20;color:white;border-radius:12px;padding:9px 13px;font-size:13px;font-weight:800}'+
 '#'+PAGE+' h1{font-size:clamp(24px,5vw,32px);line-height:1.15;margin:17px 0 7px;font-weight:900;letter-spacing:-.45px}'+
 '#'+PAGE+' .askSub{font-size:13px;line-height:1.55;margin:5px 0;color:#d7eef3}'+
 '#'+PAGE+' .askWidth{max-width:820px;margin:0 auto;padding:12px;box-sizing:border-box;display:grid;gap:12px}'+
 '#'+PAGE+' .askCard{background:#fff;border:1px solid #d9e8ed;border-radius:18px;padding:15px;box-shadow:0 6px 20px #1b536211;min-width:0}'+
 '#'+PAGE+' .askCard h2{font-size:16px;margin:0 0 9px;color:#143e5d}'+
 '#'+PAGE+' .askHint{font-size:12px;line-height:1.55;color:#58758a;margin:7px 0}'+
 '#'+PAGE+' .askProfile{display:inline-block;background:#e3f2f8;color:#194f6c;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:900}'+
 '#'+PAGE+' .askQuestion{display:block;box-sizing:border-box;width:100%;height:175px;min-height:150px;resize:vertical;border:2px solid #bbd6e0;background:#fcfeff;border-radius:15px;padding:15px;font:500 16px/1.55 system-ui,sans-serif;color:#123e5b;outline-color:#148e8c}'+
 '#'+PAGE+' .askActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}'+
 '#'+PAGE+' button{cursor:pointer;font-family:inherit}'+
 '#'+PAGE+' .askBtn{border:1px solid #bbd8de;border-radius:12px;min-height:43px;padding:11px 12px;background:#e9f4f8;color:#20506a;font-size:12px;font-weight:900;text-align:center;line-height:1.3}'+
 '#'+PAGE+' .askBtn:disabled{opacity:.5;cursor:not-allowed}'+
 '#'+PAGE+' .askBtnMain{background:#087e74;color:white;border-color:#087e74}'+
 '#'+PAGE+' .askBtnWide{grid-column:1/-1;font-size:14px;min-height:49px}'+
 '#'+PAGE+' .askBadge{display:inline-block;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:850;background:#e8eff3;color:#486477}'+
 '#'+PAGE+' .askBadge.good{background:#dcf7e9;color:#116a4d}.askBadge.warn{background:#fff1d9;color:#9a6517}.askBadge.error{background:#ffe8ea;color:#a12e43}'+
 '#'+PAGE+' .askChecks{display:grid;gap:8px;margin:11px 0}.askCheck{display:flex;align-items:flex-start;gap:10px;border:1px solid #e4edf0;border-radius:12px;padding:10px 11px;background:#fbfdfe}'+
 '#'+PAGE+' .askCheck .askCheckIcon{font-size:17px;line-height:1.25}.askCheck strong{display:block;font-size:12px;color:#17425f}'+
 '#'+PAGE+' .askCheck span{display:block;font-size:11px;color:#607989;line-height:1.45;margin-top:2px}'+
 '#'+PAGE+' .askConsent{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.5;color:#325a71;margin-top:12px}'+
 '#'+PAGE+' .askConsent input{width:19px;height:19px;accent-color:#0e897f;flex:none;margin-top:1px}'+
 '#'+PAGE+' .askProgress{display:none;background:#f1faf8;border:1px solid #d0e9e3;border-radius:14px;padding:12px 14px;margin-top:12px;font-size:12px;color:#215970;line-height:1.5}'+
 '#'+PAGE+' .askProgress.on{display:block}.askProgress h3{font-size:14px;margin:0 0 6px;color:#174966}'+
 '#'+PAGE+' .askProgress.done{background:#e8f8ed;border-color:#b9e7cd}.askProgress.fail{background:#fff1ef;border-color:#f1c6be}'+
 '#'+PAGE+' .askBar{height:7px;background:#dce9ee;border-radius:99px;margin:9px 0;overflow:hidden}.askBar i{display:block;height:100%;width:0;background:#0b9186;transition:width .2s}'+
 '#'+PAGE+' .askMore{display:none;margin-top:9px}#'+PAGE+' .askMore.on{display:grid;gap:8px}'+
 '#'+PAGE+' .askFooter{font-size:11px;line-height:1.55;color:#617e8a;margin:0}'+
 '@media(max-width:350px){#'+PAGE+' .askActions{grid-template-columns:1fr}#'+PAGE+' .askBtnWide{grid-column:1}}';
 document.head.appendChild(s);
}
function markup(){
 return '<div class="askHero"><div class="askHeroInner"><button type="button" class="askBack" id="askBack323">‹ Vissza</button>'+
  '<h1>🧠 Ask Léna</h1><p class="askSub">Személyes kutatási központ · kérdés, források, RAG-előkészítés és ChatGPT-átadás</p>'+
  '<span class="askProfile" id="hhSP299">Aktív profil: '+esc(pn(pk()))+'</span></div></div>'+
  '<div class="askWidth"><div class="askCard"><h2>✍️ Mit szeretnél megkérdezni?</h2>'+
  '<textarea id="hhSQ299" class="askQuestion" aria-label="Kérdés Lénának" placeholder="Írd ide a kérdésed…\nPéldául: Miért lehetnek hiányosak az intenzív osztályon töltött napok emlékei?"></textarea>'+
  '<p class="askHint">Írhatsz, vagy megpróbálhatod a diktálást. A böngésző hangfelismerése készülékenként eltérően működik.</p>'+
  '<div class="askActions"><button type="button" class="askBtn askBtnMain askBtnWide" id="hhRun299">📚 Kutatás + ChatGPT-átadás</button>'+
  '<button type="button" class="askBtn" id="hhMic299">🎙️ Diktálás</button>'+
  '<button type="button" class="askBtn" id="hhPlain299">💬 Csak ChatGPT</button></div>'+
  '<p class="askHint" id="askSpeech323" role="status"></p>'+
  '<label class="askConsent"><input type="checkbox" id="askConsent323"><span>Engedélyezem, hogy a kiválasztott profil releváns egészségügyi forrásai és a kutatásból származó válaszcsomag a saját Google Drive-területemen tárolódjanak a ChatGPT-átadáshoz. A ChatGPT-ben történő további feldolgozást külön indítom.</span></label>'+
  '<div class="askProgress" id="hhProg299" role="status" aria-live="polite"><h3 id="hhStep299">Várakozás…</h3><div class="askBar"><i></i></div><span id="hhTxt299"></span>'+
  '<div class="askMore" id="askMore323"><button type="button" class="askBtn" id="askCopy323">📋 Handoff-utasítás másolása</button>'+
  '<button type="button" class="askBtn askBtnMain" id="askChat323">↗ ChatGPT megnyitása</button></div></div></div>'+
  '<div class="askCard"><h2>🔎 RAG · kutatási készültség <span id="askOverall323" class="askBadge warn">Ellenőrzés alatt</span></h2>'+
  '<p class="askHint">A RAG itt a helyi egészségügyi dokumentum-indexből kiválasztott, majd Google Drive-ból ténylegesen beolvasott forrásokra épül. A zöld jelzés csak ellenőrzött hozzáférést jelent, nem azt, hogy minden lelet teljes vagy az AI már megnyílt.</p>'+
  '<div id="askChecks323" class="askChecks"></div>'+
  '<div class="askActions"><button type="button" class="askBtn" id="askRefresh323">↻ Állapot frissítése</button>'+
  '<button type="button" class="askBtn" id="askDrive323">🔐 Drive-kapcsolat tesztje</button></div></div>'+
  '<p class="askFooter">Az összefoglaló tájékoztató jellegű; nem helyettesít orvosi vizsgálatot. A ChatGPT-átadás nem automatikus API-integráció: a Drive-fájlok eléréséhez a ChatGPT-ben megfelelő csatlakozás és jóváhagyás szükséges.</p></div>';
}
function ensure(){
 styles();var p=el(PAGE);if(p)return p;
 p=document.createElement('section');p.id=PAGE;p.className='page';
 p.innerHTML=markup();
 (document.querySelector('.app')||document.body).appendChild(p);
 el('askBack323').addEventListener('click',close);
 el('hhRun299').addEventListener('click',run);
 el('hhMic299').addEventListener('click',mic);
 el('hhPlain299').addEventListener('click',plainChat);
 el('askRefresh323').addEventListener('click',refresh);
 el('askDrive323').addEventListener('click',testDrive);
 el('askCopy323').addEventListener('click',copyPrompt);
 el('askChat323').addEventListener('click',launchChatGPT);
 if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){
  el('hhMic299').disabled=true;
  el('askSpeech323').textContent='Ez a böngésző nem támogatja a webes diktálást. Androidon a billentyűzet mikrofonja használható helyette.';
 }
 refresh();
 return p;
}
function open(){
 var page=ensure(),old=document.querySelector('.page.on');
 if(old&&old.id!==PAGE)previousPage=old.id;
 document.querySelectorAll('.page').forEach(function(n){n.classList.remove('on')});
 page.classList.add('on');
 ['navTimelineBar','navHomeBar','navDetailBar'].forEach(function(id){var n=el(id);if(n)n.style.display='none'});
 var nav=el('navHealthBar');if(nav)nav.style.display='grid';
 var prof=el('hhSP299');if(prof)prof.textContent='Aktív profil: '+pn(pk());
 refresh();window.scrollTo(0,0);
}
function stopMic(){
 if(!rec)return;
 try{rec.stop()}catch(e){}
 rec=null;
}
function close(){
 if(busy)return;
 stopMic();var p=el(PAGE);if(p)p.classList.remove('on');
 if(previousPage==='hhDailyHealth312'&&window.HH_DAILY_HEALTH_V312&&window.HH_DAILY_HEALTH_V312.open)window.HH_DAILY_HEALTH_V312.open();
 else if(typeof window.show==='function')window.show(previousPage||'home');
 else {var h=el(previousPage)||el('home');if(h)h.classList.add('on')}
}
function checks(){
 var p=pk(),context=getLocal('hh-lena-context-v289-'+p,null);
 var docs=Array.isArray(context?.documents?.index)?context.documents.index:[];
 var archive=getLocal('hh-lena-doc-drive-v294-map',{}),mapped=docs.filter(function(d){
  var item=archive[String(d.id)];return !!(d?.driveArchive?.fileId||(item&&item.fileId))
 }).length;
 var modules=[
  ['Health Context',typeof window.hhRefreshLenaHealthContext289==='function'],
  ['Research Router',typeof window.hhRouteLenaResearch295==='function'],
  ['Document Retrieval',typeof window.hhPrepareLenaResearchBundle296==='function'],
  ['Evidence Engine',typeof window.hhBuildLenaEvidence297==='function'],
  ['Answer Composer',typeof window.hhComposeLenaAnswer298==='function'],
  ['Drive handoff',typeof window.hhGetGoogleDriveToken292==='function']
 ];
 var okMods=modules.every(function(m){return m[1]});
 if(driveCheckedProfile!==p){driveVerified=false;driveIssue='';driveCheckedProfile=p}
 var c=[
  {label:'Kutatási modulok',ok:okMods,maybe:false,detail:modules.filter(function(m){return !m[1]}).map(function(x){return x[0]}).join(', ')||'6/6 komponens betöltve'},
  {label:'Helyi Health Context',ok:!!context,maybe:false,detail:context?'Profilkontextus található; '+(context.generatedAt||'dátum nélkül'):'Még nem készült profilkontextus ezen az eszközön'},
  {label:'Dokumentum-index',ok:docs.length>0,maybe:false,detail:docs.length+' helyi dokumentum bejegyzés'},
  {label:'Drive-on archivált források',ok:mapped>0,maybe:false,detail:mapped+' / '+docs.length+' dokumentumhoz van Drive-hivatkozás'},
  {label:'Google Drive olvasási kapcsolat',ok:driveVerified,maybe:!driveIssue,detail:driveVerified?'Tényleges Drive API-kérés és archivált forrás ellenőrzése sikeres, ha van hivatkozás':driveIssue||'Nincs ezen a lapon ellenőrizve; kattints a Drive-kapcsolat tesztje gombra'}
 ];
 return {checks:c,ready:c.every(function(x){return x.ok}),docs:docs.length,mapped:mapped,context:context};
}
function refresh(){
 if(!el('askChecks323'))return;
 var p=pk(),data=checks(),o=el('askOverall323');
 o.className='askBadge '+(data.ready?'good':data.checks.some(function(x){return !x.ok&&!x.maybe})?'error':'warn');
 o.textContent=data.ready?'✅ Kutatásra kész':'⚠ Ellenőrzés / előkészítés szükséges';
 el('askChecks323').innerHTML=data.checks.map(function(x){
  return '<div class="askCheck"><div class="askCheckIcon">'+(x.ok?'✅':x.maybe?'🔎':'⚠️')+'</div><div><strong>'+esc(x.label)+'</strong><span>'+esc(x.detail)+'</span></div></div>'
 }).join('');
 var prof=el('hhSP299');if(prof)prof.textContent='Aktív profil: '+pn(p);
}
async function testDrive(){
 if(busy)return;
 var b=el('askDrive323');b.disabled=true;b.textContent='🔄 Google Drive teszt…';
 driveVerified=false;driveIssue='';
 try{
  if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive OAuth komponens nem érhető el');
  var access=await window.hhGetGoogleDriveToken292(true);
  if(!access)throw Error('A Drive nem adott hozzáférési tokent');
  var response=await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)',{
   headers:{Authorization:'Bearer '+access},cache:'no-store'
  });
  if(!response.ok)throw Error('Drive API HTTP '+response.status+'; ellenőrizd a Google-fiókot és a jogosultságokat');
  var data=checks(),ctx=data.context,docs=ctx?.documents?.index||[],map=getLocal('hh-lena-doc-drive-v294-map',{});
  var sample=docs.map(function(d){return d?.driveArchive?.fileId||map[String(d.id)]?.fileId}).find(Boolean);
  if(sample){
   var checkFile=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(sample)+'?fields=id,name,mimeType',{headers:{Authorization:'Bearer '+access},cache:'no-store'});
   if(!checkFile.ok)throw Error('A dokumentum-archívum egyik ellenőrzött fájlja nem érhető el (HTTP '+checkFile.status+'). A Drive szinkronizálását javítani kell');
  }
  driveVerified=true;
  status('✅ Google Drive ellenőrizve','A hitelesített Drive API-hívás sikerült. Most ellenőrizd a RAG-lista többi sorát.',100,'done');
 }catch(e){
  driveIssue=String(e?.message||e);
  status('⚠ Drive-kapcsolat sikertelen',driveIssue+'. A korábbi Google-fiók engedélyezése önmagában nem bizonyít aktív kapcsolatot.',100,'fail');
 }finally{b.disabled=false;b.textContent='🔐 Drive-kapcsolat tesztje';refresh()}
}
function status(head,txt,percent,cls){
 var box=el('hhProg299');if(!box)return;
 box.className='askProgress on '+(cls||'');
 el('hhStep299').textContent=head;el('hhTxt299').textContent=txt||'';
 var bar=box.querySelector('.askBar i');if(bar)bar.style.width=(percent||0)+'%';
 if(cls!=='done')el('askMore323').classList.remove('on');
}
function lock(flag){
 ['hhRun299','hhMic299','hhPlain299','askDrive323'].forEach(function(id){var n=el(id);if(n)n.disabled=flag});
 var q=el('hhSQ299');if(q)q.disabled=flag;
}
function handoffInstruction(){
 return 'HealthHub kézi átadás. A csatlakoztatott Google Drive-omban keresd meg a HealthHub-Lena-Handoff.json fájlt (ha hozzáférsz), majd az abban hivatkozott HealthHub-Lena-Answer-Pack.json csomagot. Csak az adott profil releváns leleteit használd. Válaszolj magyarul a currentQuestion kérdésre, a dokumentált tényeket különítsd el a következtetésektől, és hivatkozz az eredeti leletekre. Ha a fájlok nem elérhetők, jelezd ezt, és kérd a szükséges források megosztását. Nem feltételezhető automatikus hozzáférés a Drive-hoz.';
}
async function writeClipboard(v){
 try{await navigator.clipboard.writeText(v);return true}catch(e){}
 try{var t=document.createElement('textarea');t.value=v;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();var ok=document.execCommand('copy');t.remove();return ok}catch(e){return false}
}
async function copyPrompt(){
 var ok=await writeClipboard(handoffInstruction());
 status(ok?'✅ Handoff-utasítás másolva':'⚠ Vágólap nem elérhető',ok?'A ChatGPT-ben illeszd be a szöveget. A dokumentumokhoz külön hozzáférés szükséges.':'A böngésző megakadályozta a másolást; nyisd meg a ChatGPT-t, és a Drive-ban keresd a HealthHub-Lena-Handoff.json fájlt.',100,ok?'done':'fail');
 if(ok)el('askMore323').classList.add('on');
}
function launchChatGPT(){
 try{if(typeof window.hhOpenLenaChatGPT286==='function'){window.hhOpenLenaChatGPT286();return}}catch(e){}
 window.location.href='https://chatgpt.com/';
}
async function plainChat(){
 var q=(el('hhSQ299')?.value||'').trim();
 if(q){
  var ok=await writeClipboard(q);
  status(ok?'✅ Kérdés a vágólapon':'⚠ Nem sikerült másolni',ok?'Kattints a ChatGPT megnyitása gombra, majd illeszd be a kérdésed.':'A kérdést kézzel is át tudod másolni.',100,ok?'done':'fail');
  el('askMore323').classList.add('on');
  el('askCopy323').style.display='none';
 }else{launchChatGPT()}
}
async function token(){
 if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('A Google Drive kapcsolat hiányzik');
 return await window.hhGetGoogleDriveToken292(true);
}
async function saveHandoff(h){
 var t=await token(),id=localStorage.getItem(HFID)||'',name='HealthHub-Lena-Handoff.json';
 if(!id){
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'Private HealthHub Ask Lena handoff',appProperties:{healthhub:'lena-handoff',schema:'1.0'}})});
  if(!cr.ok)throw Error('Handoff fájl létrehozás HTTP '+cr.status);
  id=(await cr.json()).id;localStorage.setItem(HFID,id);
 }
 var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime,webViewLink',{
  method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(h)
 });
 if(up.status===404){localStorage.removeItem(HFID);return saveHandoff(h)}
 if(!up.ok)throw Error('Handoff mentés HTTP '+up.status);
 var j=await up.json();h.driveMirror={fileId:j.id,fileName:j.name,modifiedTime:j.modifiedTime,webViewLink:j.webViewLink||null};
 localStorage.setItem(HKEY,JSON.stringify(h));return h;
}
async function run(){
 if(busy)return;
 var question=(el('hhSQ299').value||'').trim();
 if(!question){status('⚠ Hiányzik a kérdés','Írd be a kutatási kérdést a nagy szövegdobozba.',0,'fail');return}
 if(!el('askConsent323').checked){
  status('⚠ Külön hozzájárulás szükséges','A forráscsomag privát Google Drive-ba történő mentéséhez jelöld be a hozzájárulást. A csak ChatGPT gombhoz ez nem szükséges.',0,'fail');return;
 }
 var st=checks();
 if(!st.ready){
  status('⚠ A RAG még nincs kész','A kutatási készültség blokkban láthatók a hiányzó elemek. A Drive-kapcsolatot előbb külön teszteld; dokumentum-archívum nélkül nem lehet forrásalapú kutatást végezni.',0,'fail');refresh();return;
 }
 busy=true;lock(true);stopMic();el('askMore323').classList.remove('on');
 try{
  var p=pk();
  status('1/6 · Health Context','Az aktív profil releváns adatai frissülnek.',8,'');
  await window.hhRefreshLenaHealthContext289(p,'ask-lena-v323');
  status('2/6 · Research Router','Kérdés és dokumentumok relevancia szerinti kiválasztása.',21,'');
  var route=window.hhRouteLenaResearch295(question,p);
  var candidates=(route?.route?.candidateDocuments||[]).filter(function(d){return d?.driveArchive?.fileId});
  if(!candidates.length)throw Error('Nincs elérhető Drive-lelet ehhez a kérdéshez. Ellenőrizd a dokumentumok Drive-archiválását és a profil helyességét.');
  status('3/6 · RAG · eredeti dokumentumok','A Google Drive-források szövegének olvasása.',40,'');
  var bundle=await window.hhPrepareLenaResearchBundle296(route,true);
  if(!bundle?.retrieval?.totalExtractedChars)throw Error('Nem sikerült forrásszöveget kiolvasni. A PDF lehet szkennelt vagy a Drive nem elérhető.');
  status('4/6 · Evidence Engine','Dokumentált bizonyítékok kiválasztása.',61,'');
  var evidence=await window.hhBuildLenaEvidence297(bundle,true);
  status('5/6 · Answer Composer','Forrásolt, ellenőrizhető válaszcsomag.',78,'');
  var answer=await window.hhComposeLenaAnswer298(evidence,true);
  if(!answer?.driveMirror?.fileId)throw Error('A válaszcsomag Drive-mentése nem igazolt');
  status('6/6 · ChatGPT átadás','A privát Google Drive handoff elkészítése.',91,'');
  await saveHandoff({
   schema:'healthhub.lena.handoff/1.0',createdAt:new Date().toISOString(),profile:p,profileName:pn(p),
   currentQuestion:question,answerPackFileId:answer.driveMirror.fileId,
   answerPackFilename:'HealthHub-Lena-Answer-Pack.json',
   researchBundleFilename:'HealthHub-Lena-Research-Bundle.json',
   evidencePackFilename:'HealthHub-Lena-Evidence-Pack.json',
   instructions:'Open the linked Answer Pack via the connected Google Drive. Verify original sources and do not infer unavailable facts.'
  });
  var copied=await writeClipboard(handoffInstruction());
  status('✅ Kutatás és RAG-forráscsomag kész',copied?'A ChatGPT-indító szöveg a vágólapon. A ChatGPT-t a gombbal nyisd meg, majd illeszd be.':'A privát handoff mentve a Drive-ba. A ChatGPT-t a gombbal nyisd meg; a Drive-csatlakozást külön ellenőrizd.',100,'done');
  el('askCopy323').style.display='';el('askMore323').classList.add('on');
 }catch(e){
  console.error('HealthHub v323 Ask Léna',e);
  status('⚠ A kutatás megállt',String(e?.message||e),100,'fail');
 }finally{busy=false;lock(false);refresh()}
}
function mic(){
 var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){el('askSpeech323').textContent='A böngésző nem támogatja a mikrofonos diktálást. Használd a billentyűzet mikrofonját.';return}
 if(rec){stopMic();el('hhMic299').textContent='🎙️ Diktálás';el('askSpeech323').textContent='Diktálás leállítva.';return}
 try{
  var r=new SR();rec=r;recognitionStarted=Date.now();recognitionHadText=false;recognitionError='';lastSpeech='';
  questionBeforeSpeech=el('hhSQ299').value||'';
  r.lang='hu-HU';r.interimResults=true;r.continuous=true;
  var b=el('hhMic299');b.textContent='⏹️ Leállítás';el('askSpeech323').textContent='🎙️ A mikrofonra várunk… beszélj magyarul.';
  r.onstart=function(){el('askSpeech323').textContent='🔴 Diktálás folyamatban. A Leállítás gombbal befejezheted.'};
  r.onresult=function(evt){
   var transcript='';
   for(var i=0;i<evt.results.length;i++)transcript+=evt.results[i][0].transcript+' ';
   lastSpeech=transcript.trim();recognitionHadText=!!lastSpeech;
   var base=questionBeforeSpeech.trim();
   el('hhSQ299').value=(base?base+' ':'')+lastSpeech;
   el('askSpeech323').textContent='📝 Felismert szöveg: '+(lastSpeech||'…');
  };
  r.onerror=function(e){
   recognitionError=String(e?.error||'ismeretlen hiba');
   var tips={
    'not-allowed':'Mikrofonengedély elutasítva. Engedélyezd a Chrome/Edge mikrofont a webhelyhez.',
    'service-not-allowed':'A böngésző hangfelismerő szolgáltatása nem engedélyezett.',
    'network':'Hálózati hiba történt a böngésző hangfelismerésében.',
    'no-speech':'A rendszer nem érzékelt beszédet. Próbálkozz újra.',
    'audio-capture':'A mikrofon nem érhető el; lehet, hogy másik alkalmazás használja.',
    'aborted':'A diktálás megszakadt.'
   };
   el('askSpeech323').textContent='⚠️ '+(tips[recognitionError]||'Hangfelismerési hiba: '+recognitionError)+' Androidon a billentyűzet mikrofonja általában megbízhatóbb.';
  };
  r.onend=function(){
   if(rec===r)rec=null;
   el('hhMic299').textContent='🎙️ Diktálás';
   var time=Date.now()-recognitionStarted;
   if(!recognitionError&&!recognitionHadText){
    el('askSpeech323').textContent=time<2500?'⚠️ A böngésző '+(time/1000).toFixed(1)+' másodperc után leállította a hangfelismerést. Ellenőrizd a mikrofonengedélyt, vagy használd a Samsung billentyűzet mikrofonját.':'Nem érkezett felismerhető szöveg. Próbáld újra vagy használd a billentyűzet mikrofonját.';
   }else if(!recognitionError&&recognitionHadText){
    el('askSpeech323').textContent='✅ A diktált szöveg bekerült a kérdésmezőbe. Szükség esetén javítsd ki, mielőtt elindítod a kutatást.';
   }
  };
  r.start();
 }catch(e){
  rec=null;el('hhMic299').textContent='🎙️ Diktálás';
  el('askSpeech323').textContent='⚠️ A mikrofon nem indult el: '+String(e?.message||e);
 }
}
window.hhOpenLenaSmart299=open;
window.hhRunLenaSmart299=run;
window.hhGetLenaHandoff299=function(){return getLocal(HKEY,null)};
window.addEventListener('healthhub:profile-changed',function(){driveVerified=false;driveIssue='';driveCheckedProfile='';refresh()});
document.documentElement.dataset.healthhubAskLenaSmart='1.323';
})();