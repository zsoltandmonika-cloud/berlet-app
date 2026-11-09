/*
 * SHO Smart Trip V5 · intake contract from the EXISTING predictive planner.
 * Pure: NO network, storage, browser state, billing or Google calls.
 * A selected predictive/favourite place is passed by coordinates only when its
 * visible label still equals the field's current value. Manual text edits clear
 * that trust and fall back to unverified text address.
 */
import {normalizeUniversalQuery} from "./universal-request.mjs";
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLocaleLowerCase("hu-HU").replace(/\s+/g," ").trim();
function locationFor(text,selected){
 const typed=String(text||"").trim();
 if(!selected||!Number.isFinite(selected.lat)||!Number.isFinite(selected.lng)||
  Math.abs(selected.lat)>90||Math.abs(selected.lng)>180||
  fold(typed)!==fold(selected.name))return typed;
 return {kind:"coordinates",label:typed,lat:selected.lat,lng:selected.lng};
}
export function buildV5Intake({query,places,profile,priority}={},options={}){
 if(!query||typeof query!=="object"||
  !["m","z"].includes(profile))return {status:"invalid_input"};
 const raw={
  from:locationFor(query.from,places?.origin),
  to:locationFor(query.to,places?.destination),
  profile,priority:priority||"balanced",
  mode:query.mode||"depart",date:query.date,time:query.time
 };
 const out=normalizeUniversalQuery(raw,options);
 if(out.status!=="ok")return out;
 // Exact Budapest wall time / mode / UTC instant come exclusively from
 // normalizeUniversalQuery, not Google Maps' "depart now" default.
 return {
  status:"ok",query:out.query,
  selected:{origin:out.query.origin.kind==="coordinates",
   destination:out.query.destination.kind==="coordinates"}
 };
}
