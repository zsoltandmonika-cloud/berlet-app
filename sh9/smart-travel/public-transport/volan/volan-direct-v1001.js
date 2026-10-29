/* SH9 Volán v1001 · direct route context transfer to official MÁVPlusz.
 * This is a route-planning handoff, not a pre-selected trip or booking.
 * URL shape follows the existing MÁV-side route-share pattern and OTP place
 * syntax (label::latitude,longitude). No non-public IDs or invented seats. */
(function(w,d){'use strict';
const SERVICE='https://mavplusz.hu/#/?';
const timeFmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const parts=date=>{const p={};for(const v of timeFmt.formatToParts(date))p[v.type]=v.value;return p};
const validGeo=st=>st&&Number.isFinite(st.lat)&&Number.isFinite(st.lon)&&st.lat>=45.5&&st.lat<=48.8&&st.lon>=16&&st.lon<=23;
function handoff(j,ctx){
 if(!j?.trip?.stops||!ctx?.stopById)return {ok:false,reason:'Hiányzik az ellenőrzött Volán-járat.'};
 const a=ctx.stopById.get(j.trip.stops[j.start]?.[0]),b=ctx.stopById.get(j.trip.stops[j.end]?.[0]);
 if(!validGeo(a)||!validGeo(b))return {ok:false,reason:'A megálló pontos koordinátája nem elérhető a GTFS-ben.'};
 if(!a.name||!b.name)return {ok:false,reason:'Hiányzik a megálló megnevezése.'};
 const departure=new Date(j.depart);
 if(!Number.isFinite(departure.getTime()))return {ok:false,reason:'Nincs érvényes indulási idő.'};
 const p=parts(departure);
 // A route planner typically searches connections departing AT or AFTER a
 // timestamp. Request one minute before the selected service departure.
 const before=new Date(departure.getTime()-60*1000),t=parts(before);
 const fromPlace=a.name+'::'+a.lat.toFixed(6)+','+a.lon.toFixed(6)+(typeof a.id==='string'&&/^hkir_[0-9]+(?:_[0-9]+)?$/.test(a.id)?'::hkir:'+a.id:'');
 const toPlace=b.name+'::'+b.lat.toFixed(6)+','+b.lon.toFixed(6)+(typeof b.id==='string'&&/^hkir_[0-9]+(?:_[0-9]+)?$/.test(b.id)?'::hkir:'+b.id:'');
 const qs=new URLSearchParams({
  ui_itineraryView:'full',
  fromPlace,toPlace,
  date:t.year+'-'+t.month+'-'+t.day,
  time:t.hour+':'+t.minute,
  arriveBy:'false',
  mode:'WALK,TRANSIT',
  showIntermediateStops:'true',
  numItineraries:'15'
 });
 return {ok:true,url:SERVICE+qs.toString(),
  from:a.name,to:b.name,
  selectedTime:p.hour+':'+p.minute,
  date:p.year+'-'+p.month+'-'+p.day,
  warning:'Az útvonal átadása nem jelent konkrét járat- vagy ülőhelyfoglalást. Az MÁVPluszban ellenőrizd a járatot.'};
}
/* Official MÁV-csoport published trip links use the HKIR vehicle key:
 * https://mavplusz.hu/#/trip/hkir:hkir_3770_847-1?ui_activeItinerary=-1
 * Only use the unchanged GTFS trip ID when it has this exact key shape.
 */
function vehicleHandoff(j){
 const id=j?.trip?.id;
 if(typeof id!=='string'||!/^hkir_[0-9]+_[0-9]+-[0-9]+$/.test(id))
  return {ok:false,reason:'Ehhez a GTFS-járathoz nincs ellenőrizhető HKIR formátumú azonosító.'};
 return {ok:true,url:'https://mavplusz.hu/#/trip/hkir:'+id+'?ui_activeItinerary=-1',
  id,kind:'official-hkir-trip-link',
  warning:'Hivatalos járatinfó-oldal. A konkrét jegy vagy helyfoglalás elérhetősége a MÁVPluszban ellenőrizendő.'};
}
function direct(j,ctx){
 const vehicle=vehicleHandoff(j);
 return vehicle.ok?vehicle:handoff(j,ctx);
}
function launch(j,ctx){
 const r=direct(j,ctx);
 if(!r.ok){w.SH9_VOLAN_PLANNER_V3?.toast?.(r.reason);return false}
 // Browser popup only in a direct user gesture.
 const link=d.createElement('a');link.href=r.url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
 link.style.display='none';d.body.append(link);link.click();link.remove();
 return true;
}
w.SH9_VOLAN_DIRECT_V1001=Object.freeze({handoff,vehicleHandoff,direct,launch});
})(window,document);