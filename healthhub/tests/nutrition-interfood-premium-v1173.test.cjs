'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../nutrition/index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../nutrition/hh-interfood-spotlight-v1173.css'),'utf8');
test('Interfood premium tile is positioned between Bevitel cards and existing admin tools',()=>{
 const tile=html.indexOf('id="hhInterfoodTileV1173"');
 assert.ok(tile>html.indexOf('id="hhBevitelRecipeStudioV1151"'));
 assert.ok(tile<html.indexOf('id="hhBevitelMainEditorButton"'));
 assert.ok(html.indexOf('id="hhBevitelMainEditorButton"')<html.indexOf('Mai tápanyagok'));
 assert.equal(html.split('id="hhInterfoodTileV1173"').length,2);
});
test('Interfood entry opens verified public order page safely, without claiming active sync',()=>{
 assert.match(html,/<a id="hhInterfoodTileV1173"[^>]+href="https:\/\/rendel\.interfood\.hu\/"[^>]+target="_blank"[^>]+rel="noopener noreferrer"/);
 assert.match(html,/hh-interfood-spotlight-v1173\.css\?v=1173-premium-fullwidth/);
 assert.match(html,/Publikált tápértékek/);
 assert.doesNotMatch(html.slice(html.indexOf('id="hhInterfoodTileV1173"'),html.indexOf('id="hhBevitelMainEditorButton"')),/Szinkronizálva|Automatikus szinkron|SYNC AKTÍV/);
});
test('Interfood tile is profile-accented, responsive and keyboard accessible',()=>{
 assert.match(css,/--accent/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(css, /:focus-visible/);
 assert.match(css, /prefers-reduced-motion/);
});
