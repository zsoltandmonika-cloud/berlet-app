'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=require('../../sh9/shopping/product-match-core-v21.js');
const store=require('../../sh9/shopping/three-store-links-v2.js');
const app=read('sh9/shopping/product-match-v21.js');
const html=read('sh9/shopping/three-store-bridge-v2.html');
const css=read('sh9/shopping/product-match-v21.css');

const PRODUCT=[
 {code:'1234567890123',name:'Laktózmentes UHT tej 1,5%',brand:'Próbamárka',quantity:'1 l',image:'https://images.openfoodfacts.org/images/products/123/456/789/0123/front.jpg'},
 {code:'1234567890124',name:'Laktózmentes UHT tej 1,5%',brand:'Másik tej',quantity:'500 ml',image:'https://images.openfoodfacts.org/images/products/123/456/789/0124/front.jpg'},
 {code:'1234567890125',name:'Laktózmentes UHT tej 2,8%',brand:'Márka',quantity:'1 l',image:'https://images.openfoodfacts.org/images/products/123/456/789/0125/front.jpg'},
 {code:'1234567890126',name:'Másik termék',quantity:'1 l',image:'https://attacker.example/bad.jpg'},
 {code:'1234567890127',name:'Laktózmentes UHT tej 1,5%',quantity:'1 l',image:'https://images.openfoodfacts.org.evil.com/fake.jpg'}
];

