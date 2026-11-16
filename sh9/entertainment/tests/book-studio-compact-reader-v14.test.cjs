'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('sh9/entertainment/book-studio/book-studio-reader-compact-v14.css');
const html=read('sh9/entertainment/book-studio/index.html');
const js=read('sh9/entertainment/book-studio/book-studio.js');
test('S24 compact reader overrides are loaded last and desktop reader unchanged',()=>{
 assert.match(html,/book-studio-reader-compact-v14\.css\?v=14-s24-more-reading-space/);
 assert.ok(html.indexOf('book-studio-reader-compact-v14.css')>html.indexOf('book-studio-library-manage-v13.css'));
 assert.match(css,/@media \(max-width:700px\)/);
 assert.match(css,/\.reader \.reader-bar/);
 assert.match(css,/\.reader \.reader-tools/);
 assert.match(css,/\.reader \.reader-footer/);
 assert.match(css,/\.reader \.reader-content/);
 assert.match(css,/padding:3px 3px 2px !important/);
 assert.doesNotMatch(css,/@media \(min-width:700px\)/);
});
test('Percent appears only next to scrub; separate label and top status are hidden visually',()=>{
 assert.match(css,/\.reader \.reader-status,\s*\.bshelf-v10-page \.reader \.reader-footer #pageLabel/);
 assert.match(css,/#readerScrubPercent/);
 assert.match(html,/id="readerScrubPercent"/);
 assert.match(js,/\$\('readerScrubPercent'\)\.textContent=current\.progress_percent\+'%'/);
 assert.match(js,/\$\('readerScrub'\)\.addEventListener\('change',async\(\)=>/);
 assert.match(js,/epubBook\.locations\.cfiFromPercentage\(p\)/);
});
test('Seek bar has a thin visual rail but finger-draggable thumb and preserved navigation',()=>{
 assert.match(css,/height:27px !important/);
 assert.match(css,/::-webkit-slider-runnable-track\{\s*height:3px !important/);
 assert.match(css,/::-webkit-slider-thumb\{\s*width:12px !important/);
 assert.match(css,/input\[type=range\]\{[\s\S]*height:24px !important/);
 assert.match(css,/\.reader \.reader-footer button \{/);
 for(const id of ['prevPage','nextPage','readerTheme','smallerText','biggerText','addBookmark','bookmarkList','readerFocus','readerSound'])
   assert.ok(html.includes('id="'+id+'"'),id+' preserved');
 assert.match(js,/\$\('prevPage'\)\.addEventListener/);
 assert.match(js,/\$\('nextPage'\)\.addEventListener/);
});
test('EPUB legibility is maintained but excessively large vertical spacing is reduced',()=>{
 assert.match(html,/book-studio\.js\?v=14-epub-compact-readable/);
 assert.match(js,/'line-height':'1\.62'/);
 assert.match(js,/'padding':'0 3\.5%'/);
 assert.match(js,/'margin-bottom':'\.7em'/);
 assert.match(js,/rendition\.themes\.fontSize\(fontSize\+'%'\)/);
 assert.match(js,/fontSize=Math\.min\(160,Math\.max\(75,fontSize\+delta\)\)/);
 assert.match(js,/progress_locator:current\.progress_locator/);
 assert.doesNotThrow(()=>new Function(js));
});
