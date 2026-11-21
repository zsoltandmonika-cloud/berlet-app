'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/index.html');
const css=read('sh9/sh9-ota-indicator-v1043.css');
const browser=read('sh9/sh9-ota-browser-v1067.js');
const native=read('sh9/sh9-ota-indicator-v1043.js');

test('OTA dialog is a top-level layer and no longer clipped inside the SHO hero',()=>{
 const index=html.indexOf('<section id="sh9OtaManualV1044"');
 assert.ok(index>html.indexOf('</main>'),'dialog must be outside the isolated/clipped main hero');
 assert.ok(index<html.indexOf('</body>'));
 assert.equal((html.match(/id="sh9OtaManualV1044"/g)||[]).length,1);
 assert.match(html,/role="dialog" aria-modal="true" aria-label="HH One OTA állapot és frissítés"/);
 assert.match(html,/id="sh9OtaManualCloseV1044"/);
 assert.match(html,/id="sh9OtaRefreshV1067"/);
 assert.match(html,/sh9-ota-indicator-v1043\.css\?v=1068-modal-top-layer/);
});
test('OTA backdrop remains above all tiles and nav; TV shortcut hidden only while dialog open',()=>{
 assert.match(css,/body > #sh9OtaManualV1044\.sh9-ota-manual-v1044:not\(\[hidden\]\)\{\s*position:fixed;\s*z-index:1001/);
 assert.match(css,/body:has\(> #sh9OtaManualV1044:not\(\[hidden\]\)\)::before/);
 assert.match(css,/z-index:1000/);
 assert.match(css,/body:has\(> #sh9OtaManualV1044:not\(\[hidden\]\)\) #shoTvShortcutV1\{\s*display:none!important/);
 assert.match(css,/\.sh9-ota-manual-v1044\[hidden\]/);
});
test('browser and native OTA dialogs stay closed after user dismisses a pending fallback',()=>{
 for(const source of [browser,native])assert.match(source,/fallbackToken\+\+/);
 assert.match(browser,/token===fallbackToken&&!d.hidden/);
 assert.match(native,/token===fallbackToken&&!d.hidden/);
 assert.match(browser,/fallbackToken\+\+;panel\.hidden=true;lamp\.focus\(\)/);
 assert.match(native,/fallbackToken\+\+;manual\.hidden=true;el\.focus\(\)/);
 assert.match(browser,/if\(!busy\)void check\(true\)/);
 assert.match(browser,/MAX_AGE=20\*60\*1000/,'stale device reports must remain unknown');
});
