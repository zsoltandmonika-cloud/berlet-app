#!/usr/bin/env node
'use strict';
// Synthetic browser DOM only. No accounts, health records or network calls.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'chatgpt-project-shortcut-v712.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const original=fs.readFileSync(path.join(root,'live-v299.js'),'utf8');
const home=fs.readFileSync(path.join(root,'premium-glass-home-v520.js'),'utf8');
assert(home.includes("['ask','Kérdezd Lénát']"));
assert(home.includes("fallbackClick('Ask Léna')"));
const ai=fs.readFileSync(path.join(root,'live-v331.js'),'utf8');
assert(html.includes('chatgpt-project-shortcut-v712.js?v=756-central-ask-lena'));
assert(html.indexOf('live-v299.js')<html.indexOf('chatgpt-project-shortcut-v712.js'));
const version='v728-inline-bs-aj';
assert.equal(html.match(/name="healthhub-live-build" content="([^"]+)"/)?.[1],version);
assert.equal('v'+html.match(/var v='([^']+)'/)?.[1],version);
assert.equal(html.match(/window\.HH_LIVE_BUILD='([^']+)'/)?.[1],version);
assert(original.includes('hhPlain299')&&original.includes('hhSQ299'),'old original page remains in repo');
assert(ai.includes('smooth-endpoint-v395'),'research code untouched');
assert(!js.includes('https://api.openai.com'));
assert(!js.includes('supabase/functions'));
assert(!js.includes('uploadJson('));
assert(!js.includes('downloadJson('));
assert(!js.includes('fetch('));
assert(js.includes('hhProjectLaunch712')||js.includes('hhChatGptProjectLaunch712'));
assert(js.includes('Hangmód az eredeti ChatGPT-ben'));
assert(js.includes('.askWidth > .askCard:first-child > :not(#hhChatGptDock712)'));
assert(js.includes('[data-profile="monika"]'));
const byId=new Map();
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.handlers={};this.textContent='';this.style={};this.attributes={};}
 appendChild(child){child.parentElement=this;this.children.push(child);if(child.id)byId.set(child.id,child);return child;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(type,fn){this.handlers[type]=fn;}
 contains(el){for(let p=el;p;p=p.parentElement)if(p===this)return true;return false;}
 querySelector(selector){if(selector==='.askWidth > .askCard:first-child')return card;return null;}
}
const head=new Element('head'), page=new Element('section'),card=new Element('section');
page.id='hhLenaSmart299';byId.set(page.id,page);page.appendChild(card);
const listeners={}, store=new Map(),opened=[],assigned=[],prompts=[],alerts=[];
const document={
 readyState:'complete',head,
 createElement:tag=>new Element(tag),
 getElementById:id=>byId.get(id)||null,
 addEventListener:(event,fn)=>{listeners[event]=fn;}
};
const win={
 location:{search:'',assign:url=>assigned.push(url)},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 addEventListener:(event,fn)=>{listeners[event]=fn;},
 open:(url,target,flags)=>{opened.push({url,target,flags});return {};},
 prompt:(text,def)=>{prompts.push({text,def});return 'https://chatgpt.com/g/g-p-123abc-healthhub/project';},
 alert:text=>alerts.push(text)
};
vm.runInNewContext(js,{window:win,document,URL,console},{timeout:1500});
const api=win.HH_CHATGPT_PROJECT_SHORTCUT_V712;
assert(api,'shortcut API must be initialized');
const dock=byId.get('hhChatGptDock712');
assert(dock&&card.children.includes(dock),'Glass card replaces search composer');
const launch=byId.get('hhChatGptProjectLaunch712');
const gear=byId.get('hhChatGptProjectSettings712');
assert(launch?.handlers?.click,'Glass launch button is functional');
assert.equal(gear,undefined,'project URL settings moved to the central Admin');
assert(byId.get('hhChatGptGlassCss712'),'Glass style installed');
assert.equal(launch.textContent,'Kérdezd Lénát','Glass action label is stable even before configuration');
assert.equal(api.normalizeProjectUrl('https://chatgpt.com/g/g-p-123abc-healthhub/project'),
 'https://chatgpt.com/g/g-p-123abc-healthhub/project');
assert.equal(api.normalizeProjectUrl('https://chatgpt.com/g/g-p-123abc-healthhub/c/a12345'),
 'https://chatgpt.com/g/g-p-123abc-healthhub/project');
for(const bad of [
 'https://chatgpt.com.evil.com/g/g-p-123/project',
 'http://chatgpt.com/g/g-p-123/project',
 'https://chatgpt.com/share/abc',
 'https://chatgpt.com/',
 'javascript:alert(1)',
 'https://chatgpt.com@evil.com/g/g-p-123/project',
 'https://chatgpt.com/g/g-p-123/project/../../',
 'https://chatgpt.com/g/g-p-123/project/x',
 'https://chatgpt.com.evil.com'
]) assert.throws(()=>api.normalizeProjectUrl(bad),'reject unsafe/non-project URLs: '+bad);
assert.equal(opened.length,0,'no automatic browser navigation');
launch.handlers.click();
assert.equal(prompts.length,0,'no settings prompt on Ask Lena');
assert.equal(opened.length,0,'unset project cannot open');
assert.equal(assigned[0],'/berlet-app/healthhub/index.html?sh9nav=admin&sh9cfg=asklena','unset URL routes to central Admin');
const configured=api.save('https://chatgpt.com/g/g-p-123abc-healthhub/project');
assert.equal(configured,api.saved(),'the single v712 API owns the project URL');
launch.handlers.click();
assert.equal(opened.length,1,'one click opens the configured project');
assert.equal(opened[0].url,configured);
assert.equal(opened[0].target,'_blank');
assert.match(opened[0].flags,/noopener/);
assert.equal(prompts.length,0,'Ask Lena never reconfigures project');
assert.match(byId.get('hhChatGptProjectStatus712').textContent,/külön lapon/);
assert.equal(alerts.length,0);
// Desktop: best-effort browser popup is sized and centered over the visible Glass card.
win.innerWidth=1280;win.innerHeight=830;win.screenX=70;win.screenY=20;
win.screen={availWidth:1366,availHeight:900};
win.navigator={userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'};
dock.getBoundingClientRect=()=>({left:120,top:160,width:380,height:410});
launch.handlers.click();
const popup=opened.at(-1);
assert.match(popup.flags,/popup=yes/);
assert.match(popup.flags,/width=452/);
assert.match(popup.flags,/height=630/);
assert.match(popup.flags,/left=154/);
assert.match(popup.flags,/noopener/);
assert.equal(popup.target,'_blank');
assert.equal(popup.url,api.saved());
assert.equal(launch.textContent,'Kérdezd Lénát');
assert.match(byId.get('hhChatGptProjectStatus712').textContent,/kompakt ablakban/);
// Android: navigate directly, so the APK WebView can hand off to the system browser.
win.navigator.userAgent='Mozilla/5.0 (Linux; Android 16)';
const desktopOpens=opened.length;
launch.handlers.click();
assert.equal(opened.length,desktopOpens,'no unsupported new popup WebView on Android');
assert.equal(assigned.at(-1),configured,'native external HTTPS navigation');
api.clearProject();
assert.equal(api.saved(),null,'central Admin can clear the project');
console.log('PASS v756: Admin-only URL setup; direct desktop popup and Android browser; legacy research untouched');
