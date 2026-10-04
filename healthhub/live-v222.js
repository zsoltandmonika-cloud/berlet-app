(function(){
'use strict';

/* HealthHub v1.222 — shared bright Timeline hero for Zsolt and Mónika. */

var HERO='./assets/timeline-hero-v222.webp?v=222';

function paintTimelineHero(){
  var hero=document.getElementById('heroT');
  if(!hero)return;

  hero.style.setProperty(
    'background-image',
    'linear-gradient(180deg,rgba(7,38,61,.10),rgba(6,34,58,.38)),url("'+HERO+'")',
    'important'
  );
  hero.style.setProperty('background-size','cover','important');
  hero.style.setProperty('background-position','center center','important');
  hero.style.setProperty('background-repeat','no-repeat','important');

  var person=document.getElementById('personT');
  if(person)person.style.setProperty('display','none','important');

  document.documentElement.dataset.healthhubTimelineHero='v222-lena-shared';
}

paintTimelineHero();
setTimeout(paintTimelineHero,80);
setTimeout(paintTimelineHero,500);

var prevSetProfile=window.setProfile;
if(typeof prevSetProfile==='function'){
  window.setProfile=function(){
    var r=prevSetProfile.apply(this,arguments);
    setTimeout(paintTimelineHero,20);
    return r;
  };
}

window.addEventListener('focus',function(){setTimeout(paintTimelineHero,30)});
window.HH_LIVE_BUILD='v1.222-timeline-lena-hero';
})();