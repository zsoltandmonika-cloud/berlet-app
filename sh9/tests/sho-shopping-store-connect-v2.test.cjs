'use strict';
/* SHO Smart Shopping Store Connect V2 static contract regression. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'shopping','index.html'),'utf8');
const app=fs.readFileSync(path.join(base,'shopping','shopping.js'),'utf8');
const connect=fs.readFileSync(path.join(base,'shopping','store-connect-v2.js'),'utf8');
const css=fs.readFileSync(path.join(base,'shopping','store-connect-v2.css'),'utf8');
test('both JS modules parse without errors',()=>{new vm.Script(app);new vm.Script(connect)});
test('approved Hero and all six category assets stay present',()=>{
  assert.match(html,/hero-approved\.avif/);
  assert.equal((html.match(/class="cat (?:pink|blue|cyan|gold|magenta)"/g)||[]).length,6);
});
test('ten official merchant handoffs and separate product metadata source',()=>{
  for(const name of ['Tesco','Auchan','Kifli','dm','Rossmann','eMAG','Alza','Allegro','Temu','SHEIN'])assert.ok(connect.includes('name:"'+name+'"'),name);
  assert.match(connect,/google\.com\/search/);
  assert.match(connect,/sho-shopping-products-v1/);
  assert.match(connect,/prices/);
  assert.match(html,/külső webkeresést/i);
  assert.match(html,/Open Food Facts \(ODbL/);
});
test('real product handoff preserves basket operations and no artificial prices',()=>{
  assert.match(app,/window\.SHOPPING_V1=Object\.freeze/);
  assert.match(app,/barcode:code/);
  assert.match(app,/offers:\[\]/);
  assert.match(app,/SHOP_CONNECTORS_V2\.search\(code\)/);
  assert.match(connect,/SHOPPING_V1/);
});
test('visual-first cards retain authentic product photos and honest sorting',()=>{
 const visual=fs.readFileSync(path.join(base,'shopping','visual-cards-v3.css'),'utf8');
 assert.match(html,/visual-cards-v3\.css/);
 assert.match(html,/id="shoCatalogSort"/);
 assert.match(html,/value="priceAsc" disabled/);
 assert.match(html,/value="priceDesc" disabled/);
 assert.match(connect,/sho-product-visual/);
 assert.match(connect,/sho-store-brand/);
 assert.match(connect,/www\.google\.com\/s2\/favicons/);
 assert.match(connect,/sort==="popular"/);
 assert.match(connect,/state\.visible=6/);
 assert.match(connect,/sho-product-skeleton/);
 assert.match(visual,/\.sho-product-visual/);
 assert.match(visual,/\.sho-store-logo/);
});
test('scripts, slots and presentation are wired',()=>{
  for(const id of ['shoStoreConnect','shoStoreGrid','shoProducts','shoCatalogStatus','shoConnectMessage'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(html.indexOf('central-vault/config.js')<html.indexOf('shopping.js?v=shop-v2'));
  assert.ok(html.indexOf('shopping.js?v=shop-v2')<html.indexOf('store-connect-v2.js'));
  assert.match(css,/\.shop-connect/);
});