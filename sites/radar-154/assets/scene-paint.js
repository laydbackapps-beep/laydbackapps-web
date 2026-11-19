/* scene-paint.js — hero scene for a painter: a wall being rolled out.
   One wide coat of paint travels across a dark wall behind a roller, tape lines holding the
   edges, drips at the wet edge, a strip of colour swatches along the bottom. Deterministic:
   every position comes from a fixed seed, so the frame is identical on each load. */
(function () {
  'use strict';
  var cv = document.querySelector('#heroCanvas, canvas.lb-hero-canvas, .hero-canvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, t = 0, visible = true, raf = null;
  var CYCLE = 11000;

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = (v || '').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
  }
  function rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  var PAINT = rgb(cssVar('--accent-ink', '#9fb0e6'));
  var DEEP = rgb(cssVar('--accent', '#384070'));
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  // deterministic jitter for roller stipple and drips
  var seed = 7714523;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  var STIPPLE = [];
  for (var i = 0; i < 900; i++) STIPPLE.push({ x: rnd(), y: rnd(), r: 0.5 + rnd() * 1.7, a: 0.05 + rnd() * 0.16 });
  var DRIPS = [];
  for (var d = 0; d < 7; d++) DRIPS.push({ x: 0.1 + rnd() * 0.8, l: 8 + rnd() * 46, w: 1 + rnd() * 1.8, p: rnd() });
  var SWATCH = ['#7f8b96', '#a9b4bf', PAINT_HEX(), '#d9d3c6', '#5c6672'];
  function PAINT_HEX() {
    return '#' + PAINT.map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
  }

  function size() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, Math.round(r.width || window.innerWidth));
    H = Math.max(260, Math.round(r.height || window.innerHeight));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  function draw() {
    var cyc = reduce ? 0.62 : (t % CYCLE) / CYCLE;
    var travel = ease(Math.min(1, cyc / 0.8));
    var fade = cyc > 0.88 ? 1 - (cyc - 0.88) / 0.12 : 1;

    // the unpainted wall: cool dark plaster, faint vertical trowel mottling
    var wall = ctx.createLinearGradient(0, 0, W, H);
    wall.addColorStop(0, '#151922');
    wall.addColorStop(0.55, '#11151c');
    wall.addColorStop(1, '#0b0e13');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (var m = 0; m < 26; m++) {
      var mx = (m / 25) * W;
      ctx.fillStyle = m % 2 ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.16)';
      ctx.fillRect(mx, 0, W / 42, H);
    }
    ctx.restore();

    // the coat: a wide band across the lower wall, painted left to right behind the roller
    var bh = H * 0.15, by = H * 0.775 - bh / 2;
    var edge = Math.max(0, travel * (W + 140) - 70);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, by, edge, bh); ctx.clip();

    var coat = ctx.createLinearGradient(0, by, 0, by + bh);
    coat.addColorStop(0, rgba(PAINT, 0.94));
    coat.addColorStop(0.5, rgba(PAINT, 0.82));
    coat.addColorStop(1, rgba(PAINT, 0.96));
    ctx.globalAlpha = fade;
    ctx.fillStyle = coat; ctx.fillRect(0, by, edge, bh);

    // roller stipple and the two dry, lighter passes near the tape
    for (var s = 0; s < STIPPLE.length; s++) {
      var st = STIPPLE[s], sx = st.x * edge, sy = by + st.y * bh;
      if (sx > edge) continue;
      ctx.fillStyle = st.y < 0.09 || st.y > 0.91
        ? 'rgba(255,255,255,.20)' : rgba(DEEP, st.a);
      ctx.beginPath(); ctx.arc(sx, sy, st.r, 0, 6.283); ctx.fill();
    }

    // wet edge: the last few centimetres are denser and glossier
    var wet = ctx.createLinearGradient(edge - 44, 0, edge, 0);
    wet.addColorStop(0, rgba(PAINT, 0));
    wet.addColorStop(1, 'rgba(255,255,255,.34)');
    ctx.fillStyle = wet; ctx.fillRect(Math.max(0, edge - 44), by, Math.min(44, edge), bh);

    // drips hanging off the bottom edge of the coat
    for (var q = 0; q < DRIPS.length; q++) {
      var dr = DRIPS[q];
      var dx = dr.x * Math.max(1, edge), wob = Math.sin(t * 0.0016 + dr.p * 6.283) * 2;
      ctx.fillStyle = rgba(PAINT, 0.72);
      ctx.beginPath();
      ctx.moveTo(dx - dr.w, by + bh);
      ctx.quadraticCurveTo(dx - dr.w * 0.4, by + bh + dr.l * 0.7, dx + wob, by + bh + dr.l);
      ctx.quadraticCurveTo(dx + dr.w * 0.5, by + bh + dr.l * 0.6, dx + dr.w, by + bh);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // masking tape: two crisp lines bracketing the coat
    ctx.fillStyle = 'rgba(232,226,205,.55)';
    ctx.fillRect(0, by - 7, Math.max(0, edge), 3);
    ctx.fillRect(0, by + bh + 4, Math.max(0, edge), 3);

    // the roller itself
    if (travel > 0.002 && travel < 0.999) {
      var rx = edge;
      var rw = 26, rh = bh * 1.05, ry = by - (rh - bh) / 2;
      ctx.save();
      ctx.translate(rx, ry);
      // nap texture
      var body = ctx.createLinearGradient(0, 0, rw, 0);
      body.addColorStop(0, '#dfe4ec'); body.addColorStop(0.45, '#f6f8fb'); body.addColorStop(1, '#b9c1cd');
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.roundRect(0, 0, rw, rh, 8); ctx.fill();
      for (var n = 0; n < 34; n++) {
        ctx.fillStyle = n % 2 ? 'rgba(120,132,148,.35)' : 'rgba(255,255,255,.5)';
        ctx.fillRect(4 + (n % 4) * 7, 3 + (n * 11) % (rh - 6), 2, 9);
      }
      // frame arm and handle
      ctx.strokeStyle = '#aeb6c2'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(rw / 2, 0); ctx.lineTo(rw / 2 + 11, -rh * 0.20);
      ctx.lineTo(rw / 2 + 26, -rh * 0.26); ctx.stroke();
      ctx.strokeStyle = '#8b93a0'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(rw / 2 + 26, -rh * 0.26); ctx.lineTo(rw / 2 + 50, -rh * 0.08); ctx.stroke();
      ctx.restore();
    }

    // swatches, bottom right, sitting on the same margin as the page content
    var sw = Math.max(16, Math.min(30, H * 0.045)), gap = sw * 0.3;
    var right = Math.max(20, Math.min(64, W * 0.05));
    var totalW = SWATCH.length * sw + (SWATCH.length - 1) * gap;
    var sy2 = Math.min(H - sw - 18, by + bh + 26);
    for (var c = 0; c < SWATCH.length; c++) {
      var sx0 = W - right - totalW + c * (sw + gap);
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      ctx.beginPath(); ctx.roundRect(sx0, sy2, sw, sw, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = SWATCH[c];
      ctx.beginPath(); ctx.roundRect(sx0 + 3, sy2 + 3, sw - 6, sw - 6, 2); ctx.fill();
    }

    // a quiet scrim over the upper half so the headline always holds contrast
    var top = ctx.createLinearGradient(0, 0, 0, H * 0.66);
    top.addColorStop(0, 'rgba(9,11,15,.72)');
    top.addColorStop(0.55, 'rgba(9,11,15,.34)');
    top.addColorStop(1, 'rgba(9,11,15,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, H * 0.66);

    // vignette so hero copy keeps a quiet field underneath
    var vg = ctx.createRadialGradient(W * 0.5, H * 0.42, Math.min(W, H) * 0.30, W * 0.5, H * 0.5, Math.max(W, H) * 0.82);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function loop(ts) { if (ts) t = ts; if (visible) draw(); raf = requestAnimationFrame(loop); }
  if (!ctx.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
    };
  }
  size(); draw();
  window.addEventListener('resize', function () { size(); draw(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.02 }).observe(cv);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
  if (!reduce) raf = requestAnimationFrame(loop);
})();
