'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.className='';this.hidden=false;this.dataset={};this.textContent='';}
 append(...items){this.children.push(...items)}
 appendChild(item){this.children.push(item)}
 setAttribute(name,value){this[name]=value}
 addEventListener(){}
 querySelector(selector){
  const wanted=selector.slice(1);
  const find=node=>{for(const child of node.children){if(child.className===wanted)return child;const result=find(child);if(result)return result}return null};
  return find(this);
 }
}
function setup(){
 const calls=[];
 const document={hidden:false,body:new Element('body'),createElement:tag=>new Element(tag)};
 const window={clearTimeout:()=>{},setTimeout:()=>123,
  SHO_NOTIFICATION_CORE_V1:{profile:()=> 'z',publish:notice=>{calls.push(notice);return notice}}};
 vm.runInNewContext(read('healthhub/guardian/guardian-buddy-place-alerts-v1.js'),{window,document});
 return {window,document,calls};
}
test('arrival shows approved happy Buddy and publishes a Family Guard arrival event',()=>{
 const {window,document,calls}=setup();
 const result=window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show({profile:'monika',index:0,name:'Otthon'},'arrival','Mónika megérkezett ide: Otthon');
 assert.equal(result,true);
 assert.equal(document.body.children[0].dataset.buddyKind,'arrival');
 assert.equal(calls.length,1);
 assert.equal(calls[0].type,'familyguard.arrival');
 assert.equal(calls[0].profile,'z');
 assert.equal(calls[0].targetUrl,'/berlet-app/healthhub/guardian/');
});
test('departure shows amber neutral Buddy and publishes the departure event',()=>{
 const {window,document,calls}=setup();
 assert.equal(window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show({profile:'zsolt',index:3,name:'Munkahely'},'departure','Zsolt elindult innen: Munkahely'),true);
 assert.equal(document.body.children[0].dataset.buddyKind,'departure');
 assert.equal(calls[0].type,'familyguard.departure');
});
test('invalid owner, place and hidden page never publish',()=>{
 const {window,document,calls}=setup();
 assert.equal(window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show({profile:'stranger',index:0,name:'Otthon'},'arrival'),false);
 assert.equal(window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show({profile:'monika',index:40,name:'Otthon'},'arrival'),false);
 document.hidden=true;
 assert.equal(window.SHO_SMART_BUDDY_PLACE_ALERT_V1.show({profile:'monika',index:1,name:'Otthon'},'departure'),false);
 assert.equal(calls.length,0);
});
test('approved three-state RAG art, cache versions and script order are wired correctly',()=>{
 const css=read('healthhub/guardian/guardian-buddy-place-alerts-v1.css');
 const html=read('healthhub/guardian/index.html');
 const nc=read('sh9/notification-center/index.html');
 const core=read('sh9/notification-center/notification-core-v1.js');
 assert.match(css,/background-image:url\("data:image\/webp;base64,/);
 assert.match(css,/\[data-buddy-kind="departure"\].*background-position:center 50%/);
 assert.match(css,/background-position:center 0%/);
 assert.ok(html.indexOf('guardian-buddy-place-alerts-v1.js')<html.indexOf('guardian-smart-places-v1068.js'));
 assert.match(nc,/notification-core-v1\.js\?v=6-buddy-place-alerts/);
 assert.match(core,/key:'departure'.*Távozás · Place Alert/);
});
test('the adapter uses no independent GPS sensor, network polling or background monitor',()=>{
 const code=read('healthhub/guardian/guardian-buddy-place-alerts-v1.js');
 assert.doesNotMatch(code,/\b(?:geolocation|watchPosition|getCurrentPosition|fetch\(|setInterval\()/);
});
