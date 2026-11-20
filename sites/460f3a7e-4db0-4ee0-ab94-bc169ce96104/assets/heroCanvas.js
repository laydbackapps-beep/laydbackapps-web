/* heroCanvas.js — pinhole projection + depth helpers for canvas hero scenes.
   Camera sits at eye height looking down +Z. Everything is drawn through .poly/.line
   so perspective and depth fog are consistent; nothing is hard-coded in screen space.

   Usage:
     const S = Projection.create(canvas, {focal: 1.4, horizon: .54, camY: 1.62});
     S.frame(function(){ ... S.poly([[x,y,z],...], '#333', .9) ... });
*/
(function (global) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function hex(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(a, b, k) {
    var A = hex(a), B = hex(b), o = '#';
    for (var i = 0; i < 3; i++) {
      o += ('0' + Math.round(lerp(A[i], B[i], k)).toString(16)).slice(-2);
    }
    return o;
  }

  var Projection = {
    clamp: clamp, lerp: lerp, rgba: rgba, mix: mix,

    reduced: function () {
      try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    },

    create: function (cv, o) {
      o = o || {};
      var ctx = cv.getContext('2d');
      var S = {
        ctx: ctx, W: 0, H: 0, focal: 900, horizon: 0,
        camY: o.camY || 1.6, camX: 0, camZ: 0, yaw: 0,
        fogNear: o.fogNear || 14, fogFar: o.fogFar || 74,
        fogCol: o.fogCol || '#CDCBC4',
        dpr: 1, dirty: true
      };

      S.resize = function () {
        var r = cv.getBoundingClientRect();
        S.dpr = Math.min(2, global.devicePixelRatio || 1);
        S.W = Math.max(280, Math.round(r.width || cv.clientWidth || global.innerWidth));
        S.H = Math.max(240, Math.round(r.height || cv.clientHeight || global.innerHeight));
        cv.width = Math.round(S.W * S.dpr);
        cv.height = Math.round(S.H * S.dpr);
        ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
        S.focal = S.H * (o.focal || 1.35);
        S.horizon = S.H * (o.horizon || 0.54);
        S.dirty = true;
      };

      /* world -> screen. Returns null when behind the camera. */
      S.project = function (x, y, z) {
        var dz = z - S.camZ;
        if (dz < 0.12) return null;
        var dx = x - S.camX, dy = y - S.camY;
        if (S.yaw) {
          var c = Math.cos(S.yaw), s = Math.sin(S.yaw);
          var rx = dx * c - dz * s;
          dz = dx * s + dz * c;
          dx = rx;
        }
        var k = S.focal / dz;
        return [S.W * 0.5 + dx * k, S.horizon - dy * k, dz];
      };

      /* 0 = near, 1 = fully hazed */
      S.fog = function (z) {
        return clamp((z - S.fogNear) / (S.fogFar - S.fogNear), 0, 1);
      };

      S.line = function (a, b, col, width, z) {
        var p = S.project(a[0], a[1], a[2]);
        var q = S.project(b[0], b[1], b[2]);
        if (!p || !q) return;
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(0.6, width || 1);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      };

      /* Filled polygon from world points; fog is mixed into the fill. */
      S.poly = function (pts, col, alpha, z) {
        var mapped = [], i, p;
        for (i = 0; i < pts.length; i++) {
          p = S.project(pts[i][0], pts[i][1], pts[i][2]);
          if (!p) return; mapped.push(p);
        }
        ctx.beginPath();
        ctx.moveTo(mapped[0][0], mapped[0][1]);
        for (i = 1; i < mapped.length; i++) ctx.lineTo(mapped[i][0], mapped[i][1]);
        ctx.closePath();
        ctx.fillStyle = typeof col === 'string' && col.charAt(0) === '#' && z != null
          ? rgba(mix(col, S.fogCol, S.fog(z) * 0.85), alpha == null ? 1 : alpha)
          : col;
        if (alpha != null) ctx.globalAlpha = alpha;
        ctx.fill();
        if (alpha != null) ctx.globalAlpha = 1;
      };

      /* Post drawn as a tapering box: two faces, cap, ground contact shadow. */
      S.post = function (x, z, w, h, near, far) {
        var f = S.fog(z);
        var c = mix(near, S.fogCol, f * 0.8);
        var d = mix(far, S.fogCol, f * 0.8);
        var hw = w / 2;
        S.poly([[x - hw, h, z], [x + hw, h, z], [x + hw, 0, z], [x - hw, 0, z]], c, 1, z);
        S.poly([[x + hw, h, z], [x + hw + w * 0.35, h, z], [x + hw + w * 0.35, 0, z], [x + hw, 0, z]], d, 1, z);
        var cap = S.project(x, h, z);
        if (cap) {
          ctx.fillStyle = rgba(mix('#D7D9DA', S.fogCol, f * 0.8), 0.85);
          ctx.beginPath(); ctx.ellipse(cap[0], cap[1], Math.max(0.6, S.focal / cap[2] * hw), Math.max(0.4, S.focal / cap[2] * w * 0.25), 0, 0, 6.2832); ctx.fill();
        }
        var g = S.project(x, 0, z);
        if (g) {
          var r = S.focal / g[2] * w * 1.5;
          var grd = ctx.createRadialGradient(g[0], g[1], 0, g[0], g[1], r);
          grd.addColorStop(0, 'rgba(38,34,28,.42)'); grd.addColorStop(1, 'rgba(38,34,28,0)');
          ctx.save(); ctx.translate(g[0], g[1]); ctx.scale(1, 0.32); ctx.translate(-g[0], -g[1]);
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(g[0], g[1], r, 0, 6.2832); ctx.fill(); ctx.restore();
        }
      };

      S.frame = function (draw) {
        var t0 = 0;
        function loop(ts) {
          if (!t0) t0 = ts;
          if (S.dirty || !Projection.reduced()) {
            S.dirty = false;
            ctx.clearRect(0, 0, S.W, S.H);
            draw((ts - t0) / 1000);
          }
          S.raf = requestAnimationFrame(loop);
        }
        if (Projection.reduced()) { draw(0); }
        else S.raf = requestAnimationFrame(loop);
      };

      S.resize();
      S.unwatch = function () {
        if (S.raf) cancelAnimationFrame(S.raf);
      };
      return S;
    }
  };

  /* ------------------------------------------------------------------ *
   * sceneFrame — subject-specific solids.
   * A scene is a list of world-space faces pushed through one projection,
   * sorted far-to-near, so occlusion and fog come out of the maths. Faces
   * grow into place on a build-on timing (secs) and then hold still.
   * ------------------------------------------------------------------ */
  Projection.sceneFrame = function (S, o) {
    o = o || {};
    var TONE = {
      timber: '#a97a4c', plate: '#8b5f37', steel: '#c6d1cd',
      brass: '#c29b58', slab: '#2f4f45'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.58, 0.76, -0.30], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FZ = o.fz || 4.6;
    var DUR = 2.9;

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.5)
        : Projection.mix(tone, '#0c1714', (1 - lit) * 0.8);
    }

    var faces = [];   // static faces
    var members = []; // growing members

    function face(pts, tone, n, t0_, dur) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0_ || 0, dur: dur || 1 });
    }

    function member(a, b, w, d, tone, t0_, dur) {
      members.push({ a: a, b: b, w: w, d: d, tone: tone, t0: t0_, dur: dur || 0.32 });
    }

    function memberFaces(m, k) {
      var b = [m.a[0] + (m.b[0] - m.a[0]) * k, m.a[1] + (m.b[1] - m.a[1]) * k, m.a[2] + (m.b[2] - m.a[2]) * k];
      var dx = b[0] - m.a[0], dy = b[1] - m.a[1], len = Math.hypot(dx, dy) || 1;
      var ux = dx / len, uy = dy / len;
      var nx = -uy * m.w / 2, ny = ux * m.w / 2, dz = m.d / 2;
      var a0 = [m.a[0] - nx, m.a[1] - ny], a1 = [m.a[0] + nx, m.a[1] + ny];
      var b0 = [b[0] - nx, b[1] - ny], b1 = [b[0] + nx, b[1] + ny];
      var z = m.a[2];
      var out = [];
      out.push([[a0[0], a0[1], z + dz], [b0[0], b0[1], z + dz], [b1[0], b1[1], z + dz], [a1[0], a1[1], z + dz], [ux, uy, dz]]);
      out.push([[a1[0], a1[1], z - dz], [b1[0], b1[1], z - dz], [b0[0], b0[1], z - dz], [a0[0], a0[1], z - dz], [-ux, -uy, -dz]]);
      out.push([[a0[0], a0[1], z - dz], [b0[0], b0[1], z - dz], [b0[0], b0[1], z + dz], [a0[0], a0[1], z + dz], [-ux, -uy, 0]]);
      out.push([[a1[0], a1[1], z - dz], [b1[0], b1[1], z - dz], [b1[0], b1[1], z + dz], [a1[0], a1[1], z + dz], [ux, uy, 0]]);
      out.push([[b0[0], b0[1], z - dz], [b1[0], b1[1], z - dz], [b1[0], b1[1], z + dz], [b0[0], b0[1], z + dz], [ux, uy, 0]]);
      return out;
    }

    function disc(cx, cy, cz, r, tone, t0_, teeth) {
      var pts = [], n = 34, i, a;
      for (i = 0; i < n; i++) {
        a = (i / n) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * r * (teeth && i % 3 === 0 ? 1.1 : 1), cy + Math.sin(a) * r, cz]);
      }
      face(pts, tone, [0, 0, -1], t0_, 1);
    }

    /* ---- the frame: set-out, plates, studs, noggin, gable truss, saw bench ---- */
    var i, x;

    face([[-7.5, 0, 0.1], [4.5, 0, 0.1], [4.5, 0, 8.6], [-7.5, 0, 8.6]], TONE.slab, [0, 1, 0], 0, 1);
    face([[-7.5, -0.18, 0.1], [4.5, -0.18, 0.1], [4.5, 0.02, 0.1], [-7.5, 0.02, 0.1]], TONE.plate, [0, 0, -1], 0, 1);
    face([[-7.5, -0.22, 8.4], [4.5, -0.22, 8.4], [4.5, 0.02, 8.4], [-7.5, 0.02, 8.4]], TONE.plate, [0, 0, -1], 0, 1);

    for (i = 0; i <= 8; i++) {
      x = -1.8 + i * 0.45;
      face([[x - 0.014, 0.012, 0.35], [x + 0.014, 0.012, 0.35],
            [x + 0.014, 0.012, FZ - 0.04], [x - 0.014, 0.012, FZ - 0.04]], TONE.brass, [0, 1, 0], 0.18 + i * 0.055, 0.62);
    }
    member([-2.15, 0.02, FZ], [2.15, 0.02, FZ], 0.035, 0.035, TONE.brass, 0.64, 0.52);
    member([-2.15, 0.02, FZ], [-2.15, 0.34, FZ], 0.05, 0.05, TONE.brass, 0.78, 0.26);
    member([2.15, 0.02, FZ], [2.15, 0.34, FZ], 0.05, 0.05, TONE.brass, 0.82, 0.26);

    member([-1.95, 0.075, FZ], [1.95, 0.075, FZ], 0.09, 0.045, TONE.plate, 0.78, 0.52);
    for (i = 0; i <= 8; i++) {
      x = -1.8 + i * 0.45;
      member([x, 0.12, FZ], [x, 2.34, FZ], 0.09, 0.045, TONE.timber, 0.9 + i * 0.078, 0.3);
    }
    member([-1.8, 1.36, FZ - 0.004], [1.8, 1.36, FZ - 0.004], 0.08, 0.043, TONE.timber, 1.56, 0.42);
    member([-1.98, 2.38, FZ], [1.98, 2.38, FZ], 0.09, 0.045, TONE.plate, 1.64, 0.48);

    member([-2.14, 2.47, FZ], [2.14, 2.47, FZ], 0.085, 0.042, TONE.plate, 1.72, 0.56);
    member([-2.12, 2.5, FZ], [0, 3.52, FZ], 0.08, 0.04, TONE.timber, 1.82, 0.46);
    member([2.12, 2.5, FZ], [0, 3.52, FZ], 0.08, 0.04, TONE.timber, 1.82, 0.46);
    member([0, 2.5, FZ], [0, 3.5, FZ], 0.08, 0.04, TONE.timber, 1.96, 0.38);
    member([-1.06, 2.5, FZ], [0, 3.5, FZ], 0.06, 0.036, TONE.timber, 2.04, 0.36);
    member([1.06, 2.5, FZ], [0, 3.5, FZ], 0.06, 0.036, TONE.timber, 2.04, 0.36);
    member([-1.5, 2.5, FZ], [-0.62, 2.98, FZ], 0.055, 0.034, TONE.timber, 2.12, 0.32);
    member([1.5, 2.5, FZ], [0.62, 2.98, FZ], 0.055, 0.034, TONE.timber, 2.12, 0.32);

    var bx = 2.74, bz = 2.3;
    member([bx - 0.46, 0.02, bz + 0.03], [bx - 0.34, 0.74, bz], 0.05, 0.05, TONE.plate, 2.2, 0.26);
    member([bx + 0.46, 0.02, bz + 0.03], [bx + 0.34, 0.74, bz], 0.05, 0.05, TONE.plate, 2.23, 0.26);
    member([bx - 0.52, 0.78, bz], [bx + 0.52, 0.78, bz], 0.26, 0.05, TONE.timber, 2.26, 0.3);
    disc(bx - 0.06, 1.1, bz - 0.04, 0.19, TONE.steel, 2.34, true);
    disc(bx - 0.06, 1.1, bz - 0.05, 0.042, TONE.brass, 2.4, false);
    member([bx + 0.14, 0.84, bz - 0.02], [bx + 0.56, 0.84, bz - 0.02], 0.1, 0.08, TONE.timber, 2.3, 0.26);

    /* ---- render ---- */
    function collect(t) {
      var out = [], j, f, map, p, d, sum;

      function push(pts, tone, n, t0) {
        if (t < t0) return;
        map = []; sum = 0;
        for (var q = 0; q < pts.length; q++) {
          p = S.project(pts[q][0], pts[q][1], pts[q][2]);
          if (!p) return;
          map.push(p); sum += p[2];
        }
        out.push({ pts: map, tone: tone, n: n, dz: sum / map.length });
      }

      for (j = 0; j < faces.length; j++) push(faces[j].pts, faces[j].tone, faces[j].n, faces[j].t0);
      for (j = 0; j < members.length; j++) {
        f = members[j];
        var kk = (t - f.t0) / f.dur;
        if (kk <= 0) continue;
        kk = kk >= 1 ? 1 : 1 - Math.pow(1 - kk, 3);
        var parts = memberFaces(f, kk);
        for (var q2 = 0; q2 < parts.length; q2++) push(parts[q2].slice(0, -1), f.tone, parts[q2][parts[q2].length - 1], 0);
      }
      return out;
    }

    return {
      duration: DUR,
      render: function (t) {
        var list = collect(t), i2, it, j2, p;
        for (i2 = 0; i2 < list.length; i2++) {
          it = list[i2];
          var nx = it.n[0], ny = it.n[1], nz = it.n[2];
          var nm = Math.hypot(nx, ny, nz) || 1;
          var d = (nx / nm) * LIGHT[0] + (ny / nm) * LIGHT[1] + (nz / nm) * LIGHT[2];
          it.fill = Projection.mix(shade(it.tone, 0.5 + 0.62 * Math.max(0, d)),
            o.fogCol || '#7d9a8e', S.fog(it.dz) * 0.55);
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i2 = 0; i2 < list.length; i2++) {
          it = list[i2]; p = it.pts;
          S.ctx.beginPath();
          S.ctx.moveTo(p[0][0], p[0][1]);
          for (j2 = 1; j2 < p.length; j2++) S.ctx.lineTo(p[j2][0], p[j2][1]);
          S.ctx.closePath();
          S.ctx.fillStyle = it.fill;
          S.ctx.fill();
        }
      }
    };
  };

  global.Projection = Projection;
})(window);
