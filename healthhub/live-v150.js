(function(){
'use strict';
/* HealthHub v1.50 — HealthRadar visual consistency + measurement polish */
function ensureStyle(){
 if(document.getElementById('hh-v150-style'))return;
 var s=document.createElement('style');s.id='hh-v150-style';s.textContent=
 /* One HealthRadar hero language on every related page */
 '.healthSubHero{height:205px!important;min-height:205px!important;box-sizing:border-box!important;background-image:var(--hh-role-atlas)!important;background-size:100% 200%!important;background-position:0 0!important;background-repeat:no-repeat!important;color:#0b2d50!important;position:relative!important;overflow:hidden!important;padding:0!important;display:block!important}'+
 '.healthSubHero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 46%,rgba(255,255,255,.10) 70%,rgba(255,255,255,.22) 100%)!important;pointer-events:none;z-index:1}'+
 '.healthSubHero>div{position:absolute!important;left:56%!important;right:54px!important;top:52%!important;transform:translateY(-50%)!important;z-index:4!important;min-width:0}'+
 '.healthSubHero .healthSubKicker{font-size:9px!important;font-weight:800!important;opacity:.82!important;color:#315f7b!important;margin-bottom:3px!important;text-shadow:0 1px 0 rgba(255,255,255,.9)!important}'+
 '.healthSubHero h1{font-size:29px!important;line-height:1!important;margin:0!important;font-weight:900!important;letter-spacing:-.7px!important;color:#0b2d50!important;text-shadow:0 1px 0 rgba(255,255,255,.92)!important;white-space:nowrap!important}'+
 '.healthSubHero .backBtn{position:absolute!important;left:12px!important;top:14px!important;z-index:6!important;width:38px!important;height:38px!important;border-radius:50%!important;border:1px solid rgba(23,63,97,.15)!important;background:rgba(255,255,255,.82)!important;color:#173f61!important;box-shadow:0 4px 14px rgba(40,70,100,.10)!important}'+
 '.healthSubHero .healthSubAction{position:absolute!important;right:12px!important;top:14px!important;z-index:6!important;margin:0!important;color:#173f61!important;border-color:rgba(23,63,97,.16)!important;background:rgba(255,255,255,.82)!important;box-shadow:0 4px 14px rgba(40,70,100,.10)!important}'+
 /* Today cards: reserve a dedicated footer lane for deltas so values never collide */
 '.hhNowItem{padding-bottom:31px!important;min-height:82px!important}.hhNowItem .hhDelta{top:auto!important;bottom:8px!important;right:9px!important;max-width:calc(100% - 18px)!important;white-space:nowrap!important;font-size:7.5px!important}.hhNowTxt b{padding-right:0!important}'+
 /* Long-term metric cards */
 '.hhLatestMetrics{gap:10px!important;margin-top:12px!important;margin-bottom:13px!important}.hhMetricCard{padding:12px!important;border-radius:17px!important;min-height:92px!important;box-shadow:0 7px 18px rgba(38,74,101,.075)!important}.hhMetricCard .mi{width:34px!important;height:34px!important;border-radius:11px!important;font-size:17px!important;margin-bottom:7px!important;background:linear-gradient(145deg,#f2f8fc,#e9f3f9)!important}.hhMetricCard small{font-size:8.5px!important;font-weight:800!important}.hhMetricCard b{font-size:14px!important;line-height:1.15!important;margin-top:4px!important}.hhMetricCard em{font-size:7.6px!important;line-height:1.25!important;margin-top:5px!important}'+
 /* Metric selectors become actual visual category cards */
 '.hhMeasToolbar{display:block!important;margin:3px 0 14px!important}.hhMeasToolbar>.hhMeasChips:first-child{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:7px!important;margin-bottom:10px!important}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip{min-height:60px!important;border-radius:15px!important;padding:8px 5px!important;font-size:8.5px!important;font-weight:850!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;box-shadow:0 4px 12px rgba(34,70,100,.05)!important}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip:before{font-size:19px!important;line-height:1!important}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip[onclick*="bloodPressure"]:before{content:"🫀"}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip[onclick*="pulse"]:before{content:"♥";color:#d84f68}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip[onclick*="weightKg"]:before{content:"⚖️"}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip[onclick*="bloodGlucose"]:before{content:"●";color:#557aa0}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip[onclick*="oxygenSaturation"]:before{content:"🫁"}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip.on{background:linear-gradient(145deg,#e9faf5,#f6fffc)!important;border-color:#75cdbd!important;color:#176e64!important;box-shadow:0 6px 16px rgba(38,137,117,.12)!important;transform:translateY(-1px)}'+
 /* Period selector: clear, touchable and horizontally scrollable */
 '.hhMeasToolbar>.hhMeasChips:last-child{display:flex!important;flex-wrap:nowrap!important;gap:7px!important;overflow-x:auto!important;padding:1px 1px 5px!important;scrollbar-width:none!important}.hhMeasToolbar>.hhMeasChips:last-child::-webkit-scrollbar{display:none!important}.hhMeasToolbar>.hhMeasChips:last-child .hhMeasChip{flex:0 0 auto!important;min-width:58px!important;border-radius:999px!important;padding:8px 12px!important;font-size:8.5px!important;font-weight:800!important}.hhMeasToolbar>.hhMeasChips:last-child .hhMeasChip.on{background:#173f62!important;border-color:#173f62!important;color:#fff!important}'+
 '.hhChartBox{border-radius:18px!important;box-shadow:0 6px 16px rgba(31,65,91,.05)!important}.hhChartTitle h3{font-size:14px!important}.hhSummary{border-radius:18px!important}.hhMeasList h3{font-size:13px!important}'+
 '@media(max-width:900px){.hhLatestMetrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}.hhLatestMetrics .hhMetricCard:last-child{grid-column:1 / -1!important}.hhMeasToolbar>.hhMeasChips:first-child{grid-template-columns:repeat(3,minmax(0,1fr))!important}.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip:nth-child(4),.hhMeasToolbar>.hhMeasChips:first-child .hhMeasChip:nth-child(5){min-height:56px!important}.healthSubHero>div{left:54%!important;right:44px!important}.healthSubHero h1{font-size:26px!important}}'+
 '@media(max-width:430px){.healthSubHero{height:205px!important}.healthSubHero>div{left:55%!important;right:34px!important}.healthSubHero h1{font-size:25px!important}.hhNowItem{min-height:86px!important}.hhMetricCard b{font-size:13.5px!important}}';
 document.head.appendChild(s);
}
function syncHeroExact(){
 var source=document.getElementById('heroH'), hero=document.querySelector('#healthSection .healthSubHero');
 if(!source||!hero)return;
 var cs=getComputedStyle(source);
 hero.style.setProperty('height',cs.height,'important');
 hero.style.setProperty('min-height',cs.height,'important');
 hero.style.setProperty('background-image',cs.backgroundImage,'important');
 hero.style.setProperty('background-size',cs.backgroundSize,'important');
 hero.style.setProperty('background-position',cs.backgroundPosition,'important');
 hero.style.setProperty('background-repeat',cs.backgroundRepeat,'important');
 hero.style.setProperty('border-radius',cs.borderRadius,'important');
 hero.setAttribute('data-hh-hero-source','heroH');
}
function decorate(){
 ensureStyle();
 var hero=document.querySelector('#healthSection .healthSubHero');
 if(hero)hero.setAttribute('data-hh-unified-hero','1.53');
 syncHeroExact();
 var root=document.getElementById('healthSubContent');
 if(root&&window.healthSectionKind==='measurements'){
   var card=root.querySelector('.hrSectionCard');
   if(card)card.classList.add('hhMeasurementsPremium');
 }
}
ensureStyle();
var prev=window.renderHealthSection;
if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);decorate();return r};
setTimeout(decorate,120);setTimeout(syncHeroExact,260);window.addEventListener('resize',syncHeroExact);
document.documentElement.dataset.healthhubHealthradarPolish='1.50';
window.HH_LIVE_BUILD='v1.50-healthradar-polish';
})();