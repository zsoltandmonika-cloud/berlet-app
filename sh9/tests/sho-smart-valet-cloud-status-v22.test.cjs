'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(base,'sh9/wallet/smart-valet-cloud-status-v22.js'),'utf8');
const css=fs.readFileSync(path.join(base,'sh9/wallet/smart-valet-cloud-status-v22.css'),'utf8');
const html=fs.readFileSync(path.join(base,'sh9/wallet/index.html'),'utf8');
function fixture(opt={}){
 const nodes=new Map(),events=new Map(),calls=[],timeouts=[],storage=new Map([['hh-profile',opt.profile==='monika'?'m':'z']]);
 const data=opt.rows||{
  hh_valet_items:[{id:'a',uploaded_at:'2026-11-06T12:00:00Z'},{id:'b',uploaded_at:'2026-11-06T12:00:00Z'}],
  hh_valet_identity_cards_v11:[{id:'c',protection_mode:'password',front_saved_at:'2026-11-06T12:00:00Z'}],
  hh_valet_extra_cards_v15:[{id:'d',category:'health',protection_mode:'password'}]
 };
 function element(tag){
  return{tag,id:'',dataset:{},children:[],disabled:false,textContent:'',className:'',
   setAttribute(){},addEventListener(k,fn){this.onclick=fn},
   append(...items){this.children.push(...items);for(const el of items){el.parentNode=this;if(el.id)nodes.set(el.id,el)}},
   appendChild(el){this.append(el)},
   insertBefore(el){this.append(el)}};
 }
 const library=element('section'),cats=element('div');
 cats.className='sv-categories';library.appendChild(cats);
 library.querySelector=s=>s==='.sv-categories'?cats:null;
 const doc={readyState:'complete',hidden:false,createElement:element,
  querySelector:s=>s==='.sv-section[aria-labelledby="svLibraryTitle"]'?library:null,
  getElementById:id=>nodes.get(id)||null,addEventListener(k,fn){events.set('document:'+k,fn)}};
 const db={
  auth:{getUser:async()=>({data:{user:opt.noLogin?null:{id:'family-account'}},error:null})},
  from(table){
   calls.push(table);
   const chain={select(){return chain},eq(){return chain},maybeSingle:async()=>({data:opt.forbidden?null:{profile_key:'zsolt'},error:null}),
    limit:async()=>opt.failedTable===table?{data:null,error:{message:'failed'}}:{data:data[table]||[],error:null}};
   return chain;
  }
 };
 const w={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test'},
  supabase:{createClient:()=>db},
  localStorage:{getItem:key=>storage.get(key)||null},addEventListener:(k,fn)=>events.set(k,fn)};
 const source=vm.createContext({window:w,document:doc,setTimeout:fn=>{timeouts.push(fn);return timeouts.length},
  clearTimeout:()=>{},console,Promise,Array});
 vm.runInContext(js,source);
 return {nodes,w,calls,events,storage,library,run:()=>w.SHO_VALET_CLOUD_STATUS_V22.check(),
  text:()=>nodes.get('svCloudTitleV22').textContent,
  detail:()=>nodes.get('svCloudDetailV22').textContent,
  status:()=>nodes.get('svCloudStatusV22').dataset.state};
}
test('read-only source, accessible premium indicator, existing modules untouched',()=>{
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(html,/smart-valet-cloud-status-v22\.js\?v=22-backup-indicator/);
 assert.match(html,/smart-valet-cloud-status-v22\.css\?v=22-backup-indicator/);
 assert.match(css,/data-profile=monika/);
 assert.doesNotMatch(js,/storage\.from\(|\.insert\(|\.upsert\(|\.update\(|\.delete\(|\.remove\(|localStorage\.setItem|sessionStorage\.setItem/);
 assert.match(js,/hh-guardian-family-auth-v785/);
});
test('successful server record check reports saved items without claiming restore proof',async()=>{
 const f=fixture();await f.run();
 assert.equal(f.status(),'ok');assert.match(f.text(),/4 rekord/);
 assert.match(f.detail(),/Nem PDF-visszaállítási próba/);
 assert.ok(f.calls.includes('hh_profile_access'));
 assert.ok(f.calls.includes('hh_valet_identity_cards_v11'));
 assert.ok(f.calls.includes('hh_valet_extra_cards_v15'));
});
test('device-bound key shows explicit caution despite remote records',async()=>{
 const f=fixture({rows:{hh_valet_items:[],hh_valet_identity_cards_v11:[{id:'c',protection_mode:'device',front_saved_at:'2026-11-06'}],hh_valet_extra_cards_v15:[]}});
 await f.run();assert.equal(f.status(),'caution');assert.match(f.detail(),/böngészőadatokat ne töröld/);
});
test('pending upload and cloud error can never show green success',async()=>{
 const pending=fixture({rows:{hh_valet_items:[{id:'a',uploaded_at:null}],hh_valet_identity_cards_v11:[],hh_valet_extra_cards_v15:[]}});
 await pending.run();assert.equal(pending.status(),'warning');
 const fail=fixture({failedTable:'hh_valet_items'});await fail.run();assert.equal(fail.status(),'error');
});
test('missing login and permission are distinguished from empty wallet',async()=>{
 const login=fixture({noLogin:true});await login.run();assert.equal(login.status(),'locked');assert.match(login.text(),/belépés/);
 const acl=fixture({forbidden:true});await acl.run();assert.equal(acl.status(),'locked');assert.match(acl.text(),/profil-hozzáférés/);
 const empty=fixture({rows:{hh_valet_items:[],hh_valet_identity_cards_v11:[],hh_valet_extra_cards_v15:[]}});
 await empty.run();assert.equal(empty.status(),'empty');
});
test('profile changes invalidate an old in-flight check and trigger new check',async()=>{
 const f=fixture();await f.run();f.storage.set('hh-profile','m');
 f.events.get('hh-family-profile-changed')();
 assert.equal(f.status(),'checking');
 assert.equal(f.nodes.get('svCloudStatusV22').dataset.profile,'monika');
});
