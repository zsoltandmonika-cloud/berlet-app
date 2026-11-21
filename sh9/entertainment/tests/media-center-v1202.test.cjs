'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('sh9/entertainment/index.html');
const css=read('sh9/entertainment/media-center-feature-v1202.css');
const media=read('sh9/entertainment/media-center/index.html');
test('SHO previous sections remain in original relative order and Book Studio stays untouched',()=>{
 const marks=['class="categories"','class="pixel-extension"','class="bs-entertainment-feature"','class="mc-feature"','class="section sh9-program-feature"','id="upcoming"','id="mozi"'];
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
 for(const part of ['mc-film','mc-memories','mc-music'])assert.match(css,new RegExp(part));
});
test('Media Center directly opens saved Xiaomi TV remote without Cast registration',()=>{
 for(const item of ['Házimozi','Képek','Videók','Zene'])assert.ok(media.includes(item));
 assert.match(media,/class="grid"/);
 assert.match(media,/https:\/\/mediaradar\.pages\.dev\//);
 assert.match(media,/sho-family-tv\/remote\.html/);
 assert.doesNotMatch(media,/sho-family-tv\/cast-sender\.html/);
 assert.match(media,/Xiaomi TV · Távirányító/);
 assert.match(media,/mentett TV-párosítás működik/);
 assert.match(media,/meglévő Book Studio Microsoft-munkamenetével/);
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
 assert.match(media,/TV APK-ban a OneDrive-saját tartalom még nincs bekötve/);
});
