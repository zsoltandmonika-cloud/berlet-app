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
 return p==='monika'?avatar.m:p==='zsolt'?avatar.z:'data:image/webp;base64,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';
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
 // Do not autofocus: preserve the full S24 Ultra Quick Add screen until explicitly tapped.
}
function hideSheet(){
 if(d.activeElement&&$('fhSheet').contains(d.activeElement))d.activeElement.blur();
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
  showSuccess(selected==='lena'?'Léna Family Concierge listájára került a teendő. A végrehajtás külön indítást igényel.':('Mentve! '+(selected===self()?'A feladat a saját listádra került.':(selected==='monika'?'Mónika':'Zsolt')+' megkapja az értesítést.')));
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
function showSuccess(message){
 const overlay=$('fhSuccess');if(!overlay)return;
 $('fhSuccessText').textContent=message;
 overlay.hidden=false;
 playTada();
}
function hideSuccess(){const overlay=$('fhSuccess');if(overlay)overlay.hidden=true}
function playTada(){
 try {
  const C=w.AudioContext||w.webkitAudioContext;
  if(!C)return;
  const ctx=new C();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  const t=ctx.currentTime+.02;
  [523.25,659.26,783.99,1046.5].forEach((hz,i)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(hz,t+i*.105);
   gain.gain.setValueAtTime(.0001,t+i*.105);
   gain.gain.exponentialRampToValueAtTime(.085,t+i*.105+.014);
   gain.gain.exponentialRampToValueAtTime(.0001,t+i*.105+.22);
   osc.connect(gain).connect(ctx.destination);
   osc.start(t+i*.105);osc.stop(t+i*.105+.23);
  });
  w.setTimeout(()=>ctx.close().catch(()=>{}),1250);
 }catch(_){/* Audio is optional and never blocks a successful save. */}
}
function startDictation(){
 const status=$('fhVoiceStatus');
 const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!Speech){status.textContent='Ezen a böngészőn nincs natív hangfelismerés. A Samsung billentyűzet 🎙️ mikrofonját használd.';return}
 const rec=new Speech();rec.lang='hu-HU';rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=1;
 const b=$('fhVoice');b.disabled=true;b.classList.add('listening');
 status.textContent='🎙️ Figyelek… mondd el a feladatot magyarul!';
 rec.onresult=e=>{
  const phrase=Array.from(e.results).map(x=>x[0]?.transcript||'').join(' ').trim();
  if(phrase){const input=$('fhTitle');input.value=(input.value.trim()?input.value.trim()+' ':'')+phrase;status.textContent='✓ Bediktálva · a szöveg szerkeszthető.'}
 };
 rec.onerror=e=>{status.textContent=e.error==='not-allowed'?'Mikrofonengedély nincs megadva.':'Hangbevitel nem sikerült: '+e.error};
 rec.onend=()=>{b.disabled=false;b.classList.remove('listening')};
 try{rec.start()}catch(_){b.disabled=false;b.classList.remove('listening');status.textContent='A hangbevitel nem indítható.'}
}

function wireStandardNav(){
 const back=$('fhNavBack'),note=$('fhNavNotifications');
 back?.addEventListener('click',()=>{if(!$('fhSuccess').hidden){hideSuccess();return}if(!$('fhSheet').hidden){hideSheet();return}if(w.history.length>1)w.history.back();else w.location.assign('../')});
 note?.addEventListener('click',()=>announce('Az SH9 értesítési központja még fejlesztés alatt áll.'));
}
function wire(){
 wireStandardNav();
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
 $('fhVoice').addEventListener('click',startDictation);
 $('fhSuccessClose').addEventListener('click',hideSuccess);
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
 d.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('fhSuccess').hidden)hideSuccess();else if(!$('fhSheet').hidden)hideSheet()}});
 if(new URLSearchParams(w.location.search).has('task')){tab='all';d.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='all'))}
 if(api)api.auth.onAuthStateChange(()=>w.setTimeout(authSync,0));
 profileUi();authSync();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
w.FAMILY_TASKS_V880=Object.freeze({version:'880',get tab(){return tab},get profile(){return self()}});
})(window,document);
