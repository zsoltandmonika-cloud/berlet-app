'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=require('../../sh9/shopping/product-match-core-v21.js');
const stores=require('../../sh9/shopping/three-store-links-v2.js');
const code=read('sh9/shopping/basket-candidates-v21.js');
const matrix=read('sh9/shopping/basket-matrix-v1.js');
const html=read('sh9/shopping/basket-matrix-v1.html');
const css=read('sh9/shopping/basket-candidates-v21.css');
const payload=[
 {code:'1234567890123',name:'Laktózmentes UHT tej 1,5%',brand:'Próbamárka',quantity:'1 l',image:'https://images.openfoodfacts.org/images/products/123/456/789/0123/front.jpg'},
 {code:'1234567890124',name:'Laktózmentes UHT tej 1,5%',brand:'Más márka',quantity:'500 ml',image:'https://images.openfoodfacts.org/images/products/123/456/789/0124/front.jpg'},
 {code:'1234567890125',name:'Laktózmentes UHT tej 2,8%',brand:'Más márka',quantity:'1 l',image:'https://images.openfoodfacts.org/images/products/123/456/789/0125/front.jpg'},
 {code:'1234567890126',name:'Laktózmentes UHT tej 1,5%',brand:'Ismeretlen',quantity:'1 l',image:'https://images.openfoodfacts.org.evil.invalid/photo.jpg'},
 {code:'1234567890127',name:'Kávé',brand:'Más',quantity:'250 g',image:''}
];
const lookup={name:'Laktózmentes UHT tej 1,5% 1 l',id:'item-1'};
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.events={};this.attrs={};this.dataset={};this.textContent='';this.className='';this.hidden=true;this.disabled=false;this.src='';this.href=''}
 replaceChildren(...xs){this.children=xs}
 append(...xs){this.children.push(...xs)}
 addEventListener(kind,fn){this.events[kind]=fn}
 setAttribute(k,v){this.attrs[k]=v}
}
function setup({network=true,key=true,data=payload}={}){
 const requests=[],storage=new Map();
 const win={
  SHOP_PRODUCT_MATCH_CORE_V21:core,SHOP_THREE_STORE_LINKS_V2:stores,
  HH_CENTRAL_VAULT:{publishableKey:key?'publishable-test-key':''},
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  setTimeout,clearTimeout,
  fetch:async(url,opts)=>{
   requests.push({url,opts});
   if(!network)throw Error('Offline');
   return {ok:true,json:async()=>({ok:true,products:data,prices:false})};
  }
 };
 const doc={createElement:t=>new Node(t)};
 vm.runInNewContext(code,{window:win,document:doc,URL,Date,AbortController,Intl,console});
 const ui=()=>({button:new Node('button'),status:new Node('p'),cards:new Node('div')});
 return {win,requests,ui,storage};
}
test('Basket Matrix wires on-demand product control and preserves direct native shopping actions',()=>{
 assert.match(matrix,/basket-candidate-zone/);
 assert.match(matrix,/basket-candidate-show/);
 assert.match(matrix,/SHO[B]?_BASKET_CANDIDATES_V21|SHOP_BASKET_CANDIDATES_V21/);
 assert.match(html,/product-match-core-v21.js\?v=1/);
 assert.match(html,/basket-candidates-v21.js\?v=1/);
 assert.match(html,/basket-candidates-v21.css\?v=1/);
 assert.match(html,/kosár/i);
 assert.match(css,/\.bc-product\{/);
 assert.match(css,/object-fit:contain/);
 assert.doesNotMatch(code,/shopCart\.add|checkout\(|\.upsert\(|manualPrice|parsePrice/);
});
test('real catalog images + barcodes + two shop searches; wrong pack/fat metadata excluded',async()=>{
 const b=setup(),ui=b.ui();
 assert.equal(b.requests.length,0,'no auto-fetch on page load');
 await b.win.SHOP_BASKET_CANDIDATES_V21.show(lookup,ui);
 assert.equal(b.requests.length,1);
 assert.match(b.requests[0].url,/functions\/v1\/sho-shopping-products-v1\?q=laktozmentes/);
 assert.equal(b.requests[0].opts.headers.apikey,'publishable-test-key');
 assert.equal(b.requests[0].opts.credentials,'omit');
 assert.equal(b.requests[0].opts.cache,'no-store');
 assert.equal(b.requests[0].opts.method,'GET');
 assert.equal(ui.button.disabled,false);
 assert.equal(ui.status.hidden,false);
 assert.ok(ui.cards.children.length>=1);
 assert.ok(ui.cards.children.length<=4);
 const names=ui.cards.children.map(c=>c.children[1].children[0].textContent);
 assert.ok(!names.some(x=>x.includes('2,8%')),'wrong fat level must be excluded');
 assert.ok(!ui.cards.children.some(c=>c.children[1].children.some(x=>x.textContent?.includes('500 ml'))),'wrong 500ml pack hidden');
 const first=ui.cards.children[0];
 assert.equal(first.dataset.match,'likely');
 const photo=first.children[0].children[0];
 assert.ok(photo.src.startsWith('https://images.openfoodfacts.org/'));
 const actions=first.children[1].children.find(x=>x.className==='bc-actions');
 const [tesco,auchan,off]=actions.children;
 assert.equal(tesco.href,stores.destination('tesco','Laktózmentes UHT tej 1,5% Próbamárka 1 l'));
 assert.equal(auchan.href,stores.destination('auchan','Laktózmentes UHT tej 1,5%'));
 assert.match(off.href,/https:\/\/world\.openfoodfacts\.org\/product\/1234567890123/);
 assert.match(ui.status.textContent,/nincs ellenőrzött bolti ár/);
 const unsafe=ui.cards.children.find(x=>x.children[1].children.find(y=>y.className==='bc-meta')?.textContent.includes('Ismeretlen'));
 assert.ok(unsafe,'test candidate with unsafe image is still a valid product');
 assert.ok(!unsafe.children[0].children.some(x=>String(x.src||'').includes('evil.invalid')),'malicious external image must not load');
});
test('shared session cache prevents repeated backend call; data source remains explicit',async()=>{
 const b=setup();
 await b.win.SHOP_BASKET_CANDIDATES_V21.show(lookup,b.ui());
 assert.equal(b.requests.length,1);
 const second=b.ui();
 await b.win.SHOP_BASKET_CANDIDATES_V21.show(lookup,second);
 assert.equal(b.requests.length,1);
 assert.ok(second.cards.children.length>0);
 assert.match(second.status.textContent,/Open Food Facts/);
});
test('budget caps new queries at 2 per minute; no mass background fetch',async()=>{
 const b=setup();
 await b.win.SHOP_BASKET_CANDIDATES_V21.show(lookup,b.ui());
 await b.win.SHOP_BASKET_CANDIDATES_V21.show({name:'arabica szemes kávé 1 kg'},b.ui());
 const third=b.ui();
 await b.win.SHOP_BASKET_CANDIDATES_V21.show({name:'jázmin rizs 1 kg'},third);
 assert.equal(b.requests.length,2);
 assert.match(third.status.textContent,/korlátozott/);
 assert.equal(third.button.disabled,false);
});
test('offline or missing key gracefully leaves store links and never invents products',async()=>{
 const a=setup({network:false}),ui=a.ui();
 await a.win.SHOP_BASKET_CANDIDATES_V21.show(lookup,ui);
 assert.equal(ui.button.disabled,false);
 assert.equal(ui.cards.children.length,0);
 assert.match(ui.status.textContent,/Nem jelenítünk meg becsült terméket/);
 const b=setup({key:false}),other=b.ui();
 await b.win.SHOP_BASKET_CANDIDATES_V21.show(lookup,other);
 assert.equal(b.requests.length,0);
 assert.match(other.status.textContent,/bolti keresőlinkek használhatók/);
});
test('garbage results from OFF are not presented as verified retailer offers',async()=>{
 const b=setup({data:[{code:'1234567890124',name:'Laktózmentes UHT tej 2,8%',quantity:'500 ml',image:''}]}),ui=b.ui();
 await b.win.SHOP_BASKET_CANDIDATES_V21.show(lookup,ui);
 assert.equal(ui.cards.children.length,0);
 assert.match(ui.status.textContent,/Nincs megfelelő vonalkódos termékjelölt/);
});
