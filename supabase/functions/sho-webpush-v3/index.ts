// SHO Web Push v3 isolated test gateway. verify_jwt=true; family access required on EVERY operation.
// Never accepts notification text, private medical data or off-domain delivery URLs from browsers.
import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import webpush from 'npm:web-push@3.6.7';

const SITE='https://zsoltandmonika-cloud.github.io';
const CLIENT_ROOT='/berlet-app/sh9/notification-center/';
const MAX_DEVICE_COUNT=5;
const VAPID_SUBJECT=SITE+'/berlet-app/sh9/';
const CORS={
 'Access-Control-Allow-Origin':SITE,
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
 'Access-Control-Max-Age':'86400',
 'Cache-Control':'no-store',
 'Vary':'Origin'
};
type KeyPair={public_key:string,private_key:string};
type Device={id:string,endpoint:string,p256dh:string,auth_secret:string,last_test_at:string|null};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}})}
function getSecret(){
 const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
 if(modern){try{const keys=JSON.parse(modern);if(typeof keys?.default==='string')return keys.default}catch(_){}}
 return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
}
function validEndpoint(s:unknown){
 if(typeof s!=='string'||s.length<60||s.length>1800)return false;
 try{
  const u=new URL(s);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return false;
  const host=u.hostname.toLowerCase();
  return host==='fcm.googleapis.com'||host==='fcm-xm.googleapis.com'||
    host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||
    host==='web.push.apple.com'||host==='webpush.push.apple.com'||host.endsWith('.push.apple.com')||
    host.endsWith('.notify.windows.com')||host.endsWith('.wns.windows.com');
 }catch(_){return false}
}
function validKey(s:unknown,min:number,max:number){
 return typeof s==='string'&&s.length>=min&&s.length<=max&&/^[A-Za-z0-9_-]+$/.test(s);
}
function validProfile(x:unknown){return x==='zsolt'||x==='monika'}
function parseAdmin(){
 const base=Deno.env.get('SUPABASE_URL')||'',secret=getSecret();
 if(!base||!secret)throw new Error('Server keys are unavailable');
 return createClient(base,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function getKeys(admin:ReturnType<typeof createClient>):Promise<KeyPair>{
 const {data:existing,error:lookupError}=await admin.from('sho_push_vapid_v3')
   .select('public_key,private_key').eq('singleton',1).maybeSingle();
 if(lookupError)throw new Error('Push key store unavailable');
 if(existing)return existing as KeyPair;
 const created=webpush.generateVAPIDKeys();
 const {error:insertError}=await admin.from('sho_push_vapid_v3').insert({
  singleton:1,public_key:created.publicKey,private_key:created.privateKey
 });
 if(insertError&&insertError.code!=='23505')throw new Error('Could not initialize push identity');
 const {data,error}=await admin.from('sho_push_vapid_v3')
   .select('public_key,private_key').eq('singleton',1).single();
 if(error||!data)throw new Error('Push identity lookup failed');
 return data as KeyPair;
}
async function checkProfile(admin:ReturnType<typeof createClient>,userId:string,profile:string){
 const {data,error}=await admin.from('hh_profile_access').select('profile_key')
  .eq('user_id',userId).eq('profile_key',profile).limit(1).maybeSingle();
 if(error)throw new Error('Access verification unavailable');
 return !!data;
}
async function authenticated(admin:ReturnType<typeof createClient>,request:Request){
 const token=(request.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token||token.length<40)return null;
 const {data,error}=await admin.auth.getUser(token);
 return !error&&data?.user&&!data.user.is_anonymous?data.user:null;
}
async function main(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==SITE)return json({error:'forbidden_origin'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const length=Number(req.headers.get('content-length')||0);
 if(length>8192)return json({error:'payload_too_large'},413);
 const admin=parseAdmin();
 const user=await authenticated(admin,req);
 if(!user)return json({error:'authentication_required'},401);
 let input:Record<string,unknown>;
 try{input=await req.json();if(!input||typeof input!=='object'||Array.isArray(input))throw Error('bad')}catch(_){return json({error:'invalid_json'},400)}
 const action=input.action;
 if(!['config','subscribe','status','unsubscribe','test'].includes(String(action)))return json({error:'unknown_action'},400);
 if(!validProfile(input.profile))return json({error:'invalid_profile'},400);
 const profile=input.profile as string;
 if(!await checkProfile(admin,user.id,profile))return json({error:'profile_access_denied'},403);

 if(action==='config'){
  const key=await getKeys(admin);
  return json({ok:true,publicKey:key.public_key});
 }
 if(!validEndpoint(input.endpoint))return json({error:'invalid_endpoint'},400);
 const endpoint=input.endpoint as string;
 const {data:owned,error:lookupError}=await admin.from('sho_push_devices_v3')
  .select('id,user_id,profile_key,enabled,last_test_at').eq('endpoint',endpoint).maybeSingle();
 if(lookupError)throw new Error('Subscription lookup unavailable');
 if(owned&&owned.user_id!==user.id)return json({error:'subscription_owned_by_other_user'},409);
 if(action==='status')return json({ok:true,subscribed:!!owned?.enabled&&owned.profile_key===profile});
 if(action==='unsubscribe'){
  let removed=false;
  if(owned&&owned.profile_key===profile){
   const {error}=await admin.from('sho_push_devices_v3').delete().eq('id',owned.id).eq('user_id',user.id);
   if(error)throw new Error('Unsubscribe failed');
   removed=true;
  }
  return json({ok:true,subscribed:false,removed});
 }
 if(action==='subscribe'){
  const keys=input.keys as Record<string,unknown>|undefined;
  if(!keys||!validKey(keys.p256dh,80,180)||!validKey(keys.auth,16,120))
   return json({error:'invalid_subscription_keys'},400);
  const updates={user_id:user.id,profile_key:profile,endpoint,
   p256dh:keys.p256dh,auth_secret:keys.auth,enabled:true,updated_at:new Date().toISOString()};
  const res=owned?
   await admin.from('sho_push_devices_v3').update(updates).eq('id',owned.id).eq('user_id',user.id):
   await admin.from('sho_push_devices_v3').insert(updates);
  if(res.error)throw new Error('Subscription persistence failed');
  return json({ok:true,subscribed:true});
 }
 const {data:devices,error}=await admin.from('sho_push_devices_v3')
  .select('id,endpoint,p256dh,auth_secret,last_test_at')
  .eq('user_id',user.id).eq('profile_key',profile).eq('enabled',true).limit(MAX_DEVICE_COUNT);
 if(error)throw new Error('Push devices unavailable');
 if(!devices?.some((d:Device)=>d.endpoint===endpoint))return json({error:'current_device_not_subscribed'},403);
 const now=Date.now();
 if(devices.some((d:Device)=>d.last_test_at&&now-Date.parse(d.last_test_at)<60000))
  return json({error:'rate_limited',retryAfterSeconds:60},429);
 const key=await getKeys(admin);
 webpush.setVapidDetails(VAPID_SUBJECT,key.public_key,key.private_key);
 // Always generic. Never display task titles, location, medical measurements or tickets on lock screens.
 const payload=JSON.stringify({kind:'sho-test-v3',title:'SHO · Smart Hub One',
  body:'Próbaértesítés. A háttérben is működő push csatorna tesztje.',
  url:CLIENT_ROOT,tag:'sho-webpush-v3'});
 let delivered=0,failed=0;
 for(const device of devices as Device[]){
  try{
   await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_secret}},payload,{TTL:180});
   delivered++;
  }catch(err){
   failed++;
   const status=Number((err as {statusCode?:unknown})?.statusCode)||0;
   if(status===404||status===410)await admin.from('sho_push_devices_v3').delete().eq('id',device.id);
  }
 }
 if(delivered){
  await admin.from('sho_push_devices_v3').update({last_test_at:new Date(now).toISOString()})
   .eq('user_id',user.id).eq('profile_key',profile).eq('enabled',true);
 }
 return json({ok:delivered>0,delivered,failed},delivered?200:502);
}
Deno.serve(async request=>{
 try{return await main(request)}
 catch(error){console.error('SHO push pilot error:',error instanceof Error?error.message:'unexpected');return json({error:'service_unavailable'},503)}
});
