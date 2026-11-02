'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v539 approved Digital Wellbeing hero owns one compact centered 4-zone dock',()=>{
 const html=read('healthhub/digital-health/index.html');
 const js=read('sh9/shared/sh9-golden-controls-v1.js');
 const css=read('healthhub/digital-health/digital-wellbeing-dock-fit-v539.css');
 assert.match(html,/digital-wellbeing-dock-fit-v539\.css\?v=539-compact-center/);
 assert.match(html,/sh9-golden-controls-v1\.js\?v=539-digital-hero-dock/);
 assert.ok(html.indexOf('sh9-golden-controls-v1.css')<
           html.indexOf('digital-wellbeing-dock-fit-v539.css'),
           'Local overrides follow shared Golden CSS');
 assert.match(js,/\.dw-wellbeing-hero-plate-v538 > \.hero-art/);
 assert.match(js,/if\(\/\\\/healthhub\\\/digital-wellbeing-preview\\\//);
 assert.match(css,/width:min\(328px,calc\(100% - 16px\)\)!important/);
 assert.match(css,/left:50%!important/);
 assert.match(css,/transform:translateX\(-50%\)!important/);
 assert.match(css,/top:9px!important/);
 assert.match(css,/position:absolute!important/);
 assert.doesNotMatch(css,/height:|background:|font-size:|pointer-events:/);
});

test('v539 modifies neither Family Guard nor Sleep, transport or bottom nav',()=>{
 const html=read('healthhub/digital-health/index.html');
 const css=read('healthhub/digital-health/digital-wellbeing-dock-fit-v539.css');
 assert.match(css,/\.dw-wellbeing-hero-plate-v538 > \.hero-art\[data-sh9-golden-host="on"\]/);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(html,/digital-live-v507\.js/);
 assert.match(html,/digital-wellbeing-glass-backplate-v537\.css/);
 assert.match(html,/digital-wellbeing-hero-plate-v538\.css/);
 assert.equal((html.match(/<article class="card/g)||[]).length,8);
 const other=read('healthhub/guardian/index.html');
 assert.match(other,/sh9-golden-controls-v1\.js\?v=934-unified-glass-dock/);
 const health=read('healthhub/index.html');
 assert.match(health,/sh9-golden-controls-v1\.js\?v=936-sleep-extra-lift5/);
});
