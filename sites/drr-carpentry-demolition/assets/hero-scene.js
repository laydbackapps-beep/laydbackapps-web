/* hero-scene.js — D•R•R Carpentry & Demolition hero scene.
   Trade motif: a timber stud wall + roof truss under construction, with a
   demolition dust/embers layer. Palette = the client's logo: deep navy base,
   logo navy (#3d4766) for structure, logo crimson (#cc7a8e) for highlights.
   One requestAnimationFrame loop, DPR-aware, pauses off-screen, static under
   prefers-reduced-motion. No dependencies. */
(function () {
  'use strict';

  var cv = document.getElementById('heroCanvas');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');

  var NAVY  = [61, 71, 102];    // logo navy  #3d4766
  var NAVY2 = [0, 38, 76];      // logo deep navy #00264c
  var CRIM  = [204, 122, 142];  // logo crimson #cc7a8e
  var BASE  = [13, 17, 25];     // dark base
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, t = 0, raf = null, visible = true, started = false;

  /* ---- deterministic pseudo-random ---- */
  var seed = 20261023;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

  /* ---- dust / embers ---- */
  var ND = 54, dust = [];
  for (var i = 0; i < ND; i++) {
    var hot = rnd() < 0.24;
    dust.push({
      x: rnd(), y: rnd(), z: 0.2 + rnd() * 0.8,
      s: 0.5 + rnd() * 1.7, p: rnd() * 6.283, up: 0.010 + rnd() * 0.030,
      c: hot ? CRIM : (rnd() < 0.5 ? NAVY : [225, 232, 245]), a: 0.16 + rnd() * 0.34
    });
  }

  function size() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, Math.round(r.width || cv.clientWidth || window.innerWidth));
    H = Math.max(240, Math.round(r.height || cv.clientHeight || window.innerHeight));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function backdrop() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(11,14,21)');
    g.addColorStop(0.52, 'rgb(13,17,25)');
    g.addColorStop(1, 'rgb(9,11,17)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* two slow brand glows: navy behind the frame, crimson low-left */
    var drift = Math.sin(t * 0.00016);
    var g1 = ctx.createRadialGradient(W * (0.70 + 0.03 * drift), H * 0.40, 0,
                                      W * (0.70 + 0.03 * drift), H * 0.40, Math.max(W, H) * 0.62);
    g1.addColorStop(0, rgba(NAVY, 0.42));
    g1.addColorStop(0.55, rgba(NAVY2, 0.20));
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    var g2 = ctx.createRadialGradient(W * (0.10 - 0.02 * drift), H * 0.92, 0,
                                      W * 0.10, H * 0.92, Math.max(W, H) * 0.45);
    g2.addColorStop(0, rgba(CRIM, 0.16));
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }

  function ground(gy) {
    /* perspective floor: faint navy lines converging on a horizon */
    ctx.lineWidth = 1;
    var hz = gy, vpx = W * 0.72;
    for (var j = -8; j <= 8; j++) {
      var a = 0.10 * (1 - Math.min(1, Math.abs(j) / 9));
      ctx.strokeStyle = rgba(NAVY, a);
      ctx.beginPath();
      ctx.moveTo(vpx + j * (W / 8) * 0.14, hz);
      ctx.lineTo(vpx + j * (W / 7) * 1.6, H + 2);
      ctx.stroke();
    }
    for (var r = 1; r <= 6; r++) {
      var y = hz + Math.pow(r / 6, 2.1) * (H - hz + 6);
      ctx.strokeStyle = rgba(NAVY, 0.09 * (1 - r / 8));
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    var lg = ctx.createLinearGradient(0, hz - 10, 0, H);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(1, rgba(NAVY2, 0.34));
    ctx.fillStyle = lg;
    ctx.fillRect(0, hz - 10, W, H - hz + 10);
  }

  /* the timber frame: stud wall + plates + brace + truss, stood on a slab */
  function frame(fx, gy, fw, fh, pop) {
    var cx = fx + fw / 2;
    var top = gy - fh;
    ctx.save();
    ctx.lineCap = 'butt';

    /* slab / footing so the structure is grounded, not floating */
    var slabW = fw * 1.22, slabH = Math.max(5, fh * 0.045);
    var sg = ctx.createLinearGradient(fx - (slabW - fw) / 2, 0, fx + fw + (slabW - fw) / 2, 0);
    sg.addColorStop(0, rgba(NAVY, 0.10));
    sg.addColorStop(0.45, rgba(NAVY, 0.34));
    sg.addColorStop(1, rgba(NAVY2, 0.20));
    ctx.fillStyle = sg;
    ctx.fillRect(fx - (slabW - fw) / 2, gy - slabH, slabW, slabH);

    /* stud bays: faint panels make it read as a wall, not a wireframe */
    var n = 9, gap = fw / n, lw = Math.max(2, fw * 0.015);
    for (var k = 0; k < n; k++) {
      var on = Math.max(0, Math.min(1, (pop - k / (n + 1.6)) * 4.5));
      if (on <= 0.01) continue;
      var bg = ctx.createLinearGradient(0, top, 0, gy);
      bg.addColorStop(0, rgba(NAVY, 0.16 * on));
      bg.addColorStop(0.62, rgba(NAVY2, 0.07 * on));
      bg.addColorStop(1, rgba(NAVY2, 0.03 * on));
      ctx.fillStyle = bg;
      ctx.fillRect(fx + gap * k + lw * 0.5, top + slabH * 0.6, gap - lw, fh - slabH * 0.6);
    }

    /* plates */
    ctx.fillStyle = rgba(NAVY, 0.40 + 0.10 * pop);
    ctx.fillRect(fx, gy - fh * 0.055, fw, Math.max(5, fh * 0.055));
    ctx.fillStyle = rgba(NAVY, 0.34 + 0.12 * pop);
    ctx.fillRect(fx, top, fw, Math.max(6, fh * 0.062));

    /* studs */
    ctx.lineWidth = lw;
    for (var j = 1; j < n; j++) {
      var on2 = Math.max(0, Math.min(1, (pop - j / (n + 2)) * 4.5));
      if (on2 <= 0.01) continue;
      var x = fx + gap * j;
      var g = ctx.createLinearGradient(0, top, 0, gy);
      g.addColorStop(0, rgba(NAVY, 0.66 * on2));
      g.addColorStop(1, rgba(NAVY2, 0.34 * on2));
      ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, gy - fh * 0.05); ctx.stroke();
    }

    /* corner posts + head trim: the crispest edges on screen */
    ctx.lineWidth = lw * 2;
    ctx.strokeStyle = rgba(NAVY, 0.80);
    ctx.beginPath(); ctx.moveTo(fx, top); ctx.lineTo(fx, gy);
    ctx.moveTo(fx + fw, top); ctx.lineTo(fx + fw, gy); ctx.stroke();

    /* diagonal brace: the one hot member, in the logo crimson */
    ctx.lineWidth = lw * 1.6;
    ctx.strokeStyle = rgba(CRIM, 0.62 + 0.22 * pop);
    ctx.beginPath();
    ctx.moveTo(fx + gap * 0.15, gy - fh * 0.08);
    ctx.lineTo(fx + gap * 2.7, top + fh * 0.05);
    ctx.stroke();

    /* roof truss: rafters, ridge beam, king post, webs, battens */
    var apexY = top - fh * 0.44, ov = fw * 0.07;
    ctx.lineWidth = Math.max(2, fw * 0.014);
    ctx.strokeStyle = rgba(NAVY, 0.52 + 0.20 * pop);
    ctx.beginPath();
    ctx.moveTo(fx - ov, top); ctx.lineTo(cx, apexY); ctx.lineTo(fx + fw + ov, top);
    ctx.moveTo(fx, top); ctx.lineTo(cx, apexY);
    ctx.moveTo(fx + fw, top); ctx.lineTo(cx, apexY);
    ctx.stroke();
    /* thin ridge/rafter caps for a finished edge */
    ctx.lineWidth = Math.max(1.5, fw * 0.008);
    ctx.strokeStyle = rgba(NAVY, 0.34);
    ctx.beginPath();
    ctx.moveTo(fx - ov * 1.5, top + fh * 0.012); ctx.lineTo(cx, apexY + fh * 0.02);
    ctx.lineTo(fx + fw + ov * 1.5, top + fh * 0.012);
    ctx.stroke();
    /* king post + webs */
    ctx.lineWidth = Math.max(2, fw * 0.011);
    ctx.strokeStyle = rgba(NAVY, 0.46);
    ctx.beginPath();
    ctx.moveTo(cx, apexY); ctx.lineTo(cx, top);
    ctx.moveTo(cx, top - fh * 0.22); ctx.lineTo(fx + fw * 0.27, top);
    ctx.moveTo(cx, top - fh * 0.22); ctx.lineTo(fx + fw * 0.73, top);
    ctx.stroke();
    /* crimson purlin ticks along the rafters */
    ctx.strokeStyle = rgba(CRIM, 0.36);
    ctx.lineWidth = Math.max(1.5, fw * 0.007);
    for (var q = 1; q <= 4; q++) {
      var u = q / 5;
      var lx = fx - ov + (cx - (fx - ov)) * u, ly = top + (apexY - top) * u;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(cx + ((fx + fw + ov) - cx) * u, ly); ctx.stroke();
    }
    ctx.restore();
  }

  /* materials stack + debris at the base: the "site" cue */
  function site(fx, gy, fw, fh, pop) {
    ctx.save();
    var on = Math.max(0, Math.min(1, (pop - 0.35) * 2.4));
    if (on <= 0.01) { ctx.restore(); return; }
    var w = fw * 0.46, h = fh * 0.085;
    var x0 = fx - w - fw * 0.05, y0 = gy - h * 3.1;
    for (var i = 0; i < 3; i++) {
      var y = y0 + i * h * 1.06;
      ctx.fillStyle = rgba(i === 1 ? CRIM : NAVY, (i === 1 ? 0.22 : 0.30) * on);
      ctx.fillRect(x0 + i * w * 0.03, y, w - i * w * 0.06, h * 0.82);
      ctx.strokeStyle = rgba([225, 232, 245], 0.10 * on);
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + i * w * 0.03, y, w - i * w * 0.06, h * 0.82);
    }
    /* scattered offcuts along the slab */
    for (var d = 0; d < 6; d++) {
      var dx = fx - fw * 0.05 + (d / 5) * fw * 1.1;
      var dw = fw * (0.05 + 0.05 * ((d * 7) % 3) / 2);
      var dh = Math.max(2, fh * 0.022);
      ctx.fillStyle = rgba(NAVY, (0.26 - d * 0.02) * on);
      ctx.fillRect(dx, gy - dh - (d % 2) * 2, dw, dh);
    }
    /* low dust plume hugging the slab */
    var pg = ctx.createLinearGradient(0, gy - fh * 0.5, 0, gy + fh * 0.12);
    pg.addColorStop(0, 'rgba(0,0,0,0)');
    pg.addColorStop(1, rgba([210, 218, 232], 0.10 * on));
    ctx.fillStyle = pg;
    ctx.fillRect(fx - fw * 0.35, gy - fh * 0.5, fw * 1.7, fh * 0.64);
    ctx.restore();
  }

  /* a moving crimson highlight sweeping across the frame */
  function sweep(fx, gy, fw, fh) {
    var period = 7200, u = ((t % period) / period);
    var x = fx - fw * 0.25 + u * fw * 1.5;
    var w = fw * 0.22;
    var g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, rgba(CRIM, 0.20));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - w, gy - fh * 1.55, w * 2, fh * 1.6);
    ctx.restore();
  }

  function motes() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < dust.length; i++) {
      var m = dust[i];
      var y = (m.y - (t * 0.000018 + 0.0) * m.up * 60) % 1;
      if (y < 0) y += 1;
      var x = m.x + 0.012 * Math.sin(t * 0.00024 * m.z + m.p);
      var a = m.a * (0.55 + 0.45 * Math.sin(t * 0.0009 + m.p));
      if (a <= 0.01) continue;
      /* thin the dust out over the headline column so text always wins */
      var fade = x < 0.55 ? 0.32 + (x / 0.55) * 0.48 : 1;
      ctx.fillStyle = rgba(m.c, Math.min(0.6, a) * 0.8 * fade);
      ctx.beginPath();
      ctx.arc(x * W, y * H, m.s * (0.6 + m.z * 0.9), 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }

  function vignette() {
    var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.28,
                                      W * 0.5, H * 0.5, Math.max(W, H) * 0.82);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.46)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    backdrop();

    var narrow = W < 760;
    var s = Math.max(0.42, Math.min(1.15, W / 1440));
    var gy = H * (narrow ? 0.83 : 0.85);
    var fh = Math.min(H * 0.40, 180 * s + 56);
    var fw = Math.max(150, Math.min(W * (narrow ? 0.46 : 0.26), 380 * s));
    var fx = narrow ? W * 0.5 - fw / 2 : W * 0.745 - fw / 2;
    fx += Math.sin(t * 0.00013) * 6;          /* slow parallax drift */

    ground(gy);
    var pop = reduce ? 1 : Math.min(1, (t % 5400) / 2100);   /* build-up cycle */
    site(fx, gy, fw, fh, pop);
    frame(fx, gy, fw, fh, pop);
    if (!reduce) sweep(fx, gy, fw, fh);
    motes();
    vignette();
  }

  function loop(ts) {
    if (ts) t = ts;
    if (visible) draw();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (started) return;
    started = true;
    size();
    if (reduce) { t = 2600; draw(); return; }
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', function () { size(); draw(); });
  window.addEventListener('orientationchange', function () { size(); draw(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.02 }).observe(cv);
  }
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden && document.visibilityState === 'visible';
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
