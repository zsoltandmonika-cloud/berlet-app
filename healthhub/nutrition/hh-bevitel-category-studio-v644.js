/* HealthHub Bevitel Category Studio v644.
 * Shared (family) photo taxonomy; protected Dropbox metadata and immutable JPEG vault.
 * Existing QuickNasi recipes remain separately profile-scoped.
 */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
if(!root.HH_NUTRITION_IMAGE_V641||!root.HH_NUTRITION_CLOUD_V626)return;
const picker=root.HH_BEVITEL_PICKER_V643||{getCurrent:()=>({kind:'food',category:''}),getBaseCategories:()=>[]},vault=root.HH_NUTRITION_IMAGE_V641,cloud=root.HH_NUTRITION_CLOUD_V626;
const KEY='hh-bevitel-category-studio-v644',SCHEMA='healthhub.nutrition.categories/1';
const EMPTY=()=>({schemaVersion:SCHEMA,updatedAt:'1970-01-01T00:00:00Z',categories:{}});
const now=()=>new Date().toISOString();
const validKey=k=>typeof k==='string'&&/^(food|drink|tile|bristol)\|[^|]{1,90}$/.test(k);
const key=(kind,category)=>kind+'|'+category;
const validRef=r=>r===null||!r||vault.refValid('shared',r);
const scrub=(input)=>{
 const doc=EMPTY();
 if(!input||input.schemaVersion!==SCHEMA||!input.categories||typeof input.categories!=='object')return doc;
 for(const [k,x] of Object.entries(input.categories).slice(0,500)){
  if(!validKey(k)||!x||typeof x!=='object'||!validRef(x.imageRef))continue;
  doc.categories[k]={
   displayName:typeof x.displayName==='string'?x.displayName.slice(0,60):'',
   order:Number.isFinite(x.order)?Math.max(0,Math.min(9999,x.order)):1000,
   archived:!!x.archived,imageRef:x.imageRef||null,
   updatedAt:typeof x.updatedAt==='string'?x.updatedAt:'1970-01-01T00:00:00Z'
  };
 }
 doc.updatedAt=typeof input.updatedAt==='string'?input.updatedAt:doc.updatedAt;
 return doc;
};
function read(){try{return scrub(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(_){return EMPTY()}}
function write(doc){const clean=scrub(doc);localStorage.setItem(KEY,JSON.stringify(clean));root.dispatchEvent(new CustomEvent('healthhub:bevitel-categories-updated',{detail:{source:'category-studio'}}))}
function merge(a,b){
 const out=EMPTY();a=scrub(a);b=scrub(b);
 for(const k of new Set([...Object.keys(a.categories),...Object.keys(b.categories)])){
  const x=a.categories[k],y=b.categories[k];
  out.categories[k]=!x?y:!y?x:(String(y.updatedAt)>String(x.updatedAt)?y:x);
 }
 out.updatedAt=String(b.updatedAt)>String(a.updatedAt)?b.updatedAt:a.updatedAt;
 return out;
}
function comparable(a,b){return JSON.stringify(scrub(a).categories)===JSON.stringify(scrub(b).categories)}
let running=null,rerun=false,lastRemoteCheck=0;
async function synchronize(push=false){
 if(!cloud?.connected())return false;
 if(running){await running;return push?synchronize(true):true}
 running=(async()=>{
  let remote,combined;
  for(let attempts=0;attempts<4;attempts++){
   remote=await cloud.downloadCategories();
   const latest=read();
   combined=remote.data?merge(latest,remote.data):latest;
   if(!comparable(latest,combined))write(combined);
   if(!push&&remote.data&&comparable(combined,remote.data)){
    lastRemoteCheck=Date.now();return true;
   }
   if(!remote.data&&!Object.keys(combined.categories).length){lastRemoteCheck=Date.now();return true}
   try{
    await cloud.uploadCategories(combined,remote.rev);
    const after=merge(read(),combined);
    write(after);
    if(!comparable(after,combined))rerun=true;
    lastRemoteCheck=Date.now();return true;
   }catch(err){if(err?.status===409&&attempts<3)continue;throw err}
  }
  return false;
 })();
 try{return await running}finally{
  running=null;
  if(rerun){rerun=false;setTimeout(()=>synchronize(true).catch(()=>{}),500)}
 }
}
const status=(s)=>{if($('hhCategoryEditStatus'))$('hhCategoryEditStatus').textContent=s};
function decorate(kind,list){
 const data=read().categories;
 return list.map((c,i)=>{
  const row=data[key(kind,c.category||c.name)]||{};
  return {...c,name:row.displayName||c.name,category:c.category||c.name,order:row.order===1000||row.order==null?1000+i:row.order,imageRef:row.imageRef||null,archived:row.archived||false,_baseline:i};
 }).filter(c=>!c.archived).sort((a,b)=>(a.order-b.order)||(a._baseline-b._baseline));
}
function attachPhoto(kind,category,art){
 const ref=read().categories[key(kind,category)]?.imageRef;
 if(!ref||!vault.refValid('shared',ref))return;
 vault.load('shared',ref).then(url=>{
  if(!art.isConnected)return;
  const img=document.createElement('img');img.className='hh-category-photo';img.alt='';img.loading='lazy';img.src=url;
  img.onerror=()=>img.remove();art.append(img);
 }).catch(()=>{});
}
const dialog=document.createElement('dialog');dialog.id='hhCategoryStudio';
dialog.setAttribute('aria-label','Léna · Bevitel kategóriaszerkesztő');
dialog.innerHTML=`<form id="hhCategoryStudioForm" class="hh-category-form">
<header class="hh-category-head"><div><small>HEALTHHUB · LÉNA IMAGE STUDIO</small><h3>✏️ Kategóriák szerkesztése</h3><p>Közös Food Library · privát Dropbox képtár</p></div><button type="button" id="hhCategoryExit" aria-label="Bezárás">×</button></header>
<div class="hh-category-body">
<label>Kategória <select id="hhCategorySelect"></select></label>
<div class="hh-category-preview"><img id="hhCategoryPreviewImg" alt="Kategória borítóképe" hidden><span id="hhCategoryPreviewFallback">🍽️</span></div>
<div class="hh-category-row"><label>Megjelenített név<input id="hhCategoryName" maxlength="60" required></label><label>Sorrend<input id="hhCategoryOrder" type="number" min="0" max="9999" step="1" required></label></div>
<div class="hh-category-row hh-category-image-actions"><label class="hh-category-upload">📸 Saját kép kiválasztása<input id="hhCategoryFile" type="file" accept="image/*"></label><button type="button" id="hhCategoryAI">✨ Léna AI-kép</button><button type="button" id="hhCategoryRemove">Kép törlése</button></div>
<label class="hh-category-prompt-label">AI-kép ötlet (opcionális)<textarea id="hhCategoryPrompt" rows="2" maxlength="380" placeholder="Pl. friss zöldségek, mélykék fények"></textarea></label>
<label class="hh-category-archive"><input type="checkbox" id="hhCategoryArchived"> Kategória elrejtése a választóból</label>
<p id="hhCategoryEditStatus" role="status" aria-live="polite"></p>
</div><footer class="hh-category-footer"><button type="button" id="hhCategoryCancel">Mégse</button><button type="submit" id="hhCategorySave">☁️ Mentés és szinkron</button></footer>
</form>`;
document.body.append(dialog);
const header=$('hhBevitelPicker')?.querySelector('.hh-bevitel-picker-head');
const editBtn=document.createElement('button');editBtn.type='button';editBtn.id='hhBevitelCategoryEdit';editBtn.className='hh-bevitel-category-edit';
editBtn.textContent='✎ Képek';editBtn.title='Alkategóriák képeinek, nevének és sorrendjének szerkesztése';
if(header)header.insertBefore(editBtn,$('hhBevitelPickerClose'));
const tileDefs=[
 {category:'food',name:'Étel',icon:'🍽️',id:'addFood'},
 {category:'drink',name:'Ital',icon:'🥤',id:'addDrink'},
 {category:'ai',name:'AI Bevitel',icon:'📷',id:'hhBevitelAI'},

];
const bristolDefs=[
 {category:'1',name:'1 · Csokigolyók',icon:'🍫'},
 {category:'2',name:'2 · Szőlőfürt',icon:'🍇'},
 {category:'3',name:'3 · Müzliszelet',icon:'🍫'},
 {category:'4',name:'4 · Puha péksütemény',icon:'🥖'},
 {category:'5',name:'5 · Krémes falatkák',icon:'🍮'},
 {category:'6',name:'6 · Sűrű zabkása',icon:'🥣'},
 {category:'7',name:'7 · Kakaóital',icon:'🥛'}
];
/* Main title and ✎ Képek are part of the HTML itself since v646.
 * Keep the studio independent of the optional food category picker. */
for(const t of tileDefs){const img=$(t.id)?.querySelector('.hh-bevitel-photo');if(img)img.dataset.defaultSrc=img.getAttribute('src')}
function applyTiles(){
 const saved=read().categories;
 for(const t of tileDefs){
  const img=$(t.id)?.querySelector('.hh-bevitel-photo');
  if(!img)continue;
  const ref=saved[key('tile',t.category)]?.imageRef;
  if(!ref||!vault.refValid('shared',ref)){
   const original=img.dataset.defaultSrc;
   if(original&&img.getAttribute('src')!==original)img.src=original;
   continue;
  }
  const hash=ref.sha256;
  vault.load('shared',ref).then(url=>{
   if(!img.isConnected||read().categories[key('tile',t.category)]?.imageRef?.sha256!==hash)return;
   img.src=url;
  }).catch(()=>{});
 }
}
root.addEventListener('healthhub:bevitel-categories-updated',applyTiles);
setTimeout(applyTiles,800);

let kind='food',rows=[],current='',draft='',removed=false,saving=false,puterPromise=null;
function currentBase(){
 return rows.find(r=>r.category===current)||null;
}
function setPreview(src,icon){
 const img=$('hhCategoryPreviewImg'),fallback=$('hhCategoryPreviewFallback');
 fallback.textContent=icon||'🍽️';
 if(src){img.src=src;img.hidden=false;fallback.hidden=true}
 else{img.hidden=true;img.removeAttribute('src');fallback.hidden=false}
}
async function showOne(){
 current=$('hhCategorySelect').value;
 const base=currentBase();if(!base)return;
 const isTile=kind==='tile';dialog.dataset.kind=kind;
 draft='';removed=false;$('hhCategoryFile').value='';
 const loadingCategory=current;
 const data=read().categories[key(kind,current)]||{};
 $('hhCategoryName').value=data.displayName||base.name;
 $('hhCategoryOrder').value=Number.isFinite(data.order)?data.order:(rows.findIndex(r=>r.category===current)+1)*10;
 $('hhCategoryArchived').checked=!!data.archived;
 $('hhCategoryPrompt').value='';
 const original=isTile?$(base.id)?.querySelector('.hh-bevitel-photo')?.dataset.defaultSrc:'';
 setPreview(original||'',base.icon);
 const ref=data.imageRef;
 if(ref&&vault.refValid('shared',ref)){
  try{const url=await vault.load('shared',ref);if($('hhCategorySelect').value===loadingCategory&&!draft&&!removed)setPreview(url,base.icon)}catch(e){status('⚠ A meglévő kép ezen az eszközön még nem érhető el.')}
 }
 status('A módosítás a közös családi képtárba kerül. Az ételadatok és a napló nem változnak.');
}
function open(override){
 const state=picker.getCurrent();kind=override==='bristol'?'bristol':override==='tile'?'tile':state.kind;
 rows=kind==='bristol'?bristolDefs.map(t=>({...t})):kind==='tile'?tileDefs.map(t=>({...t})):picker.getBaseCategories();
 const all=decorate(kind,rows);
 rows=rows.sort((a,b)=>all.findIndex(x=>x.category===a.category)-all.findIndex(x=>x.category===b.category));
 const sel=$('hhCategorySelect');sel.replaceChildren();
 for(const r of rows){const o=new Option(r.name,r.category);sel.add(o)}
 const chosen=kind!=='tile'&&kind!=='bristol'&&state.category&&rows.some(r=>r.category===state.category)?state.category:rows[0]?.category;
 if(!chosen){status('Nincs szerkeszthető kategória.');return}
 sel.value=chosen;
 dialog.showModal();showOne();
}
async function compress(file){
 if(!file||!file.type.startsWith('image/'))throw Error('Csak fotó tölthető fel.');
 if(file.size>9*1024*1024)throw Error('Legfeljebb 9 MB-os képet válassz.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('A fotó nem nyitható meg'));image.src=url});
  for(const max of [720,600,480,390]){
   const f=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*f));canvas.height=Math.max(1,Math.round(image.naturalHeight*f));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#10253b';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',max===720?.72:.60);
   if(data.length<140000)return data;
  }
  throw Error('A kép nem optimalizálható; próbálj kisebbet.');
 }finally{URL.revokeObjectURL(url)}
}
async function fileChanged(){
 const file=$('hhCategoryFile').files?.[0];if(!file)return;
 status('🖼️ Fotó optimalizálása…');
 try{draft=await compress(file);removed=false;setPreview(draft,currentBase()?.icon);status('✓ Fotó kiválasztva. A „Mentés és szinkron” gombbal kerül Dropboxba.')}
 catch(err){status('⚠ Képhiba: '+err.message)}
}
function loadPuter(){
 if(root.puter?.ai?.txt2img)return Promise.resolve(root.puter);
 if(puterPromise)return puterPromise;
 puterPromise=new Promise((resolve,reject)=>{
  const existing=[...document.scripts].find(x=>x.src?.includes('js.puter.com/v2/'));
  if(existing){let n=0;const test=()=>{if(root.puter?.ai?.txt2img)resolve(root.puter);else if(++n>60)reject(Error('Az AI szolgáltatás nem töltődött be.'));else setTimeout(test,200)};test();return}
  const script=document.createElement('script');script.src='https://js.puter.com/v2/';script.async=true;
  script.onload=()=>root.puter?.ai?.txt2img?resolve(root.puter):reject(Error('A képgenerátor nem válaszol.'));
  script.onerror=()=>reject(Error('Nem érhető el a Puter AI.'));document.head.append(script);
 }).catch(e=>{puterPromise=null;throw e});
 return puterPromise;
}
async function generate(){
 if(saving)return;
 const btn=$('hhCategoryAI');btn.disabled=true;status('✨ Léna készíti a kategóriaképet…');
 try{
  const puter=await loadPuter();
  const name=$('hhCategoryName').value.trim().slice(0,60);
  const extra=$('hhCategoryPrompt').value.trim().slice(0,380);
  const prompt='Create one high-quality photorealistic editorial food/beverage category cover photograph, square 1:1, for the category "'+name+'". Beautiful appetizing relevant arrangement, dark rich navy midnight-blue background, refined dramatic soft studio food lighting, fine blue and subtle pink highlights, crisp premium restaurant photography, elegant and friendly. No text, typography, watermark, brand logos or UI. '+extra;
  let result;
  try{result=await puter.ai.txt2img(prompt,{model:'gpt-image-2',ratio:{w:1,h:1},quality:'high'})}
  catch(err){
   const msg=String(err?.message||err?.code||'').toLowerCase();
   if(/auth|funds|popup|moderation|balance|credit/.test(msg))throw err;
   result=await puter.ai.txt2img(prompt,{model:'gemini-3.1-flash-image',ratio:{w:1,h:1},quality:'1K'});
  }
  const src=result?.src||result?.url||(typeof result==='string'?result:'');
  if(!/^(data:image\/|https?:\/\/|blob:)/.test(src))throw Error('Nem jött vissza kép a szolgáltatótól.');
  const res=await fetch(src);if(!res.ok)throw Error('A generált kép nem olvasható.');
  draft=await compress(await res.blob());removed=false;setPreview(draft,currentBase()?.icon);
  status('✓ Elkészült! A kép a „Mentés és szinkron” gombbal kerül a központi tárhelyre.');
 }catch(err){status('⚠ Léna képgeneráló: '+String(err?.message||'hiba').slice(0,180)+'. Saját fotó továbbra is feltölthető.')}
 finally{btn.disabled=false}
}
async function save(e){
 e.preventDefault();
 if(saving||!current)return;
 if(!cloud.connected()){status('⚠ Dropbox nincs csatlakoztatva ebben a böngészőben. Az adatok biztonsága miatt a közös kategória mentése nem indult el.');return}
 const name=$('hhCategoryName').value.trim(),num=Number($('hhCategoryOrder').value);
 if(name.length<2||name.length>60||!Number.isInteger(num)||num<0||num>9999){status('Adj meg 2–60 karakteres nevet és 0–9999 közötti sorrendet.');return}
 saving=true;$('hhCategorySave').disabled=true;
 const cat=current,type=kind,prev=read().categories[key(type,cat)]||{};
 let imageRef=prev.imageRef||null;
 try{
  if(removed)imageRef=null;
  if(draft){status('☁️ Kép mentése a központi Dropbox-képtárba…');imageRef=await vault.save('shared',draft)}
  const doc=read();
  doc.categories[key(type,cat)]={displayName:(type==='tile'||type==='bristol')?'':name,order:(type==='tile'||type==='bristol')?1000:num,archived:(type==='tile'||type==='bristol')?false:$('hhCategoryArchived').checked,imageRef,updatedAt:now()};
  doc.updatedAt=now();write(doc);
  status('☁️ Kategória mentése és felhőszinkron…');
  await synchronize(true);
  status('✓ Kategória és kép szinkronizálva a közös Dropboxba.');
  draft='';removed=false;
  setTimeout(()=>{if(dialog.open)dialog.close()},650);
 }catch(err){status('⚠ A szerkesztés helyben megmaradt, de a szinkron nem sikerült: '+String(err?.message||'hiba').slice(0,150))}
 finally{saving=false;$('hhCategorySave').disabled=false}
}
if(header)editBtn.addEventListener('click',()=>open());

