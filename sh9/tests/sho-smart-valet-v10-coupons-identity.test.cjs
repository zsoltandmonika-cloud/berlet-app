'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>readFileSync(path.join(root,p),'utf8');
const html=read('sh9/wallet/index.html');
const app=read('sh9/wallet/smart-valet-v1.js');
const privateJs=read('sh9/wallet/smart-valet-private-v7.js');
const theme=read('sh9/wallet/smart-valet-sho-theme-v2.css');
const icons=read('sh9/wallet/smart-valet-icons-v2.svg');
const sql=read('supabase/migrations/20261105164000_sho_valet_v10_coupons_only.sql');

test('Golden 4 by 2: Coupons replaces only top-level Driving licence, which moves into IDs',()=>{
 const grid=html.match(/<div class="sv-categories"[^>]*>([\s\S]*?)<\/div>/);
 assert.ok(grid,'category tile grid exists');
 const types=[...grid[1].matchAll(/data-kind="([a-z]+)"/g)].map(x=>x[1]);
 assert.deepEqual(types,['loyalty','identity','coupon','health','card','ticket','pass','document']);
 assert.doesNotMatch(grid[1],/data-kind="license"/);
 assert.match(html,/class="sv-all-chip active" data-kind="all"/);
 assert.match(html,/data-kind="coupon" aria-pressed="false"/);
 assert.match(html,/data-i18n="coupon">Kuponok/);
 assert.match(icons,/<symbol id="coupon" viewBox="0 0 32 32">/);
 assert.match(icons,/<symbol id="license" viewBox="0 0 32 32">/);
 assert.match(theme,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(html,/smart-valet-bkk-approved-v5\.js/);
 assert.match(html,/data-sh9-golden-bottom-nav="on"/);
});
test('Igazolványok has 4 selectable subclasses but no sensitive upload entrypoint',()=>{
 const idPanel=html.match(/<section id="svIdentityPanelV10"([\s\S]*?)<\/section>/);
 assert.ok(idPanel);
 assert.match(idPanel[0],/aria-labelledby="svIdentityTitleV10" hidden/);
 const types=[...idPanel[0].matchAll(/data-id-type="([a-z]+)"/g)].map(x=>x[1]);
 assert.deepEqual(types,['license','personal','taj','tax']);
 for(const name of ['Jogosítvány','Személyi igazolvány','TAJ-kártya','Lakcímkártya'])
  assert.ok(idPanel[0].includes(name),name);
 assert.match(idPanel[0],/szándé|biztonságos tárolása még nem aktív/);
 assert.doesNotMatch(idPanel[0],/type="file"|type="submit"|<form|onclick=/);
 assert.match(app,/if\(addPanel\)addPanel\.hidden=kind==='identity'/);
 assert.match(app,/if\(kind==='identity'\)return/);
 assert.match(app,/idButton\.addEventListener\('click'/);
 assert.match(app,/selectedIdType=idButton\.dataset\.idType/);
 assert.match(app,/child\.setAttribute\('aria-pressed',String\(active\)\)/);
 assert.match(app,/idNoUpload/);
 assert.match(app,/personalId:'Identity card'/);
 assert.match(app,/tajId:'TAJ health insurance card'/);
 assert.match(app,/taxId:'Address card'/);
 assert.match(theme,/\.sv-id-panel-v10\[hidden\],\.sv-add-panel\[hidden\]\{display:none!important\}/);
 assert.match(privateJs,/if\(activeCategory==='identity'\)return/);
 assert.match(privateJs,/if\(activeCategory==='identity'\)stateClose\(\)/);
 assert.doesNotMatch(sql,/'identity'|'license'|'taj'|'tax_card'|'id_card'/i,'no official ID category in database');
});
test('Coupons share owner-authenticated retail gallery and original QR/photo reader',()=>{
 assert.match(app,/coupon:'Kuponok'/);
 assert.match(app,/coupon:'Coupons'/);
 assert.match(app,/if\(kind==='loyalty'\|\|kind==='coupon'\)/);
 assert.match(privateJs,/coupon:'Kupon',couponTitle:'Kuponjaid'/);
 assert.match(privateJs,/coupon:'Coupon',couponTitle:'Your coupons'/);
 assert.match(privateJs,/svVaultCouponV10/);
 assert.match(privateJs,/value="coupon" id="svVaultCouponV10"/);
 assert.match(privateJs,/const cards=rows\.filter\(x=>x\.category===category\)/);
 assert.match(privateJs,/client\.storage\.from\(BUCKET\)\.download\(item\.storage_path\)/);
 assert.match(privateJs,/await reader\.open\(data,item\.file_name,\{mime:item\.mime_type\}\)/);
 assert.match(privateJs,/\.from\('hh_profile_access'\)\.select\('profile_key'\)/);
 assert.match(privateJs,/await c\.auth\.getUser\(\)/);
 assert.match(privateJs,/if\(!\['ticket','pass','document','loyalty','coupon'\]\.includes\(category\)\)/);
 assert.match(privateJs,/if\(activeCategory==='identity'\)return/);
 assert.doesNotMatch(privateJs,/getPublicUrl|service_role|createSignedUrl|JsBarcode|QRCodeGenerator/i);
});
test('Coupon migration changes only validated category, keeps RLS and existing originals',()=>{
 assert.match(sql,/drop constraint if exists hh_valet_items_category_check/);
 assert.match(sql,/category in \('ticket','pass','document','loyalty','coupon'\)/);
 assert.doesNotMatch(sql,/storage\.buckets|public\s*=\s*true|disable row level security|to anon|drop table|delete from|truncate/i);
 const old=read('supabase/migrations/20261105125000_sho_smart_valet_private_v7.sql');
 assert.match(old,/alter table public\.hh_valet_items enable row level security/);
 assert.match(old,/bucket_id='hh-smart-valet-private'/);
 assert.match(old,/false,15000000/);
});
test('All changed browser files parse and remain cache-busted for v10',()=>{
 for(const p of ['sh9/wallet/smart-valet-v1.js','sh9/wallet/smart-valet-private-v7.js'])
  assert.doesNotThrow(()=>new vm.Script(read(p)),p);
 assert.match(html,/smart-valet-v1\.js\?v=10-coupons-id-subgroups/);
 assert.match(html,/smart-valet-private-v7\.js\?v=10-coupon-gallery/);
 assert.match(html,/smart-valet-sho-theme-v2\.css\?v=10-coupon-id-layout/);
 assert.match(html,/smart-valet-private-v7\.css\?v=10-retail-coupons/);
});
