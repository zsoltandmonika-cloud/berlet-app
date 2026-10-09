(function(){
'use strict';
/* HealthHub v342: phone-first progress/answer focus, simple microphone,
   one-tap profile switch and local, profile-isolated research history.
   Deliberately does not upload private questions or AI responses to GitHub. */
var DB='healthhub-ask-lena-history-v1',STORE='responses',MAX_PER_PROFILE=30;
var lastProfile=null,historyEpoch=0;
function el(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function code(p){return p==='monika'?'m':'z'}
function name(p){return p==='monika'?'Mónika':'Zsolt'}
function next(p){return p==='monika'?'zsolt':'monika'}
function focusPanel(id){
 var target=el(id),page=el('hhLenaSmart299');
 if(!target||!page||!page.classList.contains('on'))return;
 var f=function(){
  if(!target.isConnected)return;
  var y=window.scrollY+target.getBoundingClientRect().top-78;
  try{window.scrollTo({top:Math.max(0,y),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
  catch(e){window.scrollTo(0,Math.max(0,y))}
 };
 requestAnimationFrame(f);
}
function setCss(){
 if(el('hhAsk342Style'))return;
 var s=document.createElement('style');s.id='hhAsk342Style';
 var svg='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
 var icon='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
 s.textContent=[
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299{background:#25282c!important;color:white!important;border-radius:50%!important}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299::before{content:""!important;display:block!important;width:24px!important;height:24px!important;background:'+icon+' center/contain no-repeat!important}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299.hhLenaMicLive342{background:#c34868!important}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299.hhLenaMicLive342::before{content:"■"!important;background:none!important;color:white!important;font:600 15px/24px system-ui!important;text-align:center}',
 '#hhLenaSmart299 #hhSP299{cursor:pointer;touch-action:manipulation;transition:background .18s,color .18s}',
 '#hhLenaSmart299 #hhSP299::after{content:" ⇄";font-weight:950;font-size:15px;padding-left:7px}',
 '#hhLenaSmart299 #hhSP299:focus-visible{outline:3px solid var(--lena-ui);outline-offset:4px}',
 '#hhLenaSmart299 #hhLenaHistory342{margin:0 0 11px;box-sizing:border-box;border:1px solid var(--lena-ui-border);background:#fff;border-radius:16px;color:#39536c}',
 '#hhLenaSmart299 #hhLenaHistory342>summary{list-style:none;cursor:pointer;padding:10px 13px;font-size:13px;line-height:1.4;font-weight:780;color:var(--lena-ui-dark);user-select:none}',
 '#hhLenaSmart299 #hhLenaHistory342>summary::-webkit-details-marker{display:none}',
 '#hhLenaSmart299 #hhLenaHistory342>summary:after{content:"⌄";float:right;margin-right:2px;color:var(--lena-ui)}',
 '#hhLenaSmart299 #hhLenaHistory342[open]>summary:after{content:"⌃"}',
 '#hhLenaSmart299 #hhLenaHistory342Body{max-height:250px;overflow:auto;padding:2px 9px 10px}',
 '#hhLenaSmart299 .hhLenaHistRow342{display:flex;align-items:center;gap:6px;border-top:1px solid #e5ecf1;padding:6px 1px}',
 '#hhLenaSmart299 .hhLenaHistOpen342{border:0;background:transparent;text-align:left;flex:1;min-width:0;padding:7px 6px;color:#294f63;cursor:pointer;font:600 12px/1.45 system-ui}',
 '#hhLenaSmart299 .hhLenaHistOpen342 small{display:block;font-size:10px;color:#77909d;font-weight:400;margin-top:3px}',
 '#hhLenaSmart299 .hhLenaHistDel342{border:1px solid #dde6e8;background:#fff;border-radius:9px;padding:7px;min-height:36px;font-size:13px;cursor:pointer;color:#966371}',
 '#hhLenaSmart299 .hhLenaHistoryNote342{padding:7px 4px;color:#69818d;font-size:11px;line-height:1.5}',
 '#hhLenaSmart299 #hhLenaHistClear342{margin:7px 3px 0;padding:8px 10px;border:1px solid #e3cbd8;border-radius:9px;color:var(--lena-ui-dark);background:var(--lena-ui-soft);font-size:11px;cursor:pointer}',
 '#hhLenaSmart299 #hhAi331Terminal,#hhLenaSmart299 #hhAi331Answer{scroll-margin-top:78px}',
 '@media(prefers-reduced-motion:reduce){#hhLenaSmart299 #hhSP299{transition:none}}'
 ].join('');
 document.head.appendChild(s);
}
function openDB(){
 return new Promise(function(resolve,reject){
  if(!window.indexedDB){reject(Error('local_storage_unavailable'));return}
  var req=indexedDB.open(DB,1);
  req.onupgradeneeded=function(){
   var db=req.result;
   if(!db.objectStoreNames.contains(STORE)){
    var st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('by_profile','profile',{unique:false});
   }
  };
  req.onsuccess=function(){resolve(req.result)};
  req.onerror=function(){reject(req.error||Error('local_database_error'))};
 });
}
async function listFor(p){
 var db=await openDB();
 return new Promise(function(resolve,reject){
  var tx=db.transaction(STORE,'readonly');
  var req=tx.objectStore(STORE).index('by_profile').getAll(p);
  var items=[];
  req.onsuccess=function(){items=req.result||[]};
  tx.oncomplete=function(){db.close();items.sort(function(a,b){return String(b.generatedAt).localeCompare(String(a.generatedAt))});resolve(items)};
  tx.onerror=function(){db.close();reject(tx.error)};
 });
}
async function save(entry){
 var db=await openDB();
 var id=Date.now()+'-'+(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));
 return new Promise(function(resolve,reject){
  var tx=db.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
  st.put({id:id,profile:entry.profile,question:entry.question.slice(0,1200),
   answer:entry.answer.slice(0,9000),generatedAt:entry.generatedAt});
  var req=st.index('by_profile').getAll(entry.profile);
  req.onsuccess=function(){
   var rows=req.result||[];
   rows.sort(function(a,b){return String(b.generatedAt).localeCompare(String(a.generatedAt))});
   rows.slice(MAX_PER_PROFILE).forEach(function(row){st.delete(row.id)});
  };
  tx.oncomplete=function(){db.close();resolve(id)};
  tx.onerror=function(){db.close();reject(tx.error)};
 });
}
async function removeEntry(id,p){
 var db=await openDB();
 return new Promise(function(resolve,reject){
  var tx=db.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
  var r=st.get(id);
  r.onsuccess=function(){if(r.result&&r.result.profile===p)st.delete(id)};
  tx.oncomplete=function(){db.close();resolve()};
  tx.onerror=function(){db.close();reject(tx.error)};
 });
}
async function clearProfile(p){
 var rows=await listFor(p),db=await openDB();
 return new Promise(function(resolve,reject){
  var tx=db.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
  rows.forEach(function(row){st.delete(row.id)});
  tx.oncomplete=function(){db.close();resolve()};
  tx.onerror=function(){db.close();reject(tx.error)};
 });
}
function renderItem(entry,p){
 var row=document.createElement('div');row.className='hhLenaHistRow342';
 var open=document.createElement('button');open.type='button';open.className='hhLenaHistOpen342';
 open.textContent=entry.question.length>92?entry.question.slice(0,90)+'…':entry.question;
 var date=document.createElement('small');
 try{date.textContent=new Date(entry.generatedAt).toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
 catch(e){date.textContent=entry.generatedAt||''}
 open.appendChild(date);
 open.addEventListener('click',function(){
  if(profile()!==p)return;
  var api=window.HH_ASK_LENA_AI_V331;
  if(api&&api.showStoredAnswer&&api.showStoredAnswer(entry)){
   var input=el('hhSQ299');if(input)input.dispatchEvent(new Event('input',{bubbles:true}));
   var details=el('hhLenaHistory342');if(details)details.open=false;
   focusPanel('hhAi331Answer');
  }
 });
 var del=document.createElement('button');del.type='button';del.className='hhLenaHistDel342';del.textContent='🗑';
 del.setAttribute('aria-label','Korábbi válasz törlése');del.title='Törlés erről az eszközről';
 del.addEventListener('click',async function(){
  if(profile()!==p)return;
  try{await removeEntry(entry.id,p);refreshHistory()}catch(e){showHistoryError()}
 });
 row.append(open,del);return row;
}
function showHistoryError(){
 var list=el('hhLenaHistory342Body');
 if(list)list.textContent='A helyi előzmények most nem érhetők el. A kutatás ettől még használható.';
}
async function refreshHistory(){
 var list=el('hhLenaHistory342Body'),summary=el('hhLenaHistory342Summary');if(!list||!summary)return;
 var p=profile(),turn=++historyEpoch;
 list.textContent='Betöltés…';
 try{
  var entries=await listFor(p);
  if(turn!==historyEpoch||profile()!==p)return;
  list.replaceChildren();
  summary.textContent='🕘 Előzmények'+(entries.length?' ('+entries.length+')':'');
  if(!entries.length){
   var empty=document.createElement('div');empty.className='hhLenaHistoryNote342';
   empty.textContent='Még nincs mentett kutatás. Csak a befejezett válaszok kerülnek ide.';
   list.appendChild(empty);
  }else{
   entries.forEach(function(e){list.appendChild(renderItem(e,p))});
   var clear=document.createElement('button');clear.type='button';clear.id='hhLenaHistClear342';
   clear.textContent='🗑 Összes előzmény törlése';
   clear.addEventListener('click',async function(){
    if(profile()!==p||!window.confirm('Töröljem '+name(p)+' minden helyi Ask Léna-előzményét erről az eszközről?'))return;
    try{await clearProfile(p);refreshHistory()}catch(e){showHistoryError()}
   });
   list.appendChild(clear);
  }
  var note=document.createElement('div');note.className='hhLenaHistoryNote342';
  note.textContent='🔒 Csak ebben a böngészőben tárolódik, profil szerint elkülönítve. Nem felhőszinkron és nem titkosított orvosi archívum.';
  list.appendChild(note);
 }catch(e){
  if(turn===historyEpoch)showHistoryError();
 }
}
function profileSwitch(){
 var pill=el('hhSP299');if(!pill||pill.dataset.hhLenaSwitch342)return;
 pill.dataset.hhLenaSwitch342='1';
 pill.setAttribute('role','button');pill.setAttribute('tabindex','0');
 function move(){
  var p=profile(),target=next(p),q=el('hhSQ299');
  if(q)drafts[p]=q.value;
  if(typeof window.setProfile==='function'){
   var dispatched=false,seen=function(){dispatched=true};
   window.addEventListener('healthhub:profile-changed',seen);
   try{window.setProfile(code(target))}finally{
    window.removeEventListener('healthhub:profile-changed',seen);
    if(!dispatched)window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:target}}));
   }
  }else if(typeof window.hhSwitchProfile==='function'){
   window.hhSwitchProfile(code(target));
   window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:target}}));
  }
  var current=profile();lastProfile=current;
  if(q){q.value=drafts[current]||'';q.dispatchEvent(new Event('input',{bubbles:true}))}
  pill.textContent='Aktív profil: '+name(current);
  pill.setAttribute('aria-label','Aktív profil: '+name(current)+'. Egy kattintás: '+name(next(current))+' profiljára váltás.');
  refreshHistory();
 }
 pill.addEventListener('click',move);
 pill.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();move()}});
}
var drafts={monika:'',zsolt:''};
function install(){
 var page=el('hhLenaSmart299'),composer=el('hhLenaComposer340');if(!page||!composer)return;
 setCss();profileSwitch();lastProfile=profile();
 var mic=el('hhMic299');
 if(mic&&!mic.dataset.hhLenaMic342){
  mic.dataset.hhLenaMic342='1';
  var observer=new MutationObserver(function(){mic.classList.toggle('hhLenaMicLive342',/⏹|Leállítás/.test(mic.textContent))});
  observer.observe(mic,{childList:true,characterData:true,subtree:true});
 }
 if(!el('hhLenaHistory342')){
  var details=document.createElement('details');details.id='hhLenaHistory342';
  var sum=document.createElement('summary');sum.id='hhLenaHistory342Summary';sum.textContent='🕘 Előzmények';
  var body=document.createElement('div');body.id='hhLenaHistory342Body';details.append(sum,body);
  composer.parentNode.insertBefore(details,composer);
  details.addEventListener('toggle',function(){if(details.open)refreshHistory()});
 }
 refreshHistory();
}
window.addEventListener('healthhub:ask-lena-open',function(){install()});
window.addEventListener('healthhub:ask-lena-start',function(e){
 if(!e.detail||e.detail.profile!==profile())return;
 focusPanel('hhAi331Terminal');
});
window.addEventListener('healthhub:ask-lena-complete',function(e){
 var d=e.detail;if(!d||!d.successful||d.profile!==profile())return;
 // Focus finished answer only once, never during every streamed character.
 focusPanel('hhAi331Answer');
 if(typeof d.question!=='string'||typeof d.answer!=='string'||!d.answer.trim())return;
 save(d).then(refreshHistory).catch(showHistoryError);
});
window.addEventListener('healthhub:profile-changed',function(){
 var p=profile(),q=el('hhSQ299');
 if(lastProfile&&lastProfile!==p&&q){
  drafts[lastProfile]=q.value;
  q.value=drafts[p]||'';q.dispatchEvent(new Event('input',{bubbles:true}));
 }
 lastProfile=p;
 var pill=el('hhSP299');
 if(pill){pill.textContent='Aktív profil: '+name(p);pill.setAttribute('aria-label','Aktív profil: '+name(p)+'. Egy kattintás: '+name(next(p))+' profiljára váltás.')}
 refreshHistory();
});
window.HH_ASK_LENA_HISTORY_V342={refresh:refreshHistory,items:listFor,clear:clearProfile,install:install};
document.documentElement.dataset.healthhubAskLenaUx='342';
})();
