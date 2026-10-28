/* SH9 BKK v2 Grand Control. Offline DOM-only favorite mode filter, no new BKK calls. */
(function(){'use strict';
const modes=[...document.querySelectorAll('[data-bkk-mode]')];
const host=document.getElementById('favoriteRoutes');
if(!host||!modes.length)return;
const descriptions={
 all:['Minden kedvenc','A profilod összes mentett járata, eredeti sorrendben.'],
 bus:['Busz','A kedvenc budapesti autóbuszjárataid.'],
 tram:['Villamos','A kedvenc villamosjárataid.'],
 metro:['Metró','A kedvenc metrójárataid.'],
 hev:['HÉV','A kedvenc HÉV-járataid.'],
 trolley:['Trolibusz','A kedvenc trolibuszjárataid.']
};
let selected='all';
const count=document.getElementById('bkkV2Count'),name=document.getElementById('bkkV2ModeName'),desc=document.getElementById('bkkV2ModeDesc'),hint=document.getElementById('bkkV2Hint');
function paint(){
 const cards=[...host.querySelectorAll('.route[data-mode]')];let n=0;
 for(const card of cards){const match=selected==='all'||card.dataset.mode===selected;card.hidden=!match;if(match)n++}
 name.textContent=descriptions[selected][0];desc.textContent=descriptions[selected][1];
 count.textContent=n+' kedvenc';
 hint.textContent=selected==='all'?'Profilhoz kötött saját lista · nincs új adatlekérés':n?'Csak a kiválasztott járműtípus látható a kedvencek között.':'Ebben a profilban még nincs ilyen típusú kedvenc járat.';
 for(const mode of modes)mode.setAttribute('aria-pressed',String(mode.dataset.bkkMode===selected));
}
for(const button of modes)button.addEventListener('click',()=>{selected=button.dataset.bkkMode;paint();document.getElementById('favorites')?.scrollIntoView({behavior:'smooth',block:'start'})});
const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))paint()});
observer.observe(host,{childList:true,subtree:false});
paint();
window.SH9_BKK_GRAND_V2=Object.freeze({selectMode(value){if(!descriptions[value])return false;selected=value;paint();return true},get mode(){return selected}});
})();
