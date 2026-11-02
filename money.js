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
/* money runs pay day to pay day: S.moneyFrom is the start of the period on screen */
const nextMonth = m => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const monthEnd = m => { const [y, mo] = m.split("-").map(Number); return `${m}-${pad(new Date(y, mo, 0).getDate())}`; };
function periodOf(d) {
  const L = (S.payDates || []).map(p => p.date).sort(); let from = null, next = null;
  for (const x of L) { if (x <= d) from = x; else { next = x; break; } }
  if (!from) { const m = d.slice(0, 7), end = monthEnd(m); return { from: `${m}-01`, to: next && next <= end ? addDays(next, -1) : end }; }
  return { from, to: next ? addDays(next, -1) : null };
}
const curPeriod = () => periodOf(today());
const P = () => periodOf(S.moneyFrom || today());
const inP = (p, d) => d >= p.from && (!p.to || d <= p.to);
const periodTx = p => S.tx.filter(t => inP(p, t.date));
const fmtP = p => `${fmtShort(p.from).replace(/^\w+ /, "")} – ${p.to ? fmtShort(p.to).replace(/^\w+ /, "") : "next pay day"}`;
window.MD.periodOf = periodOf;
window.MD.SPEND_GROUPS = { fixed: ["Fixed", "#8E92E0"], commitment: ["Commitments", "#2B3060"], subscription: ["Subscriptions", "#E8A0A0"], everyday: ["Everyday", "#9CBBA4"], lifestyle: ["Lifestyle", "#F2C94C"] };
window.MD.payLeft = p => payMath(p); window.MD.fmtPeriod = p => fmtP(p);
S.moneyFrom = S.moneyFrom || null;
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
  S.savingTx = await db.list("myday_transactions", "type=eq.saving&select=id,amount,to_account_id,date");
  const from = monthsBack(3), cards = acc.filter(a => a.kind === "card").map(a => a.id);
  const cardQ = cards.length ? `,account_id.in.(${cards}),to_account_id.in.(${cards})` : "";
  S.payDates = await db.list("myday_pay_dates", "order=date");
  S.tx = await db.list("myday_transactions", `or=(date.gte.${from},needs_review.is.true${cardQ})&order=date.desc,time.desc.nullslast,created_at.desc`);
  S.txFrom = from.slice(0, 7);
  await autoCharge();
}
// card subscriptions and installments: add them by themselves once their date arrives
let charging = false;
async function autoCharge() {
  if (charging) return; charging = true;
  try { await doAutoCharge(); } finally { charging = false; }
}
async function doAutoCharge() {
  const m = today().slice(0, 7), list = billsFor(m).filter(x => x.b.auto_pay && !x.paid && x.due <= today() && (!x.b.auto_from || x.due >= x.b.auto_from));
  for (const x of list) {
    try { const n = instNo(x.b, m);
      S.tx.unshift(await db.insert("myday_transactions", { type: "expense", amount: Number(x.b.amount), date: x.due, category_id: x.b.category_id, account_id: x.b.account_id, payee: x.b.name, note: n ? `Installment ${n} of ${x.b.installments_total}` : null, source: "bill", bill_id: x.b.id, bill_period: m }));
    } catch (e) { console.warn("auto charge failed", e); }
  }
  if (list.length) S.tx.sort((a, b) => b.date.localeCompare(a.date));
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
function totals(p) {
  const t = periodTx(p);
  return { income: sum(t.filter(x => x.type === "income")), spent: sum(t.filter(x => x.type === "expense")), saved: sum(t.filter(x => x.type === "saving")) };
}
const savingsAccounts = () => S.accounts.filter(a => a.kind === "savings");
const savingsBalance = a => Number(a.opening_balance || 0) + (S.savingTx || []).filter(t => t.to_account_id === a.id).reduce((s, t) => s + Number(t.amount), 0);
window.MD.savingsAccounts = () => savingsAccounts().map(a => ({ a, balance: savingsBalance(a) }));
async function refreshSaving() { S.savingTx = await db.list("myday_transactions", "type=eq.saving&select=id,amount,to_account_id,date"); }
// bank / cash balance: the balance you gave, plus everything recorded after that moment
function accBalance(a) {
  if (!a.balance_set_at) return null;
  const since = S.tx.filter(t => t.created_at >= a.balance_set_at);
  let b = Number(a.opening_balance || 0);
  since.forEach(t => {
    const amt = Number(t.amount);
    if ((t.type === "income" || t.type === "collect") && t.account_id === a.id) b += amt;
    if (t.type === "passthrough" && t.account_id === a.id) b -= amt;
    if ((t.type === "expense" || t.type === "saving" || t.type === "card_payment") && t.account_id === a.id) b -= amt;
  });
  return b;
}
function cardOwed() {
  return S.accounts.filter(a => a.kind === "card").map(a => ({ a, owed: Number(a.opening_balance || 0) + sum(S.tx.filter(t => t.type === "expense" && t.account_id === a.id)) - sum(S.tx.filter(t => t.type === "card_payment" && t.to_account_id === a.id)) }));
}
// money still to be billed on a card from instalment plans (the bank blocks it from your limit)
function instLeft(card) {
  const m = today().slice(0, 7);
  return S.bills.filter(b => b.account_id === card.id && b.installments_total && b.installment_first).reduce((s, b) => {
    const n = instNo(b, m), billed = S.tx.some(x => x.bill_id === b.id && x.bill_period === m && x.type === "expense");
    const left = Math.max(0, Math.min(b.installments_total, b.installments_total - n + (billed ? 0 : 1)));
    return s + left * Number(b.amount || 0); }, 0);
}
// shares other people paid you that haven't gone out to the bill yet: not your money
function heldForOthers() {
  let h = 0;
  S.accounts.forEach(a => { if (!a.balance_set_at) return;
    S.tx.filter(t => t.created_at >= a.balance_set_at && t.account_id === a.id).forEach(t => { if (t.type === "collect") h += Number(t.amount); if (t.type === "passthrough") h -= Number(t.amount); }); });
  return Math.max(0, h);
}
const ACOL = a => /cimb/i.test(a.name) ? "#C8102E" : /maybank/i.test(a.name) ? "#F6C500" : a.kind === "savings" ? "#7FA38A" : "var(--peri)";
function totalCard() {
  const banks = S.accounts.filter(a => a.kind !== "savings" && a.kind !== "card" && accBalance(a) !== null).map(a => ({ a, bal: accBalance(a) }));
  const sav = savingsAccounts().map(a => ({ a, bal: savingsBalance(a), sav: true }));
  const all = [...banks, ...sav]; if (!all.length) return "";
  const held = heldForOthers(), total = all.reduce((s, x) => s + x.bal, 0) - held;
  const owed = cardOwed().reduce((s, x) => s + Math.max(0, x.owed), 0);
  const pos = all.filter(x => x.bal > 0), ptot = pos.reduce((s, x) => s + x.bal, 0) || 1, pp = curPeriod(), open = !!S.totalOpen;
  return `<div class="card totalcard small-tc ${open ? "open" : ""}">
    <button class="tc-head" id="mtotal"><span class="grow"><span class="tiny muted">All accounts</span><br><b class="tc-num">${total < 0 ? "−" : ""}${rm(Math.abs(total))}</b>${owed ? `<span class="tiny muted"> · after card ${rm(total - owed)}</span>` : ""}</span>
      <span class="tc-mini">${pos.map(x => `<i style="flex:${x.bal / ptot};background:${ACOL(x.a)}"></i>`).join("")}</span><span class="tc-chev">${I.right}</span></button>
    ${open ? `<div class="segbar">${pos.map(x => `<i style="width:${x.bal / ptot * 100}%;background:${ACOL(x.a)}"></i>`).join("")}</div>
    <div class="acclegend">${all.map(x => `<${x.sav ? `button data-savacc="${x.a.id}"` : "div"} class="accrow"><span class="accdot" style="background:${ACOL(x.a)}"></span><span class="grow small">${esc(x.a.name)}${x.sav ? (s => s ? ` <span class="tiny muted">· +${rm0(s)} this pay</span>` : "")(sum(periodTx(pp).filter(t => t.type === "saving" && t.to_account_id === x.a.id))) : ""}</span><b class="small ${x.bal < 0 ? "neg" : ""}">${x.bal < 0 ? "−" : ""}${rm(Math.abs(x.bal))}</b></${x.sav ? "button" : "div"}>`).join("")}</div>
    ${held ? `<div class="tiny muted" style="margin-top:6px">${rm(held)} from others for shared bills isn't counted.</div>` : ""}` : ""}
  </div>`;
}
// what's left from a pay: salary (+ what was left from the pay before) − bank spending − savings − card payments
function payMath(p, depth = 0) {
  const tx = periodTx(p), isCard = t => acc(t.account_id)?.kind === "card";
  const income = sum(tx.filter(t => t.type === "income")), bankSpent = sum(tx.filter(t => t.type === "expense" && !isCard(t)));
  const cardSpent = sum(tx.filter(t => t.type === "expense" && isCard(t))), saved = sum(tx.filter(t => t.type === "saving"));
  const cardPaid = sum(tx.filter(t => t.type === "card_payment"));
  let carry = 0;
  if (depth < 6 && p.from > (S.txFrom || "") + "-01") { const pp = periodOf(addDays(p.from, -1)); if (periodTx(pp).some(t => t.type === "income")) carry = Math.max(0, payMath(pp, depth + 1).left); }
  return { tx, income, bankSpent, cardSpent, saved, cardPaid, carry, left: income + carry - bankSpent - saved - cardPaid };
}
window.MD.lastPayLeft = () => { const p = curPeriod(); return payMath(p).carry; };
// the main card: what's left from this salary, then after bills and the credit card
function payCard(p) {
  const { tx, income, bankSpent, cardSpent, saved, cardPaid, carry, left } = payMath(p), cur = p.from === curPeriod().from;
  const todo = cur ? billsInPeriod(p).filter(x => !x.paid) : [], still = sum(todo, myPart);
  const owed = cur ? cardOwed().reduce((s, x) => s + Math.max(0, x.owed), 0) : 0, after = left - still - owed;
  const used = income + carry ? Math.min(1, Math.max(0, (income + carry - Math.max(0, after)) / (income + carry))) : 0;
  const budget = Number(S.settings.monthly_budget || 0), allSpent = bankSpent + cardSpent;
  const neg = n => n < 0 ? "color:#F3B7B7" : "";
  const row = (l, v, sign = "−", extra = "") => `<div class="pc-row"><span>${l}</span><b>${sign} ${rm(v)}</b></div>${extra}`;
  return `<div class="card leave paycard">
    <div class="between"><div><div class="lbl" style="margin:0 0 4px;color:var(--navytext)">LEFT FROM THIS PAY</div>
      <div class="pc-big" style="${neg(left)}">${left < 0 ? "−" : ""}${rm(Math.abs(left))}</div>
      <div class="tiny" style="color:var(--navytext)">${income ? `of ${rm(income)} ${tx.some(t => t.type === "income" && /salary/i.test(t.payee || cat(t.category_id)?.name || "")) ? "salary" : "income"}` : "No salary recorded for this pay period yet"}</div></div>${window.ART.jar(54)}</div>
    ${income + carry ? `<div class="bar" style="background:#3E4480;margin-top:10px"><i class="ringless" style="width:${used * 100}%;background:${after < 0 ? "#F3B7B7" : "#F6D86B"}"></i></div>` : ""}
    <div class="pc-rows">
      ${carry ? row("Left from last pay", carry, "+") : ""}${row("Spent from bank", bankSpent)}${row("Saved", saved)}${cardPaid ? row("Card paid", cardPaid) : ""}
      ${cur ? `<div class="pc-line"></div>
      <button class="pc-row pc-btn" id="mstill"><span>Bills still to pay${todo.length ? ` · ${todo.length}` : ""} ${I.right.replace("<svg", '<svg width="12" height="12"')}</span><b>− ${rm(still)}</b></button>
      ${row("Credit card", owed)}
      <div class="pc-after"><span>After bills &amp; card</span><b style="${neg(after)}">${after < 0 ? "−" : ""}${rm(Math.abs(after))}</b></div>` : ""}
      ${budget ? `<div class="pc-note">Budget: ${rm(Math.max(0, budget - allSpent))} left of ${rm0(budget)}</div>` : ""}
    </div>
  </div>`;
}
function cardTile(x) {
  const lim = Number(x.a.credit_limit || 0), inst = instLeft(x.a), used = Math.max(0, x.owed) + inst, avail = lim - used;
  return `<div class="card cardtile" style="margin-top:10px">
    <div class="between"><div><div class="small muted">${esc(x.a.name)}</div><div class="h2">${rm(x.owed)} <span class="small muted" style="font-weight:400">owed</span></div></div><button class="btn" data-paycard="${x.a.id}">Pay card</button></div>
    ${lim ? `<div class="limbar"><i class="lo" style="width:${Math.min(100, Math.max(0, x.owed) / lim * 100)}%"></i><i class="li" style="width:${Math.min(100, inst / lim * 100)}%"></i></div>
    <div class="between tiny"><span><span class="accdot" style="background:#E8A0A0"></span> Owed ${rm0(Math.max(0, x.owed))}${inst ? ` <span class="accdot" style="background:#C9CBF3;margin-left:6px"></span> Instalments left ${rm0(inst)}` : ""}</span></div>
    <div class="small" style="margin-top:6px">Available <b>${rm(avail)}</b> <span class="muted">of ${rm0(lim)}</span></div>` : ""}
  </div>`;
}
// installments: which number this month is (e.g. 6 of 36), or null when outside the plan
function instNo(b, m) {
  if (!b.installments_total || !b.installment_first) return null;
  const [fy, fm] = b.installment_first.split("-").map(Number), [y, mo] = m.split("-").map(Number);
  return (y - fy) * 12 + (mo - fm) + 1;
}
const inPlan = (b, m) => { const n = instNo(b, m); return n === null || (n >= 1 && n <= b.installments_total); };
function billsFor(m) {
  const [y, mo] = m.split("-").map(Number), dim = new Date(y, mo, 0).getDate(), t = today();
  return S.bills.filter(b => (b.frequency === "monthly" || b.due_month === mo) && inPlan(b, m)).map(b => {
    const pd = b.due_on_payday ? (S.payDates || []).find(p => p.date.startsWith(m))?.date : null;
    const due = pd || `${m}-${pad(Math.min(b.due_day, dim))}`;
    const paid = S.tx.find(x => x.bill_id === b.id && x.bill_period === m && x.type === "expense");
    const pass = S.tx.find(x => x.bill_id === b.id && x.bill_period === m && x.type === "passthrough");
    const coll = (b.people || []).map(name => ({ name, tx: S.tx.find(x => x.bill_id === b.id && x.bill_period === m && x.type === "collect" && x.payee === name) }));
    const days = Math.round((parse(due) - parse(t)) / 864e5);
    const status = paid ? "paid" : days < 0 ? "late" : days <= 7 ? "soon" : "later";
    return { b, due, paid, pass, coll, days, status, m };
  }).sort((a, b) => a.due.localeCompare(b.due));
}
// bills whose due date falls inside a pay period (a period can touch two calendar months)
function billsInPeriod(p) {
  const end = p.to || addDays(p.from, 31), out = [];
  for (let m = p.from.slice(0, 7); m <= end.slice(0, 7); m = nextMonth(m)) out.push(...billsFor(m));
  return out.filter(x => x.due >= p.from && x.due <= end).sort((a, b) => a.due.localeCompare(b.due));
}
const myPart = x => (x.b.people || []).length ? Number(x.b.share_amount || 0) : Number(x.b.amount || 0);
const billMonth = b => (S.tab === "money" ? billsInPeriod(P()).find(x => x.b.id === b.id)?.m : null) || curMonth();
const billPill = x => x.status === "paid" ? `<span class="pill sage">Paid</span>` : x.status === "late" ? `<span class="pill rose">${-x.days} day${x.days === -1 ? "" : "s"} late</span>` : x.status === "soon" ? `<span class="pill warn">${x.days === 0 ? "Today" : x.days === 1 ? "Tomorrow" : `in ${x.days} days`}</span>` : `<span class="pill">${fmtShort(x.due)}</span>`;
window.MD.moneyToday = () => sum(S.tx.filter(t => t.type === "expense" && t.date === today()));
window.MD.billsDueSoon = () => { const w = new Set(rentWaiting().map(r => r.x.b.id)); return billsFor(curMonth()).filter(x => (x.status === "late" || x.status === "soon") && !w.has(x.b.id)); };

/* ---------- views ---------- */
function txRow(t) {
  const c = cat(t.category_id), a = acc(t.account_id);
  if (t.type === "collect" || t.type === "passthrough") {
    const bl = S.bills.find(x => x.id === t.bill_id);
    return `<button class="item" style="width:100%;text-align:left" data-tx="${t.id}"><span style="width:10px;height:10px;border-radius:50%;flex:none;background:var(--lav2)"></span>
      <div class="grow"><div class="title">${t.type === "collect" ? `${esc(t.payee || "")} paid you` : `${esc(bl?.name || "Bill")}: others' shares`}</div><div class="tiny muted">${esc(bl?.name || "")} · ${esc(a?.name || "")} · not counted as income or spending</div></div>
      <span style="font-weight:600;color:var(--ink2)">${t.type === "collect" ? "+" : "−"} ${rm(t.amount)}</span></button>`;
  }
  const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "→";
  const col = t.type === "income" ? "color:var(--sageink)" : t.type === "saving" || t.type === "card_payment" ? "color:var(--sunink)" : "";
  const title = t.type === "card_payment" ? `Paid ${acc(t.to_account_id)?.name || "card"}` : t.type === "saving" ? ((S.goals || []).find(g => g.id === t.goal_id)?.name || t.note || "Savings") : (t.payee || c?.name || "Expense");
  const sub = [t.type === "saving" ? "Saved" : c?.name, t.type === "saving" && t.to_account_id ? `${a?.name || ""} → ${acc(t.to_account_id)?.name || ""}` : a?.name, t.time ? t.time.slice(0, 5) : ""].filter(Boolean).join(" · ");
  return `<button class="item" style="width:100%;text-align:left" data-tx="${t.id}">
    <span style="width:10px;height:10px;border-radius:50%;flex:none;background:${c ? CCOL[c.color] : "var(--lav2)"}"></span>
    <div class="grow"><div class="title">${esc(title)}${t.needs_review ? ' <span class="pill warn">check me</span>' : ""}</div><div class="tiny muted">${esc(sub)}</div></div>
    <span style="font-weight:600;${col}">${sign} ${rm(t.amount)}</span></button>`;
}
function monthHeader() {
  const p = P(), cur = p.from === curPeriod().from;
  return `<div class="top"><div><h1 class="h1">Money</h1><div class="small muted">${fmtP(p)}${cur ? " · so far" : ""}</div></div>
    <div class="row"><button class="iconbtn" id="mprev" aria-label="Previous pay period">${I.left}</button><button class="iconbtn" id="mnext" aria-label="Next pay period" ${p.to ? "" : "disabled style=\"opacity:.35\""}>${I.right}</button><button class="iconbtn" id="msetup" aria-label="Categories">${I.gear}</button></div></div>
    <div class="seg" style="margin-top:4px">${[["overview", "Overview"], ["history", "History"], ["bills", "Bills"]].map(([k, l]) => `<button data-mv="${k}" class="${S.moneyView === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
}
function viewMoney() {
  if (S.moneyLoading) return monthHeader() + window.MD_loader("Counting your coins…");
  return monthHeader() + ({ overview: viewOverview, history: viewHistory, bills: viewBills }[S.moneyView])();
}
function viewOverview() {
  const p = P(), tt = totals(p), budget = Number(S.settings.monthly_budget || 0);
  const review = S.tx.filter(t => t.needs_review);
  const spentOnly = !budget && !tt.income;  // no income or budget yet: just show what you've spent
  const left = budget ? budget - tt.spent : spentOnly ? tt.spent : tt.income - tt.spent - tt.saved;
  const owed = cardOwed().filter(x => Math.abs(x.owed) > 0.004);
  const bills = billsInPeriod(p).filter(x => x.status !== "paid");
  const cats = expCats().map(c => ({ c, spent: sum(periodTx(p).filter(t => t.type === "expense" && t.category_id === c.id)), budget: Number(c.budget || 0) }))
    .filter(x => x.spent || x.budget).sort((a, b) => b.spent - a.spent);
  const unc = sum(periodTx(p).filter(t => t.type === "expense" && !t.category_id));
  const bar = (spent, bud) => { const p = bud ? spent / bud : 0, col = !bud ? "var(--lav2)" : p > 1 ? "#D86A6A" : p > .8 ? "#E5B93A" : "var(--peri)";
    return `<div class="bar"><i style="width:${bud ? Math.min(100, p * 100) : 100}%;background:${col}"></i></div>`; };
  const recent = periodTx(p).slice(0, 6);
  return `
  ${review.length ? `<button class="card between" id="mreview" style="width:100%;text-align:left;background:var(--sunbg);border:none;margin-bottom:12px"><div><div class="h2" style="color:var(--sunink)">${review.length} to check</div><div class="small" style="color:var(--sunink)">Saved from your screenshots. Tap to confirm.</div></div><span style="color:var(--sunink)">${I.right.replace("<svg", '<svg width="20" height="20"')}</span></button>` : ""}
  ${payCard(p)}
  ${totalCard()}
  <div class="mact">${[["expense", "Spent", I.coin, "var(--rosebg)"], ["income", "Income", I.plus, "var(--sagebg)"], ["saving", "Saved", I.target || I.plus, "var(--sunbg)"]].map(([k, l, ic, bg]) => `<button data-madd="${k}"><span class="qi" style="background:${bg}">${ic}</span>${l}</button>`).join("")}</div>
  ${owed.map(cardTile).join("")}
  ${bills.length ? `<div class="between"><div class="lbl">Bills due</div><button class="small" style="color:var(--peri)" data-mv="bills">See all</button></div>
    <div class="list">${bills.slice(0, 4).map(x => `<button class="item" style="width:100%;text-align:left" data-bill="${x.b.id}"><div class="grow"><div class="title">${esc(x.b.name)}</div><div class="tiny muted">${x.b.amount ? rm(x.b.amount) : "Amount varies"} · due ${fmtShort(x.due)}${(x.b.people || []).length ? ` · collected ${x.coll.filter(c => c.tx).length}/${x.coll.length}` : ""}</div></div>${billPill(x)}</button>`).join("")}</div>` : ""}
  <div class="between"><div class="lbl">Spending by category</div><span><button class="small" style="color:var(--peri);margin-right:12px" id="mrecap">Recap</button><button class="small" style="color:var(--peri)" id="mbud">Budgets</button></span></div>
  ${cats.length || unc ? `<div class="card">${cats.map(x => `<div style="margin:6px 0 12px"><div class="between small"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${CCOL[x.c.color]};margin-right:6px"></span>${esc(x.c.name)}</span><span>${rm(x.spent)}${x.budget ? `<span class="muted"> / ${rm0(x.budget)}</span>` : ""}</span></div>${bar(x.spent, x.budget)}</div>`).join("")}
    ${unc ? `<div class="between small" style="margin:6px 0"><span class="muted">No category yet</span><span>${rm(unc)}</span></div>` : ""}</div>` : '<div class="empty">No spending yet this pay period.</div>'}
  <div class="between"><div class="lbl">Recent</div>${recent.length ? '<button class="small" style="color:var(--peri)" data-mv="history">See all</button>' : ""}</div>
  ${recent.length ? `<div class="list">${recent.map(txRow).join("")}</div>` : '<div class="empty">Use the buttons above to add spending or income, or send a screenshot.</div>'}`;
}
function viewHistory() {
  const f = S.histFilter, all = periodTx(P()).filter(t => f === "all" || t.type === f || (f === "saving" && t.type === "card_payment"));
  const days = [...new Set(all.map(t => t.date))];
  return `<div class="paint" style="margin-top:0">${[["all", "All"], ["expense", "Spent"], ["income", "Income"], ["saving", "Saved & card"]].map(([k, l]) => `<button data-hf="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("")}</div>
   ${days.length ? days.map(d => { const a = all.filter(t => t.date === d), sp = sum(a.filter(t => t.type === "expense"));
     return `<div class="between"><div class="lbl">${esc(relDay(d))}</div>${sp ? `<span class="tiny muted" style="margin-top:10px">spent ${rm(sp)}</span>` : ""}</div><div class="list">${a.map(txRow).join("")}</div>`; }).join("") : '<div class="empty">Nothing here for this pay period.</div>'}`;
}
function sharedBlock(x) {
  const b = x.b, share = Number(b.share_amount || 0), got = x.coll.filter(c => c.tx).length, need = x.coll.length;
  const gotAmt = sum(x.coll.filter(c => c.tx), c => c.tx.amount);
  return `<div class="pot">
    <div class="between small"><span><b>Collected ${got} of ${need}</b> · ${rm(gotAmt)} of ${rm(share * need)}</span>${x.paid ? '<span class="pill sage">Rent paid</span>' : got === need ? '<span class="pill sage">All in</span>' : ""}</div>
    <div class="bar" style="margin:6px 0 8px"><i style="width:${need ? got / need * 100 : 0}%;background:var(--sage)"></i></div>
    <div class="people">${x.coll.map(c => `<button class="person ${c.tx ? "in" : ""}" data-collect="${b.id}|${esc(c.name)}"><span class="pdot">${c.tx ? "✓" : esc(c.name.slice(0, 1).toUpperCase())}</span>${esc(c.name)}${c.tx ? `<span class="tiny" style="opacity:.75"> · ${esc(acc(c.tx.account_id)?.name || "")}</span>` : ""}</button>`).join("")}</div></div>`;
}
function viewBills() {
  const list = billsInPeriod(P()), others = S.bills.filter(b => !list.some(x => x.b.id === b.id));
  const total = sum(list, myPart), paid = sum(list.filter(x => x.paid), x => x.paid.amount);
  return `<div class="card between"><div><div class="small muted">Your bills this pay period</div><div class="h2">${rm(paid)} paid <span class="muted" style="font-weight:400">of ~${rm(total)}</span></div></div><button class="btn sun" id="addbill">+ Bill</button></div>
    <div class="lbl">Due ${esc(fmtP(P()))}</div>
    ${list.length ? list.map(x => `<div class="card billcard"><div class="row"><button class="grow" style="text-align:left;flex:1;min-width:0" data-bill="${x.b.id}"><div class="h2" style="font-size:14px">${esc(x.b.name)}${(x.b.people || []).length ? ` <span class="pill">shared</span>` : ""}</div>
      <div class="tiny muted">${x.paid ? `${x.b.auto_pay ? "charged" : "paid"} ${rm(Number(x.paid.amount) + Number(x.pass?.amount || 0))} on ${fmtShort(x.paid.date)}` : `${x.b.amount ? rm(x.b.amount) : "Amount varies"} · ${x.b.auto_pay ? "charged to " + esc(acc(x.b.account_id)?.name || "card") : x.b.due_on_payday ? "due on pay day" : "due"} ${fmtShort(x.due)}`}${instNo(x.b, x.m) ? ` · ${instNo(x.b, x.m)} of ${x.b.installments_total}` : ""}</div></button>
      ${x.paid ? billPill(x) : x.b.auto_pay ? `<span class="pill">Auto</span>` : `<button class="btn" style="height:34px" data-paybill="${x.b.id}">Paid</button>`}</div>
      ${(x.b.people || []).length ? sharedBlock(x) : ""}</div>`).join("") : '<div class="empty">No bills yet. Add the ones you pay every month, like your phone plan or rent.</div>'}
    ${others.length ? `<div class="lbl">Not due this pay period</div><div class="list">${others.map(b => `<button class="item" style="width:100%;text-align:left" data-bill="${b.id}"><div class="grow"><div class="title">${esc(b.name)}</div><div class="tiny muted">${b.frequency === "yearly" ? `${MONL[(b.due_month || 1) - 1]} ${b.due_day}` : b.due_on_payday ? "on pay day" : `every month, day ${b.due_day}`}${b.amount ? " · " + rm(b.amount) : ""}</div></div></button>`).join("")}</div>` : ""}`;
}
async function toggleCollect(billId, name) {
  const b = S.bills.find(x => x.id === billId), m = billMonth(b);
  const ex = S.tx.find(x => x.bill_id === b.id && x.bill_period === m && x.type === "collect" && x.payee === name);
  if (ex) { try { await db.remove("myday_transactions", ex.id); S.tx = S.tx.filter(x => x !== ex); render(); toast(`${name}: marked not paid`); } catch (e) { fail(e); } return; }
  // ask which account it came into, remembering where this person paid last time
  const banks = S.accounts.filter(a => a.kind === "bank");
  const last = S.tx.find(x => x.type === "collect" && x.bill_id === b.id && x.payee === name);
  const pick = last?.account_id || b.account_id || S.settings.default_account_id;
  window.MD.openPop(`<h2 class="h2">${esc(name)} paid ${rm(b.share_amount)}</h2><p class="small muted" style="margin:4px 0 14px">Which account did it come into?</p>
    <div class="acctpick">${banks.map(a => `<button data-into="${a.id}" class="${a.id === pick ? "on" : ""}"><span class="accdot" style="background:${/cimb/i.test(a.name) ? "#C8102E" : /maybank/i.test(a.name) ? "#F6C500" : "var(--peri)"}"></span>${esc(a.name)}</button>`).join("")}</div>`, sh => {
    sh.querySelectorAll("[data-into]").forEach(btn => btn.onclick = async () => {
      try { const r = await db.insert("myday_transactions", { type: "collect", amount: Number(b.share_amount || 0), date: m === today().slice(0, 7) ? today() : `${m}-01`, account_id: btn.dataset.into, payee: name, source: "bill", bill_id: b.id, bill_period: m });
        S.tx.unshift(r); closeSheet(); window.ART.celebrate(`[data-collect="${b.id}|${name}"] .pdot`, true); render(); toast(`${name} paid ${rm(r.amount)} into ${acc(btn.dataset.into)?.name}`); } catch (e) { fail(e); }
    });
  });
}
function bindMoney() {
  const mv = n => { const p = P(); if (n > 0 && !p.to) return; const np = periodOf(n < 0 ? addDays(p.from, -1) : addDays(p.to, 1));
    S.moneyFrom = np.from === curPeriod().from ? null : np.from; const m = np.from.slice(0, 7);
    if (m < S.txFrom) { S.moneyLoading = true; render(); } ensureMonth(m).then(() => { S.moneyLoading = false; render(); }).catch(e => { S.moneyLoading = false; fail(e); }); };
  $("#mprev").onclick = () => mv(-1); $("#mnext").onclick = () => mv(1);
  $("#msetup").onclick = setupSheet;
  document.querySelectorAll("[data-mv]").forEach(b => b.onclick = () => { S.moneyView = b.dataset.mv; render(); window.scrollTo(0, 0); });
  document.querySelectorAll("[data-hf]").forEach(b => b.onclick = () => { S.histFilter = b.dataset.hf; render(); });
  document.querySelectorAll("[data-tx]").forEach(b => b.onclick = () => { const t = S.tx.find(x => x.id === b.dataset.tx);
    if (t.type === "collect" || t.type === "passthrough") return passSheet(t); txSheet(t); });
  document.querySelectorAll("[data-collect]").forEach(b => b.onclick = () => { const [id, ...n] = b.dataset.collect.split("|"); toggleCollect(id, n.join("|")); });
  document.querySelectorAll("[data-bill]").forEach(b => b.onclick = () => billSheet(S.bills.find(x => x.id === b.dataset.bill)));
  document.querySelectorAll("[data-paybill]").forEach(b => b.onclick = () => payBill(S.bills.find(x => x.id === b.dataset.paybill)));
  document.querySelectorAll("[data-paycard]").forEach(b => b.onclick = () => txSheet(null, { type: "card_payment", to_account_id: b.dataset.paycard, amount: cardOwed().find(x => x.a.id === b.dataset.paycard)?.owed }));
  const r = $("#mreview"); if (r) r.onclick = nextReview;
  document.querySelectorAll("[data-savacc]").forEach(b => b.onclick = () => savAccSheet(acc(b.dataset.savacc)));
  const bu = $("#mbud"); if (bu) bu.onclick = budgetSheet;
  const rc = $("#mrecap"); if (rc) rc.onclick = () => window.MD.recapSheet(P().from);
  const mt = $("#mtotal"); if (mt) mt.onclick = () => { S.totalOpen = !S.totalOpen; render(); };
  document.querySelectorAll("[data-madd]").forEach(b => b.onclick = () => txSheet(null, { type: b.dataset.madd }));
  const ms = $("#mstill"); if (ms) ms.onclick = () => { S.moneyFrom = null; S.moneyView = "bills"; render(); window.scrollTo(0, 0); };
  const ab = $("#addbill"); if (ab) ab.onclick = () => billSheet(null);
}

/* ---------- add / edit a transaction ---------- */
const chips = (items, sel, attr) => `<div class="paint" style="margin:0">${items.map(([id, l]) => `<button type="button" data-${attr}="${id}" class="${id === sel ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`;
function txSheet(t, preset = {}, opts = {}) {
  const isNew = !t;
  t = t || Object.assign({ type: "expense", amount: "", date: today(), time: null, category_id: null, account_id: S.settings.default_account_id, to_account_id: null, payee: "", note: "" }, preset);
  let st = { ...t };
  if (isNew && st.type === "saving" && !st.to_account_id) { st.to_account_id = savingsAccounts()[0]?.id || null; if (["card", "savings"].includes(acc(st.account_id)?.kind)) st.account_id = S.accounts.find(a => a.kind === "bank")?.id; }
  const draw = () => {
    const isCardPay = st.type === "card_payment";
    const catList = st.type === "income" ? incCats() : st.type === "expense" ? expCats() : [];
    const fromAcc = S.accounts.filter(a => a.kind !== "savings" && (!(isCardPay || st.type === "saving") || a.kind !== "card"));
    return `<div class="between"><h2 class="h2">${opts.review ? "Check this expense" : isNew ? "Add money" : "Edit"}</h2>${opts.review ? `<span class="tiny muted">${opts.review}</span>` : ""}</div>
    ${opts.review ? '<p class="small muted" style="margin:4px 0 0">Read from your screenshot. Fix anything that looks wrong.</p>' : ""}
    <div class="seg">${[["expense", "Spent"], ["income", "Income"], ["saving", "Saved"], ["card_payment", "Card bill"]].map(([k, l]) => `<button type="button" data-ty="${k}" class="${st.type === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="field"><label>Amount (RM)</label><input type="number" inputmode="decimal" step="0.01" min="0" id="xa" value="${st.amount === "" || st.amount == null ? "" : Number(st.amount).toFixed(2)}" placeholder="0.00" style="font-size:19px;font-weight:600;height:46px"></div>
    ${catList.length ? `<div class="field"><label>Category</label>${chips(catList.map(c => [c.id, c.name]), st.category_id, "xc")}</div>` : ""}
    <div class="field"><label>${isCardPay ? "Paid from" : st.type === "income" ? "Into" : st.type === "saving" ? "From" : "Paid with"}</label>${chips(fromAcc.map(a => [a.id, a.name]), st.account_id, "xac")}</div>
    ${st.type === "saving" && savingsAccounts().length ? `<div class="field"><label>Into</label>${chips(savingsAccounts().map(a => [a.id, a.name]), st.to_account_id, "xto")}</div>` : ""}
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
      if (st.type === "saving") { if (["card", "savings"].includes(acc(st.account_id)?.kind)) st.account_id = S.accounts.find(a => a.kind === "bank")?.id; st.to_account_id = savingsAccounts()[0]?.id || null; }
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
        to_account_id: st.type === "card_payment" || st.type === "saving" ? (st.to_account_id || null) : null, goal_id: st.type === "saving" ? (st.goal_id || null) : null, payee: (st.type === "expense" || st.type === "income") ? (st.payee || "").trim() || null : null, note: (st.note || "").trim() || null, needs_review: false };
      try {
        if (isNew) S.tx.unshift(await db.insert("myday_transactions", { ...o, source: "manual" }));
        else Object.assign(t, await db.update("myday_transactions", t.id, o));
        if (o.type === "expense" && o.payee && (o.category_id || o.account_id)) learn(o.payee, o.category_id, o.account_id);
        S.tx.sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));
        if (window.MD.refreshGoalTx && (o.goal_id || t.goal_id)) await window.MD.refreshGoalTx();
        if (o.type === "saving" || t.type === "saving") await refreshSaving();
        if (o.goal_id) { const g = (S.goals || []).find(k => k.id === o.goal_id); if (g && window.MD.goalSaved(g) >= g.target && window.MD.goalSaved(g) - amount < g.target) { setTimeout(() => { window.ART.confetti(null, 30); toast(`You reached ${g.name}!`); }, 350); } }
        closeSheet(); render();
        if (opts.review) nextReview(); else if (!(o.goal_id)) toast(isNew ? "Saved" : "Changes saved");
      } catch (e) { fail(e); }
    };
    const del = $("#xdel"); if (del) del.onclick = async () => {
      try { await db.remove("myday_transactions", t.id); S.tx = S.tx.filter(x => x.id !== t.id); if (t.goal_id && window.MD.refreshGoalTx) await window.MD.refreshGoalTx(); if (t.type === "saving") await refreshSaving(); closeSheet(); render();
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

function savAccSheet(a) {
  const ins = (S.savingTx || []).filter(t => t.to_account_id === a.id).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 8);
  openSheet(`<div class="row" style="gap:12px">${window.ART.jar(52)}<div><h2 class="h2">${esc(a.name)}</h2><div class="small muted">${rm(savingsBalance(a))} saved</div></div></div>
    <div class="field" style="margin-top:14px"><label>Balance before you started using My Day (RM)</label><input type="number" inputmode="decimal" id="sob" value="${Number(a.opening_balance || 0) || ""}" placeholder="0.00"></div>
    
    <button class="btn primary block" id="sobs">Save</button>
    <button class="btn block" id="sadd" style="margin-top:8px">+ Save money into ${esc(a.name)}</button>
    ${ins.length ? `<div class="lbl">Recent</div><div class="list">${ins.map(t => `<div class="item"><div class="grow small">${fmtShort(t.date)}</div><span class="small">${rm(t.amount)}</span></div>`).join("")}</div>` : ""}`, () => {
    $("#sobs").onclick = async () => { try { Object.assign(a, await db.update("myday_accounts", a.id, { opening_balance: Number($("#sob").value) || 0 })); closeSheet(); render(); toast("Saved"); } catch (e) { fail(e); } };
    $("#sadd").onclick = () => txSheet(null, { type: "saving", to_account_id: a.id });
  });
}

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
    <div class="field"><label>Usually paid with</label>${chips(S.accounts.filter(a => a.kind !== "savings").map(a => [a.id, a.name]), aid, "bac")}</div>
    <label class="row small" style="margin:0 2px 8px"><input type="checkbox" id="bpay" ${b.due_on_payday ? "checked" : ""}> Due on my pay day (uses the day above if a month has no pay date)</label>
    <label class="row small" style="margin:0 2px 12px"><input type="checkbox" id="bauto" ${b.auto_pay ? "checked" : ""}> Charged automatically (add it by itself on the due date)</label>
    <div class="field"><label>Installments: total number (optional)</label><input type="number" min="1" id="bit" value="${b.installments_total ?? ""}" placeholder="36"></div>
    <div class="field"><label>Month of installment 1</label><input type="month" id="bif" value="${(b.installment_first || "").slice(0, 7)}"></div>
    <div class="lbl">Shared with others?</div>
    <div class="field"><label>People who pay you their share (one per line)</label><textarea id="bpp" rows="4" placeholder="Leave empty if it's only yours">${esc((b.people || []).join("\n"))}</textarea></div>
    <div class="field"><label>Each person's share, including yours (RM)</label><input type="number" inputmode="decimal" step="0.01" id="bsh" value="${b.share_amount ?? ""}" placeholder="480"></div>
    <div class="err" id="berr"></div>
    <button class="btn primary block" id="bsave">${isNew ? "Add bill" : "Save"}</button>
    ${isNew ? "" : '<div class="btnrow" style="margin-top:8px"><button class="btn" id="bpay">Mark paid</button><button class="btn danger" id="bdel">Delete</button></div>'}`, sh => {
    sh.querySelectorAll("[data-bf]").forEach(x => x.onclick = () => { fr = x.dataset.bf; sh.querySelectorAll("[data-bf]").forEach(y => y.classList.toggle("on", y === x)); $("#bmw").style.display = fr === "yearly" ? "" : "none"; });
    sh.querySelectorAll("[data-bc]").forEach(x => x.onclick = () => { cid = x.dataset.bc; sh.querySelectorAll("[data-bc]").forEach(y => y.classList.toggle("on", y === x)); });
    sh.querySelectorAll("[data-bac]").forEach(x => x.onclick = () => { aid = x.dataset.bac; sh.querySelectorAll("[data-bac]").forEach(y => y.classList.toggle("on", y === x)); });
    $("#bsave").onclick = async () => {
      const people = $("#bpp").value.split("\n").map(x => x.trim()).filter(Boolean), sh = $("#bsh").value === "" ? null : Number($("#bsh").value);
      if (people.length && !(sh > 0)) { $("#berr").textContent = "Add each person's share."; return; }
      const autoOn = $("#bauto").checked, itot = Number($("#bit").value) || null, ifirst = $("#bif").value ? $("#bif").value + "-01" : null;
      const o = { due_on_payday: $("#bpay").checked, auto_pay: autoOn, auto_from: autoOn ? (b.auto_from || today().slice(0, 7) + "-01") : null, installments_total: itot, installment_first: itot ? ifirst : null, people, share_amount: people.length ? sh : null, name: $("#bn").value.trim(), amount: $("#ba").value === "" ? (people.length ? sh * (people.length + 1) : null) : Number($("#ba").value), due_day: Math.max(1, Math.min(31, Number($("#bd").value) || 1)), frequency: fr, due_month: fr === "yearly" ? Number($("#bm").value) : null, category_id: cid, account_id: aid };
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
  const m = billMonth(b);
  if (S.tx.some(x => x.bill_id === b.id && x.bill_period === m && x.type === "expense")) { toast("Already marked paid for this month"); return; }
  let aid = b.account_id || S.settings.default_account_id;
  const shared = (b.people || []).length, share = Number(b.share_amount || 0);
  window.MD.openPop(`<h2 class="h2">Paid ${esc(b.name)}</h2><p class="small muted" style="margin:4px 0 14px">${shared ? `Only your share counts as spending for ${MONL[Number(m.slice(5)) - 1]}.` : `This saves it as spending for ${MONL[Number(m.slice(5)) - 1]}.`}</p>
    <div class="field"><label>${shared ? "Total you paid (RM)" : "Amount (RM)"}</label><input type="number" inputmode="decimal" step="0.01" id="pa" value="${b.amount ?? ""}" placeholder="0.00"></div>
    ${shared ? `<p class="tiny muted" id="psplit" style="margin:-4px 2px 10px"></p>` : ""}
    <div class="field"><label>Paid with</label>${chips(S.accounts.filter(a => a.kind !== "savings").map(a => [a.id, a.name]), aid, "pac")}</div>
    <div class="field"><label>Date paid</label><input type="date" id="pd" value="${m === today().slice(0, 7) ? today() : billsFor(m).find(x => x.b.id === b.id)?.due || today()}"></div>
    <div class="err" id="perr2"></div><button class="btn primary block" id="pok">Save</button>`, sh => {
    const upd = () => { const el = $("#psplit"); if (!el) return; const tot = Number($("#pa").value) || 0; el.textContent = `Your share ${rm(Math.min(share, tot))} · others' shares ${rm(Math.max(0, tot - share))} (not spending)`; };
    if (shared) { $("#pa").oninput = upd; upd(); }
    sh.querySelectorAll("[data-pac]").forEach(x => x.onclick = () => { aid = x.dataset.pac; sh.querySelectorAll("[data-pac]").forEach(y => y.classList.toggle("on", y === x)); });
    $("#pok").onclick = async () => {
      const amount = Math.round(Number($("#pa").value) * 100) / 100; if (!(amount > 0)) { $("#perr2").textContent = "Enter how much you paid."; return; }
      const mine = shared ? Math.min(share, amount) : amount, rest = Math.round((amount - mine) * 100) / 100, date = $("#pd").value;
      try {
        S.tx.unshift(await db.insert("myday_transactions", { type: "expense", amount: mine, date, category_id: b.category_id, account_id: aid, payee: b.name, source: "bill", bill_id: b.id, bill_period: m }));
        if (rest > 0) S.tx.unshift(await db.insert("myday_transactions", { type: "passthrough", amount: rest, date, account_id: aid, payee: b.name, note: "Others' shares", source: "bill", bill_id: b.id, bill_period: m }));
        S.tx.sort((x, y) => y.date.localeCompare(x.date)); closeSheet(); render(); toast(`${b.name} marked paid`); } catch (e) { fail(e); }
    };
  });
}
function passSheet(t) {
  const bl = S.bills.find(x => x.id === t.bill_id);
  window.MD.openPop(`<h2 class="h2">${t.type === "collect" ? `${esc(t.payee || "")} paid you ${rm(t.amount)}` : `Others' shares of ${esc(bl?.name || "the bill")}`}</h2>
    <p class="small muted" style="margin:4px 0 14px">${fmtShort(t.date)} · ${esc(acc(t.account_id)?.name || "")}. This only moves money through your account. It isn't counted as income or spending.</p>
    <button class="btn danger block" id="pxdel">Remove this entry</button>`, () => {
    $("#pxdel").onclick = async () => { try { await db.remove("myday_transactions", t.id); S.tx = S.tx.filter(x => x.id !== t.id); closeSheet(); render();
      toast("Removed", async () => { S.tx.unshift(await db.restore("myday_transactions", t.id)); render(); }); } catch (e) { fail(e); } };
  });
}

/* ---------- budgets, accounts, shortcut ---------- */
function budgetSheet() {
  const list = expCats();
  openSheet(`<h2 class="h2">Budgets</h2><p class="small muted" style="margin:4px 0 14px">Set a limit for each pay period (pay day to the day before the next), overall and for any category. Leave empty for no limit.</p>
    <div class="field"><label>Whole pay period (RM)</label><input type="number" inputmode="decimal" id="ob" value="${S.settings.monthly_budget ?? ""}" placeholder="No limit"></div>
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
  const row = c => `<div class="item"><span style="width:10px;height:10px;border-radius:50%;flex:none;background:${CCOL[c.color]}"></span><div class="grow"><input type="text" value="${esc(c.name)}" data-rn="${c.id}" style="height:34px">${c.kind === "expense" ? `<select data-cg="${c.id}" style="height:30px;line-height:30px;margin-top:6px;font-size:11.5px">${Object.entries(window.MD.SPEND_GROUPS).map(([k, [l]]) => `<option value="${k}" ${(c.spend_group || "lifestyle") === k ? "selected" : ""}>Group: ${l}</option>`).join("")}</select>` : ""}</div>
     <select data-cc="${c.id}" style="width:96px;height:34px;line-height:34px">${Object.keys(CCOL).map(k => `<option ${c.color === k ? "selected" : ""}>${k}</option>`).join("")}</select>
     <button class="x" data-rd="${c.id}" aria-label="Remove">×</button></div>`;
  openSheet(`<div class="row" style="margin-bottom:4px">${window.ART.jar(44)}<h2 class="h2">Money settings</h2></div>
    <div class="lbl">Spending</div><div class="list">${expCats().map(row).join("")}</div>
    <button class="addline" id="addc">+ Add spending category</button>
    <div class="lbl">Income</div><div class="list">${incCats().map(row).join("")}</div>
    <button class="addline" id="addi">+ Add income category</button>
    <div class="lbl">Salary reminder</div>
    <div class="field"><label>Start asking "Has your salary come in?" from day</label><input type="number" min="1" max="31" id="sfd" value="${S.settings.salary_from_day || 20}"></div>
    <button class="btn block" id="sfdsave">Save</button>
    <div class="lbl">Pay dates</div>
    <div class="list">${(S.payDates || []).filter(p => p.date >= today().slice(0, 4) + "-01-01").map(p => `<div class="item"><div class="grow small">${fmtShort(p.date)} ${p.date.slice(0, 4)}</div><button class="x" data-pdx="${p.id}" aria-label="Remove">×</button></div>`).join("") || '<div class="item small muted">No pay dates yet</div>'}</div>
    <input type="date" id="pdnew" style="margin-top:8px"><button class="btn block" id="pdadd" style="margin-top:8px">+ Add pay date</button>`, sh => {
    sh.querySelectorAll("[data-pdx]").forEach(b => b.onclick = async () => { try { await db.remove("myday_pay_dates", b.dataset.pdx); S.payDates = S.payDates.filter(x => x.id !== b.dataset.pdx); setupSheet(); render(); } catch (e) { fail(e); } });
    $("#pdadd").onclick = async () => { const d = $("#pdnew").value; if (!d) { window.ART.nudge($("#pdnew")); return; }
      try { S.payDates.push(await db.insert("myday_pay_dates", { date: d })); S.payDates.sort((a, b) => a.date.localeCompare(b.date)); setupSheet(); render(); toast("Pay date added"); } catch (e) { fail(e); } };
    $("#sfdsave").onclick = async () => { try { S.settings = (await rest("PATCH", `myday_settings?user_id=eq.${S.settings.user_id}`, { salary_from_day: Math.max(1, Math.min(31, Number($("#sfd").value) || 20)) }))[0]; toast("Saved"); render(); } catch (e) { fail(e); } };
    sh.querySelectorAll("[data-rn]").forEach(inp => inp.onchange = async () => { const id = inp.dataset.rn, v = inp.value.trim(); if (!v) return;
      try { Object.assign(cat(id), await db.update("myday_categories", id, { name: v })); toast("Renamed"); } catch (e) { fail(e); } });
    sh.querySelectorAll("[data-cc]").forEach(x => x.onchange = async () => { try { Object.assign(cat(x.dataset.cc), await db.update("myday_categories", x.dataset.cc, { color: x.value })); setupSheet(); } catch (e) { fail(e); } });
    sh.querySelectorAll("[data-cg]").forEach(x => x.onchange = async () => { try { Object.assign(cat(x.dataset.cg), await db.update("myday_categories", x.dataset.cg, { spend_group: x.value })); toast("Group changed"); } catch (e) { fail(e); } });
    sh.querySelectorAll("[data-rd]").forEach(b => b.onclick = async () => { const id = b.dataset.rd;
      try { await db.remove("myday_categories", id); S.categories = S.categories.filter(x => x.id !== id); setupSheet();
        toast("Removed", async () => { S.categories.push(await db.restore("myday_categories", id)); setupSheet(); }); } catch (e) { fail(e); } });
    const add = async o => { try { S.categories.push(await db.insert("myday_categories", o)); setupSheet(); } catch (e) { fail(e); } };
    $("#addc").onclick = () => add({ name: "New category", kind: "expense", sort: 50, spend_group: "lifestyle" });
    $("#addi").onclick = () => add({ name: "New income", kind: "income", sort: 50 });
  });
}

/* ---------- reminders shown on Today: salary, rent collection, card bill ---------- */
const salaryCat = () => S.categories.find(c => c.kind === "income" && /salary|gaji/i.test(c.name));
const lastSalary = () => S.tx.find(t => t.type === "income" && t.category_id === salaryCat()?.id);
const snoozed = k => { try { return localStorage.getItem("myday.snooze." + k) === today(); } catch (e) { return false; } };
const snoozedFor = k => { try { return !!localStorage.getItem("myday.snooze." + k); } catch (e) { return false; } };
const daysBetweenD = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const snooze = k => { try { localStorage.setItem("myday.snooze." + k, today()); } catch (e) {} };
const payDayOf = m => (S.payDates || []).find(p => p.date.startsWith(m))?.date || null;
window.MD.isPayDay = ds => (S.payDates || []).some(p => p.date === ds);
const salaryIn = m => S.tx.some(t => t.type === "income" && t.date.startsWith(m) && t.category_id === salaryCat()?.id);
function salaryDue() {
  const m = today().slice(0, 7), day = Number(today().slice(8)), pd = payDayOf(m);
  if (snoozed("salary")) return false;
  if (pd ? today() < pd : day < (S.settings.salary_from_day || 20)) return false;
  return !salaryIn(m);
}
function rentWaiting() {
  const m = today().slice(0, 7);
  return billsFor(m).filter(x => (x.b.people || []).length && !x.paid && x.days <= 7).map(x => ({ x, waiting: x.coll.filter(c => !c.tx).map(c => c.name) })).filter(r => r.waiting.length);
}
function cardsToPay() {
  return cardOwed().filter(c => c.owed > 0.004 && !snoozed("card" + c.a.id)).map(c => {
    const pays = S.tx.filter(t => t.type === "card_payment" && t.to_account_id === c.a.id);
    const lastPay = pays[0]?.date, firstSpend = S.tx.filter(t => t.type === "expense" && t.account_id === c.a.id).map(t => t.date).sort()[0];
    const since = lastPay || firstSpend; const days = since ? Math.round((parse(today()) - parse(since)) / 864e5) : 0;
    return { ...c, lastPay, days };
  }).filter(c => c.days >= 7);
}
window.MD.extraDue = () => {
  const out = [];
  { const m = today().slice(0, 7), pd = payDayOf(m), dd = pd ? Math.round((parse(pd) - parse(today())) / 864e5) : null;
    if (pd && dd > 0 && dd <= 7 && !salaryIn(m)) out.push([pd, `<div class="item duecard"><span class="dueic" style="background:var(--sunbg)">${I.coin}</span><div class="grow"><div class="title">Pay day ${dd === 1 ? "tomorrow" : `in ${dd} days`}</div><div class="tiny muted">${fmtShort(pd)}</div></div><span class="pill warn">${dd}d</span></div>`]); }
  if (salaryDue()) { const ls = lastSalary();
    out.push(["0", `<div class="item duecard"><span class="dueic" style="background:var(--sagebg)">${I.coin}</span><div class="grow"><div class="title">Has your salary come in?</div><div class="tiny muted">${ls ? `Last time ${rm(ls.amount)} on ${fmtShort(ls.date)}` : "Add it once it's in your account"}</div></div>
      <div class="duebtns"><button class="btn sun" data-salary="1">Add</button><button class="small muted" data-snooze="salary">Not yet</button></div></div>`]); }
  rentWaiting().forEach(r => out.push([r.x.due, `<div class="item duecard"><span class="dueic" style="background:var(--lav)">${I.home}</span><div class="grow"><div class="title">${esc(r.x.b.name)}: waiting on ${esc(r.waiting.join(", "))}</div><div class="tiny muted">Due ${fmtShort(r.x.due)} · ${rm(Number(r.x.b.share_amount) * r.waiting.length)} still to collect</div></div>
      <div class="duebtns"><button class="btn" data-remind="${r.x.b.id}">Remind</button></div></div>`]));
  { const p = curPeriod(), pm = payMath(p), sav = savingsAccounts()[0], key = "carry" + p.from;
    if (pm.carry > 0.5 && sav && daysBetweenD(p.from, today()) <= 7 && !pm.tx.some(t => t.type === "saving") && !snoozedFor(key))
      out.push(["0", `<div class="item duecard"><span class="dueic" style="background:var(--sunbg)">${window.ART.jar(28)}</span><div class="grow"><div class="title">${rm(pm.carry)} left from last pay</div><div class="tiny muted">Move some to ${esc(sav.name)}?</div></div>
      <div class="duebtns"><button class="btn sun" data-carrysave="${sav.id}">Save</button><button class="small muted" data-snoozep="${key}">Not now</button></div></div>`]); }
  cardsToPay().forEach(c => out.push(["1", `<div class="item duecard"><span class="dueic" style="background:var(--rosebg)">${I.wallet}</span><div class="grow"><div class="title">Pay ${esc(c.a.name)}</div><div class="tiny muted">${rm(c.owed)} owed · ${c.lastPay ? `last paid ${c.days} days ago` : `not paid in ${c.days} days`}</div></div>
      <div class="duebtns"><button class="btn sun" data-paycard2="${c.a.id}">Pay</button><button class="small muted" data-snooze="card${c.a.id}">Later</button></div></div>`]));
  return out;
};
window.MD.bindExtraDue = () => {
  document.querySelectorAll("[data-salary]").forEach(b => b.onclick = salarySheet);
  document.querySelectorAll("[data-snooze]").forEach(b => b.onclick = () => { snooze(b.dataset.snooze); render(); toast("Hidden for today"); });
  document.querySelectorAll("[data-carrysave]").forEach(b => b.onclick = () => txSheet(null, { type: "saving", to_account_id: b.dataset.carrysave, amount: Math.floor(payMath(curPeriod()).carry), note: "From last pay" }));
  document.querySelectorAll("[data-snoozep]").forEach(b => b.onclick = () => { try { localStorage.setItem("myday.snooze." + b.dataset.snoozep, "1"); } catch (e) {} render(); toast("Okay, maybe next time"); });
  document.querySelectorAll("[data-remind]").forEach(b => b.onclick = () => remindRent(S.bills.find(x => x.id === b.dataset.remind)));
  document.querySelectorAll("[data-paycard2]").forEach(b => b.onclick = () => txSheet(null, { type: "card_payment", to_account_id: b.dataset.paycard2, amount: Math.round(cardOwed().find(x => x.a.id === b.dataset.paycard2)?.owed * 100) / 100 }));
};
function salarySheet() {
  const ls = lastSalary(); let aid = S.settings.salary_account_id || ls?.account_id || S.accounts.find(a => /maybank/i.test(a.name) && a.kind === "bank")?.id || S.settings.default_account_id;
  window.MD.openPop(`<h2 class="h2">Salary is in</h2><p class="small muted" style="margin:4px 0 14px">Saved as income for ${MONL[Number(today().slice(5, 7)) - 1]}.</p>
    <div class="field"><label>Amount (RM)</label><input type="number" inputmode="decimal" step="0.01" id="slm" value="${S.settings.salary_amount ?? ls?.amount ?? ""}" placeholder="0.00"></div>
    <div class="field"><label>Into</label>${chips(S.accounts.filter(a => a.kind === "bank").map(a => [a.id, a.name]), aid, "sla")}</div>
    <div class="field"><label>Date</label><input type="date" id="sld2" value="${today()}"></div>
    <div class="err" id="slerr"></div><button class="btn primary block" id="slok">Save</button>`, sh => {
    sh.querySelectorAll("[data-sla]").forEach(x => x.onclick = () => { aid = x.dataset.sla; sh.querySelectorAll("[data-sla]").forEach(y => y.classList.toggle("on", y === x)); });
    $("#slok").onclick = async () => {
      const amount = Math.round(Number($("#slm").value) * 100) / 100; if (!(amount > 0)) { $("#slerr").textContent = "Enter your salary amount."; return; }
      try { S.tx.unshift(await db.insert("myday_transactions", { type: "income", amount, date: $("#sld2").value || today(), category_id: salaryCat()?.id || null, account_id: aid, payee: "Salary", source: "manual" }));
        S.tx.sort((x, y) => y.date.localeCompare(x.date));
        S.settings = (await rest("PATCH", `myday_settings?user_id=eq.${S.settings.user_id}`, { salary_amount: amount, salary_account_id: aid }))[0];
        closeSheet(); render(); window.ART.confetti(null, 24); toast(`Salary ${rm(amount)} added`); } catch (e) { fail(e); }
    };
  });
}
async function remindRent(b) {
  const m = today().slice(0, 7), x = billsFor(m).find(k => k.b.id === b.id);
  const waiting = x.coll.filter(c => !c.tx).map(c => c.name);
  const text = `Hi ${waiting.length === 1 ? waiting[0] : "all"}! Just a gentle reminder for ${b.name.toLowerCase()} this month: RM ${Number(b.share_amount).toFixed(0)} each, due ${fmtShort(x.due)}. Thank you!`;
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); toast("Reminder copied. Paste it in WhatsApp"); } catch (e) { location.href = "https://wa.me/?text=" + encodeURIComponent(text); }
}
window.MD.ensureMonth = ensureMonth;
window.MD.views.money = viewMoney;
window.MD.binds.money = bindMoney;
})();
