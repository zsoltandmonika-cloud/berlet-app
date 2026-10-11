(function(){
'use strict';
/* HealthHub v397 · Ask Léna Golden Stars
 * One-tap, five-star rating after a COMPLETE answer only.
 * Stores rating + response reference, not another copy of personal medical text.
 * Cloud writes use the existing authenticated profile-scoped Health Vault.
 */
var VERSION='397',PREFIX='hh-ask-lena-feedback-v397-',current=null,busy={},timeouts={};
function byId(id){return document.getElementById(id)}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function safeId(s){return typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(s)}
function getRows(p){try{var x=JSON.parse(localStorage.getItem(PREFIX+p)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(e){return{}}}
function storeRows(p,x){try{localStorage.setItem(PREFIX+p,JSON.stringify(x))}catch(e){console.warn('Golden Stars local save',e)}}
function history(){return window.HH_ASK_LENA_HISTORY_V364}
function findId(entry){
 var p=entry.profile,h=history(),list=h&&h.entries?h.entries(p):[];
 if(entry.id&&list.some(function(x){return x.id===entry.id}))return entry.id;
 var hit=list.find(function(x){
  return x.question===String(entry.question||'').slice(0,1200)&&
   x.answer===String(entry.answer||'').slice(0,15000);
 });
 return hit?hit.id:(entry.id||null);
}
function service(){return window.HH_DAILY_HEALTH_SYNC_V319}
function connected(p){
 try{var x=service(),s=x&&x.getStatus&&x.getStatus();
  return !!(x&&x.request&&s&&s.authenticated&&
   (!s.authorizedProfiles||s.authorizedProfiles.includes(p)))}
 catch(e){return false}
}
function mount(){
 var box=byId('hhAi331Answer');if(!box)return null;
 var panel=byId('hhStars397');if(panel)return panel;
 var css=document.createElement('style');css.id='hhStars397Style';
 css.textContent='#hhLenaSmart299 #hhStars397{margin:19px 0 10px;padding:14px 10px 10px;border-top:1px solid var(--lena-border,#d3e3ef);text-align:center;background:transparent}'+
 '#hhLenaSmart299 #hhStars397[hidden]{display:none!important}'+
 '#hhLenaSmart299 #hhStars397 .hhStars397Label{margin:0 0 8px;font:750 13px/1.4 system-ui;color:var(--lena-accent-deep,#285a81)}'+
 '#hhLenaSmart299 #hhStars397 .hhStars397Buttons{display:flex;justify-content:center;align-items:center;gap:3px;flex-wrap:nowrap}'+
 '#hhLenaSmart299 #hhStars397 button{appearance:none;border:0;background:transparent;cursor:pointer;min-width:45px;min-height:49px;padding:4px;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation;color:#aeb7c2;font:normal 37px/1 system-ui;text-shadow:0 1px 2px #00000012;transition:color .15s,transform .15s}'+
 '#hhLenaSmart299 #hhStars397 button[aria-pressed="true"]{color:#eebc38;text-shadow:0 2px 5px #d8941f70}'+
 '#hhLenaSmart299 #hhStars397 button:active{transform:scale(.92)}'+
 '#hhLenaSmart299 #hhStars397 button:focus-visible{outline:3px solid var(--lena-accent,#3d81bd);outline-offset:-2px;border-radius:9px}'+
 '#hhLenaSmart299 #hhStars397 button.hhStarPop397{animation:hhStarPop397 .29s ease-out}'+
 '#hhLenaSmart299 #hhStars397 .hhStars397Status{font:550 11px/1.3 system-ui;color:#687e8d;height:15px;margin-top:4px}'+
 '@keyframes hhStarPop397{35%{transform:scale(1.2);filter:brightness(1.2)}100%{transform:scale(1)}}'+
 '@media(prefers-reduced-motion:reduce){#hhLenaSmart299 #hhStars397 button{transition:none}#hhLenaSmart299 #hhStars397 button.hhStarPop397{animation:none}}'+
 '@media(max-width:355px){#hhLenaSmart299 #hhStars397 button{min-width:42px;padding:2px;font-size:33px}}';
 document.head.appendChild(css);
 panel=document.createElement('div');panel.id='hhStars397';panel.hidden=true;
 panel.setAttribute('aria-label','Ask Léna válaszértékelés');
 var label=document.createElement('p');label.className='hhStars397Label';
 label.textContent='✨ Mennyire volt hasznos Léna válasza?';
 var buttons=document.createElement('div');buttons.className='hhStars397Buttons';
 buttons.setAttribute('role','group');buttons.setAttribute('aria-label','Ötcsillagos értékelés');
 for(var i=1;i<=5;i++){
  var b=document.createElement('button');b.type='button';b.dataset.rating=String(i);
  b.textContent='★';b.setAttribute('aria-label',i+' csillag');
  b.setAttribute('aria-pressed','false');buttons.appendChild(b);
 }
 var status=document.createElement('div');status.className='hhStars397Status';
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 panel.append(label,buttons,status);
 buttons.addEventListener('click',function(ev){
  var button=ev.target.closest('button[data-rating]');
  if(!button||!current||current.profile!==profile())return;
  var stars=Number(button.dataset.rating);if(stars<1||stars>5)return;
  rate(stars);
 });
 var foot=byId('hhAi331Foot');
 if(foot&&foot.parentElement===box)box.insertBefore(panel,foot);
 else box.appendChild(panel);
 return panel;
}
function draw(animate){
 var panel=mount();if(!panel)return;
 var on=!!(current&&current.profile===profile()&&byId('hhAi331Answer').classList.contains('on'));
 panel.hidden=!on;if(!on)return;
 var rating=current.rating||0;
 panel.querySelectorAll('button').forEach(function(b){
  var n=Number(b.dataset.rating);
  b.setAttribute('aria-pressed',n<=rating?'true':'false');
  if(animate){b.classList.remove('hhStarPop397');void b.offsetWidth;if(n<=rating)b.classList.add('hhStarPop397')}
 });
 panel.querySelector('.hhStars397Status').textContent=rating?'✓ Értékelés mentve':'';
}
function chime(){
 try{
  // Only called within a user gesture. No autoplay, no external audio asset.
  var Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  var ctx=new Audio(),t=ctx.currentTime;
  [[880,1450,0,.18,.032],[1400,1950,.075,.17,.014]].forEach(function(v){
   var o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
   o.frequency.setValueAtTime(v[0],t+v[2]);
   o.frequency.exponentialRampToValueAtTime(v[1],t+v[2]+v[3]);
   g.gain.setValueAtTime(.0001,t+v[2]);
   g.gain.exponentialRampToValueAtTime(v[4],t+v[2]+.018);
   g.gain.exponentialRampToValueAtTime(.0001,t+v[2]+v[3]);
   o.connect(g);g.connect(ctx.destination);o.start(t+v[2]);o.stop(t+v[2]+v[3]+.01);
  });
  setTimeout(function(){ctx.close().catch(function(){})},420);
 }catch(e){}
 try{if(navigator.vibrate)navigator.vibrate(9)}catch(e){}
}
function present(entry){
 if(!entry||entry.profile!==profile())return;
 var id=findId(entry)||('local-'+String(entry.generatedAt||Date.now())+'-'+String(entry.question||'').length);
 var rows=getRows(entry.profile);
 current={id:id,profile:entry.profile,rating:rows[id]&&rows[id].stars||0};
 draw(false);sync(entry.profile);
}
function hide(){current=null;var el=byId('hhStars397');if(el)el.hidden=true}
function rate(stars){
 if(!current||current.profile!==profile())return;
 var p=current.profile,id=current.id,all=getRows(p),at=new Date().toISOString();
 all[id]={stars:stars,ratedAt:at,synced:false};storeRows(p,all);
 current.rating=stars;draw(true);chime();
 // The Ask Léna history upload can still be in flight at the moment of tapping.
 schedule(p,1300);schedule(p,5200);
}
function schedule(p,delay){
 var key=p+'-'+delay;clearTimeout(timeouts[key]);timeouts[key]=setTimeout(function(){sync(p)},delay);
}
async function sync(p){
 if(busy[p]||!connected(p))return;
 var api=service();busy[p]=true;
 try{
  var all=getRows(p),hist=history(),known=new Set((hist&&hist.entries?hist.entries(p):[]).map(function(x){return x.id}));
  for(var id of Object.keys(all).filter(function(id){return all[id]&&!all[id].synced&&safeId(id)&&known.has(id)}).slice(0,20)){
   var row=all[id];
   try{
    await api.request('/rest/v1/hh_ask_lena_feedback?on_conflict=response_id,user_id',{
     method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
     data:{response_id:id,profile_key:p,stars:row.stars,rated_at:row.ratedAt}
    });
    var newest=getRows(p);if(newest[id]&&newest[id].ratedAt===row.ratedAt){
     newest[id].synced=true;storeRows(p,newest);
    }
   }catch(e){console.warn('Golden Stars cloud upload deferred',e);break}
  }
  var remote=await api.request('/rest/v1/hh_ask_lena_feedback?select=response_id,profile_key,stars,rated_at&profile_key=eq.'+encodeURIComponent(p)+'&order=rated_at.desc&limit=200',{method:'GET'});
  if(Array.isArray(remote)){
   var merged=getRows(p);
   remote.filter(function(r){return r.profile_key===p&&safeId(r.response_id)&&r.stars>=1&&r.stars<=5})
    .forEach(function(r){
     var old=merged[r.response_id];
     if(!old||old.synced||Date.parse(old.ratedAt||0)<=Date.parse(r.rated_at)){
      merged[r.response_id]={stars:r.stars,ratedAt:r.rated_at,synced:true};
     }
    });
   storeRows(p,merged);
   if(current&&current.profile===p){
    var selected=merged[current.id];current.rating=selected&&selected.stars||0;draw(false);
   }
  }
 }catch(e){console.warn('Golden Stars cloud sync deferred',e)}
 finally{busy[p]=false}
}
// A saved response keeps its own historical rating. Do not rate a stream in progress.
window.addEventListener('healthhub:ask-lena-complete',function(e){
 var d=e&&e.detail;if(!d||!d.successful||!d.answer||d.profile!==profile())return;
 present(d);
});
window.addEventListener('healthhub:profile-changed',function(){hide();sync(profile())});
window.addEventListener('healthhub:central-auth-changed',function(){sync(profile())});
window.addEventListener('healthhub:ask-lena-open',function(){mount();sync(profile())});
document.addEventListener('click',function(e){
 if(e.target.closest&&e.target.closest('#hhRun299'))hide();
},true);
var ai=window.HH_ASK_LENA_AI_V331;
if(ai&&typeof ai.showStoredAnswer==='function'){
 var original=ai.showStoredAnswer;
 ai.showStoredAnswer=function(entry){
  var ok=original.apply(this,arguments);
  if(ok)present(entry);
  return ok;
 };
}
window.HH_ASK_LENA_STARS_V397={version:VERSION,sync:sync,hide:hide};
})();