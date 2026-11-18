/* HealthHub Activity Premium Glass v533: presentation-only adapter.
   No writes to Health Connect, Dropbox, Samsung, native Activity DOM or data.
   Old appearance: ?hhactivityglass=0
 */
(function(){
 'use strict';
 var p;
 try{p=new URLSearchParams(location.search)}catch(e){}
 if(p&&p.get('hhactivityglass')==='0')return;
 var root=document.documentElement;
 function updateProfile(){
   var isM=false;
   try{isM=localStorage.getItem('hh-profile')==='m'}catch(e){}
   root.setAttribute('data-hh-activity-profile',isM?'m':'z');
   var page=document.getElementById('hhActivityPage191');
   if(page&&page.getAttribute('data-hh-skin')==='lena-premium')
    page.setAttribute('data-hh-profile',isM?'monika':'zsolt');
 }
 // Léna Premium Skin Pack v1: lazy, visual-only enhancement. The existing
 // Activity Glass remains the fallback and hhactivityglass=0 still disables all.
 var lenaDisabled=!!(p&&p.get('hhlenaactivity')==='0');
 var lenaLoading=false,lenaReady=false;
 function enableLena(){
  var page=document.getElementById('hhActivityPage191');
  if(!page)return;
  page.setAttribute('data-hh-skin','lena-premium');
  root.setAttribute('data-hh-activity-lena-premium','on');
  root.setAttribute('data-hh-activity-lena-build','v1');
  updateProfile();
 }
 function loadLena(){
  if(lenaDisabled||root.getAttribute('data-hh-activity-glass')!=='on')return;
  var page=document.getElementById('hhActivityPage191');
  if(!page||!page.classList.contains('on'))return;
  if(lenaReady){enableLena();return}
  if(lenaLoading)return;
  lenaLoading=true;
  // Do not download optional styling when Home or any other module is open.
  var files=[
   './skins/lena-premium-v1.css?v=1',
   './skins/activity-lena-premium-v1.css?v=1'
  ];
  Promise.all(files.map(function(src){
   return new Promise(function(resolve,reject){
    var skin=document.createElement('link');
    skin.rel='stylesheet';skin.href=src;
    skin.addEventListener('load',resolve,{once:true});
    skin.addEventListener('error',function(){reject(new Error('Unable to load '+src))},{once:true});
    document.head.appendChild(skin);
   });
  })).then(function(){lenaReady=true;enableLena()}).catch(function(err){
   console.warn('Léna Premium Activity optional skin unavailable; retaining existing Activity Glass.',err);
  }).finally(function(){lenaLoading=false});
 }
 // The established Activity open hook gives CSS an Activity-only loading gate.
 var nativeOpen=window.hhOpenActivity;
 if(typeof nativeOpen==='function'&&!nativeOpen.__lenaPremiumV1){
  var openWithSkin=function(){
   var result=nativeOpen.apply(this,arguments);
   loadLena();
   return result;
  };
  openWithSkin.__lenaPremiumV1=true;
  window.hhOpenActivity=openWithSkin;
 }
 var link=document.createElement('link');
 link.rel='stylesheet';link.href='./activity-premium-glass-v533.css?v=533.5-hhsp1-activity-loading';
 link.addEventListener('load',function(){
  updateProfile();
  root.setAttribute('data-hh-activity-glass','on');
  root.dataset.hhActivityPremiumBuild='v533';
  loadLena();
 },{once:true});
 link.addEventListener('error',function(){
  console.warn('Activity Premium Glass unavailable, retaining native Activity layout.');
 },{once:true});
 document.head.appendChild(link);
 window.addEventListener('healthhub:profile-changed',updateProfile);
 window.addEventListener('storage',function(e){if(e.key==='hh-profile')updateProfile()});
})();
