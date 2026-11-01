/* My Day — personal planner. Step 1: login, Today (plan / to do / to buy), Calendar. */
(() => {
"use strict";
const CFG = window.MYDAY_CONFIG;
const SKEY = "myday.session";
window.MD = { loaders: [], views: {}, binds: {} };

/* ---------- small helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WDL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtShort = s => { const d = parse(s); return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtLong = s => { const d = parse(s); return `${WDL[d.getDay()]}, ${d.getDate()} ${MONL[d.getMonth()]}`; };
const t12 = t => { if (!t) return ""; let [h, m] = t.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return m ? `${h}:${pad(m)}${ap}` : `${h}${ap}`; };
const hhmm = t => (t || "").slice(0, 5);
const relDay = s => { const t = today(); if (s === t) return "Today"; if (s === addDays(t, 1)) return "Tomorrow"; if (s === addDays(t, -1)) return "Yesterday"; return fmtShort(s); };
const nowIso = () => new Date().toISOString();
const localDateOfIso = iso => iso ? ymd(new Date(iso)) : null;

const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l-2 0l9-9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M10 21v-5h4v5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M16 3v4M8 3v4M4 11h16"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8V5a1 1 0 0 0-1-1H6a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6"/><path d="M20 12v4h-4a2 2 0 0 1 0-4h4"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0"/><path d="M3 6v13M12 6v13M21 6v13"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l9-10"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1-2.6c-1.8-.4-1.8-3 0-3.4a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1z"/><circle cx="12" cy="12" r="3"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9a9 9 0 1 1-9-9z"/></svg>',
  brief: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21c.5-4.5 2.5-8 7-10"/><path d="M9 18c6.2 0 10.5-3.3 11-12V4h-4C9 4 5 8 5 13c0 1.4.3 3 1 4"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3l8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M17 17H6V3H4"/><path d="M6 5l14 1l-1 7H6"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 7v10"/></svg>'
};

/* ---------- Supabase (auth + REST) without external libraries ---------- */
let session = null;
try { session = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { session = null; }
const saveSession = s => { session = s; try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) {} };

async function authCall(grant, body) {
  const r = await fetch(`${CFG.url}/auth/v1/token?grant_type=${grant}`, {
    method: "POST", headers: { apikey: CFG.key, "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.msg || j.message || "Sign in failed");
  saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user_id: j.user?.id, email: j.user?.email });
}
async function refresh() {
  if (!session?.refresh_token) throw new Error("signed out");
  await authCall("refresh_token", { refresh_token: session.refresh_token });
}
async function rest(method, path, body, prefer = "return=representation", retry = true) {
  if (!session) throw new Error("signed out");
  if (session.expires_at - 60 < Date.now() / 1000) { try { await refresh(); } catch (e) { signOut(); throw e; } }
  const r = await fetch(`${CFG.url}/rest/v1/${path}`, {
    method, headers: { apikey: CFG.key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: prefer },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 401 && retry) { try { await refresh(); } catch (e) { signOut(); throw e; } return rest(method, path, body, prefer, false); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || `Couldn't save (${r.status})`); }
  return r.status === 204 ? null : r.json();
}
const db = {
  list: (t, q = "") => rest("GET", `${t}?select=*&deleted_at=is.null${q ? "&" + q : ""}`),
  insert: (t, o) => rest("POST", t, o).then(r => r[0]),
  update: (t, id, o) => rest("PATCH", `${t}?id=eq.${id}`, o).then(r => r[0]),
  remove: (t, id) => rest("PATCH", `${t}?id=eq.${id}`, { deleted_at: nowIso() }).then(r => r[0]),
  restore: (t, id) => rest("PATCH", `${t}?id=eq.${id}`, { deleted_at: null }).then(r => r[0])
};
function signOut() { saveSession(null); S.loaded = false; lastTab = null; render(); }

/* ---------- state ---------- */
const S = {
  loaded: false, tab: "today", todayView: "plan", planDate: today(),
  calMonth: today().slice(0, 7), paint: null,
  settings: null, days: {}, holidays: {}, holidayRows: [], plans: [], todos: [], shopping: []
};
try { const v = localStorage.getItem("myday.todayView"); if (v) S.todayView = v; } catch (e) {}

async function loadAll() {
  const [settings, days, hols, plans, todos, shop] = await Promise.all([
    rest("GET", "myday_settings?select=*"),
    db.list("myday_days"),
    db.list("myday_holidays", "order=date"),
    db.list("myday_plans", `date=gte.${addDays(today(), -120)}&order=date,start_time.nullsfirst`),
    db.list("myday_todos", "order=created_at"),
    db.list("myday_shopping", "order=created_at")
  ]);
  S.settings = settings[0] || await rest("POST", "myday_settings", {}).then(r => r[0]);
  S.days = {}; days.forEach(d => S.days[d.date] = d);
  S.holidayRows = hols; S.holidays = {}; hols.forEach(h => S.holidays[h.date] = h);
  S.plans = plans; S.todos = todos; S.shopping = shop;
  await Promise.all(window.MD.loaders.map(f => f()));
  S.loaded = true;
}

/* ---------- day logic ---------- */
function baseKind(ds) {
  if (S.holidays[ds]) return "holiday";
  return (S.settings?.work_days || [1, 2, 3, 4, 5]).includes(parse(ds).getDay()) ? "work" : "off";
}
function dayInfo(ds) {
  const ov = S.days[ds], base = baseKind(ds);
  const kind = ov ? ov.kind : base;
  return { kind, base, override: ov, holiday: S.holidays[ds]?.name, prevOncall: (S.days[addDays(ds, -1)]?.kind === "oncall") };
}
function dayLabel(info, ds) {
  const st = S.settings, wk = `${t12(hhmm(st.work_start))} – ${t12(hhmm(st.work_end))}`;
  switch (info.kind) {
    case "work": return { cls: "work", icon: I.brief, title: "Work", sub: wk };
    case "oncall": return { cls: "oncall", icon: I.moon, title: "On-call from home", sub: "8am → 8am tomorrow" };
    case "leave": return { cls: "leave", icon: I.leaf, title: "Annual leave", sub: "Enjoy your day" };
    case "holiday": return { cls: "holiday", icon: I.sun, title: info.holiday || "Public holiday", sub: "Public holiday · off" };
    default: return { cls: "off", icon: I.sun, title: "Day off", sub: parse(ds).getDay() === 0 ? "Sunday rest" : parse(ds).getDay() === 6 ? "Saturday" : "Off" };
  }
}
const KCOL = { work: "var(--peri)", oncall: "var(--navy)", off: "var(--sun)", holiday: "var(--sun)", leave: "var(--sage)" };

function leaveSummary() {
  const st = S.settings, cy = new Date().getFullYear(), t = today();
  const used = Object.values(S.days).filter(d => d.kind === "leave" && d.date >= st.leave_opening_date && baseKind(d.date) === "work");
  const upTo = y => used.filter(d => Number(d.date.slice(0, 4)) <= y).length;
  const avail = y => Number(st.leave_opening_balance) + Number(st.leave_entitlement) * (y - st.leave_opening_year);
  const left = avail(cy) - upTo(cy);
  const booked = used.filter(d => d.date > t && d.date.startsWith(String(cy))).length;
  const takenThisYear = used.filter(d => d.date <= t && d.date.startsWith(String(cy))).length;
  return { left, booked, taken: takenThisYear, next: avail(cy + 1) - upTo(cy + 1), cy };
}

/* ---------- toast with undo ---------- */
let toastT;
function toast(msg, undo) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button id="undo">Undo</button>' : ""}`;
  el.classList.add("show");
  if (undo) $("#undo").onclick = async () => { el.classList.remove("show"); await undo(); };
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), undo ? 5000 : 2200);
}
const fail = e => toast(e.message || "Something went wrong");

