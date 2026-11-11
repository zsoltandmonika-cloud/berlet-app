'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../nutrition');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'hh-interfood-brand-v1174.css'),'utf8');
const logo=fs.readFileSync(path.join(dir,'interfood-logo-v1174.webp'));
const open=html.indexOf('id="hhInterfoodTileV1173"');
const end=html.indexOf('</a>',open);
const tile=html.slice(open,end);

test('uploaded transparent Interfood WebP is a real, compact image asset',()=>{
 assert.equal(logo.toString('ascii',0,4),'RIFF');
 assert.equal(logo.toString('ascii',8,12),'WEBP');
 assert.ok(logo.length>2000&&logo.length<35000);
});
test('logo is positioned before unchanged original three-line Interfood copy',()=>{
 assert.ok(open>0&&end>open);
 assert.match(tile,/class="hh-interfood-brand-v1174"[^>]*><img src="\.\/interfood-logo-v1174\.webp"/);
 assert.ok(tile.indexOf('hh-interfood-brand-v1174')<tile.indexOf('hh-interfood-content-v1173'));
 assert.match(tile,/HETI ÉTLAP · EBÉDRENDELÉS/);
 assert.match(tile,/<strong>Interfood <span>Premium<\/span><\/strong>/);
 assert.match(tile,/Heti kínálat · Rendelés · Publikált tápértékek/);
 assert.match(tile,/Étlap <span>›<\/span>/);
});
test('only branded tile receives layout override and original editor remains outside',()=>{
 assert.match(html,/hh-interfood-brand-v1174\.css\?v=1174-logo-balance/);
 assert.ok(html.indexOf('hh-interfood-spotlight-v1173.css')<html.indexOf('hh-interfood-brand-v1174.css'));
 assert.match(tile,/href="https:\/\/rendel\.interfood\.hu\/" target="_blank" rel="noopener noreferrer"/);
 assert.ok(end<html.indexOf('id="hhBevitelMainEditorButton"'));
 assert.match(css,/#hhInterfoodTileV1173/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.doesNotMatch(css,/!important|\.hh-bevitel-grid|\.hh-bevitel-admin-row/);
});
