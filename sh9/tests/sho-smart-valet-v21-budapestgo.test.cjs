'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const page=read('sh9/wallet/index.html'),quick=read('sh9/wallet/smart-valet-smart-access-v13.js'),
 demo=read('sh9/wallet/smart-valet-v1.js'),launcher=read('sh9/wallet/smart-valet-budapestgo-v21.js'),
 css=read('sh9/wallet/smart-valet-budapestgo-v21.css');
function harness(){
 const memory=new Map(),events={},goCalls=[];
 const w={
  localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)},
  dispatchEvent(){},addEventListener(){},SHO_SMART_VALET_PREVIEW_V1:{render(){}},
  SHO_BUDAPESTGO_V21:{open(){goCalls.push('open')}}
 };
 const node=(type='div')=>({tagName:type,children:[],disabled:false,attrs:{},
  classList:{add(){},remove(){}},setAttribute(k,v){this.attrs[k]=v},
  addEventListener(k,fn){(this.events??={})[k]=fn},
  replaceChildren(...a){this.children=a},append(...a){this.children.push(...a)},
  closest(){return null},textContent:''});
 const featured=node(),badge=node(),h=node();
 h.closest=()=>({querySelector:()=>badge});
 const d={readyState:'loading',createElement:node,addEventListener(k,fn){events[k]=fn},
  getElementById(id){return id==='svFeatured'?featured:null},
  querySelector(sel){return sel==='#svFeatureTitle'?h:null}};
 vm.runInNewContext(quick,{window:w,document:d,CustomEvent:class{},URL:{revokeObjectURL(){}},Blob,console});
 return{w,featured,badge,goCalls,api:w.SHO_VALET_SMART_ACCESS_V13,memory};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('BudapestGO is a new real, profile-scoped pin provider with precise ID whitelist',()=>{
 assert.match(quick,/SOURCES=\['demo','private','identity','extra','app'\]/);
 const {api,w,memory}=harness();
 assert.equal(api.toggle({source:'app',id:'budapestgo'}),true);
 assert.deepEqual(JSON.parse(JSON.stringify(api.current())),{source:'app',id:'budapestgo'});
 assert.equal(api.isPinned('app','budapestgo'),true);
 assert.equal(api.toggle({source:'app',id:'anything-else'}),false);
 assert.equal(api.isPinned('app','budapestgo'),true);
 w.localStorage.setItem('hh-profile','m');
 assert.equal(api.current(),null);
 assert.equal(api.toggle({source:'app',id:'budapestgo'}),true);
 w.localStorage.setItem('hh-profile','z');
 assert.equal(api.current().id,'budapestgo');
 assert.equal(api.toggle({source:'app',id:'budapestgo'}),true);
 assert.equal(api.current(),null);
 assert.equal(memory.has('sho-smart-valet-quick-access-v13:zsolt'),false);
 w.localStorage.setItem('hh-profile','m');
 assert.equal(api.current().id,'budapestgo');
});
test('pinned BudapestGO opens the official application launcher without viewing a ticket',async()=>{
 const {api,featured,goCalls}=harness();
 assert.equal(api.toggle({source:'app',id:'budapestgo'}),true);
 assert.equal(api.renderFeatured(),true);
 await tick();await tick();
 assert.equal(featured.children[0].children[1].textContent,'BudapestGO');
 assert.equal(featured.children[1].children[0].textContent,'GO');
 assert.equal(featured.children[0].children[3].children[0].disabled,false);
 await api.openPinned({source:'app',id:'budapestgo'});
 assert.deepEqual(goCalls,['open']);
 assert.match(quick,/if\(pin\.source==='app'&&pin\.id==='budapestgo'\)/);
 assert.match(quick,/return w\.SHO_BUDAPESTGO_V21\?\.open\(\)/);
});
test('BudapestGO tile appears within the existing Bérletek category with independent pin toggle',()=>{
 assert.match(demo,/function appendBudapestGo\(host,search\)/);
 assert.match(demo,/\['pass','all'\]\.includes\(kind\)/);
 assert.match(demo,/quick\?\.toggle\(\{source:'app',id:'budapestgo'\}\)/);
 assert.match(demo,/w\.SHO_BUDAPESTGO_V21\?\.open\(\)/);
 assert.match(demo,/const hasGo=appendBudapestGo\(host,search\)/);
 assert.match(page,/smart-valet-budapestgo-v21\.js\?v=21-official-app-launcher/);
 assert.match(page,/smart-valet-budapestgo-v21\.css\?v=21-go-launcher-pin/);
 assert.match(page,/smart-valet-smart-access-v13\.js\?v=23-keep-cloud-pins/);
 assert.match(css,/sv-go-card-v21/);
});
test('Android launcher only targets confirmed official BKK package, not a fabricated widget deep link',()=>{
 assert.match(launcher,/hu\.webvalto\.bkkfutar/);
 assert.match(launcher,/https:\/\/play\.google\.com\/store\/apps\/details\?id=hu\.webvalto\.bkkfutar/);
 assert.match(launcher,/android\.intent\.action\.MAIN/);
 assert.match(launcher,/android\.intent\.category\.LAUNCHER/);
 assert.match(launcher,/S\.browser_fallback_url/);
 assert.doesNotMatch(launcher,/apiKey|token|accessToken|mobileTicket|ticketId|valetSecret/);
 const mobile={navigator:{userAgent:'Android 15'},location:{assign(url){this.called=url}}};
 vm.runInNewContext(launcher,{window:mobile,document:{}});
 mobile.SHO_BUDAPESTGO_V21.open();
 assert.match(mobile.location.called,/^intent:#Intent;/);
 const desktop={navigator:{userAgent:'Windows'},location:{assign(url){this.called=url}}};
 vm.runInNewContext(launcher,{window:desktop,document:{}});
 desktop.SHO_BUDAPESTGO_V21.open();
 assert.match(desktop.location.called,/^https:\/\/play\.google\.com\/store\/apps\/details/);
});
test('all existing JavaScript remains valid',()=>{
 for(const code of [quick,demo,launcher])assert.doesNotThrow(()=>new vm.Script(code));
});
