/* HH One · Digital Wellbeing App Registry v515.
 * PUBLIC presentation metadata ONLY. No tracking, contacts, device queries,
 * new Android permissions, telemetry uploads or private Dropbox access.
 * Exact package IDs prevent lookalike-app misidentification. Original icons
 * are hotlinked from public app/brand sources; failure falls back to emoji.
 * The Android measurements keep their original, immutable package identifiers.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(root)root.HH_DW_APP_REGISTRY_V515=Object.freeze(api);
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SAMSUNG_ONE_UI='https://img.samsungapps.com/productNew/000007362174/ENG/IconImage_20240129045306420_NEW_WAP_ICON_512_512.png';
 const SHEIN_ICON='https://img.iconpusher.com/com.zzkko/14.9.4.png';
 const SINSAY_ICON='https://img.iconpusher.com/com.lppsa.app.sinsay/2.24.1.png';
 const brand=(id,color)=>'https://cdn.simpleicons.org/'+id+'/'+color;
 const entries=Object.freeze({
  'com.sec.android.app.launcher':['Kezdőképernyő','🏠','Rendszerfelület',SAMSUNG_ONE_UI],
  'com.zzkko':['SHEIN','🛍️','Vásárlás',SHEIN_ICON],
  'com.lppsa.app.sinsay':['Sinsay','🛍️','Vásárlás',SINSAY_ICON],
  // Not Play-verified under the exact package; keep a generic Mahjong tile,
  // NOT a different studio's app or an invented "official" logo.
  'com.titastudio.mahjong':['Mahjong','🀄','Játék',null],
  'com.facebook.katana':['Facebook','👥','Közösségi',brand('facebook','1877F2')],
  'com.facebook.orca':['Messenger','💬','Kommunikáció',brand('messenger','00B2FF')],
  'com.android.chrome':['Google Chrome','🌐','Böngészés',brand('googlechrome','4285F4')],
  'com.microsoft.emmx':['Microsoft Edge','🌐','Böngészés',brand('microsoftedge','0078D7')],
  'com.openai.chatgpt':['ChatGPT','💬','AI-eszközök',brand('openai','FFFFFF')],
  'com.google.android.youtube':['YouTube','▶️','Videó',brand('youtube','FF0033')],
  'com.whatsapp':['WhatsApp','💬','Kommunikáció',brand('whatsapp','25D366')],
  'com.instagram.android':['Instagram','📷','Közösségi',brand('instagram','E4405F')],
  'com.google.android.gm':['Gmail','✉️','Kommunikáció',brand('gmail','EA4335')],
  'com.google.android.apps.maps':['Google Térkép','🗺️','Navigáció',brand('googlemaps','4285F4')],
  'com.google.android.apps.photos':['Google Fotók','🖼️','Fotózás',brand('googlephotos','4285F4')],
  'com.google.android.apps.messaging':['Google Üzenetek','💬','Kommunikáció',brand('googlemessages','4285F4')],
  'com.google.android.googlequicksearchbox':['Google','🔎','Keresés',brand('google','4285F4')],
  'com.sec.android.app.sbrowser':['Samsung Internet','🌐','Böngészés',null],
  'com.spotify.music':['Spotify','🎵','Zene',brand('spotify','1ED760')],
  'com.netflix.mediaclient':['Netflix','🎬','Videó',brand('netflix','E50914')],
  'com.microsoft.teams':['Microsoft Teams','💬','Kommunikáció',brand('microsoftteams','6264A7')],
  'com.samsung.android.forest':['Samsung Digital Wellbeing','📊','Digitális jóllét',null],
  'com.google.android.apps.wellbeing':['Google Digital Wellbeing','📊','Digitális jóllét',null],
  'com.samsung.android.incallui':['Samsung hívásképernyő','📞','Telefonálás',null],
  'com.samsung.android.rubin.app':['Samsung testreszabási szolgáltatás','⚙️','Rendszerszolgáltatás',null],
  'com.android.settings':['Android Beállítások','⚙️','Rendszerfelület',null],
  'com.samsung.android.dialer':['Samsung Telefon','📞','Telefonálás',null],
  'com.samsung.android.contacts':['Samsung Névjegyek','👥','Kommunikáció',null],
  'hu.zsoltmonika.healthhubbridge':['HH One Connect','💙','Egészség / HealthHub',null]
 });
 function resolveApp(packageName){
  if(typeof packageName!=='string')return [String(packageName),'📱','Besorolatlan',null];
  const entry=Object.prototype.hasOwnProperty.call(entries,packageName)?entries[packageName]:null;
  return entry?entry.slice():[packageName,'📱','Besorolatlan',null];
 }
 function allowedLogo(url){
  if(typeof url!=='string'||url.length>350)return false;
  try{
   const x=new URL(url);
   return x.protocol==='https:'&&
     ['img.samsungapps.com','img.iconpusher.com','cdn.simpleicons.org'].includes(x.hostname);
  }catch(_){return false}
 }
 return {resolveApp,allowedLogo,entries,version:'515'};
});
