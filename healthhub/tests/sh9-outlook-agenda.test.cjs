const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/index.html');
const script=read('sh9/outlook-agenda-v1.js');
const css=read('sh9/outlook-agenda-v1.css');
const model=require('../../sh9/outlook-agenda-model-v1.js');
function ev(id,start,end,showAs='busy',opts={}){
 return {id,subject:id,start:{dateTime:start,timeZone:'UTC'},end:{dateTime:end,timeZone:'UTC'},showAs,...opts};
}
const a=ev('A','2026-10-26T08:00:00','2026-10-26T09:00:00');
const b=ev('B','2026-10-26T08:30:00','2026-10-26T09:30:00');
test('SH9 Outlook Agenda flags true overlapping busy intervals',()=>{
 const result=model.analyze([a,b]);
 assert.equal(result.events.length,2);
 assert.deepEqual([...result.conflicts].sort(),['A','B']);
 assert.equal(model.headline(result,new Date('2026-10-26T07:00:00Z')).status,'conflict');
 assert.match(model.headline(result,new Date('2026-10-26T07:00:00Z')).value,/2 ütköző/);
});
test('Adjacency, free times, canceled events and duplicates cannot create phantom collisions',()=>{
 const touch=ev('C','2026-10-26T09:00:00','2026-10-26T10:00:00');
 const free=ev('Free','2026-10-26T08:15:00','2026-10-26T08:45:00','free');
 const cancel=ev('Canceled','2026-10-26T08:15:00','2026-10-26T08:45:00','busy',{isCancelled:true});
 const result=model.analyze([a,touch,free,cancel,a]);
 assert.equal(result.events.length,3);
 assert.equal(result.conflicts.size,0);
});
test('Private Outlook subjects stay hidden and malformed/unsupported timezone dates are rejected',()=>{
 const privateEvent=ev('Sensitive','2026-10-26T10:00:00','2026-10-26T11:00:00','busy',{sensitivity:'private',subject:'NEVER SHOW THIS'});
 const privateModel=model.normalize(privateEvent);
 assert.equal(privateModel.title,'Privát esemény');
 assert.equal(model.normalize(ev('Invalid','2026-10-26T11:00:00','2026-10-26T10:00:00')),null);
 assert.equal(model.normalize(ev('InvalidTimezone','2026-10-26T11:00:00','2026-10-26T12:00:00','busy',{start:{dateTime:'2026-10-26T11:00:00',timeZone:'Europe/Budapest'}})),null);
 assert.equal(model.normalize({...privateEvent,id:null}),null);
});
test('All-day busy conflicts count; tentative and out-of-office count; free birthdays do not',()=>{
 const busyAllDay=ev('AllDay','2026-10-26T00:00:00','2026-10-27T00:00:00','busy',{isAllDay:true});
 const maybe=ev('Tentative','2026-10-26T10:00:00','2026-10-26T10:30:00','tentative');
 const away=ev('Away','2026-10-26T11:00:00','2026-10-26T13:00:00','oof');
 const birthday=ev('Birthday','2026-10-26T00:00:00','2026-10-27T00:00:00','free',{isAllDay:true});
 const result=model.analyze([busyAllDay,maybe,away,birthday]);
 assert.deepEqual([...result.conflicts].sort(),['AllDay','Away','Tentative']);
 assert.equal(model.headline(model.analyze([]),new Date('2026-10-26')).status,'ready');
});
test('SH9 launchpad keeps exactly nine original modules and standard taskbar',()=>{
 assert.equal([...html.matchAll(/class="tile" type="button" data-name="/g)].length,9);
 assert.equal([...html.matchAll(/data-nav="/g)].length,5);
 for(const s of ['HealthHub','Family Guard','Smart Travel','Ask Léna'])assert.match(html,new RegExp('data-name="'+s+'"'));
 assert.match(html,/data-name="Smart Travel" data-href="\.\/smart-travel\/"/);
});
test('SH9 Start Page uses real agenda dialog and read-only gated Outlook, not fake synced events',()=>{
 for(const id of ['sh9CalendarCell','sh9CalendarSummary','sh9CalendarValue','sh9CalendarSub','sh9AgendaDialog','sh9AgendaList','sh9AgendaStatus','sh9AgendaConnect','sh9AgendaSave','sh9AgendaAccount','sh9AgendaClientId']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/outlook-agenda-v1\.css/);
 assert.match(html,/outlook-agenda-v1\.js/);
 assert.match(html,/outlook-agenda-model-v1\.js/);
 assert.match(html,/Nincs összekötve/);
 assert.match(css,/\.sh9-agenda-event\.is-conflict/);
 assert.match(script,/Calendars\.Read/);
 assert.match(script,/code_challenge_method','S256'/);
 assert.match(script,/login\.microsoftonline\.com\/consumers/);
 assert.match(script,/graph\.microsoft\.com\/v1\.0/);
 assert.doesNotMatch(script,/client_secret|password=|SH9_MOCK_EVENTS/);
 assert.doesNotMatch(script,/zsolt\.monika@outlook\.com/i,'Do not publish personal account as constant on public GitHub');
});

test('Golden pink/purple highlights only live Outlook values and agenda entries',()=>{
 assert.match(html,/href="\.\/outlook-agenda-v1\.css\?v=4-three-tiles"/);
 assert.match(css,/#sh9CalendarCell\[data-status="ready"\] \.sh9-calendar-summary \.sh9-info-value\{color:#f4b7ea\}/);
 assert.match(css,/#sh9CalendarCell\[data-status="ready"\] \.sh9-calendar-summary \.sh9-info-sub\{color:#f4b7ea\}/);
 assert.match(css,/\.sh9-agenda-subject\{[^}]*color:#f4b7ea/);
 assert.match(css,/\.sh9-agenda-hour\{[^}]*color:#d8bafa/);
 assert.match(css,/#sh9CalendarCell\[data-status="conflict"\] \.sh9-info-value\{color:#ffd6ad\}/);
 assert.match(css,/#sh9CalendarCell\[data-status="error"\] \.sh9-info-value\{color:#ffd9d9\}/);
 assert.doesNotMatch(css,/#sh9CalendarCell\[data-status="pending"\][^\n]*color:#f4b7ea/);
});

test('All three SH9 live info cells have full-size accessible click targets and safe destinations',()=>{
 const strip=html.slice(html.indexOf('<section id="sh9InfoBar6"'),html.indexOf('</section>',html.indexOf('<section id="sh9InfoBar6"')));
 assert.match(strip,/<a id="sh9NamedayCell" class="sh9-info-cell sh9-info-tap" href="https:\/\/outlook\.live\.com\/calendar\/0\/view\/month"/);
 assert.match(strip,/<span class="sh9-info-heading">DÁTUM<\/span><span id="sh9Date6"/);
 assert.match(strip,/<span id="sh9Nameday6" class="sh9-info-sub">NÉVNAP · betöltés/);
 assert.match(strip,/<a id="sh9WeatherCell6" class="sh9-info-cell sh9-info-tap" href="https:\/\/www\.meteoblue\.com\/en\/weather\/week\/budapest_hungary_3054643"/);
 assert.match(strip,/<button id="sh9CalendarCell" type="button" class="sh9-info-cell sh9-calendar-click-target"/);
 assert.match(script,/card\.addEventListener\('click',show\)/);
 assert.match(script,/card\.setAttribute\('aria-label'/);
 assert.doesNotMatch(script,/summary\.addEventListener\('click',show\)/);
 assert.match(css,/#sh9NamedayCell\.sh9-info-tap:focus-visible/);
 assert.match(css,/#sh9WeatherCell6\.sh9-info-tap:focus-visible/);
 assert.match(css,/#sh9CalendarCell\.sh9-calendar-click-target:focus-visible/);
 assert.match(html,/src="\.\/outlook-agenda-v1\.js\?v=6-persistent-ms"/);
});
test('Daily nameday, weather reading, calendar entry are pink; alerts retain their own contrast',()=>{
 assert.match(css,/#sh9NamedayCell \.sh9-info-value,#sh9NamedayCell \.sh9-info-sub/);
 assert.match(css,/#sh9WeatherCell6\[data-status="ready"\] \.sh9-info-value/);
 assert.match(css,/#sh9WeatherCell6\[data-status="ready"\] \.sh9-info-sub\{\s*color:#f4b7ea/);
 assert.match(css,/#sh9CalendarCell\[data-status="ready"\] \.sh9-calendar-summary \.sh9-info-value\{color:#f4b7ea\}/);
 assert.match(css,/#sh9CalendarCell\[data-status="ready"\] \.sh9-calendar-summary \.sh9-info-sub\{color:#f4b7ea\}/);
 assert.match(css,/#sh9CalendarCell\[data-status="conflict"\] \.sh9-info-value\{color:#ffd6ad\}/);
 assert.match(css,/#sh9CalendarCell\[data-status="error"\] \.sh9-info-value\{color:#ffd9d9\}/);
});

test('native SH9 browser handoff opens private calendar through trusted native host, not false native sync',()=>{
 assert.match(html,/outlook-agenda-v1\.js\?v=6-persistent-ms/);
 assert.match(script,/if\(NATIVE\)\{[\s\S]*?card\.addEventListener\('click',/);
 assert.match(script,/searchParams\.set\('sh9external','calendar'\)/);
 assert.match(script,/searchParams\.set\('sh9calendar','1'\)/);
 assert.match(script,/if\(new URLSearchParams\(w\.location\.search\)\.get\('sh9calendar'\)==='1'\)show\(\)/);
 assert.match(script,/setCard\('Outlook Agenda','Megnyitás a böngészőben ›','pending'\)/);
 assert.doesNotMatch(script,/client_secret/);
});
