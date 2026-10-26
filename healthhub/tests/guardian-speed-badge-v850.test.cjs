'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../guardian'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const speed=require('../guardian/guardian-speed-badge-v850.js');
const follow=require('../guardian/guardian-profile-follow-v837.js');
const NOW=Date.parse('2026-10-26T11:10:00Z');
const ts=(age=1000)=>NOW-age;
test('v850 5/4 km/h hysteresis, no GPS jitter, no invented speed',()=>{
 assert.equal(speed.version,'850');
 const d=(was,speedKmh,accuracy=12,age=1000)=>speed.decide(was,speedKmh,accuracy,ts(age),NOW);
 assert.deepEqual(d(false,5),{visible:false,text:''},'strictly ABOVE five to show');
 assert.deepEqual(d(false,4.9),{visible:false,text:''});
 assert.deepEqual(d(false,5.1),{visible:true,text:'5 km/h'});
 assert.deepEqual(d(true,4.5),{visible:true,text:'5 km/h'},'retain the open pill between 4-5');
 assert.deepEqual(d(true,4),{visible:true,text:'4 km/h'},'hide strictly below four');
 assert.deepEqual(d(true,3.9),{visible:false,text:''});
 assert.equal(d(false,12).text,'12 km/h');
 assert.equal(d(false,50).text,'50 km/h');
 assert.equal(d(true,null).visible,false);
 assert.equal(d(true,undefined).visible,false);
 assert.equal(d(true,'12').visible,false);
 assert.equal(d(true,Infinity).visible,false);
 assert.equal(d(true,-1).visible,false);
 assert.equal(d(true,201).visible,false);
 assert.equal(d(true,12,41).visible,false,'weak GPS never displays movement');
 assert.equal(d(true,12,40).visible,true);
 assert.equal(d(true,12,12,25001).visible,false,'old but still valid native location must not mean current speed');
 assert.equal(speed.decide(true,12,12,NOW+6000,NOW).visible,false,'future timestamp');
 assert.equal(speed.decide(true,12,12,'bad timestamp',NOW).visible,false);
});
function el(kind='span'){
 const classes=new Set();
 return {tagName:kind,className:'',children:[],textContent:'',attrs:{},
  classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k)},remove(k){classes.delete(k)},contains(k){return classes.has(k)}},
  append(...items){this.children.push(...items)},appendChild(item){this.children.push(item);return item},
  setAttribute(k,v){this.attrs[k]=v},
  querySelector(sel){
   const target=sel.slice(1);
   const visit=o=>{
    for(const child of o.children){
     if(child.className?.split(' ').includes(target))return child;
     const nested=visit(child);if(nested)return nested;
    }
    return null;
   };
   return visit(this);
  }
 };
}
test('v850 updates the EXISTING name pill, folds one speed row without extra avatar',()=>{
 const w={document:{createElement:el}};
 vm.runInNewContext(read('guardian-speed-badge-v850.js'),{window:w,Date,Math,Number,String,Object});
 const api=w.HH_GUARDIAN_SPEED_BADGE_V850;
 const portrait=el('div'),label=el('span');
 label.className='guardian-position-label';label.textContent='Mónika';portrait.append(label);
 const start={speed:12.2,accuracy:8,ts:ts(1500),now:NOW};
 assert.equal(api.update(portrait,start),true);
 assert.equal(portrait.querySelector('.guardian-speed-name-v850').textContent,'Mónika');
 assert.equal(portrait.querySelector('.guardian-speed-value-v850').textContent,'12 km/h');
 assert.equal(label.classList.contains('guardian-speed-open-v850'),true);
 assert.match(portrait.attrs['aria-label'],/Mónika.*12 km\/h/);
 assert.equal(label.children.length,2,'one name, one expandable speed, zero second avatars');
 assert.equal(api.update(portrait,{...start,speed:4.7}),true);
 assert.equal(label.classList.contains('guardian-speed-open-v850'),true);
 assert.equal(api.update(portrait,{...start,speed:3.6}),false);
 assert.equal(portrait.querySelector('.guardian-speed-value-v850').textContent,'');
 assert.equal(label.classList.contains('guardian-speed-open-v850'),false);
 assert.equal(api.update(portrait,{...start,speed:11}),true);
 assert.equal(api.hide(portrait),true);
 assert.equal(label.classList.contains('guardian-speed-open-v850'),false);
 assert.equal(portrait.querySelector('.guardian-speed-value-v850').textContent,'');
 assert.equal(label.children.length,2,'refresh cannot accumulate speed tags');
});
test('v850 selected profile speed is tied to source GPS record with no cross-profile leak',()=>{
 const good={profile_key:'monika',latitude:47.55,longitude:19.035,
  accuracy_m:12,updated_at:new Date(NOW-1200).toISOString(),speed_kmh:13.2,source:'HH One Native GPS'};
 const ok=follow.snapshot(good,'monika',NOW);
 assert.equal(ok.speedKmh,13.2);
 assert.equal(speed.decide(false,ok.speedKmh,ok.accuracy,ok.ts,NOW).text,'13 km/h');
 assert.equal(follow.snapshot(good,'zsolt',NOW),null,'never show Mónika speed in Zsolt profile');
 assert.equal(follow.snapshot({...good,accuracy_m:120},'monika',NOW),null);
 assert.equal(follow.snapshot({...good,updated_at:new Date(NOW-35000).toISOString()},'monika',NOW)?.profile,'monika');
 const old=follow.snapshot({...good,updated_at:new Date(NOW-35000).toISOString()},'monika',NOW);
 assert.equal(speed.decide(false,old.speedKmh,old.accuracy,old.ts,NOW).visible,false,
  'location may remain fresh when its speed is already too old');
 assert.equal(follow.snapshot({...good,speed_kmh:null},'monika',NOW).speedKmh,null);
});
test('v850 touches only selected portrait name tag and keeps approved Hero/map fully intact',()=>{
 const html=read('index.html'),css=read('guardian-speed-badge-v850.css'),
  script=read('guardian-speed-badge-v850.js'),
  own=read('guardian.js'),remote=read('guardian-profile-follow-v837.js'),
  fg=read('guardian-profile-foreground-v838.css');
 assert.match(html,/guardian-speed-badge-v850\.css\?v=850-selected-name-frosted-speed/);
 assert.match(html,/guardian-speed-badge-v850\.js\?v=850-readonly-gps-speed/);
 assert.ok(html.indexOf('guardian-speed-badge-v850.js')<html.indexOf('<script defer src="./guardian.js?'));
 assert.match(css,/#guardianMap \.guardian-position:not\(\.guardian-peer-position\) \.guardian-position-label/);
 assert.match(css,/\[data-guardian-person="m"\]/);
 assert.match(css,/backdrop-filter:blur\(22px\) saturate\(1\.45\)/);
 assert.match(css,/guardian-speed-open-v850/);
 assert.match(css,/top:calc\(100% - 24px\)/,'speed expands DOWNWARD, original photo anchor fixed');
 assert.doesNotMatch(css,/\.maplibregl-marker\{|\.guardian-position-photo\{|guardian-hero|map-follow|guardianHHNav/);
 assert.match(fg,/z-index:82!important/);
 assert.match(own,/c\.speed\*3\.6/);
 assert.match(own,/preventWrongDeviceGps\?\.\(\)/);
 assert.match(remote,/speedKmh:typeof record\.speed_kmh/);
 assert.match(remote,/HH_GUARDIAN_SPEED_BADGE_V850\?\.update/);
 assert.match(own,/HH_GUARDIAN_SPEED_BADGE_V850\?\.hide/);
 assert.doesNotMatch(script,/navigator|geolocation|fetch\(|upsert\(|upload\(|localStorage|sessionStorage/);
 assert.match(html,/guardian-hero-monitor-note/);
 assert.match(html,/guardianProfileSwitch/);
 assert.match(html,/guardian-live-trio-v845\.css\?v=849-type-minus-one/);
});
