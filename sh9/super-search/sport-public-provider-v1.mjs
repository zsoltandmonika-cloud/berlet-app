/* SportCentral -> SHO Super Search public fixture adapter.
 * The host supplies verified PUBLIC programme records only; no web scraping,
 * user tracking, follower lists, ticket purchases or sensitive data reads.
 */
function createSportScheduleProvider({getPublicSchedule,cacheMs=60000}={}){
 if(typeof getPublicSchedule!=="function")throw Error("public_schedule_source_required");
 return Object.freeze({
  id:"sport_schedule",domain:"sport",scope:"sport:schedule",
  privacy:"public",cacheMs,
  // Public day/category only; never cache profile selections or private searches.
  cacheKey:query=>{
   const day=query?.date,category=query?.category||"all";
   return /^\d{4}-\d{2}-\d{2}$/.test(day||"")&&
    /^[a-z0-9_-]{1,30}$/i.test(category)?"day:"+day+":"+category:null;
  },
  async search({query,signal}){
   if(signal?.aborted)return {status:"unavailable"};
   if(!/^\d{4}-\d{2}-\d{2}$/.test(query?.date||""))return {status:"not_covered"};
   const source=await getPublicSchedule({date:query.date,category:query.category||"all",signal});
   if(signal?.aborted)return {status:"unavailable"};
   if(!Array.isArray(source))return {status:"unavailable"};
   const items=source.slice(0,50).filter(x=>
    x&&x.public===true&&x.verified===true&&
    typeof x.id==="string"&&typeof x.title==="string"&&
    typeof x.source==="string"&&Number.isFinite(Date.parse(x.startsAt))
   ).slice(0,12).map(x=>({
    id:x.id,title:x.title,summary:x.summary||"",
    category:String(x.sport||"sport"),source:x.source,
    sourceUrl:x.sourceUrl,confidence:"verified_public",
    startsAt:x.startsAt,endsAt:x.endsAt,validUntil:x.validUntil
   }));
   return {status:items.length?"ok":"no_results",items};
  }
 });
}
export {createSportScheduleProvider};
