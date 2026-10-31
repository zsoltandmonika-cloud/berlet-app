'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const base='sh9/smart-travel/public-transport/smart-trip/';
const html=load(base+'index.html');
const dock=load(base+'smart-trip-keyboard-dock-v1088.js');
const css=load(base+'smart-trip-keyboard-dock-v1088.css');
const ai=load(base+'smart-trip-ai-v1022.js');

test('Smart Trip AI retains same predictive source, inputs and favorite selection',()=>{
 for(const id of ['st22From','st22To','st22FromList','st22ToList']){
  assert.ok(html.includes('id="'+id+'"'));
  assert.ok(dock.includes("'"+id+"'"));
 }
 assert.match(ai,/fields=\[\{input:from,key:'origin',box:\$\('st22FromList'\)\}/);
 assert.match(ai,/geo\?\.favoriteSuggestions/);
 assert.match(ai,/geo\.normalizeResults\(await response\.json\(\)\)/);
 assert.match(ai,/function choose\(field,item\)/);
 assert.match(ai,/local\[field\.key\]=item/);
 assert.match(ai,/field\.input\.dataset\.st22Chosen=item\.type/);
 assert.doesNotMatch(dock,/fetch\(|geolocation|searchUrl|api\.openai|Supabase/);
});
test('BKK-style mobile viewport portal uses original input and results, never clone',()=>{
 assert.match(html,/smart-trip-keyboard-dock-v1088\.css\?v=1088-bkk-golden-keyboard-safe/);
 assert.match(html,/smart-trip-keyboard-dock-v1088\.js\?v=1088-real-predictive-portal/);
 assert.ok(html.indexOf('smart-trip-ai-v1022.js')<html.indexOf('smart-trip-keyboard-dock-v1088.js'));
 assert.match(dock,/max-width:640px/);
 assert.match(dock,/const vv=w\.visualViewport/);
 assert.match(dock,/vv\.offsetTop/);
 assert.match(dock,/vv\.height/);
 assert.match(dock,/dock\.style\.top/);
 assert.match(dock,/dock\.style\.height/);
 assert.match(dock,/input\.parentNode\.insertBefore/);
 assert.match(dock,/target\.input\.parentNode\.insertBefore/);
 assert.match(dock,/target\.list\.parentNode\.insertBefore/);
 assert.match(dock,/edit\.appendChild\(target\.input\)/);
 assert.match(dock,/dock\.appendChild\(target\.list\)/);
 assert.match(dock,/fieldAnchor\.parentNode\.insertBefore\(previous\.input/);
 assert.match(dock,/listAnchor\.parentNode\.insertBefore\(previous\.list/);
 assert.doesNotMatch(dock,/cloneNode|innerHTML|createElement\('input'\)/);
});
test('No automatic open after web navigation and safe cancel of pending Photon requests',()=>{
 assert.match(dock,/row\?\.addEventListener\('pointerdown'/);
 assert.match(dock,/if\(!mobile\(\)\|\|active\|\|closing/);
 assert.doesNotMatch(dock,/input\.addEventListener\('focus',\(\)=>open/);
 assert.match(dock,/if\(e\.isTrusted&&!active/);
 assert.match(dock,/if\(e\.key==='Enter'&&active\)/);
 assert.match(dock,/e\.preventDefault\(\);close\(\)/);
 assert.match(dock,/w\.dispatchEvent\(new CustomEvent\('sh9-smart-trip-predictive-close-v1088'/);
 assert.match(ai,/w\.addEventListener\('sh9-smart-trip-predictive-close-v1088'/);
 assert.match(ai,/if\(field\)\{abort\(field\.key\);close\(field\)\}/);
 assert.match(ai,/#st22KeyboardDockV1088/);
 assert.match(dock,/get isOpen\(\)\{return !!active\},open,close/);
 assert.match(ai,/dock\.open\(field===from\?'origin':'destination'\)/);
});
test('All BKK Golden visual conventions are applied above Samsung keyboard',()=>{
 assert.match(css,/#st22KeyboardDockV1088\.st22-keyboard-v1088/);
 assert.match(css,/position:fixed!important/);
 assert.match(css,/z-index:100050!important/);
 assert.match(css,/max-width:560px/);
 assert.match(css,/:root\[data-st22-profile="m"\]/);
 assert.match(css,/border:2px solid var\(--st22-kb-accent\)/);
 assert.match(css,/font:680 16px\/1\.25/);
 assert.match(css,/:is\(#st22FromList,#st22ToList\)/);
 assert.match(css,/\[hidden\]\{\s*display:none!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/overscroll-behavior:contain/);
 assert.match(css,/min-height:57px/);
 assert.match(dock,/w\.visualViewport\.addEventListener\('resize'/);
 assert.match(dock,/w\.visualViewport\.addEventListener\('scroll'/);
 assert.match(dock,/w\.addEventListener\('orientationchange'/);
 assert.match(dock,/w\.addEventListener\('pagehide',close\)/);
});
