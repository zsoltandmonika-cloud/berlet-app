/* HealthHub Sleep English (Canada) UI-only adapter v1.
   The 2026-11-02 approved Hungarian Sleep is the immutable source of truth.
   This layer never writes to sleep records, alters input values, touches the
   actual renderer, controls, timers, date keys, charts, or the SH9 dock.
   Disable for diagnosis: ?hhsleepen=0
*/
(function(w,d){
 'use strict';
 if(w.HH_SLEEP_EN_CA_V1||new URLSearchParams(w.location.search).get('hhsleepen')==='0')return;
 var translations=[
  ['Alvás és regeneráció','Sleep & Recovery'],['ALVÁS','SLEEP'],['Alvás','Sleep'],
  ['Alvásadatok betöltése…','Loading sleep data…'],
  ['Health Connect adatok feldolgozása','Processing Health Connect data'],
  ['Az alvásadatok betöltése nem sikerült. Frissítsd az oldalt, majd próbáld újra.','Could not load sleep data. Refresh the page and try again.'],
  ['Nincs szinkronizált alvásadat.','No synchronized sleep data available.'],
  ['Még nincs Health Connect alvásadat ennél a profilnál.','No Health Connect sleep data is available for this profile yet.'],
  ['Nincs értékelhető adat','Insufficient data'],['Nincs elég adat','Not enough data'],['Nincs adat','No data'],
  ['Nincs mérés','No measurement'],['Nincs éjjeli mérés','No overnight measurement'],
  ['Nincs éjszakai pulzusadat','No overnight heart-rate data'],
  ['Nincs fázisadat','No sleep-stage data'],['Nincs részletes fázisadat.','No detailed sleep-stage data.'],
  ['Nincs alvásfázis-adat','No sleep-stage data'],
  ['Ehhez az alváshoz nincs részletes szakaszadat.','No detailed sleep-stage data for this session.'],
  ['Ehhez a rekordhoz nincs részletes alvásfázis.','No detailed sleep stages for this record.'],
  ['Erre a napra nincs mért alvás.','No recorded sleep for this day.'],
  ['Nincs azonosítható alvási időszak.','No identifiable sleep period.'],
  ['Nincs azonosítható éjjeli alvás.','No identifiable overnight sleep.'],
  ['Nincs 24 órán belüli mért alvás.','No recorded sleep in the last 24 hours.'],
  ['SLEEP · GYORS ÁTTEKINTÉS','SLEEP · QUICK OVERVIEW'],
  ['🌙 SLEEP · GYORS ÁTTEKINTÉS','🌙 SLEEP · QUICK OVERVIEW'],
  ['A pihenésed három nézetben','Your Sleep in Three Views'],
  ['Éjszakai alvás és nappali szunyókálás külön, valódi Health Connect-adatokból.','Overnight sleep and daytime naps are shown separately using actual Health Connect records.'],
  ['Utolsó alvás','Latest Sleep'],['Éjjeli alvás','Overnight Sleep'],
  ['Elmúlt 24 óra','Last 24 Hours'],['legfrissebb','most recent'],
  ['fő pihenés','main sleep'],['összesen','total'],
  ['Az elmúlt 24 óra alvásai','Sleep in the Last 24 Hours'],
  ['⏱️ Az elmúlt 24 óra alvásai','⏱️ Sleep in the Last 24 Hours'],
  ['Éjjel + nappal','Night + Day'],
  ['Teljes 24 órás idővonal','Full 24-Hour Timeline'],
  ['🔎 Automatikusan nagyított idővonal','🔎 Automatically Zoomed Timeline'],
  ['Nagyított','Zoomed'],['24 órás','24-hour'],
  ['Alvásrekordok kezdetének és végének időpontja','Sleep-record start and end times'],
  ['A 24 órás összesítés változatlan. A grafikon a mért időszakokra közelít, az időpontokat arányosan helyezi el. Az üres részek nem jelentenek mért alvást.','The 24-hour total is unchanged. The chart zooms in on recorded periods while preserving their relative timing. Empty intervals do not represent measured sleep.'],
  ['Ébren','Awake'],['Könnyű','Light'],['Mély','Deep'],
  ['ÉBREN','AWAKE'],['KÖNNYŰ','LIGHT'],['MÉLY','DEEP'],
  ['Alvásfázisok idővonala','Sleep-Stage Timeline'],
  ['🌙 Alvásfázisok idővonala','🌙 Sleep-Stage Timeline'],
  ['A mért ébrenlét, könnyű, mély és REM szakaszok időarányos megjelenítése','Measured awake, light, deep and REM stages shown proportionally over time'],
  ['Alvásfázis-idővonal','Sleep-Stage Timeline'],
  ['ALVÁSI IDŐVONALAK','SLEEP TIMELINES'],
  ['🌙 ALVÁSI IDŐVONALAK','🌙 SLEEP TIMELINES'],
  ['Két fontos alvásod részletesen','A Closer Look at Two Sleep Sessions'],
  ['A fő éjjeli és a legutóbbi alvás külön idővonala, egységes színekkel.','Your main overnight sleep and latest session are shown on separate timelines, using consistent colours.'],
  ['Fő (éjjeli) alvás','Main Overnight Sleep'],
  ['A két megjelenítés ugyanahhoz az alvásrekordhoz kapcsolódik. A 24 órás összesítésben csak egyszer szerepel.','Both views refer to the same sleep record, which is counted only once in the 24-hour total.'],
  ['Legutóbbi fő és utolsó alvás idővonalai','Main overnight and latest sleep timelines'],
  ['30 NAPOS ALVÁSNAPTÁR','30-DAY SLEEP CALENDAR'],
  ['📆 30 NAPOS ALVÁSNAPTÁR','📆 30-DAY SLEEP CALENDAR'],
  ['Alvásaid napokra bontva','Your Sleep, Day by Day'],
  ['Ébredési dátum szerint. Koppints egy napra a külön alvások részleteiért.','Grouped by wake-up date. Tap a day to see its individual sleep sessions.'],
  ['30 napos alvásnaptár','30-day sleep calendar'],
  ['A külön alvásokat nem vonjuk össze automatikusan.','Separate sleep sessions are not combined automatically.'],
  ['Alvásidő jelzés:','Sleep-duration indicator:'],
  ['Nincs mérés','No measurement'],['Rövid alvás','Short Sleep'],
  ['Figyelendő','Worth Monitoring'],['Megfelelő idő','Adequate Duration'],
  ['Tájékoztató alvásidő-jelzés a legutóbbi mért éjszakai alvás alapján; nem orvosi minősítés.','Indicative sleep-duration signal based on the most recent measured night; not a medical assessment.'],
  ['ALVÁSELEMZÉS','SLEEP ANALYSIS'],['Alvási tényezők','Sleep Factors'],
  ['HealthRadar alvásindex','HealthRadar Sleep Index'],
  ['Saját, becsült pihenésindex · nem Samsung-pontszám','Estimated HealthHub sleep index · not a Samsung score'],
  ['Nincs elég adat','Insufficient data'],
  ['Figyelmet igényel','Needs Attention'],['Fejleszthető','Room for Improvement'],['Kedvező','Favourable'],
  ['Hogyan számoljuk az alvásindexet?','How Is the Sleep Index Calculated?'],
  ['ℹ️ Hogyan számoljuk az alvásindexet?','ℹ️ How Is the Sleep Index Calculated?'],
  ['Tényleges alvás','Actual Sleep'],['Mély alvás','Deep Sleep'],['REM alvás','REM Sleep'],
  ['Ébrenlét','Time Awake'],['Éjszakai pulzus','Overnight Heart Rate'],
  ['Könnyű alvás','Light Sleep'],['Éjszakai véroxigén','Overnight Blood Oxygen'],
  ['🫁 Véroxigén (SpO₂)','🫁 Blood Oxygen (SpO₂)'],
  ['6 óránál rövidebb','Under 6 Hours'],['6–7 óra','6–7 Hours'],
  ['7–9 óra','7–9 Hours'],['9 óránál hosszabb','Over 9 Hours'],
  ['Sok ébrenlét','Frequent Wakefulness'],['Megszakított alvás','Interrupted Sleep'],
  ['Kevés ébrenlét','Little Wakefulness'],
  ['Mért alvás, ébrenlét nélkül','Measured sleep, excluding time awake'],
  ['Mért alvásfázis · tájékoztató','Measured sleep stage · for information only'],
  ['Egyetlen időpont','Single reading'],['Egyetlen mért perc','One measured minute'],
  ['Átlag','Average'],['Nincs mérés','No reading'],
  ['ALVÁSI IDŐSZAK','SLEEP PERIOD'],['TÉNYLEGES ALVÁS','ACTUAL SLEEP'],
  ['Ébrenlét nélkül · utolsó éjszaka','Excluding awake time · last night'],
  ['Léna gyors alvásértékelése','Léna’s Quick Sleep Review'],
  ['Léna összegzése mindhárom alvásnézet alapján','Léna’s Summary of All Three Sleep Views'],
  ['💬 Léna · A teljes pihenésedről','💬 Léna · Your Overall Rest'],
  ['⌚ Óraadatokból készült becslés, nem alvásdiagnózis.','⌚ An estimate based on wearable data, not a sleep diagnosis.'],
  ['Health Connect mérési adatok alapján, nem diagnózis. Az alvásindex a fő éjjeli alvás külön becsült mutatója.','Based on Health Connect measurements, not a diagnosis. The sleep index is a separate estimate for your main overnight sleep.'],
  ['Kevés adat','Limited Data'],['Pihenésre fel!','Time for More Rest'],
  ['Van még tartalék','Room for More Rest'],['Jól néz ki','Looking Good'],
  ['Hosszabb pihenés','Longer Rest'],
  ['Tényleges alvásidő','Actual Sleep Duration'],
  ['💤 Tényleges alvásidő','💤 Actual Sleep Duration'],
  ['Alvásidő','Sleep Duration'],
  ['Heti','Weekly'],['Havi','Monthly'],['3 hónap','3 Months'],
  ['ÁTLAG / MÉRT NAP','AVERAGE / MEASURED DAY'],
  ['LEGUTÓBBI','MOST RECENT'],['LEGHOSSZABB','LONGEST'],
  ['VÁLTOZÁS','CHANGE'],['7–9 ó referencia','7–9 hr reference'],
  ['● Érintsd meg az egyes pontokat a részletekhez. A hiányzó napok nem számítanak 0 órának.','● Tap any point for details. Missing days are not treated as zero hours.'],
  ['Ebben az időszakban nincs alvásfázisokkal igazolt alvásidő. A hiányzó napokat nem tekintjük 0 órának.','There is no sleep-stage-confirmed sleep time for this period. Missing days are not treated as zero hours.'],
  ['SLEEP HELPER','SLEEP HELPER'],['Elalvássegítő','Sleep Helper'],
  ['API-mentes','Works Offline'],
  ['Válassz időt és hangot. A meleg fény lassan elsötétül, a hang pedig fokozatosan elhalkul.','Choose a duration and sound. The warm light dims gradually as the audio fades out.'],
  ['10 perc','10 min'],['15 perc','15 min'],['20 perc','20 min'],
  ['🟤 Brown noise','🟤 Brown Noise'],['🌧 Lágy zaj','🌧 Gentle Noise'],
  ['🌬 Légzés','🌬 Breathing'],['🌙 Csak fény','🌙 Light Only'],
  ['🌙 ELALVÁS INDÍTÁSA','🌙 START SLEEP HELPER'],
  ['⚙ Sleep · korábbi megjelenés','⚙ Sleep · Previous Layout'],
  ['Korábbi Sleep nézet megnyitása','Open Previous Sleep Layout'],
  ['Vissza a Golden Standard Sleep oldalra','Return to Golden Standard Sleep'],
  ['Csak a képernyő megjelenését váltja. Nem indít adatfeltöltést, és nem módosítja a szinkronizált méréseket.','Changes the display only. Does not upload data or alter synchronized measurements.'],
  ['Az alvási adatok tájékoztató jellegűek. A HealthHub nem értékeli diagnosztikusan az alvást.','Sleep information is provided for reference only. HealthHub does not use it to make a medical diagnosis.'],
  ['LEGUTÓBBI ÉJSZAKA','LAST NIGHT'],['12 óra','12 Hours'],['24 óra','24 Hours'],
  ['Alvás','Sleep'],['Ébren (ágyban)','Awake (In Bed)'],
  ['Ágyon kívül','Out of Bed'],['Szakasz','Stage'],['Ismeretlen','Unknown'],
  ['Kezdőlap','Home'],['Idővonal','Timeline'],['Frissítés','Refresh'],
  ['❤️ ÁTLAG PULZUS','❤️ AVERAGE HEART RATE'],
  ['↕ PULZUSTARTOMÁNY','↕ HEART-RATE RANGE'],
  ['🫁 ÁTLAG SpO₂','🫁 AVERAGE SpO₂'],['↓ MIN. SpO₂','↓ MIN. SpO₂'],
  ['Lassan engedd el a napot.','Let the day gently fade away.'],
  ['Tájékoztató, nem orvosilag validált saját mutató. Az alvásidő maximum 65 pontot ér (8 óra esetén), az alváshatékonyság maximum 35 pontot (90% felett). A 6 óránál rövidebb alvás legfeljebb 59, a 6–7 órás vagy 75% alatti hatékonyság legfeljebb 79 pontot kaphat. 80%-nál hiányosabb alvásfázis-idővonalból nem számolunk pontszámot. Az index nem hasonlítható közvetlenül a Samsung 0–100 értékéhez.','This is an informational index, not a clinically validated measure. Sleep duration contributes up to 65 points (at 8 hours), and sleep efficiency contributes up to 35 points (above 90%). Sleep under 6 hours is capped at 59 points; 6–7 hours or efficiency below 75% is capped at 79. No score is calculated when sleep-stage coverage is below 80%. This index is not directly comparable with Samsung’s 0–100 score.'],
  ['ÉJSZAKAI ADATOK','OVERNIGHT MEASUREMENTS'],
  ['Pulzus és oxigénszint','Heart Rate & Blood Oxygen'],
  ['Ehhez az éjszakához most nincs időbélyegzett pulzus- vagy SpO₂-adat a szinkronizált Health Connect csomagban.','No timestamped heart-rate or SpO₂ measurements are available for this night in the synchronized Health Connect data.']
 ];
 var dictionary=new Map(translations);
 var originalText=new WeakMap(),originalAttrs=new WeakMap();
 var attrNames=['aria-label','title','placeholder'];
 var scheduled=false,root=null,observer=null,touched=false;
 function isEN(){try{return w.localStorage.getItem('sh9-language-v1')==='en'}catch(_){return false}}
 function translateDuration(s){
  return String(s).replace(/(\d+)\s+ó\s+(\d+)\s+p\b/g,'$1 hr $2 min')
    .replace(/(\d+)\s+ó\b/g,'$1 hr').replace(/(\d+)\s+p\b/g,'$1 min');
 }
 function dynamic(text){
  var s=text;
  // Léna's interpretation is composed from measured values, never rewritten
  // in persistent storage. Translate the surrounding language, not the data.
  s=s.replace(/([Zz]solt|Mónika), a legutóbbi fő éjjeli alvásod (.+?) tényleges alvás volt \(([^)]+)\)\./g,
    function(_,name,duration,period){return name+', your latest main overnight sleep included '+translateDuration(duration)+' of actual sleep ('+period+').'});
  s=s.replace(/A rendelkezésre álló adatokból most nem azonosítható egyértelmű fő éjjeli alvás\./g,
    'The available data do not clearly identify a main overnight sleep period.');
  s=s.replace(/Az utolsó alvás egyben az éjjeli fő alvásod is\./g,
    'Your latest sleep was also your main overnight sleep.');
  s=s.replace(/A legutóbbi, külön rögzített alvásod (.+?) volt \(([^)]+)\)\./g,
    function(_,duration,period){return 'Your most recent separately recorded sleep lasted '+translateDuration(duration)+' ('+period+').'});
  s=s.replace(/Az elmúlt gördülő 24 órában összesen (.+?) mért alvás látható(?: (\d+) érintett rekordból)?\./g,
    function(_,duration,n){return 'The last rolling 24 hours include '+translateDuration(duration)+' of measured sleep'+(n?' across '+n+' records':'')+'.'});
  s=s.replace(/Az elmúlt 24 óra összes alvásidejéhez nincs elegendő alvásfázis-adat\./g,
    'There are not enough sleep-stage measurements to establish total sleep time for the past 24 hours.');
  s=s.replace(/Az éjjeli alvás rövid volt; a nappali pihenés hozzáadódik a napi alváshoz, de nem feltétlenül helyettesíti az egybefüggő éjszakai pihenést\./g,
    'Overnight sleep was short. A daytime nap contributes to daily sleep, but may not replace uninterrupted overnight rest.');
  s=s.replace(/Az utolsó éjszakáról még nincs elég fázisadat a tényleges alvás megállapításához\./g,
    'Not enough sleep-stage data are available to determine actual sleep last night.');
  s=s.replace(/az utolsó éjszaka (.+?) tényleges alvást mértem\. Ez kevésnek tűnik; ha teheted, ma adj több időt a pihenésnek\./g,
    function(_,duration){return 'I measured '+translateDuration(duration)+' of actual sleep last night. That seems short; try to make more time for rest today if you can.';});
  s=s.replace(/az utolsó éjszaka (.+?) tényleges alvást látok\. Egy hosszabb éjszaka segíthet a regenerációban\./g,
    function(_,duration){return 'I see '+translateDuration(duration)+' of actual sleep last night. A longer night may help recovery.';});
  s=s.replace(/az utolsó éjszaka (.+?) tényleges alvást rögzítettem\. Figyeld meg, mennyire érzed magad kipihentnek\./g,
    function(_,duration){return 'I recorded '+translateDuration(duration)+' of actual sleep last night. Notice how rested you feel today.';});
  s=s.replace(/az utolsó éjszaka (.+?) tényleges alvást rögzítettem\. Ha ez szokatlan, a közérzetedet is érdemes figyelni\./g,
    function(_,duration){return 'I recorded '+translateDuration(duration)+' of actual sleep last night. If this is unusual, pay attention to how you feel.';});
  s=s.replace(/A Health Connect fázisadataiban (.+?) mély, (.+?) REM és (.+?) ébrenléti idő látszik\. A HealthRadar saját alvásindexe tájékoztató jellegű, nem Samsung-pontszám\./g,
    function(_,deep,rem,awake){return 'Health Connect reports '+translateDuration(deep)+' of deep sleep, '+translateDuration(rem)+' of REM sleep and '+translateDuration(awake)+' awake. The HealthRadar sleep index is informational, not a Samsung score.';});
  s=s.replace(/Az alvásidő maximum 65 pontot ér \(8 óra esetén\), az alváshatékonyság maximum 35 pontot \(90% felett\)/g,
    'Sleep duration contributes up to 65 points (at 8 hours), and sleep efficiency contributes up to 35 points (above 90%)');
  s=s.replace(/Tájékoztató, nem orvosilag validált saját mutató\./g,
    'This is an informational, non-clinically validated measure.');
  s=s.replace(/(A |a )?6 óránál rövidebb alvás legfeljebb 59/g,
    'Sleep under 6 hours is capped at 59');
  s=s.replace(/(A |a )?6–7 órás vagy 75% alatti hatékonyságú alvás/g,
    'Sleep lasting 6–7 hours or with efficiency below 75%');
  s=s.replace(/A mély, REM és könnyű alvás csempéi információs jellegűek; a viselhető eszköz fázisadatai nem diagnózisok\./g,
    'Deep, REM and light sleep tiles are informational; wearable sleep-stage data are not diagnoses.');
  s=s.replace(/🔴 Rövidebb \/ kedvezőtlenebb · 🟠 figyelendő · 🟢 kedvezőbb\./g,
    '🔴 Shorter / less favourable · 🟠 monitor · 🟢 more favourable.');
  s=s.replace(/^💬 Léna · (Kevés adat|Pihenésre fel!|Van még tartalék|Jól néz ki|Hosszabb pihenés)$/,function(_,title){
   return '💬 Léna · '+(dictionary.get(title)||title);
  });
  s=s.replace(/^(Ébren|Könnyű|Mély|Alvás|Ágyon kívül|Ébren \(ágyban\)) · /,function(_,stage){
   return (dictionary.get(stage)||stage)+' · ';
  });
  // Date text is presentation-only: keep timestamps and ISO date keys intact.
  [
   ['január','January'],['február','February'],['március','March'],['április','April'],
   ['május','May'],['június','June'],['július','July'],['augusztus','August'],
   ['szeptember','September'],['október','October'],['november','November'],['december','December'],
   ['hétfő','Monday'],['kedd','Tuesday'],['szerda','Wednesday'],['csütörtök','Thursday'],
   ['péntek','Friday'],['szombat','Saturday'],['vasárnap','Sunday'],
   ['jan.','Jan.'],['febr.','Feb.'],['márc.','Mar.'],['ápr.','Apr.'],
   ['jún.','Jun.'],['júl.','Jul.'],['aug.','Aug.'],['szept.','Sept.'],
   ['okt.','Oct.'],['nov.','Nov.'],['dec.','Dec.']
  ].forEach(function(pair){s=s.replaceAll(pair[0],pair[1]);});
  s=s.replace(/Kijelölt (hét|nap): /g,function(_,kind){return 'Selected '+(kind==='hét'?'week':'day')+': ';});
  s=s.replace(/(\d+) mért éjszaka átlaga/g,'average of $1 recorded nights');
  s=s.replace(/(\d+) mért éjszaka/g,'$1 recorded nights');
  s=s.replace(/13 heti átlagból (\d+) héten van adat/g,'Data available for $1 of 13 weeks');
  s=s.replace(/(\d+) \/ (\d+) napból van mért alvás/g,'Measured sleep on $1 of $2 days');
  s=s.replace(/(\d+) alvásrekord/g,'$1 sleep records');
  s=s.replace(/ · részletek/g,' · details').replace(/ · teljes időszak/g,' · total period');
  s=s.replace(/Tényleges alvás:/g,'Actual sleep:').replace(/Teljes időszak:/g,'Total period:');
  s=s.replace(/Egy kattintás: váltás (Zsolt|Mónika) profiljára/g,'Tap once to switch to $1’s profile');
  s=s.replace(/Váltás (Zsolt|Mónika) profiljára/g,'Switch to $1’s profile');
  s=s.replace(/\b(\d+) mért perc\b/g,'$1 measured minutes');
  s=s.replace(/Alvásidő trend\. Érintsd meg a mérési pontokat a pontos értékért\./g,'Sleep duration trend. Tap the measured points for exact values.');
  s=s.replace(/Forrás: /g,'Source: ').replace(/Utolsó adatimport: /g,'Last data import: ');
  s=s.replace(/Utolsó mért alvás: /g,'Last measured sleep: ');
  s=s.replace(/mért perc/g,'measured minutes').replace(/\/perc/g,'/min');
  s=s.replace(/ · Ébrenlét nélkül/g,' · Excluding awake time');
  s=s.replace(/Alváshatékonyság: /g,'Sleep efficiency: ');
  s=s.replace(/🛏 Ablak: /g,'🛏 Window: ').replace(/⚡ Hatékonyság: /g,'⚡ Efficiency: ');
  s=s.replace(/👁 Ébren: /g,'👁 Awake: ').replace(/(\d+) megszakítás/g,'$1 interruptions');
  s=s.replace(/Utolsó adatimport: időpont nem ismert/g,'Last data import: time unknown');
  s=s.replace(/A mai alvás még nem szerepel az átvett adatokban\. A webes frissítés csak a már szinkronizált adatokat olvassa újra\./g,
    'Today’s sleep is not yet included in the imported data. Refreshing the website only rereads already-synchronized records.');
  s=s.replace(/ · Health Connect/g,' · Health Connect');
  s=s.replace(/(\d+)\s+ó\s+(\d+)\s+p\b/g,'$1 hr $2 min');
  s=s.replace(/(\d+)\s+ó\b/g,'$1 hr').replace(/(\d+)\s+p\b/g,'$1 min');
  return s===text?null:s;
 }
 function translate(text){
  var start=(text.match(/^\s*/)||[''])[0],end=(text.match(/\s*$/)||[''])[0];
  var core=text.slice(start.length,text.length-end.length);
  if(!core)return null;
  var match=dictionary.get(core);
  var next=match!==undefined?match:dynamic(core);
  return next&&next!==core?start+next+end:null;
 }
 function skip(node){
  var p=node.parentElement;
  return !p||p.closest('script,style,textarea,input,option,select,[contenteditable],.hh428Source,.hhSleepTrendSvg386 .hhSleepDot386');
 }
 function paintNode(node,english){
  if(!node||skip(node))return;
  if(english){
   // Preserve only texts actually changed by this adapter. Dynamic sleep
   // measurements and countdowns must never be restored to stale values.
   var original=originalText.has(node)?originalText.get(node):node.nodeValue;
   var next=translate(original);
   if(next!==null){
    if(!originalText.has(node))originalText.set(node,original);
    if(node.nodeValue!==next){node.nodeValue=next;touched=true;}
   }
  }else if(originalText.has(node)){
   var value=originalText.get(node);
   if(node.nodeValue!==value)node.nodeValue=value;
  }
 }
 function paintAttrs(node,english){
  if(!node.getAttribute)return;
  if(english){
   var snapshot=originalAttrs.get(node);
   for(var i=0;i<attrNames.length;i++){
    var attr=attrNames[i],value=node.getAttribute(attr);
    if(value===null)continue;
    var original=snapshot&&attr in snapshot?snapshot[attr]:value;
    var next=translate(original);
    if(next!==null){
     if(!snapshot){snapshot={};originalAttrs.set(node,snapshot);}
     if(!(attr in snapshot))snapshot[attr]=original;
     if(value!==next){node.setAttribute(attr,next);touched=true;}
    }
   }
  }else{
   var old=originalAttrs.get(node);
   if(old)for(var attr in old)if(node.getAttribute(attr)!==old[attr])node.setAttribute(attr,old[attr]);
  }
 }
 function paint(){
  if(!root||!root.isConnected)return;
  var english=isEN();
  // Hungarian is read-only. Do not even traverse the Sleep DOM until this
  // instance has translated something that may need restoring.
  if(!english&&!touched)return;
  // Walk only the Sleep screen. The underlying Home, medical PDFs and shared
  // navigation are never traversed or translated by this adapter.
  var walker=d.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
  var node,count=0;
  while((node=walker.nextNode())&&count++<3500){
   if(node.nodeType===3)paintNode(node,english);
   else if(node.nodeType===1)paintAttrs(node,english);
  }
  if(!english)touched=false;
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  var run=function(){scheduled=false;paint()};
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(run);
  else w.setTimeout(run,0);
 }
 function attach(){
  if(root&&root.isConnected)return;
  root=d.getElementById('hhSleepPage');
  if(!root)return;
  if(observer)observer.disconnect();
  observer=new MutationObserver(function(changes){
   if(changes.some(function(m){return m.type==='childList'&&m.addedNodes.length>0}))schedule();
  });
  observer.observe(root,{childList:true,subtree:true});
  schedule();
 }
 function onLanguage(){attach();schedule()}
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
 // The page section itself is created by the original Sleep boot script.
 if(!root&&d.body){
  var boot=new MutationObserver(function(){
   attach();if(root&&root.isConnected)boot.disconnect();
  });
  boot.observe(d.body,{childList:true});
 }
 w.addEventListener('sh9:languagechange',onLanguage);
 w.addEventListener('sh9-language-change',onLanguage);
 w.addEventListener('pageshow',onLanguage);
 w.addEventListener('storage',function(e){if(e.key==='sh9-language-v1')onLanguage()});
 d.addEventListener('click',function(e){
  if(e.target&&e.target.closest('[data-sh9-lang]'))w.setTimeout(onLanguage,0);
 },true);
 w.HH_SLEEP_EN_CA_V1=Object.freeze({version:'1.0',refresh:onLanguage});
})(window,document);
