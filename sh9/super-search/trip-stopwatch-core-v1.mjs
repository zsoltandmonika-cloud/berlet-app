/* SHO AI Super Search · Léna handoff stopwatch v1.
 * Pure deterministic timing state. Stops ONLY after cloud record is rendered
 * or explicitly labelled manual JSON fallback is rendered. No fake GPT time.
 */
const SCHEMA="sho.trip-stopwatch/1";
const ID=/^tp-lena-[0-9a-f]{32}$/;
function createStopwatch({clock=()=>performance.now()}={}){
 let s={state:"idle",id:null,profile:null,started:null,cloudAt:null,
  renderedAt:null,finishedAt:null,method:null};
 function read(){
  const at=s.finishedAt??(s.started===null?null:clock());
  const elapsed=at===null?null:Math.max(0,at-s.started);
  return Object.freeze({schema:SCHEMA,state:s.state,id:s.id,profile:s.profile,
   totalMs:elapsed===null?null:Math.round(elapsed),
   cloudObservedMs:s.cloudAt===null?null:Math.round(s.cloudAt-s.started),
   uiRenderMs:s.renderedAt===null||s.cloudAt===null?null:
    Math.round(s.renderedAt-s.cloudAt),method:s.method,
   cloudSaved:s.cloudAt!==null,automated:s.method==="cloud"});
 }
 function start({id,profile}={}){
  if(s.started!==null&&s.finishedAt===null)throw Error("already_running");
  if(!ID.test(id||"")||!["z","m"].includes(profile))throw Error("invalid_request");
  s={state:"searching",id,profile,started:clock(),cloudAt:null,
   renderedAt:null,finishedAt:null,method:null};
  return read();
 }
 function cloudObserved(id){
  if(s.state!=="searching"||s.id!==id)return false;
  s.cloudAt=clock();s.state="cloud_found";return true;
 }
 function displayed({id,method}={}){
  if(s.id!==id||s.finishedAt!==null)return false;
  if(method==="cloud"&&s.state!=="cloud_found")return false;
  if(method==="manual"&&s.state!=="searching")return false;
  if(!["cloud","manual"].includes(method))return false;
  s.renderedAt=clock();s.finishedAt=s.renderedAt;
  s.state=method==="cloud"?"finished_auto":"finished_manual";
  s.method=method;return true;
 }
 function cancel(){
  if(s.started===null||s.finishedAt!==null)return false;
  s.finishedAt=clock();s.state="cancelled";return true;
 }
 function timeout(){
  if(s.started===null||s.finishedAt!==null)return false;
  s.finishedAt=clock();s.state="timed_out";return true;
 }
 return Object.freeze({start,cloudObserved,displayed,cancel,timeout,snapshot:read});
}
function handoffPrompt({existingPrompt,id}={}){
 if(typeof existingPrompt!=="string"||existingPrompt.length<20||
  !ID.test(id||""))return null;
 // Replace rather than append the original cloud-save identifier instruction.
 const phrase="trip_id=egyedi tp-lena-azonosító";
 if(!existingPrompt.includes(phrase))return null;
 const prompt=existingPrompt.replace(phrase,"trip_id="+id+" (ezt az azonosítót pontosan használd)");
 return prompt.length<=2400?prompt:null;
}
export {SCHEMA,createStopwatch,handoffPrompt};
