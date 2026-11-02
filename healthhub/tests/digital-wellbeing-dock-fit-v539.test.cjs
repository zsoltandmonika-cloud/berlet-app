'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v540 Plan B: full Golden Dock fits former title/status row below Hero image',()=>{
 const html=read('healthhub/digital-health/index.html');
 const js=read('sh9/shared/sh9-golden-controls-v1.js');
 const css=read('healthhub/digital-health/digital-wellbeing-dock-slot-v540.css');
 const block=html.slice(html.indexOf('<main class="shell">'),
                        html.indexOf('<div class="title-row">',html.indexOf('<main class="shell">')));
 assert.match(html,/digital-wellbeing-dock-slot-v540\.css\?v=540-plan-b-under-hero/);
 assert.match(html,/sh9-golden-controls-v1\.js\?v=540-plan-b-title-slot/);
 assert.ok(html.indexOf('sh9-golden-controls-v1.css')<
           html.indexOf('digital-wellbeing-dock-slot-v540.css'));
 assert.ok(block.indexOf('id="heroPicture"')<block.indexOf('id="dwWellbeingDockSlotV540"'));
 assert.ok(block.indexOf('id="dwWellbeingDockSlotV540"')<block.indexOf('id="headline"'));
 assert.doesNotMatch(block,/HEALTHHUB · PERSONAL INTELLIGENCE|KÖZPONTI ADATOKRA VÁR|<header class="header">/);
 assert.match(js,/return d\.querySelector\('\.dw-wellbeing-hero-plate-v538 > #dwWellbeingDockSlotV540'\)\|\|d\.body;/);
 assert.match(css,/width:calc\(100% - 4px\)!important/);
 assert.match(css,/height:50px!important/);
 assert.match(css,/position:absolute!important/);
 assert.match(css,/top:1px!important/);
 assert.match(css,/right:2px!important/);
 assert.doesNotMatch(css,/#sh9LanguageSwitchV1|\.hero-art\[data-sh9-golden-host/);
});
test('v540 preserves the page features and other module placements',()=>{
 const html=read('healthhub/digital-health/index.html');
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(html,/digital-live-v507\.js/);
 assert.match(html,/digital-wellbeing-glass-backplate-v537\.css/);
 assert.match(html,/digital-wellbeing-hero-plate-v538\.css/);
 assert.equal((html.match(/<article class="card/g)||[]).length,8);
 assert.match(read('healthhub/guardian/index.html'),/sh9-golden-controls-v1\.js\?v=934-unified-glass-dock/);
 assert.match(read('healthhub/index.html'),/sh9-golden-controls-v1\.js\?v=936-sleep-extra-lift5/);
});