/* ---------- sheet ---------- */
/* Bottom sheets glide up from the bottom, can be swiped down, and glide away when closed. */
let closeTimer = null;
const openSheet = (h, m) => openPage(h, m);
function openPop(html, onMount) {
  const root = $("#sheet-root");
  let scrim = $(".scrim", root);
  if (scrim && !scrim.classList.contains("closing")) {
    // a sheet is already open: swap its content in place with a soft fade instead of re-opening
    const sh = $(".sheet", scrim);
    sh.innerHTML = `<div class="grab"></div>${html}`; sh.scrollTop = 0;
    sh.classList.remove("swap"); void sh.offsetWidth; sh.classList.add("swap");
    $("#fab")?.classList.remove("open");
    onMount && onMount(sh); return;
  }
  clearTimeout(closeTimer);
  root.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  scrim = $(".scrim", root);
  const sh = $(".sheet", scrim);
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => requestAnimationFrame(() => scrim.classList.add("open")));
  scrim.addEventListener("click", e => { if (e.target === scrim) closePop(); });
  // swipe down to close
  let y0 = null, dy = 0, t0 = 0;
  sh.addEventListener("touchstart", e => { if (sh.scrollTop > 0 || e.target.closest("input,textarea,select")) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); }, { passive: true });
  sh.addEventListener("touchmove", e => { if (y0 === null) return; dy = e.touches[0].clientY - y0;
    if (dy > 0) { sh.style.transition = "none"; sh.style.transform = `translateY(${dy}px)`; scrim.style.setProperty("--dim", String(Math.max(0, .38 - dy / 900))); } }, { passive: true });
  sh.addEventListener("touchend", () => { if (y0 === null) return; const fast = dy > 40 && Date.now() - t0 < 250; y0 = null;
    sh.style.transition = ""; scrim.style.removeProperty("--dim");
    if (dy > 110 || fast) closePop(); else sh.style.transform = ""; });
  onMount && onMount(sh);
}
function closePop() {
  const scrim = $("#sheet-root .scrim");
  $("#fab")?.classList.remove("open");
  document.body.classList.remove("sheet-open");
  if (!scrim || scrim.classList.contains("closing")) return;
  const sh = $(".sheet", scrim); if (sh) sh.style.transform = "";
  scrim.classList.remove("open"); scrim.classList.add("closing");
  closeTimer = setTimeout(() => { if (scrim.isConnected) scrim.remove(); }, 320);
}

/* Full pages: forms slide in from the right, Save sits at the bottom, Back (or a swipe from the left edge) slides them away. */
let pageTimer = null;
function openPage(html, onMount) {
  closeMenu(true);
  if ($("#sheet-root .scrim:not(.closing)")) { const sc = $("#sheet-root .scrim"); sc.remove(); }
  const root = $("#page-root");
  let pg = $(".page", root);
  if (pg && !pg.classList.contains("closing")) {
    const body = $(".pagebody", pg); body.innerHTML = html; body.scrollTop = 0;
    body.classList.remove("swap"); void body.offsetWidth; body.classList.add("swap");
    onMount && onMount(body); return;
  }
  clearTimeout(pageTimer);
  root.innerHTML = `<div class="page" role="dialog" aria-modal="true"><div class="pagebar"><button class="pageback" aria-label="Back">${I.left}<span>Back</span></button></div><div class="pagebody">${html}</div></div>`;
  pg = $(".page", root);
  const body = $(".pagebody", pg);
  document.body.classList.add("page-open");
  requestAnimationFrame(() => requestAnimationFrame(() => pg.classList.add("open")));
  $(".pageback", pg).onclick = () => closePage();
  // swipe from the left edge to go back
  let x0 = null, dx = 0, t0 = 0;
  pg.addEventListener("touchstart", e => { const x = e.touches[0].clientX; if (x > 28) { x0 = null; return; } x0 = x; dx = 0; t0 = Date.now(); }, { passive: true });
  pg.addEventListener("touchmove", e => { if (x0 === null) return; dx = Math.max(0, e.touches[0].clientX - x0); pg.style.transition = "none"; pg.style.transform = `translateX(${dx}px)`; }, { passive: true });
  pg.addEventListener("touchend", () => { if (x0 === null) return; const fast = dx > 50 && Date.now() - t0 < 250; x0 = null; pg.style.transition = "";
    if (dx > innerWidth * .33 || fast) closePage(); else pg.style.transform = ""; });
  onMount && onMount(body);
}
function closePage() {
  const pg = $("#page-root .page");
  document.body.classList.remove("page-open");
  if (!pg || pg.classList.contains("closing")) return;
  pg.style.transform = ""; pg.classList.remove("open"); pg.classList.add("closing");
  pageTimer = setTimeout(() => { if (pg.isConnected) pg.remove(); }, 380);
}
// Close the top layer: a small pop-up first, otherwise the page
function closeSheet() {
  if ($("#sheet-root .scrim:not(.closing)")) closePop(); else closePage();
}
/* Quick add: a small menu that grows out of the + button */
function closeMenu(instant) {
  const m = $("#menu-root .qmenu-wrap"); $("#fab")?.classList.remove("open");
  if (!m) return;
  if (instant) { m.remove(); return; }
  m.classList.remove("open"); setTimeout(() => m.remove(), 220);
}


/* ---------- render root ---------- */
function render() {
  const app = $("#app");
  window.SCENES && window.SCENES.show(S.tab);
  if (!session) { renderLogin(app); return; }
  if (!S.loaded) {
    app.innerHTML = skeleton();
    loadAll().then(render).catch(e => { app.innerHTML = `<div class="login"><div class="brand">MY DAY</div><p class="err">${esc(e.message)}</p><button class="btn" id="retry">Try again</button></div>`; $("#retry").onclick = render; });
    return;
  }
  const view = (window.MD.views[S.tab] || { today: viewToday, calendar: viewCalendar, money: () => viewSoon("Money", "Income, spending, savings, budgets, recurring bills, and screenshot-to-expense.", "Step 2"), goals: () => viewSoon("Goals", "Savings goals, wishlist, and life admin reminders.", "Step 3"), learn: () => viewSoon("Learn", "Your topics of the week, notes, and weekly streak.", "Step 3") }[S.tab])();
  const enter = S.tab !== lastTab; lastTab = S.tab;
  app.innerHTML = `<div class="wrap${enter ? " enter" : ""}">${view}</div>${nav()}<button class="fab" id="fab" aria-label="Quick add">${I.plus}</button>`;
  bindCommon();
  (window.MD.binds[S.tab] || { today: bindToday, calendar: bindCalendar }[S.tab])?.();
  window.ART.afterRender();
}
let lastTab = null;

function skeleton() {
  const b = (h, w = "100%", mt = 10, r = 20) => `<div class="sk" style="height:${h}px;width:${w};margin-top:${mt}px;border-radius:${r}px"></div>`;
  return `<div class="wrap">${b(12, "30%", 4, 6)}${b(26, "55%", 8, 8)}${b(12, "40%", 8, 6)}${b(70, "100%", 18)}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${b(86)}${b(86)}</div>${b(40, "100%", 16, 14)}${b(160)}${b(120)}</div>`;
}
window.MD_skeletonCards = n => Array.from({ length: n }, (_, i) => `<div class="sk" style="height:${i ? 64 : 110}px;margin-top:10px;border-radius:20px"></div>`).join("");
function nav() {
  const tabs = [["today", "Today", I.home], ["calendar", "Calendar", I.cal], ["money", "Money", I.wallet], ["goals", "Goals", I.target], ["learn", "Learn", I.book]];
  return `<nav class="nav">${tabs.map(([k, l, ic]) => `<button data-tab="${k}" class="${S.tab === k ? "on" : ""}">${ic}<span>${l}</span></button>`).join("")}</nav>`;
}
function bindCommon() {
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; S.paint = null; render(); window.scrollTo(0, 0); });
  $("#fab").onclick = () => { if ($("#sheet-root .scrim:not(.closing)")) { closePop(); return; } quickAdd(); };
  const g = $("#gear"); if (g) g.onclick = () => ({ calendar: settingsSheet }[S.tab] || todaySettings)();
}

