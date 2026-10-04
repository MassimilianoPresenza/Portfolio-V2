/* space-bg.js  (only loaded on project-the-star.html)
   Twinkling, drifting stars with soft halos, plus a subtle cursor effect:
   a faint glow trails the cursor and nearby stars brighten and connect.
   Follows the light/dark theme (body.light-mode), is static for "reduce motion"
   and has no cursor effect on touch screens.
   Easy knobs are the four numbers at the top. */
(function () {
  var STAR_DENSITY = 7000;   // bigger number = fewer stars
  var MAX_STARS    = 260;
  var CURSOR_RADIUS = 160;   // how far the cursor effect reaches (px)
  var LINK_DIST     = 120;   // max distance for constellation lines (px)
  var SHOOTING_STARS = true; // a rare shooting star every ~15-30 s

  var reduce   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
  document.body.prepend(cv);
  var ctx = cv.getContext('2d');

  var W = 0, H = 0, stars = [], shoot = null, nextShoot = 0;
  var mx = -9999, my = -9999;            // real cursor
  var gx = -9999, gy = -9999;            // smoothed glow position
  var intensity = 0, targetIntensity = 0; // fades in/out when the cursor enters/leaves
  var lastT = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.min(MAX_STARS, Math.round(W * H / STAR_DENSITY));
    stars = [];
    for (var i = 0; i < n; i++) {
      var z = 0.3 + Math.random() * 0.7;             // depth: small = far away
      var k = Math.random();
      stars.push({
        x: Math.random() * W, y: Math.random() * H, z: z,
        r: 0.4 + z * 1.0, tw: Math.random() * 6.28, sp: 0.5 + Math.random() * 1.5,
        tint: k < 0.12 ? 1 : (k < 0.22 ? 2 : 0),     // 0 white, 1 cyan, 2 green
        glow: Math.random() < 0.25                  // ~1 in 4 stars gets a soft halo
      });
    }
    if (reduce) draw(0, true);
  }

  function isLight() { return document.body.classList.contains('light-mode'); }

  function starColor(s, light) {
    if (light) return s.tint === 1 ? '10,120,170' : s.tint === 2 ? '10,140,100' : '25,45,95';
    return s.tint === 1 ? '0,238,255' : s.tint === 2 ? '46,235,170' : '235,245,255';
  }

  function draw(t, still) {
    var dt = Math.min(50, t - lastT || 16); lastT = t;
    var light = isLight();
    var vis = light ? 0.6 : 1;                        // stars are a bit quieter on the light theme
    ctx.clearRect(0, 0, W, H);

    intensity += (targetIntensity - intensity) * 0.08;
    gx += (mx - gx) * 0.15; gy += (my - gy) * 0.15;
    var useCursor = canHover && !reduce && intensity > 0.01;

    // parallax: stars shift a few px against the cursor, far ones less
    var ox = useCursor ? -(mx / W - 0.5) * 16 : 0;
    var oy = useCursor ? -(my / H - 0.5) * 16 : 0;

    var near = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!still) {                                   // slow drift upward
        s.y -= 0.012 * s.z * dt;
        if (s.y < -2) { s.y = H + 2; s.x = Math.random() * W; }
      }
      var sway = still ? 0 : Math.sin(t * 0.0003 * s.sp + s.tw) * 3 * s.z;   // gentle side-to-side float
      var sx = s.x + ox * s.z + sway, sy = s.y + oy * s.z;
      var tw = 0.5 + 0.5 * Math.sin(t * 0.0012 * s.sp + s.tw);                // 0..1 twinkle
      var a = (0.2 + 0.5 * s.z) * (0.3 + 0.7 * tw) * vis;
      var r = s.r;

      if (useCursor) {
        var dx = sx - gx, dy = sy - gy, d = Math.sqrt(dx * dx + dy * dy);
        if (d < CURSOR_RADIUS) {
          var p = (1 - d / CURSOR_RADIUS) * intensity;
          a = Math.min(1, a + p * 0.75); r *= 1 + p * 0.6;
          near.push({ x: sx, y: sy, p: p });
        }
      }
      var col = starColor(s, light);
      if (s.glow && !still) {                           // soft halo that breathes with the twinkle
        var hr = r * (4 + 3 * tw);
        var hg = ctx.createRadialGradient(sx, sy, 0, sx, sy, hr);
        hg.addColorStop(0, 'rgba(' + col + ',' + (a * 0.35).toFixed(3) + ')');
        hg.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = hg; ctx.fillRect(sx - hr, sy - hr, hr * 2, hr * 2);
      }
      ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.fill();
    }

    if (useCursor) {
      // faint constellation lines between stars close to the cursor
      var line = light ? '10,120,170' : '0,238,255';
      ctx.lineWidth = 0.8;
      var m = Math.min(near.length, 16);
      for (var a1 = 0; a1 < m; a1++) {
        for (var b1 = a1 + 1; b1 < m; b1++) {
          var ddx = near[a1].x - near[b1].x, ddy = near[a1].y - near[b1].y;
          var dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd < LINK_DIST) {
            var la = (1 - dd / LINK_DIST) * Math.min(near[a1].p, near[b1].p) * 0.7;
            ctx.strokeStyle = 'rgba(' + line + ',' + la.toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(near[a1].x, near[a1].y); ctx.lineTo(near[b1].x, near[b1].y); ctx.stroke();
          }
        }
      }
      // soft glow that trails the cursor
      var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 140);
      var gc = light ? '10,150,200' : '0,238,255';
      g.addColorStop(0, 'rgba(' + gc + ',' + (0.20 * intensity).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + gc + ',0)');
      ctx.fillStyle = g; ctx.fillRect(gx - 140, gy - 140, 280, 280);
    }

    if (SHOOTING_STARS && !reduce && !still) {
      if (!shoot && t > nextShoot) {
        shoot = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.4, life: 0 };
        nextShoot = t + 15000 + Math.random() * 15000;
      }
      if (shoot) {
        shoot.life += dt; shoot.x += dt * 0.7; shoot.y += dt * 0.28;
        var f = 1 - shoot.life / 800;
        if (f <= 0) { shoot = null; }
        else {
          var sg = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - 90, shoot.y - 36);
          var sc = light ? '25,45,95' : '235,245,255';
          sg.addColorStop(0, 'rgba(' + sc + ',' + (0.8 * f * vis).toFixed(3) + ')');
          sg.addColorStop(1, 'rgba(' + sc + ',0)');
          ctx.strokeStyle = sg; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - 90, shoot.y - 36); ctx.stroke();
        }
      }
    }
  }

  function loop(t) { draw(t, false); requestAnimationFrame(loop); }

  window.addEventListener('resize', (function () {
    var id; return function () { clearTimeout(id); id = setTimeout(resize, 150); };
  })());

  if (canHover && !reduce) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      if (targetIntensity === 0) { gx = e.clientX; gy = e.clientY; }
      mx = e.clientX; my = e.clientY; targetIntensity = 1;
    }, { passive: true });
    document.addEventListener('mouseleave', function () { targetIntensity = 0; });
    window.addEventListener('blur', function () { targetIntensity = 0; });
  }

  nextShoot = 6000 + Math.random() * 8000;
  resize();
  if (reduce) {
    // static starfield: redraw when the theme toggles (body class changes)
    new MutationObserver(function () { draw(0, true); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  } else {
    requestAnimationFrame(loop);
  }
})();
