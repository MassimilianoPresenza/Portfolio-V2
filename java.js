const icon = document.getElementById("theme-icon");
const logo = document.querySelector(".logo-img");
let isDark = true;

function toggleTheme() {
  // Toggle light and dark mode
  document.body.classList.toggle("light-mode");
  isDark = !isDark;

  // Update the icons based on the theme mode
  icon.src = isDark ? "assets/light_mode_sun.svg" : "assets/dark_mode_moon.svg";
  logo.src = isDark ? "assets/logo.svg" : "assets/logo-dark.svg";
}

// Change the icon on hover
icon.addEventListener("mouseover", () => {
  if (isDark) {
    icon.src = "assets/sun_hover.svg"; // Set moon icon on hover (for light mode)
  } else {
    icon.src = "assets/moon_hover.svg"; // Set sun icon on hover (for dark mode)
  }
});

// pop-up button frontpage

// Popup functionality for frontpage buttons
const popupOverlay = document.getElementById('popup-overlay');
const popupClose = document.getElementById('popup-close');
const frontButtons = document.querySelectorAll('.buttons a');

frontButtons.forEach(btn => {
  btn.addEventListener('click', e => {
    if (!popupOverlay || btn.getAttribute('href') !== '#') return;
    e.preventDefault();

    const popupTitle = document.getElementById('popup-title');
    const title = btn.dataset.title; // <-- read custom title

    if (title) {
      popupTitle.textContent = title; // <-- set popup title
    }

    popupOverlay.classList.add('active');
  });
});



if (popupClose) popupClose.addEventListener('click', () => {
  popupOverlay.classList.remove('active');
});

if (popupOverlay) popupOverlay.addEventListener('click', e => {
  if (e.target === popupOverlay) {
    popupOverlay.classList.remove('active');
  }
});



// Revert to the appropriate icon after hover, depending on current theme
icon.addEventListener("mouseleave", () => {
  icon.src = isDark ? "assets/light_mode_sun.svg" : "assets/dark_mode_moon.svg";
});


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


/* ===== 7. ABOUT: filter skills by category and replay the bars ===== */
(() => {
  const bar = document.querySelector(".skill-filter");
  if (!bar) return;
  const panel = bar.closest(".skills-panel");
  const skills = panel.querySelectorAll(".skill[data-cat]");
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const cat = btn.dataset.filter;
    bar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    skills.forEach((s) => { s.hidden = cat !== "all" && s.dataset.cat !== cat; });
    const fills = panel.querySelectorAll(".skill:not([hidden]) .bar-fill");
    fills.forEach((f) => { f.style.transition = "none"; f.style.transform = "scaleX(0)"; });
    void panel.offsetWidth;                     /* force a reflow so the reset sticks */
    fills.forEach((f) => { f.style.transition = ""; f.style.transform = ""; });
  });
})();