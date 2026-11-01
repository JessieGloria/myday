/* My Day — soft illustrated backgrounds, a different little scene for each tab. */
window.SCENES = (() => {
"use strict";
const cloud = (x, y, s = 1, o = .9) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><path d="M10 26h46a10 10 0 0 0 1-20 14 14 0 0 0-26-4 10 10 0 0 0-12 9 8 8 0 0 0-9 15z" fill="#fff"/></g>`;
const star = (x, y, r = 2.2, c = "#fff", cls = "") => `<path class="${cls}" d="M${x} ${y - r * 2} l${r * .6} ${r * 1.4} ${r * 1.4} ${r * .6} -${r * 1.4} ${r * .6} -${r * .6} ${r * 1.4} -${r * .6} -${r * 1.4} -${r * 1.4} -${r * .6} ${r * 1.4} -${r * .6}z" fill="${c}"/>`;
const flower = (x, y, c) => `<g transform="translate(${x} ${y})"><path d="M0 0v10" stroke="#7FA38A" stroke-width="1.4"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-3.2" rx="2" ry="3" fill="${c}" transform="rotate(${a})"/>`).join("")}<circle r="1.6" fill="#F6D86B"/></g>`;
const coin = (x, y, r, cls = "") => `<g class="${cls}" transform="translate(${x} ${y})"><circle r="${r}" fill="#F6D86B" stroke="#E5B93A" stroke-width="1.4"/><circle r="${r * .68}" fill="none" stroke="#E5B93A" stroke-width="1" opacity=".6"/></g>`;
const leaf = (x, y, rot, c, cls = "") => `<path class="${cls}" transform="translate(${x} ${y}) rotate(${rot})" d="M0 0 C-6 -6 -6 -14 0 -20 C6 -14 6 -6 0 0Z" fill="${c}" opacity=".8"/>`;

// each scene: top sky (390x300) + bottom ground (390x150)
const S = {
  today: {
    sky: ["#FBE3A0", "#FBF1D6"],
    top: `<circle cx="318" cy="70" r="70" fill="#FBE7A6" opacity=".45"/><circle cx="318" cy="70" r="34" fill="#F6D86B" opacity=".75"/>
      <g class="sc-drift">${cloud(40, 60, 1.1)}${cloud(180, 110, .8, .8)}</g><g class="sc-drift2">${cloud(260, 150, .7, .7)}</g>
      <path d="M120 70 q5 -5 10 0 q5 -5 10 0" stroke="#B9A88E" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M150 52 q4 -4 8 0 q4 -4 8 0" stroke="#B9A88E" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
    bottom: `<path d="M0 80 Q90 40 190 70 T390 60 V150 H0Z" fill="#CFE3D4"/><path d="M0 110 Q110 80 230 104 T390 96 V150 H0Z" fill="#B7D3BF"/>
      ${flower(40, 96, "#E8A0A0")}${flower(70, 104, "#C9CBF3")}${flower(300, 88, "#F4B6D2")}${flower(330, 98, "#E8A0A0")}${flower(355, 92, "#C9CBF3")}`
  },
  calendar: {
    sky: ["#C9CBF3", "#ECEBFB"],
    top: `<path d="M330 36 A34 34 0 1 0 352 96 A27 27 0 1 1 330 36Z" fill="#F6D86B" opacity=".85"/>
      ${star(60, 50, 2.4, "#fff", "sc-tw")}${star(120, 90, 1.6, "#fff", "sc-tw d2")}${star(220, 40, 2, "#fff", "sc-tw d3")}${star(270, 120, 1.5, "#fff", "sc-tw")}${star(30, 130, 1.6, "#fff", "sc-tw d2")}${star(180, 150, 1.4, "#fff", "sc-tw d3")}
      <g class="sc-drift">${cloud(150, 80, .9, .7)}</g>`,
    bottom: `<path d="M0 90 Q100 50 200 80 T390 70 V150 H0Z" fill="#D9D9F6"/><path d="M0 118 Q120 92 240 112 T390 104 V150 H0Z" fill="#C9CBF3"/>
      <g fill="#fff" opacity=".7"><circle cx="60" cy="126" r="1.4"/><circle cx="160" cy="132" r="1.2"/><circle cx="300" cy="124" r="1.4"/></g>`
  },
  money: {
    sky: ["#F8D2B8", "#FCEDE2"],
    top: `<g class="sc-float">${coin(56, 80, 14)}${coin(330, 60, 18)}</g><g class="sc-float d2">${coin(250, 130, 10)}${coin(120, 150, 8)}</g>
      ${star(200, 60, 2.2, "#F6D86B", "sc-tw")}${star(290, 110, 1.6, "#F6D86B", "sc-tw d2")}${star(90, 40, 1.6, "#F6D86B", "sc-tw d3")}
      <g class="sc-drift">${cloud(150, 96, .8, .75)}</g>`,
    bottom: `<path d="M0 92 Q100 64 200 86 T390 78 V150 H0Z" fill="#F8DCC8"/><path d="M0 120 Q120 98 240 116 T390 108 V150 H0Z" fill="#F3CBB2"/>
      <g transform="translate(300 64)"><rect x="0" y="22" width="34" height="8" rx="3" fill="#F6D86B" stroke="#E5B93A"/><rect x="2" y="14" width="34" height="8" rx="3" fill="#F6D86B" stroke="#E5B93A"/><rect x="-1" y="6" width="34" height="8" rx="3" fill="#F6D86B" stroke="#E5B93A"/></g>`
  },
  goals: {
    sky: ["#BFE3E6", "#E8F4F2"],
    top: `<circle cx="70" cy="70" r="26" fill="#F6D86B" opacity=".7"/>
      <path d="M150 210 L235 90 L320 210Z" fill="#C8DECF" opacity=".9"/><path d="M235 90 l-14 20 l14 -6 l14 6z" fill="#fff"/>
      <path d="M60 230 L140 130 L220 230Z" fill="#B7D3BF" opacity=".8"/>
      <rect x="234" y="62" width="2" height="28" fill="#6E7196"/><path class="a-wave" style="transform-origin:236px 64px" d="M236 62 q10 -3 18 1 q-3 4 0 8 q-8 -4 -18 -1z" fill="#E8A0A0"/>
      <g class="sc-drift">${cloud(260, 40, .8, .8)}</g><g class="sc-drift2">${cloud(10, 120, .7, .7)}</g>`,
    bottom: `<path d="M0 86 Q100 56 200 80 T390 70 V150 H0Z" fill="#CFE3D4"/><path d="M0 116 Q120 92 240 110 T390 102 V150 H0Z" fill="#B7D3BF"/>
      <path d="M180 150 Q200 120 240 108" stroke="#F3E6D6" stroke-width="10" fill="none" stroke-linecap="round" opacity=".9"/>`
  },
  learn: {
    sky: ["#C8E6D2", "#EAF5EE"],
    top: `${leaf(60, 70, -30, "#9CBBA4", "sc-fall")}${leaf(300, 50, 25, "#7FA38A", "sc-fall d2")}${leaf(200, 120, -10, "#C8DECF", "sc-fall d3")}
      <g class="sc-float" transform="translate(110 40)"><path d="M0 10 L34 0 L14 18Z" fill="#fff"/><path d="M14 18 L18 10 L34 0Z" fill="#E9E9FB"/></g>
      ${star(330, 120, 2, "#F6D86B", "sc-tw")}${star(30, 140, 1.6, "#F6D86B", "sc-tw d2")}
      <g class="sc-drift">${cloud(220, 70, .8, .75)}</g>`,
    bottom: `<path d="M0 96 Q110 70 220 92 T390 84 V150 H0Z" fill="#D7EADD"/>
      <g transform="translate(26 74)"><rect width="62" height="12" rx="3" fill="#C9CBF3"/><rect x="6" y="-12" width="54" height="12" rx="3" fill="#E8A0A0"/><rect x="2" y="-24" width="58" height="12" rx="3" fill="#F6D86B"/></g>
      <g transform="translate(320 58)"><path d="M-12 30 h24 l-3 16 h-18z" fill="#F3E6D6" stroke="#E3D3BF"/><path d="M0 30 C-10 20 -10 8 0 0 C10 8 10 20 0 30Z" fill="#7FA38A"/></g>`
  }
};
function svg(vb, inner, defs = "") { return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden="true">${defs}${inner}</svg>`; }
function build(root) {
  root.innerHTML = Object.entries(S).map(([k, v]) => `<div class="scene" data-scene="${k}">
    <div class="sky" style="background:linear-gradient(180deg, ${v.sky[0]} 0%, ${v.sky[1]} 100%)">${svg("0 0 390 300", v.top)}</div>
    <div class="ground">${svg("0 0 390 150", v.bottom)}</div></div>`).join("");
}
let current = null;
function show(tab) {
  const root = document.getElementById("bg"); if (!root) return;
  if (!root.childElementCount) build(root);
  if (tab === current) return; current = tab;
  root.querySelectorAll(".scene").forEach(el => el.classList.toggle("on", el.dataset.scene === tab));
}
return { show };
})();