test('unit conversion, fat percentage, Hungarian accented product names and product candidate ranking',()=>{
 assert.deepEqual(core.volume('1 l'),{amount:1000,unit:'ml'});
 assert.deepEqual(core.volume('500 ml'),{amount:500,unit:'ml'});
 assert.deepEqual(core.volume('1 kg'),{amount:1000,unit:'g'});
 assert.deepEqual(core.volume('1 000 g'),{amount:1000,unit:'g'}); // string 1 000 g should be recognized as 1000g
 assert.equal(core.percent('tej 1,5%'),1.5);
 assert.equal(core.percent('tej 2,8%'),2.8);
 const rows=core.rankProducts('laktózmentes UHT tej 1,5% 1 l',PRODUCT);
 assert.equal(rows[0].code,'1234567890123');
 assert.equal(rows[0].match.status,'likely');
 assert.equal(rows.find(p=>p.code==='1234567890124').match.status,'mismatch');
 assert.equal(rows.find(p=>p.code==='1234567890125').match.status,'mismatch');
 assert.equal(rows[0].match.quantityMatches,true);
 assert.equal(rows.find(p=>p.code==='1234567890124').match.quantityMismatch,true);
 assert.equal(rows.find(p=>p.code==='1234567890125').match.percentMismatch,true);
});
test('coffee 100% Arabica 1kg is distinct from 250g blend; uncertain metadata stays review, never exact',()=>{
 const q='100% arabica szemes kávé 1 kg';
 const p={name:'100% arabica szemes kávé',brand:'Teszt kávé',quantity:'1 kg'};
 const a=core.examine(q,p);
 assert.equal(a.status,'likely');
 const mismatch=core.examine(q,{...p,quantity:'250 g'});
 assert.equal(mismatch.status,'mismatch');
 const missing=core.examine(q,{...p,quantity:''});
 assert.notEqual(missing.status,'likely');
 assert.equal(core.searchTerms(q),'arabica szemes kave');
 assert.equal(core.searchTerms('laktózmentes UHT tej 1,5% 1 l'),'laktozmentes uht tej');
});
test('catalog barcode is the only OFF permalink identity; external images are strictly blocked',()=>{
 const x=core.rankProducts('laktózmentes tej',PRODUCT.concat(PRODUCT));
 assert.equal(x.length,PRODUCT.length);
 assert.ok(x.find(p=>p.code==='1234567890123').image.startsWith('https://images.openfoodfacts.org'));
 assert.equal(x.find(p=>p.code==='1234567890126').image,'');
 assert.equal(x.find(p=>p.code==='1234567890127').image,'');
 assert.equal(x[0].offUrl,'https://world.openfoodfacts.org/product/'+x[0].code);
 assert.equal(core.validProduct({code:'notbarcode',name:'fake'}),null);
});
test('page mounts premium product photography and source labels without changing original 3-store/Smart List',()=>{
 assert.match(html,/id="productMatchPanel"/);
 assert.match(html,/id="productMatchCards"/);
 assert.match(html,/id="matchSort"/);
 assert.match(html,/id="familyItems"/);
 assert.match(html,/id="storeResults"/);
 assert.match(html,/product-match-v21.css\?v=2-results/);
 assert.match(html,/product-match-core-v21.js\?v=1/);
 assert.match(html,/product-match-v21.js\?v=2-results/);
 assert.match(html,/Open Food Facts \(ODbL, termékképek CC BY-SA\)/);
 assert.match(css,/\.product-match \.pm-media img/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/\.product-match \.pm-no-price/);
 assert.match(html,/Bolti ár szerint · nincs hiteles adat/);
});
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.events={};this.attrs={};this.textContent='';this.value='';this.className='';this.href='';this.style={};}
 replaceChildren(...items){this.children=items}
 append(...items){this.children.push(...items)}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.events[k]=fn}
}
const sleep=()=>new Promise(resolve=>setTimeout(resolve,5));
function browser({term='Laktózmentes UHT tej 1,5% 1 l',payload=PRODUCT,network=true}={}){
 const ids=Object.fromEntries(['productMatchCards','matchStatus','matchCount','searchForm','familyItems','matchSort'].map(x=>[x,new Node()]));
 let value=term,requests=[],calls=0;
 const storage=new Map();
 const win={
  SHOP_PRODUCT_MATCH_CORE_V21:core,
  SHOP_THREE_STORE_LINKS_V2:store,
  SHOP_THREE_STORE_BRIDGE_V2:{getCurrent:()=>({term:value})},
  HH_CENTRAL_VAULT:{publishableKey:'test-public-key'},
  sessionStorage:{
   getItem:k=>storage.get(k)||null,
   setItem:(k,v)=>storage.set(k,v)
  },
  setTimeout,clearTimeout,
  fetch:async(url,opts)=>{
   calls++;requests.push({url,opts});
   if(!network)throw Error('Offline');
   return {ok:true,json:async()=>({ok:true,source:'Open Food Facts',prices:false,products:payload})};
  }
 };
 const doc={getElementById:id=>ids[id]||null,createElement:tag=>new Node(tag)};
 vm.runInNewContext(app,{window:win,document:doc,AbortController,URL,Date,Intl,console});
 return {ids,win,requests,get calls(){return calls},setTerm:x=>{value=x},storage};
}
test('real product card DOM: original OFF photo, honest no-price label and distinct official merchant links',async()=>{
 const b=browser();await sleep();
 assert.equal(b.requests.length,1);
 assert.match(b.requests[0].url,/functions\/v1\/sho-shopping-products-v1\?q=laktozmentes/);
 assert.equal(b.requests[0].opts.headers.apikey,'test-public-key');
 assert.equal(b.requests[0].opts.credentials,'omit');
 assert.equal(b.ids.productMatchCards.children.length,5);
 const c=b.ids.productMatchCards.children[0];
 assert.equal(c.dataset.match,'likely');
 const media=c.children[0],img=media.children[0];
 assert.ok(img.src.startsWith('https://images.openfoodfacts.org/'));
 const action=c.children[1].children.find(x=>x.className==='pm-actions');
 const [tesco,auchan,spar,off]=action.children;
 assert.equal(tesco.href,store.destination('tesco','Laktózmentes UHT tej 1,5% Próbamárka 1 l'));
 assert.equal(auchan.href,store.destination('auchan','Laktózmentes UHT tej 1,5%'));
 assert.ok(!decodeURIComponent(decodeURIComponent(auchan.href)).includes('Próbamárka'));
 assert.ok(spar.href.startsWith('https://www.google.com/search?q='));
 assert.ok(decodeURIComponent(spar.href).includes('site:wolt.com/hu/hun/budapest/venue/spar'));
 assert.match(off.href,/world\.openfoodfacts\.org\/product\/1234567890123/);
 assert.ok(c.children[1].children.some(x=>x.className==='pm-no-price'&&x.children[1].textContent==='Nincs ellenőrzött bolti ár'));
 assert.equal(b.win.SHOP_PRODUCT_MATCH_V21.getState().merchantPrices,false);
});
test('offline catalog never presents fake fallback data; store search remains separate',async()=>{
 const b=browser({network:false});await sleep();
 assert.equal(b.ids.productMatchCards.children.length,1);
 assert.match(b.ids.matchStatus.textContent,/A hivatalos bolti keresés működik/);
 assert.ok(!b.ids.matchStatus.textContent.includes('bolti ár 499'));
});
test('separate OFF cache prevents another paid/quota call when same product is searched again',async()=>{
 const b=browser();await sleep();
 assert.equal(b.calls,1);
 b.ids.searchForm.events.submit({preventDefault(){}});
 await new Promise(resolve=>setTimeout(resolve,350));
 assert.equal(b.calls,1);
 assert.equal(b.win.SHOP_PRODUCT_MATCH_V21.getState().count,5);
});
test('no write methods, no merchant scraping/hidden price fetch and no new GPS',()=>{
 assert.doesNotMatch(app,/\.from\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
 assert.doesNotMatch(app,/getCurrentPosition|watchPosition|MutationObserver|wolt\.com\/api|tesco\.hu\/api/);
 assert.match(app,/source:'Open Food Facts',merchantPrices:false/);
 assert.match(app,/fetch\(u\.href,\{/);
 assert.match(app,/requests|query|AbortController/i);
});
