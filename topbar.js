// =============================================================
// Persistent dashboard top bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// Self-injects HTML + CSS, reads progress from localStorage.
// =============================================================
(function () {
  'use strict';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; gap: 6px;
  padding: max(12px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 10px max(14px, env(safe-area-inset-left));
  background: rgba(10, 10, 11, 0.82);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-pill {
  flex: 1 1 0; min-width: 0;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 12px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 13px;
  text-decoration: none;
  color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.topbar-pill:hover { background: rgba(255, 255, 255, 0.11); }
.topbar-pill-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #6ee7b7; flex-shrink: 0;
  opacity: 0.7;
}
.topbar-pill.warn .topbar-pill-dot { background: #fbbf24; opacity: 1; }
.topbar-pill.miss .topbar-pill-dot {
  background: #ff8a8a; opacity: 1;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  flex-shrink: 0;
}
.topbar-pill-count {
  margin-left: auto;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px; font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .topbar { padding-left: max(8px, env(safe-area-inset-left)); padding-right: max(8px, env(safe-area-inset-right)); gap: 3px; }
  .topbar-pill { padding: 7px 8px; gap: 4px; }
  .topbar-pill-label { font-size: 8px; letter-spacing: 0.06em; }
  .topbar-pill-count { font-size: 10px; }
}
@media (max-width: 360px) {
  .topbar-pill-count { display: none; }
}

/* === Schedule settings button + modal === */
.topbar-settings-btn {
  width: 36px; height: 36px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.07);
  border: none; border-radius: 10px;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.topbar-settings-btn:hover { background: rgba(255,255,255,0.13); color: rgba(255,255,255,0.9); }
.topbar-smodal-bg {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 200;
  align-items: flex-start; justify-content: center;
  padding: max(76px, calc(env(safe-area-inset-top) + 64px)) 20px 20px;
}
.topbar-smodal-bg.show { display: flex; }
.topbar-smodal {
  background: #111113; border-radius: 24px;
  padding: 22px; width: 100%; max-width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-smodal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.topbar-smodal-title {
  font-size: 16px; font-weight: 700; color: #FAFAFA;
}
.topbar-smodal-close {
  background: transparent; border: none;
  color: rgba(255,255,255,0.4); font-size: 20px;
  cursor: pointer; padding: 4px 8px; line-height: 1;
  -webkit-tap-highlight-color: transparent;
}
.topbar-smodal-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.topbar-smodal-label {
  font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,0.55);
}
.topbar-smodal-input {
  background: rgba(255,255,255,0.08); border: none; border-radius: 10px;
  color: #FAFAFA;
  font-size: 15px; font-weight: 600;
  padding: 9px 12px; width: 110px;
  text-align: center; outline: none;
  color-scheme: dark;
}
.topbar-smodal-input:focus { background: rgba(255,255,255,0.12); }
.topbar-smodal-save {
  width: 100%; padding: 13px; margin-top: 6px;
  background: linear-gradient(180deg, #ffffff 0%, #e8e5dd 100%);
  color: #0a0a0b; border: none; border-radius: 14px;
  font-family: inherit; font-size: 14px; font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.topbar-smodal-note {
  font-size: 11px; color: rgba(255,255,255,0.3);
  text-align: center; margin-top: 10px; line-height: 1.4;
}

/* === Global mobile lockdown ===
   1) Hide the right-side scrollbar on phones (iOS uses overlay scrollbars anyway).
   2) Stop iOS auto-text-size-adjust.
   3) touch-action: pan-y prevents pinch-zoom while still allowing vertical scroll.
   4) overscroll-behavior on every common modal class stops scroll chaining —
      scrolling inside a settings popup won't drag the page behind it.
   5) When body has .topbar-modal-open, the page can't scroll at all (locked).
*/
html, body {
  -webkit-text-size-adjust: 100%;
}
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open {
  overflow: hidden;
  touch-action: none;
}
/* On phones, blow the modals up to full screen and let them be the only
   scrolling element. Way less "is this scrolling the page or the modal?"
   confusion. */
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 100vh !important;
    height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
}
`;

  // -------- HTML --------
  const html = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick stats">
  <a href="index.html" class="topbar-pill" id="topbarGoals">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">GOALS</span>
    <span class="topbar-pill-count" id="topbarGoalsCount">—/—</span>
  </a>
  <a href="habbit.html" class="topbar-pill" id="topbarHabits">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">HABIT</span>
    <span class="topbar-pill-count" id="topbarHabitsCount">—/—</span>
  </a>
  <a href="gym.html" class="topbar-pill" id="topbarGym">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">GYM</span>
  </a>
  <a href="nutrient.html" class="topbar-pill" id="topbarFood">
    <span class="topbar-pill-dot"></span>
    <span class="topbar-pill-label">FOOD</span>
    <span class="topbar-pill-count" id="topbarFoodCount">—</span>
  </a>
  <button class="topbar-settings-btn" id="topbarSettingsBtn" aria-label="Settings" type="button">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </button>
</header>
<div class="topbar-smodal-bg" id="topbarSmodalBg">
  <div class="topbar-smodal" role="dialog" aria-label="Schedule settings">
    <div class="topbar-smodal-head">
      <span class="topbar-smodal-title">Schedule</span>
      <button class="topbar-smodal-close" id="topbarSmodalClose" aria-label="Close">×</button>
    </div>
    <div class="topbar-smodal-row">
      <span class="topbar-smodal-label">Wake time</span>
      <input type="time" class="topbar-smodal-input" id="topbarWakeInput" aria-label="Wake time">
    </div>
    <div class="topbar-smodal-row">
      <span class="topbar-smodal-label">Sleep time</span>
      <input type="time" class="topbar-smodal-input" id="topbarSleepInput" aria-label="Sleep time">
    </div>
    <button class="topbar-smodal-save" id="topbarSmodalSave">Save</button>
    <p class="topbar-smodal-note">Affects the day ring, goal rollover, and status indicators.</p>
  </div>
</div>
`;

  function injectStyleAndHTML() {
    if (document.getElementById('topbar')) return; // already injected
    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  // -------- Schedule (wake/sleep) from localStorage --------
  function getSchedule() {
    try {
      const s = JSON.parse(localStorage.getItem('app_schedule')) || {};
      return {
        wake:  (Number.isInteger(s.wake)  && s.wake  >= 0 && s.wake  <= 23) ? s.wake  : 6,
        sleep: (Number.isInteger(s.sleep) && s.sleep >= 0 && s.sleep <= 23) ? s.sleep : 23
      };
    } catch(e) { return { wake: 6, sleep: 23 }; }
  }

  // -------- Active-date helpers (respects wake-time rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < getSchedule().wake) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  // -------- Read progress from localStorage --------
  function getGoalsProgress() {
    const key = 'goals:' + activeDateKey();
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
    const total = Array.isArray(goals) ? goals.length : 0;
    const done = total ? goals.filter(g => g && g.done).length : 0;
    return { done, total };
  }

  function getHabitsProgress() {
    let state = {};
    try { state = JSON.parse(localStorage.getItem('habits_v1')) || {}; } catch (e) {}
    const d = new Date();
    const today = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    let done = 0;
    for (const id of ['nofap', 'rosary', 'bible']) {
      if (state[id] && state[id].dates && state[id].dates[today]) done++;
    }
    return { done, total: 3 };
  }

  function getNutritionProgress() {
    const d = new Date();
    const key = 'nutrition:' + d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
    const calories = Math.round(entries.reduce((s, e) => s + (e.calories || 0), 0));
    let target = 0;
    try {
      const g = JSON.parse(localStorage.getItem('nutrition_goals')) || {};
      const w = parseFloat(g.weight), h = parseFloat(g.height), a = parseInt(g.age);
      if (w && h && a) {
        const act = parseFloat(g.activity || 1.55);
        const bmr = g.gender === 'female' ? 10*w+6.25*h-5*a-161 : 10*w+6.25*h-5*a+5;
        let t = Math.round(bmr * act);
        if (g.goal === 'cut') t -= 500;
        else if (g.goal === 'bulk') t += 300;
        target = t;
      }
    } catch (e) {}
    return { calories, target };
  }

  function classifyNutritionStatus(calories, target) {
    if (!target) return 'idle';
    const r = calories / target;
    if (r > 1.2) return 'miss';
    if (r > 1.05) return 'warn';
    if (r >= 0.8) return 'good';
    const h = new Date().getHours();
    if (h >= getSchedule().sleep && r < 0.5) return 'miss';
    return 'warn';
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= getSchedule().sleep && done < total * 0.5) return 'miss';
    return 'warn';
  }

  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }

  function render() {
    const goalsEl = document.getElementById('topbarGoals');
    if (!goalsEl) return; // not injected yet

    const g = getGoalsProgress();
    const h = getHabitsProgress();
    const n = getNutritionProgress();

    document.getElementById('topbarGoalsCount').textContent =
      g.total ? g.done + '/' + g.total : '0/0';
    document.getElementById('topbarHabitsCount').textContent =
      h.done + '/' + h.total;
    document.getElementById('topbarFoodCount').textContent =
      n.calories ? n.calories + '' : '—';

    setPillStatus(goalsEl, classifyStatus(g.done, g.total));
    setPillStatus(document.getElementById('topbarHabits'), classifyStatus(h.done, h.total));
    setPillStatus(document.getElementById('topbarFood'), classifyNutritionStatus(n.calories, n.target));
  }

  // -------- Mobile lockdown helpers --------
  // Belt-and-suspenders zoom prevention — iOS Safari sometimes ignores
  // user-scalable=no, so we also kill the gesture events directly.
  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    // Also kill the iOS double-tap-to-zoom on any tap.
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  // Watch every known modal-bg / overlay class — when any one of them
  // gets `.show` or `.is-open`, lock the body scroll. When the last
  // one closes, unlock.
  function startModalLock() {
    const MODAL_SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'
    ];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) {
            return true;
          }
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('topbar-modal-open', anyOpen());
    }
    const observer = new MutationObserver(sync);
    // Observe class changes anywhere in body — modal toggles are rare so
    // a global subtree observer is cheap.
    observer.observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- PWA: inject manifest + iOS meta, register SW --------
  function bootPWA() {
    const head = document.head;
    function addMeta(name, content) {
      if (head.querySelector('meta[name="' + name + '"]')) return;
      const m = document.createElement('meta');
      m.name = name; m.content = content;
      head.appendChild(m);
    }
    function addLink(rel, href, extra) {
      if (head.querySelector('link[rel="' + rel + '"]')) return;
      const l = document.createElement('link');
      l.rel = rel; l.href = href;
      if (extra) Object.assign(l, extra);
      head.appendChild(l);
    }
    addLink('manifest', '/manifest.json');
    addLink('apple-touch-icon', '/icon.svg');
    addMeta('apple-mobile-web-app-capable', 'yes');
    addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    addMeta('apple-mobile-web-app-title', "Kegi's Life");
    addMeta('mobile-web-app-capable', 'yes');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  }

  // -------- Schedule settings modal --------
  function pad2h(n) { return String(n).padStart(2, '0'); }
  function hourToTimeStr(h) { return pad2h(h) + ':00'; }
  function timeStrToHour(s) { return parseInt((s || '').split(':')[0], 10) || 0; }

  function openScheduleModal() {
    const s = getSchedule();
    document.getElementById('topbarWakeInput').value  = hourToTimeStr(s.wake);
    document.getElementById('topbarSleepInput').value = hourToTimeStr(s.sleep);
    document.getElementById('topbarSmodalBg').classList.add('show');
    document.body.classList.add('topbar-modal-open');
  }
  function closeScheduleModal() {
    document.getElementById('topbarSmodalBg').classList.remove('show');
    document.body.classList.remove('topbar-modal-open');
  }
  function saveSchedule() {
    const wake  = timeStrToHour(document.getElementById('topbarWakeInput').value);
    const sleep = timeStrToHour(document.getElementById('topbarSleepInput').value);
    localStorage.setItem('app_schedule', JSON.stringify({ wake, sleep }));
    closeScheduleModal();
    render();
    // Notify other tabs / index.html so it can refresh WAKE/SLEEP hours
    window.dispatchEvent(new Event('storage'));
  }

  function bootScheduleModal() {
    document.getElementById('topbarSettingsBtn').addEventListener('click', openScheduleModal);
    document.getElementById('topbarSmodalClose').addEventListener('click', closeScheduleModal);
    document.getElementById('topbarSmodalSave').addEventListener('click', saveSchedule);
    document.getElementById('topbarSmodalBg').addEventListener('click', function(e) {
      if (e.target === this) closeScheduleModal();
    });
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    render();
    lockGestures();
    startModalLock();
    bootPWA();
    bootScheduleModal();

    // Re-render when localStorage changes from another tab/window OR when
    // the page becomes visible (sync may have pulled in the background).
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    // Periodic refresh so counts stay current after midnight rollover etc.
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
