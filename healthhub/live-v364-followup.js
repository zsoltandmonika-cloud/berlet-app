(function(){
'use strict';
// A second Ask Léna input, tied only to the current profile and last seen answer.
var prior={},pending=null;
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function el(x){return document.getElementById(x)}
function css(){
 if(el('hhFollow364Css'))return;
 var s=document.createElement('style');s.id='hhFollow364Css';
 s.textContent='#hhLenaSmart299 .hhFollow364{padding:13px 12px;border-radius:16px;background:var(--lena-ui-soft,#eff7fe);border:1px solid var(--lena-ui-border,#c5dbe8);margin-top:14px}'+
 '#hhLenaSmart299 .hhFollow364 h3{margin:0 0 5px;color:var(--lena-ui-dark,#296b9c);font-size:14px}'+
 '#hhLenaSmart299 .hhFollow364 p{margin:0 0 9px;color:#56768a;font-size:11px}'+
 '#hhLenaSmart299 .hhFollow364 textarea{box-sizing:border-box;resize:vertical;width:100%;min-height:84px;padding:10px;border:1px solid #c1d9e6;border-radius:13px;background:#fff;font:14px/1.45 system-ui;color:#233e53}'+
 '#hhLenaSmart299 .hhFollow364 button{display:block;margin-top:8px;width:100%;border:0;border-radius:12px;padding:11px;background:var(--lena-ui,#2c7db3);color:white;font-weight:800;font-size:13px}';
 document.head.appendChild(s);
}
function draw(){
 var a=el('hhAi331Answer'),p=profile(),old=el('hhFollow364');
 if(!a||!prior[p]){if(old)old.remove();return}
 css();var b=old||document.createElement('section');b.id='hhFollow364';b.className='hhFollow364';
 b.innerHTML='<h3>💬 Folytassuk, ha van még kérdés!</h3><p>Ha Léna pontosítást kért, itt válaszolhatsz. Az előző kérdés és válasz kontextusa is vele megy, de csak az aktuális profilból.</p>'+
 '<textarea id="hhFollowInput364" aria-label="Válasz vagy pontosítás Lénának" placeholder="Lénának ezt pontosítanám…"></textarea>'+
 '<button type="button" id="hhFollowSend364">↪ Válaszolok Lénának</button>';
 if(!old)a.appendChild(b);
 b.querySelector('#hhFollowSend364').onclick=function(){
  var input=el('hhFollowInput364'),v=input&&input.value.trim(),main=el('hhSQ299'),run=el('hhRun299');
  if(!v||v.length<3||!main||!run)return;
  if(run.disabled)return;
  var x=prior[profile()];
  pending={profile:profile(),previousQuestion:String(x.question).slice(0,1200),previousAnswer:String(x.answer).slice(0,2300),submittedQuestion:v.slice(0,1200)};
  main.value=v.slice(0,1200);main.dispatchEvent(new Event('input',{bubbles:true}));
  b.remove();run.click();
 };
}
function remember(x){
 if(!x||!['monika','zsolt'].includes(x.profile)||!x.question||!x.answer)return;
 prior[x.profile]={question:x.question,answer:x.answer};
 if(x.profile===profile())draw();
}
window.addEventListener('healthhub:ask-lena-complete',function(ev){if(ev&&ev.detail&&ev.detail.successful)remember(ev.detail)});
window.addEventListener('healthhub:profile-changed',function(){pending=null;draw()});
window.addEventListener('healthhub:ask-lena-open',function(){draw()});
window.HH_LENA_FOLLOWUP_V364={
 consume:function(p,question){
  if(!pending||pending.profile!==p||pending.submittedQuestion!==question)return null;
  var x=pending;pending=null;
  return {previousQuestion:x.previousQuestion,previousAnswer:x.previousAnswer}
 },
 fromHistory:remember
};
})();
