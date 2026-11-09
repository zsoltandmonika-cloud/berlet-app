'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const code=fs.readFileSync(path.join(root,'sh9/notification-center/notification-push-v3.js'),'utf8');
class Field{
 constructor(id){this.id=id;this.textContent='';this.disabled=false;this.hidden=false;this.listeners={}}
 addEventListener(n,fn){this.listeners[n]=fn}
 click(){this.listeners.click?.()}
}
function boot({phase='permission',permission='granted',serverError=null}={}){
 const ids=['ncPushTitle','ncPushDescription','ncPushCheck','ncPushEnable','ncPushDisable','ncPushTest','ncPushStatus','ncSettingsPanel'];
 const nodes=Object.fromEntries(ids.map(id=>[id,new Field(id)]));nodes.ncSettingsPanel.hidden=true;
 let calls=0;
 let pendingRegistration=null;
 const sub={endpoint:'https://fcm.googleapis.com/something/valid-endpoint-long-enough-to-be-a-real-fake',toJSON:()=>({keys:{p256dh:'x'.repeat(88),auth:'y'.repeat(22)}})};
 const registration={pushManager:{getSubscription:async()=>null,subscribe:async()=>{if(phase==='subscribe')throw Error('push failed');return sub}}};
 const local={getItem:k=>k==='hh-profile'?'m':k==='hh-guardian-family-auth-v785'?'fake-auth':''};
 const w={localStorage:local,isSecureContext:true,Notification:{permission,requestPermission:async()=>permission},
  PushManager:function(){},atob:v=>Buffer.from(v,'base64').toString('binary'),
  setTimeout(){},addEventListener(){},
  HH_GUARDIAN_LIVE_V785:{getClient:()=>({
    auth:{getUser:async()=>({data:{user:{id:'1'}}})},
    functions:{invoke:async(name,arg)=>{
       calls++;
       if(arg.body.action==='config')return {data:{publicKey:'A'.repeat(90)}};
       if(arg.body.action==='subscribe'&&serverError)return {error:{context:{clone:()=>({json:async()=>({error:serverError})})}}};
       return {data:{ok:true}};
    }}
  })}};
 const navigator={serviceWorker:{getRegistration:async()=>null,register:async()=>{
    if(phase==='worker')throw Error('service worker failed');
    return registration;
 }}};
 const d={getElementById:id=>nodes[id]||null,readyState:'complete'};
 vm.runInNewContext(code,{window:w,document:d,navigator,MutationObserver:undefined,Uint8Array,Buffer});
 return {w,nodes,getCalls:()=>calls};
}
test('Samsung worker failure remains visible instead of immediate auto-refresh',async()=>{
 const x=boot({phase:'worker'});await x.w.SHO_WEBPUSH_V3.refresh();
 x.nodes.ncPushEnable.click();await new Promise(resolve=>setImmediate(resolve));
 assert.match(x.nodes.ncPushStatus.textContent,/háttérszolgáltatása/);
 assert.equal(x.nodes.ncPushEnable.disabled,false);
});
test('server rejects unknown push endpoint with safe, actionable copy',async()=>{
 const x=boot({serverError:'invalid_endpoint'});await x.w.SHO_WEBPUSH_V3.refresh();
 x.nodes.ncPushEnable.click();await new Promise(resolve=>setImmediate(resolve));
 assert.match(x.nodes.ncPushStatus.textContent,/push-kiszolgálót/);
 assert.doesNotMatch(x.nodes.ncPushStatus.textContent,/fcm\.googleapis/);
});
test('subscribe browser rejection is distinguishable and keeps old subscription',async()=>{
 const x=boot({phase:'subscribe'});await x.w.SHO_WEBPUSH_V3.refresh();
 x.nodes.ncPushEnable.click();await new Promise(resolve=>setImmediate(resolve));
 assert.match(x.nodes.ncPushStatus.textContent,/push-előfizetést/);
});
test('no permission request until a direct click, existing push flow stays opt in',async()=>{
 const x=boot();
 await x.w.SHO_WEBPUSH_V3.refresh();
 assert.match(x.nodes.ncPushStatus.textContent,/Kikapcsolva/);
 assert.match(code,/Notification\.requestPermission\(\)/);
 assert.match(code,/userVisibleOnly:true/);
 assert.match(code,/hh-guardian-family-auth-v785/);
});
