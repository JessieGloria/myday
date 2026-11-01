/* My Day — Learn (step 3): small topics each week, notes, study timer, weekly streak. */
(() => {
"use strict";
const { $, esc, ymd, parse, addDays, today, nowIso, I, S, db, render, openSheet, closeSheet, toast, fail } = window.MD;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekOf = ds => { const d = parse(ds), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return ymd(d); };
const wkLabel = ws => { const a = parse(ws), b = parse(addDays(ws, 6)); return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MON[a.getMonth()]}` : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`; };
const hm = m => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + "m" : ""}`.trim() : `${m}m`;
S.learnWeek = S.learnWeek || weekOf(today());
const TKEY = "myday.timer";
const getTimer = () => { try { return JSON.parse(localStorage.getItem(TKEY) || "null"); } catch (e) { return null; } };
const setTimer = v => { try { v ? localStorage.setItem(TKEY, JSON.stringify(v)) : localStorage.removeItem(TKEY); } catch (e) {} };

async function loadLearn() { S.topics = await db.list("myday_topics", "order=week_start.desc,created_at"); }
window.MD.loaders.push(loadLearn);

function streak() {
  const thisWk = weekOf(today());
  const complete = ws => { const t = S.topics.filter(x => x.week_start === ws); return t.length && t.every(x => x.done_at); };
  let ws = complete(thisWk) ? thisWk : addDays(thisWk, -7), n = 0;
  while (complete(ws)) { n++; ws = addDays(ws, -7); }
  return n;
}
window.MD.learnStats = () => { const wk = weekOf(today()), t = (S.topics || []).filter(x => x.week_start === wk); return { total: t.length, done: t.filter(x => x.done_at).length }; };
window.MD.weekOf = weekOf;

function viewLearn() {
  const ws = S.learnWeek, thisWk = weekOf(today()), list = S.topics.filter(t => t.week_start === ws);
  const done = list.filter(t => t.done_at).length, mins = list.reduce((s, t) => s + (t.minutes || 0), 0);
  const allDone = S.topics.filter(t => t.done_at).length, timer = getTimer();
  const pct = list.length ? done / list.length : 0;
  const carry = ws === thisWk ? S.topics.filter(t => !t.done_at && t.week_start < thisWk) : [];
  const running = timer && S.topics.find(t => t.id === timer.id);
  return `<div class="top"><div><h1 class="h1">Learn</h1><div class="small muted serif" style="font-size:14px">a little every week</div></div><div class="row">${window.ART.book(62)}</div></div>
  ${running ? `<div class="card status st-oncall" style="margin-bottom:12px"><div class="ic">${I.plan}</div><div class="grow" style="flex:1"><div class="h2">Studying ${esc(running.title)}</div><div class="small muted" id="tclock">started ${new Date(timer.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div></div><button class="btn sun" id="tstop">Stop</button></div>` : ""}
  <div class="card leave between">
    <div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">${ws === thisWk ? "THIS WEEK" : wkLabel(ws).toUpperCase()}</div>
      <div style="font-size:24px;font-weight:500">${done} of ${list.length} <span style="font-size:14px;font-weight:400">topics</span></div>
      <div class="small muted">${mins ? hm(mins) + " studied · " : ""}${streak()} week streak · ${allDone} learned in total</div></div>
    <svg width="58" height="58" aria-hidden="true"><circle cx="29" cy="29" r="23" fill="none" stroke="#3E4480" stroke-width="7"/><circle class="ringfill" cx="29" cy="29" r="23" fill="none" stroke="#F6D86B" stroke-width="7" stroke-linecap="round" stroke-dasharray="${pct * 144.5} 145" transform="rotate(-90 29 29)"/></svg></div>
  <div class="between" style="margin:14px 0 6px"><button class="iconbtn" id="lprev" aria-label="Previous week">${I.left}</button><div class="h2" style="font-size:14px">${ws === thisWk ? "This week" : ws === addDays(thisWk, 7) ? "Next week" : ws === addDays(thisWk, -7) ? "Last week" : ""} <span class="muted" style="font-weight:400">${wkLabel(ws)}</span></div><button class="iconbtn" id="lnext" aria-label="Next week">${I.right}</button></div>
  <form class="addbar" id="ladd"><input type="text" id="lin" placeholder="Add a topic for this week" autocomplete="off"><button class="btn sun" type="submit">Add</button></form>
  ${list.length ? `<div class="list">${list.map(t => `<div class="item ${t.done_at ? "done" : ""}"><button class="chk" data-lchk="${t.id}" aria-label="Done">${t.done_at ? I.check : ""}</button>
      <button class="grow" style="text-align:left" data-topic="${t.id}"><div class="title">${esc(t.title)}</div><div class="tiny muted">${[t.minutes ? hm(t.minutes) : "", t.notes ? "has notes" : "", t.link ? "link" : ""].filter(Boolean).join(" · ") || "tap to add notes"}</div></button>
      ${t.done_at || (timer && timer.id === t.id) ? "" : `<button class="small" style="color:var(--peri)" data-lstart="${t.id}">Start</button>`}</div>`).join("")}</div>` : '<div class="empty">Pick one or two small topics to learn this week.</div>'}
  ${carry.length ? `<div class="lbl">Not finished from earlier weeks</div><div class="list">${carry.map(t => `<div class="item"><div class="grow"><div class="title">${esc(t.title)}</div><div class="tiny muted">${wkLabel(t.week_start)}</div></div><button class="small" style="color:var(--peri)" data-lmove="${t.id}">Move here</button></div>`).join("")}</div>` : ""}
  ${pastWeeks(ws)}`;
}
function pastWeeks(ws) {
  const weeks = [...new Set(S.topics.map(t => t.week_start))].filter(w => w < ws).slice(0, 6);
  if (!weeks.length) return "";
  return `<div class="lbl">Earlier weeks</div><div class="list">${weeks.map(w => { const t = S.topics.filter(x => x.week_start === w), d = t.filter(x => x.done_at).length;
    return `<button class="item" style="width:100%;text-align:left" data-lweek="${w}"><div class="grow"><div class="title">${wkLabel(w)}</div><div class="tiny muted">${t.map(x => esc(x.title)).join(", ")}</div></div><span class="pill ${d === t.length ? "sage" : ""}">${d}/${t.length}</span></button>`; }).join("")}</div>`;
}
let clockT;
function bindLearn() {
  const mv = n => { S.learnWeek = addDays(S.learnWeek, 7 * n); render(); };
  $("#lprev").onclick = () => mv(-1); $("#lnext").onclick = () => mv(1);
  $("#ladd").onsubmit = async e => { e.preventDefault(); const v = $("#lin").value.trim(); if (!v) { window.ART.nudge($("#lin"), "Type a topic, then tap Add"); return; }
    try { S.topics.push(await db.insert("myday_topics", { title: v, week_start: S.learnWeek })); render(); $("#lin").focus(); } catch (er) { fail(er); } };
  document.querySelectorAll("[data-lchk]").forEach(b => b.onclick = async () => { const t = S.topics.find(x => x.id === b.dataset.lchk);
    try { if (!t.done_at && getTimer()?.id === t.id) await stopTimer(); Object.assign(t, await db.update("myday_topics", t.id, { done_at: t.done_at ? null : nowIso() })); if (t.done_at) window.ART.celebrate(`[data-lchk="${t.id}"]`, true); render(); if (t.done_at) toast("Nice, one more learned"); } catch (e) { fail(e); } });
  document.querySelectorAll("[data-topic]").forEach(b => b.onclick = () => topicSheet(S.topics.find(x => x.id === b.dataset.topic)));
  document.querySelectorAll("[data-lstart]").forEach(b => b.onclick = async () => { if (getTimer()) await stopTimer(); setTimer({ id: b.dataset.lstart, start: Date.now() }); render(); });
  document.querySelectorAll("[data-lmove]").forEach(b => b.onclick = async () => { const t = S.topics.find(x => x.id === b.dataset.lmove);
    try { Object.assign(t, await db.update("myday_topics", t.id, { week_start: S.learnWeek })); render(); } catch (e) { fail(e); } });
  document.querySelectorAll("[data-lweek]").forEach(b => b.onclick = () => { S.learnWeek = b.dataset.lweek; render(); window.scrollTo(0, 0); });
  const st = $("#tstop"); if (st) st.onclick = () => stopTimer().then(render);
  clearInterval(clockT);
  const tm = getTimer(); if (tm && $("#tclock")) { const tick = () => { const el = $("#tclock"); if (!el) return clearInterval(clockT); const m = Math.floor((Date.now() - tm.start) / 60000); el.textContent = `${hm(m)} so far`; }; tick(); clockT = setInterval(tick, 20000); }
}
async function stopTimer() {
  const tm = getTimer(); if (!tm) return; setTimer(null);
  const t = S.topics.find(x => x.id === tm.id); if (!t) return;
  const add = Math.max(1, Math.round((Date.now() - tm.start) / 60000));
  try { Object.assign(t, await db.update("myday_topics", t.id, { minutes: (t.minutes || 0) + add })); toast(`Added ${hm(add)} to ${t.title}`); } catch (e) { fail(e); }
}
function topicSheet(t) {
  openSheet(`<h2 class="h2" style="margin-bottom:14px">Topic</h2>
    <div class="field"><label>Topic</label><input type="text" id="tt2" value="${esc(t.title)}"></div>
    <div class="field"><label>Notes</label><textarea id="tn2" rows="7" placeholder="What you learned, key points, questions">${esc(t.notes || "")}</textarea></div>
    <div class="field"><label>Link (optional)</label><input type="url" id="tl2" value="${esc(t.link || "")}" placeholder="https://"></div>
    ${t.link ? `<a class="addline" href="${esc(t.link)}" target="_blank" rel="noopener">Open link</a>` : ""}
    <div class="field"><label>Minutes studied</label><input type="number" id="tm2" value="${t.minutes || 0}" min="0"></div>
    <div class="field"><label>Week</label><input type="date" id="tw2" value="${t.week_start}"></div>
    <button class="btn primary block" id="ts2">Save</button>
    <button class="btn danger block" id="td2" style="margin-top:8px">Delete</button>`, () => {
    $("#ts2").onclick = async () => {
      const o = { title: $("#tt2").value.trim() || t.title, notes: $("#tn2").value.trim() || null, link: $("#tl2").value.trim() || null, minutes: Math.max(0, Number($("#tm2").value) || 0), week_start: weekOf($("#tw2").value || t.week_start) };
      try { Object.assign(t, await db.update("myday_topics", t.id, o)); closeSheet(); render(); toast("Saved"); } catch (e) { fail(e); }
    };
    $("#td2").onclick = async () => { try { await db.remove("myday_topics", t.id); S.topics = S.topics.filter(x => x.id !== t.id); closeSheet(); render();
      toast("Topic deleted", async () => { S.topics.push(await db.restore("myday_topics", t.id)); render(); }); } catch (e) { fail(e); } };
  });
}
function topicQuickAdd() {
  openSheet(`<h2 class="h2" style="margin-bottom:14px">Add a topic</h2><div class="field"><label>Topic for this week</label><input type="text" id="qtopic" placeholder="Airway management basics"></div><button class="btn primary block" id="qts">Add</button>`, () => {
    $("#qtopic").focus();
    $("#qts").onclick = async () => { const v = $("#qtopic").value.trim(); if (!v) return;
      try { S.topics.push(await db.insert("myday_topics", { title: v, week_start: weekOf(today()) })); closeSheet(); S.tab = "learn"; S.learnWeek = weekOf(today()); render(); toast("Topic added"); } catch (e) { fail(e); } };
  });
}
window.MD.topicQuickAdd = topicQuickAdd;
window.MD.views.learn = viewLearn;
window.MD.binds.learn = bindLearn;
})();
