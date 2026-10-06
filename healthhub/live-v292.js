(function(){
'use strict';
/* HealthHub v1.292 — Google Drive mirror for Léna Health Context.
   OAuth via Google Identity Services. Scope: drive.file only. */

var CLIENT_ID='178857972266-tnpne28tk60ce9dqadh593uilipi0p32.apps.googleusercontent.com';
var SCOPE='https://www.googleapis.com/auth/drive.file';
var GIS_SRC='https://accounts.google.com/gsi/client';
var CTX_PREFIX='hh-lena-context-v289-';
var STATE_PREFIX='hh-lena-context-v292-drive-';
var FILE_PREFIX='hh-lena-context-v292-drive-file-';
var AUTH_KEY='hh-lena-drive-v292-authorized';
var TOKEN_KEY='hh-lena-drive-v292-token';
var timers={},busy={},tokenClient=null,gisPromise=null,tokenPromise=null;

function pkey(p){
  if(p==='m'||p==='monika')return 'monika';
  if(p==='z'||p==='zsolt')return 'zsolt';
  return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
function pname(p){return pkey(p)==='monika'?'Mónika':'Zsolt'}
function readJson(k,fallback){try{return JSON.parse(localStorage.getItem(k)||'null')||fallback}catch(e){return fallback}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function readSession(k,fallback){try{return JSON.parse(sessionStorage.getItem(k)||'null')||fallback}catch(e){return fallback}}
function writeSession(k,v){try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function ctx(p){return readJson(CTX_PREFIX+pkey(p),null)}
function state(p){return readJson(STATE_PREFIX+pkey(p),{})}
function saveState(p,s){writeJson(STATE_PREFIX+pkey(p),s||{})}
function fileId(p){try{return localStorage.getItem(FILE_PREFIX+pkey(p))||''}catch(e){return''}}
function saveFileId(p,id){try{if(id)localStorage.setItem(FILE_PREFIX+pkey(p),id);else localStorage.removeItem(FILE_PREFIX+pkey(p))}catch(e){}}
function authorized(){try{return localStorage.getItem(AUTH_KEY)==='1'}catch(e){return false}}
function markAuthorized(){try{localStorage.setItem(AUTH_KEY,'1')}catch(e){}}
function fmt(s){
  if(!s)return'még nincs';
  var d=new Date(s);
  return isNaN(d)?String(s):d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function currentToken(){
  var t=readSession(TOKEN_KEY,null);
  if(t&&t.access_token&&Number(t.expiresAt)>Date.now()+60000)return t;
  return null;
}
function clearToken(){try{sessionStorage.removeItem(TOKEN_KEY)}catch(e){}}
function setStateError(p,msg,needsAuth){
  saveState(p,{ok:false,uploading:false,updatedAt:new Date().toISOString(),error:String(msg||'Ismeretlen hiba'),needsAuth:!!needsAuth});
  renderStatus();
}
function loadGIS(){
  if(window.google&&google.accounts&&google.accounts.oauth2)return Promise.resolve();
  if(gisPromise)return gisPromise;
  gisPromise=new Promise(function(resolve,reject){
    var old=document.querySelector('script[src="'+GIS_SRC+'"]');
    if(old){
      old.addEventListener('load',function(){resolve()},{once:true});
      old.addEventListener('error',function(){reject(new Error('Google Identity Services nem tölthető be'))},{once:true});
      return;
    }
    var s=document.createElement('script');
    s.src=GIS_SRC;s.async=true;s.defer=true;
    s.onload=function(){resolve()};
    s.onerror=function(){reject(new Error('Google Identity Services nem tölthető be'))};
    document.head.appendChild(s);
  });
  return gisPromise;
}
async function ensureToken(interactive){
  var t=currentToken();
  if(t)return t.access_token;
  if(tokenPromise)return tokenPromise;
  tokenPromise=(async function(){
    await loadGIS();
    return await new Promise(function(resolve,reject){
      try{
        if(!tokenClient){
          tokenClient=google.accounts.oauth2.initTokenClient({
            client_id:CLIENT_ID,
            scope:SCOPE,
            callback:function(){}
          });
        }
        tokenClient.callback=function(resp){
          if(!resp||resp.error){
            reject(new Error(resp&&resp.error_description||resp&&resp.error||'Google Drive engedélyezés sikertelen'));
            return;
          }
          var expires=Number(resp.expires_in)||3600;
          writeSession(TOKEN_KEY,{access_token:resp.access_token,expiresAt:Date.now()+expires*1000});
          markAuthorized();
          resolve(resp.access_token);
        };
        tokenClient.error_callback=function(err){
          reject(new Error(err&&err.type||'Google OAuth ablak bezárva'));
        };
        tokenClient.requestAccessToken({prompt:interactive?(authorized()?'select_account':'consent'):''});
      }catch(e){reject(e)}
    });
  })().finally(function(){tokenPromise=null});
  return tokenPromise;
}
async function gfetch(url,opt,interactive,retry){
  var tok=await ensureToken(!!interactive);
  opt=opt||{};
  opt.headers=Object.assign({},opt.headers||{},{Authorization:'Bearer '+tok});
  var r=await fetch(url,opt);
  if(r.status===401&&!retry){
    clearToken();
    return gfetch(url,opt,interactive,true);
  }
  return r;
}
function fileName(p){return 'HealthHub-Lena-Context-'+pkey(p)+'.json'}
async function createDriveFile(p,interactive){
  var meta={
    name:fileName(p),
    mimeType:'application/json',
    description:'Private HealthHub Léna health context mirror for '+pname(p),
    appProperties:{healthhub:'lena-context',profile:pkey(p),schema:'1.1'}
  };
  var r=await gfetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,modifiedTime',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(meta)
  },interactive);
  if(!r.ok)throw new Error('Drive fájl létrehozási hiba ('+r.status+')');
  var j=await r.json();
  if(!j.id)throw new Error('A Drive nem adott fájlazonosítót');
  saveFileId(p,j.id);
  return j.id;
}
async function uploadContent(p,id,c,interactive){
  var payload=Object.assign({},c,{
    driveMirror:{
      mirroredAt:new Date().toISOString(),
      source:'HealthHub v292',
      profile:pkey(p),
      filename:fileName(p)
    }
  });
  var r=await gfetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,webViewLink,modifiedTime',{
    method:'PATCH',
    headers:{'Content-Type':'application/json; charset=UTF-8'},
    body:JSON.stringify(payload)
  },interactive);
  if(r.status===404||r.status===403)return null;
  if(!r.ok)throw new Error('Drive feltöltési hiba ('+r.status+')');
  return await r.json();
}
async function mirror(profile,interactive,reason){
  var p=pkey(profile);
  if(busy[p])return busy[p];
  busy[p]=(async function(){
    var c=ctx(p);
    if(!c){
      setStateError(p,'Nincs helyi Léna Context',false);
      return false;
    }
    saveState(p,{ok:false,uploading:true,startedAt:new Date().toISOString(),reason:reason||'mirror'});
    renderStatus();
    try{
      await ensureToken(!!interactive);
      var id=fileId(p);
      if(!id)id=await createDriveFile(p,!!interactive);
      var res=await uploadContent(p,id,c,!!interactive);
      if(!res){
        saveFileId(p,'');
        id=await createDriveFile(p,!!interactive);
        res=await uploadContent(p,id,c,!!interactive);
      }
      if(!res)throw new Error('Drive mirror nem hozható létre');
      var now=new Date().toISOString();
      saveState(p,{
        ok:true,
        uploading:false,
        updatedAt:now,
        contextGeneratedAt:c.generatedAt||null,
        fileId:id,
        fileName:fileName(p),
        webViewLink:res.webViewLink||null,
        reason:reason||'mirror',
        needsAuth:false
      });
      try{
        window.dispatchEvent(new CustomEvent('healthhub:lena-context-drive-synced',{
          detail:{profile:p,updatedAt:now,fileId:id,fileName:fileName(p)}
        }));
      }catch(e){}
      renderStatus();
      return true;
    }catch(e){
      var msg=String(e&&e.message||e);
      var needs=/popup|oauth|token|interaction|account|consent|engedély/i.test(msg);
      setStateError(p,msg,needs);
      return false;
    }
  })().finally(function(){busy[p]=null});
  return busy[p];
}
async function connectAll(){
  var p=pkey();
  saveState(p,{ok:false,uploading:true,startedAt:new Date().toISOString(),reason:'manual-connect'});
  renderStatus();
  try{
    await ensureToken(true);
    var jobs=[];
    if(ctx('monika'))jobs.push(mirror('monika',false,'manual-connect'));
    if(ctx('zsolt'))jobs.push(mirror('zsolt',false,'manual-connect'));
    if(!jobs.length)jobs.push(mirror(p,false,'manual-connect'));
    await Promise.allSettled(jobs);
    renderStatus();
  }catch(e){
    setStateError(p,String(e&&e.message||e),true);
  }
}
function schedule(profile,reason,delay){
  var p=pkey(profile);
  clearTimeout(timers[p]);
  timers[p]=setTimeout(function(){
    if(!authorized())return;
    mirror(p,false,reason).catch(function(){});
  },delay==null?1000:delay);
}
function renderStatus(){
  var box=document.getElementById('hhLenaCtx289');
  if(!box)return;
  var old=document.getElementById('hhLenaDrive292');
  if(old)old.remove();

  var p=pkey(),st=state(p),tok=currentToken();
  var d=document.createElement('div');
  d.id='hhLenaDrive292';
  d.style.marginTop='7px';
  d.style.paddingTop='7px';
  d.style.borderTop='1px solid #e5edf2';
  d.style.fontSize='7.2px';
  d.style.lineHeight='1.55';
  d.style.color='#7f91a0';

  var drive;
  if(st.uploading)drive='⏳ szinkronizálás…';
  else if(st.ok)drive='✅ '+fmt(st.updatedAt);
  else if(st.error)drive='⚠ '+String(st.error).slice(0,88);
  else if(authorized())drive='🔐 engedélyezve, sync szükséges';
  else drive='⏸ nincs csatlakoztatva';

  var btnLabel=authorized()
    ?(tok?'Drive sync most':'Google Drive újracsatlakoztatása')
    :'Google Drive csatlakoztatása';

  d.innerHTML=
    '<b style="color:#2b7a46">🔗 Google Drive mirror · '+pname(p)+'</b><br>'+
    'Drive: '+drive+
    '<br><span style="color:#8b98a5">Fájl: '+fileName(p)+'</span><br>'+
    '<button type="button" id="hhDriveBtn292" style="margin-top:6px;border:0;border-radius:9px;padding:7px 9px;background:#2b7a46;color:#fff;font-size:7.5px;font-weight:900;cursor:pointer">'+btnLabel+'</button>'+
    '<br><span style="color:#8b98a5">🤖 ChatGPT/Léna olvasás: Drive mirror után ellenőrizhető</span>';

  box.appendChild(d);
  var b=d.querySelector('#hhDriveBtn292');
  if(b)b.onclick=function(){
    if(currentToken())mirror(p,false,'manual-sync');
    else connectAll();
  };
}

window.hhGetGoogleDriveToken292=function(interactive){return ensureToken(!!interactive)};
window.hhGoogleDriveAuthorized292=authorized;
window.hhConnectGoogleDrive292=connectAll;
window.hhMirrorLenaContextDrive292=function(p){return mirror(p||pkey(),true,'manual')};
window.hhGetLenaContextDriveState292=function(p){return state(p||pkey())};

window.addEventListener('healthhub:lena-context-updated',function(e){
  var p=e&&e.detail&&e.detail.profile||pkey();
  setTimeout(renderStatus,180);
  schedule(p,'local-context-updated',1000);
});
window.addEventListener('healthhub:lena-context-cloud-synced',function(e){
  var p=e&&e.detail&&e.detail.profile||pkey();
  setTimeout(renderStatus,180);
  schedule(p,'dropbox-context-synced',1200);
});
window.addEventListener('healthhub:profile-changed',function(e){
  setTimeout(renderStatus,180);
  var p=e&&e.detail&&e.detail.profile||pkey();
  var c=ctx(p),st=state(p);
  if(c&&authorized()&&(!st.ok||st.contextGeneratedAt!==c.generatedAt)){
    schedule(p,'profile-changed',1500);
  }
});
window.addEventListener('focus',function(){
  setTimeout(renderStatus,220);
  var p=pkey(),c=ctx(p),st=state(p);
  if(c&&authorized()&&(!st.ok||st.contextGeneratedAt!==c.generatedAt)){
    schedule(p,'focus-catchup',1700);
  }
});
setTimeout(function(){
  renderStatus();
  var p=pkey(),c=ctx(p),st=state(p);
  if(c&&authorized()&&(!st.ok||st.contextGeneratedAt!==c.generatedAt)){
    schedule(p,'startup-catchup',2000);
  }
},1600);

document.documentElement.dataset.healthhubLenaDriveMirror='1.292';
})();