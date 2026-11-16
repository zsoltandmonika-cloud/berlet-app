/* SHO Full Basket Match v1. Transparent batch preparation, no live merchant API. */
(function(w,d){'use strict';
let root=null,ready=false,opened=false,limit=40;
const $=id=>d.getElementById(id);
const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
function create(){
 if(root)return;
 const hook=$('modeHelp');if(!hook)return;
 root=el('section','batch-match glass');
 root.id='batchMatch';root.setAttribute('aria-label','Teljes kosár párosítása');
 const heading=el('div','batch-head'),copy=el('div'),small=el('small',null,'SHO · FULL BASKET MATCH V1'),title=el('strong',null,'⚡ Teljes kosár párosítása');
 copy.append(small,title);
 const trigger=el('button','batch-trigger','🛒 Kosár előkészítése');trigger.type='button';trigger.id='batchTrigger';
 trigger.addEventListener('click',()=>{opened=true;limit=40;render()});
 heading.append(copy,trigger);
 const description=el('p','batch-summary','A közös Smart List minden termékéhez előkészítjük a keresést. A mentett hivatkozásokat külön jelezzük.');
 description.id='batchSummary';
 const list=el('div','batch-list');list.id='batchItems';list.hidden=true;
 root.append(heading,description,list);
 hook.insertAdjacentElement('afterend',root);
}
function render(){
 create();if(!root)return;
 const api=w.SHOP_MERCHANT_MATCH_V1;
 const snap=api?.snapshot?.()||{mode:'shared',status:'loading',items:[]};
 const list=$('batchItems'),label=$('batchSummary'),trigger=$('batchTrigger');
 if(!list||!label||!trigger)return;
 trigger.disabled=snap.mode!=='shared'||!snap.items.length;
 if(snap.mode!=='shared'){label.textContent='A teljes kosár előkészítéséhez válaszd a Közös Smart Listet.';list.hidden=true;return}
 if(!opened){label.textContent=snap.items.length?'Egy művelet: '+snap.items.length+' aktív termék keresése és mentett terméklinkjei.':'A közös bevásárlólista betöltésére várunk…';list.hidden=true;return}
 list.replaceChildren();list.hidden=false;
 const linked=snap.items.filter(x=>x.savedUrl).length;
 label.textContent=snap.items.length+' termék előkészítve · '+linked+' korábban mentett link · '+(snap.items.length-linked)+' bolti keresésre vár'+(snap.status==='cached'?' · 📱 csak helyi másolat':'')+'. Élő ár/készlet és automatikus kosárfeltöltés nincs.';
 for(const item of snap.items.slice(0,limit)){
  const row=el('article','batch-row'),info=el('div','batch-info');
  info.append(el('strong',null,item.name),el('small',null,(item.quantity||1)+' '+(item.unit||'db')+' · '+(item.savedUrl?'🔗 Mentett terméklink (ellenőrzendő)':'🔎 Találatkeresés szükséges')));
  const actions=el('div','batch-actions'),find=el('a','batch-action','Találatok');
  find.href=item.searchUrl;find.target='_blank';find.rel='noopener noreferrer external';actions.append(find);
  if(item.savedUrl){const saved=el('a','batch-action batch-saved','Mentett');saved.href=item.savedUrl;saved.target='_blank';saved.rel='noopener noreferrer external';actions.append(saved)}
  row.append(info,actions);list.append(row);
 }
 if(snap.items.length>limit){
  const more=el('button','batch-more','＋ További '+Math.min(40,snap.items.length-limit)+' tétel');
  more.type='button';more.addEventListener('click',()=>{limit+=40;render()});list.append(more);
 }
}
w.addEventListener('sho:merchant-list-updated',render);
d.addEventListener('DOMContentLoaded',()=>{ready=true;create();render()});
})(window,document);