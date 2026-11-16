'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p));
const html=read('sh9/entertainment/index.html').toString('utf8');
const css=read('sh9/entertainment/book-studio-warm-wood-v18.css').toString('utf8');
const image=read('sh9/entertainment/assets/sho-book-studio-warm-wood-v18.webp');
test('Real, compressed 1596x985 warm wooden library photomontage is bundled',()=>{
 assert.ok(image.length>50000&&image.length<400000,'optimized HD image should be 50-400 kB');
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
 assert.match(css,/sho-book-studio-warm-wood-v18\.webp/);
 assert.match(css,/background-size:cover !important/);
 assert.match(css,/aspect-ratio:1\.62 !important/);
});
test('Warm library style is last, overrides old vibrant hero without changing other components',()=>{
 assert.ok(html.indexOf('book-studio-warm-wood-v18.css')>html.indexOf('entertainment-book-first-v16.css'));
 assert.match(css,/border-color:rgba\(184,139,84,\.83\)/);
 assert.doesNotMatch(css,/#b5437c|#a84693|#fc93c2/);
 assert.match(css,/\.bs-text,[\s\S]*display:none !important/);
 assert.match(html,/<a class="books-promo books-promo--immersive" href="\.\/book-studio\/"/);
 assert.match(html,/E-Könyvtár<\/h2>/);
 assert.match(html,/Programajánló<\/h2>/);
 assert.match(html,/Most a mozikban/);
});
