(function(){
'use strict';
/* HealthHub v1.297b — Evidence + sourced answer UI */
var STYLE='hh-v297-style';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function style(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '.hhEvBtn297{background:#b05b21!important;color:#fff!important}.hhEvBtn297[disabled]{opacity:.55}'+
 '.hhEvBox297{margin-top:12px;background:#fffaf5;border:1px solid #f0dccd;border-radius:14px;padding:11px;color:#334d60;font-size:12px;line-height:1.55}'+
 '.hhEvBox297 h3{margin:0 0 7px;color:#8a4318;font-size:14px}.hhEvAnswer297{white-space:pre-wrap}.hhEvSrc297{margin-top:9px;padding-top:8px;border-top:1px solid #f0e3d9}.hhEvSrc297 div{padding:4px 0;color:#5c7486}'+
 '.hhEvTag297{display:inline-block;background:#fff0e5;color:#934817;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:800;margin-left:6px}';
 document.head.appendChild(s);
}
function modal(){return document.getElementById('hhLenaResearchModal295')}
function ensure(){
 style();var m=modal();if(!m)return;
 var actions=m.querySelector('.hhRActions295');if(!actions)return;
 if(!m.querySelector('#hhEvBtn297')){
  var b=document.createElement('button');b.type='button';b.id='hhEvBtn297';b.className='hhEvBtn297';b.textContent='🧠 Bizonyíték + válasz';b.style.display='none';b.onclick=manual;actions.appendChild(b);
 }
 if(!m.querySelector('#hhEvBox297')){
  var x=document.createElement('div');x.id='hhEvBox297';x.className='hhEvBox297';x.style.display='none';
  var prog=m.querySelector('#hhRProg296');if(prog)prog.insertAdjacentElement('afterend',x);else actions.insertAdjacentElement('afterend',x);
 }
}
function currentQuestion(){
 var q=document.getElementById('hhRQ295');return q?(q.value||'').trim():'';
}
function render(pack){
 ensure();var box=document.getElementById('hhEvBox297'),b=document.getElementById('hhEvBtn297');if(!box||!pack)return;
 var a=pack.answerDraft||{},src=a.sources||[];
 box.style.display='';
 box.innerHTML='<h3>🧠 Léna Evidence Engine <span class="hhEvTag297">v297</span></h3>'+
  '<div class="hhEvAnswer297">'+esc(a.text||'Nincs válaszvázlat.')+'</div>'+
  '<div class="hhEvSrc297"><b>Források</b>'+
  (src.length?src.map(function(x){return'<div>'+esc(x)+'</div>'}).join(''):'<div>Nincs forrás hozzárendelve.</div>')+
  '</div>';
 if(b){b.style.display='';b.textContent='✅ Bizonyíték + válasz kész'}
}
function showManual(){
 ensure();var b=document.getElementById('hhEvBtn297');if(b)b.style.display='';
}
async function manual(){
 var b=document.getElementById('hhEvBtn297');if(!b)return;b.disabled=true;b.textContent='🧠 Elemzés…';
 try{
  var bundle=window.hhGetLenaResearchBundle296&&window.hhGetLenaResearchBundle296();if(!bundle)throw Error('Előbb készíts forráscsomagot.');
  var pack=await window.hhBuildLenaEvidence297(bundle,true);render(pack);
 }catch(e){
  var box=document.getElementById('hhEvBox297');if(box){box.style.display='';box.innerHTML='<h3>⚠ Evidence Engine</h3>'+esc(e.message||e)}
  b.textContent='🧠 Újrapróbálás';
 }finally{b.disabled=false}
}
window.addEventListener('healthhub:lena-research-refined',function(e){
 setTimeout(function(){
  ensure();
  var m=modal(),o=m&&m.querySelector('#hhROut295');
  if(o&&e.detail&&e.detail.route&&e.detail.route.relevance){
   var r=e.detail.route.relevance,a=r.anchorDocument;
   var note=document.createElement('div');note.className='hhRBox295';note.style.background='#f6fbff';
   note.innerHTML='<b>🎯 v297 relevancia:</b> '+(a?('időbeli horgony: '+esc(a.date)+' · '+esc(a.title)):'nincs külön időbeli horgony')+
    '<br><span style="color:#6e8290">A leletek időbeli és klinikai közelség szerint újrarangsorolva.</span>';
   o.prepend(note);
  }
 },80);
});
window.addEventListener('healthhub:lena-retrieval-complete',function(){setTimeout(showManual,70)});
window.addEventListener('healthhub:lena-evidence-complete',function(e){render(e.detail&&e.detail.pack)});
window.addEventListener('healthhub:lena-evidence-error',function(e){
 ensure();var box=document.getElementById('hhEvBox297');if(!box)return;box.style.display='';box.innerHTML='<h3>⚠ Evidence Engine</h3>'+esc(e.detail&&e.detail.error||'Ismeretlen hiba');showManual();
});
window.addEventListener('focus',function(){setTimeout(function(){ensure();var p=window.hhGetLenaEvidence297&&window.hhGetLenaEvidence297();if(p&&p.question===currentQuestion())render(p)},220)});
setTimeout(function(){ensure();var p=window.hhGetLenaEvidence297&&window.hhGetLenaEvidence297();if(p)render(p)},2300);
document.documentElement.dataset.healthhubLenaEvidenceUi='1.297';
})();