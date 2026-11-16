'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const cacheJS=read('recepttar-studio/recipe-asset-cache-v1.js');
const app=read('recepttar-studio/app.js');
const html=read('recepttar-studio/index.html');
const monitorJS=read('sh9/local-storage/local-storage-monitor-v1.js');
const monitorHTML=read('sh9/local-storage/index.html');
function indexedDBMock(){
 const stores=new Map();
 function fakeDB(name){
  const data=stores.get(name)||new Map();
  if(!stores.has(name))stores.set(name,data);
  return {
   objectStoreNames:{contains:n=>data.has(n)},
   createObjectStore(n){data.set(n,new Map())},
   transaction(store){
    const tr={};
    tr.objectStore=()=>({
     get(key){return request(()=>data.get(store).get(key))},
     put(row){return request(()=>{data.get(store).set(row.key,row);return row.key})},
     getAll(){return request(()=>[...data.get(store).values()])},
     delete(key){return request(()=>data.get(store).delete(key))}
    });
    function request(fn){
     const r={};
     queueMicrotask(()=>{
      try{r.result=fn();r.onsuccess?.();queueMicrotask(()=>tr.oncomplete?.())}
      catch(e){r.error=e;r.onerror?.();tr.onerror?.()}
     });
     return r;
    }
    return tr;
   },close(){}
  };
 }
 return {
  open(name){
   const r={};r.result=fakeDB(name);
   queueMicrotask(()=>{
    if(!r.result.objectStoreNames.contains('assets'))r.onupgradeneeded?.();
    r.onsuccess?.();
   });
   return r;
  }
 };
}
test('Recipe Studio V1 loads new cache before app, preserving original cards and Nutri components',()=>{
 assert.ok(html.indexOf('recipe-asset-cache-v1.js')>0);
 assert.ok(html.indexOf('recipe-asset-cache-v1.js')<html.indexOf('app.js?v=1154'));
 assert.match(html,/hh-puter-credit-gate-v1159\.js/);
 assert.match(html,/hh-nutrition-export-v1154\.js/);
 assert.match(html,/hh-nutri-golden-standard-v1155\.js/);
 assert.match(app,/await loadCustomRecipes\(\);\s*openInitialRoute\(true\);[\s\S]*await loadSharedRecipes\(\)/);
 assert.match(app,/categoryConfig=categoryConfigLocal\(\)/);
});
test('Only verified Puter user owns cached cards, no cross-account image leak or API keys',async()=>{
 const context={window:{},indexedDB:indexedDBMock(),Blob,Date,setTimeout,clearTimeout,console};
 vm.runInNewContext(cacheJS,context);
 const cache=context.window.LENA_RECIPE_ASSET_CACHE_V1;
 const row={id:'recipe1',title:'Tesztrecept',cardPath:'some-private-path',updatedAt:'2026-11-16T11:00:00Z'};
 const blob=new Blob(['123'],{type:'image/jpeg'});
 assert.equal(await cache.put('user-A',row,blob),true);
 assert.equal((await cache.get('user-A',row)).size,3);
 assert.equal(await cache.get('user-B',row),null);
 assert.equal(await cache.get('user-A',{...row,updatedAt:'2026-11-16T12:00:00Z'}),null);
 assert.equal(await cache.get('user-A',{...row,id:'another'}),null);
 assert.doesNotMatch(cacheJS,/\bfetch\s*\(|puter\.fs\.read\s*\(|\.kv\./);
 assert.doesNotMatch(cacheJS,/localStorage\s*\.|access_token|refresh_token|client_secret|service_role/);
});
test('Metadata index is account-scoped and refreshed only when stale',async()=>{
 const context={window:{},indexedDB:indexedDBMock(),Blob,Date,setTimeout,clearTimeout,console};
 vm.runInNewContext(cacheJS,context);
 const cache=context.window.LENA_RECIPE_ASSET_CACHE_V1;
 await cache.saveCatalogue('one-user',[{id:'one',title:'Recept',category:'Leves',cardPath:'path',updatedAt:'new'}]);
 const a=await cache.catalogue('one-user');
 assert.equal(a.rows.length,1);assert.equal(a.rows[0].title,'Recept');
 assert.equal(cache.fresh(a),true);
 assert.equal(await cache.catalogue('other-user'),null);
 assert.equal(cache.fresh({...a,checkedAt:Date.now()-16*60*1000}),false);
});
test('Downloads only missing/changed recipe pictures and explicit manual sync bypasses TTL',()=>{
 assert.match(app,/let blob=account\?await RECIPE_ASSET_CACHE_V1\?\.get\(account,v\):null/);
 assert.match(app,/if\(!blob&&!offlineOnly\)/);
 assert.match(app,/blob=await puter\.fs\.read\(v\.cardPath\)/);
 assert.match(app,/await RECIPE_ASSET_CACHE_V1\?\.put\(account,v,blob\)/);
 assert.match(app,/if\(!force&&cached&&RECIPE_ASSET_CACHE_V1\?\.fresh\(cached\)/);
 assert.match(app,/async function refreshSharedRecipes\(render=true,force=false\)/);
 assert.match(app,/await refreshSharedRecipes\(true,true\)/);
 assert.match(app,/Date\.now\(\)-__lastCentralRefresh>15\*60\*1000/);
 assert.match(cacheJS,/LIMIT=250\*1024\*1024/);
 assert.match(cacheJS,/if\(trimTimer\)clearTimeout\(trimTimer\)/);
});
test('Local Storage Monitor has two measured recipe card-size counters without exposing personal contents',()=>{
 assert.match(monitorHTML,/id="recipeLocalUsage"/);
 assert.match(monitorHTML,/id="recipeCloudCacheUsage"/);
 assert.match(monitorJS,/async function measureRecipes\(indexedDB\)/);
 assert.match(monitorJS,/lena-recepttar-studio-preview/);
 assert.match(monitorJS,/lena-recept-studio-asset-cache-v1/);
 assert.match(monitorJS,/row\.blob\?\.size/);
 assert.match(monitorJS,/safeSize\(row\.bytes\)/);
 assert.doesNotMatch(monitorJS,/(?:await|return)\s+[^;\n]*\.arrayBuffer\(/);
 assert.match(monitorHTML,/Modulonkénti mérés még nincs bekötve/);
});
test('New and updated scripts parse without browser dependencies on Node',()=>{
 for(const source of [cacheJS,app,monitorJS])assert.doesNotThrow(()=>new vm.Script(source));
});
