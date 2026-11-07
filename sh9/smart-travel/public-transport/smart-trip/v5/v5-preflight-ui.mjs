/* SHO V5 · explicit user-click preflight, never a Google Routes call.
 * No service-role or Google API key in client. No persistence, no My Trips.
 */
import {getQuery} from "./v5-live-pilot.mjs";
import {PREFLIGHT_TIMEOUT_MS,endpointFromConfig,makePreflight,
  callPreflight} from "./v5-preflight-core.mjs";

const button=document.getElementById("preflight");
const output=document.getElementById("preflightStatus");
let client=null,requests=0,lastAttempt=0,running=false;
const say=message=>{output.textContent=message};

function authClient(){
  const cfg=globalThis.HH_CENTRAL_VAULT;
  const destination=endpointFromConfig(cfg);
  if(!destination||!globalThis.supabase?.createClient)return null;
  if(!client)client=globalThis.supabase.createClient(cfg.supabaseUrl,
    destination.publishableKey,{
      auth:{storageKey:"hh-guardian-family-auth-v785",
        persistSession:true,autoRefreshToken:false,
        detectSessionInUrl:false}
    });
  return {client,destination};
}
async function run(){
  if(running)return;
  if(requests>=3){say("Egy munkamenetben legfeljebb három előteszt indítható.");return}
  if(Date.now()-lastAttempt<15000){say("A következő próbáig legalább 15 másodperc szünet szükséges.");return}
  running=true;button.disabled=true;button.setAttribute("aria-busy","true");
  let controller=null;
  try{
    const query=getQuery();
    const profile=document.getElementById("profile")?.value;
    const body=makePreflight(query,profile);
    const auth=authClient();
    if(!auth)throw Error("A Supabase-bejelentkezés nem elérhető ezen a tesztoldalon.");
    const {data,error}=await auth.client.auth.getSession();
    if(error||!data?.session?.user?.id||!data.session.access_token)
      throw Error("Előbb jelentkezz be a Family Guardba ezen a böngészőn.");
    requests++;lastAttempt=Date.now();
    controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),PREFLIGHT_TIMEOUT_MS);
    try{
      say("🔐 Csak bejelentkezés, jogosultság, időpont és koordináták ellenőrzése...");
      const start=performance.now();
      const answer=await callPreflight(auth.destination,data.session,body,
        globalThis.fetch.bind(globalThis),controller.signal);
      const elapsed=((performance.now()-start)/1000).toFixed(2).replace(".",",");
      say(answer.message+" Ellenőrzési válaszidő: "+elapsed+" mp. Ez nem Google-keresési idő.");
    } finally{clearTimeout(timeout)}
  }catch(e){
    say(e?.name==="AbortError"?"Az előteszt 12 másodperc után megszakadt.":
      "⚠️ "+(e?.message||"Az előteszt nem sikerült."));
  }finally{
    running=false;button.disabled=false;button.removeAttribute("aria-busy");
  }
}
button?.addEventListener("click",run);
