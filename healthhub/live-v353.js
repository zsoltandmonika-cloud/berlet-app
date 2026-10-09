(function(){
'use strict';
// Ask Léna v353: camera/gallery optional one-time consented photo, no photo persistence.
var selected=null,turn=0;
var PHOTO_PERMISSION_KEY='hh-ask-lena-photo-upload-approved-v1';
function permissionKey(){return PHOTO_PERMISSION_KEY+'-'+profile()}
function permissionGranted(){try{return localStorage.getItem(permissionKey())==='true'}catch(e){return false}}
function askPhotoApproval(){
 if(permissionGranted())return true;
 var yes=window.confirm('📷 Egyszeri engedély az Ask Léna fényképes elemzéséhez\n\nA kifejezetten csatolt fényképeidet a Kutatás gombbal az OpenAI AI-modelljéhez küldjük elemzésre. A képet nem mentjük az előzményekbe vagy a GitHubra.\n\nEzt a jóváhagyást megjegyezzük ehhez a profilhoz és böngészőhöz. Csak a tudatosan csatolt képeket küldjük el. Az engedély a kamera menüjében visszavonható.\n\nEngedélyezed?');
 if(!yes)return false;
 try{localStorage.setItem(permissionKey(),'true')}catch(e){}
 return true;
}
function el(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function ensureCss(){
 if(el('hhLena353Css'))return;
 var s=document.createElement('style');s.id='hhLena353Css';
 s.textContent=[
 '#hhLenaSmart299 #hhLenaComposer340 .hhCamera353{flex:0 0 40px!important;box-sizing:border-box!important;display:grid!important;place-items:center!important;width:40px!important;height:40px!important;border:0!important;border-radius:50%!important;background:transparent!important;color:#64788b!important;padding:0!important;cursor:pointer}',
 '#hhLenaSmart299 #hhLenaComposer340 .hhCamera353 svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.9}',
 '#hhLenaSmart299 #hhLenaComposer340 .hhCamera353[aria-expanded="true"]{background:var(--lena-ui-soft)!important;color:var(--lena-ui)!important}',
 '#hhLenaSmart299 .hhCameraMenu353{margin:8px 0;padding:10px;display:flex;gap:8px;flex-wrap:wrap;border:1px solid var(--lena-ui-border);border-radius:13px;background:#fff}',
 '#hhLenaSmart299 .hhCameraMenu353[hidden]{display:none!important}',
 '#hhLenaSmart299 .hhCameraMenu353 button{flex:1;min-width:135px;padding:10px;border:1px solid var(--lena-ui-border);background:var(--lena-ui-soft);border-radius:10px;color:var(--lena-ui-dark);font:650 13px system-ui;cursor:pointer}',
 '#hhLenaSmart299 .hhCameraReview353{display:flex;align-items:center;gap:11px;margin:9px 0;padding:10px;border:1px solid var(--lena-ui-border);border-radius:14px;background:var(--lena-ui-soft);font-size:12px;color:#284e65;line-height:1.45}',
 '#hhLenaSmart299 .hhCameraReview353[hidden]{display:none!important}',
 '#hhLenaSmart299 .hhCameraReview353 img{width:57px;height:57px;object-fit:cover;border-radius:10px;background:#fff;flex:0 0 57px}',
 '#hhLenaSmart299 .hhCameraReview353 label{display:flex;align-items:flex-start;gap:7px;line-height:1.5;font-size:12px;font-weight:620;color:#294b60;cursor:pointer}',
 '#hhLenaSmart299 .hhCameraReview353 label input{width:17px;height:17px;flex:0 0 17px;accent-color:var(--lena-ui);margin:2px 0 0}',
 '#hhLenaSmart299 .hhCameraReview353 button{border:0;background:#fff;border-radius:9px;font-size:19px;padding:5px 9px;min-width:30px;cursor:pointer;color:#8a5470}',
 '#hhLenaSmart299 .hhCameraReview353 .hhCameraDesc353{font-size:11px;color:#647b8b;margin-top:3px}',
 '#hhLenaSmart299 #hhMicStatus353{font-size:12px;color:var(--lena-ui-dark);margin:5px 9px 8px;line-height:1.45}',
 '#hhLenaSmart299 #hhMicStatus353:not(.on){display:none}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299.hhMicActive353{background:var(--lena-ui)!important;box-shadow:0 0 0 4px var(--lena-ui-soft)!important}',
 '#hhLenaSmart299 .hhCameraFeedback353{display:block;margin:4px 5px 10px;font-size:11px;color:#a24858}',
 '#hhLenaSmart299 .hhCameraFeedback353:empty{display:none}',
 '@media(max-width:360px){#hhLenaSmart299 #hhLenaComposer340 .hhCamera353{width:38px!important;flex-basis:38px!important}}'
 ].join('');
 document.head.appendChild(s);
}
function text(msg){var e=el('hhCameraFeedback353');if(e)e.textContent=msg||''}
function view(){
 var preview=el('hhCameraReview353'),img=el('hhCameraThumb353');
 if(!preview||!img)return;
 preview.hidden=!selected;
 if(selected)img.src='data:image/jpeg;base64,'+selected.base64;
 else img.removeAttribute('src');
}
function clear(){
 turn++;selected=null;
 var menu=el('hhCameraMenu353');if(menu)menu.hidden=true;
 var b=el('hhCameraToggle353');if(b)b.setAttribute('aria-expanded','false');
 text('');view();
}
function compress(file){
 return new Promise(function(resolve,reject){
  if(!file||!/^image\/(jpeg|jpg|png|webp)$/.test(file.type.toLowerCase())){reject(Error('Csak JPEG, PNG vagy WebP képet tudok elemezni.'));return}
  if(file.size>12000000){reject(Error('A kép túl nagy (max. 12 MB).'));return}
  var url=URL.createObjectURL(file),img=new Image();
  img.onload=function(){
   URL.revokeObjectURL(url);
   try{
    var w=img.naturalWidth,h=img.naturalHeight;
    if(!w||!h)throw Error('A kép nem olvasható.');
    var max=1280,scale=Math.min(1,max/Math.max(w,h)),data='';
    for(var attempt=0;attempt<5;attempt++){
     var cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
     var canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;
     var ctx=canvas.getContext('2d');
     if(!ctx)throw Error('A fotó feldolgozása nem támogatott.');
     ctx.drawImage(img,0,0,cw,ch);
     data=canvas.toDataURL('image/jpeg',Math.max(.48,.78-attempt*.07));
     if(data.startsWith('data:image/jpeg;base64,')&&data.length<730000)break;
     scale*=.76;
    }
    if(!data.startsWith('data:image/jpeg;base64,')||data.length>730000)throw Error('A fotót nem sikerült biztonságos méretűre csökkenteni.');
    resolve({mime:'image/jpeg',base64:data.split(',')[1],bytes:Math.floor(data.length*.75),approved:false,profile:profile()});
   }catch(e){reject(e)}
  };
  img.onerror=function(){URL.revokeObjectURL(url);reject(Error('Nem sikerült megnyitni a képet. HEIC helyett készíts JPEG-fotót.'))};
  img.src=url;
 });
}
function takeFile(file){
 var id=++turn;selected=null;view();text('📷 A fotót előkészítem…');
 compress(file).then(function(data){
  if(id!==turn)return;
  if(!askPhotoApproval()){selected=null;view();text('A fotó engedély nélkül nem kerül a kutatásba. A kérdést továbbra is elküldheted.');return}
  selected=data;view();text('');var rev=el('hhCameraReview353');
  if(rev)rev.scrollIntoView({block:'nearest',behavior:'smooth'});
 }).catch(function(e){if(id===turn){selected=null;view();text('⚠️ '+(e.message||'Képhiba'))}});
}
function install(){
 var composer=el('hhLenaComposer340'),mic=el('hhMic299');if(!composer||!mic)return;
 ensureCss();if(el('hhCameraToggle353'))return;
 var toolbar=composer.querySelector('.hhLenaToolbar340');if(!toolbar)return;
 var cam=document.createElement('button');cam.type='button';cam.id='hhCameraToggle353';cam.className='hhCamera353';
 cam.setAttribute('aria-label','Fotó csatolása sérüléshez');cam.setAttribute('title','Kamera vagy galéria');
 cam.setAttribute('aria-expanded','false');
 cam.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7.5h3l1.5-2.5h7L17 7.5h3v12H4z"/><circle cx="12" cy="13.5" r="3.2"/></svg>';
 toolbar.insertBefore(cam,mic);
 var menu=document.createElement('div');menu.className='hhCameraMenu353';menu.id='hhCameraMenu353';menu.hidden=true;
 var take=document.createElement('button');take.type='button';take.textContent='📸 Fotó készítése';
 var gallery=document.createElement('button');gallery.type='button';gallery.textContent='🖼️ Kép kiválasztása';
 var cameraInput=document.createElement('input');cameraInput.type='file';cameraInput.accept='image/jpeg,image/png,image/webp';cameraInput.setAttribute('capture','environment');cameraInput.hidden=true;
 var uploadInput=document.createElement('input');uploadInput.type='file';uploadInput.accept='image/jpeg,image/png,image/webp';uploadInput.hidden=true;
 var revoke=document.createElement('button');revoke.type='button';revoke.textContent='🔒 Fotóengedély visszavonása';revoke.title='Korábbi egyszeri jóváhagyás törlése';
 revoke.onclick=function(){try{localStorage.removeItem(permissionKey())}catch(e){}clear();text('A fényképes elemzés engedélyét visszavontad.');};
 menu.append(take,gallery,revoke,cameraInput,uploadInput);
 composer.insertAdjacentElement('afterend',menu);
 take.onclick=function(){cameraInput.click()};gallery.onclick=function(){uploadInput.click()};
 cameraInput.onchange=function(){var f=cameraInput.files&&cameraInput.files[0];cameraInput.value='';menu.hidden=true;cam.setAttribute('aria-expanded','false');if(f)takeFile(f)};
 uploadInput.onchange=function(){var f=uploadInput.files&&uploadInput.files[0];uploadInput.value='';menu.hidden=true;cam.setAttribute('aria-expanded','false');if(f)takeFile(f)};
 cam.onclick=function(){menu.hidden=!menu.hidden;cam.setAttribute('aria-expanded',String(!menu.hidden))};
 var review=document.createElement('div');review.id='hhCameraReview353';review.className='hhCameraReview353';review.hidden=true;
 var image=document.createElement('img');image.id='hhCameraThumb353';image.alt='Csatolt fotó előnézete';
 var col=document.createElement('div');
 var note=document.createElement('div');note.className='hhCameraDesc353';
 note.textContent='✅ Fotó csatolva. A Kutatás gombbal az AI elemzi; a kép nem kerül a Historyba vagy a GitHubra. Az egyszeri engedély a kamera menüjében visszavonható.';
 col.append(note);
 var remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Fotó eltávolítása';remove.setAttribute('aria-label','Fotó eltávolítása');
 remove.onclick=clear;
 review.append(image,col,remove);menu.insertAdjacentElement('afterend',review);
 var info=document.createElement('div');info.id='hhCameraFeedback353';info.className='hhCameraFeedback353';review.insertAdjacentElement('afterend',info);
 var status=document.createElement('div');status.id='hhMicStatus353';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 info.insertAdjacentElement('afterend',status);
}
window.addEventListener('healthhub:ask-lena-open',install);
window.addEventListener('healthhub:profile-changed',clear);
window.addEventListener('healthhub:ask-lena-complete',function(){clear()});
window.addEventListener('healthhub:mic-status',function(evt){
 var status=evt&&evt.detail&&evt.detail.status||'',msg=evt&&evt.detail&&evt.detail.text||'';
 var out=el('hhMicStatus353'),button=el('hhMic299');if(!out)return;
 out.textContent=msg;out.classList.toggle('on',!!msg&&status!=='stopped');
 if(button)button.classList.toggle('hhMicActive353',status==='listening'||status==='waiting'||status==='retry');
});
window.HH_ASK_LENA_PHOTO_V353={
 get:function(p){
  if(!selected||p!==selected.profile)return null;
  return {mime:'image/jpeg',base64:selected.base64,approved:permissionGranted()};
 },
 clear:clear,
 hasPhoto:function(){return!!selected}, permissionGranted:permissionGranted
};
document.documentElement.dataset.healthhubAskPhoto='353';
})();
