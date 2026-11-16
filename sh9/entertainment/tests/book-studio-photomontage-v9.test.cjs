'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const get=p=>fs.readFileSync(path.join(root,p));
const image=get('sh9/entertainment/assets/sho-book-studio-golden-hd-v9.webp');
const css=get('sh9/entertainment/book-studio-photomontage-v9.css').toString('utf8');
const html=get('sh9/entertainment/index.html').toString('utf8');
test('Actual approved HD artwork is committed as valid portable WebP',()=>{
 assert.ok(image.length>40000 && image.length<250000);
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
});
test('The Book Studio tile shows the complete approved photomontage only, no duplicated DOM title',()=>{
 assert.match(css,/sho-book-studio-golden-hd-v9\.webp/);
 assert.match(css,/background-size:cover !important/);
 assert.match(css,/\.bs-text,[\s\S]*display:none !important/);
 assert.match(css,/\.bs-photo-books,/);
 assert.match(css,/\.books-promo--immersive::after/);
 const old='<link rel="stylesheet" href="./featured-slideshow-v8.css?v=8-4s-new-items-rtl">';
 const next='<link rel="stylesheet" href="./book-studio-photomontage-v9.css?v=9-golden-HD-image">';
 assert.ok(html.indexOf(next)>html.indexOf(old));
});
test('The Etele-sized tile remains clickable on its entire surface and the bookshelf persists',()=>{
 assert.match(html,/<a class="books-promo books-promo--immersive" href="\.\/book-studio\/"/);
 assert.match(html,/aria-label="SHO Book Studio/);
 assert.match(css,/aspect-ratio:1\.62 !important/);
 assert.match(html,/id="bsPreviewGrid"/);
 assert.doesNotMatch(css,/pointer-events:none !important;\s*cursor:pointer;/);
});