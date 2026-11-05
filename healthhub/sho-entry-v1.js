/* SHO v27 deep-link bridge: open existing HealthHub Activity/Sleep modules.
 * Loaded ONLY by HealthHub for validated ?sho=activity|sleep requests.
 * No Supabase access, health-data reads, storage writes or synthetic modules.
 */
(function(root, doc){
 'use strict';
 const target=new URLSearchParams(root.location.search).get('sho');
 if(target!=='activity'&&target!=='sleep')return;
 let done=false, tries=0;
 function launch(){
  if(done)return;
  let callback=null;
  if(target==='activity')callback=root.hhOpenActivity;
  else callback=root.hh225OpenSleep||root.hhOpenSleep;
  if(typeof callback==='function'){
   try{
    callback.call(root);
    done=true;
    doc.documentElement.dataset.shoOpened=target;
    return;
   }catch(err){root.console?.warn?.('SHO module route not ready',err?.message||'module');}
  }
  tries++;
  if(tries<48)root.setTimeout(launch,250);
  else{
   // Existing Home remains fully usable rather than showing fake success.
   doc.documentElement.dataset.shoOpened='unavailable';
   root.console?.warn?.('SHO requested module unavailable; HealthHub Home remains active');
  }
 }
 // v1016: The launcher is injected just after live-v191.js.
 // Do not gate Activity on window.load, which waits for unrelated images.
 // Keep bounded retries if a platform-specific wrapper is still initializing.
 launch();
})(window,document);
