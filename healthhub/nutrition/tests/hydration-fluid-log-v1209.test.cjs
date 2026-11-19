'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','nutrition-preview-v592.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const style=fs.readFileSync(path.join(__dirname,'..','hh-fluid-log-golden-v1209.css'),'utf8');
const begin=source.indexOf(" const log=$('log');");
const end=source.indexOf(" const mealGrid=document.createElement('div');",begin);
assert.ok(begin>=0&&end>begin,'scoped real diary renderer is available for behaviour tests');
const excerpt=source.slice(begin,end);
const renderBlock=new Function('$','entries','active','date','localDate','fluidTotal','fmt',
 'document','update','stamp',excerpt);
class Element{
 constructor(tag){
  this.tag=tag;this.children=[];this.className='';this.dataset={};
  this.attrs={};this.events={};this.textContent='';this.open=false;
 }
 append(...x){this.children.push(...x)}
 replaceChildren(...x){this.children=x}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.events[k]=fn}
 querySelector(selector){
  if(selector==='details.hh-day-water-log-v1209')
   return this.children.find(e=>e.tag==='details'&&e.className==='hh-day-water-log-v1209')||null;
  return null;
 }
}
test('native compact water log initially starts CLOSED, preserving premium visible daily total',()=>{
 assert.match(source,/const keepWaterLogOpen=log\.dataset\.waterLogContext===waterLogContext&&existingWaterLog\?\.open===true/);
 assert.match(source,/dayWater\.open=keepWaterLogOpen/);
 assert.match(style,/details\.hh-day-water-log-v1209 > summary\.hh-day-water-summary/);
 assert.match(style,/\.hh-water-log-chevron-v1209/);
 assert.match(html,/hh-fluid-log-golden-v1209\.css\?v=1209-closed-active-drinks/);
 assert.match(html,/nutrition-preview-v592\.js\?v=[^"]*fluidlog=1209/);
});
test('real active drinks are the only daily water events, deletion updates collapsed summary and open list',()=>{
 let active='zsolt',date='2026-11-19';
 const root=new Element('div');
 const dataset={
  entries:[
   {id:'drinkA',name:'Víz',icon:'💧',time:'17:20',date,volumeMl:250,quantityText:'250 ml'},
   {id:'drinkB',name:'Víz',icon:'💧',time:'17:21',date,volumeMl:250,quantityText:'250 ml'},
   {id:'other',name:'Alma',time:'18:00',date},
   {id:'deleted',name:'Víz',time:'16:30',date,volumeMl:250,deleted:true}
  ]
 };
 const document={createElement:tag=>new Element(tag)};
 const localDate=()=>'2026-11-19';
 const stamp=()=>new Date().toISOString();
 const fmt=n=>Number(n).toLocaleString('hu-HU');
 let updates=0;
 function render(){
  const entries=dataset.entries.filter(x=>!x.deleted&&x.date===date);
  const fluidTotal=entries.filter(e=>Number.isFinite(e.volumeMl)).reduce((n,e)=>n+e.volumeMl,0);
  renderBlock(id=>id==='log'?root:null,entries,active,date,localDate,fluidTotal,fmt,document,update,stamp);
 }
 function update(fn){fn(dataset);updates++;render()}
 render();
 let log=root.children[0];
 assert.equal(log.tag,'details');
 assert.equal(log.open,false,'default state is always closed on first view');
 assert.equal(log.children[0].children[1].textContent,'500 ml');
 assert.equal(log.children[1].children.length,2,'only two non-deleted drinks, not reset events');
 log.open=true;
 // Clicking a row's × soft-deletes the same underlying diary ID and rerenders
 const deleteControl=log.children[1].children[0].children[1].children[1];
 assert.equal(deleteControl.tag,'button');
 deleteControl.events.click();
 assert.equal(updates,1);
 assert.equal(dataset.entries.filter(e=>e.deleted&&e.volumeMl===250).length,2);
 log=root.children[0];
 assert.equal(log.open,true,'after deletion the expanded list stays open');
 assert.equal(log.children[0].children[1].textContent,'250 ml');
 assert.equal(log.children[1].children.length,1,'deleted water record disappears immediately');
 // The second deletion empties the actual drink list, without phantom reset events.
 log.children[1].children[0].children[1].children[1].events.click();
 log=root.children[0];
 assert.equal(log.children[0].children[1].textContent,'0 ml');
 assert.equal(log.children[1].children.length,1);
 assert.equal(log.children[1].children[0].tag,'p','empty message instead of stale logs');
 assert.equal(dataset.entries.filter(e=>!e.deleted&&Number.isFinite(e.volumeMl)).length,0);
 // A profile/date change starts collapsed even if prior profile stayed open.
 active='monika';
 render();
 assert.equal(root.children[0].open,false);
 active='zsolt';date='2026-11-18';
 render();
 assert.equal(root.children[0].open,false);
});
test('existing full diary soft-delete and sync remain the source of truth',()=>{
 assert.match(source,/row\.deleted=true;row\.updatedAt=stamp\(\)/);
 assert.match(source,/d\.entries\.find\(x=>x\.id===e\.id\)/);
 assert.match(source,/function update\(fn\)\{const k=active,d=read\(k\);fn\(d\);write\(k,d\);\}/);
 assert.match(source,/function write\(profile,doc\)/);
 assert.match(source,/queueSync\(profile\)/);
 assert.doesNotMatch(excerpt,/jarEvents\(active\)/,'reset actions never appear as drinking records');
});
