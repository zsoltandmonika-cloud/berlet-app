/* v832 · Focus scroll must stay put while keyboard-safe suggestions fit on-screen. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','guardian');
const js=fs.readFileSync(path.join(root,'guardian-keyboard-guard-v832.js'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-keyboard-guard-v832.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('mobile search is docked above visual keyboard without collapsing map or BKK bar',()=>{
 const callbacks={},styles={},listeners={};
 let scrollY=120,top=0,height=430,activeElement=null;
 const card={classList:{classes:new Set(),add(x){this.classes.add(x)},remove(x){this.classes.delete(x)},contains(x){return this.classes.has(x)}},
  style:{setProperty(k,v){styles[k]=v},removeProperty(k){delete styles[k]}}};
 const box={closest(){return card},getBoundingClientRect(){return {height:52}}};
 const input={addEventListener(type,fn){listeners[type]=fn}};
 const d={readyState:'complete',body:{classList:{contains(){return false}}},
  getElementById(id){return ({guardianMapSearchInputV819:input,guardianMapSearchV819:box})[id]||null},
  get activeElement(){return activeElement}};
 const vv={get height(){return height},get offsetTop(){return top},
  addEventListener(type,fn){callbacks['vv-'+type]=fn}};
 const w={document:d,visualViewport:vv,innerHeight:780,
  get scrollY(){return scrollY},
  scrollTo(x,y){scrollY=y},
  matchMedia(){return {matches:true}},
  setTimeout(fn){fn();return 1},clearTimeout(){},
  requestAnimationFrame(fn){fn()},
  addEventListener(type,fn){callbacks[type]=fn}};
 vm.runInNewContext(js,{window:w,document:d,module:{exports:{}}});
 listeners.pointerdown();activeElement=input;listeners.focus();
 assert.equal(styles['--hh-map-typing-top-v832'],'368px');
 assert.equal(styles['--hh-map-typing-results-v832'],'310px');
 assert.equal(card.classList.contains('hh-map-typing-v832'),true);
 scrollY=290;height=330;callbacks['vv-resize']();
 assert.equal(scrollY,120,'native Android focus pan is undone');
 assert.equal(styles['--hh-map-typing-top-v832'],'268px');
 assert.equal(styles['--hh-map-typing-results-v832'],'248px');
 listeners.blur();activeElement=null;
 assert.equal(card.classList.contains('hh-map-typing-v832'),false);
 assert.equal(styles['--hh-map-typing-top-v832'],undefined);
 assert.match(css,/#guardianMapSearchResultsV819/);
 assert.match(html,/guardian-keyboard-guard-v832\.css\?v=832-keyboard-safe/);
 assert.match(html,/guardian-keyboard-guard-v832\.js\?v=832-keyboard-safe/);
 assert.doesNotMatch(js,/geolocation|watchPosition|supabase|dropbox|requestFullscreen/);
});
