/* HealthHub Nutrition · Léna AI Scan v753
 * Separate full-page SPA route with approved Léna/Buddy hero and 1:1 scan viewport.
 * Explicit Puter photo analysis + Open Food Facts v3 barcode lookup; no automatic logging.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id),api=()=>w.HH_NUTRITION_QUICK_API,vision=()=>w.HH_FOOD_VISION_V750;
const PAGE='#lena-ai-scan',MEALS=['Reggeli','Tízórai','Ebéd','Uzsonna','Vacsora','Egyéb'];
let page=null,mode='food',stage='capture',stream=null,photo=null,photoUrl='',draft=null,editing=null,profile='',busy=false,requestId=0,fromTile=false;
let puterPromise=null,zxingPromise=null,model='',barcode='',unit='g',audio=null;
const mk=(tag,cls,text)=>{const e=d.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const fmt=n=>n==null||!Number.isFinite(n)?'—':Number(n).toLocaleString('hu-HU',{maximumFractionDigits:1});
const stamp=()=>new Date().toLocaleString('hu-HU',{dateStyle:'medium',timeStyle:'short'});
const mealByClock=()=>{const h=new Date().getHours();return h<10?'Reggeli':h<12?'Tízórai':h<15?'Ebéd':h<18?'Uzsonna':h<21?'Vacsora':'Egyéb'};
function playSound(which){
 try{
  audio=audio||new (w.AudioContext||w.webkitAudioContext)();audio.resume();
  const now=audio.currentTime,notes=which==='shutter'?[[530,0,.09],[330,.08,.08]]:
    which==='result'?[[523,0,.11],[659,.11,.13],[784,.23,.18]]:[[700,0,.10],[950,.1,.16]];
  for(const [hz,offset,duration] of notes){
   const o=audio.createOscillator(),g=audio.createGain();o.type=which==='shutter'?'triangle':'sine';o.frequency.value=hz;
   g.gain.setValueAtTime(.0001,now+offset);g.gain.exponentialRampToValueAtTime(.025,now+offset+.014);
   g.gain.exponentialRampToValueAtTime(.0001,now+offset+duration);
   o.connect(g);g.connect(audio.destination);o.start(now+offset);o.stop(now+offset+duration+.02);
  }
 }catch(_){}
}
function status(text,bad=false){const e=$('hhScanStatus753');e.textContent=text;e.dataset.error=String(bad)}
function valid(data){
 return !!data&&!!data.items?.length&&data.name?.trim()&&MEALS.includes($('hhScanMeal753').value)&&
 data.items.every(x=>x.name?.trim()&&Number.isFinite(x.grams)&&x.grams>=1&&x.grams<=3000&&
  ['kcal','protein','carbs','fat'].every(k=>x.per[k]!==null&&Number.isFinite(x.per[k])&&x.per[k]>=0&&x.per[k]<=(k==='kcal'?950:100)));
}
function stageTo(next){
 stage=next;page.dataset.stage=next;
 $('hhScanProcessing753').hidden=next!=='scanning';
 $('hhScanButton753').disabled=busy;
 $('hhScanSave753').disabled=busy||!valid(draft);
}
function cameraOff(){
 if(stream){for(const t of stream.getTracks())t.stop();stream=null}
 const video=$('hhScanVideo753');if(video){video.pause();video.srcObject=null;video.hidden=true}
}
function clearPhoto(){
 if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=''}
 photo=null;const img=$('hhScanPhoto753');img.hidden=true;img.removeAttribute('src');
}
function preview(){
 $('hhScanPhoto753').hidden=!photo;
 $('hhScanVideo753').hidden=!!photo||!stream;
 $('hhScanEmpty753').hidden=!!photo||!!stream;
}
async function cameraOn(){
 if(page.hidden||stream||photo||editing||!w.navigator?.mediaDevices?.getUserMedia)return;
 try{
  const current=await w.navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:1280}}});
  if(page.hidden||photo){current.getTracks().forEach(x=>x.stop());return}
  stream=current;const video=$('hhScanVideo753');video.srcObject=current;
  await video.play();preview();
 }catch(_){cameraOff();status('Kamera nem érhető el. Válassz saját képet vagy engedélyezd a hozzáférést.')}
}
async function squareFile(source){
 let image,srcUrl='';
 if(source?.videoWidth&&source?.videoHeight)image=source;
 else{
  if(!source||source.size>9*1024*1024)throw Error('A kép maximum 9 MB lehet.');
  if(!/^image\/(jpeg|png|webp)$/.test(source.type))throw Error('JPEG, PNG vagy WebP kép szükséges.');
  image=new Image();srcUrl=URL.createObjectURL(source);
  try{image.src=srcUrl;await image.decode()}finally{URL.revokeObjectURL(srcUrl)}
 }
 const width=image.videoWidth||image.naturalWidth,height=image.videoHeight||image.naturalHeight;
 if(!width||!height)throw Error('A kép mérete ismeretlen.');
 const size=Math.min(width,height),canvas=d.createElement('canvas');canvas.width=960;canvas.height=960;
 canvas.getContext('2d').drawImage(image,(width-size)/2,(height-size)/2,size,size,0,0,960,960);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Képátalakítás sikertelen.')),'image/jpeg',.86));
 return new File([blob],'lena-scan-square.jpg',{type:'image/jpeg'});
}
async function ownImage(file){
 if(busy)return;
 try{
  const f=await squareFile(file);clearPhoto();photo=f;photoUrl=URL.createObjectURL(f);
  $('hhScanPhoto753').src=photoUrl;cameraOff();preview();draft=null;editing=null;
  stageTo('capture');status('A négyzetes fotó betöltve. Koppints a SCAN gombra.');
 }catch(e){status('⚠ '+String(e.message||e),true)}
}
function gtin(raw){
 const code=String(raw||'').replace(/[\s-]/g,'');
 if(!/^(\d{8}|\d{12,14})$/.test(code))return null;
 const arr=code.split('').map(Number),digit=arr.pop();let total=0;
 for(let i=arr.length-1,m=3;i>=0;i--,m=m===3?1:3)total+=arr[i]*m;
 return (10-total%10)%10===digit?code:null;
}
function nutrients(raw){
 const n=(key)=>{const a=raw?.[key];return a===null||a===undefined||a===''?null:Number(a)};
 const kcal=n('energy-kcal_100g'),kj=n('energy-kj_100g');
 return {kcal:kcal!==null&&Number.isFinite(kcal)?kcal:kj!==null&&Number.isFinite(kj)?Math.round(kj/4.184*10)/10:null,
  protein:n('proteins_100g'),carbs:n('carbohydrates_100g'),fat:n('fat_100g')};
}
function product(data,code){
 if(!data?.product||data.status==='failure'||data.status===0)throw Error('A termék nem szerepel az Open Food Facts adatbázisában.');
 const p=data.product,name=String(p.product_name_hu||p.product_name||'').trim().slice(0,85);
 if(!name)throw Error('A termék nevét még nem töltötték fel az adatbázisba.');
 const quantity=String(p.quantity||'').replace(',','.'),match=quantity.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|dl|l)\b/i);
 const u=match&&['ml','cl','dl','l'].includes(match[2].toLowerCase())?'ml':'g';
 let grams=match?Math.round(Number(match[1])*({kg:1000,g:1,ml:1,cl:10,dl:100,l:1000}[match[2].toLowerCase()])):100;
 if(!Number.isFinite(grams)||grams<1||grams>3000)grams=100;
 const per=nutrients(p.nutriments);
 for(const k of Object.keys(per))if(per[k]!==null&&(!Number.isFinite(per[k])||per[k]<0||per[k]>(k==='kcal'?950:100)))per[k]=null;
 return {name,items:[{name,grams,per,uncertain:!match}],code,unit:u,model:'Open Food Facts v3',
  notes:'Open Food Facts · '+code+' · Ellenőrizd a termékcímkét, a nyilvános adatok hiányosak lehetnek.'};
}
async function lookup(raw){
 const code=gtin(raw);if(!code)throw Error('Érvénytelen EAN/GTIN. Írd be a csomagoláson lévő 8, 12, 13 vagy 14 jegyű kódot.');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14000);
 try{
  const url='https://world.openfoodfacts.org/api/v3/product/'+code+'?cc=hu&lc=hu&fields=code,product_name,product_name_hu,quantity,nutriments';
  const response=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});
  if(response.status===404)throw Error('Ehhez a kódhoz még nincs termékadat.');
  if(!response.ok)throw Error('Open Food Facts nem elérhető ('+response.status+').');
  return product(await response.json(),code);
 }finally{clearTimeout(timer)}
}
function loadScript(url,ready){
 return new Promise((resolve,reject)=>{
  if(ready())return resolve();
  const s=d.createElement('script');s.src=url;s.async=true;
  s.onload=()=>ready()?resolve():reject(Error('A szükséges szolgáltatás nem indult el.'));
  s.onerror=()=>reject(Error('A szolgáltatás nem tölthető be.'));d.head.append(s);
 });
}
async function readBarcode(file){
 if(w.BarcodeDetector){
  try{
   const detector=new w.BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','itf','code_128']});
   const bitmap=await createImageBitmap(file);
   try{const values=await detector.detect(bitmap);for(const row of values){const code=gtin(row.rawValue);if(code)return code}}
   finally{bitmap.close?.()}
  }catch(_){}
 }
 if(!zxingPromise)zxingPromise=loadScript('https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',()=>!!w.ZXing?.BrowserMultiFormatReader).catch(e=>{zxingPromise=null;throw e});
 await zxingPromise;
 const reader=new w.ZXing.BrowserMultiFormatReader(),url=URL.createObjectURL(file);
 try{
  const found=await reader.decodeFromImageUrl(url),code=gtin(found?.getText?.()||found?.text);
  if(!code)throw Error('Nem GTIN vonalkód.');
  return code;
 }catch(_){throw Error('Nem sikerült leolvasni a vonalkódot. Próbáld újra, vagy írd be a számát.')}
 finally{URL.revokeObjectURL(url);reader.reset?.()}
}
async function puter(){
 if(w.puter?.ai?.chat&&w.puter?.ai?.listModels)return w.puter;
 if(!puterPromise)puterPromise=loadScript('https://js.puter.com/v2/',()=>!!w.puter?.ai?.chat&&!!w.puter?.ai?.listModels).then(()=>w.puter).catch(e=>{puterPromise=null;throw e});
 return puterPromise;
}
function prompt(){return [
 'Te Léna vagy, a magyar HealthHub ételfelismerője. Azonosítsd a képen látható ételeket magyarul.',
 'Csak látható összetevőket írj. Olajat, cukrot, szószt ne találj ki. A grammszám és a tápérték becslés.',
 'Minden összetevőnél per100 objektum: kcal, protein, carbs, fat, 100 grammonként. Ismeretlen érték null, nem nulla.',
 'A válasz kizárólag JSON:',
 '{"name":"felismert étel","items":[{"name":"rizs","grams":150,"per100":{"kcal":130,"protein":2.7,"carbs":28,"fat":0.3},"uncertain":true}],"notes":"A fotóból a pontos mennyiség nem látható."}'
 ].join('\n')}
async function recognize(file){
 const p=await puter(),models=await vision().availableModels(p);
 if(!models.length)throw Error('Jelenleg nincs elérhető multimodális Puter-modell.');
 let last=null;
 for(const chosen of models){
  model=chosen;
  try{
   const result=await p.ai.chat(prompt(),file,false,{model:chosen,normalize:true,max_tokens:2400});
   return {...vision().parse(result),code:null,unit:'g',model:chosen};
  }catch(e){last=e;if(!/model.*(unavailable|not found|not supported)|unknown model|vision.*not supported/i.test(String(e.message||e)))throw e}
 }
 throw last||Error('Az AI felismerés nem sikerült.');
}
function refresh(){
 if(!draft)return;
 const sums=vision().totals(draft.items),total=draft.items.reduce((s,x)=>s+(Number.isFinite(x.grams)?x.grams:0),0);
 $('hhScanKcal753').textContent=fmt(sums.kcal);$('hhScanWeight753').textContent=fmt(total)+' '+unit;
 for(const key of ['protein','carbs','fat'])$('hhScan_'+key+'753').textContent=fmt(sums[key])+' g';
 $('hhScanSave753').disabled=busy||!valid(draft);
}
function showResult(data,withSound=true){
 draft=data;barcode=data.code||'';unit=data.unit||'g';
 $('hhScanName753').value=data.name;$('hhScanDate753').textContent=stamp();
 $('hhScanOrigin753').textContent=barcode?'📦 Open Food Facts · '+barcode:'✨ Puter AI fotófelismerés · '+(data.model||model);
 $('hhScanNotes753').textContent=data.notes||'A fotó alapján az adag csak becsülhető.';
 const box=$('hhScanIngredients753');box.replaceChildren();
 data.items.forEach((item,i)=>{
  const card=mk('details','hhScanIngredient753'),header=mk('summary','hhScanIngredientTitle753');
  header.append(mk('strong','',item.name),mk('span','',fmt(item.grams)+' '+unit),mk('b','','✎'));card.append(header);
  const grid=mk('div','hhScanIngredientGrid753');
  for(const [key,label] of [['name','Összetevő'],['grams','Adag ('+unit+')'],['kcal','kcal / 100 '+unit],['protein','Fehérje / 100 '+unit],['carbs','Szénhidrát / 100 '+unit],['fat','Zsír / 100 '+unit]]){
   const holder=mk('label','',label),field=mk('input');field.type=key==='name'?'text':'number';field.inputMode=key==='name'?'text':'decimal';
   field.dataset.i=i;field.dataset.key=key;field.min=key==='grams'?'1':'0';field.max=key==='grams'?'3000':key==='kcal'?'950':'100';field.step=key==='grams'?'1':'0.1';
   field.value=key==='name'?item.name:key==='grams'?item.grams:item.per[key]??'';
   holder.append(field);grid.append(holder);
  }
  if(item.uncertain)grid.append(mk('small','hhScanUncertain753','⚠ A mennyiség ellenőrzendő.'));
  const del=mk('button','hhScanDelete753','× Összetevő törlése');del.type='button';
  del.onclick=()=>{if(draft.items.length<=1)return status('Legalább egy összetevő szükséges.',true);draft.items.splice(i,1);showResult(draft,false)};
  grid.append(del);card.append(grid);box.append(card);
 });
 cameraOff();stageTo('result');refresh();
 if(withSound)playSound('result');
 status(barcode?'Termék megtalálva. Ellenőrizd az adatokat a csomagoláson.':'Felismerés kész. Ellenőrizd az adagokat és a tápértéket.');
 $('hhScanResultShell753').scrollIntoView?.({behavior:'smooth',block:'nearest'});
}
function editField(e){
 const el=e.target,i=Number(el.dataset.i),key=el.dataset.key,item=draft?.items?.[i];if(!item||!key)return;
 if(key==='name')item.name=el.value.slice(0,85);
 else if(key==='grams')item.grams=el.value===''?NaN:Number(el.value);
 else item.per[key]=el.value===''?null:Number(el.value);
 const card=el.closest('details'),head=card?.querySelector('summary');
 if(head){head.querySelector('strong').textContent=item.name||'Név hiányzik';head.querySelector('span').textContent=fmt(item.grams)+' '+unit}
 refresh();
}
async function scan(){
 if(busy||stage==='saved')return;
 playSound('shutter');busy=true;const serial=++requestId;
 stageTo('scanning');status(mode==='barcode'?'Vonalkód beolvasása…':'Léna elemzi a fotót…');
 try{
  if(profile!==api()?.getProfile())throw Error('A profil megváltozott.');
  let data;
  if(mode==='barcode'&&$('hhScanManual753').value.trim())data=await lookup($('hhScanManual753').value.trim());
  else {
   const f=photo||await squareFile($('hhScanVideo753'));
   if(!photo){photo=f;photoUrl=URL.createObjectURL(f);$('hhScanPhoto753').src=photoUrl;preview();}
   if(mode==='barcode'){
    const found=await readBarcode(f);$('hhScanManual753').value=found;data=await lookup(found);
   }else data=await recognize(f);
  }
  if(serial===requestId&&!page.hidden)showResult(data);
 }catch(e){if(serial===requestId){stageTo('capture');status('⚠ '+String(e.message||e),true)}}
 finally{if(serial===requestId){busy=false;stageTo(stage)}}
}
function save(){
 if(busy||profile!==api()?.getProfile())return status('A profil megváltozott. Indíts új felismerést.',true);
 if(draft)draft.name=$('hhScanName753').value.trim();
 if(!valid(draft))return status('Ellenőrizd a hiányzó vagy hibás tápértékadatokat.',true);
 try{
  const result=api().recordAiMeal({expectedProfile:profile,id:editing?.id||null,name:draft.name,meal:$('hhScanMeal753').value,
   kind:unit==='ml'?'drink':'food',unit,barcode,
   components:draft.items.map(x=>({name:x.name,grams:x.grams,per100:{...x.per},uncertain:x.uncertain})),
   model:draft.model||model||'Open Food Facts v3',notes:draft.notes||''});
  stageTo('saved');$('hhScanSavedStamp753').textContent=stamp()+' · '+(profile==='monika'?'Mónika':'Zsolt')+' · '+result.name;
  status('✓ Rögzítve a Nutrition naplóba.');playSound('saved');
 }catch(e){status('Mentési hiba: '+String(e.message||e),true)}
}
function reset(modeNext){
 mode=modeNext;editing=null;draft=null;barcode='';unit='g';
 $('hhScanManualRow753').hidden=mode!=='barcode';$('hhScanManual753').value='';
 $('hhScanTabFood753').setAttribute('aria-selected',String(mode==='food'));
 $('hhScanTabBarcode753').setAttribute('aria-selected',String(mode==='barcode'));
 $('hhScanViewport753').dataset.mode=mode;
 $('hhScanModeTitle753').textContent=mode==='barcode'?'Irányítsd a vonalkódot a keretbe':'Irányítsd a kamerát az ételre';
 stageTo('capture');
 status(mode==='barcode'?'Fotózd a vonalkódot, vagy add meg a számát.':'Fotózz, vagy válassz képet a galériából.');
}
function syncProfile(){
 const next=api()?.getProfile()||'zsolt';page.dataset.profile=next;
 $('hhScanProfile753').textContent=(next==='monika'?'Mónika':'Zsolt')+' ⇄';
 if(profile&&next!==profile){draft=null;editing=null;clearPhoto();reset(mode);status('Profilváltás: a korábbi felismerés nem lett mentve.')}
 profile=next;
}
function route(){
 if(!page)return;
 const active=w.location.hash===PAGE;
 page.hidden=!active;d.body.classList.toggle('hhScanOpen753',active);
 if(active){syncProfile();w.scrollTo?.(0,0);cameraOn()}else{requestId++;busy=false;cameraOff();clearPhoto()}
}
function open(row=null){
 if(!page)init();if(!page)return;
 // Editing an already saved record must never prompt for camera permission.
 if(row?.aiVision)editing=row;
 if(w.location.hash!==PAGE){fromTile=true;w.history.pushState({hhScan:true},'',PAGE)}
 route();
 if(row?.aiVision){
  reset(row.aiVision.barcode?'barcode':'food');editing=row;
  $('hhScanManual753').value=row.aiVision.barcode||'';$('hhScanMeal753').value=row.meal;
  showResult({name:row.name,model:row.aiVision.model||'',code:row.aiVision.barcode||'',unit:row.aiVision.unit||'g',notes:row.aiVision.notes||'',
   items:row.aiVision.components.map(x=>({name:x.name,grams:x.grams,per:{...x.per100},uncertain:!!x.uncertain}))},false);
 }else{$('hhScanMeal753').value=mealByClock();reset('food')}
}
function close(){
 if(busy)return;
 if(fromTile&&w.location.hash===PAGE){fromTile=false;w.history.back()}
 else{w.history.replaceState({},'',w.location.pathname+w.location.search);route()}
}
function init(){
 if(page||!$('hhBevitelAI')||!api()?.recordAiMeal)return;
 page=$('hhLenaScanPage753');if(!page)return;
 $('hhScanBack753').onclick=close;
 $('hhScanProfile753').onclick=()=>{$('profileBtn')?.click();syncProfile()};
 $('hhScanTabFood753').onclick=()=>reset('food');
 $('hhScanTabBarcode753').onclick=()=>reset('barcode');
 $('hhScanButton753').onclick=()=>{void scan()};
 $('hhScanOwn753').onclick=()=>$('hhScanFile753').click();
 $('hhScanFile753').onchange=e=>{const f=e.target.files?.[0];if(f)void ownImage(f);e.target.value=''};
 $('hhScanManualGo753').onclick=()=>{if(!busy){mode='barcode';void scan()}};
 $('hhScanManual753').onkeydown=e=>{if(e.key==='Enter'&&!busy){e.preventDefault();void scan()}};
 $('hhScanSave753').onclick=save;
 $('hhScanAgain753').onclick=()=>{editing=null;clearPhoto();reset(mode);void cameraOn()};
 $('hhScanEdit753').onclick=()=>{const first=$('hhScanIngredients753').querySelector('details');if(first){first.open=true;first.scrollIntoView({behavior:'smooth',block:'center'})}};
 $('hhScanIngredients753').addEventListener('input',editField);
 $('hhScanName753').addEventListener('input',e=>{if(draft){draft.name=e.target.value;refresh()}});
 $('hhScanMeal753').addEventListener('change',refresh);
 $('hhBevitelAI').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true);
 if(vision())vision().open=open;
 w.addEventListener('popstate',route);w.addEventListener('hashchange',route);
 w.addEventListener('healthhub:profile-changed',()=>{if(!page.hidden)syncProfile()});
 route();
}
w.HH_LENA_AI_SCAN_V753={version:'753',gtin,nutrients,product,lookup,open,init};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);