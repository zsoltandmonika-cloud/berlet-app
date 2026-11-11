/* HealthHub Nutrition v1175 · Interfood → existing profile diary.
 * User-assisted copy/paste import; no unsupported cross-site scraping or live-sync claim.
 * No account credentials, no requests to Interfood. The official menu opens in its own tab.
 */
(function(root,doc){
'use strict';
const K=['kcal','protein','carbs','fat'];
function parseMenuCopy(value){
 const input=String(value||'').slice(0,4000);
 const lines=input.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 let code='',name='';
 const codePattern=/^([A-Z]{1,4}\d{0,3}K?)\s*[-–]\s*.+/i;
 const lineIndex=lines.findIndex(line=>codePattern.test(line));
 if(lineIndex>=0){
  code=lines[lineIndex].match(codePattern)[1].toUpperCase();
  name=(lines.slice(lineIndex+1).find(line=>
   !/\b(?:kcal|Ft|szénh|fehérje|zsír)\b/i.test(line)&&
   !/^\d+(?:[.,]\d+)?\s*(?:g|db|Ft)/i.test(line)&&
   !/^(?:Kis adag|Húsmentes|Last Minute|Új)$/i.test(line))||'').slice(0,80);
 }else if(lines.length>0){
  const codeOnly=lines[0].match(/^([A-Z]{1,4}\d{0,3}K?)$/i);
  if(codeOnly)code=codeOnly[1].toUpperCase();
  const candidate=lines.find(line=>/^[\p{L}]/u.test(line)&&
    !/\b(?:kcal|Ft|szénh|fehérje|zsír)\b/i.test(line) && line.length>5);
  if(candidate)name=candidate.slice(0,80);
 }
 const read=(pattern)=>{
  const match=input.match(pattern);
  if(!match)return null;
  const value=Number(match[1].replace(',','.'));
  return Number.isFinite(value)&&value>=0?value:null;
 };
 return {code,name,nutrients:{
  kcal:read(/(\d+(?:[.,]\d+)?)\s*kcal\b/i),
  carbs:read(/(\d+(?:[.,]\d+)?)\s*g\s*(?:szénh\.?|szénhidrát)\b/i),
  protein:read(/(\d+(?:[.,]\d+)?)\s*g\s*fehérje\b/i),
  fat:read(/(\d+(?:[.,]\d+)?)\s*g\s*zsír\b/i)
 }};
}
function scale(nutrients,portions){
 const p=Number(portions),out={};
 for(const key of K){
  const n=nutrients?.[key];
  out[key]=n==null||n===''?null:Number((Number(n)*p).toFixed(2));
 }
 return out;
}
const api=()=>root.HH_NUTRITION_QUICK_API;
const $=id=>doc?.getElementById(id);
let expected='',token='',working=false;
function makeToken(){
 const c=root.crypto?.randomUUID?.();
 return c?'if_'+c.replace(/-/g,''):'if_'+Date.now().toString(36)+Math.random().toString(36).slice(2);
}
function clear(){
 for(const id of ['hhIfCode1175','hhIfName1175','hhIfPaste1175','hhIfKcal1175','hhIfProtein1175','hhIfCarbs1175','hhIfFat1175']){
  const el=$(id);if(el)el.value='';
 }
 $('hhIfPortions1175').value='1';
 $('hhIfMeal1175').value='Ebéd';
 $('hhIfState1175').textContent='';
 $('hhIfState1175').dataset.state='';
 updatePreview();
}
function values(){
 const numbers={};
 for(const key of K){
  const v=$('hhIf'+key[0].toUpperCase()+key.slice(1)+'1175')?.value;
  numbers[key]=v===''||v==null?null:Number(v.replace(',','.'));
 }
 return numbers;
}
function updatePreview(){
 const portions=Number($('hhIfPortions1175')?.value||1),n=scale(values(),portions);
 for(const key of K){
  const target=$('hhIfPreview'+key[0].toUpperCase()+key.slice(1)+'1175');
  if(target)target.textContent=n[key]==null||!Number.isFinite(n[key])?'—':String(n[key]).replace('.',',');
 }
}
function notice(text,state='info'){
 const el=$('hhIfState1175');
 if(!el)return;
 el.textContent=text;el.dataset.state=state;
}
function open(){
 if(!api()?.recordInterfoodMeal){root.alert?.('A Napi napló még nem töltődött be. Frissítsd az oldalt.');return;}
 expected=api().getProfile();token=makeToken();working=false;
 clear();
 $('hhIfProfile1175').textContent=expected==='monika'?'Mónika':'Zsolt';
 $('hhInterfoodDialogV1175').showModal();
 $('hhIfPaste1175').focus();
}
function recognize(){
 const parsed=parseMenuCopy($('hhIfPaste1175').value);
 if(parsed.code)$('hhIfCode1175').value=parsed.code;
 if(parsed.name)$('hhIfName1175').value=parsed.name;
 for(const key of K){
  const n=parsed.nutrients[key];
  if(n!=null)$('hhIf'+key[0].toUpperCase()+key.slice(1)+'1175').value=String(n);
 }
 updatePreview();
 notice(parsed.name?'Étel felismerve. Ellenőrizd az adatokat, majd mentsd a naplóba.':
  'A név nem ismerhető fel automatikusan. Add meg az étel nevét és ellenőrizd a tápértékeket.',
  parsed.name?'info':'warning');
}
function save(event){
 event?.preventDefault?.();
 if(working)return;
 const name=$('hhIfName1175').value.trim(),code=$('hhIfCode1175').value.trim().toUpperCase();
 const portions=Number($('hhIfPortions1175').value),meal=$('hhIfMeal1175').value,nutrients=values();
 if(!name||name.length<2){notice('Add meg az étel nevét.','error');$('hhIfName1175').focus();return;}
 if(!Number.isFinite(portions)||portions<.25||portions>4){notice('Az adagszám 0,25 és 4 között lehet.','error');return;}
 if(!/^[A-Z0-9]{0,8}$/.test(code)){notice('Érvénytelen Interfood ételkód.','error');return;}
 for(const key of K){
  const n=nutrients[key];
  if(n!=null&&(!Number.isFinite(n)||n<0||n>(key==='kcal'?5000:1000))){
   notice('Ellenőrizd a tápértékeket.','error');return;
  }
 }
 if(api()?.getProfile?.()!==expected){notice('Közben profilt váltottál. Nyisd meg újra az importot.','error');return;}
 working=true;$('hhIfSave1175').disabled=true;
 try{
  const result=api().recordInterfoodMeal({token,expectedProfile:expected,code,name,portions,meal,nutrients});
  if(!result?.id||result.profile!==expected)throw Error('A napló mentésének nincs visszaigazolása.');
  $('hhInterfoodDialogV1175').close();
  const text='🎉 TADAAA! '+result.name+' · '+String(portions).replace('.',',')+' adag · '+meal+
   ' · Napi naplóba mentve'+(result.duplicate?' (már rögzítve)':'')+'.';
  const toast=$('hhManualToast1135');
  if(toast){toast.textContent=text;toast.hidden=false;root.setTimeout?.(()=>{toast.hidden=true},5000);}
  else root.alert?.(text);
  $('log')?.scrollIntoView?.({behavior:'smooth',block:'start'});
 }catch(err){notice(String(err?.message||err||'Ismeretlen mentési hiba'),'error');}
 finally{working=false;$('hhIfSave1175').disabled=false;}
}
function init(){
 const tile=$('hhInterfoodTileV1173');
 if(!tile||$('hhInterfoodLogV1175')||!doc?.body)return;
 const trigger=doc.createElement('button');
 trigger.id='hhInterfoodLogV1175';trigger.type='button';
 trigger.setAttribute('aria-haspopup','dialog');
 trigger.setAttribute('aria-controls','hhInterfoodDialogV1175');
 trigger.innerHTML='<span>🍱 Interfood étel naplózása</span><small>Ételkód · ételnév · tápértékek átvétele</small><b aria-hidden="true">＋</b>';
 tile.insertAdjacentElement('afterend',trigger);
 const dlg=doc.createElement('dialog');dlg.id='hhInterfoodDialogV1175';dlg.setAttribute('aria-labelledby','hhIfTitle1175');
 dlg.innerHTML=`<div class="hh-if-shell-v1175">
  <header><div><small>HEALTHHUB × INTERFOOD</small><h2 id="hhIfTitle1175">Étel a Napi naplóba</h2>
   <p>Profil: <strong id="hhIfProfile1175"></strong> · naplózás a mai napra</p></div>
   <button type="button" id="hhIfClose1175" aria-label="Bezárás">✕</button>
  </header>
  <form id="hhIfForm1175" autocomplete="off">
   <div class="hh-if-intro-v1175">Az <a href="https://rendel.interfood.hu/" target="_blank" rel="noopener noreferrer">Interfood étlapjáról</a> másold be a kiválasztott étel kódját, nevét és tápértékét, vagy töltsd ki az alábbi mezőket.</div>
   <label>Másolt Interfood ételadatok (opcionális)
    <textarea id="hhIfPaste1175" rows="3" maxlength="4000" placeholder="D9 - Főétel&#10;Kemencében sült csirkemell, görög saláta&#10;481 kcal, 24g szénh., 45g fehérje, 25g zsír"></textarea></label>
   <button type="button" class="hh-if-parse-v1175" id="hhIfParse1175">✦ Adatok felismerése</button>
   <div class="hh-if-fields-v1175">
    <label>Ételkód<input id="hhIfCode1175" maxlength="8" placeholder="D9"></label>
    <label class="hh-if-wide-v1175">Étel neve<input id="hhIfName1175" maxlength="80" required placeholder="Pl. Kemencében sült csirkemell"></label>
    <label>Étkezés<select id="hhIfMeal1175"><option>Reggeli</option><option>Tízórai</option><option selected>Ebéd</option><option>Uzsonna</option><option>Vacsora</option><option>Egyéb</option></select></label>
    <label>Elfogyasztott adag<input id="hhIfPortions1175" type="number" min="0.25" max="4" step="0.25" value="1" required></label>
   </div>
   <p class="hh-if-hint-v1175">A tápértékek 1 Interfood adagra értendők, nem 100 grammra. Ismeretlen értéket hagyj üresen.</p>
   <div class="hh-if-fields-v1175 hh-if-nutrients-v1175">
    <label>kcal / adag<input id="hhIfKcal1175" type="number" min="0" max="5000" step="any" placeholder="—"></label>
    <label>Fehérje (g)<input id="hhIfProtein1175" type="number" min="0" max="1000" step="any" placeholder="—"></label>
    <label>Szénhidrát (g)<input id="hhIfCarbs1175" type="number" min="0" max="1000" step="any" placeholder="—"></label>
    <label>Zsír (g)<input id="hhIfFat1175" type="number" min="0" max="1000" step="any" placeholder="—"></label>
   </div>
   <div class="hh-if-preview-v1175"><small>RÖGZÍTENDŐ ADAG TÁPÉRTÉKE</small><div>
    <span><b id="hhIfPreviewKcal1175">—</b> kcal</span><span><b id="hhIfPreviewProtein1175">—</b> F</span>
    <span><b id="hhIfPreviewCarbs1175">—</b> CH</span><span><b id="hhIfPreviewFat1175">—</b> Zs</span></div></div>
   <p id="hhIfState1175" role="status" aria-live="polite"></p>
   <footer><button type="button" id="hhIfCancel1175">Mégse</button><button type="submit" id="hhIfSave1175">✓ Napi naplóba mentés</button></footer>
  </form></div>`;
 doc.body.append(dlg);
 trigger.addEventListener('click',open);
 $('hhIfClose1175').addEventListener('click',()=>dlg.close());
 $('hhIfCancel1175').addEventListener('click',()=>dlg.close());
 $('hhIfParse1175').addEventListener('click',recognize);
 $('hhIfPaste1175').addEventListener('paste',()=>root.setTimeout?.(recognize,0));
 $('hhIfForm1175').addEventListener('submit',save);
 $('hhIfPortions1175').addEventListener('input',updatePreview);
 for(const key of K)$('hhIf'+key[0].toUpperCase()+key.slice(1)+'1175').addEventListener('input',updatePreview);
}
if(doc){
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
root.HH_INTERFOOD_DIARY_V1175={parseMenuCopy,scale,open};
if(typeof module!=='undefined'&&module.exports)module.exports={parseMenuCopy,scale};
})(typeof window!=='undefined'?window:{},typeof document!=='undefined'?document:null);
