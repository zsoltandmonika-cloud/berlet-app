'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'live-v364-history.js'),'utf8');
const enhancer=fs.readFileSync(path.join(root,'ask-lena-chat-enhance-v566.js'),'utf8');
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
class Element{
 constructor(tag){this.tag=tag;this.className='';this.children=[];this.parentNode=null;
  this.dataset={};this.style={display:''};this._text='';this.scrollTop=0;this.hidden=false;this.id='';}
 set textContent(value){this._text=String(value);for(const x of this.children)x.parentNode=null;this.children=[]}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('')}
 append(...nodes){for(const n of nodes)this.appendChild(n)}
 appendChild(node){if(node.parentNode)node.remove();this.children.push(node);node.parentNode=this;return node}
 insertBefore(node,before){if(node===before)return node; if(node.parentNode)node.remove();
  let i=before?this.children.indexOf(before):-1;if(i<0)i=this.children.length;
  this.children.splice(i,0,node);node.parentNode=this;return node}
 remove(){if(this.parentNode){let i=this.parentNode.children.indexOf(this);if(i>=0)this.parentNode.children.splice(i,1);this.parentNode=null}}
 matches(selector){
  if(selector.startsWith('#'))return this.id===selector.slice(1);
  if(selector.startsWith('.hhHistRow364'))return this.className.split(' ').includes('hhHistRow364')
   &&(!selector.includes('[data-history-id]')||Boolean(this.dataset.historyId));
  if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));
  return this.tag===selector;
 }
 querySelectorAll(selector){
  const rows=[];for(const x of this.children){
   if(x.matches(selector))rows.push(x);
   rows.push(...x.querySelectorAll(selector));
  }return rows;
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
}
function harness(){
 let current='monika',calls=0;
 const box=new Element('section'),state={monika:{updatedAt:'2026-10-19T15:00:00Z'},
  zsolt:{updatedAt:'2026-10-19T15:00:00Z'}};
 const rows={monika:[
  {id:'a',question:'Mónika leletek',generatedAt:'2026-10-17T12:00:00Z'},
  {id:'b',question:'Alvásom',generatedAt:'2026-10-18T10:00:00Z'}],
  zsolt:[{id:'c',question:'Zsolt aktivitás',generatedAt:'2026-10-18T15:00:00Z'}]};
 const first=src.indexOf('function historyRow('),last=src.indexOf('async function sync(p,manual){',first);
 assert.ok(first>=0&&last>first);
 const ctx=vm.createContext({document:{createElement:t=>new Element(t),getElementById:()=>null},
  window:{},mount:()=>box,profile:()=>current,entries:p=>rows[p],state:p=>state[p],
  connected:()=>true,dateKey:x=>String(x).slice(0,10),sync:()=>calls++,Set,Map,JSON,Array,String});
 vm.runInContext(src.slice(first,last)+'\nthis.renderTest=render;',ctx);
 return{render:()=>ctx.renderTest(),box,rows,state,setProfile:p=>{current=p},get syncCalls(){return calls}};
}
test('cloud history keeps outer card, search field and both rows when sync status changes',()=>{
 assert.doesNotThrow(()=>new Function(src));
 const q=harness();q.render();
 const list=q.box.querySelector('.hhHistList364'),originalRows=list.querySelectorAll('.hhHistRow364');
 assert.equal(originalRows.length,2);
 const search=new Element('input');search.id='hhChat566Search';search.value='leletek';
 q.box.appendChild(search);list.scrollTop=87;
 q.state.monika.updatedAt='2026-10-19T15:01:00Z';q.render();
 assert.strictEqual(q.box.querySelector('.hhHistList364'),list);
 assert.deepEqual(list.querySelectorAll('.hhHistRow364'),originalRows);
 assert.strictEqual(q.box.querySelector('#hhChat566Search'),search);
 assert.equal(list.scrollTop,87);
 assert.equal(q.box.querySelector('.hhHistStatus364').textContent.includes('2026-10-19'),true);
});
test('append only changed history row, maintain older node identity, filters and scroll',()=>{
 const h=harness();h.render();const list=h.box.querySelector('.hhHistList364');
 const prev=list.querySelectorAll('.hhHistRow364');list.scrollTop=55;
 const search=new Element('input');search.id='hhChat566Search';search.value='leletek';h.box.append(search);
 h.rows.monika.unshift({id:'d',question:'Labor',generatedAt:'2026-10-19T15:00:00Z'});
 h.render();
 const now=list.querySelectorAll('.hhHistRow364');
 assert.equal(now.length,3);
 assert.strictEqual(now[1],prev[0]);assert.strictEqual(now[2],prev[1]);
 assert.equal(list.scrollTop,55);
 assert.equal(now[0].hidden,true);
 assert.equal(now[1].hidden,false);
});
test('profile switching replaces only out-of-profile rows and never overwrites questions',()=>{
 const h=harness();h.render();h.setProfile('zsolt');h.render();
 const list=h.box.querySelector('.hhHistList364');
 const rendered=list.querySelectorAll('.hhHistRow364');
 assert.equal(rendered.length,1);
 assert.equal(rendered[0].textContent.includes('Zsolt aktivitás'),true);
 assert.equal(rendered[0].textContent.includes('Mónika'),false);
 h.setProfile('monika');h.render();
 assert.equal(list.querySelectorAll('.hhHistRow364').length,2);
});
test('stable renders use no destructive list innerHTML, replaceChildren or reload',()=>{
 const first=src.indexOf('function historyRow('),last=src.indexOf('async function sync(p,manual){',first);
 const renderSource=src.slice(first,last);
 assert.doesNotMatch(renderSource,/box\.innerHTML|list\.innerHTML|list\.replaceChildren|location\.reload|location\.replace/);
 assert.match(renderSource,/if\(box\.dataset\.hhHistoryRenderSignature===signature\)return/);
 assert.match(renderSource,/if\(list\.children\[i\]!==row\)list\.insertBefore/);
 assert.match(renderSource,/if\(prevProfile===p\)list\.scrollTop=scroll/);
 assert.match(enhancer,/if\(row\.hidden!==hide\)row\.hidden=hide/);
});
test('repeated cloud merge with identical answer data does not rewrite local cache',()=>{
 const begin=src.indexOf('function write(p,arr){'),end=src.indexOf('function style(){',begin);
 assert.ok(begin>=0&&end>begin);
 let cache='',writes=0;
 const ctx=vm.createContext({STORE:'user-history-',MAX:60,JSON,Map,Array,Date,
  localStorage:{getItem:()=>cache,setItem(_,v){cache=v;writes++}},
  console});
 vm.runInContext(src.slice(begin,end)+'\nthis.save=write;',ctx);
 const row={id:'a',profile:'monika',question:'A',answer:'B',generatedAt:'2026-10-19T15:00:00Z'};
 ctx.save('monika',[row]);ctx.save('monika',[row]);ctx.save('monika',[row]);
 assert.equal(writes,1);
});
test('new Ask Léna quick question / catalog workflows never clear a stored history',()=>{
 assert.match(idx,/live-v364-history\.js\?v=697-completed-model-provenance/);
 assert.doesNotMatch(enhancer,/removeItem\(.*hh-ask-lena-history|clearProfile\(|deleteDatabase/);
});
