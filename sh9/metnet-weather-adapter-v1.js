/* SHO Weather Adapter v1 · MetNet primary, wttr.in fallback.
 * Public browser-callable JSON endpoints only; no API keys or private credentials.
 * MetNet attribution is displayed in the SHO weather card and links to its Budapest III forecast.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9MetNetWeatherV1=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const METNET_URL='https://www.metnet.hu/szamitogepes-elorejelzes/Budapest%20III.';
 const WTTR_URL='https://wttr.in/Budapest';
 const EXCLUDED_TEMP=/(min|max|feels|apparent|dew|harmat|wind|szel|humidity|para|pressure|nyomas|precip|rain|csapad|gust|uv|soil|talaj)/;
 const TEMP_KEYS=['temperature','temp','temperaturec','tempc','airtemperature','airtemp','homerseklet','homersekletc','t','t2m'];
 const CONDITION_KEYS=['condition','weatherdescription','weathertext','description','leiras','weather','idokep','jelenseg','phenomenon','text','symbol','icon','state'];
 const TIME_KEYS=['observedat','observationtime','measuredat','timestamp','updatedat','lastupdate','frissitve','frissites','time','date','validtime'];
 function norm(value){
  return String(value==null?'':value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
 }
 function parseNumber(value){
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value==='string'){
   const m=value.trim().replace(/\s+/g,'').match(/-?\d+(?:[.,]\d+)?/);
   if(!m)return null;
   const n=Number(m[0].replace(',','.'));
   return Number.isFinite(n)?n:null;
  }
  if(value&&typeof value==='object'){
   for(const key of ['value','temp','temperature','celsius','c','actual']){
    if(Object.prototype.hasOwnProperty.call(value,key)){
     const n=parseNumber(value[key]);if(n!==null)return n;
    }
   }
  }
  return null;
 }
 function walk(value,path,out,depth){
  if(depth>8||out.length>500||value==null)return;
  if(Array.isArray(value)){
   value.slice(0,80).forEach((item,index)=>walk(item,path.concat(String(index)),out,depth+1));
   return;
  }
  if(typeof value!=='object')return;
  Object.keys(value).forEach(key=>{
   const next=path.concat(key),v=value[key];
   out.push({key:norm(key),rawKey:key,path:next.map(norm).join('.'),value:v});
   if(v&&typeof v==='object')walk(v,next,out,depth+1);
  });
 }
 function scorePath(path){
  let score=0;
  if(/station|allomas|observation|meres|measurement/.test(path))score+=90;
  if(/current|aktualis|most|now/.test(path))score+=25;
  if(/forecast|hourly|daily|model/.test(path))score-=18;
  return score;
 }
 function pickTemperature(entries){
  const candidates=[];
  for(const entry of entries){
   const key=entry.key;
   if(EXCLUDED_TEMP.test(key))continue;
   let keyScore=-1;
   if(TEMP_KEYS.includes(key))keyScore=70;
   else if(/(temperature|temp|homerseklet)(c|value)?$/.test(key))keyScore=60;
   else if(/(^|_)temp(c)?$/.test(entry.rawKey.toLowerCase()))keyScore=55;
   else if(key==='t'&&/weather|current|station|allomas/.test(entry.path))keyScore=35;
   if(keyScore<0)continue;
   const n=parseNumber(entry.value);
   if(n===null||n< -70||n>65)continue;
   candidates.push({value:n,score:keyScore+scorePath(entry.path)});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates.length?candidates[0].value:null;
 }
 function pickText(entries,keys){
  const candidates=[];
  for(const entry of entries){
   if(!keys.includes(entry.key)||typeof entry.value!=='string')continue;
   const value=entry.value.trim();
   if(!value||value.length>100||/^https?:\/\//i.test(value)||/\.(png|svg|jpe?g|webp)$/i.test(value))continue;
   let score=keys.indexOf(entry.key)*-3+scorePath(entry.path);
   if(['condition','weatherdescription','weathertext','description','leiras','idokep','jelenseg','phenomenon'].includes(entry.key))score+=45;
   if(entry.key==='icon')score-=20;
   candidates.push({value,score});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates.length?candidates[0].value:null;
 }
 function pickCode(entries){
  const candidates=[];
  for(const entry of entries){
   if(!/(weathercode|symbolcode|iconcode|conditioncode|idojaraskod)/.test(entry.key)&&
      !(entry.key==='code'&&/weather|condition|current|most/.test(entry.path)))continue;
   const n=parseNumber(entry.value);
   if(n===null)continue;
   candidates.push({value:n,score:scorePath(entry.path)});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates.length?candidates[0].value:null;
 }
 function pickTime(entries){
  const candidates=[];
  for(const entry of entries){
   if(!TIME_KEYS.includes(entry.key)||typeof entry.value!=='string')continue;
   const ms=Date.parse(entry.value);
   if(!Number.isFinite(ms))continue;
   candidates.push({value:new Date(ms).toISOString(),score:scorePath(entry.path)});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates.length?candidates[0].value:null;
 }
 function pickDay(entries){
  for(const entry of entries){
   if(!['isday','nappal','daytime'].includes(entry.key))continue;
   if(entry.value===true||entry.value===1||entry.value==='1')return true;
   if(entry.value===false||entry.value===0||entry.value==='0')return false;
  }
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',hour:'numeric',hourCycle:'h23'}).format(new Date()));
  return hour>=6&&hour<19;
 }
 function pickStationName(entries){
  const found=entries.find(entry=>
   /stationname|allomasnev/.test(entry.key)&&typeof entry.value==='string'&&entry.value.trim());
  return found?found.value.trim():'';
 }
 function labelFromCode(code){
  if(code==null)return'Változó';
  const n=Number(code);
  const labels={
   0:'Derült',1:'Többnyire derült',2:'Részben felhős',3:'Borult',45:'Köd',48:'Köd',
   51:'Szitálás',53:'Szitálás',55:'Szitálás',56:'Szitálás',57:'Szitálás',
   61:'Eső',63:'Eső',65:'Erős eső',66:'Ónos eső',67:'Ónos eső',
   71:'Havazás',73:'Havazás',75:'Erős havazás',77:'Hószemcsék',
   80:'Zápor',81:'Zápor',82:'Heves zápor',85:'Hózápor',86:'Hózápor',
   95:'Zivatar',96:'Zivatar',99:'Erős zivatar',
   113:'Derült',116:'Változóan felhős',119:'Felhős',122:'Borult',143:'Köd',
   176:'Szitálás',179:'Hózápor',182:'Havas eső',185:'Ónos szitálás',
   200:'Zivatar',227:'Hófúvás',230:'Hófúvás',248:'Köd',260:'Köd',
   263:'Szitálás',266:'Szitálás',281:'Ónos szitálás',284:'Ónos szitálás',
   293:'Gyenge eső',296:'Gyenge eső',299:'Eső',302:'Eső',305:'Erős eső',308:'Erős eső',
   311:'Ónos eső',314:'Ónos eső',317:'Havas eső',320:'Havas eső',
   323:'Havazás',326:'Havazás',329:'Havazás',332:'Havazás',335:'Erős havazás',
   338:'Erős havazás',350:'Jégszemek',353:'Zápor',356:'Zápor',359:'Heves zápor',
   362:'Havas eső',365:'Havas eső',368:'Hózápor',371:'Hózápor',374:'Jégszemek',
   377:'Jégszemek',386:'Zivatar',389:'Zivatar',392:'Hózápor zivatar',395:'Hózápor zivatar'
  };
  return labels[n]||'Változó';
 }
 function labelFromText(text,code){
  const raw=String(text||'').trim();
  const s=norm(raw);
  if(!s)return labelFromCode(code);
  if(/zivatar|thunder|storm/.test(s))return'Zivatar';
  if(/ho|snow|sleet|blizzard/.test(s))return/havaseso|sleet/.test(s)?'Havas eső':'Havazás';
  if(/szital|drizzle/.test(s))return'Szitálás';
  if(/zapor|shower/.test(s))return'Zápor';
  if(/eso|rain/.test(s))return/eros|heavy/.test(s)?'Erős eső':'Eső';
  if(/kod|fog|mist|haze/.test(s))return'Köd';
  if(/borult|overcast/.test(s))return'Borult';
  if(/derult|sunny|clear/.test(s))return'Derült';
  if(/felhos|cloud/.test(s))return raw;
  return raw.length<=30?raw:labelFromCode(code);
 }
 function iconFor(text,code,day){
  const s=norm(text),n=Number(code);
  if(/zivatar|thunder|storm/.test(s)||[95,96,99,200,386,389,392,395].includes(n))return'⛈️';
  if(/ho|snow|sleet|blizzard/.test(s)||[71,73,75,77,85,86,179,182,227,230,317,320,323,326,329,332,335,338,362,365,368,371,374,377].includes(n))return'🌨️';
  if(/szital|drizzle/.test(s)||[51,53,55,56,57,176,263,266,281,284].includes(n))return'🌦️';
  if(/zapor|shower/.test(s)||[80,81,82,353,356,359].includes(n))return'🌧️';
  if(/eso|rain/.test(s)||[61,63,65,66,67,293,296,299,302,305,308,311,314].includes(n))return'🌧️';
  if(/kod|fog|mist|haze/.test(s)||[45,48,143,248,260].includes(n))return'🌫️';
  if(/borult|overcast/.test(s)||[3,119,122].includes(n))return'☁️';
  if(/felhos|cloud|partly/.test(s)||[1,2,116].includes(n))return day?'🌤️':'☁️';
  if(/derult|sunny|clear/.test(s)||[0,113].includes(n))return day?'☀️':'🌙';
  return'🌤️';
 }
 function parseMetnetWeather(payload){
  const entries=[];walk(payload,[],entries,0);
  const temp=pickTemperature(entries);
  if(temp===null)return null;
  const text=pickText(entries,CONDITION_KEYS);
  const code=pickCode(entries);
  const day=pickDay(entries);
  const condition=labelFromText(text,code);
  return{
   temp,condition,icon:iconFor(text,code,day),day,
   source:'MetNet.hu',sourceLabel:'Forrás: MetNet.hu',sourceUrl:METNET_URL,
   at:new Date().toISOString(),observedAt:pickTime(entries),stationName:pickStationName(entries)
  };
 }
 function parseWttrWeather(payload){
  const current=payload&&Array.isArray(payload.current_condition)?payload.current_condition[0]:null;
  if(!current)return null;
  const temp=parseNumber(current.temp_C),code=parseNumber(current.weatherCode);
  if(temp===null||code===null||temp< -70||temp>65)return null;
  const desc=Array.isArray(current.weatherDesc)&&current.weatherDesc[0]?
   (current.weatherDesc[0].value||current.weatherDesc[0].text||''):'';
  const day=pickDay([{key:'isday',value:current.is_day}]);
  return{
   temp,condition:labelFromText(desc,code),icon:iconFor(desc,code,day),day,
   source:'wttr.in',sourceLabel:'Tartalék: wttr.in',sourceUrl:WTTR_URL,
   at:new Date().toISOString(),observedAt:current.localObsDateTime||current.observation_time||null,stationName:''
  };
 }
 return Object.freeze({parseMetnetWeather,parseWttrWeather,labelFromText,iconFor,METNET_URL,WTTR_URL});
});
