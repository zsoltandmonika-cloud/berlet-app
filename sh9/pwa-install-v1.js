(function(){
  'use strict';
  // SH9 is installed by the user's browser UI. No second browser instance,
  // no forced OAuth flow, and no automatic installation prompt.
  if(!window.isSecureContext||!('serviceWorker' in navigator))return;
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(function(error){
      // A failed optional offline shell does not interrupt live SH9 navigation.
      console.warn('SH9 PWA shell registration unavailable:',error?.name||'unknown');
    });
  },{once:true});
})();
