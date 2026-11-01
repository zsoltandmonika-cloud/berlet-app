/* SH9 v1106: READ-ONLY, opt-in public BKK GTFS feed loader.
 * Separate from v1104 production search. Imported ONLY after v1106 approval.
 * Hash verification protects stale/mismatched GitHub Pages cache responses.
 * BKK Zrt., CC BY 4.0. Schedule only, not live vehicle times.
 */
import {validate as validateGtfs} from "./bkk-gtfs-core-v1105.mjs";

const RESOURCE_ROOT=new URL("./data/",import.meta.url);
const MANIFEST="bkk-feed-manifest-v1106.json";
const SNAPSHOT="bkk-selected-routes-v1106.json";
const MAX_BYTES=9*1024*1024;
const TIMEOUT_MS=18000;
let cache=null;
let cachedAt=0;
function isValidManifest(m,now=Date.now()){
 if(!m||m.schema!=="sh9.bkk.feed-manifest/1"||m.filename!==SNAPSHOT||
  m.source!=="BKK Zrt., CC BY 4.0"||m.license!=="CC-BY-4.0"||
  m.coverage!=="stop-to-stop"||m.live!==false||
  !/^[0-9a-f]{64}$/.test(m.sha256)||!/^[0-9a-f]{64}$/.test(m.sourceSha256)||
  !Number.isInteger(m.bytes)||m.bytes<=1000||m.bytes>MAX_BYTES||
  !Array.isArray(m.routes)||m.routes.join(",")!=="17,19,41,260")return false;
 const generated=Date.parse(m.generatedAt),validated=Date.parse(m.validatedAt);
 if(!Number.isFinite(generated)||!Number.isFinite(validated)||
  now-generated>14*86400000||now-validated>36*3600000||
  generated>now+60000||validated>now+60000)return false;
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",year:"numeric",
  month:"2-digit",day:"2-digit"}).formatToParts(new Date(now));
 const parts=Object.fromEntries(today.map(x=>[x.type,x.value]));
 const current=[parts.year,parts.month,parts.day].join("-");
 const twoDays=new Date(current+"T12:00:00Z");
 twoDays.setUTCDate(twoDays.getUTCDate()+2);
 const max=twoDays.toISOString().slice(0,10);
 return m.feedStart<=current&&m.feedEnd>=max;
}
function asHex(bytes){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function sha256(bytes,digest=globalThis.crypto?.subtle){
 if(!digest?.digest)throw Error("cryptographic_digest_unavailable");
 return asHex(await digest.digest("SHA-256",bytes));
}
async function getFile(url,fetcher,signal,maxBytes){
 const response=await fetcher(url,{cache:"no-store",credentials:"omit",signal,redirect:"error"});
 if(!response.ok)throw Error("bkk_feed_unavailable");
 const size=Number(response.headers.get("content-length")||0);
 if(size>maxBytes)throw Error("bkk_feed_too_large");
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength>maxBytes)throw Error("bkk_feed_too_large");
 return bytes;
}
async function readOfficialSnapshot({fetcher=fetch,now=Date.now(),root=RESOURCE_ROOT}={}){
 if(cache&&now-cachedAt<15*60000&&isValidManifest(cache.manifest,now)&&
  validateGtfs(cache.data,now))return cache;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const base=new URL(root);
  // Enforce the configured same-origin GitHub Pages location.
  if(base.origin!==new URL(import.meta.url).origin||!base.pathname.endsWith("/bkk/data/"))
   throw Error("untrusted_bkk_feed_origin");
  const mUrl=new URL(MANIFEST,base);
  const manifest=JSON.parse(new TextDecoder().decode(
   await getFile(mUrl.toString(),fetcher,controller.signal,16000)));
  if(!isValidManifest(manifest,now))throw Error("stale_or_invalid_bkk_manifest");
  const snapshotUrl=new URL(SNAPSHOT,base);
  snapshotUrl.searchParams.set("sha",manifest.sha256.slice(0,20));
  const bytes=await getFile(snapshotUrl.toString(),fetcher,controller.signal,MAX_BYTES);
  if(bytes.byteLength!==manifest.bytes||await sha256(bytes)!==manifest.sha256)
   throw Error("bkk_feed_integrity_mismatch");
  const data=JSON.parse(new TextDecoder().decode(bytes));
  if(!validateGtfs(data,now)||data.generatedAt!==manifest.generatedAt||
   data.feedEnd!==manifest.feedEnd||data.feedStart!==manifest.feedStart)
   throw Error("invalid_or_stale_bkk_timetable");
  cache=Object.freeze({data,manifest});
  cachedAt=now;
  return cache;
 }finally{clearTimeout(timer)}
}
export {isValidManifest,readOfficialSnapshot,sha256};
