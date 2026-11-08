'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const source=read('hh-diary-favorites-art-v1150.js'),
 css=read('hh-diary-favorites-art-v1150.css'),
 core=read('nutrition-preview-v592.js'),html=read('index.html');
class El{
 constructor(tag){
  this.tagName=tag;this.children=[];this.parentNode=null;this.dataset={};
  this.attributes={};this.className='';this.textContent='';this.isConnected=true;
  this.classList={add:name=>this.className+=' '+name};
 }
 get firstChild(){return this.children[0]||null}
 append(...nodes){
  for(const child of nodes){
   if(child.parentNode)child.remove();
   child.parentNode=this;this.children.push(child);
  }
 }
 remove(){
  if(!this.parentNode)return;
  this.parentNode.children=this.parentNode.children.filter(x=>x!==this);
  this.parentNode=null;
 }
 setAttribute(name,value){this.attributes[name]=value}
 querySelector(selector){
  const match=n=>selector==='strong'?n.tagName==='strong':
   selector.startsWith('.')?n.className.split(/\s+/).includes(selector.slice(1)):false;
  const pending=[...this.children];
  while(pending.length){const next=pending.shift();if(match(next))return next;pending.unshift(...next.children)}
  return null;
 }
}
function setup({shared=[],profile='zsolt',vault={}}={}){
 let currentProfile=profile,items=shared;
 const listeners={},frames=[],calls=[];
 const window={
  HH_NUTRITION_QUICK_API:{getProfile:()=>currentProfile},
  HH_SHARED_FOOD_LIBRARY_V1118:{getItems:()=>items,load:async()=>items},
  HH_NUTRITION_IMAGE_V641:{
   refValid:(scope,ref)=>{calls.push('check:'+scope);return ref?.sha256==='a'.repeat(64)},
   load:(scope,ref)=>{calls.push('load:'+scope);return vault.load?vault.load(scope,ref):Promise.resolve('blob:favorite-photo')}
  },
  addEventListener:(event,callback)=>listeners[event]=callback
 };
 const document={
  createElement:tag=>{
   const node=new El(tag);if(tag==='span')frames.push(node);return node;
  },
  querySelectorAll:selector=>{
   if(selector!=='.hh-diary-fav-frame-v1150[data-shared-id]')return [];
   return frames.filter(f=>f.className.includes('hh-diary-fav-frame-v1150')&&f.dataset.sharedId);
  }
 };
 vm.runInNewContext(source,{window,document});
 return {api:window.HH_NUTRITION_DIARY_FAVORITE_ART_V1150,
  listeners,calls,window,document,setShared:x=>items=x,setProfile:x=>currentProfile=x};
}
const entry=(id='quick:coffee')=>({id:'row1',name:'Reggeli cappuccino',icon:'☕',
 quickRecipeId:id,foodId:id});
