/* HealthHub Nutrition Quick Recipe Wheel v635: LIVE first beta, one-tap profile-scoped logging.
 * No water duplicate, no separate preview, no personal assets committed to GitHub.
 * Uses the existing Nutrition diary/Dropbox core API; starter photos are editable on-device.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const api=window.HH_NUTRITION_QUICK_API;
const dlg=$('hhQuickDialog'),shell=$('hhQuickShell'),rail=$('hhQuickRail'),library=$('hhQuickEditList');
if(!api||!dlg||!shell||!rail||!library)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const keySound='hh-quick-wheel-sound-v1';
let recipes=[],selection=0,activeId='',editing=null,photoData='',photoRemoved=false,editSaving=false,busy=false,scrollTimer=null,scrollUser=false,lastTick=-1,audioCtx=null,lastRecord=0;
const $f=id=>$(id),fmt=n=>Number(n||0).toLocaleString('hu-HU',{maximumFractionDigits:1});
const safeNum=(v,maximum)=>{const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=maximum?n:null};
const str=(v,max=100)=>String(v==null?'':v).trim().slice(0,max);
const iconFallback=k=>({'Italok':'☕','Gyümölcs':'🍎','Reggeli':'🥣','Édesség':'🍪','Főételek':'🥗'}[k]||'🍽️');
const dateNow=()=>new Date().toISOString();
const cloudState=$('hhQuickCloudState'),cloudEditorState=$('hhQuickCloudEditStatus'),cloudManual=$('hhQuickCloudManual');
let lastCloudState='pending';
function showCloudState(state,message){
 lastCloudState=state;
 for(const el of [cloudState,cloudEditorState]){
  if(!el)continue;
  el.dataset.state=state;
  el.textContent=message;
 }
 if(cloudManual)cloudManual.disabled=state==='syncing';
}
function cloudReady(){return !!window.HH_NUTRITION_CLOUD_V626?.connected()}
function resetCloudState(){
 if(cloudReady())showCloudState('pending','☁️ Dropbox csatlakoztatva · szinkron ellenőrzése…');
 else showCloudState('local','◌ Mentve helyben · Dropbox nincs csatlakoztatva');
}

const seed=(id,name,icon,theme,category,meal,description,ingredients,nutrients,sort,kind='food')=>({
 id:'quick:'+id,name,icon,theme,category,meal,description,ingredients,
 nutrients:{...nutrients},order:sort,kind,archived:false,image:'',updatedAt:'1970-01-01T00:00:00Z'
});
function defaults(){
 const data=api.getData(),p=data.presets||{};
 const morning=p.morning||{},afternoon=p.afternoon||{};
 const mNut=api.getPresetNutrients('morning'),aNut=api.getPresetNutrients('afternoon');
 const milk=p=>String(p.milkType||'').includes('lactose')?'laktózmentes tej':'tej';
 const caps=(p,af)=>str((p.milkMl||150)+' ml '+milk(p)+', '+(p.sugarCubes||0)+' kockacukor'+(af?', fahéjas cukor és babapiskóta':''),160);
 const food=(id,g)=>api.getFoodNutrients(id,g)||{kcal:0,protein:0,carbs:0,fat:0};
 // Nine requested favorites (Nutrition v638). One tap is always one PRESET serving.
 // Household and packaged-item nutrition values are provisional until personalized.
 const macro=(kcal,protein,carbs,fat)=>({kcal,protein,carbs,fat});
 const custom=(id,name,icon,theme,category,meal,description,ingredients,nutrients,sort,kind='food',volumeMl=null)=>{
  const item=seed(id,name,icon,theme,category,meal,description,ingredients,nutrients,sort,kind);
  item.volumeMl=volumeMl;item.estimateNotice=true;
  return item;
 };
 return [
  custom('monika-smoothie','Mónika reggeli smoothie','🫐','smoothie','Italok','Reggeli','Bogyós gyümölcsös kedvenc · becsült érték','KIINDULÓ MINTA: erdei gyümölcsök és tej/joghurt, kb. 300 ml. Mónika tényleges receptjére és mennyiségeire a Stúdióban pontosítandó.',macro(185,6,31,4),3,'drink',300),
  custom('espresso-macchiato','Espresso Macchiato','☕','coffee','Italok','Reggeli','Espresso egy kevés tejhabbal · becslés','1 espresso kb. 30 ml és kb. 20 ml tejhab; cukor nélkül. Ha cukrozott, szerkeszd a receptet.',macro(15,1,1.2,.6),5,'drink',50),
  custom('cortado','Cortado','☕','coffee','Italok','Tízórai','Espresso selymes tejjel · becslés','Kb. 40 ml espresso és 60 ml tej; hozzáadott cukor nélkül.',macro(34,2.1,3,.9),6,'drink',100),
  custom('monika-cappuccino','Mónika Cappuccino','☕','coffee','Italok','Reggeli','Laktózmentes tej és 1 kockacukor · induló minta','150 ml 1,5%-os laktózmentes tej, 1 kockacukor (4 g), espresso. Az adag az egyedi szokáshoz szerkeszthető.',macro(86,5.2,11.2,2.3),1,'drink',185),
  custom('zsolt-cappuccino','Zsolt Cappuccino','☕','coffee','Italok','Reggeli','Zsolt reggeli cappuccinója · 2 kockacukor','150 ml 1,5%-os tej, 2 db 4 g-os kockacukor, espresso. Az egyedi adagot a Stúdióban lehet pontosítani.',macro(102,5.2,15.2,2.3),2,'drink',185),
  custom('zsolt-cappuccino-plus','Zsolt Cappuccino+','☕','coffee','Italok','Reggeli','Zsolt kedvence · + változat, pontosítandó','INDULÓ MINTA: 150 ml 1,5%-os tej, espresso, 3 db 4 g-os kockacukor. A + pontos összetételét a Stúdióban kell beállítani.',macro(118,5.2,19.2,2.3),7,'drink',185),
  custom('cappuccino-plus','Cappuccino+','☕','coffee','Italok','Uzsonna','Személyre szabható pluszos cappuccino','INDULÓ MINTA: 150 ml 1,5%-os tej, espresso, 2 kockacukor. A + tényleges összetevői szerkeszthetők.',macro(102,5.2,15.2,2.3),8,'drink',185),
  custom('belvita-forest','belVita Forest Fruits · 1 db','🍪','belvita','Édesség','Reggeli','1 db · 4 darabos csomagból · becsült kcal','1 darab belVita Breakfast Forest Fruits keksz, a 4 darabos adagcsomagból. Becsült tápérték, a csomagolás értéke alapján pontosítandó.',macro(55,1.1,8.3,1.9),4),
  custom('cola-glass','Coca-Cola · 1 pohár','🥤','cola','Italok','Uzsonna','1 pohár · 250 ml · normál cukros','250 ml hagyományos (nem zero) Coca-Cola. ~42 kcal és ~10,6 g szénhidrát / 100 ml; szerkeszthető.',macro(105,0,26.5,0),9,'drink',250),
  custom('hugo-sparkling','Hugo Sparkling Wine · 1 pohár','🥂','hugo','Italok','Vacsora','1 pohár · 200 ml · becsült érték','200 ml Hugo / Hugo Spritz jellegű pezsgős ital. Az alkohol- és cukortartalom márkánként, receptenként eltér; a tápérték becslés.',macro(150,0,16,0),10,'drink',200),
  seed('morning','Reggeli cappuccino','☕','coffee','Italok','Reggeli','A nap első kedvence',caps(morning,false),mNut,11,'drink'),
  seed('afternoon','Délutáni cappuccino + nasi','☕','sweet','Édesség','Uzsonna','Kávé, fahéj és ropogtatnivaló',caps(afternoon,true),aNut,12,'drink'),
  seed('evening','Esti cappuccino','☕','coffee','Italok','Vacsora','Nyugodt esti kávészünet','Induló minta: a reggeli cappuccino adagja, szabadon átírható',mNut,13,'drink'),
  seed('banana','Banán','🍌','fruit','Gyümölcs','Tízórai','Gyors, édes falat','1 közepes banán, kb. 120 g',food('banana',120),14),
  seed('egg','Főtt tojás','🥚','meal','Reggeli','Reggeli','Egyszerű, fehérjedús','1 tojás, kb. 50 g',food('egg',50),15),
  seed('apple','Alma','🍎','fruit','Gyümölcs','Tízórai','Ropogós klasszikus','1 közepes alma, kb. 160 g',food('apple',160),16),
  seed('yogurt','Natúr joghurt','🥛','meal','Reggeli','Reggeli','Krémes, könnyű reggeli','150 g natúr joghurt',food('yoghurt',150),17),
  seed('oats','Zabpehely','🥣','meal','Reggeli','Reggeli','Sokoldalú reggeli alap','50 g száraz zabpehely, feltét nélkül',food('oats',50),18),
  seed('chicken','Sült csirkemell','🍗','meal','Főételek','Ebéd','Egyszerű, saját adag','150 g sült csirkemell',food('chicken',150),19),
  seed('cookies','Babapiskóta','🍪','sweet','Édesség','Uzsonna','Négy darab egy gyors nasihoz','4 darab, összesen kb. 28 g',food('ladyfinger',28),20),
  seed('orange','Narancslé','🍊','fruit','Italok','Tízórai','100%-os narancslé','200 ml 100%-os narancslé',food('juice',200),21,'drink'),
  seed('tea','Tea','🍵','coffee','Italok','Uzsonna','Cukor nélkül','200 ml tea, cukor nélkül',food('tea',200),22,'drink')
 ];
}
function allRecipes(){
 const data=api.getData(),overrides=new Map((data.quickRecipes||[]).map(q=>[q.id,q]));
 const base=defaults().map(q=>overrides.get(q.id)?{...q,...overrides.get(q.id),nutrients:{...q.nutrients,...overrides.get(q.id).nutrients}}:q);
 const existing=new Set(base.map(q=>q.id));
 (data.quickRecipes||[]).forEach(q=>{if(!existing.has(q.id))base.push(q)});
 const stored=Array.isArray(data.quickRecipeOrder?.ids)?data.quickRecipeOrder.ids:[];
 const at=new Map(stored.map((id,i)=>[id,i]));
 return base.sort((a,b)=>{
  if(stored.length){const ai=at.has(a.id)?at.get(a.id):10000+(Number(a.order)||500);
   const bi=at.has(b.id)?at.get(b.id):10000+(Number(b.order)||500);
   return ai-bi||a.name.localeCompare(b.name,'hu');}
  return (Number(a.order)||500)-(Number(b.order)||500)||a.name.localeCompare(b.name,'hu');
 });
}
function activeRecipes(){return allRecipes().filter(q=>!q.archived)}
function activateAudio(){
 if(localStorage.getItem(keySound)==='off'||reduced.matches)return;
 try{
  audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
 }catch(_){}
}
function tick(success=false){
 if(localStorage.getItem(keySound)==='off'||reduced.matches)return;
 try{
  activateAudio();if(!audioCtx)return;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),t=audioCtx.currentTime;
  osc.type=success?'sine':'triangle';osc.frequency.setValueAtTime(success?720:420,t);
  osc.frequency.exponentialRampToValueAtTime(success?1050:290,t+(success?.18:.055));
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.exponentialRampToValueAtTime(success?.038:.012,t+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,t+(success?.25:.09));
  osc.connect(gain);gain.connect(audioCtx.destination);
  osc.start(t);osc.stop(t+(success?.26:.1));
 }catch(_){}
}
function tada(){
 // Audible successful diary-entry jingle. TADAA belongs to the SOUND, not labels.
 if(localStorage.getItem(keySound)==='off'||reduced.matches)return;
 try{
  activateAudio();if(!audioCtx)return;
  const t=audioCtx.currentTime+.012;
  const notes=[
   [523.25,0,.145,.033],
   [659.25,.135,.15,.035],
   [783.99,.27,.16,.039],
   [1046.5,.415,.43,.054],
   [783.99,.415,.43,.020]
  ];
  for(const [pitch,delay,duration,volume] of notes){
   const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),start=t+delay;
   osc.type=delay>.4?'sine':'triangle';
   osc.frequency.setValueAtTime(pitch,start);
   gain.gain.setValueAtTime(.0001,start);
   gain.gain.linearRampToValueAtTime(volume,start+.018);
   gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   osc.connect(gain);gain.connect(audioCtx.destination);
   osc.start(start);osc.stop(start+duration+.02);
  }
 }catch(_){}
}
function paintArtwork(target,q){
 target.className='hh-quick-art';target.dataset.theme=q.theme||'meal';
 const inline=typeof q.image==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(q.image);
 const fallback=document.createElement('span');fallback.className='hh-quick-emoji';fallback.textContent=q.icon||iconFallback(q.category);target.append(fallback);
 if(inline){
  const img=document.createElement('img');img.src=q.image;img.alt='Saját receptfotó';img.loading='lazy';
  img.onerror=()=>img.remove();target.append(img);
 }else if(q.imageRef&&window.HH_NUTRITION_IMAGE_V641){
  const profile=api.getProfile(),store=window.HH_NUTRITION_IMAGE_V641;
  if(store.refValid(profile,q.imageRef)){
   store.load(profile,q.imageRef).then(url=>{
    if(!target.isConnected||api.getProfile()!==profile)return;
    const img=document.createElement('img');img.src=url;img.alt='Szinkronizált receptfotó';img.loading='lazy';
    img.onerror=()=>img.remove();target.append(img);
   }).catch(()=>{ /* Keep premium fallback art when the device is offline or unauthorized. */ });
  }
 }
 const shine=document.createElement('span');shine.className='hh-quick-shine';target.append(shine);
}
function selectUI(){
 const cards=rail.querySelectorAll('.hh-quick-card');
 cards.forEach((c,i)=>{c.dataset.active=String(i===selection);c.setAttribute('aria-current',String(i===selection))});
 const q=recipes[selection];
 $('hhQuickSelected').textContent=q?q.name:'Nincs aktív recept';
 $('hhQuickSelectedNote').textContent=q?((q.kind==='drink'&&Number(q.volumeMl)>0?fmt(q.volumeMl)+' ml':'1 beállított adag')+' · '+fmt(q.nutrients.kcal)+' kcal'):'A Stúdióban új receptet hozhatsz létre.';
 $('hhQuickRecord').disabled=!q||busy;
 $('hhQuickEdit').disabled=!q;
 const dots=$('hhQuickDots');dots.replaceChildren();
 if(recipes.length>0&&recipes.length<=15)recipes.forEach((_,i)=>{let el=document.createElement('span');el.className='hh-quick-dot';el.dataset.active=String(i===selection);dots.append(el)});
 if(recipes.length>15){const counter=document.createElement('span');counter.className='hh-quick-index';counter.textContent=(selection+1)+' / '+recipes.length;dots.append(counter)}
}
function nearestIndex(){
 const cards=Array.from(rail.querySelectorAll('.hh-quick-card'));
 const center=rail.getBoundingClientRect().left+rail.clientWidth/2;
 let best=0,min=Infinity;
 cards.forEach((c,i)=>{const r=c.getBoundingClientRect(),d=Math.abs((r.left+r.right)/2-center);if(d<min){min=d;best=i}});
 return best;
}
function centerCard(i,smooth){
 const card=rail.querySelectorAll('.hh-quick-card')[i];if(!card)return;
 const x=card.getBoundingClientRect().left-rail.getBoundingClientRect().left+rail.scrollLeft-(rail.clientWidth-card.offsetWidth)/2;
 rail.scrollTo({left:x,behavior:smooth&&!reduced.matches?'smooth':'instant'});
}
function showWheel(wantedId=''){
 recipes=activeRecipes();
 if(wantedId){const found=recipes.findIndex(q=>q.id===wantedId);selection=found>=0?found:0}else selection=Math.max(0,Math.min(selection,recipes.length-1));
 const cards=document.createDocumentFragment();rail.replaceChildren();
 recipes.forEach((q,i)=>{
  const card=document.createElement('button');card.type='button';card.className='hh-quick-card';card.dataset.id=q.id;
  card.setAttribute('aria-label',q.name+', '+fmt(q.nutrients.kcal)+' kilokalória. Középen érintve felvitel.');
  const art=document.createElement('div');paintArtwork(art,q);card.append(art);
  const info=document.createElement('div');info.className='hh-quick-card-info';
  const h=document.createElement('strong');h.textContent=q.name;
  const small=document.createElement('small');small.textContent=q.description||q.category||'Saját recept';
  const kcal=document.createElement('b');kcal.textContent=fmt(q.nutrients.kcal)+' kcal · '+(q.kind==='drink'&&Number(q.volumeMl)>0?fmt(q.volumeMl)+' ml':'1 adag');
  info.append(h,small,kcal);card.append(info);
  card.addEventListener('click',()=>{if(busy)return;if(i===selection)recordSelected();else{selection=i;tick();selectUI();centerCard(i,true)}});
  cards.append(card);
 });
 rail.append(cards);
 if(!recipes.length){const empty=document.createElement('p');empty.className='hh-quick-spot';empty.textContent='Még nincs aktív recept. A + gombbal készíthetsz egyet.';rail.append(empty)}
 selectUI();
 requestAnimationFrame(()=>centerCard(selection,false));
}
function showDialog(){
 shell.dataset.mode='wheel';$('hhQuickSuccess').dataset.open='false';
 $('hhQuickSound').textContent=localStorage.getItem(keySound)==='off'?'🔇':'♫';
 $('hhQuickProfile').textContent=api.getProfile()==='monika'?'Mónika receptjei':'Zsolt receptjei';
 if(!dlg.open)dlg.showModal();
 showWheel(activeId);
}
function hideDialog(){if(dlg.open)dlg.close();shell.dataset.mode='wheel';$('hhQuickSuccess').dataset.open='false'}
function recordSelected(){
 if(busy||!recipes.length)return;
 const now=Date.now();if(now-lastRecord<950)return;
 const q=recipes[selection];if(!q)return;
 busy=true;selectUI();
 try{
  const result=api.recordRecipe(q);
  lastRecord=now;activeId=q.id;tada();
  const kcal=Number(result.kcal)||0,marathons=(kcal/(70*42.195));
  $('hhQuickSuccessTitle').textContent=q.name+' rögzítve!';
  $('hhQuickSuccessMessage').textContent='☕ A mókus jelenti: '+fmt(kcal)+' kcal naplózva. Ez kb. '+marathons.toFixed(2).replace('.',',')+' maratonnyi energia egy 70 kg-os példában. De nem kell ledolgozni, ez csak mókusmatek! 🐿️ Enjoy it!';
  $('hhQuickSuccess').dataset.open='true';$('hhQuickSuccessDone').focus();
  if(navigator.vibrate)navigator.vibrate([22,35,45]);
 }catch(e){window.alert('A gyorsbevitel nem menthető: '+(e&&e.message||'ismeretlen hiba'))}
 finally{busy=false;selectUI()}
}
function showEditor(recipeId,create=false){
 shell.dataset.mode='edit';
 $('hhQuickSuccess').dataset.open='false';
 $('hhQuickProfile').textContent=api.getProfile()==='monika'?'Mónika receptjei':'Zsolt receptjei';
 const items=allRecipes();
 let q=(!create&&items.find(x=>x.id===recipeId))||null;
 if(!q){q=seed('new-'+(window.crypto?.randomUUID?.()||Date.now().toString(36)).replace(/[^a-z0-9_-]/gi,'').slice(0,35),'Új kedvenc','🍽️','meal','Főételek','Ebéd','Saját recept','',{kcal:0,protein:0,carbs:0,fat:0},(items.length+1)*10)}
 editing={...q,nutrients:{...q.nutrients}};
 photoData=editing.image||'';photoRemoved=false;
 $('hhQuickEditName').value=q.name==='Új kedvenc'?'':q.name;
 $('hhQuickEditDescription').value=q.description||'';
 $('hhQuickEditCategory').value=q.category||'Főételek';
 $('hhQuickEditMeal').value=q.meal||'Ebéd';
 $('hhQuickEditIcon').value=q.icon||'🍽️';
 $('hhQuickEditTheme').value=q.theme||'meal';
 $('hhQuickEditIngredients').value=q.ingredients||'';
 for(const k of ['kcal','protein','carbs','fat'])$('hhQuickEdit'+k[0].toUpperCase()+k.slice(1)).value=q.nutrients?.[k]??0;
 $('hhQuickEditOrder').value=Number(q.order)||10;
 $('hhQuickEditArchived').checked=!!q.archived;
 $('hhQuickEditPhoto').value='';
 $('hhQuickEditStatus').textContent=photoData?'Saját kép csatolva. Képcseréhez válassz másikat.':(editing.imageRef?'☁️ Receptkép a privát központi Dropbox képtárban. Más eszközökön is megjelenhet.':'Az új kép opcionális; minden recepthez jár egységes glassy illusztráció.');
 $('hhQuickStudioHeading').textContent=q.name==='Új kedvenc'?'Új recept':'Recept szerkesztése';
 const list=document.createDocumentFragment();
 const createBtn=document.createElement('button');createBtn.type='button';createBtn.textContent='＋ Új recept';createBtn.addEventListener('click',()=>showEditor(null,true));list.append(createBtn);
 items.forEach((item,index)=>{
  const line=document.createElement('div');line.className='hh-quick-edit-row';
  const name=document.createElement('button');name.className='hh-quick-edit-name';name.type='button';
  name.textContent=(item.archived?'◌ ':'')+(item.icon||'🍽️')+' '+item.name;
  name.setAttribute('aria-pressed',String(editing.id===item.id));
  name.addEventListener('click',()=>showEditor(item.id));
  const arrows=document.createElement('div');arrows.className='hh-quick-arrows';
  for(const [dir,label] of [[-1,'Feljebb'],[1,'Lejjebb']]){
   const btn=document.createElement('button');btn.type='button';btn.className='hh-quick-move';
   btn.textContent=dir<0?'↑':'↓';btn.title=label+': '+item.name;btn.setAttribute('aria-label',label+': '+item.name);
   btn.disabled=index+dir<0||index+dir>=items.length;
   btn.addEventListener('click',()=>{
    try{
     const ids=allRecipes().map(q=>q.id),from=ids.indexOf(item.id),to=from+dir;
     if(from<0||to<0||to>=ids.length)return;
     [ids[from],ids[to]]=[ids[to],ids[from]];
     api.reorderRecipes(ids);
     $('hhQuickEditStatus').textContent='✓ Sorrend mentve. A körhinta is ezt használja.';
     showEditor(item.id);
     $('hhQuickEditStatus').textContent='✓ Sorrend mentve! A körhinta már az új sorrendet használja.';
    }catch(e){$('hhQuickEditStatus').textContent='Sorrend mentési hiba: '+e.message}
   });
   arrows.append(btn);
  }
  line.append(name,arrows);list.append(line);
 });
 library.replaceChildren(list);
 $('hhQuickEditName').focus({preventScroll:true});
}
async function compressImage(file){
 if(!file||!file.type.startsWith('image/'))throw Error('Csak képfájl tölthető fel');
 if(file.size>9*1024*1024)throw Error('Legfeljebb 9 MB-os eredeti kép tölthető fel');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('A kép nem olvasható'));img.src=url});
  for(const size of [640,520,440,350]){
   const ratio=Math.min(1,size/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
   const c=canvas.getContext('2d');c.fillStyle='#10253b';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,0,0,canvas.width,canvas.height);
   const jpeg=canvas.toDataURL('image/jpeg',size>520?.68:.56);
   if(jpeg.length<100000)return jpeg;
  }
  throw Error('A kép túl nagy, válassz kisebb fotót');
 }finally{URL.revokeObjectURL(url)}
}
async function onPhoto(e){
 const file=e.target.files?.[0];if(!file)return;
 $('hhQuickEditStatus').textContent='Kép optimalizálása…';
 try{photoData=await compressImage(file);photoRemoved=false;$('hhQuickEditStatus').textContent='✓ Fotó csatolva ('+Math.round(photoData.length*0.75/1024)+' KB). Mentéskor a központi Dropbox képtárba kerül (ha csatlakozik a Dropbox).'}
 catch(err){$('hhQuickEditStatus').textContent='Képhiba: '+err.message}
}
async function saveEdit(e){
 e.preventDefault();if(!editing||editSaving)return;
 const name=str($('hhQuickEditName').value,80),desc=str($('hhQuickEditDescription').value,160);
 const ingredients=str($('hhQuickEditIngredients').value,2000),cat=str($('hhQuickEditCategory').value,45);
 const nutrients={},caps={kcal:5000,protein:500,carbs:1000,fat:500};
 for(const [key,cap] of Object.entries(caps)){
  const number=safeNum($('hhQuickEdit'+key[0].toUpperCase()+key.slice(1)).value,cap);
  if(number==null){$('hhQuickEditStatus').textContent='Érvénytelen tápérték: '+key;return}
  nutrients[key]=number;
 }
 const order=safeNum($('hhQuickEditOrder').value,9999);
 if(name.length<2||order==null){$('hhQuickEditStatus').textContent='Adj meg legalább kétbetűs nevet és érvényes sorrendet.';return}
 const profile=api.getProfile(),previous={...editing},selectedPhoto=photoData;
 const changed=!!selectedPhoto&&selectedPhoto!==previous.image;
 const q={...editing,name,description:desc,category:cat,ingredients,nutrients:{...editing.nutrients,...nutrients},
  order,icon:str($('hhQuickEditIcon').value,8)||'🍽️',theme:$('hhQuickEditTheme').value,
  meal:$('hhQuickEditMeal').value,kind:cat==='Italok'?'drink':editing.kind==='drink'?'drink':'food',
  archived:$('hhQuickEditArchived').checked,image:photoRemoved?'':selectedPhoto,
  imageRef:photoRemoved?null:(editing.imageRef||null),updatedAt:dateNow()};
 let imageWarning='';
 const submit=$('hhQuickEditorForm').querySelector('button[type="submit"]');
 editSaving=true;submit.disabled=true;
 try{
  if(changed||(!photoRemoved&&selectedPhoto&&!q.imageRef)){
   const vault=window.HH_NUTRITION_IMAGE_V641;
   if(vault?.connected()){
    $('hhQuickEditStatus').textContent='☁️ Receptkép feltöltése a központi Dropbox képtárba…';
    try{
     q.imageRef=await vault.save(profile,selectedPhoto);q.image='';
    }catch(err){
     q.imageRef=null;q.image=selectedPhoto;
     imageWarning=' ⚠ A kép egyelőre helyben maradt, a központi képtár később újrapróbálkozik: '+String(err?.message||'hiba').slice(0,95);
    }
   }else{
    q.imageRef=null;q.image=selectedPhoto;
    imageWarning=' ⚠ Dropbox nélkül a kép csak helyben biztosított; csatlakozáskor automatikusan átkerülhet a felhőbe.';
   }
  }
  if(api.getProfile()!==profile)throw Error('Időközben profilváltás történt, mentés megszakítva.');
  api.saveRecipe(q);
  activeId=q.id;editing=q;photoData=q.image||'';photoRemoved=false;
  $('hhQuickEditStatus').textContent='✓ Recept mentve és felhőszinkronra jelölve.'+imageWarning;
  tick(true);
  if(imageWarning){shell.dataset.mode='edit';setTimeout(migrateLegacyPhotos,4000);}
  else if(!q.archived){shell.dataset.mode='wheel';showWheel(q.id)}
  else showEditor(q.id);
 }catch(err){$('hhQuickEditStatus').textContent='Mentési hiba: '+(err?.message||'ismeretlen hiba')}
 finally{editSaving=false;submit.disabled=false}
}
/* Léna Image Studio: existing Puter AI provider, loaded on demand. */
let portalPhotoData='',portalBusy=false,puterLoad=null;
function imagePromptFor(q,customText,visionText){
 const title=str($('hhQuickEditName').value||q.name,80),ingredients=str($('hhQuickEditIngredients').value||q.ingredients,1200);
 const id=q.id||'',lower=title.toLowerCase();
 let focus='';
 if(id.includes('smoothie')||lower.includes('smoothie'))focus='Tall premium transparent smoothie glass filled with vivid berry smoothie, piled with fresh blueberries, raspberries, blackberries and strawberries on the table and gently floating around, beautiful pink-lilac reflections, photorealistic fresh fruit and berry textures.';
 else if(id.includes('cola')||lower.includes('cola'))focus='A single tall crystal-clear glass of chilled classic cola with dark caramel-brown bubbly drink, ice cubes, realistic condensation droplets, dramatic side lighting and rich cola bubbles. No product branding.';
 else if(id.includes('hugo')||lower.includes('hugo'))focus='One elegant Hugo Spritz sparkling-wine cocktail glass with pale golden sparkling liquid, ice, fresh mint leaves, lime slices, delicate elderflower flowers, beautiful realistic bubbles, elegant European aperitivo.';
 else if(id.includes('belvita')||lower.includes('belvita'))focus='Close-up premium photo of several golden oat breakfast biscuits with a delicious rustic grain texture, blueberries, blackberries and raspberries scattered elegantly, without package or invented logos.';
 else if(lower.includes('cortado'))focus='A small transparent espresso glass with a short rich cortado, perfectly visible coffee-and-milk layers and delicate crema, elegant dark wood and warm light.';
 else if(lower.includes('macchiato'))focus='A tiny porcelain espresso cup filled with an espresso macchiato, strong caramel crema crowned by a little white milk foam, editorial coffee photograph.';
 else if(lower.includes('cappuccino'))focus='One exquisite real cappuccino in a premium glass mug with rich coffee, ivory milk foam, fine latte-art rosette, optional light cinnamon dust, warm inviting coffee styling.';
 else focus='A delicious authentic depiction of '+title+', correctly sized single portion, appetizing realistic textures and appropriate elegant table props.';
 return [
  'Generate a SINGLE finished photorealistic food/drink hero photograph for a premium European mobile nutrition app card. Absolutely not a UI screenshot or mock-up.',
  'Subject: '+title+'. Ingredients: '+ingredients+'.',
  focus,
  visionText?'Visual reference inspected by image analysis: '+visionText.slice(0,750):'',
  customText?'Additional art direction: '+str(customText,350):'',
  'UNIFIED GYORSNASI ART STYLE: sophisticated dark midnight navy and polished black-glass background, cinematic glossy food editorial photography, delicately luminous blue edge reflections with subtle warm bronze highlights, gentle rim lighting, photorealistic food texture, luxurious restaurant studio quality, shallow depth of field, expertly composed hero still life. For pink berry smoothie, add refined magenta/berry hues within the same midnight navy palette.',
  'Vertical 4:5 image, one centered large featured drink/food with breathing room around edges for crop, crisp high quality realistic photographic lighting. NO TEXT, NO LABELS, NO BRANDS, NO LOGOS, NO WORDMARKS, NO WATERMARK, NO FRAME, NO PHONE, NO BUTTONS, NO ILLUSTRATION, NO PEOPLE, NO HANDS.'
 ].filter(Boolean).join(' ');
}
async function loadPuter(){
 if(window.puter?.ai?.txt2img)return window.puter;
 if(puterLoad)return puterLoad;
 puterLoad=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://js.puter.com/v2/';script.async=true;
  script.onload=()=>window.puter?.ai?.txt2img?resolve(window.puter):reject(Error('Az AI-képgenerátor nem töltődött be.'));
  script.onerror=()=>reject(Error('A Puter AI nem érhető el. Ellenőrizd az internetkapcsolatot.'));
  document.head.append(script);
 }).catch(e=>{puterLoad=null;throw e});
 return puterLoad;
}
function showPortal(){
 if(!editing)return;
 portalPhotoData='';$('hhQuickPortalReference').value='';$('hhQuickPortalPrompt').value='';
 $('hhQuickPortalPreview').removeAttribute('src');$('hhQuickPortalPreview').hidden=true;
 $('hhQuickPortalEmpty').hidden=false;$('hhQuickUseImage').disabled=true;
 $('hhQuickPortalStatus').textContent='Képgenerálás: '+str($('hhQuickEditName').value||editing.name,80)+'. A forrásfotó opcionális.';
 shell.dataset.mode='portal';
}
async function describeReference(ai,file){
 if(!file)return '';
 if(file.size>8*1024*1024)throw Error('A forráskép legfeljebb 8 MB lehet.');
 const instruction='Describe ONLY visible food, drinks, composition, product form, color, packaging design and likely visual ingredients in this image in short, accurate English. Do not make up hidden facts, nutritional values, proprietary logos or product identity. Max 120 words. This description will be used to generate a photorealistic food product scene.';
 if(!ai.ai.chat)throw Error('A forrásfotó elemzése ehhez a Puter-fiókhoz nem elérhető. Próbáld fotó nélkül.');
 let response;
 try{response=await ai.ai.chat(instruction,file,false,{model:'gpt-5.6-luna',normalize:true,verbosity:'low'})}
 catch(_){response=await ai.ai.chat(instruction,file,false,{normalize:true})}
 let message=response?.message?.content||response;
 if(Array.isArray(message))message=message.map(x=>x?.text||String(x||'')).join(' ');
 if(message&&typeof message==='object')message=message.text||JSON.stringify(message);
 return str(message,800);
}
async function generatePortalImage(){
 if(portalBusy||!editing)return;
 portalBusy=true;$('hhQuickGenerateImage').disabled=true;$('hhQuickUseImage').disabled=true;
 $('hhQuickPortalStatus').textContent='Kapcsolódás a képgenerátorhoz…';
 try{
  const ai=await loadPuter(),file=$('hhQuickPortalReference').files?.[0]||null;
  let vision='';
  if(file){$('hhQuickPortalStatus').textContent='Forráskép elemzése…';vision=await describeReference(ai,file)}
  $('hhQuickPortalStatus').textContent='Léna komponálja a prémium GyorsNasi képet…';
  const prompt=imagePromptFor(editing,$('hhQuickPortalPrompt').value,vision);
  let image;
  try{image=await ai.ai.txt2img(prompt,{model:'gpt-image-2',ratio:{w:4,h:5},quality:'high'})}
  catch(first){
   const info=String(first?.message||first?.code||'').toLowerCase();
   if(/popup_blocked|auth_window_closed|unauthorized|auth_required|insufficient_funds|moderation/.test(info))throw first;
   image=await ai.ai.txt2img(prompt,{model:'gemini-3.1-flash-image',ratio:{w:4,h:5},quality:'1K'});
  }
  const src=image?.src||image?.url||(typeof image==='string'?image:'');
  if(!src||!/^data:image\/|^https?:\/\/|^blob:/.test(src))throw Error('A generátor nem adott használható képet.');
  const response=await fetch(src);
  if(!response.ok)throw Error('A generált kép nem tölthető le.');
  const blob=await response.blob();
  if(!blob.type.startsWith('image/'))throw Error('Nem megfelelő képformátumot kaptunk.');
  portalPhotoData=await compressImage(blob);
  $('hhQuickPortalPreview').src=portalPhotoData;
  $('hhQuickPortalPreview').hidden=false;$('hhQuickPortalEmpty').hidden=true;
  $('hhQuickUseImage').disabled=false;
  $('hhQuickPortalStatus').textContent='✓ Elkészült a GyorsNasi kép! A „Kép használata” gombbal teheted a recepthez.';
 }catch(e){
  $('hhQuickPortalStatus').textContent='Képgenerálási hiba: '+(e?.message||'ismeretlen hiba')+'. A saját fotó feltöltése továbbra is működik.';
 }finally{portalBusy=false;$('hhQuickGenerateImage').disabled=false}
}
function usePortalImage(){
 if(!portalPhotoData)return;
 photoData=portalPhotoData;photoRemoved=false;
 shell.dataset.mode='edit';
 $('hhQuickEditStatus').textContent='✓ AI-kép hozzáadva. Nyomd meg a „Recept mentése” gombot a véglegesítéshez.';
}

