(function(){
'use strict';

/* HealthHub v1.39 — uniform typography lift: +0.5 px to rendered text.
   Geometry/icons stay untouched. Dynamic UI inherits or receives the same lift. */
var BOOST=0.5,MARK='hhFontBoosted';

function eligible(el){
  if(!el||el.nodeType!==1)return false;
  var t=el.tagName;
  return !/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|SVG|PATH|CIRCLE|LINE|POLYLINE|POLYGON|RECT|IMG|SOURCE|BR|HR|CANVAS)$/i.test(t);
}
function px(el){
  var n=parseFloat(getComputedStyle(el).fontSize);
  return Number.isFinite(n)?n:null;
}
function initialBoost(){
  var nodes=[document.documentElement,document.body].concat(Array.from(document.body.querySelectorAll('*'))).filter(eligible);
  var sizes=new Map();
  nodes.forEach(function(el){var n=px(el);if(n!=null)sizes.set(el,n)});
  nodes.forEach(function(el){
    var n=sizes.get(el);if(n==null||el.dataset[MARK])return;
    el.style.fontSize=(Math.round((n+BOOST)*100)/100)+'px';
    el.dataset[MARK]='1';
  });
}
function ruleHasFontSize(el){
  if(el.style&&el.style.fontSize)return true;
  if(/^(H1|H2|H3|H4|H5|H6|SMALL|BUTTON|INPUT|TEXTAREA|SELECT|OPTION|LABEL)$/i.test(el.tagName))return true;
  function scan(rules){
    if(!rules)return false;
    for(var i=0;i<rules.length;i++){
      var r=rules[i];
      try{
        if(r.type===CSSRule.STYLE_RULE&&r.style&&r.style.fontSize&&r.selectorText&&el.matches(r.selectorText))return true;
        if(r.cssRules){
          if(r.media&&window.matchMedia&&r.media.media&&!matchMedia(r.media.media).matches)continue;
          if(scan(r.cssRules))return true;
        }
      }catch(_){}
    }
    return false;
  }
  for(var j=0;j<document.styleSheets.length;j++){
    try{if(scan(document.styleSheets[j].cssRules))return true}catch(_){}
  }
  return false;
}
function boostAdded(root){
  var nodes=[];
  if(eligible(root))nodes.push(root);
  if(root&&root.querySelectorAll)nodes=nodes.concat(Array.from(root.querySelectorAll('*')).filter(eligible));
  nodes.forEach(function(el){
    if(el.dataset[MARK])return;
    var current=px(el);if(current==null)return;
    if(ruleHasFontSize(el)){
      el.style.fontSize=(Math.round((current+BOOST)*100)/100)+'px';
    }
    /* Elements without their own font-size already inherit the boosted parent. */
    el.dataset[MARK]='1';
  });
}
function installObserver(){
  if(window.hhFontBoostObserver)return;
  var o=new MutationObserver(function(ms){
    ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1)boostAdded(n)})});
  });
  o.observe(document.body,{childList:true,subtree:true});
  window.hhFontBoostObserver=o;
}
function run(){
  if(document.documentElement.dataset.healthhubTypography==='1.39')return;
  initialBoost();
  installObserver();
  document.documentElement.dataset.healthhubTypography='1.39';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,0)},{once:true});
else setTimeout(run,0);
window.HH_LIVE_BUILD='v1.39-typography-plus-half';
})();