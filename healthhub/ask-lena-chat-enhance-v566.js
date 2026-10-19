/* v699: profile-scoped editable quick questions + historical search filter.
   Device-only shortcut text. Never sent to AI without explicit user research.
 */
(function(){
'use strict';
var defaults=['Elemezd az elmúlt 7 nap alvását','Milyen aktivitási trendjeim vannak?',
 'Foglald össze a legutóbbi leleteimet','Mit mutatnak az egészségügyi trendjeim?'];
var LIMIT=18,MAX=230,pending=false;
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function key(p){return 'hh-ask-quick-v699-'+p}
function tidy(s){return String(s||'').replace(/\s+/g,' ').trim().slice(0,MAX)}
function valid(xs){return Array.isArray(xs)&&xs.length<=LIMIT&&
 xs.every(x=>typeof x==='string'&&x.length>=8&&x===tidy(x))&&
 new Set(xs.map(x=>x.toLocaleLowerCase('hu-HU'))).size===xs.length}
function read(p){try{var a=JSON.parse(localStorage.getItem(key(p))||'null');if(valid(a))return a}catch(_){}
 return defaults.slice()}
function store(p,xs){if(!valid(xs))return false;try{localStorage.setItem(key(p),JSON.stringify(xs));return true}catch(_){return false}}
function node(tag,cls,value){
 var x=document.createElement(tag);if(cls)x.className=cls;
 if(value!==undefined)x.textContent=value;return x;
}
function panel(composer,q){
 var section=node('section');section.id='hhChat566Suggestions';section.setAttribute('aria-label','Gyors kérdések');
 var header=node('div','hhChat566QuickHeader');
 var title=node('div','hhChat566Label','GYORS KÉRDÉSEK');
 var edit=node('button','hhChat566Edit','✎ Szerkesztés');edit.type='button';
 edit.setAttribute('aria-expanded','false');header.append(title,edit);section.appendChild(header);
 var wheel=node('div','hhChat566Suggestions');wheel.id='hhChat566Wheel699';
 wheel.setAttribute('role','list');wheel.tabIndex=0;wheel.setAttribute('aria-label','Görgethető gyors kérdések');
 section.appendChild(wheel);
 var editor=node('div','hhChat566Editor');editor.hidden=true;
 var field=node('textarea');field.rows=2;field.maxLength=MAX;
 field.placeholder='Írd be az új vagy módosított kérdést…';
 field.setAttribute('aria-label','Saját gyors kérdés szövege');
 var buttons=node('div','hhChat566EditActions');
 var save=node('button','','＋ Mentés');save.type='button';
 var cancel=node('button','','Mégse');cancel.type='button';
 var restore=node('button','','Alapértelmezett');restore.type='button';
 buttons.append(save,cancel,restore);
 var info=node('small','hhChat566Info','');info.setAttribute('role','status');
 editor.append(field,buttons,info);section.appendChild(editor);
 composer.insertAdjacentElement('beforebegin',section);
 var state={p:profile(),rows:read(profile()),idx:-1,editing:false};
 function show(t){info.textContent=t}
 function repaint(){
  wheel.textContent='';
  if(!state.rows.length)wheel.appendChild(node('small','hhChat566Empty','Még nincs kérdés. Adj hozzá egy sajátot!'));
  state.rows.forEach(function(t,i){
   var item=node('div','hhChat566QuickItem');item.setAttribute('role','listitem');
   var choose=node('button','hhChat566QuickChoice',t);choose.type='button';
   choose.addEventListener('click',function(){
    refreshProfile();if(state.rows[i]!==t)return;
    q.value=t;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus();
   });item.appendChild(choose);
   if(state.editing){
    var rename=node('button','hhChat566Mini','✎');rename.type='button';
    rename.title='Szerkesztés';rename.setAttribute('aria-label','Szerkesztés: '+t);
    rename.addEventListener('click',function(){
     refreshProfile();if(state.rows[i]!==t)return;
     state.idx=i;field.value=t;save.textContent='✓ Módosítás mentése';
     show('');field.focus();
    });
    var del=node('button','hhChat566Mini','×');del.type='button';
    del.title='Törlés';del.setAttribute('aria-label','Törlés: '+t);
    del.addEventListener('click',function(){
     refreshProfile();if(state.rows[i]!==t)return;
     var next=state.rows.filter(function(_,j){return i!==j});
     if(!store(state.p,next)){show('⚠ Nem sikerült menteni.');return}
     state.rows=next;state.idx=-1;field.value='';save.textContent='＋ Mentés';
     show('Kérdés törölve.');repaint();
    });
    item.append(rename,del);
   }
   wheel.appendChild(item);
  });
 }
 function refreshProfile(){
  var p=profile();if(p===state.p)return;
  state.p=p;state.rows=read(p);state.idx=-1;field.value='';
  save.textContent='＋ Mentés';show('');repaint();
 }
 edit.addEventListener('click',function(){
  refreshProfile();state.editing=!state.editing;editor.hidden=!state.editing;
  edit.textContent=state.editing?'✓ Kész':'✎ Szerkesztés';
  edit.setAttribute('aria-expanded',String(state.editing));repaint();
 });
 save.addEventListener('click',function(){
  refreshProfile();var t=tidy(field.value),rows=state.rows.slice();
  if(t.length<8){show('⚠ Legalább 8 karakter szükséges.');return}
  if(rows.some(function(x,i){return i!==state.idx&&x.toLocaleLowerCase('hu-HU')===t.toLocaleLowerCase('hu-HU')})){
   show('⚠ Ez a kérdés már szerepel.');return
  }
  if(state.idx<0){if(rows.length>=LIMIT){show('⚠ Legfeljebb 18 kérdés lehet.');return}rows.push(t)}
  else{if(state.idx>=rows.length)return;rows[state.idx]=t}
  if(!store(state.p,rows)){show('⚠ Ezen a készüléken nem sikerült menteni.');return}
  state.rows=rows;state.idx=-1;field.value='';save.textContent='＋ Mentés';
  show('✅ Mentve '+(state.p==='monika'?'Mónika':'Zsolt')+' helyi listájába.');repaint();
 });
 cancel.addEventListener('click',function(){state.idx=-1;field.value='';save.textContent='＋ Mentés';show('')});
 restore.addEventListener('click',function(){
  refreshProfile();var rows=defaults.slice();if(!store(state.p,rows)){show('⚠ Nem sikerült menteni.');return}
  state.rows=rows;state.idx=-1;field.value='';save.textContent='＋ Mentés';
  show('Alapértelmezett kérdések visszaállítva.');repaint();
 });
 section.hhQuickRefresh699=refreshProfile;
 repaint();
}
function filter(page){
 var h=page.querySelector('#hhHistory364'),inp=page.querySelector('#hhChat566Search');
 if(!h||!inp)return;
 var term=inp.value.trim().toLocaleLowerCase('hu-HU');
 h.querySelectorAll('.hhHistRow364').forEach(function(row){
  var hide=!!term&&!row.textContent.toLocaleLowerCase('hu-HU').includes(term);
  if(row.hidden!==hide)row.hidden=hide;
  var css=hide?'none':'';
  if(row.style.display!==css)row.style.display=css;
 });
}
function enhance(){
 var page=document.getElementById('hhLenaSmart299');if(!page)return;
 var composer=page.querySelector('#hhLenaComposer340'),q=page.querySelector('#hhSQ299');
 if(composer&&q){
  var quick=page.querySelector('#hhChat566Suggestions');
  if(!quick)panel(composer,q);
  else if(quick.hhQuickRefresh699)quick.hhQuickRefresh699();
 }
 var history=page.querySelector('#hhHistory364');
 if(history&&!history.querySelector('#hhChat566Search')){
  var inp=node('input');inp.type='search';inp.id='hhChat566Search';
  inp.className='hhChat566Search';inp.placeholder='Keresés az előzmények között';
  inp.setAttribute('aria-label','Előzmények keresése');
  var list=history.querySelector('.hhHistList364');
  if(list)list.insertAdjacentElement('beforebegin',inp);else history.appendChild(inp);
  inp.addEventListener('input',function(){filter(page)});
 }
 if(history)filter(page);
}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;enhance()})}
function init(){
 schedule();var root=document.getElementById('hhLenaSmart299');
 if(root&&window.MutationObserver){
  var obs=new MutationObserver(function(records){
   if(records.some(function(r){return r.type==='childList'&&r.target.closest&&r.target.closest('#hhHistory364')}))schedule();
  });obs.observe(root,{childList:true,subtree:true});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('healthhub:ask-lena-open',schedule);
window.addEventListener('healthhub:ask-lena-complete',schedule);
window.addEventListener('healthhub:profile-changed',schedule);
window.addEventListener('storage',function(e){if(!e.key||e.key.indexOf('hh-ask-quick-v699-')===0)schedule()});
})();