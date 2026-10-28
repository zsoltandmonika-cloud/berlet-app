const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../../sh9/smart-travel/public-transport/mav/index.html'),'utf8');
test('MÁV calendar and clock have their own full-size native tap areas, no broken grid row',()=>{
 assert.match(html,/<input id="rail-date" class="rail-picker-overlay" type="date"[^>]*aria-label="Utazás dátumának kiválasztása"/);
 assert.match(html,/<input id="rail-time" class="rail-picker-overlay" type="time"[^>]*aria-label="Utazás időpontjának kiválasztása"/);
 assert.match(html,/\.datetime \.rail-picker-overlay\{position:absolute;inset:0;z-index:4;display:block;width:100%;height:100%/);
 assert.match(html,/\.datetime #when\.whenInput\{display:none!important\}/);
 assert.match(html,/id="when" class="whenInput" type="datetime-local"[^>]*tabindex="-1"/);
 assert.doesNotMatch(html,/\$\('when'\)\.style\.display='block'/);
});
test('one-tap native date selection switches from Now to Depart and syncs route query',()=>{
 const from=html.indexOf("let mode='now';");
 const until=html.indexOf("$('swap').onclick=",from);
 assert.ok(from>0&&until>from);
 const code=html.slice(from,until);
 const els=new Map();
 function el(name){
  if(!els.has(name)){
   const events={};
   els.set(name,{value:'',textContent:'',events,onclick:null,
    addEventListener(type,fn){events[type]=fn},focus(){this.focused=true},
    setAttribute(k,v){this[k]=v},classList:{toggle(k,v){this[k]=v}}});
  }
  return els.get(name);
 }
 const buttons=['now','depart','arrive'].map(name=>({...el('button-'+name),dataset:{mode:name}}));
 const mockDocument={getElementById:el,querySelectorAll(selector){
  if(selector==='[data-mode]')return buttons;return [];
 }};
 const sandbox={document:mockDocument,Date,Number,String,Intl,$:el};
 assert.doesNotThrow(()=>vm.runInNewContext(code,sandbox));
 const date=el('rail-date'),time=el('rail-time'),when=el('when');
 date.events.pointerdown();
 date.value='2026-10-30';
 time.value='16:55';
 date.events.change();
 assert.equal(when.value,'2026-10-30T16:55');
 assert.equal(buttons[1]['aria-pressed'],'true');
 assert.equal(buttons[0]['aria-pressed'],'false');
 assert.match(el('dateTxt').textContent,/okt/);
 assert.equal(el('timeTxt').textContent,'16:55');
 buttons[2].onclick();
 assert.equal(buttons[2]['aria-pressed'],'true');
 assert.equal(when.value,'2026-10-30T16:55');
 buttons[0].onclick();
 assert.equal(buttons[0]['aria-pressed'],'true');
 time.events.focus();
 assert.equal(buttons[1]['aria-pressed'],'true');
 assert.equal(when.value,'2026-10-30T16:55');
});
test('Date mode button opens native Android date picker on user gesture',()=>{
 const from=html.indexOf("let mode='now';"),until=html.indexOf("$('swap').onclick=",from);
 const controls={},buttons=['now','depart','arrive'].map(mode=>({dataset:{mode},classList:{toggle(){}},setAttribute(){}}));
 const doc={getElementById(id){if(!controls[id])controls[id]={value:'',textContent:'',handlers:{},
  addEventListener(type,fn){this.handlers[type]=fn},focus(){this.focused=true}};return controls[id]},
  querySelectorAll(){return buttons}};
 let count=0;doc.getElementById('rail-date').showPicker=()=>{count++};
 vm.runInNewContext(html.slice(from,until),{document:doc,Date,Intl,Number,String,$:id=>doc.getElementById(id)});
 buttons[2].onclick();assert.equal(count,1);
 buttons[1].onclick();assert.equal(count,2);
 buttons[0].onclick();assert.equal(count,2);
});
