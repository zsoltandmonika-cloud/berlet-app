/* Family Guard v863 · pure, conservative BKK live stop-flow matching.
 * GPS is not proof of vehicle number; stop positions are estimates from GTFS.
 * Never alarm on a single GPS fix, stale position or unknown direction.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_LIVE_FLOW_CORE_V863=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const R=Math.PI/180;
 function distance(a,b){
  if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return Infinity;
  return Math.hypot((a.lat-b.lat)*111195,(a.lng-b.lng)*111195*Math.cos(a.lat*R));
 }
 function project(point,a,b){
  if(!point||!a||!b||![point.lat,point.lng,a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return null;
  const cos=Math.cos(point.lat*R),x1=(a.lng-point.lng)*111195*cos,y1=(a.lat-point.lat)*111195;
  const x2=(b.lng-point.lng)*111195*cos,y2=(b.lat-point.lat)*111195;
  const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;
  if(l2<1)return null;
  const t=Math.max(0,Math.min(1,-(x1*dx+y1*dy)/l2));
  return {fraction:t,distance:Math.hypot(x1+dx*t,y1+dy*t),meters:Math.sqrt(l2)};
 }
 function snap(variant,point){
  if(!variant||!Array.isArray(variant.stops)||variant.stops.length<2)return null;
  let best=null,total=0;
  for(let i=0;i<variant.stops.length-1;i++){
   const piece=project(point,variant.stops[i],variant.stops[i+1]);
   if(piece){
    const p={index:i,fraction:piece.fraction,meters:total+piece.meters*piece.fraction,
     distance:piece.distance,from:variant.stops[i],to:variant.stops[i+1],
     headsign:variant.headsign||'',lineId:variant.id,mode:variant.mode};
    if(!best||p.distance<best.distance)best=p;
    total+=piece.meters;
   }
  }
  return best?{...best,totalMeters:total}:null;
 }
 function isFresh(fix,now=Date.now(),maxAge=20000){
  return !!fix&&Number.isFinite(fix.ts)&&fix.ts<=now+5000&&now-fix.ts<=maxAge&&
   Number.isFinite(fix.lat)&&Number.isFinite(fix.lng)&&
   Math.abs(fix.lat)<=90&&Math.abs(fix.lng)<=180&&
   Number.isFinite(fix.accuracy)&&fix.accuracy>=0&&fix.accuracy<=100;
 }
 function variants(lines,routeId){
  return (Array.isArray(lines)?lines:[]).filter(l=>l&&String(l.id)===String(routeId)&&
   Array.isArray(l.stops)&&l.stops.length>1&&l.stops.every(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng)));
 }
 function match(lines,routeId,fix,previous=null){
  if(!isFresh(fix))return {status:'no-gps',options:[]};
  const maxDistance=Math.max(75,fix.accuracy+38);
  const options=variants(lines,routeId).map((line,index)=>{
   const position=snap(line,fix);
   const before=previous&&isFresh(previous,fix.ts,120000)&&previous.ts<fix.ts-1500&&
    fix.ts-previous.ts<=90000?snap(line,previous):null;
   const meters=before&&position?position.meters-before.meters:null;
   const directionConfirmed=meters!==null&&meters>48&&
    distance(previous,fix)>45&&fix.accuracy<=45&&previous.accuracy<=45&&
    position.distance<maxDistance&&before.distance<maxDistance;
   return {index,line,position,previous:before,meters,directionConfirmed};
  }).filter(o=>o.position&&o.position.distance<=maxDistance)
   .sort((a,b)=>a.position.distance-b.position.distance);
  if(!options.length)return {status:'off-route',options:[]};
  const confident=options.filter(o=>o.directionConfirmed);
  // An automatic choice requires forward movement on one unique variant.
  const auto=confident.length===1&&(
   options.length===1||options.every(o=>o===confident[0]||
    o.position.distance>confident[0].position.distance+45));
  return {status:auto?'direction-confirmed':options.length===1?'near-route':'ambiguous',
   options,auto:auto?confident[0]:null};
 }
 function warningUpdate(prior,selected,fix,previous,now=Date.now()){
  const state={reverse:Math.max(0,prior?.reverse||0),off:Math.max(0,prior?.off||0),
   lastTs:prior?.lastTs||0,alert:null};
  if(!isFresh(fix,now)||fix.accuracy>45||fix.ts<=state.lastTs){
   return {...state,alert:null};
  }
  state.lastTs=fix.ts;
  const snapNow=snap(selected,fix);
  if(!snapNow)return {...state,alert:null};
  const old=previous&&isFresh(previous,fix.ts,90000)&&fix.ts-previous.ts>=3000&&
   fix.ts-previous.ts<=90000&&previous.accuracy<=45?snap(selected,previous):null;
  const motion=previous&&old?distance(previous,fix):0;
  if(motion<45){
   // Waiting at a stop / phone wandering is not a route error.
   return {...state,reverse:0,off:0,alert:null};
  }
  if(snapNow.distance>160){
   state.off++;state.reverse=0;
  }else if(snapNow.distance<=Math.max(70,fix.accuracy+35)&&old&&
    old.distance<=100&&snapNow.meters-old.meters< -55){
   state.reverse++;state.off=0;
  }else{
   state.off=0;state.reverse=0;
  }
  if(state.reverse>=2)state.alert='possible-reverse';
  if(state.off>=3)state.alert='possible-wrong-line';
  return state;
 }
 return {distance,project,snap,isFresh,variants,match,warningUpdate,version:'863'};
});
