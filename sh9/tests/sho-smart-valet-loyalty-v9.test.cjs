'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/wallet/index.html'),demo=read('sh9/wallet/smart-valet-v1.js');
const privateJs=read('sh9/wallet/smart-valet-private-v7.js');
const privateCss=read('sh9/wallet/smart-valet-private-v7.css');
const theme=read('sh9/wallet/smart-valet-sho-theme-v2.css');
const iconpack=read('sh9/wallet/smart-valet-icons-v2.svg');
const reader=read('sh9/shared/sho-private-document-reader-v1.js');
const sql=read('supabase/migrations/20261105154000_sho_valet_loyalty_category_v9.sql');

test('exact 4×2 premium icon grid, first Club Cards instead of All; All remains fully working chip',()=>{
 const grid=html.match(/<div class="sv-categories"[^>]*>([\s\S]*?)<\/div>/);
 assert.ok(grid);
 const kinds=[...grid[1].matchAll(/data-kind="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(kinds,['loyalty','identity','coupon','health','card','ticket','pass','document']);
 assert.equal(kinds.length,8);
 assert.match(html,/class="sv-all-chip active" data-kind="all" aria-pressed="true"/);
 assert.match(html,/id="svCount"/);
 assert.match(theme,/\.sv-library-controls\{display:flex/);
 assert.match(theme,/\.sv-all-chip\.active/);
 assert.match(theme,/\.sv-categories\{\s*display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(iconpack,/<symbol id="loyalty" viewBox="0 0 32 32">/);
});
test('HU/EN Club Cards filter preserves existing ticket types and sample disclaimers',()=>{
 for(const phrase of ["loyalty:'Klubkártyák'","loyalty:'Club cards'","kind==='loyalty'","sho-valet-filter-change"])
  assert.ok(demo.includes(phrase),phrase);
 assert.match(demo,/kind='all'/);
 assert.match(demo,/button\.addEventListener\('click',/);
 assert.match(demo,/Nem érvényes belépőkód/);
 assert.match(demo,/SHO_VALET_BKK_APPROVED_V5/);
 assert.match(html,/smart-valet-bkk-approved-v5\.js/);
});
test('Private loyalty records have scrollable authentic thumbnails, safe category upload and pagination',()=>{
 assert.match(privateJs,/svLoyaltyScrollerV9/);
 assert.match(privateJs,/svLoyaltyAddV9/);
 assert.match(privateJs,/openSheet\(activeCategory\)/);
 assert.match(privateJs,/value="loyalty" id="svVaultLoyaltyV9"/);
 assert.match(privateJs,/rows\.filter\(x=>x\.category===category\)/);
 assert.match(privateJs,/cards\.slice\(0,loyaltyLimit\)/);
 assert.match(privateJs,/loyaltyLimit\+=12/);
 assert.match(privateJs,/client\.storage\.from\(BUCKET\)\.download\(item\.storage_path\)/);
 assert.match(privateJs,/pkey\(\)!==profile/);
 assert.match(privateJs,/URL\.revokeObjectURL/);
 assert.match(privateJs,/reader\.open\(data,item\.file_name,\{mime:item\.mime_type\}\)/);
 assert.match(privateCss,/\.sv-loyalty-scroller-v9\{[^}]*overflow-y:auto/);
 assert.match(privateCss,/\.sv-loyalty-card-v9/);
 assert.match(privateJs,/auth\.getUser\(\)/);
 assert.match(privateJs,/hh_profile_access/);
 assert.doesNotMatch(privateJs,/getPublicUrl|createSignedUrl|service_role|JsBarcode|QRious|qrcodegen/i);
});
test('Internal image viewer enlarges the original code without re-encoding or public links',()=>{
 assert.match(reader,/currentImage/);
 assert.match(reader,/function applyImageZoom\(\)/);
 assert.match(reader,/Math\.min\(3,Math\.max\(\.7,zoom\+delta\)\)/);
 assert.match(reader,/shoPrMinusV1/);
 assert.match(reader,/shoPrPlusV1/);
 assert.match(reader,/shoPrFitV1/);
 assert.match(reader,/original card and code/);
 assert.match(reader,/w\.URL\.createObjectURL\(file\)/);
 assert.doesNotMatch(reader,/BarcodeDetector|QRCode|JsBarcode|fetch\('http|storage\.from\('.*public/i);
});
test('Supabase adds only loyalty to private table constraint, keeps existing RLS, user ownership and media limits',()=>{
 assert.match(sql,/drop constraint if exists hh_valet_items_category_check/);
 assert.match(sql,/category in \('ticket','pass','document','loyalty'\)/);
 assert.doesNotMatch(sql,/disable row level security|to anon|with check \(true\)|storage\.buckets.*public.*true/i);
 const existing=read('supabase/migrations/20261105125000_sho_smart_valet_private_v7.sql');
 assert.match(existing,/alter table public\.hh_valet_items enable row level security/);
 assert.match(existing,/storage_path = profile_key \|\| '\/' \|\| id::text/);
 assert.match(existing,/false,15000000/);
});
test('All source JavaScript remains syntactically valid',()=>{
 for(const p of ['sh9/wallet/smart-valet-v1.js','sh9/wallet/smart-valet-private-v7.js','sh9/shared/sho-private-document-reader-v1.js'])
  assert.doesNotThrow(()=>new vm.Script(read(p)),p);
});
