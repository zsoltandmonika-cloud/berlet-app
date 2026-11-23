/* SHO UI-only cache: sho-family-guard-ui-only. Local HTML/CSS/JS ONLY.
 * No images, posters, thumbnails, icons, map tiles, audio, video, documents,
 * personal data, GPS, BKK datasets, sport results, API/Graph responses or
 * media URLs are ever put into the application CacheStorage.
 * A browser or player may use its own transient decoding/network buffer.
 */
'use strict';
const CACHE="sho-family-guard-ui-only-shell-v1";
const PREFIX="sho-family-guard-ui-only-shell-";
const ROOT=new URL('./',self.registration.scope);
const SOURCES=[
  "./",
  "./guardian.css?v=761-first-map",
  "./guardian-golden-v762.css?v=762-glass-map",
  "./guardian-polish-v767.css?v=768-family-guard-hero",
  "./guardian-daylight-v773.css?v=773-natural-bright-map",
  "./guardian-landmarks-sync-v787.css?v=787-optin-private-common",
  "./guardian-arrival-studio-v788.css?v=789-buddy-volume",
  "./guardian-buddy-stop-alert-v815.css?v=815",
  "./guardian-transit-v790.css?v=790-bkk-route-choices",
  "./guardian-transit-v791.css?v=799-transport-color",
  "./guardian-bkk-catalog-v801.css?v=801-catalog-a",
  "./guardian-bkk-watchlist-v814.css?v=912-route-popups",
  "./guardian-smart-hub-v802.css?v=802-destination-a",
  "./guardian-smart-hub-native-v803.css?v=803-native-b",
  "./guardian-smart-hub-router-v804.css?v=804-router-a",
  "./guardian-smart-hub-go-v805.css?v=805-fewest-go-a",
  "./guardian-smart-hub-v806.css?v=806-fields-b",
  "./guardian-map-search-v819.css?v=824-unified-results",
  "./bkk-live-glass-v800.css?v=934-static-time-compare",
  "./guardian-landmarks-v776.css?v=776-destinations",
  "./guardian-premium-v780.css?v=780-golden-controls",
  "./guardian-map-palette-v781.css?v=781-shared-flat-3d",
  "./guardian-controls-v782.css?v=782-compact-corners",
  "./guardian-avatars-v783.css?v=783-neon-profile-ring",
  "./guardian-icons-v784.css?v=784-glass-location-medallions",
  "./guardian-live-v785.css?v=807-last-known-private-live",
  "./guardian-search-results-v824.css?v=824-unified-dual-glass",
  "./guardian-map-glass-pin-v826.css?v=826-pin-soft-glass",
  "./guardian-map-dock-fill-v828.css?v=828-map-credits-inset",
  "./guardian-map-final-v829.css?v=829-compact-dock-attribution",
  "./guardian-attribution-v830.css?v=830-no-visible-banner",
  "./guardian-attribution-top-left-v831.css?v=831-20px-top-left",
  "./guardian-attribution-dot-v834.css?v=834-transparent-dot",
  "./guardian-keyboard-guard-v832.css?v=832-keyboard-safe",
  "./guardian-zoom-center-v835.css?v=835-mobile-center",
  "./guardian-origin-search-v836.css?v=1169-nearby-stops-map-first",
  "./guardian-profile-follow-v837.css?v=1181-stale-portrait-label",
  "./guardian-native-source-v1174.css?v=1174-outlook-gmail-diagnostics",
  "./guardian-profile-foreground-v838.css?v=838-gps-portraits-top",
  "./guardian-speed-glass-v850.css?v=851-attached-name-dropdown",
  "./guardian-smart-places-v1068.css?v=1068-first-browser-release&ui=1069-label-edit",
  "./guardian-buddy-place-alerts-v1.css?v=1-rag-iconpack",
  "./guardian-profile-battery-v841.css?v=841-hero-owner-battery",
  "./guardian-live-trio-v845.css?v=849-type-minus-one",
  "./guardian-soft-glass-v852.css?v=852-pastel-profile-compact",
  "./guardian-bkk-pastel-v853.css?v=853-watchlist-catalog-profile",
  "./guardian-trip-flow-v854.css?v=854-compact-offer-timeline",
  "./guardian-bkk-polish-v855.css?v=855-pastel-routes-gold-favorites",
  "./guardian-planner-compact-v856.css?v=856-one-row-saved-predictions",
  "./guardian-planner-time-v939.css?v=939-arrival-departure",
  "./guardian-route-stars-v857.css?v=859-scheduled-trip-clocks",
  "./guardian-bkk-watch-collapse-v858.css?v=859-always-open",
  "./guardian-bkk-watch-compact-v1.css?v=2",
  "./guardian-smart-hub-location-v860.css?v=860-device-position-button",
  "./guardian-final-panels-glass-v861.css?v=861-profile-final-sections",
  "./guardian-active-transit-v862.css?v=862-final-boarding-local-family",
  "./guardian-live-flow-v863.css?v=863-fullscreen-bottom-actions",
  "./guardian-map-size-v864.css?v=864-glass-full-minimize",
  "./guardian-battery-rag-v866.css?v=866-realfill-rag-charge-caption",
  "./guardian-bkk-status-glass-v867.css?v=867-profiled-gtfs-credit",
  "./guardian-theme-final-lock-v868.css?v=869-high-contrast-bkk-credit",
  "./guardian-sh9-transit-v927.css?v=953-compact-title-up",
  "./guardian-sh9-all-bkk-v928.css?v=936-quiet-map-init",
  "./guardian-smart-hub-clean-space-v954.css?v=954",
  "./guardian-smart-planner-unified-v955.css?v=955-one-surface",
  "./guardian-bkk-control-one-card-v956.css?v=957-firstpaint",
  "./guardian-bkk-first-paint-v957.css?v=957",
  "./guardian-bkk-family-one-card-v959.css?v=959-guardian-parity",
  "./guardian-bkk-extra-routes-order-v960.css?v=960",
  "./guardian-bkk-directions-cleanup-v961.css?v=961",
  "./guardian-family-live-control-v962.css?v=962-one-card",
  "./guardian-trip-time-summary-v966.css?v=966-schedule-duration",
  "./guardian-bkk-golden-planner-v968.css?v=978-datetime-soft-pastel",
  "./guardian-family-favorites-v972.css?v=972-shared40-scroll",
  "./guardian-nearby-departures-v975.css?v=976-rag-catchability",
  "./guardian-bkk-keyboard-dock-v964.css?v=1197-dark-results-core",
  "./guardian-bkk-pastel-merge-v979.css?v=979-profile-soft-one-sheet",
  "./guardian-satellite-v1033.css?v=1052-compact-maptiler-mobile",
  "./guardian-device-pack-preview-v1053.css?v=1058-bluetooth-blue",
  "./guardian-device-pack-tall-v1054.css?v=1054-laptop-clear-logo",
  "./guardian-device-pack-full-v1055.css?v=1055-full-height-preview",
  "./guardian-device-pack-live-v1056.css?v=1066-soft-glass-15",
  "./guardian-device-pack-landscape-v1070.css?v=1071-single-upper-right-box",
  "./guardian-trip-truth-v1170.css?v=1170-real-departures",
  "./guardian-smart-match-pin-v1.css?v=3",
  "./guardian-smart-match-micro-v1.css?v=3-legible-tap",
  "./guardian-bkk-brand-sheet-v1.css?v=1",
  "./guardian-bkk-golden-reference-v4.css?v=5.5-match-clock-down2",
  "./guardian-bkk-watch-unified-v1.css?v=1.1-remove-obsolete-live-button",
  "./guardian-map-search-sho-dock-v1.css?v=1-edge2edge",
  "./guardian-lena-premium-v1182.css?v=1182-guardian-energy-bluetooth",
  "./guardian-lena-premium-lower-v1183.css?v=1183-full-scroll",
  "./guardian-lena-benchmark-v1184.css?v=1184-sleep-v1173-wave",
  "./guardian-bkk-readable-controls-v1185.css?v=1186-dark-glass-header",
  "./guardian-zoom-alignment-v1187.css?v=1190-40px-right",
  "./guardian-map-top-inset-v1191.css?v=1192-visible-36x36",
  "./guardian-search-fixed-bottom-v1193.css?v=1193-screen-nav",
  "./guardian-search-screen-portal-v1195.css?v=1195-samsung-screen-layer",
  "./guardian-bkk-keyboard-premium-dark-v1196.css?v=1196-golden-standard",
  "./guardian-map-search-premium-dark-v1198.css?v=1198-map-suggestions-dark",
  "./guardian-icons-v784.js?v=784-translucent-svg-icons",
  "./guardian-landmarks-v776.js?v=787-private-and-common",
  "./guardian.js?v=1171-cross-profile-owner-preservation&service=806&attrib=831&handoff=839&ui=1070-family-admin&gps=1071-owner-lock&native=1174&camera=1176&router=1177&local-owner=1196",
  "./guardian-gps-routes-v1177.js?v=1178-monika-outlook-primary",
  "./guardian-native-dropbox-v156.js?v=1178-outlook-only-no-gmail-bridge",
  "./guardian-gps-router-v1177.js?v=1178-outlook-only",
  "./guardian-native-auth-v1063.js?v=1063-pkce-external-browser",
  "./guardian-live-v785.js?v=1181-stable-peers&native=156&router=1177",
  "./guardian-profile-follow-v837.js?v=1181-stable-selected&native=156&router=1177&owner=v1174&last-known=1196",
  "./guardian-profile-battery-v841.js?v=1038-fresh-cache-on-dropbox-error",
  "./guardian-live-trio-v845.js?v=1182-samsung-energy-score&router=1177",
  "./guardian-landmarks-sync-v787.js?v=787-shared-bookmarks",
  "./guardian-arrival-studio-v788.js?v=789-buddy-volume",
  "./guardian-buddy-stop-core-v815.js?v=815",
  "./guardian-buddy-stop-alert-v815.js?v=815",
  "./guardian-bkk-live-per-line-v909.js?v=911-universal-bkk-live",
  "./guardian-transit-v791.js?v=937-smart-match-fyi",
  "./guardian-bkk-catalog-v801.js?v=911-universal-bkk-live",
  "./guardian-bkk-extra-route-v912.js?v=913-static-no-auto-popup",
  "./guardian-bkk-watchlist-v814.js?v=962-unified-live-route",
  "./guardian-family-favorites-v972.js?v=972-shared-40-cloud-cache",
  "./guardian-place-alert-rules-v2.js?v=2-cloud-alerts",
  "./guardian-buddy-place-alerts-v1.js?v=2-android-os-foreground",
  "./guardian-smart-places-v1068.js?v=1068-family-sync-geofence&ui=1069-label-edit&rules=2",
  "./guardian-smart-hub-fields-v806.js?v=1168-quiet-gps-errors&pin=829&ui=1069-label-edit",
  "./guardian-bkk-keyboard-dock-v964.js?v=1034-no-auto-search-on-entry",
  "./guardian-map-search-v819.js?v=864-one-tap-full-minimize&ui=1069-label-edit",
  "./guardian-map-dock-fill-v828.js?v=1050-sh9-visible-dock-viewport",
  "./guardian-keyboard-guard-v832.js?v=832-keyboard-safe",
  "./guardian-origin-search-v836.js?v=1170-stop-details-top",
  "./guardian-smart-hub-network-v806.js?v=806-network-a&no960=840",
  "./guardian-bkk-timetable-v859.js?v=1170-added-lines",
  "./guardian-smart-hub-router-v804.js?v=1170-verified-flow&no960=840",
  "./guardian-bkk-golden-planner-v968.js?v=970-picker-safe",
  "./guardian-nearby-departures-v975.js?v=976-rag-catchability",
  "./guardian-live-flow-core-v863.js?v=863-direction-confidence-fix",
  "./guardian-active-transit-v862.js?v=864-one-tap-alight",
  "./guardian-live-flow-v863.js?v=863-family-gps-freshness-fix",
  "./guardian-sh9-transit-v927.js?v=932-reload-scroll-top",
  "./guardian-sh9-all-bkk-v928.js?v=936-quiet-map-init",
  "./guardian-bkk-success-v985.css?v=985",
  "./guardian-bkk-grand-handoff-v1.js?v=985-focus-tadaa",
  "./guardian-satellite-v1033.js?v=1052-compact-attribution-mobile",
  "./guardian-ota-assistant-v1042.js?v=1060-monika-network-refresh",
  "./guardian-device-pack-preview-v1053.js?v=1060-verified-network-detail",
  "./guardian-device-pack-tall-v1054.js?v=1054-brand-header",
  "./guardian-device-pack-full-v1055.js?v=1055-logo-and-icons",
  "./guardian-device-pack-live-v1056.js?v=1057-original-logo-full-res",
  "./guardian-device-pack-landscape-v1070.js?v=1071-single-upper-right-box",
  "./guardian-search-fixed-bottom-v1193.js?v=1194-sticky-screen-nav",
  "./guardian-search-screen-portal-v1195.js?v=1195-samsung-screen-layer",
  "./guardian-smart-match-micro-v1.js?v=5-temporary-departure",
  "./guardian-smart-match-pin-v1.mjs?v=949-temporary-departure&smartLocation=2-same-site-aliases&manualSync=1"
];
const ALLOWED=new Set(SOURCES.map(path=>new URL(path,ROOT).href));
function keyOf(request){
 if(request.method!=='GET')return null;
 const url=new URL(request.url);
 if(url.origin!==ROOT.origin)return null;
 if(request.mode==='navigate'){
  // Never intercept OAuth/callback routes, sensitive query parameters
  // or any navigation beyond the exact main UI page.
  if(url.search||url.hash)return null;
  return (url.href===ROOT.href||url.href===new URL('index.html',ROOT).href)?ROOT.href:null;
 }
 if(request.destination==='image'||request.destination==='audio'||
    request.destination==='video'||request.destination==='font')return null;
 return ALLOWED.has(url.href)?url.href:null;
}
function expectedType(key){
 const pathname=new URL(key).pathname;
 if(pathname.endsWith('.css'))return /^text\/css(?:\s*;|$)/i;
 if(/\.m?js$/.test(pathname))return /^(?:application|text)\/javascript(?:\s*;|$)/i;
 if(key===ROOT.href)return /^text\/html(?:\s*;|$)/i;
 return null;
}
async function retrieveUI(key){
 const mime=expectedType(key);if(!mime)return null;
 const response=await fetch(key,{method:'GET',credentials:'omit',cache:'no-store',redirect:'follow'});
 if(!response.ok||response.type!=='basic'||!mime.test(response.headers.get('content-type')||''))return null;
 return response;
}
async function saveUI(cache,key){
 const response=await retrieveUI(key);
 if(response)await cache.put(key,response.clone());
 return response;
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  if(!await saveUI(cache,ROOT.href))throw Error('UI-only shell HTML unavailable');
  // Bounded preload: no bulk video or picture fetching, even on initial install.
  // A failed optional UI asset must not affect existing live app behavior.
  const paths=[...ALLOWED].filter(x=>x!==ROOT.href);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(6,paths.length)},async()=>{
   while(cursor<paths.length){const url=paths[cursor++];try{await saveUI(cache,url)}catch(_){/* online fallback */}}
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const all=await caches.keys();
  await Promise.all(all.filter(key=>key.startsWith(PREFIX)&&key!==CACHE)
   .map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 const key=keyOf(request);
 if(!key)return; // Everything except exact UI files remains network-only.
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const hit=await cache.match(key);
  if(hit){
   event.waitUntil(saveUI(cache,key).catch(()=>{})); // UI-only background update.
   return hit;
  }
  try{
   const response=await saveUI(cache,key);
   // MIME mismatch or no-store response stays network-driven; never cache media.
   return response||fetch(request);
  }catch(_){return fetch(request)}
 })());
});
