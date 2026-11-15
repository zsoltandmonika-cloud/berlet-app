/* SHO Tesco Bridge v3 · complete family list and full merchant search handoff.
 * No cart API, no manual basket status. Source list is read-only.
 * Per-tab next-item state in sessionStorage; verified Tesco SKU links synced in family Supabase.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id), FAMILY='zsolt-monika';
const TABLE='hh_shopping_list_v1', MAPPING='hh_shopping_tesco_bridge_v1';
const SEARCH_BASE='https://bevasarlas.tesco.hu/shop/hu-HU/search?query=';
const NAV_KEY='sho-tesco-bridge-v2'; // keep v2 navigation state
const DEMO=[
 {id:'milk',name:'Tesco UHT félzsíros tej 2,8% 1 l',quantity:2,unit:'db',icon:'🥛'},
 {id:'bread',name:'Kovászos vekni 470 g',quantity:1,unit:'db',icon:'🍞'},
 {id:'banana',name:'Banán lédig',quantity:1,unit:'kg',icon:'🍌'},
 {id:'eggs',name:'Friss tojás M 10 db',quantity:1,unit:'doboz',icon:'🥚'},
 {id:'penne',name:'Penne tészta 500 g',quantity:2,unit:'csomag',icon:'🍝'},
 {id:'rice',name:'Jázmin rizs 1 kg',quantity:1,unit:'db',icon:'🍚'},
 {id:'coffee',name:'Arabica szemes kávé 1 kg',quantity:1,unit:'db',icon:'☕'},
 {id:'tomato',name:'Koktélparadicsom',quantity:500,unit:'g',icon:'🍅'},
 {id:'water',name:'Szénsavmentes ásványvíz 1,5 l',quantity:2,unit:'db',icon:'💧'},
 {id:'yoghurt',name:'Natúr joghurt 500 g',quantity:2,unit:'db',icon:'🥣'}
];
if(DEMO.length!==10)throw Error('A pilot 10 próbaelemből áll.');
const cfg=w.HH_CENTRAL_VAULT;
const nativeOAuth=(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
const api=cfg&&cfg.enabled&&w.supabase?.createClient?
 w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
   auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,
     detectSessionInUrl:true,flowType:nativeOAuth?'pkce':'implicit'}
 }):null;
let user=null,allowed=[],shared=[],mappings=new Map(),mode='demo',modeTouched=false;
let selectedKey=null,linkEditing=false,loading=false,pending=false,channel=null,lastLoad=0,visibleRowCount=40;
let toastHandle=null;
function readState(){
 try{const x=JSON.parse(w.sessionStorage.getItem(NAV_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(_){return {}}
}
function writeState(data){try{w.sessionStorage.setItem(NAV_KEY,JSON.stringify(data))}catch(_){}}
function stateFor(source){const s=readState();const v=s[source];return v&&typeof v==='object'?v:{next:'',opened:[]}}
function keyFor(p,source){return source+':'+p.id}
function visible(){return mode==='shared'?shared:DEMO}
function access(){return Boolean(api&&user&&allowed.some(x=>x==='zsolt'||x==='monika'))}
function chosenProfile(){try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}}
function who(){const p=chosenProfile();return allowed.includes(p)?p:allowed.includes('zsolt')?'zsolt':'monika'}
function node(tag,cls,value){const el=d.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el}
function qty(p){return new Intl.NumberFormat('hu-HU',{maximumFractionDigits:2}).format(Number(p.quantity)||1)+' '+(p.unit||'db')}
function productIcon(p){
 if(p.icon)return p.icon;
 const s=String(p.name).toLocaleLowerCase('hu-HU');
 if(/kávé/.test(s))return '☕';
 if(/tej|joghurt|sajt/.test(s))return '🥛';
 if(/banán/.test(s))return '🍌';
 if(/kenyér|kifli|zsemle/.test(s))return '🍞';
 if(/tojás/.test(s))return '🥚';
 if(/rizs/.test(s))return '🍚';
 if(/tészta|penne/.test(s))return '🍝';
 if(/paradicsom/.test(s))return '🍅';
 if(/víz/.test(s))return '💧';
 return '🛒';
}
function safeImage(text){try{const u=new URL(String(text||''));return u.protocol==='https:'?u.href:''}catch(_){return ''}}
function exactTescoUrl(text){
 try{
  const u=new URL(String(text||'').trim());
  if(u.protocol!=='https:'||u.hostname!=='bevasarlas.tesco.hu'||u.port||u.username||u.password)return '';
  const m=u.pathname.match(/^\/(?:shop|groceries)\/hu-HU\/products\/(\d+)\/?$/i);
  if(!m)return '';
  return 'https://bevasarlas.tesco.hu/shop/hu-HU/products/'+m[1];
 }catch(_){return ''}
}
function urlFor(p){
 const mapping=mappings.get(keyFor(p,mode));
 const saved=exactTescoUrl(mapping?.tesco_url);
 return saved||SEARCH_BASE+encodeURIComponent(String(p.name||'').trim());
}
function toast(text){
 const el=$('toast');if(!el)return;el.textContent=text;el.hidden=false;
 if(toastHandle)clearTimeout(toastHandle);
 toastHandle=setTimeout(()=>el.hidden=true,3200);
}
function selection(){
 const all=visible(),s=stateFor(mode);
 let i=all.findIndex(p=>keyFor(p,mode)===(selectedKey||s.next));
 if(i<0)i=0;
 return {all,index:i,item:all[i]||null,s};
}
function setMode(next){
 mode=next==='shared'?'shared':'demo';modeTouched=true;selectedKey=null;linkEditing=false;visibleRowCount=40;
 const s=readState();s.mode=mode;writeState(s);render();
}
function chooseItem(i){
 const list=visible(),item=list[i];if(!item)return;
 selectedKey=keyFor(item,mode);linkEditing=false;render();
}
function moveBy(delta){
 const a=selection();if(!a.all.length)return;
 chooseItem((a.index+delta+a.all.length)%a.all.length);
}
function recordOpen(){
 const a=selection();if(!a.item)return;
 const s=readState(),v=stateFor(mode),key=keyFor(a.item,mode);
 const opened=Array.isArray(v.opened)?v.opened.slice(-40):[];
 if(!opened.includes(key))opened.push(key);
 v.opened=opened;
 v.next=keyFor(a.all[(a.index+1)%a.all.length],mode);
 v.last=key;s[mode]=v;s.mode=mode;
 writeState(s);
 selectedKey=null;
}
function drawRows(info){
 const box=$('rows');box.replaceChildren();
 if(!info.all.length){box.append(node('div','empty','A közös Smart Listben most nincs megvásárolandó termék. Válaszd a 10 mintatermék módot.'));return}
 const maxRows=Math.min(info.all.length,Math.max(visibleRowCount,info.index+1));
 for(let i=0;i<maxRows;i++){
  const p=info.all[i],key=keyFor(p,mode),mapping=mappings.get(key);
  const button=node('button','item-row'+(i===info.index?' selected':''));button.type='button';
  button.setAttribute('aria-current',String(i===info.index));
  button.setAttribute('aria-label','Termék kiválasztása: '+p.name);
  button.onclick=()=>chooseItem(i);
  const face=node('span','face',productIcon(p));
  const left=node('span','item-copy');
  left.append(node('strong',null,p.name),node('small',null,qty(p)));
  const tag=node('span','item-badge',exactTescoUrl(mapping?.tesco_url)?'🔗':'⌕');
  tag.title=exactTescoUrl(mapping?.tesco_url)?'Mentett Tesco-terméklink':'Tesco keresés szükséges';
  button.append(face,left,tag);box.append(button);
 }
 if(maxRows<info.all.length){
  const more=node('button','item-row more-rows','＋ További '+Math.min(40,info.all.length-maxRows)+' termék mutatása · '+maxRows+'/'+info.all.length);
  more.type='button';more.onclick=()=>{visibleRowCount=maxRows+40;render()};
  box.append(more);
 }
}
function render(){
 const a=selection(),p=a.item;
 $('demoMode').setAttribute('aria-pressed',String(mode==='demo'));
 $('sharedMode').setAttribute('aria-pressed',String(mode==='shared'));
 $('sharedTotal').textContent=shared.length+' aktív termék';
 $('itemCount').textContent=p?(a.index+1)+' / '+a.all.length:'0 / 0';
 $('selectedIcon').textContent=p?productIcon(p):'🛒';
 $('selectedName').textContent=p?p.name:'Nincs termék';
 $('selectedQuantity').textContent=p?qty(p):'Válts a mintatermékekre';
 const mapping=p?mappings.get(keyFor(p,mode)):null;
 const hasLink=!!exactTescoUrl(mapping?.tesco_url);
 $('linkInfo').textContent=p?(hasLink?'✓ Mentett Tesco terméklink':'⌕ Első alkalom: Tesco keresés'):'';
 const open=$('openTesco');
 open.href=p?urlFor(p):'#';
 open.textContent=hasLink?'🎯 Tesco-termék megnyitása ↗':'🔎 Keresés a Tescóban ↗';
 open.setAttribute('aria-disabled',String(!p));
 $('prevItem').disabled=!p||a.all.length<2;
 $('nextItem').disabled=!p||a.all.length<2;
 $('editLink').disabled=!p;
 $('editing').hidden=!linkEditing||!p;
 $('linkInput').value=hasLink?exactTescoUrl(mapping?.tesco_url):'';
 $('modeHelp').textContent=mode==='demo'
  ?'✨ 10 mintatermék · csak próba, a Smart Listhez nem nyúlunk.'
  :shared.length?'☁️ A közös Smart List mind a '+a.all.length+' még meg nem vásárolt terméke.':'A lista üres vagy még töltődik.';
 $('authMessage').hidden=access();
 $('authLabel').textContent=access()?'':user?'A családi profil nem jogosult a linkmentésre.':'Keresni bejelentkezés nélkül is lehet. A közös linkmentéshez jelentkezz be.';
 drawRows(a);
}
async function fetchEvery(table,columns,activeOnly){
 const pageSize=250,rows=[];
 for(let offset=0;offset<10000;offset+=pageSize){
  let query=api.from(table).select(columns).eq('household',FAMILY);
  if(activeOnly)query=query.eq('done',false);
  const res=await query.order('created_at',{ascending:false}).range(offset,offset+pageSize-1);
  if(res.error)throw res.error;
  const chunk=res.data||[];
  rows.push(...chunk);
  if(chunk.length<pageSize)return rows;
 }
 throw Error('A lista meghaladja a 10 000 tételt. Adatbiztonsági korlát miatt nem mutatunk hiányos listát.');
}
async function loadCloud(){
 if(!access())return;
 if(loading){pending=true;return}loading=true;
 try{
  const [listRows,mapRows]=await Promise.all([
   fetchEvery(TABLE,'id,name,quantity,unit,image_url,category,created_at',true),
   fetchEvery(MAPPING,'id,item_key,tesco_url,source,name_snapshot',false)
  ]);
  shared=listRows;
  mappings=new Map(mapRows.map(item=>[item.item_key,item]));
  if(!modeTouched&&!readState().mode&&shared.length){mode='shared';selectedKey=null}
  lastLoad=Date.now();render();
 }catch(e){toast('Felhőhiba: '+String(e.message||e).slice(0,95))}
 finally{loading=false;if(pending){pending=false;void loadCloud()}}
}
async function saveLink(){
 const a=selection(),p=a.item;
 if(!p)return;
 if(!access()){toast('A linkmentéshez bejelentkezés szükséges.');return}
 const raw=$('linkInput').value.trim();
 const checked=raw?exactTescoUrl(raw):'';
 if(raw&&!checked){toast('Csak a Tesco hivatalos termékoldala menthető.');return}
 const key=keyFor(p,mode),prior=mappings.get(key);
 $('saveLink').disabled=true;
 try{
  let query;
  if(prior){
   query=api.from(MAPPING).update({tesco_url:checked,updated_by_profile:who(),updated_at:new Date().toISOString()})
      .eq('id',prior.id).eq('household',FAMILY).select('id,item_key,tesco_url,source,name_snapshot').single();
  }else{
   query=api.from(MAPPING).insert({
    household:FAMILY,item_key:key,source:mode,name_snapshot:String(p.name).slice(0,100),
    tesco_url:checked,updated_by_profile:who(),created_by:user.id
   }).select('id,item_key,tesco_url,source,name_snapshot').single();
  }
  const r=await query;
  if(r.error)throw r.error;
  mappings.set(key,r.data);
  linkEditing=false;render();
  toast(checked?'🔗 Tesco-terméklink közösen elmentve.':'Tesco-terméklink törölve.');
 }catch(e){
  if(String(e.code||'')==='23505'){void loadCloud();toast('A másik készülék előbb mentett. Frissítettem, próbáld újra.')}
  else toast('Mentési hiba: '+String(e.message||e).slice(0,85));
 }finally{$('saveLink').disabled=false}
}
function subscribe(){
 if(channel||!access())return;
 channel=api.channel('sho-tesco-bridge-v2-'+user.id)
 .on('postgres_changes',{event:'*',schema:'public',table:TABLE},()=>void loadCloud())
 .on('postgres_changes',{event:'*',schema:'public',table:MAPPING},()=>void loadCloud())
 .subscribe();
}
async function authSync(){
 if(!api){render();toast('A Tesco keresés működik; a felhő jelenleg nem elérhető.');return}
 try{
  const r=await api.auth.getUser();user=r.error?null:r.data?.user||null;
  allowed=[];
  if(user){const acl=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
   if(!acl.error)allowed=(acl.data||[]).map(x=>x.profile_key)}
  if(access()){
   await loadCloud();subscribe();
  }else{
   if(channel){api.removeChannel(channel);channel=null}
   shared=[];mappings.clear();render();
  }
 }catch(e){render();toast('Kapcsolati hiba: '+String(e.message||e).slice(0,70))}
}
$('demoMode').onclick=()=>setMode('demo');
$('sharedMode').onclick=()=>setMode('shared');
$('prevItem').onclick=()=>moveBy(-1);
$('nextItem').onclick=()=>moveBy(1);
$('openTesco').addEventListener('click',e=>{
 if(!selection().item){e.preventDefault();return}
 recordOpen(); // No await or popup. Same-tab navigation remains a direct user action.
});
$('editLink').onclick=()=>{linkEditing=!linkEditing;render();if(linkEditing)$('linkInput').focus()};
$('editing').addEventListener('submit',e=>{e.preventDefault();void saveLink()});
$('linkCancel').onclick=()=>{linkEditing=false;render()};
$('restart').onclick=()=>{
 const s=readState();s[mode]={next:'',opened:[]};writeState(s);
 selectedKey=null;linkEditing=false;render();toast('↻ Az útvonal újra az első terméktől indul.');
};
$('signIn').onclick=async()=>{
 if(!api)return toast('Felhőkapcsolat nem elérhető.');
 try{
  if(nativeOAuth){
   const handled=await w.HH_ONE_NATIVE_AUTH_V1063?.start?.(api);
   if(!handled)throw Error('Natív bejelentkezés nem elérhető.');return;
  }
  const r=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
  if(r.error)throw r.error;
 }catch(e){toast('Bejelentkezési hiba: '+String(e.message||e).slice(0,80))}
};
$('askLena').addEventListener('click',e=>{
 const project=w.HH_CHATGPT_PROJECT_SHORTCUT_V712;
 if(typeof project?.openProject==='function'){e.preventDefault();project.openProject()}
});
w.addEventListener('pageshow',()=>{selectedKey=null;render();if(access()&&Date.now()-lastLoad>5000)void loadCloud()});
d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'&&access()&&Date.now()-lastLoad>5000)void loadCloud()});
w.addEventListener('storage',e=>{if(e.key==='hh-guardian-family-auth-v785')void authSync()});
if(api)api.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN'||e==='SIGNED_OUT')setTimeout(()=>void authSync(),0)});
const priorMode=readState().mode;if(priorMode==='demo'||priorMode==='shared'){mode=priorMode;modeTouched=true}
render();void authSync();
})(window,document);