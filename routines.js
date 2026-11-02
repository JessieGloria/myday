/* My Day — Routines: chores that come back every so often (laundry, litter box…), each with a little character whose mood shows how long it's been. */
(() => {
"use strict";
const { $, esc, ymd, parse, addDays, today, fmtShort, relDay, S, db, render, openSheet, closeSheet, toast, fail } = window.MD;

async function loadRoutines() {
  const [r, l] = await Promise.all([
    db.list("myday_routines", "order=sort,created_at"),
    db.list("myday_routine_logs", `date=gte.${addDays(today(), -400)}&order=date.desc,created_at.desc`)
  ]);
  S.routines = r; S.routineLogs = l;
}
window.MD.loaders.push(loadRoutines);

/* ---------- timing ---------- */
const UNIT = { day: ["day", "days"], week: ["week", "weeks"], month: ["month", "months"] };
function addUnits(ds, n, unit) {
  if (unit === "day") return addDays(ds, n);
  if (unit === "week") return addDays(ds, n * 7);
  const d = parse(ds), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return ymd(d);
}
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
function state(r) {
  const base = r.last_done || r.started_on, due = addUnits(base, r.every_n, r.every_unit), t = today();
  const total = Math.max(1, daysBetween(base, due)), left = daysBetween(t, due);
  const f = Math.max(0, Math.min(1, daysBetween(base, t) / total));
  const mood = left < 0 ? "sad" : f >= .6 || left <= 1 ? "meh" : "happy";
  const lastDone = (S.routineLogs || []).find(l => l.routine_id === r.id && l.kind === "done")?.date || null;
  return { base, due, left, f, mood, lastDone };
}
const whenTxt = left => left < 0 ? `${-left} day${left === -1 ? "" : "s"} late` : left === 0 ? "Due today" : left === 1 ? "Tomorrow" : `in ${left} days`;
const everyTxt = r => r.every_n === 1 ? `Every ${UNIT[r.every_unit][0]}` : `Every ${r.every_n} ${UNIT[r.every_unit][1]}`;
const lastTxt = s => { if (!s.lastDone) return "Starting fresh"; const r = relDay(s.lastDone); return `Last done ${/^(Today|Yesterday)$/.test(r) ? r.toLowerCase() : "on " + r}`; };

/* ---------- the characters ---------- */
const CHARS = {
  washer: ["Washing machine", "#C9CBF3"], broom: ["Broom", "#FBE7A6"], cat: ["Cat", "#F6CFCF"], sheets: ["Bedsheet", "#C8DECF"],
  fridge: ["Fridge", "#DCE6F7"], plant: ["Plant", "#C8DECF"], brush: ["Toothbrush", "#C9E7F2"], kettle: ["Kettle", "#F6CFCF"],
  car: ["Car", "#C9CBF3"], sparkle: ["Sparkle", "#FBE7A6"]
};
function face(mood, x, y, s = 1) {
  const ink = "#5A4A3A";
  const eyes = mood === "sad"
    ? `<path d="M${x - 6 * s} ${y - 1 * s} q2 ${2 * s} ${4 * s} 0" stroke="${ink}" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round" transform="rotate(12 ${x - 4 * s} ${y})"/><path d="M${x + 2 * s} ${y - 1 * s} q2 ${2 * s} ${4 * s} 0" stroke="${ink}" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round" transform="rotate(-12 ${x + 4 * s} ${y})"/>`
    : mood === "happy"
      ? `<path d="M${x - 6 * s} ${y} q2 ${-2.6 * s} ${4 * s} 0" stroke="${ink}" stroke-width="${1.5 * s}" fill="none" stroke-linecap="round"/><path d="M${x + 2 * s} ${y} q2 ${-2.6 * s} ${4 * s} 0" stroke="${ink}" stroke-width="${1.5 * s}" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${x - 4 * s}" cy="${y - .5 * s}" r="${1.5 * s}" fill="${ink}"/><circle cx="${x + 4 * s}" cy="${y - .5 * s}" r="${1.5 * s}" fill="${ink}"/>`;
  const mouth = mood === "sad" ? `<path d="M${x - 3 * s} ${y + 6 * s} q3 ${-2.6 * s} ${6 * s} 0" stroke="${ink}" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round"/>`
    : mood === "happy" ? `<path d="M${x - 3.5 * s} ${y + 3.5 * s} q3.5 ${4 * s} ${7 * s} 0" stroke="${ink}" stroke-width="${1.4 * s}" fill="#E8A0A0" stroke-linecap="round"/>`
      : `<path d="M${x - 2.5 * s} ${y + 4.5 * s} q2.5 ${1.6 * s} ${5 * s} 0" stroke="${ink}" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round"/>`;
  const blush = mood === "sad" ? "" : `<circle cx="${x - 8.5 * s}" cy="${y + 3 * s}" r="${2 * s}" fill="#F4A7A7" opacity=".75"/><circle cx="${x + 8.5 * s}" cy="${y + 3 * s}" r="${2 * s}" fill="#F4A7A7" opacity=".75"/>`;
  const tear = mood === "sad" ? `<path d="M${x + 7 * s} ${y + 1 * s} q${1.6 * s} ${2.6 * s} 0 ${4 * s} q${-1.6 * s} ${-1.4 * s} 0 ${-4 * s}z" fill="#9DC4F0"/>` : "";
  return eyes + mouth + blush + tear;
}
function body(kind, c) {
  switch (kind) {
    case "washer": return `<rect x="16" y="14" width="32" height="38" rx="7" fill="#FBF9F5" stroke="${c}" stroke-width="2.5"/><rect x="16" y="14" width="32" height="8" rx="4" fill="${c}"/><circle cx="22" cy="18" r="1.4" fill="#fff"/><circle cx="27" cy="18" r="1.4" fill="#fff"/>
      <circle cx="32" cy="37" r="11" fill="#DCE6F7" stroke="${c}" stroke-width="2"/><path d="M23 39 q4.5 -3 9 0 t9 0" stroke="#9DC4F0" stroke-width="2" fill="none"/>`;
    case "broom": return `<rect x="30" y="6" width="4" height="26" rx="2" fill="#C99A6B"/><path d="M19 30 h26 l4 22 q-17 4 -34 0z" fill="${c}" stroke="#E5B93A" stroke-width="1.5"/><path d="M24 44 v8 M30 45 v8 M36 45 v8 M42 44 v8" stroke="#E5B93A" stroke-width="1.3"/>`;
    case "cat": return `<path d="M14 26 l4 -14 l9 8 h10 l9 -8 l4 14 q2 22 -18 24 q-20 -2 -18 -24z" fill="${c}"/><path d="M18 14 l2 7 l4 -3z M46 14 l-2 7 l-4 -3z" fill="#E8A0A0"/>
      <path d="M12 38 h8 M12 42 h8 M44 38 h8 M44 42 h8" stroke="#C9A0A0" stroke-width="1.1" stroke-linecap="round"/>`;
    case "sheets": return `<rect x="10" y="22" width="44" height="28" rx="8" fill="${c}"/><rect x="14" y="16" width="20" height="12" rx="5" fill="#FBF9F5" stroke="#9CBBA4" stroke-width="1.5"/><path d="M10 40 q22 6 44 0" stroke="#9CBBA4" stroke-width="1.5" fill="none"/>`;
    case "fridge": return `<rect x="18" y="6" width="28" height="48" rx="6" fill="${c}" stroke="#9DB3DA" stroke-width="2"/><path d="M18 24 h28" stroke="#9DB3DA" stroke-width="2"/><rect x="40" y="11" width="2.6" height="8" rx="1.3" fill="#9DB3DA"/><rect x="40" y="28" width="2.6" height="8" rx="1.3" fill="#9DB3DA"/>`;
    case "plant": return `<path d="M32 30 C22 28 18 18 20 12 C28 12 33 20 32 30z" fill="#9CBBA4"/><path d="M32 28 C42 26 46 16 44 10 C36 10 31 18 32 28z" fill="#B9D3C0"/><path d="M18 30 H46 L42 54 Q41 56 38 56 H26 Q23 56 22 54z" fill="#E8B9A0"/>`;
    case "brush": return `<rect x="28" y="22" width="8" height="34" rx="4" fill="${c}" stroke="#8FC3D9" stroke-width="1.5"/><rect x="26" y="6" width="12" height="16" rx="3" fill="#FBF9F5" stroke="#8FC3D9" stroke-width="1.5"/><path d="M29 8 v12 M32 8 v12 M35 8 v12" stroke="#8FC3D9" stroke-width="1.2"/>`;
    case "kettle": return `<path d="M18 52 q-2 -26 14 -30 q16 4 14 30z" fill="${c}"/><rect x="28" y="16" width="8" height="5" rx="2.5" fill="#E8A0A0"/><path d="M46 36 q8 -2 8 -10" stroke="#E8A0A0" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M20 30 q-6 -2 -6 -8" stroke="#E8A0A0" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case "car": return `<path d="M10 42 v-8 q0 -4 4 -5 l6 -9 q2 -3 6 -3 h12 q4 0 6 3 l6 9 q4 1 4 5 v8z" fill="${c}"/><path d="M22 22 h20 l4 7 h-28z" fill="#FBF9F5"/><circle cx="20" cy="44" r="5" fill="#5A5F8F"/><circle cx="44" cy="44" r="5" fill="#5A5F8F"/>`;
    default: return `<path d="M32 8 l5 14 l14 5 l-14 5 l-5 14 l-5 -14 l-14 -5 l14 -5z" fill="${c}" stroke="#E5B93A" stroke-width="1.5"/>`;
  }
}
const FACE_AT = { washer: [32, 37, .75], broom: [32, 38, .8], cat: [32, 32, .95], sheets: [32, 38, .85], fridge: [32, 40, .8], plant: [32, 41, .8], brush: [32, 40, .55], kettle: [32, 40, .85], car: [32, 32, .6], sparkle: [32, 27, .6] };
function character(kind, mood, w = 56) {
  const c = (CHARS[kind] || CHARS.sparkle)[1], [fx, fy, fs] = FACE_AT[kind] || FACE_AT.sparkle;
  const extra = mood === "happy" ? `<path class="tw" d="M54 8 l1.4 3.6 l3.6 1.4 l-3.6 1.4 l-1.4 3.6 l-1.4 -3.6 l-3.6 -1.4 l3.6 -1.4z" fill="#F2C94C"/><path class="tw t2" d="M8 14 l1 2.6 l2.6 1 l-2.6 1 l-1 2.6 l-1 -2.6 l-2.6 -1 l2.6 -1z" fill="#F2C94C"/>`
    : mood === "sad" ? `<g class="cloud"><path d="M44 10 a5 5 0 0 1 9 -2 a4 4 0 0 1 5 5 a3.5 3.5 0 0 1 -1 7 h-12 a4 4 0 0 1 -1 -10z" fill="#C9CEDC"/><path d="M47 22 v3 M51 22 v4 M55 22 v3" stroke="#9DC4F0" stroke-width="1.5" stroke-linecap="round" class="rainl"/></g>` : "";
  return `<svg class="rchar ${mood}" width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true"><g class="rbody">${body(kind, c)}${face(mood, fx, fy, fs)}</g>${extra}</svg>`;
}
window.MD.routineChar = character;

/* ---------- Today: the routines section ---------- */
const sorted = () => (S.routines || []).map(r => ({ r, s: state(r) })).sort((a, b) => a.s.left - b.s.left);
window.MD.routinesDueCount = () => sorted().filter(x => x.s.left <= 1).length;
function viewRoutines() {
  const list = sorted();
  const ring = s => { const C = 2 * Math.PI * 40, rest = 1 - s.f; const col = s.mood === "sad" ? "#E8A0A0" : s.mood === "meh" ? "#F2C94C" : "#9CBBA4";
    return `<svg class="rring" viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="40" class="rtrack"/><circle cx="46" cy="46" r="40" stroke="${col}" stroke-dasharray="${(C * Math.max(rest, s.left < 0 ? 0 : .02)).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 46 46)" class="rfillc"/></svg>`; };
  return `${list.length ? `<div class="rgrid">${list.map(({ r, s }) => `<div class="rbub ${s.mood}" id="rt-${r.id}">
      <button class="rpic" data-rout="${r.id}" aria-label="${esc(r.name)}">${ring(s)}${character(r.character, s.mood, 58)}</button>
      <div class="rname">${esc(r.name)}</div>
      <div class="rwhen ${s.mood}">${whenTxt(s.left)}</div>
      <button class="rdone" data-rdone="${r.id}">Done</button></div>`).join("")}</div>` : `<div class="empty">Add the little jobs that come back, like laundry or changing the litter box.</div>`}
    <button class="addline" id="raddr" style="margin-top:12px">+ Add routine</button>
    <p class="tiny faint" style="text-align:center;margin-top:10px">Tap Done when you've done it. Each one counts again from that day.</p>`;
}
function bindRoutines() {
  document.querySelectorAll("[data-rout]").forEach(b => b.onclick = () => routineSheet(S.routines.find(r => r.id === b.dataset.rout)));
  document.querySelectorAll("[data-rdone]").forEach(b => b.onclick = e => { e.stopPropagation(); markDone(S.routines.find(r => r.id === b.dataset.rdone)); });
  const a = $("#raddr"); if (a) a.onclick = () => routineSheet(null);
}
window.MD.viewRoutines = viewRoutines; window.MD.bindRoutines = bindRoutines;

// "Due soon" on Today: routines due today, tomorrow or late
window.MD.routinesDue = () => sorted().filter(x => x.s.left <= 1).map(({ r, s }) => [s.due, `<div class="item duecard rdue" id="rd-${r.id}"><span class="rdueic">${character(r.character, s.mood, 34)}</span>
  <button class="grow" style="text-align:left" data-rout="${r.id}"><div class="title">${esc(r.name)}</div><div class="tiny muted">${esc(lastTxt(s))}</div></button>
  <span class="pill ${s.left < 0 ? "rose" : "warn"}">${whenTxt(s.left)}</span><button class="btn" style="height:32px;padding:0 12px;margin-left:6px" data-rdone="${r.id}">Done</button></div>`]);
window.MD.bindRoutinesDue = bindRoutines;

async function markDone(r, date = today(), kind = "done") {
  const prev = r.last_done;
  try {
    const log = await db.insert("myday_routine_logs", { routine_id: r.id, date, kind });
    S.routineLogs.unshift(log); S.routineLogs.sort((a, b) => b.date.localeCompare(a.date));
    Object.assign(r, await db.update("myday_routines", r.id, { last_done: date > (prev || "") ? date : prev }));
    if (kind === "done") window.ART.celebrate(`#rt-${r.id} .rpic, #rd-${r.id} .rdueic`, true);
    closeSheet(); render();
    toast(kind === "done" ? `${r.name}: done!` : `${r.name}: skipped this time`, async () => {
      try { await db.remove("myday_routine_logs", log.id); S.routineLogs = S.routineLogs.filter(l => l.id !== log.id);
        Object.assign(r, await db.update("myday_routines", r.id, { last_done: prev })); render(); } catch (e) { fail(e); }
    });
  } catch (e) { fail(e); }
}

/* ---------- add / edit page ---------- */
function routineSheet(r) {
  const isNew = !r;
  const st = { name: r?.name || "", ch: r?.character || "sparkle", n: r?.every_n || 1, unit: r?.every_unit || "week" };
  const s = r ? state(r) : null;
  const logs = r ? S.routineLogs.filter(l => l.routine_id === r.id).slice(0, 8) : [];
  openSheet(`<div class="rhead">${character(st.ch, s ? s.mood : "happy", 76)}<div><h2 class="h2">${isNew ? "New routine" : esc(r.name)}</h2>
      ${s ? `<div class="small muted">${esc(lastTxt(s))} · next ${fmtShort(s.due)}</div>` : `<div class="small muted">Something you do every so often</div>`}</div></div>
    ${r ? `<div class="btnrow" style="margin:14px 0 4px"><button class="btn sun" id="rdn">Done today</button><button class="btn" id="rskip">Skip this time</button></div>` : ""}
    <div class="field" style="margin-top:14px"><label>Name</label><input type="text" id="rnm" value="${esc(st.name)}" placeholder="Water the plants"></div>
    <div class="field"><label>Character</label><div class="rpick">${Object.entries(CHARS).map(([k, [lab]]) => `<button type="button" data-rch="${k}" class="${k === st.ch ? "on" : ""}" aria-label="${lab}">${character(k, "happy", 40)}</button>`).join("")}</div></div>
    <div class="field"><label>How often</label><div class="row" style="gap:8px"><span class="small">Every</span><input type="number" id="rn" min="1" max="365" value="${st.n}" style="width:70px">
      <div class="paint" style="margin:0">${["day", "week", "month"].map(u => `<button type="button" data-run="${u}" class="${u === st.unit ? "on" : ""}">${u}s</button>`).join("")}</div></div></div>
    <div class="field"><label>Last done</label><input type="date" id="rld" value="${r?.last_done || ""}" max="${today()}"><div class="tiny muted" style="margin-top:4px">Leave empty to start fresh from today.</div></div>
    ${logs.length ? `<div class="lbl">History</div><div class="list">${logs.map(l => `<div class="item"><div class="grow">${fmtShort(l.date)}</div><span class="pill ${l.kind === "skip" ? "" : "sage"}">${l.kind === "skip" ? "Skipped" : "Done"}</span></div>`).join("")}</div>` : ""}
    <div class="err" id="rerr"></div>
    <button class="btn primary block" id="usave" style="margin-top:12px">Save</button>
    ${r ? '<button class="btn danger block" id="rdel" style="margin-top:8px">Delete routine</button>' : ""}`, sh => {
    sh.querySelectorAll("[data-rch]").forEach(b => b.onclick = () => { st.ch = b.dataset.rch; sh.querySelectorAll("[data-rch]").forEach(x => x.classList.toggle("on", x === b));
      const h = sh.querySelector(".rhead svg"); if (h) h.outerHTML = character(st.ch, s ? s.mood : "happy", 76); });
    sh.querySelectorAll("[data-run]").forEach(b => b.onclick = () => { st.unit = b.dataset.run; sh.querySelectorAll("[data-run]").forEach(x => x.classList.toggle("on", x === b)); });
    if (r) { $("#rdn").onclick = () => markDone(r); $("#rskip").onclick = () => markDone(r, today(), "skip"); }
    $("#usave").onclick = async () => {
      const name = $("#rnm").value.trim(); if (!name) { window.ART.nudge($("#rnm"), "Give it a name"); return; }
      const ld = $("#rld").value || null, o = { name, character: st.ch, every_n: Math.max(1, Math.min(365, Number($("#rn").value) || 1)), every_unit: st.unit, last_done: ld };
      try {
        if (isNew) {
          const row = await db.insert("myday_routines", { ...o, started_on: today(), sort: (S.routines || []).length });
          S.routines.push(row);
          if (ld) S.routineLogs.unshift(await db.insert("myday_routine_logs", { routine_id: row.id, date: ld, kind: "done" }));
          window.ART.celebrate(`#rt-${row.id} .rpic`, true);
        } else {
          if (ld && ld !== r.last_done && !S.routineLogs.some(l => l.routine_id === r.id && l.date === ld)) S.routineLogs.unshift(await db.insert("myday_routine_logs", { routine_id: r.id, date: ld, kind: "done" }));
          Object.assign(r, await db.update("myday_routines", r.id, o));
        }
        S.routineLogs.sort((a, b) => b.date.localeCompare(a.date));
        closeSheet(); S.tab = "today"; S.todayView = "routines"; render(); toast(isNew ? "Routine added" : "Saved");
      } catch (e) { fail(e); }
    };
    const d = $("#rdel"); if (d) d.onclick = async () => {
      try { await db.remove("myday_routines", r.id); S.routines = S.routines.filter(x => x.id !== r.id); closeSheet(); render();
        toast("Routine deleted", async () => { S.routines.push(await db.restore("myday_routines", r.id)); render(); }); } catch (e) { fail(e); }
    };
  });
}
})();
