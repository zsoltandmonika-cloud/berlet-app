/* SH9 Golden Standard · global three-control system v918.
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
   task.textContent=w.SH9_I18N_V1?.t?.('tasks.label')||(en?'Tasks':'Feladatok');
   const aria=w.SH9_I18N_V1?.t?.('tasks.aria')||(en?'Open Family Tasks':'Családi feladatok megnyitása');
   task.setAttribute('aria-label',aria);task.title=aria;
  }
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
  // HealthHub contains many page branches in ONE document. Choose the
  // currently visible Hero, not the scrollable BODY (v918 regression).
  const activity=visibleOverlay('hhActivityPage191');
  if(activity)return activity.querySelector('.a191Hero')||activity;
  const sleep=visibleOverlay('hhSleepPage');
  if(sleep)return sleep.querySelector('.hhSleepDoctorHero')||sleep;
  const sub=visibleOverlay('healthSection');
  if(sub)return sub.querySelector('.healthSubHero')||sub;
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
  if(/\/healthhub\/digital-health\/(?:index\.html)?$/.test(currentPath())||
     /\/healthhub\/digital-wellbeing-preview\/(?:index\.html)?$/.test(currentPath()))
    return d.body;
  // Nutrition's hero is a role=img and cannot contain interactive buttons.
  if($('nutritionApprovedHero')||$('profileBtn')||d.querySelector('.app-header')||d.querySelector('.topbar'))
   return d.body;
  for(const selector of heroSelectors){
   const el=d.querySelector(selector);
   if(el&&el!==d.body&&!el.closest?.('[hidden]'))return el;
  }
  return d.body;
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
  if(fixed)d.body.setAttribute('data-sh9-golden-floating','on');
  else d.body.removeAttribute('data-sh9-golden-floating');
  const header=$('sh9HeaderControlsV2'),profileButton=$('sh9LauncherProfileV1');
  if(header&&header.parentNode!==host)host.appendChild(header);
  if(profileButton&&profileButton.parentNode!==host)host.appendChild(profileButton);
  host.setAttribute('data-sh9-golden-profile',profile());
 }
 let pendingAnchor=false;
 function scheduleHealthAnchor(){
  if(!healthShell()||pendingAnchor)return;
  pendingAnchor=true;
  const applyAnchor=()=>{
   pendingAnchor=false;
   if($('sh9LauncherProfileV1'))anchorTo(healthHost());
  };
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(applyAnchor);
  else if(typeof w.setTimeout==='function')w.setTimeout(applyAnchor,0);
  else applyAnchor();
 }
 function observeHealthPages(){
  if(!healthShell()||typeof MutationObserver==='undefined')return;
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
  anchorTo(host);
  w.SH9_GOLDEN_CONTROLS_V1=Object.freeze({version:'919-health-hero-anchor',paint});
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
