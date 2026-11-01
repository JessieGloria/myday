/* My Day — Money (step 2). Loaded after app.js; uses the helpers app.js shares on window.MD. */
(() => {
"use strict";
const { $, esc, pad, ymd, parse, addDays, today, fmtShort, relDay, nowIso, I, S, db, rest, render, openSheet, closeSheet, toast, fail, CFG } = window.MD;
const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const rm = n => "RM " + Number(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rm0 = n => "RM " + Math.round(Number(n || 0)).toLocaleString("en-MY");
const sum = (a, f = x => x.amount) => a.reduce((s, x) => s + Number(f(x) || 0), 0);
const CCOL = { lavender: "var(--peri)", sage: "var(--sage)", sun: "#E5B93A", rose: "var(--rose)", navy: "var(--navy)" };
const curMonth = () => today().slice(0, 7);
S.moneyMonth = S.moneyMonth || curMonth();
S.moneyView = S.moneyView || "overview";
S.histFilter = S.histFilter || "all";

/* ---------- data ---------- */
const monthsBack = n => { const d = new Date(); d.setMonth(d.getMonth() - n, 1); return ymd(d); };
async function loadMoney() {
  const [acc, cats, bills, rules] = await Promise.all([
    db.list("myday_accounts", "order=sort,created_at"),
    db.list("myday_categories", "order=sort,created_at"),
    db.list("myday_bills", "order=due_day"),
    rest("GET", "myday_payee_rules?select=*")
  ]);
  S.accounts = acc; S.categories = cats; S.bills = bills; S.rules = rules;
  const from = monthsBack(3), cards = acc.filter(a => a.kind === "card").map(a => a.id);
  const cardQ = cards.length ? `,account_id.in.(${cards}),to_account_id.in.(${cards})` : "";
  S.tx = await db.list("myday_transactions", `or=(date.gte.${from},needs_review.is.true${cardQ})&order=date.desc,time.desc.nullslast,created_at.desc`);
  S.txFrom = from.slice(0, 7);
}
async function ensureMonth(m) {
  if (m >= S.txFrom) return;
  const [y, mo] = m.split("-").map(Number), end = ymd(new Date(y, mo, 1));
  const rows = await db.list("myday_transactions", `date=gte.${m}-01&date=lt.${end}&order=date.desc,time.desc.nullslast`);
  const have = new Set(S.tx.map(t => t.id));
  S.tx.push(...rows.filter(r => !have.has(r.id))); S.tx.sort((a, b) => b.date.localeCompare(a.date));
  S.txFrom = m;
}
window.MD.loaders.push(loadMoney);

const cat = id => S.categories.find(c => c.id === id);
const acc = id => S.accounts.find(a => a.id === id);
const expCats = () => S.categories.filter(c => c.kind === "expense");
const incCats = () => S.categories.filter(c => c.kind === "income");
const monthTx = m => S.tx.filter(t => t.date.startsWith(m));
function totals(m) {
  const t = monthTx(m);
  return { income: sum(t.filter(x => x.type === "income")), spent: sum(t.filter(x => x.type === "expense")), saved: sum(t.filter(x => x.type === "saving")) };
}
function cardOwed() {
  return S.accounts.filter(a => a.kind === "card").map(a => ({ a, owed: sum(S.tx.filter(t => t.type === "expense" && t.account_id === a.id)) - sum(S.tx.filter(t => t.type === "card_payment" && t.to_account_id === a.id)) }));
}
function billsFor(m) {
  const [y, mo] = m.split("-").map(Number), dim = new Date(y, mo, 0).getDate(), t = today();
  return S.bills.filter(b => b.frequency === "monthly" || b.due_month === mo).map(b => {
    const due = `${m}-${pad(Math.min(b.due_day, dim))}`;
    const paid = S.tx.find(x => x.bill_id === b.id && x.bill_period === m);
    const days = Math.round((parse(due) - parse(t)) / 864e5);
    const status = paid ? "paid" : days < 0 ? "late" : days <= 7 ? "soon" : "later";
    return { b, due, paid, days, status };
  }).sort((a, b) => a.due.localeCompare(b.due));
}
const billPill = x => x.status === "paid" ? `<span class="pill sage">Paid</span>` : x.status === "late" ? `<span class="pill rose">${-x.days} day${x.days === -1 ? "" : "s"} late</span>` : x.status === "soon" ? `<span class="pill warn">${x.days === 0 ? "Today" : x.days === 1 ? "Tomorrow" : `in ${x.days} days`}</span>` : `<span class="pill">${fmtShort(x.due)}</span>`;
window.MD.moneyToday = () => sum(S.tx.filter(t => t.type === "expense" && t.date === today()));
window.MD.billsDueSoon = () => billsFor(curMonth()).filter(x => x.status === "late" || x.status === "soon");

/* ---------- views ---------- */
function txRow(t) {
  const c = cat(t.category_id), a = acc(t.account_id);
  const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "→";
  const col = t.type === "income" ? "color:var(--sageink)" : t.type === "saving" || t.type === "card_payment" ? "color:var(--sunink)" : "";
  const title = t.type === "card_payment" ? `Paid ${acc(t.to_account_id)?.name || "card"}` : t.type === "saving" ? ((S.goals || []).find(g => g.id === t.goal_id)?.name || t.note || "Savings") : (t.payee || c?.name || "Expense");
  const sub = [t.type === "saving" ? "Saved" : c?.name, a?.name, t.time ? t.time.slice(0, 5) : ""].filter(Boolean).join(" · ");
  return `<button class="item" style="width:100%;text-align:left" data-tx="${t.id}">
    <span style="width:10px;height:10px;border-radius:50%;flex:none;background:${c ? CCOL[c.color] : "var(--lav2)"}"></span>
    <div class="grow"><div class="title">${esc(title)}${t.needs_review ? ' <span class="pill warn">check me</span>' : ""}</div><div class="tiny muted">${esc(sub)}</div></div>
    <span style="font-weight:600;${col}">${sign} ${rm(t.amount)}</span></button>`;
}
function monthHeader() {
  const [y, m] = S.moneyMonth.split("-").map(Number);
  return `<div class="top"><div><h1 class="h1">Money</h1><div class="small muted">${MONL[m - 1]} ${y}${S.moneyMonth === curMonth() ? " so far" : ""}</div></div>
    <div class="row"><button class="iconbtn" id="mprev" aria-label="Previous month">${I.left}</button><button class="iconbtn" id="mnext" aria-label="Next month">${I.right}</button><button class="iconbtn" id="msetup" aria-label="Categories">${I.gear}</button></div></div>
    <div class="seg" style="margin-top:4px">${[["overview", "Overview"], ["history", "History"], ["bills", "Bills"]].map(([k, l]) => `<button data-mv="${k}" class="${S.moneyView === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
}
function viewMoney() {
  return monthHeader() + ({ overview: viewOverview, history: viewHistory, bills: viewBills }[S.moneyView])();
}
function viewOverview() {
  const m = S.moneyMonth, tt = totals(m), budget = Number(S.settings.monthly_budget || 0);
  const review = S.tx.filter(t => t.needs_review);
  const left = budget ? budget - tt.spent : tt.income - tt.spent - tt.saved;
  const owed = cardOwed().filter(x => Math.abs(x.owed) > 0.004);
  const bills = billsFor(m).filter(x => x.status !== "paid");
  const cats = expCats().map(c => ({ c, spent: sum(monthTx(m).filter(t => t.type === "expense" && t.category_id === c.id)), budget: Number(c.budget || 0) }))
    .filter(x => x.spent || x.budget).sort((a, b) => b.spent - a.spent);
  const unc = sum(monthTx(m).filter(t => t.type === "expense" && !t.category_id));
  const bar = (spent, bud) => { const p = bud ? spent / bud : 0, col = !bud ? "var(--lav2)" : p > 1 ? "#D86A6A" : p > .8 ? "#E5B93A" : "var(--peri)";
    return `<div class="bar"><i style="width:${bud ? Math.min(100, p * 100) : 100}%;background:${col}"></i></div>`; };
  const recent = monthTx(m).slice(0, 6);
  return `
  ${review.length ? `<button class="card between" id="mreview" style="width:100%;text-align:left;background:var(--sunbg);border:none;margin-bottom:12px"><div><div class="h2" style="color:var(--sunink)">${review.length} to check</div><div class="small" style="color:var(--sunink)">Saved from your screenshots. Tap to confirm.</div></div><span style="color:var(--sunink)">${I.right.replace("<svg", '<svg width="20" height="20"')}</span></button>` : ""}
  <div class="card leave" style="padding:16px 18px">
    <div class="between"><div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">${budget ? "LEFT TO SPEND" : "BALANCE THIS MONTH"}</div>
    <div style="font-size:30px;font-weight:600;font-family:Nunito,Inter,sans-serif;${left < 0 ? "color:#F3B7B7" : ""}">${left < 0 ? "−" : ""}${rm(Math.abs(left))}</div></div>${window.ART.jar(58)}</div>
    ${budget ? `<div class="tiny muted">of ${rm0(budget)} budget</div><div class="bar" style="background:#3E4480;margin-top:8px"><i class="ringless" style="width:${Math.min(100, tt.spent / budget * 100)}%;background:${tt.spent > budget ? "#F3B7B7" : "#F6D86B"}"></i></div>` : ""}
    <div class="between" style="margin-top:14px;font-size:11.5px">
      <div><div class="muted">Income</div><div style="font-size:15px;font-weight:600;color:#BFE3C9">${rm(tt.income)}</div></div>
      <div><div class="muted">Spent</div><div style="font-size:15px;font-weight:600;color:#F3B7B7">${rm(tt.spent)}</div></div>
      <div><div class="muted">Saved</div><div style="font-size:15px;font-weight:600;color:#F6D86B">${rm(tt.saved)}</div></div></div>
  </div>
  ${owed.map(x => `<div class="card between" style="margin-top:10px"><div><div class="small muted">${esc(x.a.name)}</div><div class="h2">${rm(x.owed)} <span class="small muted" style="font-weight:400">owed</span></div></div><button class="btn" data-paycard="${x.a.id}">Pay card</button></div>`).join("")}
  ${bills.length ? `<div class="between"><div class="lbl">Bills due</div><button class="small" style="color:var(--peri)" data-mv="bills">See all</button></div>
    <div class="list">${bills.slice(0, 4).map(x => `<button class="item" style="width:100%;text-align:left" data-bill="${x.b.id}"><div class="grow"><div class="title">${esc(x.b.name)}</div><div class="tiny muted">${x.b.amount ? rm(x.b.amount) : "Amount varies"} · due ${fmtShort(x.due)}</div></div>${billPill(x)}</button>`).join("")}</div>` : ""}
  <div class="between"><div class="lbl">Spending by category</div><span><button class="small" style="color:var(--peri);margin-right:12px" id="mrecap">Recap</button><button class="small" style="color:var(--peri)" id="mbud">Budgets</button></span></div>
  ${cats.length || unc ? `<div class="card">${cats.map(x => `<div style="margin:6px 0 12px"><div class="between small"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CCOL[x.c.color]};margin-right:6px"></span>${esc(x.c.name)}</span><span>${rm(x.spent)}${x.budget ? `<span class="muted"> / ${rm0(x.budget)}</span>` : ""}</span></div>${bar(x.spent, x.budget)}</div>`).join("")}
    ${unc ? `<div class="between small" style="margin:6px 0"><span class="muted">No category yet</span><span>${rm(unc)}</span></div>` : ""}</div>` : '<div class="empty">No spending yet this month.</div>'}
  <div class="between"><div class="lbl">Recent</div>${recent.length ? '<button class="small" style="color:var(--peri)" data-mv="history">See all</button>' : ""}</div>
  ${recent.length ? `<div class="list">${recent.map(txRow).join("")}</div>` : '<div class="empty">Tap + to add income or an expense, or send a screenshot.</div>'}`;
}
function viewHistory() {
  const f = S.histFilter, all = monthTx(S.moneyMonth).filter(t => f === "all" || t.type === f || (f === "saving" && t.type === "card_payment"));
  const days = [...new Set(all.map(t => t.date))];
  return `<div class="paint" style="margin-top:0">${[["all", "All"], ["expense", "Spent"], ["income", "Income"], ["saving", "Saved & card"]].map(([k, l]) => `<button data-hf="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("")}</div>
   ${days.length ? days.map(d => { const a = all.filter(t => t.date === d), sp = sum(a.filter(t => t.type === "expense"));
     return `<div class="between"><div class="lbl">${esc(relDay(d))}</div>${sp ? `<span class="tiny muted" style="margin-top:10px">spent ${rm(sp)}</span>` : ""}</div><div class="list">${a.map(txRow).join("")}</div>`; }).join("") : '<div class="empty">Nothing here for this month.</div>'}`;
}
function viewBills() {
  const list = billsFor(S.moneyMonth), others = S.bills.filter(b => !list.some(x => x.b.id === b.id));
  const total = sum(list, x => x.b.amount), paid = sum(list.filter(x => x.paid), x => x.paid.amount);
  return `<div class="card between"><div><div class="small muted">This month</div><div class="h2">${rm(paid)} paid <span class="muted" style="font-weight:400">of ~${rm(total)}</span></div></div><button class="btn sun" id="addbill">+ Bill</button></div>
    <div class="lbl">Due this month</div>
    ${list.length ? `<div class="list">${list.map(x => `<div class="item"><button class="grow" style="text-align:left" data-bill="${x.b.id}"><div class="title">${esc(x.b.name)}</div><div class="tiny muted">${x.paid ? `paid ${rm(x.paid.amount)} on ${fmtShort(x.paid.date)}` : `${x.b.amount ? rm(x.b.amount) : "Amount varies"} · due ${fmtShort(x.due)}`}</div></button>${x.paid ? billPill(x) : `<button class="btn" style="padding:7px 12px" data-paybill="${x.b.id}">Paid</button>`}</div>`).join("")}</div>` : '<div class="empty">No bills yet. Add the ones you pay every month, like your phone plan.</div>'}
    ${others.length ? `<div class="lbl">Yearly, not due this month</div><div class="list">${others.map(b => `<button class="item" style="width:100%;text-align:left" data-bill="${b.id}"><div class="grow"><div class="title">${esc(b.name)}</div><div class="tiny muted">${MONL[(b.due_month || 1) - 1]} ${b.due_day}${b.amount ? " · " + rm(b.amount) : ""}</div></div></button>`).join("")}</div>` : ""}
    <p class="tiny faint" style="text-align:center;margin-top:14px">Tapping Paid saves the bill as spending, so it counts in your budget.</p>`;
}
function bindMoney() {
  const mv = n => { const [y, m] = S.moneyMonth.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); S.moneyMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; ensureMonth(S.moneyMonth).then(render).catch(fail); };
  $("#mprev").onclick = () => mv(-1); $("#mnext").onclick = () => mv(1);
  $("#msetup").onclick = setupSheet;
  document.querySelectorAll("[data-mv]").forEach(b => b.onclick = () => { S.moneyView = b.dataset.mv; render(); window.scrollTo(0, 0); });
  document.querySelectorAll("[data-hf]").forEach(b => b.onclick = () => { S.histFilter = b.dataset.hf; render(); });
  document.querySelectorAll("[data-tx]").forEach(b => b.onclick = () => txSheet(S.tx.find(t => t.id === b.dataset.tx)));
  document.querySelectorAll("[data-bill]").forEach(b => b.onclick = () => billSheet(S.bills.find(x => x.id === b.dataset.bill)));
  document.querySelectorAll("[data-paybill]").forEach(b => b.onclick = () => payBill(S.bills.find(x => x.id === b.dataset.paybill)));
  document.querySelectorAll("[data-paycard]").forEach(b => b.onclick = () => txSheet(null, { type: "card_payment", to_account_id: b.dataset.paycard, amount: cardOwed().find(x => x.a.id === b.dataset.paycard)?.owed }));
  const r = $("#mreview"); if (r) r.onclick = nextReview;
  const bu = $("#mbud"); if (bu) bu.onclick = budgetSheet;
  const rc = $("#mrecap"); if (rc) rc.onclick = () => window.MD.recapSheet(S.moneyMonth < today().slice(0, 7) ? S.moneyMonth : window.MD.lastMonth());
  const ab = $("#addbill"); if (ab) ab.onclick = () => billSheet(null);
}

/* ---------- add / edit a transaction ---------- */
const chips = (items, sel, attr) => `<div class="paint" style="margin:0">${items.map(([id, l]) => `<button type="button" data-${attr}="${id}" class="${id === sel ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`;
function txSheet(t, preset = {}, opts = {}) {
  const isNew = !t;
  t = t || Object.assign({ type: "expense", amount: "", date: today(), time: null, category_id: null, account_id: S.settings.default_account_id, to_account_id: null, payee: "", note: "" }, preset);
  let st = { ...t };
  const draw = () => {
    const isCardPay = st.type === "card_payment";
    const catList = st.type === "income" ? incCats() : st.type === "expense" ? expCats() : [];
    const fromAcc = S.accounts.filter(a => !isCardPay || a.kind !== "card");
    return `<div class="between"><h2 class="h2">${opts.review ? "Check this expense" : isNew ? "Add money" : "Edit"}</h2>${opts.review ? `<span class="tiny muted">${opts.review}</span>` : ""}</div>
    ${opts.review ? '<p class="small muted" style="margin:4px 0 0">Read from your screenshot. Fix anything that looks wrong.</p>' : ""}
    <div class="seg">${[["expense", "Spent"], ["income", "Income"], ["saving", "Saved"], ["card_payment", "Card bill"]].map(([k, l]) => `<button type="button" data-ty="${k}" class="${st.type === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="field"><label>Amount (RM)</label><input type="number" inputmode="decimal" step="0.01" min="0" id="xa" value="${st.amount === "" || st.amount == null ? "" : Number(st.amount).toFixed(2)}" placeholder="0.00" style="font-size:20px;font-weight:600;height:46px"></div>
    ${catList.length ? `<div class="field"><label>Category</label>${chips(catList.map(c => [c.id, c.name]), st.category_id, "xc")}</div>` : ""}
    <div class="field"><label>${isCardPay ? "Paid from" : st.type === "income" ? "Into" : st.type === "saving" ? "From" : "Paid with"}</label>${chips(fromAcc.map(a => [a.id, a.name]), st.account_id, "xac")}</div>
    ${isCardPay ? `<div class="field"><label>Card</label>${chips(S.accounts.filter(a => a.kind === "card").map(a => [a.id, a.name]), st.to_account_id, "xto")}</div>` : ""}
    ${st.type === "expense" || st.type === "income" ? `<div class="field"><label>${st.type === "income" ? "From" : "Where / who"}</label><input type="text" id="xp" value="${esc(st.payee || "")}" placeholder="${st.type === "income" ? "Salary" : "Kedai kopi"}"></div>` : ""}
    <div class="two"><div class="field"><label>Date</label><input type="date" id="xd" value="${st.date}"></div><div class="field"><label>Time</label><input type="time" id="xt" value="${(st.time || "").slice(0, 5)}"></div></div>
    ${st.type === "saving" && (S.goals || []).some(g => !g.done_at) ? `<div class="field"><label>Towards goal</label>${chips(S.goals.filter(g => !g.done_at || g.id === st.goal_id).map(g => [g.id, g.name]), st.goal_id, "xg")}</div>` : ""}
    <div class="field"><label>Note</label><input type="text" id="xn" value="${esc(st.note || "")}" placeholder="Optional"></div>
    ${opts.review && t.raw_text ? `<details style="margin:-4px 2px 12px"><summary class="tiny muted">What the screenshot said</summary><pre class="tiny muted selectable" style="white-space:pre-wrap">${esc(t.raw_text)}</pre></details>` : ""}
    <div class="err" id="xerr"></div>
    <button class="btn primary block" id="xsave">${opts.review ? "Looks right" : isNew ? "Save" : "Save changes"}</button>
    ${isNew ? "" : `<button class="btn danger block" id="xdel" style="margin-top:8px">${opts.review ? "Not a real expense, delete" : "Delete"}</button>`}`;
  };
  const keep = () => { const v = id => $(id)?.value; st.amount = v("#xa") ?? st.amount; st.payee = v("#xp") ?? st.payee; st.date = v("#xd") || st.date; st.time = v("#xt") || null; st.note = v("#xn") ?? st.note; };
  const mount = sh => {
    sh.querySelectorAll("[data-ty]").forEach(b => b.onclick = () => { keep(); st.type = b.dataset.ty; if (st.type !== "expense" && st.type !== "income") st.category_id = null;
      else if (st.category_id && cat(st.category_id)?.kind !== st.type) st.category_id = null;
      if (st.type === "card_payment") { if (acc(st.account_id)?.kind === "card") st.account_id = S.accounts.find(a => a.kind === "bank")?.id; st.to_account_id = st.to_account_id || S.accounts.find(a => a.kind === "card")?.id; }
      sh.innerHTML = '<div class="grab"></div>' + draw(); mount(sh); });
    sh.querySelectorAll("[data-xc]").forEach(b => b.onclick = () => { st.category_id = st.category_id === b.dataset.xc ? null : b.dataset.xc; sh.querySelectorAll("[data-xc]").forEach(x => x.classList.toggle("on", x.dataset.xc === st.category_id)); });
    sh.querySelectorAll("[data-xac]").forEach(b => b.onclick = () => { st.account_id = b.dataset.xac; sh.querySelectorAll("[data-xac]").forEach(x => x.classList.toggle("on", x === b)); });
    sh.querySelectorAll("[data-xg]").forEach(b => b.onclick = () => { st.goal_id = st.goal_id === b.dataset.xg ? null : b.dataset.xg; sh.querySelectorAll("[data-xg]").forEach(x => x.classList.toggle("on", x.dataset.xg === st.goal_id)); });
    sh.querySelectorAll("[data-xto]").forEach(b => b.onclick = () => { st.to_account_id = b.dataset.xto; sh.querySelectorAll("[data-xto]").forEach(x => x.classList.toggle("on", x === b)); });
    if (isNew) setTimeout(() => $("#xa")?.focus(), 50);
    $("#xsave").onclick = async () => {
      keep();
      const amount = Math.round(Number(st.amount) * 100) / 100;
      if (!(amount > 0)) { $("#xerr").textContent = "Enter an amount."; return; }
      if (st.type === "card_payment" && !st.to_account_id) { $("#xerr").textContent = "Pick the card you paid."; return; }
      const o = { type: st.type, amount, date: st.date, time: st.time, category_id: st.category_id, account_id: st.account_id || null,
        to_account_id: st.type === "card_payment" ? st.to_account_id : null, goal_id: st.type === "saving" ? (st.goal_id || null) : null, payee: (st.type === "expense" || st.type === "income") ? (st.payee || "").trim() || null : null, note: (st.note || "").trim() || null, needs_review: false };
      try {
        if (isNew) S.tx.unshift(await db.insert("myday_transactions", { ...o, source: "manual" }));
        else Object.assign(t, await db.update("myday_transactions", t.id, o));
        if (o.type === "expense" && o.payee && (o.category_id || o.account_id)) learn(o.payee, o.category_id, o.account_id);
        S.tx.sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));
        if (window.MD.refreshGoalTx && (o.goal_id || t.goal_id)) await window.MD.refreshGoalTx();
        if (o.goal_id) { const g = (S.goals || []).find(k => k.id === o.goal_id); if (g && window.MD.goalSaved(g) >= g.target && window.MD.goalSaved(g) - amount < g.target) { setTimeout(() => { window.ART.confetti(null, 30); toast(`You reached ${g.name}!`); }, 350); } }
        closeSheet(); render();
        if (opts.review) nextReview(); else if (!(o.goal_id)) toast(isNew ? "Saved" : "Changes saved");
      } catch (e) { fail(e); }
    };
    const del = $("#xdel"); if (del) del.onclick = async () => {
      try { await db.remove("myday_transactions", t.id); S.tx = S.tx.filter(x => x.id !== t.id); if (t.goal_id && window.MD.refreshGoalTx) await window.MD.refreshGoalTx(); closeSheet(); render();
        toast("Deleted", async () => { S.tx.unshift(await db.restore("myday_transactions", t.id)); S.tx.sort((a, b) => b.date.localeCompare(a.date)); render(); });
        if (opts.review) setTimeout(nextReview, 300); } catch (e) { fail(e); }
    };
  };
  openSheet(draw(), mount);
}
function nextReview() {
  const q = S.tx.filter(t => t.needs_review).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!q.length) { toast("All checked"); return; }
  txSheet(q[0], {}, { review: `${q.length} left` });
}
function learn(payee, category_id, account_id) {
  const payee_key = payee.toLowerCase().replace(/\s+/g, " ").trim();
  rest("POST", "myday_payee_rules?on_conflict=user_id,payee_key", { payee_key, category_id, account_id, updated_at: nowIso() }, "resolution=merge-duplicates,return=representation")
    .then(r => { S.rules = S.rules.filter(x => x.payee_key !== payee_key).concat(r); }).catch(() => {});
}
window.MD.txSheet = txSheet;

/* ---------- bills ---------- */
function billSheet(b) {
  const isNew = !b; b = b || { name: "", amount: "", due_day: 15, frequency: "monthly", due_month: null, category_id: expCats().find(c => c.name === "Bills")?.id || null, account_id: S.settings.default_account_id };
  let fr = b.frequency, cid = b.category_id, aid = b.account_id;
  openSheet(`<h2 class="h2" style="margin-bottom:14px">${isNew ? "Add a bill" : "Edit bill"}</h2>
    <div class="field"><label>Bill</label><input type="text" id="bn" value="${esc(b.name)}" placeholder="Phone plan"></div>
    <div class="two"><div class="field"><label>Usual amount (RM)</label><input type="number" inputmode="decimal" step="0.01" id="ba" value="${b.amount ?? ""}" placeholder="Leave empty if it varies"></div>
    <div class="field"><label>Due day of month</label><input type="number" min="1" max="31" id="bd" value="${b.due_day}"></div></div>
    <div class="field"><label>How often</label>${chips([["monthly", "Every month"], ["yearly", "Once a year"]], fr, "bf")}</div>
    <div class="field" id="bmw" style="${fr === "yearly" ? "" : "display:none"}"><label>Month</label><select id="bm">${MONL.map((n, i) => `<option value="${i + 1}" ${b.due_month === i + 1 ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="field"><label>Category</label>${chips(expCats().map(c => [c.id, c.name]), cid, "bc")}</div>
    <div class="field"><label>Usually paid with</label>${chips(S.accounts.map(a => [a.id, a.name]), aid, "bac")}</div>
    <div class="err" id="berr"></div>
    <button class="btn primary block" id="bsave">${isNew ? "Add bill" : "Save"}</button>
    ${isNew ? "" : '<div class="btnrow" style="margin-top:8px"><button class="btn" id="bpay">Mark paid</button><button class="btn danger" id="bdel">Delete</button></div>'}`, sh => {
    sh.querySelectorAll("[data-bf]").forEach(x => x.onclick = () => { fr = x.dataset.bf; sh.querySelectorAll("[data-bf]").forEach(y => y.classList.toggle("on", y === x)); $("#bmw").style.display = fr === "yearly" ? "" : "none"; });
    sh.querySelectorAll("[data-bc]").forEach(x => x.onclick = () => { cid = x.dataset.bc; sh.querySelectorAll("[data-bc]").forEach(y => y.classList.toggle("on", y === x)); });
    sh.querySelectorAll("[data-bac]").forEach(x => x.onclick = () => { aid = x.dataset.bac; sh.querySelectorAll("[data-bac]").forEach(y => y.classList.toggle("on", y === x)); });
    $("#bsave").onclick = async () => {
      const o = { name: $("#bn").value.trim(), amount: $("#ba").value === "" ? null : Number($("#ba").value), due_day: Math.max(1, Math.min(31, Number($("#bd").value) || 1)), frequency: fr, due_month: fr === "yearly" ? Number($("#bm").value) : null, category_id: cid, account_id: aid };
      if (!o.name) { $("#berr").textContent = "Give the bill a name."; return; }
      try { if (isNew) S.bills.push(await db.insert("myday_bills", o)); else Object.assign(b, await db.update("myday_bills", b.id, o));
        S.bills.sort((x, y) => x.due_day - y.due_day); closeSheet(); render(); toast(isNew ? "Bill added" : "Bill saved"); } catch (e) { fail(e); }
    };
    const p = $("#bpay"); if (p) p.onclick = () => payBill(b);
    const d = $("#bdel"); if (d) d.onclick = async () => { try { await db.remove("myday_bills", b.id); S.bills = S.bills.filter(x => x.id !== b.id); closeSheet(); render();
      toast("Bill deleted", async () => { S.bills.push(await db.restore("myday_bills", b.id)); render(); }); } catch (e) { fail(e); } };
  });
}
function payBill(b) {
  const m = S.moneyView === "bills" || S.tab === "money" ? S.moneyMonth : today().slice(0, 7);
  if (S.tx.some(x => x.bill_id === b.id && x.bill_period === m)) { toast("Already marked paid for this month"); return; }
  let aid = b.account_id || S.settings.default_account_id;
  openSheet(`<h2 class="h2">Paid ${esc(b.name)}</h2><p class="small muted" style="margin:4px 0 14px">This saves it as spending for ${MONL[Number(m.slice(5)) - 1]}.</p>
    <div class="field"><label>Amount (RM)</label><input type="number" inputmode="decimal" step="0.01" id="pa" value="${b.amount ?? ""}" placeholder="0.00"></div>
    <div class="field"><label>Paid with</label>${chips(S.accounts.map(a => [a.id, a.name]), aid, "pac")}</div>
    <div class="field"><label>Date paid</label><input type="date" id="pd" value="${m === today().slice(0, 7) ? today() : billsFor(m).find(x => x.b.id === b.id)?.due || today()}"></div>
    <div class="err" id="perr2"></div><button class="btn primary block" id="pok">Save</button>`, sh => {
    sh.querySelectorAll("[data-pac]").forEach(x => x.onclick = () => { aid = x.dataset.pac; sh.querySelectorAll("[data-pac]").forEach(y => y.classList.toggle("on", y === x)); });
    $("#pok").onclick = async () => {
      const amount = Math.round(Number($("#pa").value) * 100) / 100; if (!(amount > 0)) { $("#perr2").textContent = "Enter how much you paid."; return; }
      try { S.tx.unshift(await db.insert("myday_transactions", { type: "expense", amount, date: $("#pd").value, category_id: b.category_id, account_id: aid, payee: b.name, source: "bill", bill_id: b.id, bill_period: m }));
        S.tx.sort((x, y) => y.date.localeCompare(x.date)); closeSheet(); render(); toast(`${b.name} marked paid`); } catch (e) { fail(e); }
    };
  });
}

/* ---------- budgets, accounts, shortcut ---------- */
function budgetSheet() {
  const list = expCats();
  openSheet(`<h2 class="h2">Budgets</h2><p class="small muted" style="margin:4px 0 14px">Set a monthly limit for the whole month and for any category. Leave empty for no limit.</p>
    <div class="field"><label>Whole month (RM)</label><input type="number" inputmode="decimal" id="ob" value="${S.settings.monthly_budget ?? ""}" placeholder="No limit"></div>
    <div class="list">${list.map(c => `<div class="item"><span style="width:10px;height:10px;border-radius:50%;background:${CCOL[c.color]}"></span><div class="grow">${esc(c.name)}</div><input type="number" inputmode="decimal" data-cb="${c.id}" value="${c.budget ?? ""}" placeholder="—" style="width:110px;padding:7px 10px;text-align:right"></div>`).join("")}</div>
    <button class="btn primary block" id="bsv" style="margin-top:14px">Save budgets</button>`, sh => {
    $("#bsv").onclick = async () => {
      try {
        const ob = $("#ob").value === "" ? null : Number($("#ob").value);
        S.settings = (await rest("PATCH", `myday_settings?user_id=eq.${S.settings.user_id}`, { monthly_budget: ob }))[0];
        for (const inp of sh.querySelectorAll("[data-cb]")) {
          const c = cat(inp.dataset.cb), v = inp.value === "" ? null : Number(inp.value);
          if ((c.budget == null ? null : Number(c.budget)) !== v) Object.assign(c, await db.update("myday_categories", c.id, { budget: v }));
        }
        closeSheet(); render(); toast("Budgets saved");
      } catch (e) { fail(e); }
    };
  });
}
function setupSheet() {
  const row = c => `<div class="item"><span style="width:10px;height:10px;border-radius:50%;flex:none;background:${CCOL[c.color]}"></span><div class="grow"><input type="text" value="${esc(c.name)}" data-rn="${c.id}" style="height:34px"></div>
     <select data-cc="${c.id}" style="width:96px;height:34px;line-height:34px">${Object.keys(CCOL).map(k => `<option ${c.color === k ? "selected" : ""}>${k}</option>`).join("")}</select>
     <button class="x" data-rd="${c.id}" aria-label="Remove">×</button></div>`;
  openSheet(`<div class="row" style="margin-bottom:4px">${window.ART.jar(44)}<h2 class="h2">Categories</h2></div>
    <p class="small muted" style="margin:0 2px">Rename, recolour, add or remove the categories you pick when adding money.</p>
    <div class="lbl">Spending</div><div class="list">${expCats().map(row).join("")}</div>
    <button class="addline" id="addc">+ Add spending category</button>
    <div class="lbl">Income</div><div class="list">${incCats().map(row).join("")}</div>
    <button class="addline" id="addi">+ Add income category</button>`, sh => {
    sh.querySelectorAll("[data-rn]").forEach(inp => inp.onchange = async () => { const id = inp.dataset.rn, v = inp.value.trim(); if (!v) return;
      try { Object.assign(cat(id), await db.update("myday_categories", id, { name: v })); toast("Renamed"); } catch (e) { fail(e); } });
    sh.querySelectorAll("[data-cc]").forEach(x => x.onchange = async () => { try { Object.assign(cat(x.dataset.cc), await db.update("myday_categories", x.dataset.cc, { color: x.value })); setupSheet(); } catch (e) { fail(e); } });
    sh.querySelectorAll("[data-rd]").forEach(b => b.onclick = async () => { const id = b.dataset.rd;
      try { await db.remove("myday_categories", id); S.categories = S.categories.filter(x => x.id !== id); setupSheet();
        toast("Removed", async () => { S.categories.push(await db.restore("myday_categories", id)); setupSheet(); }); } catch (e) { fail(e); } });
    const add = async o => { try { S.categories.push(await db.insert("myday_categories", o)); setupSheet(); } catch (e) { fail(e); } };
    $("#addc").onclick = () => add({ name: "New category", kind: "expense", sort: 50 });
    $("#addi").onclick = () => add({ name: "New income", kind: "income", sort: 50 });
  });
}

window.MD.ensureMonth = ensureMonth;
window.MD.views.money = viewMoney;
window.MD.binds.money = bindMoney;
})();
