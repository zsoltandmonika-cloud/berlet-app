/* SHO Taxi map appearance · Golden Standard shared dark/light theme v1.
 * Both Taxi maps stay synchronized; only theme preference is persisted.
 * No user position, route coordinates, or tracking data are saved.
 */
(function(w,d){'use strict';
const KEY='sho-taxi-map-theme-v1';
const DARK='https://tiles.openfreemap.org/styles/dark';
const BRIGHT='https://tiles.openfreemap.org/styles/bright';
let mode='dark';
try{if(w.localStorage?.getItem(KEY)==='light')mode='light';}catch(_){}
const listeners=new Set();
const getTheme=()=>mode;
const style=()=>mode==='dark'?DARK:BRIGHT;
function refreshButtons(){
 d.querySelectorAll('[data-taxi-map-theme]').forEach(button=>{
  button.textContent=mode==='dark'?'☀️':'🌙';
  const description=mode==='dark'?'Világos térkép bekapcsolása':'Sötét térkép bekapcsolása';
  button.setAttribute('aria-label',description);
  button.setAttribute('title',description);
  button.setAttribute('aria-pressed',String(mode==='dark'));
 });
}
function setTheme(next){
 if(next!=='dark'&&next!=='light')return mode;
 if(mode===next){refreshButtons();return mode;}
 mode=next;
 try{w.localStorage?.setItem(KEY,mode);}catch(_){}
 refreshButtons();
 for(const callback of listeners){try{callback(mode);}catch(e){console.warn('SHO Taxi map theme listener',e);}}
 return mode;
}
const subscribe=callback=>{
 if(typeof callback!=='function')return ()=>{};
 listeners.add(callback);return ()=>listeners.delete(callback);
};
d.addEventListener('click',event=>{
 if(event.target?.closest?.('[data-taxi-map-theme]'))setTheme(mode==='dark'?'light':'dark');
});
w.addEventListener('storage',event=>{
 if(event.key!==KEY)return;
 const next=event.newValue==='light'?'light':'dark';
 if(mode!==next){mode=next;refreshButtons();for(const callback of listeners){try{callback(mode);}catch(_){}}}
});
w.SHO_TAXI_MAP_THEME_V1=Object.freeze({getTheme,style,setTheme,subscribe,refreshButtons});
refreshButtons();
})(window,document);
