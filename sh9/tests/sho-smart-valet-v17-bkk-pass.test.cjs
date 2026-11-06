'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('sh9/wallet/index.html');
const demo=read('sh9/wallet/smart-valet-v1.js');
const extra=read('sh9/wallet/smart-valet-extra-v15.js');
const optical=read('sh9/wallet/smart-valet-optical-v16.js');
const legacy=read('sh9/wallet/smart-valet-bkk-legacy-v17.js');
const viewer=read('sh9/wallet/smart-valet-bkk-fullscreen-v17.js');
const css=read('sh9/wallet/smart-valet-bkk-fullscreen-v17.css');
const migration=read('supabase/migrations/20261106014500_sho_valet_budapest_pass_v17.sql');
const oldApp=read('app.js');
test('existing Budapest pass tile opens the real unified optical card workflow',()=>{
 assert.match(demo,/item\.provider==='BKK'&&item\.kind==='pass'/);
 assert.match(demo,/SHO_VALET_EXTRA_V15\?\.openBudapest/);
 assert.match(extra,/async function openBudapest\(\)/);
 assert.match(extra,/function getBudapestId\(\)/);
 assert.match(extra,/category==='pass'/);
 assert.match(extra,/w\.SHO_VALET_EXTRA_V15=Object\.freeze/);
 assert.match(page,/smart-valet-bkk-fullscreen-v17\.js/);
 assert.match(page,/smart-valet-bkk-legacy-v17\.js/);
 assert.match(page,/id="svBkkFullTemplateV17"/);
 assert.match(page,/id="svLegacyPassLinkV17"/);
});
test('BKK camera uses same optical scanner but never clips QR/barcodes',()=>{
 assert.match(extra,/w\.SHO_VALET_OPTICAL_V16/);
 assert.match(extra,/preserveWhole:cat==='pass'/);
 assert.match(optical,/preserveWhole=options\.preserveWhole===true/);
 assert.match(optical,/cw=preserveWhole\?src\.width:/);
 assert.match(optical,/ch=preserveWhole\?src\.height:/);
 assert.match(optical,/passRatio=passRatio===\.72\?RATIO:\.72/);
 assert.match(optical,/svOptRotateV17/);
 assert.match(extra,/cat==='pass'&&\(!files\.front\|\|!files\.back\)/);
});
test('old app copied read-only, explicitly, with original images untouched',()=>{
 assert.match(oldApp,/DB='berlet-db',STORE='images'/);
 assert.match(legacy,/indexedDB\.open\('berlet-db',1\)/);
 assert.match(legacy,/db\.transaction\('images','readonly'\)/);
 assert.match(legacy,/store\.get\('front'\)/);
 assert.match(legacy,/store\.get\('back'\)/);
 assert.doesNotMatch(legacy,/\.delete\(|\.clear\(|\.put\(/);
 assert.match(extra,/w\.confirm\(/);
 assert.match(extra,/async function importLegacy\(\)/);
 assert.match(extra,/w\.SHO_BKK_LEGACY_V17\.read\(\)/);
 assert.match(extra,/setPassPhoto\('front',photos\.front/);
 assert.match(extra,/setPassPhoto\('back',photos\.back/);
});
test('screen-locked fullscreen pass photo viewer supports portrait, flip, zoom, pinch and fitting',()=>{
 assert.match(viewer,/requestFullscreen/);
 assert.match(viewer,/wakeLock\.request\('screen'\)/);
 assert.match(viewer,/data-bkk-side/);
 assert.match(viewer,/initialDistance/);
 assert.match(viewer,/pointermove/);
 assert.match(viewer,/Math\.min\(5,Math\.max\(1,value\)\)/);
 assert.match(page,/id="svBkkFullImageV17"/);
 assert.match(page,/id="svBkkZoomInV17"/);
 assert.match(page,/id="svBkkFitV17"/);
 assert.match(css,/object-fit:contain/);
 assert.match(extra,/svExtraInspectV17/);
 assert.match(extra,/SHO_BKK_FULLSCREEN_V17/);
});
test('encrypted offline pass works after saved copy and profile isolation',()=>{
 assert.match(extra,/PASS_DB='sho-bkk-secure-cache-v17'/);
 assert.match(extra,/function passDB\(\)/);
 assert.match(extra,/async function cachePassRecord\(rec,owner\)/);
 assert.match(extra,/rec\.front_cipher/);
 assert.match(extra,/rec\.back_cipher/);
 assert.match(extra,/profile_key===p/);
 assert.match(extra,/offlinePassRecord\(p,id\)/);
 assert.match(extra,/passCache\('list',p,''\)/);
 assert.match(extra,/if\(cat==='pass'\)/);
 assert.match(extra,/crypto\.subtle/);
 assert.doesNotMatch(extra,/localStorage\.setItem\(.*front_cipher/);
});
test('no fake ticket validity: encrypted pass is a photograph, not an official mobile ticket',()=>{
 assert.match(page,/nem hivatalos digitális bérlet/);
 assert.match(migration,/category='pass' AND issuer='BKK'/);
 assert.match(migration,/front_cipher IS NOT NULL AND back_cipher IS NOT NULL/);
 assert.doesNotMatch(viewer,/fakeQR|generateQR|ticketValid|createPublicURL/);
 assert.match(extra,/szükséges/);
});
test('all new JavaScript compiles, existing root app remains intact for migration',()=>{
 for(const source of [demo,extra,optical,legacy,viewer])
  assert.doesNotThrow(()=>new vm.Script(source));
 assert.match(page,/href="\/berlet-app\/" id="svLegacyPassLinkV17"/);
 assert.match(oldApp,/indexedDB\.open\(DB,1\)/);
});