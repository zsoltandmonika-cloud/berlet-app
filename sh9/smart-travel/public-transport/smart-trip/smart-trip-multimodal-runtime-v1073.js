/* SH9 Smart Trip native multimodal gateway v1073.
 * OPT-IN only. Paid Google Routes remains OFF until explicit approval, backend
 * cost quota and EEA legal review. No browser API key or unauthenticated proxy.
 * Exactly one network request per user-initiated search; no background polling.
 */
(function(w){
 'use strict';
 const model=w.SH9_SMART_TRIP_MULTIMODAL_V1073;
 const cfg=w.SH9_SMART_TRIP_ROUTING_CONFIG_V1073;
 const vault=w.HH_CENTRAL_VAULT;
 let attempts=0,last=0,pending=false,client=null;
 function endpoint(){
  if(!model||cfg?.enabled!==true||cfg?.billingApproved!==true||cfg?.termsApproved!==true||
     !vault?.enabled||!vault.supabaseUrl||!vault.publishableKey)return null;
  try{
   const base=new URL(vault.supabaseUrl);
   const target=new URL(cfg.endpoint);
   if(base.protocol!=='https:'||target.protocol!=='https:'||
      !/^[a-z0-9-]+\.supabase\.co$/.test(base.hostname)||
      base.origin!==target.origin||
      target.pathname!=='/functions/v1/hh-smart-trip-routes-v1'||
      target.search||target.hash)return null;
   return target.href;
  }catch(_){return null}
 }
 function enabled(){return !!endpoint()}
 function clientForSession(){
  if(client)return client;
  const existing=w.HH_GUARDIAN_LIVE_V785?.getClient?.();
  if(existing){client=existing;return client}
  if(!w.supabase?.createClient)return null;
  client=w.supabase.createClient(vault.supabaseUrl,vault.publishableKey,{
   auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}
  });
  return client;
 }
 async function search(query,points,renderer){
  const url=endpoint();
  if(!url)return {status:'disabled'};
  const request=model.request(query,points);
  if(!request)return {status:'invalid-request'};
  if(pending)return {status:'busy'};
  const limit=Math.min(6,Math.max(1,Number(cfg.maxRequestsPerSession)||1));
  if(attempts>=limit)return {status:'quota'};
  if(Date.now()-last<Math.max(30,Number(cfg.cooldownSeconds)||30)*1000)return {status:'cooldown'};
  const auth=clientForSession();
  if(!auth?.auth?.getSession)return {status:'unauthenticated'};
  let token='';
  try{
   const result=await auth.auth.getSession();
   if(result?.data?.session?.user?.id&&result.data.session.access_token)token=result.data.session.access_token;
  }catch(_){}
  if(!token)return {status:'unauthenticated'};
  attempts++;last=Date.now();pending=true;
  const ctrl=new AbortController(),timeout=w.setTimeout(()=>ctrl.abort(),12000);
  try{
   const response=await w.fetch(url,{
    method:'POST',headers:{
     'Content-Type':'application/json',
     'Authorization':'Bearer '+token,
     'apikey':vault.publishableKey
    },
    body:JSON.stringify({
     from:query.from,to:query.to,mode:query.mode,when:query.when,
     priority:query.priority,
     origin:request.origin,destination:request.destination
    }),
    credentials:'omit',cache:'no-store',redirect:'error',signal:ctrl.signal
   });
   if(!response.ok)return {status:'backend-error',code:response.status};
   const size=Number(response.headers.get('content-length')||0);
   if(size>400000)return {status:'oversize'};
   const buffer=await response.arrayBuffer();
   if(buffer.byteLength>400000)return {status:'oversize'};
   const payload=JSON.parse(new TextDecoder().decode(buffer));
   const data=model.verifiedPackage(payload,query,renderer);
   return data?{status:'ok',data}:{status:'no-verified-route'};
  }catch(_){return {status:'unavailable'}}
  finally{w.clearTimeout(timeout);pending=false}
 }
 w.SH9_SMART_TRIP_MULTIMODAL_RUNTIME_V1073=Object.freeze({enabled,search});
})(window);
