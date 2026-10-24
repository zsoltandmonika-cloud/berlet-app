'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const router=require('../hh-one-repair-routing-v503.js');
const rag=read('hh-one-rag-v500.js'),admin=read('hh-admin-mobile-focus-v748.js'),
 html=read('index.html'),digital=read('digital-health/index.html');

test('each known HH ONE issue is mapped to exactly the existing repair UI',()=>{
 const routes={
  'OPS-CLOUD':['cloud','hhUnifiedCloudVaultCard'],
  'OPS-REGISTRY':['devices','hhDeviceRegistry401'],
  'OPS-DEVICE-zsolt':['devices','hhDeviceRegistry401'],
  'OPS-DEVICE-monika':['devices','hhDeviceRegistry401'],
  'OPS-HEARTBEAT-zsolt':['devices','hhSyncOrchestrator305'],
  'OPS-HEARTBEAT-monika':['devices','hhSyncOrchestrator305'],
  'OPS-COMMAND-zsolt':['devices','hhSyncOrchestrator305'],
  'OPS-WAIT-monika':['devices','hhSyncOrchestrator305'],
  'OPS-RUNTIME':['data','hhAiImprovement300'],
  'DEV-PERFORMANCE':['data','hhAiImprovement300'],
  'DEV-ONE-AGENT':['devices','sh9VersionCenterV1']
 };
 for(const [id,[group,target]] of Object.entries(routes)){
  const result=router.resolve(id);
  assert.equal(result?.group,group,id);
  assert.equal(result?.target,target,id);
  assert.ok(result?.label,id+' needs an actionable human label');
 }
 for(const id of ['OPS-HEALTHY','OPS-DEVICE-elsewhere','OPS-CLOUD-FAKE','',null,'__proto__'])
  assert.equal(router.resolve(id),null);
 assert.equal(router.primary(false,null).target,'hhUnifiedCloudVaultCard');
 assert.equal(router.primary(true,null).target,'hhDeviceRegistry401');
});

test('one tap acts only as navigation, never impersonates a successful repair',()=>{
 assert.match(rag,/function openRepair\(id\)/);
 assert.match(rag,/root\.hhAdminGoInlineV745\(\)/);
 assert.match(rag,/root\.HH_ADMIN_MOBILE_V748\.openTarget\(route\.group,route\.target\)/);
 assert.match(rag,/box\.addEventListener\('click',function\(\)\{openRepair\(a\.id\)\}\)/);
 assert.match(rag,/line\.addEventListener\('click',function\(\)\{openRepair\('OPS-DEVICE-'\+p\)\}\)/);
 assert.match(admin,/function openTarget\(group,id\)/);
 assert.match(admin,/REPAIR_TARGETS\[group\]\.includes\(id\)/);
 assert.match(admin,/dest\.scrollIntoView/);
 assert.match(admin,/A tényleges javítás vagy engedélyezés csak külön jóváhagyással történik/);
 assert.doesNotMatch(router.resolve('OPS-CLOUD').label,/javítva|sikeres|törlés/i);
 assert.doesNotMatch(read('hh-one-repair-routing-v503.js'),/fetch\(|uploadJson\(|removeItem\(|\.click\(\)|installPackage\(/);
});

test('the entire service issue card is clickable and opens Admin exact target',()=>{
 class E{
  constructor(tag,id=''){
   this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.parentNode=null;
   this.dataset={};this.attributes={};this.className='';this.textContent='';
   this.listeners={};this.style={};this.isConnected=true;
  }
  appendChild(n){this.children.push(n);n.parentNode=this;return n}
  replaceChildren(...xs){this.children=[];for(const x of xs)this.appendChild(x)}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(event,fn){this.listeners[event]=fn}
  focus(){}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this)}
 }
 function all(n){return [n,...n.children.flatMap(all)]}
 const body=new E('body'),head=new E('head');
 const D={body,head,readyState:'complete',visibilityState:'visible',
  createElement:t=>new E(t),getElementById:id=>[...all(body),...all(head)].find(x=>x.id===id)||null,
  addEventListener:()=>{}};
 let target=null,adminOpened=0,dispatched=0;
 const W={
  location:{href:'https://example.org/berlet-app/healthhub/',pathname:'/berlet-app/healthhub/'},
  healthSectionKind:'home',
  setTimeout:fn=>{fn();return 1},setInterval:()=>1,addEventListener:()=>{},
  HH_ONE_REPAIR_ROUTING_V503:router,
  HH_ONE_SERVICE_INTELLIGENCE_V501:{recommend:()=>[{id:'OPS-CLOUD',kind:'Üzemeltetés',title:'Felhőkapcsolat ellenőrzése',priority:'Magas',evidence:'A kapcsolat nem elérhető.',proposal:'Nyisd meg a Cloud Vaultot.',status:'Javaslat'}]},
  HH_DROPBOX_VAULT:{connected:()=>false},
  hhOrchestratorDevices305:async()=>[],
  hhOrchestratorDispatchScope355:async()=>{dispatched++;return{}},
  hhAdminGoInlineV745:()=>{adminOpened++;W.healthSectionKind='more';return true},
  HH_ADMIN_MOBILE_V748:{openTarget:(group,id)=>{target={group,id};return true}},
  confirm:()=>{throw Error('No confirmation should be needed to navigate to settings')}
 };
 vm.runInNewContext(rag,{window:W,document:D,Date,URL,console,Promise});
 W.HH_ONE_RAG_V500.open();
 const buttons=all(body).filter(e=>e.tagName==='BUTTON'&&e.className.includes('hhOneFixIssueV503'));
 assert.ok(buttons.length>=3,'top error, two missing phone cards, and advisory must be tappable');
 const cloud=buttons.find(b=>b.attributes['aria-label']?.includes('Felhőkapcsolat ellenőrzése'));
 assert.ok(cloud);
 cloud.listeners.click();
 assert.deepEqual(target,{group:'cloud',id:'hhUnifiedCloudVaultCard'});
 assert.equal(adminOpened,1,'must open Admin in the SAME click');
 assert.equal(dispatched,0,'no remote command or sync launched');
 assert.equal(D.getElementById('hhOneService500').dataset.open,'0','service overlay closes');
});

test('same repair router loads in main and digital HH One without duplicate badges',()=>{
 assert.match(html,/hh-one-repair-routing-v503\.js\?v=503/);
 assert.match(digital,/hh-one-repair-routing-v503\.js\?v=503/);
 assert.match(html,/hh-one-rag-v500\.js\?v=504-glass-top-left&repair=503/);
 assert.match(digital,/hh-one-rag-v500\.js\?v=504-glass-top-left&repair=503/);
 assert.match(rag,/if\(initialized\)return/);
 assert.match(rag,/hhOneRag500/);
 assert.match(rag,/Nem automatikus javítás|Nem automatikus|NEM igazolja/i);
});