/* ---------- login ---------- */
function renderLogin(app) {
  app.innerHTML = `<form class="login" id="lf">
    <div class="brand">MY DAY</div><div class="tag">PLAN · SPEND · SAVE · REMEMBER</div>
    <div class="field"><label>Email</label><input type="email" id="em" autocomplete="username" required></div>
    <div class="field"><label>Password</label><input type="password" id="pw" autocomplete="current-password" required></div>
    <div class="err" id="er"></div>
    <button class="btn primary block" type="submit">Sign in</button>
    <p class="small muted" style="text-align:center;margin-top:16px">Use the same login as your OMFS Desk.</p></form>`;
  $("#lf").onsubmit = async e => {
    e.preventDefault(); $("#er").textContent = "";
    try { await authCall("password", { email: $("#em").value.trim(), password: $("#pw").value }); render(); }
    catch (err) { $("#er").textContent = err.message === "Invalid login credentials" ? "That email or password didn't match. Try again." : err.message; }
  };
}

/* ---------- TODAY ---------- */
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }
function viewToday() {
  const t = today(), info = dayInfo(t), lab = dayLabel(info, t), lv = leaveSummary();
  const todoLeft = S.todos.filter(x => !x.done_at && x.due_date && x.due_date <= t).length;
  const buyLeft = S.shopping.filter(x => !x.done_at).length;
  const name = S.settings.display_name || "";
  const post = info.prevOncall && info.kind !== "oncall" ? `<div class="small muted" style="margin:8px 2px 0">On-call from yesterday ends at 8am.</div>` : "";
  return `
  <div class="top"><div><div class="muted">${greeting()}</div><h1 class="h1">Hi ${esc(name)} <span style="color:#F2C94C">☀</span></h1><div class="small muted">${fmtLong(t)}</div></div>
    <div class="row">${window.ART.sunPlant(70)}
    <button class="iconbtn" id="gear" aria-label="Settings">${I.gear}</button></div></div>
  <div class="card status st-${lab.cls}"><div class="ic">${lab.icon}</div><div><div class="h2">${esc(lab.title)}</div><div class="small muted">${esc(lab.sub)}</div></div></div>${post}
  <div class="stats" style="grid-template-columns:1fr 1fr">
    <button class="stat" data-go="todo"><span class="si" style="background:var(--lav);color:var(--peri)">${I.todo}</span><b>${todoLeft}</b><span class="tiny muted">to do today</span></button>
    <button class="stat" data-go="money"><span class="si" style="background:var(--sunbg);color:#C99A1E">${I.coin}</span><b>RM${Math.round(window.MD.moneyToday ? window.MD.moneyToday() : 0)}</b><span class="tiny muted">spent today</span></button>
  </div>
  ${dueSoon()}
  <div class="seg">${[["plan", "Plan"], ["todo", "To do"], ["buy", "To buy"]].map(([k, l]) => `<button data-tv="${k}" class="${S.todayView === k ? "on" : ""}">${l}</button>`).join("")}</div>
  <div id="tv">${{ plan: viewPlan, todo: viewTodo, buy: viewBuy }[S.todayView]()}</div>`;
}
function dueSoon() {
  const items = [];
  (window.MD.remindersDueSoon ? window.MD.remindersDueSoon() : []).forEach(r => { const d = Math.round((parse(r.due_date) - parse(today())) / 864e5);
    items.push([r.due_date, `<button class="item" style="width:100%;text-align:left" data-dsrem="${r.id}"><div class="grow"><div class="title">${esc(r.name)}</div><div class="tiny muted">Life admin</div></div><span class="pill ${d < 0 ? "rose" : "warn"}">${d < 0 ? -d + "d late" : d === 0 ? "Today" : d === 1 ? "Tomorrow" : "in " + d + " days"}</span></button>`]); });
  (window.MD.billsDueSoon ? window.MD.billsDueSoon() : []).forEach(x => items.push([x.due, `<button class="item" style="width:100%;text-align:left" data-dsbill="1"><div class="grow"><div class="title">${esc(x.b.name)}</div><div class="tiny muted">Bill${x.b.amount ? " · RM " + Number(x.b.amount).toFixed(2) : ""}</div></div><span class="pill ${x.status === "late" ? "rose" : "warn"}">${x.days < 0 ? -x.days + "d late" : x.days === 0 ? "Today" : x.days === 1 ? "Tomorrow" : "in " + x.days + " days"}</span></button>`]));
  if (window.MD.extraDue) items.push(...window.MD.extraDue());
  items.sort((a, b) => a[0].localeCompare(b[0]));
  const recap = new Date().getDate() <= 7 && window.MD.recapSheet && S.tx && S.tx.some(t => t.date.startsWith(window.MD.lastMonth()));
  const lm = recap ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Number(window.MD.lastMonth().slice(5)) - 1] : "";
  return (items.length ? `<div class="lbl">Due soon</div><div class="list">${items.map(x => x[1]).join("")}</div>` : "")
    + (recap ? `<button class="card between" id="recapcard" style="width:100%;text-align:left;margin-top:10px;background:var(--lav);border:none"><div><div class="h2">Your ${lm} recap</div><div class="small muted">Money, days, and what you learned</div></div>${I.right.replace("<svg", '<svg width="20" height="20"')}</button>` : "");
}
function bindToday() {
  window.MD.bindExtraDue && window.MD.bindExtraDue();
  document.querySelectorAll("[data-dsrem]").forEach(b => b.onclick = () => window.MD.remSheet(S.reminders.find(r => r.id === b.dataset.dsrem)));
  document.querySelectorAll("[data-dsbill]").forEach(b => b.onclick = () => { S.tab = "money"; S.moneyView = "bills"; S.moneyMonth = today().slice(0, 7); render(); window.scrollTo(0, 0); });
  const rc = $("#recapcard"); if (rc) rc.onclick = () => window.MD.recapSheet();
  document.querySelectorAll("[data-tv]").forEach(b => b.onclick = () => { S.todayView = b.dataset.tv; lastTab = null; try { localStorage.setItem("myday.todayView", S.todayView); } catch (e) {} render(); });
  document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const g = b.dataset.go; if (g === "cal") { S.tab = "calendar"; } else if (g === "money") { S.tab = "money"; } else { S.todayView = g; } render(); });
  ({ plan: bindPlan, todo: bindTodo, buy: bindBuy })[S.todayView]();
}

/* ----- Plan ----- */
/* ----- type-your-day parser: "7-8:30 Morning routine", "3pm Groceries", "9-10:30pm Evening" ----- */
function parsePlanText(text) {
  const out = [];
  const tm = "(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)?";
  const re = new RegExp("^\\s*" + tm + "(?:\\s*(?:-|–|—|to)\\s*" + tm + ")?\\s*[-–:·.]?\\s+(.+)$", "i");
  const norm = (h, m, ap) => { h = Number(h); m = Number(m || 0); ap = (ap || "").toLowerCase().replace(/\./g, "");
    if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0; return [h, m, !!ap]; };
  String(text || "").split(/\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    const m = line.match(re);
    if (!m || Number(m[1]) > 24 || (m[2] && Number(m[2]) > 59)) { out.push({ title: line, start: null, end: null }); return; }
    let [sh, sm, sAp] = norm(m[1], m[2], m[3]), end = null;
    if (m[4]) {
      let [eh, em, eAp] = norm(m[4], m[5], m[6]);
      if (!sAp && eAp && eh >= 12 && sh + 12 <= eh && sh < 12) sh += 12;       // "9-10:30pm" → 9pm
      if (!sAp && !eAp) { if (sh >= 1 && sh <= 6) sh += 12; if (eh < sh) eh += 12; } // "12-1", "3-4"
      if (!eAp && eh < sh && eh + 12 <= 24) eh += 12;
      end = `${pad(eh % 24)}:${pad(em)}`;
    } else if (!sAp && sh >= 1 && sh <= 6) sh += 12;                             // "3 Groceries" → 3pm
    out.push({ title: m[7].trim(), start: `${pad(sh % 24)}:${pad(sm)}`, end });
  });
  return out;
}
function typeDaySheet(date) {
  const ex = S.plans.filter(p => p.date === date).length;
  openSheet(`<h2 class="h2">Type your day</h2><div class="small muted" style="margin:2px 0 14px">${fmtLong(date)}${ex ? ` · ${ex} already planned` : ""}</div>
    <div class="field"><label>One plan per line, time first</label><textarea id="tdx" rows="9" style="font-size:14px;line-height:1.7" placeholder="7-8:30 Morning routine&#10;12-1 Lunch&#10;3pm Groceries&#10;9-10:30pm Evening routine&#10;Call Dad"></textarea></div>
    <p class="tiny muted" style="margin:-4px 2px 12px">Times like 7, 7:30, 7am, 3pm, 9-10:30pm or 14:00 all work. 1 to 6 without am/pm means afternoon. A line with no time goes under "Anytime".</p>
    <div id="tdprev"></div>
    <button class="btn primary block" id="tdsave">Add to my day</button>`, () => {
    const inp = $("#tdx"), prev = $("#tdprev");
    const show = () => { const items = parsePlanText(inp.value);
      prev.innerHTML = items.length ? `<div class="lbl">Preview · ${items.length}</div><div class="list" style="margin-bottom:14px">${items.map(x => `<div class="item"><span class="small" style="width:92px;flex:none;color:var(--peri);font-weight:600">${x.start ? t12(x.start) + (x.end ? "–" + t12(x.end) : "") : "Anytime"}</span><div class="grow small">${esc(x.title)}</div></div>`).join("")}</div>` : ""; };
    inp.oninput = show; setTimeout(() => inp.focus(), 350);
    $("#tdsave").onclick = async () => {
      const items = parsePlanText(inp.value); if (!items.length) { window.ART.nudge(inp, "Type at least one line"); return; }
      try { const rows = await rest("POST", "myday_plans", items.map(x => ({ date, title: x.title.slice(0, 120), start_time: x.start, end_time: x.end, color: "lavender" })));
        S.plans.push(...rows); closeSheet(); render(); toast(`${rows.length} plan${rows.length > 1 ? "s" : ""} added`); } catch (e) { fail(e); }
    };
  });
}

