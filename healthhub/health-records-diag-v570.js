/* HealthHub v570: opt-in, read-only records route diagnostic (?hhdocsdiag=1).
 * No document/blob access or mutation. No event interception. */
(function(w,d){'use strict';
var enabled=false;try{enabled=new URLSearchParams(w.location.search).get('hhdocsdiag')==='1'}catch(e){}
if(!enabled)return;
var events=[],panel=null,wrapped=null,start=Date.now();
function log(msg){var t=((Date.now()-start)/1000).toFixed(1)+'s '+msg;events.push(t);if(events.length>25)events.shift();if(panel)panel.textContent=events.slice(-9).join('\n');try{console.info('[HH Docs Diagnostic]',t)}catch(e){}}
function mount(){if(panel)return;panel=d.createElement('pre');panel.id='hhDocsDiag570';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
 panel.style.cssText='position:fixed!important;left:8px;right:8px;bottom:80px;max-height:185px;overflow:auto;z-index:2147483646;background:rgba(5,17,33,.95);color:#d5edff;padding:12px;font:11px/1.4 monospace;white-space:pre-wrap;border:1px solid #8eb7db;border-radius:12px;pointer-events:none';
 d.body.appendChild(panel);log('Diagnosztika bekapcsolva');}
function check(){if(typeof w.renderHealthSection==='function'&&w.renderHealthSection!==wrapped){var old=w.renderHealthSection;wrapped=async function(){log('renderHealthSection START kind='+String(w.healthSectionKind));var began=Date.now();try{var value=await old.apply(this,arguments);log('renderHealthSection OK '+(Date.now()-began)+'ms');return value}catch(e){log('RENDER HIBA '+String(e&&e.message||e));throw e}};w.renderHealthSection=wrapped;log('Render figyelés aktív');}}
d.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('button,[role="button"]');if(!b)return;var t=(b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,70);if(/lelet|dokumentum/i.test(t))log('Koppintás: '+t+' / kind='+String(w.healthSectionKind));},true);
w.addEventListener('error',function(e){log('JS hiba: '+String(e.message||'ismeretlen').slice(0,100));var stack=e.error&&e.error.stack;if(stack){String(stack).split('\n').slice(0,7).forEach(function(line){log('STACK '+line.slice(0,150))})}else log('Hely: '+String(e.filename||'?').split('/').pop()+':'+String(e.lineno||'?')+':'+String(e.colno||'?'))});
w.addEventListener('unhandledrejection',function(e){log('Promise hiba: '+String(e.reason&&e.reason.message||e.reason||'ismeretlen').slice(0,100))});
function boot(){mount();check();var count=0;var id=w.setInterval(function(){check();if(++count>=20)w.clearInterval(id)},500)}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
