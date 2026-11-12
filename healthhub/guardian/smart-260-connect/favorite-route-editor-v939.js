/* SHO Smart Match · Favorite Route Editor v939
 * Read-only adapter for existing Family Favorites v972 (40 shared slots).
 * No writes to favorite places, no GPS, no BKK calls, no changes to Smart Match
 * until the user explicitly applies a separate route draft.
 */
(function(w,d){
 "use strict";
 if(!w||!d)return;
 const KEY="hh-family-favorite-places-v972",COUNT=40,TABLE="hh_travel_family_places";
 const $=id=>d.getElementById(id);
 const clean=x=>String(x||"").trim();
 let slots=[];
 function valid(row){
  return !!row&&clean(row.name)&&Number.isFinite(Number(row.lat))&&
   Number.isFinite(Number(row.lng))&&Math.abs(Number(row.lat))<=90&&
   Math.abs(Number(row.lng))<=180;
 }
 function local(){
  try{
   const shared=w.HH_TRAVEL_FAVORITES_V972?.getSlots?.()||
    JSON.parse(w.localStorage?.getItem(KEY)||"null");
   if(!Array.isArray(shared))return [];
   return shared.slice(0,COUNT).flatMap((r,i)=>valid(r?.place)?[{
    slot:i,label:clean(r.label)||"Kedvenc "+(i+1),
    name:clean(r.place.name),lat:Number(r.place.lat),lng:Number(r.place.lng)
   }]:[]);
  }catch(_){return []}
 }
 function prefer(field,rows){
  if(!rows.length)return "";
  const key=field==="from"?row=>/^otthon$/i.test(row.label):
   row=>/d[aá]vid/i.test(row.label)&&/anna/i.test(row.label);
  const match=rows.find(key);
  return String(match?.slot??rows[0].slot);
 }
 function notice(message){const el=$("smFavStatusV939");if(el)el.textContent=message}
 function fill(rows,keep=false){
  slots=rows;
  const from=$("smFavFromV939"),to=$("smFavToV939");
  if(!from||!to)return;
  const previousFrom=keep?from.value:null,previousTo=keep?to.value:null;
  from.replaceChildren();to.replaceChildren();
  const counts=new Map();
  for(const r of rows)counts.set(r.label,(counts.get(r.label)||0)+1);
  for(const select of [from,to]){
   for(const place of rows){
    const o=d.createElement("option");o.value=String(place.slot);
    o.textContent=place.label+(counts.get(place.label)>1?" · #"+(place.slot+1):"");
    o.title=place.name;
    select.append(o);
   }
   select.disabled=rows.length===0;
  }
  from.value=rows.some(r=>String(r.slot)===previousFrom)?previousFrom:prefer("from",rows);
  to.value=rows.some(r=>String(r.slot)===previousTo)?previousTo:prefer("to",rows);
  $("smFavUseV939").disabled=rows.length<2;
  $("smFavReverseV939").disabled=rows.length<2;
  if(!rows.length)notice("Nincs elérhető kedvenc ezen az eszközön. Frissítsd a felhőből a közös családi címeket.");
  else notice(rows.length+" mentett családi hely elérhető · csak a címeket választjuk ki, az útvonalat nem módosítjuk.");
 }
 function initial(){fill(local())}
 // Optional one-shot READ-ONLY Supabase REST, only after a user gesture.
 // Uses the existing local Family Guard session and publishable key.
 async function refreshCloud(){
  const cfg=w.HH_CENTRAL_VAULT;
  let session=null;
  try{session=JSON.parse(w.localStorage?.getItem("hh-guardian-family-auth-v785")||"null")}catch(_){}
  const expires=Number(session?.expires_at);
  if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey||
   !session?.access_token||!Number.isFinite(expires)||expires*1000<Date.now()+60000){
   notice("Nincs aktív Family Guard belépés. Nyisd meg a Kedvenc helyek oldalt, majd frissíts itt.");
   return;
  }
  const button=$("smFavReloadV939");
  button.disabled=true;
  notice("☁ Közös kedvencek ellenőrzése…");
  try{
   const url=cfg.supabaseUrl.replace(/\/$/,"")+"/rest/v1/"+TABLE+
    "?select=slot_index,label,place_name,latitude,longitude&order=slot_index.asc&limit=40";
   const response=await w.fetch(url,{
    cache:"no-store",credentials:"omit",
    headers:{apikey:cfg.publishableKey,Authorization:"Bearer "+session.access_token,Accept:"application/json"}
   });
   if(!response.ok)throw Error("read_only_favorites_unavailable");
   const data=await response.json();
   if(!Array.isArray(data)||data.length>COUNT)throw Error("invalid_favorites");
   const rows=data.flatMap(r=>{
    const slot=Number(r?.slot_index);
    const place={name:r?.place_name,lat:r?.latitude,lng:r?.longitude};
    return Number.isInteger(slot)&&slot>=0&&slot<COUNT&&valid(place)?[{
     slot,label:clean(r.label)||"Kedvenc "+(slot+1),
     name:clean(place.name),lat:Number(place.lat),lng:Number(place.lng)
    }]:[];
   }).sort((a,b)=>a.slot-b.slot);
   fill(rows,true);
   if(rows.length)notice("✓ "+rows.length+" közös cím beolvasva (csak olvasás). A mentett címtár változatlan.");
  }catch(_){notice("⚠ A felhős kedvencek most nem olvashatók. A helyi címlista megmaradt.");}
  finally{button.disabled=false}
 }
 function apply(){
  const from=slots.find(p=>String(p.slot)===$("smFavFromV939")?.value);
  const to=slots.find(p=>String(p.slot)===$("smFavToV939")?.value);
  if(!from||!to||from.slot===to.slot){
   notice("Válassz két különböző, mentett családi helyet.");return;
  }
  if(typeof w.CustomEvent!=="function")return;
  w.dispatchEvent(new w.CustomEvent("hh-smart-match-address-draft-v939",{
   detail:{from:{slot:from.slot,label:from.label},to:{slot:to.slot,label:to.label}}
  }));
  notice("✓ "+from.label+" → "+to.label+" előkészítve. Válaszd ki a BKK-járatokat és pontos megállókat, majd mentsd új sablonként. Az eredeti 260-as változatlan.");
 }
 function install(){
  if(!$("smFavFromV939"))return;
  initial();
  $("smFavUseV939")?.addEventListener("click",apply);
  $("smFavReloadV939")?.addEventListener("click",()=>void refreshCloud());
  $("smFavReverseV939")?.addEventListener("click",()=>{
   const from=$("smFavFromV939"),to=$("smFavToV939"),a=from.value;
   from.value=to.value;to.value=a;
  });
  w.addEventListener?.("storage",e=>{if(e.key===KEY)fill(local(),true)});
  w.addEventListener?.("hh-travel-favorites-changed",()=>fill(local(),true));
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",install,{once:true});
 else install();
 w.SHO_SMART_MATCH_FAVORITE_EDITOR_V939=Object.freeze({readLocal:local});
})(typeof window!=="undefined"?window:null,typeof document!=="undefined"?document:null);
