/* HealthHub Family Guard GPS Route Registry v1177
 * One stable route per profile, one active native reader per route.
 * Both verified native phones now write to the Outlook HealthHub App Folder.
 * Gmail is retired as a Guardian source; never silently accept its old files.
 * No implicit data-source fallback, GPS capture, device binding or token access.
 */
(function(w){
 'use strict';
 const ROUTES=Object.freeze({
  zsolt:Object.freeze({
   id:'gps.zsolt',profile:'zsolt',
   name:'Zsolt GPS',targetAccount:'outlook',
   activeReadAccount:'outlook',mode:'primary',nativePath:'/HealthHub/guardian/native-live/zsolt.json'
  }),
  monika:Object.freeze({
   id:'gps.monika',profile:'monika',
   name:'Mónika GPS',targetAccount:'outlook',
   activeReadAccount:'outlook',mode:'primary',
   nativePath:'/HealthHub/guardian/native-live/monika.json'
  })
 });
 function forProfile(profile){
  return typeof profile==='string'&&Object.prototype.hasOwnProperty.call(ROUTES,profile)
   ?ROUTES[profile]:null;
 }
 function label(profile){
  const route=forProfile(profile);
  if(!route)return 'Ismeretlen GPS-route';
  return route.name+' · Outlook aktív';
 }
 function assertMatchingFix(profile,fix){
  const route=forProfile(profile);
  return !!(route&&fix&&fix.profile_key===profile&&
   (!fix.route_id||fix.route_id===route.id));
 }
 w.HH_GUARDIAN_GPS_ROUTES_V1177=Object.freeze({
  version:'1177',ROUTES,forProfile,label,assertMatchingFix
 });
})(window);