test('Only recorded Favorites and own foods with a saved photo qualify',()=>{
 const {api}=setup();
 const own={quickRecipes:[{id:'quick:coffee',icon:'☕',image:'data:image/jpeg;base64,aGVsbG8=',theme:'coffee'}],
  catalog:[{id:'user:banana',imageRef:{sha256:'a'.repeat(64)}}]};
 assert.equal(api.resolve(entry(),own).kind,'favorite');
 assert.equal(api.resolve(entry(),own).theme,'coffee');
 assert.equal(api.resolve(entry('quick:missing'),own).icon,'☕');
 assert.equal(api.resolve({foodId:'user:banana'},own).kind,'personal-food');
 assert.equal(api.resolve({foodId:'user:no-photo'},own),null);
 assert.equal(api.resolve({foodId:'water',name:'Víz'},own),null);
 assert.equal(api.resolve({foodId:'ai-vision:42',name:'Felismerés'},own),null);
 assert.equal(api.resolve({foodId:'manual:42',name:'Kézi'},own),null);
});
test('Share links are resolved by exact shared ID, not ambiguous recipe names',()=>{
 const {api}=setup();
 const id='f-1234567890';
 const rows=[{id,name:'Pirított szendvics',imageRef:{sha256:'a'.repeat(64)},kind:'food'}];
 const found=api.resolve(entry('quick:shared-'+id),{},rows);
 assert.equal(found.scope,'shared');assert.equal(found.sourceId,id);
 assert.equal(found.imageRef.sha256,'a'.repeat(64));
 assert.equal(api.resolve(entry('quick:shared-f-different'),{},rows).imageRef,null);
});
test('Mini card preserves text and renders inline Favorite image with scaled frame',()=>{
 const {api}=setup();
 const left=new El('div'),name=new El('strong'),small=new El('small');
 name.textContent='☕ Reggeli cappuccino';small.textContent='08:34 · becsült';left.append(name,small);
 const data={quickRecipes:[{id:'quick:coffee',name:'Reggeli cappuccino',
  image:'data:image/jpeg;base64,aGVsbG8=',theme:'coffee',icon:'☕'}]};
 api.attach(left,entry(),'zsolt',data);
 assert.match(left.className,/hh-diary-fav-row-v1150/);
 assert.equal(left.children.length,2);
 const frame=left.children[0],copy=left.children[1];
 assert.match(frame.className,/hh-diary-fav-frame-v1150/);
 assert.equal(frame.dataset.theme,'coffee');
 assert.equal(frame.attributes['aria-hidden'],'true');
 assert.equal(copy.querySelector('strong').textContent,'Reggeli cappuccino');
 assert.equal(copy.querySelector('small').textContent,'08:34 · becsült');
 assert.equal(frame.querySelector('.hh-diary-fav-photo-v1150').src,'data:image/jpeg;base64,aGVsbG8=');
 assert.equal(frame.querySelector('.hh-diary-fav-photo-v1150').loading,'lazy');
});
test('Cloud photos resolve from existing image vault; do not display on wrong profile',async()=>{
 const ref={sha256:'a'.repeat(64)};
 let finish;
 const vault={load:()=>new Promise(resolve=>{finish=resolve})};
 const env=setup({vault});
 const left=new El('div');left.append(new El('strong'),new El('small'));
 const data={quickRecipes:[{id:'quick:coffee',imageRef:ref}]};
 env.api.attach(left,entry(),'zsolt',data);
 assert.deepEqual(env.calls,['check:zsolt','load:zsolt']);
 env.setProfile('monika');finish('blob:zsolt-sensitive');
 await Promise.resolve();await Promise.resolve();
 assert.equal(left.children[0].querySelector('.hh-diary-fav-photo-v1150'),null,
  'old-profile image must never appear after profile switch');
});
test('Shared food changes update visible photo only, avoiding a diary rerender',async()=>{
 const id='f-1234567890',ref={sha256:'a'.repeat(64)};
 const env=setup({shared:[{id,name:'Szendvics',imageRef:null}]});
 const left=new El('div');left.append(new El('strong'),new El('small'));
 env.api.attach(left,entry('quick:shared-'+id),'zsolt',{});
 const frame=left.children[0];
 assert.equal(frame.dataset.sharedId,id);
 assert.equal(frame.querySelector('.hh-diary-fav-photo-v1150'),null);
 env.setShared([{id,name:'Szendvics',imageRef:ref}]);
 env.listeners['healthhub:shared-foods-updated']();
 await Promise.resolve();await Promise.resolve();
 assert.equal(frame.querySelector('.hh-diary-fav-photo-v1150').src,'blob:favorite-photo');
 assert.deepEqual(env.calls.filter(x=>x==='load:shared'),['load:shared']);
 env.listeners['healthhub:shared-foods-updated']();
 assert.deepEqual(env.calls.filter(x=>x==='load:shared'),['load:shared']);
});
test('Production markup and diary renderer are wired to existing source IDs, never saving images',()=>{
 assert.match(core,/HH_NUTRITION_DIARY_FAVORITE_ART_V1150\?\.attach\?\.\(left,e,active,d\)/);
 assert.match(core,/quickRecipeId:recipe\.id/);
 assert.match(core,/foodId:recipe\.id/);
 assert.match(html,/hh-diary-favorites-art-v1150\.css\?v=1150-profile-mini-frame/);
 assert.match(html,/hh-diary-favorites-art-v1150\.js\?v=1150-profile-photo-lookup/);
 assert.match(html,/nutrition-preview-v592\.js\?v=1150-diary-favorites-mini-art/);
 assert.ok(html.indexOf('hh-diary-favorites-art-v1150.js')<html.indexOf('nutrition-preview-v592.js'));
 assert.match(css,/width:52px;height:52px/);
 assert.match(css,/var\(--accent\)/);
 assert.match(css,/var\(--accentWash\)/);
 assert.match(css,/object-fit:cover/);
 assert.match(css,/@media\(max-width:490px\)/);
 assert.doesNotMatch(source,/recordAiMeal|recordManualMeal|recordRecipe\(|upload|putImage|generateCardImage|\.ai\.chat|\.ai\.txt2img|fetch\(/);
 new vm.Script(source);
 new vm.Script(core);
});
