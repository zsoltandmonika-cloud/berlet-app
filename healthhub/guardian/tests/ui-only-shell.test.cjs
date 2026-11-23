const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const SW=fs.readFileSync("healthhub/guardian/ui-shell-sw-v1.js",'utf8');
const HTML=fs.readFileSync("healthhub/guardian/index.html",'utf8');
const REGISTER=fs.readFileSync("healthhub/guardian/ui-shell-register-v1.js",'utf8');
const SCOPE="https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/guardian/";
function harness(){
 const handlers={},stored=new Map(),requests=[],deleted=[];
 const expectedOrigin=new URL(SCOPE).origin;
 const cache={
  match:async key=>stored.get(key)||null,
  put:async(key,r)=>{stored.set(key,r)}
 };
 const caches={
  open:async()=>cache,
  keys:async()=>['sho-book-studio-offline-shell-v22','old-global-shell','sho-guardian-ui-only-shell-v0'],
  delete:async k=>{deleted.push(k);return true}
 };
 const fetch=async(url)=>{
  const href=typeof url==='string'?url:url.url;
  requests.push(href);
  const pathname=new URL(href).pathname;
  const type=pathname.endsWith('.css')?'text/css':
   /\.m?js$/.test(pathname)?'text/javascript':'text/html';
  return {ok:true,type:'basic',headers:{get:k=>k==='content-type'?type:null},
   url:href,clone(){return this}};
 };
 const self={
  registration:{scope:SCOPE},
  location:{origin:expectedOrigin},
  addEventListener(k,fn){handlers[k]=fn},
  skipWaiting:async()=>true,
  clients:{claim:async()=>true}
 };
 vm.runInNewContext(SW+'\nself.__sourcePaths=SOURCES.slice();',{
  self,fetch,caches,URL,Response:{error:()=>({networkError:true})}
 });
 async function fire(kind,req){
  const waits=[];
  const event={request:req,waitUntil(p){waits.push(p)},respondWith(p){this.response=p}};
  handlers[kind](event);
  const got=event.response?await event.response:null;
  await Promise.all(waits);
  return {intercepted:!!event.response,result:got};
 }
 const make=(url,destination='script',mode='cors',method='GET')=>({
  url,mode,method,destination
 });
 return {fire,make,stored,requests,deleted,paths:self.__sourcePaths};
}
test('registration has its own scope and preserves existing application',()=>{
 assert.match(HTML,/ui-shell-register-v1\.js\?v=1/);
 assert.match(REGISTER,/serviceWorker\.register\('\.\/ui-shell-sw-v1\.js'/);
 assert.match(REGISTER,/scope:'\.\/'/);
 assert.match(SW,/if\(!key\)return/);
});
test('install stores ONLY static HTML CSS and JavaScript; no media or API content',async()=>{
 const h=harness();await h.fire('install');
 assert.ok(h.paths.length>20,'expected complete UI dependencies');
 assert.equal(h.stored.size,h.paths.length);
 for(const [key] of h.stored){
  const u=new URL(key);
  assert.equal(u.origin,new URL(SCOPE).origin);
  assert.ok(u.href===SCOPE||/\.(?:m?js|css)$/.test(u.pathname),'non-UI resource: '+key);
  assert.doesNotMatch(key,/\.(?:png|jpeg|jpg|webp|svg|heic|gif|mp3|mp4|mkv|flac|pdf|json)(?:\?|$)/i);
  assert.doesNotMatch(key,/\/(?:api|data|oauth|auth|graphql|storage)\//i);
 }
});
test('images posters maps music video GPS live APIs and all JSON bypass the worker',async()=>{
 const h=harness();await h.fire('install');const before=h.requests.length;
 const bad=[
  new URL('data/bootstrap.json',SCOPE).href,
  new URL('data/preferences.json',SCOPE).href,
  new URL('api/live?id=123',SCOPE).href,
  new URL('bkk-network-v806.json',SCOPE).href,
  new URL('bkk-timetable-v859.json',SCOPE).href,
  new URL('assets/maptile.webp',SCOPE).href,
  new URL('photo.jpg',SCOPE).href,
  new URL('film.mp4',SCOPE).href,
  new URL('sound.mp3',SCOPE).href,
  new URL('poster.png',SCOPE).href,
  'https://graph.microsoft.com/v1.0/me/drive/root/children',
  'https://image.tmdb.org/t/p/w500/example.jpg',
  'https://api.maptiler.com/maps/tiles/16/1/2.png',
  'https://signed.onedrive.live.com/video.mp4?token=secret'
 ];
 for(const url of bad){
  const destination=/\.(?:mp4|mp3)(?:\?|$)/i.test(url)?'video':'image';
  const result=await h.fire('fetch',h.make(url,destination));
  assert.equal(result.intercepted,false,url);
 }
 const query=await h.fire('fetch',h.make(SCOPE+'?code=secret','','navigate'));
 assert.equal(query.intercepted,false,'OAuth navigation must bypass cache');
 const unknown=await h.fire('fetch',h.make(new URL('app.js?unknown-cache-variant',SCOPE).href,'script'));
 assert.equal(unknown.intercepted,false,'unknown script version must not be cached');
 assert.equal(h.requests.length,before,'media may not be prefetched by app SW');
});
test('cached UI responds immediately and refreshes only exactly permitted static URL',async()=>{
 const h=harness();await h.fire('install');
 const before=h.stored.size;
 const page=await h.fire('fetch',h.make(SCOPE,'','navigate'));
 assert.equal(page.intercepted,true);assert.equal(page.result.url,SCOPE);
 const file=h.paths.find(x=>x.includes('.js'));
 assert.ok(file);
 const js=await h.fire('fetch',h.make(new URL(file,SCOPE).href,'script'));
 assert.equal(js.intercepted,true);
 assert.equal(h.stored.size,before);
});
