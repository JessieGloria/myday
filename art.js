/* My Day — little illustrations, confetti and tap animations. Loaded first so every tab can use it. */
window.ART = (() => {
"use strict";
const face = (x, y, s = 1, sleepy = false) => sleepy
  ? `<path d="M${x - 5 * s} ${y} q${2 * s} ${2 * s} ${4 * s} 0 M${x + 1 * s} ${y} q${2 * s} ${2 * s} ${4 * s} 0" stroke="#5A4A3A" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round"/><path d="M${x - 2 * s} ${y + 4 * s} q${2 * s} ${1.6 * s} ${4 * s} 0" stroke="#5A4A3A" stroke-width="${1.3 * s}" fill="none" stroke-linecap="round"/>`
  : `<circle cx="${x - 4 * s}" cy="${y}" r="${1.4 * s}" fill="#5A4A3A"/><circle cx="${x + 4 * s}" cy="${y}" r="${1.4 * s}" fill="#5A4A3A"/><path d="M${x - 2.5 * s} ${y + 3 * s} q${2.5 * s} ${2.4 * s} ${5 * s} 0" stroke="#5A4A3A" stroke-width="${1.3 * s}" fill="none" stroke-linecap="round"/><circle cx="${x - 7 * s}" cy="${y + 3 * s}" r="${1.8 * s}" fill="#F4A7A7" opacity=".7"/><circle cx="${x + 7 * s}" cy="${y + 3 * s}" r="${1.8 * s}" fill="#F4A7A7" opacity=".7"/>`;

const A = {
  // potted plant with a happy pot and a spinning sun
  sunPlant: (w = 70) => `<svg class="art" width="${w}" height="${w}" viewBox="0 0 80 80" aria-hidden="true">
    <g class="a-spin" style="transform-origin:58px 18px"><circle cx="58" cy="18" r="10" fill="#F6D86B"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="57" y="2" width="2.4" height="5" rx="1.2" fill="#F6D86B" transform="rotate(${a} 58 18)"/>`).join("")}</g>
    <g class="a-sway" style="transform-origin:36px 56px"><path d="M35 56 C24 44 22 30 30 18 C38 30 40 44 35 56Z" fill="#7FA38A"/><path d="M37 56 C44 42 52 36 62 36 C56 48 46 54 37 56Z" fill="#9CBBA4"/><path d="M34 56 C26 50 16 48 10 52 C18 58 26 59 34 56Z" fill="#6E937A"/></g>
    <path d="M20 55 h32 l-4 20 h-24z" fill="#F3E6D6" stroke="#E3D3BF" stroke-width="1.2"/>${face(36, 63, .9)}</svg>`,
  // sleepy moon with twinkling stars
  moon: (w = 56) => `<svg class="art a-bob" width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M40 10 A22 22 0 1 0 54 44 A18 18 0 1 1 40 10Z" fill="#F6D86B"/>${face(30, 36, .9, true)}
    <path class="a-twinkle" d="M52 12 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6z" fill="#C9CBF3"/>
    <path class="a-twinkle d2" d="M12 14 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2z" fill="#8E92E0"/></svg>`,
  // coin jar
  jar: (w = 58) => `<svg class="art" width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true">
    <g class="a-drop"><circle cx="40" cy="8" r="6" fill="#F6D86B" stroke="#E5B93A" stroke-width="1.4"/><text x="40" y="10.5" text-anchor="middle" font-size="7" font-weight="700" fill="#9A7414">RM</text></g>
    <rect x="22" y="16" width="22" height="6" rx="2" fill="#C9CBF3"/>
    <path d="M18 24 h30 q4 0 4 5 v24 q0 7 -7 7 h-24 q-7 0 -7 -7 v-24 q0 -5 4 -5z" fill="#E9E9FB" stroke="#C9CBF3" stroke-width="1.4"/>
    <circle cx="26" cy="51" r="5" fill="#F6D86B"/><circle cx="36" cy="52" r="5" fill="#E5B93A"/><circle cx="31" cy="44" r="5" fill="#F6D86B"/><circle cx="41" cy="45" r="4.5" fill="#F6D86B"/>
    ${face(33, 33, .8)}</svg>`,
  // little hill with a waving flag
  flag: (w = 60) => `<svg class="art" width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="14" cy="14" r="7" fill="#F6D86B" class="a-pulse"/>
    <path d="M0 58 Q20 34 40 46 Q52 38 64 44 V64 H0Z" fill="#9CBBA4"/><path d="M0 62 Q24 48 64 56 V64 H0Z" fill="#7FA38A"/>
    <rect x="31" y="14" width="2" height="30" rx="1" fill="#6E7196"/>
    <path class="a-wave" style="transform-origin:33px 18px" d="M33 15 q8 -3 16 1 q-3 4 0 8 q-8 -4 -16 -1z" fill="#E8A0A0"/>
    ${face(22, 54, .7)}</svg>`,
  // open book with a sprout and sparkles
  book: (w = 60) => `<svg class="art" width="${w}" height="${w}" viewBox="0 0 64 64" aria-hidden="true">
    <g class="a-sway" style="transform-origin:32px 34px"><path d="M32 34 C30 24 26 18 20 16 C24 24 28 28 32 34Z" fill="#7FA38A"/><path d="M32 34 C34 22 40 16 46 15 C43 24 38 29 32 34Z" fill="#9CBBA4"/></g>
    <path d="M6 36 q13 -6 26 2 v20 q-13 -8 -26 -2z" fill="#E9E9FB" stroke="#C9CBF3" stroke-width="1.4"/><path d="M58 36 q-13 -6 -26 2 v20 q13 -8 26 -2z" fill="#F8F6FF" stroke="#C9CBF3" stroke-width="1.4"/>
    <path d="M12 42 q8 -2 15 2 M12 47 q8 -2 15 2 M37 44 q7 -4 15 -2 M37 49 q7 -4 15 -2" stroke="#C9CBF3" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path class="a-twinkle" d="M54 14 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z" fill="#F6D86B"/>
    <path class="a-twinkle d2" d="M10 20 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1z" fill="#E8A0A0"/></svg>`,
  // smiling cloud for empty states
  cloud: (w = 66) => `<svg class="art a-bob" width="${w}" height="${Math.round(w * .62)}" viewBox="0 0 80 50" aria-hidden="true">
    <path d="M20 44 h40 a12 12 0 0 0 2 -24 a16 16 0 0 0 -30 -4 a12 12 0 0 0 -14 12 a8 8 0 0 0 2 16z" fill="#E9E9FB" stroke="#C9CBF3" stroke-width="1.4"/>${face(40, 30, .9)}</svg>`,
  // trophy star for a goal reached
  star: (w = 26) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3 1.3-6.7-5-4.6 6.8-.8z" fill="#F6D86B" stroke="#E5B93A" stroke-width="1"/></svg>`
};

/* confetti burst from an element (or the middle of the screen) */
const COLS = ["#F6D86B", "#8E92E0", "#E8A0A0", "#7FA38A", "#C9CBF3"];
function confetti(el, n = 16) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i"), a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 60;
    s.className = "confetti";
    s.style.cssText = `left:${x}px;top:${y}px;background:${COLS[i % COLS.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px;--r:${Math.random() * 360}deg;${i % 3 ? "" : "border-radius:50%;"}`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 900);
  }
}
/* after a re-render, make the item that was just tapped do a little pop (and maybe confetti) */
let pending = null;
function celebrate(selector, burst = false) { pending = { selector, burst }; }
function afterRender() {
  if (!pending) return;
  const { selector, burst } = pending; pending = null;
  const el = document.querySelector(selector); if (!el) return;
  el.classList.add("pop"); if (burst) confetti(el);
}
/* shake an input that needs something typed in */
function nudge(input, msg) {
  if (!input) return;
  input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
  if (msg) input.placeholder = msg;
  input.focus();
}
return Object.assign(A, { confetti, celebrate, afterRender, nudge });
})();