function viewPlan() {
  const t = today(), sel = S.planDate, info = dayInfo(sel), st = S.settings;
  let strip = "";
  for (let i = -2; i <= 12; i++) {
    const ds = addDays(t, i), d = parse(ds), k = dayInfo(ds).kind;
    strip += `<button data-pd="${ds}" class="${ds === sel ? "on" : ""}"><span class="w">${i === 0 ? "Today" : WD[d.getDay()]}</span><span class="d">${d.getDate()}</span><div class="dot" style="background:${KCOL[k]}"></div></button>`;
  }
  const plans = S.plans.filter(p => p.date === sel);
  const lab = dayLabel(info, sel);
  const hr = s => s ? Number(s.slice(0, 2)) : null;
  // the shaded stretch for work / on-call
  let band = null;
  if (info.kind === "work") band = { from: hr(hhmm(st.work_start)), to: hr(hhmm(st.work_end)), label: "Work", cls: "band-work" };
  if (info.kind === "oncall") band = { from: 8, to: 24, label: "On-call from home", cls: "band-oncall" };
  const anytime = plans.filter(p => !p.start_time);
  const timed = plans.filter(p => p.start_time).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const hours = timed.map(p => hr(p.start_time));
  const first = Math.min(6, ...hours), last = Math.max(23, ...hours);
  const blk = p => `<button class="blk c-${p.color}" data-plan="${p.id}"><div class="bt">${esc(p.title)}</div><div class="bs">${t12(hhmm(p.start_time))}${p.end_time ? " – " + t12(hhmm(p.end_time)) : ""}${p.note ? " · " + esc(p.note) : ""}</div></button>`;
  let grid = "";
  for (let h = first; h <= last; h++) {
    const here = timed.filter(p => hr(p.start_time) === h);
    const inBand = band && h >= band.from && h < band.to;
    const bandStart = band && h === band.from;
    grid += `<div class="hr ${inBand ? band.cls : ""} ${bandStart ? "bstart" : ""}"><div class="hl">${t12(pad(h % 24) + ":00")}</div><div class="hc">
      ${bandStart ? `<button class="bandtag" data-auto="1">${esc(band.label)} · ${band.label === "Work" ? `${t12(hhmm(st.work_start))}–${t12(hhmm(st.work_end))}` : "8am → 8am"}</button>` : ""}
      ${here.map(blk).join("")}
      ${here.length ? "" : `<button class="slot" data-slot="${pad(h % 24)}:00" aria-label="Add at ${t12(pad(h % 24) + ":00")}"><span>+</span></button>`}</div></div>`;
  }
  return `<div class="strip" id="strip">${strip}</div>
    <div class="between" style="margin:6px 2px 10px"><div class="h2">${esc(relDay(sel))}</div><span class="pill ${info.kind === "oncall" ? "navy" : info.kind === "leave" ? "sage" : info.kind === "work" ? "" : "warn"}">${esc(lab.title)}</span></div>
    <p class="tiny muted" style="margin:-4px 2px 10px">Tap any hour and type. Tap a plan to change its time, colour or note.</p>
    ${info.prevOncall ? `<div class="tiny muted" style="margin:0 2px 8px">On-call from yesterday ends at 8am.</div>` : ""}
    ${anytime.length ? `<div class="lbl">Anytime</div><div class="anyt">${anytime.map(p => `<button class="blk c-${p.color}" data-plan="${p.id}"><div class="bt">${esc(p.title)}</div>${p.note ? `<div class="bs">${esc(p.note)}</div>` : ""}</button>`).join("")}</div>` : ""}
    <div class="hours" id="hours">${grid}</div>`;
}
function bindPlan() {
  const strip = $("#strip"), on = $(".on", strip); if (on) strip.scrollLeft = on.offsetLeft - 60;
  document.querySelectorAll("[data-pd]").forEach(b => b.onclick = () => { S.planDate = b.dataset.pd; render(); });
  document.querySelectorAll("[data-plan]").forEach(b => b.onclick = () => planSheet(S.plans.find(p => p.id === b.dataset.plan)));
  document.querySelectorAll("[data-auto]").forEach(b => b.onclick = () => daySheet(S.planDate));
  // type straight into the timeline: tap an hour, write, press return
  document.querySelectorAll("[data-slot]").forEach(b => b.onclick = () => {
    const at = b.dataset.slot, inp = document.createElement("input");
    inp.type = "text"; inp.className = "slotin"; inp.enterKeyHint = "done"; inp.autocomplete = "off";
    inp.placeholder = `What's at ${t12(at)}?`;
    b.replaceWith(inp); inp.focus();
    let done = false;
    const save = async () => {
      if (done) return; done = true;
      const v = inp.value.trim(); if (!v) { render(); return; }
      // "7:30 Breakfast" or "7-8:30 Gym" keeps its own time; otherwise it uses the hour you tapped
      const parsed = /^\s*\d/.test(v) ? parsePlanText(v)[0] : null;
      const start = parsed?.start || at, end = parsed?.start ? parsed.end : `${pad((Number(at.slice(0, 2)) + 1) % 24)}:00`;
      inp.disabled = true;
      try { const r = await db.insert("myday_plans", { date: S.planDate, title: (parsed?.start ? parsed.title : v).slice(0, 120), start_time: start, end_time: end, color: "lavender" });
        S.plans.push(r); window.ART.celebrate(`[data-plan="${r.id}"]`); render(); } catch (e) { done = false; inp.disabled = false; fail(e); }
    };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") { done = true; render(); } });
    inp.addEventListener("blur", save);
  });
}
const COLORS = [["lavender", "var(--lav2)"], ["sage", "var(--sage)"], ["sun", "var(--sun)"], ["rose", "var(--rose)"], ["navy", "var(--navy)"]];
function planSheet(p, date, at) {
  const endOf = t => t ? `${pad((Number(t.slice(0, 2)) + 1) % 24)}:${t.slice(3, 5)}` : "";
  const isNew = !p; p = p || { date: date || today(), title: "", start_time: at || "", end_time: endOf(at), note: "", color: "lavender" };
  let color = p.color;
  openSheet(`<h2 class="h2" style="margin-bottom:14px">${isNew ? "Add a plan" : "Edit plan"}</h2>
    <div class="field"><label>What</label><input type="text" id="pt" value="${esc(p.title)}" placeholder="Dinner with Dad"></div>
    <div class="field"><label>Date</label><input type="date" id="pdt" value="${p.date}"></div>
    <div class="two"><div class="field"><label>Start (optional)</label><input type="time" id="ps" value="${hhmm(p.start_time)}"></div>
    <div class="field"><label>End (optional)</label><input type="time" id="pe" value="${hhmm(p.end_time)}"></div></div>
    <div class="field"><label>Note</label><input type="text" id="pn" value="${esc(p.note || "")}" placeholder="Optional"></div>
    <div class="field"><label>Colour</label><div class="swatches">${COLORS.map(([k, c]) => `<button data-c="${k}" class="${k === color ? "on" : ""}" style="background:${c}" aria-label="${k}"></button>`).join("")}</div></div>
    <div class="err" id="perr"></div>
    <button class="btn primary block" id="psave">${isNew ? "Add" : "Save"}</button>
    ${isNew ? "" : '<button class="btn danger block" id="pdel" style="margin-top:8px">Delete</button>'}`, sh => {
    sh.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { color = b.dataset.c; sh.querySelectorAll("[data-c]").forEach(x => x.classList.toggle("on", x === b)); });
    $("#pt").focus();
    $("#psave").onclick = async () => {
      const o = { title: $("#pt").value.trim(), date: $("#pdt").value, start_time: $("#ps").value || null, end_time: $("#pe").value || null, note: $("#pn").value.trim() || null, color };
      if (!o.title) { $("#perr").textContent = "Add what the plan is."; return; }
      if (!o.date) { $("#perr").textContent = "Pick a date."; return; }
      try {
        if (isNew) S.plans.push(await db.insert("myday_plans", o));
        else Object.assign(p, await db.update("myday_plans", p.id, o));
        S.planDate = o.date; closeSheet(); render(); toast(isNew ? "Plan added" : "Plan saved");
      } catch (e) { fail(e); }
    };
    const del = $("#pdel"); if (del) del.onclick = async () => {
      try { await db.remove("myday_plans", p.id); S.plans = S.plans.filter(x => x.id !== p.id); closeSheet(); render();
        toast("Plan deleted", async () => { S.plans.push(await db.restore("myday_plans", p.id)); render(); }); } catch (e) { fail(e); }
    };
  });
}

