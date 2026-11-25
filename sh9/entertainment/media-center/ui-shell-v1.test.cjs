'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const sw=read('sh9/entertainment/media-center/ui-shell-sw-v1.js');
const html=read('sh9/entertainment/media-center/index.html');
const reg=read('sh9/entertainment/media-center/ui-shell-register-v1.js');
const SCOPE='https://sho.test/berlet-app/sh9/entertainment/media-center/';

function harness(){
 const handlers={},store=new Map(),requests=[];
 const cache={
  match:async key=>store.get(key),
  put:async(key,response)=>{store.set(typeof key==='string'?key:key.url,response)}
 };
 const caches={
  open:async name=>{assert.equal(name,'sho-media-center-ui-shell-v6');return cache},
  keys:async()=>['sho-media-center-ui-shell-v6'],
  delete:async()=>true
 };
 class Request {
  constructor(src,options={}){
   this.url=typeof src==='string'?src:src.url;
   this.mode=options.mode||src.mode||'cors';
   this.method=options.method||src.method||'GET';
   this.cache=options.cache||'default';
  }
 }
 const fetch=async(req,opts)=>{
  const url=typeof req==='string'?req:req.url;
  requests.push({url,cache:opts?.cache||req.cache||'default'});
  const extension=new URL(url).pathname.split('.').at(-1);
  const contentType=extension==='css'?'text/css':extension==='js'?'text/javascript':extension==='webp'?'image/webp':extension==='png'?'image/png':'text/html';
  const response={
   type:'basic',ok:true,url,headers:{get:k=>k==='content-type'?contentType:null},
   clone(){return this}
  };
  return response;
 };
 const self={
  registration:{scope:SCOPE},
  location:{origin:'https://sho.test'},
  addEventListener:(kind,fn)=>{handlers[kind]=fn},
  skipWaiting:async()=>true,
  clients:{claim:async()=>true}
 };
 vm.runInNewContext(sw,{self,caches,Request,fetch,URL,Response:{error:()=>({error:true})}});
 async function fire(kind,request){
  const work=[];
  const e={request,waitUntil(p){work.push(p)},respondWith(p){this.response=p}};
  handlers[kind](e);
  const result=e.response?await e.response:undefined;
  await Promise.all(work);
  return {result,intercepted:!!e.response};
 }
 const request=(url,mode='no-cors',method='GET')=>new Request({url,mode,method});
 return {fire,store,requests,request};
}

