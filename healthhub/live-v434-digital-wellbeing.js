(function () {
  "use strict";
  /*
   * HealthHub Digital Wellbeing v434 | opt-in, read-only, actual measurements only.
   * This module is not an Android permission prompt or data collector.
   * It reads a profile-bound Dropbox snapshot only through the existing authenticated vault.
   */
  var OPTIN = "hh_dw_preview", ROOT = "hhDw434", busy = 0, mounted = false;
  var enabled = false;
  try { enabled = new URLSearchParams(location.search).get(OPTIN) === "1" ||
    window.HH_DIGITAL_WELLBEING_PREVIEW === true; } catch (_) {}
  if (!enabled) return;

  var SCHEMA = "healthhub.digital-wellbeing/1";
  var oneDay = 86400000;
  var labels = {
    "com.openai.chatgpt": "ChatGPT",
    "com.android.chrome": "Google Chrome",
    "com.microsoft.emmx": "Microsoft Edge",
    "com.sec.android.app.sbrowser": "Samsung Internet",
    "com.google.android.youtube": "YouTube",
    "com.instagram.android": "Instagram",
    "com.whatsapp": "WhatsApp",
    "com.facebook.katana": "Facebook",
    "com.google.android.gm": "Gmail"
  };
  function codeProfile() { return localStorage.getItem("hh-profile") === "m" ? "m" : "z"; }
  function profile() { return codeProfile() === "m" ? "monika" : "zsolt"; }
  function escape(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function dayNow() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function dayValid(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var d = new Date(s + "T12:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }
  function millis(x, max) {
    if (x == null || x === "" || !Number.isFinite(Number(x))) return null;
    var v = Number(x);
    return v >= 0 && v <= (max || oneDay) ? v : null;
  }
  function iso(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(s)) return null;
    var t = Date.parse(s);
    if (!Number.isFinite(t) || t > Date.now() + 300000 || t < Date.UTC(2020, 0, 1)) return null;
    return new Date(t).toISOString();
  }
  function niceTime(ms) {
    if (ms == null) return "Nincs mérés";
    var m = Math.round(ms / 60000);
    return Math.floor(m / 60) + " ó " + (m % 60) + " p";
  }
  function shortTime(s) {
    var t = iso(s);
    return t ? new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest", dateStyle: "short", timeStyle: "short" }).format(new Date(t)) : "Ismeretlen";
  }
  function normalize(raw, p) {
    if (!raw || typeof raw !== "object" || (raw.schema !== SCHEMA && raw.schemaVersion !== SCHEMA) || raw.profile !== p) {
      throw new Error("A forrás profilja vagy sémája nem egyezik.");
    }
    var exportedAt = iso(raw.exportedAt);
    if (!exportedAt || !Array.isArray(raw.days)) throw new Error("Hiányos vagy érvénytelen forrásmetaadat.");
    var seen = Object.create(null), out = [];
    raw.days.slice(0, 40).forEach(function (item) {
      if (!item || !dayValid(item.date) || item.date > dayNow() || seen[item.date]) return;
      seen[item.date] = true;
      var apps = [];
      if (Array.isArray(item.apps)) item.apps.slice(0, 150).forEach(function (a) {
        if (!a || typeof a.packageName !== "string" || !/^[a-zA-Z][a-zA-Z0-9_.]{1,150}$/.test(a.packageName)) return;
        var ms = millis(a.foregroundMs);
        if (ms === null) return;
        apps.push({ packageName: a.packageName, name: labels[a.packageName] || a.packageName, ms: ms,
          lastUsedAt: iso(a.lastUsedAt) });
      });
      apps.sort(function (a, b) { return b.ms - a.ms; });
      out.push({
        date: item.date,
        // An Android UsageStats foreground sum is NOT the Samsung screen-time metric.
        appTotalMs: apps.length ? apps.reduce(function (s, a) { return s + a.ms; }, 0) : null,
        screenOnMs: millis(item.screenOnMs),
        lateNightMs: millis(item.lateNightMs),
        apps: apps
      });
    });
    out.sort(function (a, b) { return b.date.localeCompare(a.date); });
    return { profile: p, exportedAt: exportedAt, days: out,
      source: "Android UsageStatsManager / HealthHub Connect", schema: SCHEMA };
  }
  function vault() { try { return window.HH_DROPBOX_VAULT || null; } catch (_) { return null; } }
  function connected() { var v = vault(); try { return !!(v && v.connected && v.connected() && typeof v.downloadJson === "function"); } catch (_) { return false; } }
  function node(id) { return document.getElementById(id); }
  function pill(id, txt) { var el = node(id); if (el) el.textContent = txt; }
  function state(txt) { pill("hhDwState434", txt); }
  function renderNoData(message) {
    ["hhDwScreen434", "hhDwApps434", "hhDwChat434", "hhDwNight434"].forEach(function (id) { pill(id, "Nincs mérés"); });
    pill("hhDwExport434", "Nincs ellenőrzött export");
    pill("hhDwSource434", "Forrás: nincs ellenőrzött Android-export");
    if (node("hhDwChart434")) node("hhDwChart434").innerHTML = "";
    if (node("hhDwAppList434")) node("hhDwAppList434").innerHTML = "";
    pill("hhDwEmpty434", message);
    if (node("hhDwEmpty434")) node("hhDwEmpty434").hidden = false;
  }
  function draw(snapshot) {
    var today = dayNow(), days = snapshot.days, current = days.find(function (d) { return d.date === today; }) || null;
    if (!current && !days.length) { renderNoData("A fájl érvényes, de nem tartalmaz ellenőrzött napi mérést."); return; }
    if (!current) { renderNoData("Mai mérés még nincs. A korábbi adatok az alábbi trendben láthatók."); }
    if (node("hhDwEmpty434")) node("hhDwEmpty434").hidden = !!current;
    pill("hhDwScreen434", current ? niceTime(current.screenOnMs) : "Nincs mai mérés");
    pill("hhDwApps434", current ? niceTime(current.appTotalMs) : "Nincs mai mérés");
    var chat = current && current.apps.filter(function (a) { return a.packageName === "com.openai.chatgpt"; })[0];
    pill("hhDwChat434", chat ? niceTime(chat.ms) : "Nincs mérés");
    pill("hhDwNight434", current ? niceTime(current.lateNightMs) : "Nincs mai mérés");
    pill("hhDwExport434", "Android export: " + shortTime(snapshot.exportedAt));
    pill("hhDwSource434", "Android UsageStatsManager · Dropbox / HealthHub / " + snapshot.profile + " · összegzett előtéridő");
    var chart = node("hhDwChart434");
    if (chart) {
      var week = days.slice(0, 7).reverse();
      var top = Math.max.apply(null, [1].concat(week.map(function (d) { return d.appTotalMs || 0; })));
      chart.innerHTML = week.map(function (d) {
        var h = d.appTotalMs == null ? 3 : Math.max(3, Math.round(100 * d.appTotalMs / top));
        return '<div class="hhDwBarCol434" title="' + escape(d.date) + ': ' + escape(niceTime(d.appTotalMs)) + '">' +
          '<div class="hhDwBar434" style="height:' + h + '%" aria-label="' + escape(d.date) + ': ' + escape(niceTime(d.appTotalMs)) + '"></div>' +
          '<small>' + escape(d.date.slice(5)) + '</small></div>';
      }).join("");
    }
    var appList = node("hhDwAppList434");
    if (appList) appList.innerHTML = current && current.apps.length
      ? current.apps.slice(0, 6).map(function (a) {
          return '<li><span>' + escape(a.name) + '</span><strong>' + escape(niceTime(a.ms)) + '</strong></li>';
        }).join("")
      : '<li><span>Mai alkalmazásadat még nem érkezett.</span></li>';
    state("Profilhelyes forrás · " + snapshot.profile + " · " + days.length + " nap");
  }
  async function reload() {
    var request = ++busy, p = profile();
    pill("hhDwProfile434", p === "monika" ? "Mónika" : "Zsolt");
    renderNoData("Adatok ellenőrzése…");
    if (!connected()) { state("Dropbox nincs csatlakoztatva"); renderNoData("Csatlakoztasd a meglévő Dropbox Vaultot a HealthHubban. Mintaadatot nem mutatunk."); return; }
    state("Hitelesített adatok betöltése…");
    var path = "/HealthHub/profiles/" + p + "-digital-wellbeing.json";
    try {
      var raw = await vault().downloadJson(path);
      if (request !== busy || p !== profile()) return;
      if (!raw) { state("Nincs még Android Digital Wellbeing-export"); renderNoData("Ehhez a profilhoz még nem érkezett Digital Wellbeing-adat a telefonról."); return; }
      draw(normalize(raw, p));
    } catch (err) {
      if (request !== busy || p !== profile()) return;
      var notFound = err && (err.status === 409 || /not_found/i.test(String(err.message || "")));
      state(notFound ? "Még nincs Android-export" : "Forrásellenőrzési hiba");
      renderNoData(notFound ? "Még nem készült telefonos export ehhez a profilhoz." :
        "A mérés nem használható. A profil-, dátum- és adatforrás-ellenőrzés sikertelen.");
    }
  }
  function open() {
    var root = node(ROOT);
    if (!root) return;
    root.hidden = false;
    document.body.classList.add("hhDwOpen434");
    reload();
  }
  function close() {
    var root = node(ROOT);
    if (root) root.hidden = true;
    document.body.classList.remove("hhDwOpen434");
    ++busy;
  }
  function mount() {
    if (mounted || !document.body || node(ROOT)) return;
    mounted = true;
    var style = document.createElement("style");
    style.id = "hhDwStyle434";
    style.textContent =
      "#hhDwLaunch434{position:fixed;right:14px;bottom:22px;z-index:2147483644;border:0;border-radius:50px;padding:13px 18px;background:linear-gradient(115deg,#7439a3,#db408b);color:white;font-size:14px;font-weight:800;box-shadow:0 9px 25px #150e3466;cursor:pointer}" +
      "body.hhDwOpen434{overflow:hidden!important}#hhDw434[hidden]{display:none!important}#hhDw434{position:fixed;inset:0;z-index:2147483646;overflow:auto;background:#081525ee;color:#eefaff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}" +
      "#hhDw434 *{box-sizing:border-box}#hhDw434 .hhDwShell434{max-width:1030px;margin:auto;padding:20px 16px 60px}#hhDw434 .hhDwTop434{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}" +
      "#hhDw434 .hhDwTop434 button,#hhDw434 .hhDwActions434 button{background:#ffffff18;color:white;border:1px solid #ffffff47;border-radius:15px;padding:12px 15px;font-size:15px;cursor:pointer}" +
      "#hhDw434 .hhDwHero434{background:linear-gradient(95deg,#102940e8 0%,#222053b8 63%,#41235d6d 100%),url('./assets/digital-wellbeing-hero-approved.webp') center/cover;min-height:255px;padding:28px;border:1px solid #ffffff25;border-radius:25px;box-shadow:0 12px 30px #0004}" +
      "#hhDw434 .hhDwHero434 h1{font-size:clamp(32px,6vw,56px);margin:8px 0 8px;line-height:1.1}#hhDw434 .hhDwHero434 p{max-width:420px;font-size:16px;line-height:1.5;color:#f8eafd}" +
      "#hhDw434 .hhDwTitlePink434{color:#f2a0d9}#hhDw434 .hhDwStatus434{margin:17px 0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13px;color:#b9d8ef}" +
      "#hhDw434 .hhDwGrid434{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}#hhDw434 .hhDwCard434{background:linear-gradient(145deg,#163653,#211d49);border:1px solid #8fd4f933;border-radius:20px;padding:18px;text-align:left;color:white;min-height:150px}" +
      "#hhDw434 .hhDwCard434 b{display:block;font-size:clamp(19px,3vw,28px);margin:12px 0}#hhDw434 .hhDwCard434 small{color:#afcfde;font-size:12px;line-height:1.4}#hhDw434 .hhDwCard434 .hhDwIcon434{font-size:27px}" +
      "#hhDw434 .hhDwSections434{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px}#hhDw434 .hhDwBox434{background:#102c45;border:1px solid #ffffff25;border-radius:20px;padding:18px}" +
      "#hhDw434 .hhDwBox434 h2{font-size:18px;margin:0 0 18px}#hhDw434 .hhDwChart434{height:130px;display:flex;align-items:flex-end;gap:10px}#hhDw434 .hhDwBarCol434{height:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;font-size:11px;color:#a9d4e5}#hhDw434 .hhDwBar434{width:100%;max-width:37px;background:linear-gradient(#fc8ac6,#7b8af9);border-radius:8px 8px 3px 3px}" +
      "#hhDw434 .hhDwAppList434{list-style:none;padding:0;margin:0}#hhDw434 .hhDwAppList434 li{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #ffffff1b;padding:10px 0}#hhDw434 .hhDwAppList434 li strong{white-space:nowrap;color:#edb1e0}#hhDw434 .hhDwNote434{color:#b8d5e8;font-size:13px;line-height:1.5;margin-top:16px}" +
      "#hhDw434 #hhDwEmpty434{background:#38274ab8;border:1px solid #df9de0a3;padding:12px;border-radius:12px;margin-top:15px;font-size:14px}" +
      "@media(max-width:650px){#hhDw434 .hhDwGrid434{grid-template-columns:repeat(2,minmax(0,1fr))}#hhDw434 .hhDwSections434{grid-template-columns:1fr}#hhDw434 .hhDwShell434{padding:10px 10px 45px}#hhDw434 .hhDwHero434{padding:21px;min-height:215px}}";
    document.head.appendChild(style);
    var launch = document.createElement("button");
    launch.id = "hhDwLaunch434"; launch.type = "button"; launch.textContent = "📱 Digital Wellbeing · előnézet";
    launch.addEventListener("click", open);
    document.body.appendChild(launch);
    var container = document.createElement("section");
    container.id = ROOT; container.hidden = true; container.setAttribute("role", "dialog");
    container.setAttribute("aria-modal", "true"); container.setAttribute("aria-label", "HealthHub Digital Wellbeing előnézet");
    container.innerHTML =
      '<div class="hhDwShell434"><div class="hhDwTop434"><strong>💗 HealthHub · Digital Wellbeing</strong><button type="button" id="hhDwClose434">✕ Bezárás</button></div>' +
      '<div class="hhDwHero434"><div>🌙 👩🏼‍⚕️ 📱 · Léna Digital Balance</div><h1>Digital <span class="hhDwTitlePink434">Wellbeing</span></h1>' +
      '<p>Tudatosabb digitális szokások, több pihenés. „Csak még egy kérdés?” 😉</p>' +
      '<p>👨‍👩‍👧‍👦 Családbarát nézet · valódi adatok · külön profilok</p></div>' +
      '<div class="hhDwStatus434"><span>Profil: <strong id="hhDwProfile434"></strong> · <span id="hhDwState434"></span></span>' +
      '<span id="hhDwExport434"></span></div>' +
      '<div class="hhDwGrid434">' +
      '<div class="hhDwCard434"><span class="hhDwIcon434">📱</span><div>Képernyő aktív idő</div><b id="hhDwScreen434"></b><small>Csak ha a telefon mért képernyőadatot exportál</small></div>' +
      '<div class="hhDwCard434"><span class="hhDwIcon434">📊</span><div>Apphasználat</div><b id="hhDwApps434"></b><small>Android előtéridők összege, nem a Samsung képernyőidő</small></div>' +
      '<div class="hhDwCard434"><span class="hhDwIcon434">🤖</span><div>ChatGPT alkalmazás</div><b id="hhDwChat434"></b><small>Csak natív ChatGPT app; böngészős használat nem különül el</small></div>' +
      '<div class="hhDwCard434"><span class="hhDwIcon434">🌙</span><div>Éjszakai aktivitás</div><b id="hhDwNight434"></b><small>Csak pontos időbélyegű Android eseményekből</small></div>' +
      '</div><p id="hhDwEmpty434"></p>' +
      '<div class="hhDwSections434"><div class="hhDwBox434"><h2>📈 Az utolsó 7 elérhető nap</h2><div id="hhDwChart434" class="hhDwChart434"></div></div>' +
      '<div class="hhDwBox434"><h2>💬 Mai alkalmazások</h2><ul id="hhDwAppList434" class="hhDwAppList434"></ul></div></div>' +
      '<p class="hhDwNote434" id="hhDwSource434"></p>' +
      '<p class="hhDwNote434">🛌 A Sleep Intelligence külön HealthHub modul. Alvás és képernyőhasználat közötti kapcsolatot csak megfelelő, időbélyeges adatpárok alapján szabad elemezni, önmagában nem bizonyít ok-okozatot.</p>' +
      '<div class="hhDwActions434"><button type="button" id="hhDwRefresh434">↻ Adatok frissítése</button></div></div>';
    document.body.appendChild(container);
    node("hhDwClose434").addEventListener("click", close);
    node("hhDwRefresh434").addEventListener("click", reload);
    window.addEventListener("healthhub:profile-changed", function () { if (!node(ROOT).hidden) reload(); });
    window.addEventListener("storage", function (e) { if (e.key === "hh-profile" && !node(ROOT).hidden) reload(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !node(ROOT).hidden) close(); });
    renderNoData("Csatlakoztatott, profilhelyes Android-mérések szükségesek.");
  }
  window.HH_DIGITAL_WELLBEING_V434 = { open: open, close: close, reload: reload, normalize: normalize };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
