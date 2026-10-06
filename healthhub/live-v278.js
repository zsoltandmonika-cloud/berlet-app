(function(){
'use strict';
/* HealthHub v1.282 — Beurer blue LCD seven-segment recognition + OCR fallback */
var DB='healthhub-healthradar-v2', PAGE='hhWeightPage270', FILE_ID='hhWeightCamera278', LOAD_ID='hhWeightOcrLoad278';
var SCRIPT='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
var busy=false;

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function dec(v){return Number(v).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})}
function median(a){if(!a.length)return null;var x=a.slice().sort(function(a,b){return a-b}),m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function delay(ms){return new Promise(function(ok){setTimeout(ok,ms)})}

async function history(){
 var db=await openDb();try{
  var st=db.transaction('measurements','readonly').objectStore('measurements'),all;
  if(st.indexNames.contains('profile'))all=await reqP(st.index('profile').getAll(pkey()));else all=(await reqP(st.getAll())).filter(function(x){return x.profile===pkey()});
  all=(all||[]).filter(function(x){var w=Number(x.weightKg),t=Date.parse(x.measuredAt||0);return Number.isFinite(t)&&Number.isFinite(w)&&w>=20&&w<=400})
    .sort(function(a,b){return Date.parse(b.measuredAt||0)-Date.parse(a.measuredAt||0)}).slice(0,10);
  var ws=all.map(function(x){return Number(x.weightKg)}),fs=all.map(function(x){return Number(x.bodyFatPercent)}).filter(function(v){return Number.isFinite(v)&&v>=1&&v<=75});
  return {rows:all,weight:median(ws),fat:median(fs)};
 }finally{db.close()}
}
function style(){
 if(document.getElementById('hh-v278-style'))return;
 var s=document.createElement('style');s.id='hh-v278-style';s.textContent=
 '.hhWOcrLoad{display:none;position:fixed;inset:0;z-index:9100;background:#08203399;align-items:flex-end}.hhWOcrLoad.on{display:flex}.hhWOcrLoadCard{width:min(100vw,430px);margin:auto;background:#f8fbfd;border-radius:24px 24px 0 0;padding:17px 16px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -16px 40px rgba(0,0,0,.18);color:#173f62}.hhWOcrLoadCard h3{margin:0 0 4px;font-size:18px}.hhWOcrLoadCard p{margin:0;font-size:9px;line-height:1.5;color:#5e7485}.hhWOcrBar{height:8px;background:#e3edf3;border-radius:99px;overflow:hidden;margin:13px 0 7px}.hhWOcrBar i{display:block;width:4%;height:100%;background:linear-gradient(90deg,var(--a),var(--a2));border-radius:99px;transition:width .18s ease}.hhWOcrPct{text-align:right;font-size:8px;font-weight:850;color:var(--a)}'+
 '.hhWOcrReview{margin:0 0 11px;border:1px solid #dbe8ef;background:#fff;border-radius:15px;padding:10px;box-shadow:0 5px 12px rgba(38,73,99,.04)}.hhWOcrReviewTop{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;align-items:start}.hhWOcrThumb{width:88px;height:88px;border-radius:11px;overflow:hidden;background:#e9f1f5}.hhWOcrThumb img{width:100%;height:100%;object-fit:cover}.hhWOcrMeta b{font-size:11px;display:block}.hhWOcrMeta small{display:block;font-size:8px;color:#6e8495;line-height:1.4;margin-top:3px}.hhWOcrBadge{display:inline-block;margin-top:6px;padding:4px 7px;border-radius:99px;font-size:7.5px;font-weight:900;background:#e8f7ef;color:#24744d}.hhWOcrBadge.warn{background:#fff4db;color:#94620d}.hhWOcrBadge.bad{background:#ffe9ec;color:#9b3c4a}.hhWOcrCheck{margin-top:9px;padding-top:8px;border-top:1px solid #edf2f5;font-size:8px;line-height:1.45;color:#607789}.hhWOcrCheck strong{color:#173f62}.hhWOcrConfirm{display:flex;gap:7px;align-items:flex-start;margin-top:8px;padding:8px;border-radius:10px;background:#fff2f3;color:#8c3b47;font-size:8px;font-weight:750}.hhWOcrAgain{margin-top:8px;width:100%;height:34px;border:1px solid #d9e6ed;background:#f8fbfd;border-radius:10px;color:#45647c;font-size:8px;font-weight:850}.hhWSave:disabled{opacity:.45;filter:grayscale(.5)}';
 document.head.appendChild(s);
}
function loader(){
 style();var o=document.getElementById(LOAD_ID);if(o)return o;
 o=document.createElement('div');o.id=LOAD_ID;o.className='hhWOcrLoad';o.innerHTML='<div class="hhWOcrLoadCard"><h3>📷 Mérleg felismerése</h3><p>A kép feldolgozása helyben történik. Először a számokat keressük, utána összevetjük a korábbi mérésekkel.</p><div class="hhWOcrBar"><i></i></div><div class="hhWOcrPct">Előkészítés…</div></div>';
 document.body.appendChild(o);return o;
}
function setProgress(p,msg){
 var o=loader(),bar=o.querySelector('.hhWOcrBar i'),t=o.querySelector('.hhWOcrPct');
 if(bar)bar.style.width=clamp(Math.round(p),4,100)+'%';if(t)t.textContent=msg||Math.round(p)+'%';
}
function ensureFile(){
 var f=document.getElementById(FILE_ID);if(f)return f;
 f=document.createElement('input');f.id=FILE_ID;f.type='file';f.accept='image/*';f.setAttribute('capture','environment');f.style.display='none';
 f.addEventListener('change',function(){var file=f.files&&f.files[0];f.value='';if(file)processFile(file)});
 document.body.appendChild(f);return f;
}
function loadTesseract(){
 if(window.Tesseract&&window.Tesseract.recognize)return Promise.resolve(window.Tesseract);
 return new Promise(function(ok,no){
  var existing=document.querySelector('script[data-hh-tess278]');
  if(existing){existing.addEventListener('load',function(){window.Tesseract?ok(window.Tesseract):no(new Error('OCR unavailable'))},{once:true});existing.addEventListener('error',no,{once:true});return}
  var s=document.createElement('script');s.src=SCRIPT;s.async=true;s.dataset.hhTess278='1';
  s.onload=function(){window.Tesseract?ok(window.Tesseract):no(new Error('OCR unavailable'))};s.onerror=function(){no(new Error('OCR script load failed'))};document.head.appendChild(s);
 });
}
function readDataUrl(file){return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(r.result)};r.onerror=no;r.readAsDataURL(file)})}
function imageFrom(src){return new Promise(function(ok,no){var im=new Image();im.onload=function(){ok(im)};im.onerror=no;im.src=src})}
async function prep(src){
 var im=await imageFrom(src),max=1400,scale=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*scale)),h=Math.max(1,Math.round(im.naturalHeight*scale));
 var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,w,h);
 var d=g.getImageData(0,0,w,h),p=d.data;
 for(var i=0;i<p.length;i+=4){var y=.299*p[i]+.587*p[i+1]+.114*p[i+2];var v=clamp((y-128)*1.75+128,0,255);p[i]=p[i+1]=p[i+2]=v}
 g.putImageData(d,0,0);return c;
}

