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
test('Media Center keeps existing media modules but removes the separate TV shortcut',()=>{
 for(const item of ['Házimozi','Képek','Videók','Zene'])assert.ok(media.includes(item));
 assert.match(media,/class="grid"/);
 assert.match(media,/https:\/\/mediaradar\.pages\.dev\//);
 assert.doesNotMatch(media,/class="media-inline-remote"|sho-family-tv\/remote\.html/);
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
 assert.doesNotMatch(logic,/SHO%20Media%20Center%20Assets/);
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
test('V2 preserves OneDrive privacy and no longer exposes mini TV remote',()=>{
 const logic=read('sh9/entertainment/media-center/onedrive-media-v2.js');
 assert.doesNotMatch(media,/Xiaomi TV Remote megnyitása/);
 assert.match(logic,/No personal media or access tokens sent to the TV/);
 assert.match(logic,/microsoftonline\.com\/consumers/);
 assert.doesNotMatch(logic,/supabase\.co\/realtime|broadcast.+Authorization/);
 assert.doesNotMatch(media,/<p class="note">/);
});
test('V6 Media Center header removes mini TV remote without changing fullscreen or tiles',()=>{
 const design=read('sh9/entertainment/media-center/onedrive-media-v2.css');
 assert.equal((media.match(/id="mediaFullScreen"/g)||[]).length,1);
 assert.match(media,/<button class="header-fullscreen" id="mediaFullScreen"/);
 assert.doesNotMatch(media,/class="media-inline-remote"|TV Remote · Xiaomi TV/);
 assert.doesNotMatch(media,/<p class="note">|<footer>/);
 assert.equal((media.match(/class="tile (?:cinema|photos|videos|music)"/g)||[]).length,4);
 assert.match(design,/\.header-fullscreen/);
 assert.match(design,/width:36px;height:36px/);
});
test('TV shortcut is disabled globally across SHO without changing module routing',()=>{
 const vm=require('node:vm');
 const source=read('sh9/shared/sho-tv-shortcut-v1.js');
 const nav=read('sh9/shared/sh9-golden-bottom-nav-v924.js');
 const controls=read('sh9/shared/sh9-golden-controls-v1.js');
 assert.match(nav,/function ensureShoTvShortcut/);
 assert.match(controls,/function ensureShoTvShortcut/);
 assert.doesNotMatch(nav,/script\.src=['"]\/berlet-app\/sh9\/shared\/sho-tv-shortcut-v1\.js/);
 assert.doesNotMatch(controls,/script\.src=['"]\/berlet-app\/sh9\/shared\/sho-tv-shortcut-v1\.js/);
 for(const [route,module] of Object.entries({
  '/berlet-app/sh9/':'home',
  '/berlet-app/sh9/shopping/':'shop',
  '/berlet-app/sh9/smart-travel/taxi/':'travel',
  '/berlet-app/sh9/sport/':'sports',
  '/berlet-app/sh9/family-hub/':'guard',
  '/berlet-app/healthhub/guardian/':'guard',
  '/berlet-app/healthhub/index.html':'health'
 })){
  let appended=0;
  const doc={readyState:'complete',getElementById(){return null},body:{appendChild(){appended++}}};
  const win={location:{pathname:route},addEventListener(){}};
  vm.runInNewContext(source,{window:win,document:doc},{timeout:500});
  assert.equal(win.SHO_TV_SHORTCUT_V1.moduleForPath(route),module);
  assert.equal(win.SHO_TV_SHORTCUT_V1.disabled,true);
  win.SHO_TV_SHORTCUT_V1.mount();
  assert.equal(appended,0,'do not add floating TV button on '+route);
 }
 for(const p of ['sh9/entertainment/book-studio/index.html','sh9/shopping/smart-list.html',
  'sh9/local-storage/index.html','sh9/shopping/store-manager-v1.html'])
  assert.doesNotMatch(read(p),/<script[^>]*sho-tv-shortcut-v1\.js/,p);
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
 assert.doesNotMatch(art,/SH9_BOOK_ONEDRIVE_PERSIST_V3|graph\.microsoft\.com/);
 assert.match(art,/\.classList\.add\('mc-v4-approved'\)/);
 assert.match(media,/<strong>🎥 Home Videók<\/strong>/);
 assert.match(homeArt,/Home Videók/);
 assert.match(homeArt,/sho-tile-homevideos-approved-v3\.webp/);
 assert.match(homeArt,/for\(let slug in names\)/);
 assert.match(homeCss,/tile-art-baked-v4/);
 assert.match(homeCss,/\.tile\.videos\.tile-art-baked-v4 \.copy/);
 assert.doesNotMatch(art,/broadcast|Supabase|Files\.ReadWrite/);
});

test('V5 approved artwork stays intact; the mini TV remote is absent',()=>{
 const hero=read('sh9/entertainment/media-center-feature-v1202.css');
 const fallback=read('sh9/entertainment/media-center-approved-v4.css');
 const script=read('sh9/entertainment/media-center/onedrive-media-v2.js');
 assert.equal(media.includes('images.unsplash.com'),false);
 assert.equal(hero.includes('images.unsplash.com'),false);
 assert.equal(hero.includes('.mc-film'),false);
 assert.equal(hero.includes('.mc-memories'),false);
 assert.equal(page.includes('<span class="mc-art"'),false);
 for(const tile of ['cinema','photos','videos','music'])assert.ok(media.includes('.tile.'+tile+'{--image:linear-gradient'),tile);
 assert.equal(script.includes('Designer assets can be supplied'),false);
 assert.equal(script.includes('./assets/sho-tile-'),false);
 assert.ok(script.includes('function updateTileArt()'));
 assert.match(script,/new URL\('\.\/assets\/'\+names\[slug\],d\.baseURI\)/);
 assert.ok(script.includes('art.onload=function()'));
 assert.ok(fallback.includes('stable dark gradient'));
 assert.doesNotMatch(media,/class="media-inline-remote"/);
});
test('Media Center keeps all four primary cards and removes the standalone TV shortcut',()=>{
 assert.match(media,/class="intro media-intro-v6"/);
 assert.match(media,/id="media-title"/);
 assert.doesNotMatch(media,/class="media-inline-remote"/);
 assert.doesNotMatch(media,/sho-family-tv\/remote\.html/);
 for(const name of ['cinema','photos','videos','music'])assert.match(media,new RegExp('class="tile '+name+'"'));
 assert.match(media,/id="mediaFullScreen"/);
});


test('Five approved UI WebPs match the original OneDrive SHA-1 and are preloaded',()=>{
 const crypto=require('node:crypto');
 const expected={"sho-media-center-hero-approved-v3.webp":"8D5F4A9860970D40A70AC8BB70272E3B18DE9474","sho-tile-homecinema-v2.webp":"D3DA38865E02A402E9EA75FAF38524E3754CF632","sho-tile-photos-v2.webp":"D670071392993566B4FBBD4D2F70259A09A27690","sho-tile-homevideos-approved-v3.webp":"AE8A9B79464A39E2BA98E84A78301AD0BB6FF4B9","sho-tile-music-v2.webp":"9137D574B5588DE625BEFCC8F474844453EBB4DA"};
 for(const [name,hash] of Object.entries(expected)){
  const bytes=fs.readFileSync(path.join(root,'sh9/entertainment/media-center/assets',name));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(crypto.createHash('sha1').update(bytes).digest('hex').toUpperCase(),hash,name);
  assert.ok((name.includes('hero')?page:media).includes('assets/'+name));
 }
});
test('Media Center hero artwork loads without any Microsoft session or API calls',()=>{
 const vm=require('node:vm');
 const state={};
 const tile={style:{setProperty:(k,v)=>state[k]=v},classList:{add:x=>state.className=x}};
 class Image{set src(url){state.src=url;this.onload()}}
 const document={baseURI:'https://sho.test/berlet-app/sh9/entertainment/',querySelector:()=>tile};
 vm.runInNewContext(read('sh9/entertainment/media-center-approved-v4.js'),{window:{},document,URL,Image});
 assert.match(state.src,/assets\/sho-media-center-hero-approved-v3\.webp$/);
 assert.equal(state.className,'mc-v4-approved');
});


test('Three personal media tiles use the exact approved OneDrive direct links, without JavaScript interception',()=>{
 const expected={"photos":"https://onedrive.live.com/my?id=%2Fpersonal%2Fbc1ff24af37ea2b0%2FDocuments%2FK%C3%A9pek&viewid=eea57816%2D1182%2D48b0%2Da1cf%2D972d7f1f0041","videos":"https://onedrive.live.com/my?id=%2Fpersonal%2Fbc1ff24af37ea2b0%2FDocuments%2FVideos%2FHomeVideo&viewid=eea57816%2D1182%2D48b0%2Da1cf%2D972d7f1f0041","music":"https://onedrive.live.com/my?id=%2Fpersonal%2Fbc1ff24af37ea2b0%2FDocuments%2FZene%2FFull%20Albums&sortField=LinkFilename&isAscending=true&viewid=eea57816%2D1182%2D48b0%2Da1cf%2D972d7f1f0041"};
 const logic=read('sh9/entertainment/media-center/onedrive-media-v2.js');
 for(const [kind,url] of Object.entries(expected)){
  const tag=media.match(new RegExp('<a class="tile '+kind+'"[^>]*>'))[0];
  assert.ok(tag.includes('href="'+url.replaceAll('&','&amp;')+'"'));
  assert.ok(tag.includes('rel="noreferrer external"'));
  assert.ok(!tag.includes('target='),'same-tab navigation allows browser Back');
 }
 assert.ok(logic.includes("if(tile.getAttribute('href')!=='#mediaLibrary')return;"));
 const vm=require('node:vm');
 const setup=logic.slice(logic.indexOf("Array.prototype.forEach.call(d.querySelectorAll('.tile[data-library]')"),logic.indexOf('// Approved decorative UI artwork:'));
 let bound=[];
 const tiles=Object.entries(expected).map(([kind,url])=>({getAttribute:k=>k==='href'?url:kind,addEventListener:()=>bound.push(kind)}));
 tiles.push({getAttribute:k=>k==='href'?'#mediaLibrary':'legacy',addEventListener:()=>bound.push('legacy')});
 vm.runInNewContext(setup,{d:{querySelectorAll:()=>tiles}});
 assert.deepEqual(bound,['legacy']);
});
