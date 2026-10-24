/* SH9 Smart Travel Weather v3 · mobile-first Open-Meteo weather.
 * Budapest is the agreed default city, not the device's precise GPS location.
 * No location permission, personal data submission, API key, or shared profile state.
 * Other world-clock cities change the card's weather and forecast destination.
 * Source: Open-Meteo non-commercial API. Show attribution in the widget.
 */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SH9_SMART_TRAVEL_WEATHER_V3=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
  'use strict';
  const CITIES=Object.freeze({
    newyork:Object.freeze({label:'New York',lat:40.7128,lon:-74.0060,tz:'America/New_York',forecastUrl:'https://www.meteoblue.com/en/weather/week/new-york-city_united-states_5128581'}),
    london:Object.freeze({label:'London',lat:51.5072,lon:-0.1276,tz:'Europe/London',forecastUrl:'https://www.meteoblue.com/en/weather/week/london_united-kingdom_2643743'}),
    paris:Object.freeze({label:'Paris',lat:48.8566,lon:2.3522,tz:'Europe/Paris',forecastUrl:'https://www.meteoblue.com/en/weather/week/paris_france_2988507'}),
    budapest:Object.freeze({label:'Budapest',lat:47.4979,lon:19.0402,tz:'Europe/Budapest',forecastUrl:'https://www.meteoblue.com/en/weather/week/budapest_hungary_3054643'})
  });
  const CITY_KEYS=Object.freeze(['newyork','london','paris','budapest']);
  const CACHE_AGE_MS=10*60*1000;
  function requestUrl(key){
    const city=CITIES[key];
    if(!city)return null;
    const u=new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude',String(city.lat));
    u.searchParams.set('longitude',String(city.lon));
    u.searchParams.set('current','temperature_2m,weather_code,is_day');
    u.searchParams.set('timezone',city.tz);
    u.searchParams.set('forecast_days','1');
    return u.href;
  }
  function weatherVisual(code,isDay){
    const c=Number(code),day=isDay!==0;
    if(c===0)return {icon:day?'☀️':'🌙',label:day?'Derült':'Tiszta éjszaka'};
    if(c===1)return {icon:day?'🌤️':'🌙',label:'Kevés felhő'};
    if(c===2)return {icon:'⛅',label:'Változóan felhős'};
    if(c===3)return {icon:'☁️',label:'Borult'};
    if(c===45||c===48)return {icon:'🌫️',label:'Köd'};
    if([51,53,55,56,57].includes(c))return {icon:'🌦️',label:'Szitálás'};
    if([61,63,65,66,67].includes(c))return {icon:'🌧️',label:'Eső'};
    if([71,73,75,77,85,86].includes(c))return {icon:'🌨️',label:'Havazás'};
    if([80,81,82].includes(c))return {icon:'🌦️',label:'Zápor'};
    if([95,96,99].includes(c))return {icon:'⛈️',label:'Zivatar'};
    return {icon:'🌡️',label:'Időjárás'};
  }
  function parseCurrent(payload){
    const c=payload&&payload.current;
    if(!c||!Number.isFinite(Number(c.temperature_2m))||!Number.isFinite(Number(c.weather_code)))
      throw new Error('Érvénytelen időjárás-adat');
    return {temp:Math.round(Number(c.temperature_2m)),visual:weatherVisual(c.weather_code,c.is_day),measuredAt:String(c.time||'')};
  }
  function init(){
    const d=w&&w.document;
    if(!d)return;
    const widget=d.getElementById('stWeatherWidget');
    const cityEl=d.getElementById('stWeatherCity');
    const tempEl=d.getElementById('stWeatherTemp');
    const conditionEl=d.getElementById('stWeatherDesc');
    const iconEl=d.getElementById('stWeatherIcon');
    const buttons=Array.from(d.querySelectorAll('button.st-clock[data-city]'));
    if(!widget||!cityEl||!tempEl||!conditionEl||!iconEl||buttons.length!==4)return;
    const cache=new Map();
    let active='budapest',sequence=0,controller=null;
    function updateSelected(){
      const city=CITIES[active];
      cityEl.textContent=city.label;
      widget.href=city.forecastUrl;
      widget.title=city.label+' · részletes időjárás-előrejelzés';
      widget.setAttribute('aria-label',city.label+' időjárás-előrejelzésének megnyitása');
      buttons.forEach(function(b){
        const selected=b.dataset.city===active;
        b.classList.toggle('is-active',selected);
        b.setAttribute('aria-pressed',String(selected));
      });
    }
    function render(data){
      tempEl.textContent=data.temp+'°C';
      iconEl.textContent=data.visual.icon;
      conditionEl.textContent=data.visual.label;
      widget.dataset.weatherStatus='ready';
    }
    function loading(){
      tempEl.textContent='--°C';
      iconEl.textContent='🌤️';
      conditionEl.textContent='Időjárás betöltése…';
      widget.dataset.weatherStatus='loading';
    }
    function failure(){
      tempEl.textContent='--°C';
      iconEl.textContent='🌡️';
      conditionEl.textContent='Adat nem elérhető';
      widget.dataset.weatherStatus='error';
    }
    async function refresh(force){
      const key=active;
      const cached=cache.get(key);
      if(!force&&cached&&Date.now()-cached.at<CACHE_AGE_MS){render(cached.value);return}
      const own=++sequence;
      if(controller)controller.abort();
      controller=typeof AbortController==='function'?new AbortController():null;
      const currentController=controller;
      loading();
      let abortTimer=null;
      try{
        if(currentController)abortTimer=w.setTimeout(function(){currentController.abort()},10000);
        const response=await w.fetch(requestUrl(key),{method:'GET',signal:currentController?currentController.signal:undefined,cache:'no-store'});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const value=parseCurrent(await response.json());
        cache.set(key,{at:Date.now(),value:value});
        if(own===sequence&&key===active)render(value);
      }catch(err){
        if(own===sequence&&key===active)failure();
      }finally{
        if(abortTimer!==null)w.clearTimeout(abortTimer);
        if(controller===currentController)controller=null;
      }
    }
    function selectCity(key){
      if(!CITIES[key])return;
      active=key;
      updateSelected();
      void refresh(false);
    }
    buttons.forEach(function(b){b.addEventListener('click',function(){selectCity(b.dataset.city)})});
    // Android WebView cannot reliably open _blank. On mobile, use the OS's external URL handler.
    if(/Android|iPhone|iPad|iPod/i.test(String(w.navigator&&w.navigator.userAgent||''))){
      widget.addEventListener('click',function(event){event.preventDefault();w.location.assign(widget.href)});
    }
    function wake(){if(!d.hidden)void refresh(false)}
    d.addEventListener('visibilitychange',wake);
    w.addEventListener('pageshow',wake);
    w.addEventListener('focus',wake);
    w.setInterval(wake,15*60*1000);
    updateSelected();
    void refresh(false);
  }
  if(w&&w.document){
    if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
  }
  return Object.freeze({CITIES:CITIES,CITY_KEYS:CITY_KEYS,requestUrl:requestUrl,weatherVisual:weatherVisual,parseCurrent:parseCurrent,version:'3.0'});
});
