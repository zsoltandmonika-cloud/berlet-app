'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fallback=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-auto-fallback-v1075.js');
const model=require('../../sh9/smart-travel/public-transport/smart-trip/smart-trip-multimodal-v1073.js');
const html=read('sh9/smart-travel/public-transport/smart-trip/index.html');
const js=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js');
const query={from:'Otthon',to:'Mónika · Anyuka',date:'2026-10-31',time:'16:40',mode:'now'};
const loc={origin:{name:'Otthon',lat:47.545,lng:19.035},destination:{name:'Mónika · Anyuka',lat:48.251,lng:20.648}};
test('one search provides an actual transit Google Maps URL with saved address coordinates',()=>{
 const link=fallback.url(model,query,loc),u=new URL(link);
 assert.equal(u.origin,'https://www.google.com');
 assert.equal(u.pathname,'/maps/dir/');
 assert.equal(u.searchParams.get('api'),'1');
 assert.equal(u.searchParams.get('travelmode'),'transit');
 assert.equal(u.searchParams.get('origin'),'47.545,19.035');
 assert.equal(u.searchParams.get('destination'),'48.251,20.648');
 assert.equal(u.searchParams.has('arrival_time'),false);
});
test('fallback launches once with no second user click, but only from caller with valid search',()=>{
 let count=0,to=null;
 const location={assign(u){count++;to=u}};
 assert.equal(fallback.go(model,query,loc,location),true);
 assert.equal(count,1);
 assert.ok(to.includes('travelmode=transit'));
 assert.equal(fallback.go(model,{...query,from:''},loc,location),false);
 assert.equal(fallback.go(model,{...query,to:'Otthon',from:'Otthon'},loc,location),false);
 assert.equal(fallback.go(model,{...query,time:'wrong'},loc,location),false);
 assert.equal(count,1);
});
test('guard refuses third-party, wrong-mode, invalid and popup targets',()=>{
 const fake={mapsUrl:()=> 'https://attacker.example/route?api=1&travelmode=transit&destination=x'};
 assert.equal(fallback.go(fake,query,loc,{assign(){throw Error('must not happen')}}),false);
 assert.equal(fallback.go({mapsUrl:()=> 'https://www.google.com/maps/?api=1&travelmode=transit&destination=x'},query,loc,{assign(){}}),false);
 assert.equal(fallback.valid({...query,date:'2026-99-99'}),false);
 assert.equal(fallback.go(model,query,loc,{assign(){throw Error('blocked')}}),false);
});
test('no embarrassing Google button or separate next-click CTA survives in Smart Trip UI',()=>{
 assert.doesNotMatch(html,/id="st22ExternalTrip"|id="st22ExternalNote"/);
 assert.doesNotMatch(js,/externalTrip\?\.addEventListener|offerExternal\(/);
 assert.match(html,/id="st22SearchMethod"/);
 assert.match(html,/value="chatgpt"[^>]*>✨ Léna · ChatGPT/);
 assert.match(html,/value="google"/);
 assert.match(html,/value="native"/);
 assert.match(js,/if\(method==='chatgpt'\)\{chatgptHandoff\(query\);return\}/);
 assert.match(js,/if\(method==='google'\)\{googleHandoff\(query\);return\}/);
 assert.match(js,/noVerifiedRoute\(/);
 assert.doesNotMatch(js,/if\(searchMethod\(\)!=='native'&&handoff\(query\)\)return/);
});
test('default search method is per profile, editable, restored after profile switch',()=>{
 assert.match(js,/METHOD_KEY='sh9-smart-trip-search-method-v1076-'/);
 assert.match(js,/const allowedMethods=new Set\(\['chatgpt','google','native'\]\)/);
 assert.match(js,/w\.localStorage\.setItem\(METHOD_KEY\+profile\(\),choice\)/);
 assert.match(js,/const saved=w\.localStorage\.getItem\(METHOD_KEY\+p\)/);
 assert.match(js,/restoreMethod\(\);\s*if\(clearFields\)/);
 assert.match(js,/methodSelect\?\.addEventListener\('change'/);
});
test('no extra API budget, polling or background redirect is added to auto-fallback',()=>{
 const src=read('sh9/smart-travel/public-transport/smart-trip/smart-trip-auto-fallback-v1075.js');
 assert.doesNotMatch(src,/fetch\(|setInterval\(|geolocation|open\(/);
 assert.match(src,/location\.assign\(target\)/);
 assert.match(js,/form\.addEventListener\('submit',searchTrip\)/);
});
