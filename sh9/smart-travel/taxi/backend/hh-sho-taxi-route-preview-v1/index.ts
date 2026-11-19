/* SHO Taxi route preview (independent of fare engine and Google).
 * Derives an OpenStreetMap/OSRM display-only route; does not alter the
 * existing Google/OSM fare estimate endpoint, tariffs, auth, or quotas.
 * Authenticated family only; no location persistence, cache or polling.
 */
import {createClient} from "npm:@supabase/supabase-js@2.57.2";
const ORIGIN="https://zsoltandmonika-cloud.github.io";
const env=(name:string)=>Deno.env.get(name)||"";
const cors=(req:Request)=>({
 "Access-Control-Allow-Origin":req.headers.get("origin")===ORIGIN?ORIGIN:"null",
 "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin",
 "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"
});
const json=(req:Request,code:number,obj:unknown)=>Response.json(obj,{status:code,headers:cors(req)});
const valid=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=46&&lat<=49&&lng>=17&&lng<=21;
const bounded=(s:unknown,n:number)=>typeof s==="string"&&s.trim().length>=3&&s.length<=n;
async function authorize(req:Request){
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer ")||auth.length<27||auth.length>8007)return false;
 if(!env("SUPABASE_URL")||!env("SUPABASE_ANON_KEY"))return false;
 const client=createClient(env("SUPABASE_URL"),env("SUPABASE_ANON_KEY"),{
  global:{headers:{Authorization:auth}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const {data,error}=await client.auth.getUser(auth.slice(7));
 if(error||!data?.user||data.user.is_anonymous)return false;
 const {data:rows,error:e}=await client.from("hh_profile_access").select("profile_key").eq("user_id",data.user.id).limit(1);
 return !e&&Array.isArray(rows)&&rows.length>0;
}
async function retrieve(url:string,timeoutMs=11000){
 const ctrl=new AbortController(),clock=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{
  const resp=await fetch(url,{signal:ctrl.signal,headers:{"Accept":"application/json"}});
  if(!resp.ok)throw Error("upstream_"+resp.status);
  if(Number(resp.headers.get("content-length")||0)>300000)throw Error("response_too_large");
  return await resp.json();
 }finally{clearTimeout(clock);}
}
type Point={lat:number,lng:number};
async function point(x:any):Promise<Point>{
 const coords=x?.location;
 if(coords&&valid(Number(coords.lat),Number(coords.lng)))
  return {lat:Number(coords.lat),lng:Number(coords.lng)};
 const q=String(x?.label||x?.address||"").trim().slice(0,130);
 if(!bounded(q,130))throw Error("invalid_address");
 const u=new URL("https://photon.komoot.io/api/");
 u.searchParams.set("q",q);u.searchParams.set("lat","47.506");u.searchParams.set("lon","19.0467");u.searchParams.set("limit","6");
 const data=await retrieve(u.href);
 for(const f of (Array.isArray(data.features)?data.features:[])){
  const c=f?.geometry?.coordinates;
  if(!Array.isArray(c)||c.length!==2)continue;
  const [lng,lat]=c.map(Number);
  if(valid(lat,lng)&&(!f.properties?.countrycode||String(f.properties.countrycode).toUpperCase()==="HU"))
   return {lat,lng};
 }
 throw Error("address_not_found");
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=="POST")return json(req,405,{error:"method_not_allowed"});
 if(req.headers.get("origin")!==ORIGIN)return json(req,403,{error:"origin_denied"});
 if(!req.headers.get("content-type")?.startsWith("application/json"))return json(req,415,{error:"json_required"});
 if(Number(req.headers.get("content-length")||0)>1700)return json(req,413,{error:"payload_too_large"});
 let body:any;
 try{
  const raw=await req.text();
  if(raw.length>1700)throw Error("large");
  body=JSON.parse(raw);
  if(!body||typeof body!=="object"||Array.isArray(body))throw Error("json");
 }catch{return json(req,400,{error:"invalid_json"});}
 if(body.action!=="preview"||!body.from||!body.to||typeof body.from!=="object"||typeof body.to!=="object")
  return json(req,400,{error:"invalid_route"});
 if(!await authorize(req))return json(req,403,{error:"authentication_required"});
 try{
  const [a,b]=await Promise.all([point(body.from),point(body.to)]);
  if(Math.abs(a.lat-b.lat)<.00001&&Math.abs(a.lng-b.lng)<.00001)
   return json(req,400,{error:"same_location"});
  const url="https://router.project-osrm.org/route/v1/driving/"+
   a.lng+","+a.lat+";"+b.lng+","+b.lat+"?overview=simplified&steps=false&geometries=geojson";
  const data=await retrieve(url,13000);
  const route=Array.isArray(data.routes)?data.routes[0]:null;
  const raw=route?.geometry?.coordinates;
  if(data.code!=="Ok"||!Array.isArray(raw)||raw.length<2||!Number.isFinite(Number(route.distance)))
   return json(req,503,{error:"route_not_found"});
  const coords=raw.filter((x:unknown)=>Array.isArray(x)&&x.length===2&&valid(Number(x[1]),Number(x[0])))
   .map((x:number[])=>[Number(x[0]),Number(x[1])]);
  if(coords.length<2)return json(req,503,{error:"route_geometry_unavailable"});
  return json(req,200,{
   source:"OpenStreetMap / OSRM",
   route:{type:"LineString",coordinates:coords},
   distanceKm:Math.round(Number(route.distance)/100)/10,
   notice:"A térképen jelzett közúti útvonal az OpenStreetMap alapján készült; eltérhet a Google útvonalától."
  });
 }catch(e){
  console.warn("SHO Taxi optional route preview unavailable",e instanceof Error?e.message:"unavailable");
  return json(req,503,{error:"preview_unavailable"});
 }
});
