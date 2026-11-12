/* SHO Smart Match v940 · verified BKK FULL route-catalog editor adapter.
 * Read-only 374-entry official static route catalog; separate from the small
 * four-line GTFS TIMETABLE snapshot. No fabricated departure times.
 */
const SOURCE="BKK Zrt., CC BY 4.0";
const PILOT=new Set(["bus:260","tram:17","tram:19","tram:41"]);
const MODE_ICONS=Object.freeze({bus:"🚌",tram:"🚋",trolley:"🚎",metro:"🚇",hev:"🚈",other:"🚍"});
const MODES=["bus","tram","trolley","metro","hev","other"];
const FALLBACK=Object.freeze([
 {id:"260",mode:"bus",name:"",directions:["Harsánylejtő","Óbudai rendelőintézet"]},
 {id:"17",mode:"tram",name:"",directions:[]},
 {id:"19",mode:"tram",name:"",directions:[]},
 {id:"41",mode:"tram",name:"",directions:[]}
].map(entry=>Object.freeze({...entry,key:entry.mode+":"+entry.id})));
function norm(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("hu-HU")}
function keyOf(value){
 const s=String(value||"").trim();
 if(["260","17","19","41"].includes(s))return s==="260"?"bus:260":"tram:"+s;
 if(/^(bus|tram|trolley|metro|hev|other):[A-Za-z0-9-]{1,12}$/.test(s))return s;
 return "";
}
function valueOf(key){const valid=keyOf(key);return PILOT.has(valid)?valid.split(":")[1]:valid}
function idOf(key){return keyOf(key).split(":")[1]||""}
function modeOf(key){return keyOf(key).split(":")[0]||""}
function timetableSupported(key){return PILOT.has(keyOf(key))}
function label(entry){
 const k=keyOf(entry.key||entry.mode+":"+entry.id);
 return (MODE_ICONS[modeOf(k)]||"🚍")+" "+entry.id+
  (timetableSupported(k)?" · ✓ menetrend":" · szerkeszthető");
}
function validateCatalog(doc){
 if(!doc||doc.schemaVersion!==1||doc.source!==SOURCE||
  !Array.isArray(doc.routes)||doc.routes.length<100||doc.routes.length>1000)
  throw Error("invalid_bkk_route_catalog");
 const seen=new Set(),routes=[];
 for(const route of doc.routes){
  const id=String(route?.id||"").trim(),mode=String(route?.mode||"").trim();
  if(!MODES.includes(mode)||!/^[A-Za-z0-9-]{1,12}$/.test(id))continue;
  // Telebusz 960 intentionally excluded from SH9 route recommendations.
  if(id==="960")continue;
  const key=mode+":"+id;
  if(seen.has(key))continue;
  seen.add(key);
  routes.push({key,id,mode,name:String(route.name||"").slice(0,70),
   directions:Array.isArray(route.directions)?route.directions.slice(0,20).map(x=>String(x).slice(0,90)):[]});
 }
 if(routes.length<100||!PILOT.values().every(k=>seen.has(k)))
  throw Error("incomplete_bkk_route_catalog");
 return routes.sort((a,b)=>{
  const aPilot=PILOT.has(a.key),bPilot=PILOT.has(b.key);
  if(aPilot!==bPilot)return aPilot?-1:1;
  return a.id.localeCompare(b.id,"hu-HU",{numeric:true})||
   MODES.indexOf(a.mode)-MODES.indexOf(b.mode);
 });
}
async function loadCatalog(fetcher=fetch){
 const response=await fetcher(new URL("../bkk-catalog-v801.json",import.meta.url).href,{
  cache:"no-store",credentials:"omit"});
 if(!response.ok||Number(response.headers?.get("content-length")||0)>180000)
  throw Error("bkk_route_catalog_unavailable");
 return validateCatalog(await response.json());
}
function allEntries(catalog){return Array.isArray(catalog)&&catalog.length?catalog:FALLBACK}
function coverage({targetKey,feederKeys,type="transfer"}={}){
 const t=keyOf(targetKey);
 const feeder=(Array.isArray(feederKeys)?feederKeys:[]).map(keyOf).filter(Boolean);
 return timetableSupported(t)&&(type==="walk"||(
  feeder.length>0&&feeder.every(timetableSupported)&&!feeder.includes(t)));
}
export {MODE_ICONS,MODES,FALLBACK,PILOT,norm,keyOf,valueOf,idOf,modeOf,label,
 validateCatalog,loadCatalog,allEntries,timetableSupported,coverage};
