/* SH9 v14 · browser-chrome-free layout diagnostics, no app container APIs.
 * Production: no visible changes. Test-only ?sh9layout=measure shows the
 * actual CSS-pixel gap between the info panel and the anchored 3x3 grid.
 * Avoids pretending native pixel dimensions are the browser's CSS viewport.
 */
(function(){
 'use strict';
 var query=new URLSearchParams(window.location.search);
 if(query.get('sh9layout')!=='measure')return;
 var info=document.getElementById('sh9InfoBar6');
 var grid=document.querySelector('.grid');
 if(!info||!grid)return;
 var box=document.createElement('div');
 box.id='sh9LayoutMeasure14';
 box.setAttribute('role','status');
 document.body.appendChild(box);
 function report(){
  var ir=info.getBoundingClientRect(),gr=grid.getBoundingClientRect();
  var h=Math.round(window.visualViewport?window.visualViewport.height:window.innerHeight);
  var w=Math.round(window.visualViewport?window.visualViewport.width:window.innerWidth);
  var gap=Math.round(gr.top-ir.bottom);
  box.textContent=w+' × '+h+' CSS px · szabad köztes hely: '+gap+' px';
 }
 report();
 window.addEventListener('resize',report,{passive:true});
 if(window.ResizeObserver){
  var observer=new ResizeObserver(report);
  observer.observe(grid);observer.observe(info);
 }
})();
