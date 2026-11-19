/* HealthHub Nutrition v1202 | approved pitcher + glass concept
 * 9 transparent PNG frames made client-side from ONE identical SVG jug master:
 * 0 ml empty + 8 water levels in 250 ml steps. Only the fill/waterline changes.
 * The existing diary/calories, jar resets, profile & goal math remain authoritative.
 * All user actions forward to the existing original waterQuickAdd/hhJarReset IDs.
 * Nothing is persisted, fetched or reported from this visual adapter.
 */
(function(){
 'use strict';
 var TOTAL=2000,STEP=250;
 function formatMl(n){return Math.max(0,Math.round(n)).toLocaleString('hu-HU')+' ml';}
 function numberFromJarLabel(label){
  var m=String(label||'').match(/utolsó ürítés óta\s*([\d\s.,\u00a0\u202f]+)\s*ml/i);
  return m?Math.max(0,Number(m[1].replace(/\D/g,''))):null;
 }
 /* Shared jug geometry: all 9 frames use the exact same SVG path, gradients,
    handle, rim, measurement ticks, lettering, shine and position. */
 function jugSvg(step){
  var y=[306,283,256,229,201,173,145,116,86][Math.max(0,Math.min(8,step))];
  var has=step>0;
  var water=has?'<g clip-path="url(#inside)"><path d="M65 '+y+' Q158 '+(y-8)+' 252 '+y+' L252 310 Q162 326 67 308Z" fill="url(#water)" opacity=".92"/><path d="M65 '+y+' Q158 '+(y-8)+' 252 '+y+'" stroke="#93ffff" stroke-width="3.5" fill="none" opacity=".94" filter="url(#glow)"/><path d="M65 '+y+' Q158 '+(y-8)+' 252 '+y+'" stroke="#e0ffff" stroke-width="1.4" fill="none" opacity=".92"/><ellipse cx="164" cy="'+(y+5)+'" rx="88" ry="9" fill="url(#foam)" opacity=".38"/><g fill="#e2fdff" opacity=".45"><circle cx="118" cy="'+(Math.max(y+20,150))+'" r="1.9"/><circle cx="133" cy="'+(Math.max(y+36,192))+'" r="1.4"/><circle cx="208" cy="'+(Math.max(y+45,220))+'" r="1.7"/><circle cx="191" cy="286" r="1.5"/></g></g>':'';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="340" viewBox="0 0 320 340" role="img" aria-hidden="true"><defs>'+
   '<linearGradient id="handle" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3baff"/><stop offset=".15" stop-color="#34265f"/><stop offset=".4" stop-color="#68e5ff"/><stop offset=".62" stop-color="#152b68"/><stop offset=".87" stop-color="#e4b9ff"/><stop offset="1" stop-color="#08cfff"/></linearGradient>'+
   '<linearGradient id="surface" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edcaff" stop-opacity=".38"/><stop offset=".21" stop-color="#2f58a0" stop-opacity=".18"/><stop offset=".62" stop-color="#194783" stop-opacity=".11"/><stop offset=".92" stop-color="#24c9ed" stop-opacity=".21"/><stop offset="1" stop-color="#ecb4ff" stop-opacity=".38"/></linearGradient>'+
   '<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffb3fa"/><stop offset=".33" stop-color="#b4e6ff"/><stop offset=".61" stop-color="#662d99"/><stop offset=".85" stop-color="#83f5ff"/><stop offset="1" stop-color="#e7b4ff"/></linearGradient>'+
   '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#79ffff" stop-opacity=".77"/><stop offset=".24" stop-color="#16d6f4" stop-opacity=".67"/><stop offset=".8" stop-color="#077bbd" stop-opacity=".82"/><stop offset="1" stop-color="#09c4f5" stop-opacity=".94"/></linearGradient>'+
   '<radialGradient id="foam"><stop stop-color="#e7ffff" stop-opacity=".8"/><stop offset="1" stop-color="#23d7ef" stop-opacity="0"/></radialGradient>'+
   '<linearGradient id="glassEdge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ed8cfe"/><stop offset=".12" stop-color="#f8e7ff"/><stop offset=".29" stop-color="#8bdcff" stop-opacity=".42"/><stop offset=".7" stop-color="#2585d6" stop-opacity=".3"/><stop offset=".89" stop-color="#ffb1ef"/><stop offset="1" stop-color="#13dcff"/></linearGradient>'+
   '<clipPath id="inside"><path d="M74 58 Q94 69 113 65 L207 65 Q230 66 237 61 C228 114 237 136 252 192 Q268 270 241 294 Q220 313 122 313 Q73 313 65 283 Q50 247 63 187 C75 125 81 93 74 58Z"/></clipPath>'+
   '<filter id="glow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="1.6"/></filter>'+
   '<filter id="glowBase"><feGaussianBlur stdDeviation="6"/></filter>'+
   '</defs>'+
   '<ellipse cx="154" cy="319" rx="100" ry="10" fill="#17d9ff" opacity=".36" filter="url(#glowBase)"/>'+
   /* The handle is BEHIND the body, exactly the same on every level. */
   '<path d="M237 94 C302 82 307 126 293 196 C281 254 258 260 248 236" fill="none" stroke="#09224b" stroke-width="30" stroke-linecap="round"/>'+
   '<path d="M237 94 C302 82 307 126 293 196 C281 254 258 260 248 236" fill="none" stroke="url(#handle)" stroke-width="22" stroke-linecap="round"/>'+
   '<path d="M243 101 C287 91 291 126 280 189 C271 236 256 244 248 228" fill="none" stroke="#edebff" stroke-width="3.8" stroke-linecap="round" opacity=".72"/>'+
   /* Same jug silhouette, no independent moving geometry. */
   '<path d="M73 49 Q99 67 115 61 L209 61 Q232 65 239 49 C226 100 237 144 253 196 Q268 261 245 291 Q224 315 119 313 Q67 310 60 285 C47 254 61 199 71 160 C81 117 82 87 73 49Z" fill="url(#surface)" stroke="url(#glassEdge)" stroke-width="5"/>'+
   water+
   '<path d="M76 66 C85 99 72 158 62 203 Q55 269 80 295" fill="none" stroke="#ffedff" stroke-width="12" stroke-linecap="round" opacity=".37"/>'+
   '<path d="M87 72 C93 129 70 189 73 242" fill="none" stroke="#eeb9ff" stroke-width="4" opacity=".38"/>'+
   '<path d="M221 70 C220 131 236 177 247 227 Q256 268 233 292" fill="none" stroke="#6efaff" stroke-width="9" opacity=".36"/>'+
   '<path d="M230 76 C230 130 251 187 251 221" fill="none" stroke="#f7d3ff" stroke-width="3" opacity=".52"/>'+
   '<path d="M62 283 Q75 320 160 321 Q241 318 247 287" fill="none" stroke="url(#rim)" stroke-width="4" opacity=".92"/>'+
   '<ellipse cx="158" cy="310" rx="79" ry="9" fill="none" stroke="#43eaff" stroke-width="2.5" opacity=".85"/>'+
   '<path d="M39 43 Q72 29 157 30 Q239 31 254 43 Q233 58 157 59 Q72 57 39 43Z" fill="#5e78ab" fill-opacity=".13" stroke="url(#rim)" stroke-width="5"/>'+
   '<ellipse cx="157" cy="43" rx="109" ry="10" fill="none" stroke="#e9efff" stroke-width="2.2" opacity=".7"/>'+
   '<path d="M40 44 Q33 46 28 58 Q54 59 72 51" fill="none" stroke="url(#rim)" stroke-width="5" stroke-linecap="round"/>'+
   '<g fill="none" stroke="#f5faff" stroke-width="2.1" stroke-linecap="round" opacity=".96">'+
   '<path d="M150 86 H169"/><path d="M158 116 H169" opacity=".67"/>'+
   '<path d="M150 145 H169"/><path d="M158 173 H169" opacity=".67"/>'+
   '<path d="M150 201 H169"/><path d="M158 231 H169" opacity=".67"/>'+
   '<path d="M150 256 H169"/>'+
   '</g>'+
   '<g font-family="Arial,system-ui,sans-serif" font-size="14" font-weight="700" fill="#f6faff" stroke="#122754" stroke-width=".7" paint-order="stroke">'+
   '<text x="177" y="90">2,0 l</text><text x="177" y="149">1,5 l</text><text x="177" y="205">1,0 l</text><text x="177" y="261">0,5 l</text></g>'+
   '<g fill="#dcecff" opacity=".50"><circle cx="102" cy="98" r="2.1"/><circle cx="95" cy="129" r="1.3"/><circle cx="107" cy="183" r="1.8"/><circle cx="111" cy="247" r="1.5"/><circle cx="216" cy="147" r="1.4"/><circle cx="225" cy="216" r="2"/></g>'+
   '</svg>';
 }
 function init(){
  var show=document.getElementById('hhWaterShowcaseV1202'),jug=document.getElementById('hhJugTapV1202'),glass=document.getElementById('hhGlassTapV1202');
  var oldAdd=document.getElementById('waterQuickAdd'),oldReset=document.getElementById('hhJarReset'),gauge=document.querySelector('#balanceCard .hh-water-gauge');
  var frame=document.getElementById('hhJugFrameV1202'),litres=document.getElementById('hhShowcaseTotalV1202');
  var target=document.getElementById('hhShowcaseTargetV1202'),percent=document.getElementById('hhShowcasePctV1202');
  var progress=document.getElementById('hhShowcaseBarV1202'),stages=document.getElementById('hhShowcaseStagesV1202'),goalDetails=document.getElementById('hhShowcaseGoalDetailsV1202');
  if(!show||!jug||!glass||!oldAdd||!oldReset||!gauge||!frame||!litres||!target||!percent||!progress||!stages)return;
  /* The original goal input/save control moves unchanged into a disclosure;
     the core handlers still use their same unique ID. */
  var goalEditor=document.querySelector('#balanceCard .hh-water-goal-edit'),goalTarget=document.getElementById('hhWaterTarget');
  var goalHost=document.getElementById('hhShowcaseGoalEditV1202');
  if(goalEditor&&goalHost)goalHost.appendChild(goalEditor);
  if(goalTarget&&goalHost)goalHost.insertBefore(goalTarget,goalHost.firstChild);
  oldAdd.setAttribute('tabindex','-1');
  oldReset.setAttribute('tabindex','-1');
  glass.addEventListener('click',function(){oldAdd.click();});
  jug.addEventListener('click',function(){oldReset.click();});
  var frameUrls=new Map(),frameBuilding=new Map(),currentStep=-1,requested=0;
  var display=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function buildFrame(level){
   if(frameUrls.has(level))return Promise.resolve(frameUrls.get(level));
   if(frameBuilding.has(level))return frameBuilding.get(level);
   var svg=jugSvg(level);
   var pending=new Promise(function(resolve){
    var picture=new Image();
    picture.onload=function(){
     var canvas=document.createElement('canvas');
     canvas.width=640;canvas.height=680;
     var ctx=canvas.getContext('2d');
     if(!ctx){resolve('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));return;}
     ctx.drawImage(picture,0,0,640,680);
     if(!canvas.toBlob){resolve('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));return;}
     canvas.toBlob(function(blob){
      if(!blob){resolve('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));return;}
      var url=URL.createObjectURL(blob);
      frameUrls.set(level,url);
      resolve(url);
     },'image/png');
    };
    picture.onerror=function(){resolve('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));};
    picture.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
   });
   frameBuilding.set(level,pending);
   return pending;
  }
  function showFrame(level){
   var sequence=++requested;
   if(currentStep===level)return;
   currentStep=level;
   var svg=jugSvg(level);
   /* Synchronous fallback: never show the wrong level during a slow raster. */
   frame.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
   buildFrame(level).then(function(url){
    if(sequence!==requested)return;
    frame.src=url;
   });
   jug.setAttribute('aria-label','Kancsó: '+level+' a 8 vízszintből. Koppints az ürítéshez. A napló megmarad.');
   if(!display){jug.classList.remove('hh-jug-pulse-v1202');void jug.offsetWidth;jug.classList.add('hh-jug-pulse-v1202');}
  }
  function refresh(){
   var currentMl=numberFromJarLabel(gauge.getAttribute('aria-label'));
   var n=currentMl==null?0:currentMl;
   var step=Math.min(8,Math.floor(n/STEP));
   showFrame(step);
   var amt=document.getElementById('hhWaterAmount');
   var daily=amt&&amt.textContent?amt.textContent.trim():'—';
   litres.textContent=daily;
   // Never mix daily consumption with the pitcher-since-last-empty count:
   // the jug picture resets, but today's displayed intake remains in the log.
   var dailyMatch=daily.match(/([\d\s.,\u00a0\u202f]+)\s*ml/i);
   var dailyMl=dailyMatch?Number(dailyMatch[1].replace(/\D/g,'')):null;
   var shownMl=Number.isFinite(dailyMl)?Math.max(0,dailyMl):n;
   var goalInput=document.getElementById('hhWaterGoal');
   var goal=goalInput&&goalInput.value?Number(goalInput.value):NaN;
   var valid=Number.isFinite(goal)&&goal>=250&&goal<=6000;
   target.textContent=valid?formatMl(goal):'Cél nincs beállítva';
   percent.textContent=valid?Math.round(shownMl/goal*100)+'%':'—';
   progress.style.width=valid?Math.min(100,shownMl/goal*100)+'%':'0%';
   var label='Kancsó: '+formatMl(n)+' / 2 000 ml, '+step+' teljes 250 ml-es szint.';
   stages.textContent=step+' / 8';
   stages.setAttribute('aria-label',label);
   show.setAttribute('data-step',String(step));
  }
  var gaugeObserver=new MutationObserver(refresh);
  gaugeObserver.observe(gauge,{attributes:true,attributeFilter:['aria-label']});
  var amount=document.getElementById('hhWaterAmount');
  if(amount)new MutationObserver(refresh).observe(amount,{characterData:true,childList:true,subtree:true});
  var goalInput=document.getElementById('hhWaterGoal');
  if(goalInput)goalInput.addEventListener('change',refresh);
  refresh();
  /* Warm all 9 PNG frames locally; one original jug design, no download. */
  for(var i=0;i<=8;i++)buildFrame(i);
  window.addEventListener('pagehide',function(){
   frameUrls.forEach(function(u){try{URL.revokeObjectURL(u)}catch(_){}});
  },{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
