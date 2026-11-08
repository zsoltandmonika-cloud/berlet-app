'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const script=get('hh-favorites-search-v1172.js');
class Node{
 constructor(tag='',id=''){this.tagName=tag;this.id=id;this.listeners={};this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.value='';this.textContent='';this.className='';this.selected=false;}
 addEventListener(name,fn){this.listeners[name]=fn}
 emit(name,event={}){this.listeners[name]?.({target:this,...event})}
 replaceChildren(...items){this.children=items}
 append(...items){this.children.push(...items)}
 setAttribute(name,value){this.attrs[name]=value}
 removeAttribute(name){delete this.attrs[name]}
 blur(){this.blurred=true}
 querySelectorAll(selector){
  if(selector==='.hh-quick-card[data-id]')return this.cards||[];
  if(selector==='[role="option"]')return this.children.filter(x=>x.role==='option');
  return [];
 }
 querySelector(selector){
  if(selector==='.hh-quick-card-info strong')return {textContent:this.name||''};
  if(selector==='.hh-quick-card-info small')return {textContent:this.description||''};
  return null;
 }
}
function setup({speech}={}){
 const names=['hhQuickDialog','hhQuickShell','hhQuickRail','hhQuickFavoriteSearchV1172','hhQuickFavoriteSuggestionsV1172','hhQuickFavoriteMicV1172','hhQuickFavoriteSearchStatusV1172'];
 const els=Object.fromEntries(names.map(n=>[n,new Node('div',n)]));
 els.hhQuickDialog.open=true;els.hhQuickShell.dataset.mode='wheel';
 els.hhQuickRail.cards=[
  {dataset:{id:'penne'},name:'Penne Carbonara',description:'Közös · Tészta'},
  {dataset:{id:'soup'},name:'Húsleves',description:'Közös · Leves'},
  {dataset:{id:'coffee'},name:'Cappuccino',description:'Kávé'},
 ].map(x=>Object.assign(new Node('button'),x));
 const chosen=[],notes=[];
 const d={getElementById:id=>els[id],createElement:tag=>new Node(tag),listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn}};
 const w={HH_NUTRITION_FAVORITES_WHEEL_NAV_V1172:{select:id=>(chosen.push(id),true)},
  SpeechRecognition:speech};
 const MutationObserver=class{observe(){}};
 vm.runInNewContext(script,{window:w,document:d,MutationObserver});
 return {w,d,els,chosen,notes};
}
test('predictive search matches accents and partial recipe titles without cloud calls',()=>{
 const x=setup(),find=x.w.HH_NUTRITION_FAVORITES_SEARCH_V1172.find;
 assert.equal(find('carb')[0].id,'penne');
 assert.equal(find('husleves')[0].id,'soup');
 assert.equal(find('káv')[0].id,'coffee');
 assert.equal(find('  CAPPU  ')[0].id,'coffee');
 assert.equal(find('leves')[0].id,'soup');
 assert.equal(find('not-here').length,0);
});
test('Enter and arrow keys jump to a card but never write into the diary',()=>{
 const x=setup(),input=x.els.hhQuickFavoriteSearchV1172;
 input.value='c';input.emit('input');
 assert.equal(x.els.hhQuickFavoriteSuggestionsV1172.hidden,false);
 let stopped=false;
 input.emit('keydown',{key:'Enter',preventDefault(){stopped=true}});
 assert.equal(stopped,true);
 assert.equal(x.chosen[0],'coffee');
 assert.equal(x.els.hhQuickFavoriteSuggestionsV1172.hidden,true);
 assert.equal(x.els.hhQuickFavoriteSearchStatusV1172.textContent.includes('Kész gombot'),true);
});
test('close clears search, and screen reader combobox stays consistent',()=>{
 const x=setup(),input=x.els.hhQuickFavoriteSearchV1172;
 input.value='hús';input.emit('input');
 assert.equal(input.attrs['aria-expanded'],'true');
 x.els.hhQuickDialog.emit('close');
 assert.equal(input.value,'');
 assert.equal(input.attrs['aria-expanded'],'false');
});
test('microphone degrades gracefully when speech recognition is unavailable',()=>{
 const x=setup(),mic=x.els.hhQuickFavoriteMicV1172;
 mic.emit('click');
 assert.match(x.els.hhQuickFavoriteSearchStatusV1172.textContent,/nem támogatott/);
 assert.equal(x.chosen.length,0);
});
test('architecture preserves existing carousel and food photo/save paths',()=>{
 const html=get('index.html'),wheel=get('hh-quick-recipe-wheel-v635.js'),css=get('hh-favorites-search-v1172.css');
 assert.match(html,/id="hhQuickFavoriteSearchV1172"/);
 assert.match(html,/id="hhQuickFavoriteMicV1172"/);
 assert.match(html,/hh-favorites-search-v1172\.js\?v=1172-predictive-voice/);
 assert.match(html,/hh-quick-recipe-wheel-v635\.js\?v=1148-favorite-scan-bridge/);
 assert.match(wheel,/window\.HH_NUTRITION_FAVORITES_WHEEL_NAV_V1172=Object\.freeze/);
 assert.match(wheel,/selection=next;selectUI\(\);centerCard\(next,true\)/);
 assert.doesNotMatch(script,/recordRecipe|recordSelected\(|Dropbox|fetch\(|saveRecipe\(/);
 assert.match(css,/hh-quick-search-v1172/);
});
