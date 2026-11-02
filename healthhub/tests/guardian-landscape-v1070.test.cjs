'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Family Guard production has the landscape asset after original live pack',()=>{
 const html=read('healthhub/guardian/index.html');
 assert.ok(html.indexOf('guardian-device-pack-live-v1056.css')<
           html.indexOf('guardian-device-pack-landscape-v1070.css'));
 assert.ok(html.indexOf('guardian-device-pack-live-v1056.js')<
           html.indexOf('guardian-device-pack-landscape-v1070.js'));
 for(const id of ['guardianBatteryV841','guardianGpsCardV845','guardianHealthCardV845',
                  'guardianMap','guardianProfileSwitch']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/sh9-golden-controls-v1\.js\?v=934-unified-glass-dock/);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
});

test('Family Guard 4×2 landscape grid keeps all eight native state providers',()=>{
 const css=read('healthhub/guardian/guardian-device-pack-landscape-v1070.css');
 const js=read('healthhub/guardian/guardian-device-pack-landscape-v1070.js');
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-template-rows:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/height:76px!important/);
 assert.match(css,/bottom:55px!important/);
 assert.match(css,/\.guardian-hero > #guardianDevicePackLogoV1054/);
 assert.match(js,/cards\.length!==8/);
 assert.match(js,/hero\.insertBefore\(logo,pack\)/);
 for(const id of ['guardianBatteryV841','guardianGpsCardV845','guardianHealthCardV845',
                  'guardianPackOtaV1053','guardianPackWifiV1053','guardianPackMobileV1053',
                  'guardianPackBluetoothV1053','guardianPackCloudV1053']){
  assert.ok(js.includes(id),id);
 }
 assert.doesNotMatch(js,/fetch\(|geolocation|supabase|dropbox|setInterval|setTimeout/i);
});