function beurerMask(canvas){
 var g=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,d=g.getImageData(0,0,w,h).data;
 var m=new Uint8Array(w*h);
 for(var i=0,p=0;i<d.length;i+=4,p++){
  var r=d[i],gg=d[i+1],b=d[i+2],avg=(r+gg+b)/3;
  if(b>65&&avg>70&&r>b*.18&&gg>b*.52)m[p]=1;
 }
 return {m:m,w:w,h:h};
}
function maskBox(mask,x0,x1){
 var m=mask.m,w=mask.w,h=mask.h,minY=h,maxY=-1,count=0;
 x0=Math.max(0,Math.floor(x0));x1=Math.min(w,Math.ceil(x1));
 for(var y=0;y<h;y++)for(var x=x0;x<x1;x++)if(m[y*w+x]){count++;if(y<minY)minY=y;if(y>maxY)maxY=y}
 return count?{x0:x0,x1:x1,y0:minY,y1:maxY+1,count:count}:null;
}
function zoneFill(mask,box,xa,xb,ya,yb){
 var m=mask.m,w=mask.w,W=box.x1-box.x0,H=box.y1-box.y0;
 var x0=box.x0+Math.floor(W*xa),x1=box.x0+Math.ceil(W*xb),y0=box.y0+Math.floor(H*ya),y1=box.y0+Math.ceil(H*yb),n=0,t=0;
 for(var y=y0;y<y1;y++)for(var x=x0;x<x1;x++){t++;if(m[y*w+x])n++}
 return t?n/t:0;
}
function digitFromBox(mask,box){
 var r=[
  zoneFill(mask,box,.20,.80,.00,.18),
  zoneFill(mask,box,.68,1.00,.12,.48),
  zoneFill(mask,box,.68,1.00,.52,.88),
  zoneFill(mask,box,.20,.80,.82,1.00),
  zoneFill(mask,box,.00,.32,.52,.88),
  zoneFill(mask,box,.00,.32,.12,.48),
  zoneFill(mask,box,.20,.80,.41,.59)
 ];
 var patterns={
  '0':[1,1,1,1,1,1,0],'1':[0,1,1,0,0,0,0],'2':[1,1,0,1,1,0,1],
  '3':[1,1,1,1,0,0,1],'4':[0,1,1,0,0,1,1],'5':[1,0,1,1,0,1,1],
  '6':[1,0,1,1,1,1,1],'7':[1,1,1,0,0,0,0],'8':[1,1,1,1,1,1,1],
  '9':[1,1,1,1,0,1,1]
 };
 var best=null;
 Object.keys(patterns).forEach(function(k){
  var p=patterns[k],loss=0;
  for(var i=0;i<7;i++){
   var target=p[i]?((i===0||i===3)?.45:.62):.08;
   var weight=(i===0||i===3||i===6)?1.05:1;
   loss+=Math.abs(r[i]-target)*weight;
  }
  if(!best||loss<best.loss)best={digit:k,loss:loss,ratios:r};
 });
 var conf=Math.max(0,Math.min(100,100-best.loss/4.2*100));
 return {digit:best.digit,confidence:conf,ratios:r};
}
function beurerSevenSeg(canvas,hist){
 var mask=beurerMask(canvas),w=mask.w,h=mask.h,m=mask.m,col=new Int32Array(w);
 var yLimit=Math.floor(h*.96);
 for(var y=0;y<yLimit;y++)for(var x=0;x<w;x++)if(m[y*w+x])col[x]++;
 var threshold=Math.max(3,Math.floor(h*.035)),runs=[],st=-1;
 for(var x=0;x<=w;x++){
  var on=x<w&&col[x]>threshold;
  if(on&&st<0)st=x;
  if(!on&&st>=0){if(x-st>=3)runs.push([st,x]);st=-1}
 }
 var boxes=[];
 runs.forEach(function(r){
  var b=maskBox(mask,r[0],r[1]);if(!b)return;
  var bw=b.x1-b.x0,bh=b.y1-b.y0;
  if(bh>h*.42&&bw>h*.09&&bw<h*.60)boxes.push(b);
 });
 boxes.sort(function(a,b){return a.x0-b.x0});
 if(!boxes.length||boxes.length>4)return null;
 var digits=[],confs=[];
 boxes.forEach(function(b){var d=digitFromBox(mask,b);digits.push(d.digit);confs.push(d.confidence)});
 var decimal=-1;
 for(var i=0;i<boxes.length-1;i++){
  var gx0=boxes[i].x1,gx1=boxes[i+1].x0;
  if(gx1<=gx0)continue;
  var gy0=Math.floor(h*.52),n=0,total=(gx1-gx0)*(h-gy0);
  for(var yy=gy0;yy<h;yy++)for(var xx=gx0;xx<gx1;xx++)if(m[yy*w+xx])n++;
  if(total&&n/total>.006){decimal=i+1}
 }
 var s=digits.join('');
 if(decimal>0&&decimal<s.length)s=s.slice(0,decimal)+'.'+s.slice(decimal);
 var value=Number(s);
 if(!Number.isFinite(value))return null;
 if(decimal<0&&value>=100&&value<=2000){
  var v10=value/10;
  if((hist.weight!=null&&Math.abs(v10-hist.weight)<Math.abs(value-hist.weight))||
     (hist.fat!=null&&Math.abs(v10-hist.fat)<Math.abs(value-hist.fat)))value=v10;
 }
 var ws=score(value,hist.weight,'w'),fs=score(value,hist.fat,'f'),type=ws>=fs?'w':'f';
 if(ws<-1000&&fs<-1000)return null;
 var confidence=confs.length?confs.reduce(function(a,b){return a+b},0)/confs.length:0;
 return {value:value,type:type,confidence:confidence,digits:digits.join(''),decimal:decimal,weight:type==='w'?value:null,fat:type==='f'?value:null};
}

