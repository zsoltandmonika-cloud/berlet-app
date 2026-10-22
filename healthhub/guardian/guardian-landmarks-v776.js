/* Family Guard v776/v787 - private bookmarks stay local; shared places use opt-in cloud. */
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
let map=null,items=[],shared=[],bridge=null,savedMarkers=[],previewMarker=null,picking=false,selected=null,kind='home';
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
function paintIcon(el,kind){
 const iconKit=w.HH_GUARDIAN_ICONS_V784;
 // Preserve the original category data and an emoji fallback when the optional
 // vector icon module is unavailable (e.g. offline).
 if(!iconKit||!iconKit.draw(el,kind))el.textContent=TYPES[kind].icon;
}
function markerNode(entry,temporary){
 const el=d.createElement('button');
 el.type='button';
 el.className='guardian-landmark-pin'+(temporary?' is-preview':'');
 paintIcon(el,entry.kind);
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
 items.concat(shared).forEach(function(item){
  try{savedMarkers.push(new w.maplibregl.Marker({element:markerNode(item,false),anchor:'bottom'})
   .setLngLat([item.lng,item.lat]).addTo(map));}catch(_){}
 });
}
function renderList(){
 const list=$('guardianLandmarksList');if(!list)return;
 while(list.firstChild)list.removeChild(list.firstChild);
 const empty=$('guardianLandmarksEmpty');if(empty)empty.hidden=items.length+shared.length>0;
 const count=$('guardianLandmarksCount');if(count)count.textContent=String(items.length+shared.length);
 items.forEach(function(item){
  const li=d.createElement('li');li.className='guardian-landmark-item';
  const icon=d.createElement('span');icon.className='guardian-landmark-item-icon';paintIcon(icon,item.kind);
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
  const tag=d.createElement('span');tag.className='guardian-landmark-scope';tag.textContent='🔒 Privát';
  li.appendChild(icon);li.appendChild(label);li.appendChild(go);li.appendChild(del);li.appendChild(tag);
  if(bridge){
   const share=d.createElement('button');share.type='button';share.textContent='⇧ Közössé';
   share.className='guardian-landmark-action';share.setAttribute('aria-label',item.name+' megosztása a családdal');
   share.addEventListener('click',function(){
    if(typeof w.confirm==='function'&&!w.confirm('Megosztod ezt a helyet Mónikával és Zsolttal?\\n\\nA hely neve és pontos koordinátái a családi felhőbe kerülnek.'))return;
    try{
     bridge.create(item); // durable queue before changing the private record
     const next=items.filter(i=>i.id!==item.id);
     w.localStorage.setItem(KEY,JSON.stringify(next));
     items=next;renderList();paintPins();
     status(item.name+' · közös szinkron sorba állítva.');
    }catch(e){status('Nem sikerült megosztani. A privát hely megmaradt: '+(e&&e.message||'hiba'))}
   });
   li.appendChild(share);
  }
  list.appendChild(li);
 });
 shared.forEach(function(item){
  const li=d.createElement('li');li.className='guardian-landmark-item';
  const icon=d.createElement('span');icon.className='guardian-landmark-item-icon';paintIcon(icon,item.kind);
  const label=d.createElement('span');label.className='guardian-landmark-item-name';label.textContent=item.name;
  const tag=d.createElement('span');tag.className='guardian-landmark-scope';tag.textContent='☁ Közös';
  const go=d.createElement('button');go.type='button';go.textContent='Mutasd';go.className='guardian-landmark-action';
  go.addEventListener('click',()=>goTo(item));
  const del=d.createElement('button');del.type='button';del.textContent='×';del.className='guardian-landmark-delete';
  del.setAttribute('aria-label',item.name+' törlése a közös helyek közül');
  del.addEventListener('click',function(){
   if(typeof w.confirm==='function'&&!w.confirm('Töröljük ezt a közös helyet mindkét telefonról?\\n\\n'+item.name))return;
   try{if(!bridge)throw Error('A szinkron nem elérhető');bridge.remove(item.id);
    shared=shared.filter(i=>i.id!==item.id);renderList();paintPins();status('Közös hely törlése sorba állítva.');
   }catch(e){status('A törlést nem sikerült eltárolni: '+(e&&e.message||'hiba'))}
  });
  li.appendChild(icon);li.appendChild(label);li.appendChild(tag);li.appendChild(go);li.appendChild(del);list.appendChild(li);
 });
}
function save(){
 const input=$('guardianLandmarkName');
 const title=input&&input.value?input.value.trim().slice(0,40):'';
 if(!selected){status('Előbb jelölj ki egy helyet a térképen.');return}
 if(!title){status('Adj nevet a mentett helynek.');if(input)input.focus();return}
 if(items.length>=LIMIT&&(!($('guardianLandmarkScope')&&$('guardianLandmarkScope').value==='shared'))){status('Legfeljebb 20 privát hely menthető ezen a készüléken.');return}
 const record=sanitize({id:Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),
  kind,name:title,lng:selected[0],lat:selected[1]});
 if(!record){status('A helyet nem sikerült ellenőrizni.');return}
 const scope=$('guardianLandmarkScope');const common=scope&&scope.value==='shared';
 if(common){try{if(!bridge)throw Error('Jelentkezz be a családi fiókba');bridge.create(record)}catch(e){status('Közös mentés sikertelen: '+(e&&e.message||'hiba'));return}}
 const next=items.concat(record);
 if(!common){
  try{w.localStorage.setItem(KEY,JSON.stringify(next))}catch(_){
   status('Nem sikerült elmenteni. Ellenőrizd a böngésző tárhelybeállításait.');return;
  }
  items=next;
 }
 selected=null;
 if(previewMarker){previewMarker.remove();previewMarker=null}
 const btn=$('guardianLandmarksSave');if(btn)btn.disabled=true;
 stopPicking();renderList();paintPins();
 status(common?record.name+' · felhőszinkron sorba állítva.':record.name+' · privát hely ezen az eszközön.');
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
 if(w.HH_GUARDIAN_ICONS_V784)w.HH_GUARDIAN_ICONS_V784.decoratePicker();
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
w.HH_GUARDIAN_LANDMARKS_V776=Object.freeze({
 init,
 setBridge(next){bridge=next;if(map)renderList()},
 setSharedEntries(rows){shared=Array.isArray(rows)?rows.map(sanitize).filter(Boolean).slice(0,200):[];if(map){renderList();paintPins()}},
 get privateCount(){return items.length},get sharedCount(){return shared.length}
});
})(window,document);
