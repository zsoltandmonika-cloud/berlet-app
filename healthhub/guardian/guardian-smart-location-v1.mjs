/* SHO Guardian Smart Location V1 - pure, read-only decision logic.
 * No GPS sensor, remote request, storage, background tracking or account access.
 * Call with already authorized, authenticated, fresh HH One Native GPS fix and
 * existing user-saved home/office favorites. Fail closed when ambiguous.
 */
export const ROUTES=Object.freeze({home:"monika-home-to-office",work:"monika-260"});
export const MAX_AGE_MS=75000,MAX_ACCURACY_M=70,RADIUS_M=250;
function normalized(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function point(p){
 const lat=Number(p?.lat),lng=Number(p?.lng);
 return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180?
  {lat,lng}:null;
}
export function meters(a,b){
 const p=point(a),q=point(b);if(!p||!q)return Infinity;
 const mid=(p.lat+q.lat)*Math.PI/360;
 return Math.hypot((p.lng-q.lng)*111195*Math.cos(mid),(p.lat-q.lat)*111195);
}
export function namedPlaces(slots){
 if(!Array.isArray(slots))return null;
 const active=slots.filter(row=>row?.place&&point(row.place)).map(row=>({
  name:normalized((row.label||"")+" "+(row.place.name||"")),point:point(row.place)
 }));
 // Only unambiguous named places, never assume the currently selected map
 // camera or a family member's position is the user's saved HOME.
 const h=active.filter(x=>/\botthon\b|\btestverhegy\b/.test(x.name));
 const w=active.filter(x=>/\bmunkahely\b|\bbecsi corner\b/.test(x.name));
 if(h.length!==1||w.length!==1||meters(h[0].point,w[0].point)<600)return null;
 return {home:h[0].point,work:w[0].point};
}
export function chooseLocation(fix,slots,now=Date.now()){
 const p=point(fix);
 if(!p||fix?.profile!=="monika"||fix?.source!=="HH One Native GPS"||
  !Number.isFinite(fix?.ts)||fix.ts>now+5000||now-fix.ts>MAX_AGE_MS||
  !Number.isFinite(fix?.accuracy)||fix.accuracy<0||fix.accuracy>MAX_ACCURACY_M)return null;
 const places=namedPlaces(slots);if(!places)return null;
 const dh=meters(p,places.home),dw=meters(p,places.work);
 if(dh<=RADIUS_M&&dw>RADIUS_M+100)return {zone:"home",routeId:ROUTES.home};
 if(dw<=RADIUS_M&&dh>RADIUS_M+100)return {zone:"work",routeId:ROUTES.work};
 return null;
}
