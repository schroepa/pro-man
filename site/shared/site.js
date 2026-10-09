/** Locale preference for `/` redirect + language switcher. */
(function () {
  var KEY = "proman_locale";
  document.querySelectorAll("[data-set-locale]").forEach(function (el) {
    el.addEventListener("click", function () {
      var locale = el.getAttribute("data-set-locale");
      if (locale === "de" || locale === "en") {
        try {
          localStorage.setItem(KEY, locale);
        } catch (e) { /* ignore */ }
      }
    });
  });
})();

/**
 * Hero breathing dots — quiet take on Dave Whyte / Codrops radial pulse.
 * Hex grid + rounded-square wave; mouse is the wave origin.
 * Size only (≤4px), no lines. Fades out at the bottom of the hero.
 * pointer-events: none. Respects prefers-reduced-motion.
 */
(function () {
  var canvas = document.querySelector("[data-vault-graph]");
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;

  var hero = canvas.closest(".landing-hero");
  if (!hero) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var width = 0;
  var height = 0;
  var nodes = [];
  var mouse = { x: 0, y: 0, active: false, tx: 0, ty: 0 };
  var origin = { x: 0, y: 0 };
  var raf = 0;
  var visible = true;
  var t0 = performance.now();

  var MAX_D = 4; // max diameter (px)
  var BASE_D = 1.6;
  var WAVE_FREQ = 0.22; // breath cycles / sec — slower = calmer
  var WAVE_DELTA = 0.45; // rounder than Codrops demo → softer plateaus
  var PHASE_PER_PX = 0.0065; // radial lag → ripple travel

  function cssColor(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  /** Rounded square wave ∈ [-a, a] — Codrops / Dave Whyte. */
  function roundedSquareWave(t, delta, a, f) {
    return ((2 * a) / Math.PI) * Math.atan(Math.sin(2 * Math.PI * t * f) / delta);
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedGrid();
    // Default wave origin: slightly right of copy (toward the mock)
    origin.x = width * 0.58;
    origin.y = height * 0.42;
    mouse.tx = origin.x;
    mouse.ty = origin.y;
    mouse.x = origin.x;
    mouse.y = origin.y;
    if (reduceMotion) draw(0);
  }

  function seedGrid() {
    var rand = mulberry32(0xb7ea7e);
    var spacing = width < 640 ? 34 : width < 960 ? 30 : 28;
    nodes = [];
    var cols = Math.ceil(width / spacing) + 2;
    var rows = Math.ceil(height / spacing) + 2;
    var i = 0;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        // Hex-ish stagger + light noise (Codrops approach, quieter noise)
        var x = col * spacing + (row % 2) * (spacing * 0.5) + (rand() - 0.5) * spacing * 0.22;
        var y = row * spacing * 0.86 + (rand() - 0.5) * spacing * 0.2;
        if (x < -8 || x > width + 8 || y < -8 || y > height + 8) continue;
        nodes.push({ x: x, y: y });
        i++;
      }
    }
  }

  /** Soft dissolve into the section below. */
  function bottomFade(y) {
    var t = y / height;
    if (t < 0.5) return 1;
    if (t > 0.97) return 0;
    var u = (t - 0.5) / 0.47;
    return 1 - u * u * (3 - 2 * u);
  }

  function onPointerMove(e) {
    if (!finePointer || reduceMotion) return;
    var rect = hero.getBoundingClientRect();
    mouse.tx = e.clientX - rect.left;
    mouse.ty = e.clientY - rect.top;
    mouse.active = true;
  }

  function onPointerLeave() {
    mouse.active = false;
    // Ease origin back toward soft resting point
    mouse.tx = width * 0.58;
    mouse.ty = height * 0.42;
  }

  function step(now) {
    if (!visible) {
      raf = 0;
      return;
    }

    step._last = now;
    var time = (now - t0) / 1000;

    // Origin follows the cursor smoothly; idle returns to rest
    var follow = mouse.active ? 0.08 : 0.04;
    mouse.x += (mouse.tx - mouse.x) * follow;
    mouse.y += (mouse.ty - mouse.y) * follow;
    origin.x = mouse.x;
    origin.y = mouse.y;

    draw(time);
    if (!reduceMotion) raf = requestAnimationFrame(step);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    var ink = cssColor("--neutral-7", "#948d7d");
    var brand = cssColor("--brand-9", "#c25e1a");

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var fade = bottomFade(n.y);
      if (fade < 0.02) continue;

      var dx = n.x - origin.x;
      var dy = n.y - origin.y;
      var dist = Math.hypot(dx, dy);

      // Radial phase: wave travels outward from origin
      var waveT = time - dist * PHASE_PER_PX;
      var wave = reduceMotion
        ? 0
        : roundedSquareWave(waveT, WAVE_DELTA, 1, WAVE_FREQ);
      // wave ∈ [-1, 1] → breath 0…1 (small → large → small)
      var breath = (wave + 1) * 0.5;

      var diameter = BASE_D + (MAX_D - BASE_D) * breath;
      var r = diameter * 0.5;

      // Quiet on light canvas — readable as a field, not a focal point
      var alpha = (0.16 + breath * 0.14) * fade;

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      // Sparse copper accents — mostly neutral ink
      ctx.fillStyle = i % 17 === 0 ? brand : ink;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  resize();

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(function () { resize(); }).observe(hero);
  } else {
    window.addEventListener("resize", resize);
  }

  if (finePointer && !reduceMotion) {
    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave);
  }

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0] && entries[0].isIntersecting;
        if (visible && !reduceMotion && !raf) {
          raf = requestAnimationFrame(step);
        }
      },
      { threshold: 0.05 }
    ).observe(hero);
  }

  if (reduceMotion) {
    draw(0);
  } else {
    raf = requestAnimationFrame(step);
  }
})();
