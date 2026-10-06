(function(){
'use strict';
/* HealthHub v1.286 — Ask Léna opens local ChatGPT client / web fallback */

var ANDROID_INTENT='intent://chatgpt.com/#Intent;scheme=https;package=com.openai.chatgpt;S.browser_fallback_url=https%3A%2F%2Fchatgpt.com%2F;end';
var WEB_URL='https://chatgpt.com/';

function isAskLena(el){
  if(!el)return false;
  var text=(el.textContent||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return /ask\s+lena/.test(text);
}

function openChatGPT(){
  try{
    var ua=navigator.userAgent||'';
    if(/Android/i.test(ua)){
      window.location.href=ANDROID_INTENT;
      return;
    }
    window.location.href=WEB_URL;
  }catch(e){
    window.location.href=WEB_URL;
  }
}

document.addEventListener('click',function(e){
  var el=e.target&&e.target.closest&&e.target.closest('button,a,[role="button"]');
  if(!isAskLena(el))return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  openChatGPT();
},true);

window.hhOpenLenaChatGPT286=openChatGPT;
document.documentElement.dataset.healthhubAskLena='1.286';
})();