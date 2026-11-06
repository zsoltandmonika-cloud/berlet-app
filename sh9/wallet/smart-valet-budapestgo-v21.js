/* SHO Smart Valet v21 · BudapestGO shortcut, not a mobile ticket.
 * Open the official BKK application where Android permits; never copy ticket
 * codes, login, NFC or account state. No unverified ticket deep link.
 */
(function(w,d){
'use strict';
const PACKAGE='hu.webvalto.bkkfutar';
const STORE='https://play.google.com/store/apps/details?id=hu.webvalto.bkkfutar';
const INTENT='intent:#Intent;package='+PACKAGE+
 ';action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;'+
 'S.browser_fallback_url='+encodeURIComponent(STORE)+';end';
function open(){
 // Android browser may reject a launcher intent (BROWSABLE restrictions).
 // In that case Chrome's browser_fallback_url leads to the official Play listing.
 // The BKK has not published a verified deep link to a specific digital pass.
 const android=/Android/i.test(w.navigator?.userAgent||'');
 const url=android?INTENT:STORE;
 try{w.location.assign(url)}
 catch(_){w.location.assign(STORE)}
}
w.SHO_BUDAPESTGO_V21=Object.freeze({open,store:STORE});
})(window,document);