test('Media Center registers a private UI-only SW without modifying other modules',()=>{
 assert.match(html,/ui-shell-register-v1\.js\?v=1/);
 assert.match(reg,/serviceWorker\.register\('\.\/ui-shell-sw-v1\.js'/);
 assert.match(reg,/scope:'\.\/'/);
 assert.doesNotMatch(sw,/mediaCache|indexedDB|localStorage|caches\.open\('all-/i);
 assert.doesNotMatch(sw,/caches\.delete\('sh9-|caches\.delete\('sho-book/);
});
test('install precaches nine UI files and nine exact approved decorative images; no arbitrary media',async()=>{
 const h=harness();
 await h.fire('install');
 assert.equal(h.store.size,18);
 const keys=[...h.store.keys()];
 assert.ok(keys.every(x=>x.startsWith('https://sho.test/')));
 assert.ok(keys.every(x=>/\/$|\/streaming\.html$|\.css\?|\.js(\?|$)|\/assets\/(?:sho-tile-[a-z0-9-]+\.webp|streaming-(?:facebook|youtube|tiktok|spotify)\.webp|streaming-hero-approved-b\.png)$/.test(x)));
 assert.deepEqual(keys.filter(x=>x.endsWith('.webp')).map(x=>x.split('/').at(-1)).sort(),["sho-tile-homecinema-v2.webp","sho-tile-homevideos-approved-v3.webp","sho-tile-music-v2.webp","sho-tile-photos-v2.webp","streaming-facebook.webp","streaming-spotify.webp","streaming-tiktok.webp","streaming-youtube.webp"]);
 assert.deepEqual(keys.filter(x=>x.endsWith(".png")),[SCOPE+"assets/streaming-hero-approved-b.png"]);
 assert.ok(keys.every(x=>!x.includes('graph.microsoft.com')));
 assert.ok(keys.every(x=>!x.includes('onedrive-session')&&!x.includes('onedrive-media-v2.js')));
});
test('OneDrive Graph, signed media, thumbnails and unlisted local images bypass persistent cache',async()=>{
 const h=harness();
 await h.fire('install');
 const before=h.store.size;
 const urls=[
  'https://graph.microsoft.com/v1.0/me/drive/items/abcdef/content',
  'https://www.youtube.com/watch?v=example',
  'https://open.spotify.com/track/example',
  SCOPE+'assets/streaming-facebook.webp?token=private',
  SCOPE+'streaming.html?access_token=private',
  'https://onedrive.live.com/my?id=private-folder',
  'https://public.dm.files.1drv.com/signed/Movie.mp4?token=private',
  'https://sho.test/berlet-app/sh9/entertainment/media-center/cover.jpg',
  'https://sho.test/berlet-app/sh9/entertainment/media-center/hero.webp',
  'https://sho.test/berlet-app/sh9/entertainment/media-center/track.mp3',
  'https://sho.test/berlet-app/sh9/entertainment/media-center/photo.png',
  'https://sho.test/berlet-app/sh9/entertainment/media-center/onedrive-media-v2.js?v=evil',
  'https://sho.test/berlet-app/sh9/entertainment/media-center/?access_token=private'
 ];
 for(const url of urls){
  const r=await h.fire('fetch',h.request(url));
  assert.equal(r.intercepted,false,'Media/service worker must not intercept '+url);
 }
 assert.equal(h.store.size,before);
});
test('HTML navigation revalidates online; known versioned UI JS remains cache-first',async()=>{
 const h=harness();
 await h.fire('install');
 const base=h.store.size;
 const old={url:'retired-shell',ok:true};
 h.store.set(SCOPE,old);
 const nav=await h.fire('fetch',h.request(SCOPE,'navigate'));
 assert.notEqual(nav.result,old,'online navigation must not serve old cached HTML');
 assert.equal(nav.intercepted,true);
 assert.equal(nav.result.url,SCOPE);
 const code=await h.fire('fetch',h.request(SCOPE+'media-center-direct-v8.js?v=8','no-cors'));
 assert.equal(code.intercepted,true);
 assert.equal(h.store.size,base);
 assert.ok(h.requests.every(x=>x.url.startsWith('https://sho.test/')));
 assert.ok(h.requests.every(x=>x.url===SCOPE+'assets/streaming-hero-approved-b.png'||!/\.(mp4|mp3|jpg|jpeg|png|gif)(\?|$)/i.test(x.url)));
});

test('approved WebP is available from the isolated cache',async()=>{
 const h=harness();await h.fire('install');
 const r=await h.fire('fetch',h.request(SCOPE+'assets/sho-tile-music-v2.webp'));
 assert.equal(r.intercepted,true);assert.equal(r.result.headers.get('content-type'),'image/webp');
});

test('Streaming UI navigation and approved artwork are cached without caching provider media',async()=>{
 const h=harness();await h.fire('install');
 const nav=await h.fire('fetch',h.request(SCOPE+'streaming.html','navigate'));
 assert.equal(nav.intercepted,true);assert.equal(nav.result.url,SCOPE+'streaming.html');
 for(const [file,type] of [['streaming-hero-approved-b.png','image/png'],['streaming-facebook.webp','image/webp'],['streaming-youtube.webp','image/webp'],['streaming-tiktok.webp','image/webp'],['streaming-spotify.webp','image/webp']]){
  const url=SCOPE+'assets/'+file;assert.ok(h.store.has(url));const r=await h.fire('fetch',h.request(url));assert.equal(r.intercepted,true);assert.equal(r.result.headers.get('content-type'),type);
 }
});
