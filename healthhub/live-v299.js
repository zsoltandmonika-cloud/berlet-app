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
 s.textContent += "\n/* HealthRadar-consistent polished Ask Lena v324 layout, reusing the approved role hero atlas. */\n#hhLenaSmart299{\n --ask-accent:#2f78b7; --ask-accent-soft:#edf6ff;\n background:linear-gradient(180deg,#eaf4fa 0%,#f7fafb 310px);color:#173f59;\n}\n#hhLenaSmart299[data-profile=\"monika\"]{\n --ask-accent:#d95690;--ask-accent-soft:#fff0f7;\n background:linear-gradient(180deg,#fff0f7 0%,#f9fbfc 310px);\n}\n#hhLenaSmart299 .askHero{\n height:215px;position:relative;overflow:hidden;\n background-color:#e8f3f8;\n background-image:var(--hh-role-atlas,linear-gradient(110deg,#dcecf3,#f6fbff));\n background-position:left top;background-size:auto 200%;background-repeat:no-repeat;\n padding:0; color:#173d59;\n}\n#hhLenaSmart299 .askHero:after{\n content:\"\";position:absolute;inset:0;pointer-events:none;\n background:linear-gradient(90deg,transparent 28%,rgba(245,251,254,.10) 47%,rgba(245,251,254,.36) 100%);\n}\n#hhLenaSmart299 .askHeroInner{\n max-width:820px;margin:auto;height:100%;padding:0 17px;\n position:relative;display:flex;align-items:center;justify-content:flex-end;box-sizing:border-box;\n}\n#hhLenaSmart299 .askHeroCopy{position:relative;z-index:2;width:49%;padding-top:24px}\n#hhLenaSmart299 .askBack{\n position:absolute;top:13px;left:13px;z-index:4;display:inline-flex;align-items:center;justify-content:center;\n width:43px;height:43px;border-radius:50%;padding:0;\n border:1px solid #c6dce4;background:rgba(255,255,255,.86);color:#1c5977;\n box-shadow:0 4px 13px #1b53601d;font-size:24px;\n}\n#hhLenaSmart299 h1{margin:0 0 7px;font-size:clamp(22px,5.5vw,29px);letter-spacing:-.6px;color:#183c58;text-shadow:0 1px 8px #ffffff99}\n#hhLenaSmart299 .askSub{font-size:12px;line-height:1.4;margin:0 0 9px;color:#3c647a;text-shadow:0 1px 7px #ffffffc7}\n#hhLenaSmart299 .askProfile{\n background:rgba(255,255,255,.90);color:var(--ask-accent);\n border:1px solid #ffffffa8;box-shadow:0 3px 10px #23526a11;\n font-size:11px;font-weight:900;padding:6px 10px;\n}\n#hhLenaSmart299 .askWidth{max-width:790px;padding:16px 13px 0;gap:15px}\n#hhLenaSmart299 .askCard{\n background:linear-gradient(175deg,rgba(255,255,255,.98),rgba(251,254,255,.95));\n border:1px solid #dfebef;border-radius:23px;\n padding:19px 16px 18px;\n box-shadow:0 8px 25px rgba(25,79,106,.073);\n}\n#hhLenaSmart299 .askCard h2{font-size:17px;font-weight:870;line-height:1.32;letter-spacing:-.2px;margin:0 0 11px;color:#244a65}\n#hhLenaSmart299 .askQuestion{\n min-height:184px;height:197px;border:1.5px solid #bcdbe1;\n border-radius:18px;background:#fff;\n padding:16px 16px;font-size:16px;line-height:1.65;\n box-shadow:inset 0 1px 3px #28567209,0 2px 8px #20556a08;\n outline-color:var(--ask-accent);\n}\n#hhLenaSmart299 .askQuestion:focus{border-color:var(--ask-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--ask-accent) 10%,transparent)}\n#hhLenaSmart299 .askHint{font-size:12px;line-height:1.58;color:#687f8a;margin:10px 1px}\n#hhLenaSmart299 .askActions{gap:10px;margin-top:15px}\n#hhLenaSmart299 .askBtn{\n background:linear-gradient(180deg,#f5fafc,#eaf4f7);border:1px solid #d5e5eb;\n color:#2a6077;min-height:49px;border-radius:15px;padding:11px 12px;\n font-size:13px;font-weight:850;box-shadow:0 2px 4px #254d6009;\n}\n#hhLenaSmart299 .askBtn:active{transform:translateY(1px)}\n#hhLenaSmart299 .askBtnMain{\n color:white;background:linear-gradient(135deg,var(--ask-accent),color-mix(in srgb,var(--ask-accent) 83%,#135b7c));\n border-color:var(--ask-accent);\n box-shadow:0 6px 14px color-mix(in srgb,var(--ask-accent) 20%,transparent);\n}\n#hhLenaSmart299 .askBtnWide{font-size:15px;min-height:54px;letter-spacing:.1px}\n#hhLenaSmart299 .askKeyboard{\n border:0;background:transparent;display:block;color:#357c93;text-align:left;\n padding:8px 2px 4px;font-size:12px;font-weight:750;min-height:38px;text-decoration:underline;text-underline-offset:2px;\n}\n#hhLenaSmart299 #askSpeech323{\n background:#f3f8fa;border-radius:11px;padding:9px 10px;line-height:1.45;\n font-size:11px;margin:8px 0 3px;min-height:22px;\n}\n#hhLenaSmart299 .askConsent{\n background:#f7fafb;border:1px solid #e4edf1;border-radius:15px;\n padding:12px;margin:15px 0 0;font-size:12px;color:#466a7f;\n}\n#hhLenaSmart299 .askConsent input{accent-color:var(--ask-accent)}\n#hhLenaSmart299 .askChecks{gap:9px}\n#hhLenaSmart299 .askCheck{\n border-color:#e8f0f3;background:#fbfdfd;border-radius:14px;\n padding:12px 11px;\n}\n#hhLenaSmart299 .askCheck strong{font-size:13px}\n#hhLenaSmart299 .askCheck span{font-size:11.5px;line-height:1.48}\n#hhLenaSmart299 .askBadge{margin-top:5px;padding:5px 10px;vertical-align:middle}\n#hhLenaSmart299 .askProgress{background:var(--ask-accent-soft);border-radius:17px}\n#hhLenaSmart299 .askBar i{background:var(--ask-accent)}\n#hhLenaSmart299 .askFooter{padding:2px 5px 20px;font-size:11.5px}\n@media(max-width:440px){\n #hhLenaSmart299 .askHero{height:205px}\n #hhLenaSmart299 .askHeroCopy{width:52%}\n #hhLenaSmart299 .askHeroInner{padding:0 12px}\n #hhLenaSmart299 h1{font-size:24px}\n #hhLenaSmart299 .askSub{font-size:10.5px}\n #hhLenaSmart299 .askCard{padding:17px 15px}\n}\n";
 s.textContent += "\n#hhLenaSmart299 .askWork330{display:none;margin:12px 0 8px;padding:14px;border-radius:17px;background:linear-gradient(135deg,#eaf7f8,#f4fbfd);border:1px solid #badde6;box-shadow:0 4px 15px #17506b10;}\n#hhLenaSmart299 .askWork330.on{display:block}\n#hhLenaSmart299 .askWork330 .work330row{display:flex;align-items:center;gap:12px}\n#hhLenaSmart299 .work330spin{width:23px;height:23px;box-sizing:border-box;border:3px solid #b6dee2;border-top-color:#068f9b;border-radius:50%;animation:hhThink330 .85s linear infinite;flex-shrink:0}\n#hhLenaSmart299 .askWork330.finished .work330spin{animation:none;border:0;width:24px;height:24px;display:grid;place-items:center;background:#def5e8;color:#167a52;border-radius:50%}\n#hhLenaSmart299 .askWork330.failed .work330spin{animation:none;border-color:#e7a082;border-top-color:#d47c51}\n#hhLenaSmart299 .askWork330 b{font-size:13px;color:#16546b;display:block;line-height:1.5}\n#hhLenaSmart299 .askWork330 .work330time{color:#607e8a;font-size:11px;display:block;margin-top:2px}\n#hhLenaSmart299 .work330bar{height:5px;border-radius:50px;background:#d4e8ed;margin-top:12px;overflow:hidden}\n#hhLenaSmart299 .work330bar i{display:block;width:0;height:100%;background:linear-gradient(90deg,#168ca4,#28b698);border-radius:50px;transition:width .4s ease}\n#hhLenaSmart299 .askWork330 p{font-size:11.5px;color:#587e8a;line-height:1.5;margin:8px 0 0}\n@keyframes hhThink330{to{transform:rotate(360deg)}}\n#hhLenaSmart299 .askInlineFeedback{\n display:none;margin:12px 0 7px;padding:12px 14px;border-radius:14px;\n background:#eaf5fa;border:1px solid #c8e3ef;color:#19556d;\n font-size:12.5px;line-height:1.55;font-weight:700;\n}\n#hhLenaSmart299 .askInlineFeedback.on{display:block}\n#hhLenaSmart299 .askInlineFeedback.fail{background:#fff3ed;border-color:#eccfbe;color:#934b29}\n#hhLenaSmart299 .askInlineFeedback.done{background:#ebf9ef;border-color:#bdddc9;color:#176849}\n#hhLenaSmart299 .askInlineFeedback.info{background:#e9f5f8;border-color:#c9e1e9;color:#1b6178}\n";
 document.head.appendChild(s);
}
function markup(){
 return '<div class="askHero"><div class="askHeroInner"><button type="button" class="askBack" id="askBack323" aria-label="Vissza">‹</button>'+
  '<div class="askHeroCopy"><h1>🧠 Ask Léna</h1><p class="askSub">Smart Health Research<br>Kutatás és egészségügyi kérdések</p>'+
  '<span class="askProfile" id="hhSP299">Aktív profil: '+esc(pn(pk()))+'</span></div></div></div>'+
  '<div class="askWidth"><div class="askCard"><h2>✍️ Mit szeretnél megkérdezni?</h2>'+
  '<textarea id="hhSQ299" class="askQuestion" aria-label="Kérdés Lénának" placeholder="Írd ide a kérdésed…\nPéldául: Miért lehetnek hiányosak az intenzív osztályon töltött napok emlékei?"></textarea>'+
  '<p class="askHint">Írhatsz, vagy megpróbálhatod a diktálást. A böngésző hangfelismerése készülékenként eltérően működik.</p>'+
  '<div class="askActions"><button type="button" class="askBtn askBtnMain askBtnWide" id="hhRun299">📚 Kutatás</button>'+
  '<button type="button" class="askBtn" id="hhMic299">🎙️ Diktálás</button>'+
  '<button type="button" class="askBtn" id="hhPlain299">💬 ChatGPT</button></div>'+
  '<div id="askWork330" class="askWork330" role="status" aria-live="polite"><div class="work330row"><span class="work330spin" id="work330Spin" aria-hidden="true"></span><span><b id="work330Step">Léna kutatása készül…</b><span id="work330Time" class="work330time">0 mp</span></span></div><div class="work330bar"><i id="work330Bar"></i></div><p id="work330Note">Tényleges adatforrásokat ellenőrzök.</p></div>'+ 
  '<div id="askInlineFeedback325" class="askInlineFeedback" role="status" aria-live="polite"></div>'+
  '<button type="button" class="askKeyboard" id="askKeyboard324">⌨️ Inkább a telefon billentyűzetével diktálok</button>'+
  '<p class="askHint" id="askSpeech323" role="status"></p>'+
  '<label class="askConsent"><input type="checkbox" id="askConsent323"><span><b>Opcionális kórlap-kutatás:</b> engedélyezem, hogy a kiválasztott profil releváns eredeti leletei és a leletalapú forráscsomag a saját Google Drive-területemen tárolódjanak a kézi ChatGPT-átadáshoz. A HealthHub-mérésekből készülő helyi Léna-válaszhoz ez nem szükséges.</span></label>'+ 
  '<button type="button" class="askBtn" id="askDeep330" style="margin-top:10px;width:100%">📁 Opcionális mélykutatás eredeti kórlapokkal</button>'+
  '<div class="askProgress" id="hhProg299" role="status" aria-live="polite"><h3 id="hhStep299">Várakozás…</h3><div class="askBar"><i></i></div><span id="hhTxt299"></span>'+
  '<div class="askMore" id="askMore323"><button type="button" class="askBtn" id="askCopy323">📋 Handoff-utasítás másolása</button>'+
  '<button type="button" class="askBtn askBtnMain" id="askChat323">↗ ChatGPT megnyitása</button><button type="button" class="askBtn askBtnMain" id="askGeneric327" style="display:none">📋 Kérdés másolása a ChatGPT-hez</button></div></div></div>'+
  '<div class="askCard"><h2>📁 Kórlap-kutatás · opcionális <span id="askOverall323" class="askBadge warn">Ellenőrzés alatt</span></h2>'+
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
 el('hhRun299').addEventListener('click',function(){run('standard')});
 el('askDeep330').addEventListener('click',function(){run('pdf')});
 el('hhMic299').addEventListener('click',mic);
 el('hhPlain299').addEventListener('click',plainChat);
 el('askKeyboard324').addEventListener('click',keyboardMic);
 el('askRefresh323').addEventListener('click',refreshContext);
 el('askDrive323').addEventListener('click',testDrive);
 el('askCopy323').addEventListener('click',copyPrompt);
 el('askChat323').addEventListener('click',launchChatGPT);
 el('askGeneric327').addEventListener('click',plainChat);
 if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){
  el('hhMic299').disabled=true;
  el('askSpeech323').textContent='Ez a böngésző nem támogatja a webes diktálást. Androidon a billentyűzet mikrofonja használható helyette.';
 }
 refresh();
 return p;
}
function open(){
 var page=ensure(),old=document.querySelector('.page.on');
 page.dataset.profile=pk();
 if(old&&old.id!==PAGE)previousPage=old.id;
 document.querySelectorAll('.page').forEach(function(n){n.classList.remove('on')});
 page.classList.add('on');
 ['navTimelineBar','navHomeBar','navDetailBar'].forEach(function(id){var n=el(id);if(n)n.style.display='none'});
 var nav=el('navHealthBar');if(nav)nav.style.display='grid';
 var prof=el('hhSP299');if(prof)prof.textContent='Aktív profil: '+pn(pk());
 refresh();window.scrollTo(0,0);
 // Independent v328 Bridge listens after the Ask Léna page is mounted.
 // No modification to the legacy research, RAG, consent or sync pipeline.
 try{window.dispatchEvent(new CustomEvent('healthhub:ask-lena-open',{detail:{profile:pk()}}))}catch(e){}
}
function stopMic(){
 micManuallyStopped=true;
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
  {label:'Drive-on archivált források',ok:mapped>0,maybe:false,detail:mapped+' / '+docs.length+' dokumentumhoz van Drive-hivatkozás'+(mapped?'':'. A leletek Drive-archiválását külön be kell állítani')},
  {label:'Google Drive olvasási kapcsolat',ok:driveVerified,maybe:!driveIssue,detail:driveVerified?'Tényleges Drive API-kérés és archivált forrás ellenőrzése sikeres, ha van hivatkozás':driveIssue||'Nincs ezen a lapon ellenőrizve; kattints a Drive-kapcsolat tesztje gombra'}
 ];
 return {checks:c,ready:c.every(function(x){return x.ok}),docs:docs.length,mapped:mapped,context:context};
}
function refresh(){
 if(!el('askChecks323'))return;
 var p=pk(),data=checks(),o=el('askOverall323');
 var section=el(PAGE);if(section)section.dataset.profile=p;
 var answer=window.HH_LENA_LOCAL_ANSWER_V329&&window.HH_LENA_LOCAL_ANSWER_V329.getLast();
 var answered=!!(answer&&answer.profile===p&&answer.question===(el('hhSQ299')?.value||'').trim());
 o.className='askBadge '+(answered||data.ready?'good':data.checks.some(function(x){return !x.ok&&!x.maybe})?'error':'warn');
 o.textContent=answered?'✅ Léna-válasz kész · PDF opcionális':data.ready?'✅ Leletkutatásra kész':'⚠ PDF-leletkutatás nincs előkészítve';
 el('askChecks323').innerHTML=data.checks.map(function(x){
  return '<div class="askCheck"><div class="askCheckIcon">'+(x.ok?'✅':x.maybe?'🔎':'⚠️')+'</div><div><strong>'+esc(x.label)+'</strong><span>'+esc(x.detail)+'</span></div></div>'
 }).join('');
 var prof=el('hhSP299');if(prof)prof.textContent='Aktív profil: '+pn(p);
}
async function refreshContext(){
 var btn=el('askRefresh323');if(busy||!btn)return;
 btn.disabled=true;btn.textContent='🔄 Kontextus frissítése…';
 try{
  if(typeof window.hhRefreshLenaHealthContext289!=='function')throw Error('A Health Context modul nem érhető el');
  await window.hhRefreshLenaHealthContext289(pk(),'ask-lena-readiness-check');
  status('✅ Health Context ellenőrizve','Újraépítettem a helyi profilkontextust. Az archivált dokumentumok és Drive-jogosultságok állapota külön ellenőrizendő.',100,'done');
 }catch(e){status('⚠ Kontextus nem frissült',String(e?.message||e),100,'fail')}
 finally{btn.disabled=false;btn.textContent='↻ Állapot frissítése';refresh()}
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
function inlineStatus(text,level,shouldScroll){
 var near=el('askInlineFeedback325');if(!near)return;
 near.textContent=text||'';near.className='askInlineFeedback'+(text?' on '+(level||'info'):'');
 if(text&&shouldScroll)try{near.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}
}
function status(head,txt,percent,cls){
 var box=el('hhProg299');if(!box)return;
 inlineStatus(head+(txt?' · '+txt:''),cls||'info',cls==='fail'||cls==='done');
 box.className='askProgress on '+(cls||'');
 el('hhStep299').textContent=head;el('hhTxt299').textContent=txt||'';
 var bar=box.querySelector('.askBar i');if(bar)bar.style.width=(percent||0)+'%';
 if(cls!=='done')el('askMore323').classList.remove('on');
}
var work330Clock=null,work330Start=0;
function work330Begin(deep){
 clearInterval(work330Clock);work330Start=Date.now();var p=el('askWork330');if(!p)return;
 p.className='askWork330 on';el('work330Spin').textContent='';
 el('work330Bar').style.width='4%';el('work330Step').textContent='🧠 Léna összegyűjti az adatokat…';
 el('work330Note').textContent=deep?'Helyi elemzés, majd külön jóváhagyással eredeti leletek.':'Az aktív profil méréseit és naplóit ellenőrzöm.';
 function tick(){var e=el('work330Time');if(e)e.textContent=Math.floor((Date.now()-work330Start)/1000)+' mp · a rendszer dolgozik';}
 tick();work330Clock=setInterval(tick,1000);
}
function work330Stage(title,note,pct){
 var p=el('askWork330');if(!p)return;
 p.className='askWork330 on';el('work330Step').textContent=title;
 el('work330Note').textContent=note||'';
 el('work330Bar').style.width=Math.max(4,Math.min(98,pct||4))+'%';
}
function work330End(ok,detail){
 clearInterval(work330Clock);work330Clock=null;
 var p=el('askWork330');if(!p)return;p.className='askWork330 on '+(ok?'finished':'failed');
 el('work330Spin').textContent=ok?'✓':'';
 el('work330Bar').style.width='100%';
 el('work330Step').textContent=ok?'❤️ Léna befejezte a kutatást':'⚠️ A kutatás nem fejeződött be';
 el('work330Note').textContent=detail||'';
 el('work330Time').textContent=Math.max(0,Math.ceil((Date.now()-work330Start)/1000))+' mp';
}
function lock(flag){
 ['hhRun299','hhMic299','hhPlain299','askDrive323','askDeep330'].forEach(function(id){var n=el(id);if(n)n.disabled=flag});
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
  el('askGeneric327').style.display='none';
  el('askChat323').style.display='';
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
async function run(mode){
 var deep=mode==='pdf';
 inlineStatus('🔎 Léna kutatása indul…','info',false);
 if(busy){inlineStatus('⏳ Már folyamatban van egy kutatás, kérlek várd meg az eredményt.','info',true);return}
 var question=(el('hhSQ299').value||'').trim();
 if(!question){status('⚠ Hiányzik a kérdés','Először írd be a kérdésed a nagy szövegdobozba. A példaszöveg nem beírt kérdés.',0,'fail');return}
 var st=checks();
 busy=true;lock(true);stopMic();work330Begin(deep);el('askMore323').classList.remove('on');
 el('askGeneric327').style.display='none';
 el('askChat323').style.display='';
 el('askCopy323').style.display='';
 try{
  var p=pk();
  // v328: collect and display the eight available HealthHub data sources first.
  // This independent, on-device preview makes the Kutatás button useful even
  // when no question-specific original PDF exists; the legacy RAG is unchanged.
  await new Promise(function(resolve){setTimeout(resolve,35)}); // Render the spinner before longer source checks.
  var preview=null;
  if(window.HH_LENA_CONTEXT_BRIDGE_V328&&typeof window.HH_LENA_CONTEXT_BRIDGE_V328.run==='function'){
   preview=await window.HH_LENA_CONTEXT_BRIDGE_V328.run();
  }
  if(!preview||preview.profile!==p)throw Error('A profilhoz tartozó Intelligence adatellenőrzés nem készült el. Ellenőrizd a nyolc adatforrás paneljét.');
  if(pk()!==p)throw Error('Profilváltás történt a kutatás közben. Az új aktív profilnál indítsd újra; személyes adatokat nem keverünk.');
  work330Stage('🔎 Az adatforrásokat ellenőriztem','A kapcsolódó mérések és tünetnapló-bejegyzések rendelkezésre állnak.',49);
  status('1/3 · Adatforrások ellenőrizve','A releváns profiladatok összegyűjtése kész.',43,'');
  await new Promise(function(resolve){setTimeout(resolve,20)});
  work330Stage('🧠 Léna értelmezi a méréseket','Az időpontok, eltérések és a kérdés témája alapján készül a válasz.',73);
  var report=preview;
  if(!report||report.profile!==p)throw Error('Nem sikerült a HealthHub adatait ellenőrizni. Futtasd újra az Intelligence adatellenőrzést.');
  if(!window.HH_LENA_UNIVERSAL_V330||typeof window.HH_LENA_UNIVERSAL_V330.show!=='function')throw Error('A Léna v330 univerzális kutatási modul nem töltődött be.');
  window.HH_LENA_UNIVERSAL_V330.show(report,question);
  if(pk()!==p)throw Error('A profil megváltozott a válaszkészítés közben.');
  work330Stage('❤️ Léna javaslata elkészült','Kész a kérdésre szabott helyi elemzés, konkrét forrásértékekkel.',98);
  if(!deep){
   status('✅ Léna javaslata elkészült','A kérdéshez kapcsolódó HealthHub-adatokat összegyűjtöttem. Az eredeti PDF-ek mélykutatása külön indítható.',100,'done');
   var finishedCard=el('hhLenaAnswer329');if(finishedCard)try{finishedCard.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}
   work330End(true,'A válasz elkészült, személyes adatot nem továbbítottam külső AI-nak.');
   return;
  }
  work330Stage('📁 Opcionális leletmélykutatás','A korábbi Léna-válasz megtartásával ellenőrzöm az engedélyezett eredeti PDF-eket.',84);
  var route=window.hhRouteLenaResearch295(question,p);
  var candidates=(route?.route?.candidateDocuments||[]).filter(function(d){return d?.driveArchive?.fileId});
  if(!candidates.length){
   // PDF absence cannot block a source-backed local answer.
   status('✅ Léna javaslata kész','Az eredeti leletadatok nem adtak új feldolgozható forrást ehhez a kérdéshez. A HealthHub-adatokból készített válasz ettől függetlenül elkészült.',100,'done');
   work330End(true,'A helyi kutatás sikerült. További eredeti leletet nem kellett bevonni.');
   el('askMore323').classList.remove('on');
   var answerCard=el('hhLenaAnswer329');
   if(answerCard)try{answerCard.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}
   return;
  }
  if(!el('askConsent323').checked){
   status('✅ Léna javaslata elkészült · opcionális leletbővítés',
    'A személyes mérésekből és naplókból készült helyi elemzés elérhető. A külön kórlapbővítéshez előbb jóvá kell hagyni a Drive-engedélyt.',100,'done');work330End(true,'Helyi válasz elkészült; Drive-átadást nem indítottam.');return;
  }
  if(!st.ready){
   var missing=st.checks.filter(function(c){return !c.ok}).map(function(c){return c.label});
   status('✅ Léna javaslata kész · a Drive-kiegészítés még nem elérhető',
    'A helyi elemzés elkészült. A kapcsolódó PDF-ekhez még hiányzik: '+missing.join(', ')+'. A HealthHub-mérések kutatása ettől függetlenül működik.',100,'done');
   work330End(true,'A helyi válasz elkészült; az opcionális kórlapbővítés külön ellenőrizendő.');refresh();return;
  }
  work330Stage('📚 Eredeti dokumentumok feldolgozása','A Google Drive-hoz külön hozzáféréssel, a már megadott engedély alapján kapcsolódom.',87);
  status('3/6 · RAG · eredeti dokumentumok','A Google Drive-források szövegének olvasása.',40,'');
  var bundle=await window.hhPrepareLenaResearchBundle296(route,true);
  if(!bundle?.retrieval?.totalExtractedChars)throw Error('Nem sikerült forrásszöveget kiolvasni. A PDF lehet szkennelt vagy a Drive nem elérhető.');
  work330Stage('🔍 Leletbizonyítékok rendszerezése','A kiválasztott eredeti forrásszövegek feldolgozása folyik.',92);
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
  work330End(true,'A leletalapú kiegészítés is elkészült.');
 }catch(e){
  console.error('HealthHub Ask Léna',e);
  var existing=window.HH_LENA_LOCAL_ANSWER_V329&&window.HH_LENA_LOCAL_ANSWER_V329.getLast();
  if(existing&&existing.profile===pk()){
   status('✅ Léna javaslata kész · opcionális kutatási kiegészítés hibázott',
    'A HealthHubból készült helyi elemzés elérhető. A külön PDF/Drive-kutatás nem fejeződött be: '+String(e?.message||e),100,'done');
   work330End(true,'A helyi válasz elkészült; a külön leletmélykutatás hibáját jelzem.');
  }else{
   status('⚠ A kutatás megállt',String(e?.message||e),100,'fail');
   work330End(false,String(e?.message||e));
  }
 }finally{busy=false;lock(false);refresh()}
}

function keyboardMic(){
 stopMic();
 var q=el('hhSQ299');
 if(q){
  q.focus();q.scrollIntoView({block:'center',behavior:'smooth'});
  el('askSpeech323').textContent='⌨️ A telefon billentyűzete megnyílt. Koppints a Samsung/Gboard mikrofon ikonjára a magyar diktáláshoz. Ez a böngésző hangfelismerő szolgáltatásától független.';
 }
}
var micManuallyStopped=false;
function startMic(attempt){
 var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){
  el('askSpeech323').textContent='A böngészős beszédfelismerés nem elérhető. Használd a telefon billentyűzetének mikrofonját.';
  return;
 }
 try{
  var r=new SR();rec=r;micManuallyStopped=false;
  recognitionStarted=Date.now();recognitionHadText=false;recognitionError='';lastSpeech='';
  questionBeforeSpeech=el('hhSQ299').value||'';
  r.lang='hu-HU';r.interimResults=true;r.continuous=false;
  el('hhMic299').textContent='⏹️ Leállítás';
  el('askSpeech323').textContent=attempt?'🎙️ Újrapróbálkozás… kérlek beszélj a mikrofonhoz.':'🎙️ Mikrofon indítása…';
  r.onstart=function(){
   el('askSpeech323').textContent='🔴 Diktálás bekapcsolva, beszélj magyarul. A felismert szöveg bekerül a kérdésmezőbe.';
  };
  r.onresult=function(evt){
   var t='';
   for(var i=0;i<evt.results.length;i++)t+=evt.results[i][0].transcript+' ';
   lastSpeech=t.trim();recognitionHadText=!!lastSpeech;
   el('hhSQ299').value=(questionBeforeSpeech.trim()?questionBeforeSpeech.trim()+' ':'')+lastSpeech;
   el('askSpeech323').textContent='📝 '+(lastSpeech||'A hang felismerése folyamatban…');
  };
  r.onerror=function(evt){
   recognitionError=String(evt?.error||'ismeretlen hiba');
   var reasons={
    'not-allowed':'A böngésző nem kapott mikrofonengedélyt.',
    'service-not-allowed':'A böngésző hangfelismerő szolgáltatása nem engedélyezett.',
    'network':'A böngésző hangfelismerő szolgáltatása hálózati hibát jelzett.',
    'no-speech':'A böngésző nem érzékelt beszédet.',
    'audio-capture':'Nem érhető el a mikrofon.',
    'aborted':'A diktálás megszakadt.'
   };
   el('askSpeech323').textContent='⚠️ '+(reasons[recognitionError]||'Hangfelismerési hiba: '+recognitionError)+' Használd a billentyűzet mikrofonját is, ha szükséges.';
  };
  r.onend=function(){
   if(rec===r)rec=null;
   el('hhMic299').textContent='🎙️ Diktálás';
   if(micManuallyStopped){el('askSpeech323').textContent='⏹️ Diktálás leállítva.';return}
   var elapsed=Date.now()-recognitionStarted;
   if(!recognitionError&&!recognitionHadText&&elapsed<2500&&attempt===0){
    el('askSpeech323').textContent='⚠️ A böngésző '+(elapsed/1000).toFixed(1)+' másodperc után megszakította a hangfelismerést. Egyszer újrapróbálom…';
    setTimeout(function(){if(!micManuallyStopped&&el(PAGE)?.classList.contains('on')&&!rec)startMic(1)},450);
    return;
   }
   if(!recognitionError&&!recognitionHadText)
    el('askSpeech323').textContent='⚠️ A böngésző '+(elapsed/1000).toFixed(1)+' másodperc után leállt, nem adott szöveget. A telefon billentyűzetének mikrofonja megbízhatóbb lehet.';
   else if(!recognitionError&&recognitionHadText)
    el('askSpeech323').textContent='✅ A felismert szöveg bekerült a kérdésmezőbe. Ellenőrizd, majd indítsd a kutatást.';
  };
  r.start();
 }catch(e){
  rec=null;el('hhMic299').textContent='🎙️ Diktálás';
  el('askSpeech323').textContent='⚠️ A böngészős mikrofon nem indult el: '+String(e?.message||e)+'. A telefon billentyűzetének mikrofonját használd.';
 }
}
function mic(){
 if(rec){micManuallyStopped=true;stopMic();el('hhMic299').textContent='🎙️ Diktálás';return}
 startMic(0);
}
window.hhOpenLenaSmart299=open;
window.hhRunLenaSmart299=run;
window.hhGetLenaHandoff299=function(){return getLocal(HKEY,null)};
window.addEventListener('healthhub:profile-changed',function(){driveVerified=false;driveIssue='';driveCheckedProfile='';refresh()});
document.documentElement.dataset.healthhubAskLenaSmart='1.327';
})();