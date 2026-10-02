(function(){
'use strict';

/* HealthHub v1.102 — editable personal device library with local image upload */
const DEVICE_DB='healthhub-device-library-v1';
const DEVICE_DB_VERSION=1;
const DEVICE_STORE='devices';

const BUILTIN_DEVICES={
  monika:[{
    id:'device-monika-crtd',
    profile:'monika',
    name:'Medtronic Amplia MRI Quad CRT-D',
    purpose:'Szívritmus monitorozás, reszinkronizációs terápia és szükség esetén defibrilláció.',
    type:'DTMB2QQ · MR-kondicionális',
    implantedAt:'2024-07-15',
    status:'beültetett',
    builtIn:true
  }],
  zsolt:[]
};

let activeImageUrls=[];
let editingDevice=null;
let removeEditingImage=false;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function toastMsg(s){try{window.toast&&window.toast(s)}catch(e){}}
function fmtDate(s){
  if(!s)return '';
  var d=new Date(String(s).indexOf('T')>=0?s:s+'T00:00:00');
  return isNaN(d.getTime())?String(s):new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function openDeviceDb(){
  return new Promise(function(resolve,reject){
    var r=indexedDB.open(DEVICE_DB,DEVICE_DB_VERSION);
    r.onupgradeneeded=function(){
      var db=r.result;
      if(!db.objectStoreNames.contains(DEVICE_STORE)){
        var s=db.createObjectStore(DEVICE_STORE,{keyPath:'id'});
        s.createIndex('profile','profile',{unique:false});
      }
    };
    r.onsuccess=function(){resolve(r.result)};
    r.onerror=function(){reject(r.error)};
  });
}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function allCustom(profile){
  var db=await openDeviceDb();
  try{return await reqP(db.transaction(DEVICE_STORE,'readonly').objectStore(DEVICE_STORE).index('profile').getAll(profile))}
  finally{db.close()}
}
async function getCustom(id){
  var db=await openDeviceDb();
  try{return await reqP(db.transaction(DEVICE_STORE,'readonly').objectStore(DEVICE_STORE).get(id))}
  finally{db.close()}
}
async function putCustom(x){
  var db=await openDeviceDb();
  try{await reqP(db.transaction(DEVICE_STORE,'readwrite').objectStore(DEVICE_STORE).put(x))}
  finally{db.close()}
}
async function deleteCustom(id){
  var db=await openDeviceDb();
  try{await reqP(db.transaction(DEVICE_STORE,'readwrite').objectStore(DEVICE_STORE).delete(id))}
  finally{db.close()}
}
function builtinById(id){
  var all=(BUILTIN_DEVICES.monika||[]).concat(BUILTIN_DEVICES.zsolt||[]);
  return all.find(function(x){return x.id===id})||null;
}
async function devicesFor(profile){
  var base=(BUILTIN_DEVICES[profile]||[]).map(function(x){return Object.assign({},x)});
  var custom=await allCustom(profile), map=new Map();
  base.forEach(function(x){map.set(x.id,x)});
  custom.forEach(function(x){
    var old=map.get(x.id)||{};
    map.set(x.id,Object.assign({},old,x));
  });
  return Array.from(map.values()).filter(function(x){return !x.hidden});
}
async function deviceById(id){
  var custom=await getCustom(id);
  var base=builtinById(id);
  return custom?Object.assign({},base||{},custom):(base?Object.assign({},base):null);
}
function clearImageUrls(){
  activeImageUrls.forEach(function(u){try{URL.revokeObjectURL(u)}catch(e){}});
  activeImageUrls=[];
}
function imageUrl(blob){
  if(!blob)return '';
  try{var u=URL.createObjectURL(blob);activeImageUrls.push(u);return u}catch(e){return ''}
}
function css(){
  if(document.getElementById('hh-device-manager-style'))return;
  var s=document.createElement('style');s.id='hh-device-manager-style';s.textContent=
  '.hhDeviceHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}.hhDeviceHead h3{margin:0}.hhDeviceAddBtn{border:0;border-radius:12px;background:#eaf8f4;color:#17766b;font-size:8px;font-weight:900;padding:8px 10px;white-space:nowrap;box-shadow:inset 0 0 0 1px #d3eee7}.hhDeviceRow{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 0;border-top:1px solid #eef2f5;cursor:pointer}.hhDeviceRow:first-of-type{border-top:0}.hhDeviceThumb{width:40px;height:40px;border-radius:12px;background:#f3ecff;display:grid;place-items:center;overflow:hidden;font-size:20px}.hhDeviceThumb img{width:100%;height:100%;object-fit:cover}.hhDeviceMain{min-width:0}.hhDeviceMain b{display:block;color:#0b2d50;font-size:10px;line-height:1.25}.hhDeviceMain small{display:block;color:#6f8597;font-size:7.5px;line-height:1.35;margin-top:2px;white-space:normal}.hhDevicePurpose{color:#46677f!important}.hhDeviceActions{display:flex;align-items:center;gap:4px}.hhDeviceEdit{border:0;border-radius:10px;background:#f2f7fa;color:#456b85;width:30px;height:30px;display:grid;place-items:center;font-size:14px}.hhDeviceStatus{border-radius:999px;background:#fff0f4;color:#ff3a70;font-size:7px;font-weight:850;padding:4px 7px;white-space:nowrap}.hhDeviceDetailPhoto{width:116px;height:116px;border-radius:22px;object-fit:cover;display:block;margin:4px auto 13px;box-shadow:0 8px 24px rgba(25,63,89,.12)}.hhDeviceForm{display:grid;gap:10px}.hhDeviceForm label{display:grid;gap:4px;font-size:8px;font-weight:850;color:#315c79}.hhDeviceForm input,.hhDeviceForm textarea,.hhDeviceForm select{width:100%;box-sizing:border-box;border:1px solid #dce7ed;border-radius:12px;background:#fff;color:#173f61;padding:10px;font:inherit;font-size:10px;outline:none}.hhDeviceForm textarea{min-height:74px;resize:vertical}.hhDeviceForm input:focus,.hhDeviceForm textarea:focus,.hhDeviceForm select:focus{border-color:#59b6a8;box-shadow:0 0 0 3px rgba(89,182,168,.12)}.hhDevicePhotoPicker{border:1px dashed #bed5df;border-radius:14px;padding:10px;background:#f8fbfc}.hhDevicePreview{width:90px;height:90px;border-radius:16px;object-fit:cover;display:block;margin:0 auto 8px;background:#eef4f7}.hhDeviceFormActions{display:flex;gap:7px;flex-wrap:wrap;margin-top:4px}.hhDeviceFormActions button{border:0;border-radius:12px;padding:9px 12px;font-size:8px;font-weight:900}.hhDeviceSave{background:#26b894;color:#fff}.hhDeviceCancel{background:#eef4f7;color:#456b85}.hhDeviceDelete{background:#fff0f2;color:#d53f62;margin-left:auto}@media(max-width:430px){.hhDeviceAddBtn{font-size:7.5px;padding:7px 9px}.hhDeviceRow{grid-template-columns:42px minmax(0,1fr) auto}.hhDeviceActions{flex-direction:column;align-items:flex-end}}';
  document.head.appendChild(s);
}
function svgEdit(){
  return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
}
async function renderDevices(){
  if(window.healthSectionKind!=='devices')return;
  var root=document.getElementById('healthSubContent');if(!root)return;
  clearImageUrls();
  var profile=pkey(),q=String((document.getElementById('healthSearch')||{}).value||'').trim().toLocaleLowerCase('hu');
  var arr=await devicesFor(profile);
  if(q)arr=arr.filter(function(x){return [x.name,x.purpose,x.type,x.status,x.implantedAt].join(' ').toLocaleLowerCase('hu').includes(q)});
  root.innerHTML='<div class="hrSectionCard"><div class="hhDeviceHead"><h3>⌚ Eszközök</h3><button type="button" class="hhDeviceAddBtn" onclick="hhAddDevice()">＋ Eszköz hozzáadása</button></div>'+
    (arr.length?arr.map(function(x){
      var u=imageUrl(x.imageBlob),sub=[x.type,fmtDate(x.implantedAt)].filter(Boolean).join(' · ');
      return '<div class="hhDeviceRow" onclick="hhOpenDeviceDetail(\''+esc(x.id)+'\')">'+
        '<div class="hhDeviceThumb">'+(u?'<img src="'+esc(u)+'" alt="">':'⌚')+'</div>'+
        '<div class="hhDeviceMain"><b>'+esc(x.name||'Névtelen eszköz')+'</b>'+
          (sub?'<small>'+esc(sub)+'</small>':'')+
          (x.purpose?'<small class="hhDevicePurpose">'+esc(x.purpose)+'</small>':'')+
        '</div>'+
        '<div class="hhDeviceActions">'+(x.status?'<span class="hhDeviceStatus">'+esc(x.status)+'</span>':'')+
          '<button type="button" class="hhDeviceEdit" title="Szerkesztés" aria-label="Eszköz szerkesztése" onclick="event.stopPropagation();hhEditDevice(\''+esc(x.id)+'\')">'+svgEdit()+'</button>'+
        '</div>'+
      '</div>';
    }).join(''):'<div class="hrEmpty">Nincs találat. A ＋ gombbal kézzel is hozzáadhatsz eszközt.</div>')+
  '</div>';
}
async function prepareImage(file){
  if(!file)return null;
  if(!String(file.type||'').startsWith('image/'))throw new Error('Csak képfájl tölthető fel.');
  if(file.size>20*1024*1024)throw new Error('A kép túl nagy. Maximum 20 MB lehet.');
  var url=URL.createObjectURL(file);
  try{
    var img=new Image();
    await new Promise(function(ok,no){img.onload=ok;img.onerror=no;img.src=url});
    var max=1280,w=img.naturalWidth||1,h=img.naturalHeight||1,scale=Math.min(1,max/Math.max(w,h));
    var cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
    var canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;
    var ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,cw,ch);ctx.drawImage(img,0,0,cw,ch);
    var blob=await new Promise(function(ok){canvas.toBlob(ok,'image/jpeg',0.86)});
    return blob||file;
  }finally{URL.revokeObjectURL(url)}
}
function formHtml(x,isNew){
  var u=x&&x.imageBlob?imageUrl(x.imageBlob):'';
  return '<h2>'+(isNew?'Új eszköz':'Eszköz szerkesztése')+'</h2>'+
    '<div class="hrDetailMeta">'+(pkey()==='monika'?'Mónika':'Zsolt')+' · helyi privát adat</div>'+
    '<div class="hhDeviceForm">'+
      '<label>Eszköz neve<input id="hhDeviceName" maxlength="140" value="'+esc(x&&x.name||'')+'" placeholder="pl. Omron M7 Intelli IT"></label>'+
      '<label>Funkció<textarea id="hhDevicePurpose" maxlength="800" placeholder="Mire használjátok?">'+esc(x&&x.purpose||'')+'</textarea></label>'+
      '<label>Típus / modell<input id="hhDeviceType" maxlength="160" value="'+esc(x&&x.type||'')+'" placeholder="opcionális"></label>'+
      '<label>Beüzemelés / beültetés dátuma<input id="hhDeviceDate" type="date" value="'+esc(x&&x.implantedAt||'')+'"></label>'+
      '<label>Státusz<input id="hhDeviceStatus" maxlength="80" value="'+esc(x&&x.status||'')+'" placeholder="pl. aktív / beültetett"></label>'+
      '<div class="hhDevicePhotoPicker"><label>Kép feltöltése<input id="hhDeviceImage" type="file" accept="image/*"></label>'+
        '<img id="hhDevicePreview" class="hhDevicePreview" '+(u?'src="'+esc(u)+'"':'style="display:none"')+' alt="Eszköz előnézet">'+
        '<button id="hhDeviceRemoveImage" type="button" class="hhDeviceCancel" style="border:0;border-radius:10px;padding:7px 9px;font-size:8px;font-weight:850;'+(u?'':'display:none')+'" onclick="hhRemoveDeviceImage()">Kép eltávolítása</button>'+
      '</div>'+
      '<div class="hhDeviceFormActions"><button type="button" class="hhDeviceSave" onclick="hhSaveDevice()">Mentés</button><button type="button" class="hhDeviceCancel" onclick="hhCancelDeviceEdit()">Mégse</button>'+
        (!isNew&&!x.builtIn?'<button type="button" class="hhDeviceDelete" onclick="hhDeleteDevice()">Törlés</button>':'')+
      '</div>'+
    '</div>';
}
function bindImagePreview(){
  var input=document.getElementById('hhDeviceImage');if(!input)return;
  input.onchange=function(){
    var f=input.files&&input.files[0];if(!f)return;
    if(!String(f.type||'').startsWith('image/')){toastMsg('Csak képfájl tölthető fel.');input.value='';return}
    var img=document.getElementById('hhDevicePreview'),rm=document.getElementById('hhDeviceRemoveImage');
    var u=URL.createObjectURL(f);activeImageUrls.push(u);img.src=u;img.style.display='block';if(rm)rm.style.display='';
    removeEditingImage=false;
  };
}
window.hhAddDevice=function(){
  editingDevice={id:'device-'+pkey()+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),profile:pkey(),name:'',purpose:'',type:'',implantedAt:'',status:'aktív',builtIn:false};
  removeEditingImage=false;
  var c=document.getElementById('hrDetailContent'),o=document.getElementById('hrDetailOverlay');if(!c||!o)return;
  c.innerHTML=formHtml(editingDevice,true);o.classList.add('on');bindImagePreview();
};
window.hhEditDevice=async function(id){
  var x=await deviceById(id);if(!x)return;
  editingDevice=x;removeEditingImage=false;
  var c=document.getElementById('hrDetailContent'),o=document.getElementById('hrDetailOverlay');if(!c||!o)return;
  c.innerHTML=formHtml(x,false);o.classList.add('on');bindImagePreview();
};
window.hhOpenDeviceDetail=async function(id){
  var x=await deviceById(id);if(!x)return;
  var c=document.getElementById('hrDetailContent'),o=document.getElementById('hrDetailOverlay');if(!c||!o)return;
  var u=imageUrl(x.imageBlob);
  c.innerHTML=(u?'<img class="hhDeviceDetailPhoto" src="'+esc(u)+'" alt="'+esc(x.name||'Eszköz')+'">':'')+
    '<h2>'+esc(x.name||'Eszköz')+'</h2>'+
    '<div class="hrDetailMeta">'+esc(x.type||'')+'</div>'+
    (x.purpose?'<h4>Funkció</h4><p>'+esc(x.purpose)+'</p>':'')+
    '<div class="hrStatGrid"><div class="hrStat"><small>Dátum</small><b style="font-size:11px">'+esc(fmtDate(x.implantedAt)||'—')+'</b></div><div class="hrStat"><small>Státusz</small><b style="font-size:11px">'+esc(x.status||'—')+'</b></div></div>'+
    '<div class="vaultTools"><button class="vaultBtn primary" onclick="hhEditDevice(\''+esc(x.id)+'\')">Szerkesztés</button></div>';
  o.classList.add('on');
};
window.hhRemoveDeviceImage=function(){
  removeEditingImage=true;
  var input=document.getElementById('hhDeviceImage');if(input)input.value='';
  var img=document.getElementById('hhDevicePreview');if(img){img.removeAttribute('src');img.style.display='none'}
  var b=document.getElementById('hhDeviceRemoveImage');if(b)b.style.display='none';
};
window.hhSaveDevice=async function(){
  if(!editingDevice)return;
  var name=String(document.getElementById('hhDeviceName')?.value||'').trim();
  if(!name){toastMsg('Az eszköz neve szükséges.');return}
  try{
    var x=Object.assign({},editingDevice,{
      profile:pkey(),
      name:name,
      purpose:String(document.getElementById('hhDevicePurpose')?.value||'').trim(),
      type:String(document.getElementById('hhDeviceType')?.value||'').trim(),
      implantedAt:String(document.getElementById('hhDeviceDate')?.value||''),
      status:String(document.getElementById('hhDeviceStatus')?.value||'').trim(),
      updatedAt:new Date().toISOString()
    });
    var f=document.getElementById('hhDeviceImage')?.files?.[0];
    if(removeEditingImage)delete x.imageBlob;
    else if(f)x.imageBlob=await prepareImage(f);
    await putCustom(x);
    editingDevice=null;removeEditingImage=false;
    document.getElementById('hrDetailOverlay')?.classList.remove('on');
    toastMsg('Eszköz mentve');
    await window.renderHealthSection();
  }catch(e){console.error(e);toastMsg('Az eszköz nem menthető: '+(e.message||e))}
};
window.hhCancelDeviceEdit=function(){
  editingDevice=null;removeEditingImage=false;document.getElementById('hrDetailOverlay')?.classList.remove('on');
};
window.hhDeleteDevice=async function(){
  if(!editingDevice||editingDevice.builtIn)return;
  if(!confirm('Biztosan törlöd ezt az eszközt?'))return;
  try{
    await deleteCustom(editingDevice.id);editingDevice=null;
    document.getElementById('hrDetailOverlay')?.classList.remove('on');
    toastMsg('Eszköz törölve');await window.renderHealthSection();
  }catch(e){toastMsg('Az eszköz nem törölhető.')}
};

css();
var previousRender=window.renderHealthSection;
if(typeof previousRender==='function'){
  window.renderHealthSection=async function(){
    var r=await previousRender.apply(this,arguments);
    if(window.healthSectionKind==='devices')await renderDevices();
    return r;
  };
}
setTimeout(function(){if(window.healthSectionKind==='devices')renderDevices()},120);
document.documentElement.dataset.healthhubDeviceManager='1.102';
window.HH_LIVE_BUILD='v1.102-device-manager';
})();