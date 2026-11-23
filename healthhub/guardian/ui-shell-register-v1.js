/* Isolated UI-only cache; no personal or streaming content is persisted. */
(function(w){
 'use strict';
 if(!w.isSecureContext||!('serviceWorker' in navigator))return;
 const register=function(){
  navigator.serviceWorker.register('./ui-shell-sw-v1.js',{scope:'./',updateViaCache:'none'})
   .catch(function(){/* Existing online app remains unaffected. */});
 };
 if(document.readyState==='complete')register();
 else w.addEventListener('load',register,{once:true});
})(window);
