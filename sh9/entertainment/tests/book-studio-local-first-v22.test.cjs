'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base='sh9/entertainment/book-studio/';
const html=read(base+'index.html'),local=read(base+'book-local-v22.js');
const shelf=read(base+'book-studio-wood-shelf-v10.js');
const reader=read(base+'book-studio.js');
const offline=read(base+'book-studio-offline-v21.js');
const worker=read(base+'offline-reader-sw-v21.js');
test('V22 imports EPUB/PDF from Samsung browser, independently of Microsoft and Supabase',()=>{
 for(const id of ['bsLocalFileInput','bsLocalStatus','bsLocalList','bsLocalShell'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/bsLocalFileInput" type="file"[^>]*multiple/);
 assert.match(html,/book-local-v22\.js\?v=22/);
 assert.match(html,/book-local-v22\.css\?v=22/);
 assert.match(local,/indexedDB|w\.indexedDB/);
 assert.match(local,/new Blob\(\[file\]/);
 assert.match(local,/async function importFiles/);
 assert.match(local,/source:'local'/);
 assert.match(local,/profile_key:who/);
 assert.doesNotMatch(local,/\b(?:w\.)?fetch\s*\(|\.from\(['\"]|graph\.microsoft\.com|service_role/i);
});
test('Local book import never deletes original file, has a confirmation and local progress',()=>{
 assert.match(local,/async function deleteBook\(id\)/);
 assert.match(local,/w\.confirm\('Eltávolítod/);
 assert.match(local,/s=>s\.delete\(id\)/);
 assert.match(local,/async function saveProgress\(book,patch\)/);
 assert.match(local,/async function getBlob\(id\)/);
 assert.match(local,/row\.profile_key!==profile\(\)/);
 assert.match(local,/row\.blob/);
 assert.match(local,/LIMIT=80\*1024\*1024/);
});
test('Existing reader and wooden shelves use local and OneDrive sources without cloud for phone files',()=>{
 assert.match(reader,/SH9_BOOK_LOCAL_V22\?\.getBook\(id\)/);
 assert.match(reader,/data=await w\.SH9_BOOK_LOCAL_V22\.getBlob\(b\.id\)/);
 assert.match(reader,/await local\.saveProgress\(snapshot,patch\)/);
 assert.match(reader,/snapshot\.source==='local'/);
 assert.match(shelf,/remoteBooks:\[\],localBooks:\[\]/);
 assert.match(shelf,/function setLocalBooks\(books,profile\)/);
 assert.match(shelf,/state\.books=\[\.\.\.state\.localBooks,\.\.\.state\.remoteBooks\]/);
 assert.match(shelf,/book\.source!=='local'&&!state\.connected/);
});
test('Offline service worker includes local import and never intercepts signed or personal data',()=>{
 assert.match(worker,/sho-book-studio-offline-shell-v22/);
 assert.match(worker,/\.\/book-local-v22\.js\?v=22/);
 assert.match(worker,/\.\/book-local-v22\.css\?v=22/);
 assert.match(offline,/\.\/book-local-v22\.js\?v=22/);
 assert.match(worker,/if\(isOAuth\(url\)\)return/);
 assert.match(worker,/if\(!allowed\.has\(key\)\)return/);
 assert.doesNotMatch(worker,/graph\.microsoft\.com|supabase\.co|hh_book_studio_books/);
});
test('All new or updated scripts parse',()=>{
 for(const script of [local,shelf,reader,offline,worker])
  assert.doesNotThrow(()=>new Function(script));
});
