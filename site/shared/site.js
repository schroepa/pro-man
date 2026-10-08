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
 * Hero “vault graph”: subtle connected nodes that enrich near the cursor.
 * pointer-events: none — decorative only. Respects prefers-reduced-motion.
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
  var edges = [];
  var mouse = { x: 0, y: 0, active: false, tx: 0, ty: 0 };
  var raf = 0;
  var visible = true;
  var t0 = performance.now();

  function cssColor(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
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
    seedGraph();
    if (reduceMotion) draw(0);
  }

  function seedGraph() {
    var rand = mulberry32(0x5070a11);
    var count = width < 640 ? 18 : width < 960 ? 26 : 34;
    nodes = [];
    edges = [];

    // Soft clusters: tasks · docs · knowledge — “connected & enriched”
    var clusters = [
      { x: 0.22, y: 0.42, kind: "task", n: Math.floor(count * 0.4) },
      { x: 0.55, y: 0.28, kind: "doc", n: Math.floor(count * 0.32) },
      { x: 0.78, y: 0.58, kind: "knowledge", n: 0 },
    ];
    clusters[2].n = count - clusters[0].n - clusters[1].n;

    for (var c = 0; c < clusters.length; c++) {
      var cl = clusters[c];
      for (var i = 0; i < cl.n; i++) {
        var ang = rand() * Math.PI * 2;
        var rad = (0.08 + rand() * 0.22) * Math.min(width, height);
        var hx = cl.x * width + Math.cos(ang) * rad * (0.55 + rand() * 0.7);
        var hy = cl.y * height + Math.sin(ang) * rad * (0.45 + rand() * 0.7);
        hx = Math.max(24, Math.min(width - 24, hx));
        hy = Math.max(24, Math.min(height - 24, hy));
        var size =
          cl.kind === "knowledge" ? 2.4 + rand() * 1.4 :
          cl.kind === "doc" ? 2 + rand() * 1.2 :
          1.6 + rand() * 1.1;
        nodes.push({
          hx: hx,
          hy: hy,
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          kind: cl.kind,
          cluster: c,
          r: size,
          phase: rand() * Math.PI * 2,
        });
      }
    }

    // Structural edges: within cluster + a few cross-links (enrichment)
    for (var a = 0; a < nodes.length; a++) {
      for (var b = a + 1; b < nodes.length; b++) {
        var na = nodes[a];
        var nb = nodes[b];
        var dx = na.hx - nb.hx;
        var dy = na.hy - nb.hy;
        var dist = Math.hypot(dx, dy);
        var same = na.cluster === nb.cluster;
        var maxDist = same ? Math.min(width, height) * 0.22 : Math.min(width, height) * 0.18;
        if (dist < maxDist && (same || rand() < 0.22)) {
          edges.push({ a: a, b: b, base: same ? 0.28 : 0.16 });
        }
      }
    }
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
  }

  function step(now) {
    if (!visible) {
      raf = 0;
      return;
    }

    var dt = Math.min(32, now - (step._last || now));
    step._last = now;
    var time = (now - t0) / 1000;

    // Soft follow so motion feels natural, not sticky
    mouse.x += (mouse.tx - mouse.x) * 0.12;
    mouse.y += (mouse.ty - mouse.y) * 0.12;

    var pullR = Math.min(width, height) * 0.28;
    var idle = !finePointer || !mouse.active;

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var targetX = n.hx;
      var targetY = n.hy;

      if (!reduceMotion) {
        targetX += Math.sin(time * 0.35 + n.phase) * 3.5;
        targetY += Math.cos(time * 0.28 + n.phase * 1.3) * 2.8;
      }

      if (!idle && !reduceMotion) {
        var mdx = mouse.x - n.x;
        var mdy = mouse.y - n.y;
        var md = Math.hypot(mdx, mdy);
        if (md < pullR && md > 0.1) {
          var influence = (1 - md / pullR);
          influence = influence * influence;
          // Gentle magnetic pull — closer nodes enrich toward the cursor
          targetX += mdx * influence * 0.22;
          targetY += mdy * influence * 0.22;
        }
      }

      var ax = (targetX - n.x) * 0.045;
      var ay = (targetY - n.y) * 0.045;
      n.vx = (n.vx + ax) * 0.86;
      n.vy = (n.vy + ay) * 0.86;
      n.x += n.vx * (dt / 16);
      n.y += n.vy * (dt / 16);
    }

    draw(time);
    if (!reduceMotion) raf = requestAnimationFrame(step);
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    var ink = cssColor("--neutral-8", "#6e6757");
    var brand = cssColor("--brand-9", "#c25e1a");
    var brandSoft = cssColor("--brand-11", "#823807");

    var pullR = Math.min(width, height) * 0.28;
    var mx = mouse.x;
    var my = mouse.y;
    var pointerLive = finePointer && mouse.active && !reduceMotion;

    // Edges
    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];
      var na = nodes[edge.a];
      var nb = nodes[edge.b];
      var dx = na.x - nb.x;
      var dy = na.y - nb.y;
      var dist = Math.hypot(dx, dy);
      var midX = (na.x + nb.x) * 0.5;
      var midY = (na.y + nb.y) * 0.5;
      var near = 0;
      if (pointerLive) {
        var pd = Math.hypot(mx - midX, my - midY);
        near = Math.max(0, 1 - pd / pullR);
        near = near * near;
      }
      var alpha = edge.base + 0.06 + near * 0.38;
      // Slightly denser when both endpoints are near cursor (enrichment)
      if (pointerLive) {
        var da = Math.hypot(mx - na.x, my - na.y);
        var db = Math.hypot(mx - nb.x, my - nb.y);
        if (da < pullR * 0.85 && db < pullR * 0.85) alpha += 0.2;
      }
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = near > 0.15 ? brand : ink;
      ctx.globalAlpha = Math.min(0.62, alpha);
      ctx.lineWidth = 1 + near * 0.75;
      ctx.stroke();
    }

    // Ephemeral enrichment links: cursor bridges nearby unlike nodes
    if (pointerLive) {
      var nearby = [];
      for (var i = 0; i < nodes.length; i++) {
        var d = Math.hypot(mx - nodes[i].x, my - nodes[i].y);
        if (d < pullR * 0.7) nearby.push({ i: i, d: d });
      }
      nearby.sort(function (a, b) { return a.d - b.d; });
      var limit = Math.min(5, nearby.length);
      for (var j = 0; j < limit; j++) {
        for (var k = j + 1; k < limit; k++) {
          var nj = nodes[nearby[j].i];
          var nk = nodes[nearby[k].i];
          if (nj.kind === nk.kind) continue;
          ctx.beginPath();
          ctx.moveTo(nj.x, nj.y);
          ctx.lineTo(nk.x, nk.y);
          ctx.strokeStyle = brand;
          ctx.globalAlpha = 0.12 + (1 - nearby[j].d / pullR) * 0.16;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      var boost = 0;
      if (pointerLive) {
        var nd = Math.hypot(mx - node.x, my - node.y);
        boost = Math.max(0, 1 - nd / pullR);
        boost = boost * boost;
      }
      var r = node.r + boost * 1.4;
      var fill = ink;
      if (node.kind === "knowledge") fill = brand;
      else if (node.kind === "doc") fill = brandSoft;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.38 + boost * 0.45 + (node.kind === "knowledge" ? 0.08 : 0);
      ctx.fill();
      if (boost > 0.3) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3 + boost * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = brand;
        ctx.globalAlpha = boost * 0.28;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
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
          step._last = performance.now();
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
