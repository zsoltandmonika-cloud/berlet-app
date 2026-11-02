'use strict';
/* Nutrition v1137: Golden Standard four square profile-pastel tiles.
 * Verifies existing controls, user actions and a success-only celebration contract. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('hh-nutrition-quick-glass-v1137.css');
const code=read('hh-nutrition-quick-glass-v1137.js'),manual=read('hh-manual-intake-v1130.js');
const favorites=read('hh-quick-recipe-wheel-v635.js');
new vm.Script(code);new vm.Script(manual);
const ids=['hhManualLaunch1130','hhQuickLaunch','hhQuickOwnFoodsV1137','hhQuickDiaryV1137'];
const positions=ids.map(id=>{
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'unique tile '+id);
 return html.indexOf('id="'+id+'"');
});
assert.ok(positions.every((v,i)=>i===0||positions[i-1]<v),'tile order: manual, favorites, personal, diary');
assert.ok(html.indexOf('id="hhNutritionQuickGridV1137"')<positions[0]);
assert.ok(positions[3]<html.indexOf('<dialog id="hhManualDialog1130"'));
assert.match(html,/hh-nutrition-quick-glass-v1137\.css\?v=1137-premium-four-tiles/);
assert.match(html,/hh-nutrition-quick-glass-v1137\.js\?v=1137-quick-buttons-tada/);
assert.match(html,/hh-manual-intake-v1130\.js\?v=1137-profile-tada-after-save/);
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css,/aspect-ratio:1 \/ 1/);
assert.match(css,/html\[data-profile="monika"\]/);
assert.match(css,/color:#f5b2db/);
assert.match(css,/color:#acd8ff/);
assert.match(css,/#hhManualToast1135:not\(\[hidden\]\)/);
assert.match(css,/position:fixed/);
assert.match(favorites,/\$\('hhQuickLaunch'\)\.addEventListener\('click',showDialog\)/);
assert.match(manual,/\$\('hhManualLaunch1130'\)\.addEventListener\('click',open\)/);
assert.ok(manual.indexOf('result=api().recordManualMeal(info)')<
 manual.indexOf("hh:nutrition:manual-saved"),'TADAAA must follow verified persistence');
const calls=[],listeners={},nodes=new Map();
const node=id=>{
 if(!nodes.has(id))nodes.set(id,{id,
  click(){calls.push('click:'+id)},
  scrollIntoView({block}){calls.push('scroll:'+id+':'+block)},
  closest(){return node('diaryHeading')},
  focus(){calls.push('focus:'+id)},
  hasAttribute(){return false},setAttribute(){},
  addEventListener(type,fn){listeners[id+':'+type]=fn}});
 return nodes.get(id);
};
const doc={readyState:'loading',getElementById:node,
 addEventListener(type,fn){listeners['document:'+type]=fn}};
const win={setTimeout(){},localStorage:{getItem:()=> 'off'},
 matchMedia(){return {matches:false}},
 addEventListener(type,fn){listeners['window:'+type]=fn}};
vm.runInNewContext(code,{window:win,document:doc});
listeners['document:DOMContentLoaded']();
listeners['hhQuickOwnFoodsV1137:click']();
listeners['hhQuickDiaryV1137:click']();
listeners['window:hh:nutrition:manual-saved']();
assert.ok(calls.includes('click:newFood'));
assert.ok(calls.includes('scroll:diaryHeading:start'));
assert.ok(calls.includes('focus:log'));
assert.ok(!listeners['hhQuickLaunch:click'],'existing Favorites click must stay untouched');
assert.ok(!listeners['hhManualLaunch1130:click'],'existing manual entry click must stay untouched');
console.log('Nutrition v1137: 4 premium tiles, responsive pastel colors, original handlers and success TADAAA OK');
