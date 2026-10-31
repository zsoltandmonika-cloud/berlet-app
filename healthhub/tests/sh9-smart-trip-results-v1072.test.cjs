'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const view=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-result-v1072.js');
const html=read('sh9/smart-travel/public-transport/smart-trip/index.html');
const css=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-result-v1072.css');
const smart=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js');
const original=()=>({
 legs:[{tripId:'c1',service:'IC',from:'Budapest-Keleti',to:'Miskolc-Tiszai',
  departure:'2026-11-06T15:00:00Z',arrival:'2026-11-06T16:45:00Z',headsign:'Miskolc'}],
 departure:'2026-11-06T15:00:00Z',arrival:'2026-11-06T16:45:00Z',transfers:0,durationMinutes:105
});
const source={kind:'local-private-gtfs',coverage:'station-to-station',verified:true,name:'MÁV - privát GTFS',generatedAt:'2026-10-30T10:00:00Z'};
const timed=(kind,from,to,departure,arrival,extra={})=>({kind,from,to,departure,arrival,...extra});
test('must not render results without verified, allowed source metadata',()=>{
 assert.equal(view.prepare([original()],{...source,verified:false}),null);
 assert.equal(view.prepare([original()],{...source,kind:'unknown'}),null);
 assert.equal(view.prepare([original()],{...source,coverage:'door-to-door'}),null);
 assert.equal(view.prepare([],source),null);
 assert.equal(view.prepare([{}],source),null);
 assert.equal(view.prepare([original()],null),null);
});
test('station rail result has no fabricated walk, realtime claim or five-star rating',()=>{
 const data=view.prepare([original()],source);
 assert.ok(data);
 assert.equal(data.items.length,1);
 const j=data.items[0];
 assert.equal(j.transfers,0);
 assert.equal(j.durationMinutes,105);
 assert.equal(j.walkingMinutes,null);
 assert.equal(j.walkingMeters,null);
 assert.equal(j.doorToDoor,false);
 assert.ok(j.stars<=4);
 assert.equal(j.segments[0].brand,'mav');
 assert.equal(data.source.live,false);
 assert.equal(data.source.coverage,'station-to-station');
});
test('alternative journeys are limited, unique, and one can be presented at a time',()=>{
 const rows=Array.from({length:14},(_,i)=>{
  const t=Date.parse('2026-11-06T15:00:00Z')+i*3600000;
  return {
   legs:[{service:'IC',from:'A',to:'B',departure:new Date(t).toISOString(),arrival:new Date(t+3600000).toISOString()}],
   departure:new Date(t).toISOString(),arrival:new Date(t+3600000).toISOString(),transfers:0
  };
 });
 const result=view.prepare([rows[0],rows[0],...rows],source);
 assert.ok(result);
 assert.equal(result.items.length,8);
 assert.equal(result.items[1].startMs,Date.parse(rows[1].departure));
});
test('verified walking is only counted if explicitly present with measured distance',()=>{
 const start='2026-11-06';
 const jour={
  segments:[
   timed('walk','Otthon','Megálló',start+'T15:00:00Z',start+'T15:05:00Z',{distanceMeters:370,walkingVerified:true}),
   timed('ride','Megálló','Állomás',start+'T15:07:00Z',start+'T15:25:00Z',{agency:'BKK',vehicleType:'BUS',service:'260'}),
   timed('walk','Állomás','Célcím',start+'T15:27:00Z',start+'T15:32:00Z',{distanceMeters:410,walkingVerified:true})
  ],departure:start+'T15:00:00Z',arrival:start+'T15:32:00Z',transfers:0
 };
 const multi={...source,kind:'verified-multimodal',coverage:'door-to-door',name:'Ellenőrzött multimodális adapter'};
 const ready=view.prepare([jour],multi);
 assert.ok(ready);assert.equal(ready.items[0].doorToDoor,true);
 assert.equal(ready.items[0].walkingMinutes,10);
 assert.equal(ready.items[0].walkingMeters,780);
 assert.equal(ready.items[0].stars,5);
 assert.equal(ready.items[0].interchangeWait,4);
 assert.equal(ready.items[0].segments[1].brand,'bus');
 const missingWalk={...jour,segments:jour.segments.map((x,i)=>i===0?{...x,walkingVerified:false}:x)};
 assert.equal(view.prepare([missingWalk],multi),null);
 assert.equal(view.prepare([jour],{...multi,verified:false}),null);
});
test('invalid times, overlaps, phantom gaps and unverified delivery services cannot become an itinerary',()=>{
 const base=original();
 assert.equal(view.prepare([{...base,arrival:'2026-11-06T20:00:00Z'}],source),null);
 assert.equal(view.prepare([{...base,legs:[{...base.legs[0],departure:'not-a-date'}]}],source),null);
 const mix={segments:[
  timed('ride','A','B','2026-11-06T15:00:00Z','2026-11-06T15:20:00Z',{agency:'BKK',service:'17'}),
  timed('ride','B','C','2026-11-06T15:19:00Z','2026-11-06T15:30:00Z',{agency:'BKK',service:'19'})
 ],departure:'2026-11-06T15:00:00Z',arrival:'2026-11-06T15:30:00Z',transfers:1};
 assert.equal(view.prepare([mix],{...source,kind:'verified-multimodal'}),null);
 const delivery={...base,legs:[{...base.legs[0],agency:'Wolt'}]};
 assert.equal(view.prepare([delivery],{...source,kind:'verified-multimodal'}),null);
});
test('BKK, MAV, Volan coloring and future inactive taxi/rideshare/carsharing slots are distinct',()=>{
 const classify=(agency,vehicleType)=>view.identity({agency,vehicleType},source).kind;
 assert.equal(classify('BKK','BUS'),'bus');
 assert.equal(classify('BKK','TRAM'),'tram');
 assert.equal(classify('BKK','SUBURBAN_RAIL'),'hev');
 assert.equal(classify('MÁV','TRAIN'),'mav');
 assert.equal(classify('Volánbusz','BUS'),'volan');
 assert.equal(classify('Főtaxi','CAR'),'taxi');
 assert.equal(classify('Uber','CAR'),'ridehail');
 assert.equal(classify('', 'SHARED_CAR'),'carshare');
 assert.equal(classify('Wolt','CAR'),'delivery');
 assert.deepEqual(Object.keys(view.FUTURE_PROVIDERS).sort(),['fotaxi','sharedCar','uber','wolt']);
 for(const item of Object.values(view.FUTURE_PROVIDERS))assert.equal(item.status,'not-connected');
 assert.match(css,/\.st22-r-provider-bus\{background:#1376db\}/);
 assert.match(css,/\.st22-r-provider-tram\{background:#eabf26/);
 assert.match(css,/\.st22-r-provider-hev\{background:#2aaf71\}/);
});
function fakeDoc(){
 const handlers=new Map(),els=new Map();
 function element(name){
  const el={name,children:[],textContent:'',hidden:false,open:false,disabled:false,attrs:{},scrollTop:0,
   appendChild(v){this.children.push(v);return v},replaceChildren(){this.children=[]},
   setAttribute(k,v){this.attrs[k]=v},addEventListener(e,fn){handlers.set(this.name+':'+e,fn)},
   focus(){},showModal(){this.open=true},close(){this.open=false;handlers.get(this.name+':close')?.()},
   click(){handlers.get(this.name+':click')?.()}};
  return el;
 }
 const ids=['st22ResultDialog','st22ResultBody','st22ResultCounter','st22ResultNext','st22ResultClose','st22ResultBack','st22ResultSound'];
 ids.forEach(id=>els.set(id,element(id)));
 return {doc:{getElementById:id=>els.get(id),createElement:tag=>element(tag),activeElement:null},
  els,handlers};
}
test('fullscreen opens only verified journeys; next reveals exactly one new result, no re-search',()=>{
 const {doc,els}=fakeDoc();
 const store=new Map();
 const w={localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}};
 const controller=view.mount(w,doc);
 assert.ok(controller);
 assert.equal(controller.open({items:[original()]}),false);
 const a=original(),b={...original(),legs:[{...original().legs[0],departure:'2026-11-06T18:00:00Z',arrival:'2026-11-06T19:45:00Z'}],departure:'2026-11-06T18:00:00Z',arrival:'2026-11-06T19:45:00Z'};
 const data=view.prepare([a,b],source);
 assert.ok(controller.open(data));
 assert.equal(els.get('st22ResultDialog').open,true);
 assert.equal(controller.displayed().index,0);
 assert.equal(els.get('st22ResultCounter').textContent,'1 / 2');
 assert.equal(els.get('st22ResultBody').children.filter(x=>x.className==='st22-r-hero').length,1);
 els.get('st22ResultNext').click();
 assert.equal(controller.displayed().index,1);
 assert.equal(els.get('st22ResultCounter').textContent,'2 / 2');
 assert.equal(els.get('st22ResultNext').disabled,true);
 els.get('st22ResultBack').click();
 assert.equal(els.get('st22ResultDialog').open,false);
 assert.equal(controller.displayed(),null);
});
test('approved SH9 hero/map, shared place integration and safe source check remain wired',()=>{
 assert.match(html,/smart-trip-ai-approved-hero-corky-v1030\.avif/);
 assert.match(html,/st22MapDialog/);
 assert.match(html,/smart-trip-result-v1072\.css/);
 assert.match(html,/smart-trip-result-v1072\.js[^"]*"><\/script>[\s\S]*smart-trip-ai-v1022\.js/);
 for(const id of ['st22ResultDialog','st22ResultBody','st22ResultCounter','st22ResultNext','st22ResultClose','st22ResultBack','st22ResultSound'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/onclick=/);
 assert.match(css,/#st22ResultDialog\[open\]/);
 assert.match(css,/@keyframes st22-result-rise/);
 assert.match(css,/#st22ResultNext:disabled/);
 assert.match(smart,/geo\?\.favoriteSuggestions\?\.\(w\.localStorage,q,12\)/);
 assert.match(smart,/rail\?\.validate\?\.\(verifiedFeed,\{allowPrivate:true\}\)/);
 assert.match(smart,/Date\.now\(\)-generation>90\*86400000/);
 assert.match(smart,/renderJourneys\(rank\(result\.journeys,query,instant\),query,instant,available\)/);
 assert.doesNotMatch(view.prepare.toString(),/fetch\(|navigator\.geolocation/);
});
