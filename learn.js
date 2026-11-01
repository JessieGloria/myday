/* My Day — Learn: a little study garden. Each topic is a plant that grows as you learn it. */
(() => {
"use strict";
const { $, esc, ymd, parse, addDays, today, nowIso, I, S, db, render, openSheet, closeSheet, toast, fail } = window.MD;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD1 = ["M", "T", "W", "T", "F", "S", "S"];
const STAGES = [
  ["Seed", "Just planted"], ["Sprout", "Getting started"], ["Leafy", "Getting the hang of it"], ["Budding", "Almost there"], ["Bloom", "Learned"]
];
const PETALS = ["#E8A0A0", "#C9CBF3", "#F6D86B", "#F4B6D2", "#9DD3C0"];
const hm = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? " " + (m % 60) + "m" : ""}` : `${m}m`;
const fmtD = s => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const weekOf = ds => { const d = parse(ds), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return ymd(d); };
const TKEY = "myday.timer";
const getTimer = () => { try { return JSON.parse(localStorage.getItem(TKEY) || "null"); } catch (e) { return null; } };
const setTimer = v => { try { v ? localStorage.setItem(TKEY, JSON.stringify(v)) : localStorage.removeItem(TKEY); } catch (e) {} };

async function loadLearn() {
  const [topics, sessions, subs, books, blogs] = await Promise.all([
    db.list("myday_topics", "order=created_at"),
    db.list("myday_study_sessions", "order=date.desc,created_at.desc"),
    db.list("myday_subtopics", "order=sort,created_at"),
    db.list("myday_books", "order=created_at"),
    db.list("myday_book_logs", "order=date.desc,created_at.desc")
  ]);
  S.topics = topics; S.sessions = sessions; S.subs = subs; S.books = books; S.bookLogs = blogs;
}
window.MD.loaders.push(loadLearn);

const colorOf = t => PETALS[[...t.id].reduce((s, c) => s + c.charCodeAt(0), 0) % PETALS.length];
const minsOf = t => S.sessions.filter(x => x.topic_id === t.id).reduce((s, x) => s + x.minutes, 0) + (t.minutes || 0);
const subsOf = t => S.subs.filter(x => x.topic_id === t.id);
function stageOf(t) {
  const sb = subsOf(t); if (!sb.length) return t.stage;
  const f = sb.filter(x => x.done_at).length / sb.length;
  return f >= 1 ? 4 : f >= .75 ? 3 : f >= .4 ? 2 : f > 0 ? 1 : 0;
}
async function syncStage(t) {
  const ns = stageOf(t); if (ns === t.stage) return 0;
  const was = t.stage;
  Object.assign(t, await db.update("myday_topics", t.id, { stage: ns, done_at: ns === 4 ? (t.done_at || nowIso()) : null }));
  return ns - was;
}
const liveSessions = () => S.sessions.filter(x => S.topics.some(t => t.id === x.topic_id));
const studiedDays = () => new Set(liveSessions().map(x => x.date));
function streak() {
  const days = studiedDays(); let d = today(), n = 0;
  if (!days.has(d)) d = addDays(d, -1);
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
window.MD.studyMinutesIn = m => (S.sessions || []).filter(x => (S.topics || []).some(t => t.id === x.topic_id)).filter(x => x.date.startsWith(m)).reduce((s, x) => s + x.minutes, 0);

/* ---------- the plant drawings: seed → sprout → leafy → budding → bloom ---------- */
function plant(stage, petal = "#E8A0A0", w = 64, still = false) {
  const leaf = (d, f) => `<path d="${d}" fill="${f}"/>`;
  let top = "";
  if (stage === 0) top = `<ellipse cx="32" cy="41" rx="4" ry="3" fill="#B08968"/><path d="M32 38 q1 -3 3 -4" stroke="#7FA38A" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  if (stage >= 1) top += `<path d="M32 44 V${stage === 1 ? 34 : stage === 2 ? 26 : 20}" stroke="#6E937A" stroke-width="2.2" stroke-linecap="round"/>`;
  if (stage === 1) top += leaf("M32 36 C26 36 23 32 23 29 C28 29 31 32 32 36Z", "#9CBBA4") + leaf("M32 36 C38 36 41 32 41 29 C36 29 33 32 32 36Z", "#7FA38A");
  if (stage >= 2) top += leaf("M32 38 C24 38 20 33 20 29 C27 29 31 33 32 38Z", "#9CBBA4") + leaf("M32 38 C40 38 44 33 44 29 C37 29 33 33 32 38Z", "#7FA38A")
    + leaf("M32 30 C26 30 23 26 23 23 C28 23 31 26 32 30Z", "#7FA38A") + leaf("M32 30 C38 30 41 26 41 23 C36 23 33 26 32 30Z", "#9CBBA4");
  if (stage === 3) top += `<path d="M32 21 C28 18 29 12 32 10 C35 12 36 18 32 21Z" fill="${petal}"/><path d="M29 20 q3 3 6 0" fill="#7FA38A"/>`;
  if (stage === 4) top += `<g class="${still ? "" : "a-bloom"}" style="transform-origin:32px 15px">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="32" cy="9" rx="4.6" ry="6" fill="${petal}" transform="rotate(${a} 32 15)"/>`).join("")}<circle cx="32" cy="15" r="4" fill="#F6D86B"/></g>`;
  return `<svg width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true">
    <g class="${still ? "" : "a-sway"}" style="transform-origin:32px 44px">${top}</g>
    <path d="M18 43 h28 l-3 17 h-22z" fill="#F3E6D6" stroke="#E3D3BF" stroke-width="1.2"/><rect x="16" y="41" width="32" height="5" rx="2.5" fill="#EADBC8"/>
    <circle cx="28" cy="51" r="1.2" fill="#5A4A3A"/><circle cx="36" cy="51" r="1.2" fill="#5A4A3A"/><path d="M30 54 q2 1.8 4 0" stroke="#5A4A3A" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <circle cx="25" cy="54" r="1.5" fill="#F4A7A7" opacity=".7"/><circle cx="39" cy="54" r="1.5" fill="#F4A7A7" opacity=".7"/></svg>`;
}
const leaves = st => `<span class="leaves">${[1, 2, 3, 4].map(i => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</span>`;
const drop = () => `<svg width="14" height="16" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 2 C10 2 3 11 3 15.5 A7 7 0 0 0 17 15.5 C17 11 10 2 10 2Z" fill="#9DC4F0"/></svg>`;

/* ---------- view ---------- */
function viewLearn() {
  if (S.learnView === "books") return learnHeader() + viewBooks();
  const timer = getTimer(), running = timer && S.topics.find(t => t.id === timer.id);
  const growing = S.topics.filter(t => stageOf(t) < 4), garden = S.topics.filter(t => stageOf(t) >= 4);
  const wk = weekOf(today()), days = studiedDays();
  const weekMins = liveSessions().filter(x => x.date >= wk).reduce((s, x) => s + x.minutes, 0);
  const st = streak();
  return `${learnHeader()}
  ${running ? `<div class="card status st-oncall" style="margin-bottom:12px"><div style="flex:none">${plant(stageOf(running), colorOf(running), 44)}</div><div style="flex:1;min-width:0"><div class="h2">Studying ${esc(running.title)}</div><div class="small muted" id="tclock">just started</div></div><button class="btn sun" id="tstop">Done</button></div>` : ""}
  <div class="card leave">
    <div class="between"><div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">STUDY STREAK</div>
      <div style="font-size:25px;font-weight:700;font-family:Nunito,Inter,sans-serif">${st} day${st === 1 ? "" : "s"} <span style="font-size:12px;font-weight:400;color:var(--navytext)">${st ? "in a row" : "· study today to start"}</span></div></div>
      <div style="text-align:right"><div style="font-size:17px;font-weight:600">${hm(weekMins)}</div><div class="tiny muted">this week</div></div></div>
    <div class="weekdrops">${WD1.map((l, i) => { const d = addDays(wk, i), on = days.has(d), isT = d === today();
      return `<div class="${on ? "on" : ""} ${isT ? "today" : ""}"><svg viewBox="0 0 20 24" width="20" height="24" aria-hidden="true"><path d="M10 2 C10 2 3 11 3 15.5 A7 7 0 0 0 17 15.5 C17 11 10 2 10 2Z" fill="${on ? "#9DC4F0" : "none"}" stroke="${on ? "#9DC4F0" : "#5A5F9A"}" stroke-width="1.6"/></svg><span>${l}</span></div>`; }).join("")}</div>
  </div>
  <form class="addbar" id="ladd" style="margin-top:14px"><input type="text" id="lin" placeholder="Plant a main topic" autocomplete="off"><button class="btn sun" type="submit">Plant</button></form>
  ${growing.length ? `<div class="lbl">Growing</div>${growing.map(t => topicCard(t, timer)).join("")}` : `<div class="empty">Plant a topic you'd like to learn. Log your study time and watch it grow.</div>`}
  ${garden.length ? `<div class="lbl">Your garden · ${garden.length} learned</div><div class="garden">${garden.map(t => `<button data-topic="${t.id}">${plant(4, colorOf(t), 54, true)}<span>${esc(t.title)}</span></button>`).join("")}</div>` : ""}`;
}
function topicCard(t, timer) {
  const st = stageOf(t), sb = subsOf(t), done = sb.filter(x => x.done_at).length;
  const mins = minsOf(t), last = S.sessions.find(x => x.topic_id === t.id);
  const sub = [STAGES[st][0], sb.length ? `${done} of ${sb.length} subtopics` : "", mins ? hm(mins) : "", last ? "last " + (last.date === today() ? "today" : fmtD(last.date)) : "", t.target_date ? "aim " + fmtD(t.target_date) : ""].filter(Boolean).join(" · ");
  return `<div class="card topic" id="tc-${t.id}">
    <button class="topic-main" data-topic="${t.id}"><div class="pot">${plant(st, colorOf(t), 62)}</div>
      <div style="flex:1;min-width:0"><div class="h2" style="font-size:14px">${esc(t.title)}</div><div class="tiny muted">${sub}</div>
      ${sb.length ? `<div class="bar" style="margin-top:7px"><i style="width:${done / sb.length * 100}%;background:var(--sage)"></i></div>` : leaves(st)}</div></button>
    <div class="subs">${sb.map(x => `<button class="subrow ${x.done_at ? "done" : ""}" data-sub="${x.id}"><span class="leafchk">${x.done_at ? '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M3 17 C3 8 9 3 17 3 C17 11 12 17 3 17Z" fill="#7FA38A"/><path d="M6 14 L14 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M3 17 C3 8 9 3 17 3 C17 11 12 17 3 17Z" fill="none" stroke="#C9CBF3" stroke-width="1.6"/></svg>'}</span><span class="title">${esc(x.title)}</span></button>`).join("")}
      <form class="subadd" data-subadd="${t.id}"><input type="text" placeholder="${sb.length ? "+ Add a subtopic" : "+ Add subtopics to grow this plant"}" autocomplete="off"><button class="btn" type="submit" aria-label="Add subtopic">Add</button></form></div>
    <div class="topic-acts">
      <button class="btn" data-water="${t.id}">${drop()} Log study</button>
      ${timer && timer.id === t.id ? `<button class="btn" disabled style="opacity:.6">Timing…</button>` : `<button class="btn" data-lstart="${t.id}">${I.plan.replace("<svg", '<svg width="15" height="15"')} Timer</button>`}
      ${sb.length ? "" : `<button class="btn sun" data-grow="${t.id}">${st === 3 ? "Bloom" : "Grow"} ↑</button>`}
    </div></div>`;
}

function learnHeader() {
  return `<div class="top"><div><h1 class="h1">Learn</h1><div class="small muted serif" style="font-size:13px">${S.learnView === "books" ? "your reading shelf" : "your little study garden"}</div></div><div class="row">${window.ART.book(62)}</div></div>
  <div class="seg" style="margin-top:0">${[["topics", "Topics"], ["books", "Books"]].map(([k, l]) => `<button data-lv="${k}" class="${(S.learnView || "topics") === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
}

/* ---------- books ---------- */
const BCOL = { lavender: ["#C9CBF3", "#8E92E0"], sage: ["#C8DECF", "#7FA38A"], sun: ["#FBE7A6", "#E5B93A"], rose: ["#F6CFCF", "#E8A0A0"], navy: ["#B9BCE6", "#2B3060"] };
function bookArt(color, pct, w = 62) {
  const [lite, deep] = BCOL[color] || BCOL.lavender, h = Math.round(w * 1.15);
  const ribbon = 8 + Math.max(0, Math.min(1, pct)) * 40;
  return `<svg width="${w}" height="${h}" viewBox="0 0 56 64" aria-hidden="true">
    <rect x="10" y="6" width="38" height="52" rx="4" fill="#FBF9F5" stroke="#E3D3BF" stroke-width="1.2"/>
    <rect x="7" y="4" width="38" height="52" rx="5" fill="${lite}"/><rect x="7" y="4" width="7" height="52" rx="3" fill="${deep}"/>
    <rect x="19" y="13" width="20" height="3" rx="1.5" fill="#fff" opacity=".8"/><rect x="21" y="19" width="16" height="2.4" rx="1.2" fill="#fff" opacity=".6"/>
    <circle cx="24" cy="34" r="1.3" fill="#5A4A3A"/><circle cx="33" cy="34" r="1.3" fill="#5A4A3A"/><path d="M26 37.5 q2.5 2.2 5 0" stroke="#5A4A3A" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <circle cx="21" cy="37" r="1.6" fill="#F4A7A7" opacity=".7"/><circle cx="36" cy="37" r="1.6" fill="#F4A7A7" opacity=".7"/>
    <path class="ribbon" d="M40 2 h5 v${ribbon} l-2.5 -3 l-2.5 3z" fill="#E8A0A0"/></svg>`;
}
const pagesIn = (from, to) => S.bookLogs.filter(l => l.date >= from && l.date <= to).reduce((s, l) => s + Math.max(0, l.to_page - l.from_page), 0);
function viewBooks() {
  const reading = S.books.filter(b => !b.finished_at), done = S.books.filter(b => b.finished_at);
  const wk = weekOf(today()), yr = today().slice(0, 4);
  const weekPages = pagesIn(wk, today()), finishedYr = done.filter(b => b.finished_at.startsWith(yr)).length;
  const card = b => { const p = b.total_pages ? b.current_page / b.total_pages : 0, last = S.bookLogs.find(l => l.book_id === b.id);
    return `<div class="card bookcard" id="bk-${b.id}"><button class="topic-main" data-book="${b.id}"><div class="bookbox">${bookArt(b.color, p)}</div>
      <div style="flex:1;min-width:0"><div class="h2" style="font-size:14px">${esc(b.title)}</div>${b.author ? `<div class="tiny muted">${esc(b.author)}</div>` : ""}
        <div style="font-size:16px;font-weight:700;font-family:Nunito,Inter,sans-serif;margin-top:4px">Page ${b.current_page}${b.total_pages ? ` <span class="small muted" style="font-weight:400">of ${b.total_pages}</span>` : ""}</div>
        ${b.total_pages ? `<div class="bar" style="margin-top:5px"><i style="width:${p * 100}%;background:${(BCOL[b.color] || BCOL.lavender)[1]}"></i></div><div class="tiny muted" style="margin-top:3px">${Math.floor(p * 100)}% · ${b.total_pages - b.current_page} pages to go${last ? " · read " + (last.date === today() ? "today" : fmtD(last.date)) : ""}</div>` : ""}</div></button>
      <div class="topic-acts"><button class="btn sun" data-page="${b.id}">Update page</button><button class="btn" data-finish="${b.id}">Finished it</button></div></div>`; };
  return `<div class="card leave between"><div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">READING</div>
      <div style="font-size:23px;font-weight:700;font-family:Nunito,Inter,sans-serif">${weekPages} <span style="font-size:12px;font-weight:400;color:var(--navytext)">pages this week</span></div>
      <div class="small muted">${finishedYr} book${finishedYr === 1 ? "" : "s"} finished in ${yr}</div></div>${bookArt("rose", .6, 46)}</div>
    <button class="btn block" id="addbook" style="margin-top:14px">+ Add a book</button>
    ${reading.length ? `<div class="lbl">Reading now</div>${reading.map(card).join("")}` : '<div class="empty">Add a book you\'re reading and keep track of your page.</div>'}
    ${done.length ? `<div class="lbl">Finished shelf · ${done.length}</div><div class="shelf">${done.map((b, i) => { const [lite, deep] = BCOL[b.color] || BCOL.lavender;
      return `<button class="spine" data-book="${b.id}" style="background:${i % 2 ? lite : deep};height:${70 + (b.title.length * 7) % 30}px"><span>${esc(b.title)}</span></button>`; }).join("")}</div>` : ""}`;
}
function bindBooks() {
  $("#addbook").onclick = () => bookSheet(null);
  document.querySelectorAll("[data-book]").forEach(b => b.onclick = () => bookSheet(S.books.find(x => x.id === b.dataset.book)));
  document.querySelectorAll("[data-page]").forEach(b => b.onclick = () => pageSheet(S.books.find(x => x.id === b.dataset.page)));
  document.querySelectorAll("[data-finish]").forEach(b => b.onclick = () => { const bk = S.books.find(x => x.id === b.dataset.finish); setPage(bk, bk.total_pages || bk.current_page, true); });
}
async function setPage(b, page, finish = false) {
  const from = b.current_page; page = Math.max(0, Math.round(page));
  if (b.total_pages) page = Math.min(page, b.total_pages);
  const done = finish || (b.total_pages && page >= b.total_pages);
  try {
    if (page > from) S.bookLogs.unshift(await db.insert("myday_book_logs", { book_id: b.id, date: today(), from_page: from, to_page: page }));
    Object.assign(b, await db.update("myday_books", b.id, { current_page: page, started_at: b.started_at || today(), finished_at: done ? today() : null }));
    closeSheet();
    if (done) { window.MD.replay(); render(); window.ART.confetti(null, 34); toast(`You finished ${b.title}!`); }
    else { window.ART.celebrate(`#bk-${b.id} .bookbox`, page > from); render(); if (page > from) toast(`${page - from} pages read`); }
  } catch (e) { fail(e); }
}
function pageSheet(b) {
  window.MD.openPop(`<div class="row" style="gap:12px">${bookArt(b.color, b.total_pages ? b.current_page / b.total_pages : 0, 48)}<div><h2 class="h2">Which page are you on?</h2><div class="small muted">${esc(b.title)}</div></div></div>
    <div class="field" style="margin-top:14px"><label>Page${b.total_pages ? ` (of ${b.total_pages})` : ""}</label><input type="number" inputmode="numeric" id="pg" value="${b.current_page || ""}" placeholder="0"></div>
    ${b.total_pages ? `<input type="range" id="pgr" min="0" max="${b.total_pages}" value="${b.current_page}" style="width:100%;accent-color:#8E92E0;margin:2px 0 12px">` : ""}
    <div class="paint" style="margin:0 0 12px">${[5, 10, 20, 50].map(n => `<button data-plus="${n}">+${n}</button>`).join("")}</div>
    <button class="btn primary block" id="pgsave">Save</button>`, () => {
    const inp = $("#pg"), rng = $("#pgr");
    if (rng) { rng.oninput = () => { inp.value = rng.value; }; inp.oninput = () => { rng.value = inp.value; }; }
    document.querySelectorAll("[data-plus]").forEach(x => x.onclick = () => { inp.value = (Number(inp.value) || b.current_page) + Number(x.dataset.plus); if (rng) rng.value = inp.value; });
    $("#pgsave").onclick = () => { const v = Number(inp.value); if (!(v >= 0)) { window.ART.nudge(inp); return; } setPage(b, v); };
    inp.focus();
  });
}
function bookSheet(b) {
  const isNew = !b; b = b || { title: "", author: "", total_pages: "", current_page: 0, color: "lavender" };
  let color = b.color;
  const logs = isNew ? [] : S.bookLogs.filter(l => l.book_id === b.id).slice(0, 8);
  const sw = [["lavender", "var(--lav2)"], ["sage", "var(--sage)"], ["sun", "var(--sun)"], ["rose", "var(--rose)"], ["navy", "var(--navy)"]];
  openSheet(`<h2 class="h2" style="margin-bottom:14px">${isNew ? "Add a book" : esc(b.title)}</h2>
    <div class="field"><label>Title</label><input type="text" id="bt" value="${esc(b.title)}" placeholder="Atomic Habits"></div>
    <div class="field"><label>Author (optional)</label><input type="text" id="ba2" value="${esc(b.author || "")}"></div>
    <div class="field"><label>Total pages</label><input type="number" inputmode="numeric" id="btp" value="${b.total_pages || ""}" placeholder="320"></div>
    <div class="field"><label>Page you're on now</label><input type="number" inputmode="numeric" id="bcp" value="${b.current_page || ""}" placeholder="0"></div>
    <div class="field"><label>Cover colour</label><div class="swatches">${sw.map(([k, c]) => `<button data-c="${k}" class="${k === color ? "on" : ""}" style="background:${c}" aria-label="${k}"></button>`).join("")}</div></div>
    <div class="err" id="berr2"></div>
    <button class="btn primary block" id="bsave2">${isNew ? "Add to my shelf" : "Save"}</button>
    ${logs.length ? `<div class="lbl">Reading log</div><div class="list">${logs.map(l => `<div class="item"><div class="grow small">${fmtD(l.date)}</div><span class="small muted">p.${l.from_page} → ${l.to_page}</span></div>`).join("")}</div>` : ""}
    ${isNew ? "" : `<div class="btnrow" style="margin-top:10px"><button class="btn" id="breopen">${b.finished_at ? "Reading again" : "Finished it"}</button><button class="btn danger" id="bdel2">Remove</button></div>`}`, sh => {
    sh.querySelectorAll("[data-c]").forEach(x => x.onclick = () => { color = x.dataset.c; sh.querySelectorAll("[data-c]").forEach(y => y.classList.toggle("on", y === x)); });
    $("#bsave2").onclick = async () => {
      const o = { title: $("#bt").value.trim(), author: $("#ba2").value.trim() || null, total_pages: Number($("#btp").value) || null, color };
      if (!o.title) { $("#berr2").textContent = "Add the book's title."; return; }
      const cp = Number($("#bcp").value) || 0;
      try { if (isNew) { const r = await db.insert("myday_books", { ...o, current_page: cp, started_at: today() }); S.books.push(r); closeSheet(); S.learnView = "books"; window.ART.celebrate(`#bk-${r.id} .bookbox`); render(); toast("Book added"); }
        else { Object.assign(b, await db.update("myday_books", b.id, o)); if (cp !== b.current_page) return setPage(b, cp); closeSheet(); render(); toast("Saved"); } } catch (e) { fail(e); }
    };
    const ro = $("#breopen"); if (ro) ro.onclick = async () => { if (b.finished_at) { try { Object.assign(b, await db.update("myday_books", b.id, { finished_at: null })); closeSheet(); render(); } catch (e) { fail(e); } } else setPage(b, b.total_pages || b.current_page, true); };
    const dl = $("#bdel2"); if (dl) dl.onclick = async () => { try { await db.remove("myday_books", b.id); S.books = S.books.filter(x => x.id !== b.id); closeSheet(); render();
      toast("Book removed", async () => { S.books.push(await db.restore("myday_books", b.id)); render(); }); } catch (e) { fail(e); } };
  });
}

/* ---------- actions ---------- */
let clockT;
function bindLearn() {
  document.querySelectorAll("[data-lv]").forEach(b => b.onclick = () => { S.learnView = b.dataset.lv; window.MD.replay(); render(); });
  if (S.learnView === "books") return bindBooks();
  $("#ladd").onsubmit = async e => { e.preventDefault(); const v = $("#lin").value.trim();
    if (!v) { window.ART.nudge($("#lin"), "Type a topic, then tap Plant"); return; }
    try { const t = await db.insert("myday_topics", { title: v, stage: 0 }); S.topics.push(t); window.ART.celebrate(`#tc-${t.id} .pot`); render(); setTimeout(() => document.querySelector(`[data-subadd="${t.id}"] input`)?.focus(), 80); } catch (er) { fail(er); } };
  document.querySelectorAll("[data-topic]").forEach(b => b.onclick = () => topicSheet(S.topics.find(x => x.id === b.dataset.topic)));
  document.querySelectorAll("[data-water]").forEach(b => b.onclick = () => waterSheet(S.topics.find(x => x.id === b.dataset.water)));
  document.querySelectorAll("[data-sub]").forEach(b => b.onclick = () => toggleSub(S.subs.find(x => x.id === b.dataset.sub)));
  document.querySelectorAll("[data-subadd]").forEach(f => f.onsubmit = async e => { e.preventDefault(); const inp = f.querySelector("input"), v = inp.value.trim();
    const t = S.topics.find(x => x.id === f.dataset.subadd); if (!v) { window.ART.nudge(inp, "Type a subtopic first"); return; }
    try { S.subs.push(await db.insert("myday_subtopics", { topic_id: t.id, title: v, sort: subsOf(t).length })); await syncStage(t); render();
      const again = document.querySelector(`[data-subadd="${t.id}"] input`); if (again) again.focus(); } catch (er) { fail(er); } });
  document.querySelectorAll("[data-grow]").forEach(b => b.onclick = () => grow(S.topics.find(x => x.id === b.dataset.grow), 1));
  document.querySelectorAll("[data-lstart]").forEach(b => b.onclick = async () => { if (getTimer()) await stopTimer(); setTimer({ id: b.dataset.lstart, start: Date.now() }); render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  const st = $("#tstop"); if (st) st.onclick = () => stopTimer().then(render);
  clearInterval(clockT);
  const tm = getTimer(); if (tm && $("#tclock")) { const tick = () => { const el = $("#tclock"); if (!el) return clearInterval(clockT); const m = Math.floor((Date.now() - tm.start) / 60000); el.textContent = m ? `${hm(m)} so far` : "just started"; }; tick(); clockT = setInterval(tick, 20000); }
}
async function toggleSub(x) {
  const t = S.topics.find(k => k.id === x.topic_id);
  try {
    Object.assign(x, await db.update("myday_subtopics", x.id, { done_at: x.done_at ? null : nowIso() }));
    const diff = await syncStage(t);
    if (stageOf(t) === 4 && diff > 0) { render(); window.ART.confetti(null, 34); toast(`${t.title} is in full bloom`); return; }
    window.ART.celebrate(diff > 0 ? `#tc-${t.id} .pot` : `[data-sub="${x.id}"] .leafchk`, diff > 0 || !!x.done_at);
    render();
    if (diff > 0) toast(`${t.title} grew to ${STAGES[stageOf(t)][0].toLowerCase()}`);
  } catch (e) { fail(e); }
}
async function logStudy(t, minutes, date = today()) {
  const r = await db.insert("myday_study_sessions", { topic_id: t.id, minutes, date });
  S.sessions.unshift(r); S.sessions.sort((a, b) => b.date.localeCompare(a.date));
  return r;
}
async function stopTimer() {
  const tm = getTimer(); if (!tm) return; setTimer(null);
  const t = S.topics.find(x => x.id === tm.id); if (!t) return;
  const add = Math.max(1, Math.round((Date.now() - tm.start) / 60000));
  try { await logStudy(t, add); window.ART.celebrate(`#tc-${t.id} .pot`); toast(`${hm(add)} of ${t.title} logged`); } catch (e) { fail(e); }
}
async function grow(t, by) {
  const ns = Math.max(0, Math.min(4, stageOf(t) + by)); if (ns === t.stage) return;
  try { Object.assign(t, await db.update("myday_topics", t.id, { stage: ns, done_at: ns === 4 ? nowIso() : null }));
    if (ns === 4) { render(); window.ART.confetti(null, 34); toast(`${t.title} is in full bloom`); }
    else { window.ART.celebrate(`#tc-${t.id} .pot`, by > 0); render(); toast(`${t.title} grew to ${STAGES[ns][0].toLowerCase()}`); }
  } catch (e) { fail(e); }
}
function waterSheet(t) {
  let mins = 30;
  window.MD.openPop(`<div class="row" style="gap:12px">${plant(stageOf(t), colorOf(t), 56)}<div><h2 class="h2">Log study</h2><div class="small muted">${esc(t.title)}</div></div></div>
    <div class="lbl">How long?</div>
    <div class="paint" style="margin:0">${[15, 30, 45, 60, 90].map(m => `<button data-m="${m}" class="${m === mins ? "on" : ""}">${hm(m)}</button>`).join("")}</div>
    <div class="field" style="margin-top:10px"><label>Or type minutes</label><input type="number" inputmode="numeric" id="wm" placeholder="30"></div>
    <div class="field"><label>When</label><input type="date" id="wd" value="${today()}"></div>
    <div class="field"><label>What you covered (optional)</label><input type="text" id="wn" placeholder="Chapter 2, practice questions"></div>
    <button class="btn primary block" id="wsave">Save</button>`, sh => {
    sh.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { mins = Number(b.dataset.m); $("#wm").value = ""; sh.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x === b)); });
    $("#wsave").onclick = async () => {
      const m = Number($("#wm").value) || mins; if (!(m > 0)) { window.ART.nudge($("#wm")); return; }
      try { const r = await logStudy(t, Math.round(m), $("#wd").value || today()); const note = $("#wn").value.trim(); if (note) Object.assign(r, await db.update("myday_study_sessions", r.id, { note }));
        closeSheet(); window.ART.celebrate(`#tc-${t.id} .pot`); render(); dropRain(t); toast(`${hm(Math.round(m))} logged`); } catch (e) { fail(e); }
    };
  });
}
function dropRain(t) {
  const el = document.querySelector(`#tc-${t.id} .pot`); if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 6; i++) { const d = document.createElement("i"); d.className = "raindrop"; d.style.left = `${r.left + 12 + Math.random() * (r.width - 24)}px`; d.style.top = `${r.top - 6}px`; d.style.animationDelay = `${i * 70}ms`; document.body.appendChild(d); setTimeout(() => d.remove(), 1200); }
}
function topicSheet(t) {
  let stage = t.stage;
  const sb = subsOf(t), st = stageOf(t);
  const hist = S.sessions.filter(x => x.topic_id === t.id).slice(0, 8);
  const drawStages = () => STAGES.map(([n], i) => `<button data-st="${i}" class="${i === stage ? "on" : ""}">${plant(i, colorOf(t), 40, true)}<span>${n}</span></button>`).join("");
  openSheet(`<div class="row" style="gap:12px">${plant(st, colorOf(t), 64)}<div style="flex:1;min-width:0"><h2 class="h2">${esc(t.title)}</h2><div class="small muted">${STAGES[st][1]} · ${hm(minsOf(t))} studied</div></div></div>
    <div class="lbl">Subtopics</div>
    ${sb.length ? `<div class="list">${sb.map(x => `<div class="item"><div class="grow"><input type="text" value="${esc(x.title)}" data-srn="${x.id}" style="height:34px"></div><button class="x" data-sdl="${x.id}" aria-label="Remove">×</button></div>`).join("")}</div>` : '<p class="small muted" style="margin:0 2px 8px">Break the topic into smaller parts. The plant grows as you tick them off.</p>'}
    <form class="addbar" id="ssadd" style="margin-top:8px"><input type="text" id="ssin" placeholder="Add a subtopic" autocomplete="off"><button class="btn sun" type="submit">Add</button></form>
    ${sb.length ? "" : `<div class="lbl">Or set how well you know it</div><div class="stagepick">${drawStages()}</div>`}
    <div class="field" style="margin-top:12px"><label>Main topic</label><input type="text" id="tt2" value="${esc(t.title)}"></div>
    <div class="field"><label>Notes</label><textarea id="tn2" rows="5" placeholder="Key points, questions, things to revise">${esc(t.notes || "")}</textarea></div>
    <div class="field"><label>Link (optional)</label><input type="url" id="tl2" value="${esc(t.link || "")}" placeholder="https://"></div>
    ${t.link ? `<a class="addline" href="${esc(t.link)}" target="_blank" rel="noopener">Open link</a>` : ""}
    <div class="field"><label>Aim to learn it by (optional)</label><input type="date" id="td2" value="${t.target_date || ""}"></div>
    <button class="btn primary block" id="ts2">Save</button>
    ${hist.length ? `<div class="lbl">Study log</div><div class="list">${hist.map(x => `<div class="item"><div class="grow"><div class="small">${fmtD(x.date)}${x.note ? " · " + esc(x.note) : ""}</div></div><span class="small muted">${hm(x.minutes)}</span><button class="x" data-sdel="${x.id}" aria-label="Remove">×</button></div>`).join("")}</div>` : ""}
    <button class="btn danger block" id="td3" style="margin-top:12px">Remove topic</button>`, sh => {
    const bindSt = () => sh.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { stage = Number(b.dataset.st); sh.querySelector(".stagepick").innerHTML = drawStages(); bindSt(); });
    bindSt();
    $("#ssadd").onsubmit = async e => { e.preventDefault(); const v = $("#ssin").value.trim(); if (!v) { window.ART.nudge($("#ssin"), "Type a subtopic"); return; }
      try { S.subs.push(await db.insert("myday_subtopics", { topic_id: t.id, title: v, sort: subsOf(t).length })); await syncStage(t); topicSheet(t); render(); setTimeout(() => $("#ssin")?.focus(), 50); } catch (er) { fail(er); } };
    sh.querySelectorAll("[data-srn]").forEach(inp => inp.onchange = async () => { const v = inp.value.trim(); if (!v) return; const x = S.subs.find(k => k.id === inp.dataset.srn);
      try { Object.assign(x, await db.update("myday_subtopics", x.id, { title: v })); render(); } catch (e) { fail(e); } });
    sh.querySelectorAll("[data-sdl]").forEach(b => b.onclick = async () => { try { await db.remove("myday_subtopics", b.dataset.sdl); S.subs = S.subs.filter(k => k.id !== b.dataset.sdl); await syncStage(t); topicSheet(t); render(); } catch (e) { fail(e); } });
    $("#ts2").onclick = async () => {
      const was = stageOf(t), manual = !subsOf(t).length;
      const o = { title: $("#tt2").value.trim() || t.title, notes: $("#tn2").value.trim() || null, link: $("#tl2").value.trim() || null, target_date: $("#td2").value || null };
      if (manual) Object.assign(o, { stage, done_at: stage === 4 ? (t.done_at || nowIso()) : null });
      try { Object.assign(t, await db.update("myday_topics", t.id, o)); closeSheet(); const now = stageOf(t);
        if (now === 4 && was < 4) { render(); window.ART.confetti(null, 34); toast(`${t.title} is in full bloom`); }
        else { if (now > was) window.ART.celebrate(`#tc-${t.id} .pot`, true); render(); toast("Saved"); } } catch (e) { fail(e); }
    };
    sh.querySelectorAll("[data-sdel]").forEach(b => b.onclick = async () => { try { await db.remove("myday_study_sessions", b.dataset.sdel); S.sessions = S.sessions.filter(x => x.id !== b.dataset.sdel); topicSheet(t); render(); } catch (e) { fail(e); } });
    $("#td3").onclick = async () => { try { await db.remove("myday_topics", t.id); S.topics = S.topics.filter(x => x.id !== t.id); closeSheet(); render();
      toast("Topic removed", async () => { S.topics.push(await db.restore("myday_topics", t.id)); render(); }); } catch (e) { fail(e); } };
  });
}
function topicQuickAdd() {
  window.MD.openPop(`<div class="row" style="gap:12px">${plant(0, "#E8A0A0", 52)}<h2 class="h2">Plant a topic</h2></div><div class="field" style="margin-top:12px"><label>What do you want to learn?</label><input type="text" id="qtopic" placeholder="Airway management basics"></div><button class="btn primary block" id="qts">Plant</button>`, () => {
    $("#qtopic").focus();
    $("#qts").onclick = async () => { const v = $("#qtopic").value.trim(); if (!v) { window.ART.nudge($("#qtopic")); return; }
      try { const t = await db.insert("myday_topics", { title: v, stage: 0 }); S.topics.push(t); closeSheet(); S.tab = "learn"; window.ART.celebrate(`#tc-${t.id} .pot`); render(); toast("Topic planted"); } catch (e) { fail(e); } };
  });
}
window.MD.topicQuickAdd = topicQuickAdd;
window.MD.views.learn = viewLearn;
window.MD.binds.learn = bindLearn;
})();
