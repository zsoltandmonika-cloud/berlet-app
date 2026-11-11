/* Verify the PUBLIC GitHub Pages deployment, not the local checkout.
 * No authentication, GPS, Dropbox, Supabase or health endpoints.
 */
"use strict";
const origin="https://zsoltandmonika-cloud.github.io/berlet-app";
const checks=[
 ["/healthhub/guardian/smart-260-connect/","SHO Smart Trip AI"],
 ["/healthhub/guardian/smart-260-connect/index.html","Smart Match Timeline"],
 ["/healthhub/guardian/index.html","guardian-smart-match-pin-v1.mjs"],
 ["/healthhub/guardian/guardian-smart-match-pin-v1.mjs","MONIKA_DEFAULT"],
 ["/healthhub/guardian/index.html","guardian-smart-match-pin-v1.mjs?v=3"],
 ["/healthhub/guardian/guardian-smart-match-pin-v1.mjs","const dir=bus260DirectionForTemplate(item);"],
 ["/healthhub/guardian/guardian-smart-match-pin-v1.mjs","const full=full260Timetable(data,date,dir);"],
 ["/healthhub/guardian/guardian-smart-match-pin-v1.mjs","CITRONELLA_DEFAULT_APPLIED"],
 ["/healthhub/guardian/guardian-smart-match-pin-v1.mjs","The full-size pinned card"],
 ["/healthhub/guardian/index.html","guardian-smart-match-pin-v1.mjs?v=2"],
 ["/healthhub/guardian/guardian-smart-match-pin-v1.css","hhSmartMatchPinV1"],
 ["/healthhub/guardian/smart-260-connect/app.mjs","sh9-smart-match-templates-v1-m"],
 ["/healthhub/guardian/smart-260-connect/core.mjs","sh9.smart-match.template/1"],
 ["/healthhub/guardian/smart-260-connect/style.css","SH9 Smart Match"],
 ["/healthhub/guardian/smart-260-connect/index.html","full-260-v34.css?v=34"],
 ["/healthhub/guardian/smart-260-connect/app.mjs","function updateFull260Timeline("],
 ["/healthhub/guardian/smart-260-connect/core.mjs","function full260Timetable("],
 ["/healthhub/guardian/smart-260-connect/full-260-v34.css","Every official bus is visible"],
 ["/healthhub/guardian/guardian-smart-match-pin-v1.mjs","const target=item?.id===\"home-citronella-260\""],
 ["/healthhub/guardian/smart-260-connect/visual-fidelity-v2.css","SHO Smart Match Visual Fidelity V2"],
 ["/healthhub/guardian/smart-260-connect/index.html","id=\"reverseBtn\""],
 ["/healthhub/guardian/smart-260-connect/app.mjs","function reverseCommute()"],
 ["/healthhub/guardian/smart-260-connect/core.mjs","monika-home-to-office"],
 ["/healthhub/guardian/smart-260-connect/clean-fullscreen-v3.css","Smart Match V3"],
 ["/healthhub/guardian/smart-260-connect/assets/smart-match-budapest-neon-hero-v2.svg","<svg"],
 ["/sh9/smart-travel/public-transport/smart-trip/","Smart Match megnyitása"],
 ["/sh9/smart-travel/lena-native/bkk/data/bkk-feed-manifest-v1106.json","feedEnd"]
];
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
async function checkOnce(path,expected){
 const u=origin+path+"?qa="+Date.now();
 const response=await fetch(u,{redirect:"error",signal:AbortSignal.timeout(12000)});
 const body=await response.text();
 if(response.status!==200||!body.includes(expected))
  throw Error(path+": status "+response.status+", expected marker "+JSON.stringify(expected)+", bytes "+body.length);
 return {path,status:response.status,bytes:body.length};
}
async function run(){
 for(let attempt=1;attempt<=8;attempt++){
  try{
   const result=[];
   for(const [path,expected] of checks)result.push(await checkOnce(path,expected));
   console.log("SMART-MATCH-LIVE-PAGES-VERIFIED",JSON.stringify(result));return;
  }catch(error){
   console.error("PAGES-TRY",attempt,error.message);
   if(attempt===8)throw error;
   await pause(9000);
  }
 }
}
run().catch(e=>{console.error("SMART-MATCH-LIVE-PAGES-FAILED",e.message);process.exitCode=1});
