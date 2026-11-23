/* SHO Media Center: install an isolated UI-only cache.
 * No personal media, including thumbnails or backgrounds, is prefetched or saved.
 */
(function(w){
 'use strict';
 if(!w.isSecureContext||!('serviceWorker' in navigator))return;
 function register(){
  navigator.serviceWorker.register('./ui-shell-sw-v1.js',{scope:'./',updateViaCache:'none'})
   .catch(function(){/* Media Center remains fully functional online. */});
 }
 if(document.readyState==='complete')register();
 else w.addEventListener('load',register,{once:true});
})(window);
