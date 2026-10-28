const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav/index.html'),'utf8');
function runPickerController(){
 const from=html.indexOf("let mode='now';");
 const until=html.indexOf("$('swap').onclick=",from);
 assert.ok(from>0&&until>from);
 const els=new Map();
 function el(id){
  if(!els.has(id)){
   const events={};els.set(id,{id,value:'',textContent:'',events,clickCount:0,
    addEventListener(k,fn){events[k]=fn},setAttribute(k,v){this[k]=v},
    classList:{toggle(k,v){this[k]=v}},focus(){this.focused=true},
    click(){this.clickCount++}});
  }
  return els.get(id);
 }
 const buttons=['now','depart','arrive'].map(mode=>({...el('mode-'+mode),dataset:{mode}}));
 const document={getElementById:el,querySelectorAll(selector){return selector==='[data-mode]'?buttons:[]}};
 vm.runInNewContext(html.slice(from,until),{window:{},document,Date,Intl,Number,String,$:el});
 return {els,el,buttons};
}
test('Native calendar & time touch targets are visible glass surfaces, not transparent dead overlays',()=>{
 assert.match(html,/<div id="rail-date-trigger" class="datebox" role="button" tabindex="0"/);
 assert.match(html,/<div id="rail-time-trigger" class="timebox" role="button" tabindex="0"/);
 assert.match(html,/<input id="rail-date" class="rail-picker-overlay" type="date" tabindex="-1"/);
 assert.match(html,/<input id="rail-time" class="rail-picker-overlay" type="time" tabindex="-1"/);
 assert.match(html,/\.datetime \.rail-picker-overlay\{position:absolute;inset:0;z-index:4;display:block;width:100%;height:100%/);
 assert.match(html,/opacity:0;pointer-events:none;cursor:pointer/);
 assert.match(html,/\.datetime #when\.whenInput\{display:none!important\}/);
});
test('Tap on date itself synchronously invokes native showPicker and activates Depart',()=>{
 const b=runPickerController(),d=b.el('rail-date'),t=b.el('rail-time');
 let called=0;d.showPicker=()=>called++;
 b.el('rail-date-trigger').events.click();
 assert.equal(called,1,'date tile must open real picker on same tap');
 assert.equal(b.buttons[1]['aria-pressed'],'true');
 assert.equal(b.buttons[0]['aria-pressed'],'false');
 assert.ok(d.value,'selected date must be initialized');
 assert.ok(t.value,'time must be initialized');
 d.value='2026-10-30';t.value='16:55';d.events.change();
 assert.equal(b.el('when').value,'2026-10-30T16:55');
 assert.match(b.el('dateTxt').textContent,/okt/);
 assert.equal(b.el('timeTxt').textContent,'16:55');
});
test('Tap on time opens time picker; Arrival mode remains selected',()=>{
 const b=runPickerController(),t=b.el('rail-time'),date=b.el('rail-date');
 let tCalls=0,dCalls=0;t.showPicker=()=>tCalls++;date.showPicker=()=>dCalls++;
 b.buttons[2].onclick();
 assert.equal(dCalls,1);
 b.el('rail-time-trigger').events.click();
 assert.equal(tCalls,1);
 assert.equal(b.buttons[2]['aria-pressed'],'true');
 t.value='18:25';t.events.change();
 assert.equal(b.el('when').value.slice(11),'18:25');
 assert.match(b.el('timeTxt').textContent,/18:25/);
});
test('Keyboard Enter/Space also opens the native picker and prevents page scroll',()=>{
 const b=runPickerController();let calls=0;b.el('rail-date').showPicker=()=>calls++;
 for(const key of ['Enter',' ']){
  let prevented=false;b.el('rail-date-trigger').events.keydown({key,preventDefault(){prevented=true}});
  assert.equal(prevented,true);
 }
 assert.equal(calls,2);
});
test('Mode buttons still open native calendar, and Now does not',()=>{
 const b=runPickerController();let count=0;b.el('rail-date').showPicker=()=>count++;
 b.buttons[2].onclick();assert.equal(count,1);
 b.buttons[1].onclick();assert.equal(count,2);
 b.buttons[0].onclick();assert.equal(count,2);
 assert.equal(b.buttons[0]['aria-pressed'],'true');
});
test('Fallback opens original native control only when showPicker is missing/throws',()=>{
 const b=runPickerController(),d=b.el('rail-date');d.showPicker=()=>{throw Error('Android unsupported')};
 b.el('rail-date-trigger').events.click();
 assert.equal(d.focused,true);
 assert.equal(d.clickCount,1);
});
