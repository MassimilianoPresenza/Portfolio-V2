/* XPath weight-blending demo. Preset values come from the project's Tables 2-4. */
(() => {
  const root = document.getElementById("xp-demo");
  if (!root) return;
  const P = {
    read:  { LengthPenaltyWeight: 2.0, DoubleSlashWeight: 0.1, StabilityWeight: 0.3, XPathNavigatorMovesWeight: 0.1, RecallWeight: 1 },
    speed: { LengthPenaltyWeight: 0.1, DoubleSlashWeight: 3.0, StabilityWeight: 1,   XPathNavigatorMovesWeight: 3.0, RecallWeight: 1 },
    flex:  { LengthPenaltyWeight: 1,   DoubleSlashWeight: 0.1, StabilityWeight: 3.0, XPathNavigatorMovesWeight: 1,   RecallWeight: 6.0 }
  };
  const names = Object.keys(P.read);
  const MAX = 6;
  const inputs = { read: root.querySelector("#x-read"), speed: root.querySelector("#x-speed"), flex: root.querySelector("#x-flex") };
  const outs = { read: root.querySelector("#o-read"), speed: root.querySelector("#o-speed"), flex: root.querySelector("#o-flex") };
  const wrap = document.getElementById("xp-weights");
  const rows = {};
  names.forEach(n => {
    const d = document.createElement("div"); d.className = "xp-w";
    d.innerHTML = `<span>${n}</span><div class="bar-track"><i></i></div><output></output>`;
    wrap.appendChild(d); rows[n] = d;
  });
  const XP = {
    read:  { q: "//Word[@Text='20']", tags: ["short", "uses //", "easy to read"] },
    speed: { q: "/Document/Page/Paragraph/Line/Word[@Text='20']", tags: ["longer", "direct child steps", "fast to evaluate"] },
    flex:  { q: "//Word[@Text='20']", tags: ["short", "uses //", "resilient to UI changes"] }
  };
  const a = () => { const v = {}; let s = 0; for (const k in inputs) { v[k] = +inputs[k].value; s += v[k]; } for (const k in v) v[k] = s ? v[k] / s : 1 / 3; return v; };

  function render() {
    const al = a();
    for (const k in outs) outs[k].textContent = Math.round(al[k] * 100) + "%";
    names.forEach(n => {
      const w = al.read * P.read[n] + al.speed * P.speed[n] + al.flex * P.flex[n];
      rows[n].querySelector("i").style.width = Math.min(100, (w / MAX) * 100) + "%";
      rows[n].querySelector("output").textContent = w.toFixed(1);
    });
    const top = Object.keys(al).sort((x, y) => al[y] - al[x])[0];
    const mixed = al[top] < 0.5;
    const x = XP[top];
    document.getElementById("xp-out").textContent = x.q;
    document.getElementById("xp-tags").innerHTML = (mixed ? ["balanced mix"] : []).concat(x.tags).map(t => `<span>${t}</span>`).join("");
  }

  /* keep the three sliders adding up to 100 by scaling the other two */
  root.addEventListener("input", e => {
    const k = e.target.dataset.k; if (!k) return;
    const others = Object.keys(inputs).filter(o => o !== k);
    const v = +e.target.value, rest = 100 - v;
    const sum = others.reduce((s, o) => s + +inputs[o].value, 0);
    /* first slider rounds, the last one takes the remainder, so the total is always exactly 100 */
    const first = sum ? Math.round(+inputs[others[0]].value / sum * rest) : Math.round(rest / 2);
    inputs[others[0]].value = first;
    inputs[others[1]].value = rest - first;
    render();
  });
  root.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    const p = b.dataset.preset;
    for (const k in inputs) inputs[k].value = k === p ? 100 : 0;
    render();
  }));
  render();
})();