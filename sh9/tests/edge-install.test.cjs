'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sh9=path.resolve(__dirname,'..');
const root=path.resolve(sh9,'..');
const read=(p)=>fs.readFileSync(path.join(sh9,p),'utf8');
const head=read('index.html');
const manifest=JSON.parse(read('manifest.webmanifest'));
const worker=read('sw.js');
const launcher=read('pwa-install-v1.js');

test('SH9 has its own stable Edge install identity, never the unrelated Bérlet PWA',()=>{
 assert.equal(manifest.id,'/berlet-app/sh9/');
 assert.equal(manifest.start_url,'/berlet-app/sh9/?source=installed');
 assert.equal(manifest.scope,'/berlet-app/');
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.short_name,'SH9');
 assert.ok(manifest.start_url.startsWith(manifest.scope));
 const berlet=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.notEqual(manifest.id,berlet.id||new URL(berlet.start_url,'https://example.com/berlet-app/').pathname);
 assert.match(head,/<link rel="manifest" href="\.\/manifest\.webmanifest">/);
});

test('PWA reuses SH9 approved icon, no replacement of launcher or 3x3 layout',()=>{
 for(const i of manifest.icons){
   assert.ok(fs.existsSync(path.join(sh9,i.src)));
   assert.match(i.src,/^(\.\/)?(assets\/sh9-icon\.png|pwa-icon\.svg)$/);
 }
 assert.match(head,/\.\/assets\/sh9-icon\.png/);
 assert.match(head,/class="grid"/);
 assert.match(head,/data-name="HealthHub"/);
 assert.match(head,/data-name="Family Guard"/);
});

test('SH9 registers only its own isolated shell; no logged-in data or health records cached',()=>{
 assert.match(head,/<script src="\.\/pwa-install-v1\.js\?v=1" defer><\/script>/);
 assert.match(launcher,/navigator\.serviceWorker\.register\('\.\/sw\.js',\{scope:'\.\/'\}\)/);
 assert.match(worker,/const CACHE='sh9-install-shell-v1'/);
 assert.match(worker,/req\.method!=='GET'/);
 assert.match(worker,/url\.origin!==self\.location\.origin/);
 assert.match(worker,/!ALLOWED\.has/);
 assert.match(worker,/url\.searchParams\.has\('code'\)/);
 assert.doesNotMatch(worker,/caches\.open\([\s\S]*?HealthHub\/profiles|dropbox_access_token|cache\.put\([\s\S]*?\/healthhub\//i);
 assert.doesNotMatch(launcher,/location\.(assign|replace)|window\.open\(/);
});

console.log('SH9 Edge PWA installable shell: verified');
