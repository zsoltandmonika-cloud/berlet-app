/* Smart Delay v1: GTFS-RT seconds: positive=late, negative=early.
 * UI: red −4p late, amber +2p early, green 0p ONLY for exact zero.
 * No verified fresh value => no label, never treat missing data as punctual. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.HH_BKK_SMART_DELAY_V1=Object.freeze(api);})(typeof window!=="undefined"?window:null,function(){
"use strict";
const MAX_AGE_MS=90000;
const normalizeStop=x=>typeof x==="string"?x.replace(/^BKK_/,""):"";
function classify(seconds,observedAt,now=Date.now()){
 const at=Date.parse(observedAt||"");
 if(!Number.isInteger(seconds)||seconds< -1800||seconds>7200||!Number.isFinite(at)||at>now+10000||now-at>MAX_AGE_MS)return{status:"unknown",text:"",description:"Nincs ellenőrzött élő eltérés"};
 if(seconds===0)return{status:"ontime",text:"0p",description:"Pontos, ellenőrzött menetrendi idő"};
 const n=Math.ceil(Math.abs(seconds)/60);
 return seconds>0?{status:"late",text:"−"+n+"p",description:n+" perc késés"}:{status:"early",text:"+"+n+"p",description:n+" perccel korábban"};
}
function matchStopPrediction(predictions,routeKey,stopId,scheduledMs,now=Date.now()){
 if(!Array.isArray(predictions)||typeof routeKey!=="string"||!normalizeStop(stopId)||!Number.isFinite(scheduledMs))return null;
 const matches=predictions.filter(p=>p&&p.routeKey===routeKey&&normalizeStop(p.stopId)===normalizeStop(stopId)&&Number.isFinite(p.scheduledMs)&&Math.abs(p.scheduledMs-scheduledMs)<=30000&&Number.isFinite(p.predictedMs)&&classify(p.delaySeconds,p.asOf,now).status!=="unknown");
 return matches.length===1?matches[0]:null;
}
return{classify,matchStopPrediction,normalizeStop,MAX_AGE_MS};
});