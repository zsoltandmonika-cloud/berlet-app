/* Buddy Sticky Note v880 · lightweight global Family Hub event subscriber.
 * Zero timers for polling. Visible-page Realtime + an initial bounded unread read.
 * X closes the popup but never deletes or marks the task as read.
 */
(function(w,d){
'use strict';
if(w.HH_FAMILY_NOTIFIER_V880)return;
const HOME='/berlet-app/sh9/family-hub/';
const NOTES_TABLE='hh_family_task_sticky_notes', ACK_TABLE='hh_family_task_sticky_ack';
const profile=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}};
let api=null,apiRequested=false;
function getSessionHint(){try{return !!w.localStorage.getItem('hh-guardian-family-auth-v785')}catch(_){return false}}
function loadScript(src){
 return new Promise((resolve,reject)=>{
  const s=d.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('A kapcsolat szkriptje nem tölthető be.'));d.head.append(s);
 });
}
async function ensureApi(){
 if(api)return true;
 if(!getSessionHint())return false; // No hidden JS/CDN traffic for visitors without a saved login.
 if(apiRequested)return false;
 apiRequested=true;
 try{
  if(!w.HH_CENTRAL_VAULT)await loadScript('/berlet-app/healthhub/central-vault/config.js?v=785');
  if(!w.supabase?.createClient)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.2/dist/umd/supabase.min.js');
  const cfg=w.HH_CENTRAL_VAULT;
  if(!cfg?.enabled||!w.supabase?.createClient)return false;
  api=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{
   storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'
  }});
  api.auth.onAuthStateChange(()=>w.setTimeout(join,0));
  return true;
 }catch(_){return false}finally{apiRequested=false}
}
let ch=null,user=null,currentProfile=profile(),badge=null,holder=null,lastEvent=0,activeEventId=0,pending=[],soundContext=null,cloudAckCache=new Map();
function seenKey(p){return 'hh-family-tasks-v880-seen-'+p}
function ackKey(p){return 'hh-family-sticky-ack-v904-'+p}
function noteKey(p,taskId){return 'hh-family-sticky-note-v904-'+p+'-'+taskId}
function storedAck(p){try{return Number(w.localStorage.getItem(ackKey(p))||0)}catch(_){return 0}}
function writeAck(id,p){try{w.localStorage.setItem(ackKey(p),String(Math.max(storedAck(p),Number(id)||0)))}catch(_){}}
function stickyText(p,id){try{return w.localStorage.getItem(noteKey(p,id))||''}catch(_){return ''}}
function setStickyText(p,id,text){try{w.localStorage.setItem(noteKey(p,id),text)}catch(_){}}
/* Cloud note is SHARED per task by both family profiles; acknowledgement stays per profile.
   No background timers, separate sockets or extra GPS traffic. */
