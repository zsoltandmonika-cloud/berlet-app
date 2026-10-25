const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const hub = path.resolve(__dirname, '..', '..');
const read = relative => fs.readFileSync(path.join(hub, relative), 'utf8');
const nutrition = read('nutrition/nutrition-cloud-v626.js');
const nutritionPage = read('nutrition/index.html');
const healthVault = read('live-v161.js');

function fixture() {
  const values = new Map();
  const tokenKey = 'hh-dropbox-token-v2';
  values.set(tokenKey, JSON.stringify({refresh_token:'fixture-refresh',access_token:'old-access',expires_at:0}));
  let refreshes = 0;
  let completeRefresh;
  let unblockRefresh = new Promise(resolve => { completeRefresh = resolve });
  const localStorage = {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key)
  };
  const fetch = async url => {
    if(String(url).includes('/oauth2/token')){
      ++refreshes;
      await unblockRefresh;
      return {ok:true,json:async()=>({access_token:'new-access',expires_in:14400})};
    }
    return {ok:false,status:409,json:async()=>({error_summary:'path/not_found/fixture'})};
  };
  const context = {window:{},localStorage,fetch,URLSearchParams,Date,console};
  vm.runInNewContext(nutrition,context,{filename:'nutrition-cloud-v626.js'});
  return {
    cloud:context.window.HH_NUTRITION_CLOUD_V626,
    localStorage,tokenKey,
    get refreshes(){return refreshes},
    release:()=>completeRefresh()
  };
}

test('two concurrent Nutrition sync readers refresh Dropbox token only once',async()=>{
  const f=fixture();
  const first=f.cloud.download('zsolt');
  const second=f.cloud.download('zsolt');
  assert.equal(f.refreshes,1);
  f.release();
  const results=await Promise.all([first,second]);
  assert.equal(results.length,2);
  assert.equal(f.refreshes,1);
  assert.equal(JSON.parse(f.localStorage.getItem(f.tokenKey)).access_token,'new-access');
});

test('pending OAuth refresh cannot resurrect disconnected Dropbox account',async()=>{
  const f=fixture();
  const pending=f.cloud.download('monika');
  f.localStorage.removeItem(f.tokenKey);
  f.release();
  await assert.rejects(pending,/munkamenet|kapcsolat/i);
  assert.equal(f.localStorage.getItem(f.tokenKey),null);
});

test('inlined Nutrition Cloud and HealthHub Vault both use guarded single-flight',()=>{
  assert.match(nutritionPage,/let tokenRefreshInFlight=null;/);
  assert.match(nutritionPage,/latest\.refresh_token!==t\.refresh_token/);
  assert.match(healthVault,/var tokenRefreshInFlight=null;/);
  assert.match(healthVault,/latest\.refresh_token!==current\.refresh_token/);
  assert.doesNotMatch(healthVault,/clearToken\(\);\s*return.*Dropbox token frissítési hiba/);
});
