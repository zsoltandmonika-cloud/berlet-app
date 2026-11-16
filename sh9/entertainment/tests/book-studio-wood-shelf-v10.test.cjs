'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p));
const html=read('sh9/entertainment/book-studio/index.html').toString('utf8');
const script=read('sh9/entertainment/book-studio/book-studio-wood-shelf-v10.js').toString('utf8');
const drive=read('sh9/entertainment/book-studio/onedrive-books-v2.js').toString('utf8');
const css=read('sh9/entertainment/book-studio/book-studio-wood-shelf-v10.css').toString('utf8');
const wood=read('sh9/entertainment/book-studio/assets/wood-shelf-v10.webp');

test('Approved #1 HD bookshelf source is a committed WebP wood texture with no fake books',()=>{
 assert.ok(wood.length>10000&&wood.length<400000,'Optimized HD shelf wood');
 assert.equal(wood.toString('ascii',0,4),'RIFF');
 assert.equal(wood.toString('ascii',8,12),'WEBP');
 assert.match(css,/assets\/wood-shelf-v10\.webp/);
 assert.match(css,/background-size:100% 100%/);
});
test('Book Studio lands on the immersive bookshelf, keeping admin/settings out of the main view',()=>{
 assert.match(html,/<body class="bshelf-v10-page">/);
 assert.match(html,/id="bshelfFront"/);
 assert.match(html,/id="bshelfRows"/);
 assert.match(html,/id="bshelfSettingsToggle"/);
 assert.match(html,/id="bshelfSettingsMenu" hidden/);
 assert.match(html,/id="bsAdminView"[^>]*hidden/);
 assert.match(html,/id="bshelfAdminBack"/);
 assert.ok(html.indexOf('id="bshelfFront"')<html.indexOf('id="bsAdminView"'));
 for(const id of ['bookStudioSettings','odConnectPanel','onedriveBooks','odGrid','library',
  'reader','profileSwitch','uploadFile','odCoverSync','odDedup','odTitleEditor'])
  assert.ok(html.includes('id="'+id+'"'),'original functional element preserved '+id);
 const order=['book-cache-v3.js','book-studio.js','book-studio-wood-shelf-v10.js','onedrive-books-v2.js'].map(t=>html.indexOf(t));
 assert.ok(order.every(x=>x>0)&&order.every((x,i)=>i===0||x>order[i-1]));
 assert.equal((html.match(/<script(?:\s|>)/g)||[]).length,(html.match(/<\/script>/g)||[]).length);
});
test('All books come from verified original OneDrive collection and open the existing reader',()=>{
 assert.match(drive,/w\.SH9_BOOKSHELF_V10\?\.update\(\(ready\|\|localMode\)\?source:\[\]/);
 assert.match(drive,/w\.SH9_BOOKSHELF_V10\?\.coverReady\(b\.id,url\)/);
 assert.match(drive,/w\.SH9_BOOKSHELF_V10\?\.setLoading\(true\)/);
 assert.match(drive,/w\.SH9_BOOKSHELF_V10\?\.setConnected\(on\|\|localAllowed\)/);
 assert.match(script,/reader\.openBook\(book\.id\)/);
 assert.match(script,/b\?\.source==='onedrive'/);
 assert.doesNotMatch(script,/Graph\s*\/content|Files\.ReadWrite|client_secret|Supabase\.storage\.upload/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(min-width:700px\)/);
 assert.match(css,/#fff2c8/);
});
class Node{
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.style={};
  this.hidden=false;this.textContent='';this.value='';this.attributes={};
  this.className='';this.title='';this.src='';this.scrollCount=0;this.focusCount=0;
  const c=new Set();
  this.classList={add:x=>c.add(x),remove:x=>c.delete(x),contains:x=>c.has(x)};
  this.style.setProperty=(k,v)=>{this.style[k]=v};
 }
 setAttribute(k,v){this.attributes[k]=String(v)}
 getAttribute(k){return this.attributes[k]}
 append(...nodes){for(const n of nodes)if(n?.tagName==='#fragment')this.append(...n.children);else this.children.push(n)}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 querySelector(selector){const pool=[...this.children];while(pool.length){
  const n=pool.shift();if((selector[0]==='.'&&n.className?.split(' ').includes(selector.slice(1)))||n.tagName===selector)return n;pool.push(...n.children)}
  return null;
 }
 querySelectorAll(selector){const hits=[];const pool=[...this.children];while(pool.length){
  const n=pool.shift();if(selector[0]==='.'&&n.className?.split(' ').includes(selector.slice(1)))hits.push(n);pool.push(...n.children)}
  return hits;
 }
 addEventListener(k,callback){this.listeners[k]=callback}
 dispatch(k,arg={}){this.listeners[k]?.(arg)}
 focus(){this.focusCount++}
 scrollIntoView(){this.scrollCount++}
 contains(node){return this===node||this.children.includes(node)}
}
test('Browser simulation: renders actual OneDrive files on HD shelves, cover ready and one-click open',()=>{
 const ids=['bshelfRows','bshelfSettingsToggle','bshelfFront','bsAdminView','bshelfSettingsMenu',
  'bshelfSearchToggle','bshelfSortToggle','bshelfSortMenu','bshelfSortTitle','bshelfSortTitleDesc',
  'bshelfSortAuthor','bshelfSortFavorites','bshelfSortReading','bshelfSortManual',
  'bshelfSearchBox','bshelfSearch','bshelfEmpty','bshelfStatus','bshelfCount',
  'bshelfOfflinePanel','bshelfMenuOffline','bshelfAdminTitle','bshelfMenuOneDrive','bshelfMenuManage','bshelfMenuCovers','bshelfMenuUploads',
  'bshelfManagePanel','bshelfManageCount','bshelfManageList','bshelfManageFilter',
  'bshelfSearchClear','bshelfConnectAction','bshelfAdminBack','bookStudioSettings',
  'onedriveBooks','library','profileSwitch'];
 const nodes=new Map(ids.map(x=>[x,new Node('div')]));
 nodes.get('bshelfSettingsMenu').hidden=true;
 nodes.get('bshelfSortMenu').hidden=true;
 nodes.get('bshelfSearchBox').hidden=true;
 nodes.get('bsAdminView').hidden=true;
 nodes.get('bshelfEmpty').hidden=true;
 const empty=nodes.get('bshelfEmpty');
 nodes.set('bshelfConnectAction',new Node('button'));
 empty.append(new Node('strong'),new Node('span'),nodes.get('bshelfConnectAction'));
 nodes.get('bshelfFront').append(nodes.get('bshelfRows'),empty);
 const opened=[];
 const doc={
  getElementById:id=>nodes.get(id)||null,
  createElement:tag=>new Node(tag),
  createDocumentFragment:()=>new Node('#fragment'),
  addEventListener(){},
 };
 const w={
  SH9_BOOK_STUDIO_V1:{openBook:async id=>{opened.push(id)}},
  matchMedia:()=>({matches:false}),
  localStorage:{getItem:()=>null,setItem(){}},
  scrollTo(){},requestAnimationFrame:cb=>cb(),addEventListener(){},
 };
 vm.runInNewContext(script,{window:w,document:doc},{timeout:5000});
 const api=w.SH9_BOOKSHELF_V10;assert.ok(api);
 const realTitles=[
 'A Megmentő','Trónok harca','Tüskevár','A bankár','Aranyláz Alaszkában'
 ].map((name,i)=>({id:'od_'+i,title:name,author:i===2?'Fekete István':'Frei Tamás',
  source:'onedrive',progress_percent:i===2?20:0}));
 api.setConnected(true);api.setLoading(true);api.update(realTitles);
 assert.equal(nodes.get('bshelfCount').textContent,'5 könyv · ☁️ OneDrive');
 const rows=nodes.get('bshelfRows').children;
 assert.equal(rows.length,4,'Four wood shelf rows even if two are partially empty');
 assert.equal(rows[0].children.length,4);
 assert.equal(rows[1].children.length,1);
 const book=rows.flatMap(row=>row.children).find(book=>book.title.startsWith('Tüskevár'));
 assert.ok(book,'Tüskevár should be present on alphabetical shelf');
 assert.equal(book.getAttribute('aria-label'),'Olvasás: Tüskevár, Fekete István');
 book.dispatch('click');
 assert.deepEqual(opened,['od_2']);
 const image=book.querySelector('.bshelf-real-cover');
 assert.equal(image.loading,'eager');
 assert.equal(image.hidden,false,'The real image must not be hidden during loading');
 api.coverReady('od_2','blob:https://example.net/realcover');
 assert.equal(image.src,'blob:https://example.net/realcover');
 assert.match(nodes.get('bshelfStatus').textContent,/0 borító/,'No premature cover count before image load');
 image.onload();
 assert.equal(image.classList.contains('is-loaded'),true);
 assert.equal(book.querySelector('.bshelf-title-fallback').hidden,true);
 assert.match(nodes.get('bshelfStatus').textContent,/1 borító/,'Counter reflects actual visible images');
 const settings=nodes.get('bshelfSettingsToggle');
 settings.dispatch('click');
 assert.equal(nodes.get('bshelfSettingsMenu').hidden,false);
 nodes.get('bshelfMenuOneDrive').dispatch('click');
 assert.equal(nodes.get('bshelfFront').hidden,true);
 assert.equal(nodes.get('bsAdminView').hidden,false);
 assert.equal(nodes.get('bookStudioSettings').scrollCount,1);
 nodes.get('bshelfAdminBack').dispatch('click');
 assert.equal(nodes.get('bshelfFront').hidden,false);
 assert.equal(nodes.get('bsAdminView').hidden,true);
 nodes.get('bshelfSearchToggle').dispatch('click');
 nodes.get('bshelfSearch').value='Tüske';
 nodes.get('bshelfSearch').dispatch('input');
 assert.equal(nodes.get('bshelfRows').children[0].children.length,1);
 assert.equal(nodes.get('bshelfRows').children[0].children[0].title,'Tüskevár · Fekete István');
});
test('No sample book titles or fake book covers hardwired; source JS parses',()=>{
 assert.doesNotMatch(script,/Nora Roberts|Paula Hawkins|Steve Jobs|Frei Tamás|Trónok harca/);
 assert.doesNotThrow(()=>new Function(script));
 assert.doesNotThrow(()=>new Function(drive));
});
