/* SH9 Family Guard v863: Live Trip Flow GPS, direction, safety and UX hooks */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../guardian/guardian-live-flow-core-v863.js');
const folder=path.join(__dirname,'../guardian');
const now=Date.now();
const stop=(id,lat)=>({id,name:'Megálló '+id,lat,lng:19});
const first={id:'17',mode:'tram',headsign:'Észak',
 stops:[stop('A',47.5),stop('B',47.501),stop('C',47.502),stop('D',47.503)]};
const opposite={...first,headsign:'Dél',stops:[...first.stops].reverse()};
const fix=(lat,ago,accuracy=12)=>({lat,lng:19.00001,accuracy,ts:now-ago});

test('two real forward GPS fixes distinguish tram direction on shared tracks',()=>{
 const result=core.match([first,opposite],'17',fix(47.50078,6000),fix(47.50015,15000));
 assert.equal(result.auto.line.headsign,'Észak');
 assert.equal(result.status,'direction-confirmed');
});
test('single, stale or low-quality GPS cannot automatically identify the direction',()=>{
 assert.equal(core.match([first,opposite],'17',fix(47.50078,6000)).auto,null);
 assert.equal(core.match([first,opposite],'17',fix(47.50078,31000)).status,'no-gps');
 assert.equal(core.match([first,opposite],'17',fix(47.50078,6000,220)).status,'no-gps');
});
test('progress is between the exact official ordered stops, not invented ETAs',()=>{
 const match=core.snap(first,fix(47.5006,3000));
 assert.equal(match.index,0);
 assert.ok(match.fraction>.5&&match.fraction<.7);
 assert.equal(match.from.id,'A');assert.equal(match.to.id,'B');
});
test('a single backwards movement must not turn the chart red',()=>{
 const a=fix(47.5028,16000),b=fix(47.50185,11000),c=fix(47.501,6000);
 const one=core.warningUpdate(null,first,b,a,now);
 const two=core.warningUpdate(one,first,c,b,now);
 assert.equal(one.alert,null);
 assert.equal(two.alert,'possible-reverse');
});
test('new UI reuses existing foreground GPS and RLS family reads',()=>{
 const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
 const view=fs.readFileSync(path.join(folder,'guardian-live-flow-v863.js'),'utf8');
 const follow=fs.readFileSync(path.join(folder,'guardian-profile-follow-v837.js'),'utf8');
 const css=fs.readFileSync(path.join(folder,'guardian-live-flow-v863.css'),'utf8');
 assert.match(html,/id="hhLiveFlowV863"/);
 assert.match(html,/id="hhLiveFlowCloseBottomV863"/);
 assert.match(html,/id="hhLiveFlowSwitchLineV863"/);
 assert.match(html,/id="hhLiveFlowOpenV863"/);
 assert.match(css,/100dvh/);
 assert.match(css,/data-alarm="red"/);
 assert.match(view,/latestAuthorizedSelectedFix/);
 assert.match(view,/allowed\.lat!==next\.lat/);
 assert.match(follow,/setInterval\?\.\(refresh,3000\)/);
 assert.match(follow,/duration=850/);
 assert.doesNotMatch(view,/watchPosition\(/);
 assert.equal((html.match(/<script\b/g)||[]).length,(html.match(/<\/script>/g)||[]).length);
});
