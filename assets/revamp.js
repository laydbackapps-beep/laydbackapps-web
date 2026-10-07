/* ============================================================================
   LB-REVAMP v1 — Lay'd Back Apps enhancement layer (presentation).
   - Original canvas 3D hero: "systems in motion" (nodes / rails / pulses / floor).
   - Restrained scroll-reveal (CSS classes + IntersectionObserver).
   - Durable re-apply after the Buildy React bundle re-renders #root
     (MutationObserver + slow setInterval, all guarded with try/catch).
   House recipe: rAF-first, isFinite() guards, prefers-reduced-motion -> one
   static frame, ink-verified paint. No external resources. No text mutation.
   ========================================================================= */
(function () {
  "use strict";

  var CANVAS_ID = "lb-hero-canvas";
  var scenes = new WeakMap();
  var revealed = new WeakSet();

  var LB = (window.__lbRevamp = window.__lbRevamp || {});
  LB.version = "1";

  /* gentle pointer parallax (one shared listener) */
  var PAR = { tilt: 0, shift: 0, targetTilt: 0, targetShift: 0, bound: false };
  function bindParallax() {
    if (PAR.bound) return;
    PAR.bound = true;
    try {
      window.addEventListener("mousemove", function (ev) {
        try {
          var nx = (ev.clientX / Math.max(1, window.innerWidth)) - 0.5;
          PAR.targetTilt = nx * 0.4;
          PAR.targetShift = nx * 0.016;
        } catch (e) {}
      }, { passive: true });
    } catch (e) {}
  }

  var reduce = false;
  try {
    reduce = !!(window.matchMedia &&
                 window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { reduce = false; }

  /* palette (existing house colours only; tints drawn via alpha) */
  var C = { lime: "186,251,58", cyan: "28,199,224", cyanSoft: "116,216,225" };

  function isNum(n) { return typeof n === "number" && isFinite(n); }

  function heroSection() {
    try {
      var h = document.getElementById("hero-title");
      if (!h) return null;
      return h.closest ? h.closest("section") : null;
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------ 3D SCENE --- */
  function buildScene(canvas) {
    var rnd = function (a, b) { return a + Math.random() * (b - a); };

    /* perspective floor lattice (ground plane, y = -0.6) */
    var floor = { y: -0.6, xs: [], zs: [] };
    for (var x = -3.0; x <= 3.0001; x += 0.75) floor.xs.push(x);
    for (var z = -3.0; z <= 2.0001; z += 0.75) floor.zs.push(z);

    /* floating node cloud — a shallow automation-flow lattice with depth */
    var nodes = [];
    for (var i = 0; i < 20; i++) {
      var big = Math.random() < 0.22;
      nodes.push({
        x: rnd(-2.1, 2.1),
        y: rnd(-0.1, 1.35),
        z: rnd(-2.2, 1.9),
        r: big ? rnd(3.0, 4.4) : rnd(1.5, 2.7),
        hue: Math.random() < 0.34 ? C.lime : C.cyanSoft
      });
    }

    /* rails connect a sparse set of neighbour pairs */
    var rails = [];
    for (var j = 0; j < nodes.length; j++) {
      for (var k = j + 1; k < nodes.length; k++) {
        var a = nodes[j], b = nodes[k];
        var d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (d < 1.5 && Math.random() < 0.42) rails.push({ a: j, b: k });
      }
    }

    /* travelling pulses along rails */
    var pulses = [];
    for (var p = 0; p < rails.length; p++) {
      if (Math.random() < 0.6) pulses.push({ rail: p, t: Math.random(), speed: rnd(0.05, 0.14) });
    }

    return { floor: floor, nodes: nodes, rails: rails, pulses: pulses, angle: 0.0, last: 0 };
  }

  function attach(canvas) {
    var ctx = null;
    try { ctx = canvas.getContext("2d", { alpha: true }); } catch (e) { ctx = null; }
    if (!ctx) return;

    var scene = buildScene(canvas);
    var state = { alive: true, raf: 0, w: 0, h: 0, dpr: 1, ink: -1 };
    scenes.set(canvas, state);

    function size() {
      var w = Math.max(320, Math.round(canvas.clientWidth || 0));
      var h = Math.max(240, Math.round(canvas.clientHeight || 0));
      var dpr = Math.min(2, (window.devicePixelRatio || 1));
      if (!isNum(w) || !isNum(h)) { w = 1280; h = 780; }
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      state.w = w; state.h = h; state.dpr = dpr;
    }

    /* project a rotated 3D point to screen space with a simple pinhole camera */
    function project(px, py, pz) {
      var ang = scene.angle + PAR.tilt;
      var cos = Math.cos(ang), sin = Math.sin(ang);
      var rx = px * cos + pz * sin;
      var rz = -px * sin + pz * cos;
      var camZ = 4.5, camY = 0.7;
      var depth = camZ - rz;
      if (!isNum(depth) || depth < 0.4) return null;
      var vh = Math.min(state.h, (window.innerHeight || state.h));
      var focal = Math.min(state.w, vh) * 1.18;
      var s = focal / depth;
      var cx = state.w * (0.69 + PAR.shift);
      var cy = vh * (state.w < 640 ? 0.86 : 0.60);
      var sx = cx + rx * s * 0.95;
      var sy = cy - (py - camY) * s * 0.95;
      if (!isNum(sx) || !isNum(sy) || !isNum(s)) return null;
      return { x: sx, y: sy, s: s, d: depth };
    }

    /* atmospheric depth fade: near objects stronger, far ones softer */
    function fade(depth) {
      var f = 1.28 - (depth - 3.0) * 0.2;
      if (!isNum(f)) return 0.5;
      return Math.max(0.34, Math.min(1.15, f));
    }

    function draw() {
      var w = state.w, h = state.h, dpr = state.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /* (a) whole-canvas wash + deeper gradient toward the open right/bottom air */
      ctx.fillStyle = "rgba(" + C.cyanSoft + ",0.085)";
      ctx.fillRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w * 0.70, h * 0.72, 0, w * 0.70, h * 0.72, Math.max(w, h) * 1.0);
      g.addColorStop(0, "rgba(" + C.cyan + ",0.20)");
      g.addColorStop(0.5, "rgba(" + C.cyan + ",0.07)");
      g.addColorStop(1, "rgba(" + C.cyan + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      /* (b) perspective floor lattice */
      var fi, fj, pa, pb, pf;
      ctx.lineWidth = 1;
      for (fi = 0; fi < scene.floor.xs.length; fi++) {
        var fx = scene.floor.xs[fi];
        pa = project(fx, scene.floor.y, -3.2); pb = project(fx, scene.floor.y, 2.2);
        if (pa && pb) {
          pf = fade((pa.d + pb.d) * 0.5);
          ctx.strokeStyle = "rgba(" + C.cyanSoft + "," + (0.17 * pf).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
        }
      }
      for (fj = 0; fj < scene.floor.zs.length; fj++) {
        var fz = scene.floor.zs[fj];
        pa = project(-3.2, scene.floor.y, fz); pb = project(3.2, scene.floor.y, fz);
        if (pa && pb) {
          pf = fade((pa.d + pb.d) * 0.5);
          ctx.strokeStyle = "rgba(" + C.cyanSoft + "," + (0.17 * pf).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
        }
      }

      /* (c) rails between nearby nodes */
      for (var r = 0; r < scene.rails.length; r++) {
        var rail = scene.rails[r];
        var nA = scene.nodes[rail.a], nB = scene.nodes[rail.b];
        pa = project(nA.x, nA.y, nA.z); pb = project(nB.x, nB.y, nB.z);
        if (!pa || !pb) continue;
        pf = fade((pa.d + pb.d) * 0.5);
        ctx.strokeStyle = "rgba(" + C.cyanSoft + "," + (0.26 * pf).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }

      /* (d) nodes (halo + core), brightest when near */
      for (var n = 0; n < scene.nodes.length; n++) {
        var nd = scene.nodes[n];
        var pr = project(nd.x, nd.y, nd.z);
        if (!pr) continue;
        var fr = fade(pr.d);
        var rad = Math.max(1.1, nd.r * pr.s * 0.0075);
        if (!isNum(rad)) continue;
        var halo = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, rad * 5.5);
        halo.addColorStop(0, "rgba(" + nd.hue + "," + (0.42 * fr).toFixed(3) + ")");
        halo.addColorStop(1, "rgba(" + nd.hue + ",0)");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, rad * 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(" + nd.hue + "," + Math.min(1, 0.92 * fr).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(pr.x, pr.y, rad, 0, Math.PI * 2); ctx.fill();
      }

      /* (e) travelling pulses */
      for (var q = 0; q < scene.pulses.length; q++) {
        var pu = scene.pulses[q];
        if (!reduce) pu.t += pu.speed * 0.006;
        if (pu.t > 1) pu.t -= 1;
        var rl = scene.rails[pu.rail];
        if (!rl) continue;
        var A = scene.nodes[rl.a], B = scene.nodes[rl.b];
        var mpx = A.x + (B.x - A.x) * pu.t;
        var mpy = A.y + (B.y - A.y) * pu.t;
        var mpz = A.z + (B.z - A.z) * pu.t;
        var pm = project(mpx, mpy, mpz);
        if (!pm) continue;
        var pfr = fade(pm.d);
        var prad = Math.max(1.6, pm.s * 0.0045);
        var pg = ctx.createRadialGradient(pm.x, pm.y, 0, pm.x, pm.y, prad * 6.5);
        pg.addColorStop(0, "rgba(" + C.lime + "," + Math.min(1, 0.95 * pfr).toFixed(3) + ")");
        pg.addColorStop(0.4, "rgba(" + C.lime + "," + (0.35 * pfr).toFixed(3) + ")");
        pg.addColorStop(1, "rgba(" + C.lime + ",0)");
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(pm.x, pm.y, prad * 6.5, 0, Math.PI * 2); ctx.fill();
      }

      /* (f) horizon hairline */
      var hy = h * 0.55;
      var hg = ctx.createLinearGradient(0, 0, w, 0);
      hg.addColorStop(0, "rgba(" + C.cyanSoft + ",0)");
      hg.addColorStop(0.7, "rgba(" + C.cyanSoft + ",0.22)");
      hg.addColorStop(1, "rgba(" + C.cyanSoft + ",0)");
      ctx.strokeStyle = hg; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w * 0.05, hy); ctx.lineTo(w * 0.99, hy); ctx.stroke();

      /* (g) deterministic keep-out: erase any ink that would sit behind the hero
             copy block (keyed to the first viewport), so the canvas can never
             reduce text legibility. */
      var kvh = Math.min(h, (window.innerHeight || h));
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.translate(w * 0.26, kvh * 0.52);
      ctx.scale(w * 0.36, kvh * 0.46);
      var eg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      eg.addColorStop(0, "rgba(0,0,0,1)");
      eg.addColorStop(0.72, "rgba(0,0,0,1)");
      eg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
    }

    function measureInk() {
      try {
        var d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        var total = 0, hit = 0;
        for (var i = 3; i < d.length; i += 4 * 37) { total++; if (d[i] > 6) hit++; }
        state.ink = total ? hit / total : -1;
      } catch (e) { state.ink = -1; }
      return state.ink;
    }
    LB.measureInk = function () {
      var c = document.getElementById(CANVAS_ID);
      var st = c && scenes.get(c);
      return st ? st.ink : -1;
    };

    function frame(now) {
      if (!state.alive) return;
      try {
        size();
        PAR.tilt += (PAR.targetTilt - PAR.tilt) * 0.05;
        PAR.shift += (PAR.targetShift - PAR.shift) * 0.05;
        if (!reduce && scene.last) {
          var dt = (now - scene.last) / 1000;
          if (isFinite(dt) && dt > 0 && dt < 0.5) scene.angle += dt * 0.05;
          else scene.angle += 0.0008;
        }
        scene.last = now;
        if (!isFinite(scene.angle)) scene.angle = 0;
        draw();
        if (!canvas.classList.contains("lb-on")) canvas.classList.add("lb-on");
      } catch (e) { /* keep the loop alive */ }
      if (!reduce) state.raf = window.requestAnimationFrame(frame);
    }

    size();
    bindParallax();

    if (reduce) {
      scene.angle = 0.62;
      try { draw(); canvas.classList.add("lb-on"); } catch (e) {}
      measureInk();
      setTimeout(function () { try { size(); draw(); measureInk(); } catch (e) {} }, 900);
    } else {
      /* rAF-first: never call frame() directly (house recipe) */
      state.raf = window.requestAnimationFrame(frame);
      setTimeout(function () { try { measureInk(); } catch (e) {} }, 1200);
    }

    state.stop = function () {
      state.alive = false;
      if (state.raf) { try { window.cancelAnimationFrame(state.raf); } catch (e) {} }
    };
  }

  function ensureCanvas() {
    try {
      var sec = heroSection();
      if (!sec) return;
      var c = document.getElementById(CANVAS_ID);
      if (c && c.parentNode !== sec) {
        var st = scenes.get(c);
        if (st && st.stop) st.stop();
        try { if (c.parentNode) c.parentNode.removeChild(c); } catch (e) {}
        c = null;
      }
      if (c && scenes.has(c)) return; /* healthy */
      if (!c) {
        c = document.createElement("canvas");
        c.id = CANVAS_ID;
        c.setAttribute("aria-hidden", "true");
        c.setAttribute("role", "presentation");
        try { sec.insertBefore(c, sec.firstChild); }
        catch (e) { try { sec.appendChild(c); } catch (e2) { return; } }
        attach(c);
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------ SCROLL REVEAL ---- */
  var io = null;
  function ensureReveal() {
    try {
      if ("IntersectionObserver" in window && !io) {
        io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              entries[i].target.classList.add("lb-in");
              try { io.unobserve(entries[i].target); } catch (e) {}
            }
          }
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      }
      var secs = document.querySelectorAll("main#top > section");
      for (var s = 0; s < secs.length; s++) {
        var sec = secs[s];
        if (sec.getAttribute("aria-labelledby") === "hero-title") continue;
        var kids = sec.children;
        for (var k = 0; k < kids.length; k++) {
          var el = kids[k];
          if (el.id === CANVAS_ID) continue;
          el.classList.add("lb-reveal");
          if (!revealed.has(el) && io) { revealed.add(el); try { io.observe(el); } catch (e) {} }
        }
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------ RE-APPLY LOOP ---- */
  var timer = null;
  function apply() {
    try { ensureCanvas(); } catch (e) {}
    try { ensureReveal(); } catch (e) {}
  }
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () { timer = null; apply(); }, 300);
  }

  apply();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule);
  try {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  try { window.addEventListener("resize", schedule, { passive: true }); } catch (e) {}
  setInterval(function () { try { apply(); } catch (e) {} }, 4000);

  LB.apply = apply;
  LB.ready = true;
})();
