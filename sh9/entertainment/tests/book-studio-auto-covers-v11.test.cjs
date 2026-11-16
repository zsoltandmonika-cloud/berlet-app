'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../..');
const get=p=>fs.readFileSync(path.join(base,p),'utf8');
const js=get('sh9/entertainment/book-studio/onedrive-books-v2.js');
const shelf=get('sh9/entertainment/book-studio/book-studio-wood-shelf-v10.js');
const html=get('sh9/entertainment/book-studio/index.html');
test('Automatic authentic book covers are ON by default, including V11 one-time upgrade',()=>{
 assert.match(js,/const coversOn=\(\)=>load\(w\.localStorage,AUTO_COVER_KEY\)!=='off'/);
 assert.match(js,/AUTO_V11_INIT='sh9-book-auto-v11-initialized'/);
 assert.match(js,/store\(w\.localStorage,AUTO_COVER_KEY,'on'\)/);
 assert.match(js,/scheduleAutomaticCovers\(\)/);
 assert.match(js,/w\.setTimeout\(\(\)=>void prepareCovers\(true\),700\)/);
 assert.match(html,/onedrive-books-v2\.js\?v=(11-auto-authentic-covers|13-library-manager)/);
});
test('V11 first shows locally cached covers, fetches portrait OneDrive thumbnails, falls back to EPUB/PDF extraction',()=>{
 assert.match(js,/if\(ready\)for\(const book of source\)/);
 assert.match(js,/void cachedCover\(book\)/);
 assert.match(js,/async function graphCover\(b\)/);
 assert.match(js,/\/thumbnails\?select=large/);
 assert.match(js,/x\.height\/x\.width>=1\.19/);
 assert.match(js,/!image\.type\.startsWith\('image\/'\)/);
 assert.match(js,/await CACHE\.get\(account,book,'cover'\)/);
 assert.match(js,/await graphCover\(book\)/);
 assert.match(js,/await CACHE\.get\(account,book,'file'\)/);
 assert.match(js,/await download\(book\)/);
 assert.match(js,/await extractCover\(book,blob\)/);
 assert.match(js,/b\.format==='epub'\?await epubCover\(blob\):await pdfCover\(blob\)/);
 assert.match(js,/source=await new Promise/);
 assert.match(js,/new w\.Image\(\)/);
});
test('No public cover search leaks the household library; no Graph write or destructive operations',()=>{
 assert.doesNotMatch(js,/openlibrary\.org|googleapis\.com\/books|amazon\.com|openai\.com/);
 assert.match(js,/Files\.Read/);
 assert.doesNotMatch(js,/Files\.ReadWrite|\/drive\/items\/.*\/delete/);
 assert.match(js,/const account=config\.account,profileAtStart=pid\(\)/);
 assert.match(js,/!config\|\|config\.account!==account\|\|pid\(\)!==profileAtStart/);
 assert.match(js,/const pendingCovers=new Map\(\)|pendingCovers=new Map\(\)/);
});
test('Automatic transfer has a predictable limit and does not permanently blacklist budget-skipped covers',()=>{
 assert.match(js,/MAX_AUTO_TRANSFER=95\*1024\*1024/);
 assert.match(js,/x\.size_bytes<\(automatic\?20:28\)\*1024\*1024/);
 assert.match(js,/transferred\+book\.size_bytes<=MAX_AUTO_TRANSFER/);
 assert.match(js,/let budgetSkipped=false/);
 assert.match(js,/if\(!blob\)budgetSkipped=true/);
 assert.match(js,/else if\(!budgetSkipped\)missingCovers\.add\(book\.id\)/);
 assert.match(js,/w\.navigator\?\.connection\?\.saveData/);
});
test('New fullscreen wood shelf visibly updates as original covers arrive',()=>{
 assert.match(js,/w\.SH9_BOOKSHELF_V10\?\.coverReady\(b\.id,url\)/);
 assert.match(js,/w\.SH9_BOOKSHELF_V10\?\.setCoverProgress\(scanned,work\.length,success\)/);
 assert.match(js,/w\.SH9_BOOKSHELF_V10\?\.finishCoverProgress\(scanned,work\.length,success\)/);
 assert.match(shelf,/function setCoverProgress\(completed,total\)/);
 assert.match(shelf,/function finishCoverProgress\(\)/);
 assert.match(shelf,/Eredeti borítók automatikusan/);
 assert.match(shelf,/state\.displayed\.size\+' borító/);
 assert.match(html,/book-studio-wood-shelf-v10\.js\?v=(11-auto-cover-status|12-visible-cover-load|13-library-manager)/);
});
test('V11 scripts parse without syntax errors',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.doesNotThrow(()=>new Function(shelf));
});
