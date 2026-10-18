'use strict';
/* Synthetic data ONLY. Never keep real patients' filenames or medications here. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'health-scroll-select-v592.js'),'utf8');
const css=fs.readFileSync(path.join(root,'health-scroll-select-v592.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function harness(search){
 const listeners={};const cssLinks=[];const scripts=[];
 const document={
  documentElement:{dataset:{}},
  createElement(tag){return {tagName:tag,rel:'',href:'',className:'',dataset:{},addEventListener(){}};},
  head:{appendChild(el){cssLinks.push(el)}},
  getElementById(){return null}
 };
 let renderCount=0;
 const window={
  location:{search},localStorage:{getItem(){return 'z'}},
  renderHealthSection:async()=>{renderCount++;return 'original'},
  addEventListener(k,fn){listeners[k]=fn}
 };
 vm.runInNewContext(source,{window,document,URLSearchParams,console}, {filename:'health-scroll-select-v592.js'});
 return {window,document,cssLinks,listeners,renderCount:()=>renderCount};
}
const off=harness('?hhscrollselect=0');
assert.equal(off.window.HH_HEALTH_SCROLL_SELECT_V592,undefined,'explicit off leaves original UI untouched');
assert.equal(off.cssLinks.length,0,'no scroll CSS with explicit opt-out');
assert.equal(off.document.documentElement.dataset.hhScrollSelect,undefined);
const classic=harness('?hhpremium=0');
assert.equal(classic.cssLinks.length,0,'classic theme respects explicit fallback');
const preview=harness('');
const api=preview.window.HH_HEALTH_SCROLL_SELECT_V592;
assert.ok(api&&api.version==='592-preview','default link enables the approved carousel');
assert.equal(preview.document.documentElement.dataset.hhScrollSelect,'preview');
assert.equal(preview.cssLinks.length,1,'one stylesheet on the normal homepage');
assert.match(preview.cssLinks[0].href,/health-scroll-select-v592\.css\?v=592-preview-omsz-meds/);
const oldPhoneLink=harness('?hhv=591-health-measurements-hero');
assert.ok(oldPhoneLink.window.HH_HEALTH_SCROLL_SELECT_V592,'previous S24 Ultra URL now shows the new carousel');
assert.equal(oldPhoneLink.cssLinks.length,1,'old bookmark gets the exact same CSS');
const explicitOn=harness('?hhscrollselect=1');
assert.ok(explicitOn.window.HH_HEALTH_SCROLL_SELECT_V592,'old preview shortcut remains compatible');
const combined=harness('?hhscrollselect=0&hhpremium=0');
assert.equal(combined.cssLinks.length,0,'explicit emergency fallback works');
function doc(title,meta=''){return {title,meta}}
assert.ok(api.matchDoc(doc('OMSZ_2024_mentoesetlap.pdf'),'omsz'));
assert.ok(api.matchDoc(doc('Országos Mentőszolgálat esetlap','Mentőadatlap'),'omsz'));
assert.ok(api.matchDoc(doc('Mento_2024.pdf'),'omsz'));
assert.ok(!api.matchDoc(doc('Kórházi sürgősségi ambuláns lap','Sürgősségi ellátás / mentés'),'omsz'),'hospital emergency does not automatically become OMSZ');
assert.ok(api.matchDoc(doc('Vizsgálat','Sürgősségi ellátás / mentés'),'urgent'),'existing emergency category remains discoverable');
assert.ok(api.matchDoc(doc('Echo kontroll','Kardiológia'),'cardio'));
assert.ok(api.matchDoc(doc('Labor vérvételi eredmény','Labor'),'labor'));
assert.ok(api.matchDoc(doc('Epikrízis 2024','Zárójelentés'),'hospital'));
assert.ok(api.matchDoc(doc('Egyéb dokumentum','Általános'),'other'));
assert.ok(api.matchDoc(doc('Bármi'),'all'));
function med(status,detail){return {status,detail}}
assert.ok(api.matchMed(med('aktuális','10 mg naponta'),'current'));
assert.ok(api.matchMed(med('korábbi','elhagyva'),'past'));
assert.ok(api.matchMed(med('aktuális','szezonálisan'),'seasonal'));
assert.ok(!api.matchMed(med('aktuális','naponta'),'past'));
assert.ok(!api.matchMed(med('korábbi','régi'),'current'));
assert.ok(api.matchMed(med('aktuális',''), 'all'));
assert.ok(css.includes('scroll-snap-type:x mandatory'),'the horizontal document card selector is native scroll snap');
assert.ok(css.includes('data-hh-system-profile="m"'),'Mónika gets a distinct profile accent');
assert.ok(css.includes('hhRsmCard[hidden]'),'filtered cards are truly hidden');
assert.ok(html.includes('health-scroll-select-v592.js?v=594-default-buddy-live'),'preview module loaded from HH boot');
assert.ok(source.includes("root.hhShowAllDocs()"),'non-initial OMSZ hits are not limited by legacy latest-ten page');
assert.ok(source.includes("root.hhOpenLenaExplanation(id)"),'original Léna explanation action preserved');
assert.ok(source.includes("root.openHrDocument(id)"),'existing original document PDF viewer preserved');
assert.ok(!/indexedDB|deleteDatabase|fetch\(|XMLHttpRequest|localStorage\.setItem/.test(source),'preview must not mutate or read stored medical records directly');
console.log('Health scroll-select v592 opt-in + OMSZ + medicines + privacy source contract PASS');
