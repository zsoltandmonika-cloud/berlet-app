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
 const nativeIds=['fhProfileSwitch','guardianProfileSwitch','profileBtn','st22Profile','mtProfile','profile','hhProfileStandard652','hhDigitalProfileDock'];
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
 function resolveHost(){
  // Recipe Studio can render a hidden modal Hero: prefer its visible header.
  // Nutrition's decorative role=img must not contain interactive controls.
  if(d.getElementById('nutritionApprovedHero')||d.getElementById('profileBtn'))return d.body;
  for(const selector of heroSelectors){
   const el=d.querySelector(selector);
   if(el&&el!==d.body&&!el.closest?.('[hidden]'))return el;
  }
  // Long dashboards and unmatched category nodes need viewport-fixed controls,
  // not a profile capsule stranded at the very bottom of a scrolling page.
  return d.body;
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
  w.SH9_GOLDEN_CONTROLS_V1=Object.freeze({version:'918-global',paint});
  paint();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
 w.addEventListener?.('sh9:languagechange',paint);
 w.addEventListener?.('hh-family-profile-changed',paint);
 w.addEventListener?.('storage',e=>{if(e.key===KEY||e.key===LANG)paint()});
 w.addEventListener?.('pageshow',paint);
 w.addEventListener?.('focus',paint);
})(window,document);
