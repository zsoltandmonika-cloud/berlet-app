/* Synthetic Google Routes-shaped fixture ONLY for V5 pipeline demo.
 * Names/times and connections are FICTIONAL. Never label as real service.
 * No licensed Maps Content is included, and fixture is never saved.
 */
function fakeResponse(whenIso){
 const t0=Date.parse(whenIso);
 if(!Number.isFinite(t0))throw Error("invalid_demo_start");
 const at=min=>new Date(t0+min*60000).toISOString();
 const walk=(minutes,meters)=>({travelMode:"WALK",
  staticDuration:minutes*60+"s",distanceMeters:meters});
 const ride=(from,to,depart,arrive,service,agency,vehicle)=>({
  travelMode:"TRANSIT",
  transitDetails:{
   stopDetails:{departureStop:{name:from},arrivalStop:{name:to},
    departureTime:at(depart),arrivalTime:at(arrive)},
   transitLine:{nameShort:service,agencies:[{name:agency}],
    vehicle:{type:vehicle}}
  }
 });
 const wrap=steps=>({legs:[{steps}]});
 return {demoFixture:true,routes:[
  wrap([
   walk(10,680),
   ride("Próbamegálló A","Próbamegálló B",70,280,"DEMO V1","Volán tesztadat","BUS"),
   walk(4,290)
  ]),
  wrap([
   walk(7,470),
   ride("Próba vasút A","Próba vasút B",100,245,"Sajó Expressz DEMO","MÁV tesztadat","HEAVY_RAIL"),
   walk(6,380)
  ]),
  wrap([
   walk(5,300),
   ride("Átszálló A","Átszálló B",46,103,"DEMO R1","MÁV tesztadat","HEAVY_RAIL"),
   walk(5,310),
   ride("Átszálló C","Próba végállomás",117,290,"DEMO R2","MÁV tesztadat","HEAVY_RAIL"),
   walk(5,350)
  ]),
  wrap([
   walk(8,450),
   ride("Próbamegálló K","Próbamegálló L",52,86,"DEMO B1","BKK tesztadat","BUS"),
   walk(5,280),
   ride("Próba közlekedési csomópont","Próba célállomás",100,270,"DEMO B2","MÁV tesztadat","HEAVY_RAIL"),
   walk(7,460)
  ])
 ]};
}
export {fakeResponse};
