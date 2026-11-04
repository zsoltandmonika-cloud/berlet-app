/* SHO Notification Center v1 · profile-aware presentation and rule editor */
(function(w,d){
'use strict';
const api=w.SHO_NOTIFICATION_CORE_V1;
if(!api)return;
const $=id=>d.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const language=()=>{try{return w.localStorage?.getItem('sh9-language-v1')==='en'?'en':'hu'}catch(_){return 'hu'}};
const tr=value=>typeof value==='string'?value:value?.[language()]||value?.hu||'';
const I={
 hu:{welcome:'Értesítéseid',inbox:'Beérkezett',unread:'Olvasatlan',settings:'Beállítások',recent:'Legutóbbi értesítések',
  markAll:'Összes olvasottnak',categories:'Kategóriák és szabályok',instructions:'Nyisd le a modult, majd állítsd be az értesítéseket.',
  test:'Értesítések tesztelése',testSub:'Hozz létre egy jelölt próbaértesítést a saját profilodhoz.',testButton:'Próbaértesítés',
  storage:'v1 előnézet: a beállítások és a próbaértesítések jelenleg ezen a böngészőn tárolódnak. Élő moduladatok, orvosi riasztások és telefonos push későbbi integrációval érkeznek.',
  subtitle:'Minden fontos jelzés. Egyetlen intelligens központban.',none:'Még nincs értesítés',noUnread:'Minden értesítésed olvasott',
  empty:'A bekötött modulok üzenetei itt jelennek majd meg. A Beállítások fülön a próbaértesítést is tesztelheted.',
  unreadEmpty:'Új, olvasatlan értesítés nem található.',demo:'PRÓBA',local:'Helyi beállítás',sensitive:'Biztonságos adatkapcsolat szükséges',
  saved:'Beállítás mentve',markSaved:'Olvasottnak jelölve',testSent:'Próbaértesítés létrehozva',
  soundTitle:'Értesítési harangszó',soundDescription:'Halk ding új értesítésnél a megnyitott SHO-ban.',soundPreview:'Hang tesztelése',soundAria:'Értesítési hang engedélyezése',soundUnavailable:'A böngésző nem engedélyezte a hangot.',
  clearRead:'Olvasottak törlése',clearAll:'Összes törlése',confirmDelete:'Biztosan törlöd a profil összes értesítését?',confirmCancel:'Mégse',confirmProceed:'Törlés',deleted:'Értesítés törölve',readDeleted:'Olvasott értesítések törölve',allDeleted:'Az összes értesítés törölve',deleteOne:'Értesítés törlése',
  threshold:'Határérték',leadMinutes:'Figyelmeztetés',unitMinutes:'perc',off:'Kikapcsolva',
  testTitle:'SportCentral · próbaértesítés',testMessage:'Ez egy próbaüzenet. A harang pirosan pulzál a megnyitásáig.',
  profileZ:'Zsolt',profileM:'Mónika',unreadSuffix:'olvasatlan',home:'Kezdőlap',ask:'Kérdezd Lénát',back:'Vissza',admin:'Admin',bell:'Értesítések',allRead:'Nincs új jelzés'},
 en:{welcome:'Your notifications',inbox:'Inbox',unread:'Unread',settings:'Settings',recent:'Recent notifications',
  markAll:'Mark all as read',categories:'Categories and rules',instructions:'Expand a module to configure its notifications.',
  test:'Test notifications',testSub:'Create a clearly marked test notification for your selected profile.',testButton:'Send test',
  storage:'v1 preview: preferences and test notifications are stored on this browser only. Live module data, medical alerts and phone push require further integration.',
  subtitle:'Everything important. One intelligent hub.',none:'No notifications yet',noUnread:'All notifications are read',
  empty:'Notifications from connected modules will appear here. Use the test action in Settings to try the flow.',
  unreadEmpty:'There are no unread notifications.',demo:'TEST',local:'Local preference',sensitive:'Secure data source required',
  saved:'Preference saved',markSaved:'Marked as read',testSent:'Test notification created',
  soundTitle:'Notification chime',soundDescription:'A quiet bell for new notifications while SHO is open.',soundPreview:'Preview sound',soundAria:'Enable notification sound',soundUnavailable:'The browser has not allowed audio.',
  clearRead:'Delete read',clearAll:'Delete all',confirmDelete:'Delete all notifications for this profile?',confirmCancel:'Cancel',confirmProceed:'Delete',deleted:'Notification deleted',readDeleted:'Read notifications deleted',allDeleted:'All notifications deleted',deleteOne:'Delete notification',
  threshold:'Threshold',leadMinutes:'Remind before',unitMinutes:'min',off:'Off',
  testTitle:'SportCentral · test notification',testMessage:'This is a test. The bell gently pulses red until opened.',
  profileZ:'Zsolt',profileM:'Mónika',unreadSuffix:'unread',home:'Home',ask:'Ask Léna',back:'Back',admin:'Admin',bell:'Notifications',allRead:'Nothing unread'}
};
const words=()=>I[language()];
const EMOJI={healthhub:'💗',sleep:'🌙',sportcentral:'🏆',smarttrip:'🚆',tasks:'✅',wallet:'🎟️',familyguard:'🛡️'};
let activeTab='inbox',toastTimer=null,pendingDeleteProfile=null;
const activeOpen=new Set(['healthhub','sportcentral']);
function chosenProfile(){return api.profile()}
function notice(message){
 const toast=$('ncToast');toast.textContent=message;toast.hidden=false;
 if(toastTimer)w.clearTimeout(toastTimer);
 toastTimer=w.setTimeout(()=>toast.hidden=true,1900);
}
function updateHeader(){
 const t=words(),p=chosenProfile(),s=api.state(p);
 d.documentElement.setAttribute('data-sh9-golden-profile',p);
 d.documentElement.lang=language();
 $('ncProfileName').textContent=p==='m'?t.profileM:t.profileZ;
 $('ncHeroUnread').textContent=s.unread+' '+t.unreadSuffix;
 $('ncCount').textContent=String(s.unread);
 $('ncWelcome').textContent=t.welcome;
 const tabNames={inbox:t.inbox,unread:t.unread,settings:t.settings};
 for(const [id,key] of [['ncTabInbox','inbox'],['ncTabUnread','unread'],['ncTabSettings','settings']]){
  const b=$(id);b.textContent=tabNames[key];b.classList.toggle('active',activeTab===key);
  b.setAttribute('aria-selected',String(activeTab===key));
 }
 $('ncInboxTitle').textContent=t.recent;
 $('ncMarkAllRead').textContent=t.markAll;
 $('ncMarkAllRead').hidden=s.unread===0;
 $('ncSettingsTitle').textContent=t.categories;
 $('ncSettingsSub').textContent=t.instructions;
 $('ncTestTitle').textContent=t.test;
 $('ncTestDescription').textContent=t.testSub;
 $('ncTestButton').textContent=t.testButton;
 $('ncStorageNote').textContent=t.storage;
 $('ncSoundTitle').textContent=t.soundTitle;
 $('ncSoundDescription').textContent=t.soundDescription;
 $('ncSoundPreview').textContent=t.soundPreview;
 $('ncSoundEnabled').checked=api.soundEnabled(p);
 $('ncSoundEnabled').setAttribute('aria-label',t.soundAria);
 $('ncSoundPreview').disabled=!api.soundEnabled(p);
 $('ncClearRead').textContent=t.clearRead;
 $('ncClearAll').textContent=t.clearAll;
 $('ncConfirmText').textContent=t.confirmDelete;
 $('ncConfirmCancel').textContent=t.confirmCancel;
 $('ncConfirmProceed').textContent=t.confirmProceed;
 const items=api.list(p);
 $('ncClearRead').disabled=!items.some(item=>!!item.readAt);
 $('ncClearAll').disabled=!items.length;
 $('ncInboxTools').hidden=activeTab==='unread';
 const hero=$('.nc-hero')||d.querySelector('.nc-hero');
 const subtitle=hero?.querySelector('p');if(subtitle)subtitle.textContent=t.subtitle;
 for(const [id,label] of [['ncHome',t.home],['ncAsk',t.ask],['ncBack',t.back],['alerts',t.bell],['ncAdmin',t.admin]]){
  const b=$(id);const n=b?.querySelector('span');if(n)n.textContent=label;
 }
 const greeting=d.querySelector('.nc-shell>.nav');
 if(greeting)greeting.setAttribute('aria-label',language()==='en'?'SHO Golden Standard navigation':'SHO Golden Standard navigáció');
}
function timestamp(value){
 try{return new Intl.DateTimeFormat(language()==='en'?'en-GB':'hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}).format(new Date(value))}catch(_){return ''}
}
function renderInbox(){
 const t=words(),p=chosenProfile(),items=api.list(p).filter(x=>activeTab!=='unread'||!x.readAt);
 if(!items.length){
  $('ncInboxList').innerHTML='<div class="nc-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17h12l-2-3V9a4 4 0 0 0-8 0v5zM10 20a2 2 0 0 0 4 0"/></svg><strong>'+esc(activeTab==='unread'?t.noUnread:t.none)+'</strong><p>'+esc(activeTab==='unread'?t.unreadEmpty:t.empty)+'</p></div>';
  return;
 }
 const names=Object.fromEntries(api.modules().map(m=>[m.id,tr(m.name)]));
 $('ncInboxList').innerHTML=items.map(item=>{
  const mod=String(item.type||'').split('.')[0],name=names[mod]||mod;
  return '<div class="nc-item" data-unread="'+String(!item.readAt)+'">'+
   '<button type="button" class="nc-item-open" data-notification-id="'+esc(item.id)+'">'+
   '<span class="nc-item-icon" aria-hidden="true">'+(EMOJI[mod]||'🔔')+'</span>'+
   '<span class="nc-item-copy"><span class="nc-item-head">'+esc(name)+(item.demo?' · '+esc(t.demo):'')+'</span>'+
   '<span class="nc-item-title">'+esc(item.title)+'</span>'+
   '<span class="nc-item-message">'+esc(item.message)+'</span>'+
   '<span class="nc-item-time">'+esc(timestamp(item.createdAt))+'</span></span>'+
   (!item.readAt?'<span class="nc-item-dot" aria-hidden="true"></span>':'')+'</button>'+
   '<button type="button" class="nc-delete-item" data-delete-notification-id="'+esc(item.id)+'" aria-label="'+esc(t.deleteOne)+' · '+esc(item.title)+'" title="'+esc(t.deleteOne)+'">'+
   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6m4-6v6"/></svg></button></div>';
 }).join('');
}
function renderSettings(){
 const t=words(),p=chosenProfile(),all=api.definitions();
 const modules=api.modules();
 $('ncCategories').innerHTML=modules.map(m=>{
  const definitions=all.filter(x=>x.moduleId===m.id),grouped=new Map();
  for(const def of definitions){const group=tr(def.group);if(!grouped.has(group))grouped.set(group,[]);grouped.get(group).push(def)}
  const active=definitions.filter(x=>api.preference(p,x.id)?.enabled).length;
  const groups=Array.from(grouped).map(([label,defs])=>'<div class="nc-subgroup">'+esc(label)+'</div>'+
   defs.map(def=>{
    const pref=api.preference(p,def.id),isSensitive=def.sensitive;
    const fields=def.settings.map(field=>{
     const label=t[field.key]||field.key,value=pref[field.key];
     const control=field.kind==='select'?
      '<select data-rule-setting="'+esc(field.key)+'" data-rule-id="'+esc(def.id)+'" aria-label="'+esc(label+' · '+tr(def.name))+'">'+field.options.map(n=>
       '<option value="'+n+'"'+(n===value?' selected':'')+'>'+n+' '+esc(language()==='en'&&field.key==='leadMinutes'?'min':field.unit)+'</option>').join('')+'</select>':
      '<input type="number" data-rule-setting="'+esc(field.key)+'" data-rule-id="'+esc(def.id)+'" aria-label="'+esc(label+' · '+tr(def.name))+'" value="'+value+'" min="'+field.min+'" max="'+field.max+'" step="1">';
     return '<label class="nc-field">'+esc(label)+control+(field.kind==='number'?' '+esc(field.unit):'')+'</label>';
    }).join('');
    return '<div class="nc-rule"><div class="nc-rule-row"><span class="nc-rule-name">'+esc(tr(def.name))+
     (isSensitive?'<span class="nc-rule-note">🔒 '+esc(t.sensitive)+'</span>':'')+'</span>'+
     '<label class="nc-switch" title="'+esc(tr(def.name))+'"><input type="checkbox" data-rule-toggle="'+esc(def.id)+'"'+(pref.enabled?' checked':'')+' aria-label="'+esc(tr(def.name))+'"><span aria-hidden="true"></span></label></div>'+
     (fields?'<div class="nc-fields">'+fields+'</div>':'')+'</div>';
   }).join('')).join('');
  return '<details class="nc-module" data-module-id="'+esc(m.id)+'"'+(activeOpen.has(m.id)?' open':'')+'>'+
   '<summary><span class="nc-module-icon" aria-hidden="true">'+(EMOJI[m.id]||'🔔')+'</span>'+
   '<span class="nc-module-title">'+esc(tr(m.name))+'</span>'+
   '<span class="nc-module-count">'+active+'/'+definitions.length+'</span><span class="nc-module-chevron">⌄</span></summary>'+
   '<div class="nc-defs">'+groups+'</div></details>';
 }).join('');
}
function render(){
 updateHeader();
 if(pendingDeleteProfile&&pendingDeleteProfile!==chosenProfile())closeDeleteConfirmation();
 $('ncInboxPanel').hidden=activeTab==='settings';
 $('ncSettingsPanel').hidden=activeTab!=='settings';
 if(activeTab==='settings')renderSettings();else renderInbox();
}
function changeTab(tab){
 if(!['inbox','unread','settings'].includes(tab))return;
 closeDeleteConfirmation();
 activeTab=tab;render();
}
function onSettingsChange(event){
 const node=event.target,p=chosenProfile();
 const type=node?.dataset?.ruleToggle||node?.dataset?.ruleId;
 if(!type)return;
 const patch=node.dataset.ruleToggle?{enabled:node.checked}:{[node.dataset.ruleSetting]:node.value};
 if(!api.updatePreference(p,type,patch)){notice(language()==='en'?'Invalid value':'Érvénytelen érték');renderSettings();return}
 const counter=node.closest('.nc-module')?.querySelector('.nc-module-count');
 if(counter){const m=node.closest('[data-module-id]')?.dataset.moduleId;const defs=api.definitions().filter(x=>x.moduleId===m);counter.textContent=defs.filter(x=>api.preference(p,x.id)?.enabled).length+'/'+defs.length}
 notice(words().saved);
}
function onNotificationClick(event){
 const remove=event.target.closest('[data-delete-notification-id]');
 if(remove){
  if(api.removeNotification(chosenProfile(),remove.dataset.deleteNotificationId)){
   render();notice(words().deleted);
  }
  return;
 }
 const btn=event.target.closest('[data-notification-id]');
 if(!btn)return;
 const p=chosenProfile(),entry=api.list(p).find(x=>x.id===btn.dataset.notificationId);
 if(!entry)return;
 api.markRead(p,entry.id);
 if(entry.targetUrl){const destination=api.safeHref(entry.targetUrl);if(destination)w.location.assign(destination)}
 else notice(words().markSaved);
 render();
}
function closeDeleteConfirmation(){
 pendingDeleteProfile=null;
 $('ncConfirmDelete').hidden=true;
}
function showDeleteConfirmation(){
 if(!api.list(chosenProfile()).length)return;
 pendingDeleteProfile=chosenProfile();
 $('ncConfirmDelete').hidden=false;
}
function deleteAllConfirmed(){
 const p=pendingDeleteProfile;
 closeDeleteConfirmation();
 if(!p||p!==chosenProfile())return; // Never cross profile on a late click.
 if(api.clearAll(p)){render();notice(words().allDeleted)}
}
function updateChimePreference(event){
 api.setSoundEnabled(chosenProfile(),!!event.target.checked);
 $('ncSoundPreview').disabled=!event.target.checked;
}
async function previewChime(){
 if(!api.soundEnabled(chosenProfile()))return;
 const played=await w.SHO_NOTIFICATION_SOUND_V2?.preview?.();
 if(!played)notice(words().soundUnavailable);
}
function createTest(){
 const t=words(),p=chosenProfile();
 const item=api.publish({profile:p,type:'sportcentral.match_start',title:t.testTitle,message:t.testMessage,demo:true});
 if(!item){notice(language()==='en'?'Enable SportCentral match alerts first':'Kapcsold be a SportCentral meccsértesítéseit');return}
 activeTab='inbox';render();notice(t.testSent);
}
function init(){
 if(!$('ncCategories'))return;
 api.acknowledge(chosenProfile()); // Opening the center stops attention animation without marking messages read.
 d.querySelectorAll('[data-nc-tab]').forEach(btn=>btn.addEventListener('click',()=>changeTab(btn.dataset.ncTab)));
 $('ncCount').addEventListener('click',()=>changeTab('unread'));
 $('ncMarkAllRead').addEventListener('click',()=>{api.markAllRead(chosenProfile());render()});
 $('ncClearRead').addEventListener('click',()=>{closeDeleteConfirmation();if(api.clearRead(chosenProfile())){render();notice(words().readDeleted)}});
 $('ncClearAll').addEventListener('click',showDeleteConfirmation);
 $('ncConfirmCancel').addEventListener('click',closeDeleteConfirmation);
 $('ncConfirmProceed').addEventListener('click',deleteAllConfirmed);
 $('ncSoundEnabled').addEventListener('change',updateChimePreference);
 $('ncSoundPreview').addEventListener('click',()=>{void previewChime()});
 $('ncTestButton').addEventListener('click',createTest);
 $('ncCategories').addEventListener('change',onSettingsChange);
 $('ncCategories').addEventListener('toggle',e=>{const details=e.target;if(!details.matches?.('[data-module-id]'))return;
  if(details.open)activeOpen.add(details.dataset.moduleId);else activeOpen.delete(details.dataset.moduleId);
 },true);
 $('ncInboxList').addEventListener('click',onNotificationClick);
 $('ncBack').addEventListener('click',()=>{if(w.history.length>1)w.history.back();else w.location.assign('../')});
 $('ncAsk').addEventListener('click',e=>{const shortcut=w.HH_CHATGPT_PROJECT_SHORTCUT_V712;
  if(typeof shortcut?.openProject==='function'){e.preventDefault();shortcut.openProject()}
 });
 $('alerts').addEventListener('click',()=>{api.acknowledge(chosenProfile());render()});
 w.addEventListener('sho:notifications-changed',()=>{updateHeader();if(activeTab!=='settings')renderInbox()});
 w.addEventListener('hh-family-profile-changed',()=>{closeDeleteConfirmation();render()});
 w.addEventListener('sh9:profilechange',()=>{closeDeleteConfirmation();render()});
 w.addEventListener('sh9:languagechange',render);
 w.addEventListener('storage',e=>{if(e.key==='hh-profile'){closeDeleteConfirmation();render()}else if(e.key==='sh9-language-v1')render()});
 w.addEventListener('pageshow',render);
 render();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
