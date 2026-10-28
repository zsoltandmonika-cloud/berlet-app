const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const link=require(path.join(base,'rail-official-v1.js'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');

test('distinct audited railway destinations, no invented APIs or deep links',()=>{
 assert.equal(link.URLS.timetable,'https://mavplusz.hu/');
 assert.equal(link.URLS.liveTrains,'https://vonatinfo.mav.hu/');
 assert.equal(link.URLS.tickets,'https://jegy.mav.hu/');
 assert.equal(link.URLS.keletiBoard,'https://mikorindul.hu/keleti');
 assert.equal(link.URLS.nyugatiBoard,'https://mikorindul.hu/nyugati');
 assert.equal(link.URLS.alerts,'https://www.mavcsoport.hu/mavinform');
 assert.equal(new Set([link.URLS.timetable,link.URLS.liveTrains,link.URLS.tickets,link.URLS.keletiBoard,link.URLS.keletiStation,link.URLS.alerts]).size,6);
 assert.ok(Object.values(link.URLS).every(link.allowedUrl));
 assert.equal(link.allowedUrl('https://evil.example/'),false);
 assert.equal(link.allowedUrl('javascript:alert(1)'),false);
 assert.equal(link.allowedUrl('http://mavplusz.hu/'),false);
});
test('station-dependent official departure board and station detail URLs',()=>{
 assert.equal(link.stationKey('Budapest-Keleti pályaudvar'),'keleti');
 assert.equal(link.stationKey('Keleti'),'keleti');
 assert.equal(link.stationKey('Budapest-Nyugati pályaudvar'),'nyugati');
 assert.equal(link.stationKey('Kazincbarcika vasútállomás'),'kazincbarcika');
 assert.equal(link.stationKey('Kazincbarcika-alsó'),null);
 assert.equal(link.boardFor('Budapest-Keleti pályaudvar'),link.URLS.keletiBoard);
 assert.equal(link.boardFor('Budapest-Nyugati'),link.URLS.nyugatiBoard);
 assert.equal(link.boardFor('Kazincbarcika vasútállomás'),null);
 assert.equal(link.boardFor('Kőbánya-Kispest'),null);
 assert.equal(link.stationFor('Kazincbarcika vasútállomás'),link.URLS.kazincbarcikaStation);
 assert.equal(link.stationFor('Budapest-Keleti pályaudvar'),link.URLS.keletiStation);
 assert.equal(link.stationFor('Miskolc'),null);
});
test('route action transfers exact entered station pair instead of dropping it',()=>{
 const url=link.mapRoute('Budapest-Keleti pályaudvar','Kazincbarcika vasútállomás');
 const u=new URL(url);
 assert.equal(u.hostname,'www.google.com');
 assert.equal(u.pathname,'/maps/dir/');
 assert.equal(u.searchParams.get('origin'),'Budapest-Keleti pályaudvar');
 assert.equal(u.searchParams.get('destination'),'Kazincbarcika vasútállomás');
 assert.equal(u.searchParams.get('travelmode'),'transit');
 assert.equal(link.stationPair('Keleti','Keleti'),null);
 assert.equal(link.mapRoute('Keleti','Keleti'),null);
 assert.equal(link.mapRoute('javascript:alert(1)','<svg>'),null);
 assert.equal(link.allowedUrl(url),true);
});
test('every shortcut has a dedicated functional action, not generic mavplusz clone',()=>{
 for(const action of ['timetable','liveTrains','tickets','mapRoute','board','station']){
  assert.match(html,new RegExp('data-rail-action="'+action+'"'));
 }
 assert.equal((html.match(/data-href="https:\/\/mavplusz.hu\/"/g)||[]).length,0);
 assert.match(html,/rail-official-v1\.js/);
 assert.match(html,/function openRailAction\(action\)/);
 assert.match(html,/case 'liveTrains':return launchRail\(urls\.liveTrains\)/);
 assert.match(html,/case 'board'/);
 assert.match(html,/case 'station'/);
 assert.match(html,/case 'mapRoute'/);
 assert.match(html,/show\('station-help'\)/);
 assert.match(html,/data-rail-action="board"/);
 assert.match(html,/data-rail-action="station"/);
 assert.match(html,/id="station-help-message"/);
 assert.match(html,/window\.location\.assign\(url\)/);
 assert.doesNotMatch(html,/data-rail-action="refresh"/);
 assert.doesNotMatch(html,/supabase\.co|navigator\.geolocation|setInterval\(/);
 const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
 for(const code of scripts)assert.doesNotThrow(()=>new vm.Script(code));
});
test('Golden visual parity: same hero, avatar, FLIRT, three photos and five nav slots',()=>{
 assert.match(html,/mav-hero-approved\.webp/);
 assert.match(html,/id="profile-photo"/);
 assert.match(html,/bottom:9px;left:6px;width:45px/);
 assert.match(html,/id="signal" class="sound"/);
 assert.match(html,/rail-train-thumbs-v2\.webp/);
 assert.match(html,/id="rail-golden-glass-v3"/);
 const nav=html.match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(nav);
 assert.equal((nav.match(/<a /g)||[]).length,5);
});
