(function(){
'use strict';
/* HealthHub v329: fact-based local FIRST answer, with source timestamps.
   No diagnoses, LLM calls, automatic health-data transmission or store mutations. */
var BOX='hhLenaAnswer329', STYLE='hhLenaAnswerStyle329', last=null;
function el(id){return document.getElementById(id)}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]})}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function parseVal(x){if(!x)return null;var m=String(x).replace(/\s/g,'').replace(',','.').match(/[-+]?\d+(\.\d+)?/);return m?Number(m[0]):null}
function date(x){if(!x)return 'dátum nélkül';var d=new Date(/^\d{4}-\d\d-\d\d$/.test(x)?x+'T12:00:00':x);return Number.isFinite(+d)?d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'dátum nélkül'}
function age(x){if(!x)return null;var t=Date.parse(/^\d{4}-\d\d-\d\d$/.test(x)?x+'T12:00:00':x);return Number.isFinite(t)?Math.max(0,(Date.now()-t)/3600000):null}
function source(report,id){return(report.sources||[]).find(function(s){return s.id===id})||null}
function get(report,id,name){
 var s=source(report,id);return s&&(s.entries||[]).find(function(e){return e.name===name})||null;
}
function fact(e){return e?e.value+(e.unit?' '+e.unit:''):''}
function compose(report,question){
 if(!report||report.schema!=='healthhub.intelligence.context/1')throw Error('A HealthHub-adatok még nem érhetők el.');
 if(report.profile!==pkey())throw Error('Profilváltás történt. Indíts új kutatást.');
 var q=norm(question||report.question||''),head=/fej|migren/.test(q),sleepQuery=/alv|alsz|alud|farad|kimer|pihen/.test(q),
 symptom=source(report,'symptoms'),bp=get(report,'vitals','Vérnyomás'),pulse=get(report,'vitals','Pulzus'),
 oxy=get(report,'vitals','Véroxigén'),sleep7=get(report,'sleep','7 napos alvásátlag'),
 sleep72=get(report,'sleep','72 órás alvásátlag'),lastSleep=get(report,'sleep','Legutóbbi alvás'),
 pressure=get(report,'environment','Légnyomás-változás 6 óra'),
 env=source(report,'environment'),temperature=get(report,'environment','Hőmérséklet'),
 steps=get(report,'activity','Legutóbbi napi lépésszám');
 var lines=[],judgments=[],suggestions=[],warnings=[],seen=[];
 function add(e,text){if(e){lines.push({text:text||e.name+': '+fact(e),at:e.observedAt||null,origin:e.name});}}
 if(symptom&&symptom.entries&&symptom.entries.length){
  var f=symptom.entries[0];add(f,'A tünetnaplóban: '+f.name+' · '+fact(f)+
   (f.detail?' · '+f.detail:'')+'.');
  if(/megszunt/i.test(norm(f.detail)))judgments.push('A legutóbbi naplóbejegyzés szerint ez a panasz megszűnt. Ha visszatér, azt érdemes új eseményként rögzíteni.');
 }else if(head){judgments.push('A megadott kérdéshez nem látok kapcsolódó tünetnapló-bejegyzést; a mostani panasz kezdetét, erősségét és jellegét érdemes rögzíteni.')}
 if(bp){add(bp,'Legutóbbi vérnyomás: '+fact(bp)+'.');var sys=parseVal(bp.value),a=age(bp.observedAt);
  if(sys!=null&&sys>=140)judgments.push('A rögzített vérnyomás szisztolés értéke emelkedett. '+(a!=null&&a>=24?'Ez nem mai mérés, ezért a mostani panaszt önmagában nem magyarázza; ': '')+'nyugalomban érdemes megismételni a mérést.');
  else if(a!=null&&a>=48)judgments.push('A vérnyomásadat többnapos. Mai panasz esetén friss mérés lenne informatív.');
 }
 if(pulse)add(pulse,'Legutóbbi pulzus: '+fact(pulse)+'.');
 if(oxy){add(oxy,'Legutóbbi véroxigén-érték: '+fact(oxy)+'.');var ox=parseVal(oxy.value);
  if(ox!=null&&ox<=92)warnings.push('A rögzített '+fact(oxy)+' véroxigén-érték alacsony lehet, bár az óra mérése tévedhet. Ellenőrizd megbízható ujjra helyezhető pulzoximéterrel, nyugalomban. Ha ismételten 92% vagy alatta marad, sürgős orvosi értékelés indokolt; nehézlégzés, mellkasi fájdalom, zavartság vagy kékülés esetén azonnal 112.');
  else if(ox!=null&&ox<95)warnings.push('A rögzített '+fact(oxy)+' véroxigén-értéket érdemes nyugalomban, megbízható eszközzel újramérni; tartósan alacsony értékkel egyeztess orvossal.');
 }
 if(lastSleep)add(lastSleep,'Legutóbbi rögzített alvásszakasz: '+fact(lastSleep)+'.');
 if(sleep72)add(sleep72,'72 órás átlagos alvásszakasz: '+fact(sleep72)+'.');
 if(sleep7)add(sleep7,'7 napos átlagos alvásszakasz: '+fact(sleep7)+'.');
 var dur=parseVal(sleep72&&sleep72.value);
 if(dur!=null&&dur<360)judgments.push('Az elmúlt 72 órában az átlagos rögzített alvásszakasz hat óra alatt van. Ez fáradtsághoz és fejfájáshoz hozzájárulhat, de a töredezett szakaszok miatt nem feltétlenül a teljes éjszakai alvásidő.');
 if(steps)add(steps,'Legutóbbi napi lépésszám: '+fact(steps)+'.');
 if(temperature)add(temperature,'Környezeti hőmérséklet: '+fact(temperature)+'.');
 if(pressure){add(pressure,'Légnyomásváltozás az utolsó 6 órában: '+fact(pressure)+'.');
  var pd=parseVal(pressure.value);if(pd!=null&&Math.abs(pd)>=4)judgments.push('A légnyomás érdemben változott. Egyeseknél ez együtt járhat fejfájással, de önmagában nem bizonyít okot.');}
 if(env&&env.status==='stale')warnings.push('Az időjárási adat régi, az aktuális állapotra nem biztos, hogy használható.');
 if(head){suggestions.push('Ma elsőként pihenést, megfelelő folyadékbevitelt és 10–15 perc kellemesen hűvös borogatást próbálnék. Feszülő nyaknál a meleg is jóleshet.');suggestions.push('Ha a fejfájás újra jelentkezik, rögzítsd a kezdés idejét, erősségét és a kapcsolódó vérnyomásmérést. Visszatérő vagy romló panasszal keresd fel a háziorvost.');warnings.push('Hirtelen, rendkívül erős fejfájás, új beszéd-, látás- vagy mozgászavar, ájulás esetén azonnali sürgősségi ellátás szükséges.');}
 else if(sleepQuery){suggestions.push('Próbálj több egymást követő napon hasonló lefekvési időt tartani, és figyeld, változnak-e a nappali tünetek.');}
 else{suggestions.push('A legutóbbi méréseket a kérdéshez kapcsolódó tünetekkel és időpontokkal érdemes összevetni. Ha a panasz fennáll vagy romlik, kérj orvosi tanácsot.');}
 if(!lines.length)judgments.push('Most nincs kiolvasható, időponttal rendelkező személyes mérés. Léna ilyenkor nem talál ki számokat vagy előzményeket.');
 if(!judgments.length&&lines.length)judgments.push('A rendelkezésre álló mérések közül több releváns lehet, de ezek önmagukban nem adnak biztos magyarázatot. Az időbeli egybeesést külön kell ellenőrizni.');
 var title=head?'Fejfájás: ezt látom most a HealthHubban':sleepQuery?'Alvás és fáradtság: amit a számok mutatnak':'Léna első, adatvezérelt javaslata';
 return {profile:report.profile,question:question||report.question,title:title,
   facts:lines,assessment:judgments,suggestions:suggestions,warnings:warnings,
   timestamp:new Date().toISOString(),mode:'deterministic-local-preview',
   disclaimer:'Ez a v329 helyi, szabályalapú előelemzése. Nem generatív AI-válasz, nem diagnózis, és nem helyettesíti az orvosi vizsgálatot.'};
}
function styles(){
 if(el(STYLE))return;var s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+BOX+'{background:linear-gradient(150deg,#f6fcfb,#fff);border:1px solid #b3dade;border-radius:20px;box-shadow:0 9px 28px #1e72851a;color:#17465d;padding:17px;min-width:0}'+
 '#'+BOX+' h2{font-size:18px;margin:0 0 8px;color:#134a60}'+
 '#'+BOX+' h3{font-size:13px;margin:15px 0 7px;color:#0d5872}'+
 '#'+BOX+' .hh329lead{font-size:12px;line-height:1.6;color:#557a87;margin:0 0 10px}'+
 '#'+BOX+' .hh329facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'+
 '#'+BOX+' .hh329item{border:1px solid #d8ebed;border-radius:12px;padding:10px;background:#fff;line-height:1.5;font-size:12px;overflow-wrap:anywhere}'+
 '#'+BOX+' .hh329item small{display:block;color:#6a8b97;font-size:10px;margin-top:3px}'+
 '#'+BOX+' .hh329point{font-size:13px;line-height:1.65;margin:8px 0;color:#204d61}'+
 '#'+BOX+' .hh329warn{background:#fff7ef;border:1px solid #f0d5b5;border-radius:12px;padding:10px 12px}'+
 '#'+BOX+' .hh329hint{font-size:11px;line-height:1.6;color:#627e8b;margin:11px 0 0}'+
 '@media(max-width:590px){#'+BOX+'{padding:14px}#'+BOX+' .hh329facts{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
function render(answer){
 var page=el('hhLenaSmart299');if(!page)return null;styles();var host=el(BOX);
 if(!host){host=document.createElement('section');host.id=BOX;host.setAttribute('aria-live','polite');
  var bridge=el('hhIntelligence328'),parent=page.querySelector('.askWidth');
  if(bridge&&bridge.parentNode)bridge.parentNode.insertBefore(host,bridge);
  else if(parent)parent.insertBefore(host,parent.children[1]||null);
 }
 host.innerHTML='<h2>❤️ Léna javaslata · '+esc(answer.profile==='monika'?'Mónika':'Zsolt')+'</h2>'+
  '<p class="hh329lead">'+esc(answer.title)+' · '+esc(date(answer.timestamp))+'</p>'+
  (answer.facts.length?'<h3>📊 Amit ténylegesen kiolvastam</h3><div class="hh329facts">'+answer.facts.slice(0,12).map(function(f){return '<div class="hh329item">'+esc(f.text)+'<small>'+esc(date(f.at))+'</small></div>'}).join('')+'</div>':'')+
  '<h3>🧠 Mit érdemes ebből kiolvasni?</h3>'+
  answer.assessment.map(function(f){return '<p class="hh329point">'+esc(f)+'</p>'}).join('')+
  '<h3>💙 Mit javaslok?</h3>'+answer.suggestions.map(function(f){return '<p class="hh329point">'+esc(f)+'</p>'}).join('')+
  (answer.warnings.length?'<div class="hh329warn"><h3>⚠️ Biztonsági jelzések</h3>'+answer.warnings.map(function(f){return '<p class="hh329point">'+esc(f)+'</p>'}).join('')+'</div>':'')+
  '<p class="hh329hint">'+esc(answer.disclaimer)+'</p>';
 return host;
}
function clear(){last=null;var host=el(BOX);if(host)host.remove()}
window.HH_LENA_LOCAL_ANSWER_V329={
 compose:compose,
 show:function(report,question){var a=compose(report,question);last=a;return render(a)},
 getLast:function(){return last},
 clear:clear
};
window.addEventListener('healthhub:profile-changed',clear);
document.documentElement.dataset.healthhubSourceFirstAnswer='1.329';
})();