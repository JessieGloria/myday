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
  return `<div class="top"><div><h1 class="h1">Goals</h1><div class="small muted serif" style="font-size:14px">little by little, it adds up</div></div><div class="row">${window.ART.flag(62)}</div></div>
  <div class="seg">${[["goals", "Savings"], ["wish", "Wishlist"], ["admin", "Life admin"]].map(([k, l]) => `<button data-gv="${k}" class="${S.goalsView === k ? "on" : ""}">${l}</button>`).join("")}</div>
  ${{ goals: viewSavings, wish: viewWish, admin: viewAdmin }[S.goalsView]()}`;
}
function goalCard(g) {
  const saved = savedFor(g), pct = Math.min(100, saved / g.target * 100), left = Math.max(0, g.target - saved);
  let pace = "";
  if (g.target_date && left > 0) {
    const months = Math.max(1, (parse(g.target_date).getFullYear() - new Date().getFullYear()) * 12 + parse(g.target_date).getMonth() - new Date().getMonth());
    pace = ` · about ${rm0(left / months)} a month to reach it by ${fmtDate(g.target_date)}`;
  } else if (g.target_date) pace = ` · by ${fmtDate(g.target_date)}`;
  const done = saved >= g.target;
  return `<div class="card" style="${done ? "background:var(--sagebg);border:none" : ""}">
    <button data-goal="${g.id}" style="width:100%;text-align:left">
      <div class="between"><span class="h2" style="font-size:15px">${done ? window.ART.star(18).replace("<svg", '<svg style="vertical-align:-3px;margin-right:4px"') : ""}${esc(g.name)}</span><span class="h2" style="font-size:15px">${Math.floor(pct)}%</span></div>
      <div class="bar"><i style="width:${pct}%;background:${CCOL[g.color] || "var(--peri)"}"></i></div>
      <div class="tiny muted" style="margin-top:6px">${rm(saved)} of ${rm0(g.target)}${done ? " · reached" : pace}</div></button>
    ${done ? "" : `<button class="btn" data-addsave="${g.id}" style="margin-top:10px;height:34px;font-size:13px">+ Add savings</button>`}</div>`;
}
function viewSavings() {
  const active = S.goals.filter(g => !g.done_at), done = S.goals.filter(g => g.done_at);
  const total = active.reduce((s, g) => s + savedFor(g), 0);
  return `${active.length ? `<div class="card leave between"><div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">SAVED TOWARDS GOALS</div><div style="font-size:24px;font-weight:500">${rm(total)}</div></div>
      <div class="small muted">${active.length} goal${active.length > 1 ? "s" : ""}</div></div><div style="height:10px"></div>` : ""}
    ${active.map(goalCard).join("") || '<div class="empty">Start a savings goal, like a trip or an emergency fund.</div>'}
    <button class="addline" id="addgoal">+ New goal</button>
    ${done.length ? `<div class="lbl">Finished</div>${done.map(goalCard).join("")}` : ""}
    <p class="tiny faint" style="text-align:center;margin-top:10px">Savings you add here also show as "Saved" in Money.</p>`;
}
function viewWish() {
  const open = S.wish.filter(w => !w.bought_at), bought = S.wish.filter(w => w.bought_at);
  const row = w => { const g = w.goal_id && S.goals.find(x => x.id === w.goal_id);
    return `<div class="item ${w.bought_at ? "done" : ""}"><button class="grow" style="text-align:left" data-wish="${w.id}"><div class="title">${esc(w.name)}</div>
      <div class="tiny muted">${w.price ? rm(w.price) : "No price yet"}${g ? ` · saving ${Math.floor(Math.min(100, savedFor(g) / g.target * 100))}%` : ""}${w.bought_at ? " · bought" : ""}</div></button>
      ${!w.bought_at && !g && w.price ? `<button class="small" style="color:var(--peri);white-space:nowrap" data-saveforit="${w.id}">Save for it</button>` : ""}</div>`; };
  return `<form class="addbar" id="wadd"><input type="text" id="win" placeholder="Something you'd like" autocomplete="off"><button class="btn sun" type="submit">Add</button></form>
    ${open.length ? `<div class="list">${open.map(row).join("")}</div>` : '<div class="empty">Your wishlist is empty.</div>'}
    ${bought.length ? `<div class="lbl">Got it</div><div class="list">${bought.map(row).join("")}</div>` : ""}
    <p class="tiny faint" style="text-align:center;margin-top:14px">Tap an item to add a price or link. "Save for it" turns it into a savings goal.</p>`;
}
function viewAdmin() {
  const open = S.reminders.filter(r => !r.done_at), done = S.reminders.filter(r => r.done_at).slice(-5);
  const row = r => { const st = remStatus(r);
    return `<div class="item"><button class="grow" style="text-align:left" data-rem="${r.id}"><div class="title">${esc(r.name)}</div>
      <div class="tiny muted">${fmtDate(r.due_date)}${r.repeat !== "none" ? ` · every ${r.repeat === "yearly" ? "year" : "month"}` : ""}${r.note ? " · " + esc(r.note) : ""}</div></button>
      ${r.done_at ? '<span class="pill sage">Done</span>' : `<span class="pill ${st.cls}">${st.txt}</span><button class="chk" data-remdone="${r.id}" aria-label="Done" style="margin-left:6px"></button>`}</div>`; };
  return `<button class="btn block" id="addrem" style="margin-bottom:12px">+ Add reminder</button>
    ${open.length ? `<div class="list">${open.map(row).join("")}</div>` : '<div class="empty">Add renewals and due dates, like road tax, car insurance, or your APC.</div>'}
    ${done.length ? `<div class="lbl">Done</div><div class="list">${done.map(row).join("")}</div>` : ""}
    <p class="tiny faint" style="text-align:center;margin-top:14px">Reminders show on Today when they're close. Ticking a yearly one moves it to next year. Monthly bills live in Money → Bills.</p>`;
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
      try { Object.assign(w, await db.update("myday_wishlist", w.id, { bought_at: w.bought_at ? null : nowIso() })); closeSheet(); render();
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
