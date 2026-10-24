/* SH9 Central Version & Device Management · safe, pure read-model.
 * Only explicitly enrolled primary Android phones can be displayed as
 * confirmed devices. Heartbeats are evidence of status at a past time,
 * not proof of current connectivity, OTA install or actual GPS availability.
 */
(function(root,factory){
 'use strict';
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_VERSION_MODEL_V1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ID=/^[A-Za-z0-9-]{1,90}$/;
 const OWNERS=['zsolt','monika'];
 const BUILD_SH9_UNIFIED=27;
 function goodDate(s){const t=Date.parse(typeof s==='string'?s:'');return Number.isFinite(t)?t:null}
 function shapeOta(ota){
  if(!ota||ota.schema!=='healthhub.connect.ota/1'||ota.channel!=='signed-release'||
     ota.applicationId!=='hu.zsoltmonika.healthhubbridge'||
     !Number.isSafeInteger(ota.versionCode)||ota.versionCode<=0||
     !/^\d+\.\d+\.\d+$/.test(ota.version)||
     !Array.isArray(ota.rolloutProfiles)||!ota.rolloutProfiles.every(p=>OWNERS.includes(p))||
     !/^[a-f0-9]{64}$/.test(ota.sha256))return null;
  const expected='https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/healthhub-connect-ota-v'+
      ota.version+'/HealthHub-Connect-v'+ota.version+'-ota.apk';
  if(ota.downloadUrl!==expected)return null;
  return {version:ota.version,versionCode:ota.versionCode,rolloutProfiles:ota.rolloutProfiles.slice()};
 }
 function shapeWeb(web){
  if(!web||web.schema!=='sh9.web.release/1'||!/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(web.version))
   return null;
  return {version:web.version};
 }
 function read(reg,devices,ota,web,now){
  const clock=Number.isFinite(now)?now:Date.now();
  const release=shapeOta(ota);
  const webRelease=shapeWeb(web);
  const r=reg&&reg.schema==='healthhub.device_registry/1'&&reg.activePhones&&
   Array.isArray(reg.archived)?reg:null;
  const data=OWNERS.map(owner=>{
   const wanted=r&&r.activePhones[owner];
   const device=(typeof wanted==='string'&&ID.test(wanted)&&!r.archived.includes(wanted)&&
    Array.isArray(devices))?devices.find(d=>d&&d.deviceId===wanted&&d.deviceType==='android'&&
    d.activeProfile===owner):null;
   if(!device)return {owner,registered:false,connectivity:'not-reported',installed:null,
    sh9:'unknown',ota:'unknown',otaLastCheckedAt:null,lastSeenAt:null,command:'unknown'};
   const code=Number(device.buildCode),validCode=Number.isSafeInteger(code)&&code>0;
   const version=typeof device.build==='string'&&/^\d+\.\d+\.\d+$/.test(device.build)?device.build:null;
   const seen=goodDate(device.lastSeenAt);
   const connectivity=seen!==null&&clock>=seen&&clock-seen<=20*60*1000?'recent':
    seen!==null?'stale':'not-reported';
   let otaStatus='unknown';
   if(release&&validCode)otaStatus=release.versionCode>code?
       (release.rolloutProfiles.includes(owner)?'approved-update':'not-in-rollout'):'up-to-date';
   return {
    owner,registered:true,name:String(device.name||'Android').slice(0,70),
    deviceId:String(device.deviceId).slice(-11),
    connectivity,installed:validCode?{version:version||'ismeretlen',buildCode:code}:null,
    sh9:validCode?(code>=BUILD_SH9_UNIFIED?'unified':'legacy-no-integrated-sh9'):'unknown',
    ota:otaStatus,approvedVersion:release&&otaStatus==='approved-update'?release.version:null,
    otaCandidate:typeof device.otaCandidateVersion==='string'?device.otaCandidateVersion.slice(0,30):null,
    otaLastCheckedAt:goodDate(device.otaLastCheckedAt),
    otaError:typeof device.otaLastError==='string'?device.otaLastError.slice(0,110):null,
    lastSeenAt:seen,command:device.status&&typeof device.status.state==='string'?device.status.state:'unknown',
    canRequestCheck:validCode&&code>=20&&Array.isArray(device.capabilities)&&
       device.capabilities.includes('ota')
   };
  });
  return {devices:data,release,webRelease,hasRegistry:!!r};
 }
 return {read,shapeOta,shapeWeb,BUILD_SH9_UNIFIED};
});
