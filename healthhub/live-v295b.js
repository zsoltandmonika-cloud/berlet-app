(function(){
'use strict';
/* HealthHub v1.295b — Research Router tester UI */
var MID='hhLenaResearchModal295',SID='hh-v295-style';
function pk(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pn(p){return p==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function style(){
 if(document.getElementById(SID))return;
 var s=document.createElement('style');s.id=SID;s.textContent=
 '.hhResearchBtn295{margin-top:8px;border:0;border-radius:10px;padding:8px 10px;background:#1b7f73;color:#fff;font-size:8px;font-weight:900;cursor:pointer}'+
 '#'+MID+'{position:fixed;inset:0;z-index:100050;background:rgba(10,27,39,.58);display:none;align-items:flex-end;justify-content:center}'+
 '#'+MID+'.on{display:flex}.hhRSheet295{width:min(760px,100%);max-height:92vh;overflow:auto;background:#f8fbfc;border-radius:24px 24px 0 0;padding:16px 14px 26px;box-sizing:border-box;box-shadow:0 -16px 44px rgba(0,0,0,.2)}'+
 '.hhRHead295{display:flex;gap:10px;align-items:flex-start}.hhRHead295 h2{font-size:18px;color:#173f62;margin:0}.hhRHead295 small{color:#7d8e9b}.hhRX295{margin-left:auto;border:0;background:#e8eff3;border-radius:999px;width:32px;height:32px;font-weight:900}'+
 '.hhRQ295{width:100%;min-height:90px;resize:vertical;border:1px solid #cfdde5;border-radius:14px;padding:11px;box-sizing:border-box;font:inherit;margin-top:12px;background:#fff;color:#173f62}'+
 '.hhRActions295{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.hhRActions295 button{border:0;border-radius:10px;padding:9px 11px;font-weight:800;font-size:12px}.hhRGo295{background:#1b7f73;color:white}.hhRDrive295{background:#6c4fc4;color:white}.hhRBox295{margin-top:12px;background:white;border:1px solid #e0e9ee;border-radius:14px;padding:11px;color:#284c67;font-size:12px;line-height:1.48}.hhRDoc295{padding:7px 0;border-top:1px solid #edf2f5}.hhRDoc295:first-child{border-top:0}.hhRPill295{display:inline-block;background:#e8f5f3;color:#17695f;border-radius:999px;padding:3px 7px;margin:2px;font-size:10px;font-weight:800}';
 document.head.appendChild(s);
}
function modal(){
 style();var o=document.getElementById(MID);if(o)return o;
 o=document.createElement('div');o.id=MID;
 o.innerHTML='<div class="hhRSheet295"><div class="hhRHead295"><div><h2>🧠 Léna Research Router · v295</h2><small>Kérdés → profil → időszak → források → releváns leletek</small></div><button class="hhRX295" type="button">×</button></div><textarea id="hhRQ295" class="hhRQ295" placeholder="Pl. Mónika miért emlékszik olyan kevésre az intenzív osztályról?"></textarea><div class="hhRActions295"><button type="button" class="hhRGo295" id="hhRGo295">Kutatási terv készítése</button><button type="button" class="hhRDrive295" id="hhRDrive295" style="display:none">Terv mentése Drive-ra</button></div><div id="hhROut295"></div></div>';
 document.body.appendChild(o);
 o.querySelector('.hhRX295').onclick=function(){o.classList.remove('on')};
 o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('on')});
 o.querySelector('#hhRGo295').onclick=route;
 o.querySelector('#hhRDrive295').onclick=saveDrive;
 return o;
}
function out(p){
 var d=document.getElementById('hhROut295');if(!d)return;
 var ds=(p.route.domains||[]).map(function(x){return'<span class="hhRPill295">'+esc(x.label)+'</span>'}).join('')||'<span class="hhRPill295">általános egészség</span>';
 var src=(p.route.sources||[]).map(function(x){return'<span class="hhRPill295">'+esc(x)+'</span>'}).join('');
 var docs=p.route.candidateDocuments||[];
 d.innerHTML='<div class="hhRBox295"><b>Profil:</b> '+esc(p.profileName)+'<br><b>Időszak:</b> '+esc(p.route.timeframe.label)+'<br><b>Témák:</b><div>'+ds+'</div><b>Adatforrások:</b><div>'+src+'</div><br><b>Jelölt eredeti leletek: '+docs.length+'</b>'+
 (docs.length?docs.map(function(x,i){return'<div class="hhRDoc295"><b>'+(i+1)+'. '+esc(x.title)+'</b><br><span>'+esc(x.date||'dátum nélkül')+' · '+esc(x.category)+' · score '+x.score+(x.driveArchive&&x.driveArchive.fileId?' · ☁ Drive':'')+'</span></div>'}).join(''):'<div class="hhRDoc295">Ehhez a kérdéshez a router nem talált erős dokumentum-jelöltet.</div>')+
 '</div>';
 document.getElementById('hhRDrive295').style.display='';
}
function route(){
 try{
  var q=(document.getElementById('hhRQ295').value||'').trim();
  var p=window.hhRouteLenaResearch295(q,pk());out(p);
 }catch(e){document.getElementById('hhROut295').innerHTML='<div class="hhRBox295">⚠ '+esc(e.message||e)+'</div>'}
}
async function saveDrive(){
 var b=document.getElementById('hhRDrive295'),old=b.textContent;b.disabled=true;b.textContent='Mentés…';
 try{
  var p=window.hhGetLenaResearch295&&window.hhGetLenaResearch295();if(!p)throw Error('Előbb készíts kutatási tervet.');
  await window.hhMirrorLenaResearch295(p,true);b.textContent='✅ Drive-on';
 }catch(e){b.textContent='⚠ '+String(e.message||e).slice(0,45)}
 setTimeout(function(){b.disabled=false;b.textContent=old},2200);
}
function open(){var o=modal();o.classList.add('on');var q=o.querySelector('#hhRQ295');setTimeout(function(){q.focus()},120)}
function decorate(){
 style();var host=document.getElementById('hhLenaCtx289');if(!host)return;
 if(host.querySelector('.hhResearchBtn295'))return;
 var b=document.createElement('button');b.type='button';b.className='hhResearchBtn295';b.textContent='🧠 Research Router teszt';b.onclick=open;host.appendChild(b);
}
window.hhOpenLenaResearch295=open;
window.addEventListener('healthhub:lena-context-updated',function(){setTimeout(decorate,140)});
window.addEventListener('healthhub:profile-changed',function(){setTimeout(decorate,160)});
window.addEventListener('focus',function(){setTimeout(decorate,200)});
try{if(typeof window.renderHealthSection==='function'&&!window.renderHealthSection.__research295){var old=window.renderHealthSection;var w=async function(){var r=await old.apply(this,arguments);setTimeout(decorate,100);return r};w.__research295=true;window.renderHealthSection=w}}catch(e){}
setTimeout(decorate,1900);
document.documentElement.dataset.healthhubLenaResearchUi='1.295';
})();