'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../guardian/smart-260-connect');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const editor=read('favorite-route-editor-v939.js'),app=read('app.mjs'),html=read('index.html'),css=read('favorite-route-editor-v939.css');
test('favorite address editor is separate, read-only and never modifies BKK/network routes',()=>{
 assert.doesNotThrow(()=>new vm.Script(editor));
 assert.doesNotMatch(editor,/\.setItem\(|\.upsert\(|\.update\(|geolocation|watchPosition|getCurrentPosition/);
 assert.match(editor,/const KEY="hh-family-favorite-places-v972"/);
 assert.match(editor,/const COUNT=40/);
 assert.match(editor,/hh-smart-match-address-draft-v939/);
 assert.match(editor,/hh-guardian-family-auth-v785/);
 assert.match(editor,/rest\/v1\//);
 assert.match(editor,/cache:"no-store",credentials:"omit"/);
 assert.match(editor,/smFavReloadV939/);
 assert.match(html,/favorite-route-editor-v939\.js\?v=939/);
 assert.match(html,/favorite-route-editor-v939\.css\?v=939/);
 assert.match(css,/#smFavPanelV939/);
});
function mock(){
 const calls={set:0,requests:0,events:[]},handlers=new Map(),nodes=new Map();
 const make=id=>{
  const e={id,children:[],value:'',textContent:'',disabled:false,handlers:{},
   replaceChildren(){this.children=[];this.value=''},
   append(child){this.children.push(child);if(!this.value)this.value=child.value},
   addEventListener(type,fn){this.handlers[type]=fn},
  };
  nodes.set(id,e);return e;
 };
 for(const id of ['smFavFromV939','smFavToV939','smFavStatusV939','smFavUseV939','smFavReverseV939','smFavReloadV939'])make(id);
 const saved=Array.from({length:40},()=>({label:'',place:null}));
 saved[0]={label:'Otthon',place:{name:'Saved home',lat:47.5,lng:19.05}};
 saved[7]={label:'Dávid & Anna Otthona',place:{name:'Saved family destination',lat:47.52,lng:19.01}};
 const storage={getItem:k=>k==='hh-family-favorite-places-v972'?JSON.stringify(saved):null,setItem(){calls.set++}};
 const d={readyState:'loading',addEventListener(type,fn){handlers.set(type,fn)},
  getElementById:id=>nodes.get(id)||null,
  createElement:tag=>({tagName:tag,value:'',textContent:'',title:''})};
 const w={localStorage:storage,addEventListener(){},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}},
  dispatchEvent:e=>calls.events.push(e),fetch(){calls.requests++}};
 vm.runInNewContext(editor,{window:w,document:d,Date,Number,Math,JSON,Array,Set,Map,String});
 handlers.get('DOMContentLoaded')();
 return {nodes,calls};
}
test('saved Otthon and Dávid & Anna are preselected; reversing never changes favorite store',()=>{
 const {nodes,calls}=mock();
 assert.equal(nodes.get('smFavFromV939').value,'0');
 assert.equal(nodes.get('smFavToV939').value,'7');
 nodes.get('smFavUseV939').handlers.click();
 assert.equal(calls.events.length,1);
 assert.equal(calls.events[0].type,'hh-smart-match-address-draft-v939');
 assert.equal(calls.events[0].detail.from.label,'Otthon');
 assert.equal(calls.events[0].detail.to.label,'Dávid & Anna Otthona');
 nodes.get('smFavReverseV939').handlers.click();
 assert.equal(nodes.get('smFavFromV939').value,'7');
 assert.equal(nodes.get('smFavToV939').value,'0');
 nodes.get('smFavUseV939').handlers.click();
 assert.equal(calls.events[1].detail.from.label,'Dávid & Anna Otthona');
 assert.equal(calls.set,0);
 assert.equal(calls.requests,0);
});
test('favorite draft creates a NEW template only after GTFS form validation, original 260 stays',async()=>{
 const js=app.replace(/^import .*\n/gm,'');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/favoriteAddressDraft=\{from:x\.from\.slot,to:x\.to\.slot\}/);
 assert.match(js,/save\(\{newTemplate:!!favoriteAddressDraft\}\)/);
 assert.match(js,/if\(favoriteAddressDraft\)\{[\s\S]*?toast\('⚠️ Előbb/);
 assert.match(js,/originFavoriteSlot:favoriteAddressDraft\.from/);
 assert.match(js,/destinationFavoriteSlot:favoriteAddressDraft\.to/);
 assert.match(js,/targetAfterStop:"",destinationTransitStop:"",reverseId:null/);
 assert.match(js,/function hydrate\(\)\{\n favoriteAddressDraft=null/);
 const core=await import('../guardian/smart-260-connect/core.mjs');
 assert.equal(core.bus260DirectionForTemplate(core.DEFAULT),'home');
 assert.equal(core.bus260DirectionForTemplate(core.REVERSE),'work');
 assert.equal(core.bus260DirectionForTemplate({...core.DEFAULT,originFavoriteSlot:0,destinationFavoriteSlot:7}),null);
 assert.equal(core.SAMPLES.length,5);
 assert.equal(core.FAMILY_OUTBOUND.originFavoriteSlot,0);
 assert.equal(core.FAMILY_OUTBOUND.destinationFavoriteSlot,7);
 assert.equal(core.FAMILY_OUTBOUND.reverseId,core.FAMILY_RETURN.id);
 assert.equal(core.FAMILY_RETURN.reverseId,core.FAMILY_OUTBOUND.id);
 assert.equal(core.FAMILY_OUTBOUND.targetRoute,'');
});
