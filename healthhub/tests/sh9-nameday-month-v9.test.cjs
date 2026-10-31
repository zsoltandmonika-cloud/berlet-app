'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'sh9/index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'sh9/sh9-info-v6.js'),'utf8');

test('date tile shows DÁTUM, actual date and a single NÉVNAP · Salamon line',async()=>{
 class FixedDate extends Date{
  constructor(...args){super(...(args.length?args:['2026-10-24T10:00:00Z']))}
  static now(){return new Date('2026-10-24T10:00:00Z').getTime()}
 }
 const nodes={};
 for(const id of ['sh9InfoBar6','sh9Date6','sh9Nameday6','sh9NamedayValue6','sh9Weather6','sh9WeatherDetail6','sh9WeatherCell6'])
  nodes[id]={id,dataset:{},textContent:'',title:''};
 nodes.sh9NamedayValue6.textContent='betöltés…';
 const doc={getElementById:id=>nodes[id]||null,addEventListener:()=>{},hidden:false};
 const requests=[];
 async function mockFetch(url){
  requests.push(url);
  if(url.includes('namedays.json'))return {ok:true,json:async()=>({namedays:{'10':{'24':['Salamon']}}})};
  if(url.includes('open-meteo.com'))return {ok:true,json:async()=>({
   current:{temperature_2m:10,weather_code:3,is_day:1,time:'2026-10-24T12:00'},
   daily:{sunrise:['2026-10-24T07:00'],sunset:['2026-10-24T18:00']}
  })};
  throw Error('Unexpected network request');
 }
 vm.runInNewContext(script,{Date:FixedDate,Intl,document:doc,window:{dispatchEvent:()=>{}},
  fetch:mockFetch,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  setInterval:()=>{},console});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(nodes.sh9Date6.textContent,/október 24/);
 assert.equal(nodes.sh9NamedayValue6.textContent,'Salamon');
 assert.equal((nodes.sh9NamedayValue6.textContent.match(/névnap/gi)||[]).length,0);
 assert.match(html,/<span class="sh9-nameday-label">NÉVNAP · <\/span><span id="sh9NamedayValue6"/);
 assert.equal(requests.filter(x=>x.includes('namedays.json')).length,1);
});

test('full date/nameday tile opens the actual Outlook monthly link rather than SH9 Agenda',()=>{
 const match=html.match(/<a id="sh9NamedayCell"[^>]*>[\s\S]*?<\/a>/);
 assert.ok(match,'full nameday tile has direct link');
 const tile=match[0];
 assert.match(tile,/href="https:\/\/outlook\.live\.com\/calendar\/0\/view\/month"/);
 assert.match(tile,/target="_blank"/);
 assert.match(tile,/rel="noopener noreferrer external"/);
 assert.match(tile,/data-calendar-view="month"/);
 assert.match(tile,/class="sh9-info-heading">DÁTUM<\/span>/);
 assert.match(tile,/<span id="sh9Date6"[^>]*>[^<]+<\/span><span id="sh9Nameday6"/);
 assert.doesNotMatch(tile,/view\/agenda|sh9AgendaDialog|DÁTUM · NÉVNAP/);
 const calendar=html.match(/<a id="sh9CalendarCell"[\s\S]*?<\/a>/);
 assert.ok(calendar);
 assert.match(calendar[0],/href="https:\/\/outlook\.live\.com\/calendar\/0\/view\/agenda"/);
 assert.match(html,/sh9-info-v6\.js\?v=10-label-value/);
 // SH9 modules can be either direct <a> links or action <button> tiles.
 assert.equal([...html.matchAll(/<(?:button|a) class="tile" (?:type="button" |href="[^"]+" )?data-name="/g)].length,9);
 assert.equal((html.match(/data-nav="/g)||[]).length,5);
});

test('nameday data error still uses one label and never invents a name',()=>{
 assert.match(script,/nameEl\.textContent='nem elérhető'/);
 assert.doesNotMatch(script,/names\.join\(', '\)\+' névnap'/);
 assert.doesNotMatch(script,/location\.reload|localStorage\.clear|sessionStorage\.clear/);
});
