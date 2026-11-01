/* SH9 v907 · lightweight shared-profile switch on the launcher.
   Only the existing hh-profile browser preference is changed.
   No GPS, Supabase, medical records, profile identity or API requests. */
(function(w,d){
 'use strict';
 if(w.SH9_LAUNCHER_PROFILE_V1)return;
 w.SH9_LAUNCHER_PROFILE_V1=true;
 const KEY='hh-profile',LANG='sh9-language-v1';
 const id='sh9LauncherProfileV1';
 function code(){try{return w.localStorage?.getItem(KEY)==='m'?'m':'z'}catch(_){return 'z'}}
 function english(){
  try{return w.SH9_I18N_V1?.getLanguage?.()==='en'||(!w.SH9_I18N_V1&&w.localStorage?.getItem(LANG)==='en')}catch(_){return false}
 }
 function paint(){
  const btn=d.getElementById(id);if(!btn)return;
  const active=code(),next=active==='m'?'Zsolt':'Mónika',name=active==='m'?'Mónika':'Zsolt';
  const monogram=d.getElementById('sh9LauncherProfileMarkV1');
  const label=d.getElementById('sh9LauncherProfileNameV1');
  if(monogram)monogram.textContent=active==='m'?'M':'Z';
  if(label)label.textContent=name;
  btn.setAttribute('data-profile',active);
  const accessible=english()?'Switch profile to '+next:'Profilváltás '+next+' profiljára';
  btn.setAttribute('aria-label',accessible);
  btn.title=accessible;
 }
 function switchProfile(){
  const next=code()==='m'?'z':'m';
  try{w.localStorage.setItem(KEY,next)}catch(_){return}
  if(code()!==next)return;
  paint();
  try{w.dispatchEvent(new CustomEvent('hh-family-profile-changed',{detail:{profile:next==='m'?'monika':'zsolt'}}))}catch(_){}
 }
 function install(){
  const btn=d.getElementById(id);if(!btn)return;
  if(!btn.dataset.sh9ProfileBound){btn.dataset.sh9ProfileBound='1';btn.addEventListener('click',switchProfile)}
  paint();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',install,{once:true});else install();
 w.addEventListener?.('sh9:languagechange',paint);
 w.addEventListener?.('storage',e=>{if(e.key===KEY||e.key===LANG)paint()});
 w.addEventListener?.('pageshow',paint);
 w.addEventListener?.('focus',paint);
})(window,document);
