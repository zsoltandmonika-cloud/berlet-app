/*
 * SHO V5 Google Routes map-free presentation adapter.
 * Google can return multiple tiny WALK steps for a single pedestrian
 * connection. Combine only ADJACENT WALK steps, never across TRANSIT legs.
 *
 * This is strictly a presentation change. The original Google content
 * is not modified, stored, forwarded to AI or merged into independent GTFS.
 */
export function summarizeGoogleWalks(route) {
 if(!route||!Array.isArray(route.steps)||route.steps.length>45||
  !Number.isFinite(route.durationSeconds)||route.durationSeconds<=0)return null;
 const items=[];
 let totalWalkMeters=0,transitCount=0;
 for(const step of route.steps){
  if(step?.kind==="walk"&&Number.isSafeInteger(step.meters)&&
   step.meters>=0&&step.meters<=30000){
   totalWalkMeters+=step.meters;
   if(items.at(-1)?.kind==="walk"){
    items[items.length-1].meters+=step.meters;
    items[items.length-1].stepCount++;
   }else{
    items.push({kind:"walk",meters:step.meters,stepCount:1});
   }
  }else if(step?.kind==="transit"&&
   typeof step.from==="string"&&step.from&&
   typeof step.to==="string"&&step.to&&
   typeof step.departure==="string"&&typeof step.arrival==="string"){
   transitCount++;
   items.push({kind:"transit",step});
  }else return null; // Never silently drop a Google step.
 }
 if(transitCount<1||totalWalkMeters>1_000_000)return null;
 const marked=items.flatMap((entry,i)=>{
  if(entry.kind!=="walk")return [entry];
  // Zero-metre directions are provider navigation artefacts, not a
  // meaningful pedestrian section. Hide only these zero-length rows;
  // preserve all real walking metres and every transit leg.
  const hasPreviousRide=items.slice(0,i).some(x=>x.kind==="transit");
  const hasNextRide=items.slice(i+1).some(x=>x.kind==="transit");
  const phase=!hasPreviousRide&&hasNextRide?"before_first_ride":
   hasPreviousRide&&hasNextRide?"transfer":
   hasPreviousRide&&!hasNextRide?"after_last_ride":"other";
  return entry.meters===0?[]:[{...entry,phase}];
 });
 const walkSections=marked.filter(x=>x.kind==="walk").length;
 return {items:marked,totalWalkMeters,walkSections,
  transitCount,transfers:Math.max(0,transitCount-1)};
}
export const walkSectionLabel=phase=>({
 before_first_ride:"Séta az első járatig",
 transfer:"Séta átszálláskor",
 after_last_ride:"Séta a célig",
 other:"Séta"
})[phase]||"Séta";