/* Lossless lazy migration for legacy embedded JPEGs. Publish binary first; only
 * then replace the inline copy. Failed uploads leave the original untouched.
 */
let migrating=false,lastMigrationError=0;
async function migrateLegacyPhotos(){
 const vault=window.HH_NUTRITION_IMAGE_V641;
 if(migrating||editSaving||!vault?.connected()||Date.now()-lastMigrationError<120000)return;
 migrating=true;
 const profile=api.getProfile();
 try{
  const queue=(api.getData().quickRecipes||[]).filter(r=>r&&typeof r.image==='string'&&r.image.startsWith('data:image/')&&!r.imageRef).slice(0,25);
  for(const old of queue){
   if(api.getProfile()!==profile)break;
   let jpeg=old.image;
   if(!jpeg.startsWith('data:image/jpeg;base64,')){
    // Previously saved PNG/WebP assets are still preserved inline until edited.
    continue;
   }
   const ref=await vault.save(profile,jpeg);
   const current=(api.getData().quickRecipes||[]).find(r=>r.id===old.id);
   if(current&&current.image===old.image&&!current.imageRef&&api.getProfile()===profile){
    api.saveRecipe({...current,imageRef:ref,image:'',updatedAt:new Date().toISOString()});
   }
  }
 }catch(err){
  lastMigrationError=Date.now();
  console.warn('HealthHub Nutrition photo migration deferred:',String(err?.message||'network error').slice(0,120));
 }finally{migrating=false}
}
window.addEventListener('healthhub:nutrition-updated',event=>{
 if(event.detail?.profile!==api.getProfile())return;
 if(dlg.open&&shell.dataset.mode==='wheel'&&!busy)showWheel(activeId);
 setTimeout(migrateLegacyPhotos,800);
});
window.addEventListener('healthhub:nutrition-sync-state',event=>{
 const detail=event.detail||{};
 if(detail.profile!==api.getProfile())return;
 showCloudState(detail.state||'pending',String(detail.message||'Szinkron állapotának ellenőrzése…').slice(0,150));
});
cloudManual?.addEventListener('click',async()=>{
 if(lastCloudState==='syncing')return;
 showCloudState('syncing','⟳ Szinkronizálás és frissítések ellenőrzése…');
 try{
  const complete=await api.syncNow();
  if(complete)showCloudState('synced','✓ Szinkron kész · központi Dropbox-mentés ellenőrizve');
  else if(!cloudReady())showCloudState('local','◌ Mentve helyben · Dropbox nincs csatlakoztatva');
  // Any server-side error is reported by the core's sync state event.
 }catch(error){showCloudState('error','⚠ Szinkronhiba: '+String(error?.message||'ismeretlen hiba').slice(0,110))}
});
resetCloudState();
window.addEventListener('online',()=>setTimeout(migrateLegacyPhotos,2500));
setTimeout(migrateLegacyPhotos,4500);

