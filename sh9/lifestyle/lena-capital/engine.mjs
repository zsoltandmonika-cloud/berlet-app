/* Léna Capital: deterministic, paper-only, price-return strategy. No order API. */
function createEngine(){
 const INITIAL=100000, FEE=.002, FIXED=.5, FX_FEE=.0025, UNIVERSE=["SPY","QQQ","IWM"];
 const assert=(b,m)=>{if(!b)throw Error(m)};
 const finite=x=>typeof x==="number"&&Number.isFinite(x)&&x>0;
 const days=(a,b)=>(Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000;
 function validate(sessions){
  assert(Array.isArray(sessions)&&sessions.length>=50,"Legalább 50 teljes kereskedési nap kell.");
  for(let i=0;i<sessions.length;i++){
   const s=sessions[i];assert(/^\d{4}-\d\d-\d\d$/.test(s.date)&&finite(s.fx),"Hibás dátum vagy devizaárfolyam.");
   if(i)assert(s.date>sessions[i-1].date&&days(sessions[i-1].date,s.date)<=7,"Hiányzó vagy duplikált kereskedési nap.");
   for(const k of UNIVERSE){
    const b=s.bars[k];assert(b&&finite(b.o)&&finite(b.c),"Hiányzó vagy hibás ETF adat: "+k);
    if(i)assert(Math.abs(b.c/sessions[i-1].bars[k].c-1)<.30,"Szokatlan árfolyamváltozás: kézi ellenőrzés.");
   }
  }
 }
 function signal(sessions){
  const last=sessions.at(-1);
  const ranked=UNIVERSE.map(k=>{const c=last.bars[k].c;const avg=sessions.slice(-50).reduce((a,s)=>a+s.bars[k].c,0)/50;return {symbol:k,momentum:c/sessions.at(-21).bars[k].c-1,trend:c>avg}}).filter(x=>x.trend&&x.momentum>0).sort((a,b)=>b.momentum-a.momentum);
  return ranked[0]?.symbol??null;
 }
 function nyTime(iso){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(iso));
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return p.year+"-"+p.month+"-"+p.day+"T"+p.hour+":"+p.minute;
 }
 function valuation(p,s,at="c"){return p.cash+(p.symbol?p.qty*s.bars[p.symbol][at]:0)}
 function huf(p,s){return valuation(p,s)*s.fx*(1-FX_FEE)}
 function switchTo(p,target,s,log,kind,cap){
  if(p.symbol===target)return;
  if(p.symbol){const gross=p.qty*s.bars[p.symbol].o,fee=gross*FEE+FIXED;p.cash+=gross-fee;log.push({date:s.date,kind,side:"SELL",symbol:p.symbol,fee,qty:p.qty,price:s.bars[p.symbol].o});p.symbol=null;p.qty=0}
  if(target){
   const budget=p.cash*cap;const net=(budget-FIXED)/(1+FEE);if(net<=0)return;
   const price=s.bars[target].o,qty=net/price,fee=net*FEE+FIXED;p.cash-=net+fee;p.symbol=target;p.qty=qty;log.push({date:s.date,kind,side:"BUY",symbol:target,fee,qty,price});
  }
 }
 function step(old,sessions,now){
  validate(sessions);assert(Number.isFinite(Date.parse(now)),"Hibás futási idő");
  const s=sessions.at(-1);assert(s.date<nyTime(now).slice(0,10),"Csak lezárt, előző kereskedési nap használható.");
  assert(days(s.date,nyTime(now).slice(0,10))<=5,"Elavult piaci adat; szimuláció nem frissíthető.");
  if(!old){
   assert(nyTime(now).slice(11)<"09:30","Az első futás az amerikai nyitás előtt indítható.");
   const cash=INITIAL*(1-FX_FEE)/s.fx;
   const p={cash,symbol:null,qty:0};
   return {schema:1,mode:"PAPER_ONLY",strategy:"v1 ETF momentum 20/50",initial:INITIAL,createdAt:now,lastDate:s.date,asOf:now,status:"WAITING",pending:{target:signal(sessions),recordedAt:now},portfolio:{...p},benchmark:{...p},benchmarkStarted:false,peak:huf(p,s),nav:huf(p,s),benchmarkNav:huf(p,s),drawdown:0,history:[{date:s.date,nav:huf(p,s),benchmark:huf(p,s)}],trades:[],decisions:[{date:s.date,recordedAt:now,target:signal(sessions),reason:"Első előre rögzített jelzés"}]};
  }
  assert(old.schema===1&&old.mode==="PAPER_ONLY","Ismeretlen állapot");
  const a=JSON.parse(JSON.stringify(old));if(a.status==="COMPLETE"||a.status==="PAUSED")return a;
  if(s.date===a.lastDate)return a;
  assert(s.date>a.lastDate,"Visszafelé mutató piaci adat");
  const newer=sessions.filter(x=>x.date>a.lastDate);
  if(newer.length!==1||!sessions.some(x=>x.date===a.lastDate)||!a.pending||nyTime(a.pending.recordedAt)>=s.date+"T09:30"){
   a.status="PAUSED";a.reason="Hiányzó nap vagy nyitás után rögzített jelzés; nincs visszamenőleges kötés.";return a;
  }
  const ending=days(a.createdAt.slice(0,10),s.date)>=90;
  const target=ending||a.riskHalt?null:a.pending.target;
  switchTo(a.portfolio,target,s,a.trades,"STRATEGY",.5);
  if(!a.benchmarkStarted&&!ending){switchTo(a.benchmark,"SPY",s,a.trades,"BENCHMARK",1);a.benchmarkStarted=true}
  if(ending)switchTo(a.benchmark,null,s,a.trades,"BENCHMARK",1);
  a.nav=huf(a.portfolio,s);a.benchmarkNav=huf(a.benchmark,s);a.peak=Math.max(a.peak,a.nav);a.drawdown=1-a.nav/a.peak;
  if(a.drawdown>=.05)a.riskHalt=true;
  a.lastDate=s.date;a.asOf=now;a.status=ending?"COMPLETE":a.riskHalt?"RISK_HALT":"RUNNING";
  a.pending={target:ending||a.riskHalt?null:signal(sessions),recordedAt:now};
  a.history.push({date:s.date,nav:a.nav,benchmark:a.benchmarkNav});
  a.decisions.push({date:s.date,recordedAt:now,target:a.pending.target,reason:a.riskHalt?"5% célveszteség elérve; következő nyitásra kiszállás":ending?"90 nap lezárva":"20 napos momentum és 50 napos trend"});
  return a;
 }
 return {step,validate,signal};
}
export const {step,validate,signal}=createEngine();
