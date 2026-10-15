/* v566 progressive enhancements: question suggestions + client-side history filter.
   No automatic medical context attached; no changes to send/sync/storage. */
(function(){
'use strict';
function enhance(){
 var page=document.getElementById('hhLenaSmart299');if(!page)return;
 var composer=page.querySelector('#hhLenaComposer340'),question=page.querySelector('#hhSQ299');
 if(composer&&question&&!page.querySelector('#hhChat566Suggestions')){
  var section=document.createElement('section');section.id='hhChat566Suggestions';section.setAttribute('aria-label','Javasolt kérdések');
  var title=document.createElement('div');title.className='hhChat566Label';title.textContent='GYORS KÉRDÉSEK';section.appendChild(title);
  var choices=document.createElement('div');choices.className='hhChat566Suggestions';
  ['Elemezd az elmúlt 7 nap alvását','Milyen aktivitási trendjeim vannak?','Foglald össze a legutóbbi leleteimet','Mit mutatnak az egészségügyi trendjeim?'].forEach(function(label){
   var b=document.createElement('button');b.type='button';b.textContent=label;
   b.addEventListener('click',function(){question.value=label;question.dispatchEvent(new Event('input',{bubbles:true}));question.focus();});
   choices.appendChild(b);
  });section.appendChild(choices);composer.insertAdjacentElement('beforebegin',section);
 }
 var history=page.querySelector('#hhHistory364');
 if(history&&!history.querySelector('#hhChat566Search')){
  var input=document.createElement('input');input.type='search';input.id='hhChat566Search';input.className='hhChat566Search';
  input.placeholder='Keresés az előzmények között';input.setAttribute('aria-label','Előzmények keresése');
  var list=history.querySelector('.hhHistList364');
  if(list)list.insertAdjacentElement('beforebegin',input);else history.appendChild(input);
  input.addEventListener('input',filter);
 }
 if(history&&history.querySelector('#hhChat566Search'))filter();
 function filter(){
  var h=page.querySelector('#hhHistory364'),inp=page.querySelector('#hhChat566Search');if(!h||!inp)return;
  var term=inp.value.trim().toLocaleLowerCase('hu');
  h.querySelectorAll('.hhHistRow364').forEach(function(row){row.hidden=!!term&&!row.textContent.toLocaleLowerCase('hu').includes(term);row.style.display=row.hidden?'none':''});
 }
}
var pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;enhance()})}
function init(){schedule();var root=document.getElementById('hhLenaSmart299');if(root&&window.MutationObserver){
 var obs=new MutationObserver(function(records){if(records.some(function(r){return r.type==='childList'&&r.target.closest&&r.target.closest('#hhHistory364')}))schedule()});
 obs.observe(root,{childList:true,subtree:true});
}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('healthhub:ask-lena-open',schedule);
window.addEventListener('healthhub:ask-lena-complete',schedule);
window.addEventListener('storage',schedule);
})();