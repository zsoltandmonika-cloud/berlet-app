'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../guardian/smart-260-connect');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),app=read('app.mjs'),core=read('core.mjs');
const fleet=read('fleet-catalog-v940.mjs'),style=read('fleet-editor-v940.css');
const official=require('../guardian/bkk-catalog-v801.json');
let lib;
async function catalog(){
 lib??=await import('../guardian/smart-260-connect/fleet-catalog-v940.mjs');
 return lib;
}
test('Full official BKK catalog: all transportation modes, unambiguous same-number variants, no invented routes',async()=>{
 const m=await catalog();
 const routes=m.validateCatalog(official);
 assert.equal(official.source,'BKK Zrt., CC BY 4.0');
 assert.ok(official.routes.length>=374);
 assert.equal(routes.length,official.routes.length-1); // 960 Telebusz is explicitly excluded
 assert.equal(routes.filter(x=>x.key==='tram:19').length,1);
 assert.equal(routes.filter(x=>x.key==='bus:19').length,1);
 assert.notEqual(m.valueOf('tram:19'),m.valueOf('bus:19'));
 assert.ok(['bus','tram','metro','hev','trolley'].every(mode=>routes.some(x=>x.mode===mode)));
 assert.ok(['17','19','41','260'].every(id=>routes.some(x=>x.id===id)));
 assert.ok(!routes.some(x=>x.id==='960'));
 assert.equal(m.coverage({targetKey:'bus:260',feederKeys:['tram:17','tram:19']}),true);
 assert.equal(m.coverage({targetKey:'bus:260',feederKeys:['bus:105']}),false);
 assert.equal(m.coverage({targetKey:'bus:105',feederKeys:['tram:17']}),false);
 assert.equal(m.coverage({targetKey:'bus:105',feederKeys:[],type:'walk'}),false);
});
test('Fleet editor supports changing target 260 and searching complete feeder fleet',()=>{
 assert.ok(html.includes('id="feederSearchV940"'));
 assert.ok(html.includes('id="feederModeV940"'));
 assert.ok(html.includes('id="fleetCoverageV940"'));
 assert.ok(html.includes('id="targetRoute"'));
 assert.ok(html.includes('id="deleteBtn"'));
 assert.ok(html.includes('fleet-editor-v940.css?v=940'));
 assert.ok(html.includes('app.mjs?v=943-verified-family-trip'));
 assert.ok(app.includes('state.catalog=await loadCatalog()'));
 assert.ok(app.includes('selectedFeeders=new Set'));
 assert.ok(app.includes('const shown=[...chosen,...other.slice(0,needle?60:24)]'));
 assert.ok(app.includes('targetRoutes:base.targetRoute===$("targetRoute").value.trim()'));
 assert.ok(app.includes('if(base.targetRoute!==next.targetRoute)'));
 assert.ok(app.includes('if(multiLeg||!coverage({targetKey:item.targetRoute'));
 assert.ok(app.includes('nem jelenítünk meg')||app.includes('nincs ellenőrzött indulási menetrend'));
 assert.ok(app.includes('loadFullStopSuggestions'));
 assert.ok(style.includes('.sm-fleet-browser-v940'));
 assert.doesNotThrow(()=>new vm.Script(app.replace(/^import .*\n/gm,'').replaceAll('import.meta.url','"dummy"')));
});
test('Saved-scheme delete confirms and tombstones built-in samples without affecting others',()=>{
 assert.match(app,/DELETED_SAMPLES_KEY="sh9-smart-match-deleted-samples-v940"/);
 assert.match(app,/if\(!ids.has\(sample.id\)&&!hidden.has\(sample.id\)\)saved.push/);
 assert.match(app,/window\.confirm\?\.\(/);
 assert.match(app,/state\.items=state\.items\.filter\(x=>x\.id!==id\)/);
 assert.match(app,/if\(localStorage\.getItem\(ACTIVE_PIN_KEY\)===id\)localStorage\.removeItem/);
 assert.match(app,/if\(!persist\(\)\)\{state\.items=backup;state\.current=id;return\}/);
 assert.match(app,/state\.items\.find\(x=>x\.id===DEFAULT.id\)\?\.id\|\|state\.items\[0\]\?\.id/);
 assert.ok(app.includes('const hidden=new Set(dismissed)'));
});
test('Two verified-favorite-index family templates can be edited, reversed, or removed',async()=>{
 const m=await import('../guardian/smart-260-connect/core.mjs');
 const a=m.FAMILY_OUTBOUND,b=m.FAMILY_RETURN;
 assert.deepEqual([a.originFavoriteSlot,a.destinationFavoriteSlot],[0,7]);
 assert.deepEqual([b.originFavoriteSlot,b.destinationFavoriteSlot],[7,0]);
 assert.equal(a.reverseId,b.id);assert.equal(b.reverseId,a.id);
 assert.equal(a.targetRoute,'4');assert.equal(b.targetRoute,'260');
 assert.equal(a.multiLegDraft,true);assert.equal(b.multiLegDraft,true);
 assert.deepEqual(a.feederRoutes,['260','17','19']);
 assert.deepEqual(b.feederRoutes,['4','6','17','19']);
 assert.deepEqual(a.targetRoutes,['4','6']);
 assert.equal(a.flowSteps.length,6);assert.equal(b.flowSteps.length,6);
 assert.ok(m.SAMPLES.includes(a)&&m.SAMPLES.includes(b));
 assert.equal(m.bus260DirectionForTemplate({...m.DEFAULT,targetRoute:'19',targetRoutes:['19']}),null);
 assert.equal(m.bus260DirectionForTemplate(m.DEFAULT),'home');
 assert.equal(m.bus260DirectionForTemplate(m.REVERSE),'work');
});