rail.addEventListener('pointerdown',()=>{scrollUser=true;activateAudio()},{passive:true});
rail.addEventListener('scroll',()=>{
 if(scrollTimer)clearTimeout(scrollTimer);
 const index=nearestIndex();
 if(index!==selection&&recipes[index]){
  selection=index;selectUI();
  if(scrollUser&&lastTick!==index){lastTick=index;tick();if(navigator.vibrate)navigator.vibrate(8)}
 }
 scrollTimer=setTimeout(()=>{scrollUser=false;lastTick=-1;selection=nearestIndex();selectUI()},160);
},{passive:true});
$('hhQuickLaunch').addEventListener('click',showDialog);
$('hhQuickClose').addEventListener('click',hideDialog);
$('hhQuickBack').addEventListener('click',()=>{if(shell.dataset.mode==='portal'){shell.dataset.mode='edit';return}shell.dataset.mode='wheel';showWheel(activeId)});
$('hhQuickEdit').addEventListener('click',()=>showEditor(recipes[selection]?.id));
$('hhQuickAdd').addEventListener('click',()=>showEditor(null,true));
$('hhQuickRecord').addEventListener('click',recordSelected);
$('hhQuickSuccessDone').addEventListener('click',()=>{$('hhQuickSuccess').dataset.open='false';hideDialog()});
$('hhQuickAgain').addEventListener('click',()=>{$('hhQuickSuccess').dataset.open='false';showWheel(activeId)});
$('hhQuickSound').addEventListener('click',()=>{const disabled=localStorage.getItem(keySound)==='off';localStorage.setItem(keySound,disabled?'on':'off');$('hhQuickSound').textContent=disabled?'♫':'🔇';if(disabled)tada()});
$('hhQuickImagePortalOpen').addEventListener('click',showPortal);
$('hhQuickPortalBack').addEventListener('click',()=>{shell.dataset.mode='edit'});
$('hhQuickGenerateImage').addEventListener('click',generatePortalImage);
$('hhQuickUseImage').addEventListener('click',usePortalImage);
$('hhQuickEditPhoto').addEventListener('change',onPhoto);
$('hhQuickRemovePhoto').addEventListener('click',()=>{photoData='';photoRemoved=true;$('hhQuickEditStatus').textContent='A saját kép levéve, a glassy alapillusztráció jelenik meg.'});
$('hhQuickEditorForm').addEventListener('submit',saveEdit);
dlg.addEventListener('cancel',e=>{if($('hhQuickSuccess').dataset.open==='true'){e.preventDefault();$('hhQuickSuccess').dataset.open='false'}});
window.addEventListener('healthhub:profile-changed',()=>{resetCloudState();if(dlg.open){$('hhQuickProfile').textContent=api.getProfile()==='monika'?'Mónika receptjei':'Zsolt receptjei';shell.dataset.mode='wheel';showWheel() }});
const profileBtn=$('profileBtn');if(profileBtn)profileBtn.addEventListener('click',()=>{resetCloudState();if(dlg.open)setTimeout(()=>{shell.dataset.mode='wheel';showWheel()},0)});
})();
