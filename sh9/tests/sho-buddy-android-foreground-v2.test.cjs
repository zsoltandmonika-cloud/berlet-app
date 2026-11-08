'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
class El{
 constructor(){this.children=[];this.dataset={};this.hidden=false;this.className=''}
 append(...nodes){this.children.push(...nodes)}
 appendChild(n){this.children.push(n)}
 setAttribute(){}
 addEventListener(){}
 querySelector(sel){const find=n=>{for(const x of n.children){if(x.className===sel.slice(1))return x;const match=find(x);if(match)return match}return null};return find(this)}
}
function setup(permission='granted',registration=null){
 const sent=[],body=new El(),document={body,hidden:false,createElement:()=>new El()};
 const worker={getRegistration:async()=>registration};
 const window={Notification:class{static permission=permission;constructor(title,options){sent.push({title,options,source:'fallback'})}},
  navigator:{serviceWorker:worker},clearTimeout:()=>{},setTimeout:()=>1,
  SHO_NOTIFICATION_CORE_V1:{profile:()=> 'z',publish:()=>({})}};
 vm.runInNewContext(source('healthhub/guardian/guardian-buddy-place-alerts-v1.js'),{window,document,Date,Math,Set,Number,Intl});
 return {window,sent,body};
}
const place={profile:'monika',index:1,name:'Otthon'};
test('granted Android notification is sent through existing registration, generic lockscreen text',async()=>{
 const sent=[],reg={active:{},showNotification:async(title,options)=>sent.push({title,options})};
 const v=setup('granted',reg);
 assert.equal(v.window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show(place,'arrival','Mónika megérkezett: Otthon'),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.length,1);
 assert.equal(sent[0].options.data.kind,'sho-buddy-place-foreground-v2');
 assert.ok(!sent[0].options.body.includes('Otthon'));
 assert.equal(v.sent.length,0,'No duplicate constructor notification with a working service worker');
});
test('no OS notification without consent',async()=>{
 const sent=[],reg={active:{},showNotification:async(title,options)=>sent.push({title,options})};
 const v=setup('default',reg);
 v.window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show(place,'departure');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.length,0);assert.equal(v.sent.length,0);
});
test('unsupported service worker falls back, no new push listener or GPS watcher',async()=>{
 const v=setup('granted',null);
 v.window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show(place,'departure');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(v.sent.length,1);
 const sw=source('sh9/sw.js');
 assert.match(sw,/sho-buddy-place-foreground-v2/);
 assert.match(sw,/sho-test-v3/);
 assert.doesNotMatch(source('healthhub/guardian/guardian-buddy-place-alerts-v1.js'),/watchPosition|getCurrentPosition|setInterval\(/);
});
