/* SHO Smart Match · temporary exact-departure focus (v1)
 * A verified timetable row may be selected until its scheduled departure
 * + 2 min. Local per-profile UI state; no background work or API calls.
 * Never edits the user's saved route templates / active route preference.
 */
export const FOCUS_GRACE_MS=2*60*1000;
const PREFIX="sh9-smart-match-departure-focus-v1-";
const MAX_AHEAD_MS=48*60*60*1000;
const routePattern=/^[a-zA-Z0-9_-]{1,90}$/;
const formatter=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"});
const clock=new Intl.DateTimeFormat("hu-HU",{timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export const focusClock=ms=>clock.format(new Date(ms));
export function focusDate(ms){
 const v=Object.fromEntries(formatter.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return [v.year,v.month,v.day].join("-");
}
export function canonicalFocusRoute(id){
 return id==="home-citronella-260"?"monika-home-to-office":String(id||"");
}
export function focusKey(profile){
 return PREFIX+(profile==="monika"||profile==="m"?"m":profile==="zsolt"||profile==="z"?"z":"invalid");
}
function validRecord(r,now){
 if(!r||r.v!==1||!routePattern.test(r.routeId||"")||
    !["monika","zsolt"].includes(r.profile)||!["260","other"].includes(r.kind)||
    !Number.isSafeInteger(r.departMs)||!Number.isSafeInteger(r.displayMs)||
    !Number.isSafeInteger(r.selectedAt)||!Number.isSafeInteger(r.expiresAt)||
    !/^\d{4}-\d{2}-\d{2}$/.test(r.serviceDate||""))return false;
 if(r.expiresAt!==r.departMs+FOCUS_GRACE_MS||
    r.expiresAt<=now||r.departMs>now+MAX_AHEAD_MS||
    r.selectedAt>now+60000||r.selectedAt<r.departMs-MAX_AHEAD_MS||
    r.serviceDate!==focusDate(r.departMs))return false;
 if(typeof r.stop!=="string"||r.stop.length>100||
    typeof r.direction!=="string"||!["work","home","other"].includes(r.direction)||
    typeof r.line!=="string"||r.line.length>16||
    (r.leaveMs!==null&&!Number.isSafeInteger(r.leaveMs))||
    (r.tramDepartMs!==null&&!Number.isSafeInteger(r.tramDepartMs))||
    typeof r.tramLine!=="string"||r.tramLine.length>16)return false;
 // No extra user input fields, no GPS, profile-related health information,
 // or approximated service timestamps are accepted as a focus record.
 return true;
}
export function clearDepartureFocus(profile){
 const key=focusKey(profile);
 try{localStorage.removeItem(key);return true}catch(_){return false}
}
export function readDepartureFocus(profile,routeId=null,now=Date.now()){
 const key=focusKey(profile);
 let raw=null;
 try{raw=localStorage.getItem(key)}catch(_){return null}
 if(!raw)return null;
 let record;
 try{record=JSON.parse(raw)}catch(_){clearDepartureFocus(profile);return null}
 if(!validRecord(record,now)||record.profile!==(key.endsWith("-m")?"monika":"zsolt")){
  clearDepartureFocus(profile);return null;
 }
 if(routeId&&record.routeId!==canonicalFocusRoute(routeId))return null;
 return record;
}
export function saveDepartureFocus(profile,input,now=Date.now()){
 const normalized=profile==="monika"||profile==="m"?"monika":profile==="zsolt"||profile==="z"?"zsolt":null;
 if(!normalized)return false;
 const record={
  v:1,profile:normalized,routeId:canonicalFocusRoute(input?.routeId),
  serviceDate:input?.serviceDate,kind:input?.kind,
  departMs:input?.departMs,displayMs:input?.displayMs,selectedAt:now,
  expiresAt:input?.departMs+FOCUS_GRACE_MS,
  leaveMs:Number.isSafeInteger(input?.leaveMs)?input.leaveMs:null,
  stop:input?.stop||"",direction:input?.direction||"other",
  line:input?.line||"",tramLine:input?.tramLine||"",
  tramDepartMs:Number.isSafeInteger(input?.tramDepartMs)?input.tramDepartMs:null
 };
 if(!validRecord(record,now)||record.profile!==normalized)return false;
 try{
  localStorage.setItem(focusKey(normalized),JSON.stringify(record));
  const verified=readDepartureFocus(normalized,record.routeId,now);
  return verified?.departMs===record.departMs&&verified?.routeId===record.routeId;
 }catch(_){return false}
}
