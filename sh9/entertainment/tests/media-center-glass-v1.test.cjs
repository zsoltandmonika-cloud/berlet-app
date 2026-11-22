'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/entertainment/media-center/index.html');
const skin=read('sh9/entertainment/media-center/golden-six-glass-v1.css');

test('Golden Media Center groups six equal cards in one 25-percent glass surface',()=>{
 const start=html.indexOf('<div class="media-tiles-glass"');
 const end=html.indexOf('</div>\n <section class="media-library"',start);
 assert.ok(start>0&&end>start);
 const glass=html.slice(start,end);
 for(const cls of ['cinema','photos','videos','music','matches','security']){
  assert.equal((glass.match(new RegExp('class="tile '+cls+'"','g'))||[]).length,1,cls);
 }
 assert.match(skin,/rgba\(35,55,90,\.25\)/);
 assert.match(skin,/\.media-tiles-glass \.(?:grid|tile)/);
 assert.match(skin,/backdrop-filter:blur\(14px\)/);
});
test('New tiles open existing supported apps without leaking private data',()=>{
 assert.match(html,/class="tile matches" href="https:\/\/mecsradar\.pages\.dev\/"/);
 assert.match(html,/class="tile security" href="\.\.\/\.\.\/\.\.\/healthhub\/guardian\/"/);
 assert.doesNotMatch(html,/\?token=|\?gps=|readwrite|bearer/i);
 for(const library of ['photos','videos','music'])assert.match(html,new RegExp('data-library="'+library+'"'));
 assert.match(html,/id="mediaViewer"/);
});
test('Media Center glass retains six cards but no separate mini TV remote',()=>{
 assert.equal((html.match(/class="media-inline-remote"/g)||[]).length,0);
 assert.doesNotMatch(html,/sho-family-tv\/remote\.html|Xiaomi TV Remote megnyitása/);
 assert.match(html,/class="media-tiles-glass"/);
 assert.match(skin,/\.media-tiles-glass/);
});
