/* SHO Golden Standard v13: subtle screen-group scroll snap + one quiet feedback tick.
   Only real user-initiated scrolling, never initial load or background updates.
   Fixed navigation is not animated; reduced-motion accessibility disables effects. */
(() => {
  "use strict";
  const sections = [
    document.querySelector(".topbar"),
    document.getElementById("shoStoreConnect"),
    document.getElementById("shoCatalogPanel")
  ].filter(Boolean);
  const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (sections.length !== 3 || motion?.matches) return;
  document.documentElement.classList.add("shopping-snap-ready");

  let audio = null;
  let armed = false;
  let moved = false;
  let startY = window.scrollY;
  let settleTimer = 0;
  let lastSection = 0;
  let lastTickAt = 0;

  function topOf(el) {
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY);
  }
  function nearest() {
    let best = { index: -1, distance: Infinity };
    const y = window.scrollY;
    sections.forEach((section, index) => {
      const distance = Math.abs(y - topOf(section));
      if (distance < best.distance) best = { index, distance };
    });
    return best;
  }
  function primeSound() {
    if (audio && audio.state === "suspended") {
      audio.resume().catch(() => {});
      return;
    }
    if (audio) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      audio = new Context();
      if (audio.state === "suspended") audio.resume().catch(() => {});
    } catch (_) { audio = null; }
  }
  function arm(withSound) {
    if (!armed) {
      armed = true;
      moved = false;
      startY = window.scrollY;
    }
    if (withSound) primeSound();
  }
  document.addEventListener("pointerdown", () => arm(true), { passive: true });
  window.addEventListener("wheel", () => arm(false), { passive: true });
  window.addEventListener("keydown", e => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) arm(true);
  });

  function tick() {
    if (motion?.matches || document.hidden) return;
    const time = performance.now();
    if (time - lastTickAt < 350) return;
    lastTickAt = time;
    try { navigator.vibrate?.(8); } catch (_) {}
    if (!audio || audio.state !== "running") return;
    try {
      const t = audio.currentTime;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(820, t);
      oscillator.frequency.exponentialRampToValueAtTime(610, t + 0.035);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.028, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.05);
    } catch (_) {}
  }
  function finish() {
    clearTimeout(settleTimer);
    settleTimer = 0;
    if (!armed || !moved || motion?.matches || document.hidden) return;
    const { index, distance } = nearest();
    // The click happens only after alignment, not while a user is reading
    // or scrolling through a long catalog section.
    if (index >= 0 && distance <= 26 && index !== lastSection) {
      lastSection = index;
      tick();
    }
    armed = false;
    moved = false;
  }
  window.addEventListener("scroll", () => {
    if (!armed) return;
    if (Math.abs(window.scrollY - startY) > 8) moved = true;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(finish, 170);
  }, { passive: true });
  if ("onscrollend" in window) window.addEventListener("scrollend", finish, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(settleTimer);
      armed = false;
      moved = false;
    }
  });
  lastSection = nearest().distance <= 30 ? nearest().index : -1;
})();
