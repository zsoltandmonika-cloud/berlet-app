/* Family Guard v776 - user-consented, browser-local significant place bookmarks.
   No hard-coded private coordinates, network storage or background location tracking. */
(function(w,d){
'use strict';
const $=id=>d.getElementById(id);
const KEY='hh-guardian-landmarks-v776';
const LIMIT=20;
const TYPES=Object.freeze({
 home:{icon:'🏠',label:'Otthon'},
 work:{icon:'💼',label:'Munkahely'},
 doctor:{icon:'🏥',label:'Orvos'},
 family:{icon:'❤️',label:'Család'},
 favorite:{icon:'⭐',label:'Kedvenc'},
 bus:{icon:'🚌',label:'Buszmegálló'},
 tram:{icon:'🚊',label:'Villamosmegálló'},
 shopping:{icon:'🛍️',label:'Bevásárlás'},
 other:{icon:'📍',label:'Egyéb'}
});
let map=null,items=[],savedMarkers=[],previewMarker=null,picking=false,selected=null,kind='home';
function validPoint(p){
 return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
  &&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
}
function sanitize(item){
 if(!item||!TYPES[item.kind]||typeof item.name!=='string'||typeof item.id!=='string')return null;
 const coords=[item.lng,item.lat],label=item.name.trim().slice(0,40);
 if(!validPoint(coords)||!label||!(/^[a-z0-9_-]{3,40}$/i).test(item.id))return null;
 return {id:item.id,kind:item.kind,name:label,lng:coords[0],lat:coords[1]};
}
function load(){
 try{
  const raw=JSON.parse(w.localStorage.getItem(KEY)||'[]');
  return Array.isArray(raw)?raw.slice(0,LIMIT).map(sanitize).filter(Boolean):[];
 }catch(_){return []}
}
function status(text){const el=$('guardianLandmarkStatus');if(el)el.textContent=text;}
function markerNode(entry,temporary){
 const el=d.createElement('button');
 el.type='button';
 el.className='guardian-landmark-pin'+(temporary?' is-preview':'');
 el.textContent=TYPES[entry.kind].icon;
 el.title=entry.name+(temporary?' (mentés előtt)':'');
 el.setAttribute('aria-label',el.title);
 if(!temporary)el.addEventListener('click',function(evt){
  if(evt&&evt.stopPropagation)evt.stopPropagation();
  goTo(entry);
 });
 return el;
}
function movePreview(){
 if(previewMarker){previewMarker.remove();previewMarker=null}
 if(!map||!selected||!w.maplibregl||!w.maplibregl.Marker)return;
 previewMarker=new w.maplibregl.Marker({element:markerNode({kind,name:TYPES[kind].label},true),anchor:'bottom'})
  .setLngLat(selected).addTo(map);
}
function setSelected(coords){
 if(!validPoint(coords)){status('Érvénytelen térképpont.');return}
 selected=coords.slice();
 picking=false;
 const hint=$('guardianLandmarkHint');if(hint)hint.hidden=true;
 const card=$('guardianLandmarksSelect');if(card)card.setAttribute('aria-pressed','false');
 if(map&&map.getCanvas)map.getCanvas().style.cursor='';
 const save=$('guardianLandmarksSave');if(save)save.disabled=false;
 movePreview();
 status('Pont kijelölve. A Mentés gombbal rögzítheted.');
 const settings=$('guardianLandmarks');
 if(settings&&typeof settings.scrollIntoView==='function')settings.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function stopPicking(){
 picking=false;
 const hint=$('guardianLandmarkHint');if(hint)hint.hidden=true;
 const btn=$('guardianLandmarksSelect');if(btn)btn.setAttribute('aria-pressed','false');
 if(map&&map.getCanvas)map.getCanvas().style.cursor='';
}
function jumpTo(coords){
 if(!map||!validPoint(coords))return;
 stopPicking();
 if(typeof map.flyTo==='function')map.flyTo({center:coords,zoom:Math.max(15.3,map.getZoom()),duration:750});
 else if(typeof map.easeTo==='function')map.easeTo({center:coords,zoom:15.3,duration:750});
}
function goTo(entry){
 if(!entry)return;
 jumpTo([entry.lng,entry.lat]);
 status(entry.name+' megnyitva a térképen.');
}
function paintPins(){
 savedMarkers.forEach(m=>m.remove());
 savedMarkers=[];
 if(!map||!w.maplibregl||!w.maplibregl.Marker)return;
 items.forEach(function(item){
  try{savedMarkers.push(new w.maplibregl.Marker({element:markerNode(item,false),anchor:'bottom'})
   .setLngLat([item.lng,item.lat]).addTo(map));}catch(_){}
 });
}
function renderList(){
 const list=$('guardianLandmarksList');if(!list)return;
 while(list.firstChild)list.removeChild(list.firstChild);
 const empty=$('guardianLandmarksEmpty');if(empty)empty.hidden=items.length>0;
 const count=$('guardianLandmarksCount');if(count)count.textContent=String(items.length);
 items.forEach(function(item){
  const li=d.createElement('li');li.className='guardian-landmark-item';
  const icon=d.createElement('span');icon.className='guardian-landmark-item-icon';icon.textContent=TYPES[item.kind].icon;
  const label=d.createElement('span');label.className='guardian-landmark-item-name';label.textContent=item.name;
  const go=d.createElement('button');go.type='button';go.textContent='Mutasd';
  go.className='guardian-landmark-action';
  go.setAttribute('aria-label',item.name+' megnyitása a térképen');
  go.addEventListener('click',()=>goTo(item));
  const del=d.createElement('button');del.type='button';del.textContent='×';
  del.className='guardian-landmark-delete';
  del.setAttribute('aria-label',item.name+' törlése');
  del.addEventListener('click',function(){
   if(typeof w.confirm==='function'&&!w.confirm('Töröljük ezt a mentett helyet: '+item.name+'?'))return;
   const next=items.filter(i=>i.id!==item.id);
   try{w.localStorage.setItem(KEY,JSON.stringify(next))}catch(_){
    status('A törlés mentése nem sikerült ezen az eszközön.');return;
   }
   items=next;renderList();paintPins();status('Hely törölve.');
  });
  li.appendChild(icon);li.appendChild(label);li.appendChild(go);li.appendChild(del);
  list.appendChild(li);
 });
}
function save(){
 const input=$('guardianLandmarkName');
 const title=input&&input.value?input.value.trim().slice(0,40):'';
 if(!selected){status('Előbb jelölj ki egy helyet a térképen.');return}
 if(!title){status('Adj nevet a mentett helynek.');if(input)input.focus();return}
 if(items.length>=LIMIT){status('Legfeljebb 20 hely menthető ezen a készüléken.');return}
 const record=sanitize({id:Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),
  kind,name:title,lng:selected[0],lat:selected[1]});
 if(!record){status('A helyet nem sikerült ellenőrizni.');return}
 const next=items.concat(record);
 try{w.localStorage.setItem(KEY,JSON.stringify(next))}catch(_){
  status('Nem sikerült elmenteni. Ellenőrizd a böngésző tárhelybeállításait.');return;
 }
 items=next;selected=null;
 if(previewMarker){previewMarker.remove();previewMarker=null}
 const btn=$('guardianLandmarksSave');if(btn)btn.disabled=true;
 stopPicking();renderList();paintPins();
 status(record.name+' elmentve ezen az eszközön.');
}
function selectKind(next){
 if(!TYPES[next])return;
 const input=$('guardianLandmarkName');
 const previous=TYPES[kind].label;
 if(input&&(!input.value.trim()||input.value.trim()===previous))input.value=TYPES[next].label;
 kind=next;
 d.querySelectorAll('[data-guardian-landmark-kind]').forEach(function(button){
  button.setAttribute('aria-pressed',String(button.dataset.guardianLandmarkKind===kind));
 });
 movePreview();
}
function init(loadedMap){
 if(map||!loadedMap)return;
 map=loadedMap;items=load();
 paintPins();renderList();
 const field=$('guardianLandmarkName');if(field)field.value=TYPES[kind].label;
 selectKind(kind);
 const pick=$('guardianLandmarksSelect');
 if(pick)pick.addEventListener('click',function(){
  picking=!picking;
  pick.setAttribute('aria-pressed',String(picking));
  const hint=$('guardianLandmarkHint');if(hint)hint.hidden=!picking;
  if(map.getCanvas)map.getCanvas().style.cursor=picking?'crosshair':'';
  status(picking?'Érintsd meg a térképen a kívánt helyet.':'Kijelölés megszakítva.');
  if(picking){const area=$('guardianMap');if(area&&typeof area.scrollIntoView==='function')area.scrollIntoView({behavior:'smooth',block:'center'});}
 });
 const center=$('guardianLandmarksCenter');
 if(center)center.addEventListener('click',function(){
  const p=map.getCenter();
  setSelected([p.lng,p.lat]);
 });
 const saveButton=$('guardianLandmarksSave');if(saveButton)saveButton.addEventListener('click',save);
 d.querySelectorAll('[data-guardian-landmark-kind]').forEach(function(button){
  button.addEventListener('click',()=>selectKind(button.dataset.guardianLandmarkKind));
 });
 map.on('click',function(evt){
  if(!picking||!evt||!evt.lngLat)return;
  setSelected([evt.lngLat.lng,evt.lngLat.lat]);
 });
 if(items.length)status(items.length+' mentett hely ezen az eszközön.');
 else status('Válassz ikont, majd jelöld ki az első helyet a térképen.');
}
w.HH_GUARDIAN_LANDMARKS_V776=Object.freeze({init});
})(window,document);
