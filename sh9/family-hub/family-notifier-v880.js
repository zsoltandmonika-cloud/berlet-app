/* Buddy Sticky Note v880 · lightweight global Family Hub event subscriber.
 * Zero timers for polling. Visible-page Realtime + an initial bounded unread read.
 * X closes the popup but never deletes or marks the task as read.
 */
(function(w,d){
'use strict';
if(w.HH_FAMILY_NOTIFIER_V880)return;
const HOME='/berlet-app/sh9/family-hub/';
const profile=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}};
const cfg=w.HH_CENTRAL_VAULT;
const api=cfg?.enabled&&w.supabase?.createClient
 ?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{
  storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'
 }}):null;
let ch=null,user=null,currentProfile=profile(),badge=null,holder=null,lastEvent=0,lastPopupId=0,loadPromise=null;
function seenKey(p){return 'hh-family-tasks-v880-seen-'+p}
function seen(p){try{return Number(w.localStorage.getItem(seenKey(p))||0)}catch(_){return 0}}
function markSeen(value,p=currentProfile){
 if(!value)return;
 try{w.localStorage.setItem(seenKey(p),String(Math.max(seen(p),value)))}catch(_){}
 if(badge){const span=badge.querySelector('.fh-badge-count');if(span){span.textContent='0';span.hidden=true}}
}
function openTask(taskId){
 markSeen(lastEvent);w.location.assign(HOME+(taskId?'?task='+encodeURIComponent(taskId):''));
}
function style(){
 if(d.getElementById('fhNotifierCssV880'))return;
 const s=d.createElement('link');s.id='fhNotifierCssV880';s.rel='stylesheet';s.href='/berlet-app/sh9/family-hub/family-notifier-v880.css?v=880';d.head.append(s);
}
function makeUi(){
 if(!d.body)return;
 style();
 holder=d.createElement('div');holder.className='fh-notice-anchor';holder.setAttribute('role','region');
 holder.setAttribute('aria-label','Buddy Family Tasks értesítések');d.body.append(holder);
 badge=d.createElement('button');badge.className='fh-badge';badge.type='button';
 const face=d.createElement('span');face.textContent='🐿️';
 const label=d.createElement('span');label.textContent='Tasks';
 const number=d.createElement('span');number.className='fh-badge-count';number.hidden=true;
 badge.append(face,label,number);badge.setAttribute('aria-label','Family Tasks megnyitása');badge.addEventListener('click',()=>openTask(null));
 const hero=d.querySelector('.hero,.guardian-hero,.fh-hero');
 if(hero)hero.append(badge);else d.body.append(badge);
 const found=Number(new URLSearchParams(w.location.search).has('task'));
 if(found&&w.location.pathname.includes('/family-hub/'))markSeen(lastEvent);
}
function announce(e){
 if(!e||!holder||e.recipient_profile!==currentProfile||d.visibilityState==='hidden')return;
 if(Number(e.id)<=lastPopupId)return;
 lastPopupId=Number(e.id);
 const action={created:'Új saját teendőd érkezett!',assigned:'Új feladatot kaptál!',status:'Feladat státusza változott!',deadline:'Új határidő!',edited:'Módosult a feladat!',reaction:'Új reakció érkezett!'};
 const node=d.createElement('div');node.className='fh-notice';
 node.tabIndex=0;node.setAttribute('role','button');
 node.setAttribute('aria-label',(action[e.event_type]||'Buddy-értesítés')+' '+e.title_snapshot+' · megnyitás');
 const top=d.createElement('div');top.className='fh-note-top';
 const title=d.createElement('strong');title.textContent='🐿️ Buddy üzenete';
 const x=d.createElement('button');x.type='button';x.className='fh-notice-close';x.textContent='×';
 x.setAttribute('aria-label','Sticky Note bezárása, feladat megtartása');
 x.addEventListener('click',ev=>{ev.stopPropagation();node.remove()});
 top.append(title,x);
 const h=d.createElement('h3');h.textContent=e.title_snapshot||'Családi teendő';
 const p=d.createElement('p');p.textContent=action[e.event_type]||'Family Tasks frissítés';
 const foot=d.createElement('span');foot.className='fh-note-link';foot.textContent='Megnyitás · Family Tasks ›';
 node.append(top,h,p,foot);
 node.addEventListener('click',()=>openTask(e.task_id));
 node.addEventListener('keydown',ev=>{if(ev.target===node&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();openTask(e.task_id)}});
 holder.replaceChildren(node);
 // No auto-read. Automatically disappear after ten seconds, indicator remains.
 w.setTimeout(()=>{if(node.isConnected)node.remove()},10000);
}
async function readUnread(){
 if(!api||!user)return;
 const p=currentProfile;
 const {data,error}=await api.from('hh_family_task_events')
 .select('id,task_id,title_snapshot,event_type,recipient_profile')
 .eq('recipient_profile',p).gte('created_at',new Date(Date.now()-30*864e5).toISOString())
 .order('id',{ascending:false}).limit(50);
 if(error||p!==currentProfile||!badge)return;
 const items=data||[];
 lastEvent=Math.max(lastEvent,...items.map(x=>Number(x.id)));
 if(w.location.pathname.includes('/family-hub/'))markSeen(lastEvent,p);
 const unread=items.filter(x=>Number(x.id)>seen(p)).length;
 const n=badge.querySelector('.fh-badge-count');n.textContent=unread>49?'50+':String(unread);n.hidden=!unread;
 badge.setAttribute('aria-label','Family Tasks · '+unread+' olvasatlan esemény');
}
async function join(){
 if(!api)return;
 const p=profile();currentProfile=p;
 if(ch){api.removeChannel(ch);ch=null}
 const {data:{user:found}}=await api.auth.getUser();
 user=found;if(!user){if(badge)badge.hidden=false;return}
 const {data, error}=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
 if(error||!(data||[]).some(x=>x.profile_key===p))return;
 await readUnread();
 ch=api.channel('hh-family-notifier-v880-'+p+'-'+user.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'hh_family_task_events',filter:'recipient_profile=eq.'+p},payload=>{
    const e=payload.new;
    if(!e)return;
    lastEvent=Math.max(lastEvent,Number(e.id));
    readUnread();
    announce(e);
  }).subscribe();
}
function initialize(){
 makeUi();
 if(!api)return;
 api.auth.onAuthStateChange(()=>w.setTimeout(join,0));
 w.addEventListener('hh-family-profile-changed',join);
 w.addEventListener('storage',e=>{if(e.key==='hh-profile')join()});
 d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'){readUnread()}});
 join();
}
w.HH_FAMILY_NOTIFIER_V880={openTask,markSeen};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})(window,document);
