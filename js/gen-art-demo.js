/* Gen ART interactive demo: web port of the Processing sketch "Blackholes"
   (Wormhole_loop.pde + Sterren.pde + Balletje.pde).
   Scene 0 = Stars (+ black-hole GIF), Scene 1 = Wormhole, Scene 2 = Rings.
   The three knobs replace the Arduino potentiometers, the beat is simulated
   (or follows assets/abyss.mp3 when "Play music" is on).
   p5.js is only loaded when the visitor presses "Launch". */
(function () {
  const root = document.getElementById("gen-demo");
  if (!root) return;

  const P5_URL = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js";
  const GIF_SRC = "assets/Bhole1.gif";
  const AUDIO_SRC = "assets/abyss.mp3";
  const stage = root.querySelector(".demo-stage");
  const launchBtn = root.querySelector(".demo-launch");
  const status = root.querySelector(".demo-status");

  const INKS = { white: [255, 255, 255], cyan: [0, 238, 255], ember: [255, 110, 30] };
  /* knob = potentiometer 1, 2, 3 (0..1). A null label hides that knob. */
  const SCENES = {
    stars:    { labels: ["Star amount", "Star speed", null],              knobs: [0.45, 0.5, 0] },
    wormhole: { labels: ["Move down", "Move left", "Star speed"],         knobs: [0.15, 0.1, 0.3] },
    rings:    { labels: [null, "Spread", "Wave"],                         knobs: [0, 0.35, 0.5] }
  };
  const state = { scene: "stars", ink: "white", beat: true, bpm: 120, music: false };
  const MAX_STARS = 2500;
  const starCount = () => Math.round(150 + SCENES.stars.knobs[0] * (MAX_STARS - 150));

  const msgEl = root.querySelector(".demo-msg");
  const msg = (t) => { if (msgEl) msgEl.textContent = t || ""; };
  let p5inst = null, paused = false, resetRequested = false;
  let gif = null, audio = null, actx = null, analyser = null, freq = null, live = false, pulseNow = 0;

  /* "raw" frequency band value (0..~30), like fa.getAvgRaw(i) */
  function band(i, t) {
    if (live && analyser) {
      const g = Math.min(i, 23) * 16;
      let s = 0;
      for (let k = g; k < g + 16; k++) s += freq[k];
      return (s / 16 / 255) * 30;
    }
    return 30 * (0.12 + 0.88 * pulseNow) * (0.65 + 0.35 * Math.sin(i * 1.7 + t * 0.001));
  }

  function sketch(p) {
    let w = 0, h = 0, sc = 1, sm0 = 0, sm1 = 0, sm2 = 0;
    const stars = Array.from({ length: MAX_STARS }, () => ({ x: 0, y: 0, z: 0, pz: 0 }));

    p.setup = function () {
      w = stage.clientWidth; h = stage.clientHeight;
      p.createCanvas(w, h).parent(stage);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    };
    p.windowResized = function () {
      const nw = stage.clientWidth, nh = stage.clientHeight;
      if (!w || (nw === w && nh === h)) return;
      w = nw; h = nh; p.resizeCanvas(w, h);
    };

    /* Sterren.pde: stars flying at the camera */
    function drawStars(v, lines, c, t) {
      const size = Math.max(1.5, p.map(band(10, t) * 10, 0, 255, 4, 16, true) * sc);
      const n = starCount();
      p.fill(c[0], c[1], c[2]);
      p.strokeWeight(1);
      for (let i = 0; i < n; i++) {
        const s = stars[i];
        s.z -= v;
        if (s.z < 1) {
          s.x = (Math.random() - 0.5) * w;
          s.y = (Math.random() - 0.5) * w;
          s.z = Math.random() * w;
          s.pz = s.z;
        }
        const sx = (s.x / s.z) * w, sy = (s.y / s.z) * w;
        p.noStroke();
        p.circle(sx, sy, size);
        if (lines) {
          p.stroke(c[0], c[1], c[2]);
          p.line((s.x / s.pz) * w, (s.y / s.pz) * w, sx, sy);
        }
      }
    }

    p.draw = function () {
      if (resetRequested) { resetRequested = false; stars.forEach((s) => (s.z = 0)); }
      const t = p.millis();
      const beats = (t / 60000) * state.bpm;
      pulseNow = state.beat ? Math.exp(-(beats % 1) * 5) : 0;
      root.style.setProperty("--pulse", pulseNow.toFixed(3));
      if (live && analyser) analyser.getByteFrequencyData(freq);
      sc = Math.max(0.45, Math.min(w, h) / 1080);

      const isStars = state.scene === "stars";
      const inv = isStars && state.beat && Math.floor(beats / 2) % 2 === 1; /* invert every 2nd beat */
      let c = INKS[state.ink];
      if (inv) c = c.map((v) => 255 - v);
      stage.style.background = inv ? "#fff" : "#000";
      if (gif) gif.style.display = isStars ? "" : "none";
      p.blendMode(p.BLEND);

      if (isStars) {
        p.clear();
        p.translate(w / 2, h / 2);
        const k = SCENES.stars.knobs;
        drawStars(k[1] * 10 * (w / 1920), true, c, t);
      } else if (state.scene === "wormhole") {
        drawWormhole(c, t);
      } else {
        drawRings(c, t);
      }
    };

    /* Scene 2 of the sketch: noise-driven wormhole + stars */
    function drawWormhole(c, t) {
      const k = SCENES.wormhole.knobs, W = Math.min(w, h), F = p.frameCount / 2;
      sm0 = p.lerp(sm0, band(2, t), 0.1);
      sm1 = p.lerp(sm1, band(14, t), 0.1);
      sm2 = p.lerp(sm2, band(18, t), 0.1);
      p.background(0);
      p.translate(w / 2, h / 2);
      p.stroke(c[0], c[1], c[2]);
      for (let i = 1; i < W * 2; i += 2) {
        const d = Math.sqrt(i * k[0] * 400), l = Math.sqrt(i * k[1] * 400);
        const u = Math.sqrt(i * sm1), r = Math.sqrt(i * sm2);
        const adj = Math.pow(i / (W / 2), 3) * (W / 4) + sm0;
        const N = p.noise(i * 0.1 - F) * 99 + F * 0.01;
        p.strokeWeight(i * 0.008);
        p.line(Math.cos(N) * adj - l + r, d + Math.sin(N) * adj - u,
               Math.cos(N + 0.2) * adj - l + r, d + Math.sin(N + 0.2) * adj - u);
      }
      drawStars(k[2] * 10 * (w / 1920), false, [255, 255, 255], t);
    }

    /* Balletje.pde: rings of dots that pulse outward, additive blend */
    function drawRings(c, t) {
      const k = SCENES.rings.knobs, f = p.frameCount / 2, k3 = Math.max(0.02, k[2]);
      const dot = Math.max(2, band(14, t) * 0.35) * sc;
      p.background(0);
      p.blendMode(p.ADD);
      p.translate(w / 2, h / 2);
      p.noStroke();
      p.fill(c[0], c[1], c[2]);
      for (let r = 10; r < 100; r += 4) {
        const n = r / 2;
        const disp = p.map(r, 4, 192, k[1] * 1000, 0);
        const val = Math.cos(f + r / (k3 * 100)) / 2 + 0.5;
        const rad = (r + val * disp) * sc;
        for (let i = 0; i < n; i++) {
          const th = (i / n) * Math.PI * 2;
          p.circle(rad * Math.cos(th), rad * Math.sin(th), dot);
        }
      }
      p.blendMode(p.BLEND);
    }

    p.demoReset = () => { resetRequested = true; };
  }

  /* ---------- lazy-load p5, then start ---------- */
  function start() {
    root.classList.add("is-live");
    gif = document.createElement("img");
    gif.className = "demo__gif"; gif.alt = "";
    gif.onerror = () => msg("Could not find " + GIF_SRC + ". Put Bhole1.gif in the assets folder.");
    gif.src = GIF_SRC;
    stage.insertBefore(gif, stage.firstChild);
    p5inst = new window.p5(sketch);
    new ResizeObserver(() => p5inst && p5inst.windowResized && p5inst.windowResized()).observe(stage);
    new IntersectionObserver((entries) => {
      if (!p5inst || paused) return;
      entries[0].isIntersecting ? p5inst.loop() : p5inst.noLoop();
    }, { threshold: 0.05 }).observe(stage);
  }
  function launch() {
    launchBtn.disabled = true;
    status.textContent = "Loading…";
    if (window.p5) return start();
    const s = document.createElement("script");
    s.src = P5_URL;
    s.onload = () => { status.textContent = ""; start(); };
    s.onerror = () => { launchBtn.disabled = false; status.textContent = "Could not load the demo. Check your connection and try again."; };
    document.head.appendChild(s);
  }
  launchBtn.addEventListener("click", launch);

  /* ---------- controls ---------- */
  const knobEls = [...root.querySelectorAll("[data-knob]")];
  function showKnobs() {
    const sc = SCENES[state.scene];
    knobEls.forEach((el, i) => {
      const lab = root.querySelector('label[for="' + el.id + '"]');
      const on = !!sc.labels[i];
      lab.style.display = el.style.display = on ? "" : "none";
      if (!on) return;
      lab.firstElementChild.textContent = sc.labels[i];
      el.value = Math.round(sc.knobs[i] * 100);
      lab.querySelector("output").textContent = el.value;
    });
  }
  knobEls.forEach((el, i) => el.addEventListener("input", () => {
    SCENES[state.scene].knobs[i] = Number(el.value) / 100;
    root.querySelector('label[for="' + el.id + '"] output').textContent = el.value;
  }));

  root.querySelectorAll("[data-param]").forEach((el) => {
    const out = root.querySelector('output[for="' + el.id + '"]');
    const apply = () => { state[el.dataset.param] = el.type === "checkbox" ? el.checked : Number(el.value); if (out) out.textContent = el.value; };
    el.addEventListener("input", apply); apply();
  });
  function pick(attr, key, after) {
    const btns = root.querySelectorAll("[" + attr + "]");
    btns.forEach((b) => b.addEventListener("click", () => {
      state[key] = b.getAttribute(attr);
      btns.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      if (after) after();
    }));
  }
  pick("data-scene", "scene", () => { showKnobs(); if (p5inst) p5inst.demoReset(); });
  pick("data-ink", "ink");
  showKnobs();

  /* music: drives the frequency bands through the Web Audio analyser */
  const musicEl = root.querySelector("#d-music");
  musicEl.addEventListener("change", async () => {
    state.music = musicEl.checked;
    msg("");
    if (!state.music) { live = false; audio && audio.pause(); return; }
    try {
      if (!audio) {
        audio = new Audio(AUDIO_SRC); audio.loop = true;
        audio.addEventListener("error", () => {
          msg("Could not load " + AUDIO_SRC + ". Put abyss.mp3 in the assets folder.");
          musicEl.checked = state.music = live = false;
        });
      }
      await audio.play();
      /* Reading the audio only works on http(s); from file:// the browser mutes it. */
      if (location.protocol === "file:") { msg("Playing, beat is simulated. Use a local server (e.g. Live Server) to make the visuals follow the music."); return; }
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const src = actx.createMediaElementSource(audio);
        analyser = actx.createAnalyser(); analyser.fftSize = 2048;
        src.connect(analyser); analyser.connect(actx.destination);
        freq = new Uint8Array(analyser.frequencyBinCount);
      }
      await actx.resume(); live = true;
    } catch (e) {
      console.warn("Gen ART demo audio:", e);
      if (!msgEl.textContent) msg("Could not play the music. Check that assets/abyss.mp3 exists.");
      musicEl.checked = state.music = live = false;
    }
  });

  const pauseBtn = root.querySelector('[data-action="pause"]');
  pauseBtn.addEventListener("click", () => {
    if (!p5inst) return;
    paused = !paused;
    paused ? p5inst.noLoop() : p5inst.loop();
    if (audio) paused ? audio.pause() : state.music && audio.play();
    pauseBtn.textContent = paused ? "Play" : "Pause";
  });
  root.querySelector('[data-action="reset"]').addEventListener("click", () => p5inst && p5inst.demoReset());

  /* save: compose background + GIF layer + canvas into one PNG */
  root.querySelector('[data-action="save"]').addEventListener("click", () => {
    const cv = stage.querySelector("canvas");
    if (!cv) return;
    const out = document.createElement("canvas");
    out.width = cv.width; out.height = cv.height;
    const g = out.getContext("2d");
    g.fillStyle = stage.style.background || "#000";
    g.fillRect(0, 0, out.width, out.height);
    if (gif && gif.style.display !== "none" && gif.complete && gif.naturalWidth) {
      const gw = (gif.getBoundingClientRect().width / stage.clientWidth) * out.width;
      const gh = (gw * gif.naturalHeight) / gif.naturalWidth;
      g.drawImage(gif, (out.width - gw) / 2, (out.height - gh) / 2, gw, gh);
    }
    g.drawImage(cv, 0, 0);
    const a = document.createElement("a");
    a.download = "gen-art-" + state.scene + ".png";
    a.href = out.toDataURL("image/png");
    a.click();
  });
})();