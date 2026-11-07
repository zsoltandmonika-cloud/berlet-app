// SHO Smart Trip V5: isolated, fail-closed Google Routes server integration.
// Deployed in OFF mode; V5 UI not wired. No Google request until quota + EEA review.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ORIGIN = "https://zsoltandmonika-cloud.github.io";
const GOOGLE = "https://routes.googleapis.com/directions/v2:computeRoutes";
const env = (k: string) => Deno.env.get(k) || "";
// Compile-time OFF until quota migration deployed and reviewed, Google Cloud billing,
// service key and EEA content usage approved. Quota must be enforced before fetch.
const ATOMIC_QUOTA_AND_LEGAL_GATE_VERIFIED = false;
const DAILY_CAP = 20, MONTHLY_CAP = 200;
const FIELD_MASK = [
  "routes.duration", "routes.legs.steps.travelMode",
  "routes.legs.steps.staticDuration", "routes.legs.steps.distanceMeters",
  "routes.legs.steps.transitDetails"
].join(",");
const cors = (req: Request) => req.headers.get("Origin") === ORIGIN
  ? { "Access-Control-Allow-Origin": ORIGIN,
      "Access-Control-Allow-Headers": "authorization,apikey,content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS", "Vary": "Origin" } : {};
const json = (req: Request, status: number, body: unknown) =>
  Response.json(body, { status, headers: {
    ...cors(req), "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff" } });
const validCoord = (x: unknown, limit: number) =>
  typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= limit;
function input(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const q = raw as Record<string, unknown>;
  if (q.profile !== "m" && q.profile !== "z") return null;
  const a = q.origin as Record<string, unknown> | undefined;
  const b = q.destination as Record<string, unknown> | undefined;
  if (!a || !b || !validCoord(a.lat,90) || !validCoord(a.lng,180) ||
      !validCoord(b.lat,90) || !validCoord(b.lng,180)) return null;
  const departed = q.departureTime;
  // Explicit UTC offset is mandatory. Bare Budapest local time is ambiguous.
  if (typeof departed !== "string" || departed.length > 40 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(departed)) return null;
  const millis = Date.parse(departed);
  if (!Number.isFinite(millis) || millis < Date.now() - 60000 ||
      millis > Date.now() + 90 * 86400000) return null;
  if (Number(a.lat) === Number(b.lat) && Number(a.lng) === Number(b.lng)) return null;
  return { profile: q.profile as "m"|"z",
    origin: { latitude: a.lat as number, longitude: a.lng as number },
    destination: { latitude: b.lat as number, longitude: b.lng as number },
    departureTime: new Date(millis).toISOString() };
}
async function authenticate(req: Request, profile: "m"|"z") {
  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer [A-Za-z0-9._~+\/=-]{20,8000}$/.test(auth)) return false;
  if (!env("SUPABASE_URL") || !env("SUPABASE_ANON_KEY")) return false;
  const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: {headers: {Authorization: auth}},
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}
  });
  const {data,error} = await client.auth.getUser(auth.slice(7));
  if (error || !data?.user || data.user.is_anonymous) return false;
  const profileKey = profile === "m" ? "monika" : "zsolt";
  const result = await client.from("hh_profile_access").select("profile_key")
    .eq("user_id",data.user.id).eq("profile_key",profileKey).maybeSingle();
  return !result.error && !!result.data;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, {status:204,headers:cors(req)});
  if (req.method !== "POST") return json(req,405,{error:"method_not_allowed"});
  if (req.headers.get("Origin") !== ORIGIN) return json(req,403,{error:"origin_denied"});
  if (!req.headers.get("content-type")?.startsWith("application/json")) return json(req,415,{error:"json_required"});
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > 2500) return json(req,413,{error:"request_too_large"});
  let raw: unknown;
  try { const body = await req.text(); if (body.length > 2500) throw Error("large"); raw = JSON.parse(body); }
  catch { return json(req,400,{error:"invalid_json"}); }
  const query = input(raw);
  if (!query) return json(req,400,{error:"invalid_route_request"});
  if (!await authenticate(req, query.profile)) return json(req,403,{error:"unauthorized_profile"});
  if (!ATOMIC_QUOTA_AND_LEGAL_GATE_VERIFIED ||
      env("HH_SMART_TRIP_V5_APPROVED") !== "true")
    return json(req,503,{error:"provider_not_enabled",fallback:"matrix_v4"});
  // Every attempt reserves BEFORE contacting Google, under a DB transaction lock.
  // A missing/misconfigured RPC, expired service key or exceeded limit fails closed.
  // No refund on provider timeouts: the provider may still have billed the request.
  const adminKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const googleKey = env("HH_SMART_TRIP_GOOGLE_ROUTES_KEY");
  if (!adminKey || googleKey.length < 25)
    return json(req,503,{error:"provider_not_configured",fallback:"matrix_v4"});
  let reservation: {allowed:boolean,daily_used:number,monthly_used:number}|undefined;
  try {
    const admin = createClient(env("SUPABASE_URL"),adminKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
    });
    const {data,error} = await admin.rpc("hh_smart_trip_google_reserve");
    if (error || !Array.isArray(data) || data.length !== 1)
      return json(req,503,{error:"quota_guard_unavailable",fallback:"matrix_v4"});
    reservation = data[0];
    if (!reservation || typeof reservation.allowed !== "boolean" ||
        !Number.isInteger(reservation.daily_used) ||
        !Number.isInteger(reservation.monthly_used) ||
        reservation.daily_used < 0 || reservation.monthly_used < 0 ||
        reservation.daily_used > DAILY_CAP || reservation.monthly_used > MONTHLY_CAP)
      return json(req,503,{error:"quota_guard_invalid",fallback:"matrix_v4"});
    if (!reservation.allowed)
      return json(req,429,{error:"google_quota_exhausted",fallback:"matrix_v4",
        daily_limit:DAILY_CAP,monthly_limit:MONTHLY_CAP});
  } catch {
    return json(req,503,{error:"quota_guard_unavailable",fallback:"matrix_v4"});
  }
  const controller = new AbortController();
  const deadline = setTimeout(()=>controller.abort(),12000);
  try {
    const key = googleKey;
    const result = await fetch(GOOGLE,{method:"POST",signal:controller.signal,
      headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,
        "X-Goog-FieldMask":FIELD_MASK},
      body:JSON.stringify({
        origin:{location:{latLng:query.origin}},
        destination:{location:{latLng:query.destination}},
        travelMode:"TRANSIT",departureTime:query.departureTime,
        computeAlternativeRoutes:true,
        transitPreferences:{routingPreference:"FEWER_TRANSFERS"},
        languageCode:"hu",units:"METRIC"
      })
    });
    if (!result.ok) return json(req,502,{error:"provider_unavailable"});
    if (Number(result.headers.get("content-length") || 0) > 180000)
      return json(req,502,{error:"provider_response_too_large"});
    const body = await result.text();
    if (body.length > 180000) return json(req,502,{error:"provider_response_too_large"});
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed.routes) || parsed.routes.length > 16)
      return json(req,502,{error:"provider_response_invalid"});
    // EEA compliance: caller must keep Google content in a map-free,
    // Google-attributed view. Never pass provider response to an LLM or persist it.
    return json(req,200,{source:"google_routes",presentation:"text_only",
      ai_processing:"disabled",attribution:"Google Maps",routes:parsed.routes.slice(0,4)});
  } catch {return json(req,502,{error:"provider_timeout_or_unavailable"});}
  finally {clearTimeout(deadline);}
});
