(function(){
'use strict';
/* HealthHub Distance Engine v369.
 * Step + profile height are a transparent estimate, not GPS measurement.
 * No mutation of Health Connect, Samsung Health, or medical records.
 */
var DB='healthhub-healthradar-v2',PREFIX='hh-distance-step-calibration-v369-';
function num(x){if(x==null||x==='')return null;var z=Number(x);return Number.isFinite(z)?z:null}
function validHeight(x){var n=num(x);return n!=null&&n>=120&&n<=220?n:null}
function allowedProfile(p){return p==='zsolt'||p==='monika'}
function calibration(p){
 if(!allowedProfile(p))return null;
 try{
  var x=JSON.parse(localStorage.getItem(PREFIX+p)||'null');
  if(!x||x.profile!==p||!Number.isFinite(Number(x.strideCm)))return null;
  var v=Number(x.strideCm);return v>=35&&v<=110?x:null;
 }catch(e){return null}
}
function stride(p,heightCm){
 var h=validHeight(heightCm),c=calibration(p);
 if(!h||!allowedProfile(p))return null;
 // Typical height-based starting approximation; personalize with an actual GPS-measured walk.
 var cm=c?Number(c.strideCm):h*(p==='monika'?0.413:0.415);
 if(cm<h*.23||cm>h*.65)return null;
 return {cm:cm,calibrated:!!c,measuredAt:c&&c.measuredAt||null,heightCm:h};
}
function estimate(p,steps,heightCm){
 var st=num(steps),strideData=stride(p,heightCm);
 if(!strideData||st==null||st<0||st>300000)return null;
 return {km:st*strideData.cm/100000,steps:st,strideCm:strideData.cm,
  heightCm:strideData.heightCm,calibrated:strideData.calibrated,source:'step_height_estimate'};
}
async function height(p){
 if(!allowedProfile(p))return null;
 var fromContext=null;
 try{
  var c=window.hhGetLenaHealthContext289&&window.hhGetLenaHealthContext289(p);
  if(c&&c.profile===p)fromContext=validHeight(c.profileCore&&c.profileCore.heightCm);
 }catch(e){}
 return new Promise(function(resolve){
  try{
   var r=indexedDB.open(DB);
   r.onerror=function(){resolve(fromContext)};
   r.onupgradeneeded=function(){try{r.transaction.abort()}catch(e){};resolve(fromContext)};
   r.onsuccess=function(){
    var d=r.result;
    if(!d.objectStoreNames.contains('profiles')){d.close();resolve(fromContext);return}
    var q=d.transaction('profiles','readonly').objectStore('profiles').getAll();
    q.onsuccess=function(){d.close();var prof=(q.result||[]).find(function(x){return x&&x.profile===p});
     resolve(validHeight(prof&&prof.heightCm)||fromContext)};
    q.onerror=function(){d.close();resolve(fromContext)};
   };
  }catch(e){resolve(fromContext)}
 });
}
function setCalibration(p,h,steps,distanceMeters){
 if(!allowedProfile(p))return {error:'Hibás profil.'};
 var heightCm=validHeight(h),s=num(steps),m=num(distanceMeters);
 if(!heightCm||s==null||m==null||s<150||s>30000||m<100||m>30000)
  return {error:'Legalább 150 lépésből és legalább 100 méter GPS-szel mért sétából kalibrálj.'};
 var strideCm=100*m/s;
 if(strideCm<35||strideCm>110||strideCm<heightCm*.23||strideCm>heightCm*.65)
  return {error:'A mért lépéshossz nem életszerű. Ellenőrizd az adott SÉTA lépésszámát és GPS-távolságát.'};
 try{localStorage.setItem(PREFIX+p,JSON.stringify({profile:p,strideCm:strideCm,
  measuredAt:new Date().toISOString(),method:'gps_measured_walk'}))}
 catch(e){return {error:'A lépéshossz nem menthető a böngészőbe.'}}
 return {strideCm:strideCm,kmPer1000:strideCm/100,calibrated:true};
}
function resetCalibration(p){if(allowedProfile(p))try{localStorage.removeItem(PREFIX+p)}catch(e){}}
window.HH_DISTANCE_ENGINE_V369={height:height,estimate:estimate,stride:stride,
 calibration:calibration,setCalibration:setCalibration,resetCalibration:resetCalibration,version:'369'};
})();