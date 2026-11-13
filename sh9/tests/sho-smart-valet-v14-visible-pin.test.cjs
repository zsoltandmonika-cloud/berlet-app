'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/wallet/index.html'),app=read('sh9/wallet/smart-valet-identity-v11.js');
const theme=read('sh9/wallet/smart-valet-smart-access-v13.css');
const types=['license','personal','taj','tax'];

function harness(){
 const pinButtons={},tiles={};
 const state={pinned:null};
 for(const type of types){
  pinButtons[type]={
   disabled:true,textContent:'☆ Kitűzés',title:'',attrs:{},
   setAttribute(key,value){this.attrs[key]=value}
  };
  tiles[type]={
   appended:[],querySelector(){return{remove(){}}},
   append(x){this.appended.push(x)}
  };
 }
 const document={
  readyState:'loading',addEventListener(){},getElementById(){return null},
  createElement(tag){return{tagName:tag,className:'',textContent:''}},
  querySelector(s){
   const match=s.match(/data-(?:id-type|pin-for)="(license|personal|taj|tax)"/);
   if(!match)return null;
   return s.includes('sv-id-tile-pin-v14')?pinButtons[match[1]]:tiles[match[1]];
  }
 };
 const window={
  HH_CENTRAL_VAULT:{},
  localStorage:{getItem(key){return key==='hh-profile'?'z':null}},
  SHO_VALET_SMART_ACCESS_V13:{
   isPinned(source,id){return source==='identity'&&state.pinned===id}
  }
 };
 const source=app.replace(/\}\)\(window,document\);\s*$/,
  "window.__v14={setRecords(v){records=new Map(v)},updateTiles,updateTilePinButtons};})(window,document);");
 assert.notEqual(source,app);
 vm.runInNewContext(source,{window,document,URL,Blob,TextEncoder,Uint8Array,atob,btoa});
 return{...window.__v14,pinButtons,tiles,state};
}

test('four real ID cards have visible static sibling pin buttons, never nested in opener',()=>{
 const section=html.match(/<div class="sv-id-grid-v10"[\s\S]*?<\/div>\s*<p id="svIdNoticeV10"/)?.[0];
 assert.ok(section,'Identity tile grid found');
 for(const type of types){
  const pattern=new RegExp('<div class="sv-id-pin-wrap-v14">[\\s\\S]*?'+
   'data-id-type="'+type+'"[^>]*>[\\s\\S]*?<\\/button>[\\s\\S]*?'+
   'data-pin-for="'+type+'" disabled[^>]*>☆ Kitűzés<\\/button>');
  assert.match(section,pattern,'Visible pin beside '+type);
 }
 const pins=[...section.matchAll(/data-pin-for="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(pins,types);
 assert.match(html,/smart-valet-smart-access-v13\.css\?v=13-universal-pin-v14-visible/);
 assert.match(html,/smart-valet-identity-v11\.js\?v=23-recover-cloud-id-tiles/);
 assert.match(theme,/\.sv-id-pin-wrap-v14>/);
 assert.match(theme,/\.sv-id-tile-pin-v14:disabled/);
 assert.match(theme,/data-sh9-golden-profile="z"/);
});

test('pin buttons unlock only after authenticated saved card metadata is loaded',()=>{
 const h=harness();
 h.updateTiles();
 for(const type of types)assert.equal(h.pinButtons[type].disabled,true);
 h.setRecords([['license',{doc_type:'license',front_saved_at:'2026-11-05T18:00:00Z',
  back_saved_at:null,protection_mode:'password'}]]);
 h.updateTiles();
 assert.equal(h.pinButtons.license.disabled,false);
 assert.equal(h.pinButtons.license.textContent,'☆ Kitűzés');
 assert.equal(h.pinButtons.license.attrs['aria-pressed'],'false');
 assert.equal(h.pinButtons.personal.disabled,true);
 h.state.pinned='license';
 h.updateTilePinButtons();
 assert.equal(h.pinButtons.license.textContent,'★ Kitűzés megszüntetése');
 assert.equal(h.pinButtons.license.attrs['aria-pressed'],'true');
 assert.equal(h.pinButtons.taj.disabled,true);
 h.setRecords(types.map(t=>[t,{doc_type:t,front_saved_at:'2026-11-05T18:00:00Z',
  protection_mode:'password'}]));
 h.updateTiles();
 for(const type of types)assert.equal(h.pinButtons[type].disabled,false);
 h.setRecords([]);h.updateTiles();
 for(const type of types)assert.equal(h.pinButtons[type].disabled,true);
});

test('pin action uses existing Smart Access manager without touching encrypted originals',()=>{
 assert.match(app,/parent\.querySelectorAll\('\.sv-id-tile-pin-v14\[data-pin-for\]'\)/);
 assert.match(app,/if\(button\.disabled\|\|!records\.get\(type\)\?\.front_saved_at\)return/);
 assert.match(app,/w\.SHO_VALET_SMART_ACCESS_V13\?\.toggle\(\{source:'identity',id:type\}\)/);
 assert.match(app,/records=new Map\(\);updateTiles\(\)/);
 assert.match(app,/w\.addEventListener\('sho-valet-pin-changed'/);
 assert.match(app,/if\(!rec\|\|protectionMode\(rec\)!=='device'\|\|!rec\.front_saved_at\)return null/);
 assert.doesNotMatch(app,/getPublicUrl|createSignedUrl|service_role|localStorage\.setItem/);
 assert.doesNotThrow(()=>new vm.Script(app));
});
