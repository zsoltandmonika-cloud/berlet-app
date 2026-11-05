'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/wallet/index.html');
const identity=read('sh9/wallet/smart-valet-identity-v11.js');
const extra=read('sh9/wallet/smart-valet-extra-v15.js');
const optical=read('sh9/wallet/smart-valet-optical-v16.js');
const css=read('sh9/wallet/smart-valet-optical-v16.css');
const extraCss=read('sh9/wallet/smart-valet-extra-v15.css');
const migration=read('supabase/migrations/20261106024500_sho_valet_bank_masked_photos_v16.sql');
test('one optical frame is used by all three card categories',()=>{
 assert.match(html,/smart-valet-optical-v16\.js\?v=16-one-frame/);
 assert.match(html,/svExtraUnifiedTemplateV16/);
 assert.match(identity,/w\.SHO_VALET_OPTICAL_V16/);
 assert.match(extra,/w\.SHO_VALET_OPTICAL_V16/);
 assert.match(identity,/shared\.capture\(\{title:label\(kind\),side:which,mode\}\)/);
 assert.match(extra,/bankRedact:cat==='card'/);
 assert.match(optical,/w\.SHO_VALET_OPTICAL_V16=Object\.freeze\(\{capture,ratio:RATIO,version:16\}\)/);
 assert.match(css,/#svOptVideoV16/);
});
test('same ID optical frame aspect, centered corner guide, adjustable fit, camera and fallback',()=>{
 assert.match(optical,/RATIO=1\.586/);
 assert.match(optical,/class="sv-id-camera-guide-v11"/);
 assert.match(optical,/class="sv-id-crop-frame-v11"/);
 assert.match(optical,/id="svOptX"/);
 assert.match(optical,/id="svOptY"/);
 assert.match(optical,/id="svOptZoom"/);
 assert.match(optical,/getUserMedia\(/);
 assert.match(optical,/svOptCameraInputV16/);
 assert.match(optical,/ctx\.drawImage\(src\.image,/);
 assert.match(html,/id="svExtraFrontPreviewV16"/);
 assert.match(html,/id="svExtraBackPreviewV16"/);
});
test('all extra categories reuse the full-screen ID style and 3D flip',()=>{
 assert.match(extra,/sv-id-dialog-v11 sv-extra-dialog-v15/);
 assert.match(extra,/svExtraUnifiedTemplateV16/);
 assert.match(html,/class="sv-id-two-sides-v11"/);
 assert.match(html,/class="sv-id-flipper-v11" id="svExtraFlipV15"/);
 assert.match(html,/class="sv-id-face-v11 is-front"/);
 assert.match(html,/class="sv-id-face-v11 is-back"/);
 assert.match(html,/id="svExtraSideSwitchV16"/);
 assert.match(extraCss,/\.sv-id-dialog-v11\.sv-extra-dialog-v15/);
 assert.match(extraCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('bank card original image must be locally redacted before encryption and upload',()=>{
 assert.match(optical,/if\(purpose==='bank'\)/);
 assert.match(optical,/if\(!imageBlob\|\|!rects\.length\)/);
 assert.match(optical,/fillStyle='#080b1d'/);
 assert.match(optical,/for\(const r of rects\)ctx\.fillRect/);
 assert.match(optical,/end\(safe\)/);
 assert.match(extra,/const photo=await api\.capture/);
 assert.match(extra,/bankRedact:cat==='card'/);
 assert.match(extra,/rec\.front_cipher=await encrypt\(front,key,rec,'front'\)/);
 assert.match(extra,/rec\.back_cipher=await encrypt\(back,key,rec,'back'\)/);
 assert.doesNotMatch(optical,/getPublicUrl|service_role|localStorage\.setItem/i);
 assert.doesNotMatch(extra,/id="svExtraCVV"|id="svExtraPAN"/);
});
test('bank card encrypted photos optional, health image required, both require passphrase',()=>{
 assert.match(extra,/if\(cat==='health'&&!files\.front\)throw Error\('NO_FRONT'\)/);
 assert.match(extra,/if\(files\.front\)\{/);
 assert.match(extra,/pass\.length<8\|\|pass!==/);
 assert.match(extra,/if\(!rec\|\|!rec\.front_cipher\|\|busy\)return/);
 assert.match(migration,/hh_valet_extra_v16_card_shape/);
 assert.match(migration,/hh_valet_extra_v16_back_requires_front/);
 assert.match(migration,/front_cipher is null and back_cipher is null and kdf_salt is null/);
});
test('no scanner leftovers or decrypted images when leaving the page or hiding app',()=>{
 assert.match(optical,/visibilitychange/);
 assert.match(optical,/pagehide/);
 assert.match(optical,/stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(extra,/function release\(\)/);
 assert.match(identity,/if\(shared\?\.capture\)/);
 for(const script of [optical,identity,extra])
  assert.doesNotThrow(()=>new vm.Script(script));
});
