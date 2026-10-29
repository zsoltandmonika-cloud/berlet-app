/* v992 reliable mobile date editor: visible native date control and apply action. */
(function(d){
'use strict';
const trigger=d.getElementById('rail-date-trigger'),field=d.getElementById('rail-date');
if(!trigger||!field)return;
const overlay=d.createElement('div');overlay.className='volan-date-dialog-v992';overlay.hidden=true;
overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Utazási dátum kiválasztása');
const title=d.createElement('strong');title.textContent='📅 Utazási dátum';
const picker=d.createElement('input');picker.type='date';picker.setAttribute('aria-label','Dátum megadása');
const actions=d.createElement('div');
const cancel=d.createElement('button');cancel.type='button';cancel.textContent='Mégse';
const apply=d.createElement('button');apply.type='button';apply.textContent='Dátum beállítása';
actions.append(cancel,apply);overlay.append(title,picker,actions);d.body.append(overlay);
function close(){overlay.hidden=true;trigger.focus()}
function open(){picker.value=field.value;overlay.hidden=false;picker.focus()}
apply.addEventListener('click',()=>{if(!picker.value)return;field.value=picker.value;field.dispatchEvent(new Event('change',{bubbles:true}));close()});
cancel.addEventListener('click',close);
overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
trigger.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true);
trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();open()}},true);
})(document);