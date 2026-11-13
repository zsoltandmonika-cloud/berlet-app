/* SHO Smart Match v941 · readable direction label inside the existing green neon countdown ring.
 * Pure formatting: derives direction exclusively from the ACTIVE route template,
 * never from stale 260 timetable metadata, GPS or a different saved route.
 */
function compactPlace(value){
 const place=String(value??"").trim();
 if(!place)return "Hely";
 if(/d[aá]vid/i.test(place)&&/anna/i.test(place))return "Dávidék";
 if(/morgan\s+stanley/i.test(place))return "Morgan";
 if(/\botthon\b|\bhaza\b/i.test(place))return "Otthon";
 if(/munkahely|iroda|b[eé]csi\s*corner/i.test(place))return "Munka";
 const letters=Array.from(place);
 return letters.length<=9?place:letters.slice(0,8).join("")+"…";
}
function ringDirection(item){
 const from=String(item?.originLabel||"Indulás").trim().slice(0,100)||"Indulás";
 const to=String(item?.destinationLabel||"Cél").trim().slice(0,100)||"Cél";
 const shortFrom=compactPlace(from),shortTo=compactPlace(to);
 return Object.freeze({
  full:from+" → "+to,
  short:shortFrom+" →\n"+shortTo,
  from:shortFrom,to:shortTo
 });
}
export {compactPlace,ringDirection};