async function pushAck(p,id){
 if(!api||!user)return false;
 const next=Math.max(Number(id)||0,storedAck(p),cloudAckCache.get(p)||0);
 if(next<=0)return true;
 const {error}=await api.from(ACK_TABLE).upsert({
  profile_key:p,last_event_id:next,updated_by:user.id,updated_at:new Date().toISOString()
 },{onConflict:'profile_key'});
 if(error){console.warn('Sticky ack sync error',error.message);return false}
 cloudAckCache.set(p,next);
 return true;
}
async function loadCloudAck(p){
 if(!api||!user)return;
 const {data,error}=await api.from(ACK_TABLE).select('last_event_id')
  .eq('profile_key',p).maybeSingle();
 if(error){console.warn('Sticky ack read error',error.message);return}
 const remote=Number(data?.last_event_id)||0,local=storedAck(p);
 cloudAckCache.set(p,remote);
 if(remote>local){writeAck(remote,p);markSeen(remote,p)}
 if(local>remote)await pushAck(p,local); // migrate an earlier on-device dismissal
}
function onCloudAckChange(event,p){
 const data=event.new;if(!data||data.profile_key!==p)return;
 const next=Number(data.last_event_id)||0;
 cloudAckCache.set(p,Math.max(cloudAckCache.get(p)||0,next));
 if(next<=storedAck(p))return;
 writeAck(next,p);markSeen(next,p);
 pending=pending.filter(e=>Number(e.id)>next);
 activeEventId=0;holder?.replaceChildren();drawPending();
}
function onCloudNoteChange(event){
 const row=event.new;
 if(!row||!row.task_id||!holder||!holder.firstChild)return;
 const active=pending[0];if(!active||String(active.task_id)!==String(row.task_id))return;
 const node=holder.firstChild,custom=node.querySelector('.fh-notice-custom'),
  textarea=node.querySelector('.fh-notice-editor textarea'),editBox=node.querySelector('.fh-notice-editor'),
  syncLabel=node.querySelector('.fh-note-sync-status');
 const val=String(row.note||'');
 setStickyText(currentProfile,row.task_id,val);
 if(custom)custom.textContent=val?'✎ '+val:'';
 if(textarea&&editBox?.hidden)textarea.value=val;
 if(syncLabel)syncLabel.textContent=editBox&&!editBox.hidden?'☁ Közben frissült, ellenőrizd a szerkesztést.':'☁ Szinkronizálva';
}
async function getSharedNote(taskId,p,node,custom,textarea,editBox,syncLabel){
 if(!api||!user||!taskId)return;
 const {data,error}=await api.from(NOTES_TABLE).select('note,updated_at')
  .eq('task_id',taskId).maybeSingle();
 if(!node.isConnected||p!==currentProfile)return;
 if(error){syncLabel.textContent='⚠ Felhőkapcsolat nem érhető el';return}
 if(data){
  const value=String(data.note||'');
  setStickyText(p,taskId,value);
  custom.textContent=value?'✎ '+value:'';
  if(editBox.hidden)textarea.value=value;
  syncLabel.textContent='☁ Szinkronizálva';
  return;
 }
 const old=stickyText(p,taskId).trim().slice(0,240);
 if(!old){syncLabel.textContent='☁ Közös megjegyzés';return}
 // One-time migration from old phone storage. INSERT, never overwrite a note
 // that another phone may have written since the SELECT.
 const migration=await api.from(NOTES_TABLE).insert({
  task_id:taskId,note:old,updated_by_profile:p,updated_by:user.id
 });
 if(!node.isConnected||p!==currentProfile)return;
 if(!migration.error){syncLabel.textContent='☁ Régi megjegyzés átemelve';return}
 if(migration.error.code==='23505'){
  const latest=await api.from(NOTES_TABLE).select('note').eq('task_id',taskId).maybeSingle();
  if(!latest.error&&node.isConnected&&p===currentProfile){
   const value=String(latest.data?.note||'');
   setStickyText(p,taskId,value);custom.textContent=value?'✎ '+value:'';
   if(editBox.hidden)textarea.value=value;syncLabel.textContent='☁ Szinkronizálva';
  }
 }else syncLabel.textContent='⚠ Régi megjegyzés nincs szinkronizálva';
}

function armSound(){
 try{
  const AC=w.AudioContext||w.webkitAudioContext;if(!AC)return;
  soundContext=soundContext||new AC();
  if(soundContext.state==='suspended')soundContext.resume().catch(()=>{});
 }catch(_){}
}
function ping(){
 if(d.visibilityState==='hidden'||!soundContext||soundContext.state!=='running')return;
 try{
  const t=soundContext.currentTime;
  [784,1046].forEach((hz,i)=>{
   const o=soundContext.createOscillator(),g=soundContext.createGain();
   o.type='sine';o.frequency.setValueAtTime(hz,t+i*.085);
   g.gain.setValueAtTime(.0001,t+i*.085);
   g.gain.exponentialRampToValueAtTime(.035,t+i*.085+.015);
   g.gain.exponentialRampToValueAtTime(.0001,t+i*.085+.16);
   o.connect(g);g.connect(soundContext.destination);
   o.start(t+i*.085);o.stop(t+i*.085+.17);
  });
 }catch(_){}
}

