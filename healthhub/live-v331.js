(function(){
'use strict';
/* v331 Ask Léna: real, optional AI synthesis with visible facts about execution.
   Never disguise the v330 local templates as live AI. No silent data transfer. */
var active=null,epoch=0,logged=false;
function el(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function safe(x,n){return String(x==null?'':x).replace(/\s+/g,' ').trim().slice(0,n||220)}
function read(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
function escapeHtml(x){return String(x||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function styles(){
 if(el('hhAi331Css'))return;
 var css=document.createElement('style');css.id='hhAi331Css';css.textContent=
 '#hhAi331Auth{border:1px solid #c5dfe8;background:#f2f9fc;border-radius:14px;padding:11px 13px;margin:6px 0 11px;display:flex;align-items:center;flex-wrap:wrap;gap:10px;justify-content:space-between;font-size:12px;color:#22556b}'+
 '#hhAi331Auth button{background:#e4f4fa;border:1px solid #bdd7e3;border-radius:11px;padding:10px 12px;color:#195c70;font-weight:800;font-size:12px}'+
 '#hhAi331Consent{display:flex;align-items:flex-start;gap:10px;background:#eef8fc;border:1px solid #c9dfe8;padding:13px;border-radius:14px;font-size:12px;line-height:1.55;color:#315a72;margin:13px 0 2px}'+
 '#hhAi331Consent input{width:19px;height:19px;flex:none;margin:2px 0 0;accent-color:#008c68}'+
 '#hhAi331Terminal{display:none;border-radius:15px;background:#061d1b;color:#6cf2af;border:1px solid #175d48;padding:14px;margin:13px 0;font:12px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:normal;box-shadow:inset 0 0 18px #0f493a77}'+
 '#hhAi331Terminal.on{display:block}#hhAi331Terminal .hhAi331Title{font-weight:800;color:#9afccb;margin:0 0 9px;font-size:12px}'+
 '#hhAi331Lines{min-height:40px;max-height:180px;overflow:auto}#hhAi331Lines p{margin:3px 0;overflow-wrap:anywhere}'+
 '#hhAi331Terminal .hhAi331Cursor{display:inline-block;width:7px;height:13px;background:#6cf2af;vertical-align:middle;animation:hhAiBlink 1s steps(2) infinite}'+
 '@keyframes hhAiBlink{50%{opacity:0}}'+
 '#hhAi331Answer{display:none;border:1px solid #c2dee2;border-radius:20px;padding:17px;background:linear-gradient(140deg,#eefcf8,#fff);color:#16475e;box-shadow:0 8px 22px #28615912;margin-top:12px}'+
 '#hhAi331Answer.on{display:block}#hhAi331Answer h2{font-size:18px;color:#116652;margin:0 0 12px}'+
 '#hhAi331Answer .hhAi331Text{font-size:14px;line-height:1.74;overflow-wrap:anywhere}'+
 '#hhAi331Answer .hhAi331Text p{margin:0 0 12px}'+
 '#hhAi331Answer .hhAi331Text h3{margin:15px 0 8px;font-size:15px;line-height:1.5;color:#126e62}'+
 '#hhAi331Answer .hhAi331Text strong{color:#155875;font-weight:850}'+
 '#hhAi331Answer .hhAi331Text ul{margin:5px 0 13px;padding-left:22px}'+
 '#hhAi331Answer .hhAi331Text li{margin:5px 0}'+
 '#hhAi331Answer .hhAi331Foot{font-size:11px;line-height:1.6;color:#678392;margin-top:14px;border-top:1px solid #d2e9e4;padding-top:9px}'+
 '#hhAi331Error{display:none;background:#fff2f0;border:1px solid #e9bcb3;padding:12px;border-radius:13px;color:#833d38;font-size:12px;line-height:1.6;margin-top:9px}'+
 '#hhAi331Error.on{display:block}'+
 '#hhAi331Local{border:0;background:transparent;color:#5e8392;font-size:12px;text-decoration:underline;padding:10px 0 0;cursor:pointer}';
 css.textContent +=
 '#hhLenaSmart299 .askCard:has(#askOverall323),#hhLenaSmart299 #hhIntelligence328,#hhLenaSmart299 #askDeep330,'+
 '#hhLenaSmart299 .askConsent,#hhLenaSmart299 .askFooter,#hhLenaSmart299 #askKeyboard324,'+
 '#hhLenaSmart299 #askSpeech323,#hhLenaSmart299 #hhProg299,#hhLenaSmart299 #askInlineFeedback325,'+
 '#hhLenaSmart299 #askWork330,#hhLenaSmart299 #hhPlain299,#hhLenaSmart299 .askHint,'+
 '#hhLenaSmart299 #hhAi331Auth,#hhLenaSmart299 #hhAi331Consent,#hhLenaSmart299 #hhAi331Local{display:none!important}'+
 '#hhLenaSmart299 .askActions{display:flex!important;align-items:stretch;gap:10px!important}'+
 '#hhLenaSmart299 #hhRun299{flex:1 1 auto!important;grid-column:auto!important;font-size:17px!important;min-height:55px!important}'+
 '#hhLenaSmart299 #hhMic299{display:flex!important;flex:0 0 66px!important;align-items:center;justify-content:center;font-size:27px!important;min-height:55px!important;padding:8px!important}'+
 '#hhLenaSmart299 .askQuestion{height:150px!important;min-height:125px!important;max-height:34vh!important}'+
 '#hhLenaSmart299 .askWidth{gap:10px!important}'+
 '#hhLenaSmart299 #hhAi331Privacy{font-size:10px;line-height:1.45;color:#688290;margin:8px 1px 0}'+
 '#hhLenaSmart299 #hhAi331Terminal{max-width:100%;margin:12px 0 8px!important}'+
 '#hhLenaSmart299 #hhAi331Lines{max-height:125px!important;overflow:auto}'+
 '@media(max-width:440px){#hhLenaSmart299 .askCard{padding:13px!important}#hhLenaSmart299 .askQuestion{height:135px!important}}';
 document.head.appendChild(css);
}
function print(message){
 var lines=el('hhAi331Lines');if(!lines)return;
 var p=document.createElement('p');lines.appendChild(p);
 while(lines.children.length>12)lines.firstChild.remove();
 var text='> '+message;var index=0;
 (function type(){if(!p.isConnected)return;index=Math.min(index+4,text.length);p.textContent=text.slice(0,index);
  lines.scrollTop=lines.scrollHeight;if(index<text.length)setTimeout(type,12)
 })();
}
function showError(message){
 var err=el('hhAi331Error');if(err){err.textContent='⚠ '+message;err.classList.add('on')}
 print('A kutatás megszakadt.');
}
function ui(){
 var btn=el('hhRun299'),q=el('hhSQ299');
 if(!btn||!q||btn.dataset.ai331)return;
 styles();btn.dataset.ai331='1';btn.textContent='🔎 Kutatás';
 btn.title='Kutatás a kiválasztott profil elérhető adatai alapján';
 var actions=btn.closest('.askActions');if(!actions)return;
 // One deliberate user action authorizes this one AI request; no extra checkbox.
 // We still tell the user exactly where sensitive health data goes.
 var privacy=document.createElement('p');privacy.id='hhAi331Privacy';
 privacy.textContent='A Kutatás az aktív profil releváns egészségadatait az OpenAI API-val dolgoztatja fel. Az eredeti PDF-eket nem küldjük el.';
 actions.parentNode.insertBefore(privacy,actions.nextSibling);
 var mic=el('hhMic299');if(mic){
  mic.setAttribute('aria-label','Diktálás');mic.title='Diktálás';mic.textContent='🎤';
  if(!(window.SpeechRecognition||window.webkitSpeechRecognition)){
   mic.disabled=false;
   mic.addEventListener('click',function(e){
    e.stopImmediatePropagation();e.preventDefault();
    q.focus();q.scrollIntoView({block:'nearest',behavior:'smooth'});
   },true);
   mic.title='A telefon billentyűzetének mikrofonjával diktálhatsz';
  }else{
   var mo=new MutationObserver(function(){
    if(!mic.isConnected){mo.disconnect();return}
    var now=mic.textContent;
    var desired=/Leállítás/.test(now)?'⏹️':'🎤';
    if(now!==desired)mic.textContent=desired;
   });
   mo.observe(mic,{childList:true,characterData:true,subtree:true});
  }
 }
 var term=document.createElement('section');term.id='hhAi331Terminal';term.setAttribute('role','status');term.setAttribute('aria-live','polite');
 term.innerHTML='<p class="hhAi331Title">🟢 HEALTHHUB · LÉNA RESEARCH MONITOR <span class="hhAi331Cursor"></span></p><div id="hhAi331Lines"></div>';
 actions.parentNode.insertBefore(term,privacy.nextSibling);
 var answer=document.createElement('section');answer.id='hhAi331Answer';answer.setAttribute('aria-label','Léna valódi AI-válasza');
 answer.innerHTML='<h2>🧠 Léna elemzése · AI</h2><div class="hhAi331Text" id="hhAi331Text"></div><div class="hhAi331Foot" id="hhAi331Foot"></div>';
 term.parentNode.insertBefore(answer,term.nextSibling);
 var err=document.createElement('div');err.id='hhAi331Error';term.parentNode.insertBefore(err,answer.nextSibling);

 btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();run()},true);
}
function refreshAuth(){
 var bar=el('hhAi331AuthState'),button=el('hhAi331AuthOpen');
 if(!bar||!button)return;
 var svc=window.HH_DAILY_HEALTH_SYNC_V319,st=svc&&svc.getStatus?svc.getStatus():null;
 if(!st||!st.configured){bar.textContent='⚠ Központi Health Vault nincs beállítva';button.textContent='🔐 Bejelentkezés';return}
 if(!st.authenticated){bar.textContent='🔒 Nincs központi bejelentkezés';button.textContent='🔐 Bejelentkezés';return}
 var named=profile()==='monika'?'Mónika':'Zsolt',can=st.authorizedProfiles;
 if(Array.isArray(can)&&!can.includes(profile())){
  bar.textContent='⚠ Belépve, de '+named+' profiljához nincs engedélyed';
 }else{
  bar.textContent='✅ Központi Health Vault: bejelentkezve · '+named+' profil'+(can?' hozzáféréssel':' · ellenőrzés alatt');
 }
 button.textContent='👤 Fiók és kijelentkezés';
}
function cancel(){
 epoch++;if(active){try{active.abort()}catch{}active=null}
}
function addExtra(context,q){
 if(!context||context.profile!==profile())return [];
 var out=[],m=context.metrics||{},pc=context.profileCore||{},docs=context.documents||{},sl=context.sleep||{},ac=context.activity||{};
 function put(domain,label,value,at){
  if(value===null||value===undefined||value==='')return;
  if(out.length>=67)return;
  out.push({domain:domain,label:safe(label,90),value:safe(value,240),at:safe(at||'',35)});
 }
 ['heightCm','bloodType','allergies','knownConditions'].forEach(function(k){put('profile',k,pc[k])});
 if(pc.birthDate)put('profile','Születési dátum',pc.birthDate);
 var journal=read('hh-symptom-journal-v1');
 (journal&&Array.isArray(journal.events)?journal.events:[]).filter(function(x){return x&&x.profile===profile()&&!x.deletedAt})
  .sort(function(a,b){return String(b.eventAt||'').localeCompare(String(a.eventAt||''))})
  .slice(0,8).forEach(function(x){
   put('symptoms','Tünetnapló',safe(x.symptom,80)+' · súlyosság '+safe(x.severity,10)+'/10 · '+safe(x.outcome,50),x.eventAt);
  });
 var bp=m.bloodPressure||{},wt=m.weight||{},p=m.pulse||{};
 if(bp.latest)put('trends','Vérnyomás utolsó mérés',bp.latest.systolic+'/'+bp.latest.diastolic+' Hgmm',bp.latest.measuredAt);
 if(bp.h72&&bp.h72.systolicAvg!=null&&bp.h72.diastolicAvg!=null)put('trends','Vérnyomás 72h átlag',bp.h72.systolicAvg+'/'+bp.h72.diastolicAvg+' Hgmm');
 if(bp.d7&&bp.d7.systolicAvg!=null&&bp.d7.diastolicAvg!=null)put('trends','Vérnyomás 7n átlag',bp.d7.systolicAvg+'/'+bp.d7.diastolicAvg+' Hgmm');
 if(wt.latest&&wt.latest.bodyFatPercent!=null)put('trends','Testzsír arány',wt.latest.bodyFatPercent+'%',wt.latest.measuredAt);
 if(wt.delta7d!=null)put('trends','Testsúly 7n változás',wt.delta7d+' kg');
 if(wt.delta30d!=null)put('trends','Testsúly 30n változás',wt.delta30d+' kg');
 if(p.d7Avg!=null)put('trends','Pulzus 7n átlag',p.d7Avg+'/perc');
 var heart=context.heartRate||{};
 if(heart.d7Avg!=null)put('trends','Watch pulzus 7n átlag',heart.d7Avg+'/perc');
 (sl.recent||[]).slice(0,12).forEach(function(x){put('sleep','Alvásszakasz',x.durationMin+' perc, '+safe(x.startTime,30)+' → '+safe(x.endTime,30),x.endTime)});
 (ac.recent||[]).slice(0,12).forEach(function(x){put('activity','Napi aktivitás',x.steps+' lépés, '+x.activeMinutes+' aktív perc, '+x.distanceKm+' km',x.date)});
 (context.medications||[]).slice(0,12).forEach(function(x){put('medication','Rögzített gyógyszer',x.name+' '+safe(x.strength,45)+' '+safe(x.schedule,80)+' · '+safe(x.status,35))});
 var words=safe(q,240).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(function(v){return v.length>=5});
 var matching=(docs.index||[]).map(function(d){
  var src=safe(d.title,120).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return {d:d,score:words.reduce(function(sum,w){return sum+(src.indexOf(w)>=0?1:0)},0)}
 }).sort(function(a,b){return b.score-a.score});
 var limit=8;
 matching.slice(0,limit).forEach(function(x){
  var d=x.d;
  put('documents','Leletindex · '+safe(d.category,35),d.title,d.date);
  var explanation=d.explanation;
  if(explanation&&explanation.summary)put('documents','Korábbi leletmagyarázat (nem eredeti PDF)',explanation.summary,d.date)
 });
 (context.appointments||[]).slice(0,3).forEach(function(x){
  put('appointments','Rögzített időpont',x.title||x.reason||x.type||'Egészségügyi időpont',x.startAt||x.date||x.scheduledAt)
 });
 (context.signals||[]).slice(0,4).forEach(function(x){put('trends','Korábban számított jelzés',x.text)});
 return out.slice(0,64).filter(function(e){return e.value&&e.value.indexOf('undefined')<0&&e.value.indexOf('null/')<0});
}
function simplify(report,extra){
 var sources=(report.sources||[]).filter(function(s){return Array.isArray(s.entries)&&s.entries.length}).map(function(s){
  return {id:s.id,title:s.title,status:s.status,entries:s.entries.slice(0,12).map(function(e){
   return {name:e.name,value:e.value,unit:e.unit||'',observedAt:e.observedAt||''}
  })}
 });
 var data={schema:'healthhub.ask-lena/1',profile:report.profile,question:report.question,
  consent:true,sources:sources,extra:extra};
 while(JSON.stringify({sources:data.sources,extra:data.extra}).length>17000&&data.extra.length)data.extra.pop();
 return data;
}
function logSource(data){
 var all=data.sources||[];
 print((data.profile==='monika'?'Mónika':'Zsolt')+' · '+all.length+' adatforrás beolvasva');
}
function errorText(code,status){
 if(status===404)return 'Az AI-kiszolgáló még nincs telepítve. Nem állítom, hogy kutatás történt.';
 if(status===401||code==='login_required')return 'Jelentkezz be a Központi Health Vaultba, hogy a személyes AI-kutatás biztonságosan elindulhasson.';
 if(status===403||code==='forbidden_profile')return 'Ehhez a profilhoz nincs igazolt hozzáférés. Nincs adatküldés.';
 if(status===429||code==='rate_limit')return 'Óránként legfeljebb 20 AI-kutatás indítható.';
 if(code==='server_not_configured')return 'Hiányzik a szerveroldali AI-konfiguráció.';
 if(code==='ai_upstream_401'||code==='ai_upstream_402'||code==='ai_upstream_429')return 'Az AI-szolgáltatás kulcsa, kerete vagy limitje ellenőrzést igényel ('+code+').';
 return 'AI-kutatás sikertelen: '+safe(code||'kapcsolati vagy szerverhiba',140)+'.';
}
async function run(){
 ui();if(active){print('Már fut egy kutatás.');return}
 var q=el('hhSQ299'),p=profile(),question=q&&q.value.trim();
 var term=el('hhAi331Terminal'),result=el('hhAi331Answer'),err=el('hhAi331Error');
 term.classList.add('on');el('hhAi331Lines').innerHTML='';err.classList.remove('on');result.classList.remove('on');
 el('hhAi331Text').textContent='';el('hhAi331Foot').textContent='';
 var old=el('hhLenaAnswer329');if(old)old.remove();
 var legacy=el('hhProg299');if(legacy)legacy.classList.remove('on');
 if(el('askWork330'))el('askWork330').classList.remove('on');
 if(!question||question.length<3){showError('Írj be egy érdemi kérdést.');return}
 var svc=window.HH_DAILY_HEALTH_SYNC_V319;
 if(!svc||!svc.stream){showError('A titkosított AI-kapcsolat még nem áll rendelkezésre.');return}
 if(!svc.getStatus().authenticated){showError('Egyszeri, biztonságos bejelentkezés szükséges az első kutatáshoz.');if(svc.openLogin)svc.openLogin();return}
 var allowed=svc.getStatus().authorizedProfiles;
 if(Array.isArray(allowed)&&!allowed.includes(p)){showError('A bejelentkezett fióknak nincs jogosultsága '+(p==='monika'?'Mónika':'Zsolt')+' profiljához.');return}
 var turn=++epoch,ctrl=new AbortController();active=ctrl;
 el('hhRun299').disabled=true;q.disabled=true;
 print('Kapcsolódás a kutatómotorhoz…');
 try{
  if(!svc.probe)throw Error('A biztonságos AI-szerver ellenőrző modulja még nem töltődött be.');
  var connection;
  try{connection=await svc.probe()}catch(e){throw Error('A kutatómotor még nem elérhető. A szerverkapcsolat beállítása hiányzik. Személyes adatot nem továbbítottam.')}
  if(!connection.ok)throw Error('A kutatómotor jelenleg nem indítható ('+connection.status+'). Személyes adatot nem továbbítottam.');
  print('Személyes adatok biztonságos beolvasása…');
  var bridge=window.HH_LENA_CONTEXT_BRIDGE_V328;
  if(!bridge||!bridge.run)throw Error('Az egészségügyi adatgyűjtő modul nem működik.');
  var report=await bridge.run();
  if(turn!==epoch||profile()!==p)throw Error('A profil közben megváltozott; a kutatás törölve.');
  if(!report||report.profile!==p)throw Error('Nem készíthető hiteles profiladat-összesítés.');
  print('Időpontok, mérések és összefüggések ellenőrzése…');
  var ctx=window.hhGetLenaHealthContext289&&window.hhGetLenaHealthContext289(p);
  if(ctx&&ctx.profile!==p)throw Error('Profilazonosítási eltérés, feldolgozás leállítva.');
  var extra=addExtra(ctx,question),data=simplify(report,extra);
  data.question=question;
  logSource(data);
  if(!data.sources.length)throw Error('Ehhez a profilhoz most nem sikerült mérést vagy előzményt beolvasni.');
  print('A kérdés elemzése és a válasz készítése…');
  var response=await svc.stream('/functions/v1/smooth-endpoint',data,ctrl.signal);
  if(!response.ok){
   var body={};try{body=await response.json()}catch{}
   throw Error(errorText(body.error,response.status));
  }
  if(!(response.headers.get('Content-Type')||'').includes('text/event-stream')||!response.body)
   throw Error('Az AI-kiszolgáló nem küldött élő, ellenőrizhető válaszfolyamot.');
  print('Kapcsolat létrejött. A válasz ténylegesen érkező szövegrészleteit megjelenítem.');
  var reader=response.body.getReader(),decoder=new TextDecoder(),buffer='',complete=false,received=false;
  function eventHandler(chunk){
   var raw=chunk.split('\n'),kind='',val='';
   raw.forEach(function(line){if(line.startsWith('event:'))kind=line.slice(6).trim();if(line.startsWith('data:'))val+=line.slice(5).trim()});
   if(!val)return;
   var item;try{item=JSON.parse(val)}catch{return}
   if(kind==='stage'){print('AI: '+safe(item.message,160));return}
   if(kind==='delta'){
    if(!received){received=true;result.classList.add('on');print('A generált szöveg részletekben megérkezik…');
     try{result.scrollIntoView({behavior:'smooth',block:'nearest'})}catch(e){}}
    el('hhAi331Text').textContent+=String(item.text||'');return;
   }
   if(kind==='done'){complete=true;el('hhAi331Foot').textContent='✅ Valódi AI-válasz · modell: '+safe(item.model,40)+' · '+new Date(item.generatedAt).toLocaleString('hu-HU')+' · Beolvasott kategóriák: '+data.sources.map(function(s){return s.title}).join(', ')+'. A források összesítése nem jelenti a teljes PDF-ek feldolgozását.';print('AI-kutatás befejeződött.');return}
   if(kind==='error')throw Error('Az AI-válaszfolyam megszakadt. A részleges szöveg nem tekinthető kész elemzésnek.');
  }
  while(true){
   var step=await reader.read();if(step.done)break;
   if(turn!==epoch||profile()!==p)throw Error('Profilváltás miatt az AI-kutatás megszakadt.');
   buffer+=decoder.decode(step.value,{stream:true}).replace(/\r\n/g,'\n');
   var packets=buffer.split('\n\n');buffer=packets.pop()||'';
   for(var packet of packets)eventHandler(packet);
  }
  if(!complete)throw Error('Nem érkezett teljes AI-válasz. A részleges szöveget töröltem.');
 }catch(e){
  result.classList.remove('on');el('hhAi331Text').textContent='';el('hhAi331Foot').textContent='';
  if(turn===epoch){
   var msg=e&&e.message||'Ismeretlen AI-hiba.';
   if(/failed to fetch|networkerror|load failed/i.test(msg))msg='A kutatómotor nem érhető el. Nincs kész válasz. Ellenőrizni kell a szerverkapcsolatot.';
   showError(msg);
  }
 }finally{
  if(turn===epoch){active=null;el('hhRun299').disabled=false;q.disabled=false}
 }
}
window.addEventListener('healthhub:ask-lena-open',function(){ui()});
window.addEventListener('healthhub:central-auth-changed',refreshAuth);
window.addEventListener('healthhub:profile-changed',function(){cancel();
 var a=el('hhAi331Answer');if(a)a.classList.remove('on');var t=el('hhAi331Text');if(t)t.textContent='';
 var b=el('hhRun299');if(b)b.disabled=false;var q=el('hhSQ299');if(q)q.disabled=false;
 var term=el('hhAi331Terminal');if(term)term.classList.remove('on');
});
window.HH_ASK_LENA_AI_V331={initialize:ui,version:'333'};
document.documentElement.dataset.healthhubRealAi='1.333';
})();
