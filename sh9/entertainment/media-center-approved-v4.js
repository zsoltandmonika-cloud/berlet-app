/* Approved synthetic UI artwork: local WebP, independent of OneDrive login. */
(function(w,d){
 'use strict';
 var target=d.querySelector('.mc-feature-card');
 if(!target)return;
 var url=new URL('./media-center/assets/sho-media-center-hero-approved-v3.webp',d.baseURI).href;
 var img=new Image();
 img.onload=function(){
  target.style.setProperty('--mc-approved-art','url("'+url.replace(/"/g,'%22')+'")');
  target.classList.add('mc-v4-approved');
 };
 img.src=url;
})(window,document);
