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
  '#hhLenaSmart299 #hhAi331Answer.on{min-height:calc(100dvh - env(safe-area-inset-top, 0px) - 20px)}'+
 '#hhAi331Answer .hhAi331Text{font-size:14px;line-height:1.74;overflow-wrap:anywhere}'+
 '#hhAi331Answer .hhAi331Text p{margin:0 0 12px}'+
 '#hhAi331Answer .hhAi331Text h3{margin:15px 0 8px;font-size:15px;line-height:1.5;color:#126e62}'+
 '#hhAi331Answer .hhAi331Text strong{color:#155875;font-weight:850}'+
 '#hhAi331Answer .hhAi331Text ul{margin:5px 0 13px;padding-left:22px}'+
 '#hhAi331Answer .hhAi331Text li{margin:5px 0}'+
 '#hhLenaSmart299 #hhAi331Answer{scroll-margin-top:calc(env(safe-area-inset-top, 0px) + 5px);--lena-accent:#2f78b7;--lena-accent-deep:#185b91;--lena-ink:#173d58;--lena-soft:#ecf6ff;--lena-border:#bcd9ed;background:linear-gradient(165deg,#f0f8ff,#fff 65%);border-color:var(--lena-border);color:var(--lena-ink);padding:18px 16px}'+
 '#hhLenaSmart299 #hhAi331Answer[data-profile="monika"]{--lena-accent:#d95690;--lena-accent-deep:#aa336a;--lena-ink:#582d48;--lena-soft:#fff0f7;--lena-border:#efbed7;background:linear-gradient(165deg,#fff0f7,#fff 65%)}'+
 '#hhLenaSmart299 #hhAi331Answer h2{color:var(--lena-accent-deep);font-size:19px;line-height:1.35;margin:0 0 14px;display:flex;align-items:center;gap:8px}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text{font-size:clamp(15px,3.8vw,17px);line-height:1.68;color:var(--lena-ink)}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text strong{color:var(--lena-accent-deep);font-weight:850}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaBlock{background:#fff;border:1px solid var(--lena-border);border-radius:16px;margin:0 0 11px;padding:13px 14px;box-shadow:0 3px 11px rgba(23,73,101,.045);min-width:0}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaLead{background:var(--lena-soft);border-color:var(--lena-border)}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaUrgent{background:#fff3ee;border-color:#e5b1a3}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaIcon{font-size:19px;display:inline-flex;align-items:center;justify-content:center;width:31px;height:31px;flex:0 0 31px;border-radius:11px;background:var(--lena-soft);margin-right:8px;vertical-align:middle}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaBlock>p{margin:0}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaBlock>h3{font-size:15px;line-height:1.42;color:var(--lena-accent-deep);margin:0 0 8px}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNature353{background:linear-gradient(155deg,#edf9ee,#fff 78%);border:1px solid #aad7b1;box-shadow:0 4px 13px #247b4021}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNature353 h3{color:#247341!important}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaBlock ul{margin:6px 0 0;padding-left:22px}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaMetric{color:var(--lena-accent-deep);font-weight:790;white-space:normal}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaBlockHeader{display:flex;align-items:center;gap:7px;margin-bottom:9px;font-weight:790;color:var(--lena-accent-deep);font-size:13px}'+
  '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNarrative394{padding:17px 18px;margin-bottom:14px}'+
  '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNarrative394>p{margin:0 0 13px;line-height:1.75}'+
  '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNarrative394>p:last-child{margin-bottom:0}'+
  '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNarrative394>p+p{margin-top:7px}'+
  '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNarrative394>h3{font-size:16px;line-height:1.5;margin:0 0 15px;color:var(--lena-accent-deep)}'+
  '#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNarrative394>ul{margin:4px 0 12px;padding-left:22px}'+
 '#hhLenaSmart299 #hhAi331Answer .hhAi331Foot{border-top-color:var(--lena-border);color:#667d8b}'+
 '@media(max-width:440px){#hhLenaSmart299 #hhAi331Answer{padding:15px 12px}#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaBlock{padding:12px}#hhLenaSmart299 #hhAi331Answer .hhAi331Text .hhLenaNarrative394{padding:15px 14px}}'+
 '#hhAi331Answer .hhAi331Foot{font-size:11px;line-height:1.6;color:#678392;margin-top:14px;border-top:1px solid #d2e9e4;padding-top:9px}'+
 '#hhAi331AddedValue{font-size:12px;line-height:1.55;font-weight:600;color:var(--lena-accent-deep,#226079);margin:15px 0 7px;padding:11px 0;border-top:1px solid var(--lena-border,#cbdbe8)}'+
 '#hhAi331AddedValue[hidden]{display:none!important}'+
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
function setAnswerProfile(p){
 var card=el('hhAi331Answer'),heading=el('hhAi331Heading');
 if(card)card.setAttribute('data-profile',p);
 if(heading)heading.textContent=p==='monika'?'💗 Léna válasza Mónikának':'💙 Léna válasza Zsoltnak';
}
function renderAnswerText(raw){
 var host=el('hhAi331Text');if(!host)return;
 var frag=document.createDocumentFragment(),para=null,list=null;
 function appendMeasured(node,chunk){
  var rx=/\d{4}[.\\/-]\d{1,2}[.\\/-]\d{1,2}|\d{2,3}\/\d{2,3}(?:\s*(?:Hgmm|mmHg))?|\d+(?:[.,]\d+)?\s*(?:kg|hPa|mmol\/L|mmHg|Hgmm|%|°C|\/perc|perc)/gi;
  var match,start=0;
  while((match=rx.exec(chunk))){
   if(match.index>start)node.appendChild(document.createTextNode(chunk.slice(start,match.index)));
   var metric=document.createElement('strong');metric.className='hhLenaMetric';
   metric.textContent=match[0];node.appendChild(metric);start=rx.lastIndex;
  }
  if(start<chunk.length)node.appendChild(document.createTextNode(chunk.slice(start)));
 }
 function addFormatted(node,value){
  var pattern=/\*\*([^*\n]+)\*\*/g,m,start=0;
  while((m=pattern.exec(value))){
   appendMeasured(node,value.slice(start,m.index));
   var b=document.createElement('strong');b.textContent=m[1];node.appendChild(b);
   start=pattern.lastIndex;
  }
  appendMeasured(node,value.slice(start));
 }
 var normalized=String(raw||'').slice(0,26000).replace(/\r\n?/g,'\n');
 var parts=normalized.split(/\n\s*\n/);
 normalized=parts.map(function(chunk){
  if(chunk.length<380 || /^\s*(?:#{1,3}\s|[-*]\s|[0-9]+[.)]\s)/.test(chunk))return chunk;
  var sentences=chunk.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÖŐÚÜŰ])/u);
  if(sentences.length<2)return chunk;
  var result=[],acc='';
  sentences.forEach(function(sentence){
   if(acc.length>160&&acc.length+sentence.length>355){
    result.push(acc);acc=sentence;
   }else acc+=(acc?' ':'')+sentence;
  });
  if(acc)result.push(acc);
  return result.join('\n\n');
 }).join('\n\n');
 normalized.split('\n').forEach(function(row){
  var line=row.trim(),h=line.match(/^#{1,3}\s+(.+)$/),
   plainHeading=line.match(/^\*\*(.+?)\*\*:?$/),
   // Clinical models often number sections "(1) Facts" without markdown.
   numberedHeading=line.match(/^\(([1-9][0-9]?)\)\s+(.{3,130})$/),
   item=line.match(/^(?:[-*]|[0-9]+[.)])\s+(.+)$/);
  if(!line){para=null;list=null;return}
  if(h||plainHeading||numberedHeading){
   para=null;list=null;
   var heading=document.createElement('h3');
   heading.textContent=h?h[1]:plainHeading?plainHeading[1]:'('+numberedHeading[1]+') '+numberedHeading[2];
   frag.appendChild(heading);return;
  }
  if(item){
   para=null;
   if(!list){list=document.createElement('ul');frag.appendChild(list)}
   var li=document.createElement('li');addFormatted(li,item[1]);list.appendChild(li);return;
  }
  list=null;
  if(!para){para=document.createElement('p');frag.appendChild(para)}
  else para.appendChild(document.createElement('br'));
  addFormatted(para,line);
 });
 // v394: one readable card for EACH genuine topic, not one per paragraph.
 // Auto labels such as "⚠️ Fontos teendő" were previously assigned to
 // historical descriptions of loss of consciousness, blood pressure etc.
 // Those are not new medical instructions; keep their narrative together.
 var visual=document.createDocumentFragment(),current=null,sectionCount=0;
 function newCard(lead){
  var box=document.createElement('section');
  box.className='hhLenaBlock hhLenaNarrative394'+(lead?' hhLenaLead':'');
  visual.appendChild(box);sectionCount++;return box;
 }
 Array.from(frag.childNodes).forEach(function(node){
  var tag=String(node.tagName||'').toLowerCase();
  if(tag==='h3'){
   current=newCard(sectionCount===0);
   if(/természetes praktik|otthoni praktik|természetes enyhítés/i.test(node.textContent||''))
    current.className+=' hhLenaNature353';
   // Only the author's explicit emergency heading gets the alert styling.
   // Historic events or measurements must not trigger an urgent badge.
   if(/^(?:⚠️?\s*)?(?:azonnali teendő|sürgős teendő|vészhelyzet)/i.test(node.textContent||''))
    current.className+=' hhLenaUrgent';
   current.appendChild(node);return;
  }
  if(tag==='p'||tag==='ul'){
   if(!current)current=newCard(sectionCount===0);
   current.appendChild(node);return;
  }
  if(!current)current=newCard(sectionCount===0);
  current.appendChild(node);
 });
 host.replaceChildren(visual);
}
// Align the visible answer box with the TOP of the web viewport, not the
// internal overflow:hidden .app. scrollIntoView may scroll the clipped ancestor
// and leave the completed research monitor above the answer on Android.
function alignAnswerTop(){
 var answer=el('hhAi331Answer'),page=el('hhLenaSmart299');
 if(!answer||!answer.classList.contains('on')||!page||!page.classList.contains('on'))return;
 requestAnimationFrame(function(){
  requestAnimationFrame(function(){
   if(!answer.isConnected||!answer.classList.contains('on')||!page.classList.contains('on'))return;
   var rect=answer.getBoundingClientRect();
   var root=document.scrollingElement||document.documentElement;
   var maxScroll=Math.max(0,root.scrollHeight-window.innerHeight);
   var target=Math.max(0,Math.min(maxScroll,rect.top+window.scrollY-6));
   window.scrollTo({top:target,behavior:'instant'});
  });
 });
}
function showError(message){
 var err=el('hhAi331Error');if(err){err.textContent='⚠ '+message;err.classList.add('on')}
 print('A kutatás megszakadt.');
}
function showLocalAnswer(question,p,report){
 if(profile()!==p)return false;
 var safeFallback=window.HH_ASK_LENA_SAFE_FALLBACK_V511;
 if(!safeFallback||typeof safeFallback.localAnswer!=='function')return false;
 var local=safeFallback.localAnswer(report,question,p,window.HH_LENA_UNIVERSAL_V330);
 if(!local||local.profile!==p)return false;
 setAnswerProfile(p);renderAnswerText(local.text);
 var answer=el('hhAi331Answer'),foot=el('hhAi331Foot');
 if(foot)foot.textContent=local.disclaimer+
  (local.measuredFacts?' · 📊 '+local.measuredFacts+' helyi, aktív profilból kiolvasott mérési tétel.':' · Személyes mérést nem olvastam ki.');
 if(answer)answer.classList.add('on');
 var value=el('hhAi331AddedValue');
 if(value){value.textContent='🛟 Safe Fallback: helyi alapválasz. '+(local.measuredFacts?
  local.measuredFacts+' valódi, profilhoz kötött mérési megfigyelést is felhasznál.':'Személyes mérés nem áll rendelkezésre.');
  value.hidden=false;}
 print('🛟 Safe Fallback: azonnali helyi, nem generatív válasz. Nem állítom, hogy AI-kutatás történt.');
 setTimeout(alignAnswerTop,80);
 return true;
}
function ui(){
 var btn=el('hhRun299'),q=el('hhSQ299');
 if(!btn||!q||btn.dataset.ai331)return;
 styles();btn.dataset.ai331='1';btn.textContent='🔎 Kutatás';
 btn.title='Kutatás a kiválasztott profil elérhető adatai alapján';
 var actions=btn.closest('.askActions');if(!actions)return;
 // One deliberate user action authorizes this one AI request; no extra checkbox.
 // We still tell the user exactly where sensitive health data goes.
 // Privacy details remain accessible through the compact document-source control.
 // Do not add the verbose paragraph between the composer and AI answer.
 var privacy=document.createElement('span');privacy.id='hhAi331Privacy';
 privacy.hidden=true;actions.parentNode.insertBefore(privacy,actions.nextSibling);
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
 answer.innerHTML='<h2 id="hhAi331Heading">💙 Léna válasza</h2><div class="hhAi331Text" id="hhAi331Text"></div><div id="hhAi331AddedValue" hidden></div><div class="hhAi331Foot" id="hhAi331Foot"></div>';
 term.parentNode.insertBefore(answer,term.nextSibling);
 setAnswerProfile(profile());
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
 if(wt.delta7d!=null){
  var w7=Number(wt.delta7d),w30=Number(wt.delta30d);
  if(Math.abs(w7)>7||(Number.isFinite(w30)&&Math.abs(w7-w30)>12)){
   put('trends','HIBAGYANÚ: irreális 7n testsúlyváltozás',wt.delta7d+' kg; ellenőrizendő forrásadat, nem valós trend');
  }else put('trends','Testsúly 7n változás',wt.delta7d+' kg');
 }
 if(wt.qualityWarning7d)put('trends','Karanténba helyezett testsúlytrend',wt.qualityWarning7d);
 if(wt.qualityWarning30d)put('trends','Ellenőrzendő 30n testsúlytrend',wt.qualityWarning30d);
 if(wt.delta30d!=null)put('trends','Testsúly 30n változás',wt.delta30d+' kg');
 if(p.d7Avg!=null)put('trends','Pulzus 7n átlag',p.d7Avg+'/perc');
 var heart=context.heartRate||{};
 if(heart.d7Avg!=null)put('trends','Watch pulzus 7n átlag',heart.d7Avg+'/perc');
 (sl.recent||[]).slice(0,12).forEach(function(x){put('sleep','Alvásszakasz',x.durationMin+' perc, '+safe(x.startTime,30)+' → '+safe(x.endTime,30),x.endTime)});
 (ac.recent||[]).slice(0,12).forEach(function(x){put('activity','Napi aktivitás',x.steps+' lépés, '+x.activeMinutes+' aktív perc, '+x.distanceKm+' km',x.date)});
 (context.medications||[]).slice(0,12).forEach(function(x){put('medication','Rögzített gyógyszer',x.name+' '+safe(x.strength,45)+' '+safe(x.schedule,80)+' · '+safe(x.status,35))});
 (context.supplements||[]).slice(0,8).forEach(function(x){put('supplement','Felhasználói étrend-kiegészítő · szedése nem igazolt',x.name+' '+safe(x.strength,60)+' · státusz: '+safe(x.status,30)+' · '+safe(x.activeIngredient,60))});
 var normalizedQ=safe(q,300).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 var cardiac=/sziv|kardio|crt|ritmus|defibr|pacemaker|ejekcio|infarkt|szivelegtelenseg|pitvar/i.test(normalizedQ);
 var words=normalizedQ.split(/[^a-z0-9]+/).filter(function(v){return v.length>=3});
 var matching=(docs.index||[]).map(function(d){
  var src=(safe(d.title,140)+' '+safe(d.category,60)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  var cardiacWeight=cardiac&&/sziv|kardio|crt|defibr|ritmus|echo|echokard|ejekcio|hospital|korhaz|elektrofiz|pacemaker/i.test(src)?12:0;
  return {d:d,score:cardiacWeight+words.reduce(function(sum,w){return sum+(src.indexOf(w)>=0?1:0)},0)}
 }).sort(function(a,b){return b.score-a.score});
 var limit=cardiac?12:8;
 matching.slice(0,limit).forEach(function(x){
  var d=x.d;
  put('documents','Leletindex · '+safe(d.category,35),d.title,d.date);
  var explanation=d.explanation;
  if(explanation&&explanation.summary)put('documents','Korábbi leletmagyarázat (nem eredeti PDF)',explanation.summary,d.date);
  if(explanation&&explanation.keyFindings&&Array.isArray(explanation.keyFindings))
   explanation.keyFindings.slice(0,2).forEach(function(v){put('documents','Korábbi leletmagyarázat · megállapítás',v,d.date)});

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
 if(code==='invalid_photo_or_consent')return 'A fotóhoz hiányzik a jóváhagyás, vagy a kép nem megfelelő formátumú. Csatold újra a fényképet.';
 if(code==='invalid_or_no_consent')return 'Az AI-kiszolgáló a kérés szerkezetét vagy hozzájárulását elutasította. Biztonságos válasz-üzemmódra váltok.';
 if(code==='request_too_large')return 'A kép túl nagy az AI-kiszolgáló számára. Próbálj kisebb fotót csatolni.';
 if(status===401||code==='login_required')return 'Jelentkezz be a Központi Health Vaultba, hogy a személyes AI-kutatás biztonságosan elindulhasson.';
 if(status===403||code==='forbidden_profile')return 'Ehhez a profilhoz nincs igazolt hozzáférés. Nincs adatküldés.';
 if(status===429||code==='rate_limit')return 'Óránként legfeljebb 20 AI-kutatás indítható.';
 if(code==='server_not_configured')return 'Hiányzik a szerveroldali AI-konfiguráció.';
 if(code==='ai_upstream_401'||code==='ai_upstream_402'||code==='ai_upstream_429')return 'Az AI-szolgáltatás kulcsa, kerete vagy limitje ellenőrzést igényel ('+code+').';
 return 'AI-kutatás sikertelen: '+safe(code||'kapcsolati vagy szerverhiba',140)+'.';
}
async function run(opts){
 var deep=!!(opts&&opts.depth==='detailed');
 ui();if(active){print('Már fut egy kutatás.');return}
 var q=el('hhSQ299'),p=profile(),question=q&&q.value.trim();
 var term=el('hhAi331Terminal'),result=el('hhAi331Answer'),err=el('hhAi331Error');
 setAnswerProfile(p);
 term.classList.add('on');el('hhAi331Lines').innerHTML='';err.classList.remove('on');result.classList.remove('on');
 el('hhAi331Text').textContent='';el('hhAi331Foot').textContent='';
 var value=el('hhAi331AddedValue');if(value){value.hidden=true;value.textContent='';}
 var old=el('hhLenaAnswer329');if(old)old.remove();
 var legacy=el('hhProg299');if(legacy)legacy.classList.remove('on');
 if(el('askWork330'))el('askWork330').classList.remove('on');
 if(!question||question.length<3){showError('Írj be egy érdemi kérdést.');return}
 var svc=window.HH_DAILY_HEALTH_SYNC_V319;
 if(!svc||!svc.stream){showError('A titkosított AI-kapcsolat még nem áll rendelkezésre.');showLocalAnswer(question,p,null);return}
 if(!svc.getStatus().authenticated){showError('Egyszeri, biztonságos bejelentkezés szükséges az első kutatáshoz.');showLocalAnswer(question,p,null);if(svc.openLogin)svc.openLogin();return}
 var allowed=svc.getStatus().authorizedProfiles;
 if(Array.isArray(allowed)&&!allowed.includes(p)){showError('A bejelentkezett fióknak nincs jogosultsága '+(p==='monika'?'Mónika':'Zsolt')+' profiljához.');showLocalAnswer(question,p,null);return}
 // I-09 MKB: consume explicit one-use approval only when starting research.
 // No approved MKB data is retrieved or transmitted automatically.
 var mkbGrant=null,mkbConsent=window.HH_MKB_CONSENT_V677;
 if(mkbConsent&&typeof mkbConsent.consume==='function')
  mkbGrant=mkbConsent.consume(p,question);
 var turn=++epoch,ctrl=new AbortController();active=ctrl;
 el('hhRun299').disabled=true;q.disabled=true;
 try{q.blur()}catch(e){}
 window.dispatchEvent(new CustomEvent('healthhub:ask-lena-start',{detail:{profile:p}}));
 print(deep?'Részletes kutatás indul, több forrás összevetésével…':'Kapcsolódás a kutatómotorhoz…');
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
  var verifiedSleep=window.HH_SLEEP_EVIDENCE_V651;
  if(verifiedSleep&&typeof verifiedSleep.getContext==='function')ctx=verifiedSleep.getContext(p,ctx);
  if(ctx&&ctx.profile!==p)throw Error('Profilazonosítási eltérés, feldolgozás leállítva.');
  var extra=addExtra(ctx,question);
  if(ctx&&ctx.sleep&&ctx.sleep.evidence){
   var ev=ctx.sleep.evidence;
   extra.unshift({domain:'sleep',label:'Sleep I-03 · ellenőrzött forrás',
    value:safe(ev.source+' · '+ev.status+' · '+(ev.sessions==null?'nincs ellenőrizhető adat':ev.sessions+' alvásszakasz')+(ev.warning?' · '+ev.warning:''),240),
    at:safe(ev.exportedAt||'',35)});
  }
  var data=simplify(report,extra);
  // Intelligence Foundation: require source/provenance validation locally.
  // No extra network or local health-data writes are performed.
  var intelligenceGate=window.HH_INTELLIGENCE_GATE_V388;
  if(!intelligenceGate||typeof intelligenceGate.prepare!=='function')
   throw Error('Intelligence adatellenőrzés nem érhető el. Nem indítok ellenőrizetlen AI-kutatást.');
  var intelligence=intelligenceGate.prepare(data,ctx);
  data=intelligence.payload;
  // I-08: reuse the same v328 validated private Dropbox snapshot. No new
  // fetch, periodic AI call, source mutation or permission escalation.
  var lifestyleEngine=window.HH_SLEEP_DIGITAL_INTELLIGENCE_V590;
  if(lifestyleEngine&&typeof lifestyleEngine.enrich==='function'){
   var digitalSnapshot=typeof bridge.getDigital==='function'?bridge.getDigital(p):null;
   var linked=lifestyleEngine.enrich(data,ctx,digitalSnapshot,{now:Date.now()});
   if(linked.profile!==p||turn!==epoch||profile()!==p)
    throw Error('I-08: profilváltás miatt a közös alvás és digitális elemzés megszakadt.');
   data=linked.payload;
   print(linked.digitalAvailable?
    '🌙📱 I-08: Alvás + Digitális Wellness · '+linked.linkedNights+
    ' időrendileg párosítható éjszaka · csak ellenőrzött, hiányos megfigyelésekből.':
    '🌙📱 I-08: Alvásadatok elérhetők, de a Digitális Wellness nem ellenőrizhető ehhez a profilhoz.');
  }
  if(intelligence.ledgerQuality){
   print('🧠 Intelligence Ledger I-02: '+intelligence.ledgerQuality.count+
    ' egyedi mérési bejegyzés · '+intelligence.ledgerQuality.uniqueSources+' adatforrás'+
    (intelligence.sourceDisagreements?' · '+intelligence.sourceDisagreements+' forráseltérés (nem diagnózis)':'')+
    (intelligence.ledgerWarnings?' · '+intelligence.ledgerWarnings+' adatminőségi jelzés':''));
  }
  if(intelligence.trendsQuality){
   var tq=intelligence.trendsQuality;
   print('📈 Intelligence Trends I-03: lezárt napok '+tq.completedThrough+
    ' · lépések '+tq.stepCoverage7+'%, alvás '+tq.sleepCoverage7+'%, pulzus '+tq.pulseCoverage7+
    '% lefedettség (7 nap) · '+tq.issues+' adatkorlát jelzés');
  }
  if(intelligence.flags.length){
   print('🔎 Adatminőség: '+intelligence.flags.length+' ellenőrzendő forrás. Régi méréseket nem kezelünk aktuálisként.');
  }else print('✅ Adatminőség: források és időbélyegek ellenőrizve.');
  var research=window.HH_DEEP_RESEARCH_V393;
  if(!research||!research.decide||!research.apply)
   throw Error('Mélyelemzés: a kutatási terv nem érhető el. Nem küldök ellenőrizetlen AI-kérést.');
  var researchPlan=research.decide(question);
  if(deep)researchPlan.mode='deep';
  print(researchPlan.mode==='deep'?'🧠 MÉLYKUTATÁS: eredeti források átvizsgálása és időrend összeállítása…':
   '🔎 Személyes kutatás: kérdéshez illesztett forrásellenőrzés…');
  data.depth=researchPlan.mode==='deep'?'detailed':'standard';
  data.question=question;
  var evidence=window.HH_ASK_LENA_EVIDENCE_V364;
  if(evidence&&evidence.prepare){
   print('📚 Kapcsolódó leletek és JSON-összefoglalók keresése…');
   var documents=await evidence.prepare(question,p,{plan:researchPlan});
   if(turn!==epoch||profile()!==p)throw Error('Profilváltás miatt a leletkutatás megszakadt.');
   data.documentEvidence=documents.items||[];
   data.originalDocumentsConsent=!!documents.originalConsent;
   print('📚 Forrásfelderítés: '+(documents.diagnostics&&documents.diagnostics.matched||0)+
    ' kapcsolódó lelet · '+documents.originals+' eredeti PDF-oldal · '+
    documents.summaries+' korábbi JSON-magyarázat.');
   if(researchPlan.documents&&documents.diagnostics){
    var dd=documents.diagnostics;
    var statusText=dd.status==='no_original_consent'?'eredeti PDF-feldolgozás nincs engedélyezve':
      dd.status==='original_pages_unavailable'?'nem sikerült eredeti PDF-kivonatot olvasni':
      dd.status==='original_pages_available'?'eredeti oldalkivonatok elérhetők':'nincs kapcsolódó lelet';
    print('📚 PDF-hozzáférés: '+dd.attempted+' fájl / '+dd.pagesScanned+' átvizsgált oldal · '+statusText);
    if(dd.totalIndexed){
     print('📂 Eredeti leletindex: '+dd.totalIndexed+' profilhoz tartozó irat · '+
      dd.matched+' releváns jelölt · '+dd.rankedWithExplanation+' korábbi értelmezéssel.');
    }
    if(!documents.originals&&dd.reasonsByCode){
     var reasonKeys=Object.keys(dd.reasonsByCode);
     var labels={
      google_drive_not_authorized:'Drive-kapcsolat nem elérhető',
      google_drive_reconnect_required:'Drive ismételt engedélyezése szükséges ezen a böngészőn',
      local_document_missing:'helyi dokumentummásolat hiányzik',
      local_pdf_missing:'a helyi eredeti PDF hiányzik',
      drive_archive_file_missing:'nem található az eredeti fájl a Drive-archívumban',
      no_searchable_pdf_text:'a PDF-ben nincs kereshető szövegréteg',
      pdf_read_failed:'a PDF beolvasása nem sikerült',
      drive_archive_identity_mismatch:'az archív fájl profilazonossága nem egyezik',
      drive_archive_metadata_failed:'a távoli fájl azonossága nem ellenőrizhető',
      drive_archive_search_failed:'Drive-archívum lekérdezési hiba'
     };
     var errors=reasonKeys.slice(0,3).map(function(k){return(dd.reasonsByCode[k]||0)+'× '+(labels[k]||k)});
     if(errors.length)print('🔎 Eredeti PDF-ek elérésének akadálya: '+errors.join('; '));
    }
    if(!documents.originals&&researchPlan.clinical&&!documents.summaries){
     print('📚 Ehhez a részletes történethez most nincs feldolgozható leletszöveg.');
    }
   }
  }
  // I-04: clinical evidence validation after existing authorized retrieval.
  // No new PDF, document or clinical record is fetched by this module.
  var clinicalEngine=window.HH_CLINICAL_EVIDENCE_V391;
  if(!clinicalEngine||typeof clinicalEngine.assemble!=='function')
   throw Error('Clinical Intelligence: a klinikai forrásellenőrzés nem érhető el. Az AI-kutatás nem indul.');
  var clinicalCtx=window.hhGetLenaHealthContext289&&window.hhGetLenaHealthContext289(p);
  if(!clinicalCtx||clinicalCtx.profile!==p||turn!==epoch||profile()!==p)
   throw Error('Clinical Intelligence: profil- vagy kontextuseltérés, a kutatás megszakadt.');
  var clinical=clinicalEngine.assemble(data,clinicalCtx,{expectedProfile:p});
  data=clinical.payload;
  if(documents&&researchPlan.documents&&Array.isArray(documents.inventory)&&documents.inventory.length){
   var idxItems=documents.inventory.slice(0,8).map(function(d){
    return (d.date||'Dátum nem igazolt')+' · '+String(d.title||'').slice(0,95)+
     (d.summaryAvailable?' · korábbi leletmagyarázattal':' · csak nyilvántartási adat');
   });
   var indexed='A HealthHub-ban már nyilvántartott releváns iratok ('+
    documents.diagnostics.totalIndexed+' összes profilhoz tartozó dokumentum, '+
    documents.diagnostics.matched+' keresési találat). Az index nem eredeti PDF-szöveg, '+
    'de az irat meglétét mutatja. '+idxItems.join(' | ');
   if(!clinical.quality.originals)indexed+=' | FIGYELEM: az eredeti fájlok ebben a futásban nem voltak kiolvashatók. Ez NEM jelenti azt, hogy a történelmi esemény nincs dokumentálva.';
   var indexFact={domain:'documents',label:'I-04 v396 · dokumentumindex és hozzáférési korlát',
    value:indexed.slice(0,1700)};
   data.extra=(Array.isArray(data.extra)?data.extra:[]).concat([indexFact]);
  }
  // I-07: connect only timestamped, source-backed observations. A link is not a diagnosis.
  var contextualEngine=window.HH_CONTEXTUAL_REASONING_I07_V402;
  if(!contextualEngine||typeof contextualEngine.prepare!=='function')
   throw Error('I-07 Contextual Reasoning nem érhető el; nem küldünk részleges klinikai kontextust.');
  var contextual=contextualEngine.prepare(data,clinicalCtx,clinical);
  data=contextual.payload;
  if(contextual.links.length)print('🔗 I-07: '+contextual.links.length+' forráshoz kötött kapcsolat; ok-okozati állítás nélkül.');
  var customized=research.apply(data,question,clinical,researchPlan);
  data=customized.payload;
  var narrativeEngine=window.HH_NARRATIVE_INTELLIGENCE_I06_V402;
  if(!narrativeEngine||typeof narrativeEngine.apply!=='function')
   throw Error('I-06 Narrative Intelligence nem érhető el.');
  var narrative=narrativeEngine.apply(data,question,customized.plan,clinical);
  data=narrative.payload;
  print('🧠 Kutatási mélység: '+(customized.plan.mode==='deep'?'részletes':'fókuszált')+
   ' · '+clinical.quality.originals+' eredeti PDF-oldal · bizonytalan állítások külön megjelölve.');
  print('📚 Clinical Evidence I-04: '+clinical.quality.originals+' eredeti PDF-kivonat · '+
   clinical.quality.summaries+' JSON-magyarázat · '+clinical.quality.medications+
   ' profilban szereplő gyógyszer · '+clinical.quality.rejected+' kizárt forrás.');
  if(clinical.warnings.length)
   print('🛡️ Klinikai korlátok: korábbi értelmezést vagy gyógyszerlistát nem tekintünk automatikusan megerősített diagnózisnak.');
  var follow=window.HH_LENA_FOLLOWUP_V364;
  if(follow&&follow.consume){
   var previous=follow.consume(p,question);
   if(previous)data.followup=previous;
  }
  var camera=window.HH_ASK_LENA_PHOTO_V353;
  var shot=camera&&camera.get?camera.get(p):null;
  if(shot){
   if(!shot.approved)throw Error('A fényképes elemzéshez egyszeri hozzájárulás szükséges. Nyisd meg a kamera menüt.');
   data.photo={mime:'image/jpeg',base64:shot.base64};
   data.photoConsent=true;
   print('📷 Engedélyezett fotó előkészítése az AI-feldolgozáshoz…');
  }
  // I-09: signed-off-for-this-run MKB notes enter this research after
  // existing I-04/I-07 checks and BEFORE final I-05 quality preflight.
  var mkbSourceUsed=0;
  if(mkbGrant&&mkbGrant.length){
   if(turn!==epoch||profile()!==p)
    throw Error('I-09: profilváltás miatt nem továbbítható az orvosi forráskontextus.');
   var mkbPacker=window.HH_MKB_AI_CONTEXT_V677;
   if(!mkbPacker||typeof mkbPacker.pack!=='function'){
    print('📚 I-09: A forráskontextus előkészítője nem érhető el; MKB-adat nem kerül továbbításra.');
   }else{
    var packed=mkbPacker.pack(data,p,mkbGrant,question);
    if(packed.added){
     data=packed.payload;
     mkbSourceUsed=packed.originalExcerpts||0;
     print('🔐 I-09: '+packed.added+
      ' külön engedélyezett, forrásolt orvosi megfigyelés szerepel majd a kutatás kérésében, ellenőrzésre váró jelöléssel.');
    }else print('📚 I-09: Az orvosi tényjelöltek nem kerültek továbbításra; a kérés méretkorlátját megőriztük.');
   }
  }
  mkbGrant=null;
  // I-05: final source hygiene after I-02/03/04 + I-06/07/I-09 and any approved photo.
  var qualityEngine=window.HH_CLINICAL_QUALITY_GATE_I05_V402;
  if(!qualityEngine||typeof qualityEngine.preflight!=='function'||typeof qualityEngine.finalAudit!=='function')
   throw Error('I-05 Clinical Quality Gate nem érhető el.');
  var quality=qualityEngine.preflight(data,p);
  data=quality.payload;
  // v680 fail-closed: if the question names the user's own report but
  // there is no original excerpt, NEVER emit a plausible generic story.
  // Medical education questions without a personal record are unaffected.
  var lookupText=String(question||'').toLocaleLowerCase('hu-HU')
   .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  var asksOwnDocument=/(lelet|labor|tenyeszt|pdf|dokumentum)/.test(lookupText)&&
   /(lelet(e|em|eim)|mutat|tartalmaz|meselj|20\d{2})/.test(lookupText);
  var asksHistoricalEvent=/(?:19|20)\d{2}/.test(lookupText)&&
   /(?:mi\s+tortent|mi\s+volt|esemeny|ujraeleszt|szivmegallas|koma)/.test(lookupText);
  var verifiedOriginals=(Array.isArray(data.documentEvidence)?data.documentEvidence:[])
   .filter(x=>x&&x.type==='original_pdf_extract'&&x.text&&x.page>=1);
  // v705: explicit URL-triggered Sol preview securely retrieves verified pages server-side.
  var solPreviewRequested=typeof URLSearchParams==='function'&&
   new URLSearchParams(window.location.search).get('hhSolQA')==='v1';
  if((asksOwnDocument||asksHistoricalEvent)&&researchPlan.clinical&&!verifiedOriginals.length)
   if(!(solPreviewRequested&&customized.plan.clinical&&!shot))throw Error('📚 Ehhez a saját leletkérdéshez nem érkezett ellenőrzött eredeti PDF-részlet. Nem adok helyette általános, személyesnek tűnő orvosi választ. Nyisd meg az Ask Léna → Forrásolt orvosi tudás részt, várd meg a forrásellenőrzést, ellenőrizd a releváns idézeteket, majd nyomd meg a Kutatás indítása a kiválasztott forrásokkal gombot.');
  if(quality.warnings.length)print('🛡️ I-05: '+quality.warnings.length+' adatminőségi korlátozás, forrásellenőrzés után.');
  else print('🛡️ I-05: profil, hozzájárulás és klinikai források előellenőrizve.');
  logSource(data);
  if(!data.sources.length)throw Error('Ehhez a profilhoz most nem sikerült mérést vagy előzményt beolvasni.');
  // v395 pilot: Only explicitly initiated, detailed clinical questions go
  // through the separate two-stage verified-excerpt endpoint. Routine AI,
  // photo mode and prior quick answers keep the stable existing function.
  // v679: evidence-audited three-layer medical answers are the default.
  var clinicalPilot=!!customized.plan.clinical&&!shot;
  if(clinicalPilot){
   data.depth='detailed';
   data.researchMode='clinical-v395';
   print('🧪 Clinical Evidence v395: külön kétmenetes ellenőrzött kutatás indul.');
   print('📑 Első menet: szó szerinti PDF-bizonyítékok. Második: értelmezés, majd állításellenőrzés.');
  }else print(shot?'📷 A kép és az egészségügyi adatok együttes elemzése…':'A kérdés elemzése és a válasz készítése…');
  // Explicit opt-in ONLY: normal HealthHub still calls unchanged v403.
  // Query switch exists solely for controlled Golden Standard comparison.
  var narrativeQAVersion=clinicalPilot&&typeof URLSearchParams==='function'?
   new URLSearchParams(window.location.search).get('hhNarrativeQA'):'';
  var narrativeQAMode=narrativeQAVersion==='v405'||narrativeQAVersion==='v406';
  // Explicit user-selected MKB QA URL only. Does not switch standard production traffic.
  // No automatically expanded PDF retrieval when original-document consent is absent.
  var mkbQARequested=clinicalPilot&&typeof URLSearchParams==='function'&&
   new URLSearchParams(window.location.search).get('hhMkbQA')==='v1';
  // The standing PDF grant does not replace this question's one-shot MKB approval.
  var mkbQAMode=mkbQARequested&&mkbSourceUsed>0&&data.originalDocumentsConsent===true;
  // One-shot approval. Existing original-PDF grants never imply a full-corpus grant.
  var solPreviewMode=clinicalPilot&&typeof URLSearchParams==='function'&&
   new URLSearchParams(window.location.search).get('hhSolQA')==='v1'&&
   (typeof shot==='undefined'||!shot);
  if(solPreviewMode){
   if(!window.confirm('HH Sol AI-first TESZT: engedélyezed, hogy a kiválasztott profil ÖSSZES ellenőrzött leletszövegét erre az egy kérdésre a GPT-6.1 Sol OpenAI API feldolgozza? A kísérlet API-költséggel járhat. Mégsem = nincs továbbítás.'))
    throw Error('A teljes leletállomány továbbításához nem adtál hozzájárulást. Semmit nem küldtünk el.');
   if(turn!==epoch||profile()!==p)throw Error('Időközben profilváltás történt, nem továbbíthatók az orvosi adatok.');
   data.fullCorpusConsent=true;
   // Server reads authorized originals; browser excerpts are deliberately not forwarded.
   data.documentEvidence=[];
   data.originalDocumentsConsent=false;
   print('🧪 HH Sol v705: külön teszt, teljes ellenőrzött leletállomány, egyszeri hozzájárulással. Éles Ask Léna változatlan.');
  }
  var aiRoute=solPreviewMode?'/functions/v1/hh-sol-full-corpus-preview':
   mkbQAMode?'/functions/v1/hh-mkb-search-preview':
   narrativeQAVersion==='v406'?'/functions/v1/smooth-endpoint-v406-preview':
   narrativeQAVersion==='v405'?'/functions/v1/smooth-endpoint-v405-preview':
   clinicalPilot?'/functions/v1/smooth-endpoint-v395':'/functions/v1/smooth-endpoint';
  if(mkbQAMode)print('🧪 MKB QA v1: külön, dokumentumhozzájárulással indított keresési teszt; az éles AI-végpont változatlan.');
  else if(mkbQARequested)print('🛡️ MKB QA csak az ehhez a kérdéshez külön jóváhagyott PDF-idézetekkel indul; az éles végpont marad.');
  if(narrativeQAMode)print('🧪 '+narrativeQAVersion+' kísérleti ellenőrzés: az éles v403 válaszmotor változatlan.');
  var replyData=data,simplified=false;
  var response=await svc.stream(aiRoute,replyData,ctrl.signal);
  if(!response.ok){
   var body={};try{body=await response.json()}catch{}
   var safeFallback=window.HH_ASK_LENA_SAFE_FALLBACK_V511;
   if(!clinicalPilot&&safeFallback&&safeFallback.eligibleRetry(body.error,response.status,replyData,question,p)){
    print('🛟 A részletes kérés elutasítva. Egyszerűsített AI-kérés, az eredeti kérdéssel és meglévő jogosultsággal…');
    replyData=safeFallback.compact(replyData,question,p);
    response=await svc.stream('/functions/v1/smooth-endpoint',replyData,ctrl.signal);
    simplified=response.ok;
    if(!response.ok){
     var retryBody={};try{retryBody=await response.json()}catch{}
     throw Error(errorText(retryBody.error,response.status));
    }
   }else throw Error(errorText(body.error,response.status));
  }
  if(!(response.headers.get('Content-Type')||'').includes('text/event-stream')||!response.body)
   throw Error('Az AI-kiszolgáló nem küldött élő, ellenőrizhető válaszfolyamot.');
  print('Kapcsolat létrejött. A válasz ténylegesen érkező szövegrészleteit megjelenítem.');
  var reader=response.body.getReader(),decoder=new TextDecoder(),buffer='',complete=false,received=false,answerText='',renderPending=false,completedModel='';
  function eventHandler(chunk){
   var raw=chunk.split('\n'),kind='',val='';
   raw.forEach(function(line){if(line.startsWith('event:'))kind=line.slice(6).trim();if(line.startsWith('data:'))val+=line.slice(5).trim()});
   if(!val)return;
   var item;try{item=JSON.parse(val)}catch{return}
   if(kind==='stage'){print('AI: '+safe(item.message,160));return}
   if(kind==='delta'){
    if(!received){received=true;result.classList.add('on');print('A generált szöveg részletekben megérkezik…');setTimeout(alignAnswerTop,60);}
    answerText+=String(item.text||'');
    if(!renderPending){renderPending=true;setTimeout(function(){renderPending=false;if(turn===epoch&&profile()===p)renderAnswerText(answerText)},70)}
    return;
   }
   if(kind==='done'){
    // Record only the actual model from the completed backend AI stream.
    var serverModel=typeof item.model==='string'?item.model.trim():'';
    completedModel=/^[A-Za-z0-9._:-]{3,60}$/.test(serverModel)?serverModel:'';
    var audit=item.evidenceAudit&&item.evidenceAudit.mode==='clinical-v395'?item.evidenceAudit:null;
    // A completed AI stream is not automatically a clinically verified answer.
    // Sol v705 uses a separate source-page inventory check, not the legacy v395
    // paragraph verifier. Do not claim clinical validation just because the
    // source IDs exist. Keep the old gate UNCHANGED for normal Ask Léna.
    var solAudit=solPreviewMode&&item.evidenceAudit&&item.evidenceAudit.mode==='sol-full-corpus-preview-v705'?item.evidenceAudit:null;
    if(solPreviewMode&&(!solAudit||item.model!=='gpt-6.1-sol'||
        !solAudit.citationIdsValidated||solAudit.sourcePages<1||solAudit.sourceDocuments<1||
        solAudit.hashVerifiedPages!==solAudit.sourcePages||
        solAudit.totalSourcePages!==solAudit.sourcePages+solAudit.unreadablePages||
        solAudit.visualReviewPages<0||solAudit.visualReviewPages>solAudit.sourcePages))
     throw Error('A Sol-kutatás teljes forrásellenőrző jelentése hiányzik. A válasz nem tekinthető késznek.');
    var qualityResult=qualityEngine.finalAudit(answerText,quality,audit,clinicalPilot&&!simplified&&!solPreviewMode);
    if(solPreviewMode){
     // Dedicated, factual Sol status: do not append any of the legacy v395
     // excerpt counts, old source panels or provenance labels.
     renderAnswerText(answerText);complete=true;
     var solFooter=el('hhAi331Foot');
     if(solFooter)solFooter.textContent='🧪 Golden Standard Sol v705 · GPT-6.1 Sol · '+
      solAudit.sourceDocuments+' eredeti dokumentum, '+solAudit.sourcePages+
      '/'+solAudit.totalSourcePages+' SHA-256-tal ellenőrzött, olvasható szöveges oldal · '+
      solAudit.visualReviewPages+' oldalon képi tartalom külön ellenőrizendő · '+
      (solAudit.unreadablePages?solAudit.unreadablePages+' oldal szövege nem olvasható · ':'')+
      Number(solAudit.citedPages||0)+
      ' hivatkozott oldal · forrásazonosítók ellenőrizve, orvosi tények NEM hitelesítve · '+
      new Date(item.generatedAt).toLocaleString('hu-HU');
     print('HH Sol v705 kutatás befejeződött. A forrásazonosítók létezését ellenőriztem; orvosi szakellenőrzés még nem történt.');
     return;
    }
    renderAnswerText(answerText);complete=true;el('hhAi331Foot').textContent='✅ Valódi AI-válasz · modell: '+safe(item.model,40)+' · '+new Date(item.generatedAt).toLocaleString('hu-HU')+(item.photoAnalyzed?' · 📷 Fotót is elemzett':'')+' · Beolvasott kategóriák: '+data.sources.map(function(s){return s.title}).join(', ')+(data.documentEvidence&&data.documentEvidence.some(function(x){return x.type==='original_pdf_extract'})?'. Eredeti leletek releváns kivonatait is összevetettem, nem a teljes PDF-et.':'. A korábbi leletekből JSON-magyarázatokat használtam, eredeti PDF-et nem.')+
    (intelligence.flags.length?' · ⚠️ '+intelligence.flags.length+' régi vagy bizonytalan adatforrás, nem aktuális mérésként értelmezendő.':' · ✅ Adatforrások időpontjai ellenőrizve.')+
     (intelligence.ledgerQuality?' · 🧠 I-02 napló: '+intelligence.ledgerQuality.count+' vizsgált bejegyzés, '+intelligence.sourceDisagreements+' eltérő forrásösszesítő.':'')+
     (intelligence.trendsQuality?' · 📈 I-03: 7 napos lefedettség (lépések/alvás/pulzus): '+intelligence.trendsQuality.stepCoverage7+'% / '+intelligence.trendsQuality.sleepCoverage7+'% / '+intelligence.trendsQuality.pulseCoverage7+'%; csak lezárt napok.':'')+
     ' · 📚 I-04: '+clinical.quality.originals+' eredeti PDF-kivonat és '+clinical.quality.summaries+' korábbi leletmagyarázat.'+
      ' · 🧠 v393 '+(customized.plan.mode==='deep'?'mélykutatás':'személyes kutatás')+
      (researchPlan.documents&&documents&&documents.diagnostics?' · PDF-keresés: '+documents.diagnostics.attempted+' fájl, '+documents.diagnostics.pagesScanned+' oldal.':'')+
      (!clinical.quality.originals&&!clinical.quality.summaries&&researchPlan.clinical?' · ⚠️ A személyes eseménysorhoz nem került feldolgozható klinikai forrás.':'')+
      (audit?' · 🧪 I-04 v395: '+audit.verifiedFacts+' eredeti PDF-hez kötött tény és '+(audit.summaryFacts||0)+' korábbi JSON-magyarázathoz kötött tényjelölt, '+audit.checkedParagraphs+' vizsgált bekezdés, '+audit.unverifiedDowngraded+' kizárt állítás. A másodlagos összefoglaló nem eredeti kórházi irat.':'')+
      ' · '+qualityResult.message+
      (mkbSourceUsed?' · 📚 I-09: '+mkbSourceUsed+' külön engedélyezett MKB-leletidézet továbbítva (szakmai ellenőrzésre vár)':' · 📚 I-09: nem történt új MKB-forrásátadás')+
      (contextual.links.length?' · 🔗 I-07: '+contextual.links.length+' ellenőrzött forráskapcsolat, nem ok-okozati bizonyíték.':'');
    if(narrativeQAMode&&!simplified){
     el('hhAi331Foot').textContent='🧪 KÍSÉRLETI '+narrativeQAVersion+' · '+el('hhAi331Foot').textContent+
       ' · narratív-fókusz: '+safe(audit&&audit.qaFocusMode||'nincs válasz',40)+
       ' · védelem: '+safe(audit&&audit.qaFocusReason||'ismeretlen',55)+
       (narrativeQAVersion==='v406'?
        ' · Történetellenőrzés: '+safe(audit&&audit.qaStoryReason||'nincs eredmény',60)+
        ' · forráshoz kötött bekezdés: '+Number(audit&&audit.qaStoryGrounded||0)+
        ' · hiányzó, forrással rendelkezésre álló szakaszok: '+Number((audit&&audit.qaStoryMissingStages||[]).length)+
        ' · forrásalapú pótlás: '+(audit&&audit.qaSourceFallbackUsed?'igen':'nem'):'');
    }
    var provenance=window.HH_ASK_LENA_SAFE_FALLBACK_V511;
    if(provenance&&provenance.provenance){
     var added=provenance.provenance(replyData,true,simplified?'simplified':'standard');
     el('hhAi331Foot').textContent+=' · '+added;
     var addedBox=el('hhAi331AddedValue');
     if(addedBox){addedBox.textContent=added;addedBox.hidden=false;}
    }
    if(!simplified){
     var proof=clinicalEngine.createPanel(clinical,p);
     if(proof&&turn===epoch&&profile()===p)el('hhAi331Foot').appendChild(proof);
    }
    print('AI-kutatás befejeződött.');return}
   if(kind==='error'){
    if(solPreviewMode)throw Error('Sol v705 teszthiba: '+safe(item.reason||item.error||'ismeretlen',90)+' · Nincs kész válasz.');
    throw Error('Az AI-válaszfolyam megszakadt. A részleges szöveg nem tekinthető kész elemzésnek.');
   }
  }
  while(true){
   var step=await reader.read();if(step.done)break;
   if(turn!==epoch||profile()!==p)throw Error('Profilváltás miatt az AI-kutatás megszakadt.');
   buffer+=decoder.decode(step.value,{stream:true}).replace(/\r\n/g,'\n');
   var packets=buffer.split('\n\n');buffer=packets.pop()||'';
   for(var packet of packets)eventHandler(packet);
  }
  if(!complete)throw Error('Nem érkezett teljes AI-válasz. A részleges szöveget töröltem.');
  if(turn===epoch&&profile()===p){
   try{window.dispatchEvent(new CustomEvent('healthhub:ask-lena-complete',{detail:{profile:p,successful:true,question:question,answer:answerText,generatedAt:new Date().toISOString(),model:completedModel,answerMode:simplified?'simplified-ai':'research-ai'}}))}catch(e){}
   // Re-align once after completion callbacks and final DOM updates.
   // No competing smooth animation: keep the last streaming position at the top.
   setTimeout(function(){if(turn===epoch&&profile()===p)alignAnswerTop()},90);
  }
 }catch(e){
  result.classList.remove('on');el('hhAi331Text').textContent='';el('hhAi331Foot').textContent='';
  if(turn===epoch){
   var add=el('hhAi331AddedValue');if(add){add.hidden=true;add.textContent='';}
   var msg=e&&e.message||'Ismeretlen AI-hiba.';
   if(/failed to fetch|networkerror|load failed/i.test(msg))msg='A kutatómotor nem érhető el. Nincs kész válasz. Ellenőrizni kell a szerverkapcsolatot.';
   showError(msg);
   // Never synthesize a fallback history when source evidence is required.
   if(!msg.includes('ellenőrzött eredeti PDF-részlet'))
    showLocalAnswer(question,p,typeof report!=='undefined'&&report&&report.profile===p?report:null);
  }
 }finally{
  if(turn===epoch){active=null;el('hhRun299').disabled=false;q.disabled=false}
 }
}
window.addEventListener('healthhub:ask-lena-open',function(){ui()});
window.addEventListener('healthhub:central-auth-changed',refreshAuth);
window.addEventListener('healthhub:profile-changed',function(){cancel();
 var a=el('hhAi331Answer');if(a)a.classList.remove('on');var t=el('hhAi331Text');if(t)t.textContent='';
 var v=el('hhAi331AddedValue');if(v){v.hidden=true;v.textContent='';}
 var b=el('hhRun299');if(b)b.disabled=false;var q=el('hhSQ299');if(q)q.disabled=false;
 var term=el('hhAi331Terminal');if(term)term.classList.remove('on');
});
window.HH_ASK_LENA_AI_V331={initialize:ui,version:'344',isBusy:function(){return!!active},runDetailed:function(){return run({depth:'detailed'})},showStoredAnswer:function(entry){
 if(!entry||!['monika','zsolt'].includes(entry.profile)||entry.profile!==profile())return false;
 var result=el('hhAi331Answer'),q=el('hhSQ299'),foot=el('hhAi331Foot');
 if(!result||!q||typeof entry.answer!=='string'||typeof entry.question!=='string')return false;
 setAnswerProfile(entry.profile);q.value=entry.question;renderAnswerText(entry.answer);
 var v=el('hhAi331AddedValue');if(v){v.hidden=true;v.textContent='';}
 if(foot){
  foot.textContent='🕘 Korábbi, mentett válasz · '+new Date(entry.generatedAt).toLocaleString('hu-HU')+' · Helyi előzmény, nem új kutatás.';
  if(/(?:-39[.,][0-9]+|-3[5-9][.,][0-9]+)\s*kg/i.test(entry.answer)){
   var warn=document.createElement('p');warn.style.color='#a13c31';
   warn.textContent='⚠️ Ebben a régi válaszban valószínűleg hibás testsúlytrend szerepel. Indíts új kutatást; ne tekintsd ezt hiteles mérésnek.';
   foot.appendChild(warn);
  }
 }
 result.classList.add('on');var terminal=el('hhAi331Terminal');if(terminal)terminal.classList.remove('on');
 setTimeout(alignAnswerTop,70);return true;
 }};
document.documentElement.dataset.healthhubRealAi='1.333';
})();
