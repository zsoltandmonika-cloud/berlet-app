'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/entertainment/index.html');
const css=read('sh9/entertainment/entertainment-book-first-v16.css');
const slideshow=read('sh9/entertainment/featured-slideshow-v8.js');
test('Six original categories remain first, then E-Könyvtár, then Programajánló, then cinema',()=>{
 const category=html.indexOf('class="pixel-extension"');
 const books=html.indexOf('class="bs-entertainment-feature"');
 const programs=html.indexOf('class="section sh9-program-feature"');
 const upcoming=html.indexOf('id="upcoming"');
 const cinema=html.indexOf('id="mozi"');
 assert.ok(category>0&&books>category&&programs>books&&upcoming>programs&&cinema>upcoming);
 assert.match(html,/<h2><span class="icon-title">📚<\/span> E-Könyvtár<\/h2>/);
 assert.match(html,/<h2><span class="icon-title">🎟️<\/span> Programajánló<\/h2>/);
 assert.match(html,/Most a mozikban/);
 assert.equal((html.match(/class="books-promo books-promo--immersive"/g)||[]).length,1);
});
test('Feature headings reuse the same section-top and icon-title visual system as cinema heading',()=>{
 assert.match(html,/class="section-top sh9-feature-heading"/);
 assert.match(html,/<div class="section-top"><div><h2><span class="icon-title">🎬<\/span> Most a mozikban/);
 assert.match(css,/\.sh9-feature-heading h2/);
 assert.match(css,/font-size:clamp\(21px,2vw,27px\)/);
});
test('Carousel is rendered in the new section, no hidden duplicate above books',()=>{
 assert.match(slideshow,/querySelector\('\.sh9-program-feature'\)\|\|d\.querySelector\('\.pixel-extension'\)/);
 assert.match(slideshow,/ROOT\.append\(carousel\)/);
 assert.match(slideshow,/const DELAY=4000,TRANSITION_MS=570,MAX_PER_KIND=4/);
 assert.match(css,/\.pixel-extension \.pixel-feature-link,[\s\S]*display:none!important/);
 assert.match(css,/\.pixel-extension\{[\s\S]*?height:var\(--tile-h\)!important/);
 assert.match(css,/\.sh9-program-feature \.sho-feature-carousel \.sho-feature-slide/);
 assert.match(css,/\.sh9-program-feature \.sho-feature-carousel \.sho-feature-slide\.is-active/);
 assert.match(css,/translate3d\(-100%,0,0\)/);
 assert.match(html,/featured-slideshow-v8\.js\?v=16-book-first-program-after/);
 assert.match(html,/entertainment-book-first-v16\.css\?v=16-order-headings/);
});
test('Both featured tiles remain Etele-sized and all links remain clickable',()=>{
 assert.match(css,/height:calc\(\(100vw - 24px\)\/1\.62\)!important/);
 assert.match(html,/<a class="books-promo books-promo--immersive" href="\.\/book-studio\/"/);
 assert.match(html,/class="pixel-region pixel-culture" href="\.\/kultura\/"/);
 assert.match(html,/class="pixel-region pixel-events" href="\.\/rendezvenyek\/"/);
 assert.doesNotThrow(()=>new Function(slideshow));
});
