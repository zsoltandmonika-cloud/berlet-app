(function(){
'use strict';
/* HealthHub v1.296b — Retrieval Engine UI for v295 Research Router */
var STYLE='hh-v296-style';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function style(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '.hhRPrep296{background:#0f6f9a!important;color:#fff!important}.hhRPrep296[disabled]{opacity:.55}'+
 '.hhRProg296{margin-top:10px;background:#eef6fa;border:1px solid #d7e8f0;border-radius:12px;padding:9px 10px;font-size:11px;color:#315d76;line-height:1.45}'+
 '.hhRBar296{height:7px;background:#dce9ef;border-radius:999px;overflow:hidden;margin:6px 0}.hhRBar296>i{display:block;height:100%;background:#0f6f9a;width:0%}'+
 '.hhRDone296{color:#17695f;font-weight:800}.hhRErr296{color:#9a5a28;font-weight:800}';
 document.head.appendChild(s);
}
function ensure(){
 style();
 var m=document.getElementById('hhLenaResearchModal295');if(!m)return;
 var actions=m.querySelector('.hhRActions295');if(!actions)return;
 if(!m.querySelector('#hhRPrep296')){
  var b=document.createElement('button');b.type='button';b.id='hhRPrep296';b.className='hhRPrep296';b.textContent='📚 Források előkészítése';b.style.display='none';b.onclick=prepare;actions.appendChild(b);
 }
 if(!m.querySelector('#hhRProg296')){
  var p=document.createElement('div');p.id='hhRProg296';p.className='hhRProg296';p.style.display='none';
  p.innerHTML='<b>Document Retrieval Engine</b><div class="hhRBar296"><i></i></div><span id="hhRProgText296">Várakozás…</span>';
  actions.insertAdjacentElement('afterend',p);
 }
}
function showButton(){ensure();var b=document.getElementById('hhRPrep296');if(b)b.style.display=''}
function progress(text,pct,cls){
 ensure();var box=document.getElementById('hhRProg296');if(!box)return;box.style.display='';
 var t=box.querySelector('#hhRProgText296'),bar=box.querySelector('.hhRBar296 i');
 if(t){t.className=cls||'';t.textContent=text}
 if(bar)bar.style.width=Math.max(0,Math.min(100,pct||0))+'%';
}
async function prepare(){
 var b=document.getElementById('hhRPrep296');if(!b)return;
 b.disabled=true;b.textContent='📚 Előkészítés…';progress('Drive dokumentumok megnyitása…',3,'');
 try{
  var p=window.hhGetLenaResearch295&&window.hhGetLenaResearch295();if(!p)throw Error('Nincs kutatási terv.');
  var bundle=await window.hhPrepareLenaResearchBundle296(p,true);
  var r=bundle&&bundle.retrieval||{},ok=(r.documents||[]).filter(function(x){return x.status==='ok'}).length,ocr=(r.documents||[]).filter(function(x){return x.needsOcr}).length;
  progress('✅ '+ok+' dokumentum szövege előkészítve · '+(r.totalExtractedChars||0).toLocaleString('hu-HU')+' karakter'+(ocr?' · '+ocr+' OCR-t igényel':''),100,'hhRDone296');
  b.textContent='✅ Forráscsomag kész';
 }catch(e){
  progress('⚠ '+String(e&&e.message||e),100,'hhRErr296');b.textContent='📚 Újrapróbálás';
 }finally{b.disabled=false}
}
window.addEventListener('healthhub:lena-research-routed',function(){setTimeout(showButton,60)});
window.addEventListener('healthhub:lena-retrieval-start',function(e){
 var d=e.detail||{};progress('0 / '+(d.total||0)+' dokumentum · indul…',1,'');
});
window.addEventListener('healthhub:lena-retrieval-progress',function(e){
 var d=e.detail||{},pct=d.total?Math.round((d.index/d.total)*92):20;
 var label=d.index+' / '+d.total+' · '+(d.title||'dokumentum')+' · '+(d.status||'');
 progress(label,pct,d.status==='error'?'hhRErr296':'');
});
window.addEventListener('healthhub:lena-retrieval-complete',function(e){
 var r=e.detail&&e.detail.bundle&&e.detail.bundle.retrieval||{},ok=(r.documents||[]).filter(function(x){return x.status==='ok'}).length;
 progress('✅ '+ok+' eredeti dokumentum előkészítve és Drive-ra mentve.',100,'hhRDone296');
});
window.addEventListener('focus',function(){setTimeout(ensure,200)});
setTimeout(ensure,2100);
document.documentElement.dataset.healthhubLenaRetrievalUi='1.296';
})();