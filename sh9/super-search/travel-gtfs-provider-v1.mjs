/* Smart Trip -> SHO AI Super Search provider v1.
 * Consumes *already computed*, origin-local timetable results only.
 * The existing v1117 verifier stays authoritative. No GTFS access, network
 * requests, profile data reads or ChatGPT submission happens in this adapter.
 */
import {prefilter} from "../smart-travel/smart-trip/hybrid-fast-core-v1117.mjs";
const limitString=(s,n=120)=>String(s??"").replace(/[\u0000-\u001f<>]/g," ").trim().slice(0,n);
function createTripProvider({getExistingResults}={}){
 if(typeof getExistingResults!=="function")throw Error("existing_provider_required");
 return Object.freeze({
  id:"travel_gtfs",domain:"travel",scope:"travel:timetable",
  privacy:"local_private",cacheMs:0,
  async search({query,signal}){
   if(signal?.aborted)return {status:"unavailable"};
   const {from,to,travelDate}=query||{};
   if(!from||!to||!travelDate)return {status:"not_covered"};
   /* The host owns device access, licensed data and running each original engine.
    * Never access another module's IndexedDB or profile scope.
    */
   const providerResults=await getExistingResults({from,to,travelDate,signal});
   if(signal?.aborted)return {status:"unavailable"};
   if(!providerResults)return {status:"not_covered"};
   const result=prefilter({query:{from,to,travelDate},providerResults,
    maxCandidates:5,maxJsonBytes:2400});
   if(result.status!=="ready")return {status:"not_covered"};
   const items=result.candidates.slice(0,5).map((candidate,i)=>({
    id:limitString(candidate.provider+"-"+i+"-"+candidate.departure,100),
    title:limitString(candidate.from+" → "+candidate.to,160),
    summary:limitString(candidate.legs.map(l=>l.line).join(" • "),340),
    category:candidate.provider,
    source:limitString(candidate.source,120),
    sourceUrl:null,
    confidence:"timetable",
    startsAt:candidate.departure,endsAt:candidate.arrival
   }));
   return {status:"ok",items};
  }
 });
}
export {createTripProvider};
