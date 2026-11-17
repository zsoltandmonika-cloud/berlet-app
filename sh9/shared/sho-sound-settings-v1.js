/* SHO Sound Studio V1 · local per-profile/device audio preferences.
 * Exactly three connected channels: Smart Match, Shopping, Notifications.
 * All defaults = 100% so existing Golden Standard audio stays identical
 * until the user explicitly changes a setting. No server, auth, GPS or data.
 */
(function(w,d){
 "use strict";
 if(w.SHO_SOUND_STUDIO_V1)return;
 const PREFIX="sho-sound-studio-v1:";
 const MODULES=["match","shopping","notifications"];
 const DEFAULT=()=>({v:1,master:100,muted:false,levels:{match:100,shopping:100,notifications:100}});
 let ctx=null;
 const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value))));
 const cleanValue=(value,fallback)=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))?clamp(value):fallback;
 function profile(){
  let q=null;
  try{q=new URLSearchParams(w.location.search).get("profile")}catch(_){}
  const candidate=q||d.body?.dataset?.smartMatchProfile||d.documentElement?.dataset?.guardianProfile;
  if(candidate==="m"||candidate==="monika")return "m";
  if(candidate==="z"||candidate==="zsolt")return "z";
  try{return w.localStorage?.getItem("hh-profile")==="m"?"m":"z"}catch(_){return "z"}
 }
 function key(){return PREFIX+profile()}
 function get(){
  const fallback=DEFAULT();
  try{
   const raw=JSON.parse(w.localStorage.getItem(key())||"null");
   if(!raw||raw.v!==1||typeof raw!=="object"||Array.isArray(raw))return fallback;
   const levels={};
   for(const name of MODULES)levels[name]=cleanValue(raw.levels?.[name],100);
   return {v:1,master:cleanValue(raw.master,100),muted:raw.muted===true,levels};
  }catch(_){return fallback}
 }
 function save(settings){
  try{
   const val={v:1,master:cleanValue(settings.master,100),muted:settings.muted===true,levels:{}};
   for(const name of MODULES)val.levels[name]=cleanValue(settings.levels?.[name],100);
   w.localStorage.setItem(key(),JSON.stringify(val));
   return w.localStorage.getItem(key())===JSON.stringify(val);
  }catch(_){return false}
 }
 function change(field,value){
  const next=get();
  if(field==="master")next.master=cleanValue(value,next.master);
  else if(field==="muted")next.muted=value===true;
  else if(MODULES.includes(field))next.levels[field]=cleanValue(value,next.levels[field]);
  else return false;
  return save(next);
 }
 function volume(name){
  if(!MODULES.includes(name))return 1; // unconnected sounds unchanged
  const s=get();
  return s.muted?0:(s.master/100)*(s.levels[name]/100);
 }
 function tone(frequency,offset,duration,peak,shape,fallTo){
  const t=ctx.currentTime+offset;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=shape;
  o.frequency.setValueAtTime(frequency,t);
  o.frequency.exponentialRampToValueAtTime(fallTo||frequency*.99,t+duration*.7);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.00011,peak),t+.005);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(ctx.destination);
  o.start(t);o.stop(t+duration+.004);
  o.onended=()=>{try{o.disconnect();g.disconnect()}catch(_){}};
 }
 function preview(name){
  if(!MODULES.includes(name)||d.hidden)return false;
  const level=volume(name);
  if(level<=0)return false;
  try{
   if(!ctx){const AC=w.AudioContext||w.webkitAudioContext;if(!AC)return false;ctx=new AC()}
   if(ctx.state==="suspended")void ctx.resume().catch(()=>{});
   if(ctx.state!=="running")return false;
   if(name==="match")tone(730,0,.046,.016*level,"triangle",340);
   if(name==="shopping")tone(820,0,.05,.028*level,"sine",610);
   if(name==="notifications"){
    tone(988,0,.16,.012*level,"sine");
    tone(1318,.055,.22,.005*level,"sine");
   }
   return true;
  }catch(_){return false}
 }
 w.SHO_SOUND_STUDIO_V1=Object.freeze({
  version:1,modules:Object.freeze([...MODULES]),
  profile,get,volume,change,reset:()=>save(DEFAULT()),preview
 });
})(window,document);
