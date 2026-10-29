/* SH9 Volán v998 · Smart Search location resolution layer.
 * Offline; source is original private GTFS stop records; no hardcoded routes.
 * Public create(stops).resolve(query) and .suggest(query,limit).
 * City queries include ALL matching stop/platform IDs, exact stop queries keep
 * per-platform IDs. This resolver can be reused by later NLP/AI searches. */
(function(root){'use strict';
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const aliases=new Map([
 ['bp','budapest'],['bpest','budapest'],['b pest','budapest'],['b p','budapest'],
 ['pest','budapest'],['barcika','kazincbarcika']
]);
const canonical=q=>aliases.get(norm(q))||norm(q);
const head=name=>{const i=String(name).indexOf(',');return i<0?'':String(name).slice(0,i).trim()};
const uniq=values=>[...new Set(values)];
function create(stops){
 const cities=new Map(),names=new Map(),entries=[];
 for(const row of stops||[]){
  const id=Array.isArray(row)?row[0]:row?.id;
  const name=Array.isArray(row)?row[1]:row?.name;
  if(typeof id!=='string'||typeof name!=='string'||!id||!name)continue;
  const key=norm(name);
  if(!names.has(key))names.set(key,{name,ids:[],city:head(name)});
  names.get(key).ids.push(id);
  const city=head(name);
  if(city){
   const cityKey=norm(city);
   if(!cities.has(cityKey))cities.set(cityKey,{name:city,ids:[],stops:new Set()});
   const group=cities.get(cityKey);group.ids.push(id);group.stops.add(key);
  }
 }
 for(const [key,item] of names)entries.push({key,name:item.name,ids:item.ids,city:item.city});
 const allCities=[...cities].map(([key,item])=>({key,name:item.name,ids:item.ids,stopCount:item.stops.size}));
 function suggest(input,limit=8){
  const q=canonical(input);if(q.length<2)return [];
  const cityHits=allCities.filter(c=>c.key.startsWith(q)||q.length>=4&&c.key.includes(q));
  cityHits.sort((a,b)=>Number(b.key===q)-Number(a.key===q)||Number(b.key.startsWith(q))-Number(a.key.startsWith(q))||a.name.localeCompare(b.name,'hu'));
  const hits=entries.filter(s=>s.key.includes(q)||q.split(' ').filter(Boolean).every(token=>s.key.includes(token)));
  hits.sort((a,b)=>Number(b.key===q)-Number(a.key===q)||Number(b.key.startsWith(q))-Number(a.key.startsWith(q))||a.name.localeCompare(b.name,'hu'));
  const result=[];
  for(const c of cityHits.slice(0,limit))result.push({kind:'city',label:c.name,caption:'Város · '+c.stopCount+' megállónév',count:c.ids.length});
  for(const s of hits){if(result.length>=limit)break;result.push({kind:'stop',label:s.name,caption:'Pontos megálló'+(s.city?' · '+s.city:''),count:s.ids.length})}
  return result;
 }
 function resolve(input){
  const q=canonical(input);
  const base={query:String(input||''),normalized:q,ids:[],kind:'missing',label:String(input||'').trim(),confidence:0};
  if(q.length<2)return base;
  // Bare settlements, including common city aliases, must resolve as a city
  // rather than selecting an arbitrary terminal or matching station.
  const city=cities.get(q);
  if(city)return {...base,kind:'city',label:city.name,ids:uniq(city.ids),confidence:1,stopCount:city.stops.size};
  const exact=names.get(q);
  if(exact)return {...base,kind:'stop',label:exact.name,ids:uniq(exact.ids),confidence:1};
  // Any non-exact query is resolved only when it clearly names one place.
  // Do not silently pick one of multiple cities with similar prefixes.
  const matches=entries.filter(s=>s.key.includes(q)||q.split(' ').filter(Boolean).every(t=>s.key.includes(t)));
  if(!matches.length)return {...base,suggestions:suggest(q,5)};
  // City prefix entry typed without selecting a suggestion, e.g. "Kazincbar".
  const candidateCities=allCities.filter(c=>c.key.startsWith(q));
  if(candidateCities.length===1 && matches.every(s=>norm(s.city)===candidateCities[0].key)){
   const c=candidateCities[0];return {...base,kind:'city',label:c.name,ids:uniq(c.ids),confidence:.82,stopCount:c.stopCount};
  }
  const distinctCities=new Set(matches.map(s=>norm(s.city)).filter(Boolean));
  if(distinctCities.size>1&&matches.length>40)return {...base,kind:'ambiguous',suggestions:suggest(q,8)};
  if(matches.length>100&&!candidateCities.length)return {...base,kind:'ambiguous',suggestions:suggest(q,8)};
  return {...base,kind:'stop-group',label:String(input||'').trim(),ids:uniq(matches.flatMap(s=>s.ids)),confidence:.7,stopCount:matches.length};
 }
 return Object.freeze({resolve,suggest,cityCount:allCities.length,stopNameCount:entries.length});
}
root.SH9_VOLAN_STOP_RESOLVER_V998=Object.freeze({create,norm,canonical});
})(window);
