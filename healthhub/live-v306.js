(function () {
  'use strict';
  const ID = 'hhHealthConnect306';
  const esc = value => String(value == null ? '—' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const profile = () => localStorage.getItem('hh-profile') === 'm' ? 'monika' : 'zsolt';
  const android = () => /Android/i.test(navigator.userAgent);
  const names = {zsolt: 'Zsolt', monika: 'Mónika'};
  const labels = {pending:'Telefonra vár', running:'Beolvasás', uploading:'Feltöltés', retrying:'Újrapróbálásra vár', done:'Felhőben kész', failed:'Sikertelen', rejected:'Elutasítva', expired:'Lejárt'};
  let devices = [], histories = {}, error = '', loading = false, sending = false, selectedDays = 1;
  const imported = new Set();
  const fmt = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('hu-HU') : 'Még nincs visszajelzés';
  const client = () => window.HHBridgeControl.createClient(window.HH_DROPBOX_VAULT);
  const connected = () => !!window.HH_DROPBOX_VAULT?.connected();
  function native(action) { location.href = 'healthhubconnect://bridge?action=' + action + '&profile=' + profile(); }
  function render() {
    const body = document.getElementById('haBody');
    if (!body || !document.getElementById('haOv')?.classList.contains('on')) return;
    let panel = document.getElementById(ID);
    if (!panel) { panel = document.createElement('section'); panel.id = ID; body.prepend(panel); }
    const p = profile();
    const rows = devices.filter(d => d.activeProfile === p).map(d => {
      const fresh = Date.now() - Date.parse(d.lastSeenAt) < 20 * 60000;
      const permissions = d.permissions || {};
      const permissionText = Object.entries(permissions).map(([key, yes]) => esc(key.replace('READ_', '')) + ': ' + (yes ? '✓' : 'hiányzik')).join('<br>') || 'Bridge-frissítés szükséges';
      const history = histories[d.deviceId] || [];
      const last = history[0];
      const counts = Object.entries(d.counts || {}).map(([key, count]) => esc(key) + ': ' + esc(count)).join(' · ') || 'Még nincs beolvasás';
      const ready = d.protocolVersion === 2 && connected();
      return '<article><h4>' + esc(d.name) + '</h4><p>' + (fresh ? 'Nemrég jelentkezett' : 'Offline / nincs friss visszajelzés') + ' · ' + esc(names[d.activeProfile]) + ' · v' + esc(d.build) + '</p>' +
        '<dl><dt>Health Connect</dt><dd>' + (d.healthConnectAvailable === true ? 'Elérhető' : d.healthConnectAvailable === false ? 'Nem elérhető' : 'Ismeretlen') + '</dd>' +
        '<dt>Háttérhozzáférés</dt><dd>' + (d.backgroundGranted ? 'Engedélyezve' : d.backgroundSupported === false ? 'Nem támogatott' : d.backgroundGranted === false ? 'Nincs engedély' : 'Ismeretlen') + '</dd>' +
        '<dt>Utolsó HC olvasás</dt><dd>' + esc(fmt(d.lastHealthRead)) + '</dd><dt>Utolsó cloud sync</dt><dd>' + esc(fmt(d.lastCloudSync)) + '</dd><dt>Eszköz jelentkezése</dt><dd>' + esc(fmt(d.lastSeenAt)) + '</dd></dl>' +
        '<details><summary>Jogosultságok · ' + Object.values(permissions).filter(Boolean).length + '/' + Object.keys(permissions).length + '</summary>' + permissionText + '</details>' +
        '<details><summary>Importált rekordok (utolsó olvasás)</summary>' + counts + '</details>' +
        '<div class="hc306-actions"><button data-sync="' + esc(d.deviceId) + '" ' + (!ready || sending ? 'disabled' : '') + '>SYNC NOW</button><button data-diagnostics="' + esc(d.deviceId) + '" ' + (!ready || sending ? 'disabled' : '') + '>Diagnostics</button></div>' +
        '<p role="status">' + (last ? esc(labels[last.state] || last.state) + ' · ' + esc(last.result?.message || 'A kérés a központi sorban van.') : 'Még nincs szinkronkérés.') + '</p>' +
        (last?.state === 'done' && last.command.action === 'sync' ? '<p>Helyi nézet: ' + (imported.has(last.command.requestId) ? 'frissítve a felhőből ✓' : 'frissítésre vár') + '</p>' : '') +
        '<details><summary>Kérések és diagnosztika</summary>' + history.map(h => '<p>' + esc(fmt(h.command.issuedAt)) + ' · ' + esc(h.command.action) + ' · ' + esc(labels[h.state] || h.state) + '<br>' + esc(h.result?.message || '') + '</p>').join('') + '</details></article>';
    }).join('');
    panel.innerHTML = '<h3>Health Connect</h3><p>Aktív profil: <strong>' + names[p] + '</strong> · Cloud: ' + (connected() ? 'Csatlakoztatva' : 'Nincs kapcsolat') + '</p>' +
      '<div class="hc306-actions"><label>Újraolvasás <select id="hc306days"><option value="1">24 óra</option><option value="7">7 nap</option><option value="30">30 nap</option></select></label><button id="hc306refresh">Állapot frissítése</button></div>' +
      (error ? '<p role="alert">' + esc(error) + '</p>' : '') + (rows || '<p>Még nincs ehhez a profilhoz regisztrált telefon. Androidon válaszd a Telefon csatlakoztatása gombot.</p>') +
      (android() ? '<div class="hc306-actions"><button data-native="setup">Telefon csatlakoztatása</button><button data-native="settings">Health Connect megnyitása</button><button data-native="permissions">Jogosultságok kezelése</button><button data-native="background">Háttérhozzáférés</button><button data-native="poll">Kérések végrehajtása ezen a telefonon</button></div>' : '') +
      '<p class="hc306-note">A kérés a felhőben vár a telefonra. A háttérellenőrzést az Android ütemezi, legalább 15 perces ciklussal és esetleges további késéssel. A Health Connect megnyitása és az engedélyezés a telefonon érhető el. A böngészőben az adatok helyi gyorsítótárból is megjelenhetnek.</p>';
    panel.querySelector('#hc306days').value = String(selectedDays);
    panel.querySelector('#hc306days').onchange = e => { selectedDays = Number(e.target.value); };
    panel.querySelector('#hc306refresh').onclick = refresh;
    panel.querySelectorAll('[data-native]').forEach(b => { b.onclick = () => native(b.dataset.native); });
    panel.querySelectorAll('[data-sync], [data-diagnostics]').forEach(b => { b.onclick = () => send(b.dataset.sync || b.dataset.diagnostics, b.dataset.sync ? 'sync' : 'diagnostics'); });
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      if (!connected()) { devices = []; return; }
      error = '';
      const api = client();
      devices = await api.devices();
      for (const d of devices.filter(d => d.protocolVersion === 2 && d.activeProfile === profile())) {
        histories[d.deviceId] = await api.history(d);
        for (const h of histories[d.deviceId]) {
          if (h.state !== 'done' || h.command.action !== 'sync' || h.command.profile !== profile() || imported.has(h.command.requestId)) continue;
          // Cloud completion and dashboard import are separate acknowledgements.
          const ok = await window.hhHealthCloudSyncProfile?.(profile(), true);
          if (ok) imported.add(h.command.requestId);
          else error = 'A cloud feltöltés kész; a helyi nézet frissítése még nem sikerült.';
          break;
        }
      }
    } catch (e) { error = e.message || 'Állapot nem olvasható.'; }
    finally { loading = false; render(); }
  }
  async function send(id, action) {
    if (sending) return;
    sending = true; error = ''; render();
    try {
      const d = devices.find(d => d.deviceId === id);
      await client().send(d, profile(), selectedDays, action);
      window.toast?.('Szinkronkérés a központi sorban.');
    } catch (e) { error = e.message; }
    finally { sending = false; await refresh(); }
  }
  window.hhSyncNow = async function () {
    if (!connected()) { window.toast?.('Előbb csatlakoztasd a Dropbox Vaultot az Adminban.'); return; }
    try {
      devices = await client().devices();
      const candidates = devices.filter(d => d.activeProfile === profile() && d.protocolVersion === 2);
      if (candidates.length !== 1) { window.toast?.('Az Admin → Health Connect panelen válaszd ki a telefont.'); return; }
      await send(candidates[0].deviceId, 'sync');
    } catch (e) { window.toast?.(e.message); }
  };
  const style = document.createElement('style');
  style.textContent = '#hhHealthConnect306{margin:12px 0;padding:16px;border:1px solid currentColor;border-radius:16px;color:inherit;background:inherit;font-size:14px;line-height:1.5}#hhHealthConnect306 article{border-top:1px solid #9aa9b966;padding:12px 0}#hhHealthConnect306 h3,#hhHealthConnect306 h4{margin:4px 0}#hhHealthConnect306 dl{display:grid;grid-template-columns:minmax(100px,1fr) 2fr;gap:6px}#hhHealthConnect306 dd{margin:0;overflow-wrap:anywhere}#hhHealthConnect306 button,#hhHealthConnect306 select{font:inherit;padding:9px;border-radius:8px;border:1px solid currentColor;background:inherit;color:inherit;cursor:pointer}#hhHealthConnect306 button:disabled{opacity:.45;cursor:default}.hc306-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.hc306-note{font-size:12px;opacity:.8}#hhHealthConnect306 details{padding:5px 0}';
  document.head.appendChild(style);
  function attach() {
    const overlay = document.getElementById('haOv');
    if (!overlay) { setTimeout(attach, 500); return; }
    new MutationObserver(() => { if (overlay.classList.contains('on')) refresh(); }).observe(overlay, {attributes:true, attributeFilter:['class']});
    const body = document.getElementById('haBody');
    if (body) new MutationObserver(() => {
      if (overlay.classList.contains('on') && !document.getElementById(ID)) render();
    }).observe(body,{childList:true});
    document.documentElement.dataset.healthhubBridgeAdminReady = '1';
    if (overlay.classList.contains('on')) refresh();
  }
  window.addEventListener('healthhub:profile-changed', () => { error = ''; refresh(); });
  window.addEventListener('focus', refresh);
  setInterval(() => { if (document.visibilityState === 'visible' && document.getElementById('haOv')?.classList.contains('on')) refresh(); }, 15000);
  attach();
})();
