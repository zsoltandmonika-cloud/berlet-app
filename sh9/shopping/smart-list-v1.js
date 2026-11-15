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
const FAVORITES_TABLE='hh_shopping_favorites_v1';
const groups=[
 ['🥛','Élelmiszer','tej|félzsíros tej|teljes tej|laktózmentes tej|zabital|mandulaital|rizsital|kefir|natúr joghurt|görög joghurt|gyümölcsjoghurt|tejföl|tejszín|főzőtejszín|habtejszín|vaj|margarin|túró|cottage cheese|mozzarella|trappista sajt|gouda sajt|cheddar sajt|feta sajt|parmezán|camembert|krémsajt|önthető sajt|tojás|bio tojás|toast kenyér|fehér kenyér|teljes kiőrlésű kenyér|rozskenyér|bagett|ciabatta|zsömle|kifli|kalács|croissant|tortilla|pita|hamburgerzsemle|hotdog kifli|abonett|extrudált kenyér|zsemlemorzsa|liszt|rétesliszt|teljes kiőrlésű liszt|zabpehely|búzadara|rizs|basmati rizs|jázminrizs|barna rizs|kuszkusz|bulgur|quinoa|penne tészta|spagetti|fusilli|farfalle|makaróni|lasagne tészta|cérnametélt|tarhonya|burgonya|édesburgonya|vöröshagyma|lilahagyma|fokhagyma|póréhagyma|sárgarépa|fehérrépa|zeller|karalábé|paradicsom|koktélparadicsom|paprika|kaliforniai paprika|uborka|kovászos uborka|csemegeuborka|fejes saláta|jégsaláta|római saláta|rukkola|spenót|brokkoli|karfiol|cukkini|padlizsán|gomba|lilahagyma|káposzta|vöröskáposzta|kelkáposzta|zöldborsó|zöldbab|kukorica|sütőtök|retek|cékla|avokádó|citrom|lime|narancs|mandarin|grapefruit|alma|körte|banán|szőlő|eper|málna|áfonya|szeder|őszibarack|nektarin|sárgabarack|szilva|kiwi|ananász|mangó|gránátalma|dinnye|sárgadinnye|datolya|mazsola|dió|mandula|mogyoró|kesudió|pisztácia|napraforgómag|tökmag|chia mag|lenmag|csirkemell|csirkecomb|pulykamell|sertéskaraj|sertéscomb|darált hús|marhahús|bélszín|virsli|sonka|csirkemellsonka|szalámi|kolbász|bacon|májas|füstölt lazac|lazacfilé|tonhalkonzerv|szardínia|makréla|halrudacska|garnélarák|tenger gyümölcsei|fagyasztott zöldség|mirelit brokkoli|mirelit borsó|fagyasztott hasábburgonya|pizza|passzírozott paradicsom|paradicsompüré|pizzaszósz|pesto|mustár|ketchup|majonéz|torma|ecet|balzsamecet|olívaolaj|napraforgóolaj|kókuszolaj|só|tengeri só|bors|pirospaprika|oregánó|bazsalikom|majoránna|kakukkfű|rozmaring|fahéj|kömény|kurkuma|curry|cukor|barna cukor|porcukor|méz|juharszirup|édesítőszer|sütőpor|élesztő|vaníliás cukor|kakaópor|étcsokoládé|tejcsokoládé|keksz|nápolyi|müzliszelet|chips|ropi|pattogatott kukorica|mogyoróvaj|lekvár|nutella|müzli|granola|corn flakes|zabkása|instant leves|húsleveskocka|konzervbab|csicseriborsó|lencse|vörösbab|fehérbab|zöldborsó konzerv|sűrített tej'],
 ['☕','Italok','ásványvíz|szénsavmentes víz|szénsavas víz|tonik|szóda|kóla|cukormentes kóla|narancslé|almalé|multivitamin ital|őszibaracklé|citromlé|limonádé|jegestea|zöld tea|fekete tea|gyümölcstea|kamillatea|mentatea|filteres tea|instant kávé|szemes arabica kávé|szemes kávé|őrölt kávé|kávékapszula|koffeinmentes kávé|kapucsínó por|kakaóital|forró csokoládé|energiaital|izotóniás ital|gyömbérsör|málnaszörp|bodzaszörp|szörp|kókuszvíz|aloe vera ital|fehérjeturmix|protein ital'],
 ['🧹','Háztartás','mosogatószer|mosogatógép tabletta|mosogatógép só|öblítő mosogatógéphez|mosószer|mosókapszula|öblítő|folttisztító|fehérítő|vízkőoldó|fürdőszobai tisztítószer|konyhai zsíroldó|ablaktisztító|felmosószer|általános tisztítószer|WC tisztító|WC illatosító|fertőtlenítő|kéztörlő papír|papírtörlő|toalettpapír|papír zsebkendő|szalvéta|sütőpapír|alufólia|frissentartó fólia|szemeteszsák|szelektív szemeteszsák|fagyasztózacskó|uzsonnás tasak|szivacs|dörzsszivacs|törlőkendő|mikroszálas kendő|gumikesztyű|seprű|felmosófej|mosogatókefe|elemek|ceruzaelem|gombelem|izzó|LED izzó|ragasztószalag|pillanatragasztó|gyertya|gyufa|öngyújtó|ételtároló doboz|mosogatórongy|szűrőzacskó|kávéfilter|fogpiszkáló|papírtányér|műanyag pohár'],
 ['🧴','Drogéria','sampon|balzsam|hajpakolás|tusfürdő|szappan|folyékony szappan|kézkrém|testápoló|arckrém|nappali krém|éjszakai krém|fényvédő|naptej|ajakápoló|dezodor|izzadásgátló|parfüm|fogkrém|fogkefe|elektromos fogkefefej|fogselyem|szájvíz|borotva|borotvahab|borotvagél|vattakorong|fültisztító pálcika|nedves törlőkendő|sminklemosó|micellás víz|pamutbetét|egészségügyi betét|tampon|hajfesték|hajlakk|hajzselé|hajolaj|hajgumi|körömlakklemosó|körömreszelő|kézfertőtlenítő|sebtapasz|steril géz|hidrogén-peroxid|sós orrspray|vitamin C|magnézium|multivitamin|napvédő stift|arcmaszk|szárazsampon|fogköztisztító kefe|papírvatta'],
 ['🐾','Kisállat','kutyatáp|száraz kutyatáp|nedves kutyaeledel|kutyajutalomfalat|kutyapelenka|kutyasampon|kutyafogkrém|kutyapiszok zacskó|kutya rágócsont|kutyajáték|kutyatál|kutyafekhely|macskaeledel|macskaalom|macskajutalomfalat|alomtálca|állatfésű|bolhanyakörv|kutyatörlőkendő']
];
const SHOPPING_MAIN_CATEGORIES=[
 ['🍎','Élelmiszer','Élelmiszer'],
 ['🧴','Drogéria & Szépség','Drogéria'],
 ['🏠','Otthon & Háztartás','Otthon és háztartás'],
 ['👗','Divat & Stílus','Divat'],
 ['📱','Elektronika','Elektronika']
];
function mainCategory(category){
 const c=String(category||'');
 if(c==='Italok')return 'Élelmiszer';
 if(c==='Drogéria')return 'Drogéria & Szépség';
 if(c==='Háztartás'||c==='Kisállat')return 'Otthon & Háztartás';
 return c||'Élelmiszer';
}
const additionalGroups=[
 ["📱","Elektronika","mobiltelefon|okostelefon|telefon tok|mobil tok|kijelzővédő fólia|üvegfólia|telefontöltő|gyorstöltő|USB-C töltő|vezeték nélküli töltő|powerbank|USB-C kábel|USB kábel|HDMI kábel|hálózati kábel|LAN kábel|adapter|USB adapter|fülhallgató|vezeték nélküli fülhallgató|bluetooth fülhallgató|fejhallgató|hangszóró|bluetooth hangszóró|okosóra|óraszíj|okosotthon központ|okosizzó|okos konnektor|laptop|notebook|laptop töltő|számítógép|monitor|billentyűzet|egér|vezeték nélküli egér|webkamera|router|wifi router|külső merevlemez|pendrive|memóriakártya|SSD|nyomtató|nyomtatópatron|toner|TV|televízió|távirányító|elektromos hosszabbító|elosztó|játék konzol|elektromos fogkefe|elektromos borotva|kábelrendező"],
 ["👗","Divat & Stílus","póló|t-shirt|ing|blúz|top|pulóver|kardigán|kapucnis pulóver|hoodie|mellény|farmer|farmernadrág|nadrág|szövetnadrág|leggings|rövidnadrág|szoknya|ruha|nyári ruha|alkalmi ruha|zakó|blézer|öltöny|kabát|dzseki|esőkabát|cipő|tornacipő|sportcipő|futócipő|bakancs|csizma|szandál|papucs|zokni|harisnya|alsónemű|fehérnemű|melltartó|pizsama|fürdőruha|úszónadrág|sál|sapka|kalap|kesztyű|öv|napszemüveg|táska|kézitáska|hátizsák|pénztárca|ékszer|nyaklánc|karkötő|fülbevaló|karóra"],
 ["🏠","Otthon & Háztartás","ágynemű|ágyneműhuzat|paplan|párna|párnahuzat|lepedő|takaró|pléd|matrac|matracvédő|törölköző|fürdőlepedő|fürdőszobaszőnyeg|szőnyeg|függöny|sötétítő függöny|redőny|polc|tárolókosár|szekrény|komód|asztal|szék|lámpa|állólámpa|asztali lámpa|váza|képkeret|fali óra|virágcserép|szobanövény|mosókosár|vállfa|ruhaszárító|vasalódeszka|edény|lábas|serpenyő|fazék|tepsi|sütőforma|vágódeszka|konyhakés|evőeszköz|tányér|pohár|bögre|termobögre|kulacs|kancsó|szűrő|szűrőkanál|konzervnyitó|dugóhúzó|konyharuha|konyhai mérleg|kávéfőző|vízforraló|pirítós sütő|mikrohullámú sütő|porszívó|porszívózsák|légtisztító"],
 ["🧴","Drogéria & Szépség","arcápoló|arclemosó|arcszérum|hajbalzsam|hajhab|hajfesték|kézmosó|habfürdő|dezodor stift|rúzs|szemceruza|szempillaspirál|alapozó|púder|pirosító|körömlakk|sminkecset|kozmetikai tükör|hajkefe|hajszárító|sminkszivacs|szemránckrém|testpermet|intim mosakodó|szemmaszk|arcpakolás"],
];
const PRODUCTS=[...new Map([...groups,...additionalGroups].flatMap(([icon,category,names])=>names.split('|').map(name=>[name.toLocaleLowerCase('hu-HU'),{name,category:mainCategory(category),icon}]))).entries()].map(([,v])=>v);
const ICON={...Object.fromEntries(groups.map(g=>[g[1],g[0]])),...Object.fromEntries(additionalGroups.map(g=>[g[1],g[0]])),Élelmiszer:'🍎'};
const nrm=s=>String(s||'').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
const validUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch(_){return''}};
const node=(tag,cls,txt)=>{let n=d.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
let user=null,allowed=[],items=[],favorites=[],favoriteBusy=new Set(),viewMode='shopping',selectedCategory='',remote=[],activeQuery='',queryToken=0,queryTimer=0,fetchCtrl=null,live=null,refreshBusy=false,pendingReload=false,firstLoad=true,writing=false,voiceRec=null,busyIds=new Set();
const who=()=>{try{return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}catch(_){return'zsolt'}};
const label=p=>p==='monika'?'Mónika':'Zsolt';
function toast(message){const e=$('toast');e.textContent=message;e.hidden=false;clearTimeout(toast.id);toast.id=setTimeout(()=>e.hidden=true,3600)}
function status(message,ok){$('syncText').textContent=message;$('syncState').title=message;$('syncState').classList.toggle('connected',!!ok)}
function haptic(){try{navigator.vibrate?.(9)}catch(_){/* unsupported */}}
// Prepare Web Audio inside the original tap so Samsung/Chrome can play the
// short confirmation after the cloud write succeeds. Silent on unsupported devices.
let clickAudio=null;
function armClickSound(){
 try{
  const Audio=w.AudioContext||w.webkitAudioContext;
  if(!Audio)return null;
  if(!clickAudio||clickAudio.state==='closed')clickAudio=new Audio();
  if(clickAudio.state==='suspended')void clickAudio.resume().catch(()=>{});
  return clickAudio;
 }catch(_){return null}
}
function playClickSound(checked,ctx){
 if(!ctx||ctx.state!=='running')return;
 try{
  const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
  const start=checked?690:510,end=checked?940:350;
  osc.type='sine';
  osc.frequency.setValueAtTime(start,now);
  osc.frequency.exponentialRampToValueAtTime(end,now+0.075);
  gain.gain.setValueAtTime(0.001,now);
  gain.gain.exponentialRampToValueAtTime(0.038,now+0.012);
  gain.gain.exponentialRampToValueAtTime(0.001,now+0.09);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(now);osc.stop(now+0.095);
 }catch(_){/* sound is optional; keep shopping usable */}
}
function selectedIcon(category){return ICON[category]||'🛒'}
// Product-specific Hungarian icon mapping: original product photo always wins.
// Match whole words/phrases, not arbitrary substrings (e.g. alma != almalé).
// Earlier entries take precedence when a name contains multiple terms.
const PRODUCT_ICON_RULES=[
 ["🍌","banán|banan"],
 ["🍎","alma|granny smith|zöldalma|piros alma"],
 ["🍐","körte"],
 ["🍋","citrom|lime"],
 ["🍊","narancs|mandarin|grapefruit"],
 ["🍇","szőlő"],
 ["🍓","eper"],
 ["🫐","áfonya|szeder|málna"],
 ["🍒","cseresznye|meggy"],
 ["🍑","őszibarack|nektarin|sárgabarack"],
 ["🍉","görögdinnye|dinnye"],
 ["🍈","sárgadinnye"],
 ["🍍","ananász"],
 ["🥭","mangó"],
 ["🥝","kiwi|kivi"],
 ["🥑","avokádó"],
 ["🍅","paradicsom|koktélparadicsom"],
 ["🫑","paprika|kaliforniai paprika|kápia paprika"],
 ["🌶️","chili|csili|erős paprika|pirospaprika|füstölt paprika"],
 ["🥒","uborka|csemegeuborka|kovászos uborka"],
 ["🥕","sárgarépa|fehérrépa|répa"],
 ["🥔","burgonya|krumpli|édesburgonya|hasábburgonya"],
 ["🧅","vöröshagyma|lilahagyma|póréhagyma|hagyma"],
 ["🧄","fokhagyma"],
 ["🥦","brokkoli|karfiol"],
 ["🥬","saláta|jégsaláta|római saláta|fejes saláta|rukkola|spenót|káposzta|kelkáposzta"],
 ["🌽","kukorica"],
 ["🍄","gomba|csiperke"],
 ["🍆","padlizsán|cukkini"],
 ["🫛","zöldborsó|borsó|zöldbab"],
 ["🫘","bab|vörösbab|fehérbab|lencse|csicseriborsó"],
 ["🎃","sütőtök"],
 ["🥥","kókusz|kókuszvíz"],
 ["🥜","mogyoró|kesudió|pisztácia|mogyoróvaj"],
 ["🌰","dió|mandula|gesztenye"],
 ["🌻","napraforgómag|tökmag|chia mag|lenmag"],
 ["🍞","kenyér|toast kenyér|rozskenyér|abonett|extrudált kenyér"],
 ["🥖","bagett|ciabatta|kifli|zsömle|zsemle|péksütemény"],
 ["🥐","croissant|kalács"],
 ["🫓","tortilla|pita|lepény"],
 ["🥣","zabpehely|müzli|granola|corn flakes|zabkása|búzadara"],
 ["🍚","rizs|basmati rizs|jázminrizs|kuszkusz|bulgur|quinoa"],
 ["🍝","tészta|penne|spagetti|fusilli|farfalle|makaróni|lasagne|cérnametélt|tarhonya"],
 ["🍕","pizza|pizzaszósz"],
 ["🥫","konzerv|konzervbab|paradicsompüré|passzírozott paradicsom"],
 ["🥩","marhahús|bélszín|sertéskaraj|sertéscomb|darált hús|sertéshús|marhahus"],
 ["🍗","csirkemell|csirkecomb|csirkehús|csirke"],
 ["🦃","pulykamell|pulykahús|pulyka"],
 ["🍖","sonka|bacon|szalonna|kolbász|szalámi|májas"],
 ["🌭","virsli|hotdog"],
 ["🍔","hamburgerzsemle|hamburger"],
 ["🐟","hal|lazac|lazacfilé|füstölt lazac|tonhal|tonhalkonzerv|szardínia|makréla|halrudacska"],
 ["🦐","garnélarák|garnéla|rák"],
 ["🦑","tenger gyümölcsei|tintahal"],
 ["🥚","tojás"],
 ["🥛","tej|félzsíros tej|teljes tej|laktózmentes tej|sűrített tej|zabital|mandulaital|rizsital"],
 ["🧈","vaj|margarin"],
 ["🧀","sajt|mozzarella|trappista sajt|gouda|cheddar|feta|parmezán|camembert|krémsajt|cottage cheese"],
 ["🥣","joghurt|natúr joghurt|görög joghurt|gyümölcsjoghurt|kefir|tejföl|túró"],
 ["🥛","tejszín|főzőtejszín|habtejszín"],
 ["💧","ásványvíz|szénsavmentes víz|szénsavas víz|szóda|víz"],
 ["🧃","narancslé|almalé|multivitamin ital|őszibaracklé|citromlé|gyümölcslé"],
 ["☕","kávé|szemes kávé|szemes arabica kávé|őrölt kávé|instant kávé|koffeinmentes kávé|kávékapszula|kapucsínó por"],
 ["🍵","tea|filteres tea|zöld tea|fekete tea|gyümölcstea|kamillatea|mentatea|jegestea"],
 ["🥤","kóla|cukormentes kóla|limonádé|tonik|energiaital|izotóniás ital|protein ital|fehérjeturmix"],
 ["🧋","szörp|málnaszörp|bodzaszörp"],
 ["🧂","só|tengeri só|bors|fűszer|curry|kurkuma|kömény|fahéj|oregánó|bazsalikom|rozmaring|kakukkfű"],
 ["🫒","olívaolaj|napraforgóolaj|kókuszolaj|étolaj"],
 ["🫙","mustár|ketchup|majonéz|pesto|torma|ecet|balzsamecet|lekvár|nutella"],
 ["🍯","méz|juharszirup"],
 ["🧁","cukor|barna cukor|porcukor|vaníliás cukor|édesítőszer|sütőpor|élesztő"],
 ["🍫","csokoládé|étcsokoládé|tejcsokoládé|kakaópor|kakaóital|forró csokoládé"],
 ["🍪","keksz|nápolyi|müzliszelet"],
 ["🍿","pattogatott kukorica|chips|ropi"],
 ["🍬","cukorka|rágógumi"],
 ["🍨","fagylalt|jégkrém"],
 ["🍰","torta|sütemény"],
 ["🍲","instant leves|húsleveskocka|leves"],
 ["🧽","mosogatószer|mosogatógép tabletta|mosogatógép só|mosogatókefe|szivacs|dörzsszivacs"],
 ["🧼","szappan|folyékony szappan|kézfertőtlenítő|fertőtlenítő"],
 ["🫧","mosószer|mosókapszula|öblítő|folttisztító|fehérítő"],
 ["🧹","seprű|felmosófej|felmosószer|általános tisztítószer"],
 ["🧴","vízkőoldó|konyhai zsíroldó|fürdőszobai tisztítószer|ablaktisztító"],
 ["🚽","wc tisztító|wc illatosító"],
 ["🧻","toalettpapír|papírtörlő|kéztörlő papír|papír zsebkendő|szalvéta"],
 ["🗑️","szemeteszsák|szelektív szemeteszsák"],
 ["🧤","gumikesztyű"],
 ["🧽","törlőkendő|mikroszálas kendő|mosogatórongy"],
 ["🕯️","gyertya|gyufa|öngyújtó"],
 ["🔋","elem|ceruzaelem|gombelem"],
 ["💡","izzó|led izzó"],
 ["📦","ételtároló doboz|fagyasztózacskó|uzsonnás tasak|alufólia|sütőpapír|frissentartó fólia"],
 ["🪥","fogkefe|fogkrém|szájvíz|fogselyem|fogköztisztító kefe"],
 ["🧴","sampon|balzsam|hajpakolás|hajolaj|szárazsampon"],
 ["🛁","tusfürdő|testápoló|kézkrém|arckrém|nappali krém|éjszakai krém"],
 ["🌞","naptej|fényvédő|napvédő stift"],
 ["🌸","dezodor|izzadásgátló|parfüm"],
 ["🪒","borotva|borotvahab|borotvagél"],
 ["🩹","sebtapasz|steril géz"],
 ["💊","vitamin|vitamin c|multivitamin|magnézium"],
 ["💄","sminklemosó|micellás víz|vattakorong|körömlakklemosó"],
 ["🪮","hajkefe|állatfésű|hajfesték|hajlakk|hajzselé"],
 ["🐶","kutyatáp|száraz kutyatáp|nedves kutyaeledel|kutyaeledel"],
 ["🦴","kutyajutalomfalat|rágócsont|kutya rágócsont"],
 ["🐾","kutyapelenka|kutyapiszok zacskó|kutyatörlőkendő|bolhanyakörv"],
 ["🧴","kutyasampon|kutyafogkrém"],
 ["🧸","kutyajáték"],
 ["🛏️","kutyafekhely"],
 ["🥣","kutyatál"],
 ["🐈","macskaeledel|macskajutalomfalat"],
 ["🐈","macskaalom|alomtálca"],
 ["🧶","kutyapóráz|kutyanyakörv"],
].map(([icon,aliases])=>({icon,terms:aliases.split('|').map(x=>nrm(x).replace(/[^a-z0-9]+/g,' ').trim())}));
function productIcon(name,category){
 const text=' '+nrm(name).replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
 for(const rule of PRODUCT_ICON_RULES){
  if(rule.terms.some(term=>term&&text.includes(' '+term+' ')))return rule.icon;
 }
 return selectedIcon(category);
}
function suggestions(){
 const q=$('productSearch').value.trim(),out=$('suggestions');out.replaceChildren();
 if(!q){out.hidden=true;return}
 const target=nrm(q);let found=PRODUCTS.filter(p=>(!selectedCategory||selectedCategory===mainCategory(p.category))&&nrm(p.name).includes(target));
 found.sort((a,b)=>Number(nrm(b.name).startsWith(target))-Number(nrm(a.name).startsWith(target))||a.name.localeCompare(b.name,'hu'));
 found=found.slice(0,7);
 const remoteResults=remote.filter(p=>nrm(p.name).includes(target)).slice(0,5);
 for(const p of remoteResults.concat(found)){
  const b=node('button','suggestion');b.type='button';
  const img=node('span','thumb');
  if(p.image&&validUrl(p.image)){const photo=node('img');photo.src=validUrl(p.image);photo.alt='Termékfotó';photo.loading='lazy';photo.onerror=()=>{img.replaceChildren(d.createTextNode(productIcon(p.name,p.category)))};img.append(photo)}
  else img.textContent=productIcon(p.name,p.category);
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
 const q=nrm(name),ref=PRODUCTS.find(x=>nrm(x.name)===q);
 if(ref)return ref.category;
 // Recognise familiar products even with qualifiers, e.g. "bio banán" or "1 kg rizs".
 const value=' '+q.replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
 const partial=PRODUCTS.filter(p=>{
  const term=nrm(p.name).replace(/[^a-z0-9]+/g,' ').trim();
  return term&&value.includes(' '+term+' ');
 }).sort((a,b)=>b.name.length-a.name.length)[0];
 return partial?.category||selectedCategory||'Élelmiszer';
}
async function add(p){
 if(!user||!allowed.includes(who()))return toast('Előbb jelentkezz be a családi fiókba.');
 if(writing)return;
 const parsed=parseEntry(p.name);
 if(!parsed.name)return;
 const amount=p.quantity!==undefined?Number(p.quantity):parsed.quantity;
 const measure=p.unit||parsed.unit;
 if(!Number.isFinite(amount)||amount<=0||amount>9999)return toast('Ellenőrizd a mennyiséget.');
 const category=mainCategory(p.category||inferCategory(parsed.name)),image=validUrl(p.image||'');
 const found=items.find(x=>!x.done&&(p.code&&x.barcode===p.code||nrm(x.name)===nrm(parsed.name)&&x.unit===measure));
 writing=true;
 try{
  let error=null;
  if(found){const res=await api.from(TABLE).update({quantity:Math.min(9999,Number(found.quantity)+amount),updated_by_profile:who()}).eq('id',found.id).select('id');error=res.error}
  else{const res=await api.from(TABLE).insert({name:parsed.name.slice(0,100),quantity:amount,unit:measure,category,image_url:image,barcode:String(p.code||'').slice(0,20),updated_by_profile:who()}).select('id');error=res.error}
  if(error)throw error;
  $('productSearch').value='';remote=[];activeQuery='';queryToken++;if(fetchCtrl)fetchCtrl.abort();
  $('suggestions').hidden=true;haptic();toast('＋ '+parsed.name+' a közös listában');
  await reload(false);
  return true;
 }catch(e){toast('Nem sikerült menteni a felhőbe: '+String(e.message||e).slice(0,90));return false}
 finally{writing=false}
}
const COUNT_UNITS=['db','csomag','doboz','üveg','flakon','l','ml'];
const WEIGHT_UNITS=['kg','g'];
function shortCategory(category){
 const cat=mainCategory(category);
 return cat==='Otthon & Háztartás'?'Otthon':cat==='Drogéria & Szépség'?'Drogéria':cat==='Divat & Stílus'?'Divat':cat;
}
function formatQty(value,unit){return Number(value).toLocaleString('hu-HU',{maximumFractionDigits:3})+' '+unit}
let editItem=null,editMode='count',editUnit='db';
function formatEditNumber(value){return String(Math.round(Number(value)*1000)/1000)}
function availableUnits(mode){return mode==='weight'?WEIGHT_UNITS:COUNT_UNITS}
function refreshQtyEditor(){
 const units=$('qtyUnit'),previous=units.value;
 units.replaceChildren();
 for(const unit of availableUnits(editMode)){
  const opt=node('option',null,unit);opt.value=unit;units.append(opt);
 }
 units.value=availableUnits(editMode).includes(editUnit)?editUnit:availableUnits(editMode)[0];
 editUnit=units.value;
 $('qtyModeCount').classList.toggle('active',editMode==='count');
 $('qtyModeWeight').classList.toggle('active',editMode==='weight');
 $('qtyModeCount').setAttribute('aria-pressed',String(editMode==='count'));
 $('qtyModeWeight').setAttribute('aria-pressed',String(editMode==='weight'));
}
function openQtyEditor(item){
 if(!user||!allowed.includes(who()))return toast('A mennyiség módosításához jelentkezz be.');
 if(busyIds.has(item.id))return;
 editItem=item;editUnit=item.unit;
 editMode=WEIGHT_UNITS.includes(editUnit)?'weight':'count';
 $('qtyTitle').textContent=item.name;
 $('qtyNumber').value=formatEditNumber(item.quantity);
 refreshQtyEditor();
 $('qtyOverlay').hidden=false;
 $('qtyClose').focus({preventScroll:true});
}
function closeQtyEditor(){
 const id=editItem?.id;
 $('qtyOverlay').hidden=true;editItem=null;
 if(id){const original=[...d.querySelectorAll('[data-qty-itemid]')].find(x=>x.dataset.qtyItemid===id);original?.focus({preventScroll:true})}
}
function changeQtyMode(mode){
 if(!editItem||mode===editMode)return;
 editMode=mode;
 editUnit=mode==='weight'?'kg':'db';
 $('qtyNumber').value='1';
 refreshQtyEditor();
}
function qtyStep(direction){
 if(!editItem)return;
 const unit=$('qtyUnit').value;
 const step=unit==='g'||unit==='ml'?100:unit==='kg'||unit==='l'?0.25:1;
 const n=Number(String($('qtyNumber').value).replace(',','.'));
 const value=Math.max(step,Math.min(9999,(Number.isFinite(n)?n:step)+direction*step));
 $('qtyNumber').value=formatEditNumber(value);
}
function changeQtyUnit(next){
 if(!editItem)return;
 const previous=editUnit;
 let value=Number(String($('qtyNumber').value).replace(',','.'));
 if(Number.isFinite(value)){
  if(previous==='kg'&&next==='g'||previous==='l'&&next==='ml')value*=1000;
  if(previous==='g'&&next==='kg'||previous==='ml'&&next==='l')value/=1000;
  if(value<=9999&&value>0)$('qtyNumber').value=formatEditNumber(value);
 }
 editUnit=next;
}
async function saveQtyEditor(){
 const p=editItem;if(!p||busyIds.has(p.id))return;
 const q=Number(String($('qtyNumber').value).replace(',','.')),unit=$('qtyUnit').value;
 if(!Number.isFinite(q)||q<=0||q>9999||!availableUnits(editMode).includes(unit)){
  toast('Adj meg 0 és 9999 közötti, pozitív mennyiséget.');return;
 }
 if(Number(p.quantity)===q&&p.unit===unit){closeQtyEditor();return}
 busyIds.add(p.id);$('qtySave').disabled=true;
 try{
  const res=await api.from(TABLE).update({quantity:q,unit,updated_by_profile:who()})
   .eq('id',p.id).eq('quantity',p.quantity).eq('unit',p.unit).select('id');
  if(res.error)throw res.error;
  if(!res.data?.length){closeQtyEditor();await reload(true);toast('A terméket közben más is módosította.');return}
  closeQtyEditor();haptic();toast('Módosítva: '+p.name+' · '+formatQty(q,unit));
  await reload(false);
 }catch(e){toast('Mennyiség mentési hiba: '+String(e.message||e).slice(0,80))}
 finally{busyIds.delete(p.id);$('qtySave').disabled=false}
}
function itemRow(p){
 const card=node('article','product'+(p.done?' done':''));card.addEventListener('click',e=>{if(!e.target.closest('button'))void setDone(p,!p.done)});
 const check=node('button','check',p.done?'✓':'');check.type='button';check.setAttribute('aria-label',p.done?'Visszateszem a listára: '+p.name:'Megvettem: '+p.name);
 check.onclick=()=>setDone(p,!p.done);
 const image=node('span','product-image');
 if(validUrl(p.image_url)){const img=node('img');img.src=validUrl(p.image_url);img.alt=p.name;img.loading='lazy';img.onerror=()=>{image.replaceChildren(d.createTextNode(productIcon(p.name,p.category)))};image.append(img)}
 else image.textContent=productIcon(p.name,p.category);
 const main=node('div','product-main');
 const meta=node('div','product-meta');
 const cat=node('span','product-category',shortCategory(p.category));
 cat.title=mainCategory(p.category);
 const qty=node('button','quantity-pill',formatQty(p.quantity,p.unit));
 qty.type='button';qty.dataset.qtyItemid=p.id;
 qty.title='Mennyiség vagy súly módosítása: '+p.name;
 qty.setAttribute('aria-label',p.name+' – mennyiség vagy súly: '+formatQty(p.quantity,p.unit));
 qty.onclick=()=>openQtyEditor(p);
 meta.append(cat,qty);
 main.append(node('div','product-name',p.name),meta);
 if(p.done&&p.done_by_profile)main.append(node('div','product-details done-note','✓ '+label(p.done_by_profile)+' kipipálta'));
 const controls=node('div','product-controls');
 const marked=isFavorite(p.name);
 const favorite=node('button','heart'+(marked?' active':''),marked?'♥':'♡');favorite.type='button';favorite.title='Kedvenc';favorite.setAttribute('aria-label',(marked?'Kedvencekből eltávolít: ':'Kedvencekbe ment: ')+p.name);favorite.onclick=()=>setFavorite(p,!marked);
 const remove=node('button','remove','×');remove.type='button';remove.title='Törlés';remove.setAttribute('aria-label','Törlés: '+p.name);remove.onclick=()=>removeItem(p);
 controls.append(favorite,remove);card.append(check,image,main,controls);return card;
}
function categoryItems(category){
 return category?items.filter(p=>mainCategory(p.category)===category):items;
}
function refreshCategoryProgress(){
 const buttons=$('categories').querySelectorAll('[data-category]');
 buttons.forEach(button=>{
  const category=button.dataset.category;
  const all=categoryItems(category),total=all.length,bought=all.filter(p=>p.done).length;
  const active=category===selectedCategory;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',(category||'Mind')+': '+bought+' megvéve, '+total+' összesen'+(active?' · kiválasztva':''));
  button.querySelector('.category-number').textContent=bought+'/'+total;
  button.querySelector('.category-fill').style.width=(total?Math.round(100*bought/total):0)+'%';
 }
 );
}
function render(){
 refreshCategoryProgress();
 const visible=categoryItems(selectedCategory);
 const active=visible.filter(p=>!p.done),done=visible.filter(p=>p.done);
 // One shared tile: checked purchases remain visible, at the very top.
 // Most recently checked items lead; unpurchased items retain their list order.
 done.sort((a,b)=>new Date(b.done_at||b.updated_at||0)-new Date(a.done_at||a.updated_at||0));
 $('activeCount').textContent=active.length+' hátra · '+done.length+' megvéve';
 const box=$('activeList');box.replaceChildren();
 if(!visible.length){
  const empty=node('div','empty');
  empty.append(node('span','big','🛒'),node('span',null,!user?'Bejelentkezés után megjelenik a közös lista.':selectedCategory?'Ebben a kategóriában még nincs termék.':'A lista üres. Adj hozzá egy terméket!'));
  box.append(empty);
 }else [...done,...active].forEach(x=>box.append(itemRow(x)));
}
async function setDone(item,value){
 if(!user||busyIds.has(item.id))return;
 const wasDone=!!item.done,wasDoneBy=item.done_by_profile;
 const clickSound=armClickSound();
 busyIds.add(item.id);
 // Instant visual feedback; the server is authoritative if the write fails.
 item.done=value;
 item.done_by_profile=value?who():null;
 render();
 try{
  const res=await api.from(TABLE).update({done:value,updated_by_profile:who()}).eq('id',item.id).eq('done',wasDone).select('id');
  if(res.error)throw res.error;
  if(!res.data?.length){await reload(true);toast('A terméket közben más is módosította.');return}
  haptic();playClickSound(value,clickSound);toast(value?'✓ Megvásárolva: '+item.name:'↩ Újra a listán: '+item.name);
  await reload(false);
 }catch(e){
  item.done=wasDone;item.done_by_profile=wasDoneBy;
  render();
  toast('Szinkronhiba: '+String(e.message||e).slice(0,85));
  await reload(true);
 }finally{busyIds.delete(item.id)}
}
function favoriteKey(name){return String(name||'').trim().toLocaleLowerCase('hu-HU')}
function isFavorite(name){return favorites.some(f=>f.name_key===favoriteKey(name))}
async function reloadFavorites(){
 if(!user||!allowed.some(x=>x==='zsolt'||x==='monika'))return;
 try{
  const res=await api.from(FAVORITES_TABLE).select('id,household,name,name_key,quantity,unit,category,image_url,barcode,created_at')
   .eq('household','zsolt-monika').order('created_at',{ascending:true}).limit(500);
  if(res.error)throw res.error;
  favorites=res.data||[];
  renderFavorites();
  render();
 }catch(e){toast('Kedvencek szinkronhiba: '+String(e.message||e).slice(0,75))}
}
async function setFavorite(item,value){
 if(!user||!allowed.includes(who()))return toast('Jelentkezz be a családi fiókba.');
 const key=favoriteKey(item.name);
 if(!key||favoriteBusy.has(key))return;
 favoriteBusy.add(key);
 try{
  let result;
  if(value){
   result=await api.from(FAVORITES_TABLE).upsert({
    household:'zsolt-monika',name:item.name.trim().slice(0,100),name_key:key.slice(0,100),
    quantity:Number(item.quantity)||1,unit:item.unit||'db',
    category:mainCategory(item.category),image_url:validUrl(item.image_url||item.image||''),
    barcode:String(item.barcode||item.code||'').slice(0,20),
    updated_by_profile:who(),created_by:user.id
   },{onConflict:'household,name_key',ignoreDuplicates:true});
  }else{
   result=await api.from(FAVORITES_TABLE).delete().eq('household','zsolt-monika').eq('name_key',key);
  }
  if(result.error)throw result.error;
  await reloadFavorites();
  haptic();toast(value?'♥ Kedvencekhez mentve: '+item.name:'♡ Eltávolítva a kedvencekből: '+item.name);
 }catch(e){toast('Kedvenc mentése sikertelen: '+String(e.message||e).slice(0,75))}
 finally{favoriteBusy.delete(key)}
}
async function addFavoriteToList(fav){
 if(!user||!allowed.includes(who()))return toast('Jelentkezz be a családi fiókba.');
 const success=await add({name:fav.name,quantity:fav.quantity,unit:fav.unit,category:fav.category,image:fav.image_url,code:fav.barcode});
 if(success){selectedCategory='';switchSmartView('shopping');render()}
}
function renderFavorites(){
 const box=$('favoriteList');if(!box)return;
 box.replaceChildren();
 $('favoritesCount').textContent=favorites.length+' kedvenc';
 if(!favorites.length){
  const empty=node('div','empty');
  empty.append(node('span','big','♡'),node('span',null,user?'Még nincs kedvenc. A termékek mellett koppints a szívecskére!':'Bejelentkezés után elérhetők a közös kedvencek.'));
  box.append(empty);return;
 }
 for(const p of favorites){
  const row=node('article','favorite-row');
  const picture=node('span','product-image');
  const url=validUrl(p.image_url);
  if(url){const image=node('img');image.src=url;image.alt=p.name;image.loading='lazy';image.onerror=()=>{picture.replaceChildren(d.createTextNode(productIcon(p.name,p.category)))};picture.append(image)}
  else picture.textContent=productIcon(p.name,p.category);
  const info=node('div','favorite-info');
  info.append(node('div','product-name',p.name),node('div','product-details',formatQty(p.quantity,p.unit)+' · '+shortCategory(p.category)));
  const actions=node('div','favorite-actions');
  const addBack=node('button','favorite-readd','＋');addBack.type='button';addBack.title='Hozzáadás a bevásárlólistához';
  addBack.setAttribute('aria-label','Bevásárlólistához ad: '+p.name);
  addBack.onclick=()=>void addFavoriteToList(p);
  const unfav=node('button','favorite-unheart','♥');unfav.type='button';unfav.title='Kedvenc levétele';
  unfav.setAttribute('aria-label','Kedvencekből eltávolít: '+p.name);
  unfav.onclick=()=>void setFavorite(p,false);
  actions.append(addBack,unfav);row.append(picture,info,actions);box.append(row);
 }
}
function switchSmartView(next){
 viewMode=next==='favorites'?'favorites':'shopping';
 $('shoppingSearch').hidden=viewMode!=='shopping';
 $('shoppingBoard').hidden=viewMode!=='shopping';
 $('favoritesBoard').hidden=viewMode!=='favorites';
 $('openFavorites').classList.toggle('active',viewMode==='favorites');
 $('openShoppingList').classList.toggle('active',viewMode==='shopping');
 $('openFavorites').setAttribute('aria-pressed',String(viewMode==='favorites'));
 $('openShoppingList').setAttribute('aria-pressed',String(viewMode==='shopping'));
 if(viewMode==='favorites')renderFavorites();
 w.scrollTo({top:0,behavior:'smooth'});
}
async function removeItem(item){
 // One tap deletes without a modal; prevent duplicate requests while saving.
 if(!user||busyIds.has(item.id))return;
 busyIds.add(item.id);
 try{
  const res=await api.from(TABLE).delete().eq('id',item.id).select('id');
  if(res.error)throw res.error;
  if(!res.data?.length){toast('A terméket közben már törölték.');await reload(true);return}
  haptic();toast('Törölve: '+item.name);await reload(false);
 }catch(e){toast('Nem sikerült törölni: '+String(e.message||e).slice(0,85))}
 finally{busyIds.delete(item.id)}
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
 live=api.channel('sho-smart-list-'+user.id)
  .on('postgres_changes',{event:'*',schema:'public',table:TABLE},()=>{void reload(true)})
  .on('postgres_changes',{event:'*',schema:'public',table:FAVORITES_TABLE},()=>{void reloadFavorites()}).subscribe();
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
  await reloadFavorites();await reload(false);subscribe();
 }else{
  if(live){api.removeChannel(live);live=null}
  items=[];favorites=[];renderFavorites();render();status(user?'Nincs jogosultság a családi listához':'Bejelentkezés szükséges',false);
 }
}
let lastRefresh=0;
function foreground(){
 if(d.visibilityState!=='visible'||!user||Date.now()-lastRefresh<8000)return;
 lastRefresh=Date.now();void reload(true);
}
const searchDebounce=()=>{clearTimeout(queryTimer);queryTimer=setTimeout(fetchProductMatches,650)};
async function fetchProductMatches(){
 const query=$('productSearch').value.trim();
 if(query.length<3||query.length>70||(selectedCategory&&selectedCategory!=='Élelmiszer')){remote=[];suggestions();return}
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
 const list=[['✨','','Mind'],...SHOPPING_MAIN_CATEGORIES];
 for(const [icon,category,labelText] of list){
  const button=node('button','category-progress');
  button.type='button';
  button.dataset.category=category;
  button.setAttribute('aria-pressed',String(category===selectedCategory));
  const header=node('span','category-head');
  const name=node('span','category-label',icon+' '+labelText);
  const count=node('span','category-number','0/0');
  header.append(name,count);
  const track=node('span','category-track');
  track.setAttribute('aria-hidden','true');
  track.append(node('span','category-fill'));
  button.append(header,track);
  button.onclick=()=>{
   // Mind displays everything; tapping the active category returns to Mind.
   selectedCategory=category===selectedCategory?'':category;
   refreshCategoryProgress();
   render();
   remote=[];suggestions();searchDebounce();
  };
  box.append(button);
 }
 refreshCategoryProgress();
}
async function addVoiceText(text){
 const fragments=String(text||'').split(/\s*,\s*|\s+és\s+|\s+meg\s+/i).map(x=>x.trim()).filter(Boolean).slice(0,12);
 if(!fragments.length)return;
 let ok=0;
 for(const name of fragments){
  if(await add({name,category:inferCategory(parseEntry(name).name)}))ok++;
 }
 if(ok>1)toast('🎙️ '+ok+' termék feldolgozva a közös listára.');
}
function startVoice(){
 const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!Speech)return toast('A böngészőben nem elérhető a magyar hangfelismerés. Használd a billentyűzet mikrofonját.');
 if(voiceRec){voiceRec.stop();return}
 voiceRec=new Speech();voiceRec.lang='hu-HU';voiceRec.interimResults=false;voiceRec.maxAlternatives=1;
 $('voice').classList.add('voice-on');
 voiceRec.onresult=e=>{const text=e.results[0]?.[0]?.transcript||'';$('productSearch').value=text;void addVoiceText(text)};
 voiceRec.onerror=e=>toast('Hangbevitel nem sikerült: '+e.error);
 voiceRec.onend=()=>{$('voice').classList.remove('voice-on');voiceRec=null;};
 try{voiceRec.start()}catch(_){voiceRec=null;toast('A mikrofon nem indult el.')}
}
buildCategories();renderFavorites();render();
$('openFavorites').onclick=()=>switchSmartView('favorites');
$('openShoppingList').onclick=()=>switchSmartView('shopping');
$('productSearch').addEventListener('input',()=>{remote=[];queryToken++;suggestions();searchDebounce()});
$('productSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void add({name:e.target.value,category:inferCategory(parseEntry(e.target.value).name)})}});
$('addTyped').onclick=()=>add({name:$('productSearch').value,category:inferCategory(parseEntry($('productSearch').value).name)});
$('voice').onclick=startVoice;
$('qtyClose').onclick=closeQtyEditor;
$('qtyOverlay').addEventListener('click',e=>{if(e.target===$('qtyOverlay'))closeQtyEditor()});
$('qtyModeCount').onclick=()=>changeQtyMode('count');
$('qtyModeWeight').onclick=()=>changeQtyMode('weight');
$('qtyMinus').onclick=()=>qtyStep(-1);
$('qtyPlus').onclick=()=>qtyStep(1);
$('qtyUnit').onchange=e=>changeQtyUnit(e.target.value);
$('qtySave').onclick=()=>void saveQtyEditor();
d.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('qtyOverlay').hidden)closeQtyEditor()});

$('navList').onclick=()=>w.scrollTo({top:0,behavior:'smooth'});
$('signIn').onclick=async()=>{
 if(!api)return toast('A bejelentkezéshez nincs felhőkapcsolat.');
 try{
  if(nativeOAuth){const handled=await w.HH_ONE_NATIVE_AUTH_V1063?.start?.(api);if(!handled)throw Error('A natív bejelentkezés nem elérhető.');return}
  const {error}=await api.auth.signInWithOAuth({provider:'google',options:{redirectTo:w.location.origin+w.location.pathname}});
  if(error)throw error;
 }catch(e){toast('Bejelentkezési hiba: '+e.message)}
};
w.addEventListener('storage',e=>{if(e.key==='hh-guardian-family-auth-v785')void authSync()});
d.addEventListener('visibilitychange',foreground);w.addEventListener('focus',foreground);
if(api)api.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'||event==='SIGNED_IN')setTimeout(authSync,0)});
void authSync();
})(window,document);