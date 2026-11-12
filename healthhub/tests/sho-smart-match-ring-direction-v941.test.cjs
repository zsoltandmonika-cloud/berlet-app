'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../guardian/smart-260-connect');
const read=file=>fs.readFileSync(path.join(base,file),'utf8');
const html=read('index.html'),app=read('app.mjs'),css=read('ring-direction-v941.css');
const core=()=>import('../guardian/smart-260-connect/core.mjs');
const ring=()=>import('../guardian/smart-260-connect/ring-direction-v941.mjs');

test('Ring direction follows each active saved commute direction, not a stale 260 vehicle',async()=>{
 const {ringDirection}=await ring(),{DEFAULT,REVERSE,HOME}=await core();
 const outward=ringDirection(DEFAULT),returning=ringDirection(REVERSE);
 assert.equal(outward.short,'Munka →\nOtthon');
 assert.equal(returning.short,'Otthon →\nMunka');
 assert.equal(outward.full,'Bécsi Corner → Otthon');
 assert.equal(returning.full,'Otthon → Bécsi Corner');
 assert.equal(ringDirection(HOME).short,'Otthon →\nÓbudai r…');
});

test('The reverse family pair has distinct and correct directional neon labels',async()=>{
 const {ringDirection}=await ring(),{FAMILY_OUTBOUND,FAMILY_RETURN}=await core();
 const toFamily=ringDirection(FAMILY_OUTBOUND),toHome=ringDirection(FAMILY_RETURN);
 assert.equal(toFamily.short,'Otthon →\nDávidék');
 assert.equal(toHome.short,'Dávidék →\nOtthon');
 assert.equal(toFamily.full,'Otthon → Dávid & Anna Otthona');
 assert.equal(toHome.full,'Dávid & Anna Otthona → Otthon');
 assert.notEqual(toFamily.short,toHome.short);
});

test('Custom route names use the exact selected template endpoints and have a safe compact length',async()=>{
 const {ringDirection}=await ring();
 const arbitrary=ringDirection({originLabel:'Kelenföld vasútállomás',destinationLabel:'Széll Kálmán tér'});
 assert.equal(arbitrary.full,'Kelenföld vasútállomás → Széll Kálmán tér');
 assert.ok(arbitrary.short.includes('→\n'));
 assert.ok(arbitrary.short.split('\n').every(line=>line.length<=12));
 const updated=ringDirection({originLabel:'Otthon',destinationLabel:'Kórház'});
 assert.equal(updated.short,'Otthon →\nKórház');
});

test('Green ring keeps countdown and source-backed clock while showing route direction',()=>{
 assert.match(html,/id="ringDirection" class="ring-direction-v941"/);
 assert.match(html,/id="countdown">--:--<\/b><small id="countdownLabel">indulásig<\/small>/);
 assert.match(html,/ring-direction-v941\.css\?v=941/);
 assert.match(html,/app\.mjs\?v=941-active-ring-direction/);
 assert.match(app,/import \{ringDirection\} from "\.\/ring-direction-v941\.mjs"/);
 assert.match(app,/function updateRingDirection\(item\)/);
 assert.match(app,/function renderFlow\(item\)\{\n updateRingDirection\(item\)/);
 assert.match(app,/if\(\/d\[aá\]vid\/i\.test\(name\)\&\&\/anna\/i\.test\(name\)\)return "Dávidék"/);
 assert.match(app,/node\.textContent=direction\.short/);
 assert.match(app,/node\.setAttribute\("aria-label","Útvonal iránya: "\+direction\.full\)/);
 assert.match(app,/\$\("countdown"\)\.textContent=/);
 assert.match(app,/setInterval\(\(\)=>updateTimeline\(Date\.now\(\)\),1000\)/);
 assert.match(css,/#ring \.ring-direction-v941/);
 assert.match(css,/body\.pinned #ring \.ring-direction-v941/);
 assert.doesNotMatch(read('ring-direction-v941.mjs'),/fetch\(|localStorage|geolocation|setInterval/);
});
