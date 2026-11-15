/* SHO Tesco Smart Cart Bridge v1 · 10-row pilot.
 * Read-only access to the family Smart List; independent, RLS-protected pilot state.
 * Tesco cart contents cannot be read or written; confirmation is manual.
 */
(function(w,d){'use strict';
const $=id=>d.getElementById(id);
const FAMILY='zsolt-monika';
const LIST_TABLE='hh_shopping_list_v1';
const BRIDGE_TABLE='hh_shopping_tesco_bridge_v1';
const TESCO_SEARCH='https://bevasarlas.tesco.hu/shop/hu-HU/search?query=';
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
if(DEMO.length!==10)throw Error('A Tesco pilot pontosan 10 mintaelemet vár.');
const cfg=w.HH_CENTRAL_VAULT;
const nativeOAuth=(()=>{try{return w.sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
const api=cfg&&cfg.enabled&&w.supabase?.createClient
 ?w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
   auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,
     detectSessionInUrl:true,flowType:nativeOAuth?'pkce':'implicit'}
  }):null;
let user=null,allowed=[],shared=[],bridge=new Map(),source='demo',channel=null;
let loading=false,queued=false,lastUpdated=0,toastTimer=null;
const pending=new Set();
function profile(){
 try{return w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return 'zsolt'}
}
function who(){const chosen=profile();return allowed.includes(chosen)?chosen:allowed.includes('zsolt')?'zsolt':'monika'}
function accessible(){return Boolean(api&&user&&allowed.some(x=>x==='zsolt'||x==='monika'))}
function element(tag,cls,content){
 const el=d.createElement(tag);
 if(cls)el.className=cls;
 if(content!==undefined)el.textContent=content;
 return el;
}
function message(content){
 const el=$('toast');el.textContent=content;el.hidden=false;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.hidden=true,3400);
}
function searchUrl(name){return TESCO_SEARCH+encodeURIComponent(String(name||'').trim())}
function tescoProductUrl(raw){
 try{
  const url=new URL(String(raw||'').trim());
  if(url.protocol!=='https:'||url.hostname!=='bevasarlas.tesco.hu'||url.username||url.password||url.port)return '';
  if(!/^\/(?:shop|groceries)\/hu-HU\/products\/\d+\/?$/.test(url.pathname))return '';
  return 'https://bevasarlas.tesco.hu'+url.pathname;
 }catch(_){return ''}
}
function itemKey(p){return source==='shared'?'shared:'+p.id:'demo:'+p.id}
function visible(){return source==='shared'?shared.slice(0,10):DEMO}
function unitText(p){
 const amount=Number(p.quantity)||1;
 return new Intl.NumberFormat('hu-HU',{maximumFractionDigits:2}).format(amount)+' '+String(p.unit||'db');
}
function iconFor(p){
 if(p.icon)return p.icon;
 const word=String(p.name||'').toLocaleLowerCase('hu-HU');
 if(/tej|joghurt|kefir|sajt/.test(word))return '🥛';
 if(/kávé|coffee/.test(word))return '☕';
 if(/kenyér|kifli|zsemle|vekni/.test(word))return '🍞';
 if(/banán/.test(word))return '🍌';
 if(/tojás/.test(word))return '🥚';
 if(/rizs/.test(word))return '🍚';
 if(/tészta|penne|spagetti/.test(word))return '🍝';
 if(/víz|üdítő/.test(word))return '💧';
 if(/paradicsom|paprika/.test(word))return '🍅';
 return '🛒';
}
function imageUrl(raw){
 try{const u=new URL(String(raw||''));return u.protocol==='https:'?u.href:''}catch(_){return ''}
}
function setMode(next){
 source=next==='shared'?'shared':'demo';
 $('modeShared').setAttribute('aria-pressed',String(source==='shared'));
 $('modeDemo').setAttribute('aria-pressed',String(source==='demo'));
 render();
}
function rowFor(p){
 const key=itemKey(p),saved=bridge.get(key)||null;
 const done=Boolean(saved?.manually_in_basket);
 const matched=tescoProductUrl(saved?.tesco_url||'');
 const row=element('article','item');
 const upper=element('div','item-head');
 const imgBox=element('span','thumb',iconFor(p));
 const url=imageUrl(p.image_url);
 if(url){
  const img=element('img');img.src=url;img.loading='lazy';img.alt=p.name;
  img.onerror=()=>{imgBox.replaceChildren(d.createTextNode(iconFor(p)))};
  imgBox.replaceChildren(img);
 }
 const info=element('div','item-main');
 info.append(element('div','item-name',p.name));
 info.append(element('div','item-sub',unitText(p)+(source==='demo'?' · Mintatermék':' · Smart List')));
 const status=element('span','item-status'+(done?' checked':''),done?'✓ Jelölve':'Nincs jelölve');
 upper.append(imgBox,info,status);
 const actions=element('div','item-actions');
 const external=element('a','goto',matched?'🎯 Tesco termék ↗':'🔎 Tesco keresés ↗');
 external.href=matched||searchUrl(p.name);
 external.rel='noopener noreferrer external';
 external.title=matched?'Saját mentett Tesco-terméklink':'Hivatalos Tesco termékkeresés';
 external.setAttribute('aria-label',p.name+' megnyitása a Tesco oldalán');
 const mark=element('button','mark'+(done?' checked':''),done?'↶ Vissza':'✓ Kosárba tettem');
 mark.type='button';mark.disabled=!accessible()||pending.has(key);
 mark.setAttribute('aria-label',done?'Visszavonom a saját kosárjelölésemet: '+p.name:'Kézzel jelölöm, hogy Tesco kosárba tettem: '+p.name);
 mark.onclick=()=>void saveItem(p,{manually_in_basket:!done,confirmation_by_profile:done?null:who()});
 const linkButton=element('button','link-action','🔗');
 linkButton.type='button';linkButton.title='Tesco-terméklink mentése';
 linkButton.setAttribute('aria-label','Tesco-terméklink beállítása: '+p.name);
 const linkPanel=element('form','match');linkPanel.hidden=true;
 linkPanel.setAttribute('aria-label','Tesco-terméklink megadása: '+p.name);
 const label=element('label',null,'Ellenőrzött Tesco-termékoldal linkje');
 const input=element('input');input.type='url';input.inputMode='url';
 input.placeholder='https://bevasarlas.tesco.hu/shop/hu-HU/products/...';
 input.value=matched;input.autocomplete='off';input.spellcheck=false;input.maxLength=300;
 label.append(input);
 const saveButton=element('button',null,'Mentés');saveButton.type='submit';
 const inputRow=element('div','match-row');inputRow.append(input,saveButton);
 label.removeChild(input);
 linkPanel.append(label,inputRow,element('small',null,'Másold ide a Tesco megnyitott termékoldalának címét. Ezután közvetlenül ugyanarra a termékre jutsz.'));
 linkPanel.addEventListener('submit',e=>{
  e.preventDefault();
  const value=input.value.trim(),valid=value?tescoProductUrl(value):'';
  if(value&&!valid){message('Csak hivatalos Tesco-termékoldal linkje menthető.');return}
  void saveItem(p,{tesco_url:valid});
 });
 linkButton.onclick=()=>{linkPanel.hidden=!linkPanel.hidden;if(!linkPanel.hidden)input.focus()};
 actions.append(external,mark,linkButton);row.append(upper,actions,linkPanel);
 return row;
}
function render(){
 const list=visible(),done=list.filter(p=>bridge.get(itemKey(p))?.manually_in_basket).length;
 const total=list.length,pct=total?Math.round(done*100/total):0;
 $('progressCount').textContent=done+' / '+total+' kézzel jelölve';
 $('progressBar').style.width=pct+'%';
 $('progressTitle').textContent=source==='demo'?'Tesco pilot · 10 mintatermék':'Tesco pilot · közös Smart List';
 $('sharedCount').textContent=shared.length+' megvásárolandó termék';
 $('modeShared').setAttribute('aria-pressed',String(source==='shared'));
 $('modeDemo').setAttribute('aria-pressed',String(source==='demo'));
 $('resetProgress').disabled=!accessible()||!done;
 $('sourceMessage').textContent=source==='demo'
  ?'✨ Tesztmód: 10 mintatermék. A közös bevásárlólistához nem nyúlunk; a pilot jelölései a felhőbe mentődnek.'
  :shared.length?('☁️ A közös Smart List első '+list.length+' még meg nem vett terméke. Ha új tétel kerül a listába, itt is frissül.')
               :'A közös Smart Listben nincs megvásárolandó tétel. A 10 mintatermékkel tesztelhetsz.';
 const box=$('pilotItems');box.replaceChildren();
 if(!list.length){box.append(element('div','empty','Jelenleg nincs megvásárolandó termék. Válaszd a 10 mintatermék módot.'));return}
 for(const item of list)box.append(rowFor(item));
}
async function loadCloud(){
 if(!accessible())return;
 if(loading){queued=true;return}
 loading=true;
 try{
  const [list,progress]=await Promise.all([
   api.from(LIST_TABLE).select('id,name,quantity,unit,category,image_url,barcode,created_at').eq('household',FAMILY).eq('done',false).order('created_at',{ascending:false}).limit(10),
   api.from(BRIDGE_TABLE).select('id,item_key,source,name_snapshot,tesco_url,manually_in_basket,confirmation_by_profile,updated_at').eq('household',FAMILY).limit(500)
  ]);
  if(list.error)throw list.error;
  if(progress.error)throw progress.error;
  shared=list.data||[];
  bridge=new Map((progress.data||[]).map(x=>[x.item_key,x]));
  lastUpdated=Date.now();
  render();
 }catch(e){message('Felhőhiba: '+String(e.message||e).slice(0,100))}
 finally{loading=false;if(queued){queued=false;void loadCloud()}}
}
async function saveItem(p,changes){
 if(!accessible()){message('Felhőmentéshez be kell jelentkezned.');return}
 const key=itemKey(p);
 if(pending.has(key))return;
 pending.add(key);
 try{
  const existing=bridge.get(key);
  let query;
  if(existing){
   query=api.from(BRIDGE_TABLE).update({...changes,updated_by_profile:who(),updated_at:new Date().toISOString()})
    .eq('id',existing.id).eq('household',FAMILY).select('id,item_key,source,name_snapshot,tesco_url,manually_in_basket,confirmation_by_profile,updated_at').single();
  }else{
   query=api.from(BRIDGE_TABLE).insert({
    household:FAMILY,item_key:key,source,name_snapshot:String(p.name).slice(0,100),
    updated_by_profile:who(),created_by:user.id,...changes
   }).select('id,item_key,source,name_snapshot,tesco_url,manually_in_basket,confirmation_by_profile,updated_at').single();
  }
  const result=await query;
  if(result.error)throw result.error;
  bridge.set(key,result.data);
  render();
  message('tesco_url' in changes?'🔗 Tesco-terméklink elmentve.':changes.manually_in_basket?'✓ Kézi kosárjelölés szinkronizálva.':'↶ Jelölés visszavonva.');
 }catch(e){
  if(String(e.code||'')==='23505'){await loadCloud();message('A másik készülék már létrehozta a tételt. Próbáld újra.')}
  else message('Mentési hiba: '+String(e.message||e).slice(0,100));
 }finally{pending.delete(key)}
}
async function resetVisible(){
 if(!accessible())return message('Bejelentkezés szükséges.');
 const keys=visible().map(itemKey);
 if(!keys.length)return;
 $('resetProgress').disabled=true;
 try{
  const res=await api.from(BRIDGE_TABLE)
   .update({manually_in_basket:false,confirmation_by_profile:null,updated_by_profile:who(),updated_at:new Date().toISOString()})
   .eq('household',FAMILY).in('item_key',keys).select('id');
  if(res.error)throw res.error;
  await loadCloud();
  message('↻ A kézi jelölések törölve. A mentett terméklinkek megmaradtak.');
 }catch(e){message('Nullázás sikertelen: '+String(e.message||e).slice(0,85));render()}
}
function subscribe(){
 if(!accessible()||channel)return;
 channel=api.channel('sho-tesco-bridge-'+user.id)
  .on('postgres_changes',{event:'*',schema:'public',table:LIST_TABLE},()=>void loadCloud())
  .on('postgres_changes',{event:'*',schema:'public',table:BRIDGE_TABLE},()=>void loadCloud())
  .subscribe();
}
async function authSync(){
 if(!api){
  $('authMessage').hidden=false;$('authText').textContent='Felhőkapcsolat nem érhető el. A Tesco-keresések ettől még működnek.';
  render();return;
 }
 try{
  const result=await api.auth.getUser();
  user=result.error?null:result.data?.user||null;
  allowed=[];
  if(user){
   const acl=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
   if(!acl.error)allowed=(acl.data||[]).map(x=>x.profile_key);
  }
  $('authMessage').hidden=accessible();
  $('authText').textContent=user?'Ehhez a családi listához nincs jogosultságod.':'Jelentkezz be, hogy a közös lista és a felhős próba működjön.';
  if(accessible()){
   if(!allowed.includes(profile())){
    try{w.localStorage.setItem('hh-profile',allowed.includes('zsolt')?'z':'m')}catch(_){}
   }
   await loadCloud();
   subscribe();
  }else{
   if(channel){api.removeChannel(channel);channel=null}
   shared=[];bridge.clear();render();
  }
 }catch(e){$('authMessage').hidden=false;$('authText').textContent='Bejelentkezési hiba: '+String(e.message||e).slice(0,90);render()}
}
$('modeShared').onclick=()=>setMode('shared');
$('modeDemo').onclick=()=>setMode('demo');
$('resetProgress').onclick=()=>void resetVisible();
$('signIn').onclick=async()=>{
 if(!api)return message('A felhőkapcsolat nem érhető el.');
 try{
  if(nativeOAuth){
   const handled=await w.HH_ONE_NATIVE_AUTH_V1063?.start?.(api);
   if(!handled)throw Error('Natív bejelentkezés nem elérhető.');
   return;
  }
  const {error}=await api.auth.signInWithOAuth({
   provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}
  });
  if(error)throw error;
 }catch(e){message('Bejelentkezési hiba: '+String(e.message||e).slice(0,100))}
};
$('navAsk').addEventListener('click',e=>{
 const link=w.HH_CHATGPT_PROJECT_SHORTCUT_V712;
 if(typeof link?.openProject==='function'){e.preventDefault();link.openProject()}
});
d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'&&accessible()&&Date.now()-lastUpdated>6000)void loadCloud()});
w.addEventListener('focus',()=>{if(accessible()&&Date.now()-lastUpdated>6000)void loadCloud()});
w.addEventListener('storage',e=>{if(e.key==='hh-guardian-family-auth-v785')void authSync()});
if(api)api.auth.onAuthStateChange(event=>{
 if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>void authSync(),0);
});
render();
void authSync();
})(window,document);