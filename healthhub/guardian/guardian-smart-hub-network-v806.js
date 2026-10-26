/* Smart Arrival v806 · broad BKK source-backed static stop graph.
 * Directed edges come ONLY from published GTFS stop sequences.
 * Transfers are proposals at geographically close stops (straight-line threshold).
 * No claim that a timetable connection exists at a chosen departure time.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_SMART_HUB_NETWORK_V806=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const SOURCE='BKK Zrt., CC BY 4.0';
 // 960 is an overnight, advance-request Telebusz. This static graph cannot
 // verify operating times or bookings: never propose it as a normal journey.
 const NON_ROUTABLE=new Set(['960']);
 function routeAllowed(line){return !!line&&typeof line.id==='string'&&!NON_ROUTABLE.has(line.id.trim())}
 const LIMIT=3,ACCESS=950,TRANSFER=180,MAX_TRANSFERS=3,MAX_ITER=90000;
 const rad=Math.PI/180;
 function distance(a,b){
  if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return Infinity;
  return Math.round(6371000*Math.hypot((a.lat-b.lat)*rad,(a.lng-b.lng)*rad*Math.cos(((a.lat+b.lat)/2)*rad)));
 }
 function validate(raw,minRoutes=100){
  if(!raw||raw.schemaVersion!==1||raw.source!==SOURCE||!Array.isArray(raw.routes))return null;
  const when=Date.parse(raw.generatedAt||'');
  if(!Number.isFinite(when)||Date.now()-when>14*86400000||when>Date.now()+60000)return null;
  if(raw.routes.length<minRoutes||raw.routes.length>8000)return null;
  const routes=[];
  for(const r of raw.routes){
   if(!r||typeof r.id!=='string'||!routeAllowed(r)||!Array.isArray(r.stops)||r.stops.length<2)continue;
   const stops=[];
   for(const s of r.stops){
    if(!Array.isArray(s)||s.length<4||!Number.isFinite(s[2])||!Number.isFinite(s[3])||
       s[2]<45||s[2]>49||s[3]<16||s[3]>23)continue;
    const name=String(s[1]||'').slice(0,90);if(!name)continue;
    stops.push({id:String(s[0]||''),name,lat:s[2],lng:s[3]});
   }
   if(stops.length<2)continue;
   routes.push({id:r.id.slice(0,16),mode:String(r.mode||'bus').slice(0,10),
    headsign:String(r.headsign||'').slice(0,100),stops,shape:[]});
  }
  return routes.length>=minRoutes?routes:null;
 }
 function gridKey(lat,lng){
  return Math.floor(lat/.0018)+':'+Math.floor(lng/.0025);
 }
 function createGraph(lines){
  const nodes=[],cells=new Map();
  lines.forEach((line,li)=>{
   if(!routeAllowed(line)||!Array.isArray(line.stops))return;
   line.stops.forEach((stop,index)=>{
    const node={li,line,stop,index,next:-1,coord:line.id+':'+line.mode};
    const nid=nodes.length;nodes.push(node);
    if(index>0)nodes[nid-1].next=nid;
    const key=gridKey(stop.lat,stop.lng);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(nid);
   });
  });
  if(nodes.length>150000)return null;
  const transferCache=new Map();
  function neighbors(nid){
   if(transferCache.has(nid))return transferCache.get(nid);
   const n=nodes[nid],p=n.stop,cx=Math.floor(p.lat/.0018),cy=Math.floor(p.lng/.0025);
   const hits=[];
   for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){
    for(const other of cells.get((cx+x)+':'+(cy+y))||[]){
     const q=nodes[other];
     if(q.index>=q.line.stops.length-1||q.coord===n.coord)continue;
     const meters=distance(p,q.stop);
     if(meters<=TRANSFER)hits.push([other,meters]);
    }
   }
   hits.sort((a,b)=>a[1]-b[1]);
   const out=hits.slice(0,32);transferCache.set(nid,out);return out;
  }
  return {nodes,neighbors};
 }
 // Binary heap of [priority, node id] to keep routing linearithmic.
 function heap(){
  const a=[];
  function push(item){let i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p}a[i]=item}
  function pop(){if(!a.length)return null;const head=a[0],last=a.pop();if(a.length){let i=0;
   for(;;){let c=i*2+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;
    if(a[c][0]>=last[0])break;a[i]=a[c];i=c}a[i]=last}return head}
  return {push,pop,get size(){return a.length}};
 }
 function plan(lines,origin,destination,preference='transfers'){
  if(!Array.isArray(lines)||!origin||!destination||distance(origin,destination)<100)return [];
  const graph=createGraph(lines);if(!graph)return [];
  const {nodes,neighbors}=graph,walkingFirst=preference==='walking';
  // Transfers have absolute priority only in the default 'fewest transfers' mode.
  const penalty=walkingFirst?2200:50000,walkFactor=walkingFirst?2:1,stopFactor=walkingFirst?8:12;
  const distDest=nodes.map(n=>distance(n.stop,destination));
  const best=new Float64Array(nodes.length);best.fill(Infinity);
  const state=new Array(nodes.length),queue=heap(),finished=[],seenRoutes=new Set();
  let visited=0;
  function relax(nid,prev,edge,transfers,walk,stops,approach,changeWalk){
   if(transfers>MAX_TRANSFERS)return;
   const cost=penalty*transfers+walkFactor*walk+stopFactor*stops;
   if(cost>=best[nid])return;
   best[nid]=cost;
   state[nid]={nid,prev,edge,transfers,walk,stops,approach,changeWalk,cost};
   queue.push([cost,nid]);
  }
  for(let nid=0;nid<nodes.length;nid++){
   if(nodes[nid].next<0)continue;
   const walk=distance(nodes[nid].stop,origin);
   if(walk<=ACCESS)relax(nid,-1,'start',0,walk,0,walk,0);
  }
  function reconstruct(at){
   const chain=[],last=state[at];
   let current=at,guard=0;
   while(current>=0&&guard++<nodes.length+1){
    const st=state[current];if(!st)return null;
    chain.push({node:nodes[current],edge:st.edge,transferMeters:st.transferMeters||0});
    current=st.prev;
   }
   chain.reverse();
   const legs=[];
   for(let i=1;i<chain.length;i++){
    const prev=chain[i-1],curr=chain[i];
    if(curr.edge==='ride'){
     const line=prev.node.line;
     const lastLeg=legs[legs.length-1];
     if(lastLeg&&lastLeg.line===line&&lastLeg.exit===prev.node.stop){
      lastLeg.exit=curr.node.stop;lastLeg.stopCount++;
     }else legs.push({line,enter:prev.node.stop,exit:curr.node.stop,stopCount:1});
    }
   }
   if(!legs.length)return null;
   const finish=distDest[at],changeWalk=last.changeWalk;
   return {legs,walk:last.walk+finish,transfer:last.transfers,
    approach:last.approach,changeWalk,finish,
    score:last.cost+walkFactor*finish,staticNetwork:true};
  }
  while(queue.size&&visited++<MAX_ITER){
   const entry=queue.pop(),nid=entry[1],cost=entry[0];
   if(cost!==best[nid])continue;
   const st=state[nid],n=nodes[nid];
   if(distDest[nid]<=ACCESS&&st.stops>0){
    const result=reconstruct(nid);
    if(result){
     const sig=result.legs.map(x=>x.line.mode+':'+x.line.id).join('>');
     if(!seenRoutes.has(sig)){finished.push(result);seenRoutes.add(sig)}
     if(finished.length>=LIMIT)break;
    }
   }
   if(n.next>=0)relax(n.next,nid,'ride',st.transfers,st.walk,st.stops+1,st.approach,st.changeWalk);
   if(st.stops>0&&st.transfers<MAX_TRANSFERS){
    for(const [other,meters] of neighbors(nid)){
     // Never interpret a short lateral transfer as a boarding confirmation.
     relax(other,nid,'transfer',st.transfers+1,st.walk+meters,st.stops,
      st.approach,st.changeWalk+meters);
    }
   }
  }
  return finished.sort((a,b)=>preference==='walking'
   ? a.walk-b.walk||a.transfer-b.transfer||a.score-b.score
   : a.transfer-b.transfer||a.walk-b.walk||a.score-b.score).slice(0,LIMIT);
 }
 return {SOURCE,distance,validate,createGraph,plan,routeAllowed,NON_ROUTABLE,version:'806'};
});
