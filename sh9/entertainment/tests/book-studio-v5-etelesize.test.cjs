'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=source('sh9/entertainment/feature-books-etelesize-v5.css');
const baseline=source('sh9/entertainment/pixel-artwork-v3.css');
const page=source('sh9/entertainment/index.html');
const mobile=390;
test('Two feature tiles share the exact Etele Premium dimension formula',()=>{
 assert.match(baseline,/height:calc\(\(100vw - 24px\)\/1\.62\)!important/);
 assert.match(css,/--sho-etele-tile-width:calc\(100vw - 24px\)/);
 assert.match(css,/--sho-etele-tile-height:calc\(\(100vw - 24px\) \/ 1\.62\)/);
 assert.match(css,/--feature-h:var\(--sho-etele-tile-height\)/);
 assert.match(css,/height:var\(--sho-etele-tile-height\) !important/);
 assert.match(css,/width:var\(--sho-etele-tile-width\) !important/);
 const width=mobile-24,height=width/1.62;
 assert.equal(width,366);assert.ok(height>225&&height<227);
});
test('Approved featured graphic is not stretched or cropped',()=>{
 assert.match(css,/background-size:100% 100%,100% auto !important/);
 assert.match(css,/url\('\.\/assets\/sho-feature-proportional-v1194\.webp'\)/);
 assert.match(css,/\.pixel-extension\[data-custom="true"\] \.pixel-feature-link::after/);
 assert.match(css,/\.pixel-extension \.pixel-feature-edit/);
 assert.match(css,/\.pixel-extension \.pixel-feature-custom/);
});
test('Existing entertainment content and Etele card remain unchanged',()=>{
 for(const label of ['Mozi','Színház','Koncertek','Home Media'])assert.ok(page.includes('>'+label+'</b>'));
 assert.ok(page.includes('class="card etele-featured"'));
 assert.ok(page.includes('id="pixelFeatureLink"'));
 assert.ok(page.includes('books-promo books-promo--immersive'));
 assert.match(page,/feature-books-etelesize-v5\.css\?v=5-step1-matched/);
 assert.ok(page.indexOf('feature-books-etelesize-v5.css')>page.indexOf('book-studio-entry-v4.css'));
 assert.match(css,/@media \(max-width:650px\)/);
 assert.doesNotMatch(css,/\.section \.carousel > \.card\s*\{/);
});
test('Mobile Book Studio preview shelf remains a separate section',()=>{
 assert.ok(page.indexOf('class="bs-preview-shelf"')>page.indexOf('books-promo books-promo--immersive'));
 assert.match(css,/\.bs-entertainment-feature \.books-promo/);
 assert.doesNotMatch(css,/\.bs-preview-shelf\s*\{/);
});
