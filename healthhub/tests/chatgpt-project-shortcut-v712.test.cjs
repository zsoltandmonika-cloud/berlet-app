#!/usr/bin/env node
'use strict';
// Synthetic browser DOM only. No accounts, health records or network calls.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'chatgpt-project-shortcut-v712.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const original=fs.readFileSync(path.join(root,'live-v299.js'),'utf8');
const ai=fs.readFileSync(path.join(root,'live-v331.js'),'utf8');
assert(html.includes('chatgpt-project-shortcut-v712.js?v=712-premium-glass-launcher'));
assert(html.indexOf('live-v299.js')<html.indexOf('chatgpt-project-shortcut-v712.js'));
const version='v713-chatgpt-project-cloud';
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
const listeners={}, store=new Map(),opened=[],prompts=[],alerts=[];
const document={
 readyState:'complete',head,
 createElement:tag=>new Element(tag),
 getElementById:id=>byId.get(id)||null,
 addEventListener:(event,fn)=>{listeners[event]=fn;}
};
const win={
 location:{search:''},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
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
assert(gear?.handlers?.click,'project URL can be changed');
assert(byId.get('hhChatGptGlassCss712'),'Glass style installed');
assert(launch.textContent.includes('beállítása'),'first use requires a project URL');
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
assert.equal(prompts.length,1,'prompt only for first use');
assert.equal(opened.length,1,'first click opens project after setup');
assert.equal(opened[0].url,'https://chatgpt.com/g/g-p-123abc-healthhub/project');
assert.equal(opened[0].target,'_blank');
assert.match(opened[0].flags,/noopener/);
assert.match(opened[0].flags,/noreferrer/);
assert.equal(api.saved(),opened[0].url);
launch.handlers.click();
assert.equal(prompts.length,1,'no repeated login/setup prompt');
assert.equal(opened.length,2,'second click opens same project');
assert.equal(byId.get('hhChatGptProjectStatus712').textContent.includes('új lapon'),true);
assert.equal(alerts.length,0);
console.log('PASS v712: HH Glass launcher renders, once-only local project setup, direct project URL opens, other routes unchanged, voice accessible in external ChatGPT');
