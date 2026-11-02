'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Digital Wellbeing hero uses one outer plate for photo, heading and clock',()=>{
 const html=read('healthhub/digital-health/index.html');
 const start=html.indexOf('<div class="dw-wellbeing-hero-plate-v538"');
 const end=html.indexOf('<!-- /.dw-wellbeing-hero-plate-v538 -->',start);
 assert.ok(start>0&&end>start,'whole hero has one wrapper');
 const area=html.slice(start,end);
 for(const part of ['class="hero-art"','id="heroPicture"','class="header"',
                    'class="hero"','id="dwClockTime"','id="headline"']){
  assert.ok(area.includes(part),'Missing hero component: '+part);
 }
 assert.ok(end<html.indexOf('<section class="cards"'),'tiles remain outside upper plate');
 assert.equal((html.match(/<section class="cards"/g)||[]).length,1);
 assert.equal((html.match(/<article class="card/g)||[]).length,8);
 assert.match(html,/digital-wellbeing-glass-backplate-v537.css\?v=537-stroke-opaque-board/);
 assert.match(html,/digital-wellbeing-hero-plate-v538.css\?v=538-single-stroked-glass/);
 assert.match(html,/sh9-golden-controls-v1.js\?v=539-digital-hero-dock/);
 assert.match(html,/digital-live-v507.js/);
});

test('Hero and tiles have matching premium blue/pink borders without obstructing clicks',()=>{
 const css=read('healthhub/digital-health/digital-wellbeing-hero-plate-v538.css');
 const cards=read('healthhub/digital-health/digital-wellbeing-glass-backplate-v537.css');
 assert.match(css,/\.shell > \.dw-wellbeing-hero-plate-v538/);
 assert.match(css,/margin:-9px -9px 0/);
 assert.match(css,/padding:8px 8px 11px/);
 assert.match(css,/border:1px solid rgba\(174,213,247,.37\)/);
 assert.match(css,/html\[data-hh-digital-dock-profile="m"\]/);
 assert.match(css,/rgba\(249,166,211,.43\)/);
 assert.match(css,/backdrop-filter:blur\(12px\) saturate\(125%\)/);
 assert.match(cards,/\.shell > section.cards::before/);
 assert.match(cards,/pointer-events:none/);
 assert.doesNotMatch(css,/pointer-events:none|position:fixed|#sh9UnifiedGlassDockV34|#hhDigitalProfileDock/);
});
