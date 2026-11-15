/* SHO Entertainment Book Studio · mobile visual shelf preview v4.
 * Preview shows only the currently verified Microsoft browser session's own locally
 * cached metadata and covers. No Graph calls, no OneDrive token exposure.
 */
(function(w,d){
'use strict';
const CACHE=w.SH9_BOOK_CACHE_V3,CFG='sh9-book-ms-config-v2',SESSION='sh9-book-ms-access-v2',PENDING='sh9-book-preview-open-v4';
const marker=p=>({drive_id:'_sho_preview_v4',drive_item_id:p,etag:'snapshot-1',size_bytes:1});
const parse=v=>{try{return JSON.parse(v)}catch(_){return null}};
const profile=()=>w.localStorage?.getItem('hh-profile')==='m'?'monika':'zsolt';
const account=()=>parse(w.localStorage?.getItem(CFG))?.account||'';
const secureSession=()=>{
 const session=parse(w.sessionStorage?.getItem(SESSION)),current=account();
 return current&&session?.account===current&&session?.expires>Date.now()+15000?current:'';
};
const text=(tag,cls,value)=>{
 const e=d.createElement(tag);if(cls)e.className=cls;
 if(value!==undefined)e.textContent=value;return e;
};
async function save(accountName,p,books){
 if(!CACHE||!accountName||!Array.isArray(books))return false;
 const list=books.slice(0,18).map(b=>({
  id:b.id,drive_id:b.drive_id,drive_item_id:b.drive_item_id,
  etag:b.etag,last_modified:b.last_modified,size_bytes:b.size_bytes,
  title:String(b.title||'').slice(0,150),author:String(b.author||'').slice(0,100),
  format:b.format,progress_percent:Number(b.progress_percent)||0,is_favorite:!!b.is_favorite,
  progress_locator:!!b.progress_locator
 }));
 return CACHE.put(accountName,marker(p),'manifest',new Blob([JSON.stringify({at:Date.now(),books:list,total:books.length})],{type:'application/json'}));
}
async function read(accountName,p){
 if(!CACHE||!accountName)return null;
 const blob=await CACHE.get(accountName,marker(p),'manifest');
 if(!blob)return null;
 try{const data=JSON.parse(await blob.text());return data&&Array.isArray(data.books)?data:null}catch(_){return null}
}
async function render(){
 const grid=d.getElementById('bsPreviewGrid');
 if(!grid)return;
 const headline=d.getElementById('bsPreviewStatus'),key=secureSession();
 if(!key){
  headline.textContent='A könyvespolc az első megnyitás után jelenik meg';
  grid.replaceChildren();
  const titles=['KÖNYVTÁRAM','OLVASÁS','KEDVENCEK','TÖRTÉNETEK'];
  for(const [i,t] of titles.entries()){
   const link=text('a','bs-preview-book bs-preview-placeholder');
   link.href='./book-studio/';
   link.style.setProperty('--book-color',['#283d62','#693857','#424f50','#5a3c63'][i]);
   link.append(text('span','bs-preview-art','✦'),text('strong','',t));
   grid.append(link);
  }
  return;
 }
 const snapshot=await read(key,profile());
 if(!snapshot?.books?.length){
  headline.textContent='A borítók a Book Studio könyvtárából érkeznek';
  grid.replaceChildren();
  const link=text('a','bs-preview-empty','📚 Könyvespolcom megnyitása →');
  link.href='./book-studio/';grid.append(link);return;
 }
 grid.replaceChildren();
 headline.textContent='📚 '+snapshot.total+' könyv · saját OneDrive-könyvtár';
 const urls=[];
 const books=snapshot.books.slice(0,9);
 for(const [i,b] of books.entries()){
  const link=text('a','bs-preview-book');
  link.href='./book-studio/';
  link.style.setProperty('--book-color',['#253e6c','#56375c','#2d5264','#60423a','#334b40','#5e2854'][i%6]);
  link.setAttribute('aria-label','Olvasás: '+b.title);
  link.append(text('span','bs-preview-art','✦'),text('strong','',b.title),text('small','',b.author||'Book Studio'));
  link.addEventListener('click',()=>{
   try{w.sessionStorage?.setItem(PENDING,JSON.stringify({id:b.id,profile:profile(),at:Date.now()}))}catch(_){}
  });
  grid.append(link);
  const cover=await CACHE.get(key,b,'cover');
  if(cover&&cover.size&&link.isConnected){
   const url=URL.createObjectURL(cover);urls.push(url);
   link.classList.add('bs-has-cover');link.style.backgroundImage='url("'+url+'")';
  }
 }
 w.addEventListener('pagehide',()=>urls.forEach(u=>URL.revokeObjectURL(u)),{once:true});
}
function pendingRead(){
 try{
  const value=parse(w.sessionStorage.getItem(PENDING));
  if(!value||!value.id||value.profile!==profile()||Date.now()-value.at>30*60*1000)return '';
  return String(value.id);
 }catch(_){return ''}
}
function pendingClear(){try{w.sessionStorage?.removeItem(PENDING)}catch(_){}}
w.SH9_BOOK_PREVIEW_V4=Object.freeze({save,read,render,pendingRead,pendingClear});
if(d.getElementById('bsPreviewGrid'))void render();
})(window,document);
