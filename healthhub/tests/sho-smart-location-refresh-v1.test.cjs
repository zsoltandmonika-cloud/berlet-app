'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../guardian/guardian-smart-match-pin-v1.mjs'),'utf8');
const key='sh9-smart-location-switch-v1-m';
const begin=src.indexOf('function restoreAutoEnabled('),end=src.indexOf('\nconst navigationType=',begin);
assert.ok(begin>=0&&end>begin);
const restore=new Function('AUTO_KEY',src.slice(begin,end)+'\nreturn restoreAutoEnabled;')(key);
function memory(initial){
 const m=new Map(initial===null?[]:[[key,initial]]);
 return {getItem:k=>m.get(k)??null,removeItem:k=>m.delete(k),setItem:(k,v)=>m.set(k,v)};
}
test('reload automatically re-arms Monika Smart Location; no change to saved routes',()=>{
 const s=memory('off');s.setItem('sh9-smart-match-active-pin-v1-m','monika-260');
 assert.equal(restore(s,'reload','monika'),true);
 assert.equal(s.getItem(key),null);
 assert.equal(s.getItem('sh9-smart-match-active-pin-v1-m'),'monika-260');
});
test('manual override survives normal navigation and back; Zsolt reload does not change Monika',()=>{
 for(const [type,profile] of [['navigate','monika'],['back_forward','monika'],['reload','zsolt']]){
  const s=memory('off');assert.equal(restore(s,type,profile),false);assert.equal(s.getItem(key),'off');
 }
});
test('first opening is ON by default and refresh introduces no new GPS or network work',()=>{
 const s=memory(null);assert.equal(restore(s,'navigate','monika'),true);assert.equal(s.getItem(key),null);
 assert.doesNotMatch(src.slice(begin,end),/fetch\(|geolocation|setInterval|watchPosition/);
 assert.match(src,/state\.autoEnabled=!state\.autoEnabled/);
 assert.match(src,/e\.key===AUTO_KEY/);
});
