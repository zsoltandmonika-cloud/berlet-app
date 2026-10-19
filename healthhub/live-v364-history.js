(function(){
'use strict';
// Profile-scoped Ask Léna history: RLS-protected Supabase sync + local offline fallback.
var STORE='hh-ask-lena-history-v364-',STATE='hh-ask-lena-history-sync-v364-',MAX=60,inFlight={},versions={};
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function svc(){return window.HH_DAILY_HEALTH_SYNC_V319}
function connected(){try{var s=svc(),x=s&&s.getStatus();return !!(s&&s.request&&x&&x.authenticated&&(!x.authorizedProfiles||x.authorizedProfiles.includes(profile())))}catch(e){return false}}
function entries(p){try{var r=JSON.parse(localStorage.getItem(STORE+p)||'[]');return Array.isArray(r)?r:[]}catch(e){return[]}}
function state(p){try{return JSON.parse(localStorage.getItem(STATE+p)||'{}')}catch(e){return{}}}
function saveState(p,x){try{localStorage.setItem(STATE+p,JSON.stringify(x||{}))}catch(e){}}
function dateKey(x){var d=new Date(x);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Dátum nélkül'}
function write(p,arr){var m=new Map();arr.forEach(function(x){if(x&&x.id&&x.profile===p&&x.question&&x.answer)m.set(x.id,x)});
 var rows=Array.from(m.values()).sort(function(a,b){return Date.parse(b.generatedAt)-Date.parse(a.generatedAt)}).slice(0,MAX);
 try{
  var encoded=JSON.stringify(rows);
  // Do not write unchanged data on every cloud polling result.
  if(localStorage.getItem(STORE+p)!==encoded)localStorage.setItem(STORE+p,encoded);
 }catch(e){console.warn('Ask Léna history cache full',e)}
 return rows;
}
function style(){
 if(document.getElementById('hhHistory364Css'))return;
 var s=document.createElement('style');s.id='hhHistory364Css';
 s.textContent='#hhLenaSmart299 .hhHistory364{border:1px solid var(--lena-ui-border,#c6dce6);background:#fff;border-radius:17px;margin:11px 0;padding:12px;color:#25465c}'+
 '#hhLenaSmart299 .hhHistory364 h3{font-size:15px;margin:0 0 4px;color:var(--lena-ui-dark,#27649c)}'+
 '#hhLenaSmart299 .hhHistory364 .hhHistStatus364{font-size:10px;color:#6a8292;line-height:1.45}'+
 '#hhLenaSmart299 .hhHistory364 .hhHistList364{max-height:270px;overflow:auto;margin-top:6px}'+
 '#hhLenaSmart299 .hhHistory364 .hhHistRow364{width:100%;background:#f7fbfd;border:1px solid #e2edf2;text-align:left;border-radius:10px;padding:9px;margin:5px 0;color:#234e6d;cursor:pointer}'+
 '#hhLenaSmart299 .hhHistory364 .hhHistRow364 b{display:block;font-size:11px;line-height:1.45}'+
 '#hhLenaSmart299 .hhHistory364 .hhHistRow364 small{display:block;font-size:9px;color:#77909c;margin-top:2px}'+
 '#hhLenaSmart299 .hhHistory364 .hhHistRefresh364{float:right;padding:6px 8px;border:0;border-radius:9px;color:#fff;background:var(--lena-ui,#2988bc);font-size:10px;cursor:pointer}';
 document.head.appendChild(s);
}
function mount(){
 var page=document.getElementById('hhLenaSmart299');if(!page)return null;
 style();var e=page.querySelector('#hhHistory364');if(e)return e;
 e=document.createElement('section');e.id='hhHistory364';e.className='hhHistory364';
 var width=page.querySelector('.askWidth')||page;
 width.appendChild(e);return e;
}
/* v699: stable keyed history rows. Even when sync touches cloud metadata,
   never dismantle the history card, search input, or scroll container. */
function historyRow(x,p){
 var node=document.createElement('button');node.type='button';
 node.className='hhHistRow364';node.dataset.historyId=String(x.id);
 var title=document.createElement('b');title.textContent=String(x.question||'').slice(0,170);
 var date=document.createElement('small');
 date.textContent=dateKey(x.generatedAt)+' · '+(p==='monika'?'Mónika':'Zsolt');
 node.append(title,date);
 node.onclick=function(){
  if(profile()!==p)return;
  var found=entries(p).find(function(v){return v.id===node.dataset.historyId});
  if(!found)return;
  var view=window.HH_ASK_LENA_AI_V331;
  if(view&&view.showStoredAnswer){
   view.showStoredAnswer(found);
   if(window.HH_LENA_FOLLOWUP_V364&&window.HH_LENA_FOLLOWUP_V364.fromHistory)
    window.HH_LENA_FOLLOWUP_V364.fromHistory(found);
   var ans=document.getElementById('hhAi331Answer');
   if(ans)ans.scrollIntoView({behavior:'smooth',block:'start'});
  }
 };
 return node;
}
function render(){
 var box=mount();if(!box)return;
 var p=profile(),arr=entries(p),st=state(p);
 var statusText=!connected()?'📱 Helyi előzmények · Központi Health Vault belépéssel tudod eszközök között szinkronizálni':
  st.error?'⚠️ Felhőszinkron: '+String(st.error).slice(0,110):
  st.updatedAt?'✅ Felhőszinkron: '+dateKey(st.updatedAt):'☁️ Szinkronizálás indul…';
 // Create outer elements ONCE. Existing search focus, scroll, row nodes
 // are maintained for both patient profiles and every redundant sync.
 var list=box.querySelector('.hhHistList364');
 if(!list){
  var refresh=document.createElement('button');refresh.type='button';
  refresh.className='hhHistRefresh364';refresh.id='hhHistRefresh364';
  refresh.textContent='↻ Sync';refresh.onclick=function(){sync(profile(),true)};
  var heading=document.createElement('h3');heading.textContent='🗂️ Ask Léna · Előzmények';
  var status=document.createElement('div');status.className='hhHistStatus364';
  list=document.createElement('div');list.className='hhHistList364';
  box.append(refresh,heading,status,list);
 }
 var current=box.querySelector('.hhHistStatus364');
 if(current&&current.textContent!==statusText)current.textContent=statusText;
 var signature=JSON.stringify([p,arr.map(function(x){return [x.id,x.question,x.generatedAt]})]);
 if(box.dataset.hhHistoryRenderSignature===signature)return;
 var scroll=list.scrollTop;
 var prevProfile=box.dataset.hhHistoryProfile;
 // Only move, add or remove rows whose actual identifiers changed.
 var existing=new Map();
 list.querySelectorAll('.hhHistRow364[data-history-id]').forEach(function(row){
  existing.set(row.dataset.historyId,row);
 });
 var desired=[];
 arr.forEach(function(x){
  var row=existing.get(String(x.id));
  if(row){
   existing.delete(String(x.id));
   var title=row.querySelector('b'),date=row.querySelector('small');
   var t=String(x.question||'').slice(0,170);
   var d=dateKey(x.generatedAt)+' · '+(p==='monika'?'Mónika':'Zsolt');
   if(title&&title.textContent!==t)title.textContent=t;
   if(date&&date.textContent!==d)date.textContent=d;
  }else row=historyRow(x,p);
  desired.push(row);
 });
 if(!arr.length){
  var empty=list.querySelector('.hhHistEmpty364');
  if(!empty){empty=document.createElement('p');empty.className='hhHistStatus364 hhHistEmpty364'}
  empty.textContent='Még nincs mentett válasz ezen a profilon.';
  desired.push(empty);
 }
 desired.forEach(function(row,i){
  if(list.children[i]!==row)list.insertBefore(row,list.children[i]||null);
 });
 // Remove stale rows only after desired rows are placed.
 var allow=new Set(desired);
 Array.from(list.children).forEach(function(row){if(!allow.has(row))row.remove()});
 // Respect the user's current search, without resetting the input itself.
 var input=box.querySelector('#hhChat566Search');
 if(input){
  var term=input.value.trim().toLocaleLowerCase('hu-HU');
  list.querySelectorAll('.hhHistRow364').forEach(function(row){
   var hidden=!!term&&!row.textContent.toLocaleLowerCase('hu-HU').includes(term);
   if(row.hidden!==hidden)row.hidden=hidden;
   var display=hidden?'none':'';
   if(row.style.display!==display)row.style.display=display;
  });
 }
 if(prevProfile===p)list.scrollTop=scroll;
 box.dataset.hhHistoryProfile=p;
 box.dataset.hhHistoryRenderSignature=signature;
}
async function sync(p,manual){
 if(!['zsolt','monika'].includes(p)||inFlight[p])return;
 if(!connected()){if(manual)render();return}
 var api=svc();
 inFlight[p]=true;
 var stamp=versions[p]||0;
 try{
  var local=entries(p);
  var pending=local.filter(function(x){return x.synced!==true}).slice().reverse().slice(0,50);
  for(var x of pending){
   // Scope is enforced in DB RLS; no photo blob or original PDF is ever retained.
   await api.request('/rest/v1/hh_ask_lena_history',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',
    data:{id:x.id,profile_key:p,question:x.question,answer:x.answer,generated_at:x.generatedAt,model:String(x.model||'').slice(0,60)}});
  }
  var remote=await api.request('/rest/v1/hh_ask_lena_history?select=id,profile_key,question,answer,generated_at,model&profile_key=eq.'+encodeURIComponent(p)+'&order=generated_at.desc&limit=60',{method:'GET'});
  if(!Array.isArray(remote))throw Error('History: felhő válasza hibás');
  var mapped=remote.filter(function(x){return x.profile_key===p}).map(function(x){return{id:x.id,profile:p,question:x.question,answer:x.answer,generatedAt:x.generated_at,model:x.model||'',synced:true}});
  var existing=entries(p);
  var seen=new Set(mapped.map(function(x){return x.id}));
  write(p,mapped.concat(existing.filter(function(x){return !seen.has(x.id)})));
  saveState(p,{updatedAt:new Date().toISOString(),error:null});
 }catch(e){console.warn('Ask Léna history sync',e);saveState(p,{updatedAt:state(p).updatedAt||null,error:String(e.message||e).slice(0,130)})}finally{inFlight[p]=false;if(p===profile())render();if(versions[p]!==stamp)setTimeout(function(){sync(p,false)},600)}
}
function save(ev){
 var x=ev&&ev.detail||{};
 if(!x.successful||!['zsolt','monika'].includes(x.profile)||typeof x.question!=='string'||typeof x.answer!=='string')return;
 var now=new Date().toISOString(),record={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2)),
  profile:x.profile,question:x.question.slice(0,1200),answer:x.answer.slice(0,15000),generatedAt:x.generatedAt||now,model:(typeof x.model==='string'&&/^[A-Za-z0-9._:-]{3,60}$/.test(x.model)?x.model:''),synced:false};
 write(x.profile,[record].concat(entries(x.profile)));versions[x.profile]=(versions[x.profile]||0)+1;
 if(x.profile===profile())render();sync(x.profile,false);
}
window.addEventListener('healthhub:ask-lena-complete',save);
window.addEventListener('healthhub:ask-lena-open',function(){render();sync(profile(),false)});
window.addEventListener('healthhub:central-auth-changed',function(){render();sync(profile(),false)});
window.addEventListener('healthhub:profile-changed',function(){render();sync(profile(),false)});
window.addEventListener('focus',function(){var b=document.getElementById('hhLenaSmart299');if(b&&b.classList.contains('on'))sync(profile(),false)});
window.HH_ASK_LENA_HISTORY_V364={sync:sync,entries:entries,render:render};
})();
