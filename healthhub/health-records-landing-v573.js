/* HealthHub v573: reset scroll only when entering the Leletek subpage.
 * Existing data and render pipeline remain untouched. */
(function(w,d){'use strict';
 function reset(){if(w.healthSectionKind!=='records')return;
  try{w.scrollTo({top:0,left:0,behavior:'instant'})}catch(e){w.scrollTo(0,0)}
  var page=d.getElementById('healthSection');
  if(page){page.scrollTop=0;var pane=page.querySelector('.healthSubScroll,[data-scroll-container]');if(pane)pane.scrollTop=0;}
  d.documentElement.scrollTop=0;d.body.scrollTop=0;
 }
 function entered(e){
  var tile=e.target&&e.target.closest&&e.target.closest('#health .quick .q');
  if(!tile||!/leletek/i.test(tile.textContent||''))return;
  // Do not reset when scrolling, filtering, reading or previewing PDF files.
  w.requestAnimationFrame(function(){w.requestAnimationFrame(reset)});
  w.setTimeout(reset,120);
 }
 d.addEventListener('click',entered,true);
})(window,document);
