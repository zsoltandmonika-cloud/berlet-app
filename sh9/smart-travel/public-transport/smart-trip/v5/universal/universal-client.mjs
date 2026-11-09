/* SHO V5 Universal Address: NO network/API calls except a user-clicked
 * Google Maps navigation or an explicitly approved browser geolocation request.
 * The Routes API request is built locally but deliberately NOT sent.
 */
import {normalizeUniversalQuery,toGoogleTransitRequest,googleMapsHandoff} from
 "./universal-request.mjs";
const $=id=>document.getElementById(id);
const messages={
 invalid_query:"Érvénytelen keresési kérés.",
 invalid_address:"Adj meg két egyértelmű, legalább 2 karakteres címet vagy érvényes GPS-koordinátát.",
 same_origin_destination:"Az indulási és az érkezési hely nem lehet ugyanaz.",
 invalid_options:"Érvénytelen keresési beállítás.",
 invalid_local_time:"Hibás dátum vagy időpont.",
 nonexistent_dst_time:"Ez az időpont nem létezik a budapesti óraátállítás miatt. Válassz másik időpontot.",
 ambiguous_dst_time:"Ez az időpont kétszer fordul elő az óraátállításkor. Válassz egy egyértelmű időpontot.",
 time_in_past:"A megadott utazási időpont már elmúlt.",
 invalid_clock:"A készülék órája nem értelmezhető."
};
function huWall(date){
 const f=new Intl.DateTimeFormat("en-GB",{
  timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"
 });
 const p=Object.fromEntries(f.formatToParts(date).map(x=>[x.type,x.value]));
 return {date:p.year+"-"+p.month+"-"+p.day,time:p.hour+":"+p.minute};
}
function el(tag,value,parent){
 const n=document.createElement(tag);n.textContent=String(value??"");
 parent.append(n);return n;
}
function invalidate(){
 $("maps").hidden=true;$("result-panel").hidden=true;
 $("feedback").textContent="Az adatok változtak. Az útvonalkérést újra elő kell készíteni.";
}
function currentInput(){
 return {
  from:$("from").value,to:$("to").value,mode:$("mode").value,
  date:$("day").value,time:$("time").value,profile:$("profile").value,
  priority:$("priority").value
 };
}
function adjustMode(){
 const now=$("mode").value==="now";
 $("day").disabled=now;$("time").disabled=now;
}
function prepare(){
 const normalized=normalizeUniversalQuery(currentInput());
 if(normalized.status!=="ok"){
  $("maps").hidden=true;$("result-panel").hidden=true;
  $("feedback").textContent="⚠️ "+(messages[normalized.status]||normalized.status);
  return;
 }
 const query=normalized.query;
 const maps=googleMapsHandoff(query);
 if(!maps){
  $("feedback").textContent="Nem állítható össze a Google Maps hivatkozás.";
  return;
 }
 // No live geocoder yet: the typed address is syntactically accepted, not
 // independently resolved. The Maps page resolves it after explicit click.
 const draft=toGoogleTransitRequest(query);
 const preview=$("preview");preview.replaceChildren();
 el("p","Honnan: "+query.origin.label,preview);
 el("p","Hová: "+query.destination.label,preview);
 el("p","Időpont: "+query.date+" "+query.time+" (Budapest) · "+
   (query.mode==="arrive"?"érkezés":"indulás"),preview);
 el("p","Preferencia: "+$("priority").selectedOptions[0].textContent,preview);
 el("p","Címfeloldás: MÉG NEM TÖRTÉNT. Google Maps oldalon történik.",preview);
 el("p","Google Routes API-kérés előkészíthető: "+(draft?"igen":"nem (API-időkorlát vagy szabály miatt)")+
  " · tényleges API-kérések: 0",preview);
 $("maps").href=maps;$("maps").hidden=false;
 $("result-panel").hidden=false;
 $("feedback").textContent="✅ A címadatok szintaktikailag megfelelőek. "+
  "A Google Mapsben a teljes útvonal külön, egy érintéssel megtekinthető. "+
  "A SHO még nem kapja vissza az eredményt.";
}
$("prepare").addEventListener("click",prepare);
$("swap").addEventListener("click",()=>{
 const old=$("from").value;
 $("from").value=$("to").value;$("to").value=old;invalidate();
});
$("my-location").addEventListener("click",()=>{
 if(!navigator.geolocation){
  $("feedback").textContent="Ezen az eszközön nem támogatott a helymeghatározás.";
  return;
 }
 $("my-location").disabled=true;
 $("feedback").textContent="A böngésző helymeghatározási engedélyét kérem...";
 navigator.geolocation.getCurrentPosition(pos=>{
  $("my-location").disabled=false;
  const a=pos.coords;
  if(!Number.isFinite(a.latitude)||!Number.isFinite(a.longitude)||
   Math.abs(a.latitude)>90||Math.abs(a.longitude)>180){
   $("feedback").textContent="Érvénytelen GPS-koordináta érkezett.";return;
  }
  $("from").value=a.latitude.toFixed(6)+", "+a.longitude.toFixed(6);
  invalidate();
  $("feedback").textContent="📍 Saját helyzet beillesztve. A koordináta "+
   "kizárólag a Google Maps linkre kattintás után kerülhet átadásra.";
 },error=>{
  $("my-location").disabled=false;
  $("feedback").textContent=error?.code===1?
   "A helyhozzáférést nem engedélyezted. A címet kézzel is beírhatod.":
   "A helymeghatározás nem sikerült. A címet kézzel is beírhatod.";
 },{enableHighAccuracy:false,timeout:10000,maximumAge:30000});
});
for(const id of ["from","to","day","time","profile","priority","mode"]){
 $(id).addEventListener(id==="profile"||id==="mode"||id==="priority"?"change":"input",()=>{
  if(id==="profile")document.documentElement.classList.toggle("monika",
   $("profile").value==="m");
  if(id==="mode")adjustMode();
  invalidate();
 });
}
const now=huWall(new Date());
$("day").value=now.date;$("time").value=now.time;
document.documentElement.classList.add("monika");adjustMode();
