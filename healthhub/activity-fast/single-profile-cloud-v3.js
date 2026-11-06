/* Isolated SHO Activity preview: in-memory dedup for the ACTIVE profile only.
 * No writes, no token access, no changes to normal HealthHub startup.
 * A short TTL avoids repeated identical Health Connect / Samsung downloads
 * when Activity and optional wearable cards request the same file.
 */
(function(root){
 'use strict';
 var vault=root.HH_DROPBOX_VAULT;
 if(!vault||typeof vault.downloadJson!=='function'||vault.__activityFastDedupV3)return;
 var original=vault.downloadJson.bind(vault),pending=new Map(),TTL=12000;
 function current(){return root.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
 function owner(path){
  var m=/^\/HealthHub\/profiles\/(monika|zsolt)-(?:health-connect|samsung-health)\.json$/.exec(path);
  if(m)return m[1];
  m=/^\/incoming-(monika|zsolt)\.json$/.exec(path);
  return m?m[1]:null;
 }
 vault.downloadJson=function(path){
  var profile=owner(path);
  if(!profile)return original(path);
  if(profile!==current())
   return Promise.reject(new Error('Az Aktivitás csak az aktív profilját olvashatja.'));
  var at=Date.now(),prior=pending.get(path);
  if(prior&&prior.owner===profile&&(prior.pending||at-prior.at<TTL))return prior.promise;
  var entry={owner:profile,at:at,pending:true,promise:null};
  entry.promise=Promise.resolve().then(function(){return original(path)}).then(function(value){
   entry.pending=false;entry.at=Date.now();return value;
  },function(error){if(pending.get(path)===entry)pending.delete(path);throw error});
  pending.set(path,entry);return entry.promise;
 };
 vault.__activityFastDedupV3=true;
})(window);
