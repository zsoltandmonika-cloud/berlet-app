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
 }
 var link=document.createElement('link');
 link.rel='stylesheet';link.href='./activity-premium-glass-v533.css?v=533.4';
 link.addEventListener('load',function(){
  updateProfile();
  root.setAttribute('data-hh-activity-glass','on');
  root.dataset.hhActivityPremiumBuild='v533';
 },{once:true});
 link.addEventListener('error',function(){
  console.warn('Activity Premium Glass unavailable, retaining native Activity layout.');
 },{once:true});
 document.head.appendChild(link);
 window.addEventListener('healthhub:profile-changed',updateProfile);
 window.addEventListener('storage',function(e){if(e.key==='hh-profile')updateProfile()});
})();
