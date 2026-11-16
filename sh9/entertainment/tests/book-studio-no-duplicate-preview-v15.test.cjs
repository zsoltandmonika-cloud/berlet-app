'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const landing=read('sh9/entertainment/index.html');
const studio=read('sh9/entertainment/book-studio/index.html');

test('Entertainment retains one Book Studio tile and removes duplicated preview widget',()=>{
 assert.equal((landing.match(/class="books-promo books-promo--immersive"/g)||[]).length,1);
 assert.match(landing,/<a class="books-promo books-promo--immersive" href="\.\/book-studio\/"/);
 assert.doesNotMatch(landing,/bs-preview-shelf|id="bsPreviewGrid"|id="bsPreviewStatus"|Könyvespolcom|Teljes könyvtár/);
});
test('No preview JavaScript or IndexedDB cache library is loaded on Entertainment homepage',()=>{
 assert.doesNotMatch(landing,/src="\.\/book-studio-preview-v4\.js/);
 assert.doesNotMatch(landing,/src="\.\/book-studio\/book-cache-v3\.js/);
 assert.match(studio,/src="\.\/book-cache-v3\.js/);
 assert.match(studio,/id="bshelfFront"/);
});
test('The six-category recommendation carousel and cinema section retain original order',()=>{
 const promo=landing.indexOf('class="bs-entertainment-feature"');
 const upcoming=landing.indexOf('id="upcoming"');
 const cinema=landing.indexOf('id="mozi"');
 assert.ok(promo>0&&upcoming>promo&&cinema>upcoming);
 assert.match(landing,/featured-slideshow-v8\.js/);
 assert.match(landing,/Most a mozikban/);
});
