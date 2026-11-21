/* SHO Entertainment approved Media Center art V4.
 * Art is in the owner's existing read-only OneDrive folder, not a public share.
 * Reuse delegated Book Studio session; preserve original artwork offline.
 * Never expose Microsoft authorization token or private data in TV pairing.
 */
(function(w,d){
 'use strict';
 var target=d.querySelector('.mc-feature-card');
 if(!target)return;
 var CFG='sh9-book-ms-config-v2',TOKEN='sh9-book-ms-access-v2';
 var NAME='sho-media-center-hero-approved-v3.webp';
 function parse(x){try{return JSON.parse(x)}catch(_){return null}}
 function stored(s,k){try{return s.getItem(k)}catch(_){return null}}
 function cfg(){
  var c=parse(stored(w.localStorage,CFG))||parse(stored(w.localStorage,'sh9-ms-calendar-config-v1'));
  if(!c||!/^[a-f0-9-]{36}$/i.test(c.clientId||'')||!c.account)return null;
  return {clientId:c.clientId,account:String(c.account).toLowerCase()};
 }
 async function getToken(c){
  var cached=parse(stored(w.sessionStorage,TOKEN));
  if(cached&&cached.clientId===c.clientId&&cached.account===c.account&&cached.accessToken&&
   Number(cached.expires)>Date.now()+60000)return cached.accessToken;
  var vault=w.SH9_BOOK_ONEDRIVE_PERSIST_V3;
  if(!vault)return '';
  var saved=await vault.load(w,c.clientId,c.account);if(!saved||!saved.refreshToken)return '';
  var response=await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token',{
   method:'POST',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({client_id:c.clientId,grant_type:'refresh_token',refresh_token:saved.refreshToken,
    scope:'openid profile offline_access User.Read Files.Read'})
  });
  if(!response.ok)return '';
  var data=await response.json();if(!data.access_token)return '';
  var expires=Date.now()+Math.max(Number(data.expires_in)||3600,60)*1000;
  try{w.sessionStorage.setItem(TOKEN,JSON.stringify({accessToken:data.access_token,
   expires:expires,clientId:c.clientId,account:c.account}))}catch(_){}
  if(data.refresh_token)await vault.save(w,c.clientId,c.account,data.refresh_token,saved.issuedAt);
  return data.access_token;
 }
 async function authorized(url,token){
  var u=new URL(url,'https://graph.microsoft.com/v1.0/');
  if(u.hostname!=='graph.microsoft.com'||!u.pathname.startsWith('/v1.0/'))return null;
  var r=await fetch(u.href,{cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+token}});
  return r.ok?r.json():null;
 }
 async function paint(){
  var c=cfg();if(!c)return;
  try{
   var token=await getToken(c);if(!token)return;
   var me=await authorized('me?$select=mail,userPrincipalName,otherMails',token);
   var accounts=me?[me.mail,me.userPrincipalName].concat(me.otherMails||[]).filter(Boolean):[];
   if(!accounts.some(function(email){return String(email).toLowerCase()===c.account}))return;
   var contents=await authorized('me/drive/root:/SHO%20Media%20Center%20Assets:/children?$top=50',token);
   var entry=(contents&&contents.value||[]).find(function(x){return x.name===NAME&&x.file});
   if(!entry)return;
   var item=await authorized('me/drive/items/'+encodeURIComponent(entry.id),token);
   var url=item&&item['@microsoft.graph.downloadUrl'];
   if(typeof url!=='string'||!url.startsWith('https://'))return;
   var img=new Image();
   img.onload=function(){
    target.style.setProperty('--mc-approved-art','url("'+url.replace(/"/g,'%22')+'")');
    target.classList.add('mc-v4-approved');
   };
   img.src=url;
  }catch(_){/* Keep existing full-width card and its readable text. */}
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',paint,{once:true});else void paint();
})(window,document);