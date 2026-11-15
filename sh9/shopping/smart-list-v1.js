/* SHO Smart List Golden v1 · private cloud list, family RLS + Realtime.
 * Only selected profile label is displayed; account identity remains auth.uid().
 * Existing local Smart Basket is never overwritten or migrated silently.
 */
(function(w,d){'use strict';
const $=id=>d.getElementById(id), cfg=w.HH_CENTRAL_VAULT;
const nativeOAuth=(()=>{try{return sessionStorage.getItem('hh-one-native-oauth-v1063')==='1'}catch(_){return false}})();
const api=cfg&&cfg.enabled&&w.supabase?.createClient?
 w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
  auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,
   detectSessionInUrl:true,flowType:nativeOAuth?'pkce':'implicit'}
 }):null;
const TABLE='hh_shopping_list_v1';
const groups=[
 ['🥛','Élelmiszer','tej|félzsíros tej|teljes tej|laktózmentes tej|zabital|mandulaital|rizsital|kefir|natúr joghurt|görög joghurt|gyümölcsjoghurt|tejföl|tejszín|főzőtejszín|habtejszín|vaj|margarin|túró|cottage cheese|mozzarella|trappista sajt|gouda sajt|cheddar sajt|feta sajt|parmezán|camembert|krémsajt|önthető sajt|tojás|bio tojás|toast kenyér|fehér kenyér|teljes kiőrlésű kenyér|rozskenyér|bagett|ciabatta|zsömle|kifli|kalács|croissant|tortilla|pita|hamburgerzsemle|hotdog kifli|abonett|extrudált kenyér|zsemlemorzsa|liszt|rétesliszt|teljes kiőrlésű liszt|zabpehely|búzadara|rizs|basmati rizs|jázminrizs|barna rizs|kuszkusz|bulgur|quinoa|penne tészta|spagetti|fusilli|farfalle|makaróni|lasagne tészta|cérnametélt|tarhonya|burgonya|édesburgonya|vöröshagyma|lilahagyma|fokhagyma|póréhagyma|sárgarépa|fehérrépa|zeller|karalábé|paradicsom|koktélparadicsom|paprika|kaliforniai paprika|uborka|kovászos uborka|csemegeuborka|fejes saláta|jégsaláta|római saláta|rukkola|spenót|brokkoli|karfiol|cukkini|padlizsán|gomba|lilahagyma|káposzta|vöröskáposzta|kelkáposzta|zöldborsó|zöldbab|kukorica|sütőtök|retek|cékla|avokádó|citrom|lime|narancs|mandarin|grapefruit|alma|körte|banán|szőlő|eper|málna|áfonya|szeder|őszibarack|nektarin|sárgabarack|szilva|kiwi|ananász|mangó|gránátalma|dinnye|sárgadinnye|datolya|mazsola|dió|mandula|mogyoró|kesudió|pisztácia|napraforgómag|tökmag|chia mag|lenmag|csirkemell|csirkecomb|pulykamell|sertéskaraj|sertéscomb|darált hús|marhahús|bélszín|virsli|sonka|csirkemellsonka|szalámi|kolbász|bacon|májas|füstölt lazac|lazacfilé|tonhalkonzerv|szardínia|makréla|halrudacska|garnélarák|tenger gyümölcsei|fagyasztott zöldség|mirelit brokkoli|mirelit borsó|fagyasztott hasábburgonya|pizza|passzírozott paradicsom|paradicsompüré|pizzaszósz|pesto|mustár|ketchup|majonéz|torma|ecet|balzsamecet|olívaolaj|napraforgóolaj|kókuszolaj|só|tengeri só|bors|pirospaprika|oregánó|bazsalikom|majoránna|kakukkfű|rozmaring|fahéj|kömény|kurkuma|curry|cukor|barna cukor|porcukor|méz|juharszirup|édesítőszer|sütőpor|élesztő|vaníliás cukor|kakaópor|étcsokoládé|tejcsokoládé|keksz|nápolyi|müzliszelet|chips|ropi|pattogatott kukorica|mogyoróvaj|lekvár|nutella|müzli|granola|corn flakes|zabkása|instant leves|húsleveskocka|konzervbab|csicseriborsó|lencse|vörösbab|fehérbab|zöldborsó konzerv|sűrített tej'],
 ['☕','Italok','ásványvíz|szénsavmentes víz|szénsavas víz|tonik|szóda|kóla|cukormentes kóla|narancslé|almalé|multivitamin ital|őszibaracklé|citromlé|limonádé|jegestea|zöld tea|fekete tea|gyümölcstea|kamillatea|mentatea|filteres tea|instant kávé|szemes arabica kávé|szemes kávé|őrölt kávé|kávékapszula|koffeinmentes kávé|kapucsínó por|kakaóital|forró csokoládé|energiaital|izotóniás ital|gyömbérsör|málnaszörp|bodzaszörp|szörp|kókuszvíz|aloe vera ital|fehérjeturmix|protein ital'],
 ['🧹','Háztartás','mosogatószer|mosogatógép tabletta|mosogatógép só|öblítő mosogatógéphez|mosószer|mosókapszula|öblítő|folttisztító|fehérítő|vízkőoldó|fürdőszobai tisztítószer|konyhai zsíroldó|ablaktisztító|felmosószer|általános tisztítószer|WC tisztító|WC illatosító|fertőtlenítő|kéztörlő papír|papírtörlő|toalettpapír|papír zsebkendő|szalvéta|sütőpapír|alufólia|frissentartó fólia|szemeteszsák|szelektív szemeteszsák|fagyasztózacskó|uzsonnás tasak|szivacs|dörzsszivacs|törlőkendő|mikroszálas kendő|gumikesztyű|seprű|felmosófej|mosogatókefe|elemek|ceruzaelem|gombelem|izzó|LED izzó|ragasztószalag|pillanatragasztó|gyertya|gyufa|öngyújtó|ételtároló doboz|mosogatórongy|szűrőzacskó|kávéfilter|fogpiszkáló|papírtányér|műanyag pohár'],
 ['🧴','Drogéria','sampon|balzsam|hajpakolás|tusfürdő|szappan|folyékony szappan|kézkrém|testápoló|arckrém|nappali krém|éjszakai krém|fényvédő|naptej|ajakápoló|dezodor|izzadásgátló|parfüm|fogkrém|fogkefe|elektromos fogkefefej|fogselyem|szájvíz|borotva|borotvahab|borotvagél|vattakorong|fültisztító pálcika|nedves törlőkendő|sminklemosó|micellás víz|pamutbetét|egészségügyi betét|tampon|hajfesték|hajlakk|hajzselé|hajolaj|hajgumi|körömlakklemosó|körömreszelő|kézfertőtlenítő|sebtapasz|steril géz|hidrogén-peroxid|sós orrspray|vitamin C|magnézium|multivitamin|napvédő stift|arcmaszk|szárazsampon|fogköztisztító kefe|papírvatta'],
 ['🐾','Kisállat','kutyatáp|száraz kutyatáp|nedves kutyaeledel|kutyajutalomfalat|kutyapelenka|kutyasampon|kutyafogkrém|kutyapiszok zacskó|kutya rágócsont|kutyajáték|kutyatál|kutyafekhely|macskaeledel|macskaalom|macskajutalomfalat|alomtálca|állatfésű|bolhanyakörv|kutyatörlőkendő']
];
const PRODUCTS=[...new Map(groups.flatMap(([icon,category,names])=>names.split('|').map(name=>[name.toLocaleLowerCase('hu-HU'),{name,category,icon}]))).entries()].map(([,v])=>v);
const cats=['Mind','Élelmiszer','Italok','Háztartás','Drogéria','Kisállat'];
const ICON=Object.fromEntries(groups.map(g=>[g[1],g[0]]));
const nrm=s=>String(s||'').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const validUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch(_){return''}};
const node=(tag,cls,txt)=>{let n=d.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
let user=null,allowed=[],items=[],selectedCategory='Mind',remote=[],activeQuery='',queryToken=0,queryTimer=0,fetchCtrl=null,live=null,refreshBusy=false,pendingReload=false,firstLoad=true,writing=false,voiceRec=null;
const who=()=>{try{return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return'zsolt'}};
const label=p=>p==='monika'?'Mónika':'Zsolt';
function toast(message){const e=$('toast');e.textContent=message;e.hidden=false;clearTimeout(toast.id);toast.id=setTimeout(()=>e.hidden=true,3600)}
function status(message,ok){$('syncText').textContent=message;$('syncState').classList.toggle('connected',!!ok)}
function haptic(){try{navigator.vibrate?.(9)}catch(_){/* unsupported */}}
function profileUi(){d.querySelectorAll('[data-profile]').forEach(x=>{x.setAttribute('aria-pressed',String(x.dataset.profile===who()));x.disabled=!!user&&!allowed.includes(x.dataset.profile)})}
function selectedIcon(category){return ICON[category]||'🛒'}
function suggestions(){
 const q=$('productSearch').value.trim(),out=$('suggestions');out.replaceChildren();
 if(!q){out.hidden=true;return}
 const target=nrm(q);let found=PRODUCTS.filter(p=>(selectedCategory==='Mind'||selectedCategory===p.category)&&nrm(p.name).includes(target));
 found.sort((a,b)=>Number(nrm(b.name).startsWith(target))-Number(nrm(a.name).startsWith(target))||a.name.localeCompare(b.name,'hu'));
 found=found.slice(0,7);
 const remoteResults=remote.filter(p=>nrm(p.name).includes(target)).slice(0,5);
 for(const p of remoteResults.concat(found)){
  const b=node('button','suggestion');b.type='button';
  const img=node('span','thumb');
  if(p.image&&validUrl(p.image)){const photo=node('img');photo.src=validUrl(p.image);photo.alt='Termékfotó';photo.loading='lazy';img.append(photo)}
  else img.textContent=p.icon||selectedIcon(p.category);
  const body=node('span','body');body.append(node('strong',null,p.name),node('small',null,p.image?'Valódi termékfotó · Open Food Facts':p.category+' · gyors hozzáadás'));
  b.append(img,body,node('b',null,'＋'));b.addEventListener('click',async()=>{await add(p);});
  out.append(b);
 }
 out.hidden=!out.children.length;
}
function parseEntry(raw){
 let s=String(raw||'').trim().replace(/^((egy|két|ketto|kettő|három|négy|öt|fél))\b/i,(m)=>({'egy':'1','két':'2','kettő':'2','ketto':'2','három':'3','négy':'4','öt':'5','fél':'0.5'}[nrm(m)]||m));
 const units={'liter':'l','litert':'l','kiló':'kg','kilót':'kg','kilogramm':'kg','gramm':'g','darab':'db','csomag':'csomag','doboz':'doboz','üveg':'üveg','flakon':'flakon','db':'db','kg':'kg','g':'g','l':'l','ml':'ml'};
 const match=s.match(/^(\d+(?:[.,]\d+)?)\s*(liter|litert|kiló|kilót|kilogramm|gramm|darab|csomag|doboz|üveg|flakon|db|kg|ml|g|l)\s+(.+)$/i);
 if(match)return{name:match[3].trim(),quantity:Number(match[1].replace(',','.')),unit:units[nrm(match[2])]||'db'};
 const numeric=s.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
 if(numeric)return{name:numeric[2].trim(),quantity:Number(numeric[1].replace(',','.')),unit:'db'};
 return{name:s,quantity:1,unit:'db'};
}
function inferCategory(name){
 const q=nrm(name),ref=PRODUCTS.find(x=>nrm(x.name)===q);return ref?.category||(selectedCategory!=='Mind'?selectedCategory:'Élelmiszer');
}
async function add(p){
 if(!user||!allowed.includes(who()))return toast('Előbb jelentkezz be a családi fiókba.');
 if(writing)return;
 const parsed=parseEntry(p.name);
 if(!parsed.name)return;
 if(!Number.isFinite(parsed.quantity)||parsed.quantity<=0||parsed.quantity>9999)return toast('Ellenőrizd a mennyiséget.');
 const category=p.category||inferCategory(parsed.name),image=validUrl(p.image||'');
 const found=items.find(x=>!x.done&&(p.code&&x.barcode===p.code||nrm(x.name)===nrm(parsed.name)&&x.unit===parsed.unit));
 writing=true;
 try{
  let error=null;
  if(found){const res=await api.from(TABLE).update({quantity:Math.min(9999,Number(found.quantity)+parsed.quantity),updated_by_profile:who()}).eq('id',found.id).select('id');error=res.error}
  else{const res=await api.from(TABLE).insert({name:parsed.name.slice(0,100),quantity:parsed.quantity,unit:parsed.unit,category,image_url:image,barcode:String(p.code||'').slice(0,20),updated_by_profile:who()}).select('id');error=res.error}
  if(error)throw error;
  $('productSearch').value='';remote=[];activeQuery='';queryToken++;if(fetchCtrl)fetchCtrl.abort();
  $('suggestions').hidden=true;haptic();toast('＋ '+parsed.name+' a közös listában');
  await reload(false);
 }catch(e){toast('Nem sikerült menteni a felhőbe: '+String(e.message||e).slice(0,90))}
 finally{writing=false}
}
function itemRow(p){
 const card=node('article','product'+(p.done?' done':''));card.addEventListener('click',e=>{if(!e.target.closest('button'))void setDone(p,!p.done)});
 const check=node('button','check',p.done?'✓':'');check.type='button';check.setAttribute('aria-label',p.done?'Visszateszem a listára: '+p.name:'Megvettem: '+p.name);
 check.onclick=()=>setDone(p,!p.done);
 const image=node('span','product-image');
 if(validUrl(p.image_url)){const img=node('img');img.src=validUrl(p.image_url);img.alt=p.name;img.loading='lazy';img.onerror=()=>{image.replaceChildren(d.createTextNode(selectedIcon(p.category)))};image.append(img)}
 else image.textContent=selectedIcon(p.category);
 const main=node('div','product-main');
 main.append(node('div','product-name',p.name),node('div','product-details',String(Number(p.quantity))+' '+p.unit+' · '+p.category));
 if(p.done&&p.done_by_profile)main.append(node('div','product-details done-note','✓ '+label(p.done_by_profile)+' kipipálta'));
 const controls=node('div','product-controls');
 const favorite=node('button','heart'+(p.favorite?' active':''),p.favorite?'♥':'♡');favorite.type='button';favorite.title='Kedvenc';favorite.setAttribute('aria-label','Kedvenc: '+p.name);favorite.onclick=()=>setFavorite(p,!p.favorite);
 const remove=node('button','remove','×');remove.type='button';remove.title='Törlés';remove.setAttribute('aria-label','Törlés: '+p.name);remove.onclick=()=>removeItem(p);
 controls.append(favorite,remove);card.append(check,image,main,controls);return card;
}
function render(){
 const active=items.filter(p=>!p.done),done=items.filter(p=>p.done);
 $('activeCount').textContent=active.length+' termék';
 const box=$('activeList'),purchased=$('purchasedList');box.replaceChildren();purchased.replaceChildren();
 if(!active.length){const empty=node('div','empty');empty.append(node('span','big','🛒'),node('span',null,user?'A lista kész. Jöhet a következő bevásárlás!':'Bejelentkezés után megjelenik a közös lista.'));box.append(empty)}
 else active.forEach(x=>box.append(itemRow(x)));
 done.forEach(x=>purchased.append(itemRow(x)));
 $('purchasedSummary').textContent='✓ Megvásárolva ('+done.length+')';
 $('purchasedWrap').hidden=!done.length;
 profileUi();
}
async function setDone(item,value){
 if(!user)return;
 const res=await api.from(TABLE).update({done:value,updated_by_profile:who()}).eq('id',item.id).eq('done',item.done).select('id');
 if(res.error)return toast('Szinkronhiba: '+res.error.message);
 if(!res.data?.length)return reload(true).then(()=>toast('A terméket közben más is módosította.'));
 haptic();toast(value?'✓ Megvásárolva: '+item.name:'↩ Újra a listán: '+item.name);await reload(false);
}
async function setFavorite(item,value){
 const res=await api.from(TABLE).update({favorite:value,updated_by_profile:who()}).eq('id',item.id);
 if(res.error)return toast('Kedvenc mentése sikertelen.');haptic();await reload(false);
}
async function removeItem(item){
 if(!w.confirm('Biztosan törlöd a közös listáról? '+item.name))return;
 const res=await api.from(TABLE).delete().eq('id',item.id);
 if(res.error)return toast('Nem sikerült törölni: '+res.error.message);
 haptic();toast('Törölve: '+item.name);await reload(false);
}
async function reload(fromRemote){
 if(!user)return;
 if(refreshBusy){pendingReload=true;return}
 refreshBusy=true;
 try{
  const result=await api.from(TABLE).select('id,name,quantity,unit,category,image_url,barcode,favorite,done,done_at,done_by_profile,updated_by_profile,created_at,updated_at').eq('household','zsolt-monika').order('created_at',{ascending:false}).limit(500);
  if(result.error)throw result.error;
  const next=result.data||[];
  if(fromRemote&&!firstLoad){
   const old=new Map(items.map(x=>[x.id,x]));
   const bought=next.find(x=>x.done&&!old.get(x.id)?.done&&old.has(x.id)&&x.done_by_profile!==who());
   if(bought)toast('🔔 '+label(bought.done_by_profile)+' kipipálta: '+bought.name);
  }
  items=next;firstLoad=false;status('Felhő szinkronizálva ✓',true);render();
 }catch(e){status('Kapcsolati hiba · nincs mentés',false);toast('A családi lista nem frissült: '+String(e.message||e).slice(0,100))}
 finally{refreshBusy=false;if(pendingReload){pendingReload=false;setTimeout(()=>void reload(true),75)}}
}
function subscribe(){
 if(!api||!user||live)return;
 live=api.channel('sho-smart-list-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:TABLE},()=>{void reload(true)}).subscribe();
}
async function authSync(){
 if(!api){status('A felhőkapcsolat nem érhető el',false);$('loginBox').hidden=false;return}
 const result=await api.auth.getUser();user=result.error?null:result.data?.user||null;
 allowed=[];if(user){
  const acl=await api.from('hh_profile_access').select('profile_key').eq('user_id',user.id);
  if(!acl.error)allowed=(acl.data||[]).map(x=>x.profile_key);
 }
 const access=!!user&&allowed.some(k=>k==='zsolt'||k==='monika');
 $('loginBox').hidden=access;
 if(access){
  if(!allowed.includes(who())){try{localStorage.setItem('hh-profile',allowed.includes('zsolt')?'z':'m')}catch(_){}}
  await reload(false);subscribe();
 }else{
  if(live){api.removeChannel(live);live=null}
  items=[];render();status(user?'Nincs jogosultság a családi listához':'Bejelentkezés szükséges',false);
 }
 profileUi();
}
let lastRefresh=0;
function foreground(){
 if(d.visibilityState!=='visible'||!user||Date.now()-lastRefresh<8000)return;
 lastRefresh=Date.now();void reload(true);
}
const searchDebounce=()=>{clearTimeout(queryTimer);queryTimer=setTimeout(fetchProductMatches,650)};
async function fetchProductMatches(){
 const query=$('productSearch').value.trim();
 if(query.length<3||query.length>70||!['Mind','Élelmiszer','Italok'].includes(selectedCategory)){remote=[];suggestions();return}
 const token=++queryToken;activeQuery=query;
 if(fetchCtrl)fetchCtrl.abort();fetchCtrl=new AbortController();const controller=fetchCtrl,timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const url=new URL(cfg.supabaseUrl+'/functions/v1/sho-shopping-products-v1');url.searchParams.set('q',query);
  const response=await fetch(url,{headers:{apikey:cfg.publishableKey,Accept:'application/json'},signal:controller.signal});
  if(!response.ok)throw Error('Katalógus nem elérhető');
  const json=await response.json();
  if(token!==queryToken||$('productSearch').value.trim()!==query)return;
  remote=(json.products||[]).filter(x=>x.name&&x.code).slice(0,10).map(x=>({name:x.name,category:'Élelmiszer',image:x.image,code:x.code,icon:'🥫'}));
  suggestions();
 }catch(e){if(token===queryToken){remote=[];suggestions()}}finally{clearTimeout(timeout)}
}
function buildCategories(){
 const box=$('categories');
 for(const cat of cats){
  const b=node('button','category-chip'+(cat===selectedCategory?' active':''),cat==='Mind'?'✨ Mind':(selectedIcon(cat)+' '+cat));b.type='button';
  b.onclick=()=>{selectedCategory=cat;box.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');remote=[];suggestions();searchDebounce()};
  box.append(b);
 }
}
async function addVoiceText(text){
 const fragments=String(text||'').split(/\s*,\s*|\s+és\s+|\s+meg\s+/i).map(x=>x.trim()).filter(Boolean).slice(0,12);
 if(!fragments.length)return;
 let ok=0;
 for(const name of fragments){
  await add({name,category:inferCategory(parseEntry(name).name)});
  ok++;
 }
 if(ok>1)toast('🎙️ '+ok+' termék feldolgozva a közös listára.');
}
function startVoice(){
 const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!Speech)return toast('A böngészőben nem elérhető a magyar hangfelismerés. Használd a billentyűzet mikrofonját.');
 if(voiceRec){voiceRec.stop();return}
 voiceRec=new Speech();voiceRec.lang='hu-HU';voiceRec.interimResults=false;voiceRec.maxAlternatives=1;
 $('voice').classList.add('voice-on');$('inputHelp').textContent='🎙️ Figyelek. Sorold fel a termékeket, például: tej, kenyér, két liter víz.';
 voiceRec.onresult=e=>{const text=e.results[0]?.[0]?.transcript||'';$('productSearch').value=text;void addVoiceText(text)};
 voiceRec.onerror=e=>toast('Hangbevitel nem sikerült: '+e.error);
 voiceRec.onend=()=>{$('voice').classList.remove('voice-on');voiceRec=null;$('inputHelp').textContent='🎙️ Mondhatod így is: „tej, kenyér, 2 liter ásványvíz”. A termékek külön sorokba kerülnek.'};
 try{voiceRec.start()}catch(_){voiceRec=null;toast('A mikrofon nem indult el.')}
}
buildCategories();render();profileUi();
$('productSearch').addEventListener('input',()=>{remote=[];queryToken++;suggestions();searchDebounce()});
$('productSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void add({name:e.target.value,category:inferCategory(parseEntry(e.target.value).name)})}});
$('addTyped').onclick=()=>add({name:$('productSearch').value,category:inferCategory(parseEntry($('productSearch').value).name)});
$('voice').onclick=startVoice;
$('navList').onclick=()=>w.scrollTo({top:0,behavior:'smooth'});
d.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{if(user&&!allowed.includes(b.dataset.profile))return;try{localStorage.setItem('hh-profile',b.dataset.profile==='monika'?'m':'z')}catch(_){}profileUi()});
$('signIn').onclick=async()=>{
 if(!api)return toast('A bejelentkezéshez nincs felhőkapcsolat.');
 try{
  if(nativeOAuth){const handled=await w.HH_ONE_NATIVE_AUTH_V1063?.start?.(api);if(!handled)throw Error('A natív bejelentkezés nem elérhető.');return}
  const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
  if(error)throw error;
 }catch(e){toast('Bejelentkezési hiba: '+e.message)}
};
w.addEventListener('storage',e=>{if(e.key==='hh-profile'){profileUi()}if(e.key==='hh-guardian-family-auth-v785')void authSync()});
d.addEventListener('visibilitychange',foreground);w.addEventListener('focus',foreground);
if(api)api.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'||event==='SIGNED_IN')setTimeout(authSync,0)});
void authSync();
})(window,document);