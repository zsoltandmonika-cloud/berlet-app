/* HealthHub Nutrition v1175 · Interfood ételeim
 * Separate internal view; user-supplied image and item data only.
 * Saved cards are profile-private in the existing revision-safe Dropbox Nutrition
 * journal. Creating a card NEVER logs a meal; the separate log action does.
 */
(function(root,doc){
'use strict';
const KEYS=['kcal','protein','carbs','fat'];
const by=id=>doc?.getElementById(id);
const api=()=>root.HH_NUTRITION_QUICK_API;
const vault=()=>root.HH_NUTRITION_IMAGE_V641;
const shared=()=>root.HH_SHARED_FOOD_LIBRARY_V1118;
const profileName=p=>p==='monika'?'Mónika':'Zsolt';
let owner='',editing=null,photoData=null,busy=false,previousOverflow='',statusTimer=null;
const numberString=x=>x==null?'—':Number(x).toLocaleString('hu-HU',{maximumFractionDigits:2});
function makeId(){
 return (root.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2))
  .toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,64);
}
function parseMenuCopy(value){
 const input=String(value||'').slice(0,4000);
 const lines=input.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const m=input.match(/\b([A-Z]{1,4}\d{1,3}K?)\s*[-–:]\s*([^\n]{2,80})/i);
 const code=m?m[1].toUpperCase():(lines[0]?.match(/^([A-Z]{1,4}\d{1,3}K?)$/i)?.[1]?.toUpperCase()||'');
 const name=m?m[2].trim().slice(0,80):
  (lines.find(line=>line.length>6&&!/^([A-Z]{1,4}\d{1,3}K?)$/i.test(line)&&
   !/(\b(kcal|fehérje|szénhidrát|szénh|zsír|ft)\b|\b\d{1,4}\s*g\b)/i.test(line))||'').slice(0,80);
 function val(re){
  const found=input.match(re);
  if(!found)return null;
  const n=Number(found[1].replace(',','.'));
  return Number.isFinite(n)&&n>=0?n:null;
 }
 return {code,name,nutrients:{
  kcal:val(/(\d+(?:[.,]\d+)?)\s*kcal\b/i),
  protein:val(/(\d+(?:[.,]\d+)?)\s*g\s*fehérje\b/i),
  carbs:val(/(\d+(?:[.,]\d+)?)\s*g\s*(?:szénhidrát|szénh\.?)\b/i),
  fat:val(/(\d+(?:[.,]\d+)?)\s*g\s*zsír\b/i)
 }};
}
function scale(nutrients,servings){
 const n=Number(servings),out={};
 for(const key of KEYS){
  const raw=nutrients?.[key];
  out[key]=raw==null||raw===''?null:Number((Number(raw)*n).toFixed(2));
 }
 return out;
}
function notice(message,state='info'){
 const el=by('hhIfNotice1175');
 if(el){el.textContent=message;el.dataset.state=state;}
}
function pageToast(message,state='success'){
 const el=by('hhIfToast1175');
 if(!el)return;
 el.textContent=message;el.dataset.state=state;el.hidden=false;
 if(statusTimer)root.clearTimeout?.(statusTimer);
 statusTimer=root.setTimeout?.(()=>{el.hidden=true;},5500);
}
function getValues(){
 const n={};
 for(const key of KEYS){
  const s=by('hhIf'+key[0].toUpperCase()+key.slice(1)+'1175').value.trim();
  n[key]=s===''?null:Number(s.replace(',','.'));
 }
 return n;
}
function setValues(nutrients){
 for(const key of KEYS){
  const value=nutrients?.[key];
  by('hhIf'+key[0].toUpperCase()+key.slice(1)+'1175').value=value==null?'':String(value);
 }
}
function updatePreview(){
 const name=by('hhIfName1175').value.trim(),code=by('hhIfCode1175').value.trim();
 by('hhIfCardTitle1175').textContent=name||'Választott Interfood étel';
 by('hhIfCardCode1175').textContent=code||'INTERFOOD';
 const n=getValues();
 for(const key of KEYS)by('hhIfPreview'+key[0].toUpperCase()+key.slice(1)+'1175').textContent=numberString(n[key]);
}
function validData(){
 if(api()?.getProfile?.()!==owner)throw Error('A Nutrition profil időközben megváltozott. Nyisd meg újra a kártyát.');
 const name=by('hhIfName1175').value.trim().slice(0,80);
 const code=by('hhIfCode1175').value.trim().toUpperCase();
 const menuDate=by('hhIfMenuDate1175').value;
 const weightRaw=by('hhIfWeight1175').value;
 const weightGrams=weightRaw===''?null:Number(weightRaw);
 const meal=by('hhIfMeal1175').value;
 const nutrients=getValues();
 if(name.length<2)throw Error('Az étel neve kötelező.');
 if(code&&!/^[A-Z0-9]{1,8}$/.test(code))throw Error('Hibás ételkód.');
 if(weightGrams!=null&&(!Number.isFinite(weightGrams)||weightGrams<1||weightGrams>3000))
  throw Error('Hibás tálalási tömeg.');
 for(const key of KEYS){
  const n=nutrients[key];
  if(n!=null&&(!Number.isFinite(n)||n<0||n>(key==='kcal'?5000:1000)))
   throw Error('Hibás tápérték: '+key);
 }
 return {expectedProfile:owner,id:editing?.id||undefined,name,code,menuDate,weightGrams,meal,nutrients};
}
function resetEditor(card=null){
 editing=card;
 by('hhIfCode1175').value=card?.code||'';
 by('hhIfName1175').value=card?.name||'';
 by('hhIfMenuDate1175').value=card?.menuDate||'';
 by('hhIfWeight1175').value=card?.weightGrams??'';
 by('hhIfMeal1175').value=card?.meal||'Ebéd';
 by('hhIfPaste1175').value='';
 by('hhIfPhoto1175').value='';
 by('hhIfSaveFood1175').checked=true;
 by('hhIfSaveFavorite1175').checked=true;
 by('hhIfSaveFamily1175').checked=false;
 setValues(card?.nutrients||null);
 photoData=null;
 by('hhIfCardPhoto1175').hidden=true;
 by('hhIfCardPhoto1175').removeAttribute('src');
 by('hhIfCardPlaceholder1175').hidden=false;
 by('hhIfPhotoCaption1175').textContent='Saját fotó feltöltése (opcionális)';
 by('hhIfEditHeading1175').textContent=card?'Interfood ételkártya szerkesztése':'Új Interfood ételkártya';
 notice(card?'A meglévő kártyát szerkeszted.':'A kártya mentése nem rögzít automatikusan ebédet.');
 updatePreview();
 if(card?.imageRef)loadImage(by('hhIfCardPhoto1175'),card.imageRef,owner,()=>{
  by('hhIfCardPlaceholder1175').hidden=true;
  by('hhIfCardPhoto1175').hidden=false;
 });
}
async function preparePhoto(){
 const file=by('hhIfPhoto1175').files?.[0];
 if(!file)return;
 if(!/^image\/(?:jpeg|png|webp)$/.test(file.type)||file.size>5_000_000){
  notice('JPEG, PNG vagy WebP fotót válassz, legfeljebb 5 MB méretben.','error');return;
 }
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>36_000_000)
   throw Error('A kép túl nagy felbontású.');
  const factor=Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=doc.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const result=canvas.toDataURL('image/jpeg',.8);
  if(result.length>940000)throw Error('A képet nem sikerült megfelelően tömöríteni.');
  photoData=result;
  by('hhIfCardPhoto1175').src=result;
  by('hhIfCardPhoto1175').hidden=false;
  by('hhIfCardPlaceholder1175').hidden=true;
  by('hhIfPhotoCaption1175').textContent='Fotó előkészítve: privát felhőmentés a kártyával';
  notice('Fotó előkészítve, a kártya mentésével feltöltjük.');
 }catch(err){notice(String(err.message||err),'error');}
 finally{URL.revokeObjectURL(url);}
}
async function loadImage(img,ref,profile,ready){
 const v=vault();
 if(!v?.refValid?.(profile,ref)||!v.load)return;
 const key=String(ref.sha256||'');
 img.dataset.photoKey=key;
 try{
  const src=await v.load(profile,ref);
  if(img.dataset.photoKey!==key||!img.isConnected||api()?.getProfile?.()!==profile)return;
  img.src=src;img.hidden=false;if(ready)ready();
 }catch(_){/* photo can be missing while offline; the saved card stays intact */}
}
function cards(){return api()?.getInterfoodCards?.()||[];}
async function renderCards(){
 const host=by('hhIfCards1175'),query=by('hhIfSearch1175').value.trim().toLocaleLowerCase('hu-HU');
 if(!host)return;
 const all=cards().filter(card=>(card.name+' '+card.code).toLocaleLowerCase('hu-HU').includes(query));
 host.replaceChildren();
 by('hhIfCardCount1175').textContent=all.length+' kártya';
 if(!all.length){
  const empty=doc.createElement('div');
  empty.className='hh-if-empty-v1175';
  empty.innerHTML='<strong>🍱 Még nincs mentett Interfood ételkártya</strong><small>Nyisd meg az Interfood étlapot, majd itt készíts fotós kártyát az ételhez.</small>';
  host.append(empty);
  return;
 }
 for(const card of all){
  const item=doc.createElement('article');item.className='hh-if-food-card-v1175';
  const frame=doc.createElement('div');frame.className='hh-if-food-art-v1175';
  const emoji=doc.createElement('span');emoji.textContent='🍱';frame.append(emoji);
  if(card.imageRef){
   const img=doc.createElement('img');img.alt='';img.hidden=true;img.loading='lazy';frame.append(img);
   loadImage(img,card.imageRef,owner);
  }
  const info=doc.createElement('div');info.className='hh-if-food-info-v1175';
  const code=doc.createElement('small');code.textContent=(card.code||'INTERFOOD')+(card.menuDate?' · '+card.menuDate:'');
  const title=doc.createElement('strong');title.textContent=card.name;
  const macro=doc.createElement('p');macro.textContent=numberString(card.nutrients?.kcal)+' kcal · F '+numberString(card.nutrients?.protein)+' g · CH '+numberString(card.nutrients?.carbs)+' g · Zs '+numberString(card.nutrients?.fat)+' g';
  const actions=doc.createElement('div');actions.className='hh-if-card-actions-v1175';
  const edit=doc.createElement('button');edit.type='button';edit.textContent='✎ Kártya';edit.setAttribute('aria-label',card.name+' kártyájának megnyitása');
  edit.addEventListener('click',()=>openEditor(card));
  const log=doc.createElement('button');log.type='button';log.textContent='✓ Napi naplóba';
  log.className='hh-if-log-v1175';log.setAttribute('aria-label',card.name+' egy adag naplózása');
  log.addEventListener('click',()=>logCard(card,log));
  actions.append(edit,log);info.append(code,title,macro,actions);item.append(frame,info);host.append(item);
 }
}
function openLibrary(){
 if(!api()?.getInterfoodCards){root.alert?.('Frissítsd a Nutrition oldalt a kártyatár betöltéséhez.');return;}
 owner=api().getProfile();
 by('hhIfActiveProfile1175').textContent=profileName(owner);
 previousOverflow=doc.body.style.overflow;
 doc.body.style.overflow='hidden';
 by('hhInterfoodLibraryV1175').hidden=false;
 by('hhIfSearch1175').value='';
 renderCards();
}
function closeLibrary(){
 by('hhInterfoodLibraryV1175').hidden=true;
 doc.body.style.overflow=previousOverflow;
}
function openEditor(card){
 if(api()?.getProfile?.()!==owner){pageToast('Profilváltás történt. Nyisd meg újra az Interfood ételeimet.','error');return;}
 resetEditor(card);
 by('hhInterfoodDialogV1175').showModal();
}
function recognize(){
 const parsed=parseMenuCopy(by('hhIfPaste1175').value);
 if(parsed.code)by('hhIfCode1175').value=parsed.code;
 if(parsed.name)by('hhIfName1175').value=parsed.name;
 for(const key of KEYS)if(parsed.nutrients[key]!=null)
  by('hhIf'+key[0].toUpperCase()+key.slice(1)+'1175').value=String(parsed.nutrients[key]);
 updatePreview();
 notice(parsed.name?'Az ételadatok átvéve. Ellenőrizd a tápértékeket.':
  'Nem minden adat felismerhető. A hiányzó mezőket kézzel egészítsd ki.',parsed.name?'info':'warning');
}
async function saveCard(event){
 event?.preventDefault?.();
 if(busy)return;
 let data;
 try{data=validData();}catch(err){notice(String(err.message||err),'error');return;}
 busy=true;by('hhIfSave1175').disabled=true;
 const own=by('hhIfSaveFood1175').checked,favorite=by('hhIfSaveFavorite1175').checked,
  family=by('hhIfSaveFamily1175').checked;
 const warnings=[],done=[];
 notice('Interfood ételkártya mentése…');
 let result;
 try{
  result=api().saveInterfoodCard(data);
  if(!result?.id||result.profile!==owner)throw Error('A kártyamentés nem igazolható.');
 }catch(err){notice('Nem sikerült a kártya mentése: '+String(err.message||err),'error');
  busy=false;by('hhIfSave1175').disabled=false;return;
 }
 // The private saved card is canonical; any additional stores are best effort.
 const nutrient=data.nutrients;
 let photoRef=editing?.imageRef||null;
 if(photoData){
  try{
   if(!vault()?.connected())throw Error('A képfeltöltéshez Dropbox-kapcsolat szükséges.');
   if(api()?.getProfile?.()!==owner)throw Error('Profilváltás történt.');
   photoRef=await vault().save(owner,photoData);
   api().attachInterfoodCardPhoto({expectedProfile:owner,cardId:result.id,imageRef:photoRef});
  }catch(err){warnings.push('Fotó: '+String(err.message||err));}
 }
 const ready=KEYS.every(key=>nutrient[key]!=null);
 if((own||favorite)&&nutrient.kcal==null)
  warnings.push('Saját étel/Kedvencek mentéshez legalább kcal szükséges.');
 else if(api()?.getProfile?.()===owner){
  if(own){
   if(data.weightGrams==null){
    warnings.push('Saját ételek: a 100 g-os értékhez a tényleges adagsúly kell.');
   }else{
    try{
     api().saveManualFood({expectedProfile:owner,name:data.name,
      category:'Interfood',quantity:data.weightGrams,unit:'g',nutrients:nutrient,imageRef:photoRef});
     done.push('Saját ételek');
    }catch(err){warnings.push('Saját ételek: '+String(err.message||err));}
   }
  }
  if(favorite){
   try{
    api().saveRecipe({id:'quick:interfood-'+makeId(),name:data.name,
     category:'Interfood',meal:data.meal,kind:'food',icon:'🍱',theme:'meal',
     description:'Interfood · 1 adag'+(data.code?' · '+data.code:''),
     ingredients:'Interfood ételkártyából',nutrients:nutrient,
     imageRef:photoRef,archived:false,order:700});
    done.push('Kedvencek');
   }catch(err){warnings.push('Kedvencek: '+String(err.message||err));}
  }
 }
 if(family){
  if(!ready)warnings.push('Családi ételtár: mind a 4 tápérték szükséges.');
  else if(api()?.getProfile?.()!==owner)warnings.push('Családi mentés profilváltás miatt kimaradt.');
  else{
   try{
    let sharedRef=null;
    if(photoData&&vault()?.connected()){
     try{sharedRef=await vault().save('shared',photoData);}
     catch(err){warnings.push('Családi fotó: '+String(err.message||err));}
    }
    await shared().upsert({name:data.name,categories:['Interfood'],favorite:true,
     kind:'food',meal:data.meal,nutrients:nutrient,imageRef:sharedRef,
     description:'Interfood · 1 adag',ingredients:'Interfood ételkártyából'});
    done.push('Családi ételtár');
   }catch(err){warnings.push('Családi ételtár: '+String(err.message||err));}
  }
 }
 if(api()?.getProfile?.()!==owner)warnings.push('Profilváltás után a további kártyamentést megszakítottam.');
 by('hhInterfoodDialogV1175').close();
 if(api()?.getProfile?.()===owner)renderCards();
 pageToast('✅ Interfood kártya mentve'+(done.length?' · '+done.join(', '):'')+
  (warnings.length?' ⚠ '+warnings.join(' '):''),warnings.length?'warning':'success');
 busy=false;by('hhIfSave1175').disabled=false;
}
function logCard(card,button){
 if(busy||button.disabled)return;
 const actual=api()?.getInterfoodCards?.().find(x=>x.id===card.id);
 if(!actual||api()?.getProfile?.()!==owner){pageToast('A profil vagy a kártya megváltozott.','error');return;}
 button.disabled=true;
 try{
  const saved=api().recordInterfoodCard({expectedProfile:owner,cardId:card.id,
   token:'if_'+makeId(),portions:1,meal:card.meal||'Ebéd'});
  if(!saved?.id||saved.profile!==owner)throw Error('A napló mentése nem igazolható.');
  pageToast('🎉 TADAAA! '+card.name+' · 1 adag a Napi naplóba mentve.');
 }catch(err){pageToast(String(err.message||err),'error');}
 finally{root.setTimeout?.(()=>{button.disabled=false;},1200);}
}
function deleteCard(){
 const card=editing;if(!card)return;
 if(!root.confirm?.('Biztosan törlöd ezt az Interfood ételkártyát? A már naplózott ebéd megmarad.'))return;
 try{
  api().deleteInterfoodCard({expectedProfile:owner,id:card.id});
  by('hhInterfoodDialogV1175').close();renderCards();pageToast('A kártya eltávolítva. A Napi napló érintetlen.');
 }catch(err){notice(String(err.message||err),'error');}
}
function init(){
 const tile=by('hhInterfoodTileV1173');
 if(!tile||by('hhInterfoodLibraryV1175')||!doc?.body)return;
 const launcher=doc.createElement('button');
 launcher.id='hhInterfoodLogV1175';launcher.type='button';
 launcher.innerHTML='<span>🍱 Interfood ételeim</span><small>Mentett ételkártyák · Egyérintéses naplózás</small><b aria-hidden="true">›</b>';
 tile.insertAdjacentElement('afterend',launcher);
 const page=doc.createElement('section');page.id='hhInterfoodLibraryV1175';page.hidden=true;
 page.setAttribute('aria-label','Interfood ételeim');page.setAttribute('role','region');
 page.innerHTML=`<div class="hh-if-library-inner-v1175">
  <header class="hh-if-library-head-v1175">
   <button type="button" id="hhIfBack1175" aria-label="Vissza a Nutrition oldalra">‹</button>
   <div><small>HEALTHHUB · NUTRITION</small><h1>🍱 Interfood ételeim</h1>
    <p><strong id="hhIfActiveProfile1175">Mónika</strong> · Privát kártyák · Dropbox-szinkron</p></div>
   <button type="button" id="hhIfNew1175">＋ Új kártya</button>
  </header>
  <div class="hh-if-library-intro-v1175"><strong>Interfood ételkártyák</strong><p>Az itt mentett kártyák csak külön naplózással kerülnek az elfogyasztott ételek közé. <a href="https://rendel.interfood.hu/" target="_blank" rel="noopener noreferrer">Heti étlap ↗</a></p></div>
  <div class="hh-if-library-tools-v1175"><input id="hhIfSearch1175" type="search" placeholder="Keresés név vagy ételkód alapján" aria-label="Interfood kártyák keresése"><small id="hhIfCardCount1175">0 kártya</small></div>
  <div id="hhIfToast1175" hidden role="status" aria-live="polite"></div>
  <div id="hhIfCards1175" class="hh-if-card-grid-v1175"></div>
 </div>`;
 doc.body.append(page);
 const dlg=doc.createElement('dialog');dlg.id='hhInterfoodDialogV1175';dlg.setAttribute('aria-labelledby','hhIfEditHeading1175');
 dlg.innerHTML=`<div class="hh-if-shell-v1175">
  <header><div><small>HEALTHHUB × INTERFOOD</small><h2 id="hhIfEditHeading1175">Új Interfood ételkártya</h2>
   <p>Profil: <strong id="hhIfProfile1175"></strong> · Saját ételkártya</p></div>
   <button type="button" id="hhIfClose1175" aria-label="Bezárás">✕</button>
  </header>
  <form id="hhIfForm1175" autocomplete="off">
   <div class="hh-if-card-hero-v1175">
    <div class="hh-if-card-art-v1175"><img id="hhIfCardPhoto1175" alt="Az étel kiválasztott fotója" hidden><span id="hhIfCardPlaceholder1175">🍱</span></div>
    <div class="hh-if-card-hero-copy-v1175"><small id="hhIfCardCode1175">INTERFOOD</small><strong id="hhIfCardTitle1175">Választott Interfood étel</strong><label class="hh-if-upload-v1175">📷 Fotó kiválasztása<input type="file" accept="image/jpeg,image/png,image/webp" id="hhIfPhoto1175" hidden></label><small id="hhIfPhotoCaption1175">Saját fotó feltöltése (opcionális)</small></div>
   </div>
   <div class="hh-if-intro-v1175">Az <a href="https://rendel.interfood.hu/" target="_blank" rel="noopener noreferrer">Interfood heti étlapjáról</a> másold be az ételadatokat, vagy írd be kézzel. Az ételkép csak feltöltött fotóból származik; a rendszer nem állítja, hogy minden tápérték hivatalosan ellenőrzött.</div>
   <label>Másolt ételadatok (opcionális)<textarea id="hhIfPaste1175" rows="2" maxlength="4000" placeholder="D9 - Kemencében sült csirkemell, görög saláta&#10;481 kcal · 45 g fehérje · 24 g szénhidrát · 25 g zsír"></textarea></label>
   <button type="button" class="hh-if-parse-v1175" id="hhIfParse1175">✦ Adatok felismerése</button>
   <div class="hh-if-fields-v1175">
    <label>Ételkód<input id="hhIfCode1175" maxlength="8" placeholder="D9"></label>
    <label class="hh-if-wide-v1175">Étel neve<input id="hhIfName1175" maxlength="80" required placeholder="Pl. Kemencében sült csirkemell"></label>
    <label>Étkezés<select id="hhIfMeal1175"><option>Reggeli</option><option>Tízórai</option><option selected>Ebéd</option><option>Uzsonna</option><option>Vacsora</option><option>Egyéb</option></select></label>
    <label>Étlap napja (opcionális)<input id="hhIfMenuDate1175" type="date"></label>
    <label class="hh-if-wide-v1175">Tálalási súly (g, opcionális)<input id="hhIfWeight1175" type="number" min="1" max="3000" step="1" placeholder="Csak ha ismert a címkéről"></label>
   </div>
   <p class="hh-if-hint-v1175">Tápértékek 1 teljes Interfood adagra, nem 100 grammra. Ismeretlen értéket hagyj üresen.</p>
   <div class="hh-if-fields-v1175 hh-if-nutrients-v1175">
    <label>kcal / adag<input id="hhIfKcal1175" type="number" min="0" max="5000" step="any" placeholder="—"></label>
    <label>Fehérje (g)<input id="hhIfProtein1175" type="number" min="0" max="1000" step="any" placeholder="—"></label>
    <label>Szénhidrát (g)<input id="hhIfCarbs1175" type="number" min="0" max="1000" step="any" placeholder="—"></label>
    <label>Zsír (g)<input id="hhIfFat1175" type="number" min="0" max="1000" step="any" placeholder="—"></label>
   </div>
   <div class="hh-if-preview-v1175"><small>EGY ADAG TÁPÉRTÉKE</small><div>
    <span><b id="hhIfPreviewKcal1175">—</b> kcal</span><span><b id="hhIfPreviewProtein1175">—</b> F</span>
    <span><b id="hhIfPreviewCarbs1175">—</b> CH</span><span><b id="hhIfPreviewFat1175">—</b> Zs</span></div></div>
   <fieldset class="hh-if-options-v1175"><legend>Opcionális mentési helyek (3 pipa)</legend>
    <label><input type="checkbox" id="hhIfSaveFood1175" checked> Saját ételek közé is</label>
    <label><input type="checkbox" id="hhIfSaveFavorite1175" checked> Kedvencekhez is</label>
    <label><input type="checkbox" id="hhIfSaveFamily1175"> Közös családi ételtárba is</label>
   </fieldset>
   <p id="hhIfNotice1175" role="status" aria-live="polite"></p>
   <footer><button type="button" id="hhIfDelete1175">Törlés</button><button type="button" id="hhIfCancel1175">Mégse</button><button type="submit" id="hhIfSave1175">☁️ Mentés az Interfood ételeim közé</button></footer>
  </form></div>`;
 doc.body.append(dlg);
 launcher.addEventListener('click',openLibrary);
 by('hhIfBack1175').addEventListener('click',closeLibrary);
 by('hhIfNew1175').addEventListener('click',()=>{owner=api()?.getProfile?.();openEditor(null);});
 by('hhIfSearch1175').addEventListener('input',renderCards);
 by('hhIfClose1175').addEventListener('click',()=>dlg.close());
 by('hhIfCancel1175').addEventListener('click',()=>dlg.close());
 by('hhIfDelete1175').addEventListener('click',deleteCard);
 by('hhIfForm1175').addEventListener('submit',saveCard);
 by('hhIfParse1175').addEventListener('click',recognize);
 by('hhIfPhoto1175').addEventListener('change',preparePhoto);
 by('hhIfPaste1175').addEventListener('paste',()=>root.setTimeout?.(recognize,0));
 for(const id of ['hhIfName1175','hhIfCode1175','hhIfKcal1175','hhIfProtein1175','hhIfCarbs1175','hhIfFat1175'])
  by(id).addEventListener('input',updatePreview);
 dlg.addEventListener('close',()=>{photoData=null;});
}
if(doc){
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
root.HH_INTERFOOD_DIARY_V1175=Object.freeze({parseMenuCopy,scale,openLibrary});
if(typeof module!=='undefined'&&module.exports)module.exports={parseMenuCopy,scale};
})(typeof window!=='undefined'?window:{},typeof document!=='undefined'?document:null);
