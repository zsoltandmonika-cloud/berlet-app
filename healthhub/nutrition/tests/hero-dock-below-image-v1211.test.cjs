'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'hh-hero-dock-below-image-v1211.css'),'utf8');
const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').trim().match(/[^{}]+\{[^{}]*\}/g)||[];
test('CSS loads after approved Hero, hydration and Buddy cosmetics with one reference',()=>{
 const link='hh-hero-dock-below-image-v1211.css?v=1211-unified-dock-down64-balance-down64';
 assert.equal(html.split(link).length,2);
 assert.ok(html.indexOf(link)>html.indexOf('hh-hydration-showcase-v1202.css'));
 assert.ok(html.indexOf(link)>html.indexOf('hh-buddy-portrait-align-v1206.css'));
});
test('hero remains unchanged and native unified SH9 dock is preserved',()=>{
 assert.match(html,/<div class="hh-nutrition-golden-hero-host" id="nutritionGoldenHeroHost">\s*<section class="hero hh-nutrition-approved" id="nutritionApprovedHero"/);
 assert.match(html,/<section class="glass balance hh-body" id="balanceCard"/);
 assert.match(html,/sh9-golden-controls-v1\.css/);
 assert.equal(rules.length,3,'exactly one variable rule, one dock rule, one card rule');
});
test('precise 64px lowering on dock, plus precisely 64px extra on the one complete balance card',()=>{
 assert.match(css,/--hh-nutrition-hero-dock-drop-v1211:64px/);
 assert.match(css,/#nutritionGoldenHeroHost\s*>\s*#sh9UnifiedGlassDockV34\s*\{\s*transform:translateY\(var\(--hh-nutrition-hero-dock-drop-v1211\)\)!important;/);
 assert.match(css,/#nutritionGoldenHeroHost\s*\+\s*#balanceCard\.balance\.hh-body\s*\{\s*margin-top:calc\(12px \+ var\(--hh-nutrition-hero-dock-drop-v1211\)\)!important;/);
});
test('scope is Nutrition only, no edits to shared dock geometry or internals',()=>{
 for(const rule of rules)assert.match(rule,/body\[data-lp-module="nutrition"\]\[data-sh9-golden-unified="on"\]:not\(\[data-sh9-golden-floating="on"\]\)/);
 assert.doesNotMatch(css,/width\s*:|height\s*:|padding\s*:|background\s*:|grid-template|position\s*:|@media|#hhJug|#hhBuddy|#hhShowcase/);
});
