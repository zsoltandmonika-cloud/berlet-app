// Regression for v394 Ask Léna answer card grouping (synthetic health text).
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('healthhub/live-v331.js','utf8');
const a=source.indexOf('function renderAnswerText(raw){');
const b=source.indexOf('\n// Align the visible answer box',a);
assert.ok(a>=0&&b>a,'renderer function available for isolated DOM behavior tests');
class Node{
 constructor(tag){this.tagName=String(tag).toUpperCase();this.childNodes=[];this.className='';this.style={};this._content=''}
 appendChild(x){if(x.tagName==='#FRAGMENT')this.childNodes.push(...x.childNodes);else this.childNodes.push(x);return x}
 replaceChildren(x){this.childNodes=[];if(x)this.appendChild(x)}
 set textContent(v){this._content=String(v);this.childNodes=[]}
 get textContent(){return this._content+this.childNodes.map(x=>x.textContent).join('')}
 get children(){return this.childNodes.filter(x=>x.tagName&&x.tagName!=='#TEXT')}
}
const host=new Node('div');
const dom={
 createDocumentFragment(){return new Node('#fragment')},
 createElement(tag){return new Node(tag)},
 createTextNode(text){const n=new Node('#text');n.textContent=text;return n}
};
const render=new Function('document','el',source.slice(a,b)+';return renderAnswerText')(
 dom,id=>id==='hhAi331Text'?host:null);
const answer=[
 'Mónika, az eszméletvesztésről dokumentum szerepel. A 112-es segélyhívás említése történelmi tény, nem mostani sürgős teendő.',
 '',
 '(1) Dokumentált tények és időrend',
 'Az újraélesztés és a mentőellátás egy korábbi esemény, amelyről személyes lelet készült.',
 '',
 'A szívritmuszavar előtti nap részletei bizonytalanok.',
 '',
 'Az oxigénhiány kihatott a korabeli állapotra.',
 '',
 '(2) Élettani magyarázat',
 'Kamrafibrilláció esetén a szív nem pumpál hatékonyan.',
 '',
 'Ez nem bizonyítja, hogy az adott személy hány percig volt oxigénhiányos.',
 '',
 '(3) Korlátok',
 'Nem ismert a pontos időtartam.',
 '',
 '(4) Hiányzó bizonyítékok',
 'A percenkénti OMSZ eseménynapló hiányzik.',
 '',
 '(5) Biztonságos következő lépések',
 'A dokumentumokat szakorvossal át lehet tekinteni.'
].join('\n');
render(answer);
let cards=host.children;
assert.equal(cards.length,6,'single introductory card + one card for each numbered topic');
assert.ok(cards.every(x=>x.className.includes('hhLenaNarrative394')));
assert.ok(cards.every(x=>x.className.includes('hhLenaBlock')));
assert.equal(cards[1].children.filter(x=>x.tagName==='P').length,3,
 'all clinical paragraphs stay in one topical tile, even when separated by blank lines');
assert.equal(cards[2].children.filter(x=>x.tagName==='P').length,2);
assert.ok(!cards.some(x=>x.className.includes('hhLenaUrgent')),
 'historic CPR/112/eszméletvesztés MUST NOT create urgent action labels');
assert.equal(cards.flatMap(x=>x.children).filter(x=>x.className.includes('hhLenaBlockHeader')).length,0,
 'no repetitive synthetic Important To Do headers');
assert.ok(cards[1].textContent.includes('A szívritmuszavar előtti nap'));
assert.ok(host.textContent.includes('A dokumentumokat szakorvossal'));
assert.equal(cards[1].children[0].textContent,'(1) Dokumentált tények és időrend');
render('## Klinikai megállapítások\nAz eszméletvesztés a múltban történt.\n\nJelenleg panaszmentes.');
cards=host.children;
assert.equal(cards.length,1,'one topical heading retains all its paragraphs');
assert.equal(cards[0].children[0].tagName,'H3');
assert.ok(!cards[0].className.includes('hhLenaUrgent'));
render('## Sürgős teendő\nÚj, aktuális beszédzavarnál sürgős ellátás szükséges.');
assert.equal(host.children.length,1);
assert.ok(host.children[0].className.includes('hhLenaUrgent'),'explicit emergency headline remains highlighted');
render('Első gondolat.\n\nMásodik gondolat.\n\nHarmadik gondolat.');
assert.equal(host.children.length,1,'multiple unheaded paragraphs form one continuous card');
console.log('PASS v394: one tile per real section, no fake urgency, previous text and explicit emergency preserved');
