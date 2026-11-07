/* SHO V5 preflight · pure, testable, zero-Google request helper.
 * The sole permitted endpoint is the JWT-protected OFF-mode Edge Function.
 * Browser scripts never access the Google Routes secret or service_role.
 */
const ENDPOINT="/functions/v1/hh-smart-trip-routes-v1";
const EXPECTED_ORIGIN="https://vhsrupphzcjkdrusonzh.supabase.co";
const PREFLIGHT_TIMEOUT_MS=12000;

function endpointFromConfig(cfg) {
  if(!cfg?.enabled||typeof cfg.supabaseUrl!=="string"||
     typeof cfg.publishableKey!=="string"||cfg.publishableKey.length<20)
    return null;
  try {
    const url=new URL(cfg.supabaseUrl);
    if(url.origin!==EXPECTED_ORIGIN||url.pathname!=="/"||url.search||url.hash||
       url.protocol!=="https:")return null;
    return {url:EXPECTED_ORIGIN+ENDPOINT,publishableKey:cfg.publishableKey};
  } catch {return null}
}
function parseCoords(text){
  if(typeof text!=="string")return null;
  const m=/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(text);
  if(!m)return null;
  const lat=Number(m[1]),lng=Number(m[2]);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180
    ?{lat,lng}:null;
}
function makePreflight(query,profile){
  const origin=parseCoords(query?.from),destination=parseCoords(query?.to);
  if(!origin||!destination||
    (origin.lat===destination.lat&&origin.lng===destination.lng))
    throw Error("A próbához két különböző, érvényes koordináta szükséges.");
  if(profile!=="m"&&profile!=="z")
    throw Error("Érvénytelen családi profil.");
  if(typeof query?.when!=="string" || !/^\d{4}-\d\d-\d\dT/.test(query.when) ||
     !Number.isFinite(Date.parse(query.when)) ||
     !/(?:Z|[+-]\d\d:\d\d)$/.test(query.when))
    throw Error("Az indulás dátuma és időzónája hibás.");
  return {mode:"route_preflight",profile,origin,destination,departureTime:query.when};
}
function checkResponse(status,payload){
  if(status===401)return {ok:false,message:"Family Guard belépés szükséges. Jelentkezz be, majd próbáld újra."};
  if(status===403)return {ok:false,message:"A kiválasztott profilhoz nincs jogosultság, vagy az oldal nem engedélyezett."};
  if(status===400)return {ok:false,message:"A dátum, koordináta vagy kérésformátum hibás."};
  if(status===503)return {ok:false,message:"Az előteszt-végpont jelenleg nem elérhető."};
  if(status!==200||!payload||payload.status!=="ready_for_review"||
    payload.mode!=="route_preflight"||payload.request_valid!==true||
    payload.user_authorized!==true||payload.google_enabled!==false||
    payload.google_request!==false||payload.quota_consumed!==0||
    payload.source!=="local_validation")
    return {ok:false,message:"A szerver nem a biztonságos, költségmentes visszaigazolást küldte."};
  return {ok:true,message:"✅ Hitelesítés, profil, dátum és koordináták rendben. Google-hívás: 0, költség: 0."};
}
async function callPreflight(endpoint,session,payload,fetchFn,signal){
  if(!endpoint||!session?.access_token||!session?.user?.id)
    return {ok:false,message:"A Family Guard munkamenet hiányzik. Előbb jelentkezz be."};
  // Explicit endpoint recheck prevents arbitrary destinations after login.
  if(endpoint.url!==EXPECTED_ORIGIN+ENDPOINT)return {ok:false,message:"Érvénytelen tesztvégpont."};
  const result=await fetchFn(endpoint.url,{
    method:"POST",headers:{"Content-Type":"application/json",
      "Authorization":"Bearer "+session.access_token,
      "apikey":endpoint.publishableKey},
    body:JSON.stringify(payload),cache:"no-store",credentials:"omit",
    redirect:"error",signal
  });
  const responseText=await result.text();
  if(responseText.length>3000)return {ok:false,message:"Túlméretes válasz."};
  let body=null;try{body=JSON.parse(responseText)}catch{}
  return checkResponse(result.status,body);
}
export {ENDPOINT,EXPECTED_ORIGIN,PREFLIGHT_TIMEOUT_MS,endpointFromConfig,
  parseCoords,makePreflight,checkResponse,callPreflight};
