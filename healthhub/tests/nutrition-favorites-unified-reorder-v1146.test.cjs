'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../nutrition');
const order=require(path.join(root,'hh-favorites-order-v1146.js'));
const wheel=fs.readFileSync(path.join(root,'hh-quick-recipe-wheel-v635.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const shared=(name,id,rank)=>({id:'quick:shared-f-'+id,shared:true,sharedFoodId:'f-'+id,
  name,order:rank,updatedAt:'2026-11-08T00:00:00Z'});
const personal=(name,id,rank)=>({id:'quick:'+id,name,order:rank});
const base=[
 shared('New Recipe','12345678',null),
 shared('Older Recipe','abcdef12',10),
 personal('Cappuccino','cappuccino',20),
 personal('Banán','banana',30),
];
test('Legacy favourites retain original shared-first and personal order until a cross-group move',()=>{
 const before=order.ordered(base,['quick:banana','quick:cappuccino']);
 assert.deepEqual(before.map(x=>x.name),[
  'Older Recipe','New Recipe','Banán','Cappuccino'
 ]);
 assert.deepEqual(base.map(x=>x.name),[
  'New Recipe','Older Recipe','Cappuccino','Banán'
 ]);
});
test('Recently added shared recipe can cross personal recipe boundary in both directions',()=>{
 const previous=order.ordered(base,[]);
 assert.deepEqual(previous.map(x=>x.name),[
  'Older Recipe','New Recipe','Cappuccino','Banán'
 ]);
 const first=order.move(previous,1,1);
 assert.equal(first.crossesBoundary,true);
 assert.deepEqual(first.ids,[previous[0].id,previous[2].id,previous[1].id,previous[3].id]);
 let saved=order.ordered(base,first.ids);
 assert.deepEqual(saved.map(x=>x.name),[
  'Older Recipe','Cappuccino','New Recipe','Banán'
 ]);
 const second=order.move(saved,2,-1);
 assert.equal(second.crossesBoundary,true);
 saved=order.ordered(base,second.ids);
 assert.deepEqual(saved.map(x=>x.name),[
  'Older Recipe','New Recipe','Cappuccino','Banán'
 ]);
});
test('Persisted mixed order survives reloading, and newly added recipes get appended',()=>{
 const saved=order.move(order.ordered(base,[]),1,1);
 const fresh=shared('Later recipe','feebda99',null);
 const next=order.ordered([...base,fresh],saved.ids);
 assert.deepEqual(next.slice(0,4).map(x=>x.id),saved.ids);
 assert.equal(next[4].id,fresh.id);
 const again=order.move(next,4,-1);
 assert.ok(again);
 assert.equal(order.ordered([...base,fresh],again.ids)[3].id,fresh.id);
});
test('Single-type swaps continue to work and keep historical cloud shared ordering',()=>{
 const visible=order.ordered(base,[]);
 const swap=order.move(visible,0,1);
 assert.ok(swap);
 assert.equal(swap.crossesBoundary,false);
 assert.equal(swap.ids[0],visible[1].id);
 assert.equal(swap.ids[1],visible[0].id);
});
test('Invalid moves and malicious IDs do not mutate the supplied favourites',()=>{
 assert.equal(order.move(base,-1,1),null);
 assert.equal(order.move(base,0,-1),null);
 assert.equal(order.move(base,3,1),null);
 assert.equal(order.move(base,0,0),null);
 assert.equal(order.move([...base,{id:'../../secrets'}],0,1),null);
 assert.equal(order.move([base[0],base[0]],0,1),null);
 assert.deepEqual(base.map(x=>x.name),[
  'New Recipe','Older Recipe','Cappuccino','Banán'
 ]);
});
test('Nutrition editor is wired to unified ordering, serializes saves and preserves list scroll',()=>{
 assert.match(wheel,/HH_NUTRITION_FAVORITES_ORDER_V1146/);
 assert.match(wheel,/order\.ordered\(base,stored\)/);
 assert.match(wheel,/const profileOrder=unifiedOrder\|\|move\.crossesBoundary/);
 assert.match(wheel,/if\(editSaving\|\|orderSaving\)return/);
 assert.match(wheel,/orderSaving=true/);
 assert.match(wheel,/querySelectorAll\('\.hh-quick-move'\)\.forEach\(x=>x\.disabled=true\)/);
 assert.match(wheel,/api\.reorderRecipes\(move\.ids\)/);
 assert.match(wheel,/await window\.HH_SHARED_FOOD_LIBRARY_V1118\.reorderFavorites\(ids\)/);
 assert.match(wheel,/showEditor\(item\.id,false,true\)/);
 assert.match(wheel,/if\(preserveScroll\)library\.scrollTop=oldListScroll/);
 assert.doesNotMatch(wheel,/btn\.disabled=from\+dir<0\|\|from\+dir>=group\.length/);
 const helper=html.indexOf('hh-favorites-order-v1146.js');
 const wheelScript=html.indexOf('hh-quick-recipe-wheel-v635.js');
 assert.ok(helper>0&&wheelScript>helper);
 assert.match(html,/hh-quick-recipe-wheel-v635\.js\?v=114(?:6-unified-reorder-scroll|7-favorite-create-launch)/);
});