/* ----- To do ----- */
function todoRow(x, extra = "") {
  return `<div class="item ${x.done_at ? "done" : ""}"><button class="chk" data-tchk="${x.id}" aria-label="Done">${x.done_at ? I.check : ""}</button>
    <button class="grow" style="text-align:left" data-tedit="${x.id}"><div class="title">${esc(x.title)}</div>${extra}</button>
    <button class="x" data-tdel="${x.id}" aria-label="Delete">×</button></div>`;
}
function viewTodo() {
  const t = today();
  const todayL = S.todos.filter(x => (!x.done_at && x.due_date && x.due_date <= t) || (x.done_at && localDateOfIso(x.done_at) === t && x.due_date && x.due_date <= t))
    .sort((a, b) => (!!a.done_at - !!b.done_at) || (a.due_date || "").localeCompare(b.due_date || ""));
  const later = S.todos.filter(x => !x.done_at && x.due_date > t).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const anytime = S.todos.filter(x => (!x.due_date) && (!x.done_at || localDateOfIso(x.done_at) === t)).sort((a, b) => !!a.done_at - !!b.done_at);
  const sec = (title, arr, fn) => arr.length ? `<div class="lbl">${title}</div><div class="list">${arr.map(fn).join("")}</div>` : "";
  return `<form class="addbar" id="tadd"><input type="text" id="tin" placeholder="Add a to-do for today" autocomplete="off"><button class="btn sun" type="submit">Add</button></form>
    ${sec("Today", todayL, x => todoRow(x, x.due_date < t && !x.done_at ? `<span class="pill warn" style="margin-top:4px">from ${esc(relDay(x.due_date))}</span>` : ""))}
    ${sec("Coming up", later, x => todoRow(x, `<span class="tiny muted">${esc(relDay(x.due_date))}</span>`))}
    ${sec("Anytime", anytime, x => todoRow(x))}
    ${!todayL.length && !later.length && !anytime.length ? '<div class="empty">All clear. Add something you want to get done.</div>' : ""}
    <p class="tiny faint" style="text-align:center;margin-top:14px">Unfinished to-dos move to the next day. Tap one to set a date.</p>`;
}
function bindTodo() {
  $("#tadd").onsubmit = async e => {
    e.preventDefault(); const v = $("#tin").value.trim(); if (!v) { window.ART.nudge($("#tin"), "Type a to-do first"); return; }
    try { S.todos.push(await db.insert("myday_todos", { title: v, due_date: today() })); render(); $("#tin").focus(); } catch (er) { fail(er); }
  };
  document.querySelectorAll("[data-tchk]").forEach(b => b.onclick = async () => {
    const x = S.todos.find(y => y.id === b.dataset.tchk);
    try { Object.assign(x, await db.update("myday_todos", x.id, { done_at: x.done_at ? null : nowIso() })); if (x.done_at) window.ART.celebrate(`[data-tchk="${x.id}"]`, true); render(); } catch (e) { fail(e); }
  });
  document.querySelectorAll("[data-tdel]").forEach(b => b.onclick = async () => {
    const id = b.dataset.tdel;
    try { await db.remove("myday_todos", id); S.todos = S.todos.filter(y => y.id !== id); render();
      toast("To-do deleted", async () => { S.todos.push(await db.restore("myday_todos", id)); render(); }); } catch (e) { fail(e); }
  });
  document.querySelectorAll("[data-tedit]").forEach(b => b.onclick = () => todoSheet(S.todos.find(y => y.id === b.dataset.tedit)));
}
function todoSheet(x) {
  const isNew = !x; x = x || { title: "", due_date: today() };
  openSheet(`<h2 class="h2" style="margin-bottom:14px">${isNew ? "Add a to-do" : "Edit to-do"}</h2>
    <div class="field"><label>To do</label><input type="text" id="tt" value="${esc(x.title)}" placeholder="Pay phone bill"></div>
    <div class="field"><label>When</label><input type="date" id="td" value="${x.due_date || ""}"></div>
    <label class="row small muted" style="margin:-4px 2px 14px"><input type="checkbox" id="tnod" ${x.due_date ? "" : "checked"}> No date (anytime)</label>
    <div class="err" id="terr"></div>
    <button class="btn primary block" id="tsave">${isNew ? "Add" : "Save"}</button>`, () => {
    $("#tt").focus();
    $("#tnod").onchange = e => { $("#td").disabled = e.target.checked; }; $("#td").disabled = !x.due_date;
    $("#tsave").onclick = async () => {
      const o = { title: $("#tt").value.trim(), due_date: $("#tnod").checked ? null : ($("#td").value || today()) };
      if (!o.title) { $("#terr").textContent = "Add what you need to do."; return; }
      try { if (isNew) S.todos.push(await db.insert("myday_todos", o)); else Object.assign(x, await db.update("myday_todos", x.id, o));
        closeSheet(); S.tab = "today"; S.todayView = "todo"; render(); toast(isNew ? "To-do added" : "Saved"); } catch (e) { fail(e); }
    };
  });
}

