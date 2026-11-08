/* SHO Notification Center · Smart Buddy Place Alerts list v2.
 * Every saved family favorite is shown; cloud rules sync with RLS and require login to edit.
 * Does not ask for GPS, and does not claim closed-app geofence delivery.
 */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id),ROOT='hh-smart-places-alerts-v1068';
const SOUNDS={chime:'🔔 Lágy csengő',bell:'🎵 Dupla csilingelés',digital:'📱 Digitális',silent:'🔕 Néma'};
const PROFILE={zsolt:'Zsolt',monika:'Mónika'};
const RADII=[100,150,200,300];
const favorites=()=>w.HH_TRAVEL_FAVORITES_V972;
const rules=()=>w.SHO_BUDDY_PLACE_RULES_V2;
let busy=false,person='zsolt';
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function legacy(subtitle,profile){
 const a=String(subtitle||'').split(' • ');
 if(a.length!==5||a[0]!=='Smart Places'||a[1]!==profile)return null;
 const radius=Number(a[2].replace(/ m$/,''));if(!RADII.includes(radius)||!SOUNDS[a[3]]||!SOUNDS[a[4]])return null;
 return {arrival_enabled:true,departure_enabled:true,radius_m:radius,arrival_sound:a[3],departure_sound:a[4]};
}
function value(index,p){
 const row=favorites()?.getSlots?.()?.[index];
 const place=row?.place;
 if(!place)return null;
 const fromCloud=rules()?.forPlace(index,p,place.lat,place.lng);
 const initial=fromCloud||legacy(place.subtitle,p)||{};
 return {slot_index:index,profile_key:p,place_lat:Number(place.lat),place_lng:Number(place.lng),
  arrival_enabled:initial.arrival_enabled===true,departure_enabled:initial.departure_enabled===true,
  radius_m:initial.radius_m||150,arrival_sound:initial.arrival_sound||'chime',departure_sound:initial.departure_sound||'bell'};
}
function mark(text,isError=false){
 const n=$('ncPlaceStatusV2');if(n){n.textContent=text;n.dataset.error=String(isError)}
}
function choice(options,value){return options.map(([v,label])=>'<option value="'+escapeHtml(v)+'"'+(String(value)===String(v)?' selected':'')+'>'+escapeHtml(label)+'</option>').join('')}
function render(){
 const container=$('ncPlaceListV2');if(!container)return;
 const slots=favorites()?.getSlots?.()||[];
 const places=slots.map((item,index)=>({...item,index})).filter(item=>item?.place&&
  Number.isFinite(item.place.lat)&&Number.isFinite(item.place.lng));
 const localEnabled=w.localStorage?.getItem(ROOT)==='on';
 $('ncPlaceLocalV2').checked=localEnabled;
 const active=places.filter(row=>{const r=value(row.index,person);return r&&(r.arrival_enabled||r.departure_enabled)}).length;
 $('ncPlaceCountV2').textContent=active+'/'+places.length+' aktív';
 if(!places.length){container.innerHTML='<div class="nc-place-empty">Még nincs elmentett kedvenc hely. A Family Guardban rögzíthetsz egyet.</div>';return}
 container.innerHTML=places.map(item=>{
  const config=value(item.index,person),r=config||{},name=String(item.label||item.place.name||'Kedvenc hely').slice(0,40);
  const arrival=!!r.arrival_enabled,departure=!!r.departure_enabled;
  return '<details class="nc-place-row" data-slot="'+item.index+'"'+(busy?' aria-busy="true"':'')+'>'+
   '<summary><span class="nc-place-pin">📍</span><span class="nc-place-name">'+escapeHtml(name)+
   '<small>'+escapeHtml(PROFILE[person])+' · '+r.radius_m+' m</small></span>'+
   '<span class="nc-place-led '+(arrival?'on':'')+'">🟢</span><span class="nc-place-led '+(departure?'on':'')+'">🟠</span><span class="nc-place-chevron">⌄</span></summary>'+
   '<div class="nc-place-settings">'+
   '<label class="nc-place-toggle"><span>🟢 Arrival <small>Happy Buddy</small></span><input data-slot="'+item.index+'" data-rule-field="arrival_enabled" type="checkbox"'+(arrival?' checked':'')+(busy?' disabled':'')+'></label>'+
   '<label class="nc-place-toggle"><span>🟠 Departure <small>Neutral Buddy</small></span><input data-slot="'+item.index+'" data-rule-field="departure_enabled" type="checkbox"'+(departure?' checked':'')+(busy?' disabled':'')+'></label>'+
   '<div class="nc-place-fields"><label>Zóna<select data-slot="'+item.index+'" data-rule-field="radius_m"'+(busy?' disabled':'')+'>'+choice(RADII.map(n=>[n,n+' m']),r.radius_m)+'</select></label>'+
   '<label>Érkezési hang<select data-slot="'+item.index+'" data-rule-field="arrival_sound"'+(busy?' disabled':'')+'>'+choice(Object.entries(SOUNDS),r.arrival_sound)+'</select></label>'+
   '<label>Távozási hang<select data-slot="'+item.index+'" data-rule-field="departure_sound"'+(busy?' disabled':'')+'>'+choice(Object.entries(SOUNDS),r.departure_sound)+'</select></label></div>'+
   '</div></details>';
 }).join('');
}
async function refresh(){
 if(busy)return;
 mark('Kedvenc helyek és felhőbeállítások szinkronizálása…');
 const results=await Promise.allSettled([favorites()?.sync?.(true),rules()?.sync?.(true)]);
 render();
 const cloudRules=results[1]?.status==='fulfilled'&&results[1].value===true;
 if(!cloudRules)mark('Helyi előnézet. A felhős beállításokhoz jelentkezz be a Family Guardba.',true);
 else mark('✓ Kedvenc helyek és riasztások szinkronizálva.');
}
async function onChange(event){
 const input=event.target,field=input?.dataset?.ruleField,index=Number(input?.dataset?.slot);
 if(!field||!Number.isInteger(index)||busy)return;
 const previous=value(index,person);
 if(!previous)return;
 const update={...previous,[field]:input.type==='checkbox'?input.checked:
  field==='radius_m'?Number(input.value):input.value};
 busy=true;mark('Mentés a családi felhőbe…');
 // Keep the expanded card open while saving.
 const expanded=Array.from($('ncPlaceListV2').querySelectorAll('details[open]')).map(n=>n.dataset.slot);
 try{
  await rules().save(update);
  render();
  for(const slot of expanded){const n=$('ncPlaceListV2').querySelector('details[data-slot="'+slot+'"]');if(n)n.open=true}
  mark('✓ '+(previous.profile_key==='monika'?'Mónika':'Zsolt')+' · mentve, mindkét készülékre szinkronizálható.');
 }catch(e){
  render();
  for(const slot of expanded){const n=$('ncPlaceListV2').querySelector('details[data-slot="'+slot+'"]');if(n)n.open=true}
  mark('Mentés sikertelen: '+String(e?.message||'Kapcsolati hiba').slice(0,130),true);
 }finally{busy=false}
}
function init(){
 if(!$('ncPlaceListV2'))return;
 person=w.localStorage?.getItem('hh-profile')==='m'?'monika':'zsolt';
 $('ncPlacePersonV2').value=person;
 $('ncPlacePersonV2').addEventListener('change',e=>{person=e.target.value==='monika'?'monika':'zsolt';render()});
 $('ncPlaceLocalV2').addEventListener('change',e=>{
  const checked=!!e.target.checked;
  try{w.localStorage.setItem(ROOT,checked?'on':'off')}catch(_){}
  // An explicit tap may request Android/browser notification permission.
  // This is only a foreground geofence alert, not closed-app delivery.
  if(checked&&w.Notification?.permission==='default'&&typeof w.Notification.requestPermission==='function'){
   void w.Notification.requestPermission().then(status=>{
    if(status!=='granted')mark('Buddy-popup engedélyezve; az Android rendszerértesítéshez külön böngészőengedély szükséges.',true);
   }).catch(()=>{});
  }
  mark(checked?'Helyi riasztás aktív a nyitott Family Guardban.':'Helyi helyriasztás kikapcsolva.');
  render();
 });
 $('ncPlaceListV2').addEventListener('change',e=>void onChange(e));
 $('ncPlaceRefreshV2').addEventListener('click',()=>void refresh());
 w.addEventListener('hh-travel-favorites-changed',render);
 w.addEventListener('sho:buddy-place-rules-changed',render);
 w.addEventListener('storage',e=>{if(e.key===ROOT)render()});
 render();void refresh();
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
w.SHO_NOTIFICATION_PLACE_ALERTS_V2=Object.freeze({render,refresh});
})(window,document);
