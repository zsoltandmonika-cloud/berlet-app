'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const css=fs.readFileSync(path.join(__dirname,'../guardian/guardian-satellite-v1033.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../guardian/index.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../guardian/guardian-satellite-v1033.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function mount(mobile){
 const els=new Map(),mapLayers=new Map([['guardian-buildings-3d',{}],['guardian-route-line',{}]]);
 const mapSources=new Map(),card={dataset:{}};
 function get(id){
  if(!els.has(id)){
   const el={id,open:false,hidden:false,disabled:false,checked:true,value:'',attrs:{},dataset:{},
    addEventListener(event,handler){this['on'+event]=handler},
    setAttribute(k,v){this.attrs[k]=v},
    getAttribute(k){return this.attrs[k]||null},
    removeAttribute(k){delete this.attrs[k]},
    closest(){return card},
    showModal(){this.open=true},
    close(){this.open=false},
    click(){this.onclick?.({preventDefault(){}})}
   };
   if(id==='guardianSatelliteLogoImgV1033')el.dataset.src='https://api.maptiler.com/resources/logo.svg';
   els.set(id,el);
  }
  return els.get(id);
 }
 const map={
  getLayer(k){return mapLayers.get(k)||null},
  getSource(k){return mapSources.get(k)||null},
  getStyle(){return {layers:[{id:'guardian-buildings-3d',type:'fill-extrusion'}]}},
  addSource(k,v){mapSources.set(k,v)},
  addLayer(layer){mapLayers.set(layer.id,layer)},
  setLayoutProperty(){}
 };
 const storage={
  getItem(k){return k==='hh-maptiler-browser-key-device-v1035'?'ValidDemoKey12345':null},
  setItem(){},removeItem(){}
 };
 const w={localStorage:storage,sessionStorage:storage,HH_GUARDIAN_V761:{map},
  matchMedia(){return {matches:mobile}},
  addEventListener(){},
  fetch:async()=>({ok:true,json:async()=>({tiles:['https://example.invalid/test']})})
 };
 const d={hidden:false,getElementById:get,addEventListener(){}};
 vm.runInNewContext(js,{window:w,document:d,Date,Math,Number,String,Error,Promise,encodeURIComponent});
 return {get,card};
}

test('the real MapTiler logo remains visible in the 23px mobile badge, not replaced by an info glyph',()=>{
 const mobile=css.slice(css.indexOf('/* v1052 · mobile MapTiler logo'),css.indexOf('#guardianMaptilerAttributionV1052 {'));
 assert.match(mobile,/width:23px!important;min-width:23px!important/);
 assert.match(mobile,/height:23px!important;min-height:23px!important/);
 assert.match(mobile,/img \{\s*display:block!important;width:20px!important/);
 assert.match(mobile,/opacity:1!important;filter:none!important/);
 assert.doesNotMatch(mobile,/img \{display:none|::before \{\s*content:"ⓘ"/);
 assert.match(mobile,/inset:-11px/,'touch hit area larger than visual logo');
 assert.match(css,/#guardianSatelliteLogoV1033\[hidden\]\{display:none!important\}/);
});

test('one tap opens full-size provider logo and both source links, while the map stays unobscured otherwise',()=>{
 const dialog=html.slice(html.indexOf('<dialog id="guardianMaptilerAttributionV1052"'),html.indexOf('<script defer src="./guardian-satellite-v1033.js?v=1052'));
 assert.match(dialog,/aria-labelledby="guardianMaptilerAttributionTitleV1052"/);
 assert.match(dialog,/href="https:\/\/www\.maptiler\.com\/"/);
 assert.match(dialog,/src="https:\/\/api\.maptiler\.com\/resources\/logo\.svg"/);
 assert.match(dialog,/width="85" height="24"/);
 assert.match(dialog,/href="https:\/\/www\.maptiler\.com\/copyright\/"/);
 assert.match(dialog,/href="https:\/\/www\.openstreetmap\.org\/copyright"/);
 assert.match(dialog,/id="guardianMaptilerAttributionCloseV1052"/);
 assert.match(css,/#guardianMaptilerAttributionV1052 \.hh-maptiler-logo-v1052 img/);
});

test('mobile trigger opens and closes dialog; desktop logo remains normal outbound link',async()=>{
 const a=mount(true);await flush();
 const logo=a.get('guardianSatelliteLogoV1033');
 const dialog=a.get('guardianMaptilerAttributionV1052');
 assert.equal(a.card.dataset.hhSatellite,'on','automatic satellite startup preserved');
 assert.equal(logo.getAttribute('aria-haspopup'),'dialog');
 let prevented=0;
 logo.onclick({preventDefault(){prevented++}});
 assert.equal(prevented,1);
 assert.equal(dialog.open,true);
 a.get('guardianMaptilerAttributionCloseV1052').click();
 assert.equal(dialog.open,false);
 const b=mount(false);await flush();
 const desktopLogo=b.get('guardianSatelliteLogoV1033');
 let desktopPrevented=0;
 desktopLogo.onclick({preventDefault(){desktopPrevented++}});
 assert.equal(desktopPrevented,0,'desktop keeps its original direct link');
 assert.equal(b.get('guardianMaptilerAttributionV1052').open,false);
});

test('no extra location upload, map reinitialization or API traffic caused by clicking attribution',()=>{
 assert.match(js,/attribution\.showModal\(\)/);
 assert.match(js,/event\.preventDefault\(\)/);
 assert.doesNotMatch(js,/navigator\.geolocation|watchPosition|setInterval\(/);
 assert.match(html,/guardian-satellite-v1033\.css\?v=1052-compact-maptiler-mobile/);
 assert.match(html,/guardian-satellite-v1033\.js\?v=1052-compact-attribution-mobile/);
});
