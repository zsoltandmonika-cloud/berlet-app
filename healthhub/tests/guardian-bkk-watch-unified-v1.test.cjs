'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const guardian=path.resolve(__dirname,'../guardian');
const script=fs.readFileSync(path.join(guardian,'guardian-bkk-watchlist-v814.js'),'utf8');
const html=fs.readFileSync(path.join(guardian,'index.html'),'utf8');
const style=fs.readFileSync(path.join(guardian,'guardian-bkk-watch-unified-v1.css'),'utf8');
function fixture(){
 const all={},listeners={},operations=[];
 function element(id=''){
  return {id,dataset:{},children:[],attrs:{},value:'zsolt',hidden:false,open:false,disabled:false,
   textContent:'',classList:{add(){}},
   setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},
   addEventListener(k,fn){(this.events??={})[k]=fn},getAttribute(k){return this.attrs[k]},
   append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},
   before(){},scrollIntoView(){},focus(){},click(){return this.events?.click?.()}};
 }
 for(const id of ['hhTransitPanel','hhBkkWatchlistV814','hhBkkWatchRowsV814',
  'hhBkkWatchCountV814','hhBkkWatchEditV814','hhBkkCatalogV801',
  'hhBkkWatchToggleV858','hhBkkWatchContentV858','hhTransitProfileV791',
  'hhSmartHubFavoritesV806','hhTransitShow260'])all[id]=element(id);
 all.hhBkkCatalogV801.nextElementSibling=all.hhSmartHubFavoritesV806;
 const doc={readyState:'complete',getElementById:id=>all[id]||null,createElement:element,addEventListener(){}};
 let shown=false,live=true;
 const root={localStorage:{getItem(){return null}},addEventListener(t,fn){(listeners[t]??=[]).push(fn)},
  dispatchEvent(e){for(const f of listeners[e.type]||[])f(e)},
  setTimeout(){return 1},clearTimeout(){},
  HH_BKK_CATALOG_V801:{favoriteIds:['bus:260'],setProfile(){},routeByKey(){return {mode:'bus',id:'260',directions:['Óbuda','Harsánylejtő']}}},
  HH_BKK_LIVE_PER_LINE_V909:{enabled(){return live},setEnabled(_key,value){live=!!value;operations.push('live:'+value);root.dispatchEvent({type:'hh-bkk-live-per-line-v909-changed'})}},
  HH_GUARDIAN_TRANSIT_V790:{hasMapRoute(){return true},isLineVisible(){return shown},
   setLineVisible(_id,value){shown=!!value;operations.push('route:'+value);root.dispatchEvent({type:'hh-bkk-line-visibility-v855'});return true},
   showLine(){shown=true;operations.push('route:true');root.dispatchEvent({type:'hh-bkk-line-visibility-v855'});return true}}
 };
 vm.runInNewContext(script,{window:root,document:doc,Date,Set});
 const button=()=>all.hhBkkWatchRowsV814.children[0].children[2].children[0];
 const actions=()=>all.hhBkkWatchRowsV814.children[0].children[2].children;
 return {button,actions,root,operations,state:()=>({shown,live})};
}
test('one Watchlist control replaces independent LIVE/route buttons without losing route actions',async()=>{
 const f=fixture();
 assert.equal(f.actions().length,4,'one display control plus up/down/remove');
 assert.equal(f.button().textContent,'Elrejt','existing live-on state is not mislabeled Mutasd');
 assert.equal(f.button().attrs['aria-pressed'],'true');
 await f.button().click();
 assert.equal(f.button().textContent,'Mutasd');
 assert.deepEqual(f.state(),{shown:false,live:false});
 await f.button().click();
 assert.equal(f.button().textContent,'Elrejt');
 assert.deepEqual(f.state(),{shown:true,live:true});
 assert.deepEqual(f.operations,['live:false','route:true','live:true']);
});
test('ÉLŐ badge uses verified fresh BKK vehicle event, never inferred from button state',()=>{
 const f=fixture(),publish=(when,vehicles)=>f.root.dispatchEvent({type:'hh-bkk-live-verified-v815',detail:{generatedAt:when,vehicles}});
 assert.equal(f.button().children.length,0,'live preference alone is not proof');
 publish(new Date().toISOString(),[{routeKey:'bus:260',routeId:'260'}]);
 assert.equal(f.button().children[0]?.textContent,'ÉLŐ');
 publish(new Date().toISOString(),[{routeKey:'tram:17',routeId:'17'}]);
 assert.equal(f.button().children.length,0,'another line cannot create a false live badge');
 publish(new Date(Date.now()-91000).toISOString(),[{routeKey:'bus:260',routeId:'260'}]);
 assert.equal(f.button().children.length,0,'stale live positions do not show status');
});
test('standalone premium CSS and single button loaded after Golden hero, without any new network or GPS',()=>{
 assert.match(html,/guardian-bkk-watch-unified-v1\.css/);
 assert.ok(html.indexOf('guardian-bkk-watch-unified-v1.css')>html.indexOf('guardian-bkk-golden-reference-v4.css'));
 assert.match(style,/hh-bkk-watch-unified-v1/);
 assert.match(script,/hh-bkk-live-verified-v815/);
 assert.doesNotMatch(script,/navigator\.geolocation|fetch\(|sendBeacon\(/);
});
