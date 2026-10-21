'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const html=read('index.html'),script=read('hh-lena-ai-scan-page-v753.js'),css=read('hh-lena-ai-scan-page-v753.css'),journal=read('nutrition-preview-v592.js');
new vm.Script(script);
assert.match(html,/id="hhLenaScanPage753"/);
assert.match(html,/hh-lena-ai-scan-page-v753\.js\?v=753-camera-off-v3/);
assert.match(html,/hh-lena-ai-scan-page-v753\.css\?v=753-hero-scan-barcode/);
assert.match(html,/id="hhScanVideo753"/);
assert.match(html,/id="hhScanTabBarcode753"/);
assert.match(html,/id="hhScanResultShell753"/);
assert.match(css,/aspect-ratio:1\/1/);
assert.match(css,/healthhub-nutrition-lena-buddy-approved\.webp/);
assert.match(css,/\[data-profile="monika"\]/);
assert.match(css,/hhScanSweep753/);
assert.match(script,/w\.history\.pushState/);
assert.match(script,/stopImmediatePropagation/);
assert.match(script,/getUserMedia/);
assert.match(script,/new File\(\[blob\],'lena-scan-square\.jpg'/);
assert.match(script,/decodeFromImageUrl/);
assert.match(script,/api\/v3\/product\//);
assert.match(script,/fetch\(url,\{signal:ctrl\.signal/);
assert.match(script,/voice|playSound\('shutter'\)/);
assert.match(script,/api\(\)\.recordAiMeal/);
assert.match(journal,/sourceType:payload\.barcode\?'barcode':'photo'/);
assert.match(journal,/createdAt:prev\?\.createdAt\|\|now/);
assert.doesNotMatch(script,/localStorage\.setItem|indexedDB\.open|Dropbox-API-Arg/);
// Module can be read without launching a camera or uploading photos.
const stand={};
vm.runInNewContext(script,{window:stand,document:{readyState:'loading',addEventListener(){}},Number,Date,Math,JSON,String,Array,Set,Promise});
const a=stand.HH_LENA_AI_SCAN_V753;
assert.equal(a.version,'753');
assert.equal(a.gtin('5998200751875'),'5998200751875');
assert.equal(a.gtin('5998200478697'),'5998200478697');
assert.equal(a.gtin('5998200751876'),null);
assert.equal(a.gtin('not-barcode'),null);
assert.equal(a.gtin('123'),null);
const result=a.product({status:'success',product:{product_name_hu:'Túró Rudi Protein',quantity:'51 g',
 nutriments:{'energy-kcal_100g':275,'proteins_100g':18.2,'carbohydrates_100g':25.5,'fat_100g':14.3}}},'5998200751875');
assert.equal(result.name,'Túró Rudi Protein');
assert.equal(result.items[0].grams,51);
assert.equal(result.items[0].per.kcal,275);
assert.equal(result.model,'Open Food Facts v3');
assert.equal(result.code,'5998200751875');
const missing=a.product({product:{product_name:'Ismeretlen tápértékű termék',quantity:'100 g',nutriments:{}}},'5998200751875');
assert.equal(missing.items[0].per.kcal,null);
assert.equal(missing.items[0].per.protein,null);
assert.throws(()=>a.product({status:'failure'},'5998200751875'),/termék/);
assert.equal(a.nutrients({'energy-kj_100g':418.4}).kcal,100);
// Actual page open smoke. DOM stays in-process; no external account, camera, or nutrition record.
const ids=[...html.matchAll(/id="(hhScan[^"]+|hhLenaScanPage753|hhBevitelAI|profileBtn)"/g)].map(x=>x[1]);
const registry=new Map();
class Element{
 constructor(id){this.id=id;this.dataset={};this.handlers={};this.hidden=true;this.classList={toggle(){},add(){},remove(){}};this.value='';this.textContent='';}
 addEventListener(n,fn,capture){(this.handlers[n]??=[]).push({fn,capture})}
 setAttribute(n,v){this[n]=v}
 removeAttribute(n){delete this[n]}
 pause(){} play(){return Promise.resolve()}
}
for(const id of ids)registry.set(id,new Element(id));
const page=registry.get('hhLenaScanPage753'),tile=registry.get('hhBevitelAI'),events={};
const w={location:{hash:'',pathname:'/berlet-app/healthhub/nutrition/',search:''},
 history:{pushState(s,n,url){w.location.hash=url},replaceState(){w.location.hash=''},back(){w.location.hash=''}},
 addEventListener(n,fn){events[n]=fn},navigator:{},HH_NUTRITION_QUICK_API:{getProfile:()=> 'zsolt',recordAiMeal:()=>({})},
 HH_FOOD_VISION_V750:{availableModels:async()=>[],parse:x=>x,totals:()=>({})}};
const document={readyState:'complete',getElementById:id=>registry.get(id)||null,body:{classList:{toggle(){},add(){},remove(){}}}};
vm.runInNewContext(script,{window:w,document,Date,Math,Number,JSON,String,Array,Set,Promise});
assert.equal(typeof tile.handlers.click[0].fn,'function');
const e={prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
tile.handlers.click[0].fn(e);
assert.equal(w.location.hash,'#lena-ai-scan');
assert.equal(page.hidden,false);
assert.equal(page.dataset.profile,'zsolt');
assert.equal(e.prevented,true);
assert.equal(e.stopped,true);
assert.equal(typeof w.HH_FOOD_VISION_V750.open,'function');
console.log('PASS v753: full-page route, square scan, barcode validation, OFF v3 data, safe unknown nutrition, profile and camera click smoke.');