$('hhCategorySelect').addEventListener('change',showOne);
$('hhCategoryFile').addEventListener('change',fileChanged);
$('hhCategoryAI').addEventListener('click',generate);
$('hhCategoryRemove').addEventListener('click',()=>{draft='';removed=true;setPreview('',currentBase()?.icon);status('A kép eltávolítását a Mentés és szinkron gomb véglegesíti.')});
$('hhCategoryExit').addEventListener('click',()=>{if(!saving)dialog.close()});
$('hhCategoryCancel').addEventListener('click',()=>{if(!saving)dialog.close()});
$('hhCategoryStudioForm').addEventListener('submit',save);
dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault()});
async function refresh(){
 if(!cloud.connected())return;
 try{await synchronize(false)}catch(err){console.warn('Bevitel kategóriafrissítés később:',String(err?.message||'hiba').slice(0,80))}
}
setTimeout(refresh,2200);
root.addEventListener('focus',()=>{if(Date.now()-lastRemoteCheck>35000)refresh()});
root.addEventListener('online',refresh);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastRemoteCheck>35000)refresh()});
setInterval(()=>{if(!document.hidden&&Date.now()-lastRemoteCheck>90000)refresh()},120000);
root.HH_BEVITEL_CATEGORY_V644={decorate,attachPhoto,refresh,openEditor:open,version:'650'};
})(window);
