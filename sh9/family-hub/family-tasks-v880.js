/* Family Tasks v880 · Golden Standard client.
 * No GPS, AI polling or hidden automation. Existing Family Guard OAuth key shared,
 * Supabase RLS + DB trigger owns audit and access. Text rendered via textContent only.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id), cfg=w.HH_CENTRAL_VAULT;
const api=cfg&&cfg.enabled&&w.supabase?.createClient
 ?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,
 {auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}}):null;
const TABLE='hh_family_tasks',LOG='hh_family_task_logbook';
const cat=['🏠 Otthon','🛒 Bevásárlás','🍕 Étel / ital rendelés','📦 Webshopping','🚚 Csomagátvétel','🐶 Corky','📅 Ügyintézés','✈️ Utazás','🩺 Egészség','💡 Egyéb'];
const names={monika:'Mónika',zsolt:'Zsolt',lena:'Léna'};
const statuses={todo:'🔴 Még nem kezdte',progress:'🟠 Folyamatban',done:'🟢 Kész'};
let user=null,authorized=[],tasks=[],logs=[],tab='mine',selected='zsolt',category='🏠 Otthon',due='none',loading=false,refreshId=null,liveChannel=null;
function self(){try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}}
function imgFor(p){
 const avatar=w.HH_GOLDEN_AVATARS_V529||{};
 return p==='monika'?avatar.m:p==='zsolt'?avatar.z:'../../healthhub/assets/ask-lena-approved-hero.webp';
}
function element(tag,cl,text){const n=d.createElement(tag);if(cl)n.className=cl;if(text!==undefined)n.textContent=text;return n}
function button(text,cl,fn){const b=element('button',cl,text);b.type='button';if(fn)b.addEventListener('click',fn);return b}
function avatar(p){const a=element('img','avatar');a.src=imgFor(p);a.alt=(names[p]||p)+' profilképe';a.loading='lazy';return a}
function label(p){return names[p]||p||'Ismeretlen'}
function announce(t){$('fhStatus').textContent=t}
function profileUi(){
 const me=self();
 d.documentElement.dataset.fhProfile=me==='monika'?'m':'z';
 $('fhProfileAvatar').src=imgFor(me);$('fhProfileName').textContent=label(me);
 if(selected!=='lena'&&!['zsolt','monika'].includes(selected))selected=me;
 renderPeople();
}
function formatDate(s){if(!s)return 'Nincs határidő';return new Date(s).toLocaleDateString('hu-HU',{month:'short',day:'numeric',year:'numeric'})}
function formatTime(s){return new Date(s).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function isOverdue(t){return t.due_at&&t.status!=='done'&&Date.parse(t.due_at)<Date.now()}
function setStats(){
 const mine=tasks.filter(t=>t.assigned_profile===self()&&!t.assigned_agent);
 for(const [id,key] of [['fhTodoCount','todo'],['fhProgressCount','progress'],['fhDoneCount','done']]){
  $(id).textContent=mine.filter(t=>t.status===key).length;
 }
}
function render(){
 const needle=$('fhSearch').value.toLocaleLowerCase('hu-HU').trim();let records=[];
 $('fhList').replaceChildren();
 if(tab==='log'){
  records=logs.filter(e=>(e.title_snapshot+' '+e.event_type+' '+label(e.actor_profile)+' '+label(e.recipient_profile)).toLocaleLowerCase('hu-HU').includes(needle));
  if(!records.length){$('fhList').append(element('p','fh-empty','Ebben a 30 napos időszakban nincs ilyen naplóbejegyzés.'));return}
  records.forEach(e=>{
    const name=e.title_snapshot||'Feladat';
    const sentence=e.event_type==='created'?'új feladatot rögzített':
      e.event_type==='assigned'?'átadott egy feladatot':
      e.event_type==='status'?'státuszt módosított':
      e.event_type==='deadline'?'határidőt változtatott':
      e.event_type==='reaction'?'reakciót adott':'szerkesztette a feladatot';
    const item=element('article','fh-log glass');
    item.append(element('strong',null,label(e.actor_profile)+' '+sentence),element('p',null,'„'+name+'”'));
    if(e.event_type==='status'){
      item.append(element('p',null,'Állapot: '+(statuses[e.previous_value?.status]||'–')+' → '+(statuses[e.current_value?.status]||'–')));
    }else if(e.event_type==='assigned'){
      const dest=e.current_value?.agent==='lena'?'Léna':label(e.current_value?.assignee);
      item.append(element('p',null,'Felelős: '+dest));
    }else if(e.event_type==='deadline'){
      item.append(element('p',null,'Határidő: '+formatDate(e.previous_value?.due)+' → '+formatDate(e.current_value?.due)));
    }
    const time=element('time',null,formatTime(e.created_at));time.dateTime=e.created_at;
    item.append(time);$('fhList').append(item);
  });return;
 }
 records=tasks.filter(t=>
   (tab==='mine'?(t.assigned_profile===self()&&!t.assigned_agent):
    tab==='issued'?(t.creator_profile===self()&&(t.assigned_profile!==self()||!!t.assigned_agent)):true)
   &&(t.title+' '+t.category+' '+label(t.assigned_profile)).toLocaleLowerCase('hu-HU').includes(needle));
 if(!records.length){$('fhList').append(element('p','fh-empty','Itt még nincs teendő. A ＋ Új feladat gombbal kezdheted.'));return}
 records.forEach(t=>{
   const card=element('article','fh-card glass');card.id='task-'+t.id;card.dataset.id=t.id;
   const head=element('div','fh-cardtop');
   head.append(element('h2',null,t.title),element('span','fh-category',t.category));
   card.append(head);
   const meta=element('div','fh-meta');
   meta.append(avatar(t.assigned_agent?'lena':t.assigned_profile),
     element('span',null,'Felelős: '+(t.assigned_agent?'Léna · AI Concierge':label(t.assigned_profile))));
   const dt=element('span','fh-due'+(isOverdue(t)?' overdue':''),t.due_at?'📅 '+formatDate(t.due_at):'');
   meta.append(dt);card.append(meta);
   const rag=element('div','fh-rag');
   [['todo','🔴 Teendő'],['progress','🟠 Folyamatban'],['done','🟢 Kész']].forEach(([k,name])=>{
     const b=button(name,t.status===k?'active':'',()=>changeTask(t,{status:k}));
     b.dataset.status=k;b.setAttribute('aria-pressed',String(t.status===k));rag.append(b);
   });
   card.append(rag);
   const actions=element('div','fh-actions'),assign=element('div','fh-reassign');
   ['monika','zsolt','lena'].forEach(p=>{
     const b=button('',((t.assigned_agent?'lena':t.assigned_profile)===p?'selected':''),()=>assignTask(t,p));
     b.setAttribute('aria-label','Átadás: '+label(p));b.title='Átadás: '+label(p);
     b.append(avatar(p));assign.append(b);
   });actions.append(assign);
   const reactions=element('div','fh-react');
   ['👍','😍','🎉'].forEach(r=>{
    const b=button(r,t.reaction===r?'selected':'',()=>changeTask(t,{reaction:r}));
    b.title='Reakció: '+r;reactions.append(b);
   });actions.append(reactions);card.append(actions);
   if(t.status==='done'){
     const stars=element('div','fh-stars');stars.setAttribute('aria-label','1-től 5 csillagig értékelés');
     for(let i=1;i<=5;i++){
       const b=button('★',(t.stars||0)>=i?'on':'',()=>changeTask(t,{stars:i}));
       b.setAttribute('aria-label',i+' csillag');stars.append(b);
     }card.append(stars);
   }
   $('fhList').append(card);
 });
 const linked=new URLSearchParams(w.location.search).get('task');
 if(linked){
  const target=d.getElementById('task-'+linked);
  if(target&&!target.dataset.opened){target.dataset.opened='1';target.classList.add('flash');target.scrollIntoView({block:'center',behavior:'smooth'});}
 }
}
function renderCategories(){
 const host=$('fhCategories');host.replaceChildren();
 cat.forEach(c=>{host.append(button(c,c===category?'fh-chip active':'fh-chip',()=>{
  category=c;renderCategories();
  if(!$('fhTitle').value.trim()){
   const examples={'🏠 Otthon':'Locsold meg a virágokat','🛒 Bevásárlás':'Bevásárlás elintézése',
   '🍕 Étel / ital rendelés':'Rendelj vacsorát','📦 Webshopping':'Webshop rendelés elintézése',
   '🚚 Csomagátvétel':'Csomag átvétele','🐶 Corky':'Corky ellátása',
   '📅 Ügyintézés':'Időpont egyeztetése','✈️ Utazás':'Utazás előkészítése',
   '🩺 Egészség':'Kontroll időpont egyeztetése','💡 Egyéb':''};
   $('fhTitle').value=examples[c]||'';
  }
 }));});
}
function renderPeople(){
 const host=$('fhPeople');if(!host)return;host.replaceChildren();
 ['monika','zsolt','lena'].forEach(p=>{
  const b=button('', 'fh-person'+(selected===p?' selected':'')+(p==='lena'?' ai':''),()=>{
    selected=p;renderPeople();
  });
  b.append(avatar(p),element('span',null,p==='lena'?'Léna AI':label(p)+(p===self()?' · saját':'')));
  b.setAttribute('aria-pressed',String(selected===p));
  if(p!=='lena'&&user&&!authorized.includes(p))b.disabled=true;
  host.append(b);
 });
}
function showSheet(){
 if(!user||!authorized.includes(self())){announce('Előbb jelentkezz be a Family Hubba.');return}
 selected=self();category='🏠 Otthon';due='none';
 $('fhTitle').value='';$('fhCustomDue').value='';$('fhSaveInfo').textContent='';
 $('fhBackdrop').hidden=false;$('fhSheet').hidden=false;
 d.body.style.overflow='hidden';renderPeople();renderCategories();renderDue();
 // No autofocus: keep the Android keyboard closed until the user taps the text field.
 // The form opens at the top without moving focus to the input.
 $('fhSheet').scrollTop=0;
}
function hideSheet(){
 $('fhBackdrop').hidden=true;$('fhSheet').hidden=true;d.body.style.overflow='';
}
function renderDue(){
 d.querySelectorAll('[data-due]').forEach(b=>b.classList.toggle('active',b.dataset.due===due));
 if(due!=='custom')$('fhCustomDue').value='';
}
function chooseDue(k){due=k;renderDue()}
function dueIso(){
 if(due==='none')return null;
 const now=new Date(),date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+ (due==='tomorrow'?1:0));
 if(due==='custom'){
  const s=$('fhCustomDue').value;if(!s)return null;
  const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,23,59,0).toISOString();
 }
 return new Date(date.getFullYear(),date.getMonth(),date.getDate(),23,59,0).toISOString();
}
async function fetchData(){
 if(!api||!user)return;
 if(loading)return;
 loading=true;
 const thirty=new Date(Date.now()-30*864e5).toISOString();
 const result=await Promise.all([
  api.from(TABLE).select('id,title,details,category,creator_profile,assigned_profile,assigned_agent,status,due_at,completed_at,reaction,stars,revision,created_at').order('updated_at',{ascending:false}).limit(150),
  api.from(LOG).select('id,task_id,event_type,actor_profile,recipient_profile,title_snapshot,previous_value,current_value,created_at').gte('created_at',thirty).order('id',{ascending:false}).limit(120)
 ]);
 loading=false;
 if(result[0].error||result[1].error){announce('Adathiba: '+(result[0].error?.message||result[1].error?.message));return}
 tasks=result[0].data||[];logs=result[1].data||[];
 setStats();render();announce('Szinkronizálva · '+tasks.length+' feladat · 30 napos napló');
}
function reloadSoon(){
 if(refreshId!==null)w.clearTimeout(refreshId);
 refreshId=w.setTimeout(()=>{refreshId=null;fetchData()},280);
}
async function changeTask(task,patch){
 if(!api||!user)return;
 try{
  const {data,error}=await api.from(TABLE).update({...patch,updated_by_profile:self()})
    .eq('id',task.id).eq('revision',task.revision).select('id').maybeSingle();
  if(error)throw error;
  if(!data){announce('Közben változott a feladat. Frissítettem, próbáld újra.');}
  else announce('✓ Mentve · Buddy értesíti az érintetteket.');
  await fetchData();
 }catch(e){announce('Nem sikerült menteni: '+e.message)}
}
function assignTask(t,p){
 const current=t.assigned_agent?'lena':t.assigned_profile;
 if(current===p)return;
 if(p==='lena')changeTask(t,{assigned_profile:self(),assigned_agent:'lena'});
 else changeTask(t,{assigned_profile:p,assigned_agent:null});
}
async function save(e){
 e.preventDefault();
 if(!api||!user)return;
 const title=$('fhTitle').value.trim();
 if(!title){$('fhSaveInfo').textContent='Írd be a feladatot.';return}
 const save=$('fhSave');save.disabled=true;$('fhSaveInfo').textContent='Mentés…';
 const p=selected==='lena'?self():selected;
 const payload={title,category,creator_profile:self(),assigned_profile:p,
  assigned_agent:selected==='lena'?'lena':null,created_by:user.id,updated_by_profile:self(),due_at:dueIso()};
 try{
  const {data,error}=await api.from(TABLE).insert(payload).select('id').single();
  if(error)throw error;
  hideSheet();announce(selected==='lena'?'✓ Lénának kijelölve; az AI-feladat nem indul el automatikusan.':'✓ Feladat elmentve. Buddy úton van! 🐿️');
  w.dispatchEvent(new CustomEvent('hh-family-tasks-saved-v881',{detail:{taskId:data?.id||null,title,assignedTo:selected}}));
  if(data?.id){w.history.replaceState(null,'',w.location.pathname); }
  await fetchData();
 }catch(err){$('fhSaveInfo').textContent='Nem sikerült menteni: '+err.message}
 finally{save.disabled=false}
}
async function authSync(){
 if(!api){$('fhSignIn').hidden=false;$('fhAuthText').textContent='A Supabase-kapcsolat nem érhető el.';announce('Offline vagy hiányzó kapcsolat.');return}
 const {data:{user:current},error}=await api.auth.getUser();
 user=error?null:current;
 authorized=[];
 if(user){
  const {data,error:aclErr}=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
  if(aclErr){announce('Profiljogosultság hiba: '+aclErr.message);}
  else authorized=(data||[]).map(x=>x.profile_key);
 }
 $('fhSignIn').hidden=!!user&&authorized.includes(self());
 $('fhAuthText').textContent=user?'Ehhez a profilhoz nincs hozzáférésed.':'A családi feladatokhoz bejelentkezés szükséges.';
 profileUi();
 if(user&&authorized.includes(self())){await fetchData();subscribe();}
 else{tasks=[];logs=[];setStats();render();if(liveChannel){api.removeChannel(liveChannel);liveChannel=null}}
}
function subscribe(){
 if(!api||!user)return;
 if(liveChannel)api.removeChannel(liveChannel);
 liveChannel=api.channel('fh-tasks-'+user.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'hh_family_task_events'},()=>reloadSoon())
  .subscribe();
}
function wire(){
 $('fhProfileSwitch').addEventListener('click',()=>{
  const next=self()==='monika'?'zsolt':'monika';
  if(user&&!authorized.includes(next)){announce(label(next)+' profil nem engedélyezett.');return}
  w.localStorage.setItem('hh-profile',next==='monika'?'m':'z');
  w.dispatchEvent(new CustomEvent('hh-family-profile-changed'));selected=next;authSync();
 });
 $('fhAdd').addEventListener('click',showSheet);
 $('fhClose').addEventListener('click',hideSheet);
 $('fhBackdrop').addEventListener('click',hideSheet);
 $('fhForm').addEventListener('submit',save);
 $('fhSearch').addEventListener('input',render);
 $('fhCustomDue').addEventListener('change',()=>{due='custom';d.querySelectorAll('[data-due]').forEach(b=>b.classList.remove('active'))});
 d.querySelectorAll('[data-due]').forEach(b=>b.addEventListener('click',()=>chooseDue(b.dataset.due)));
 d.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
   tab=b.dataset.tab;d.querySelectorAll('[data-tab]').forEach(x=>{
     x.classList.toggle('active',x===b);if(x===b)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');
   });render();
 }));
 $('fhLogin').addEventListener('click',async()=>{
  if(!api)return;
  const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
  if(error)announce('Belépési hiba: '+error.message);
 });
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')authSync()});
 d.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('fhSheet').hidden)hideSheet()});
 if(new URLSearchParams(w.location.search).has('task')){tab='all';d.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='all'))}
 if(api)api.auth.onAuthStateChange(()=>w.setTimeout(authSync,0));
 profileUi();authSync();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
w.FAMILY_TASKS_V880=Object.freeze({version:'880',get tab(){return tab},get profile(){return self()}});
})(window,document);
