'use strict';
/* Offline DOM-contract test for v592; synthetic medical data only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','health-scroll-select-v592.js'),'utf8');
class Fake {
 constructor(tag='div',cls='',value=''){
  this.tagName=tag;this.className=cls;this.textContent=value;this.children=[];this.parentNode=null;
  this.dataset={};this.handlers={};this.attrs={};this.hidden=false;this.disabled=false;this.tabIndex=0;
  this.classList={add:(c)=>{this.className+=' '+c;}};
 }
 appendChild(x){if(x.parentNode)x.parentNode.children=x.parentNode.children.filter(a=>a!==x);this.children.push(x);x.parentNode=this;return x;}
 insertBefore(x,ref){if(x.parentNode)x.parentNode.children=x.parentNode.children.filter(a=>a!==x);
  let i=ref?this.children.indexOf(ref):-1;if(i<0)i=this.children.length;this.children.splice(i,0,x);x.parentNode=this;return x;}
 get nextSibling(){if(!this.parentNode)return null;return this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null}
 addEventListener(type,cb){this.handlers[type]=cb}
 setAttribute(key,value){this.attrs[key]=String(value)}
 getAttribute(key){return this.attrs[key]||null}
 click(){if(this.handlers.click)this.handlers.click({preventDefault(){},stopPropagation(){}})}
 matches(s){
  if(s==='b'||s==='small')return this.tagName===s;
  if(s==='.hrSectionCard')return this.className.includes('hrSectionCard');
  if(s==='.hrTag'||s==='.hhLenaExplainBtn'||s==='.hhMedPurposeBtn'||s==='.hhRsmChip'||s==='.hhRsmCount'||s==='.hhRsmEmpty')return this.className.includes(s.slice(1));
  if(s==='button[onclick*="hhShowAllDocs"]')return this.tagName==='button'&&(this.attrs.onclick||'').includes('hhShowAllDocs');
  if(s.includes('.hrRow[onclick'))return this.className.includes('hrRow')&&s.split(',').some(q=>{
   const m=q.match(/onclick\*="([^"]+)"/);return m&&(this.attrs.onclick||'').includes(m[1]);
  });
  return false;
 }
 querySelectorAll(selector){
  let r=[];function walk(n){n.children.forEach(c=>{if(c.matches(selector))r.push(c);walk(c);});}walk(this);return r;
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
}
function makeDoc(name,meta,id){const row=new Fake('div','hrRow clickable');
 row.attrs.onclick="hhOpenDocumentDetail('"+id+"')";
 row.appendChild(new Fake('div','hrIco','📄'));
 const mid=row.appendChild(new Fake('div',''));mid.appendChild(new Fake('b','',name));mid.appendChild(new Fake('small','',meta));
 row.appendChild(new Fake('span','hrTag','PDF'));return row;
}
function makeMed(name,status,id){const row=new Fake('div','hrRow clickable');
 row.attrs.onclick="openHrDetail('medication','"+id+"')";
 row.appendChild(new Fake('div','hrIco','💊'));
 const mid=row.appendChild(new Fake('div',''));mid.appendChild(new Fake('b','',name));mid.appendChild(new Fake('small','','10 mg naponta'));
 row.appendChild(new Fake('span','hrTag',status));return row;
}
const fullDocs=Array.from({length:10},(_,i)=>makeDoc('Labor teszt '+i+'.pdf','Labor','doc-'+i));
fullDocs.push(makeDoc('OMSZ Mentőszolgálat Esetlap.pdf','Sürgősségi ellátás / mentés','doc-omsz'));
let content=new Fake('div',''),calls=[],view='records',profile='z';
const listeners={},warnings=[];
const win={
 location:{search:'?hhscrollselect=1'},localStorage:{getItem:()=>profile},hhDocState:{showAll:false},
 get healthSectionKind(){return view;},set healthSectionKind(v){view=v;},
 addEventListener(k,fn){listeners[k]=fn},
 openHrDocument(id){calls.push('PDF:'+id)},hhOpenDocumentDetail(id){calls.push('DETAIL:'+id)},
 hhOpenLenaExplanation(id){calls.push('LENA:'+id)},
 openHrDetail(kind,id){calls.push('MED:'+kind+':'+id)},
 async renderHealthSection(){
  const card=new Fake('section','hrSectionCard');card.appendChild(new Fake('h3','',view));
  const data=view==='records'?(this.hhDocState.showAll?fullDocs:fullDocs.slice(0,10))
    :[makeMed('Gyógyszer A','aktuális','med1'),makeMed('Gyógyszer B','korábbi','med2'),makeMed('Gyógyszer C','aktuális','med3')];
  data.forEach(row=>card.appendChild(row));
  if(view==='records'&&!this.hhDocState.showAll){
   const show=new Fake('button','');show.attrs.onclick='hhShowAllDocs()';card.appendChild(show);
  }
  content.children=[card];card.parentNode=content;
  return 'rendered';
 },
 hhShowAllDocs(){this.hhDocState.showAll=true;return this.renderHealthSection()}
};
const document={
 documentElement:{dataset:{}},head:{appendChild(){}},
 createElement(tag){return new Fake(tag)},
 getElementById(id){return id==='healthSubContent'?content:null}
};
vm.runInNewContext(code,{window:win,document,URLSearchParams,console:{warn(m){warnings.push(m)}}});
(async()=>{
 await win.renderHealthSection();
 let bar=content.querySelector('.hhRsmToolbar');
 let chips=bar.querySelectorAll('.hhRsmChip');
 const omsz=chips.find(b=>b.dataset.hhKey==='omsz');
 assert.ok(omsz&&!omsz.disabled,'OMSZ outside first 10 must still be selectable');
 omsz.click(); // calls canonical show-all before applying the quick filter
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(win.hhDocState.showAll,true,'canonical results expanded');
 bar=content.querySelector('.hhRsmToolbar');assert.ok(bar,'toolbar survives canonical re-render');
 chips=bar.querySelectorAll('.hhRsmChip');
 assert.equal(chips.find(b=>b.dataset.hhKey==='omsz').attrs['aria-pressed'],'true');
 const cards=content.querySelector('.hhRsmTrack').children;
 assert.equal(cards.length,11,'all documents are preserved in the carousel');
 assert.equal(cards.filter(x=>!x.hidden).length,1,'OMSZ only is shown');
 const selected=cards.find(x=>!x.hidden);
 assert.ok(selected.querySelector('b').textContent.includes('OMSZ'));
 let action=selected.querySelectorAll('.hhRsmActions')[0].children;
 assert.ok(action.some(b=>b.textContent==='📄 Open PDF'),'PDF action exists');
 assert.ok(action.some(b=>b.textContent==='✨ Léna magyarázata'),'Léna explanation exists');
 action.find(b=>b.textContent==='📄 Open PDF').click();
 action.find(b=>b.textContent==='✨ Léna magyarázata').click();
 assert.deepEqual(calls,['PDF:doc-omsz','LENA:doc-omsz'],'original actions receive exact selected id');
 view='medications';await win.renderHealthSection();
 const medToolbar=content.querySelector('.hhRsmToolbar');
 const seasonal=medToolbar.querySelectorAll('.hhRsmChip').find(b=>b.dataset.hhKey==='seasonal');
 assert.ok(seasonal.disabled,'no invented seasonal medicine category');
 const past=medToolbar.querySelectorAll('.hhRsmChip').find(b=>b.dataset.hhKey==='past');
 past.click();
 assert.equal(content.querySelector('.hhRsmTrack').children.filter(x=>!x.hidden).length,1);
 assert.equal(content.querySelector('.hhRsmTrack').children.find(x=>!x.hidden).querySelector('b').textContent,'Gyógyszer B');
 listeners['healthhub:profile-changed']();await win.renderHealthSection();
 assert.equal(content.querySelector('.hhRsmTrack').children.filter(x=>!x.hidden).length,3,'profile switches reset quick filters');
 assert.deepEqual(warnings,[],'no silent preview crashes');
 console.log('Health scroll-select v592 synthetic DOM E2E: OMSZ beyond 10, PDF/Léna, medicines, filter reset PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
