/* MÁV Smart Rail Phase 2 · verified official service routing.
 * No scraping, unverified deep links, API tokens, polling or fake live timestamps.
 * The externally hosted MÁVPlusz planner does not have a documented station-prefill link.
 */
(function(root,factory){
 const out=factory();
 if(typeof module==='object'&&module.exports)module.exports=out;
 if(root)root.SH9_MAV_OFFICIAL_V1=out;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const URLS=Object.freeze({
  timetable:'https://mavplusz.hu/',
  liveTrains:'https://vonatinfo.mav.hu/',
  tickets:'https://jegy.mav.hu/',
  alerts:'https://www.mavcsoport.hu/mavinform',
  keletiBoard:'https://mikorindul.hu/keleti',
  nyugatiBoard:'https://mikorindul.hu/nyugati',
  keletiStation:'https://www.mavcsoport.hu/mav-szemelyszallitas/belfoldi-utazas/vasutallomas/budapest-keleti',
  kazincbarcikaStation:'https://www.mavcsoport.hu/mav-szemelyszallitas/belfoldi-utazas/vasutallomas/kazincbarcika',
  stationIndex:'https://www.mavcsoport.hu/mav-szemelyszallitas/belfoldi-utazas'
 });
 function normalizeStation(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
   .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ').slice(0,120);
 }
 function stationKey(value){
  const s=normalizeStation(value);
  if(!s)return null;
  if(/\bkeleti\b/.test(s) && (/budapest|paly/a.test(s)||s==='keleti'))return 'keleti';
  if(/\bnyugati\b/.test(s) && (/budapest|paly/a.test(s)||s==='nyugati'))return 'nyugati';
  if(/\bkazincbarcika\b/.test(s)&&!/\balso\b/.test(s))return 'kazincbarcika';
  return null;
 }
 function boardFor(value){
  const k=stationKey(value);
  return k==='keleti'?URLS.keletiBoard:k==='nyugati'?URLS.nyugatiBoard:null;
 }
 function stationFor(value){
  const k=stationKey(value);
  return k==='keleti'?URLS.keletiStation:k==='kazincbarcika'?URLS.kazincbarcikaStation:null;
 }
 function stationPair(from,to){
  const a=String(from||'').trim(),b=String(to||'').trim();
  if(a.length<2||b.length<2||a.length>120||b.length>120||/[<>]/.test(a+b))return null;
  if(normalizeStation(a)===normalizeStation(b))return null;
  return {from:a,to:b};
 }
 function mapRoute(from,to){
  const pair=stationPair(from,to);if(!pair)return null;
  const p=new URLSearchParams({api:'1',origin:pair.from,destination:pair.to,travelmode:'transit'});
  return 'https://www.google.com/maps/dir/?'+p.toString();
 }
 function allowedUrl(url){
  try{
   const u=new URL(url);
   return u.protocol==='https:'&&
    ['mavplusz.hu','vonatinfo.mav.hu','jegy.mav.hu','mikorindul.hu',
     'www.mavcsoport.hu','www.google.com'].includes(u.hostname);
  }catch(_){return false;}
 }
 return Object.freeze({URLS,normalizeStation,stationKey,stationPair,boardFor,stationFor,mapRoute,allowedUrl});
});
