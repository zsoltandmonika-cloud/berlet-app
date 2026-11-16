'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=get('sh9/entertainment/book-studio/book-studio-wood-shelf-v10.js');
const css=get('sh9/entertainment/book-studio/book-studio-wood-shelf-v10.css');
const html=get('sh9/entertainment/book-studio/index.html');
test('S24 original cover images are loaded eagerly, never lazy-hidden deadlocked',()=>{
 assert.match(js,/image\.decoding='async';image\.loading='eager'/);
 assert.doesNotMatch(js,/image\.loading='lazy';image\.hidden=true/);
 assert.match(js,/img\.classList\.add\('is-loaded'\)/);
 assert.match(css,/img\.bshelf-real-cover\{[\s\S]*?opacity:0/);
 assert.match(css,/img\.bshelf-real-cover\.is-loaded\{[\s\S]*?opacity:1/);
 assert.match(html,/book-studio-wood-shelf-v10\.js\?v=(12-visible-cover-load|13-library-manager|17-shelf-sort)/);
 assert.match(html,/book-studio-wood-shelf-v10\.css\?v=12-cover-display-fix/);
});
test('Displayed cover count changes only after actual image onload',()=>{
 assert.match(js,/displayed:new Set\(\)/);
 assert.match(js,/state\.displayed\.add\(button\.dataset\.bookId\)/);
 assert.match(js,/state\.displayed\.delete\(button\.dataset\.bookId\)/);
 assert.match(js,/state\.displayed\.size\+' borító/);
 assert.match(js,/state\.displayed\.size\+' megjelenítve/);
 assert.doesNotMatch(js,/state\.covers\.size\+' megjelenítve/);
});
test('Code parses as valid browser JavaScript',()=>{
 assert.doesNotThrow(()=>new Function(js));
});
