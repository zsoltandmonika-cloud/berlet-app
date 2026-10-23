/* SH9 Ambient Weather Hero v8.
 * Single-source weather: listen to the public Open-Meteo result from sh9-info-v6.js.
 * No second weather request, no geolocation, no canvas/WebGL or opaque video assets.
 * ?wxpreview=rain|snow|storm|frost|cloudy|fog|clear|night is labelled DEMO ONLY.
 */
(function(){
 'use strict';
 var hero=document.querySelector('.hero');
 if(!hero||document.getElementById('sh9AmbientWeather8'))return;
 var layer=document.createElement('div');
 layer.id='sh9AmbientWeather8';
 layer.className='sh9-wx-layer';
 layer.dataset.condition='neutral';
 layer.dataset.phase='day';
 layer.dataset.freeze='false';
 layer.setAttribute('aria-hidden','true');
 layer.innerHTML=
  '<div class="sh9-wx-ambient"></div>'+
  '<div class="sh9-wx-clouds"></div>'+
  '<div class="sh9-wx-rain"></div>'+
  '<div class="sh9-wx-snow"></div>'+
  '<div class="sh9-wx-fog"></div>'+
  '<div class="sh9-wx-frost">'+
   '<svg viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">'+
   '<path d="M0 12 34 28 56 14M34 28l10 21 25 14M44 49l-8 22M0 205l34-19 23 14 34-10M34 186l2-27 21-15M400 22l-27 11-14-18M373 33l-19 19 8 22M400 213l-37-25-17 12-23-12M363 188l9-25-13-12"/>'+
   '<path d="M8 11l16 31m10-14L10 58M56 14l-3 16M66 63l-20-1M21 207l21 0m15-7l-7 19m315-181l21 12m-32 2l-12-3m21 139l-23-1m17 13l-4 16"/>'+
   '</svg></div>'+
  '<div class="sh9-wx-lightning">'+
   '<svg viewBox="0 0 80 160" aria-hidden="true"><path d="M52 5 22 82h23l-18 72 42-91H47Z"/></svg>'+
   '</div>'+
  '<span class="sh9-wx-preview-label" hidden>ANIMÁCIÓ TESZT · NEM ÉLŐ IDŐJÁRÁS</span>';
 hero.appendChild(layer);
 var snow=layer.querySelector('.sh9-wx-snow');
 for(var i=0;i<26;i++){
  var dot=document.createElement('i');
  dot.style.setProperty('--x',((i*37+11)%99)+'%');
  dot.style.setProperty('--size',(2+(i*7)%5)+'px');
  dot.style.setProperty('--duration',(7+(i*11)%9)+'s');
  dot.style.setProperty('--delay',(-((i*13)%17))+'s');
  dot.style.setProperty('--drift',(((i*17)%47)-23)+'px');
  dot.style.setProperty('--alpha',(0.48+(i%5)*.11).toFixed(2));
  snow.appendChild(dot);
 }
 var allowed=['rain','snow','storm','frost','cloudy','fog','clear','night'];
 var q=new URLSearchParams(window.location.search).get('wxpreview');
 var preview=allowed.indexOf(q)>=0?q:null;
 var label=layer.querySelector('.sh9-wx-preview-label');
 label.hidden=!preview;
 if(preview)label.textContent='ANIMÁCIÓ TESZT · '+preview.toUpperCase()+' · NEM ÉLŐ IDŐJÁRÁS';
 var live=null;
 function condition(code){
  if([95,96,99].indexOf(code)>=0)return 'storm';
  if([71,73,75,77,85,86].indexOf(code)>=0)return 'snow';
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code)>=0)return 'rain';
  if([45,48].indexOf(code)>=0)return 'fog';
  if([1,2,3].indexOf(code)>=0)return 'cloudy';
  if(code===0)return 'clear';
  return 'neutral';
 }
 function localMinutes(){
  var p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  var t={};p.forEach(function(x){if(x.type!=='literal')t[x.type]=Number(x.value)});
  return t.hour*60+t.minute;
 }
 function isoMinutes(iso){
  if(!iso||typeof iso!=='string')return null;
  var m=iso.match(/T(\d{2}):(\d{2})/);
  return m?Number(m[1])*60+Number(m[2]):null;
 }
 function phase(data){
  if(!data)return 'day';
  var rise=isoMinutes(data.sunrise),set=isoMinutes(data.sunset);
  if(rise!==null&&set!==null){
   var now=localMinutes();
   if(now>=rise-45&&now<rise+45)return 'dawn';
   if(now>=set-45&&now<set+45)return 'dusk';
  }
  return data.isDay?'day':'night';
 }
 function paint(data){
  var c=data&&Number.isFinite(data.code)?condition(data.code):'neutral';
  var p=phase(data);
  var frozen=!!(data&&Number.isFinite(data.temp)&&data.temp<=0);
  if(preview){
   c=preview==='night'?'clear':preview==='frost'?'clear':preview;
   frozen=preview==='frost';
   if(preview==='night')p='night';
  }
  layer.dataset.condition=c;
  layer.dataset.phase=p;
  layer.dataset.freeze=frozen?'true':'false';
  layer.dataset.paused=document.hidden?'true':'false';
  layer.title=preview?'Csak animációteszt':data?'SH9 Ambient Weather · Open-Meteo':'Élő időjárás nem elérhető';
 }
 window.addEventListener('sh9:weather',function(event){live=event.detail;paint(live)});
 window.addEventListener('sh9:weather-error',function(){live=null;paint(null)});
 document.addEventListener('visibilitychange',function(){paint(live)});
 window.setInterval(function(){if(!document.hidden)paint(live)},60000);
 live=window.SH9Weather||null;
 paint(live);
})();
