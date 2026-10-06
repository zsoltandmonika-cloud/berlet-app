(function(){
'use strict';
/* HealthHub v1.299 — Smart Ask Léna orchestrator + ChatGPT handoff */
var STYLE='hh-v299-style',MID='hhLenaSmart299',HFID='hh-lena-v299-handoff-id',HKEY='hh-lena-v299-handoff';
var busy=false,recognizer=null;

function pk(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pn(p){return p==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function style(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+MID+'{position:fixed;inset:0;z-index:100200;background:rgba(10,26,39,.58);display:none;align-items:flex-end;justify-content:center}'+
 '#'+MID+'.on{display:flex}.hhS299{width:min(760px,100%);max-height:94vh;overflow:auto;background:#f8fbfc;border-radius:24px 24px 0 0;padding:16px 14px 24px;box-sizing:border-box;box-shadow:0 -18px 48px rgba(0,0,0,.2)}'+
 '.hhSH299{display:flex;gap:10px;align-items:flex-start}.hhSH299 h2{margin:0;color:#173f62;font-size:18px}.hhSH299 small{color:#7a8d99}.hhSX299{margin-left:auto;width:34px;height:34px;border:0;border-radius:999px;background:#e7eef2;font-size:20px;font-weight:900}'+
 '.hhSQ299{width:100%;min-height:102px;margin-top:12px;border:1px solid #cbdbe4;border-radius:14px;padding:11px;box-sizing:border-box;font:inherit;color:#173f62;background:white;resize:vertical}'+
 '.hhSA299{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.hhSA299 button{border:0;border-radius:11px;padding:10px 12px;font-weight:900;font-size:12px}.hhRun299{background:#1b7f73;color:white}.hhMic299{background:#e9f4f8;color:#195d7a}.hhPlain299{background:#e9edf0;color:#395769}.hhSA299 button[disabled]{opacity:.55}'+
 '.hhP299{margin-top:12px;padding:10px 11px;border:1px solid #dbe7ed;border-radius:13px;background:white;color:#4c6879;font-size:11px;line-height:1.55;display:none}.hhP299.on{display:block}.hhP299 b{color:#214e69}.hhBar299{height:7px;background:#e5edf1;border-radius:999px;overflow:hidden;margin:7px 0}.hhBar299 i{display:block;height:100%;width:0;background:#1b7f73}.hhDone299{color:#17695f!important}.hhErr299{color:#9a5a28!important}';
 document.head.appendChild(s);
}
function ensure(){
 style();var o=document.getElementById(MID);if(o)return o;
 o=document.createElement('div');o.id=MID;
 o.innerHTML='<div class="hhS299"><div class="hhSH299"><div><h2>🧠 Ask Léna · Smart Health Research</h2><small id="hhSP299">Aktív profil: '+esc(pn(pk()))+'</small></div><button type="button" class="hhSX299">×</button></div>'+
 '<textarea id="hhSQ299" class="hhSQ299" placeholder="Pl. Miért emlékszem olyan keveset az intenzív osztályról?"></textarea>'+
 '<div class="hhSA299"><button type="button" class="hhRun299" id="hhRun299">🧠 Kutatás + ChatGPT</button><button type="button" class="hhMic299" id="hhMic299">🎙️ Beszélek</button><button type="button" class="hhPlain299" id="hhPlain299">💬 Csak ChatGPT</button></div>'+
 '<div class="hhP299" id="hhProg299"><b id="hhStep299">Várakozás…</b><div class="hhBar299"><i></i></div><span id="hhTxt299"></span></div></div>';
 document.body.appendChild(o);
 o.querySelector('.hhSX299').onclick=close;
 o.addEventListener('click',function(e){if(e.target===o&&!busy)close()});
 o.querySelector('#hhRun299').onclick=run;
 o.querySelector('#hhMic299').onclick=mic;
 o.querySelector('#hhPlain299').onclick=function(){launchChatGPT()};
 if(!(window.SpeechRecognition||window.webkitSpeechRecognition))o.querySelector('#hhMic299').style.display='none';
 return o;
}
function open(){
 var o=ensure(),q=document.getElementById('hhSQ299'),p=document.getElementById('hhSP299');
 if(p)p.textContent='Aktív profil: '+pn(pk());o.classList.add('on');setTimeout(function(){if(q)q.focus()},100);
}
function close(){var o=document.getElementById(MID);if(o&&!busy)o.classList.remove('on')}
function prog(step,text,pct,cls){
 var box=document.getElementById('hhProg299'),st=document.getElementById('hhStep299'),tx=document.getElementById('hhTxt299'),bar=box&&box.querySelector('.hhBar299 i');
 if(!box)return;box.classList.add('on');if(st){st.className=cls||'';st.textContent=step}if(tx)tx.textContent=text||'';if(bar)bar.style.width=Math.max(0,Math.min(100,pct||0))+'%';
}
function lock(on){['hhRun299','hhMic299','hhPlain299'].forEach(function(id){var b=document.getElementById(id);if(b)b.disabled=!!on});var q=document.getElementById('hhSQ299');if(q)q.disabled=!!on}
function launchChatGPT(){
 try{if(typeof window.hhOpenLenaChatGPT286==='function'){window.hhOpenLenaChatGPT286();return}}catch(e){}
 window.location.href='https://chatgpt.com/';
}
async function token(){if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive kapcsolat nem érhető el.');return await window.hhGetGoogleDriveToken292(true)}
async function saveHandoff(h){
 var t=await token(),id=localStorage.getItem(HFID)||'',name='HealthHub-Lena-Handoff.json';
 if(!id){
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'Private HealthHub Ask Léna handoff',appProperties:{healthhub:'lena-handoff',schema:'1.0'}})});
  if(!cr.ok)throw Error('Handoff fájl létrehozási hiba ('+cr.status+')');id=(await cr.json()).id;localStorage.setItem(HFID,id);
 }
 var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime,webViewLink',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(h)});
 if(up.status===404){localStorage.removeItem(HFID);return saveHandoff(h)}
 if(!up.ok)throw Error('Handoff Drive sync hiba ('+up.status+')');
 var j=await up.json();h.driveMirror={fileId:j.id,fileName:j.name,modifiedTime:j.modifiedTime,webViewLink:j.webViewLink||null};localStorage.setItem(HKEY,JSON.stringify(h));return h;
}
function bridgePrompt(){
 return 'HealthHub handoff: használd a csatlakoztatott Google Drive-ot, nyisd meg a HealthHub-Lena-Handoff.json fájlt, majd az abban hivatkozott HealthHub-Lena-Answer-Pack.json és szükség esetén az eredeti forrásdokumentumokat. Válaszolj magyarul a handoffban lévő currentQuestion kérdésre. Az eredeti leleteket tekintsd elsődleges forrásnak, és különítsd el a dokumentált tényt a következtetéstől.';
}
async function copyPrompt(){
 var s=bridgePrompt();try{await navigator.clipboard.writeText(s);return true}catch(e){}
 try{var ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');ta.remove();return ok}catch(e){return false}
}
async function run(){
 if(busy)return;var q=(document.getElementById('hhSQ299').value||'').trim();if(!q){prog('⚠ Írj vagy mondj egy kérdést','',0,'hhErr299');return}
 busy=true;lock(true);var p=pk();
 try{
  prog('1/6 · Health Context frissítése',pn(p)+' adatai',8,'');
  if(typeof window.hhRefreshLenaHealthContext289==='function')await window.hhRefreshLenaHealthContext289(p,'ask-lena-v299');
  prog('2/6 · Research Router','Profil, időszak és releváns leletek kiválasztása',22,'');
  if(typeof window.hhRouteLenaResearch295!=='function')throw Error('Research Router nem érhető el.');
  var route=window.hhRouteLenaResearch295(q,p);
  prog('3/6 · Dokumentumkutatás','Eredeti Drive-leletek olvasása',38,'');
  if(typeof window.hhPrepareLenaResearchBundle296!=='function')throw Error('Document Retrieval Engine nem érhető el.');
  var bundle=await window.hhPrepareLenaResearchBundle296(route,true);
  prog('4/6 · Evidence Engine','Bizonyítékok és idővonal összeállítása',62,'');
  if(typeof window.hhBuildLenaEvidence297!=='function')throw Error('Evidence Engine nem érhető el.');
  var evidence=await window.hhBuildLenaEvidence297(bundle,true);
  prog('5/6 · Answer Composer','Rövid, forrásolt válasz elkészítése',78,'');
  if(typeof window.hhComposeLenaAnswer298!=='function')throw Error('Answer Composer nem érhető el.');
  var answer=await window.hhComposeLenaAnswer298(evidence,true);
  prog('6/6 · ChatGPT handoff','Privát átadási csomag mentése',90,'');
  var h={schema:'healthhub.lena.handoff/1.0',createdAt:new Date().toISOString(),profile:p,profileName:pn(p),currentQuestion:q,answerPackFileId:answer&&answer.driveMirror&&answer.driveMirror.fileId||null,answerPackFilename:'HealthHub-Lena-Answer-Pack.json',researchBundleFilename:'HealthHub-Lena-Research-Bundle.json',evidencePackFilename:'HealthHub-Lena-Evidence-Pack.json',instructions:'Use connected Google Drive. Read the answer pack first, then original documents only when verification or more detail is needed.'};
  await saveHandoff(h);var copied=await copyPrompt();
  prog('✅ Kutatás kész',copied?'ChatGPT indító prompt a vágólapon. Megnyitom Lénát…':'Megnyitom Lénát. A handoff a Drive-on készen áll.',100,'hhDone299');
  setTimeout(launchChatGPT,700);
 }catch(e){
  console.error('HealthHub v299 Ask Léna failed',e);prog('⚠ A kutatás megállt',String(e&&e.message||e),100,'hhErr299');
 }finally{busy=false;lock(false)}
}
function mic(){
 var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
 try{
  if(recognizer){recognizer.stop();recognizer=null}
  var r=new SR();recognizer=r;r.lang='hu-HU';r.interimResults=true;r.continuous=false;
  var q=document.getElementById('hhSQ299'),b=document.getElementById('hhMic299');if(b)b.textContent='🎙️ Hallgatlak…';
  r.onresult=function(e){var t='';for(var i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;if(q)q.value=t};
  r.onerror=function(e){prog('⚠ Hangfelismerés',String(e.error||'hiba'),0,'hhErr299')};
  r.onend=function(){recognizer=null;if(b)b.textContent='🎙️ Beszélek'};
  r.start();
 }catch(e){prog('⚠ Hangfelismerés',String(e&&e.message||e),0,'hhErr299')}
}
window.hhOpenLenaSmart299=open;
window.hhRunLenaSmart299=run;
window.hhGetLenaHandoff299=function(){return read(HKEY,null)};
window.addEventListener('healthhub:profile-changed',function(){var p=document.getElementById('hhSP299');if(p)p.textContent='Aktív profil: '+pn(pk())});
setTimeout(ensure,1900);
document.documentElement.dataset.healthhubAskLenaSmart='1.299';
})();