'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'home-hero-info-glass-v522.js'),'utf8');
const css=fs.readFileSync(path.join(root,'home-hero-info-glass-v522.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.includes('home-hero-info-glass-v522.js?v=528-default-home'));
assert.ok(source.includes("params.get('hhpremium')==='0'"));
assert.ok(source.includes("dataset.hhPremiumPreview!=='on'"));
assert.ok(source.includes("['dateHome','weatherHome','namedayHome']"));
assert.ok(css.includes('[data-hhpg-profile="m"]'));
assert.ok(css.includes('pointer-events:none'));
assert.ok(!/fetch\(|XMLHttpRequest|localStorage/.test(source),'no duplicated network or data access');
class Fake {
 constructor(tag){this.tag=tag;this.id='';this.className='';this.children=[];this.textContent='';this.attrs={};this.parentNode=null;}
 appendChild(el){if(el.parentNode){const ix=el.parentNode.children.indexOf(el);if(ix>=0)el.parentNode.children.splice(ix,1)}
   this.children.push(el);el.parentNode=this;return el}
 setAttribute(k,v){this.attrs[k]=v}
}
function load(query,ready){
 const hero=new Fake('div'),copy=new Fake('div'),head=new Fake('head'),rootElement={dataset:{hhPremiumPreview:ready?'on':'off'}};
 hero.appendChild(copy);
 const ids=['dateHome','weatherHome','namedayHome'];
 const nodes=ids.map(id=>{const n=new Fake('div');n.id=id;copy.appendChild(n);return n});
 nodes[0].textContent='október 14., szerda · Budapest';
 nodes[1].textContent='☀ Budapest';
 nodes[2].textContent='Névnap: Helén';
 const document={
  readyState:'complete',documentElement:rootElement,head,
  createElement(tag){return new Fake(tag)},
  querySelector(s){return s==='#home #heroHome'?hero:null},
  getElementById(id){return id==='hhpgInfoDashboard522'?hero.children.find(x=>x.id===id)||null:nodes.find(x=>x.id===id)||null}
 };
 const window={location:{search:query}};
 vm.runInNewContext(source,{window,document,URLSearchParams});
 return {hero,copy,nodes,head};
}
const off=load('?hhpremium=0',true),noPremium=load('',false),on=load('',true);
const explicitPremium=load('?hhpremium=1',true);
assert.ok(explicitPremium.hero.children.find(x=>x.id==='hhpgInfoDashboard522'),'old Premium bookmark remains valid');
assert.equal(off.hero.children.length,1,'explicit classic fallback untouched');
assert.equal(noPremium.hero.children.length,1,'guard when premium not mounted');
const panel=on.hero.children.find(x=>x.id==='hhpgInfoDashboard522');
assert.ok(panel,'premium panel present');
assert.equal(panel.children.length,3);
assert.equal(panel.children.map(x=>x.children[0].textContent).join('|'),'DÁTUM|IDŐJÁRÁS|NÉVNAP');
assert.equal(on.head.children.length,1,'one scoped stylesheet loaded');
assert.equal(panel.children[0].children[1],on.nodes[0],'date source reused');
assert.equal(panel.children[1].children[1],on.nodes[1],'weather source reused');
assert.equal(panel.children[2].children[1],on.nodes[2],'nameday source reused');
assert.equal(on.nodes[1].textContent,'Időjárás betöltése…','fake sun suppressed');
on.nodes[1].textContent='19°C · felhős';
assert.equal(panel.children[1].children[1].textContent,'19°C · felhős','live source remains writable');
assert.equal(panel.attrs.role,'group');
console.log('HealthHub Hero Live Info Glass v522 regression OK');
