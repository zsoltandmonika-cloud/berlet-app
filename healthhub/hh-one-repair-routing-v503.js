/* HH One · One-Tap Repair Routing v503.
 * A known issue maps to an EXISTING Admin control. This is navigation only,
 * never silent reauthorization, data removal, sync dispatch, OTA install,
 * permission grants or acknowledgement of success.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_ONE_REPAIR_ROUTING_V503=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const ROUTES=Object.freeze({
  'OPS-CLOUD':{group:'cloud',target:'hhUnifiedCloudVaultCard',label:'Dropbox kapcsolat megnyitása'},
  'OPS-REGISTRY':{group:'devices',target:'hhDeviceRegistry401',label:'Eszközregiszter megnyitása'},
  'OPS-RUNTIME':{group:'data',target:'hhAiImprovement300',label:'Hibanapló és javítási javaslatok'},
  'DEV-PERFORMANCE':{group:'data',target:'hhAiImprovement300',label:'Teljesítménydiagnosztika megnyitása'},
  'DEV-ONE-AGENT':{group:'devices',target:'sh9VersionCenterV1',label:'APK és OTA verzióközpont megnyitása'}
 });
 const PREFIX=Object.freeze({
  'OPS-DEVICE-':{group:'devices',target:'hhDeviceRegistry401',label:'Telefon kijelölésének ellenőrzése'},
  'OPS-CANDIDATE-':{group:'devices',target:'hhDeviceRegistry401',label:'Friss, nem kijelölt telefon ellenőrzése'},
  'OPS-HEARTBEAT-':{group:'devices',target:'hhSyncOrchestrator305',label:'Telefonkapcsolat ellenőrzése'},
  'OPS-COMMAND-':{group:'devices',target:'hhSyncOrchestrator305',label:'Parancsállapot és napló megnyitása'},
  'OPS-WAIT-':{group:'devices',target:'hhSyncOrchestrator305',label:'Függőben lévő kérés megtekintése'}
 });
 function copy(r){return r?{group:r.group,target:r.target,label:r.label}:null}
 function resolve(id){
  if(typeof id!=='string'||id.length>90)return null;
  if(Object.prototype.hasOwnProperty.call(ROUTES,id))return copy(ROUTES[id]);
  for(const pre of Object.keys(PREFIX)){
   if(id===pre+'zsolt'||id===pre+'monika')return copy(PREFIX[pre]);
  }
  // Unknown issue is NEVER guessed into a privileged action.
  return null;
 }
 function primary(connected,registry){
  if(!connected)return resolve('OPS-CLOUD');
  if(!registry||registry.schema!=='healthhub.device_registry/1')return resolve('OPS-REGISTRY');
  return resolve('OPS-REGISTRY');
 }
 return Object.freeze({resolve,primary});
});
