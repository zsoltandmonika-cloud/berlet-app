'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const home=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
test('SH9 core modules are genuine first-party HTTPS links, not JS-only buttons',()=>{
 for(const [name,href] of [
  ['HealthHub','../healthhub/'],
  ['Family Guard','../healthhub/guardian/'],
  ['Smart Travel','./smart-travel/']]){
  const attr='<a class="tile" href="'+href+'" data-name="'+name+'"';
  assert.ok(home.includes(attr),name+' must have an HTML fallback hyperlink');
  assert.ok(!home.includes('<button class="tile" type="button" data-name="'+name+'"'),name+' cannot depend on script click handler');
 }
});
test('Native fallback link visuals and default navigation stay enabled when JS runs',()=>{
 assert.match(home,/\.wrap \.grid>a\.tile\{text-decoration:none;color:inherit\}/);
 assert.match(home,/if\(b\.tagName==='A'&&b\.hasAttribute\('href'\)\)return;/);
 assert.match(home,/data-name="Entertainment"/);
 assert.match(home,/data-name="Ask Léna"/);
 assert.match(home,/sh9-ota-indicator-v1043\.js/);
});
