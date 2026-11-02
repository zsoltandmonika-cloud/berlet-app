/* SH9 Golden Standard · global unified four-control dock v934.
   Every navigable user-facing leaf page shares ONE visual standard.
   Existing module profile handlers own authorization and refresh. */
(function(w,d){
 'use strict';
 if(w.SH9_GOLDEN_CONTROLS_V1)return;
 const KEY='hh-profile',LANG='sh9-language-v1',HOME='/berlet-app/sh9/family-hub/';
 const $=id=>d.getElementById(id);
 const profile=()=>{try{return w.localStorage?.getItem(KEY)==='m'?'m':'z'}catch(_){return 'z'}};
 const language=()=>{
  try{return w.SH9_I18N_V1?.getLanguage?.()==='en'?'en':w.localStorage?.getItem(LANG)==='en'?'en':'hu'}
  catch(_){return 'hu'}
 };
 const nativeIds=['fhProfileSwitch','guardianProfileSwitch','profileBtn','st22Profile','mtProfile','profile','profileLabel','hhProfileStandard652','hhDigitalProfileDock'];
 function nativeButton(){
  for(const id of nativeIds){
   const element=$(id);
   if(element&&element.tagName==='BUTTON')return element;
  }
  return null;
 }
 function add(tag,id,parent){
  const el=d.createElement(tag);el.id=id;parent.appendChild(el);return el;
 }
 /* v34 · One shared SHO glass dock for every linked top-level and subpage.
    Reuses native profile and language controls. Does not replace module state. */
 const DOCK_ID='sh9UnifiedGlassDockV34',SHO='/berlet-app/sh9/?sho=wallet';
 const DOCK_ICONS=Object.freeze({
  profile:'<circle cx="12" cy="8" r="3.4"/><path d="M5 20v-2.3A5.2 5.2 0 0 1 10.2 12.5h3.6A5.2 5.2 0 0 1 19 17.7V20"/><path d="m18.5 5.5 2 2-2 2m2-2h-5"/>',
  tasks:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m7.5 9 1.5 1.5 2.5-3M13.5 9H17M7.5 15h9"/>',
  wallet:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M15 15h3M6 6V4h12"/>'
 });
 function dockIcon(name){
  return '<svg class="sh9-global-dock-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+DOCK_ICONS[name]+'</svg>';
 }
 function dockCell(dock,part){
  const node=d.createElement('div');
  node.className='sh9-global-dock-cell';
  node.setAttribute('data-sh9-dock-cell',part);
  dock.appendChild(node);
  return node;
 }
 function mountDock(host){
  if(!host||!d.body)return;
  let dock=$(DOCK_ID);
  if(!dock){
   dock=add('div',DOCK_ID,host);
   dock.className='sh9-global-glass-dock';
   dock.setAttribute('role','group');
   dock.setAttribute('aria-label','SHO gyorsvezérlők');
   dockCell(dock,'profile');dockCell(dock,'tasks');dockCell(dock,'wallet');dockCell(dock,'language');
  }
  if(dock.parentNode!==host)host.appendChild(dock);
  const cell=(part)=>dock.querySelector('[data-sh9-dock-cell="'+part+'"]');
  const b=$('sh9LauncherProfileV1'),header=$('sh9HeaderControlsV2'),task=$('sh9TasksGolden');
  const group=$('sh9LanguageSwitchV1');
  if(b){
   if(b.parentNode!==cell('profile'))cell('profile').appendChild(b);
   if(!b.querySelector('.sh9-global-dock-icon'))b.insertAdjacentHTML('afterbegin',dockIcon('profile'));
  }
  if(header&&header.parentNode!==cell('tasks'))cell('tasks').appendChild(header);
  if(task&&header){
   if(task.parentNode!==header)header.appendChild(task);
   if(!task.querySelector('[data-sh9-dock-label]')){
    task.replaceChildren();
    task.insertAdjacentHTML('afterbegin',dockIcon('tasks'));
    const title=d.createElement('span');title.setAttribute('data-sh9-dock-label','tasks');task.appendChild(title);
   }
  }
  let wallet=$('sh9DockWalletV34');
  if(!wallet){
   wallet=add('button','sh9DockWalletV34',cell('wallet'));
   wallet.type='button';
   wallet.insertAdjacentHTML('afterbegin',dockIcon('wallet'));
   const title=d.createElement('span');title.textContent='Wallet';title.className='sh9-global-dock-label';wallet.appendChild(title);
   wallet.addEventListener('click',()=>w.location.assign(SHO));
  }else if(wallet.parentNode!==cell('wallet'))cell('wallet').appendChild(wallet);
  if(group&&group.parentNode!==cell('language'))cell('language').appendChild(group);
  let languageLabel=$('sh9DockLanguageLabelV34');
  if(!languageLabel){
   languageLabel=add('span','sh9DockLanguageLabelV34',cell('language'));
   languageLabel.className='sh9-global-dock-label';
  }else if(languageLabel.parentNode!==cell('language'))cell('language').appendChild(languageLabel);
  d.body.setAttribute('data-sh9-golden-unified','on');
 }
 function flags(header){
  let group=$('sh9LanguageSwitchV1');
  if(group)return group;
  group=add('div','sh9LanguageSwitchV1',header);
  group.className='sh9-language-v1';
  group.setAttribute('role','group');group.setAttribute('aria-label','Language / Nyelv');
  for(const [code,flag] of [['hu','🇭🇺'],['en','🇨🇦']]){
   const b=d.createElement('button');b.type='button';b.textContent=flag;
   b.setAttribute('data-sh9-lang',code);group.appendChild(b);
   b.addEventListener('click',()=>{
    if(w.SH9_I18N_V1?.setLanguage)w.SH9_I18N_V1.setLanguage(code);
    else{
     try{w.localStorage?.setItem(LANG,code)}catch(_){}
     try{w.dispatchEvent(new CustomEvent('sh9:languagechange',{detail:{language:code}}))}catch(_){}
    }
    paint();
   });
  }
  return group;
 }
 function paint(){
  const current=profile(),en=language()==='en';
  const b=$('sh9LauncherProfileV1');
  if(b){
   b.setAttribute('data-profile',current);
   const name=current==='m'?'Mónika':'Zsolt',next=current==='m'?'Zsolt':'Mónika';
   const label=$('sh9LauncherProfileNameV1'),mark=$('sh9LauncherProfileMarkV1');
   if(label)label.textContent=name;
   if(mark)mark.textContent=current==='m'?'M':'Z';
   const text=en?'Switch profile to '+next:'Profilváltás '+next+' profiljára';
   b.setAttribute('aria-label',text);b.title=text;
  }
  const host=d.querySelector('[data-sh9-golden-host]');
  if(host)host.setAttribute('data-sh9-golden-profile',current);
  d.documentElement.setAttribute('data-sh9-golden-profile',current);
  const task=$('sh9TasksGolden');
  if(task){
   const dockLabel=task.querySelector('[data-sh9-dock-label]');
   if(dockLabel)dockLabel.textContent=w.SH9_I18N_V1?.t?.('tasks.label')||(en?'Tasks':'Feladatok');
   else task.textContent=w.SH9_I18N_V1?.t?.('tasks.label')||(en?'Tasks':'Feladatok');
   const aria=w.SH9_I18N_V1?.t?.('tasks.aria')||(en?'Open Family Tasks':'Családi feladatok megnyitása');
   task.setAttribute('aria-label',aria);task.title=aria;
  }
  const dockLanguageLabel=$('sh9DockLanguageLabelV34');
  if(dockLanguageLabel)dockLanguageLabel.textContent=en?'Language':'Nyelv';
  d.querySelectorAll('#sh9LanguageSwitchV1 [data-sh9-lang]').forEach(el=>{
   const c=el.getAttribute('data-sh9-lang'),yes=c===(en?'en':'hu');
   el.setAttribute('aria-pressed',String(yes));
   el.setAttribute('aria-label',c==='hu'?'Magyar':'Canadian English');
   el.title=c==='hu'?'Magyar':'Canadian English';
  });
 }
 function notifyProfile(next){
  try{w.dispatchEvent(new CustomEvent('hh-family-profile-changed',{detail:{profile:next==='m'?'monika':'zsolt'}}))}catch(_){}
  try{w.dispatchEvent(new CustomEvent('sh9:profilechange',{detail:{profile:next}}))}catch(_){}
 }
 function toggle(){
  const native=nativeButton(),before=profile();
  if(native){
   native.click(); // Use the module's real permissions, state and refresh.
   paint();
   w.setTimeout?.(paint,0);
   w.setTimeout?.(paint,120);
   return;
  }
  if(typeof w.hhToggleProfileOneClick==='function'){
   w.hhToggleProfileOneClick();paint();w.setTimeout?.(paint,0);return;
  }
  if(typeof w.setProfile==='function'){
   w.setProfile(before==='m'?'z':'m');paint();w.setTimeout?.(paint,0);return;
  }
  // Lightweight leaf pages that only persist a profile preference.
  const next=before==='m'?'z':'m';
  try{w.localStorage?.setItem(KEY,next)}catch(_){return}
  if(profile()!==next)return;
  const root=d.documentElement;
  if(root.hasAttribute('data-profile'))root.setAttribute('data-profile',next);
  paint();notifyProfile(next);
 }
 const heroSelectors=[
  '.st-hero','.fh-hero','.guardian-hero','.mt-hero','.st22-header',
  '.hero-art','.transport-visual','.bkk-hero',
  '.app-header','.topbar','.hero','#heroH'
 ];
 const currentPath=()=>w.location?.pathname||'';
 const healthShell=()=>/\/healthhub\/(?:index\.html)?$/.test(currentPath());
 function visibleOverlay(id){
  const el=$(id);
  return el&&el.classList?.contains('on')?el:null;
 }
 function healthHost(){
  // The Health screen and the dynamically-created Symptom Diary must receive
  // the same three golden pills as the Home screen, not inherit a stale hero.
  // A visible Sleep overlay outranks the underlying Health/Home page.
  // Re-anchor on render; Sleep replaces its hero during loading and refresh.
  const sleep=visibleOverlay('hhSleepPage');
  if(sleep)return sleep.querySelector('.hhSleepDoctorHero')||sleep;
  const journal=visibleOverlay('hhSymptomJournal307');
  if(journal)return journal.querySelector('.hhSJHero')||journal;
  const health=visibleOverlay('health');
  if(health)return health.querySelector('#heroH')||health.querySelector('.hero')||health;
  // HealthHub contains many page branches in ONE document. Choose the
  // currently visible Hero, not the scrollable BODY (v918 regression).
  const activity=visibleOverlay('hhActivityPage191');
  if(activity)return activity.querySelector('.a191Hero')||activity;
  const sub=visibleOverlay('healthSection');
  if(sub){
   const hero=sub.querySelector('.healthSubHero');
   // v1043 · Leletek/Gyógyszerek Plan B. Same single working dock,
   // placed BELOW the picture inside the Health subpage content flow.
   // All other HealthRadar subpages keep their previously approved Hero host.
   const recordsMeds=w.healthSectionKind==='records'||w.healthSectionKind==='medications';
   let slot=$('hhRecordsMedsGoldenDockSlotV1043');
   if(recordsMeds&&hero){
    if(!slot){
     slot=d.createElement('div');
     slot.id='hhRecordsMedsGoldenDockSlotV1043';
     slot.className='hh-records-meds-dock-slot-v1043';
     slot.setAttribute('aria-label','SHO Glass Dock · Profil, Feladatok, Wallet és Nyelv');
    }
    if(slot.previousElementSibling!==hero)hero.insertAdjacentElement('afterend',slot);
    if(slot.hidden)slot.hidden=false;
    sub.dataset.hhRecordsMedsDockV1043='on';
    return slot;
   }
   delete sub.dataset.hhRecordsMedsDockV1043;
   if(slot&&!slot.hidden)slot.hidden=true;
   return hero||sub;
  }
  const pages=d.querySelectorAll('.page.on');
  const active=pages.length?pages[pages.length-1]:null;
  if(active){
   for(const selector of ['.askHero .askHeroInner','#heroHome','#heroH','#heroT','.hhLiveHero','.hero']){
    const hero=active.querySelector(selector);
    if(hero)return hero;
   }
   return active;
  }
  return $('heroH')||$('heroHome')||d.body;
 }
 function resolveHost(){
  if(healthShell())return healthHost();
  // v540 · Digital Wellbeing Plan B: the approved Hero artwork is unobstructed.
  // Put the full four-zone Golden Dock in the former title/status row,
  // between the artwork and the slogan/clock card, within the same glass plate.
  if(/\/healthhub\/digital-health\/(?:index\.html)?$/.test(currentPath()))
    return d.querySelector('.dw-wellbeing-hero-plate-v538 > #dwWellbeingDockSlotV540')||d.body;
  if(/\/healthhub\/digital-wellbeing-preview\/(?:index\.html)?$/.test(currentPath()))
    return d.body;
  // Nutrition's hero remains role=img. Place interactive Golden controls
  // in its sibling overlay host, never inside the image or at page bottom.
  if($('nutritionGoldenHeroHost'))return $('nutritionGoldenHeroHost');
  if($('nutritionApprovedHero')||$('profileBtn')||d.querySelector('.app-header')||d.querySelector('.topbar'))
   return d.body;
  for(const selector of heroSelectors){
   const el=d.querySelector(selector);
   if(el&&el!==d.body&&!el.closest?.('[hidden]'))return el;
  }
  return d.body;
 }
 /* v935: approved +5px bottom offset (5px upwards) on eight named page types.
    Only presentation; never alters native handlers or the bottom navigation. */
 const LIFT5_ROUTES=[
  /^\/berlet-app\/sh9\/smart-travel\/public-transport\/(?:index\.html)?$/,
  /^\/berlet-app\/sh9\/smart-travel\/public-transport\/(?:bkk|mav|volan)\/(?:index\.html)?$/,
  /^\/berlet-app\/sh9\/smart-travel\/public-transport\/bkk\/grand-concept\/(?:index\.html)?$/,
  /^\/berlet-app\/sh9\/smart-travel\/my-trips\/(?:index\.html)?$/,
  /^\/berlet-app\/healthhub\/nutrition\/(?:index\.html)?$/
 ];
 function lift5For(host){
  if(LIFT5_ROUTES.some(route=>route.test(currentPath())))return true;
  if(!healthShell()||!host)return false;
  // HealthHub Sleep and Activity live in the same document as Home.
  // Check the ACTIVE dock host rather than lifting every HealthHub page.
  if(host.id==='hhSleepPage'||host.id==='hhActivityPage191')return true;
  return !!host.closest?.('#hhSleepPage.on, #hhActivityPage191.on');
 }
 function anchorTo(host){
  if(!host||!d.body)return;
  const previous=d.querySelector('[data-sh9-golden-host="on"]');
  if(previous&&previous!==host){
   previous.removeAttribute('data-sh9-golden-host');
   previous.removeAttribute('data-sh9-golden-profile');
  }
  if(host.getAttribute('data-sh9-golden-host')!=='on')
   host.setAttribute('data-sh9-golden-host','on');
  const fixed=host===d.body;
  if(lift5For(host))d.body.setAttribute('data-sh9-dock-lift5','on');
  else d.body.removeAttribute('data-sh9-dock-lift5');
  // v936: Sleep gets 5px EXTRA lift on top of the existing 5px rule.
  // The active Sleep overlay alone qualifies; Activity stays at 5px.
  const sleepActive=healthShell()&&(
   host.id==='hhSleepPage'||!!host.closest?.('#hhSleepPage.on')
  );
  if(sleepActive)d.body.setAttribute('data-sh9-dock-lift10','on');
  else d.body.removeAttribute('data-sh9-dock-lift10');
  if(fixed)d.body.setAttribute('data-sh9-golden-floating','on');
  else d.body.removeAttribute('data-sh9-golden-floating');
  if(d.body.getAttribute('data-sh9-golden-unified')==='on')mountDock(host);
  else{
   const header=$('sh9HeaderControlsV2'),profileButton=$('sh9LauncherProfileV1');
   if(header&&header.parentNode!==host)host.appendChild(header);
   if(profileButton&&profileButton.parentNode!==host)host.appendChild(profileButton);
  }
  host.setAttribute('data-sh9-golden-profile',profile());
 }
 let pendingAnchor=false;
 function scheduleHealthAnchor(){
  if(!healthShell()||pendingAnchor)return;
  pendingAnchor=true;
  const applyAnchor=()=>{
   pendingAnchor=false;
   // Sleep recreates its hero via innerHTML during loading, rendering and
   // profile changes. Recreate missing controls rather than moving dead nodes.
   if(!$('sh9LauncherProfileV1')||!$('sh9HeaderControlsV2'))init();
   else anchorTo(healthHost());
  };
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(applyAnchor);
  else if(typeof w.setTimeout==='function')w.setTimeout(applyAnchor,0);
  else applyAnchor();
 }
 let healthObserverInstalled=false;
 function observeHealthPages(){
  if(healthObserverInstalled||!healthShell()||typeof MutationObserver==='undefined')return;
  healthObserverInstalled=true;
  const observer=new MutationObserver(changes=>{
   if(changes.some(change=>change.type==='childList'||
      (change.type==='attributes'&&(change.attributeName==='class'||change.attributeName==='hidden'))))
    scheduleHealthAnchor();
  });
  observer.observe(d.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  w.addEventListener?.('healthhub:pagechange',scheduleHealthAnchor);
  w.addEventListener?.('pageshow',scheduleHealthAnchor);
 }
 function init(){
  if(!d.body)return;
  const family=!!$('fhProfileSwitch');
  if(family&&!w.FAMILY_TASKS_V880)return; // Unavailable native controller: legacy switch remains usable.
  const host=resolveHost();
  const launcher=!!$('sh9HeaderControlsV2');
  const floating=host===d.body;
  host.setAttribute('data-sh9-golden-host','on');
  if(floating)d.body.setAttribute('data-sh9-golden-floating','on');
  let header=$('sh9HeaderControlsV2');
  if(!header){header=add('div','sh9HeaderControlsV2',host);header.className='sh9-hero-left-controls-v2'}
  flags(header);
  let task=$('sh9TasksGolden');
  if(!task)task=add('a','sh9TasksGolden',header);
  else if(task.parentNode!==header)header.appendChild(task);
  task.href=HOME;
  let b=$('sh9LauncherProfileV1');
  if(!b){
   b=add('button','sh9LauncherProfileV1',host);b.type='button';
   const name=add('span','sh9LauncherProfileNameV1',b);
   name.setAttribute('aria-hidden','true');
   const arrow=add('span','sh9LauncherProfileArrowV1',b);
   arrow.setAttribute('aria-hidden','true');arrow.textContent='⇄';
  }
  if(!b.dataset.sh9GoldenBound){
   b.dataset.sh9GoldenBound='1';
   b.addEventListener('click',toggle);
  }
  d.body.setAttribute('data-sh9-golden-three','on');
  if(family)d.body.setAttribute('data-sh9-golden-family','on');
  if(nativeButton()||typeof w.hhToggleProfileOneClick==='function'||typeof w.setProfile==='function')
   d.body.setAttribute('data-sh9-golden-native','on');
  if(!launcher)d.body.setAttribute('data-sh9-golden-pilot','on');
  mountDock(host);
  anchorTo(host);
  w.SH9_GOLDEN_CONTROLS_V1=Object.freeze({version:'934-unified-glass-dock',paint});
  paint();
  if(healthShell())observeHealthPages();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
 w.addEventListener?.('sh9:languagechange',paint);
 w.addEventListener?.('hh-family-profile-changed',paint);
 w.addEventListener?.('storage',e=>{if(e.key===KEY||e.key===LANG)paint()});
 w.addEventListener?.('pageshow',paint);
 w.addEventListener?.('focus',paint);
})(window,document);