/* ----- To buy ----- */
const GROUPS = ["Groceries", "Household", "Personal", "Other"];
let buyGroup = "Groceries";
function viewBuy() {
  const open = S.shopping.filter(x => !x.done_at), done = S.shopping.filter(x => x.done_at);
  const groups = [...new Set([...GROUPS, ...S.shopping.map(x => x.group_name)])];
  const byG = groups.map(g => [g, open.filter(x => x.group_name === g)]).filter(([, a]) => a.length);
  const row = x => `<div class="item ${x.done_at ? "done" : ""}"><button class="chk" data-bchk="${x.id}" aria-label="Bought">${x.done_at ? I.check : ""}</button>
     <div class="grow"><div class="title">${esc(x.title)}${x.qty ? ` <span class="muted small">· ${esc(x.qty)}</span>` : ""}</div></div>
     ${x.price != null ? `<span class="small muted">RM ${Number(x.price).toFixed(2)}</span>` : ""}<button class="x" data-bdel="${x.id}" aria-label="Delete">×</button></div>`;
  const total = done.reduce((s, x) => s + Number(x.price || 0), 0);
  return `<form class="addbar" id="badd"><input type="text" id="bin" placeholder="Add an item" autocomplete="off"><button class="btn sun" type="submit">Add</button></form>
    <div class="paint" style="margin-top:-4px">${groups.map(g => `<button type="button" data-bg="${esc(g)}" class="${g === buyGroup ? "on" : ""}">${esc(g)}</button>`).join("")}<button type="button" id="newg">+ Group</button></div>
    ${byG.map(([g, a]) => `<div class="lbl">${esc(g)}</div><div class="list">${a.map(row).join("")}</div>`).join("")}
    ${!open.length ? '<div class="empty">Your list is empty.</div>' : ""}
    ${done.length ? `<div class="between"><div class="lbl">In the basket${total ? ` · RM ${total.toFixed(2)}` : ""}</div><button class="small" style="color:var(--peri)" id="clearb">Clear bought</button></div><div class="list">${done.map(row).join("")}</div>` : ""}
    <p class="tiny faint" style="text-align:center;margin-top:14px">When you tick an item and add its price, it goes into Money as spending.</p>`;
}
function bindBuy() {
  document.querySelectorAll("[data-bg]").forEach(b => b.onclick = () => { buyGroup = b.dataset.bg; document.querySelectorAll("[data-bg]").forEach(x => x.classList.toggle("on", x === b)); });
  $("#newg").onclick = () => { const g = prompt("New group name"); if (g && g.trim()) { buyGroup = g.trim(); GROUPS.includes(buyGroup) || GROUPS.push(buyGroup); render(); } };
  $("#badd").onsubmit = async e => {
    e.preventDefault(); const v = $("#bin").value.trim(); if (!v) { window.ART.nudge($("#bin"), "Type an item first"); return; }
    try { S.shopping.push(await db.insert("myday_shopping", { title: v, group_name: buyGroup })); render(); $("#bin").focus(); } catch (er) { fail(er); }
  };
  document.querySelectorAll("[data-bchk]").forEach(b => b.onclick = async () => {
    const x = S.shopping.find(y => y.id === b.dataset.bchk);
    if (x.done_at) { try { Object.assign(x, await db.update("myday_shopping", x.id, { done_at: null, price: null }));
      const lt = (S.tx || []).find(t => t.shopping_id === x.id); if (lt) { await db.remove("myday_transactions", lt.id); S.tx = S.tx.filter(t => t !== lt); }
      render(); } catch (e) { fail(e); } return; }
    openPop(`<h2 class="h2">Bought ${esc(x.title)}</h2><p class="small muted" style="margin:4px 0 14px">Add the price if you like. You can skip it.</p>
      <div class="field"><label>Price (RM)</label><input type="number" inputmode="decimal" step="0.01" min="0" id="bp" placeholder="0.00"></div>
      <div class="btnrow"><button class="btn" id="bskip">Skip</button><button class="btn primary" id="bok">Save</button></div>`, () => {
      $("#bp").focus();
      const go = async price => { try { Object.assign(x, await db.update("myday_shopping", x.id, { done_at: nowIso(), price }));
        if (price && S.categories) { const c = S.categories.find(k => k.kind === "expense" && k.name.toLowerCase() === x.group_name.toLowerCase()) || S.categories.find(k => k.name === "Shopping");
          S.tx.unshift(await db.insert("myday_transactions", { type: "expense", amount: price, date: today(), category_id: c?.id || null, account_id: S.settings.default_account_id, payee: x.title, source: "shopping", shopping_id: x.id })); }
        closeSheet(); render(); if (price) toast("Saved in Money too"); } catch (e) { fail(e); } };
      $("#bskip").onclick = () => go(null);
      $("#bok").onclick = () => { const v = $("#bp").value; go(v === "" ? null : Math.round(Number(v) * 100) / 100); };
    });
  });
  document.querySelectorAll("[data-bdel]").forEach(b => b.onclick = async () => {
    const id = b.dataset.bdel;
    try { await db.remove("myday_shopping", id); S.shopping = S.shopping.filter(y => y.id !== id); render();
      toast("Item removed", async () => { S.shopping.push(await db.restore("myday_shopping", id)); render(); }); } catch (e) { fail(e); }
  });
  const cb = $("#clearb"); if (cb) cb.onclick = async () => {
    const ids = S.shopping.filter(x => x.done_at).map(x => x.id);
    try { await rest("PATCH", `myday_shopping?id=in.(${ids.join(",")})`, { deleted_at: nowIso() }); S.shopping = S.shopping.filter(x => !x.done_at); render();
      toast(`Cleared ${ids.length} item${ids.length > 1 ? "s" : ""}`, async () => { const r = await rest("PATCH", `myday_shopping?id=in.(${ids.join(",")})`, { deleted_at: null }); S.shopping.push(...r); render(); }); } catch (e) { fail(e); }
  };
}

