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
 try{localStorage.setItem(STORE+p,JSON.stringify(rows))}catch(e){console.warn('Ask Léna history cache full',e)}
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
function render(){
 var box=mount();if(!box)return;
 var p=profile(),arr=entries(p),st=state(p);
 var statusText=!connected()?'📱 Helyi előzmények · Központi Health Vault belépéssel tudod eszközök között szinkronizálni':
  st.error?'⚠️ Felhőszinkron: '+String(st.error).slice(0,110):
  st.updatedAt?'✅ Felhőszinkron: '+dateKey(st.updatedAt):'☁️ Szinkronizálás indul…';
 box.innerHTML='<button type="button" class="hhHistRefresh364" id="hhHistRefresh364">↻ Sync</button>'+
 '<h3>🗂️ Ask Léna · Előzmények</h3><div class="hhHistStatus364">'+esc(statusText)+'</div>'+
 '<div class="hhHistList364">'+(arr.length?arr.map(function(x){
  return '<button type="button" class="hhHistRow364" data-history-id="'+esc(x.id)+'"><b>'+esc(x.question.slice(0,170))+'</b><small>'+esc(dateKey(x.generatedAt))+' · '+esc(x.profile==='monika'?'Mónika':'Zsolt')+'</small></button>';
 }).join(''):'<p class="hhHistStatus364">Még nincs mentett válasz ezen a profilon.</p>')+'</div>';
 box.querySelector('#hhHistRefresh364').onclick=function(){sync(p,true)};
 box.querySelectorAll('[data-history-id]').forEach(function(b){b.onclick=function(){
  var x=entries(profile()).find(function(v){return v.id===b.dataset.historyId});if(!x)return;
  var view=window.HH_ASK_LENA_AI_V331;
  if(view&&view.showStoredAnswer){
   view.showStoredAnswer(x);
   if(window.HH_LENA_FOLLOWUP_V364&&window.HH_LENA_FOLLOWUP_V364.fromHistory)window.HH_LENA_FOLLOWUP_V364.fromHistory(x);
   var ans=document.getElementById('hhAi331Answer');if(ans)ans.scrollIntoView({behavior:'smooth',block:'start'});
  }
 }});
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
  profile:x.profile,question:x.question.slice(0,1200),answer:x.answer.slice(0,15000),generatedAt:x.generatedAt||now,model:'',synced:false};
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
