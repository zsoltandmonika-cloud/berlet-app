'use strict';
/* Golden Standard is a frozen user-approved shell; protect visual invariants
   without touching personal Digital Wellbeing data or cloud credentials. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'digital-health/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'digital-health/golden-shell-v531.css'),'utf8');
const avatars=fs.readFileSync(path.join(root,'golden-standard-avatars-v529.js'),'utf8');
const base=fs.readFileSync(path.join(root,'premium-home-compact-v525.css'),'utf8');
const doc=fs.readFileSync(path.join(root,'docs/GOLDEN-STANDARD-RULE.md'),'utf8');

// Exact originals. HHB13 bundle is the pre-existing, public profile-picker
// data source; parsing does not request network nor open any private vault.
const chunks=['01','02'].map(id=>{
 const src=fs.readFileSync(path.join(root,'bundle/HHB13_'+id+'.js'),'utf8');
 const literal=src.match(/window\.HH_CHUNKS\[\d+\]=("(?:[^"\\]|\\.)*");$/s)?.[1];
 assert.ok(literal,'Original bundled profile-picker chunk '+id);
 return JSON.parse(literal);
}).join('');
const matches=[...chunks.matchAll(/<button class="choice" onclick="setProfile\('(z|m)'\)"><img src="(data:image\/webp;base64,[^"]+)"/g)];
assert.equal(matches.length,2,'Two existing original picker photographs required');
const sandbox={window:{}};
vm.runInNewContext(avatars,sandbox);
const photos=sandbox.window.HH_GOLDEN_AVATARS_V529;
assert.equal(photos.z,matches[0][2],'Zsolt photograph must be byte-identical to the approved Home');
assert.equal(photos.m,matches[1][2],'Mónika photograph must be byte-identical to the approved Home');
assert.ok(!/fetch\(|XMLHttpRequest|indexedDB|localStorage|sessionStorage/.test(avatars),'Photo bundle cannot collect user data');

// Golden positions and colors may never silently drift away from v528.1.
for(const key of ['--hhpg-corner-inset:6px','--hhpg-corner-inset:6px']) {
 assert.ok(base.includes(key),'Home baseline unchanged');
 assert.ok(css.includes(key),'Digital Gold matches Home');
}
assert.ok(css.includes('max(0px, 50vw - 210px)'),'Same centered-420px app coordinate on desktops');
assert.ok(css.includes('top:calc(var(--hhpg-corner-inset) + env(safe-area-inset-top))'),'Same mobile top offset');
assert.ok(css.includes('top:calc(14px + var(--hhpg-corner-inset) + env(safe-area-inset-top))'),'Same desktop top offset');
assert.ok(css.includes('left:calc(max(0px, 50vw - 210px) + var(--hhpg-corner-inset) + env(safe-area-inset-left))'),'HH ONE is on left');
assert.ok(css.includes('right:calc(max(0px, 50vw - 210px) + var(--hhpg-corner-inset) + env(safe-area-inset-right))'),'Portrait is on right');
assert.ok(css.includes('width:45px!important;height:45px!important'),'Portrait is approved 45px square');
assert.ok(css.includes('border-radius:15px!important'),'Approved portrait radius');
assert.ok(css.includes('background-color:var(--hhpg-dock-portrait-bg)!important'),'Profile photo tint uses original image');
assert.ok(css.includes('--hhpg-dock-portrait-bg:#e6f7ff'),'Zsolt ice blue');
assert.ok(css.includes('--hhpg-dock-portrait-bg:#ffe5f1'),'Mónika soft pink');
assert.ok(css.includes('html body #hhOneRag500[data-surface="digital"]'),'HH ONE specificity beats digital bottom-right rule from late-injected engine');
assert.ok(!css.includes('html body #hhOneRag500,'),'Generic selector would lose to the engine data-surface rule');
assert.ok(css.includes('bottom:auto!important'),'HH ONE must not stay bottom-right');
assert.ok(css.includes('html body #hhOneFallback501'),'Initial HH ONE fallback also aligned');
assert.ok(css.includes('rgba(15,30,54,.97)'),'Same Home dark glass taskbar');
assert.ok(css.includes('rgba(140,198,243,.25)'),'Same top border');
assert.ok(css.includes('width:min(100vw,420px)!important'),'Same navigation width');
assert.ok(css.includes('height:58px!important'),'Same navigation height');
assert.ok(css.includes('transition:none!important;animation:none!important'),'No moving corner controls');

// Original data and controls remain in the Digital Health dashboard unchanged.
assert.ok(html.includes('<link rel="stylesheet" href="./golden-shell-v531.css?v=532-digital-hero-polish">'),'New CSS cache key releases phone fix');
assert.ok(css.includes('.hero-stage .hero-copy{'),'Hero tagline has targeted centered layout');
assert.ok(css.includes('text-align:center;min-height:110px;padding-top:12px'),'Tagline centered and slightly lower');
assert.ok(!html.includes('id="digitalBack"'),'Old back overlay removed');
assert.ok(!html.includes("el('digitalBack')"),'No stale Back event handler');
assert.ok(!html.includes('data-profile="zsolt"')&&!html.includes('data-profile="monika"'),'No redundant profile buttons under tagline');
assert.ok(!html.includes("querySelectorAll('[data-profile]')"),'No obsolete two-button handlers');
assert.ok(html.includes('hhDigitalProfileDock'),'The portrait remains the single profile selector');
assert.ok(html.includes('<script src="../golden-standard-avatars-v529.js?v=531-approved-source"></script>'),'Original photos are loaded before first paint');
assert.ok(html.includes('id="hhDigitalProfileDock"'),'One tappable header portrait');
assert.equal((html.match(/id="hhDigitalProfileDock"/g)||[]).length,1,'No duplicate portrait controls');
assert.ok(html.includes("el('hhDigitalProfileDock').addEventListener('click'"),'Photo retains one-tap switching');
assert.ok(html.includes("localStorage.setItem('hh-profile',profile==='monika'?'m':'z')"),'Selected profile follows the parent HealthHub');
assert.ok(html.includes('if(window.HH_DW_LIVE_V507)window.HH_DW_LIVE_V507.refresh(profile,period)'),'Existing source & owner read unchanged');
assert.ok(html.includes('digital-usage-vault-v507.js?v=510-monday-week'),'Private profile isolation code untouched');
assert.ok(html.includes('digital-live-v507.js?v=514-app-category-breakdown'),'Existing analytics intact');
assert.ok(html.includes('id="heroPicture" src="../assets/hero-digital-health-approved%20.png"'),'Approved Léna Hero image untouched');
assert.ok(html.includes('hh-one-rag-v500.js?v=504-glass-top-left'),'Original status engine untouched');
assert.equal((html.match(/<nav class="hhBottomNav"/g)||[]).length,1,'Exactly one existing taskbar');
// Keep all five real Home destinations and their existing integration routes.
for(const url of ['../index.html','../index.html?hhnav=health','../index.html?hhnav=timeline'])
 assert.ok(html.includes('href="'+url+'"'),'Retain navigation route '+url);
for(const label of ['Kezdőlap','HealthRadar','Idővonal','Elemzések','Továbbiak'])
 assert.ok(html.includes('>'+label+'</span>'),'Five existing Home-standard nav labels '+label);
// Every inline JS body must parse after the UI addition.
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
 if(match[1].trim())new vm.Script(match[1],{filename:'digital-health/inline.js'});
}
assert.ok(doc.includes('GOLDEN STANDARD RULE')&&doc.includes('NO JUMPING'),'Documented immutable baseline exists');
console.log('HealthHub Digital Wellbeing Golden Standard v531 PASS: exact portraits, fixed glass pill, 6px corners, dark 58px taskbar, active profile consistency, unchanged data source.');
