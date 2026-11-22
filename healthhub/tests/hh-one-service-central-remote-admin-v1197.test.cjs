'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','hh-one-rag-v500.js'),'utf8');
const deviceIds={
 zsolt:'android-80e72769-a107-4fa8-bc0d-04aaeb6d4d9e',
 monika:'android-015a38cb-9170-4ace-8c55-5b2b9bb41917'
};
function element(tag='div'){
 const el={tag,children:[],style:{},dataset:{},textContent:'',id:'',disabled:false,
  className:'',hidden:false,events:{},attributes:{},
  appendChild(e){this.children.push(e);e.parent=this;return e},
  replaceChildren(...nodes){this.children=[...nodes];for(const n of nodes)n.parent=this},
  setAttribute(k,v){this.attributes[k]=v},
  addEventListener(event,cb){this.events[event]=cb},
  focus(){},remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}};
 return el;
}
function descendants(node){return [node,...node.children.flatMap(descendants)]}
function harness({connected=true,registryMatch=true,centralMatch=true}={}){
 const head=element('head'),body=element('body'),listeners={},dispatch=[];
 const now=new Date().toISOString();
 const registry={schema:'healthhub.device_registry/1',
  activePhones:{...deviceIds},archived:[]};
 if(!registryMatch)registry.activePhones.monika='android-ffffffff-ffff-ffff-ffff-ffffffffffff';
 const centralRows=Object.entries(deviceIds).map(([profile_key,device_id])=>({
  profile_key,device_id:centralMatch||profile_key==='zsolt'?device_id:'android-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  verified_at:now,last_seen_at:now,state:'online',build:'0.15.23'
 }));
 const devices=Object.entries(deviceIds).map(([p,deviceId])=>({
  deviceId,deviceType:'android',activeProfile:p,name:p,buildCode:50,build:'0.15.23',
  capabilities:['gps_repair','remote_config','agent_reconcile','diagnostics','ota'],
  lastSeenAt:now
 }));
 const d={head,body,readyState:'loading',visibilityState:'visible',
  createElement:element,
  getElementById(id){return descendants(body).concat(descendants(head)).find(x=>x.id===id)||null},
  addEventListener(k,fn){listeners[k]=fn}};
 const w={location:{href:'https://example.test/berlet-app/healthhub/?hhone=service',
    pathname:'/berlet-app/healthhub/'},
  setTimeout(){return 1},setInterval(){return 2},addEventListener(){},confirm(){return true},
  HH_DROPBOX_VAULT:{
   connected(){return connected},
   async downloadJson(){return registry}
  },
  HH_FAMILY_DEVICE_CENTRAL_V1:{
   async refresh(){},devices(){return centralRows}
  },
  async hhOrchestratorDevices305(){return devices},
  async hhOrchestratorDispatchScope355(...args){dispatch.push(args);return{commandId:'v1197-test'}}
 };
 vm.runInNewContext(src,{window:w,document:d,URL,Date,Promise,Object,Number,Array,Math,Set});
 listeners.DOMContentLoaded();
 return {w,d,dispatch,async ready(){
   await new Promise(r=>setImmediate(r));
   w.HH_ONE_RAG_V500.open();
   await new Promise(r=>setImmediate(r));
  },buttons(){
   return descendants(d.body).filter(e=>e.tag==='button'&&e.textContent.includes('GPS SERVICE REPAIR'));
  }};
}
test('central verified phones keep the GPS SERVICE REPAIR control reachable with matching Dropbox registry',async()=>{
 const h=harness();await h.ready();
 const buttons=h.buttons();
 assert.equal(buttons.length,2,'one button per separately owner-verified Android phone');
 assert.equal(buttons[0].disabled,false);
 assert.equal(buttons[1].disabled,false);
 buttons[1].events.click();
 await new Promise(r=>setImmediate(r));
 assert.equal(h.dispatch.length,1);
 assert.deepEqual(Array.from(h.dispatch[0]).slice(0,3),['monika',deviceIds.monika,'gps_repair']);
});
test('mismatched Dropbox registry cannot unlock remote command buttons under central proof',async()=>{
 const h=harness({registryMatch:false});await h.ready();
 assert.equal(h.buttons().length,0,'do not render privileged controls with conflicting phone selection');
 assert.equal(h.dispatch.length,0);
});
test('central owner mismatch cannot unlock remote command buttons',async()=>{
 const h=harness({centralMatch:false});await h.ready();
 assert.equal(h.buttons().length,0);
});
test('no browser Dropbox connection never exposes remote commands',async()=>{
 const h=harness({connected:false});await h.ready();
 assert.equal(h.buttons().length,0);
});
