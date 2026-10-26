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
  // Official Vita Studio Google Play package, checked against the private
  // consented HH One app ledger; original Play icon mirrored by IconPusher.
  'com.vitastudio.mahjong':['Vita Mahjong','🀄','Játék','https://img.iconpusher.com/com.vitastudio.mahjong/2.62.2.png'],
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
  'hu.zsoltmonika.healthhubbridge':['HH One Connect','💙','Egészség / HealthHub',null],
  'hu.zsoltmonika.healthhub.screentimepilot':['Screen Time Pilot','📊','Digitális jóllét',null],
  'com.life360.android.safetymapd':['Life360','📍','Családi biztonság',brand('life360','804DE3')],
  'com.microsoft.skydrive':['OneDrive','☁️','Produktivitás',brand('microsoftonedrive','0078D4')],
  'com.google.android.healthconnect.controller':['Health Connect','💚','Egészség',null],
  'com.android.vending':['Google Play Áruház','🛒','Rendszerfelület',brand('googleplay','4285F4')],
  'com.google.android.packageinstaller':['Csomagtelepítő','📦','Rendszerfelület',null],
  'com.google.android.permissioncontroller':['Engedélykezelő','🔐','Rendszerszolgáltatás',null],
  'com.google.android.apps.walletnfcrel':['Google Wallet','💳','Pénzügy',brand('googlewallet','4285F4')],
  'com.sec.android.app.camera':['Kamera','📷','Fotózás',null],
  'com.sec.android.app.myfiles':['Saját fájlok','📁','Rendszerfelület',null],
  'com.sec.android.gallery3d':['Galéria','🖼️','Fotózás',null],
  'com.sec.android.app.clockpackage':['Óra','⏰','Rendszerfelület',null],
  'com.sec.android.app.popupcalculator':['Számológép','🧮','Rendszerfelület',null],
  'com.sec.android.app.shealth':['Samsung Health','💚','Egészség',null],
  'com.samsung.android.goodlock':['Good Lock','⚙️','Testreszabás',null],
  'com.samsung.android.themestore':['Galaxy Themes','🎨','Testreszabás',null],
  'com.samsung.android.app.watchmanager':['Galaxy Wearable','⌚','Eszközök',null],
  'com.samsung.android.oneconnect':['SmartThings','🏡','Okosotthon',brand('smartthings','15BFFF')],
  'com.samsung.android.scloud':['Samsung Cloud','☁️','Rendszerszolgáltatás',null],
  'com.samsung.android.app.smartcapture':['Samsung képernyőkép','📸','Rendszerfelület',null],
  'com.samsung.android.app.tips':['Samsung Tippek','💡','Rendszerfelület',null],
  'com.samsung.android.samsungpassautofill':['Samsung Pass','🔐','Biztonság',null],
  'com.android.systemui':['Android rendszerfelület','⚙️','Rendszerfelület',null],
  'com.google.android.gms':['Google Play-szolgáltatások','⚙️','Rendszerszolgáltatás',null],
  'com.microsoft.office.outlook':['Outlook','✉️','Kommunikáció',brand('microsoftoutlook','0078D4')],
  'com.microsoft.office.officehubrow':['Microsoft 365','📄','Produktivitás',brand('microsoft365','D83B01')],
  'com.azure.authenticator':['Authenticator','🔐','Biztonság',null],
  'com.duolingo':['Duolingo','🦉','Oktatás',brand('duolingo','58CC02')],
  'com.revolut.revolut':['Revolut','💳','Pénzügy',brand('revolut','FFFFFF')],
  'com.yazio.android':['YAZIO','🥗','Egészség',brand('yazio','FFFFFF')],
  'com.zhiliaoapp.musically':['TikTok','🎵','Közösségi',brand('tiktok','FFFFFF')],
  'de.aboutyou.mobile.app':['ABOUT YOU','🛍️','Vásárlás',null],
  'cz.alza.eshop':['Alza','🛍️','Vásárlás',null],
  'pl.allegro':['Allegro','🛍️','Vásárlás',brand('allegro','FF5A00')],
  'hu.foxpost.customerapp':['FOXPOST','📦','Szállítás',null],
  'hu.telekom.telekomapp':['Telekom','📱','Szolgáltatások',brand('deutschetelekom','E20074')],
  'hu.gov.dap.app':['Digitális Állampolgár','🪪','Ügyintézés',null],
  'com.samsung.android.calendar':['Samsung Naptár','📅','Produktivitás',null],
  'org.kman.AquaMail':['Aqua Mail','✉️','Kommunikáció',null],
  'com.appgenix.bizcal':['Business Calendar','📅','Produktivitás',null],
  'com.xiaomi.smarthome':['Xiaomi Home','🏡','Okosotthon',brand('xiaomi','FF6900')],
  'radiotime.player':['TuneIn Radio','📻','Zene',brand('tunein','FFFFFF')],
  'hu.webvalto.bkkfutar':['BKK Futár','🚋','Közlekedés',null],
  'hu.donmade.menetrend.budapest':['Budapesti menetrend','🚌','Közlekedés',null],
  'com.exovoid.weather.app':['Időjárás','🌤️','Időjárás',null],
  'com.samsung.android.lool':['Eszközkarbantartó','🛠️','Rendszerfelület',null],
  'com.google.android.documentsui':['Dokumentumok','📂','Rendszerfelület',null],
  'com.google.android.photopicker':['Fotóválasztó','🖼️','Rendszerfelület',null],
  'com.osp.app.signin':['Samsung-fiók','👤','Rendszerszolgáltatás',null],
  'pegasus.project.ebh.mobile.android.bundle.mobilebank':['George','💳','Pénzügy',null],
  'com.samsung.android.app.dressroom':['Háttérkép és stílus','🎨','Testreszabás',null],
  'com.samsung.systemui.navillera':['NavStar','⚙️','Testreszabás',null],
  'com.samsung.android.waterplugin':['Galaxy Watch4 modul','⌚','Eszközök',null],
  'com.samsung.accessory.neobeanmgr':['Galaxy Buds Live modul','🎧','Eszközök',null],
  'com.samsung.accessory.budsunitemgr':['Galaxy Buds modul','🎧','Eszközök',null],
  'com.microsoft.appmanager':['Kapcsolat a Windowshoz','💻','Produktivitás',null],
  'com.android.server.telecom':['Android telefonkezelő','📞','Rendszerszolgáltatás',null],
  'com.android.credentialmanager':['Hitelesítőadat-kezelő','🔐','Rendszerszolgáltatás',null],
  'com.android.intentresolver':['Megosztási menü','↗️','Rendszerfelület',null],
  'com.android.nfc':['NFC-szolgáltatás','📶','Rendszerszolgáltatás',null],
  'com.google.android.apps.chromecast.app':['Google Home','🏠','Okosotthon',brand('googlehome','4285F4')],
  'com.google.android.apps.docs.editors.docs':['Google Dokumentumok','📄','Produktivitás',brand('googledocs','4285F4')],
  'com.opera.browser':['Opera','🌐','Böngészés',brand('opera','FF1B2D')],
  'com.samsung.android.app.contacts':['Samsung Névjegyek','👥','Kommunikáció',null],
  'com.samsung.android.app.homestar':['Home Up','🏠','Testreszabás',null],
  'com.samsung.android.app.spage':['Samsung Free','📰','Hírek',null],
  'com.samsung.android.authfw':['Samsung hitelesítés','🔐','Rendszerszolgáltatás',null],
  'com.samsung.android.multistar':['MultiStar','🪟','Testreszabás',null],
  'com.samsung.android.smartsuggestions':['Okosjavaslatok','💡','Rendszerfelület',null],
  'com.samsung.android.health.data.dataviewer':['Samsung Health adatnézet','💚','Egészség',null],
  'com.sec.android.app.voicenote':['Hangrögzítő','🎙️','Produktivitás',null],
  'com.shazam.android':['Shazam','🎵','Zene',brand('shazam','0088FF')],
  'com.yeelight.cherry':['Yeelight','💡','Okosotthon',null],
  'cz.zasilkovna.app':['Packeta','📦','Szállítás',null],
  'hu.app.telex':['Telex','📰','Hírek',null],
  'hu.dobrosi.lakasfizetnivalok':['Lakásfizetnivalók','🏠','Pénzügy',null],
  'com.aff.index.main':['Index.hu','📰','Hírek',null],
  'hu.zsoltmonika.healthhubbridge.hcpilot':['HH One HC Pilot','💙','Egészség / HealthHub',null],
  'hu.zsoltmonika.healthhubbridge.samsungbeta':['HH One Samsung Beta','💙','Egészség / HealthHub',null],
  'hu.zsoltmonika.healthhubbridge.thinpilot':['HH One Thin Pilot','💙','Egészség / HealthHub',null],
  'hu.zsoltmonika.sh9light':['SH9 Light','💙','Egészség / HealthHub',null]
 });
 function resolveApp(packageName){
  if(typeof packageName!=='string')return [String(packageName),'📱','Besorolatlan',null];
  const entry=Object.prototype.hasOwnProperty.call(entries,packageName)?entries[packageName]:null;
  return entry?entry.slice():[packageName,'📱','Besorolatlan',null];
 }
 function allowedLogo(url){
  if(typeof url!=='string'||url.length>350||/[\s<>"']/.test(url))return false;
  return ['https://img.samsungapps.com/','https://img.iconpusher.com/',
    'https://cdn.simpleicons.org/'].some(prefix=>url.startsWith(prefix));
 }
 return {resolveApp,allowedLogo,entries,version:'515'};
});
