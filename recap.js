/* My Day — monthly recap and data export (step 3). */
(() => {
"use strict";
const { esc, pad, ymd, parse, addDays, today, S, openSheet, toast, I } = window.MD;
const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const rm = n => "RM " + Number(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = a => a.reduce((s, x) => s + Number(x.amount || 0), 0);
const prevMonth = m => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 2, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const lastMonth = () => prevMonth(today().slice(0, 7));
window.MD.lastMonth = lastMonth;

function stats(m) {
  const tx = (S.tx || []).filter(t => t.date.startsWith(m));
  const exp = tx.filter(t => t.type === "expense");
  const byCat = {};
  exp.forEach(t => { const k = t.category_id || "none"; byCat[k] = (byCat[k] || 0) + Number(t.amount); });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => [(S.categories || []).find(c => c.id === k)?.name || "No category", v]);
  const [y, mo] = m.split("-").map(Number), dim = new Date(y, mo, 0).getDate();
  const kinds = { work: 0, oncall: 0, leave: 0, holiday: 0, off: 0 };
  for (let d = 1; d <= dim; d++) kinds[window.MD.dayInfo(`${m}-${pad(d)}`).kind]++;
  const topics = (S.topics || []).filter(t => t.done_at && ymd(new Date(t.done_at)).startsWith(m));
  return {
    income: sum(tx.filter(t => t.type === "income")), spent: sum(exp), saved: sum(tx.filter(t => t.type === "saving")),
    top, bills: exp.filter(t => t.bill_id).length, billsAmt: sum(exp.filter(t => t.bill_id)), kinds,
    plans: (S.plans || []).filter(p => p.date.startsWith(m)).length,
    todos: (S.todos || []).filter(t => t.done_at && ymd(new Date(t.done_at)).startsWith(m)).length,
    topics, minutes: (S.topics || []).filter(t => t.week_start.startsWith(m)).reduce((s, t) => s + (t.minutes || 0), 0)
  };
}
function recapSheet(m = lastMonth()) {
  const [y, mo] = m.split("-").map(Number), s = stats(m), p = stats(prevMonth(m));
  const diff = s.spent - p.spent, hasPrev = p.spent > 0;
  const tile = (n, l) => `<div class="stat" style="text-align:left"><b>${n}</b><span class="tiny muted">${l}</span></div>`;
  openSheet(`<div class="between"><div><div class="lbl" style="margin:0">MONTHLY RECAP</div><h2 class="h1" style="font-size:24px">${MONL[mo - 1]} ${y}</h2></div>
      <div class="row"><button class="iconbtn" data-rm="${prevMonth(m)}" aria-label="Previous month">${I.left}</button>${m < lastMonth() ? `<button class="iconbtn" data-rm="${(() => { const d = new Date(y, mo, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; })()}" aria-label="Next month">${I.right}</button>` : ""}</div></div>
    <div class="card leave" style="margin-top:14px">
      <div class="between" style="font-size:11.5px"><div><div class="muted">Income</div><div style="font-size:15px;font-weight:600;color:#BFE3C9">${rm(s.income)}</div></div>
      <div><div class="muted">Spent</div><div style="font-size:15px;font-weight:600;color:#F3B7B7">${rm(s.spent)}</div></div>
      <div><div class="muted">Saved</div><div style="font-size:15px;font-weight:600;color:#F6D86B">${rm(s.saved)}</div></div></div>
      ${hasPrev ? `<div class="small muted" style="margin-top:10px">${diff <= 0 ? `You spent ${rm(-diff)} less than ${MONL[(mo + 10) % 12]}.` : `You spent ${rm(diff)} more than ${MONL[(mo + 10) % 12]}.`}</div>` : ""}</div>
    ${s.top.length ? `<div class="lbl">Where it went</div><div class="list">${s.top.map(([n, v], i) => `<div class="item"><div class="grow">${i + 1}. ${esc(n)}</div><span class="small">${rm(v)}</span></div>`).join("")}</div>` : ""}
    ${s.bills ? `<p class="small muted" style="margin:8px 2px">${s.bills} bill${s.bills > 1 ? "s" : ""} paid, ${rm(s.billsAmt)} in total.</p>` : ""}
    <div class="lbl">Your month</div>
    <div class="stats" style="margin-top:0">${tile(s.kinds.work, "work days")}${tile(s.kinds.oncall, "on-calls")}${tile(s.kinds.leave, "leave days")}</div>
    <div class="stats" style="margin-top:0">${tile(s.plans, "plans")}${tile(s.todos, "to-dos done")}${tile(s.topics.length, "topics learned")}</div>
    ${s.topics.length ? `<div class="lbl">What you learned</div><div class="list">${s.topics.map(t => `<div class="item"><div class="grow">${esc(t.title)}</div>${t.minutes ? `<span class="tiny muted">${t.minutes}m</span>` : ""}</div>`).join("")}</div>` : ""}
    ${(S.goals || []).filter(g => !g.done_at).length ? `<div class="lbl">Goals</div><div class="list">${S.goals.filter(g => !g.done_at).map(g => { const sv = window.MD.goalSaved(g); return `<div class="item"><div class="grow">${esc(g.name)}</div><span class="small">${Math.floor(Math.min(100, sv / g.target * 100))}%</span></div>`; }).join("")}</div>` : ""}
    <p class="serif muted" style="text-align:center;margin:18px 0 4px">little by little, it adds up</p>`, sh => {
    sh.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => { const nm = b.dataset.rm; if (window.MD.ensureMonth) await window.MD.ensureMonth(nm).catch(() => {}); recapSheet(nm); });
  });
}
window.MD.recapSheet = recapSheet;

/* ---------- export ---------- */
function download(name, text, type) {
  const blob = new Blob([text], { type }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const csvCell = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function exportMoneyCsv() {
  const cat = id => (S.categories || []).find(c => c.id === id)?.name || "", acc = id => (S.accounts || []).find(a => a.id === id)?.name || "";
  const rows = [["Date", "Time", "Type", "Amount (RM)", "Category", "Account", "To account", "Where / who", "Note", "Source"]]
    .concat((S.tx || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, (t.time || "").slice(0, 5), t.type, Number(t.amount).toFixed(2), cat(t.category_id), acc(t.account_id), acc(t.to_account_id), t.payee, t.note, t.source]));
  download(`myday-money-${today()}.csv`, rows.map(r => r.map(csvCell).join(",")).join("\n"), "text/csv");
  toast("Money exported (last few months loaded in the app)");
}
function exportAll() {
  const keys = ["settings", "days", "holidayRows", "plans", "todos", "shopping", "accounts", "categories", "bills", "tx", "goals", "wish", "reminders", "topics"];
  const out = { exported_at: new Date().toISOString() }; keys.forEach(k => out[k] = S[k]);
  if (out.settings) out.settings = { ...out.settings, capture_token: "(hidden)" };
  download(`myday-backup-${today()}.json`, JSON.stringify(out, null, 2), "application/json");
  toast("Backup downloaded");
}
window.MD.exportMoneyCsv = exportMoneyCsv;
window.MD.exportAll = exportAll;
})();
