'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'premium-home-compact-v525.js'),'utf8');
const css=fs.readFileSync(path.join(root,'premium-home-compact-v525.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.includes('premium-home-compact-v525.js?v=5281-hero-corners'),'production compact Home cache bust');
assert.ok(html.includes("if(u.searchParams.get('hhpremium')==='0')v='407-digital-wellbeing-family-507'"),'legacy Home remains an explicit URL fallback');
assert.ok(html.includes("var v='5281-premium-hero-corners'"),'normal Home now points to approved v528 Premium');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.start_url,'./index.html?hhv=5281-premium-hero-corners','installed app starts at approved Premium Home');
assert.ok(html.indexOf('premium-home-compact-v525.js')>html.indexOf('home-hero-info-glass-v522.js'),'v525 must load after v522');
assert.ok(source.includes("query.get('hhpremium')==='0'"),'classic opt-out guard');
assert.ok(source.includes("dataset.hhPremiumPreview!=='on'"),'mounted premium guard');
assert.ok(css.includes('#hhOneRag500')&&css.includes('#hhOneFallback501'),'style both service controls');
assert.ok(source.includes("premium-home-compact-v525.css?v=5281-hero-corners"),'new CSS query avoids stale cache');
assert.match(css,/--hhpg-corner-inset:6px/,'identical top and side gutter from a single CSS variable');
assert.ok(css.includes('max(0px, 50vw - 210px)'),'HH ONE sticks to the centered HealthHub app on desktops');
assert.ok(css.includes('left:calc(max(0px, 50vw - 210px) + var(--hhpg-corner-inset) + env(safe-area-inset-left))'),'HH ONE left gutter consistent');
assert.ok(css.includes('top:calc(var(--hhpg-corner-inset) + env(safe-area-inset-top))'),'HH ONE mobile top gutter consistent');
assert.ok(css.includes('right:calc(var(--hhpg-corner-inset) + env(safe-area-inset-right))'),'profile avatar right gutter matches pill left');
assert.ok(css.includes('#timeline #heroT .profileHit')&&css.includes('#health #heroH .profileHit'),'existing Timeline and Health profile portraits kept');
assert.ok(css.includes('right:68px!important'),'non-Home Hero tool buttons stay tappable beside avatar');
assert.ok(css.includes('background-blend-mode:darken'),'subtle pastel tone without modifying source portraits');
assert.match(css,/background-color:#ffe5f1!important/,'Mónika soft pink portrait background');
assert.match(css,/background-color:#e6f7ff!important/,'Zsolt soft blue portrait background');
assert.ok(!css.includes('background-image:url('),'portrait sources remain dynamic and untouched');

assert.ok(css.includes(':has(#home.on)'),'glass only on active Home');
assert.ok(css.includes('[data-hhpg-profile="m"]'),'Mónika pink profile only');
assert.ok(css.includes('.hhpg-info-short')&&css.includes('.hhpg-info-source'),'live source and display separated');
assert.ok(css.includes('min-height:76px'),'tiles are shorter');
assert.ok(css.includes('min-height:52px'),'info bar is shorter');
assert.ok(css.includes('.heroCopy .screenTitle'),'duplicate heading hidden');
assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage\.setItem/,'new UI must never create data pipeline');
class Fake {
 constructor(tag){this.tag=tag;this.id='';this.className='';this.parentNode=null;this.children=[];this.textContent='';this.attrs={};}
 appendChild(x){this.children.push(x);x.parentNode=this;return x}
 querySelector(q){if(q==='.hhpg-info-short')return this.children.find(c=>c.className.startsWith('hhpg-info-short'))||null;return null}
 setAttribute(k,v){this.attrs[k]=v}
 get classList(){return {add:(name)=>{this.className=[this.className,name].filter(Boolean).join(' ')}}}
}
function load(search,ready){
 const head=new Fake('head'),panel=new Fake('div');panel.id='hhpgInfoDashboard522';
 const sourceDate=new Fake('div');sourceDate.textContent='október 14., szerda · Budapest';
 const sourceName=new Fake('div');sourceName.textContent='🎉Névnap: Helén';
 const dateCell=new Fake('div'),nameCell=new Fake('div');
 dateCell.appendChild(sourceDate);nameCell.appendChild(sourceName);
 const dict={hhpgInfoDashboard522:panel,dateHome:sourceDate,namedayHome:sourceName};
 const observers=[];
 const document={
  readyState:'complete',head,documentElement:{dataset:{hhPremiumPreview:ready?'on':'off'}},
  getElementById(id){return id==='hhpgV525Styles'?head.children.find(c=>c.id===id)||null:dict[id]||null},
  createElement(tag){return new Fake(tag)}
 };
 const win={location:{search},MutationObserver:class{
  constructor(cb){this.cb=cb}
  observe(el,settings){observers.push({el,settings,cb:this.cb})}
 }};
 vm.runInNewContext(source,{window:win,document,URLSearchParams});
 return {head,win,dict,observers,dateCell,nameCell,sourceDate,sourceName};
}
const off=load('?hhpremium=0',true),notReady=load('',false),on=load('',true);
const explicitPremium=load('?hhpremium=1',true);
assert.equal(explicitPremium.head.children.length,1,'old Premium URL still works');
assert.equal(off.head.children.length,0,'explicit classic fallback unchanged');
assert.equal(notReady.head.children.length,0,'guard still prevents unmounted Premium compact UI');
assert.equal(on.head.children.length,1,'one style sheet injected');
assert.equal(on.dateCell.children.length,2,'date source plus compact view');
assert.equal(on.nameCell.children.length,2,'nameday source plus compact view');
assert.equal(on.dateCell.children[1].textContent,'Október 14 · Budapest');
assert.equal(on.nameCell.children[1].textContent,'Helén');
assert.equal(on.sourceDate.textContent,'október 14., szerda · Budapest','source date preserved');
assert.equal(on.sourceName.textContent,'🎉Névnap: Helén','source nameday preserved');
assert.equal(on.observers.length,2,'live source listeners');
on.sourceDate.textContent='november 2., hétfő · Budapest';
on.observers[0].cb();
assert.equal(on.dateCell.children[1].textContent,'November 2 · Budapest','date updates without new fetch');
on.sourceName.textContent='🎉Névnap: Ilka, Alfonz';
on.observers[1].cb();
assert.equal(on.nameCell.children[1].textContent,'Ilka, Alfonz','multiple names preserved');
assert.equal(on.win.HH_PREMIUM_HOME_COMPACT_V525.compactNameday('🎉Névnap: —'),'—');
console.log('HealthHub v525 compact Premium Home regression OK');
