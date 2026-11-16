'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('sh9/entertainment/book-studio/book-studio.js');
const css=read('sh9/entertainment/book-studio/book-studio-page-curl-v19.css');
const html=read('sh9/entertainment/book-studio/index.html');
test('V19 has cosmetic 3D page curl with soft shadows, but no text cloning or library requests',()=>{
 assert.match(html,/id="readerPageCurl" class="reader-page-curl" hidden aria-hidden="true"/);
 assert.match(html,/book-studio-page-curl-v19\.css\?v=19-3d-sheet/);
 assert.match(html,/book-studio\.js\?v=(19-ibooks-page-curl|20-sepia-explicit-bookmarks)/);
 assert.match(css,/@keyframes bs-curl-forward/);
 assert.match(css,/@keyframes bs-curl-backward/);
 assert.match(css,/rotateY\(-139deg\)/);
 assert.match(css,/rotateY\(139deg\)/);
 assert.match(css,/\.reader-page-curl-sheet/);
 assert.match(css,/\.reader-page-curl-shadow/);
 assert.match(css,/\.reader-page-curl-edge/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(js,/html2canvas|document\.write\(|captureStream\(|Files\.ReadWrite/);
});
class Node {
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.hidden=false;this.disabled=false;
  this.dataset={};this.attributes={};this.textContent='';this.value='';
  this.offsetWidth=380;this.clientWidth=380;
  this.listeners={};this.style={
   setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}
  };
  const c=new Set();
  this.classList={
   add(...xs){xs.forEach(x=>c.add(x))},
   remove(...xs){xs.forEach(x=>c.delete(x))},
   contains(x){return c.has(x)},
   toggle(x,on){if(on===undefined)on=!c.has(x);if(on)c.add(x);else c.delete(x);return on}
  };
 }
 addEventListener(k,cb){this.listeners[k]=cb}
 dispatch(k,e={}){return this.listeners[k]?.(e)}
 setAttribute(k,v){this.attributes[k]=String(v)}
 getAttribute(k){return this.attributes[k]}
 append(...a){this.children.push(...a)}
 replaceChildren(...a){this.children=[...a]}
 get firstElementChild(){return this.children[0]||null}
 getContext(){return {setTransform(){}}}
 querySelector(){return new Node()}
 focus(){}
 matches(){return false}
}
function harness(reduced=false, bookOptions={}){
 const ids=['cloudState','bookGrid','emptyState','uploadFile','bookCount','resumeSection',
 'profileSwitch','toast','searchBooks','favOnly','closeReader','prevPage','nextPage','readerTheme',
 'smallerText','biggerText','addBookmark','bookmarkList','chapterList','readerFocus','readerSound',
 'readerScrub','readerScrubPercent','readerTitle','readerAuthor','reader','readerContent',
 'readerPageCurl','readerMessage','epubStage','pdfStage','pageLabel','readerProgress'];
 const nodes=new Map(ids.map(id=>[id,new Node()]));
 nodes.get('reader').hidden=true;nodes.get('readerPageCurl').hidden=true;
 nodes.get('readerTheme').value='sepia';
 nodes.get('chapterList').options=[];
 nodes.get('readerScrub').value='0';
 const book={id:'od_test',title:'Lapozás próba',source:'onedrive',author:'Teszt',
  format:'epub',bookmarks:[],theme:'sepia',progress_percent:2,font_size:100,...bookOptions};
 const calls={next:0,prev:0,displays:0,lastDisplay:undefined,pdfPages:[]};
 const rendition={
  on(){},
  async next(){calls.next++},
  async prev(){calls.prev++},
  async display(locator){calls.displays++;calls.lastDisplay=locator},
  getContents(){return []},
  themes:{default(){},fontSize(){}}
 };
 const epub={
  renderTo(){return rendition},destroy(){},
  loaded:{navigation:Promise.resolve({toc:[]})},
  locations:{async generate(){},percentageFromCfi(){return .03},cfiFromPercentage(){return 'cfi'}},
  spine:{length:12}
 };
 const document={
  documentElement:{dataset:{}},body:{style:{}},
  getElementById:id=>nodes.get(id)||null,
  createElement:tag=>new Node(tag),
  addEventListener(){}
 };
 const stored=new Map();
 const window={
  localStorage:{getItem:key=>key==='hh-profile'?'z':stored.get(key)||null,setItem:(key,val)=>stored.set(key,String(val))},
  matchMedia:()=>({matches:reduced}),setTimeout,clearTimeout,
  addEventListener(){},
  ePub:()=>epub,
  pdfjsLib:{
   GlobalWorkerOptions:{},
   getDocument:()=>({promise:Promise.resolve({
    numPages:20,
    async getPage(n){calls.pdfPages.push(n);return {
     getViewport:({scale})=>({width:450*scale,height:720*scale}),
     render:()=>({promise:Promise.resolve()})
    }},
    async destroy(){}
   })})
  },
  SH9_BOOK_STUDIO_DRIVE_V2:{
   getBook:id=>id===book.id?book:null,
   async download(){return {async arrayBuffer(){return new Uint8Array([1,2,3]).buffer}}},
   async saveProgress(){},
   render(){}
  }
 };
 vm.runInNewContext(js,{window,document,URL,Date,Math,Promise,setTimeout,clearTimeout},
  {timeout:5000});
 return {api:window.SH9_BOOK_STUDIO_V1,nodes,calls,book,stored};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('Opening a valid EPUB still uses the actual EPUB.js rendition, no fake page content',async()=>{
 const {api,nodes,calls}=harness();
 assert.ok(api);
 await api.openBook('od_test');
 assert.equal(nodes.get('reader').hidden,false);
 assert.equal(calls.displays,1);
 assert.equal(nodes.get('readerPageCurl').hidden,true);
});
test('Forward button starts 3D fold, moves exactly one EPUB page, then cleans overlay',async()=>{
 const {api,nodes,calls}=harness();
 await api.openBook('od_test');
 nodes.get('nextPage').dispatch('click');
 assert.equal(nodes.get('reader').classList.contains('curl-next'),true);
 assert.equal(nodes.get('readerPageCurl').hidden,false);
 nodes.get('nextPage').dispatch('click');
 await sleep(510);
 assert.equal(calls.next,1,'rapid second tap must not turn two pages');
 assert.equal(nodes.get('readerPageCurl').hidden,true);
 assert.equal(nodes.get('reader').classList.contains('curl-active'),false);
});
test('Backward button turns right-to-left mirror and respects direction',async()=>{
 const {api,nodes,calls}=harness();
 await api.openBook('od_test');
 nodes.get('prevPage').dispatch('click');
 assert.equal(nodes.get('reader').classList.contains('curl-prev'),true);
 await sleep(510);
 assert.equal(calls.prev,1);
 assert.equal(nodes.get('readerPageCurl').hidden,true);
});
test('Horizontal mobile swipe previews the curled edge and commits a single page',async()=>{
 const {api,nodes,calls}=harness();
 await api.openBook('od_test');
 const area=nodes.get('readerContent');
 area.dispatch('touchstart',{touches:[{clientX:290,clientY:180}]});
 area.dispatch('touchmove',{touches:[{clientX:170,clientY:185}]});
 assert.equal(nodes.get('reader').classList.contains('curl-peek-next'),true);
 assert.equal(nodes.get('readerPageCurl').hidden,false);
 area.dispatch('touchend',{changedTouches:[{clientX:170,clientY:185}]});
 assert.equal(nodes.get('reader').classList.contains('curl-next'),true);
 await sleep(510);
 assert.equal(calls.next,1);
 assert.equal(nodes.get('readerPageCurl').hidden,true);
});
test('Reduced-motion requests skip animation but preserve actual page navigation',async()=>{
 const {api,nodes,calls}=harness(true);
 await api.openBook('od_test');
 nodes.get('nextPage').dispatch('click');
 await sleep(25);
 assert.equal(calls.next,1);
 assert.equal(nodes.get('readerPageCurl').hidden,true);
});
test('JS code still parses; EPUB and PDF next/previous and sound functions remain',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/rendition\.prev\(\):rendition\.next\(\)/);
 assert.match(js,/else if\(pdfDoc\)\{pdfPage\+=step;await renderPDF\(\)\}/);
 assert.match(js,/playPageTurnSound\(\)/);
 assert.match(js,/function resetCurl\(\)/);
 assert.match(js,/function previewCurl\(dx,width\)/);
 assert.match(js,/doc\.addEventListener\('touchmove'/);
 assert.match(js,/\$\('readerContent'\)\.addEventListener\('touchmove'/);
});

test('V20: old automatic EPUB progress does NOT determine opening location when no bookmark exists',async()=>{
 const {api,nodes,calls}=harness(false,{
  theme:'dark',progress_locator:'epubcfi(automatic-72)',progress_percent:72,
  bookmarks:[]
 });
 await api.openBook('od_test');
 assert.equal(calls.lastDisplay,undefined,'EPUB opens from its actual first page');
 assert.equal(nodes.get('readerTheme').value,'sepia','Legacy default dark is normalized to sepia');
 assert.equal(nodes.get('reader').dataset.theme,'sepia');
 assert.equal(nodes.get('readerScrub').value,'0','Progress slider starts at zero');
 assert.equal(nodes.get('readerScrubPercent').textContent,'0%');
});
test('V20: explicit saved EPUB bookmark takes precedence over unrelated automatic progress',async()=>{
 const {api,nodes,calls}=harness(false,{
  theme:'sepia',progress_locator:'epubcfi(auto-90)',progress_percent:90,
  bookmarks:[{locator:'epubcfi(chapter-2)',label:'2. fejezet'},
   {locator:'epubcfi(chapter-7)',label:'7. fejezet'}]
 });
 await api.openBook('od_test');
 assert.equal(calls.lastDisplay,'epubcfi(chapter-7)');
 assert.equal(nodes.get('readerTheme').value,'sepia');
});
test('V20: PDF opens at page 1 without a bookmark, latest explicit PDF bookmark otherwise',async()=>{
 const none=harness(false,{
  format:'pdf',theme:'dark',progress_locator:'17',progress_percent:85,bookmarks:[]
 });
 await none.api.openBook('od_test');
 assert.equal(none.calls.pdfPages[0],1);
 assert.equal(none.nodes.get('readerTheme').value,'sepia');
 const marked=harness(false,{
  format:'pdf',theme:'sepia',progress_locator:'19',progress_percent:95,
  bookmarks:[{locator:'2',label:'Kezdet'},{locator:'8',label:'8. oldal'}]
 });
 await marked.api.openBook('od_test');
 assert.equal(marked.calls.pdfPages[0],8);
});
test('V20: user-selected dark theme persists on the same device, existing light theme remains',async()=>{
 const dark=harness(false,{theme:'dark',bookmarks:[]});
 await dark.api.openBook('od_test');
 assert.equal(dark.nodes.get('readerTheme').value,'sepia');
 dark.nodes.get('readerTheme').value='dark';
 dark.nodes.get('readerTheme').dispatch('change');
 assert.ok([...dark.stored.values()].includes('dark'),'Explicit dark choice is saved locally');
 await dark.api.openBook('od_test');
 assert.equal(dark.nodes.get('readerTheme').value,'dark');
 const light=harness(false,{theme:'light',bookmarks:[]});
 await light.api.openBook('od_test');
 assert.equal(light.nodes.get('readerTheme').value,'light');
});
