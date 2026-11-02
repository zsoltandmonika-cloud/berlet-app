'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sh9=path.resolve(__dirname,'..');
const root=path.resolve(sh9,'..');
const read=p=>fs.readFileSync(path.join(sh9,p),'utf8');
const head=read('index.html');
const manifest=JSON.parse(read('manifest.webmanifest'));
const worker=read('sw.js');
const launcher=read('pwa-install-v1.js');

test('SHO preserves the existing SH9 stable PWA identity rather than creating a second app',()=>{
 assert.equal(manifest.id,'/berlet-app/sh9/');
 assert.equal(manifest.start_url,'/berlet-app/sh9/?source=installed');
 assert.equal(manifest.scope,'/berlet-app/');
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.name,'SHO · Smart Hub One');
 assert.equal(manifest.short_name,'SHO');
 assert.ok(manifest.start_url.startsWith(manifest.scope));
 const berlet=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.notEqual(manifest.id,berlet.id||new URL(berlet.start_url,'https://example.com/berlet-app/').pathname);
 assert.match(head,/<link rel="manifest" href="\.\/manifest\.webmanifest\?v=sho-fancy-v1">/);
});

test('approved Fancy SHO monogram is the actual Chrome/Edge install, maskable, shortcut and touch icon',()=>{
 const required=[
  {src:'./assets/sho-fancy-install-192-v1.png',sizes:'192x192',purpose:'any'},
  {src:'./assets/sho-fancy-install-512-v1.png',sizes:'512x512',purpose:'any'},
  {src:'./assets/sho-fancy-maskable-512-v1.png',sizes:'512x512',purpose:'maskable'}
 ];
 for(const expected of required){
  const icon=manifest.icons.find(x=>x.src===expected.src);
  assert.ok(icon,'Manifest icon missing: '+expected.src);
  assert.equal(icon.sizes,expected.sizes);
  assert.equal(icon.purpose,expected.purpose);
  assert.equal(icon.type,'image/png');
  const filename=path.join(sh9,icon.src);
  assert.ok(fs.existsSync(filename),'Approved PNG missing: '+filename);
  const bytes=fs.readFileSync(filename);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
  assert.equal(bytes.readUInt32BE(20),Number(icon.sizes.split('x')[1]));
 }
 const svg=manifest.icons.find(x=>x.src==='./sho-preview/favicon.svg');
 assert.ok(svg);
 assert.equal(svg.type,'image/svg+xml');
 assert.equal(svg.sizes,'any');
 const original=read('sho-preview/favicon.svg');
 assert.match(original,/SHO/);
 assert.match(original,/#ff82d2/);
 assert.match(head,/rel="icon" type="image\/svg\+xml" href="\.\/sho-preview\/favicon\.svg\?v=sho-fancy-v1"/);
 assert.match(head,/rel="icon" type="image\/png" sizes="192x192" href="\.\/assets\/sho-fancy-install-192-v1\.png"/);
 assert.match(head,/rel="apple-touch-icon" sizes="180x180" href="\.\/assets\/sho-fancy-touch-180-v1\.png"/);
 const touch=fs.readFileSync(path.join(sh9,'assets/sho-fancy-touch-180-v1.png'));
 assert.equal(touch.readUInt32BE(16),180);
 assert.match(head,/class="grid"/);
 assert.match(head,/data-name="HealthHub"/);
 assert.match(head,/data-name="Family Guard"/);
});

test('SHO updates only its isolated PWA shell cache; no logged-in health or OAuth data are cached',()=>{
 assert.match(head,/<script src="\.\/pwa-install-v1\.js\?v=1" defer><\/script>/);
 assert.match(launcher,/navigator\.serviceWorker\.register\('\.\/sw\.js',\{scope:'\.\/'\}\)/);
 assert.match(worker,/const CACHE='sh9-install-shell-v2-sho-fancy'/);
 for(const file of ['sho-preview/favicon.svg','assets/sho-fancy-install-192-v1.png',
  'assets/sho-fancy-install-512-v1.png','assets/sho-fancy-maskable-512-v1.png',
  'assets/sho-fancy-touch-180-v1.png'])assert.ok(worker.includes(file),file);
 assert.match(worker,/req\.method!=='GET'/);
 assert.match(worker,/url\.origin!==self\.location\.origin/);
 assert.match(worker,/!ALLOWED\.has/);
 assert.match(worker,/url\.searchParams\.has\('code'\)/);
 assert.doesNotMatch(worker,/caches\.open\([\s\S]*?HealthHub\/profiles|dropbox_access_token|cache\.put\([\s\S]*?\/healthhub\//i);
 assert.doesNotMatch(launcher,/location\.(assign|replace)|window\.open\(/);
});
