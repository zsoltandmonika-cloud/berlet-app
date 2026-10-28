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
const TABLE='hh_family_tasks',LOG='hh_family_task_logbook',HIDDEN_LOG='hh_family_task_logbook_hidden',HIDDEN_TASK='hh_family_task_hidden',PRESET_TABLE='hh_family_task_presets';
const CAT_TABLE='hh_family_task_categories';
const catDefault=['🏠 Otthon','🛒 Bevásárlás','🍕 Étel / ital rendelés','📦 Webshopping','🚚 Csomagátvétel','🐶 Corky','📅 Ügyintézés','✈️ Utazás','🩺 Egészség','💡 Egyéb'];
let categoryRows=[],presetRows=[],cat=catDefault.slice();
const names={monika:'Mónika',zsolt:'Zsolt',lena:'Léna'};
const statuses={todo:'🔴 Még nem kezdte',progress:'🟠 Folyamatban',done:'🟢 Kész'};
let user=null,authorized=[],tasks=[],logs=[],hiddenLogs=new Set(),hiddenTasks=new Set(),showHidden=false,tab='mine',selected='zsolt',category='🏠 Otthon',due='none',loading=false,refreshId=null,liveChannel=null;
function self(){try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}}
function imgFor(p){
 const avatar=w.HH_GOLDEN_AVATARS_V529||{};
 return p==='monika'?avatar.m:p==='zsolt'?avatar.z:'data:image/webp;base64,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';
}
function element(tag,cl,text){const n=d.createElement(tag);if(cl)n.className=cl;if(text!==undefined)n.textContent=text;return n}
function button(text,cl,fn){const b=element('button',cl,text);b.type='button';if(fn)b.addEventListener('click',fn);return b}
function avatar(p){const a=element('img','avatar');a.src=imgFor(p);a.alt=(names[p]||p)+' profilképe';a.loading='lazy';return a}
function label(p){return names[p]||p||'Ismeretlen'}
function announce(t){
 const status=$('fhStatus');
 status.textContent=t;
 // Keep successful synchronization off-screen without losing ARIA feedback.
 // Errors and actionable warnings remain visible to the user.
 status.classList.toggle('is-alert',/adathiba|hiba:|nem sikerült|offline|hiányzó kapcsolat|jelentkezz be|nincs hozzáférés|nem engedélyezett|próbáld újra/i.test(String(t)));
}
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
 const mine=tasks.filter(t=>t.assigned_profile===self()&&!t.assigned_agent&&!hiddenTasks.has(String(t.id)));
 for(const [id,key] of [['fhTodoCount','todo'],['fhProgressCount','progress'],['fhDoneCount','done']]){
  $(id).textContent=mine.filter(t=>t.status===key).length;
 }
}
function render(){
 const needle=$('fhSearch').value.toLocaleLowerCase('hu-HU').trim();let records=[];
 $('fhList').replaceChildren();
 const hiddenToggle=$('fhHiddenToggle');
 if(hiddenToggle){
  const count=tab==='log'?hiddenLogs.size:hiddenTasks.size;
  hiddenToggle.textContent=showHidden?'↩ Aktív nézet':'👁 Rejtettek'+(count?' ('+count+')':'');
  hiddenToggle.setAttribute('aria-pressed',String(showHidden));
  hiddenToggle.hidden=!count&&!showHidden;
 }
 if(tab==='log'){
  records=logs.filter(e=>(showHidden?hiddenLogs.has(String(e.id)):!hiddenLogs.has(String(e.id)))&&(e.title_snapshot+' '+e.event_type+' '+label(e.actor_profile)+' '+label(e.recipient_profile)).toLocaleLowerCase('hu-HU').includes(needle));
  if(!records.length){$('fhList').append(element('p','fh-empty','Ebben a 30 napos időszakban nincs ilyen naplóbejegyzés.'));return}
  records.forEach(e=>{
    const name=e.title_snapshot||'Feladat';
    const sentence=e.event_type==='created'?'új feladatot rögzített':
      e.event_type==='assigned'?'átadott egy feladatot':
      e.event_type==='status'?'státuszt módosított':
      e.event_type==='deadline'?'határidőt változtatott':
      e.event_type==='reaction'?'reakciót adott':'szerkesztette a feladatot';
    const item=element('article','fh-log glass');
    const remove=showHidden?button('↩','fh-log-remove',()=>restoreLogEntry(e)):button('×','fh-log-remove',()=>hideLogEntry(e));
    remove.title=showHidden?'Naplóbejegyzés visszaállítása':'Bejegyzés elrejtése a Naplóból';
    remove.setAttribute('aria-label',remove.title+': '+name);
    item.append(remove);
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
   (showHidden?hiddenTasks.has(String(t.id)):!hiddenTasks.has(String(t.id)))&&
   (tab==='mine'?(t.assigned_profile===self()&&!t.assigned_agent):
    tab==='issued'?(t.creator_profile===self()&&(t.assigned_profile!==self()||!!t.assigned_agent)):true)
   &&(t.title+' '+t.category+' '+label(t.assigned_profile)).toLocaleLowerCase('hu-HU').includes(needle));
 if(!records.length){$('fhList').append(element('p','fh-empty','Itt még nincs teendő. A ＋ Új feladat gombbal kezdheted.'));return}
 records.forEach(t=>{
   const card=element('article','fh-card glass'+(t.status==='done'?' is-done':''));card.id='task-'+t.id;card.dataset.id=t.id;
   if(showHidden){
     const restore=button('↩','fh-task-dismiss',()=>restoreCompletedTask(t));
     restore.title='Feladat visszaállítása';restore.setAttribute('aria-label','Feladat visszaállítása: '+t.title);card.append(restore);
   }else if(t.status==='done'){
     const dismiss=button('×','fh-task-dismiss',()=>hideCompletedTask(t));
     dismiss.title='Kész feladat elrejtése';dismiss.setAttribute('aria-label','Kész feladat elrejtése: '+t.title);card.append(dismiss);
   }
   const head=element('div','fh-cardtop');
   const categoryButton=button(t.category,'fh-category',()=>{
     const query=$('fhSearch');
     // Tap once to show all family tasks in this category; tap again to clear.
     query.value=query.value.trim()===t.category?'':t.category;
     const all=d.querySelector('[data-tab="all"]');
     if(all)all.click();else {tab='all';render()}
     d.querySelector('.fh-tabs')?.scrollIntoView({block:'start',behavior:'smooth'});
   });
   categoryButton.title='Kategória szerinti szűrés: '+t.category;
   categoryButton.setAttribute('aria-label','Szűrés erre a kategóriára: '+t.category);
   categoryButton.setAttribute('aria-pressed',String($('fhSearch').value.trim()===t.category));
   head.append(element('h2',null,t.title),categoryButton);
   card.append(head);
   const meta=element('div','fh-meta');
   meta.append(avatar(t.assigned_agent?'lena':t.assigned_profile),
     element('span',null,'Felelős: '+(t.assigned_agent?'Léna · AI Concierge':label(t.assigned_profile))));
   const dt=element('span','fh-due'+(isOverdue(t)?' overdue':''),t.due_at?'📅 '+formatDate(t.due_at):'');
   meta.append(dt);card.append(meta);
   const provenance=element('div','fh-provenance');
   const from=element('span',null,'Feladó: '+label(t.creator_profile));
   const created=element('time',null,formatTime(t.created_at));created.dateTime=t.created_at;
   provenance.append(from,created);
   if(t.status==='done'){
     const completion=element('strong','fh-done-label','✓ Kész'+(t.completed_at?' · '+formatTime(t.completed_at):''));
     provenance.append(completion);
   }
   card.append(provenance);
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

async function hideCompletedTask(task){
 if(!api||!user||!authorized.includes(self())||task.status!=='done')return;
 const {error}=await api.from(HIDDEN_TASK).insert({profile_key:self(),task_id:task.id,hidden_by:user.id});
 if(error){announce('Nem sikerült elrejteni a kész feladatot: '+error.message);return}
 hiddenTasks.add(String(task.id));render();setStats();
 announce('✓ Kész feladat elrejtve. A feladat és a naplója megmaradt.');
}
async function restoreCompletedTask(task){
 if(!api||!user||!authorized.includes(self()))return;
 const {error}=await api.from(HIDDEN_TASK).delete().eq('profile_key',self()).eq('task_id',task.id);
 if(error){announce('Nem sikerült visszaállítani a feladatot: '+error.message);return}
 hiddenTasks.delete(String(task.id));render();setStats();announce('✓ Feladat visszaállítva.');
}
async function restoreLogEntry(event){
 if(!api||!user||!authorized.includes(self()))return;
 const {error}=await api.from(HIDDEN_LOG).delete().eq('profile_key',self()).eq('log_id',event.id);
 if(error){announce('Nem sikerült visszaállítani a naplót: '+error.message);return}
 hiddenLogs.delete(String(event.id));render();announce('✓ Naplóbejegyzés visszaállítva.');
}
async function hideLogEntry(event){
 if(!api||!user||!authorized.includes(self()))return;
 const {error}=await api.from(HIDDEN_LOG).insert({profile_key:self(),log_id:event.id,hidden_by:user.id});
 if(error){announce('Nem sikerült elrejteni a bejegyzést: '+error.message);return}
 hiddenLogs.add(String(event.id));render();announce('✓ Naplóbejegyzés elrejtve a profilból.');
}

/* v894 · Flat editable task picker, using the already-saved common preset catalog. */
function categoryFeedback(message){const el=$('fhCategoryMessage');if(el)el.textContent=message}
function activeTaskTemplates(){
 const activeCategories=new Map(categoryRows.filter(c=>c.active).map(c=>[c.id,c]));
 return presetRows.filter(p=>p.active&&activeCategories.has(p.category_id)).sort((a,b)=>{
  const ac=activeCategories.get(a.category_id),bc=activeCategories.get(b.category_id);
  return (ac.sort_order-bc.sort_order)||(a.sort_order-b.sort_order)||a.title.localeCompare(b.title,'hu-HU');
 });
}
function defaultCategory(){
 return categoryRows.find(c=>c.active&&c.name==='❤️ CSALÁD & EGYÉB')||categoryRows.find(c=>c.active)||null;
}
async function loadCategories(){
 if(!api||!user||!authorized.includes(self()))return;
 const [cats,presets]=await Promise.all([
  api.from(CAT_TABLE).select('id,name,sort_order,active').order('sort_order',{ascending:true}),
  api.from(PRESET_TABLE).select('id,category_id,title,sort_order,active').order('sort_order',{ascending:true})
 ]);
 if(cats.error||presets.error){
  categoryFeedback('A feladatlista nem tölthető be: '+(cats.error?.message||presets.error?.message));return;
 }
 categoryRows=cats.data||[];presetRows=presets.data||[];
 category=defaultCategory()?.name||'❤️ CSALÁD & EGYÉB';
 renderPresets();renderPresetEditor();
}
/* v903 · Same subtle mechanical scroll detent as HH Buddy scroll companion v595.
   Lazy WebAudio, only following real interaction. 1 click per 48px task row,
   90ms minimum interval, no remote asset, no timers or network polling. */
function wireTaskScrollClicks(){
 const rail=$('fhPresets');if(!rail||rail.dataset.fhTick903==='on')return;
 rail.dataset.fhTick903='on';
 let ctx=null, gestureUntil=0,lastRow=Math.floor(rail.scrollTop/48),lastTickAt=0;
 function unlock(){
  try{
   const AC=w.AudioContext||w.webkitAudioContext;
   if(!AC)return;
   if(!ctx)ctx=new AC();
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }catch(_){}
 }
 function begin(){lastRow=Math.floor(rail.scrollTop/48);gestureUntil=Date.now()+4000;unlock()}
 function end(){gestureUntil=Date.now()+1300}
 function note(freq,offset,duration,volume,type){
  if(!ctx||ctx.state!=='running')return;
  const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t+offset);
  g.gain.setValueAtTime(.0001,t+offset);
  g.gain.exponentialRampToValueAtTime(volume,t+offset+.006);
  g.gain.exponentialRampToValueAtTime(.0001,t+offset+duration);
  o.connect(g);g.connect(ctx.destination);
  o.start(t+offset);o.stop(t+offset+duration+.014);
 }
 rail.addEventListener('pointerdown',begin,{passive:true});
 rail.addEventListener('touchstart',begin,{passive:true});
 rail.addEventListener('pointerup',end,{passive:true});
 rail.addEventListener('touchend',end,{passive:true});
 rail.addEventListener('pointercancel',end,{passive:true});
 rail.addEventListener('wheel',()=>{gestureUntil=Date.now()+1100;unlock()},{passive:true});
 rail.addEventListener('scroll',()=>{
  const row=Math.floor(rail.scrollTop/48);
  if(row===lastRow)return;
  lastRow=row;
  const now=Date.now();
  if(now>gestureUntil||now-lastTickAt<90||d.visibilityState==='hidden')return;
  lastTickAt=now;
  try{
   note(950,0,.046,.075,'triangle');
   note(1430,.012,.034,.024,'sine');
  }catch(_){}
 },{passive:true});
 w.addEventListener('pagehide',()=>{if(ctx&&ctx.state!=='closed')ctx.close().catch(()=>{});ctx=null},{once:true});
}
function renderPresets(){
 const host=$('fhPresets');if(!host)return;
 host.replaceChildren();
 const items=activeTaskTemplates();
 items.forEach(p=>{
  const b=button(p.title,'fh-preset-chip',()=>{
   $('fhTitle').value=p.title;
   const group=categoryRows.find(c=>c.id===p.category_id);
   category=group?.name||defaultCategory()?.name||'❤️ CSALÁD & EGYÉB';
   $('fhVoiceStatus').textContent='';
   host.querySelectorAll('.fh-preset-chip').forEach(tile=>{
    tile.classList.toggle('selected',tile===b);
    tile.setAttribute('aria-pressed',String(tile===b));
   });
  });
  b.setAttribute('aria-pressed','false');b.title=p.title;host.append(b);
 });
 const group=$('fhPresetGroup');if(group)group.hidden=!items.length;
 if(!items.length)categoryFeedback('Nincs feladat a listában. A Szerkesztés gombbal felvehetsz újat.');
}
function renderPresetEditor(){
 const host=$('fhPresetRows');if(!host)return;host.replaceChildren();
 activeTaskTemplates().forEach(p=>{
  const row=element('div','fh-category-row'),input=element('input');
  input.value=p.title;input.maxLength=90;input.setAttribute('aria-label','Feladat átnevezése');
  const save=button('Mentés','',async()=>{
   const title=input.value.trim();
   if(title.length<2||title.length>90){categoryFeedback('A feladat neve 2–90 karakter lehet.');return}
   save.disabled=true;
   const {error}=await api.from(PRESET_TABLE).update({title,updated_at:new Date().toISOString()}).eq('id',p.id);
   if(error){categoryFeedback('Nem sikerült átnevezni: '+error.message);save.disabled=false;return}
   categoryFeedback('✓ Feladat átnevezve.');await loadCategories();
  });
  const hide=button('×','fh-category-delete',async()=>{
   if(!w.confirm('Elrejted ezt a feladatot a listából? A már elmentett teendők megmaradnak.'))return;
   hide.disabled=true;
   const {error}=await api.from(PRESET_TABLE).update({active:false,updated_at:new Date().toISOString()}).eq('id',p.id);
   if(error){categoryFeedback('Hiba: '+error.message);hide.disabled=false;return}
   categoryFeedback('✓ Feladat elrejtve.');await loadCategories();
  });
  hide.setAttribute('aria-label','Feladat elrejtése: '+p.title);
  row.append(input,save,hide);host.append(row);
 });
}
async function addPreset(){
 const field=$('fhPresetNew'),title=field.value.trim();
 if(title.length<2||title.length>90){categoryFeedback('Adj meg egy 2–90 karakteres feladatot.');return}
 const chosen=defaultCategory();
 if(!chosen){categoryFeedback('A közös feladatlista jelenleg nem érhető el.');return}
 if(activeTaskTemplates().some(p=>p.title.toLocaleLowerCase('hu-HU')===title.toLocaleLowerCase('hu-HU'))){
  categoryFeedback('Ez a feladat már szerepel a listában.');return;
 }
 const b=$('fhPresetAdd');b.disabled=true;
 const inactive=presetRows.find(p=>p.category_id===chosen.id&&p.title===title&&!p.active);
 const query=inactive
  ?api.from(PRESET_TABLE).update({active:true,updated_at:new Date().toISOString()}).eq('id',inactive.id)
  :api.from(PRESET_TABLE).insert({category_id:chosen.id,title,sort_order:(presetRows.reduce((max,p)=>Math.max(max,p.sort_order||0),0)+10)});
 const {error}=await query;b.disabled=false;
 if(error){categoryFeedback('Mentési hiba: '+error.message);return}
 field.value='';categoryFeedback('✓ Új feladat felvéve a közös listába.');await loadCategories();
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
 selected=self();category=defaultCategory()?.name||'❤️ CSALÁD & EGYÉB';due='none';
 $('fhTitle').value='';$('fhCustomDue').value='';$('fhSaveInfo').textContent='';
 $('fhBackdrop').hidden=false;$('fhSheet').hidden=false;
 // Move the original profile switch into Quick Add's family hero (bottom-left).
 // Moving, not cloning, preserves one handler, one avatar and the current profile.
 const quickHero=$('fhSheet').querySelector('.fh-quick-hero');
 if(quickHero&&$('fhProfileSwitch'))quickHero.appendChild($('fhProfileSwitch'));
 // Dock the ONE standard SH9 navigation inside the dialog, below its scrollable content.
 const standardNav=d.querySelector('.fh-standard-nav');if(standardNav)$('fhSheet').appendChild(standardNav);
 d.body.style.overflow='hidden';renderPeople();renderPresets();renderDue();
 // Do not autofocus: preserve the full S24 Ultra Quick Add screen until explicitly tapped.
}
function hideSheet(){
 if(d.activeElement&&$('fhSheet').contains(d.activeElement))d.activeElement.blur();
 // Restore the same profile switch to the main hero; no duplicate buttons.
 const originalHead=d.querySelector('.fh-hero .fh-head');
 const switcher=$('fhProfileSwitch');
 if(originalHead&&switcher)originalHead.appendChild(switcher);
 // Return the original taskbar to the main screen without cloning or losing handlers.
 const standardNav=$('fhSheet').querySelector('.fh-standard-nav');if(standardNav)d.body.insertBefore(standardNav,$('fhBackdrop'));
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
let fetchAgain=false,lastFresh=0;
async function fetchData(){
 if(!api||!user)return;
 if(loading){fetchAgain=true;return}
 loading=true;
 const thirty=new Date(Date.now()-30*864e5).toISOString();
 const result=await Promise.all([
  api.from(TABLE).select('id,title,details,category,creator_profile,assigned_profile,assigned_agent,status,due_at,completed_at,reaction,stars,revision,created_at,updated_at').order('updated_at',{ascending:false}).limit(150),
  api.from(LOG).select('id,task_id,event_type,actor_profile,recipient_profile,title_snapshot,previous_value,current_value,created_at').gte('created_at',thirty).order('id',{ascending:false}).limit(120),
  api.from(HIDDEN_LOG).select('log_id').eq('profile_key',self()).limit(1500),
  api.from(HIDDEN_TASK).select('task_id').eq('profile_key',self()).limit(1500)
 ]);
 loading=false;lastFresh=Date.now();
 if(fetchAgain){fetchAgain=false;w.setTimeout(fetchData,300)}
 if(result.some(r=>r.error)){announce('Adathiba: '+result.find(r=>r.error).error.message);return}
 tasks=result[0].data||[];logs=result[1].data||[];
 hiddenLogs=new Set((result[2].data||[]).map(e=>String(e.log_id)));
 hiddenTasks=new Set((result[3].data||[]).map(e=>String(e.task_id)));
 setStats();render();announce('Szinkronizálva · '+tasks.length+' feladat · 30 napos napló');
}
let lastForegroundRequest=0;
async function refreshWhenForeground(){
 if(!api||!user||d.visibilityState==='hidden'||!authorized.includes(self()))return;
 const now=Date.now();
 // Exactly one bounded task read per return to foreground. No polling or redundant log/history fetch.
 if(now-lastForegroundRequest<1800)return;
 lastForegroundRequest=now;
 if(loading){fetchAgain=true;return}
 try{
  const {data,error}=await api.from(TABLE)
    .select('id,title,details,category,creator_profile,assigned_profile,assigned_agent,status,due_at,completed_at,reaction,stars,revision,created_at,updated_at')
    .order('updated_at',{ascending:false}).limit(150);
  if(error){announce('Adathiba: '+error.message);return}
  tasks=data||[];setStats();render();
 }catch(err){announce('Adathiba: '+err.message)}
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
/* v915 firebreak: one session check in flight, no re-fetch/re-subscribe on token refresh. */
let authSyncPending=null,authSyncQueued=false,authenticatedFor='',subscribedFor='';
async function authSync(force=false){
 if(authSyncPending){if(force)authSyncQueued=true;return authSyncPending}
 if(!force&&user&&authorized.includes(self())&&authenticatedFor===user.id&&liveChannel)return;
 authSyncPending=(async()=>{
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
  if(user&&authorized.includes(self())){
   if(force||authenticatedFor!==user.id||!liveChannel){
    await loadCategories();await fetchData();subscribe();authenticatedFor=user.id;
   }
  }else{
   authenticatedFor='';subscribedFor='';
   tasks=[];logs=[];hiddenTasks.clear();hiddenLogs.clear();setStats();render();
   if(liveChannel){api.removeChannel(liveChannel);liveChannel=null}
  }
 })();
 try{return await authSyncPending}
 finally{
  authSyncPending=null;
  if(authSyncQueued){authSyncQueued=false;w.setTimeout(()=>authSync(true),0)}
 }
}
function subscribe(){
 if(!api||!user)return;
 if(liveChannel&&subscribedFor===user.id)return;
 if(liveChannel)api.removeChannel(liveChannel);
 liveChannel=api.channel('fh-tasks-'+user.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'hh_family_task_events'},()=>reloadSoon())
  .subscribe();
 subscribedFor=user.id;
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
 wireTaskScrollClicks();
 $('fhCategoryManage').addEventListener('click',()=>{
  const panel=$('fhCategoryEditor');panel.hidden=!panel.hidden;if(!panel.hidden)renderPresetEditor();
 });
 $('fhPresetAdd').addEventListener('click',addPreset);
 $('fhProfileSwitch').addEventListener('click',()=>{
  const next=self()==='monika'?'zsolt':'monika';
  if(user&&!authorized.includes(next)){announce(label(next)+' profil nem engedélyezett.');return}
  w.localStorage.setItem('hh-profile',next==='monika'?'m':'z');
  // v916: manual profile switching must bypass the v915 auth/ACL fast path.
  // Update the visible identity now, then fetch profile-scoped hidden tasks/history.
  selected=next;showHidden=false;profileUi();
  w.dispatchEvent(new CustomEvent('hh-family-profile-changed'));
  authSync(true);
 });
 $('fhAdd').addEventListener('click',showSheet);
 $('fhClose').addEventListener('click',hideSheet);
 $('fhBackdrop').addEventListener('click',hideSheet);
 $('fhForm').addEventListener('submit',save);
 $('fhVoice').addEventListener('click',startDictation);
 $('fhSuccessClose').addEventListener('click',hideSuccess);
 $('fhSearch').addEventListener('input',render);
 $('fhHiddenToggle').addEventListener('click',()=>{showHidden=!showHidden;render();});
 $('fhCustomDue').addEventListener('change',()=>{due='custom';d.querySelectorAll('[data-due]').forEach(b=>b.classList.remove('active'))});
 d.querySelectorAll('[data-due]').forEach(b=>b.addEventListener('click',()=>chooseDue(b.dataset.due)));
 d.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
   tab=b.dataset.tab;showHidden=false;d.querySelectorAll('[data-tab]').forEach(x=>{
     x.classList.toggle('active',x===b);if(x===b)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');
   });render();
 }));
 $('fhLogin').addEventListener('click',async()=>{
  if(!api)return;
  const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
  if(error)announce('Belépési hiba: '+error.message);
 });
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'){showHidden=false;authSync(true)}});
 d.addEventListener('visibilitychange',refreshWhenForeground);
 w.addEventListener('focus',refreshWhenForeground);
 w.addEventListener('pageshow',e=>{if(e.persisted)refreshWhenForeground()});
 d.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('fhSuccess').hidden)hideSuccess();else if(!$('fhSheet').hidden)hideSheet()}});
 if(new URLSearchParams(w.location.search).has('task')){tab='all';d.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='all'))}
 if(api)api.auth.onAuthStateChange((event,session)=>{
  // SIGNED_IN can fire on tab focus; TOKEN_REFRESHED must not reload data.
  if(event==='SIGNED_OUT'||event==='USER_UPDATED'||
     (event==='SIGNED_IN'&&(!user||session?.user?.id!==user.id)))
   w.setTimeout(()=>authSync(true),0);
 });
 profileUi();authSync(true);
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
w.FAMILY_TASKS_V880=Object.freeze({version:'880',get tab(){return tab},get profile(){return self()}});
})(window,document);
