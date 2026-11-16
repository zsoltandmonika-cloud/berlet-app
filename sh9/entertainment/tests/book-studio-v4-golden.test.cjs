'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),src=p=>fs.readFileSync(path.join(root,p),'utf8');
const metadata=require('../book-studio/book-metadata-v4.js');
const studio=src('sh9/entertainment/book-studio/index.html');
const entertainment=src('sh9/entertainment/index.html');
const drive=src('sh9/entertainment/book-studio/onedrive-books-v2.js');
const reader=src('sh9/entertainment/book-studio/book-studio.js');
const preview=src('sh9/entertainment/book-studio-preview-v4.js');
const studioCSS=src('sh9/entertainment/book-studio/book-studio-tuning-v4.css');
const entCSS=src('sh9/entertainment/book-studio-entry-v4.css');
test('Hungarian canonical title and author fixes are presentation-only',()=>{
 assert.deepEqual(metadata.parseFilename('A kisherceg - Antoine de Saint-Exupry.epub'),
  {title:'A kis herceg',author:'Antoine de Saint-Exupéry'});
 assert.deepEqual(metadata.parseFilename('Frei Tamas- A bankar-olvasOM.epub'),
  {title:'A bankár',author:'Frei Tamás'});
 assert.deepEqual(metadata.parseFilename('fekete.istvan.tuskevar.1957.hungarian.bootleg.epub.ebook.epub'),
  {title:'Tüskevár',author:'Fekete István'});
 assert.deepEqual(metadata.parseFilename('G. R. R. Martin - Trónok harca.epub'),
  {title:'Trónok harca',author:'G. R. R. Martin'});
 assert.equal(metadata.parseFilename('2015--A káosz éve.pdf').title,'2015 - A káosz éve');
});
test('Manual edits persist only in the local UI layer, not as OneDrive file writes',()=>{
 const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
 const book={drive_id:'drive',drive_item_id:'f12'};
 metadata.saveOverride(storage,'example@outlook.com',book,'Árnyak között','Szerző Név');
 assert.deepEqual(metadata.readOverride(storage,'example@outlook.com',book),{title:'Árnyak között',author:'Szerző Név'});
 assert.equal(metadata.readOverride(storage,'other@outlook.com',book),null);
 metadata.removeOverride(storage,'example@outlook.com',book);
 assert.equal(metadata.readOverride(storage,'example@outlook.com',book),null);
});
test('Duplicate grouping is reversible, with no OneDrive deletion permissions',()=>{
 const sample=[
 {id:'epub',drive_item_id:'1',title:'A bankár',author:'Frei Tamás',format:'epub'},
 {id:'pdf',drive_item_id:'2',title:'A bankar',author:'Frei Tamás',format:'pdf'},
 {id:'another',drive_item_id:'3',title:'A bankár',author:'Másik Szerző',format:'pdf'}
 ];
 const d=metadata.deduplicate(sample);
 assert.equal(d.primary.length,2);assert.equal(d.hidden.length,1);
 assert.match(drive,/showDuplicates\?entries:groups\.primary/);
 assert.match(drive,/Duplikátumok elrejtése/);
 assert.doesNotMatch(drive,/Files\.ReadWrite|graph\.microsoft\.com.*\/delete|drive\/items\/.*remove/);
});
test('Ebook covers are enabled automatically by default with mobile transfer protection',()=>{
 assert.match(drive,/load\(w\.localStorage,AUTO_COVER_KEY\)!=='off'/);
 assert.match(drive,/scheduleAutomaticCovers\(\)/);
 assert.match(drive,/MAX_AUTO_TRANSFER=95\*1024\*1024/);
 assert.match(drive,/navigator\?\.connection\?\.saveData/);
 assert.match(studio,/id="odCoverSync"[^>]*aria-pressed="true"/);
});
test('Book Studio account/admin card appears below the libraries',()=>{
 const account=studio.indexOf('id="odConnectPanel"'),shelf=studio.indexOf('id="odGrid"'),optional=studio.indexOf('id="library"');
 assert.ok(account>optional&&optional>shelf);
 assert.match(studio,/id="odInlineStatus"/);
 assert.match(studioCSS,/\.od-admin-bottom/);
});
test('Entertainment shows the clickable Book Studio hero without its redundant shelf preview',()=>{
 const hero=entertainment.indexOf('books-promo--immersive'),upcoming=entertainment.indexOf('id="upcoming"');
 assert.ok(hero>0&&upcoming>hero);
 assert.doesNotMatch(entertainment,/id="bsPreviewGrid"|class="bs-preview-shelf"|book-studio-preview-v4\.js/);
 assert.match(entertainment,/<a class="books-promo books-promo--immersive" href="\.\/book-studio\/"/);
 assert.match(entCSS,/width:calc\(100vw - 12px\)/);
 assert.match(entCSS,/min-height:min\(72svh,690px\)/);
 assert.match(entCSS,/\.bs-wood-shelf/);
 assert.match(preview,/secureSession/);
 assert.match(preview,/CACHE\.get\(key,b,'cover'\)/);
 assert.match(preview,/SH9_BOOK_PREVIEW_V4/);
});
test('Reader has improved contrast, page animations, and defeatable audio',()=>{
 assert.match(studio,/id="readerSound"/);
 assert.match(reader,/playPageTurnSound/);
 assert.match(reader,/SOUND_KEY/);
 assert.match(reader,/AudioContext/);
 assert.match(reader,/theme==='dark'\?'#fff7ed'/);
 assert.match(studioCSS,/#fff8ef/);
 assert.match(studioCSS,/@keyframes bs-sheet-right/);
});
test('V4 scripts syntax parses cleanly',()=>{
 for(const js of [drive,reader,preview,src('sh9/entertainment/book-studio/book-metadata-v4.js')])assert.doesNotThrow(()=>new Function(js));
});
