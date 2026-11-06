'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/wallet/index.html');
const css=read('sh9/wallet/smart-valet-v1.css');
const js=read('sh9/wallet/smart-valet-v1.js');
const routing=read('sh9/sho-preview/sho-wiring-v2.js');
const home=read('sh9/index.html');
const preview=read('sh9/sho-preview/index.html');
test('new canonical Smart Valet route is full-screen and uses original SHO Golden Standard',()=>{
 assert.match(html,/<main class="sv-shell"/);
 assert.match(html,/class="sv-hero hero"/);
 assert.match(html,/sh9-golden-controls-v1.css/);
 assert.match(html,/sh9-golden-controls-v1.js/);
 assert.match(html,/sh9-golden-bottom-nav-v924.css/);
 assert.match(html,/sh9-golden-bottom-nav-v924.js/);
 assert.match(html,/data-sh9-golden-bottom-nav="on"/);
 assert.equal((html.match(/data-sh9-bottom-role=/g)||[]).length,3);
 assert.match(css,/#79bfff/);
 assert.match(css,/#f9a6d3/);
 assert.match(css,/background:rgba\(8,33,67,\.94\)/);
 assert.match(css,/@media\(max-width:410px\)/);
});
test('Wallet launcher and old preview both route to the same new screen without changing the 12 start tiles',()=>{
 assert.match(routing,/goto\(SH9\+'wallet\/'\);return/);
 assert.match(routing,/\$\('heroWallet'\)\.onclick=wallet/);
 assert.match(routing,/params\.get\('sho'\)==='wallet'/);
 assert.match(routing,/params\.delete\('sho'\)/);
 assert.match(home,/sho-wiring-v2\.js\?v=936-activity-one-route/);
 assert.match(preview,/sho-wiring-v2\.js\?v=936-activity-one-route/);
 assert.equal((home.match(/class="tile" data-module=/g)||[]).length,12);
});
test('five categories, search and demo pinning are interactive, but only a sample ID is persisted per profile',()=>{
 for(const id of ['all','ticket','pass','document','card'])
  assert.match(html,new RegExp('data-kind="'+id+'"'));
 assert.match(html,/id="svSearch"/);
 assert.match(html,/id="svFeatured"/);
 assert.match(html,/id="svCards"/);
 assert.match(js,/addEventListener\('input',renderCards\)/);
 assert.match(js,/button\.addEventListener\('click'/);
 assert.match(js,/pinKey=\(\)=>'sho-smart-valet-demo-pin-v1:'\+profile\(\)/);
 assert.match(js,/w\.localStorage\.setItem\(pinKey\(\),value\)/);
 assert.match(js,/w\.localStorage\.removeItem\(pinKey\(\)\)/);
 assert.match(js,/items\[profile\(\)\]/);
});
test('the sample ticket modal is accessible and cannot masquerade as a valid scannable ticket',()=>{
 assert.match(html,/role="dialog" aria-modal="true"/);
 assert.match(html,/id="svDialogTitle"/);
 assert.match(html,/id="svDialogPin"/);
 assert.match(html,/Nem érvényes belépőkód/);
 assert.doesNotMatch(html,/class="sv-demo-notice"/);
 assert.match(html,/class="sv-modal-mark" data-i18n="demoTag"/);
 assert.match(html,/data-i18n="sampleBadge">MINTA/);
 assert.match(html,/id="svAdd" disabled/);
 assert.doesNotMatch(html.split('<template id="svIdTemplateV11">')[0],/<input[^>]+type="file"/i);
 assert.doesNotMatch(html.split('<template id="svIdTemplateV11">')[0],/<(canvas|video)\b/i);
 assert.match(js,/if\(e\.key==='Escape'\)/);
 assert.match(js,/if\(e\.key==='Tab'\)/);
 assert.match(js,/function closeModal\(\)/);
 assert.doesNotMatch(js,/fetch\(|createClient|supabase|FileReader|toDataURL|BarcodeDetector/);
});
test('genuine Bérlet and Sport Central links are present, while document upload stays disabled',()=>{
 assert.match(html,/href="\/berlet-app\/"/);
 assert.match(html,/href="\.\.\/sport\/"/);
 assert.match(html,/private|privát/i);
 assert.match(html,/aria-describedby="svAddTitle"/);
 assert.match(js,/categoryDocument/);
 assert.match(js,/categoryCard/);
});
test('HU/EN bilingual UI, both sample profiles and source JS parse correctly',()=>{
 for(const phrase of ['Zsolt','Mónika','Budapest-bérlet','Autóbuszjegy','Smart Valet','Secure Vault'])
  assert.ok((js+html).includes(phrase),phrase);
 assert.match(js,/function translateStatic\(\)/);
 assert.match(js,/w\.addEventListener\('sh9:languagechange'/);
 assert.match(js,/w\.addEventListener\('hh-family-profile-changed'/);
 assert.match(js,/w\.addEventListener\('storage'/);
 assert.match(js,/d\.documentElement\.lang=lang\(\)/);
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.doesNotThrow(()=>new vm.Script(routing));
});
