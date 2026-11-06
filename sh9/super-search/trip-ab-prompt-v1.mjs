/* SHO Smart Trip Alpha A/B: lossless, measurable prompt compaction.
 * Exact static preferences and every TripPack/cloud save instruction remain.
 * Does not assert that GPT-6 has searched, verified, or saved anything.
 */
import {handoffPrompt} from "./trip-stopwatch-core-v1.mjs";
import {buildTripReview} from "./travel-review-handoff-v1.mjs";
const MAX=2400;
const substitutions=Object.freeze([
 ["Léna, tervezz egy jó, ajtótól ajtóig tartó tömegközlekedési utat.","Léna, készíts 1 jó, ajtótól ajtóig tartó tömegközlekedési útvonalat."],
 ["Adj pontosan egy legjobb útvonalat konkrét járatokkal, átszállásokkal és gyaloglással. Alternatív útvonalakat ne keress és ne adj meg.","Csak 1 legjobb útvonalat adj, pontos járatokkal, átszállással és sétával. Alternatívákat ne keress."],
 ["Ellenőrizd az adott nap menetrendjét és az útvonalat érintő ünnepi vagy forgalmi eltéréseket. A bizonytalan időpontokat jelöld becsültnek, adj forráslinket.","Ellenőrizd a napi menetrendet, ünnepi és forgalmi eltéréseket. Jelöld a becslést, és adj forráslinket."],
 ["Mentés után jelezd röviden az eredményt. Ha nincs igazolt felhőmentés, adj letölthető SH9_TripPack.json-t, vagy egyetlen tiszta JSON-kódblokkot.","Mentésről számolj be röviden. Igazolt felhőmentés nélkül adj SH9_TripPack.json fájlt vagy 1 tiszta JSON-blokkot."]
]);
function buildABPrompt({existingPrompt,id,arm="legacy",
 candidateJson=null,authorizedProviders=[],userApprovedExternalSharing=false}={}){
 const exact=handoffPrompt({existingPrompt,id});
 if(!exact)return {status:"invalid_prompt",prompt:null,arm:null,
  candidateStatus:"not_checked",bytes:0,savings:0};
 if(arm!=="legacy"&&arm!=="super")return {status:"invalid_arm",prompt:null,arm:null,
  candidateStatus:"not_checked",bytes:0,savings:0};
 if(arm==="legacy")return {status:"ready",prompt:exact,arm,bytes:exact.length,
  savings:0,candidateStatus:"not_requested",candidatesUsed:0};
 let compact=exact;
 for(const [before,after] of substitutions){
  // Only replace known exact v1076 text; other mandatory lines stay intact.
  if(compact.includes(before))compact=compact.replace(before,after);
 }
 if(compact.length>MAX)return {status:"invalid_prompt",prompt:null,arm,
  bytes:0,savings:0,candidateStatus:"prompt_budget_exceeded"};
 if(!compact.includes("sh9.trip-pack/1")||
  !compact.includes("trip_id="+id)||
  !compact.includes("1. közvetlen Volán, 2. Sajó Expressz, 3. egyéb expresszvonat")||
  !compact.includes("public.hh_my_trip_packs")||
  !compact.includes("Ellenőrizd SELECT-tel")||
  !compact.includes("Más profilt vagy táblát ne módosíts"))
  return {status:"missing_safety_instructions",prompt:null,arm,
   bytes:0,savings:0,candidateStatus:"not_checked"};
 let final=compact,candidatesUsed=0,candidateStatus="no_authorized_share";
 if(candidateJson&&userApprovedExternalSharing&&authorizedProviders.length){
  const verified=buildTripReview({existingPrompt:compact,candidateJson,
   userApprovedExternalSharing,authorizedProviders,limit:MAX});
  if(verified.status==="ready"){
   final=verified.prompt;candidatesUsed=verified.used;candidateStatus="shared_verified_timetable_only";
  }else candidateStatus=verified.reason||verified.status;
 }else if(candidateJson)candidateStatus="local_only_not_shared";
 return {status:"ready",prompt:final,arm,bytes:final.length,
  savings:exact.length-compact.length,candidateStatus,candidatesUsed};
}
export {buildABPrompt};
