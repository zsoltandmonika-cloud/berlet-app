'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
test('supplement module is syntactically valid and keeps private profile storage',()=>{
 const src=read('hh-supplements-v700.js');
 new Function(src);
 assert.match(src,/profiles\[p\]\.supplements/);
 assert.match(src,/healthhub:private-supplements-saved/);
 assert.match(src,/hhMasterStructuredSync304/);
 assert.match(src,/nem igazolt/);
 assert.doesNotMatch(src,/profiles\[p\]\.medications\s*=/);
});
test('all 8 user-specified supplements are present as templates, not consumed records',()=>{
 const s=read('hh-supplements-v700.js');
 const names=['JutaVit Ashwagandha KSM-66','Multi4u C + D3','ZeinPharma Wild Yams Plus','JutaVit Mg-biszglicinát','Dr. Chen Omega-3 Forte Plus','WOW TEA SlimFit Berry','PureGold CreaWomen','PureGold Lady Shape'];
 names.forEach(n=>assert.ok(s.includes("name:'"+n+"'"),n));
 assert.equal((s.match(/\{name:'[^']+',strength:/g)||[]).length,8);
 assert.doesNotMatch(s,/catalogTrack|catalogHead|Készítménykatalógus · egy kattintással felvehető|Katalógustétel, nem rögzített szedés/);
});
test('canonical medications route, Home label, scroll and AI context stay connected',()=>{
 assert.match(read('index.html'),/hh-supplements-v700\.js\?v=759-compact-own-list/);
 assert.match(read('premium-glass-home-v520.js'),/Gyógyszer & Supplement/);
 assert.match(read('live-v126.js'),/medications:'HealthHub Gyógyszerek \+ Supplements'/);
 assert.match(read('live-v289.js'),/supplements:supplementList\(rs\[4\],p\)/);
 assert.match(read('live-v331.js'),/domain:'supplement'|put\('supplement'/);
});
test('Ask Lena research monitor is half height initially and grows until capped',()=>{
 const s=read('live-v340.js');
 new Function(s);
 assert.match(s,/min-height:142px!important/);
 assert.match(s,/height:auto!important/);
 assert.match(s,/max-height:min\(48vh,420px\)/);
 assert.doesNotMatch(s,/height:284px/);
});

test('Supplements appear before the pharmacy alternatives in every Medications rerender',()=>{
 const src=read('hh-supplements-v700.js');
 assert.match(src,/parent\.querySelector\('#hhPharmacyGuide'\)/);
 assert.match(src,/parent\.insertBefore\(sec,guide\)/);
 assert.match(src,/parent\.insertBefore\(sec,medicationCard\.nextSibling\)/);
 assert.doesNotMatch(src,/refresh\(\);parent\.appendChild\(sec\)/);
});
test('the visible Ask Léna input composer is compact and grows with typed text',()=>{
 const js=read('live-v340.js'),css=read('ask-lena-chat-glass-v566.css');
 assert.match(js,/min-height:100px/);
 assert.match(js,/q\.scrollHeight,limit/);
 assert.match(js,/height','34px','important'/);
 assert.doesNotMatch(js,/height:190px/);
 assert.match(css,/#hhLenaComposer340\{height:auto!important;min-height:100px!important\}/);
 assert.doesNotMatch(css,/#hhLenaComposer340\{height:190px/);
 const entry=read('index.html');
 assert.match(entry,/hh-supplements-v700\.js\?v=759-compact-own-list/);
 assert.match(entry,/live-v340\.js\?v=701/);
 assert.match(entry,/ask-lena-chat-glass-v566\.css\?v=701/);
});


test('Supplement search opens only when the search button is pressed and closes without hidden filtering',()=>{
 const src=read('hh-supplements-v700.js'),css=read('hh-supplements-v700.css');
 assert.match(src,/state=\{filter:'all',query:'',searchOpen:false\}/);
 assert.match(src,/search\.hidden=!state\.searchOpen/);
 assert.match(src,/openSearch\.setAttribute\('aria-expanded',String\(state\.searchOpen\)\)/);
 assert.match(src,/openSearch\.setAttribute\('aria-controls','hhSupp700SearchField'\)/);
 assert.match(src,/state\.searchOpen=false/);
 assert.match(css,/\.hhSupp700Search\[hidden\]\{\s*display:none!important/);
 assert.match(css,/\.hhSupp700SearchToggle:focus-visible/);
 const begin=src.indexOf("var openSearch=make('button','hhSupp700SearchToggle'");
 const end=src.indexOf('controls.appendChild(search);',begin);
 assert.ok(begin>=0&&end>begin,'toggle implementation located');
 const snippet=src.slice(begin,end+'controls.appendChild(search);'.length);
 const vm=require('node:vm');
 const make=(tag,cls,text)=>{
  const el={tag,className:cls,textContent:text||'',hidden:false,value:'',attrs:{},children:[],focusCount:0};
  el.setAttribute=(key,val)=>{el.attrs[key]=String(val)};
  el.appendChild=(child)=>{el.children.push(child)};
  el.focus=()=>{el.focusCount++};
  return el;
 };
 const state={filter:'all',query:'',searchOpen:false},controls=make('div'),heading=make('div');
 let refreshed=0;
 const ctx={state,controls,heading,make,refresh(){refreshed++},String};
 vm.runInNewContext(snippet,ctx,{timeout:2000});
 assert.equal(ctx.search.hidden,true,'search field occupies no space by default');
 assert.equal(ctx.openSearch.attrs['aria-expanded'],'false','button starts collapsed');
 ctx.openSearch.onclick();
 assert.equal(ctx.search.hidden,false,'tapping the button reveals search');
 assert.equal(ctx.search.focusCount,1,'search receives focus');
 assert.equal(ctx.openSearch.attrs['aria-expanded'],'true');
 state.query='vitamin';ctx.search.value='vitamin';
 ctx.openSearch.onclick();
 assert.equal(ctx.search.hidden,true,'second tap collapses search');
 assert.equal(state.query,'','closing clears invisible filters');
 assert.equal(ctx.search.value,'');
 assert.equal(refreshed,1,'results refresh with full list when closed');
});

test('v759 own-list-only Supplements card is compact without removing saved data or editor',()=>{
 const src=read('hh-supplements-v700.js'),css=read('hh-supplements-v700.css');
 assert.doesNotMatch(src,/var intro=make\('p','hhRsmNote'/);
 assert.doesNotMatch(src,/sec\.appendChild\(intro\)/);
 assert.doesNotMatch(src,/catalogTrack|catalogHead|sec\.appendChild\(catalogTrack\)/);
 assert.doesNotMatch(src,/Készítménykatalógus · egy kattintással felvehető/);
 assert.match(src,/var ref=await readRef\(\),profile=pkey\(\),all=rows\(ref,profile\)/);
 assert.match(src,/shown\.forEach\(function\(m\)\{track\.appendChild\(card\(m\)\)\}/);
 assert.match(src,/var add=make\('button','hhMed593Add hhMed657Add','＋ Supplement hozzáadása'\)/);
 assert.match(src,/add\.onclick=function\(\)\{edit\(null,''\)/);
 assert.match(src,/card\(m\)/);
 assert.match(src,/state\.searchOpen=false/);
 assert.match(src,/root\.HH_SUPPLEMENTS_V700=Object\.freeze\(\{version:'700',catalog:CATALOG\.map/);
 assert.match(css,/\.hhSupp700Section\{margin-top:10px;padding-top:10px;/);
});
