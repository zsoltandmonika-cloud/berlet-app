'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('sh9/entertainment/index.html');
const css=read('sh9/entertainment/media-center-feature-v1202.css');
const media=read('sh9/entertainment/media-center/index.html');
test('SHO Media Center sits as one full-width card ABOVE Book Studio, with following sections intact',()=>{
 const marks=['class="categories"','class="pixel-extension"','class="mc-feature"','class="bs-entertainment-feature"','class="section sh9-program-feature"','id="upcoming"','id="mozi"'];
 let previous=-1;
 for(const m of marks){const at=page.indexOf(m);assert.ok(at>previous,'section order '+m);previous=at;}
 for(const cat of ['cat cinema','cat theatre','cat concert','cat home-media'])assert.ok(page.includes('class="'+cat+'"'));
 assert.equal((page.match(/class="books-promo books-promo--immersive"/g)||[]).length,1);
 assert.match(page,/href="\.\/book-studio\/"/);
 assert.match(page,/href="\.\/kultura\/"/);
 assert.match(page,/href="\.\/rendezvenyek\/"/);
});
test('Only the existing Home Media category becomes a Media Center entry and one big photo card is added',()=>{
 assert.equal((page.match(/class="cat home-media"/g)||[]).length,1);
 assert.match(page,/class="cat home-media" href="\.\/media-center\/"/);
 assert.match(page,/class="mc-feature-card" href="\.\/media-center\/"/);
 assert.match(page,/media-center-feature-v1202\.css\?v=1202-only-media/);
 assert.match(css,/aspect-ratio:1\.62/);
 assert.match(css,/height:calc\(\(100vw - 24px\)\/1\.62\)/);
 assert.doesNotMatch(css,/images\.unsplash\.com|\.mc-art/);
 assert.doesNotMatch(page,/<span class="mc-art"/);
});
test('Media Center directly opens saved Xiaomi TV remote without Cast registration',()=>{
 for(const item of ['Házimozi','Képek','Videók','Zene'])assert.ok(media.includes(item));
 assert.match(media,/class="grid"/);
 assert.match(media,/https:\/\/mediaradar\.pages\.dev\//);
 assert.match(media,/sho-family-tv\/remote\.html/);
 assert.doesNotMatch(media,/sho-family-tv\/cast-sender\.html/);
 assert.match(media,/Xiaomi TV · Távirányító/);
 assert.match(media,/mentett párosítással/);
 assert.match(media,/id="mediaLibrary"/);
 assert.equal((media.match(/class="tile (?:cinema|photos|videos|music)"/g)||[]).length,4);
});

test('V2 includes real read-only OneDrive album, HomeVideo, Full Albums catalogues',()=>{
 const logic=read('sh9/entertainment/media-center/onedrive-media-v2.js');
 const design=read('sh9/entertainment/media-center/onedrive-media-v2.css');
 for(const path of ['Képek','Videos/HomeVideo','Zene/Full Albums'])assert.ok(logic.includes(path),path);
 assert.match(logic,/Files\.Read/);
 assert.doesNotMatch(logic,/Files\.ReadWrite|Files\.ReadWrite\.All/);
 assert.match(logic,/verified=true/);
 assert.match(logic,/me\?\$select=mail,userPrincipalName,otherMails/);
 assert.match(logic,/OneDrive.*HTTP/);
 assert.match(logic,/SHO%20Media%20Center%20Assets/);
 assert.match(logic,/\.tile\[data-library\]/);
 assert.match(media,/id="mediaLibrary"/);
 assert.match(media,/id="mediaFiles"/);
 assert.match(media,/id="mediaAudio"/);
 assert.match(media,/id="mediaViewer"/);
 assert.match(media,/id="mediaFullScreen"/);
 assert.match(logic,/requestFullscreen/);
 assert.match(logic,/orientation\.lock/);
 assert.match(design,/\(orientation:landscape\)/);
 assert.match(design,/media-file/);
});
test('V2 preserves QR-free Xiaomi remote and avoids exposing OneDrive session to TV',()=>{
 const logic=read('sh9/entertainment/media-center/onedrive-media-v2.js');
 assert.match(media,/Xiaomi TV · Távirányító/);
 assert.match(logic,/No personal media or access tokens sent to the TV/);
 assert.match(logic,/microsoftonline\.com\/consumers/);
 assert.doesNotMatch(logic,/supabase\.co\/realtime|broadcast.+Authorization/);
 assert.doesNotMatch(media,/<p class="note">/);
});

test('V3 compact C Smart TV remote replaces giant buttons and verbose footer',()=>{
 const design=read('sh9/entertainment/media-center/onedrive-media-v2.css');
 assert.equal((media.match(/id="mediaFullScreen"/g)||[]).length,1);
 assert.match(media,/<button class="header-fullscreen" id="mediaFullScreen"/);
 assert.match(media,/<a class="remote-smart-card" href="https:\/\/mediaradar\.pages\.dev\/sho-family-tv\/remote\.html"/);
 assert.match(media,/remote-smart-visual/);
 assert.match(media,/TV Remote/);
 assert.match(media,/Xiaomi TV · Távirányító/);
 assert.doesNotMatch(media,/<p class="note">/);
 assert.doesNotMatch(media,/<footer>/);
 assert.doesNotMatch(media,/class="center-actions"|class="media-fullscreen-btn"/);
 assert.equal((media.match(/class="tile (?:cinema|photos|videos|music)"/g)||[]).length,4);
 assert.match(design,/\.header-fullscreen/);
 assert.match(design,/width:36px;height:36px/);
 assert.match(design,/\.remote-smart-card/);
});

test('TV shortcut is one shared, tiny one-tap preview across SHO without leaking phone content',()=>{
 const vm=require('node:vm');
 const source=read('sh9/shared/sho-tv-shortcut-v1.js');
 const nav=read('sh9/shared/sh9-golden-bottom-nav-v924.js');
 const controls=read('sh9/shared/sh9-golden-controls-v1.js');
 assert.match(nav,/ensureShoTvShortcut/);
 assert.match(controls,/ensureShoTvShortcut/);
 const run=(pathname,hasSmartRemote=false)=>{
  const all={},appended=[];
  const element=tag=>({
   tagName:tag.toUpperCase(),attributes:{},setAttribute(k,v){this.attributes[k]=v}
  });
  const doc={
   readyState:'complete',createElement:element,head:{appendChild(el){if(el.id)all[el.id]=el}},
   body:{appendChild(el){appended.push(el);if(el.id)all[el.id]=el}},
   getElementById(id){return all[id]||null},
   querySelector(selector){return hasSmartRemote&&selector.indexOf('.remote-smart-card')!==-1?{}:null}
  };
  const win={location:{pathname,search:'?token=DO-NOT-SEND&gps=47.0'},
   addEventListener(){}};
  vm.runInNewContext(source,{window:win,document:doc}, {timeout:500});
  return {win,doc,appended};
 };
 const cases={
  '/berlet-app/sh9/':'home',
  '/berlet-app/sh9/shopping/':'shop',
  '/berlet-app/sh9/entertainment/':'media',
  '/berlet-app/sh9/smart-travel/taxi/':'travel',
  '/berlet-app/sh9/sport/':'sports',
  '/berlet-app/sh9/family-hub/':'guard',
  '/berlet-app/healthhub/guardian/':'guard',
  '/berlet-app/healthhub/index.html':'health'
 };
 for(const [route,module] of Object.entries(cases)){
  const {win,doc,appended}=run(route);
  assert.equal(win.SHO_TV_SHORTCUT_V1.moduleForPath(route),module);
  assert.equal(appended.length,1,route);
  assert.equal(appended[0].id,'shoTvShortcutV1');
  assert.equal(appended[0].href,'https://mediaradar.pages.dev/sho-family-tv/remote.html?show='+module);
  assert.equal(appended[0].target,'_blank');
  assert.equal(appended[0].rel,'noopener noreferrer');
  assert.doesNotMatch(appended[0].href,/token|gps|healthhub|shopping|guardian|@|code=/);
  assert.match(doc.getElementById('shoTvShortcutStyleV1').textContent,/width:51px;height:46px/);
  win.SHO_TV_SHORTCUT_V1.mount();
  assert.equal(appended.length,1,'no duplicate TV buttons');
 }
 assert.equal(run('https://elsewhere.org/').appended.length,0);
 assert.equal(run('/outside/app').appended.length,0);
 assert.equal(run('/berlet-app/sh9/entertainment/media-center/',true).appended.length,0,'preserve the approved C Smart remote');
 for(const p of ['sh9/entertainment/book-studio/index.html','sh9/shopping/smart-list.html','sh9/local-storage/index.html','sh9/shopping/store-manager-v1.html']){
  assert.match(read(p),/sho-tv-shortcut-v1\.js/,p);
 }
});

test('V4 approved Media Center & Home Videók hero art: order, visual integrity and privacy',()=>{
 const art=read('sh9/entertainment/media-center-approved-v4.js');
 const skin=read('sh9/entertainment/media-center-approved-v4.css');
 const homeArt=read('sh9/entertainment/media-center/onedrive-media-v2.js');
 const homeCss=read('sh9/entertainment/media-center/onedrive-media-v2.css');
 const mediaPos=page.indexOf('class="mc-feature"');
 const booksPos=page.indexOf('class="bs-entertainment-feature"');
 assert.ok(mediaPos>0 && booksPos>mediaPos,'Media Center must be ABOVE Book Studio, not beside/below');
 assert.equal((page.match(/class="mc-feature"/g)||[]).length,1,'exactly one full-width Media Center');
 assert.match(page,/class="mc-feature-card"/);
 assert.match(page,/media-center-approved-v4\.css/);
 assert.match(page,/media-center-approved-v4\.js/);
 assert.match(skin,/background-size:contain/);
 assert.match(skin,/\.mc-feature-card\.mc-v4-approved/);
 assert.match(skin,/\.mc-caption\{display:none!important\}/);
 assert.match(art,/sho-media-center-hero-approved-v3\.webp/);
 assert.match(art,/SH9_BOOK_ONEDRIVE_PERSIST_V3/);
 assert.match(art,/\.classList\.add\('mc-v4-approved'\)/);
 assert.match(media,/<strong>🎥 Home Videók<\/strong>/);
 assert.match(homeArt,/Home Videók/);
 assert.match(homeArt,/sho-tile-homevideos-approved-v3\.webp/);
 assert.match(homeArt,/for\(let slug in names\)/);
 assert.match(homeCss,/tile-art-baked-v4/);
 assert.match(homeCss,/\.tile\.videos\.tile-art-baked-v4 \.copy/);
 assert.doesNotMatch(art,/broadcast|Supabase|Files\.ReadWrite/);
});

test('V5 cold startup never flashes legacy Media Center hero, old media tiles or old remote layout',()=>{
 const hero=read('sh9/entertainment/media-center-feature-v1202.css');
 const v5=read('sh9/entertainment/media-center-approved-v4.css');
 const script=read('sh9/entertainment/media-center/onedrive-media-v2.js');
 assert.doesNotMatch(media,/images\\.unsplash\\.com|photo-1489599849927|photo-1452587925148|photo-1516035069371|photo-1511379938547/);
 assert.doesNotMatch(hero,/images\\.unsplash\\.com|\\.mc-film|\\.mc-memories|\\.mc-music/);
 assert.doesNotMatch(page,/<span class="mc-art"|class="mc-film"/);
 for(const tile of ['cinema','photos','videos','music'])assert.match(media,new RegExp('\\.tile\\.'+tile+'\\{--image:linear-gradient'));
 assert.doesNotMatch(script,/Designer assets can be supplied|assets\\/sho-tile-/);
 assert.match(script,/async function updateTileArt\\(\\)/);
 assert.match(script,/art\\.onload=function\\(\\)/);
 assert.match(v5,/stable dark gradient/);
 assert.match(media,/\\.remote-smart-card\\{display:flex;align-items:center;width:min\\(100%,395px\\)/);
 assert.match(media,/class="remote-smart-card"/);
});
