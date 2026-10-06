(function(){
'use strict';
/* HealthHub v1.298b — concise answer UI + source links */
var STYLE='hh-v298-style';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function style(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '.hhAns298{margin-top:12px;background:#fff;border:1px solid #dce7ec;border-radius:16px;padding:13px;color:#294b61;font-size:12px;line-height:1.58;box-shadow:0 5px 18px rgba(34,73,96,.06)}'+
 '.hhAns298 h3{margin:0;color:#173f62;font-size:15px}.hhAnsLead298{margin:9px 0 12px;font-size:13px;color:#254a63}'+
 '.hhAnsSec298{margin-top:11px;border-radius:12px;padding:10px}.hhAnsSure298{background:#eef9f3;border:1px solid #d5eee1}.hhAnsLikely298{background:#fff8e9;border:1px solid #f3e3b9}.hhAnsUnknown298{background:#f5f6f8;border:1px solid #e4e7eb}'+
 '.hhAnsSec298 b{display:block;margin-bottom:5px}.hhAnsItem298{margin:7px 0}.hhAnsRef298{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:5px;border-radius:999px;background:#e4eef5;color:#1c5f83;text-decoration:none;font-size:9px;font-weight:900;vertical-align:middle}'+
 '.hhAnsTake298{margin-top:12px;padding:10px 11px;border-radius:12px;background:#edf4ff;border-left:4px solid #477eb6;font-weight:700;color:#214f75}'+
 '.hhAnsSources298{margin-top:11px;padding-top:9px;border-top:1px solid #e7edf1}.hhAnsSource298{padding:5px 0;color:#607888}.hhAnsSource298 a{color:#1b6f9d;text-decoration:none;font-weight:700}'+
 '.hhAnsRaw298{margin-top:10px}.hhAnsRaw298 summary{cursor:pointer;font-weight:800;color:#6a7d89}.hhAnsRaw298 pre{white-space:pre-wrap;font:inherit;background:#f7fafc;border-radius:10px;padding:9px;max-height:260px;overflow:auto}'+
 '.hhAnsBtn298{background:#477eb6!important;color:#fff!important}.hhAnsTag298{display:inline-block;margin-left:6px;background:#e9f1fb;color:#316b9f;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900}';
 document.head.appendChild(s);
}
function modal(){return document.getElementById('hhLenaResearchModal295')}
function hdr(){
 var m=modal();if(!m)return;
 var h=m.querySelector('.hhRHead295 h2'),sm=m.querySelector('.hhRHead295 small');
 if(h)h.textContent='🧠 Léna Research · v298';
 if(sm)sm.textContent='kérdés → relevancia → eredeti leletek → bizonyíték → forrásolt válasz';
}
function ensure(){
 style();hdr();var m=modal();if(!m)return;
 var actions=m.querySelector('.hhRActions295');if(!actions)return;
 if(!m.querySelector('#hhAnsBtn298')){
  var b=document.createElement('button');b.type='button';b.id='hhAnsBtn298';b.className='hhAnsBtn298';b.textContent='✨ Válasz újraépítése';b.style.display='none';b.onclick=manual;actions.appendChild(b);
 }
 if(!m.querySelector('#hhAnsBox298')){
  var x=document.createElement('div');x.id='hhAnsBox298';x.className='hhAns298';x.style.display='none';
  var old=m.querySelector('#hhEvBox297');if(old)old.insertAdjacentElement('afterend',x);else actions.insertAdjacentElement('afterend',x);
 }
}
function sourceIndex(answer){
 var m={};(answer.sources||[]).forEach(function(s,i){m[String(s.documentId)+'|'+String(s.page||'')]=i+1});return m;
}
function refHtml(s,idx){
 if(!s)return'';var n=idx[String(s.documentId)+'|'+String(s.page||'')]||'?';
 return s.webViewLink?'<a class="hhAnsRef298" href="'+esc(s.webViewLink)+'" target="_blank" rel="noopener">['+n+']</a>':'<span class="hhAnsRef298">['+n+']</span>';
}
function render(answer){
 ensure();var box=document.getElementById('hhAnsBox298'),btn=document.getElementById('hhAnsBtn298');if(!box||!answer)return;
 var idx=sourceIndex(answer),doc=answer.documented||[],likely=answer.likely||[],unknown=answer.unknown||[];
 var old=document.getElementById('hhEvBox297');if(old)old.style.display='none';
 var oldBtn=document.getElementById('hhEvBtn297');if(oldBtn)oldBtn.style.display='none';
 var html='<h3>✨ Léna válasza <span class="hhAnsTag298">v298</span></h3>'+
  '<div class="hhAnsLead298">'+esc(answer.summary||'')+'</div>';
 if(doc.length){
  html+='<div class="hhAnsSec298 hhAnsSure298"><b>✅ Amit biztosan dokumentálunk</b>'+
   doc.map(function(c){return'<div class="hhAnsItem298">'+esc(c.text)+refHtml(c.source,idx)+'</div>'}).join('')+'</div>';
 }
 if(likely.length){
  html+='<div class="hhAnsSec298 hhAnsLikely298"><b>🟡 Ami valószínű</b>'+
   likely.map(function(c){var rr=(c.sources||[]).slice(0,2).map(function(s){return refHtml(s,idx)}).join('');return'<div class="hhAnsItem298">'+esc(c.text)+rr+'</div>'}).join('')+'</div>';
 }
 if(unknown.length){
  html+='<div class="hhAnsSec298 hhAnsUnknown298"><b>⚪ Amit ebből nem tudunk biztosan</b>'+
   unknown.map(function(c){return'<div class="hhAnsItem298">'+esc(c.text)+'</div>'}).join('')+'</div>';
 }
 if(answer.takeaway)html+='<div class="hhAnsTake298">Röviden: '+esc(answer.takeaway.replace(/^Röviden:\s*/i,''))+'</div>';
 html+='<div class="hhAnsSources298"><b>📚 Felhasznált eredeti források</b>'+
  (answer.sources||[]).map(function(s,i){var label='['+(i+1)+'] '+(s.date||'dátum nélkül')+' · '+s.title+(s.page?' · '+s.page+'. oldal':'');return'<div class="hhAnsSource298">'+(s.webViewLink?'<a href="'+esc(s.webViewLink)+'" target="_blank" rel="noopener">'+esc(label)+'</a>':esc(label))+'</div>'}).join('')+
  '</div>';
 var ep=window.hhGetLenaEvidence297&&window.hhGetLenaEvidence297();
 if(ep&&ep.answerDraft&&ep.answerDraft.text)html+='<details class="hhAnsRaw298"><summary>Nyers Evidence Engine válasz megtekintése</summary><pre>'+esc(ep.answerDraft.text)+'</pre></details>';
 box.innerHTML=html;box.style.display='';
 if(btn){btn.style.display='';btn.textContent='✨ Válasz újraépítése'}
}
async function manual(){
 var b=document.getElementById('hhAnsBtn298');if(!b)return;b.disabled=true;b.textContent='✨ Építés…';
 try{
  var p=window.hhGetLenaEvidence297&&window.hhGetLenaEvidence297();if(!p)throw Error('Nincs Evidence Pack.');
  var a=await window.hhComposeLenaAnswer298(p,true);render(a);
 }catch(e){
  var box=document.getElementById('hhAnsBox298');if(box){box.style.display='';box.innerHTML='<h3>⚠ Answer Composer</h3>'+esc(e.message||e)}
 }finally{b.disabled=false;b.textContent='✨ Válasz újraépítése'}
}
window.addEventListener('healthhub:lena-answer-composed',function(e){render(e.detail&&e.detail.answer)});
window.addEventListener('healthhub:lena-answer-complete',function(e){render(e.detail&&e.detail.answer)});
window.addEventListener('healthhub:lena-answer-error',function(e){
 ensure();var box=document.getElementById('hhAnsBox298');if(box){box.style.display='';box.innerHTML='<h3>⚠ Answer Composer</h3>'+esc(e.detail&&e.detail.error||'Ismeretlen hiba')}
});
window.addEventListener('healthhub:lena-research-routed',function(){setTimeout(hdr,80)});
window.addEventListener('focus',function(){setTimeout(function(){ensure();var a=window.hhGetLenaAnswer298&&window.hhGetLenaAnswer298();if(a)render(a)},180)});
setTimeout(function(){ensure();var a=window.hhGetLenaAnswer298&&window.hhGetLenaAnswer298();if(a)render(a)},2400);
document.documentElement.dataset.healthhubLenaAnswerUi='1.298';
})();