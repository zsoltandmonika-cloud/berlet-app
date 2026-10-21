'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'hh-unified-admin-v745.js'),'utf8');
const oldDataHub=fs.readFileSync(path.join(root,'live-v137.js'),'utf8');
const touch=fs.readFileSync(path.join(root,'health-interactions-v552.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(index,/hh-unified-admin-v745\.js\?v=745-one-admin-page/);
assert.match(oldDataHub,/window\.haRenderInlineV745=/);
assert.match(oldDataHub,/document\.getElementById\('haInlineBody'\)/);
assert.match(touch,/root\.hhAdminGoInlineV745/);
assert.doesNotMatch(source,/localStorage\.removeItem|indexedDB\.deleteDatabase|dropboxapi\.com/);
class E{
 constructor(tag,id=''){
  this.id=id;this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};
  this.attributes={};this.hidden=false;this.isConnected=true;this.listeners={};
  this.classList={contains:x=>(this.className||'').split(' ').includes(x)};
  this.textContent='';this.childNodes=[];this.title='';
 }
 append(...xs){this.children.push(...xs);return this}
 appendChild(el){this.children.push(el);return el}
 querySelector(query){
  if(query[0]!=='#')return null;const id=query.slice(1);
  return deep(this,id);
 }
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,f){this.listeners[k]=f}
 get firstChild(){return this.children[0]||null}
}
function deep(node,id){
 if(node.id===id)return node;
 for(const child of node.children||[]){
  const r=deep(child,id);if(r)return r;
 }return null;
}
const rootE=new E('div','healthSubContent');
const navBtn=new E('button');navBtn.textContent='•••Továbbiak';
navBtn.childNodes=[{nodeType:1,textContent:'•••',children:[]},{nodeType:3,nodeValue:'Továbbiak'}];
const navs=[navBtn];
const old=new E('div','hhAdminMenuCard'),cloud=new E('div','hhUnifiedCloudVaultCard'),
 docs=new E('div','hhArchitectureGrandDesign744'),recovery=new E('div','hhDocsRecoveryCard');
rootE.children.push(old,cloud,docs,recovery);
const head=new E('head'),title=new E('div','healthSubTitle');
const D={
 readyState:'loading',documentElement:{dataset:{}},head,
 createElement:t=>new E(t),getElementById:id=>[rootE,head,title].map(n=>deep(n,id)).find(Boolean)||null,
 querySelectorAll:s=>s.includes('navHealthBar')?navs:[],
 addEventListener:()=>{}
};
let inlineRendered=0,opened='',showed='';
const W={
 healthSectionKind:'more',setInterval:()=>{},setTimeout:f=>f(),
 addEventListener:()=>{},haRenderInlineV745:()=>{inlineRendered++},
 openHealthSection:name=>{opened=name},show:id=>{showed=id},
 console:{warn:()=>{}}
};
vm.runInNewContext(source,{window:W,document:D,MutationObserver:class{
 observe(){}disconnect(){}
},Promise,Set});
const admin=W.HH_UNIFIED_ADMIN_V745;
assert.equal(admin.version,'745');
admin.layout();
assert.equal(navBtn.childNodes[1].nodeValue,'Admin');
assert.equal(navBtn.attributes['aria-label'],'Admin megnyitása');
assert.equal(navBtn.dataset.hhAdminNavV745,'1');
navBtn.onclick();assert.equal(opened,'more');
assert.equal(W.healthSectionKind,'more');
assert.equal(D.documentElement.dataset.hhInlineAdmin,'yes');
assert.equal(title.textContent,'Admin');
assert.equal(rootE.querySelector('#hhAdminInlineToolsV745')?.id,'hhAdminInlineToolsV745');
assert.equal(inlineRendered,1);
assert.equal(old.hidden,true);
assert.equal(cloud.hidden,false);
assert.equal(docs.hidden,false);
assert.equal(recovery.hidden,false);
assert.equal(cloud.dataset.hhAdminGroup,'cloud');
assert.equal(docs.dataset.hhAdminGroup,'architecture');
assert.equal(recovery.dataset.hhAdminGroup,'recovery');
assert.equal(rootE.children.filter(x=>x.className==='hhAdminGroupLabelV745').length,5);
const count=rootE.children.length;admin.layout();
assert.equal(rootE.children.length,count);
assert.equal(inlineRendered,1);
assert.equal(rootE.querySelector('#hhAdminGroupdataV745')?.children[0].textContent,'📥 Import, export és adatkezelés');
console.log('PASS v745: single taskbar Admin, original controls kept, legacy duplicate hidden, inline data tools, category order, idempotent layout.');
