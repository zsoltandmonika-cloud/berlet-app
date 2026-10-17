/* HH Bevitel v643. Photo gateway + scroll-snap category and food selectors.
 * Uses existing canonical Nutrition food values and portion-entry modal.
 * No new journal database, no invented calorie values, and no silent logging.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const food=$('addFood'),drink=$('addDrink'),entry=$('entryDialog'),select=$('foodSelect');
if(!food||!drink||!entry||!select)return;
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let bypass=false,kind='food',step='categories',items=[],selection=0,categories=[],category='',scrollTimer=null;
const dialog=document.createElement('dialog');
dialog.id='hhBevitelPicker';dialog.className='hh-bevitel-picker';
dialog.setAttribute('aria-label','HealthHub · gördíthető étel- és italválasztó');
dialog.innerHTML='<div class="hh-bevitel-picker-shell"><header class="hh-bevitel-picker-head"><div><small>HEALTHHUB · NUTRITION</small><strong id="hhBevitelPickerTitle">🍽️ Étel</strong><span id="hhBevitelPickerNote">Válassz kategóriát</span></div><button type="button" id="hhBevitelPickerClose" aria-label="Bezárás">×</button></header><p class="hh-bevitel-picker-hint" id="hhBevitelPickerHint">← Görgess és válassz →</p><div class="hh-bevitel-picker-rail" id="hhBevitelPickerRail" tabindex="0" aria-label="Gördíthető kategóriák és ételek"></div><div class="hh-bevitel-picker-count" id="hhBevitelPickerCount"></div><footer class="hh-bevitel-picker-footer"><button type="button" id="hhBevitelPickerBack">← Vissza</button><div><strong id="hhBevitelPickerSelected">Kategória</strong><small id="hhBevitelPickerDetail">Érintsd meg a kiválasztott kártyát</small></div><button type="button" id="hhBevitelPickerNext">Tovább ›</button></footer></div>';
document.body.append(dialog);
const rail=$('hhBevitelPickerRail'),title=$('hhBevitelPickerTitle'),note=$('hhBevitelPickerNote'),hint=$('hhBevitelPickerHint');
const back=$('hhBevitelPickerBack'),next=$('hhBevitelPickerNext'),count=$('hhBevitelPickerCount'),selected=$('hhBevitelPickerSelected'),detail=$('hhBevitelPickerDetail');
const cardIcon=t=>{const m=String(t||'').match(/^\s*(\p{Extended_Pictographic}(?:\ufe0f|\u200d\p{Extended_Pictographic})?)/u);return m?m[1]:'🍽️'};
function parseOption(o){
 const text=(o.textContent||'').trim(),split=text.indexOf(' · ');
 const raw=split>=0?text.slice(0,split):'Egyéb';
 return {id:o.value,category:raw.replace(/^[^\p{L}\p{N}]+/u,'').trim()||'Egyéb',
  name:split>=0?text.slice(split+3).trim():text,icon:cardIcon(text)};
}
function sourceItems(){
 return Array.from(select.options).filter(x=>x.value).map(parseOption);
}
function center(i,smooth=true){
 const card=rail.children[i];if(!card)return;
 const left=card.offsetLeft-(rail.clientWidth-card.offsetWidth)/2;
 rail.scrollTo({left,behavior:smooth&&!reduced.matches?'smooth':'instant'});
}
function activeUI(){
 [...rail.children].forEach((node,i)=>{node.dataset.active=String(i===selection);node.setAttribute('aria-current',String(i===selection))});
 const item=items[selection];
 selected.textContent=item?item.name:'Nincs találat';
 detail.textContent=step==='categories'?'Koppints a kategóriára':'Egy adag méretét a következő képernyőn állíthatod';
 count.textContent=items.length?(selection+1)+' / '+items.length:'';
 next.disabled=!item;next.textContent=step==='categories'?'Ételek ›':'Adag beállítása ›';
 back.textContent=step==='categories'?'← Bezárás':'← Kategóriák';
}
function render(){
 rail.replaceChildren();selection=0;
 items=step==='categories'?categories.map(c=>({name:c.name,icon:c.icon,category:c.name,id:c.name})):
  sourceItems().filter(x=>x.category===category);
 for(let i=0;i<items.length;i++){
  const r=items[i];
  const card=document.createElement('button');card.type='button';card.className='hh-bevitel-picker-card';
  card.setAttribute('aria-label',r.name);
  card.dataset.theme=kind;
  const art=document.createElement('div');art.className='hh-bevitel-picker-art';
  const icon=document.createElement('span');icon.textContent=r.icon;art.append(icon);
  const copy=document.createElement('div');copy.className='hh-bevitel-picker-card-copy';
  const n=document.createElement('strong');n.textContent=r.name;
  const subtitle=document.createElement('small');subtitle.textContent=step==='categories'?'Görgethető '+(kind==='drink'?'italok':'ételek'):category;
  copy.append(n,subtitle);card.append(art,copy);
  card.addEventListener('click',()=>{if(i!==selection){selection=i;activeUI();center(i,true)}else advance()});
  rail.append(card);
 }
 title.textContent=(kind==='drink'?'🥤 Ital':'🍽️ Étel')+' · '+(step==='categories'?'Kategóriák':'Választék');
 note.textContent=step==='categories'?'Válassz alkategóriát':category;
 hint.textContent=step==='categories'?'← Görgess az alkategóriák között →':'← Görgess a '+category+' tételei között →';
 activeUI();requestAnimationFrame(()=>center(0,false));
}
function advance(){
 const picked=items[selection];if(!picked)return;
 if(step==='categories'){
  category=picked.category;step='foods';render();return;
 }
 // Reopen the proven Nutrition portion form with the selected food.
 dialog.close();
 bypass=true;
 try{(kind==='drink'?drink:food).click();}finally{bypass=false}
 const target=Array.from(select.options).some(x=>x.value===picked.id);
 if(target){
  select.value=picked.id;
  select.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
function open(kindNext,button){
 // Prime the existing canonical select, but avoid showing its modal.
 bypass=true;
 try{button.click();}finally{bypass=false}
 items=sourceItems();
 if(entry.open)entry.close();
 kind=kindNext;step='categories';category='';
 const map=new Map();
 for(const f of items)if(!map.has(f.category))map.set(f.category,{name:f.category,icon:f.icon,category:f.category});
 categories=[...map.values()];
 if(!categories.length){$('hhBevitelInfo').textContent='Ehhez a típushoz jelenleg nincs étel vagy ital. Saját ételt a napi napló + Saját étel gombjával hozhatsz létre.';$('hhBevitelInfo').hidden=false;return}
 render();dialog.showModal();
}
for(const [node,type] of [[food,'food'],[drink,'drink']]){
 node.addEventListener('click',e=>{
  if(bypass)return;
  e.preventDefault();e.stopImmediatePropagation();open(type,node);
 },true);
}
rail.addEventListener('scroll',()=>{
 clearTimeout(scrollTimer);
 scrollTimer=setTimeout(()=>{
  if(!items.length)return;
  let best=0,delta=Infinity,centerX=rail.scrollLeft+rail.clientWidth/2;
  Array.from(rail.children).forEach((card,i)=>{
   const d=Math.abs(card.offsetLeft+card.offsetWidth/2-centerX);
   if(d<delta){delta=d;best=i}
  });
  if(best!==selection){selection=best;activeUI()}
 },55);
},{passive:true});
$('hhBevitelPickerClose').addEventListener('click',()=>dialog.close());
back.addEventListener('click',()=>{if(step==='categories')dialog.close();else{step='categories';render()}});
next.addEventListener('click',advance);
dialog.addEventListener('cancel',e=>{if(step==='foods'){e.preventDefault();step='categories';render()}});
const ai=$('hhBevitelAI'),status=$('hhBevitelInfo');
ai?.addEventListener('click',()=>{
 if(!status)return;
 status.textContent='📸 Az AI Bevitel fotós felismerése még fejlesztés alatt áll. Addig az Étel és Ital csempékkel tudsz ténylegesen naplózni, a Léna Cookbook pedig megnyitja a meglévő recepttárat.';
 status.hidden=false;status.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});
});
})();
