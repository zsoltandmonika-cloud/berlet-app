(function(){
'use strict';
/* HealthHub v330: universal domain-aware, source-first LOCAL Léna preview.
   No network/LLM calls. Only reports measurements present in active-profile v328;
   never fabricates clinical or environmental observations. */
var v329=window.HH_LENA_LOCAL_ANSWER_V329;
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function source(r,id){return (r.sources||[]).find(function(s){return s.id===id})||null}
function entries(r,id){var s=source(r,id);return s&&Array.isArray(s.entries)?s.entries:[]}
function find(r,id,p){return entries(r,id).find(function(x){return p.test(norm(x.name||''))})||null}
function number(v){
 if(v==null)return null;
 var m=String(v).replace(/\s/g,'').replace(',','.').match(/[-+]?\d+(?:\.\d+)?/);
 return m?Number(m[0]):null
}
function when(v){if(!v)return null;var t=Date.parse(/^\d{4}-\d\d-\d\d$/.test(String(v))?v+'T12:00:00':v);return Number.isFinite(t)?Math.max(0,(Date.now()-t)/3600000):null}
function duration(n){n=number(n);return n==null?'—':Math.floor(n/60)+' óra '+Math.round(n%60)+' perc'}
function classify(q){
 var s=norm(q);
 if(/fej|migren/.test(s))return'headache';
 if(/gyogyszer|tabletta|mellekhatas|adagol|tolura|entresto|concor|forxiga|szedek|szedjem/.test(s))return'medication';
 if(/vernyomas|pulzus|szivver|szivritmus|vercukor|oxigen|szaturac/.test(s))return'vitals';
 if(/testsuly|testzsir|hizas|fogyas|sulyom|testtomeg/.test(s))return'weight';
 if(/alv|alsz|alud|ebred|ejjel|farad|kimer|pihen|energia/.test(s))return'sleep';
 if(/pollen|allerg|idojaras|legnyomas|front|homerseklet|levegominoseg|para|szmog|uv/.test(s))return'environment';
 if(/fertoz|virus|influenz|covid|kohog|laz|jarvany|torok/.test(s))return'infection';
 if(/mozgas|aktivitas|lepes|edzes|seta|sport|terheles/.test(s))return'activity';
 if(/lelet|korhaz|intenziv|mutet|korlap|vizsgalat|diagnoz|kezeles|kardiolog|anamnezis/.test(s))return'records';
 if(/taplalkoz|etel|etkezes|kaloria|folyadek|koffein|diet|feherje|cukorfogyaszt/.test(s))return'nutrition';
 if(/kepernyoido|telefonhasznalat|digital|digitalis|internet|media|screen/.test(s))return'digital';
 if(/memoria|figyelem|koncentraci|kognitiv|feledekeny/.test(s))return'cognitive';
 if(/faj|szedul|tunet|panasz|rosszul|zsibbad|legszomj|hanyinger/.test(s))return'symptoms';
 return'general'
}
var titles={
 headache:'Fejfájás: mit mutatnak az adataid?',
 sleep:'Az alvásod és a regenerálódásod',vitals:'A keringési méréseid áttekintése',
 weight:'Testsúlyod és a kapcsolódó mérések',medication:'Gyógyszerek: amit a HealthHub rögzített',
 environment:'Időjárás és környezeti egészség',infection:'Fertőzésfigyelés és panaszok',
 activity:'Aktivitás, mozgás és terhelés',records:'Kórtörténet és leletelőzmények',
 nutrition:'Táplálkozás és közérzet',digital:'Digitális jóllét és pihenés',
 cognitive:'Memória és koncentráció',symptoms:'Tünetek és megfigyelhető összefüggések',
 general:'HealthHub: amit a kérdésedhez látok'
};
function compose(r,question){
 if(!r||r.schema!=='healthhub.intelligence.context/1')throw Error('A HealthHub Intelligence adatai még nem érhetők el.');
 if(r.profile!==profile())throw Error('Profilváltás történt. Indíts új kutatást.');
 var q=String(question||r.question||'').trim(),kind=classify(q);
 if(kind==='headache')return v329.compose(r,q);
 var facts=[],assessment=[],suggestions=[],warnings=[],used=new Set();
 function note(s){if(s&&!assessment.includes(s))assessment.push(s)}
 function advise(s){if(s&&!suggestions.includes(s))suggestions.push(s)}
 function warning(s){if(s&&!warnings.includes(s))warnings.push(s)}
 function add(id,e,context){
  if(!e)return null;
  var unique=id+'|'+e.name+'|'+e.value;if(used.has(unique))return e;used.add(unique);
  facts.push({text:(context||e.name)+': '+String(e.value||'')+(e.unit?' '+e.unit:'')+
    (e.detail&&id==='symptoms'?' · '+e.detail:''),at:e.observedAt||null,origin:id+' / '+e.name});
  return e;
 }
 function pick(id,rx,txt){return add(id,find(r,id,rx),txt)}
 function bulk(id,limit,filter){
  var x=entries(r,id).filter(function(e){return(!filter||filter(e))&&e&&e.value!==''});
  x.slice(0,limit).forEach(function(e){add(id,e)});
  return x;
 }
 function age(e){return when(e&&e.observedAt)}
 function vitals(){
  var bp=pick('vitals',/^vernyomas$/,'Legutóbbi vérnyomás');
  var pul=pick('vitals',/^pulzus$/,'Legutóbbi pulzus');
  var ox=pick('vitals',/veroxigen/,'Legutóbbi becsült véroxigén');
  if(bp){
   var syst=number(bp.value),diast=number(bp.value&&bp.value.split('/')[1]);
   if((syst!=null&&syst>=140)||(diast!=null&&diast>=90))
    note('A '+bp.value+' Hgmm vérnyomásmérés emelkedett tartományba esik. '+
      (age(bp)!=null&&age(bp)>24?'Mivel a mérés nem mai, ebből nem következik a jelenlegi vérnyomás. ':'')+
      'Nyugalomban érdemes ismételten mérni, majd a trendet áttekinteni.');
   else if(age(bp)!=null&&age(bp)>48)note('Az utolsó vérnyomásmérés többnapos. Aktuális panasz értékeléséhez friss érték hasznosabb.');
   if((syst!=null&&syst>=180)||(diast!=null&&diast>=120))warning('Ha a vérnyomás 5 perc nyugalom után ismételten 180/120 Hgmm körüli vagy magasabb, sürgős orvosi tanács szükséges; mellkasi fájdalom, nehézlégzés, neurológiai tünet esetén hívd a 112-t.');
  }
  if(pul&&number(pul.value)!=null&&number(pul.value)>100)
   note('A rögzített '+pul.value+'/perces pulzus magasabb lehet a nyugalmi tartománynál, de a mérés körülményei és időpontja nélkül nem értékelhető biztosan.');
  if(ox&&number(ox.value)!=null&&number(ox.value)<=92)
   warning('A rögzített '+ox.value+'%-os véroxigénadatot ellenőrizd nyugalomban megbízható ujjra helyezhető pulzoximéterrel. Ha ismételten 92% vagy kevesebb, kérj sürgős orvosi értékelést. Nehézlégzés, mellkasi fájdalom vagy zavartság esetén azonnal 112.');
  return !!(bp||pul||ox)
 }
 function sleep(){
  var last=pick('sleep',/^legutobbi alvas$/,'Legutóbbi mért alvásszakasz');
  var h72=pick('sleep',/72 oras alvasatlag/,'72 órás alvásszakasz-átlag');
  var h7=pick('sleep',/7 napos alvasatlag/,'7 napos alvásszakasz-átlag');
  var h30=pick('sleep',/30 napos alvasatlag/,'30 napos alvásszakasz-átlag');
  var a=number(h72&&h72.value),b=number(h7&&h7.value);
  if(a!=null&&a<360)note('A 72 órás alvásszakasz-átlag '+duration(a)+', ami rövid. A kevés alvás fáradtsággal, ingerlékenységgel és fejfájással is összefügghet.');
  if(a!=null&&b!=null&&Math.abs(a-b)>=45)
   note('A 72 órás átlag '+Math.round(Math.abs(a-b))+' perccel '+(a<b?'alacsonyabb':'magasabb')+' a 7 napos átlagnál.');
  if(last||h72||h7||h30)
   note('A Health Connect töredezett alvásszakaszokat is tárolhat. Ezek a számok nem feltétlenül egy teljes éjszaka összevont alvásidejét jelentik; a mélyalvás és REM itt nincs hitelesítve.');
  return !!(last||h72||h7||h30)
 }
 function environment(){
  var t=pick('environment',/^homerseklet$/,'Hőmérséklet');
  pick('environment',/^paratartalom$/,'Páratartalom');
  pick('environment',/^legnyomas$/,'Légnyomás');
  var delta=pick('environment',/legnyomas.valtozas 6 ora|6 oras legnyomas/,'Hatórás légnyomásváltozás');
  var aqi=pick('environment',/levegominosegi index|^levegominoseg$/,'Levegőminőség');
  var pollen=bulk('environment',4,function(e){return /pollen/i.test(e.name)});
  if(delta&&number(delta.value)!=null&&Math.abs(number(delta.value))>=4)
   note('A légnyomás az elmúlt hat órában érdemben változott ('+delta.value+' hPa). Ez időnként társulhat fejfájással, de nem bizonyítja annak okát.');
  if(aqi&&number(aqi.value)!=null&&number(aqi.value)<40)note('A rögzített levegőminőségi index jelenleg nem utal jelentős általános légszennyezettségre.');
  if(source(r,'environment')&&source(r,'environment').status==='stale')
   warning('A környezeti mérések régebbiek három óránál. A jelenlegi időjárás eltérhet.');
  if(pollen.length)note('A pollenértékek mért környezeti adatok, nem személyes allergiavizsgálat. Az adott allergénre való érzékenység és a tünetnapló fontos a kapcsolat értelmezéséhez.');
  return !!(t||delta||aqi||pollen.length)
 }
 function symptom(){
  var list=entries(r,'symptoms');
  list.slice(0,4).forEach(function(e){add('symptoms',e,'Tünetnapló · '+e.name)});
  if(list.length)note('A naplóban szereplő '+list.length+' kapcsolódó bejegyzés alapján érdemes a panasz időpontját és a korábbi méréseket összevetni. Egybeesés nem bizonyít ok-okozati kapcsolatot.');
  return list.length>0
 }
 function activity(){
  var steps=pick('activity',/legutobbi napi lepesszam/,'Legutóbbi napi lépésszám');
  pick('activity',/utolso nap aktiv percei/,'Legutóbbi aktív percek');
  var avg=pick('activity',/7 napos napi lepesatlag/,'Heti napi lépésátlag');
  var a=number(steps&&steps.value),b=number(avg&&avg.value);
  if(a!=null&&b!=null&&b>0&&Math.abs(a-b)/b>=.3)
   note('A legutóbbi nap lépésszáma mintegy '+Math.round(Math.abs(a-b)/b*100)+'%-kal '+(a>b?'magasabb':'alacsonyabb')+' a heti napi átlagnál.');
  return !!(steps||avg)
 }
 function medication(){
  var items=bulk('medication',8,function(e){return /gyogyszer|elozmeny/i.test(norm(e.name))});
  if(items.length)note('A felsorolt készítmények a profilban rögzített adatok. Nem bizonyítják, hogy valamennyit jelenleg is szeded.');
  return items.length>0
 }
 function weight(){
  var kg=pick('vitals',/^testsuly$/,'Legutóbbi testsúly');
  var x=age(kg);
  if(kg&&x!=null&&x>7*24)note('A legutóbbi testsúlymérés több mint egyhetes; jelenlegi változás vagy tendencia egyetlen mérésből nem állapítható meg.');
  return !!kg
 }
 function records(){
  var list=entries(r,'records');
  list.slice(0,5).forEach(function(e){add('records',e)});
  note('Ez csak a dokumentumok indexe. A kórlap tartalmát nem olvastam ki; konkrét diagnózis, beavatkozás vagy kórházi idővonal nem állítható össze pusztán a címekből.');
  return list.length>0
 }
 function infection(){
  var list=entries(r,'infection');list.slice(0,5).forEach(function(e){add('infection',e)});
  if(list.length)note('A járványügyi adatok lakossági megfigyelést jelentenek, nem azt, hogy a saját panaszaidat fertőzés okozza.');
  if(source(r,'infection')&&source(r,'infection').status==='stale')warning('A rendelkezésre álló járványügyi jelentés már régi; a heti adatokat csak időbélyeggel szabad értelmezni.');
  return list.length>0
 }
 switch(kind){
 case'sleep':sleep();symptom();vitals();advise('A következő napokban próbálj azonos időpontban lefeküdni, és rögzítsd a nappali fáradtságot. A korábbi átlagok alapján a változást újra meg tudjuk nézni.');break;
 case'vitals':vitals();symptom();sleep();advise('Mérj nyugalomban, hasonló körülmények között, és több érték trendjéből induljunk ki, ne egyetlen mérésből.');break;
 case'weight':weight();activity();advise('A súlytrendhez azonos napszakban, lehetőleg reggel mért értékeket érdemes összehasonlítani, nem egyetlen nap ingadozását.');break;
 case'activity':activity();sleep();symptom();advise('A terhelést fokozatosan igazítsd a saját állapotodhoz; ha egy mozgás után rosszabbul vagy, ezt tünetnaplóval és időponttal együtt jegyezd fel.');break;
 case'environment':environment();symptom();advise('Kültéri program előtt nézd meg a friss pollen- és levegőminőségi értékeket, és vesd össze az esetleges tüneteiddel.');break;
 case'infection':infection();symptom();vitals();advise('Fertőzésgyanú esetén a saját tünetek, láz és időbeli alakulás fontosabb, mint az országos jelzések. Romló állapotnál beszélj orvossal.');break;
 case'medication':medication();vitals();advise('Ne változtasd meg önállóan a gyógyszeradagot. Vény nélküli gyógyszer vagy étrend-kiegészítő előtt ellenőrizni kell az aktuális gyógyszerlistát és az ellenjavallatokat gyógyszerésszel vagy orvossal.');break;
 case'records':records();medication();advise('Ha konkrét kórházi eseményre vagy leleteredményre kérdeztél rá, a teljes forrásszöveg bevonása szükséges; az opcionális PDF-mélykutatás erre szolgál.');break;
 case'symptoms':symptom();vitals();sleep();environment();advise('Írd fel, mikor kezdődött a tünet, mennyi ideig tart, milyen erős, és mi előzte meg. Romló, szokatlan vagy visszatérő panasszal egyeztess a háziorvossal.');break;
 case'nutrition':symptom();weight();activity();note('Részletes étkezési vagy kalórianapló jelenleg nem szerepel a beolvasott adatforrások között, ezért konkrét tápanyagbevitelt nem becsülök.');advise('Első lépésként néhány napig rögzítheted az étkezések időpontját és az esetleges tüneteket. Folyadék- vagy étrendi korlátozást mindig az egyéni orvosi előíráshoz kell igazítani.');break;
 case'digital':sleep();note('Az automatikus képernyőidő még nem tartozik a beolvasott HealthHub-adatok közé. Nem állítom, hogy egy adott estén mennyit használtad a telefont.');advise('Próbálj néhány este 30–60 perccel kevesebb képernyőhasználatot lefekvés előtt, és figyeld, változik-e az alvásod.');break;
 case'cognitive':sleep();symptom();note('A HealthHubból most nem olvasható ki ellenőrzött kognitív teszteredmény; memóriazavart vagy diagnózist ebből nem lehet megállapítani.');advise('Ha a koncentrációs gond új vagy romlik, figyeld az alvást, stresszt és a panasz időzítését, és beszélj a háziorvosoddal.');break;
 default:symptom();vitals();sleep();activity();environment();note('A rendszer a meglévő adatokat össze tudja vetni, de nem minden kérdéshez van pontosan megfelelő napló. Itt csak ténylegesen elérhető méréseket soroltam fel.');advise('Írd meg röviden, milyen panaszt vagy változást szeretnél megérteni, és mi történt mostanában. Így relevánsabb adatokat tudok kiválasztani.');break;
 }
 if(!facts.length)note('A kérdéshez jelenleg nincs közvetlenül kiolvasható mérés vagy naplóbejegyzés. Ettől a kutatás nem áll le, de nem fogok adatokat kitalálni.');
 if(!assessment.length)note('A felsorolt értékek tények, azonban egyetlen adat vagy együttjárás alapján nem állítható fel biztos ok-okozati magyarázat.');
 if(!suggestions.length)advise('Ha a panasz visszatér, romlik vagy szokatlan, érdemes a háziorvosoddal egyeztetni.');
 if(kind==='symptoms'||kind==='vitals'||kind==='infection')warning('Erős mellkasi fájdalom, súlyos nehézlégzés, ájulás vagy új féloldali gyengeség esetén azonnal hívj sürgősségi segítséget (112).');
 return {profile:r.profile,question:q,title:titles[kind],facts:facts.slice(0,16),assessment:assessment.slice(0,7),
  suggestions:suggestions.slice(0,4),warnings:warnings.slice(0,4),timestamp:new Date().toISOString(),
  mode:'domain-aware-local-preview',category:kind,
  disclaimer:'HealthHub v330: a helyi adatokból készített, kérdésvezérelt, szabályalapú előelemzés. Nem generatív AI-válasz, nem diagnózis. A pontos forrásidőpontokat az egyes kártyák mutatják.'};
}
window.HH_LENA_UNIVERSAL_V330={
 classify:classify,
 compose:compose,
 show:function(report,question){var a=compose(report,question);v329.present(a);return a}
};
document.documentElement.dataset.healthhubUniversalResearch='1.330';
})();