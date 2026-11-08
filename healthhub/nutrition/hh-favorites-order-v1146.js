/* Nutrition favorites order v1146: pure ordering rules for household/shared
 * and profile recipes. No network, writes, or changes to recipe/diary content.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HH_NUTRITION_FAVORITES_ORDER_V1146=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const isShared=q=>!!q?.shared;
 const validId=id=>typeof id==='string'&&/^quick:[a-z0-9_-]{1,80}$/i.test(id);
 function ordered(base,stored){
  if(!Array.isArray(base))return [];
  const ids=Array.isArray(stored)?stored.filter(validId):[];
  const pos=new Map(ids.map((id,i)=>[id,i]));
  const unified=ids.some(id=>id.startsWith('quick:shared-'));
  const sharedRank=q=>q.order==null?1e6:Number(q.order);
  return base.slice().sort((a,b)=>{
   // Opt-in migration: existing profile order containing ONLY personal IDs
   // still sees shared favourites first and preserves the shared Dropbox order.
   if(unified){
    const ax=pos.has(a.id)?pos.get(a.id):Infinity;
    const bx=pos.has(b.id)?pos.get(b.id):Infinity;
    if(ax!==bx)return ax-bx;
   }
   if(isShared(a)!==isShared(b))return isShared(a)?-1:1;
   if(isShared(a)&&isShared(b)){
    return sharedRank(a)-sharedRank(b)||
     String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||
     String(a.id).localeCompare(String(b.id));
   }
   if(ids.length&&!unified){
    const ax=pos.has(a.id)?pos.get(a.id):10000+(Number(a.order)||500);
    const bx=pos.has(b.id)?pos.get(b.id):10000+(Number(b.order)||500);
    return ax-bx||String(a.name||'').localeCompare(String(b.name||''),'hu');
   }
   return (Number(a.order)||500)-(Number(b.order)||500)||
    String(a.name||'').localeCompare(String(b.name||''),'hu');
  });
 }
 function move(items,index,delta){
  if(!Array.isArray(items)||items.length>250||
    !Number.isInteger(index)||![-1,1].includes(delta))return null;
  const target=index+delta;
  if(index<0||target<0||target>=items.length)return null;
  const ids=items.map(x=>x?.id);
  if(ids.some(id=>!validId(id))||new Set(ids).size!==ids.length)return null;
  [ids[index],ids[target]]=[ids[target],ids[index]];
  return {ids,target,crossesBoundary:!!items[index]?.shared!==!!items[target]?.shared};
 }
 return {ordered,move};
});
