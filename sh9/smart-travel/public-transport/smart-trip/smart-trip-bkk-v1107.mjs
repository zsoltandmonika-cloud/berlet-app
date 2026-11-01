/* SH9 Léna Native BKK v1107, user-initiated scheduled stop-to-stop pilot.
 * BKK Zrt., CC BY 4.0. Never claims live/door-to-door or invents a transfer.
 * Search is read-only. A separate explicit button writes to My Trips with
 * authenticated Supabase Auth + hh_profile_access check + RLS enforcement.
 * No service role key, OpenAI key or paid API.
 */
import {readOfficialSnapshot} from "../../lena-native/bkk/bkk-feed-client-v1106.mjs";
import {find,toTripPack,stopIds} from "../../lena-native/bkk/bkk-gtfs-core-v1105.mjs";

const SOURCE="BKK Zrt., CC BY 4.0";
const SESSION_KEY="hh-guardian-family-auth-v785";
const CLOUD="hh_my_trip_packs";
const MAX_OPTIONS=5;
const MAX_REQUESTS=10;
let fetched=null,loading=null,client=null,issued=0,activeSearch=null;
const clean=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLocaleLowerCase("hu-HU").replace(/[^\p{L}\p{N}]+/gu," ").trim();
function profiles(){try{return window.localStorage.getItem("hh-profile")==="m"?"m":"z"}catch(_){return "z"}}
function config(){
 const cfg=globalThis.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey)return null;
 try{
  const u=new URL(cfg.supabaseUrl);
  if(u.origin!=="https://vhsrupphzcjkdrusonzh.supabase.co"||u.pathname!=="/"||
   u.search||u.hash)return null;
  return cfg;
 }catch(_){return null}
}
function dbClient(){
 if(client)return client;
 const cfg=config();
 if(!cfg||!globalThis.supabase?.createClient)return null;
 client=globalThis.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
  auth:{storageKey:SESSION_KEY,persistSession:true,autoRefreshToken:false,
   detectSessionInUrl:false}
 });
 return client;
}
async function load(){
 if(fetched)return fetched;
 if(loading)return loading;
 loading=readOfficialSnapshot().then(({data,manifest})=>{
  fetched=Object.freeze({data,manifest});return fetched;
 }).catch(e=>{loading=null;throw e});
 return loading;
}
function suggestions(input){
 if(!fetched||typeof input!=="string")return [];
 const wanted=clean(input),stopNames=[...new Set(Object.values(fetched.data.stops).map(s=>s[0]))];
 if(wanted.length<2)return [];
 const prefix=[],rest=[];
 for(const name of stopNames){
  const val=clean(name);
  if(val===wanted||val.startsWith(wanted))prefix.push(name);
  else if(val.includes(wanted))rest.push(name);
 }
 return prefix.concat(rest).slice(0,8).map(name=>({
  name,subtitle:"Hivatalos BKK GTFS-megálló · nem élő adat",
  type:"bkk_megallo"
 }));
}
function validateInput(q,when){
 if(!q||!["depart","arrive","now"].includes(q.mode)||
  typeof q.from!=="string"||typeof q.to!=="string"||
  q.from.length<2||q.to.length<2||clean(q.from)===clean(q.to)||
  !/^\d{4}-\d\d-\d\d$/.test(q.date)||!/^\d\d:\d\d$/.test(q.time)||
  typeof when!=="string"||!Number.isFinite(Date.parse(when)))return false;
 const fmt=new Intl.DateTimeFormat("en-CA",{
  timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"});
 const parts=Object.fromEntries(fmt.formatToParts(new Date(when)).map(x=>[x.type,x.value]));
 return [parts.year,parts.month,parts.day].join("-")===q.date;
}
async function search(query,when){
 if(issued>=MAX_REQUESTS)return {status:"session_limit"};
 if(!validateInput(query,when))return {status:"invalid_query"};
 issued++;
 let feed;
 try{feed=await load()}catch(e){return {status:"feed_unavailable",detail:e?.message||""}}
 if(!stopIds(feed.data.stops,query.from).length||
  !stopIds(feed.data.stops,query.to).length)return {status:"unknown_stop"};
 if(query.date<feed.data.feedStart||query.date>feed.data.feedEnd)
  return {status:"outside_feed"};
 const options=find(feed.data,{...query,when},Date.now()).slice(0,MAX_OPTIONS);
 if(!options.length)return {status:"no_verified_route"};
 const normalizer=globalThis.SH9_SMART_TRIP_PACK_V1078;
 if(!normalizer?.normalize)return {status:"trip_pack_unavailable"};
 const results=[];
 for(const route of options){
  try{
   const item=normalizer.normalize(toTripPack(query,route));
   if(item.segments.length===1&&item.segments[0].line===route.line&&
    item.segments[0].mode===route.mode)results.push(Object.freeze({
     ...route,tripPack:item
    }));
  }catch(_){}
 }
 if(!results.length)return {status:"invalid_trip_pack"};
 activeSearch=Object.freeze({results,profile:profiles(),when,query,
  manifestSha:feed.manifest.sha256});
 return {
  status:"ok",results,source:SOURCE,
  coverage:"stop-to-stop",live:false,
  validatedAt:feed.manifest.validatedAt,
  feedEnd:feed.manifest.feedEnd,
  manifestSha:feed.manifest.sha256
 };
}
function signature(pack){
 return [pack.travelDate,pack.from,pack.to,pack.departure,
  pack.segments.map(s=>[s.mode,s.line,s.from,s.to,s.departure,s.arrival].join(":")).join("|")].join("|");
}
async function save(item,expectedProfile){
 if(!activeSearch||!activeSearch.results.includes(item)||
  activeSearch.profile!==expectedProfile||profiles()!==expectedProfile||
  !["m","z"].includes(expectedProfile))return {status:"profile_changed_or_unverified"};
 if(!fetched||activeSearch.manifestSha!==fetched.manifest.sha256||
  Date.now()-Date.parse(fetched.manifest.validatedAt)>36*3600000)
  return {status:"feed_expired"};
 const normalizer=globalThis.SH9_SMART_TRIP_PACK_V1078;
 if(!normalizer?.normalize)return {status:"trip_pack_unavailable"};
 let verified;
 try{
  const matching=find(fetched.data,{...activeSearch.query,when:activeSearch.when},Date.now());
  const same=matching.find(x=>x.line===item.line&&x.mode===item.mode&&
   x.from===item.from&&x.to===item.to&&x.departure===item.departure&&x.arrival===item.arrival);
  if(!same)return {status:"trip_no_longer_verified"};
  verified=normalizer.normalize(toTripPack(activeSearch.query,same));
  if(signature(verified)!==signature(item.tripPack))return {status:"trip_changed"};
 }catch(_){return {status:"trip_changed"}}
 const db=dbClient();
 if(!db)return {status:"login_required"};
 let user;
 try{
  const ses=await db.auth.getSession();
  const jwt=ses?.data?.session?.access_token;
  if(!jwt||!ses.data.session.user?.id)return {status:"login_required"};
  const verifiedUser=await db.auth.getUser(jwt);
  if(verifiedUser.error||!verifiedUser.data?.user||
   verifiedUser.data.user.id!==ses.data.session.user.id)
   return {status:"login_required"};
  user=verifiedUser.data.user;
 }catch(_){return {status:"login_required"}}
 if(profiles()!==expectedProfile)return {status:"profile_changed_or_unverified"};
 const key=expectedProfile==="m"?"monika":"zsolt";
 const access=await db.from("hh_profile_access").select("profile_key")
  .eq("user_id",user.id).eq("profile_key",key).maybeSingle();
 if(access.error)return {status:"profile_check_failed"};
 if(!access.data)return {status:"access_denied"};
 const existing=await db.from(CLOUD).select("trip_id,trip_data")
  .eq("profile_key",key).limit(80);
 if(existing.error)return {status:"cloud_read_failed"};
 const sameItem=(existing.data||[]).find(r=>{
  try{return signature(normalizer.normalize(r.trip_data))===signature(verified)}
  catch(_){return false}
 });
 let record=sameItem?.trip_data,tripId=sameItem?.trip_id;
 if(!record){
  if(!globalThis.crypto?.randomUUID)return {status:"secure_id_unavailable"};
  tripId="tp-bkk-"+globalThis.crypto.randomUUID().replace(/-/g,"");
  record={...verified,id:tripId,savedAt:Date.now()};
  if(profiles()!==expectedProfile)return {status:"profile_changed_or_unverified"};
  const inserted=await db.from(CLOUD).insert({
   profile_key:key,trip_id:tripId,trip_data:record
  });
  if(inserted.error)return {status:inserted.error.code==="23505"?
   "conflict_retry":"cloud_write_failed"};
  const receipt=await db.from(CLOUD).select("trip_id,trip_data")
   .eq("profile_key",key).eq("trip_id",tripId).maybeSingle();
  if(receipt.error||!receipt.data||!receipt.data.trip_data||
   signature(normalizer.normalize(receipt.data.trip_data))!==signature(verified))
   return {status:"confirmation_failed"};
  record=receipt.data.trip_data;
 }
 if(profiles()!==expectedProfile)return {status:"cloud_saved_local_pending",tripId};
 try{
  const local=normalizer.read(window.localStorage,expectedProfile);
  if(!local.some(x=>x.id===tripId)){
   const normalized=normalizer.normalize(record);
   window.localStorage.setItem("sh9-smart-trip-pack-v1078-"+expectedProfile,
    JSON.stringify([{...normalized,id:tripId,
     savedAt:Number(record.savedAt)||Date.now()},...local].slice(0,normalizer.MAX_SAVED)));
  }
 }catch(_){return {status:"cloud_saved_local_pending",tripId}}
 return {status:"saved",tripId,alreadySaved:!!sameItem};
}
if(typeof window!=="undefined")window.SH9_BKK_SEARCH_V1107=Object.freeze({
 load,suggestions,search,save
});
export {load,suggestions,search,save,validateInput,signature};