function sliceForOcr(canvas,top){
 var sx=Math.round(canvas.width*.03),sw=Math.round(canvas.width*.79);
 var sy=top?Math.round(canvas.height*.03):Math.round(canvas.height*.51);
 var sh=Math.round(canvas.height*.45),scale=2;
 var out=document.createElement('canvas');out.width=sw*scale;out.height=sh*scale;
 var g=out.getContext('2d',{alpha:false});g.imageSmoothingEnabled=true;
 g.fillStyle='#fff';g.fillRect(0,0,out.width,out.height);
 g.drawImage(canvas,sx,sy,sw,sh,0,0,out.width,out.height);
 return out;
}
function chooseOne(text,expected,type){
 var c=candidates(text),best=null;
 c.forEach(function(x){var s=score(x.n,expected,type);if(!best||s>best.s)best={v:x.n,s:s,raw:x.raw}});
 return best&&best.s>-1000?best:null;
}
function variants(n){
 var out=[n];
 if(Number.isInteger(n)&&n>=100&&n<=999)out.push(n/10);
 if(Number.isInteger(n)&&n>=1000&&n<=9999)out.push(n/10,n/100);
 return out.filter(function(v,i,a){return Number.isFinite(v)&&a.indexOf(v)===i});
}
function candidates(text){
 var norm=String(text||'').replace(/,/g,'.').replace(/[Oo]/g,'0');
 var m=norm.match(/\d{1,4}(?:\.\d{1,2})?/g)||[],out=[];
 m.forEach(function(s,idx){var n=Number(s);variants(n).forEach(function(v){out.push({raw:s,n:v,idx:idx})})});
 return out;
}
function score(v,expected,type){
 if(type==='w'){
  if(v<20||v>400)return -1e9;
  if(expected!=null)return 100-Math.abs(v-expected)*6;
  return 70-Math.abs(v-80)*.3;
 }
 if(v<1||v>75)return -1e9;
 if(expected!=null)return 100-Math.abs(v-expected)*5;
 return 65-Math.abs(v-28)*.6;
}
function choose(text,h){
 var c=candidates(text),w=null,f=null,wi=-1;
 c.forEach(function(x,i){var s=score(x.n,h.weight,'w');if(!w||s>w.s){w={v:x.n,s:s,raw:x.raw};wi=i}});
 c.forEach(function(x,i){if(i===wi&&c.length>1)return;var s=score(x.n,h.fat,'f');if(!f||s>f.s)f={v:x.n,s:s,raw:x.raw}});
 if(w&&w.s<-1000)w=null;if(f&&f.s<-1000)f=null;
 if(w&&f&&Math.abs(w.v-f.v)<.001&&c.length<2)f=null;
 return {weight:w&&w.v,fat:f&&f.v,raw:text};
}
function guardWeight(v,base){
 if(v==null)return{level:'bad',label:'Testsúly nem felismerhető',detail:'Írd be kézzel a mért testsúlyt.'};
 if(base==null)return{level:'ok',label:'Első használható mérés',detail:'Nincs még elég előzmény az összehasonlításhoz.'};
 var d=Math.abs(v-base),pct=d/base*100;
 if(d<=2.5||pct<=4)return{level:'ok',label:'Testsúly rendben',detail:'Eltérés a közelmúlt mediánjától: '+dec(d)+' kg.'};
 if(d<=6||pct<=8)return{level:'warn',label:'Szokatlan testsúly',detail:'Eltérés a közelmúlt mediánjától: '+dec(d)+' kg. Ellenőrizd mentés előtt.'};
 return{level:'bad',label:'Valószínű OCR-hiba',detail:'A felismert testsúly '+dec(d)+' kg-mal tér el a közelmúlt mediánjától.'};
}
function guardFat(v,base){
 if(v==null)return{level:'warn',label:'Testzsír nem felismerhető',detail:'Ez a mező kézzel megadható vagy üresen hagyható.'};
 if(base==null)return{level:'ok',label:'Testzsír elfogadható',detail:'Nincs még elég előzmény az összehasonlításhoz.'};
 var d=Math.abs(v-base);
 if(d<=4)return{level:'ok',label:'Testzsír rendben',detail:'Eltérés a közelmúlt mediánjától: '+dec(d)+' százalékpont.'};
 if(d<=8)return{level:'warn',label:'Szokatlan testzsír',detail:'Eltérés: '+dec(d)+' százalékpont. Ellenőrizd mentés előtt.'};
 return{level:'bad',label:'Valószínű OCR-hiba',detail:'A felismert testzsír '+dec(d)+' százalékponttal tér el a közelmúlt mediánjától.'};
}
async function openReview(src,res,h,confidence,ocrFailed){
 var page=document.getElementById(PAGE),manual=page&&page.querySelector('[data-act="manual"]');if(!manual)return;
 manual.click();await delay(100);
 var sheet=document.querySelector('#hhWeightSheet270 .hhWSheet'),kg=document.getElementById('hhWKgInput'),fat=document.getElementById('hhWFatInput'),save=sheet&&sheet.querySelector('.hhWSave');
 if(!sheet||!kg||!fat)return;
 if(res.weight!=null)kg.value=String(Math.round(res.weight*10)/10).replace('.',',');
 if(res.fat!=null)fat.value=String(Math.round(res.fat*10)/10).replace('.',',');
 var gw=guardWeight(res.weight,h.weight),gf=guardFat(res.fat,h.fat),severe=gw.level==='bad'||gf.level==='bad';
 var old=sheet.querySelector('.hhWOcrReview');if(old)old.remove();
 var card=document.createElement('div');card.className='hhWOcrReview';
 var conf=Number.isFinite(confidence)?Math.round(confidence):null,overall=ocrFailed?'bad':severe?'bad':(gw.level==='warn'||gf.level==='warn'||(conf!=null&&conf<70))?'warn':'ok';
 var badge=ocrFailed?'OCR nem elérhető':conf==null?'OCR kész':'OCR '+conf+'%';
 card.innerHTML='<div class="hhWOcrReviewTop"><div class="hhWOcrThumb"><img alt="Lefotózott mérleg" src="'+esc(src)+'"></div><div class="hhWOcrMeta"><b>📷 Kamera + OCR · '+esc(pname())+'</b><small>A felismert értékek ellenőrizhetők és javíthatók mentés előtt.</small><span class="hhWOcrBadge '+(overall==='ok'?'':overall)+'">'+esc(badge)+'</span></div></div>'+
 '<div class="hhWOcrCheck"><strong>'+esc(gw.label)+'</strong><br>'+esc(gw.detail)+'<br><strong>'+esc(gf.label)+'</strong><br>'+esc(gf.detail)+(h.weight!=null?'<br>Korábbi súlymedián: <strong>'+esc(dec(h.weight))+' kg</strong>':'')+(h.fat!=null?' · testzsírmedián: <strong>'+esc(dec(h.fat))+'%</strong>':'')+'</div>'+
 (severe?'<label class="hhWOcrConfirm"><input type="checkbox" id="hhWOcrConfirm278"> <span>Az eltérést ellenőriztem, és a fenti értékeket ennek ellenére menteni szeretném.</span></label>':'')+
 '<button class="hhWOcrAgain" type="button">📷 Újrafotózás</button>';
 var form=sheet.querySelector('.hhWForm');sheet.insertBefore(card,form);
 card.querySelector('.hhWOcrAgain').addEventListener('click',function(){document.getElementById('hhWeightSheet270').classList.remove('on');if(typeof window.hhOpenWeightCamera279==='function')window.hhOpenWeightCamera279();else ensureFile().click()});
 if(severe&&save){save.disabled=true;var ck=card.querySelector('#hhWOcrConfirm278');ck.addEventListener('change',function(){save.disabled=!ck.checked})}
 [kg,fat].forEach(function(el){el.addEventListener('input',function(){if(save&&severe)save.disabled=false},{once:true})});
}
async function processSource(src){
 if(busy)return;busy=true;var o=loader();o.classList.add('on');setProgress(5,'Kép előkészítése…');
 var h={weight:null,fat:null},res={weight:null,fat:null},conf=null,failed=false;
 try{
  h=await history();var canvas=await prep(src);
  setProgress(18,'7-szegmenses kijelző elemzése…');
  var seven=beurerSevenSeg(canvas,h);
  if(seven&&seven.confidence>=38){
   res={weight:seven.weight,fat:seven.fat,raw:'7SEG '+seven.digits};
   conf=Math.max(55,seven.confidence);
   setProgress(92,'Előzmények ellenőrzése…');
  }else{
   setProgress(22,'Tartalék OCR betöltése…');
   var T=await loadTesseract();
   setProgress(34,'Kijelző felismerése…');
   var rr=await T.recognize(canvas,'eng',{
    logger:function(m){if(m.status==='recognizing text'){setProgress(34+(Number(m.progress)||0)*50,'OCR · '+Math.round((Number(m.progress)||0)*100)+'%')}},
    tessedit_char_whitelist:'0123456789.,',
    tessedit_pageseg_mode:'7'
   });
   var tx=rr&&rr.data&&rr.data.text||'',one=chooseOne(tx,h.weight,'w'),two=chooseOne(tx,h.fat,'f');
   if(one&&(!two||one.s>=two.s))res={weight:one.v,fat:null,raw:tx};
   else if(two)res={weight:null,fat:two.v,raw:tx};
   conf=rr&&rr.data?Number(rr.data.confidence):null;
   setProgress(92,'Előzmények ellenőrzése…');
  }
 }catch(e){console.warn('Weight OCR experiment',e);failed=true;window.toast&&window.toast('OCR nem sikerült · kézi bevitel használható')}
 finally{
  setProgress(100,'Kész');await delay(180);o.classList.remove('on');busy=false;
  if(src)await openReview(src,res,h,conf,failed);
 }
}
async function processFile(file){
 if(busy)return;var src=await readDataUrl(file);await processSource(src);
}
window.hhWeightOcrProcessSource278=processSource;
window.hhWeightOcrNative278=function(){ensureFile().click()};

function hook(){
 style();ensureFile();var page=document.getElementById(PAGE);if(!page){setTimeout(hook,140);return}
 if(page.dataset.hhOcr278)return;page.dataset.hhOcr278='1';
 page.addEventListener('click',function(e){
   var b=e.target&&e.target.closest&&e.target.closest('[data-act="new"]');if(!b)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(typeof window.hhOpenWeightCamera279==='function')window.hhOpenWeightCamera279();else ensureFile().click();
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
window.addEventListener('healthhub:profile-changed',function(){setTimeout(hook,30)});
document.documentElement.dataset.healthhubWeightOcr='1.282';
})();