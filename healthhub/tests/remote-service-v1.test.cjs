'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'remote-service/service.js'),'utf8');
const html=fs.readFileSync(path.join(root,'remote-service/index.html'),'utf8');
const main=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('v1179: former Gmail account-review service is visually and functionally closed',()=>{
 assert.match(html,/Dropbox-átállítás lezárva/);
 assert.match(html,/v=1179-retire-gmail-account-review/);
 assert.match(html,/Gmail-jóváhagyás kikapcsolva/);
 assert.match(html,/guardian\/\?gps=v1178/);
 assert.doesNotMatch(html,/<input|<button|oauth2\/authorize|Gmail Dropbox csatlakoztatása|id="sendBtn"/);
 assert.doesNotMatch(script,/fetch\s*\(|oauth2\/authorize|files\/upload|dropboxapi\.com|sendBtn|window\.location/);
 assert.match(main,/hh-remote-service-oauth-relay-v1/); // inert historical callback, no source can initiate it
 new Function(script);
});

function run(readyState='complete'){
 const files=new Map([['hh-remote-service-token-v1','old-private-token'],['hh-dropbox-token-v2','canonical-outlook-token']]);
 const sessions=new Map([['hh-remote-service-pkce-v1','old-pkce'],['other-session-key','keep']]);
 const touched=[];const status={textContent:''};let readyCallback=null;
 const localStorage={getItem:k=>files.get(k)||null,removeItem:k=>{touched.push('local:'+k);files.delete(k)}};
 const sessionStorage={getItem:k=>sessions.get(k)||null,removeItem:k=>{touched.push('session:'+k);sessions.delete(k)}};
 const document={readyState,getElementById:k=>k==='retirementStatus'?status:null,
   addEventListener(k,fn){assert.equal(k,'DOMContentLoaded');readyCallback=fn}};
 const fetch=()=>{throw Error('Network request in retired service')};
 vm.runInNewContext(script,{document,localStorage,sessionStorage,fetch,window:{}});
 if(readyCallback)readyCallback();
 return {files,sessions,touched,status};
}
test('retirement clears only OLD independent local OAuth grant and pending PKCE',()=>{
 const x=run('complete');
 assert.equal(x.files.has('hh-remote-service-token-v1'),false);
 assert.equal(x.sessions.has('hh-remote-service-pkce-v1'),false);
 assert.equal(x.files.get('hh-dropbox-token-v2'),'canonical-outlook-token');
 assert.equal(x.sessions.get('other-session-key'),'keep');
 assert.deepEqual(x.touched,['local:hh-remote-service-token-v1','session:hh-remote-service-pkce-v1']);
 assert.match(x.status.textContent,/lezárva/);
});
test('retired script works when loaded before DOM ready',()=>{
 const x=run('loading');
 assert.equal(x.files.has('hh-remote-service-token-v1'),false);
 assert.match(x.status.textContent,/Nincs új belépés/);
});
test('retirement cannot trigger GPS or Dropbox or browser navigation',()=>{
 assert.doesNotMatch(script,/Sh9GpsService|guardian-gps|navigator\.geolocation|\.assign\(|location\.href|\.reload\(/);
 assert.doesNotMatch(script,/hh-dropbox-token-v2/); // canonical OAuth store never mutated
});
