'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const weather=require('../metnet-weather-adapter-v1.js');

test('MetNet adapter prefers a fresh nearby station temperature and preserves local condition',()=>{
 const result=weather.parseMetnetWeather({
  current:{
   temperature:1.8,
   condition:'Szitálás',
   weather_code:51,
   observed_at:'2026-11-25T19:10:00+01:00'
  },
  nearest_station:{
   station_name:'Budapest III. - Csillaghegy',
   temperature:'0,4 °C',
   measured_at:'2026-11-25T19:12:00+01:00'
  }
 });
 assert.ok(result);
 assert.equal(result.temp,0.4);
 assert.equal(result.condition,'Szitálás');
 assert.equal(result.icon,'🌦️');
 assert.equal(result.source,'MetNet.hu');
 assert.equal(result.sourceLabel,'Forrás: MetNet.hu');
 assert.equal(result.stationName,'Budapest III. - Csillaghegy');
 assert.equal(result.observedAt,'2026-11-25T18:12:00.000Z');
 assert.equal(result.sourceUrl,weather.METNET_URL);
});

test('MetNet adapter accepts simple and nested Hungarian temperature fields',()=>{
 const result=weather.parseMetnetWeather({
  adatok:{
   aktualis:{
    homerseklet:'-0,5',
    idokep:'Borult',
    frissitve:'2026-11-25T20:00:00+01:00'
   }
  }
 });
 assert.ok(result);
 assert.equal(result.temp,-0.5);
 assert.equal(result.condition,'Borult');
 assert.equal(result.icon,'☁️');
});

test('MetNet adapter rejects a response without a real temperature',()=>{
 assert.equal(weather.parseMetnetWeather({condition:'Derült',weather_code:0}),null);
 assert.equal(weather.parseMetnetWeather({temperature:'-',condition:'Eső'}),null);
});

test('wttr.in fallback parses a valid observation and translates English conditions',()=>{
 const result=weather.parseWttrWeather({
  current_condition:[{
   temp_C:'0',
   weatherCode:'176',
   weatherDesc:[{value:'Light drizzle'}],
   localObsDateTime:'2026-11-25 08:20 AM',
   is_day:'1'
  }]
 });
 assert.ok(result);
 assert.equal(result.temp,0);
 assert.equal(result.condition,'Szitálás');
 assert.equal(result.icon,'🌦️');
 assert.equal(result.source,'wttr.in');
 assert.equal(result.sourceLabel,'Tartalék: wttr.in');
});

test('English shower descriptions are not mistaken for snow',()=>{
 assert.equal(weather.labelFromText('Light rain showers'),'Zápor');
 assert.equal(weather.iconFor('Light rain showers',null,true),'🌧️');
 assert.equal(weather.labelFromText('Partly cloudy'),'Változóan felhős');
 assert.equal(weather.iconFor('Partly cloudy',null,true),'🌤️');
 assert.equal(weather.labelFromText('Clear'),'Derült');
 assert.equal(weather.iconFor('Clear',null,false),'🌙');
});

test('MetNet source link is the local Budapest III forecast page',()=>{
 assert.match(weather.METNET_URL,/metnet\.hu\/szamitogepes-elorejelzes\/Budapest%20III\./);
 assert.match(weather.WTTR_URL,/wttr\.in\/Budapest/);
});