/* ---------- CALENDAR ---------- */
function viewCalendar() {
  const [y, m] = S.calMonth.split("-").map(Number), first = new Date(y, m - 1, 1), t = today();
  const lead = (first.getDay() + 6) % 7, dim = new Date(y, m, 0).getDate();
  let cells = "";
  for (let i = 0; i < lead; i++) cells += `<button class="other" tabindex="-1"></button>`;
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${pad(m)}-${pad(d)}`, info = dayInfo(ds), hasPlan = S.plans.some(p => p.date === ds);
    const k = info.kind === "off" && info.override ? "off-x" : info.kind;
    cells += `<button data-day="${ds}" class="k-${k} ${ds === t ? "today" : ""}"><div class="num">${d}</div><div class="dots"><i style="background:${KCOL[info.kind]}"></i>${hasPlan ? '<i style="background:var(--rose)"></i>' : ""}</div></button>`;
  }
  const lv = leaveSummary();
  const modes = [["oncall", "On-call"], ["leave", "Leave"], ["off", "Off"], ["work", "Work"], ["reset", "Reset"]];
  const paint = S.paint ? `<div class="paintbar"><div class="between"><div class="small"><b>Edit roster</b> · pick a type, then tap the dates</div><button class="btn primary" id="pdone" style="padding:7px 14px">Done</button></div>
      <div class="paint">${modes.map(([k, l]) => `<button data-pm="${k}" class="${S.paint === k ? "on" : ""}">${l}</button>`).join("")}</div></div>` : "";
  // coming up (next 30 days)
  const up = [];
  for (let i = 0; i <= 30 && up.length < 10; i++) {
    const ds = addDays(t, i), info = dayInfo(ds);
    if (info.kind === "oncall") up.push([ds, "On-call", "navy", "8am → 8am"]);
    if (info.kind === "leave") up.push([ds, "Annual leave", "sage", "Leave"]);
    if (info.kind === "holiday") up.push([ds, info.holiday, "warn", "Public holiday"]);
    S.plans.filter(p => p.date === ds).forEach(p => up.push([ds, p.title, "rose", p.start_time ? t12(hhmm(p.start_time)) : "Plan"]));
  }
  return `<div class="top"><div><h1 class="h1">${MONL[m - 1]} <span class="muted" style="font-weight:300">${y}</span></h1><div class="small muted">Your shifts and plans</div></div>
    <div class="row"><button class="iconbtn" id="cprev" aria-label="Previous month">${I.left}</button><button class="iconbtn" id="cnext" aria-label="Next month">${I.right}</button><button class="iconbtn" id="gear" aria-label="Annual leave settings">${I.gear}</button></div></div>
    ${S.paint ? paint : `<button class="btn block" id="proster" style="margin-bottom:10px;height:auto;padding:6px 14px;display:flex;align-items:center;gap:8px;justify-content:center">${window.ART.moon(34)}<span>Edit roster: on-call, leave, off days</span></button>`}
    <div class="cal" style="margin-top:10px"><div class="wd">${["M", "T", "W", "T", "F", "S", "S"].map(x => `<div>${x}</div>`).join("")}</div><div class="grid">${cells}</div>
    <div class="legend"><span><i style="background:var(--peri)"></i>Work</span><span><i style="background:var(--navy)"></i>On-call</span><span><i style="background:var(--sun)"></i>Off / holiday</span><span><i style="background:var(--sage)"></i>Leave</span><span><i style="background:var(--rose)"></i>Plan</span></div></div>
    <button class="card leave between" id="leavecard" style="margin-top:12px;width:100%;text-align:left"><div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">ANNUAL LEAVE ${lv.cy}</div>
      <div style="font-size:25px;font-weight:500">${lv.left} <span style="font-size:13px;font-weight:400">days left</span></div>
      <div class="small muted">${lv.taken} taken${lv.booked ? ` · ${lv.booked} booked ahead` : ""} · ${lv.next} available in ${lv.cy + 1}</div></div>
      <svg class="ring" width="58" height="58" aria-hidden="true"><circle cx="29" cy="29" r="23" fill="none" stroke="#3E4480" stroke-width="7"/><circle class="ringfill" cx="29" cy="29" r="23" fill="none" stroke="#F6D86B" stroke-width="7" stroke-linecap="round" stroke-dasharray="${Math.max(0, Math.min(1, lv.left / Math.max(1, Number(S.settings.leave_entitlement)))) * 144.5} 145" transform="rotate(-90 29 29)"/></svg></button>
    <div class="lbl">Coming up</div>
    ${up.length ? `<div class="list">${up.map(([ds, title, cls, sub]) => `<button class="item" style="width:100%;text-align:left" data-day="${ds}"><div class="grow"><b style="font-weight:600">${esc(relDay(ds))}</b> · ${esc(title)}</div><span class="pill ${cls}">${esc(sub || "")}</span></button>`).join("")}</div>` : '<div class="empty">Nothing special in the next 30 days.</div>'}`;
}
function bindCalendar() {
  const mv = n => { const [y, m] = S.calMonth.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); S.calMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); };
  $("#cprev").onclick = () => mv(-1); $("#cnext").onclick = () => mv(1);
  const lc = $("#leavecard"); if (lc) lc.onclick = settingsSheet;
  const pr = $("#proster"); if (pr) pr.onclick = () => { S.paint = "oncall"; render(); };
  const pd = $("#pdone"); if (pd) pd.onclick = () => { S.paint = null; render(); toast("Roster saved"); };
  document.querySelectorAll("[data-pm]").forEach(b => b.onclick = () => { S.paint = b.dataset.pm; render(); });
  document.querySelectorAll("[data-day]").forEach(b => b.onclick = () => S.paint ? paintDay(b.dataset.day) : daySheet(b.dataset.day));
}
async function setDayKind(ds, kind) {
  // kind: 'oncall' | 'leave' | 'off' | 'work' | null (back to normal)
  const cur = S.days[ds], base = baseKind(ds);
  const want = kind && !(kind === base || (kind === "off" && base === "holiday")) ? kind : null;
  if ((cur?.kind || null) === want) return;
  if (cur) { await db.remove("myday_days", cur.id); delete S.days[ds]; }
  if (want) S.days[ds] = await db.insert("myday_days", { date: ds, kind: want });
}
async function paintDay(ds) {
  const cur = S.days[ds]?.kind, mode = S.paint;
  try { await setDayKind(ds, mode === "reset" || cur === mode ? null : mode); render(); } catch (e) { fail(e); }
}
function daySheet(ds) {
  const info = dayInfo(ds), lab = dayLabel(info, ds), plans = S.plans.filter(p => p.date === ds);
  const opts = [["work", "Work", "8am – 5pm"], ["oncall", "On-call", "from home, 24h"], ["off", "Off", "day off"], ["leave", "Annual leave", "uses 1 day"]];
  openSheet(`<div class="between"><div><h2 class="h2">${fmtLong(ds)}</h2><div class="small muted">${esc(lab.title)}${info.override ? " · changed from normal" : ""}</div></div></div>
    ${info.holiday ? `<div class="card" style="margin-top:12px;background:var(--sunbg);border:none"><span class="small" style="color:var(--sunink)">Public holiday: ${esc(info.holiday)}</span></div>` : ""}
    <div class="lbl">This day is</div>
    <div class="choice">${opts.map(([k, l, s]) => `<button data-k="${k}" class="${(info.kind === k || (k === "off" && info.kind === "holiday")) ? "on" : ""}"><div style="font-weight:600">${l}</div><div class="tiny muted">${s}</div></button>`).join("")}</div>
    ${info.override ? '<button class="addline" id="dreset">Reset to normal</button>' : ""}
    <div class="lbl">Plans</div>
    ${plans.length ? `<div class="list">${plans.map(p => `<button class="item" style="width:100%;text-align:left" data-p="${p.id}"><div class="grow">${esc(p.title)}</div><span class="small muted">${p.start_time ? t12(hhmm(p.start_time)) : ""}</span></button>`).join("")}</div>` : '<div class="small muted" style="padding:0 2px">No plans yet.</div>'}
    <div class="btnrow" style="margin-top:14px"><button class="btn" id="dplan">+ Add plan</button><button class="btn primary" id="dopen">Open in Today</button></div>`, sh => {
    sh.querySelectorAll("[data-k]").forEach(b => b.onclick = async () => { try { await setDayKind(ds, b.dataset.k); closeSheet(); render(); toast("Day updated"); } catch (e) { fail(e); } });
    const r = $("#dreset"); if (r) r.onclick = async () => { try { await setDayKind(ds, null); closeSheet(); render(); } catch (e) { fail(e); } };
    sh.querySelectorAll("[data-p]").forEach(b => b.onclick = () => planSheet(S.plans.find(p => p.id === b.dataset.p)));
    $("#dplan").onclick = () => planSheet(null, ds);
    $("#dopen").onclick = () => { closeSheet(); S.tab = "today"; S.todayView = "plan"; S.planDate = ds; render(); window.scrollTo(0, 0); };
  });
}

/* ---------- coming soon ---------- */
function viewSoon(title, text, step) {
  return `<div class="top"><div><h1 class="h1">${title}</h1><div class="small muted serif" style="font-size:13px">little by little</div></div><button class="iconbtn" id="gear" aria-label="Settings">${I.gear}</button></div>
  <div class="card soon-card"><svg width="90" height="90" viewBox="0 0 130 150" aria-hidden="true"><circle cx="98" cy="26" r="20" fill="#F6D86B"/><path d="M65 105 C40 80 30 55 45 30 C60 50 68 75 65 105Z" fill="#7FA38A"/><path d="M68 105 C85 75 100 60 118 58 C110 85 90 100 68 105Z" fill="#9CBBA4"/><path d="M40 104 h52 l-7 40 h-38z" fill="#EFE9DF" stroke="#DDD5C8"/></svg>
  <h2 class="h2" style="margin-top:10px">Coming in ${step}</h2><p class="small muted">${text}</p></div>`;
}

/* ---------- quick add ---------- */
function quickAdd() {
  const root = $("#menu-root");
  if ($(".qmenu-wrap", root)) { closeMenu(); return; }
  const items = [["qp", I.plan, "Plan", "var(--lav)"], ["qt", I.todo, "To do", "var(--sagebg)"], ["qb", I.cart, "To buy", "var(--sunbg)"], ["qe", I.coin, "Money", "var(--rosebg)"], ["ql", I.book, "Topic", "var(--lav)"], ["qr", I.cal, "Reminder", "var(--sunbg)"]];
  root.innerHTML = `<div class="qmenu-wrap"><div class="qmenu" role="menu">${items.map(([id, ic, l, bg]) => `<button id="${id}" role="menuitem"><span class="qi" style="background:${bg}">${ic}</span>${l}</button>`).join("")}</div></div>`;
  const w = $(".qmenu-wrap", root);
  $("#fab")?.classList.add("open");
  requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add("open")));
  w.addEventListener("click", e => { if (e.target === w) closeMenu(); });
  const go = fn => () => { closeMenu(true); fn(); };
  $("#qp").onclick = go(() => planSheet(null, S.tab === "today" ? S.planDate : today()));
  $("#qt").onclick = go(() => todoSheet(null));
  $("#qb").onclick = go(() => {
    openPop(`<h2 class="h2" style="margin-bottom:14px">Add to buy</h2><div class="field"><label>Item</label><input type="text" id="qbi" placeholder="Eggs"></div>
      <div class="field"><label>Group</label><select id="qbg">${[...new Set([...GROUPS, ...S.shopping.map(x => x.group_name)])].map(g => `<option ${g === buyGroup ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></div>
      <button class="btn primary block" id="qbs">Add</button>`, () => {
      $("#qbi").focus();
      $("#qbs").onclick = async () => { const v = $("#qbi").value.trim(); if (!v) { window.ART.nudge($("#qbi")); return; }
        try { S.shopping.push(await db.insert("myday_shopping", { title: v, group_name: $("#qbg").value })); closeSheet(); S.tab = "today"; S.todayView = "buy"; render(); toast("Added to your list"); } catch (e) { fail(e); } };
    });
  });
  $("#qe").onclick = go(() => window.MD.txSheet(null));
  $("#ql").onclick = go(() => window.MD.topicQuickAdd());
  $("#qr").onclick = go(() => window.MD.remSheet(null));
}