function seen(p){try{return Number(w.localStorage.getItem(seenKey(p))||0)}catch(_){return 0}}
function markSeen(value,p=currentProfile){
 if(!value)return;
 try{w.localStorage.setItem(seenKey(p),String(Math.max(seen(p),value)))}catch(_){}
 if(badge){const span=badge.querySelector('.fh-badge-count');if(span){span.textContent='0';span.hidden=true}}
}
function openTask(taskId){
 // Opening a task is not an acknowledgment; only the Sticky Note X is.
 w.location.assign(HOME+(taskId?'?task='+encodeURIComponent(taskId):''));
}
function style(){
 if(d.getElementById('fhNotifierCssV880'))return;
 const s=d.createElement('link');s.id='fhNotifierCssV880';s.rel='stylesheet';s.href='/berlet-app/sh9/family-hub/family-notifier-v880.css?v=908-cloud-notes';d.head.append(s);
}
function makeUi(){
 if(!d.body)return;
 style();
 holder=d.createElement('div');holder.className='fh-notice-anchor';holder.setAttribute('role','region');
 holder.setAttribute('aria-label','Buddy Family Tasks értesítések');d.body.append(holder);
 // Reuse the one Golden Standard Tasks link; never inject another button.
 badge=d.getElementById('sh9TasksGolden')||d.querySelector('.fh-module-badge')||null;
 const found=Number(new URLSearchParams(w.location.search).has('task'));
 if(found&&w.location.pathname.includes('/family-hub/'))markSeen(lastEvent);
}
function messageFor(e){
 const action={created:'Új saját teendőd érkezett!',assigned:'Feladatot kaptál!',status:'Feladat állapota változott',deadline:'Határidő módosult',edited:'Módosult a feladat',reaction:'Reakció érkezett'};
 if(e.event_type==='status'&&e.current_value?.status==='done')return '✅ A feladatot befejezték!';
 return action[e.event_type]||'Családi feladatfrissítés';
}
function drawPending(){
 if(!holder||d.visibilityState==='hidden'||!pending.length){if(!pending.length)holder?.replaceChildren();return}
 const e=pending[0];if(activeEventId===Number(e.id)&&holder.firstChild)return;
 activeEventId=Number(e.id);
 const pkey=currentProfile;
 const node=d.createElement('div');node.className='fh-notice';node.dataset.eventId=String(e.id);
 node.tabIndex=0;node.setAttribute('role','group');
 node.setAttribute('aria-label','Buddy értesítés: '+(e.title_snapshot||'Családi feladat'));
 const top=d.createElement('div');top.className='fh-note-top';
 const heading=d.createElement('strong');heading.textContent='Buddy üzenete';
 const editor=d.createElement('button');editor.type='button';editor.className='fh-note-edit';editor.textContent='✎';
 editor.title='Saját megjegyzés szerkesztése';editor.setAttribute('aria-label','Saját megjegyzés szerkesztése');
 const x=d.createElement('button');x.type='button';x.className='fh-notice-close';x.textContent='×';
 x.setAttribute('aria-label','Értesítés láttamozása és bezárása');
 x.addEventListener('click',event=>{
  event.stopPropagation();writeAck(e.id,pkey);markSeen(e.id,pkey);
  void pushAck(pkey,e.id);
  pending=pending.filter(item=>Number(item.id)>Number(e.id));
  activeEventId=0;holder.replaceChildren();drawPending();
 });
 top.append(heading,editor,x);
 const buddy=d.createElement('img');buddy.className='fh-note-buddy';
 buddy.src='/berlet-app/sh9/family-hub/assets/family-success-buddy-v881.webp';
 buddy.alt='Buddy mókus';buddy.loading='eager';buddy.decoding='async';
 buddy.addEventListener('error',()=>{buddy.hidden=true},{once:true});
 const h=d.createElement('h3');h.textContent=e.title_snapshot||'Családi teendő';
 const info=d.createElement('p');info.className='fh-notice-action';info.textContent=messageFor(e);
 const meta=d.createElement('div');meta.className='fh-notice-meta';
 const actor=d.createElement('span');const actorName=e.actor_profile==='monika'?'Mónika':e.actor_profile==='zsolt'?'Zsolt':e.actor_profile||'Család';
 actor.textContent=e.event_type==='status'?'Állapotot módosította: '+actorName:'Feladó: '+actorName;
 const at=d.createElement('time');at.dateTime=e.created_at||'';at.textContent=e.created_at?new Date(e.created_at).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
 meta.append(actor,at);
 const detail=d.createElement('p');detail.className='fh-notice-details';
 if(e.current_value?.due)detail.textContent='Határidő: '+new Date(e.current_value.due).toLocaleDateString('hu-HU');
 if(e.current_value?.status)detail.textContent+=(detail.textContent?' · ':'')+'Állapot: '+(e.current_value.status==='done'?'Kész':e.current_value.status==='progress'?'Folyamatban':'Teendő');
 const custom=d.createElement('div');custom.className='fh-notice-custom';
 const existing=stickyText(pkey,e.task_id);
 custom.textContent=existing?'✎ '+existing:'';
 const editBox=d.createElement('div');editBox.className='fh-notice-editor';editBox.hidden=true;
 const textarea=d.createElement('textarea');textarea.maxLength=240;textarea.rows=3;textarea.value=existing;textarea.placeholder='Közös megjegyzés (Mónika és Zsolt)';
 textarea.setAttribute('aria-label','Saját Sticky Note megjegyzés');
 const save=d.createElement('button');save.type='button';save.textContent='✓ Mentés';save.className='fh-notice-note-save';
 const syncLabel=d.createElement('small');syncLabel.className='fh-note-sync-status';
 syncLabel.textContent='☁ Közös megjegyzés';syncLabel.setAttribute('role','status');
 save.addEventListener('click',async event=>{
  event.stopPropagation();
  if(!api||!user){syncLabel.textContent='⚠ Nincs bejelentkezés';return}
  const val=textarea.value.trim();save.disabled=true;syncLabel.textContent='☁ Szinkronizálás…';
  try{
   const {error}=await api.from(NOTES_TABLE).upsert({
    task_id:e.task_id,note:val,updated_by_profile:pkey,updated_by:user.id,
    updated_at:new Date().toISOString()
   },{onConflict:'task_id'});
   if(error)throw error;
   setStickyText(pkey,e.task_id,val);custom.textContent=val?'✎ '+val:'';
   editBox.hidden=true;syncLabel.textContent='☁ Szinkronizálva';
  }catch(err){syncLabel.textContent='⚠ Nem sikerült menteni: '+(err?.message||'kapcsolati hiba')}
  finally{save.disabled=false}
 });
 editBox.append(textarea,save);
 editor.addEventListener('click',event=>{event.stopPropagation();editBox.hidden=!editBox.hidden;if(!editBox.hidden)textarea.focus()});
 const foot=d.createElement('button');foot.type='button';foot.className='fh-note-link';foot.textContent='Feladat megnyitása ›';
 foot.addEventListener('click',event=>{event.stopPropagation();openTask(e.task_id)});
 node.append(top,buddy,h,info,meta,detail,custom,editBox,syncLabel,foot);
 holder.replaceChildren(node);ping();
 void getSharedNote(e.task_id,pkey,node,custom,textarea,editBox,syncLabel);
 // The card survives until X, including navigation/reloads; acknowledging it is independent of opening the task.
 if(api&&user&&e.task_id){
  api.from('hh_family_tasks').select('category,details,due_at,status,creator_profile').eq('id',e.task_id).maybeSingle().then(({data,error})=>{
   if(error||!data||!node.isConnected)return;
   const parts=[];
   if(data.creator_profile)actor.textContent='Feladó: '+(data.creator_profile==='monika'?'Mónika':data.creator_profile==='zsolt'?'Zsolt':'Család')+(e.event_type==='status'?' · Készre állította: '+actorName:'');
   if(data.category)parts.push(data.category);
   if(data.details)parts.push(data.details);
   if(data.due_at)parts.push('Határidő: '+new Date(data.due_at).toLocaleDateString('hu-HU'));
   parts.push('Állapot: '+(data.status==='done'?'Kész':data.status==='progress'?'Folyamatban':'Teendő'));
   detail.textContent=parts.join(' · ');
  }).catch(()=>{});
 }
}
function announce(e){
 if(!e||!holder||e.recipient_profile!==currentProfile)return;
 if(Number(e.id)<=storedAck(currentProfile))return;
 if(pending.some(item=>Number(item.id)===Number(e.id)))return;
 pending.push(e);pending.sort((a,b)=>Number(a.id)-Number(b.id));
 drawPending();
}
async function readUnread(){
 if(!api||!user)return;
 const p=currentProfile;
 const {data,error}=await api.from('hh_family_task_events')
 .select('id,task_id,title_snapshot,event_type,actor_profile,recipient_profile,current_value,created_at')
 .eq('recipient_profile',p).gte('created_at',new Date(Date.now()-30*864e5).toISOString())
 .order('id',{ascending:false}).limit(50);
 if(error||p!==currentProfile||!badge)return;
 const items=data||[];
 lastEvent=Math.max(lastEvent,...items.map(x=>Number(x.id)));
 // First upgrade/open establishes baseline, not a flood of old Sticky Notes.
 try{
  if(w.localStorage.getItem(ackKey(p))===null){
   // Preserve genuinely unseen recent notifications on upgrade, without replaying 30 days.
   const oldSeen=seen(p),dayAgo=Date.now()-86400000;
   const older=items.filter(x=>Date.parse(x.created_at)<dayAgo);
   const recentLimit=items.length>5?Number(items[5].id):0;
   const olderId=older.length?Math.max(...older.map(x=>Number(x.id))):0;
   writeAck(Math.max(oldSeen,recentLimit,olderId),p);
  }
 }catch(_){}
 pending=items.filter(x=>Number(x.id)>storedAck(p)).sort((a,b)=>Number(a.id)-Number(b.id));
 if(!pending.some(x=>Number(x.id)===activeEventId)){activeEventId=0;holder?.replaceChildren()}
 drawPending();
 const unread=items.filter(x=>Number(x.id)>seen(p)).length;
 const n=badge.querySelector('.fh-badge-count');if(n){n.textContent=unread>49?'50+':String(unread);n.hidden=!unread}
 badge.setAttribute('aria-label','Family Tasks · '+unread+' olvasatlan esemény');
}
async function join(){
 if(!await ensureApi())return;
 const p=profile();if(p!==currentProfile){pending=[];activeEventId=0;holder?.replaceChildren()}currentProfile=p;
 if(ch){api.removeChannel(ch);ch=null}
 const {data:{user:found}}=await api.auth.getUser();
 user=found;if(!user){if(badge)badge.hidden=false;return}
 const {data, error}=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
 if(error||!(data||[]).some(x=>x.profile_key===p))return;
 await loadCloudAck(p);
 await readUnread();
 ch=api.channel('hh-family-notifier-v880-'+p+'-'+user.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'hh_family_task_events',filter:'recipient_profile=eq.'+p},payload=>{
    const e=payload.new;
    if(!e)return;
    lastEvent=Math.max(lastEvent,Number(e.id));
    announce(e);
    readUnread();
  })
  .on('postgres_changes',{event:'*',schema:'public',table:NOTES_TABLE},onCloudNoteChange)
  .on('postgres_changes',{event:'*',schema:'public',table:ACK_TABLE,filter:'profile_key=eq.'+p},payload=>onCloudAckChange(payload,p))
  .subscribe();
}
function initialize(){
 makeUi();
 d.addEventListener('pointerdown',armSound,{once:true,passive:true});
 d.addEventListener('touchstart',armSound,{once:true,passive:true});
 d.addEventListener('keydown',armSound,{once:true});
 w.addEventListener('hh-family-profile-changed',join);
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')join()});
 d.addEventListener('visibilitychange',()=>{
  if(d.visibilityState==='visible'){
   if(profile()!==currentProfile)join();
   else if(api&&user){loadCloudAck(currentProfile).then(()=>readUnread()).catch(()=>{});}
  }
 });
 d.addEventListener('click',()=>{if(profile()!==currentProfile)w.setTimeout(join,0)});
 join();
}
w.HH_FAMILY_NOTIFIER_V880={openTask,markSeen,version:'908-cloud-sync'};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})(window,document);
