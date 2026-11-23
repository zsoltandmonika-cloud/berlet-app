/* SHO Media Center · OneDrive read-only phone experience.
 * Reuses the user's already authorized, same-origin Book Studio session.
 * No personal media or access tokens sent to the TV or to Supabase broadcasts.
 */
(function(w,d){
'use strict';
var $=id=>d.getElementById(id);
var GRAPH='https://graph.microsoft.com/v1.0/';
var AUTH='https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
var CFG='sh9-book-ms-config-v2',TOKEN='sh9-book-ms-access-v2';
var SCOPE='openid profile offline_access User.Read Files.Read';
var PATHS={photos:{label:'Képek',path:'Képek',mime:/^image\/(jpeg|png|gif|webp|bmp|avif|heic|heif)$/i},
 videos:{label:'Home Videók',path:'Videos/HomeVideo',mime:/^video\//i},
 music:{label:'Zene',path:'Zene/Full Albums',mime:/^audio\//i}};
var config=null,access='',expires=0,active='',folder='',crumbs=[],entries=[],serial=0,renewing=null,viewer=null,verified=false,photoTouch=null;
function parse(v){try{return JSON.parse(v)}catch(_){return null}}
function get(s,k){try{return s.getItem(k)}catch(_){return null}}
function put(s,k,v){try{s.setItem(k,v)}catch(_){}}
function safe(s){return String(s||'').slice(0,180)}
function status(t,bad){var e=$('odMediaStatus');e.textContent=t;e.dataset.error=bad?'1':'0'}
function reset(){access='';expires=0;verified=false;try{w.sessionStorage.removeItem(TOKEN)}catch(_){}}
function readConfig(){
 var c=parse(get(w.localStorage,CFG))||parse(get(w.localStorage,'sh9-ms-calendar-config-v1'));
 if(!c||!/^[0-9a-f-]{36}$/i.test(c.clientId||'')||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.account||''))return null;
 return {clientId:c.clientId,account:c.account.toLowerCase()};
}
function cachedAccess(){
 var x=parse(get(w.sessionStorage,TOKEN));
 if(!x||!config||x.clientId!==config.clientId||x.account!==config.account||
 !x.accessToken||!Number.isFinite(x.expires)||x.expires<Date.now()+45000)return false;
 access=x.accessToken;expires=x.expires;return true;
}
async function refresh(){
 if(renewing)return renewing;
 renewing=(async function(){
  var vault=w.SH9_BOOK_ONEDRIVE_PERSIST_V3;
  if(!vault||!config)return false;
  var saved=await vault.load(w,config.clientId,config.account);if(!saved)return false;
  try{
   var response=await fetch(AUTH,{method:'POST',cache:'no-store',credentials:'omit',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:config.clientId,grant_type:'refresh_token',refresh_token:saved.refreshToken,scope:SCOPE})});
   if(!response.ok)return false;
   var data=await response.json();if(!data.access_token)return false;
   access=data.access_token;expires=Date.now()+Math.max(60,Number(data.expires_in)||3600)*1000;
   put(w.sessionStorage,TOKEN,JSON.stringify({accessToken:access,expires:expires,clientId:config.clientId,account:config.account}));
   if(data.refresh_token)await vault.save(w,config.clientId,config.account,data.refresh_token,saved.issuedAt);
   return true;
  }catch(_){return false}
 })().finally(function(){renewing=null});
 return renewing;
}
async function graph(url){
 if(!config)throw Error('A OneDrive még nincs beállítva a Book Studióban.');
 var u=new URL(url,GRAPH);
 if(u.protocol!=='https:'||u.hostname!=='graph.microsoft.com'||u.pathname.indexOf('/v1.0/')!==0)throw Error('Érvénytelen Graph cím.');
 if(!(access&&expires>Date.now()+45000)&&!cachedAccess()&&!await refresh())throw Error('A Microsoft-munkamenet lejárt. Csatlakozz a Book Studióban.');
 var send=function(){return fetch(u.href,{method:'GET',cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+access}})};
 var r=await send();if(r.status===401){reset();if(await refresh())r=await send()}
 if(!r.ok){if(r.status===401)reset();throw Error('OneDrive HTTP '+r.status)}
 return r.json();
}
async function verify(){
 if(verified)return;
 var p=await graph('me?$select=mail,userPrincipalName,otherMails');
 var emails=[p.mail,p.userPrincipalName].concat(p.otherMails||[]).filter(Boolean).map(function(s){return String(s).toLowerCase()});
 if(emails.indexOf(config.account)<0){reset();throw Error('Másik Microsoft-fiók van bejelentkezve.')}
 verified=true;
}
function typeOf(x){return String((x.file&&x.file.mimeType)||'').toLowerCase()}
function allow(x){return !!x.folder||PATHS[active].mime.test(typeOf(x))}
function fmt(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
function pathEncode(p){return p.split('/').map(encodeURIComponent).join('/')}
function showConnect(){if($('odMediaConnect'))$('odMediaConnect').hidden=false}
function crumbBar(){
 var root=$('mediaBreadcrumb');root.replaceChildren();
 crumbs.forEach(function(c,i){var b=d.createElement('button');b.type='button';b.textContent=c.name;b.onclick=function(){crumbs=crumbs.slice(0,i+1);void list(c.id)};root.appendChild(b)});
}
function close(){
 var f=$('mediaViewer');if(f.hidden)return;
 var player=$('mediaPlayer'),audio=$('mediaAudio');
 player.pause();player.removeAttribute('src');player.load();
 audio.pause();audio.removeAttribute('src');audio.load();
 var photo=$('mediaImage');photo.onload=null;photo.onerror=null;photo.removeAttribute('src');
 photoTouch=null;viewer=null;f.hidden=true;syncViewerTools();
 if(d.fullscreenElement)void d.exitFullscreen().catch(function(){});
}
function mediaCard(x){
 var b=d.createElement('button');b.type='button';b.className='media-file';
 b.dataset.kind=x.folder?'folder':active;
 b.setAttribute('aria-label',(x.folder?'Mappa megnyitása: ':'Média megnyitása: ')+safe(x.name));
 var img=d.createElement('span');img.className='media-file-cover';
 img.textContent=x.folder?'📁':active==='photos'?'🖼️':active==='videos'?'🎬':'🎧';
 var kind=d.createElement('span');kind.className='media-file-kind';
 kind.textContent=x.folder?'ALBUM / MAPPA':active==='photos'?'FÉNYKÉP':active==='videos'?'HOME VIDEÓ':'ZENE';
 var t=d.createElement('strong');t.textContent=safe(x.name);
 var sub=d.createElement('small');
 sub.textContent=x.folder?(Number.isFinite(Number(x.folder.childCount))?x.folder.childCount+' elem':'Mappa megnyitása'):fmt(Number(x.size)||0);
 b.append(img,kind,t,sub);
 var thumb=x.thumbnails&&x.thumbnails[0]&&(x.thumbnails[0].medium||x.thumbnails[0].small);
 // Thumbnails are temporary network images. Never save or prefetch media into local application storage.
 if(!x.folder&&thumb&&typeof thumb.url==='string'&&thumb.url.indexOf('https://')===0){
  var poster=d.createElement('img');poster.alt='';poster.loading='lazy';poster.referrerPolicy='no-referrer';poster.src=thumb.url;img.textContent='';img.appendChild(poster);
 }
 b.onclick=function(){if(x.folder){crumbs.push({id:x.id,name:x.name});void list(x.id)}else void open(x)};
 return b;
}
async function listing(u){
 var out=[],next=u,pages=0;
 while(next&&++pages<=5&&out.length<650){
  var j=await graph(next);out.push.apply(out,j.value||[]);next=j['@odata.nextLink']||'';
 }return out;
}
async function list(id){
 if(!PATHS[active])return;
 var seq=++serial;folder=id;if(!$('mediaViewer').hidden)close();
 var grid=$('mediaFiles');grid.replaceChildren();crumbBar();status('☁️ OneDrive mappa betöltése…');
 $('mediaLibrarySummary').textContent='';
 $('mediaLibrarySubtitle').textContent=crumbs.map(function(c){return c.name}).join(' › ')+' · saját OneDrive médiatár';
 try{
  await verify();
  var path=id?'me/drive/items/'+encodeURIComponent(id)+'/children':
   'me/drive/root:/'+pathEncode(PATHS[active].path)+':/children';
  var url=path+'?$top=120&$expand=thumbnails',rows;
  try{rows=await listing(url)}catch(err){
   if(/HTTP 400/.test(err.message||''))rows=await listing(path+'?$top=120');
   else throw err;
  }
  if(seq!==serial)return;
  entries=rows.filter(allow).sort(function(a,b){return Number(!!b.folder)-Number(!!a.folder)||a.name.localeCompare(b.name,'hu')});
  entries.forEach(function(x){grid.appendChild(mediaCard(x))});
  if(!entries.length)grid.textContent='Ebben a mappában nincs megjeleníthető média.';
  var folderCount=entries.filter(function(x){return !!x.folder}).length;
  $('mediaLibrarySummary').textContent=folderCount+' mappa · '+(entries.length-folderCount)+' médiaelem';
  status('✓ OneDrive · '+entries.length+' elem · csak olvasás');
 }catch(err){if(seq!==serial)return;status('⚠ '+safe(err.message),true);showConnect()}
}
async function select(kind){
 if(!PATHS[kind])return;
 active=kind;config=readConfig();verified=false;access='';expires=0;
 $('mediaLibrary').hidden=false;
 $('mediaLibraryTitle').textContent=PATHS[kind].label+' · OneDrive';
 $('mediaLibrarySubtitle').textContent=kind==='photos'?'Saját fotóalbumok, lapozható galéria':kind==='videos'?'Családi felvételek, prémium lejátszó':'Albumok és zenék, prémium lejátszó';
 $('mediaLibrarySummary').textContent='';
 $('odMediaConnect').hidden=true;crumbs=[{id:'',name:PATHS[kind].label}];entries=[];folder='';
 $('mediaLibrary').scrollIntoView({behavior:'smooth',block:'start'});
 if(!config){status('Microsoft-kapcsolat szükséges. Nyisd meg a Book Studiót.',true);showConnect();return}
 await Promise.all([list(''),updateTileArt()]);
}
function photosInFolder(){
 return active==='photos'?entries.filter(function(x){return !x.folder&&PATHS.photos.mime.test(typeOf(x))}):[];
}
function currentPlayer(){return active==='music'?$('mediaAudio'):active==='videos'?$('mediaPlayer'):null}
function syncTransportLabel(){
 var p=currentPlayer();$('mediaTransportPlay').textContent=p&&!p.paused?'Ⅱ Szünet':'▶ Lejátszás';
}
function syncViewerTools(){
 var visible=!!viewer&&!$('mediaViewer').hidden;
 var gallery=visible&&active==='photos'?photosInFolder():[];
 var at=visible&&active==='photos'?gallery.findIndex(function(x){return x.id===viewer.id}):-1;
 var isPhoto=visible&&active==='photos';
 $('mediaPhotoCounter').hidden=!isPhoto;
 $('mediaPhotoCounter').textContent=isPhoto?(at>=0?at+1:0)+' / '+gallery.length:'';
 $('mediaPhotoPrev').hidden=!isPhoto||gallery.length<2;
 $('mediaPhotoNext').hidden=!isPhoto||gallery.length<2;
 $('mediaPhotoPrev').disabled=at<=0;
 $('mediaPhotoNext').disabled=at<0||at>=gallery.length-1;
 $('mediaViewerTransport').hidden=!visible||isPhoto;
 syncTransportLabel();
}
function movePhoto(direction){
 if($('mediaViewer').hidden||active!=='photos'||!viewer)return;
 var gallery=photosInFolder();
 var at=gallery.findIndex(function(x){return x.id===viewer.id});
 var next=at+direction;
 if(at<0||next<0||next>=gallery.length)return;
 // Only the requested photo is opened. Adjacent photos are NEVER prefetched.
 void open(gallery[next]);
}
async function open(item){
 viewer=item;$('mediaViewer').hidden=false;
 $('mediaViewerTitle').textContent=safe(item.name);
 var photo=$('mediaImage');photo.onload=null;photo.onerror=null;photo.removeAttribute('src');
 photo.alt=safe(item.name);
 photo.hidden=true;$('mediaPlayer').hidden=true;$('mediaAudio').hidden=true;
 $('mediaViewerMessage').textContent='Betöltés…';
 syncViewerTools();
 try{
  var data=await graph('me/drive/items/'+encodeURIComponent(item.id));
  var url=data['@microsoft.graph.downloadUrl'];
  if(typeof url!=='string'||url.indexOf('https://')!==0)throw Error('A Microsoft nem adott lejátszási linket.');
  if(viewer!==item)return;
  // Ephemeral OneDrive URL: no local media cache and no adjacent image prefetch.
  if(active==='photos'){
   photo.onload=function(){if(viewer===item)$('mediaViewerMessage').textContent=''};
   photo.onerror=function(){if(viewer===item)$('mediaViewerMessage').textContent='⚠ A fénykép nem tölthető be.'};
   photo.hidden=false;
   photo.src=url;
   $('mediaViewerMessage').textContent='Kép betöltése… · lapozás ujjal vagy a nyilakkal';
  }else{
   var player=currentPlayer();
   player.src=url;player.hidden=false;player.controls=true;
   // preload="none" is preserved; never start media downloads or playback automatically.
   $('mediaViewerMessage').textContent='Koppints a ▶ Lejátszás gombra.';
   syncTransportLabel();
  }
 }catch(err){if(viewer===item)$('mediaViewerMessage').textContent='⚠ '+safe(err.message)}
}
async function fullscreen(){
 var surface=$('mediaViewerFrame');
 try{
  if(!d.fullscreenElement&&surface.requestFullscreen)await surface.requestFullscreen();
  if(w.screen.orientation&&w.screen.orientation.lock)await w.screen.orientation.lock('landscape').catch(function(){});
 }catch(_){status('Fordítsd el a telefont. A böngésző itt korlátozhatja a teljes képernyőt.',true)}
}
$('mediaViewerClose').onclick=close;
$('mediaViewerFullscreen').onclick=function(){void fullscreen()};
$('mediaPhotoPrev').onclick=function(){movePhoto(-1)};
$('mediaPhotoNext').onclick=function(){movePhoto(1)};
function seek(seconds){
 var p=currentPlayer();
 if(!p||!viewer||$('mediaViewer').hidden)return;
 var now=Number(p.currentTime)||0;
 if(Number.isFinite(p.duration))p.currentTime=Math.max(0,Math.min(p.duration,now+seconds));
 else if(seconds<0)p.currentTime=Math.max(0,now+seconds);
}
$('mediaTransportBack').onclick=function(){seek(-10)};
$('mediaTransportForward').onclick=function(){seek(10)};
$('mediaTransportPlay').onclick=function(){
 var p=currentPlayer();
 if(!p||!viewer||$('mediaViewer').hidden)return;
 if(!p.paused){p.pause();return}
 var playing=p.play();
 if(playing&&typeof playing.catch==='function')void playing.catch(function(){
  $('mediaViewerMessage').textContent='⚠ A lejátszást a böngésző vagy a formátum blokkolta.';
 });
};
[$('mediaPlayer'),$('mediaAudio')].forEach(function(p){
 ['play','pause','ended'].forEach(function(event){p.addEventListener(event,syncTransportLabel)});
});
$('mediaImage').addEventListener('touchstart',function(e){
 photoTouch=active==='photos'&&viewer&&e.touches.length===1?
  {x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
},{passive:true});
$('mediaImage').addEventListener('touchend',function(e){
 var start=photoTouch;photoTouch=null;
 if(!start||active!=='photos'||!viewer||e.changedTouches.length!==1)return;
 var dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
 if(Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.4)movePhoto(dx<0?1:-1);
},{passive:true});
$('mediaImage').addEventListener('touchcancel',function(){photoTouch=null});
$('mediaFullScreen').onclick=async function(){
 try{if(!d.fullscreenElement&&d.querySelector('.page').requestFullscreen)await d.querySelector('.page').requestFullscreen();
  if(w.screen.orientation&&w.screen.orientation.lock)await w.screen.orientation.lock('landscape').catch(function(){});
 }catch(_){status('Fekvő nézethez fordítsd el a telefont. A böngésző korlátozhatja a teljes képernyőt.',true)}
};
$('mediaRefresh').onclick=function(){if(active)void list(folder)};
$('odMediaConnect').onclick=function(){w.location.href='../book-studio/'};
$('mediaViewer').addEventListener('click',function(e){if(e.target===$('mediaViewer'))close()});
d.addEventListener('keydown',function(e){
 if($('mediaViewer').hidden)return;
 if(e.key==='Escape'){close();return}
 if(active==='photos'&&!e.altKey&&!e.ctrlKey&&!e.metaKey){
  if(e.key==='ArrowLeft'){e.preventDefault();movePhoto(-1)}
  if(e.key==='ArrowRight'){e.preventDefault();movePhoto(1)}
 }
});
Array.prototype.forEach.call(d.querySelectorAll('.tile[data-library]'),function(tile){
 tile.addEventListener('click',function(e){e.preventDefault();void select(tile.getAttribute('data-library'))});
});
// V5: no intermediate/stale tile art probe. Start from stable glass gradients.
// The approved, authenticated OneDrive artwork is installed only after full image load.
async function updateTileArt(){
 // The approved synthetic tile artwork remains private in OneDrive.
 // Pull transient signed URLs only after a verified Microsoft session.
 if(!config)return;
 try{
  await verify();
  var j=await graph('me/drive/root:/SHO%20Media%20Center%20Assets:/children?$top=30');
  var list=j.value||[];
  var names={homecinema:'sho-tile-homecinema-v2.webp',photos:'sho-tile-photos-v2.webp',
   videos:'sho-tile-homevideos-approved-v3.webp',music:'sho-tile-music-v2.webp'};
  for(let slug in names){
   var file=list.find(function(x){return x.name===names[slug]&&x.file});
   if(!file)continue;
   try{
    var item=await graph('me/drive/items/'+encodeURIComponent(file.id));
    var link=item['@microsoft.graph.downloadUrl'];
    if(typeof link==='string'&&link.indexOf('https://')===0){
     let tile=d.querySelector(slug==='homecinema'?'.tile.cinema':'.tile[data-library="'+slug+'"]');
     if(tile){var art=new Image();art.onload=function(){tile.style.setProperty('--image','url("'+link.replace(/"/g,'%22')+'")');if(slug==='videos')tile.classList.add('tile-art-baked-v4');};art.src=link;}
    }
   }catch(_){}
  }
 }catch(_){/* Keep public fallback image when OneDrive is unavailable. */}
}
// Paint the approved premium artwork on the landing page whenever the previously
// authorized Microsoft session is available. Never force an OAuth redirect.
config=readConfig();
if(config)void updateTileArt();
// Foreground-only, lightweight refresh, keeping OneDrive as source of truth.
var lastAutoSync=Date.now();
function liveSync(){
 if(!active||!folder&&!(PATHS[active])||!$('mediaViewer').hidden||d.hidden)return;
 var now=Date.now();
 if(now-lastAutoSync<5*60*1000)return;
 lastAutoSync=now;
 void list(folder);
}
w.setInterval(liveSync,60000);
if(d.addEventListener)d.addEventListener('visibilitychange',liveSync);
if(w.addEventListener)w.addEventListener('pageshow',liveSync);
w.SHOMediaV2=Object.freeze({select:select});
})(window,document);