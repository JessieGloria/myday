/* My Day — Goals (step 3): savings goals, wishlist, life admin reminders. */
(() => {
"use strict";
const { $, esc, pad, ymd, parse, addDays, today, fmtShort, relDay, nowIso, I, S, db, render, openSheet, closeSheet, toast, fail } = window.MD;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const rm = n => "RM " + Number(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rm0 = n => "RM " + Math.round(Number(n || 0)).toLocaleString("en-MY");
const CCOL = { lavender: "var(--peri)", sage: "var(--sage)", sun: "#E5B93A", rose: "var(--rose)", navy: "var(--navy)" };
const fmtDate = s => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
S.goalsView = S.goalsView || "goals";

async function loadGoals() {
  const [goals, wish, rem, gtx] = await Promise.all([
    db.list("myday_goals", "order=created_at"),
    db.list("myday_wishlist", "order=created_at"),
    db.list("myday_reminders", "order=due_date"),
    db.list("myday_transactions", "goal_id=not.is.null&select=id,goal_id,amount,date")
  ]);
  S.goals = goals; S.wish = wish; S.reminders = rem; S.goalTx = gtx;
}
window.MD.loaders.push(loadGoals);

const savedFor = g => Number(g.starting_amount || 0) + S.goalTx.filter(t => t.goal_id === g.id).reduce((s, t) => s + Number(t.amount), 0);
const daysTo = ds => Math.round((parse(ds) - parse(today())) / 864e5);
function remStatus(r) {
  const d = daysTo(r.due_date);
  if (d < 0) return { cls: "rose", txt: `${-d} day${d === -1 ? "" : "s"} late`, soon: true };
  if (d === 0) return { cls: "warn", txt: "Today", soon: true };
  if (d <= r.notify_days) return { cls: "warn", txt: d === 1 ? "Tomorrow" : `in ${d} days`, soon: true };
  return { cls: "", txt: fmtShort(r.due_date), soon: false };
}
window.MD.remindersDueSoon = () => (S.reminders || []).filter(r => !r.done_at && remStatus(r).soon);
window.MD.goalSaved = savedFor;
window.MD.refreshGoalTx = async () => { S.goalTx = await db.list("myday_transactions", "goal_id=not.is.null&select=id,goal_id,amount,date"); };

/* ---------- views ---------- */
function viewGoals() {
  if (S.goalsView === "wish") S.goalsView = "goals";
  return `<div class="top"><div><h1 class="h1">Goals</h1><div class="small muted serif" style="font-size:13px">little by little, it adds up</div></div><div class="row">${window.ART.flag(62)}</div></div>
  <div class="seg">${[["goals", "Savings"], ["admin", "Life admin"]].map(([k, l]) => `<button data-gv="${k}" class="${S.goalsView === k ? "on" : ""}">${l}</button>`).join("")}</div>
  ${({ goals: viewSavings, admin: viewAdmin }[S.goalsView] || viewSavings)()}`;
}
/* ---------- cute trackers ---------- */
const TINT = { lavender: ["#C9CBF3", "#8E92E0"], sage: ["#C8DECF", "#7FA38A"], sun: ["#FBE7A6", "#E5B93A"], rose: ["#F6CFCF", "#E8A0A0"], navy: ["#B9BCE6", "#2B3060"] };
const eyes = (x, y, mood = "happy") => `<circle cx="${x - 4}" cy="${y}" r="1.3" fill="#5A4A3A"/><circle cx="${x + 4}" cy="${y}" r="1.3" fill="#5A4A3A"/>`
  + (mood === "happy" ? `<path d="M${x - 2.5} ${y + 3} q2.5 2.4 5 0" stroke="#5A4A3A" stroke-width="1.2" fill="none" stroke-linecap="round"/>` : mood === "worried" ? `<path d="M${x - 2.5} ${y + 4.5} q2.5 -2 5 0" stroke="#5A4A3A" stroke-width="1.2" fill="none" stroke-linecap="round"/>` : `<circle cx="${x}" cy="${y + 4}" r="1.6" fill="#5A4A3A"/>`)
  + `<circle cx="${x - 7}" cy="${y + 3}" r="1.6" fill="#F4A7A7" opacity=".7"/><circle cx="${x + 7}" cy="${y + 3}" r="1.6" fill="#F4A7A7" opacity=".7"/>`;
let uid = 0;
// a jar that fills up with coins as you save
function jarArt(pct, color = "lavender", w = 74) {
  const id = "jc" + (++uid), [lite, deep] = TINT[color] || TINT.lavender;
  const top = 64 - Math.max(0, Math.min(1, pct)) * 44;
  return `<svg width="${w}" height="${w}" viewBox="0 0 64 70" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="M14 20 h36 q5 0 5 6 v32 q0 8 -8 8 h-30 q-8 0 -8 -8 v-32 q0 -6 5 -6z"/></clipPath></defs>
    <rect x="18" y="10" width="28" height="8" rx="3" fill="${deep}"/>
    <path d="M14 20 h36 q5 0 5 6 v32 q0 8 -8 8 h-30 q-8 0 -8 -8 v-32 q0 -6 5 -6z" fill="#FBF9F5" stroke="${lite}" stroke-width="2"/>
    <g clip-path="url(#${id})"><g class="jarfill" style="transform:translateY(${top}px)">
      <path class="a-wavex" d="M0 2 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V80 H0Z" fill="${lite}"/>
      ${[[22, 12], [34, 16], [44, 10], [28, 24], [40, 26], [20, 32], [46, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#F6D86B" stroke="#E5B93A" stroke-width="1"/>`).join("")}</g></g>
    ${eyes(32, 40, pct >= 1 ? "happy" : "happy")}
    ${pct >= 1 ? `<path class="a-twinkle" d="M54 8 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6z" fill="#F6D86B"/>` : ""}</svg>`;
}
// a wrapped gift; opens when you've bought it
function giftArt(color = "rose", open = false, w = 64) {
  const [lite, deep] = TINT[color] || TINT.rose;
  return `<svg width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true">
    ${open ? `<path class="a-bob" d="M32 14 c-3 -5 -11 -3 -9 3 c1 4 9 8 9 8 s8 -4 9 -8 c2 -6 -6 -8 -9 -3z" fill="#E8A0A0"/>` : ""}
    <rect x="12" y="30" width="40" height="28" rx="5" fill="${lite}"/><rect x="29" y="30" width="6" height="28" fill="${deep}"/>
    <g style="transform:${open ? "translate(10px,-10px) rotate(18deg)" : "none"};transform-origin:52px 26px;transition:transform .5s"><rect x="9" y="21" width="46" height="11" rx="4" fill="${lite}" stroke="${deep}" stroke-width="1.4"/><rect x="29" y="21" width="6" height="11" fill="${deep}"/>
    ${open ? "" : `<path d="M32 21 c-6 -10 -16 -6 -11 0z M32 21 c6 -10 16 -6 11 0z" fill="${deep}"/>`}</g>
    ${eyes(22, 44, "happy").replace(/cx="(\d+)"/g, (m, v) => `cx="${v}"`)}</svg>`;
}
// a tear-off calendar page with a face that worries as the date gets close
function calArt(ds, tone, w = 60) {
  const d = parse(ds), [band, mood] = tone === "late" ? ["#E8A0A0", "oh"] : tone === "soon" ? ["#F6D86B", "worried"] : tone === "done" ? ["#7FA38A", "happy"] : ["#C9CBF3", "happy"];
  return `<svg width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true" class="${tone === "late" ? "a-shake" : ""}">
    <rect x="8" y="10" width="48" height="48" rx="9" fill="#FFFFFF" stroke="#ECE8F2" stroke-width="1.5"/>
    <path d="M8 19 a9 9 0 0 1 9 -9 h30 a9 9 0 0 1 9 9 v5 h-48z" fill="${band}"/>
    <rect x="20" y="5" width="4" height="10" rx="2" fill="#6E7196"/><rect x="40" y="5" width="4" height="10" rx="2" fill="#6E7196"/>
    <text x="32" y="21.5" text-anchor="middle" font-size="7.5" font-weight="700" fill="#2B3060" font-family="Nunito,Inter,sans-serif">${MON[d.getMonth()].toUpperCase()}</text>
    <text x="32" y="42" text-anchor="middle" font-size="17" font-weight="800" fill="#2B3060" font-family="Nunito,Inter,sans-serif">${d.getDate()}</text>
    <g transform="translate(0,7)">${eyes(32, 42, mood).replace(/r="1.3"/g, 'r="1.1"')}</g>
    ${tone === "done" ? `<circle cx="50" cy="50" r="9" fill="#7FA38A"/><path d="M45.5 50 l3 3 l6 -6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ""}</svg>`;
}

function goalCard(g) {
  const saved = savedFor(g), pct = saved / g.target, left = Math.max(0, g.target - saved), done = saved >= g.target;
  let pace = "";
  if (g.target_date && left > 0) {
    const months = Math.max(1, (parse(g.target_date).getFullYear() - new Date().getFullYear()) * 12 + parse(g.target_date).getMonth() - new Date().getMonth());
    pace = `about ${rm0(left / months)} a month to reach it by ${fmtDate(g.target_date)}`;
  } else if (g.target_date) pace = `by ${fmtDate(g.target_date)}`;
  return `<div class="card jarcard" id="gc-${g.id}" style="${done ? "background:var(--sagebg);border:none" : ""}">
    <button class="jarmain" data-goal="${g.id}"><div class="jarbox">${jarArt(pct, g.color)}</div>
      <div style="flex:1;min-width:0"><div class="between"><span class="h2" style="font-size:14px">${done ? window.ART.star(17).replace("<svg", '<svg style="vertical-align:-3px;margin-right:4px"') : ""}${esc(g.name)}</span><span class="pctbadge">${Math.floor(Math.min(1, pct) * 100)}%</span></div>
      <div style="font-size:17px;font-weight:700;font-family:Nunito,Inter,sans-serif;margin-top:2px">${rm0(saved)} <span class="small muted" style="font-weight:400">of ${rm0(g.target)}</span></div>
      <div class="tiny muted">${done ? "Jar full. You did it!" : left ? `${rm0(left)} to go${pace ? " · " + pace : ""}` : ""}</div></div></button>
    ${done ? "" : `<button class="btn sun block" data-addsave="${g.id}" style="margin-top:10px;height:36px;font-size:12px">+ Drop savings in the jar</button>`}</div>`;
}
function viewSavings() {
  const active = S.goals.filter(g => !g.done_at), done = S.goals.filter(g => g.done_at);
  const total = active.reduce((s, g) => s + savedFor(g), 0);
  return `${active.length ? `<div class="card leave between"><div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">SAVED TOWARDS GOALS</div><div style="font-size:23px;font-weight:700;font-family:Nunito,Inter,sans-serif">${rm(total)}</div><div class="small muted">${active.length} jar${active.length > 1 ? "s" : ""} filling up${(window.MD.savingsAccounts ? window.MD.savingsAccounts() : []).length ? " · kept in " + window.MD.savingsAccounts().map(x => x.a.name).join(", ") : ""}</div></div>${window.ART.jar(58)}</div><div style="height:10px"></div>` : ""}
    ${active.map(goalCard).join("") || '<div class="empty">Start a savings jar, like a trip or an emergency fund.</div>'}
    <button class="addline" id="addgoal">+ New savings jar</button>
    ${done.length ? `<div class="lbl">Full jars</div>${done.map(goalCard).join("")}` : ""}`;
}
function viewWish() {
  const open = S.wish.filter(w => !w.bought_at), bought = S.wish.filter(w => w.bought_at);
  const cols = ["rose", "lavender", "sun", "sage"];
  const tile = (w, i) => { const g = w.goal_id && S.goals.find(x => x.id === w.goal_id), p = g ? Math.min(1, savedFor(g) / g.target) : 0;
    return `<div class="gift ${w.bought_at ? "got" : ""}" id="wc-${w.id}"><button data-wish="${w.id}" class="giftmain">${giftArt(cols[i % cols.length], !!w.bought_at, 64)}
      <div class="title">${esc(w.name)}</div><div class="tiny muted">${w.bought_at ? "Got it!" : w.price ? rm0(w.price) : "Add a price"}</div>
      ${g && !w.bought_at ? `<div class="bar" style="margin-top:6px"><i style="width:${p * 100}%;background:var(--rose)"></i></div><div class="tiny muted" style="margin-top:3px">${Math.floor(p * 100)}% saved</div>` : ""}</button>
      ${!w.bought_at && !g && w.price ? `<button class="small giftbtn" data-saveforit="${w.id}">Save for it</button>` : ""}</div>`; };
  return `<form class="addbar" id="wadd"><input type="text" id="win" placeholder="Something you'd like" autocomplete="off"><button class="btn sun" type="submit">Add</button></form>
    ${open.length ? `<div class="gifts">${open.map(tile).join("")}</div>` : '<div class="empty">Your wishlist is empty.</div>'}
    ${bought.length ? `<div class="lbl">Unwrapped</div><div class="gifts">${bought.map(tile).join("")}</div>` : ""}
    <p class="tiny faint" style="text-align:center;margin-top:14px">Tap a gift to add a price or link. "Save for it" gives it its own savings jar.</p>`;
}
function viewAdmin() {
  const open = S.reminders.filter(r => !r.done_at), done = S.reminders.filter(r => r.done_at).slice(-5);
  const card = r => { const d = daysTo(r.due_date), st = remStatus(r), tone = r.done_at ? "done" : d < 0 ? "late" : st.soon ? "soon" : "later";
    const win = Math.max(r.notify_days, 1), fill = r.done_at ? 1 : d < 0 ? 1 : Math.max(0, Math.min(1, 1 - d / Math.max(win * 2, 30)));
    const big = r.done_at ? "Done" : d < 0 ? `${-d} day${d === -1 ? "" : "s"} late` : d === 0 ? "Due today" : d === 1 ? "Tomorrow" : `${d} days`;
    return `<div class="card admincard tone-${tone}" id="rc-${r.id}"><button class="adminmain" data-rem="${r.id}">${calArt(r.due_date, tone)}
      <div style="flex:1;min-width:0"><div class="h2" style="font-size:14px">${esc(r.name)}</div>
      <div class="bigdays">${big}</div>
      <div class="tiny muted">${fmtDate(r.due_date)}${r.repeat !== "none" ? ` · every ${r.repeat === "yearly" ? "year" : "month"}` : ""}${r.note ? " · " + esc(r.note) : ""}</div>
      ${r.done_at ? "" : `<div class="bar" style="margin-top:6px"><i style="width:${fill * 100}%;background:${tone === "late" ? "#D86A6A" : tone === "soon" ? "#E5B93A" : "var(--peri)"}"></i></div>`}</div></button>
      ${r.done_at ? "" : `<button class="donebtn" data-remdone="${r.id}" aria-label="Mark done">${I.check}</button>`}</div>`; };
  return `<button class="btn block" id="addrem" style="margin-bottom:12px">+ Add reminder</button>
    ${open.map(card).join("") || '<div class="empty">Add renewals and due dates, like road tax, car insurance, or your APC.</div>'}
    ${done.length ? `<div class="lbl">Done</div>${done.map(card).join("")}` : ""}`;
}
function bindGoals() {
  document.querySelectorAll("[data-gv]").forEach(b => b.onclick = () => { S.goalsView = b.dataset.gv; render(); });
  document.querySelectorAll("[data-goal]").forEach(b => b.onclick = () => goalSheet(S.goals.find(g => g.id === b.dataset.goal)));
  document.querySelectorAll("[data-addsave]").forEach(b => b.onclick = () => window.MD.txSheet(null, { type: "saving", goal_id: b.dataset.addsave, note: S.goals.find(g => g.id === b.dataset.addsave)?.name }));
  const ag = $("#addgoal"); if (ag) ag.onclick = () => goalSheet(null);
  const wf = $("#wadd"); if (wf) wf.onsubmit = async e => { e.preventDefault(); const v = $("#win").value.trim(); if (!v) { window.ART.nudge($("#win"), "Type something first"); return; }
    try { S.wish.push(await db.insert("myday_wishlist", { name: v })); render(); $("#win").focus(); } catch (er) { fail(er); } };
  document.querySelectorAll("[data-wish]").forEach(b => b.onclick = () => wishSheet(S.wish.find(w => w.id === b.dataset.wish)));
  document.querySelectorAll("[data-saveforit]").forEach(b => b.onclick = () => saveForIt(S.wish.find(w => w.id === b.dataset.saveforit)));
  const ar = $("#addrem"); if (ar) ar.onclick = () => remSheet(null);
  document.querySelectorAll("[data-rem]").forEach(b => b.onclick = () => remSheet(S.reminders.find(r => r.id === b.dataset.rem)));
  document.querySelectorAll("[data-remdone]").forEach(b => b.onclick = () => remDone(S.reminders.find(r => r.id === b.dataset.remdone)));
}

/* ---------- sheets ---------- */
const COLORS = [["lavender", "var(--lav2)"], ["sage", "var(--sage)"], ["sun", "var(--sun)"], ["rose", "var(--rose)"], ["navy", "var(--navy)"]];
function goalSheet(g, preset = {}) {
  const isNew = !g; g = g || Object.assign({ name: "", target: "", target_date: "", starting_amount: 0, color: "lavender" }, preset);
  let color = g.color;
  const hist = isNew ? [] : S.goalTx.filter(t => t.goal_id === g.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  openSheet(`<h2 class="h2" style="margin-bottom:14px">${isNew ? "New savings goal" : esc(g.name)}</h2>
    <div class="field"><label>Goal</label><input type="text" id="gn" value="${esc(g.name)}" placeholder="Japan trip"></div>
    <div class="field"><label>Target (RM)</label><input type="number" inputmode="decimal" id="gt" value="${g.target}" placeholder="5000"></div>
    <div class="field"><label>Reach it by (optional)</label><input type="date" id="gd" value="${g.target_date || ""}"></div>
    <div class="field"><label>Already saved before today (RM)</label><input type="number" inputmode="decimal" id="gs" value="${g.starting_amount || ""}" placeholder="0"></div>
    <div class="field"><label>Colour</label><div class="swatches">${COLORS.map(([k, c]) => `<button data-c="${k}" class="${k === color ? "on" : ""}" style="background:${c}" aria-label="${k}"></button>`).join("")}</div></div>
    ${hist.length ? `<div class="lbl">Recent savings</div><div class="list">${hist.map(t => `<div class="item"><div class="grow small">${fmtShort(t.date)}</div><span class="small">${rm(t.amount)}</span></div>`).join("")}</div><div style="height:12px"></div>` : ""}
    <div class="err" id="gerr"></div>
    <button class="btn primary block" id="gsave">${isNew ? "Create goal" : "Save"}</button>
    ${isNew ? "" : `<div class="btnrow" style="margin-top:8px"><button class="btn" id="gdone">${g.done_at ? "Reopen" : "Mark finished"}</button><button class="btn danger" id="gdel">Delete</button></div>`}`, sh => {
    sh.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { color = b.dataset.c; sh.querySelectorAll("[data-c]").forEach(x => x.classList.toggle("on", x === b)); });
    $("#gsave").onclick = async () => {
      const o = { name: $("#gn").value.trim(), target: Number($("#gt").value), target_date: $("#gd").value || null, starting_amount: Number($("#gs").value || 0), color };
      if (!o.name) { $("#gerr").textContent = "Give your goal a name."; return; }
      if (!(o.target > 0)) { $("#gerr").textContent = "Enter a target amount."; return; }
      try { let r; if (isNew) { r = await db.insert("myday_goals", o); S.goals.push(r); } else { r = Object.assign(g, await db.update("myday_goals", g.id, o)); }
        if (preset._wish) { const w = S.wish.find(x => x.id === preset._wish); if (w) Object.assign(w, await db.update("myday_wishlist", w.id, { goal_id: r.id })); }
        closeSheet(); S.tab = "goals"; S.goalsView = preset._wish ? "wish" : "goals"; render(); toast(isNew ? "Goal created" : "Goal saved"); } catch (e) { fail(e); }
    };
    const dn = $("#gdone"); if (dn) dn.onclick = async () => { try { Object.assign(g, await db.update("myday_goals", g.id, { done_at: g.done_at ? null : nowIso() })); closeSheet(); render(); } catch (e) { fail(e); } };
    const dl = $("#gdel"); if (dl) dl.onclick = async () => { try { await db.remove("myday_goals", g.id); S.goals = S.goals.filter(x => x.id !== g.id); closeSheet(); render();
      toast("Goal deleted", async () => { S.goals.push(await db.restore("myday_goals", g.id)); render(); }); } catch (e) { fail(e); } };
  });
}
function saveForIt(w) { goalSheet(null, { name: w.name, target: w.price, _wish: w.id }); }
function wishSheet(w) {
  openSheet(`<h2 class="h2" style="margin-bottom:14px">Wishlist item</h2>
    <div class="field"><label>Item</label><input type="text" id="wn" value="${esc(w.name)}"></div>
    <div class="field"><label>Price (RM)</label><input type="number" inputmode="decimal" id="wp" value="${w.price ?? ""}" placeholder="0.00"></div>
    <div class="field"><label>Link (optional)</label><input type="url" id="wl" value="${esc(w.link || "")}" placeholder="https://"></div>
    <div class="field"><label>Note</label><input type="text" id="wno" value="${esc(w.note || "")}" placeholder="Colour, size, where to buy"></div>
    ${w.link ? `<a class="addline" href="${esc(w.link)}" target="_blank" rel="noopener">Open link</a>` : ""}
    <button class="btn primary block" id="wsave">Save</button>
    <div class="btnrow" style="margin-top:8px"><button class="btn" id="wbought">${w.bought_at ? "Not bought" : "I bought it"}</button><button class="btn danger" id="wdel">Delete</button></div>`, () => {
    $("#wsave").onclick = async () => { const o = { name: $("#wn").value.trim() || w.name, price: $("#wp").value === "" ? null : Number($("#wp").value), link: $("#wl").value.trim() || null, note: $("#wno").value.trim() || null };
      try { Object.assign(w, await db.update("myday_wishlist", w.id, o)); closeSheet(); render(); toast("Saved"); } catch (e) { fail(e); } };
    $("#wbought").onclick = async () => {
      try { Object.assign(w, await db.update("myday_wishlist", w.id, { bought_at: w.bought_at ? null : nowIso() })); closeSheet(); if (w.bought_at) window.ART.celebrate(`#wc-${w.id} svg`, true); render();
        if (w.bought_at && w.price) window.MD.txSheet(null, { type: "expense", amount: w.price, payee: w.name, category_id: (S.categories || []).find(c => c.name === "Shopping")?.id || null }); } catch (e) { fail(e); }
    };
    $("#wdel").onclick = async () => { try { await db.remove("myday_wishlist", w.id); S.wish = S.wish.filter(x => x.id !== w.id); closeSheet(); render();
      toast("Removed", async () => { S.wish.push(await db.restore("myday_wishlist", w.id)); render(); }); } catch (e) { fail(e); } };
  });
}
function remSheet(r) {
  const isNew = !r; r = r || { name: "", due_date: addDays(today(), 30), repeat: "yearly", notify_days: 14, note: "" };
  let rep = r.repeat;
  const chips = (items, sel, attr) => `<div class="paint" style="margin:0">${items.map(([id, l]) => `<button type="button" data-${attr}="${id}" class="${id === sel ? "on" : ""}">${l}</button>`).join("")}</div>`;
  openSheet(`<h2 class="h2" style="margin-bottom:14px">${isNew ? "Add a reminder" : "Edit reminder"}</h2>
    <div class="field"><label>What</label><input type="text" id="rn" value="${esc(r.name)}" placeholder="Road tax"></div>
    <div class="field"><label>Due date</label><input type="date" id="rd" value="${r.due_date}"></div>
    <div class="field"><label>Repeats</label>${chips([["yearly", "Every year"], ["monthly", "Every month"], ["none", "Just once"]], rep, "rr")}</div>
    <div class="field"><label>Show on Today this many days before</label><input type="number" id="rnd" value="${r.notify_days}" min="0" max="90"></div>
    <div class="field"><label>Note</label><input type="text" id="rno" value="${esc(r.note || "")}" placeholder="Optional"></div>
    <div class="err" id="rerr"></div>
    <button class="btn primary block" id="rsave">${isNew ? "Add" : "Save"}</button>
    ${isNew ? "" : '<button class="btn danger block" id="rdel" style="margin-top:8px">Delete</button>'}`, sh => {
    sh.querySelectorAll("[data-rr]").forEach(b => b.onclick = () => { rep = b.dataset.rr; sh.querySelectorAll("[data-rr]").forEach(x => x.classList.toggle("on", x === b)); });
    $("#rsave").onclick = async () => {
      const o = { name: $("#rn").value.trim(), due_date: $("#rd").value, repeat: rep, notify_days: Math.max(0, Number($("#rnd").value) || 0), note: $("#rno").value.trim() || null };
      if (!o.name) { $("#rerr").textContent = "Add what the reminder is for."; return; }
      if (!o.due_date) { $("#rerr").textContent = "Pick a due date."; return; }
      try { if (isNew) S.reminders.push(await db.insert("myday_reminders", o)); else Object.assign(r, await db.update("myday_reminders", r.id, o));
        S.reminders.sort((a, b) => a.due_date.localeCompare(b.due_date)); closeSheet(); render(); toast(isNew ? "Reminder added" : "Saved"); } catch (e) { fail(e); }
    };
    const d = $("#rdel"); if (d) d.onclick = async () => { try { await db.remove("myday_reminders", r.id); S.reminders = S.reminders.filter(x => x.id !== r.id); closeSheet(); render();
      toast("Reminder deleted", async () => { S.reminders.push(await db.restore("myday_reminders", r.id)); render(); }); } catch (e) { fail(e); } };
  });
}
async function remDone(r) {
  try {
    if (r.repeat === "none") { Object.assign(r, await db.update("myday_reminders", r.id, { done_at: nowIso() })); render(); toast("Done", async () => { Object.assign(r, await db.update("myday_reminders", r.id, { done_at: null })); render(); }); return; }
    window.ART.confetti(document.querySelector(`#rc-${r.id} .donebtn`), 14);
    const old = r.due_date, d = parse(old);
    if (r.repeat === "yearly") d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
    Object.assign(r, await db.update("myday_reminders", r.id, { due_date: ymd(d) }));
    S.reminders.sort((a, b) => a.due_date.localeCompare(b.due_date)); render();
    toast(`Done. Next one ${fmtDate(r.due_date)}`, async () => { Object.assign(r, await db.update("myday_reminders", r.id, { due_date: old })); render(); });
  } catch (e) { fail(e); }
}
window.MD.remSheet = remSheet; window.MD.remDone = remDone;
window.MD.views.goals = viewGoals;
window.MD.binds.goals = bindGoals;
})();
