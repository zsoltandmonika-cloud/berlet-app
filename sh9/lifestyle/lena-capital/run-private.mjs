/* Local/private runner. No order endpoint, no paid subscriptions, no public state. Node 20+. */
import {step} from "./engine.mjs";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import {homedir} from "node:os";
import {join,dirname} from "node:path";
const symbols=["SPY","QQQ","IWM"];
const key=process.env.APCA_API_KEY_ID,secret=process.env.APCA_API_SECRET_KEY;
if(!key||!secret)throw Error("Paper-only Alpaca data credentials are missing.");
const now=new Date(),today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
if(!/^\d{4}-\d\d-\d\d$/.test(today))throw Error("Unexpected date format");
const start=new Date(now.getTime()-87*86400000).toISOString().slice(0,10);
const headers={"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":secret};
async function get(url,options={}){
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(30000),redirect:"error"});
 if(!r.ok)throw Error("Data provider returned HTTP "+r.status);
 return r;
}
const q=new URLSearchParams({symbols:symbols.join(","),timeframe:"1Day",start:start+"T00:00:00Z",end:today+"T00:00:00Z",feed:"iex",adjustment:"raw",limit:"10000"});
const data=await (await get("https://data.alpaca.markets/v2/stocks/bars?"+q,{headers})).json();
if(data.next_page_token)throw Error("Incomplete price response");
const byDate=new Map();
for(const symbol of symbols){
 if(!Array.isArray(data.bars?.[symbol]))throw Error("Missing ETF data");
 for(const b of data.bars[symbol]){
  const date=b.t.slice(0,10);if(date>=today)continue;
  const row=byDate.get(date)||{};if(row[symbol])throw Error("Duplicate bar");
  row[symbol]={o:b.o,c:b.c};byDate.set(date,row);
 }
}
const xml=await (await get("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml")).text();
const fx=new Map();
for(const m of xml.matchAll(/<Cube\s+time=['"]([^'"]+)['"]\s*>([\s\S]*?)<\/Cube>/g)){
 const getRate=code=>Number(m[2].match(new RegExp("currency=['\x22]"+code+"['\x22]\\s+rate=['\x22]([^'\x22]+)['\x22]"))?.[1]);
 const usd=getRate("USD"),huf=getRate("HUF");if(usd>0&&huf>0)fx.set(m[1],huf/usd);
}
const fxDates=[...fx.keys()].sort();
const sessions=[...byDate.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,bars])=>{
 const f=fxDates.filter(d=>d<=date).at(-1);
 if(!f||Date.parse(date)-Date.parse(f)>7*86400000)throw Error("Missing or stale ECB FX rate");
 return {date,bars,fx:fx.get(f)};
});
const path=process.env.LENA_CAPITAL_PRIVATE_STATE||join(homedir(),".lena-capital","state.json");
let state=null;try{state=JSON.parse(await readFile(path,"utf8"))}catch(e){if(e.code!=="ENOENT")throw e}
const next=step(state,sessions,now.toISOString());
await mkdir(dirname(path),{recursive:true,mode:0o700});
await writeFile(path+".tmp",JSON.stringify(next,null,2),{mode:0o600});
await rename(path+".tmp",path);
console.log("Paper-only snapshot saved privately. Status: "+next.status+". No orders sent.");
