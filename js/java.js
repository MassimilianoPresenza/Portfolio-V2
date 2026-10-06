/* ===== 0. LOADING SCREEN: only shown when the page is slow =====
   The screen is pure CSS (see "LOADING SCREEN" in style.css). If the page is
   still loading after SHOW_AFTER ms we show it, and once it has appeared it
   stays at least MIN_VISIBLE ms so it never just flashes. Fast pages never see it. */
(() => {
  const root = document.documentElement;
  const SHOW_AFTER = 400, MIN_VISIBLE = 700;
  let shownAt = 0, done = false;
  const timer = setTimeout(() => {
    if (done) return;
    shownAt = performance.now();
    root.classList.add("loader-show");
  }, SHOW_AFTER);
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    const wait = shownAt ? Math.max(0, shownAt + MIN_VISIBLE - performance.now()) : 0;
    setTimeout(() => root.classList.add("loaded"), wait);
  };
  document.readyState === "complete" ? finish() : window.addEventListener("load", finish);
  setTimeout(finish, 8000);   /* failsafe: never block a page for more than 8s */
})();

const icon = document.getElementById("theme-icon");
const logo = document.querySelector(".logo-img");

const ICONS = {
  dark:  { icon: "assets/icon-theme-sun.svg",  hover: "assets/icon-theme-sun-hover.svg",  logo: "assets/logo.svg" },
  light: { icon: "assets/icon-theme-moon.svg", hover: "assets/icon-theme-moon-hover.svg", logo: "assets/logo-dark.svg" }
};

// Read the saved choice (default: dark). try/catch because storage can be blocked.
let isDark = true;
try { isDark = localStorage.getItem("theme") !== "light"; } catch (e) {}

function applyTheme() {
  document.body.classList.toggle("light-mode", !isDark);
  const set = isDark ? ICONS.dark : ICONS.light;
  if (icon) icon.src = set.icon;
  if (logo) logo.src = set.logo;
}

function toggleTheme() {
  isDark = !isDark;
  try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch (e) {}
  applyTheme();
}

applyTheme();   // apply the saved theme on every page load

// Hover icons (only if the theme icon exists on this page)
if (icon) {
  icon.addEventListener("mouseover", () => {
    icon.src = (isDark ? ICONS.dark : ICONS.light).hover;
  });
  icon.addEventListener("mouseleave", () => {
    icon.src = (isDark ? ICONS.dark : ICONS.light).icon;
  });
}

/* ===== 4. EXPERIENCE: animate skill bars when visible ===== */
const panelObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      panelObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.25 });

document.querySelectorAll(".exp-panel").forEach((panel) => panelObserver.observe(panel));


/* ===== 5. FIGMA PROTOTYPE EMBEDS: load the iframe only after a click ===== */
document.querySelectorAll("[data-embed]").forEach((frame) => {
  const launch = frame.querySelector(".proto-launch");
  if (!launch) return;
  launch.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.src = frame.dataset.embed;
    iframe.title = frame.dataset.title || "Interactive prototype";
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "fullscreen");
    frame.appendChild(iframe);
    frame.classList.add("is-live");

    const fs = document.createElement("button");
    fs.type = "button";
    fs.className = "proto-fs btn animated-gradient-border";
    fs.textContent = "Fullscreen";
    fs.addEventListener("click", () => {
      const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
      if (req) req.call(frame);
    });
    frame.insertAdjacentElement("afterend", fs);
  });
});


/* ===== 6. ABOUT: rotating role words (skipped for reduced motion) ===== */
(() => {
  const el = document.querySelector("[data-rotate]");
  if (!el) return;
  const words = el.dataset.rotate.split("|");
  if (words.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    el.classList.add("is-out");
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove("is-out");
    }, 350);
  }, 2600);
})();


/* ===== 7. ABOUT + HOME: filter skills by category and replay the bars ===== */
(() => {
  const bar = document.querySelector(".skill-filter");
  if (!bar) return;
  const panel = bar.closest(".skills-panel");
  if (!panel) return;
  const skills = panel.querySelectorAll(".skill[data-cat]");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const cat = btn.dataset.filter;
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    skills.forEach((s) => {
      const hide = cat !== "all" && s.dataset.cat !== cat;
      s.hidden = hide;
      s.style.display = hide ? "none" : "";   /* works even if CSS sets display on .skill */
    });
    const fills = panel.querySelectorAll(".skill:not([hidden]) .bar-fill");
    fills.forEach((f) => { f.style.transition = "none"; f.style.transform = "scaleX(0)"; });
    void panel.offsetWidth;                     /* force a reflow so the reset sticks */
    fills.forEach((f) => { f.style.transition = ""; f.style.transform = ""; });
  });
})();

/* ===== 8. EASTER EGG: Konami code (or 5 quick taps on "Let's Connect") opens play.html ===== */
(() => {
  const seq = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let p = 0;
  document.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    p = k === seq[p] ? p + 1 : (k === seq[0] ? 1 : 0);
    if (p === seq.length) { p = 0; location.href = "play.html"; }
  });
  const t = document.querySelector(".footer");
  if (!t) return;
  let taps = 0, timer;
  t.addEventListener("click", () => {
    taps++; clearTimeout(timer);
    timer = setTimeout(() => (taps = 0), 2000);
    if (taps >= 5) location.href = "play.html";
  });
})();

/* ===== 9. PROJECT PAGES: preview bubbles (The Star). One open at a time, Esc closes ===== */
(() => {
  const btns = document.querySelectorAll(".peek-btn");
  if (!btns.length) return;
  const close = (b) => {
    b.setAttribute("aria-expanded", "false");
    b.textContent = "Preview";
    document.getElementById(b.getAttribute("aria-controls")).hidden = true;
  };
  btns.forEach((b) => b.addEventListener("click", () => {
    const wasOpen = b.getAttribute("aria-expanded") === "true";
    btns.forEach(close);
    if (!wasOpen) {
      b.setAttribute("aria-expanded", "true");
      b.textContent = "Close preview";
      document.getElementById(b.getAttribute("aria-controls")).hidden = false;
    }
  }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") btns.forEach(close); });
})();
