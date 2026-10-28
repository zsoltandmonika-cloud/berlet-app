const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav');
const rail=require(path.join(base,'rail-journeys-v2.js'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const source=fs.readFileSync(path.join(base,'rail-journeys-v2.js'),'utf8');

function build(){
 const nodes=new Map(),opened=[];
 class Node{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.events={};this.hidden=false;this.value='';this.textContent='';this.classList={classes:new Set(),add:x=>this.classList.classes.add(x)};this.style={};}
  append(...els){this.children.push(...els);els.forEach(x=>x.parentNode=this)}
  replaceChildren(...els){this.children=[];this.append(...els)}
  addEventListener(type,fn){this.events[type]=fn}
  setAttribute(name,value){this.attributes[name]=value}
  getAttribute(name){return this.attributes[name]||null}
  scrollIntoView(){}
  querySelector(sel){if(sel==='.demo')return nodes.get('demo');if(sel==='h2')return nodes.get('h2');if(sel==='.rail-warning')return this.children.find(x=>x.className==='rail-warning');return null}
  click(){if(this.tagName==='a'){opened.push(this.href);return}this.events.click?.();this.onclick?.()}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node('div'));return nodes.get(id)};
 for(const id of ['trainlist','from','to','when','find','refresh','depart','demo','h2','rail-journey-result'])get(id);
 get('from').value='Budapest-Keleti';get('to').value='Kazincbarcika';
 get('depart').querySelector=(sel)=>sel==='.demo'?get('demo'):sel==='h2'?get('h2'):null;
 get('h2').lastChild={nodeType:3,textContent:' Következő járatok'};
 const parent=new Node('div');parent.insertBefore=(el)=>{nodes.set(el.id,el)};
 get('depart').parentNode=parent;
 nodes.delete('rail-journey-result');
 let mode='now';
 const doc={getElementById:id=>nodes.get(id)||null,createElement:t=>new Node(t),
  querySelector:sel=>sel==='[data-mode].on'?{dataset:{mode}}:null};
 const win={navigator:{userAgent:'Desktop'},location:{assign:url=>opened.push(url)},
  SH9_MAV_OFFICIAL_V1:{
   boardFor:station=>station==='Budapest-Keleti'?'https://mikorindul.hu/keleti':null,
   allowedUrl:href=>['https://mavplusz.hu/','https://vonatinfo.mav.hu/','https://mikorindul.hu/keleti'].includes(href),
   URLS:{timetable:'https://mavplusz.hu/',liveTrains:'https://vonatinfo.mav.hu/'}
  }};
 const api=rail.mount(doc,win);
 return {nodes,get,doc,win,api,opened,setMode:next=>{mode=next}};
}
test('Phase 2D query identity protects arrival, departure and route freshness',()=>{
 const a={from:'Budapest-Keleti',to:'Kazincbarcika',mode:'depart',when:'2026-10-30T15:00:00Z'};
 assert.equal(rail.sameSearch(a,{...a}),true);
 assert.equal(rail.sameSearch(a,{...a,mode:'arrive'}),false);
 assert.equal(rail.sameSearch(a,{...a,to:'Miskolc-Tiszai'}),false);
 assert.equal(rail.sameSearch(a,{...a,when:'2026-10-30T16:00:00Z'}),false);
 assert.equal(rail.sameSearch({...a,mode:'now'},{...a,mode:'now',when:'2026-10-30T16:00:00Z'}),true);
 assert.equal(rail.sameSearch(a,null),false);
});
test('Without licensed source exactly three honest, actionable official provider photo cards',()=>{
 const b=build(),rows=b.get('trainlist').children;
 assert.equal(rows.length,3);
 assert.equal(b.get('h2').lastChild.textContent,' Vasúti szolgáltatások');
 assert.equal(rows[0].children[0].className,'trainthumb trainthumb-0');
 assert.equal(rows[1].children[0].className,'trainthumb trainthumb-1');
 assert.equal(rows[2].children[0].className,'trainthumb trainthumb-2');
 assert.equal(rows[0].children[1].children[0].textContent,'–:–');
 assert.equal(rows[0].children[1].children[1].textContent,'Nincs élő adat');
 rows[0].click();rows[1].click();rows[2].click();
 assert.deepEqual(b.opened,['https://mikorindul.hu/keleti','https://mavplusz.hu/','https://vonatinfo.mav.hu/']);
});
test('Actual route search keeps calendar mode + full date and opens one valid route, while refresh opens MÁV',()=>{
 const b=build();b.setMode('arrive');
 b.get('when').value='2026-10-30T16:55';
 b.get('find').onclick();
 assert.equal(b.opened.length,1);
 const u=new URL(b.opened[0]);
 assert.equal(u.hostname,'www.google.com');
 assert.equal(u.searchParams.get('origin'),'Budapest-Keleti');
 assert.equal(u.searchParams.get('destination'),'Kazincbarcika');
 assert.equal(u.searchParams.get('travelmode'),'transit');
 const panel=b.get('rail-journey-result');
 assert.ok(panel);
 assert.match(panel.children.find(x=>x.className==='rail-search-meta').textContent,/Érkezés eddig.*2026/);
 assert.match(panel.children.find(x=>x.className==='rail-warning').textContent,/külső tervezőben/);
 b.get('refresh').onclick();
 assert.equal(b.opened[1],'https://mavplusz.hu/');
});
test('Verified feeds show expandable details and never leak into another route',()=>{
 const b=build(),q=b.api.currentQuery();
 const now=new Date();
 const departure=new Date(now.getTime()+60*60000).toISOString();
 const arrival=new Date(now.getTime()+140*60000).toISOString();
 const payload={schema:'sh9-mav-trains-v1',provider:'licensed-test-source',from:q.from,to:q.to,
  fetchedAt:now.toISOString(),trains:[{service:'InterCity',number:'IC 562',departure,arrival,
    delayMinutes:null,platform:null,source:'Test timetable',live:false,link:'https://mavplusz.hu/'}]};
 assert.equal(b.api.acceptProviderData(payload),true);
 const row=b.get('trainlist').children[0],detail=b.get('trainlist').children[1];
 assert.equal(b.get('h2').lastChild.textContent,' Következő járatok');
 assert.equal(row.getAttribute('aria-expanded'),'false');
 assert.equal(detail.hidden,true);
 row.click();
 assert.equal(detail.hidden,false);
 assert.equal(row.getAttribute('aria-expanded'),'true');
 assert.match(detail.children.find(x=>x.className==='rail-warning').textContent,/Késési adat nem áll rendelkezésre/);
 b.get('to').value='Miskolc-Tiszai';
 b.get('find').onclick();
 assert.equal(b.get('trainlist').children.length,3);
 assert.equal(b.get('h2').lastChild.textContent,' Vasúti szolgáltatások');
 assert.equal(b.api.acceptProviderData({...payload,to:'Kazincbarcika'}),false);
});
test('Phase 2D accepts only official destinations and preserves Golden shell',()=>{
 assert.match(source,/function sameSearch\(a,b\)/);
 assert.match(source,/if\(!sameSearch\(q,currentQuery\(\)\)\)return false/);
 assert.match(source,/Date\.parse\(verified\.fetchedAt\)\+MAX_AGE/);
 assert.match(source,/aria-expanded/);
 assert.match(source,/Hivatalos információ ↗/);
 assert.match(source,/dateFmt\.format\(new Date\(q\.when\)\)/);
 assert.doesNotMatch(source,/\bsetInterval\(|navigator\.geolocation|supabase\.co|\.innerHTML\s*=/i);
 assert.match(html,/rail-golden-glass-v3/);
 assert.match(html,/mav-hero-approved\.webp/);
 assert.match(html,/bottom:9px;left:6px;width:45px/);
 assert.match(html,/id="rail-date" class="rail-picker-overlay"/);
 assert.match(html,/id="signal" class="sound"/);
 const nav=html.match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.equal((nav.match(/<a /g)||[]).length,5);
});
