/* SH9 Golden Standard · 3 shared controls · pilot v917.
   One language capsule, one Tasks shortcut, one canonical profile switch.
   SH9 launcher reuses v916 nodes; Family Tasks delegates to its native
   permission-aware toggle. No cloud/network/medical-data mutation. */
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
    const api=w.SH9_I18N_V1;
    if(api?.setLanguage)api.setLanguage(code);
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
   const description=en?'Switch profile to '+next:'Profilváltás '+next+' profiljára';
   b.setAttribute('aria-label',description);b.title=description;
  }
  const hero=d.querySelector('[data-sh9-golden-profile]');
  if(hero)hero.setAttribute('data-sh9-golden-profile',current);
  const task=$('sh9TasksGolden');
  if(task){
   const api=w.SH9_I18N_V1;
   task.textContent=api?.t?.('tasks.label')||(en?'Tasks':'Feladatok');
   const aria=api?.t?.('tasks.aria')||(en?'Open Family Tasks':'Családi feladatok megnyitása');
   task.setAttribute('aria-label',aria);
   task.title=aria;
  }
  d.querySelectorAll('#sh9LanguageSwitchV1 [data-sh9-lang]').forEach(el=>{
   const selected=el.getAttribute('data-sh9-lang')===(en?'en':'hu');
   el.setAttribute('aria-pressed',String(selected));
   el.title=el.getAttribute('data-sh9-lang')==='hu'?'Magyar':'Canadian English';
  });
 }
 function toggle(){
  const before=profile();
  // Family Tasks' native handler checks authorization and refreshes its lists.
  const original=$('fhProfileSwitch');
  if(original&&w.FAMILY_TASKS_V880){
   original.click();
   paint();
   return;
  }
  // Do not silently bypass Family Tasks permissions if its controller failed.
  if(original)return;
  const next=before==='m'?'z':'m';
  try{w.localStorage?.setItem(KEY,next)}catch(_){return}
  if(profile()!==next)return;
  paint();
  try{w.dispatchEvent(new CustomEvent('hh-family-profile-changed',{detail:{profile:next==='m'?'monika':'zsolt'}}))}catch(_){}
 }
 function init(){
  if(!d.body)return;
  const hero=d.querySelector('.hero')||d.querySelector('.st-hero')||d.querySelector('.fh-hero');
  if(!hero)return; // Keep legacy controls if a compatible hero is missing.
  const family=!!d.getElementById('fhProfileSwitch');
  if(family&&!w.FAMILY_TASKS_V880)return; // fail-safe: native controls remain visible.
  const launcher=!!d.getElementById('sh9HeaderControlsV2');
  let header=$('sh9HeaderControlsV2');
  if(!header){
   header=add('div','sh9HeaderControlsV2',hero);
   header.className='sh9-hero-left-controls-v2';
  }
  flags(header);
  let task=$('sh9TasksGolden');
  if(!task)task=add('a','sh9TasksGolden',header);
  else if(task.parentNode!==header)header.appendChild(task);
  task.href=HOME;
  let b=$('sh9LauncherProfileV1');
  if(!b){
   b=add('button','sh9LauncherProfileV1',hero);b.type='button';
   const label=add('span','sh9LauncherProfileNameV1',b);
   label.setAttribute('aria-hidden','true');
   const arrow=add('span','sh9LauncherProfileArrowV1',b);
   arrow.setAttribute('aria-hidden','true');arrow.textContent='⇄';
  }
  if(!b.dataset.sh9GoldenBound){
   b.dataset.sh9GoldenBound='1';
   b.addEventListener('click',toggle);
  }
  hero.setAttribute('data-sh9-golden-profile',profile());
  d.body.setAttribute('data-sh9-golden-three','on');
  if(family)d.body.setAttribute('data-sh9-golden-family','on');
  if(!launcher)d.body.setAttribute('data-sh9-golden-pilot','on');
  w.SH9_GOLDEN_CONTROLS_V1=Object.freeze({version:'917-pilot',paint});
  paint();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 w.addEventListener?.('sh9:languagechange',paint);
 w.addEventListener?.('hh-family-profile-changed',paint);
 w.addEventListener?.('storage',e=>{if(e.key===KEY||e.key===LANG)paint()});
 w.addEventListener?.('pageshow',paint);
 w.addEventListener?.('focus',paint);
})(window,document);
