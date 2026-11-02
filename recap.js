/* My Day — pay period recap and data export (step 3). */
(() => {
"use strict";
const { esc, pad, ymd, parse, addDays, today, S, openSheet, toast, I } = window.MD;
const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const rm = n => "RM " + Number(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = a => a.reduce((s, x) => s + Number(x.amount || 0), 0);
// recap runs per pay period (pay day to the day before the next)
const per = from => window.MD.periodOf(from);
const prevPeriod = p => per(addDays(p.from, -1));
const lastPeriod = () => prevPeriod(per(today()));
window.MD.lastPeriod = lastPeriod;
const inRange = (p, d) => d >= p.from && d <= p.to;

function stats(p) {
  const tx = (S.tx || []).filter(t => inRange(p, t.date));
  const exp = tx.filter(t => t.type === "expense");
  const cat = id => (S.categories || []).find(c => c.id === id);
  const byCat = {}, byGroup = {};
  exp.forEach(t => { const k = t.category_id || "none", g = cat(t.category_id)?.spend_group || "lifestyle";
    byCat[k] = (byCat[k] || 0) + Number(t.amount); byGroup[g] = (byGroup[g] || 0) + Number(t.amount); });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => [cat(k)?.name || "No category", v]);
  const pm = window.MD.payLeft ? window.MD.payLeft(p) : null;
  return {
    income: sum(tx.filter(t => t.type === "income")), spent: sum(exp), saved: sum(tx.filter(t => t.type === "saving")),
    top, byGroup, bills: exp.filter(t => t.bill_id).length, billsAmt: sum(exp.filter(t => t.bill_id)), left: pm ? pm.left : null
  };
}
function recapSheet(from) {
  const p = { ...(from ? per(from) : lastPeriod()) }, cur = per(today()), isCur = p.from === cur.from;
  if (!p.to || p.to > today()) p.to = isCur ? today() : p.to || today();
  const s = stats(p), pp = prevPeriod(p), ps = stats(pp), last = lastPeriod();
  const diff = s.spent - ps.spent, hasPrev = ps.spent > 0, G = window.MD.SPEND_GROUPS || {};
  const groups = Object.entries(G).map(([k, [l, c]]) => ({ k, l, c, v: s.byGroup[k] || 0 })).filter(x => x.v > 0);
  const gtot = groups.reduce((a, x) => a + x.v, 0) || 1;
  const catsIn = k => (S.categories || []).filter(c => c.kind === "expense" && (c.spend_group || "lifestyle") === k).map(c => c.name).join(", ");
  openSheet(`<div class="between"><div><div class="lbl" style="margin:0">MONEY RECAP</div><h2 class="h1" style="font-size:21px">${esc(isCur ? window.MD.fmtPeriod(cur) : window.MD.fmtPeriod(p))}</h2>${isCur ? '<div class="small muted">so far</div>' : ""}</div>
      <div class="row"><button class="iconbtn" data-rm="${pp.from}" aria-label="Previous pay period">${I.left}</button>${p.from < cur.from ? `<button class="iconbtn" data-rm="${addDays(p.to, 1)}" aria-label="Next pay period">${I.right}</button>` : ""}</div></div>
    <div class="card leave" style="margin-top:14px">
      <div class="between" style="font-size:10.5px"><div><div class="muted">Income</div><div style="font-size:14px;font-weight:600;color:#BFE3C9">${rm(s.income)}</div></div>
      <div><div class="muted">Spent</div><div style="font-size:14px;font-weight:600;color:#F3B7B7">${rm(s.spent)}</div></div>
      <div><div class="muted">Saved</div><div style="font-size:14px;font-weight:600;color:#F6D86B">${rm(s.saved)}</div></div></div>
      ${s.left !== null && s.income ? `<div class="pc-after" style="margin-top:12px"><span>${isCur ? "Left so far" : "Left at the end"}</span><b>${s.left < 0 ? "−" : ""}${rm(Math.abs(s.left))}</b></div>` : ""}
      ${hasPrev ? `<div class="small muted" style="margin-top:10px">${isCur ? (diff <= 0 ? `So far ${rm(-diff)} less than the whole pay period before.` : `So far ${rm(diff)} more than the whole pay period before.`) : diff <= 0 ? `You spent ${rm(-diff)} less than the pay period before.` : `You spent ${rm(diff)} more than the pay period before.`}</div>` : ""}</div>
    ${groups.length ? `<div class="lbl">Spending by type</div><div class="card">
      <div class="segbar" style="margin:2px 0 10px">${groups.map(x => `<i style="width:${x.v / gtot * 100}%;background:${x.c}"></i>`).join("")}</div>
      ${groups.map(x => `<details class="grp"><summary><span class="accdot" style="background:${x.c}"></span><span class="grow small">${esc(x.l)}</span><span class="tiny muted">${Math.round(x.v / gtot * 100)}%</span><b class="small">${rm(x.v)}</b></summary><div class="tiny muted" style="padding:2px 0 6px 16px">${esc(catsIn(x.k) || "—")}</div></details>`).join("")}</div>` : ""}
    ${s.top.length ? `<div class="lbl">Where it went</div><div class="list">${s.top.map(([n, v], i) => `<div class="item"><div class="grow">${i + 1}. ${esc(n)}</div><span>${rm(v)}</span></div>`).join("")}</div>` : ""}
    ${s.bills ? `<div class="lbl">Bills</div><div class="list"><div class="item"><div class="grow">${s.bills} bill${s.bills > 1 ? "s" : ""} paid</div><span>${rm(s.billsAmt)}</span></div></div>` : ""}
    ${(S.goals || []).filter(g => !g.done_at).length ? `<div class="lbl">Savings jars</div><div class="list">${S.goals.filter(g => !g.done_at).map(g => { const sv = window.MD.goalSaved(g); return `<div class="item"><div class="grow">${esc(g.name)}</div><span>${rm(sv)} · ${Math.floor(Math.min(100, sv / g.target * 100))}%</span></div>`; }).join("")}</div>` : ""}
    <p class="serif muted" style="text-align:center;margin:18px 0 4px">little by little, it adds up</p>`, sh => {
    sh.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => { const nf = b.dataset.rm; if (window.MD.ensureMonth) await window.MD.ensureMonth(per(nf).from.slice(0, 7)).catch(() => {}); recapSheet(nf); });
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
