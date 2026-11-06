'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const extra=fs.readFileSync(path.join(root,'sh9/wallet/smart-valet-extra-v15.js'),'utf8');
const viewer=fs.readFileSync(path.join(root,'sh9/wallet/smart-valet-bkk-fullscreen-v17.js'),'utf8');
const page=fs.readFileSync(path.join(root,'sh9/wallet/index.html'),'utf8');
test('tapping a saved Budapest pass skips the extra full-screen button after successful unlock',()=>{
 assert.match(extra,/openSaved\(rec\.id,\{inspect:rec\.category==='pass'\}\)/);
 assert.match(extra,/async function openSaved\(id,options=\{\}\)/);
 assert.match(extra,/autoInspect=options\.inspect===true/);
 assert.match(extra,/if\(autoInspect&&rec\.category==='pass'&&viewURLs\[0\]\)/);
 assert.match(extra,/w\.SHO_BKK_FULLSCREEN_V17\?\.show\(\{/);
 assert.match(extra,/frontUrl:viewURLs\[0\],backUrl:viewURLs\[1\]\|\|null/);
 assert.match(extra,/title:rec\.title,fullscreen:true/);
});
test('password protection stays mandatory and fullscreen starts only after successful decryption',()=>{
 const keyCheck=extra.indexOf("else key=await keyFor(pass,decode(rec.kdf_salt))");
 const decrypt=extra.indexOf("const first=await decrypt(rec.front_cipher,key,rec,'front')");
 const profileCheck=extra.indexOf("if(profile()!==p||active?.id!==rec.id");
 const launch=extra.indexOf("if(autoInspect&&rec.category==='pass'&&viewURLs[0])");
 assert.ok(keyCheck>=0&&keyCheck<decrypt);
 assert.ok(decrypt<profileCheck&&profileCheck<launch);
 assert.match(extra,/mode==='password'&&pass\.length<8/);
 assert.match(extra,/if\(rec\.front_cipher&&modeOf\(rec\)==='device'\)void unlock\(\)/);
 assert.doesNotMatch(extra,/localStorage\.setItem\(['"]password/);
});
test('every saved pass entry point uses automatic inspection, other card types retain their normal viewer',()=>{
 assert.match(extra,/renderCategory\(\);await openSaved\(id,\{inspect:pinned\.category==='pass'\}\)/);
 assert.match(extra,/await openSaved\(rows\[0\]\.id,\{inspect:true\}\)/);
 assert.match(extra,/category=pass\(\?:&\|\$\)/);
 assert.match(extra,/return openSaved\(rows\[0\]\.id,\{inspect:true\}\)/);
 assert.match(extra,/else openAdd\(\)/);
 assert.match(extra,/onClose:\(\)=>\{if\(active\?\.id===id&&profileAtOpen===owner\)close\(\)\}/);
 assert.match(viewer,/typeof onClose==='function'/);
 assert.match(viewer,/if\(typeof done==='function'\)try\{done\(\)\}/);
});
test('native fullscreen is attempted, CSS viewport fallback remains and 90-degree default is preserved',()=>{
 assert.match(viewer,/if\(fullscreen&&dlg\.requestFullscreen\)/);
 assert.match(viewer,/\.catch\(\(\)=>\{\}\)/);
 assert.match(viewer,/rotation=90/);
 assert.match(page,/class="sv-bkk-full-v17"/);
 assert.match(page,/id="svBkkRotateV18"/);
 assert.doesNotThrow(()=>new vm.Script(extra));
 assert.doesNotThrow(()=>new vm.Script(viewer));
});