/* ---------- settings ---------- */
function todaySettings() {
  const doneTodos = S.todos.filter(x => x.done_at), bought = S.shopping.filter(x => x.done_at);
  openSheet(`<h2 class="h2" style="margin-bottom:6px">Today</h2>
    <div class="lbl">Tidy up</div>
    <button class="btn block" id="ctodo" style="margin-bottom:8px">Clear finished to-dos${doneTodos.length ? ` (${doneTodos.length})` : ""}</button>
    <button class="btn block" id="cbuy">Clear bought items${bought.length ? ` (${bought.length})` : ""}</button>
    <p class="tiny muted" style="margin:8px 2px">Cleared items are only hidden, so they can be brought back if needed.</p>
    <div class="lbl">Account</div><div class="small muted" style="margin:0 2px 10px">${esc(session?.email || "")}</div>
    <button class="btn block danger" id="sout">Sign out</button>
    <p class="tiny faint" style="text-align:center;margin-top:12px">My Day · version 17 (rent accounts)</p>`, () => {
    const clear = async (table, list, key, msg) => {
      if (!list.length) { toast("Nothing to clear"); return; }
      const ids = list.map(x => x.id);
      try { await rest("PATCH", `${table}?id=in.(${ids.join(",")})`, { deleted_at: nowIso() }); S[key] = S[key].filter(x => !ids.includes(x.id)); closeSheet(); render();
        toast(msg, async () => { const r = await rest("PATCH", `${table}?id=in.(${ids.join(",")})`, { deleted_at: null }); S[key].push(...r); render(); }); } catch (e) { fail(e); }
    };
    $("#ctodo").onclick = () => clear("myday_todos", doneTodos, "todos", "Finished to-dos cleared");
    $("#cbuy").onclick = () => clear("myday_shopping", bought, "shopping", "Bought items cleared");
    $("#sout").onclick = () => { closeSheet(); signOut(); };
  });
}
function settingsSheet() {
  const st = S.settings, lv = leaveSummary();
  openSheet(`<h2 class="h2" style="margin-bottom:6px">Annual leave</h2>
    <div class="card leave between" style="margin:8px 0 4px"><div><div style="font-size:21px;font-weight:600">${lv.left} days left</div><div class="small muted">${lv.taken} taken${lv.booked ? ` · ${lv.booked} booked` : ""} · ${lv.next} available in ${lv.cy + 1}</div></div>${window.ART.moon(46)}</div>
    <div class="lbl">Book leave</div>
    <div class="field"><label>From</label><input type="date" id="lf" value="${today()}"></div>
    <div class="field"><label>To</label><input type="date" id="lt" value="${today()}"></div>
    <p class="tiny muted" style="margin:-4px 2px 10px" id="lcount"></p>
    <button class="btn primary block" id="lbook">Book leave</button>
    <div class="lbl">Leave allowance</div>
    <div class="field"><label>Days per year</label><input type="number" id="sle" value="${st.leave_entitlement}"></div>
    <div class="field"><label>Days left on start date</label><input type="number" id="slb" value="${st.leave_opening_balance}"></div>
    <div class="field"><label>Start date for counting</label><input type="date" id="sld" value="${st.leave_opening_date}"></div>
    <p class="tiny muted" style="margin:-4px 2px 10px">Unused leave carries over with no limit. Only work days count as leave.</p>
    <button class="btn block" id="ssave">Save allowance</button>`, sh => {
    const workDays = () => { const f = $("#lf").value, t = $("#lt").value, out = []; if (!f || !t || t < f) return out;
      for (let d = f; d <= t; d = addDays(d, 1)) { if (baseKind(d) === "work") out.push(d); if (out.length > 60) break; } return out; };
    const upd = () => { const n = workDays().length; $("#lcount").textContent = n ? `${n} work day${n > 1 ? "s" : ""} will be marked as leave. Weekends and public holidays don't count.` : "No work days in these dates."; };
    $("#lf").onchange = () => { if ($("#lt").value < $("#lf").value) $("#lt").value = $("#lf").value; upd(); }; $("#lt").onchange = upd; upd();
    $("#lbook").onclick = async () => {
      const days = workDays(); if (!days.length) { window.ART.nudge($("#lt")); return; }
      try { for (const d of days) await setDayKind(d, "leave"); closeSheet(); render(); toast(`${days.length} leave day${days.length > 1 ? "s" : ""} booked`); window.ART.confetti(null); } catch (e) { fail(e); }
    };
    $("#ssave").onclick = async () => {
      try { S.settings = (await rest("PATCH", `myday_settings?user_id=eq.${st.user_id}`, { leave_entitlement: Number($("#sle").value), leave_opening_balance: Number($("#slb").value), leave_opening_date: $("#sld").value, leave_opening_year: Number($("#sld").value.slice(0, 4)), updated_at: nowIso() }))[0];
        closeSheet(); render(); toast("Allowance saved"); } catch (e) { fail(e); }
    };
  });
}

/* ---------- start ---------- */
// Keep the app fixed: block pinch-zoom and double-tap zoom (iOS ignores the viewport setting on its own)
["gesturestart", "gesturechange", "gestureend"].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
document.addEventListener("touchmove", e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
// double-tap zoom is turned off in styles.css (touch-action: manipulation)
// refresh "today" when the app comes back to the front on a new day
let lastDay = today();
// keep data fresh: when the app comes back to the front, every minute while open, and on pull-down at the top
let refreshing = false, lastRefresh = Date.now();
function refreshData(showToast) {
  if (!session || !S.loaded || refreshing) return;
  if ($("#page-root .page") || $("#sheet-root .scrim") || document.activeElement?.matches("input,textarea,select")) return; // don't disturb typing
  refreshing = true; lastRefresh = Date.now();
  if (today() !== lastDay) { lastDay = today(); S.planDate = lastDay; }
  loadAll().then(() => { render(); if (showToast) toast("Up to date"); }).catch(() => {}).finally(() => { refreshing = false; });
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshData(); });
window.addEventListener("pageshow", e => { if (e.persisted) refreshData(); });
window.addEventListener("focus", () => { if (Date.now() - lastRefresh > 5000) refreshData(); });
setInterval(() => { if (!document.hidden) refreshData(); }, 60000);
(() => { let y0 = null, pulled = 0; const ind = document.createElement("div"); ind.className = "ptr"; ind.innerHTML = "↓"; document.body.appendChild(ind);
  document.addEventListener("touchstart", e => { y0 = (window.scrollY <= 0 && !$("#page-root .page") && !$("#sheet-root .scrim")) ? e.touches[0].clientY : null; pulled = 0; }, { passive: true });
  document.addEventListener("touchmove", e => { if (y0 === null) return; pulled = Math.max(0, e.touches[0].clientY - y0); ind.style.transform = `translate(-50%, ${Math.min(pulled, 90) - 40}px) rotate(${pulled * 2}deg)`; ind.style.opacity = Math.min(1, pulled / 70); }, { passive: true });
  document.addEventListener("touchend", () => { if (y0 === null) return; if (pulled > 80) refreshData(true); y0 = null; ind.style.transform = ""; ind.style.opacity = 0; }, { passive: true });
})();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
window.MD = Object.assign(window.MD, { openPop, closePage, replay: () => { lastTab = null; }, dayInfo, setDayKind, leaveSummary, $, esc, pad, ymd, parse, addDays, today, fmtShort, relDay, nowIso, I, S, db, rest, render, openSheet, closeSheet, toast, fail, CFG });
window.addEventListener("DOMContentLoaded", render);
})();
