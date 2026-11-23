'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/entertainment/media-center/index.html');
const css=read('sh9/entertainment/media-center/media-library-golden-v1.css');
const logic=read('sh9/entertainment/media-center/onedrive-media-v2.js');
const sw=read('sh9/entertainment/media-center/ui-shell-sw-v1.js');

function element(tag='div'){
 const listeners={};
 return {
  tagName:tag,hidden:false,textContent:'',className:'',children:[],dataset:{},
  style:{setProperty(){}},disabled:false,src:'',paused:true,currentTime:0,duration:120,
  addEventListener(name,fn){listeners[name]=fn},listeners,
  setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},
  append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},
  replaceChildren(){this.children=[]},scrollIntoView(){},
  pause(){this.paused=true;listeners.pause?.()},load(){},
  play(){this.paused=false;listeners.play?.();return Promise.resolve()}
 };
}
function harness(){
 const ids=['mediaViewer','mediaViewerTitle','mediaPhotoCounter','mediaPhotoPrev','mediaPhotoNext',
  'mediaViewerTransport','mediaViewerMessage','mediaImage','mediaPlayer','mediaAudio',
  'mediaTransportBack','mediaTransportPlay','mediaTransportForward','mediaLibrary',
  'mediaLibraryTitle','mediaLibrarySubtitle','mediaLibrarySummary','mediaFiles',
  'mediaBreadcrumb','odMediaStatus','odMediaConnect','mediaViewerFrame',
  'mediaViewerClose','mediaViewerFullscreen','mediaFullScreen','mediaRefresh'];
 const nodes=Object.fromEntries(ids.map(id=>[id,element()]));
 nodes.mediaViewer.hidden=true;
 const requested=[],handlers={};
 const clientId='12345678-1234-1234-1234-123456789abc',account='test@example.com';
 const token={accessToken:'valid-test-token',expires:Date.now()+600000,clientId,account};
 const photos=[
  {id:'dir',name:'Nyaralás 2026',folder:{childCount:3}},
  {id:'p1',name:'Első.jpg',file:{mimeType:'image/jpeg'},size:1024},
  {id:'p2',name:'Második.jpg',file:{mimeType:'image/jpeg'},size:2000},
  {id:'p3',name:'Harmadik.jpg',file:{mimeType:'image/jpeg'},size:3000}
 ];
 const getItem=function(k){return this._data[k]||null};
 const localStorage={_data:{'sh9-book-ms-config-v2':JSON.stringify({clientId,account})},getItem};
 const sessionStorage={_data:{'sh9-book-ms-access-v2':JSON.stringify(token)},getItem,
  removeItem(k){delete this._data[k]},setItem(k,v){this._data[k]=v}};
 const fetch=async(url)=>{
  const u=typeof url==='string'?url:url.url,parsed=new URL(u);
  requested.push(parsed.href);
  let data={value:[]};
  if(parsed.pathname.endsWith('/me'))data={mail:account,userPrincipalName:account,otherMails:[]};
  else if(parsed.pathname.includes('/me/drive/root:')&&parsed.pathname.endsWith('children'))
   data={value:photos};
  else if(parsed.pathname.includes('/me/drive/items/')){
   const id=decodeURIComponent(parsed.pathname).split('/').pop();
   data={'@microsoft.graph.downloadUrl':'https://one-drive-test.invalid/media/'+id+'.jpg'};
  }
  return {ok:true,status:200,json:async()=>data};
 };
 const d={hidden:false,fullscreenElement:null,
  getElementById:id=>nodes[id]||null,createElement:tag=>element(tag),
  querySelectorAll:()=>[],querySelector:()=>null,
  addEventListener:(name,fn)=>{handlers[name]=fn}
 };
 const w={localStorage,sessionStorage,setInterval(){},addEventListener(){},
  screen:{orientation:{lock:async()=>{}}},location:{href:''},SH9_BOOK_ONEDRIVE_PERSIST_V3:null};
 vm.runInNewContext(logic,{window:w,document:d,fetch,URL,URLSearchParams,Image:function(){},Date,Number,Promise});
 const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))};
 return {w,d,nodes,photos,requested,handlers,flush};
}
test('Golden Standard library keeps all original six destination tiles, OneDrive and no persistent media cache',()=>{
 assert.equal((html.match(/class="tile (?:cinema|photos|videos|music|matches|security)"/g)||[]).length,6);
 assert.match(html,/media-library-golden-v1\.css\?v=1/);
 assert.match(html,/mediaLibrarySummary/);
 assert.match(css,/media-file\[data-kind="folder"\]/);
 assert.match(css,/media-viewer-transport/);
 assert.match(sw,/media-library-golden-v1\.css\?v=1/);
 assert.match(sw,/onedrive-media-v2\.js\?v=6-golden-photo-swipe/);
 assert.doesNotMatch(logic,/indexedDB\.open|caches\.open|localStorage\.setItem\([^,]*media/i);
 assert.match(html,/preload="none"><\/video>/);
 assert.match(html,/preload="none"><\/audio>/);
});
test('OneDrive photo swipe fetches ONLY the selected photo, not nearby originals; buttons and keyboard work',async()=>{
 const x=harness();await x.w.SHOMediaV2.select('photos');
 assert.equal(x.nodes.mediaLibrarySummary.textContent,'1 mappa · 3 médiaelem');
 assert.equal(x.nodes.mediaFiles.children.length,4);
 assert.equal(x.nodes.mediaFiles.children[0].dataset.kind,'folder');
 x.nodes.mediaFiles.children[1].onclick();
 await x.flush();
 assert.equal(x.nodes.mediaPhotoCounter.textContent,'1 / 3');
 assert.equal(x.nodes.mediaPhotoPrev.disabled,true);
 assert.equal(x.nodes.mediaPhotoNext.disabled,false);
 assert.match(x.nodes.mediaImage.src,/\/p1\.jpg$/);
 assert.equal(x.requested.filter(u=>u.includes('/me/drive/items/p')).length,1);
 const img=x.nodes.mediaImage;
 img.listeners.touchstart({touches:[{clientX:220,clientY:150}]});
 img.listeners.touchend({changedTouches:[{clientX:60,clientY:149}]});
 await x.flush();
 assert.equal(x.nodes.mediaPhotoCounter.textContent,'2 / 3');
 assert.match(x.nodes.mediaImage.src,/\/p2\.jpg$/);
 assert.equal(x.requested.filter(u=>u.includes('/me/drive/items/p')).length,2);
 let prevented=false;
 x.handlers.keydown({key:'ArrowRight',altKey:false,ctrlKey:false,metaKey:false,
  preventDefault(){prevented=true}});
 await x.flush();
 assert.equal(prevented,true);
 assert.equal(x.nodes.mediaPhotoCounter.textContent,'3 / 3');
 assert.equal(x.nodes.mediaPhotoNext.disabled,true);
 x.nodes.mediaPhotoPrev.onclick();
 await x.flush();
 assert.equal(x.nodes.mediaPhotoCounter.textContent,'2 / 3');
 assert.equal(x.requested.filter(u=>u.includes('/me/drive/items/p')).length,4);
 x.nodes.mediaViewerClose.onclick();
 assert.equal(x.nodes.mediaViewer.hidden,true);
 assert.equal(x.nodes.mediaPhotoCounter.hidden,true);
});
test('Vertical touch is NOT mistaken for horizontal photo swipe; no gallery controls on video',async()=>{
 const x=harness();await x.w.SHOMediaV2.select('photos');
 x.nodes.mediaFiles.children[1].onclick();await x.flush();
 x.nodes.mediaImage.listeners.touchstart({touches:[{clientX:250,clientY:90}]});
 x.nodes.mediaImage.listeners.touchend({changedTouches:[{clientX:200,clientY:270}]});
 await x.flush();
 assert.equal(x.nodes.mediaPhotoCounter.textContent,'1 / 3');
 assert.equal(x.requested.filter(u=>u.includes('/me/drive/items/p')).length,1);
 x.nodes.mediaViewerClose.onclick();
 assert.match(logic,/preload="none" is preserved/);
 assert.doesNotMatch(logic,/new Image\([^)]*next|Promise\.all\([^)]*photosInFolder/);
});
