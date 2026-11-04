/* SHO Sport Central v1 · light polling of the verified public schedule feed.
 * Runs only on an open, visible SHO page. This is NOT a background push.
 * No credentials, user data, health data or write requests leave SHO.
 */
(function(w,d){
 'use strict';
 if(w.SHO_RADAR_NOTIFICATION_FEED_V1)return;
 const SOURCE='https://mecsradar.pages.dev/data/sho-schedule-notices.json';
 const PERIOD=5*60*1000,MIN_RETRY=60000,MAX_STALE=72*3600000;
 let started=false,busy=false,lastAttempt=0,interval=null;
 async function check(){
  if(busy||d.visibilityState==='hidden'||
   !w.SHO_NOTIFICATION_CORE_V1||!w.SHO_RADAR_NOTIFICATION_BRIDGE_V1)return 0;
  const now=Date.now();
  if(now-lastAttempt<MIN_RETRY)return 0;
  lastAttempt=now;busy=true;
  try{
   const response=await w.fetch(SOURCE+'?t='+now,{
    mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'
   });
   if(!response.ok)return 0;
   const feed=await response.json();
   const timestamp=Date.parse(feed?.generatedAt||'');
   if(feed?.version!==1||!Array.isArray(feed.events)||
    !Number.isFinite(timestamp)||now-timestamp>MAX_STALE||timestamp>now+60000)
    return 0;
   return w.SHO_RADAR_NOTIFICATION_BRIDGE_V1.accept(feed.events.slice(0,16));
  }catch(_){return 0}
  finally{busy=false}
 }
 function start(){
  if(started)return;
  started=true;
  void check();
  interval=w.setInterval(()=>{void check()},PERIOD);
  w.addEventListener('focus',()=>{void check()});
  d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible')void check()});
 }
 w.SHO_RADAR_NOTIFICATION_FEED_V1=Object.freeze({version:1,start,check,source:SOURCE});
})(window,document);
