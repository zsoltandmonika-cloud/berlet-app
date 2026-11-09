/*
 * SHO V5 provider presentation and official checkout handoff.
 * No payment integration, direct journey booking, GTFS inference,
 * Google response mutation or Google-to-AI transfer.
 * Checked 2026-11-09 against MÁV-csoport and BKK purchase documentation.
 */
const assetRoot="../assets/";
const operators=Object.freeze({
 volan:Object.freeze({id:"volan",name:"Volán",asset:assetRoot+"volan-approved-card-v5.webp",
  purchaseUrl:"https://jegy.mav.hu/",purchaseLabel:"Távolsági buszjegy · MÁV",
  note:"A konkrét járatot és az utast a MÁV felületén külön kell kiválasztani."}),
 mav:Object.freeze({id:"mav",name:"MÁV",asset:assetRoot+"mav-approved-card-v5.webp",
  purchaseUrl:"https://jegy.mav.hu/",purchaseLabel:"Vonatjegy · MÁV",
  note:"A járatot, az esetleges helyjegyet és az utast külön kell kiválasztani."}),
 bkk:Object.freeze({id:"bkk",name:"BKK",asset:assetRoot+"bkk-approved-card-v5.webp",
  purchaseUrl:"https://bkk.hu/bpgoletoltes/",purchaseLabel:"Jegy vagy bérlet · BudapestGO",
  note:"A BudapestGO alkalmazásban történik a jegyvásárlás és érvényesítés."})
});
const safe=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLowerCase().replace(/\s+/g," ").trim();
const isBus=v=>/\b(?:BUS|INTERCITY_BUS|TROLLEYBUS)\b/.test(v);
const isTrain=v=>/\b(?:RAIL|TRAIN|HEAVY_RAIL|HIGH_SPEED_TRAIN|COMMUTER_TRAIN|INTERCITY_TRAIN)\b/.test(v);
export function providerForStep(step){
 if(step?.kind!=="transit")return null;
 const agency=safe(step.agency),line=safe(step.line);
 const vehicle=String(step.vehicle||"").toUpperCase().replace(/[^A-Z_]/g,"");
 const b=isBus(vehicle),t=isTrain(vehicle);
 if(/(?:^|\W)(?:volan|volanbusz)(?:$|\W)/.test(agency)||
   (b&&/(?:mav|magyar allamvasut|szemelyszallitas)/.test(agency))||
   (b&&line==="1054"))return operators.volan;
 if((t&&/(?:mav|magyar allamvasut|railjet)/.test(agency))||
  (/^(?:ic|ec|rj|railjet|expressz)\s?\d*/.test(line)&&(t||!vehicle)))
  return operators.mav;
 if(/(?:^|\W)(?:bkk|bkv)(?:$|\W)/.test(agency)||
  /budapesti kozlekedes/.test(agency)||
  /^(?:METRO_RAIL|SUBWAY|TRAM|LIGHT_RAIL)$/.test(vehicle)||
  (/^h[1-9]$/.test(line)&&/(?:hev|mav-hev)/.test(agency)))
  return operators.bkk;
 return null;
}
export function ticketLinksForRoute(route){
 if(!route||!Array.isArray(route.steps))return [];
 const found=new Map();
 for(const s of route.steps){
  const op=providerForStep(s);
  if(!op)continue;
  // MÁV sells both rail and Volán tickets. Present one checkout portal,
  // with the distinct operator names clearly noted, not duplicate links.
  const key=op.purchaseUrl;
  const current=found.get(key);
  if(current){if(!current.providers.includes(op.name))current.providers.push(op.name);}
  else found.set(key,{url:op.purchaseUrl,label:op.purchaseLabel,
   providers:[op.name],note:op.note});
 }
 return [...found.values()].map(x=>Object.freeze({
  ...x,providers:Object.freeze([...x.providers])
 }));
}
export const SH9_V5_PROVIDER_ASSETS=operators;
