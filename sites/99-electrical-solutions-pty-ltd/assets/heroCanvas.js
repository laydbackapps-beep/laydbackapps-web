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

    for (i = 0; i <= 5; i++) {
      x = -1.35 + i * 0.54;
      face([[x - 0.022, 0.014, 2.86], [x + 0.022, 0.014, 2.86],
            [x + 0.022, 0.014, 3.5], [x - 0.022, 0.014, 3.5]], TONE.brass, [0, 1, 0], 0.18 + i * 0.07, 0.6);
      face([[x - 0.022, 0.014, 3.72], [x + 0.022, 0.014, 3.72],
            [x + 0.022, 0.014, FZ - 0.05], [x - 0.022, 0.014, FZ - 0.05]], TONE.brass, [0, 1, 0], 0.3 + i * 0.07, 0.6);
    }
    member([-2.15, 0.02, FZ], [2.15, 0.02, FZ], 0.035, 0.035, TONE.brass, 0.64, 0.52);
    member([-2.15, 0.02, FZ], [-2.15, 0.34, FZ], 0.05, 0.05, TONE.brass, 0.78, 0.26);
    member([2.15, 0.02, FZ], [2.15, 0.34, FZ], 0.05, 0.05, TONE.brass, 0.82, 0.26);
    // builder's string line pegged out in front of the wall
    member([-2.25, 0.02, 2.42], [-2.25, 0.44, 2.42], 0.045, 0.045, TONE.brass, 0.5, 0.24);
    member([2.25, 0.02, 2.42], [2.25, 0.44, 2.42], 0.045, 0.045, TONE.brass, 0.54, 0.24);
    member([-2.25, 0.45, 2.42], [0, 0.38, 2.42], 0.014, 0.014, TONE.twine, 0.66, 0.5);
    member([0, 0.38, 2.42], [2.25, 0.45, 2.42], 0.014, 0.014, TONE.twine, 0.72, 0.5);

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

  /* ------------------------------------------------------------------ *
   * sceneWaterTrucks — J&J Water Trucks. Water tanker + hose on a striped
   * verge with a hard edging line, a spade and a mower deck. Same contract
   * as sceneFrame: world-space faces, one projection, far-to-near sort.
   * ------------------------------------------------------------------ */
  Projection.sceneWaterTrucks = function (S, o) {
    o = o || {};
    var TONE = {
      slab: '#0C2637', stripe: '#091C2B', verge: '#061524', verge2: '#081A2A',
      kerb: '#0A1E2E', water: '#0A4258', tyre: '#0A1620', hub: '#2A5470',
      steel: '#1B3E56', steelHi: '#2E6383', dark: '#0D2233', tank: '#15405C',
      tankHi: '#3D7EA4', spade: '#2C4C64', spadeHi: '#3B6C8A', deck: '#17455F'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.55, 0.78, -0.32], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#0A2136';
    var faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.55)
        : Projection.mix(tone, '#03101B', (1 - lit) * 0.75);
    }

    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }

    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.95), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.66), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.82), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.04), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.2), [0, 1, 0], t0);
    }

    function wheel(cx, cy, cz, r, wdt, t0) {
      var seg = 12, s, a0, a1;
      for (s = 0; s < seg; s++) {
        a0 = (s / seg) * Math.PI * 2; a1 = ((s + 1) / seg) * Math.PI * 2;
        face([[cx, cy + Math.sin(a0) * r, cz - wdt / 2], [cx, cy + Math.sin(a1) * r, cz - wdt / 2],
              [cx, cy + Math.sin(a1) * r, cz + wdt / 2], [cx, cy + Math.sin(a0) * r, cz + wdt / 2]],
          shade(TONE.tyre, 0.8 + 0.55 * Math.cos(a0)), [Math.cos(a0), Math.sin(a0), 0], t0);
      }
      [cz - wdt / 2, cz + wdt / 2].forEach(function (zz, i) {
        for (var s2 = 0; s2 < seg; s2++) {
          var b0 = (s2 / seg) * Math.PI * 2, b1 = ((s2 + 1) / seg) * Math.PI * 2;
          face([[cx, cy, zz], [cx + Math.cos(b0) * r, cy + Math.sin(b0) * r, zz],
                [cx + Math.cos(b1) * r, cy + Math.sin(b1) * r, zz]], shade(TONE.tyre, i ? 1.15 : 0.6), [0, 0, i ? 1 : -1], t0);
        }
        face([[cx, cy, zz], [cx + r * 0.4, cy, zz], [cx, cy + r * 0.4, zz], [cx - r * 0.4, cy, zz], [cx, cy - r * 0.4, zz]], shade(TONE.hub, 1.15), [0, 0, 0], t0);
      });
    }

    function tank(cx, cy, cz, r, len, t0) {
      var seg = 16;
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
        var m = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
        face([
          [cx - len / 2, cy + r + Math.sin(a0) * r, cz + Math.cos(a0) * r],
          [cx + len / 2, cy + r + Math.sin(a0) * r, cz + Math.cos(a0) * r],
          [cx + len / 2, cy + r + Math.sin(a1) * r, cz + Math.cos(a1) * r],
          [cx - len / 2, cy + r + Math.sin(a1) * r, cz + Math.cos(a1) * r]
        ], shade(m > 0.3 ? TONE.tankHi : TONE.tank, 0.74 + 0.5 * m), [0, m, nz], t0);
        if (s % 2 === 0) {
          face([
            [cx - len / 2, cy + r + Math.sin(a0) * r * 1.015, cz + Math.cos(a0) * r * 1.015],
            [cx + len / 2, cy + r + Math.sin(a0) * r * 1.015, cz + Math.cos(a0) * r * 1.015],
            [cx + len / 2, cy + r + Math.sin(a1) * r * 1.015, cz + Math.cos(a1) * r * 1.015]
          ], shade('#08192A', 0.92), [0, m, nz], t0);
        }
      }
      [cx - len / 2, cx + len / 2].forEach(function (ex, i) {
        for (var s3 = 0; s3 < 14; s3++) {
          var c0 = (s3 / 14) * Math.PI * 2, c1 = ((s3 + 1) / 14) * Math.PI * 2;
          face([[ex, cy + r, cz], [ex, cy + r + Math.sin(c0) * r, cz + Math.cos(c0) * r],
                [ex, cy + r + Math.sin(c1) * r, cz + Math.cos(c1) * r]], shade(TONE.tank, i ? 1.1 : 0.8), [i ? 1 : -1, 0, 0], t0);
        }
      });
    }

    /* ground: stripe bands, kerb, edging line, wet verge */
    var x0 = -26, x1 = 26, band = 1.55, z;
    for (z = 44; z > 4; z -= band) {
      var alt = Math.round((44 - z) / band) % 2 === 0;
      var front = (z - band < 13.4);
      var tone = front ? (alt ? TONE.verge : TONE.verge2) : (alt ? TONE.slab : TONE.stripe);
      face([[x0, 0, z], [x1, 0, z], [x1, 0, z - band], [x0, 0, z - band]], tone, [0, 1, 0], 0);
    }
    face([[-26, 0, 13.45], [26, 0, 13.45], [26, 0, 12.8], [-26, 0, 12.8]], TONE.kerb, [0, 1, 0], 0);
    face([[-26, 0.006, 13.3], [26, 0.006, 13.3], [26, 0.006, 13.16], [-26, 0.006, 13.16]], '#4ED4F2', [0, 1, 0], 0.25);

    /* water pool + hose run */
    var pcx = 2.0, pcz = 12.15, prx = 1.5, prz = 0.52, seg2 = 20;
    for (var s4 = 0; s4 < seg2; s4++) {
      var d0 = (s4 / seg2) * Math.PI * 2, d1 = ((s4 + 1) / seg2) * Math.PI * 2;
      face([[pcx, 0.008, pcz], [pcx + Math.cos(d0) * prx, 0.008, pcz + Math.sin(d0) * prz],
            [pcx + Math.cos(d1) * prx, 0.008, pcz + Math.sin(d1) * prz]], TONE.water, [0, 1, 0], 0.5);
    }

    /* spade, planted in the verge */
    (function () {
      var sx = -0.7, sz = 12.55;
      box(sx, 0, sz, 0.06, 1.2, 0.06, '#22384A', 1.5);
      face([[sx - 0.11, 0.02, sz - 0.03], [sx + 0.11, 0.02, sz - 0.03], [sx + 0.1, 0.44, sz - 0.03], [sx - 0.1, 0.44, sz - 0.03]], shade(TONE.spade, 0.8), [0, 0, -1], 1.55);
      face([[sx - 0.1, 0.02, sz + 0.03], [sx + 0.1, 0.02, sz + 0.03], [sx + 0.11, 0.44, sz + 0.03], [sx - 0.11, 0.44, sz + 0.03]], shade(TONE.spadeHi, 1), [0, 0, 1], 1.55);
      box(sx - 0.1, 1.17, sz, 0.26, 0.05, 0.05, '#3B5D75', 1.62);
    })();

    /* mower deck on the near stripe */
    (function () {
      var dx = -2.55, dz = 11.55;
      box(dx, 0.15, dz, 1.0, 0.19, 0.62, TONE.deck, 1.1);
      box(dx, 0.34, dz, 0.74, 0.06, 0.42, shade(TONE.deck, 1.3), 1.2);
      [[-0.4, -0.27], [0.4, -0.27], [-0.4, 0.27], [0.4, 0.27]].forEach(function (q) {
        wheel(dx + q[0], 0.13, dz + q[1], 0.13, 0.09, 1.15);
      });
      box(dx - 0.66, 0.16, dz, 0.06, 0.6, 0.06, '#26506A', 1.3);
    })();

    /* the tanker */
    var cx2 = 2.95, cz2 = 16.6, t0 = 0.55;
    box(cx2, 0.46, cz2, 2.6, 0.16, 0.62, TONE.dark, t0);
    tank(cx2 - 0.55, 0.54, cz2, 0.5, 2.05, t0 + 0.15);
    box(cx2 + 1.28, 0.52, cz2, 1.02, 0.9, 0.9, '#123A52', t0 + 0.05);
    face([[cx2 + 1.5, 0.74, cz2 + 0.16], [cx2 + 1.79, 0.74, cz2 + 0.16], [cx2 + 1.79, 1.26, cz2 + 0.16], [cx2 + 1.5, 1.26, cz2 + 0.16]], shade('#0C2B3F', 1), [0, 0, 1], t0 + 0.2);
    face([[cx2 + 1.5, 0.74, cz2 - 0.16], [cx2 + 1.79, 0.74, cz2 - 0.16], [cx2 + 1.79, 1.26, cz2 - 0.16], [cx2 + 1.5, 1.26, cz2 - 0.16]], shade('#143C56', 1), [0, 0, -1], t0 + 0.2);
    wheel(cx2 - 0.72, 0.36, cz2 - 0.34, 0.36, 0.2, t0 + 0.1);
    wheel(cx2 - 0.72, 0.36, cz2 + 0.34, 0.36, 0.2, t0 + 0.16);
    wheel(cx2 + 1.15, 0.36, cz2 - 0.34, 0.36, 0.2, t0 + 0.06);
    wheel(cx2 + 1.15, 0.36, cz2 + 0.34, 0.36, 0.2, t0 + 0.12);

    var HOSE = [[2.05, 0.62, 17.15], [1.5, 0.14, 15.3], [1.22, 0.03, 13.95],
                [1.6, 0.03, 12.95], [2.05, 0.02, 12.35], [1.72, 0.02, 12.05]];
    var HOSE_T = 1.55;

    return {
      duration: 2.1,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        S.yaw = Projection.reduced() ? 0 : Math.sin(time * 0.09) * 0.028;

        var sky = S.ctx.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#030C15');
        sky.addColorStop(0.42, '#07182A');
        sky.addColorStop(0.72, '#0A2136');
        sky.addColorStop(1, '#0B3049');
        S.ctx.fillStyle = sky; S.ctx.fillRect(0, 0, S.W, S.H);

        var glow = S.ctx.createLinearGradient(0, S.horizon - S.H * 0.42, 0, S.horizon + S.H * 0.12);
        glow.addColorStop(0, 'rgba(78,212,242,0)');
        glow.addColorStop(0.74, 'rgba(78,212,242,0.15)');
        glow.addColorStop(1, 'rgba(78,212,242,0.02)');
        S.ctx.fillStyle = glow; S.ctx.fillRect(0, S.horizon - S.H * 0.42, S.W, S.H * 0.54);

        var list = [], i, p, pts, sum, mapped;
        for (i = 0; i < faces.length; i++) {
          var f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0;
          var miss = false;
          for (var q = 0; q < f.pts.length; q++) {
            p = S.project(f.pts[q][0], f.pts[q][1], f.pts[q][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          list.push({
            pts: mapped, dz: sum / mapped.length,
            fill: Projection.mix(shade(f.tone, 0.52 + 0.6 * Math.max(0, d)), FOG, S.fog(sum / mapped.length) * 0.62),
            a: Math.min(1, (t - f.t0) / 0.45)
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          S.ctx.globalAlpha = it.a;
          S.ctx.beginPath(); S.ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) S.ctx.lineTo(pts[j][0], pts[j][1]);
          S.ctx.closePath(); S.ctx.fillStyle = it.fill; S.ctx.fill();
        }
        S.ctx.globalAlpha = 1;

        /* hose, dropped on top of the ground */
        if (t > HOSE_T) {
          var k = Math.min(1, (t - HOSE_T) / 0.6);
          var c = S.ctx; c.lineCap = 'round';
          var run = Math.max(2, Math.round(HOSE.length * k));
          [[7, 'rgba(3,10,16,.5)'], [4.2, TONE.dark], [1.4, 'rgba(78,212,242,.42)']].forEach(function (pass) {
            c.lineWidth = pass[0]; c.strokeStyle = pass[1]; c.beginPath();
            for (var h = 0; h < run; h++) {
              var hp = S.project(HOSE[h][0], HOSE[h][1], HOSE[h][2]);
              if (!hp) continue;
              if (h === 0) c.moveTo(hp[0], hp[1]); else c.lineTo(hp[0], hp[1]);
            }
            c.stroke();
          });
        }

        /* ripples on the pool */
        [0.42, 0.68].forEach(function (rk, ri) {
          var ph = ((time * 0.22 + ri * 0.5) % 1);
          var a = (1 - ph) * 0.34;
          if (a < 0.02) return;
          S.ctx.strokeStyle = 'rgba(89,219,246,' + a.toFixed(3) + ')';
          S.ctx.lineWidth = 1.3; S.ctx.beginPath();
          for (var r2 = 0; r2 <= 30; r2++) {
            var ang = (r2 / 30) * Math.PI * 2;
            var rp = S.project(pcx + Math.cos(ang) * prx * (0.3 + ph * 0.7), 0.012, pcz + Math.sin(ang) * prz * (0.3 + ph * 0.7));
            if (!rp) continue;
            if (r2 === 0) S.ctx.moveTo(rp[0], rp[1]); else S.ctx.lineTo(rp[0], rp[1]);
          }
          S.ctx.stroke();
        });
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneConcretePolishing — Apex Concrete Polishing. A three-head
   * planetary grinder standing on a half-cut slab: raw, dull concrete to
   * one side of the set-out line, a wet mirror pass to the other, with
   * diamond discs under the shroud, a water bucket and a hand edging tool.
   * Same contract as sceneFrame: world faces, one projection, far-to-near.
   * ------------------------------------------------------------------ */
  Projection.sceneConcretePolishing = function (S, o) {
    o = o || {};
    var TONE = {
      rough: '#26262A', rough2: '#2C2C30', cut: '#3A3A3E',
      polish: '#3E3D39', polish2: '#47463F',
      steel: '#8A8F94', steelDim: '#4A4E52', body: '#C79A3E', bodyLt: '#E8BE71',
      skirt: '#16181A', hose: '#22262A', disc: '#C3C8CC', water: '#3D5A67',
      prop: '#6E7478', gold: '#EFC069'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.50, 0.80, -0.34], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#0E0E0F';
    var faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.5)
        : Projection.mix(tone, '#0A0A0B', (1 - lit) * 0.78);
    }

    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }

    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.94), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.62), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.80), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.06), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.18), [0, 1, 0], t0);
    }

    function drum(cx, cy, cz, r, h, seg, tone, t0) {
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
        var m = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
        face([[cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r],
              [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r],
              [cx + Math.cos(a1) * r, cy + h, cz + Math.sin(a1) * r],
              [cx + Math.cos(a0) * r, cy + h, cz + Math.sin(a0) * r]],
          shade(tone, 0.72 + 0.52 * Math.max(0, nz)), [m, 0, nz], t0);
      }
    }

    /* diamond head: a flat segmented disc on the slab */
    function head(cx, cz, r, t0, spin) {
      for (var s = 0; s < 9; s++) {
        var a0 = (s / 9) * Math.PI * 2 + (spin || 0), a1 = ((s + 1) / 9) * Math.PI * 2 + (spin || 0);
        face([[cx, 0.016, cz], [cx + Math.cos(a0) * r, 0.016, cz + Math.sin(a0) * r],
              [cx + Math.cos(a1) * r, 0.016, cz + Math.sin(a1) * r]],
          shade(s % 2 ? TONE.disc : TONE.steelDim, 1.1), [0, 1, 0], t0);
      }
    }

    /* ---- ground: raw slab left of the cut, wet polished pass to the right ---- */
    var BX = 0.4, i, z, x;
    for (z = 27; z > 0.9; z -= 1.02) {
      var rf = Math.round((27 - z) * 3.1) % 3;
      face([[-15, 0, z], [BX, 0, z], [BX, 0, z - 1.02], [-15, 0, z - 1.02]],
        rf === 0 ? TONE.rough : (rf === 1 ? TONE.rough2 : TONE.rough), [0, 1, 0], 0);
      face([[BX, 0, z], [15, 0, z], [15, 0, z - 1.02], [BX, 0, z - 1.02]],
        rf === 0 ? TONE.polish : TONE.polish2, [0, 1, 0], 0.12);
    }
    /* the cut line the pass is working to */
    for (z = 26; z > 1; z -= 0.9) {
      face([[BX - 0.035, 0.004, z], [BX + 0.035, 0.004, z], [BX + 0.035, 0.004, z - 0.9], [BX - 0.035, 0.004, z - 0.9]], TONE.cut, [0, 1, 0], 0.2);
    }

    /* sheen streaks on the polished side (reflections, not texture) */
    var streak = [];
    for (i = 0; i < 11; i++) {
      streak.push({ x: 0.9 + i * 1.15 + (i % 3) * 0.22, w: 0.05 + (i % 4) * 0.035, p: i * 0.7 });
    }

    /* ---- the machine ---- */
    var MX = 1.72, MZ = 4.9, t0m = 0.35;
    /* shroud skirt sitting on the floor */
    for (i = 0; i < 18; i++) {
      var sa0 = (i / 18) * Math.PI * 2, sa1 = ((i + 1) / 18) * Math.PI * 2;
      face([[MX + Math.cos(sa0) * 0.80, 0.004, MZ + Math.sin(sa0) * 0.80],
            [MX + Math.cos(sa1) * 0.80, 0.004, MZ + Math.sin(sa1) * 0.80],
            [MX + Math.cos(sa1) * 0.70, 0.26, MZ + Math.sin(sa1) * 0.70],
            [MX + Math.cos(sa0) * 0.70, 0.26, MZ + Math.sin(sa0) * 0.70]],
        shade(TONE.skirt, 0.72 + 0.5 * Math.max(0, Math.cos((sa0 + sa1) / 2))), [Math.cos(sa0), 0.22, Math.sin(sa0)], t0m);
    }
    /* gold lip on the shroud, so the deck edge reads */
    for (i = 0; i < 18; i++) {
      var la0 = (i / 18) * Math.PI * 2, la1 = ((i + 1) / 18) * Math.PI * 2;
      face([[MX + Math.cos(la0) * 0.72, 0.26, MZ + Math.sin(la0) * 0.72],
            [MX + Math.cos(la1) * 0.72, 0.26, MZ + Math.sin(la1) * 0.72],
            [MX + Math.cos(la1) * 0.70, 0.30, MZ + Math.sin(la1) * 0.70],
            [MX + Math.cos(la0) * 0.70, 0.30, MZ + Math.sin(la0) * 0.70]],
        shade(TONE.bodyLt, 1.0), [Math.cos(la0), 0.4, Math.sin(la0)], t0m + 0.05);
    }
    var HEADS = [[-0.36, -0.30], [0.38, -0.14], [-0.02, 0.38]];
    /* deck, chassis and caster wheels */
    box(MX, 0.30, MZ, 0.98, 0.14, 0.84, TONE.steelDim, t0m + 0.08);
    box(MX, 0.44, MZ, 0.80, 0.34, 0.70, TONE.steel, t0m + 0.14);
    box(MX, 0.44, MZ + 0.36, 0.82, 0.34, 0.05, TONE.body, t0m + 0.16);
    /* motor housing with cooling fins */
    box(MX, 0.78, MZ, 0.34, 0.40, 0.34, TONE.steel, t0m + 0.22);
    for (i = 0; i < 4; i++) {
      box(MX - 0.19 + i * 0.12, 0.80, MZ - 0.19, 0.03, 0.36, 0.03, TONE.steelDim, t0m + 0.26);
    }
    box(MX, 1.18, MZ, 0.30, 0.10, 0.30, TONE.body, t0m + 0.3);
    /* control box and badge, gold, on the front face */
    box(MX - 0.12, 0.50, MZ - 0.37, 0.30, 0.20, 0.05, TONE.body, t0m + 0.3);
    box(MX - 0.12, 0.55, MZ - 0.40, 0.16, 0.09, 0.02, '#2A2A28', t0m + 0.34);
    box(MX + 0.22, 0.56, MZ - 0.37, 0.06, 0.06, 0.04, '#9B3B22', t0m + 0.34);
    /* water tank at the tail */
    box(MX - 0.05, 0.60, MZ + 0.54, 0.52, 0.54, 0.34, TONE.steelDim, t0m + 0.22);
    box(MX - 0.05, 1.14, MZ + 0.54, 0.16, 0.07, 0.16, TONE.gold, t0m + 0.32);
    /* extraction port and fat hose leaving the motor */
    drum(MX + 0.20, 1.24, MZ + 0.02, 0.10, 0.12, 10, TONE.steelDim, t0m + 0.36);
    /* handle: two rises and a crossbar, raked back from the deck */
    (function () {
      var a = [[MX - 0.40, 0.42, MZ + 0.30], [MX + 0.40, 0.42, MZ + 0.30]];
      var b = [[MX - 0.52, 1.42, MZ + 0.96], [MX + 0.52, 1.42, MZ + 0.96]];
      for (var q = 0; q < 2; q++) {
        face([[a[q][0] - 0.05, a[q][1] - 0.07, a[q][2]], [a[q][0] + 0.05, a[q][1] - 0.07, a[q][2]],
              [b[q][0] + 0.05, b[q][1], b[q][2]], [b[q][0] - 0.05, b[q][1], b[q][2]]], shade(TONE.steel, 1.0), [0, 0, 1], t0m + 0.38);
        face([[a[q][0] - 0.05, a[q][1] - 0.07, a[q][2] + 0.03], [a[q][0] + 0.05, a[q][1] - 0.07, a[q][2] + 0.03],
              [b[q][0] + 0.05, b[q][1], b[q][2] + 0.03], [b[q][0] - 0.05, b[q][1], b[q][2] + 0.03]], shade(TONE.steelDim, 0.8), [0, 0, 1], t0m + 0.38);
      }
      box(MX, 1.38, MZ + 0.96, 1.16, 0.085, 0.085, TONE.skirt, t0m + 0.44);
      box(MX, 1.39, MZ + 0.96, 1.18, 0.03, 0.03, TONE.gold, t0m + 0.46);
    })();
    /* casters */
    [[-0.52, -0.40], [0.52, -0.40], [0.52, 0.42], [-0.52, 0.42]].forEach(function (w) {
      drum(MX + w[0], 0.03, MZ + w[1], 0.085, 0.11, 10, '#121314', t0m + 0.1);
      face([[MX + w[0] - 0.02, 0.35, MZ + w[1] - 0.02], [MX + w[0] + 0.02, 0.35, MZ + w[1] - 0.02],
            [MX + w[0] + 0.02, 0.10, MZ + w[1] - 0.02], [MX + w[0] - 0.02, 0.10, MZ + w[1] - 0.02]], TONE.steelDim, [0, 0, -1], t0m + 0.12);
    });

    /* ---- props: water bucket on the polished side, hand edging tool ---- */
    drum(3.15, 0.0, 3.35, 0.20, 0.34, 12, TONE.prop, 1.0);
    face([[3.15 - 0.16, 0.34, 3.35], [3.15 + 0.16, 0.34, 3.35], [3.15 + 0.16, 0.34, 3.19], [3.15 - 0.16, 0.34, 3.19]], TONE.water, [0, 1, 0], 1.1);
    (function () {
      var gx = 0.85, gz = 2.95;
      box(gx, 0.004, gz, 0.30, 0.02, 0.22, TONE.steelDim, 1.2);
      head(gx, gz, 0.13, 1.24, 0.3);
      box(gx - 0.20, 0.03, gz, 0.42, 0.05, 0.05, TONE.skirt, 1.28);
      box(gx - 0.44, 0.03, gz - 0.06, 0.06, 0.30, 0.06, TONE.steel, 1.3);
    })();

    /* hose from the machine tail to the bucket, and a lead curling off frame */
    var HOSE = [[MX + 0.10, 0.28, MZ + 0.62], [MX + 0.48, 0.10, MZ + 1.20], [2.72, 0.03, 5.9],
                [3.18, 0.02, 4.9], [3.5, 0.02, 4.0], [3.28, 0.12, 3.55]];
    var LEAD = [[MX - 0.30, 0.06, MZ + 0.45], [1.2, 0.02, 3.9], [0.55, 0.02, 3.1], [0.1, 0.02, 2.4], [-0.5, 0.02, 2.1]];
    var DUCT = [[MX + 0.20, 1.30, MZ + 0.02], [MX + 0.55, 1.70, MZ + 0.30], [MX + 0.95, 2.30, MZ + 0.70],
                [MX + 1.30, 3.10, MZ + 1.20], [MX + 1.55, 3.90, MZ + 1.75]];

    return {
      duration: 2.4,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        var spin = Projection.reduced() ? 0 : time * 2.4;

        var sky = S.ctx.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#0A0A0B');
        sky.addColorStop(0.45, '#111112');
        sky.addColorStop(0.62, '#171614');
        sky.addColorStop(1, '#0C0C0D');
        S.ctx.fillStyle = sky; S.ctx.fillRect(0, 0, S.W, S.H);

        var glow = S.ctx.createRadialGradient(S.W * 0.68, S.horizon * 0.92, 0, S.W * 0.68, S.horizon * 0.92, S.W * 0.62);
        glow.addColorStop(0, 'rgba(217,164,65,0.14)');
        glow.addColorStop(0.5, 'rgba(217,164,65,0.04)');
        glow.addColorStop(1, 'rgba(217,164,65,0)');
        S.ctx.fillStyle = glow; S.ctx.fillRect(0, 0, S.W, S.H);

        var list = [], i, p, pts, sum, mapped, miss;
        for (i = 0; i < faces.length; i++) {
          var f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (var q = 0; q < f.pts.length; q++) {
            p = S.project(f.pts[q][0], f.pts[q][1], f.pts[q][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          list.push({
            pts: mapped, dz: sum / mapped.length,
            fill: Projection.mix(shade(f.tone, 0.5 + 0.62 * Math.max(0, d)), FOG, S.fog(sum / mapped.length) * 0.66),
            a: Math.min(1, (t - f.t0) / 0.5) * f.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          S.ctx.globalAlpha = it.a;
          S.ctx.beginPath(); S.ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) S.ctx.lineTo(pts[j][0], pts[j][1]);
          S.ctx.closePath(); S.ctx.fillStyle = it.fill; S.ctx.fill();
        }
        S.ctx.globalAlpha = 1;

        /* foreground concrete bite: aggregate specks, denser near the camera */
        if (!Projection.reduced() || true) {
          var sp0 = 1.0;
          for (i = 0; i < 90; i++) {
            sp0 = (sp0 * 9301 + 49297) % 233280;
            var sx = -6.5 + (sp0 / 233280) * 13.2;
            sp0 = (sp0 * 9301 + 49297) % 233280;
            var sz = 0.9 + (sp0 / 233280) * 3.0;
            var spt = S.project(sx, 0.006, sz);
            if (!spt) continue;
            var sg = sx < BX ? 'rgba(158,156,150,0.20)' : 'rgba(196,190,176,0.22)';
            S.ctx.fillStyle = sg;
            S.ctx.beginPath(); S.ctx.arc(spt[0], spt[1], Math.max(.5, 34 / spt[2]), 0, 6.2832); S.ctx.fill();
          }
        }

        /* contact shadow under the machine */
        var cs = S.project(MX, 0.002, MZ + 0.1);
        if (cs) {
          S.ctx.save(); S.ctx.translate(cs[0], cs[1]); S.ctx.scale(1, 0.34);
          var cg = S.ctx.createRadialGradient(0, 0, 0, 0, 0, S.focal / cs[2] * 1.5);
          cg.addColorStop(0, 'rgba(4,4,5,0.62)'); cg.addColorStop(1, 'rgba(4,4,5,0)');
          S.ctx.fillStyle = cg; S.ctx.beginPath(); S.ctx.arc(0, 0, S.focal / cs[2] * 1.5, 0, 6.2832); S.ctx.fill();
          S.ctx.restore();
        }

        /* the heads: rotating discs under the shroud */
        for (i = 0; i < HEADS.length; i++) {
          if (t > t0m + 0.3) head(MX + HEADS[i][0], MZ + HEADS[i][1], 0.185, 0, spin * (i % 2 ? -1 : 1));
        }

        /* wet sheen sweeping the polished pass */
        for (i = 0; i < streak.length; i++) {
          var st = streak[i];
          var sh = 0.055 + 0.055 * Math.sin(time * 0.7 + st.p);
          if (sh <= 0) continue;
          var sp1 = S.project(st.x, 0.005, 13.5), sp2 = S.project(st.x, 0.005, 1.1);
          if (!sp1 || !sp2) continue;
          S.ctx.strokeStyle = 'rgba(239,192,105,' + sh.toFixed(3) + ')';
          S.ctx.lineWidth = Math.max(1, 520 * st.w / sp2[2]);
          S.ctx.beginPath(); S.ctx.moveTo(sp1[0], sp1[1]); S.ctx.lineTo(sp2[0], sp2[1]); S.ctx.stroke();
        }

        /* reflection of the machine pulled toward the camera */
        var refl = S.project(MX, 0.005, 2.2);
        if (refl) {
          S.ctx.save(); S.ctx.translate(refl[0], refl[1]); S.ctx.scale(1, 0.20);
          var rg = S.ctx.createRadialGradient(0, 0, 0, 0, 0, 220);
          rg.addColorStop(0, 'rgba(20,19,17,0.55)');
          rg.addColorStop(0.55, 'rgba(217,164,65,0.10)');
          rg.addColorStop(1, 'rgba(217,164,65,0)');
          S.ctx.fillStyle = rg; S.ctx.beginPath(); S.ctx.arc(0, 0, 220, 0, 6.2832); S.ctx.fill();
          S.ctx.restore();
        }

        /* hose */
        if (t > 1.2) {
          var kk = Math.min(1, (t - 1.2) / 0.7), c = S.ctx; c.lineCap = 'round';
          var run = Math.max(2, Math.round(HOSE.length * kk));
          [[7, 'rgba(6,6,7,.6)'], [4.6, TONE.hose], [1.2, 'rgba(239,192,105,.30)']].forEach(function (pass) {
            c.lineWidth = pass[0]; c.strokeStyle = pass[1]; c.beginPath();
            for (var h = 0; h < run; h++) {
              var hp = S.project(HOSE[h][0], HOSE[h][1], HOSE[h][2]);
              if (!hp) continue;
              if (h === 0) c.moveTo(hp[0], hp[1]); else c.lineTo(hp[0], hp[1]);
            }
            c.stroke();
          });
        }

        /* power lead */
        if (t > 1.35) {
          var lk = Math.min(1, (t - 1.35) / 0.6), lc = S.ctx; lc.lineCap = 'round';
          var lrun = Math.max(2, Math.round(LEAD.length * lk));
          [[5, 'rgba(6,6,7,.55)'], [2.6, '#16181A']].forEach(function (pass) {
            lc.lineWidth = pass[0]; lc.strokeStyle = pass[1]; lc.beginPath();
            for (var h2 = 0; h2 < lrun; h2++) {
              var lp = S.project(LEAD[h2][0], LEAD[h2][1], LEAD[h2][2]);
              if (!lp) continue;
              if (h2 === 0) lc.moveTo(lp[0], lp[1]); else lc.lineTo(lp[0], lp[1]);
            }
            lc.stroke();
          });
        }

        /* extraction duct rising off the motor */
        if (t > 1.05) {
          var dk = Math.min(1, (t - 1.05) / 0.8), dc = S.ctx; dc.lineCap = 'round';
          var drun = Math.max(2, Math.round(DUCT.length * dk));
          [[26, 'rgba(8,9,10,.55)'], [19, '#2A2E32'], [7, 'rgba(160,166,170,.35)']].forEach(function (pass) {
            dc.lineWidth = pass[0]; dc.strokeStyle = pass[1]; dc.beginPath();
            for (var h3 = 0; h3 < drun; h3++) {
              var dp = S.project(DUCT[h3][0], DUCT[h3][1], DUCT[h3][2]);
              if (!dp) continue;
              if (h3 === 0) dc.moveTo(dp[0], dp[1]); else dc.lineTo(dp[0], dp[1]);
            }
            dc.stroke();
          });
        }

        /* slurry mist drifting off the shroud */
        if (!Projection.reduced()) {
          for (i = 0; i < 14; i++) {
            var ph = ((time * 0.10 + i * 0.071) % 1);
            var mx = MX - 0.5 - ph * 1.5 - (i % 3) * 0.2, mz = MZ + 0.5 - (i % 5) * 0.25, my = 0.05 + ph * 0.55;
            var mp = S.project(mx, my, mz);
            if (!mp) continue;
            var ma = (1 - ph) * 0.30;
            S.ctx.fillStyle = 'rgba(214,208,196,' + ma.toFixed(3) + ')';
            S.ctx.beginPath(); S.ctx.arc(mp[0], mp[1], Math.max(0.6, 2.4 * (1 - ph)), 0, 6.2832); S.ctx.fill();
          }
        }

        /* seat the copy side */
        var vg = S.ctx.createLinearGradient(0, 0, S.W * 0.72, 0);
        vg.addColorStop(0, 'rgba(9,9,10,0.90)');
        vg.addColorStop(0.55, 'rgba(9,9,10,0.42)');
        vg.addColorStop(1, 'rgba(9,9,10,0)');
        S.ctx.fillStyle = vg; S.ctx.fillRect(0, 0, S.W, S.H);
        var fl = S.ctx.createLinearGradient(0, S.H - 150, 0, S.H);
        fl.addColorStop(0, 'rgba(9,9,10,0)'); fl.addColorStop(1, 'rgba(9,9,10,0.92)');
        S.ctx.fillStyle = fl; S.ctx.fillRect(0, S.H - 150, S.W, 150);
        var tp = S.ctx.createLinearGradient(0, 0, 0, 140);
        tp.addColorStop(0, 'rgba(9,9,10,0.85)'); tp.addColorStop(1, 'rgba(9,9,10,0)');
        S.ctx.fillStyle = tp; S.ctx.fillRect(0, 0, S.W, 140);
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneFlooring — Table One Flooring. A room mid-lay: courses of timber
   * running into depth against a cut line, underlay, chalk string, nailer,
   * tapping block, boards leaning on the wall, work light. Same contract
   * as the other scenes: world-space faces, one projection, far-to-near.
   * ------------------------------------------------------------------ */
  Projection.sceneFlooring = function (S, o) {
    o = o || {};
    var TONE = {
      slab: '#2b241d', slab2: '#221d18', wall: '#241e19', wall2: '#191512',
      skirting: '#382b20', plank: '#b07a45', plankB: '#966538', plankC: '#c38c54',
      grain: '#6b4626', joint: '#150e09', underlay: '#8f8d87', foil: '#c8c5bc',
      steel: '#7d8589', steelHi: '#b6bec2', rubber: '#2d2c2a', chalk: '#d9ddda',
      lamp: '#f6dcae', bucket: '#3d3128'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.52, 0.78, -0.36], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#151110';
    var faces = [];
    var X0 = -5.2, X1 = 5.2, ZFAR = 11.6, WCUT = 0.96;

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#fff4e2', (lit - 1) * 0.62)
        : Projection.mix(tone, '#07080a', (1 - lit) * 0.8);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.96), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.62), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.8), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.04), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.18), [0, 1, 0], t0);
    }
    function board(ax, bx, z, halfW, tone, t0) {
      face([[ax, 0.015, z + halfW], [bx, 0.015, z + halfW], [bx, 0.015, z - halfW], [ax, 0.015, z - halfW]], shade(tone, 1), [0, 1, 0], t0);
      face([[ax + 0.05, 0.017, z + halfW * 0.34], [bx - 0.06, 0.017, z + halfW * 0.34], [bx - 0.05, 0.017, z + halfW * 0.05], [ax + 0.06, 0.017, z + halfW * 0.05]], TONE.grain, [0, 1, 0], t0 + 0.04, 0.55);
      face([[bx - 0.014, 0.017, z + halfW], [bx, 0.017, z + halfW], [bx, 0.017, z - halfW], [bx - 0.014, 0.017, z - halfW]], TONE.joint, [0, 1, 0], t0);
    }

    /* slab, walls, doorway */
    face([[X0, 0, -0.6], [X1, 0, -0.6], [X1, 0, ZFAR], [X0, 0, ZFAR]], TONE.slab, [0, 1, 0], 0);
    face([[X0, 0, WCUT], [X1, 0, WCUT], [X1, 0, 0.22], [X0, 0, 0.22]], TONE.slab2, [0, 1, 0], 0);
    face([[X0, 0, ZFAR], [X1, 0, ZFAR], [X1, 2.8, ZFAR], [X0, 2.8, ZFAR]], TONE.wall, [0, 0, -1], 0.05);
    face([[-1.02, 0, ZFAR - 0.02], [1.02, 0, ZFAR - 0.02], [1.02, 2.16, ZFAR - 0.02], [-1.02, 2.16, ZFAR - 0.02]], '#0c0a08', [0, 0, -1], 0.1);
    face([[X0, 0, ZFAR - 0.03], [X0 + 9.9, 0, ZFAR - 0.03], [X0 + 9.9, 0.11, ZFAR - 0.03], [X0, 0.11, ZFAR - 0.03]], TONE.skirting, [0, 0, -1], 0.3);
    [[X0, 1], [X1, -1]].forEach(function (w) {
      face([[w[0], 0, -0.4], [w[0], 0, ZFAR], [w[0], 2.8, ZFAR], [w[0], 2.8, -0.4]], shade(TONE.wall2, w[1] > 0 ? 1 : 0.9), [-w[1], 0, 0], 0.05);
    });

    /* courses of new board, laid back to front, staggered joints */
    var zc, run, len, bx0, ti = 0, n = 0;
    for (zc = ZFAR; zc > WCUT; zc -= 0.2) {
      var t0 = 0.1 + (ZFAR - zc) * 0.052;
      var tone = (n % 3 === 0) ? TONE.plankC : (n % 3 === 1 ? TONE.plank : TONE.plankB);
      run = X0 - ((n * 1.17) % 1.6);
      while (run < X1) {
        len = 1.05 + (((ti * 29) % 11) / 11) * 0.6;
        bx0 = run; run = Math.min(X1, run + len);
        board(Math.max(X0, bx0), run, zc, 0.098, tone, t0 + ((bx0 - X0) / (X1 - X0)) * 0.22);
        ti++;
      }
      n++;
    }

    /* chalk line snapped on the slab, cut line, underlay ready to run */
    face([[X0, 0.02, WCUT - 0.012], [X1, 0.02, WCUT - 0.012], [X1, 0.02, WCUT - 0.03], [X0, 0.02, WCUT - 0.03]], TONE.chalk, [0, 1, 0], 0.5, 0.85);
    face([[X0, 0.016, 0.86], [X1, 0.016, 0.86], [X1, 0.016, 0.30], [X0, 0.016, 0.30]], TONE.underlay, [0, 1, 0], 0.62, 0.42);
    for (var f = 0; f < 4; f++) {
      face([[X0, 0.019, 0.74 - f * 0.14], [X1, 0.019, 0.74 - f * 0.14], [X1, 0.019, 0.725 - f * 0.14], [X0, 0.019, 0.725 - f * 0.14]], TONE.foil, [0, 1, 0], 0.72 + f * 0.06, 0.5);
    }

    /* pneumatic nailer, tapping block, mallet, knee pads, offcuts */
    (function () {
      var gx = 1.52, gz = 2.95;
      box(gx, 0.03, gz, 1.34, 0.1, 0.13, TONE.steel, 1.42);
      box(gx + 0.62, 0.03, gz, 0.2, 0.16, 0.15, TONE.steelHi, 1.5);
      box(gx - 0.18, 0.11, gz, 0.34, 0.12, 0.11, TONE.steel, 1.5);
      box(gx - 0.3, 0.2, gz, 0.11, 0.24, 0.1, TONE.rubber, 1.56);
      box(gx + 0.16, 0.24, gz - 0.02, 0.4, 0.05, 0.05, TONE.steelHi, 1.62);
      box(gx - 0.68, 0.02, gz - 0.02, 0.3, 0.06, 0.1, TONE.plank, 1.35);
      box(0.94, 0.02, 3.5, 0.3, 0.05, 0.1, TONE.plankC, 1.68);
      box(1.98, 0.02, 4.3, 0.4, 0.42, 0.4, TONE.bucket, 1.72);
      box(1.98, 0.44, 4.3, 0.44, 0.03, 0.44, TONE.steel, 1.78);
      box(0.72, 0.02, 2.05, 0.62, 0.1, 0.2, TONE.plankB, 1.86);
      [[0.34, 4.05], [0.72, 4.2]].forEach(function (p, q) {
        box(p[0], 0.02, p[1], 0.34, 0.07, 0.26, TONE.rubber, 1.74 + q * 0.05);
        box(p[0], 0.09, p[1], 0.28, 0.02, 0.19, '#2c2a27', 1.78 + q * 0.05);
      });
    })();

    /* boards stacked on the floor, waiting to go down */
    (function () {
      var i2;
      for (i2 = 0; i2 < 4; i2++) {
        var zz = 5.05 + i2 * 0.24, yy = 0.02 + i2 * 0.045;
        face([[2.02, yy, zz], [3.24, yy, zz], [3.24, yy, zz - 0.19], [2.02, yy, zz - 0.19]], shade(TONE.plankB, 1.02 + i2 * 0.03), [0, 1, 0], 1.9 + i2 * 0.06);
        face([[2.02, yy, zz - 0.19], [3.24, yy, zz - 0.19], [3.24, yy + 0.045, zz - 0.19], [2.02, yy + 0.045, zz - 0.19]], TONE.joint, [0, 0, -1], 1.9 + i2 * 0.06);
      }
    })();

    /* work light on a stand, left side */
    var LX = -3.1, LZ = 6.1;
    (function () {
      box(LX, 0.02, LZ, 0.5, 0.06, 0.5, TONE.steel, 1.3);
      box(LX, 0.06, LZ, 0.07, 1.78, 0.07, TONE.steelHi, 1.36);
      box(LX, 1.8, LZ - 0.16, 0.26, 0.2, 0.2, TONE.lamp, 1.44);
      box(LX, 1.8, LZ, 0.1, 0.08, 0.36, TONE.steel, 1.44);
    })();

    /* dust, deterministic, drifting through the light */
    var motes = [], seed = 77123;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    for (var m = 0; m < 44; m++) {
      motes.push({ x: LX + (rnd() - 0.5) * 5.4, y: 0.25 + rnd() * 1.9, z: LZ + (rnd() - 0.5) * 5, s: 0.5 + rnd() * 1.5, p: rnd() * 6.283 });
    }

    var CHALK = [[X0, 0.055, 1.02], [-3.4, 0.045, 1.02], [-1.6, 0.041, 1.02], [0, 0.04, 1.02], [1.6, 0.041, 1.02], [3.4, 0.045, 1.02], [X1, 0.055, 1.02]];

    return {
      duration: 2.4,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        S.yaw = Projection.reduced() ? 0 : Math.sin(time * 0.085) * 0.024;

        var sky = S.ctx.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#0a0807');
        sky.addColorStop(0.46, '#12100e');
        sky.addColorStop(1, '#1a1512');
        S.ctx.fillStyle = sky; S.ctx.fillRect(0, 0, S.W, S.H);

        var list = [], i, p, pts, sum, mapped, f2;
        for (i = 0; i < faces.length; i++) {
          f2 = faces[i];
          if (t < f2.t0) continue;
          mapped = []; sum = 0;
          var miss = false;
          for (var q = 0; q < f2.pts.length; q++) {
            p = S.project(f2.pts[q][0], f2.pts[q][1], f2.pts[q][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          var nn = f2.n, nm = Math.hypot(nn[0], nn[1], nn[2]) || 1;
          var d = (nn[0] / nm) * LIGHT[0] + (nn[1] / nm) * LIGHT[1] + (nn[2] / nm) * LIGHT[2];
          var dz = sum / mapped.length;
          list.push({
            pts: mapped, dz: dz,
            fill: Projection.mix(shade(f2.tone, 0.62 + 0.6 * Math.max(0, d)), FOG, S.fog(dz) * 0.66),
            a: Math.min(1, (t - f2.t0) / 0.36) * f2.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          if (it.a <= 0.01) continue;
          S.ctx.globalAlpha = it.a;
          S.ctx.beginPath(); S.ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) S.ctx.lineTo(pts[j][0], pts[j][1]);
          S.ctx.closePath(); S.ctx.fillStyle = it.fill; S.ctx.fill();
        }
        S.ctx.globalAlpha = 1;

        /* chalk string, taut with a touch of sag */
        if (t > 1.28) {
          var ka = Math.min(1, (t - 1.28) / 0.5);
          S.ctx.lineCap = 'round';
          [[2.6, 'rgba(6,5,4,.5)'], [1.3, 'rgba(217,221,218,' + (0.5 * ka).toFixed(2) + ')']].forEach(function (pass) {
            S.ctx.lineWidth = pass[0]; S.ctx.strokeStyle = pass[1]; S.ctx.beginPath();
            var started = false;
            for (var h = 0; h < CHALK.length; h++) {
              var hp = S.project(CHALK[h][0], CHALK[h][1], CHALK[h][2]);
              if (!hp) continue;
              if (!started) { S.ctx.moveTo(hp[0], hp[1]); started = true; } else S.ctx.lineTo(hp[0], hp[1]);
            }
            S.ctx.stroke();
          });
        }

        /* lamp glow + dust in the beam */
        var lh = S.project(LX, 1.9, LZ);
        if (lh) {
          var rad = S.H * 0.62;
          var gg = S.ctx.createRadialGradient(lh[0], lh[1], 0, lh[0], lh[1], rad);
          var pulse = 0.9 + 0.1 * Math.sin(time * 0.7);
          gg.addColorStop(0, 'rgba(248,222,176,' + (0.38 * pulse).toFixed(3) + ')');
          gg.addColorStop(0.42, 'rgba(232,196,142,' + (0.1 * pulse).toFixed(3) + ')');
          gg.addColorStop(1, 'rgba(228,188,130,0)');
          S.ctx.fillStyle = gg; S.ctx.fillRect(0, 0, S.W, S.H);
          if (t > 1.4) {
            for (var q2 = 0; q2 < motes.length; q2++) {
              var mo = motes[q2];
              var mp = S.project(mo.x + Math.sin(time * 0.24 + mo.p) * 0.1, mo.y + Math.sin(time * 0.16 + mo.p) * 0.06,
                mo.z + Math.cos(time * 0.2 + mo.p) * 0.1);
              if (!mp) continue;
              S.ctx.fillStyle = 'rgba(255,232,196,' + (0.34 * (1 - S.fog(mp[2])) * Math.min(1, (t - 1.4) / 0.6)).toFixed(3) + ')';
              S.ctx.beginPath(); S.ctx.arc(mp[0], mp[1], mo.s * 0.7, 0, 6.2832); S.ctx.fill();
            }
          }
        }
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneMowing — Thane Gillham Mowing. A ride-on mower parked on the cut
   * verge, mown rows running back to a box trailer, kerb, fence and far
   * treeline. World-space faces, one projection, far-to-near sort.
   * ------------------------------------------------------------------ */
  Projection.sceneMowing = function (S, o) {
    o = o || {};
    var TONE = {
      cutA: '#41661f', cutB: '#4c7626', cutHi: '#6d9a35', uncut: '#547f28',
      kerb: '#9a9a8c', gutter: '#6f7064', road: '#4a4d47', line: '#b9b7a4',
      tyre: '#0e130d', body: '#141a11', panel: '#1d7a12', panelHi: '#2f9c1c',
      steel: '#7d8378', steelHi: '#a7ad9f', seat: '#101410', trim: '#2a2f24',
      wood: '#6b5b3d', post: '#3a3627', hedge: '#1e3016', tree: '#16240f',
      deck: '#1a2016', catcher: '#2b3520'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [0.52, 0.66, -0.54], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FZ = o.fz || 30;
    var faces = [];
    var seed = 7717;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

    function face(pts, tone, n) { faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0] }); }

    /* axis box: cx/cy/cz centre, w/h/d sizes */
    function box(cx, cy, cz, w, h, d, tone, topTone) {
      var hw = w / 2, hh = h / 2, hd = d / 2;
      var x0 = cx - hw, x1 = cx + hw, y0 = cy - hh, y1 = cy + hh, z0 = cz - hd, z1 = cz + hd;
      face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], topTone || tone, [0, 1, 0]);
      face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], tone, [0, 0, -1]);
      face([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], tone, [0, 0, 1]);
      face([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], tone, [1, 0, 0]);
      face([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], tone, [-1, 0, 0]);
    }

    function wheel(cx, cy, cz, r, wdt, tone) {
      var n = 18, i, a, p1, p2;
      for (i = 0; i < n; i++) {
        a = (i / n) * 6.2832; var b = ((i + 1) / n) * 6.2832;
        p1 = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        p2 = [cx + Math.cos(b) * r, cy + Math.sin(b) * r];
        face([[p1[0], p1[1], cz - wdt / 2], [p2[0], p2[1], cz - wdt / 2],
              [p2[0], p2[1], cz + wdt / 2], [p1[0], p1[1], cz + wdt / 2]], tone, [0, 0, -1]);
      }
      face((function () {
        var out = [];
        for (var q = 0; q < n; q++) { var ang = (q / n) * 6.2832; out.push([cx + Math.cos(ang) * r * 0.42, cy + Math.sin(ang) * r * 0.42, cz - wdt / 2 - 0.01]); }
        return out;
      })(), TONE.steelHi, [0, 0, -1]);
    }

    /* local->world for the mower (rx = rotation about Y, ox/oz = world origin) */
    var MR = -0.46, MOX = 2.55, MOZ = 6.6;
    function lw(lx, lz) {
      var c = Math.cos(MR), s = Math.sin(MR);
      return [MOX + lx * c - lz * s, MOZ + lx * s + lz * c];
    }
    function mbox(lx, ly, lz, w, h, d, tone, topTone) {
      var m = Math.min(w, d) * 0.42;
      box(0, 0, 0, 0, 0, 0, tone, topTone); faces.pop();
      var c = lw(lx, lz), hw = w / 2, hd = d / 2, hh = h / 2;
      var ang = MR, cs = Math.cos(ang), sn = Math.sin(ang);
      function P(dx, dy, dz) {
        return [c[0] + dx * cs - dz * sn, ly + dy, c[1] + dx * sn + dz * cs];
      }
      var x0 = -hw, x1 = hw, z0 = -hd, z1 = hd, y0 = -hh, y1 = hh;
      face([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], topTone || tone, [0, 1, 0]);
      face([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], tone, [-sn, 0, -cs]);
      face([P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0)], tone, [sn, 0, cs]);
      face([P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1)], tone, [cs, 0, -sn]);
      face([P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)], tone, [-cs, 0, sn]);
      return m;
    }
    function mdisc(lx, ly, lz, r, tone, wdt) {
      var n = 16, out = [], c = lw(lx, lz), hw = (wdt || 0.12) / 2;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 6.2832;
        out.push([c[0] + Math.cos(a) * r, ly + Math.sin(a) * r, c[1] - hw]);
      }
      face(out, tone, [0, 0, -1]);
      face(out.map(function (p) { return [p[0], p[1], p[2] + (wdt || 0.12)]; }), tone, [0, 0, 1]);
    }

    /* ---- ground: mown rows receding, uncut strip, kerb, road ---- */
    var z, x, row, alt = 0;
    for (z = 1.0; z < FZ; z += 0.8) {
      alt = 1 - alt;
      var dz0 = z, dz1 = z + 0.8;
      var tone = alt ? TONE.cutA : TONE.cutB;
      var wob = (rnd() - 0.5) * 0.06;
      face([[-19, 0, dz0], [7.1, 0, dz0], [7.1, 0, dz1 + wob], [-19, 0, dz1 + wob]], tone, [0, 1, 0]);
      /* mow line along the row edge */
      face([[-19, 0.004, dz0 - 0.015], [7.1, 0.004, dz0 - 0.015],
            [7.1, 0.004, dz0 + 0.02], [-19, 0.004, dz0 + 0.02]], TONE.cutHi, [0, 1, 0]);
      /* uncut verge beyond the kerb */
      face([[7.3, 0, dz0], [11.6, 0, dz0], [11.6, 0, dz1], [7.3, 0, dz1]], TONE.uncut, [0, 1, 0]);
      /* kerb + gutter + road */
      face([[7.1, 0, dz0], [7.3, 0, dz0], [7.3, 0.15, dz1], [7.1, 0.15, dz1]], TONE.kerb, [-1, 0, 0]);
      face([[6.98, 0.15, dz0], [7.1, 0.15, dz0], [7.1, 0.15, dz1], [6.98, 0.15, dz1]], TONE.kerb, [0, 1, 0]);
      face([[11.6, 0, dz0], [19, 0, dz0], [19, 0, dz1], [11.6, 0, dz1]], TONE.road, [0, 1, 0]);
      if (Math.round(z * 1.25) % 3 === 0) {
        face([[15.0, 0.006, dz0 + 0.1], [15.14, 0.006, dz0 + 0.1],
              [15.14, 0.006, dz1 - 0.05], [15.0, 0.006, dz1 - 0.05]], TONE.line, [0, 1, 0]);
      }
      /* grass clippings scattered on the near rows */
      if (z < 12) {
        for (var c1 = 0; c1 < 3; c1++) {
          var gx = -12 + rnd() * 19, gz = dz0 + rnd() * 0.8;
          if (gx > 6.9) continue;
          face([[gx, 0.006, gz], [gx + 0.16 + rnd() * 0.2, 0.006, gz - 0.05],
                [gx + 0.16 + rnd() * 0.2, 0.006, gz + 0.04], [gx, 0.006, gz + 0.06]], TONE.cutHi, [0, 1, 0]);
        }
      }
    }

    /* ---- standing grass: tufts on the uncut verge, edges, foreground ---- */
    function tuft(tx, tz, h, span, tone) {
      var lean = (rnd() - 0.5) * 0.24, wid = 0.012 + rnd() * 0.012;
      face([[tx - wid, 0, tz], [tx + wid, 0, tz],
            [tx + wid + lean, h, tz + span * 0.4], [tx - wid + lean, h, tz + span * 0.4]], tone, [0, 0, -1]);
    }
    for (var i = 0; i < 620; i++) {
      var tz = 1.2 + Math.pow(rnd(), 0.7) * (FZ - 1.4);
      var h = 0.16 + rnd() * 0.3;
      if (rnd() < 0.55) {
        tuft(7.32 + rnd() * 4.2, tz, h, 0.05, rnd() < 0.5 ? TONE.uncut : TONE.cutHi);
      } else {
        tuft(6.85 + rnd() * 0.22, tz, h * 0.7, 0.04, TONE.cutHi);
        tuft(-16 + rnd() * 23, tz, h * 0.42, 0.04, TONE.cutB);
      }
    }
    /* dense foreground band so the bottom edge is not bare */
    for (var fg = 0; fg < 170; fg++) {
      var fx = -14 + rnd() * 21;
      tuft(fx, 0.95 + rnd() * 1.1, 0.24 + rnd() * 0.4, 0.05, rnd() < 0.5 ? TONE.cutHi : TONE.uncut);
    }

    /* ---- fence line + hedge + trees behind the trailer ---- */
    for (var fp = 0; fp < 13; fp++) {
      var px = -17 + fp * 2.05;
      box(px, 0.62, 17.6, 0.11, 1.24, 0.11, TONE.post);
    }
    face([[-17, 1.02, 17.63], [8.6, 1.02, 17.63], [8.6, 1.1, 17.63], [-17, 1.1, 17.63]], TONE.wood, [0, 0, 1]);
    face([[-17, 0.56, 17.63], [8.6, 0.56, 17.63], [8.6, 0.64, 17.63], [-17, 0.64, 17.63]], TONE.wood, [0, 0, 1]);
    for (var hb = 0; hb < 34; hb++) {
      var hx = -18 + hb * 1.28, hh2 = 1.5 + rnd() * 1.5;
      box(hx, hh2 / 2 + 0.02, 19.4 + rnd() * 0.7, 1.5, hh2, 1.1, rnd() < 0.5 ? TONE.hedge : TONE.tree);
    }
    for (var tr = 0; tr < 9; tr++) {
      var tx2 = -20 + tr * 4.7 + rnd() * 1.6, th = 4.6 + rnd() * 2.6;
      box(tx2, 1.6, 23.5, 0.34, 3.2, 0.34, TONE.post);
      box(tx2, th, 23.5, 3.4 + rnd() * 2, 3.1, 3.0, TONE.tree, TONE.hedge);
    }

    /* ---- the mower (ride-on) ---- */
    (function () {
      /* deck + skids */
      mbox(-0.02, 0.15, 0, 1.16, 0.17, 0.86, TONE.deck);
      mbox(-0.02, 0.055, 0, 1.2, 0.05, 0.9, TONE.trim);
      [[-0.52, -0.36], [-0.52, 0.36], [0.44, -0.36], [0.44, 0.36]].forEach(function (q) {
        mdisc(q[0], 0.09, q[1], 0.09, TONE.seat, 0.09);
      });
      /* chassis */
      mbox(0.03, 0.36, 0, 1.02, 0.2, 0.66, TONE.body);
      mbox(-0.02, 0.5, 0, 0.92, 0.1, 0.6, TONE.panel, TONE.panelHi);
      /* rear engine cowl in brand green */
      mbox(0.3, 0.62, 0, 0.52, 0.3, 0.56, TONE.panel, TONE.panelHi);
      mbox(0.3, 0.79, 0, 0.34, 0.06, 0.36, TONE.trim);
      /* exhaust stub */
      mbox(0.54, 0.86, -0.16, 0.09, 0.16, 0.09, TONE.steelHi);
      /* seat + backrest */
      mbox(0.02, 0.66, 0, 0.44, 0.11, 0.5, TONE.seat);
      mbox(0.23, 0.83, 0, 0.1, 0.34, 0.48, TONE.seat);
      /* dash + steering column + wheel */
      mbox(-0.28, 0.62, 0, 0.2, 0.3, 0.2, TONE.trim);
      mbox(-0.34, 0.78, 0, 0.1, 0.22, 0.1, TONE.steel);
      (function () {
        var c = lw(-0.42, 0), pts = [], n = 14;
        for (var q = 0; q < n; q++) {
          var a = (q / n) * 6.2832;
          pts.push([c[0], 0.94 + Math.sin(a) * 0.15, c[1] + Math.cos(a) * 0.15]);
        }
        face(pts, TONE.seat, [0, -1, 0]);
      })();
      /* grass catcher at the rear */
      mbox(0.62, 0.5, 0, 0.34, 0.42, 0.5, TONE.catcher, TONE.trim);
      /* headlights */
      mdisc(-0.6, 0.5, -0.2, 0.045, '#f2e7c6', 0.03);
      mdisc(-0.6, 0.5, 0.2, 0.045, '#f2e7c6', 0.03);
      /* big rear wheels, small fronts */
      mdisc(0.36, 0.32, -0.44, 0.3, TONE.tyre, 0.19);
      mdisc(0.36, 0.32, 0.44, 0.3, TONE.tyre, 0.19);
      mdisc(-0.44, 0.24, -0.42, 0.21, TONE.tyre, 0.15);
      mdisc(-0.44, 0.24, 0.42, 0.21, TONE.tyre, 0.15);
    })();

    /* ---- box trailer in the background ---- */
    (function () {
      var TX = -5.4, TZ = 13.6, tz2 = TZ - 0.5;
      box(TX, 0.52, TZ, 2.0, 0.12, 1.16, TONE.steelHi, TONE.steelHi);
      box(TX, 0.44, TZ - 0.48, 1.86, 0.12, 0.1, TONE.trim);
      box(TX, 0.44, TZ + 0.48, 1.86, 0.12, 0.1, TONE.trim);
      /* cage sides + top rail */
      for (var s = 0; s < 5; s++) {
        var sx = TX - 0.9 + s * 0.46;
        box(sx, 0.78, TZ - 0.52, 0.05, 0.44, 0.05, TONE.steel);
        box(sx, 0.78, TZ + 0.52, 0.05, 0.44, 0.05, TONE.steel);
      }
      box(TX, 1.0, TZ - 0.52, 1.98, 0.05, 0.05, TONE.steelHi);
      box(TX, 1.0, TZ + 0.52, 1.98, 0.05, 0.05, TONE.steelHi);
      box(TX, 1.02, TZ - 0.52, 1.98, 0.06, 0.06, TONE.steelHi);
      box(TX, 0.98, TZ - 0.52, 0.05, 0.42, 0.05, TONE.steel);
      /* wheels + guards */
      mdisc(-0.01, -0.01, 0, 0.001, TONE.tyre, 0.01);
      (function () {
        [[TX - 0.6], [TX + 0.6]].forEach(function (w2) {
          var wx = w2[0];
          face((function () {
            var out = [], n = 18;
            for (var q = 0; q < n; q++) { var a = (q / n) * 6.2832; out.push([wx + Math.cos(a) * 0.3, 0.3 + Math.sin(a) * 0.3, TZ - 0.6]); }
            return out;
          })(), TONE.tyre, [0, 0, -1]);
          face((function () {
            var out = [], n = 18;
            for (var q = 0; q < n; q++) { var a = (q / n) * 6.2832; out.push([wx + Math.cos(a) * 0.3, 0.3 + Math.sin(a) * 0.3, TZ + 0.02]); }
            return out;
          })(), TONE.tyre, [0, 0, 1]);
          box(wx, 0.64, TZ - 0.34, 0.76, 0.06, 0.62, TONE.trim);
        });
      })();
      /* drawbar toward the camera */
      box(TX + 0.96, 0.44, TZ - 0.3, 0.7, 0.09, 0.09, TONE.steel);
      box(TX + 1.3, 0.44, TZ - 0.5, 0.09, 0.09, 0.42, TONE.steel);
      box(TX + 1.34, 0.28, TZ - 0.68, 0.08, 0.32, 0.08, TONE.steelHi);
      mdisc(TX + 1.34, 0.12, TZ - 0.68, 0.11, TONE.tyre, 0.07);
      /* a rake leaning on the trailer */
      box(TX - 0.7, 0.62, TZ - 0.62, 0.05, 1.3, 0.05, TONE.wood);
      box(TX - 0.7, 1.3, TZ - 0.62, 0.34, 0.05, 0.05, TONE.steel);
    })();

    /* ---- render ---- */
    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.55)
        : Projection.mix(tone, '#08110a', (1 - lit) * 0.7);
    }

    function collect() {
      var out = [], j, p, mapped, sum, f;
      for (j = 0; j < faces.length; j++) {
        f = faces[j];
        mapped = []; sum = 0;
        for (var q = 0; q < f.pts.length; q++) {
          p = S.project(f.pts[q][0], f.pts[q][1], f.pts[q][2]);
          if (!p) { mapped = null; break; }
          mapped.push(p); sum += p[2];
        }
        if (!mapped || !mapped.length) continue;
        out.push({ pts: mapped, tone: f.tone, n: f.n, dz: sum / mapped.length });
      }
      return out;
    }

    /* world-space ground under a point, for contact shadows */
    function shadow(x, z, r, a) {
      var p = S.project(x, 0.01, z);
      if (!p) return;
      var rr = S.focal / p[2] * r;
      var g = S.ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr);
      g.addColorStop(0, 'rgba(4,10,4,' + a + ')');
      g.addColorStop(1, 'rgba(4,10,4,0)');
      S.ctx.save(); S.ctx.translate(p[0], p[1]); S.ctx.scale(1, 0.34);
      S.ctx.translate(-p[0], -p[1]); S.ctx.fillStyle = g;
      S.ctx.beginPath(); S.ctx.arc(p[0], p[1], rr, 0, 6.2832); S.ctx.fill(); S.ctx.restore();
    }

    return {
      render: function (t) {
        var ctx = S.ctx, W = S.W, H = S.H;
        var hz = S.horizon;

        /* sky: dusk over the ridge */
        var sky = ctx.createLinearGradient(0, 0, 0, hz + H * 0.2);
        sky.addColorStop(0, '#0a140e');
        sky.addColorStop(0.55, '#1a2b1c');
        sky.addColorStop(1, '#43502c');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);
        var sun = ctx.createRadialGradient(W * 0.78, hz - H * 0.02, 0, W * 0.78, hz - H * 0.02, H * 0.55);
        sun.addColorStop(0, 'rgba(226,226,168,.5)');
        sun.addColorStop(0.35, 'rgba(176,190,120,.17)');
        sun.addColorStop(1, 'rgba(120,150,90,0)');
        ctx.fillStyle = sun; ctx.fillRect(0, 0, W, hz + H * 0.16);

        var list = collect();
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (var i2 = 0; i2 < list.length; i2++) {
          var it = list[i2];
          var d = (it.n[0] * LIGHT[0] + it.n[1] * LIGHT[1] + it.n[2] * LIGHT[2]);
          ctx.fillStyle = Projection.mix(shade(it.tone, 0.52 + 0.6 * Math.max(0, d)),
            o.fogCol || '#3b4a2c', S.fog(it.dz) * 0.7);
          var p = it.pts;
          ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
          for (var j2 = 1; j2 < p.length; j2++) ctx.lineTo(p[j2][0], p[j2][1]);
          ctx.closePath(); ctx.fill();
        }

        /* contact shadows */
        shadow(MOX, MOZ, 1.5, 0.5);
        shadow(-5.4, 13.6, 1.9, 0.42);

        /* headlight pools + warm haze on the near ground */
        [[-0.62, -0.2], [-0.62, 0.2]].forEach(function (hl) {
          var c = lw(hl[0], hl[1]);
          var g = S.project(c[0], 0.05, c[1] - 1.1);
          if (!g) return;
          var rr = S.focal / g[2] * 0.75;
          var gr = ctx.createRadialGradient(g[0], g[1], 0, g[0], g[1], rr);
          gr.addColorStop(0, 'rgba(240,226,180,.20)');
          gr.addColorStop(1, 'rgba(240,226,180,0)');
          ctx.save(); ctx.translate(g[0], g[1]); ctx.scale(1, 0.3);
          ctx.translate(-g[0], -g[1]); ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(g[0], g[1], rr, 0, 6.2832); ctx.fill(); ctx.restore();
        });

        /* drifting clippings off the discharge chute */
        var chute = lw(0.34, 0.5);
        for (var q3 = 0; q3 < 26; q3++) {
          var ph = (t * 0.5 + q3 * 0.137) % 1;
          var sx = chute[0] + ph * 1.5 + Math.sin(ph * 9 + q3) * 0.1;
          var sy = 0.34 + Math.sin(ph * Math.PI) * 0.42;
          var sz2 = chute[1] + ph * 0.55;
          var sp = S.project(sx, sy, sz2);
          if (!sp) continue;
          ctx.fillStyle = 'rgba(150,186,92,' + (0.75 * (1 - ph)).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(sp[0], sp[1], Math.max(0.7, 2.2 * (1 - ph)), 0, 6.2832); ctx.fill();
        }

        /* vignette, top and bottom, to seat the copy */
        var vg = ctx.createLinearGradient(0, 0, W, 0);
        vg.addColorStop(0, 'rgba(5,10,6,.55)');
        vg.addColorStop(0.42, 'rgba(5,10,6,.12)');
        vg.addColorStop(1, 'rgba(5,10,6,.3)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }
    };
  };


  /* ------------------------------------------------------------------ *
   * sceneExcavation — BR CIVIL. A loading bucket on its dipper arm hanging
   * over an open trench, spoil mound in the near left, cut batter with
   * strata receding behind. World-space faces through one projection,
   * far-to-near, so occlusion and haze come out of the maths.
   * ------------------------------------------------------------------ */
  Projection.sceneExcavation = function (S, o) {
    o = o || {};
    var TONE = {
      soil: '#2b2318', soil2: '#332a1e', clay: '#4a3a28', clay2: '#5a4832',
      sand: '#6a5537', gravel: '#4c473d', rock: '#3a3934', lip: '#8d7a5c',
      steel: '#3a4046', steel2: '#596169', steelHi: '#9aa4ad', dark: '#22272c',
      wear: '#adb6be', bush: '#1b241e', rut: '#1d1810'
    };
    for (var kk in (o.tone || {})) TONE[kk] = o.tone[kk];

    var LIGHT = (function () {
      var l = [0.66, 0.52, -0.54], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#131a22';
    var faces = [];
    var seed = 40231;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#eef3f8', (lit - 1) * 0.5)
        : Projection.mix(tone, '#070a0f', (1 - lit) * 0.85);
    }
    function q(pts, tone, n, t0) { faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0 }); }

    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      q([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.95), [0, 0, 1], t0);
      q([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.6), [0, 0, -1], t0);
      q([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.8), [1, 0, 0], t0);
      q([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.06), [-1, 0, 0], t0);
      q([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.2), [0, 1, 0], t0);
    }

    function drum(ax, ay, az, bx, by, bz, r, seg, tone, t0) {
      var dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
      dx /= L; dy /= L; dz /= L;
      var ux = -dz, uy = 0, uz = dx, m = Math.hypot(ux, uy, uz) || 1;
      ux /= m; uz /= m;
      var vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * 6.2832, a1 = ((s + 1) / seg) * 6.2832;
        var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        var n0 = [ux * c0 + vx * s0, uy * c0 + vy * s0, uz * c0 + vz * s0];
        q([
          [ax + n0[0] * r, ay + n0[1] * r, az + n0[2] * r],
          [ax + (ux * c1 + vx * s1) * r, ay + (uy * c1 + vy * s1) * r, az + (uz * c1 + vz * s1) * r],
          [bx + (ux * c1 + vx * s1) * r, by + (uy * c1 + vy * s1) * r, bz + (uz * c1 + vz * s1) * r],
          [bx + n0[0] * r, by + n0[1] * r, bz + n0[2] * r]
        ], shade(tone, 0.62 + 0.55 * Math.max(0, n0[1])), n0, t0);
      }
    }

    /* --- the cut: near lip, trench, batter, ground --- */
    var XR = 26, TZ0 = 4.6, TZ1 = 5.9, TZ2 = 8.8, TZ3 = 13.4, TD = -1.9;
    var band, z, i, x;

    for (z = 0.95; z < TZ0; z += 0.34) {
      var bn = Math.round((z - 0.95) / 0.34);
      q([[-XR, 0, z], [XR, 0, z], [XR, 0, z + 0.34], [-XR, 0, z + 0.34]],
        bn % 2 ? TONE.soil : TONE.soil2, [0, 1, 0], 0);
    }
    /* ruts running to the lip */
    var RUTS = [-1.35, -0.55, 0.35, 1.15, 1.9];
    for (i = 0; i < RUTS.length; i++) {
      q([[RUTS[i] - 0.11, 0.004, 1.0], [RUTS[i] + 0.11, 0.004, 1.0],
         [RUTS[i] + 0.19, 0.004, TZ0], [RUTS[i] - 0.19, 0.004, TZ0]], TONE.rut, [0, 1, 0], 0);
    }
    /* loose spoil on the lip, so the edge is not a clean line */
    for (i = 0; i < 26; i++) {
      var sx = -XR + rnd() * XR * 2, sz = TZ0 - rnd() * 0.5, sr = 0.09 + rnd() * 0.2;
      q([[sx - sr, 0.01, sz], [sx + sr, 0.01, sz], [sx + sr, 0.01, sz - sr], [sx - sr, 0.01, sz - sr]],
        rnd() > 0.5 ? TONE.clay : TONE.gravel, [0, 1, 0], 0);
    }

    /* near batter: lip down to the floor */
    for (band = 0; band < 7; band++) {
      var y0 = -(band * 0.29), y1 = y0 - 0.29;
      var zA = TZ0 + (band * 0.29) * 0.68, zB = TZ0 + (band + 1) * 0.29 * 0.68;
      var toneN = band < 1 ? TONE.soil : (band < 3 ? TONE.clay : (band % 2 ? TONE.clay2 : TONE.sand));
      q([[-XR, y0, zA], [XR, y0, zA], [XR, y1, zB], [-XR, y1, zB]], toneN, [0, 0.55, -0.84], 0);
    }
    /* floor */
    q([[-XR, TD, TZ1], [XR, TD, TZ1], [XR, TD, TZ2], [-XR, TD, TZ2]], TONE.soil2, [0, 1, 0], 0);
    q([[-3.2, TD + 0.004, 6.1], [3.4, TD + 0.004, 6.2], [3.4, TD + 0.004, 6.7], [-3.2, TD + 0.004, 6.6]], TONE.rut, [0, 1, 0], 0);

    /* far batter: floor up to the top, strata receding */
    var STRATA = [TONE.soil, TONE.clay, TONE.clay2, TONE.sand, TONE.gravel, TONE.clay, TONE.rock, TONE.clay2];
    for (band = 0; band < 15; band++) {
      var f0 = TD + band * 0.3, f1 = f0 + 0.3;
      var fA = TZ2 + (f0 - TD) * 1.02, fB = TZ2 + (f1 - TD) * 1.02;
      var toneF = STRATA[band % STRATA.length];
      for (x = -XR; x < XR; x += 4.3) {
        var jitter = 0.78 + rnd() * 0.44;
        q([[x, f0, fA], [Math.min(XR, x + 4.3), f0, fA], [Math.min(XR, x + 4.3), f1, fB], [x, f1, fB]],
          shade(toneF, jitter), [0, 0.42, -0.9], 0.05 + band * 0.02);
      }
    }
    /* erosion grooves down the batter */
    for (i = 0; i < 22; i++) {
      var gx = -XR + rnd() * XR * 2, gw = 0.1 + rnd() * 0.22;
      var gy0 = TD + 4.5 * (0.15 + rnd() * 0.75), gy1 = gy0 - 0.5 - rnd() * 0.8;
      q([[gx - gw, gy0, TZ2 + (gy0 - TD) * 1.02], [gx + gw, gy0, TZ2 + (gy0 - TD) * 1.02],
         [gx + gw, gy1, TZ2 + (gy1 - TD) * 1.02], [gx - gw, gy1, TZ2 + (gy1 - TD) * 1.02]],
        TONE.rut, [0, 0.42, -0.9], 0.5);
    }
    /* top of the cut */
    for (z = TZ3; z < 36; z += 1.6) {
      q([[-XR, 2.6, z], [XR, 2.6, z], [XR, 2.6, z + 1.6], [-XR, 2.6, z + 1.6]],
        Math.round((z - TZ3) / 1.6) % 2 ? TONE.soil : TONE.soil2, [0, 1, 0], 0.1);
    }
    /* scrub on the skyline */
    for (i = 0; i < 9; i++) {
      var bx2 = -22 + i * 5.4 + rnd() * 2, bz2 = 17 + rnd() * 9, bh = 0.7 + rnd() * 0.9;
      q([[bx2 - 0.9, 2.6, bz2], [bx2 + 0.85, 2.6, bz2], [bx2 + 0.35, 2.6 + bh, bz2], [bx2 - 0.45, 2.6 + bh * 0.75, bz2]],
        TONE.bush, [0, 0.6, -0.8], 0.6);
    }

    /* --- setting-out pegs and string on the near lip --- */
    var PEGS = [-7.4, -5.6, -3.9, -2.2, -0.6];
    for (i = 0; i < PEGS.length; i++) {
      q([[PEGS[i] - 0.04, 2.6, 13.2], [PEGS[i] + 0.04, 2.6, 13.2],
         [PEGS[i] + 0.04, 3.3, 13.2], [PEGS[i] - 0.04, 3.3, 13.2]],
        '#b9b199', [0, 0, -1], 1.1);
    }

    /* --- spoil mound, near left --- */
    var MX2 = -1.05, MZ2 = 3.55;
    var RING = [];
    for (i = 0; i < 13; i++) {
      var an = (i / 13) * 6.2832, rr = 1.35 + rnd() * 0.45;
      RING.push([MX2 + Math.cos(an) * rr * 1.15, 0.02, MZ2 + Math.sin(an) * rr * 0.62, an]);
    }
    for (i = 0; i < RING.length; i++) {
      var r1 = RING[i], r2 = RING[(i + 1) % RING.length];
      var apexY = 0.86 + rnd() * 0.34;
      var midA = (r1[3] + r2[3]) / 2;
      q([[MX2 + Math.cos(midA) * 0.14, apexY, MZ2 + Math.sin(midA) * 0.06],
         [r1[0], r1[1], r1[2]], [r2[0], r2[1], r2[2]]],
        shade(i % 2 ? TONE.clay : TONE.clay2, 0.62 + 0.5 * Math.max(0, Math.cos(midA - 0.6))),
        [Math.cos(midA), 0.55, Math.sin(midA)], 1.0 + i * 0.03);
    }
    /* clods on the heap */
    for (i = 0; i < 16; i++) {
      var ca = rnd() * 6.2832, cr = rnd() * 1.5, cy2 = 0.05 + rnd() * 0.55;
      var cxx = MX2 + Math.cos(ca) * cr, czz = MZ2 + Math.sin(ca) * cr * 0.55;
      var cs = 0.1 + rnd() * 0.16;
      q([[cxx - cs, cy2, czz], [cxx + cs, cy2, czz], [cxx + cs, cy2 + cs, czz], [cxx - cs, cy2 + cs, czz]],
        shade(TONE.clay2, 0.8 + rnd() * 0.5), [0.3, 0.8, 0.4], 1.5);
    }

    /* --- dipper arm, off-frame top right into the bucket --- */
    var A0 = [9.4, 4.75, 10.4], A1 = [2.55, 2.2, 5.72];
    (function () {
      var dx = A1[0] - A0[0], dy = A1[1] - A0[1], dz = A1[2] - A0[2];
      var L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
      var sx = -dz, sz = dx, sm = Math.hypot(sx, sz) || 1; sx /= sm; sz /= sm;
      var ux = -dy * sz, uy = dz * sx - dx * sz, uz = dy * sx;
      function at(k, sw, hw) {
        var px = A0[0] + dx * L * k, py = A0[1] + dy * L * k, pz = A0[2] + dz * L * k;
        return [
          [px - sx * sw - ux * hw, py - uy * hw, pz - sz * sw - uz * hw],
          [px + sx * sw - ux * hw, py - uy * hw, pz + sz * sw - uz * hw],
          [px + sx * sw + ux * hw, py + uy * hw, pz + sz * sw + uz * hw],
          [px - sx * sw + ux * hw, py + uy * hw, pz - sz * sw + uz * hw]
        ];
      }
      var segs = 6;
      for (var s = 0; s < segs; s++) {
        var k0 = s / segs, k1 = (s + 1) / segs;
        var w0 = 0.3 - k0 * 0.11, h0 = 0.36 - k0 * 0.18;
        var w1 = 0.3 - k1 * 0.11, h1 = 0.36 - k1 * 0.18;
        var p0 = at(k0, w0, h0), p1 = at(k1, w1, h1);
        q([p0[3], p1[3], p1[2], p0[2]], shade(TONE.steel2, 1.12), [-ux, uy, -uz], 0.1 + s * 0.07);
        q([p0[1], p1[1], p1[0], p0[0]], shade(TONE.steel, 0.62), [ux, -uy, uz], 0.1 + s * 0.07);
        q([p0[0], p1[0], p1[3], p0[3]], shade(TONE.steel, 0.9), [-sx, 0, -sz], 0.1 + s * 0.07);
        q([p0[2], p1[2], p1[1], p0[1]], shade(TONE.steel2, 0.8), [sx, 0, sz], 0.1 + s * 0.07);
      }
      /* wear strip along the top flange */
      for (var s2 = 0; s2 < segs; s2++) {
        var ka = s2 / segs, kb = (s2 + 1) / segs;
        var pa = at(ka, 0.09, 1.02), pb = at(kb, 0.09, 1.02);
        q([pa[3], pb[3], pb[2], pa[2]], TONE.steelHi, [-ux, uy, -uz], 0.6);
      }
    })();

    /* ram and rod down the back of the arm */
    drum(5.05, 3.42, 7.85, 3.12, 2.62, 6.28, 0.15, 9, TONE.dark, 0.55);
    drum(3.12, 2.62, 6.28, 2.52, 2.24, 5.72, 0.075, 7, TONE.wear, 0.7);

    /* --- the bucket --- */
    var BO = [1.62, 1.14, 4.9];
    var U = [0.34, 0.94, 0], V = [-0.94, -0.34, 0], C = [0.34, -0.94, 0];
    function B(u, a, c) {
      return [BO[0] + U[0] * u + V[0] * a + C[0] * c,
              BO[1] + U[1] * u + V[1] * a + C[1] * c,
              BO[2]];
    }
    var PROF = [[0, 0], [0, 0.5], [0.06, 0.66], [0.34, 0.74], [0.68, 0.66], [0.95, 0.46],
                [1.12, 0.2], [1.12, 0.04], [0.86, -0.06], [0.42, -0.1], [0.06, -0.06]];
    var HW = 0.62;

    /* shell across the width */
    for (i = 0; i < PROF.length - 1; i++) {
      var p0 = PROF[i], p1 = PROF[i + 1];
      q([B(-HW, p0[0], p0[1]), B(HW, p0[0], p0[1]), B(HW, p1[0], p1[1]), B(-HW, p1[0], p1[1])],
        shade(i > 6 ? TONE.steel2 : TONE.steel, i > 6 ? 0.95 : 0.72), C, 0.95 + i * 0.02);
      /* inner face, offset, reads as plate thickness */
      q([B(HW, p0[0], p0[1] - 0.07), B(-HW, p0[0], p0[1] - 0.07),
         B(-HW, p1[0], p1[1] - 0.07), B(HW, p1[0], p1[1] - 0.07)],
        shade(TONE.dark, 0.72), [-C[0], -C[1], 0], 0.95 + i * 0.02);
    }
    /* side plates */
    [-HW, HW].forEach(function (uu, si) {
      var outer = [], inner = [];
      for (var j = 0; j < PROF.length; j++) {
        outer.push(B(uu, PROF[j][0], PROF[j][1]));
        inner.push(B(uu, PROF[j][0] * 0.94 + 0.04, PROF[j][1] * 0.86 + 0.02));
      }
      q(outer, shade(TONE.steel2, si ? 1.1 : 0.6), [si ? 1 : -1, 0, 0], 0.9);
      q(inner, shade(TONE.dark, 0.85), [si ? -1 : 1, 0, 0], 0.96);
    });
    /* cutting lip and teeth */
    q([B(-HW, 1.12, 0.04), B(HW, 1.12, 0.04), B(HW, 1.12, 0.2), B(-HW, 1.12, 0.2)], TONE.wear, C, 1.1);
    for (i = 0; i < 5; i++) {
      var tu = -HW + 0.1 + i * 0.26;
      q([B(tu - 0.07, 1.12, 0.06), B(tu + 0.07, 1.12, 0.06), B(tu + 0.03, 1.34, 0.14), B(tu - 0.03, 1.34, 0.14)],
        TONE.wear, C, 1.15 + i * 0.02);
    }
    /* ears, pins and the cylinder that tips the bucket */
    [-0.4, 0.4].forEach(function (eu) {
      q([B(eu - 0.09, -0.12, 0.04), B(eu + 0.09, -0.12, 0.04), B(eu + 0.09, 0.1, 0.04), B(eu - 0.09, 0.1, 0.04)],
        shade(TONE.steel2, 1.1), [0, 0, -1], 1.2);
      drum(B(eu, -0.02, 0)[0], B(eu, -0.02, 0)[1], B(eu, -0.02, 0)[2] - 0.01,
           B(eu, -0.02, 0)[0], B(eu, -0.02, 0)[1], B(eu, -0.02, 0)[2] + 0.09, 0.055, 7, TONE.wear, 1.3);
    });
    drum(B(0.3, 0.02, -0.06)[0], B(0.3, 0.02, -0.06)[1], B(0.3, 0.02, -0.06)[2],
         3.05, 2.55, 6.15, 0.085, 8, TONE.steel2, 1.25);

    /* hoses from the arm down to the bucket */
    var HOSE = [B(0.1, -0.16, 0.02), [2.35, 2.6, 5.9], [2.9, 3.1, 6.5], [3.5, 3.5, 7.2]];
    var PIPE = [[3.62, 3.28, 7.02], [2.92, 2.88, 6.32], [2.3, 2.5, 5.86]];
    var HOSE_T = 1.35;

    /* dust hanging over the trench */
    var motes = [];
    for (i = 0; i < 26; i++) motes.push({ x: -3 + rnd() * 7, y: -0.9 + rnd() * 1.6, z: 5.6 + rnd() * 4.4, s: 0.5 + rnd() * 1.4, p: rnd() * 6.283 });

    return {
      duration: 2.2,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        S.yaw = Projection.reduced() ? 0 : Math.sin(time * 0.075) * 0.034;

        var sky = S.ctx.createLinearGradient(0, 0, 0, S.horizon + S.H * 0.1);
        sky.addColorStop(0, '#06090e');
        sky.addColorStop(0.5, '#0c1118');
        sky.addColorStop(0.82, '#1b2028');
        sky.addColorStop(1, '#2a2b2c');
        S.ctx.fillStyle = sky; S.ctx.fillRect(0, 0, S.W, S.H);

        /* low sun haze behind the cut */
        var gl = S.ctx.createLinearGradient(0, S.horizon - S.H * 0.34, 0, S.horizon + S.H * 0.14);
        gl.addColorStop(0, 'rgba(214,198,166,0)');
        gl.addColorStop(0.62, 'rgba(214,198,166,0.13)');
        gl.addColorStop(1, 'rgba(214,198,166,0.02)');
        S.ctx.fillStyle = gl; S.ctx.fillRect(0, S.horizon - S.H * 0.34, S.W, S.H * 0.48);

        var list = [], p, pts, sum, mapped, miss, f;
        for (i = 0; i < faces.length; i++) {
          f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (var qi = 0; qi < f.pts.length; qi++) {
            p = S.project(f.pts[qi][0], f.pts[qi][1], f.pts[qi][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          var dz = sum / mapped.length;
          list.push({
            pts: mapped, dz: dz,
            fill: Projection.mix(shade(f.tone, 0.55 + 0.62 * Math.max(0, d)), FOG, S.fog(dz) * 0.7),
            a: Math.min(1, (t - f.t0) / 0.42)
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          if (it.a <= 0.02) continue;
          S.ctx.globalAlpha = it.a;
          S.ctx.beginPath(); S.ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) S.ctx.lineTo(pts[j][0], pts[j][1]);
          S.ctx.closePath(); S.ctx.fillStyle = it.fill; S.ctx.fill();
        }
        S.ctx.globalAlpha = 1;

        /* bucket shade thrown on the far wall */
        var shd = [[-0.2, 1.15, 9.1], [2.9, 1.05, 9.15], [3.1, -0.9, 10.0], [-0.1, -0.75, 9.95]];
        var shp = [];
        var shOk = true;
        for (i = 0; i < shd.length; i++) {
          var sp = S.project(shd[i][0], shd[i][1], shd[i][2]);
          if (!sp) { shOk = false; break; }
          shp.push(sp);
        }
        if (shOk && t > 1.1) {
          S.ctx.globalAlpha = 0.3 * Math.min(1, (t - 1.1) / 0.6);
          S.ctx.beginPath(); S.ctx.moveTo(shp[0][0], shp[0][1]);
          for (i = 1; i < shp.length; i++) S.ctx.lineTo(shp[i][0], shp[i][1]);
          S.ctx.closePath(); S.ctx.fillStyle = '#05070a'; S.ctx.fill();
          S.ctx.globalAlpha = 1;
        }

        /* hoses */
        if (t > HOSE_T) {
          var hk = Math.min(1, (t - HOSE_T) / 0.55), c = S.ctx; c.lineCap = 'round';
          [[7, 'rgba(5,7,9,.55)'], [4.4, '#1c2024'], [1.3, 'rgba(174,186,196,.3)']].forEach(function (pass) {
            c.lineWidth = pass[0]; c.strokeStyle = pass[1]; c.beginPath();
            var run = Math.max(2, Math.round(HOSE.length * hk));
            for (var h = 0; h < run; h++) {
              var hp = S.project(HOSE[h][0], HOSE[h][1], HOSE[h][2]);
              if (!hp) continue;
              if (h === 0) c.moveTo(hp[0], hp[1]); else c.lineTo(hp[0], hp[1]);
            }
            c.stroke();
          });
        }
        if (t > 1.15) {
          var pk = Math.min(1, (t - 1.15) / 0.5), pc = S.ctx; pc.lineCap = 'round';
          [[6, 'rgba(5,7,9,.5)'], [3.4, TONE.dark]].forEach(function (pass) {
            pc.lineWidth = pass[0]; pc.strokeStyle = pass[1]; pc.beginPath();
            var pr = Math.max(2, Math.round(PIPE.length * pk));
            for (var h2 = 0; h2 < pr; h2++) {
              var pp = S.project(PIPE[h2][0], PIPE[h2][1], PIPE[h2][2]);
              if (!pp) continue;
              if (h2 === 0) pc.moveTo(pp[0], pp[1]); else pc.lineTo(pp[0], pp[1]);
            }
            pc.stroke();
          });
        }

        /* dust */
        if (!Projection.reduced()) {
          for (i = 0; i < motes.length; i++) {
            var mo = motes[i];
            var ph = ((time * 0.055 + mo.p) % 1);
            var mp = S.project(mo.x + Math.sin(time * 0.3 + mo.p) * 0.22, mo.y + ph * 0.9, mo.z);
            if (!mp) continue;
            var ma = (1 - ph) * 0.26 * (1 - S.fog(mp[2]));
            if (ma <= 0.01) continue;
            S.ctx.fillStyle = 'rgba(226,216,196,' + ma.toFixed(3) + ')';
            S.ctx.beginPath(); S.ctx.arc(mp[0], mp[1], mo.s, 0, 6.2832); S.ctx.fill();
          }
        }

        /* haze over the trench mouth, then the grade */
        var hz2 = S.ctx.createLinearGradient(0, S.horizon - 30, 0, S.horizon + S.H * 0.3);
        hz2.addColorStop(0, 'rgba(24,30,38,0)');
        hz2.addColorStop(0.55, 'rgba(24,30,38,0.34)');
        hz2.addColorStop(1, 'rgba(20,26,33,0)');
        S.ctx.fillStyle = hz2; S.ctx.fillRect(0, S.horizon - 30, S.W, S.H * 0.34);

        var vg = S.ctx.createRadialGradient(S.W * 0.58, S.H * 0.46, Math.min(S.W, S.H) * 0.3,
          S.W * 0.58, S.H * 0.46, Math.max(S.W, S.H) * 0.82);
        vg.addColorStop(0, 'rgba(4,6,9,0)');
        vg.addColorStop(1, 'rgba(4,6,9,0.55)');
        S.ctx.fillStyle = vg; S.ctx.fillRect(0, 0, S.W, S.H);

        var bot = S.ctx.createLinearGradient(0, S.H - 130, 0, S.H);
        bot.addColorStop(0, 'rgba(6,8,11,0)'); bot.addColorStop(1, 'rgba(6,8,11,0.8)');
        S.ctx.fillStyle = bot; S.ctx.fillRect(0, S.H - 130, S.W, 130);

        var tp2 = S.ctx.createLinearGradient(0, 0, 0, 120);
        tp2.addColorStop(0, 'rgba(6,8,11,0.78)'); tp2.addColorStop(1, 'rgba(6,8,11,0)');
        S.ctx.fillStyle = tp2; S.ctx.fillRect(0, 0, S.W, 120);
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneSlabPour — MidCoast Pre-Mix Concrete Forster. A domestic slab
   * on pour day: fresh screeded concrete running away from the camera, a
   * screed rail set true across the bay on its clamps, reo mesh sheets on
   * chairs ahead of the pour, a bull float and hand float on the finished
   * pass, timber form boards staked down both edges. Same contract as the
   * other scenes: world faces, one projection, far-to-near sort.
   * ------------------------------------------------------------------ */
  Projection.sceneSlabPour = function (S, o) {
    o = o || {};
    var TONE = {
      wet: '#6D6A63', wet2: '#5C594F', wet3: '#787468', wetHi: '#8E8A7C',
      cream: '#9C9789', coal: '#3B3833',
      form: '#8B6134', form2: '#6E4A26', formTop: '#A5773F',
      stake: '#7C5730', stakeTop: '#9A7040',
      steel: '#9BA1A3', steelDk: '#65696B', rust: '#8A5E3B',
      chair: '#1A1B1C', rail: '#C0C6C8', railDk: '#7E8487', clamp: '#3F4346',
      blade: '#C6CBCE', bladeDk: '#8A9094', handle: '#4A4E52', grip: '#22262A',
      mag: '#E41992', water: '#5B6B72'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.46, 0.78, -0.42], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#12111A';
    var faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.5)
        : Projection.mix(tone, '#0B0A11', (1 - lit) * 0.72);
    }

    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }

    /* horizontal bar along X at height y, sitting in the plane z */
    function barX(x1, x2, z, y, w, h, tone, t0) {
      var hw = w / 2;
      face([[x1, y, z - hw], [x2, y, z - hw], [x2, y, z + hw], [x1, y, z + hw]], shade(tone, 1.16), [0, 1, 0], t0);
      face([[x1, y - h, z - hw], [x2, y - h, z - hw], [x2, y, z - hw], [x1, y, z - hw]], shade(tone, 0.62), [0, 0, -1], t0);
      face([[x1, y - h, z + hw], [x2, y - h, z + hw], [x2, y, z + hw], [x1, y, z + hw]], shade(tone, 0.84), [0, 0, 1], t0);
    }

    /* bar along Z at height y, in the vertical plane x */
    function barZ(x, z1, z2, y, w, h, tone, t0) {
      var hw = w / 2;
      face([[x, y, z1], [x, y, z2], [x, y, z2 + hw], [x, y, z1 + hw]], shade(tone, 1.05), [0, 1, 0], t0);
      face([[x - hw, y - h, z1], [x - hw, y - h, z2], [x - hw, y, z2], [x - hw, y, z1]], shade(tone, 0.6), [-1, 0, 0], t0);
      face([[x + hw, y - h, z1], [x + hw, y - h, z2], [x + hw, y, z2], [x + hw, y, z1]], shade(tone, 0.9), [1, 0, 0], t0);
    }

    /* upright member: square section from a to b in world space */
    function rod(a, b, w, tone, t0) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var lz = Math.hypot(dx, dy, dz) || 1;
      var px = -dy / lz * w / 2, py = dx / lz * w / 2;
      var nx = dz / lz * w / 2, nz = -dx / lz * w / 2;
      var A = [[a[0] + px, a[1] + py, a[2] + nx], [a[0] - px, a[1] - py, a[2] - nx]];
      var B = [[b[0] + px, b[1] + py, b[2] + nx], [b[0] - px, b[1] - py, b[2] - nx]];
      face([A[0], B[0], B[1], A[1]], shade(tone, 1.05), [nz, 0, -nx], t0);
      face([[A[0][0], A[0][1], A[0][2]], [B[0][0], B[0][1], B[0][2]], [b[0], b[1], b[2]], [a[0], a[1], a[2]]], shade(tone, 1.2), [nx, 0, nz], t0);
      face([A[1], B[1], [b[0], b[1], b[2]], [a[0], a[1], a[2]]], shade(tone, 0.62), [-nx, 0, -nz], t0);
    }

    var BAY = 4.5, Z0 = 1.0, Z1 = 30.0, i, z, x, s;

    /* ---- the wet slab: strips of fresh, screeded concrete ---- */
    for (z = Z1; z > Z0; z -= 0.92) {
      var band = Math.round((Z1 - z) * 2.3) % 4;
      var tone = band === 0 ? TONE.wet : band === 1 ? TONE.wet2 : band === 2 ? TONE.wet3 : TONE.wet;
      face([[-BAY, 0, z], [BAY, 0, z], [BAY, 0, z - 0.92], [-BAY, 0, z - 0.92]], tone, [0, 1, 0], 0.05);
    }
    /* the finished, floated pass nearest the camera: lighter, tighter */
    for (z = 4.6; z > Z0; z -= 0.42) {
      face([[-BAY, 0.001, z], [BAY, 0.001, z], [BAY, 0.001, z - 0.42], [-BAY, 0.001, z - 0.42]],
        (Math.round(z * 3) % 2) ? TONE.wetHi : TONE.cream, [0, 1, 0], 0.1);
    }

    /* ---- timber form boards both edges, staked, with the bay cut line ---- */
    [-BAY, BAY].forEach(function (fx) {
      var inner = fx < 0 ? 1 : -1;
      face([[fx, 0, Z0], [fx, 0, Z1], [fx, 0.17, Z1], [fx, 0.17, Z0]],
        shade(TONE.form, 0.86), [inner, 0, 0], 0.15);
      face([[fx, 0.17, Z0], [fx, 0.17, Z1], [fx + inner * 0.045, 0.17, Z1], [fx + inner * 0.045, 0.17, Z0]],
        shade(TONE.formTop, 1.1), [0, 1, 0], 0.15);
      face([[fx + inner * 0.045, 0, Z0], [fx + inner * 0.045, 0, Z1], [fx + inner * 0.045, 0.17, Z1], [fx + inner * 0.045, 0.17, Z0]],
        shade(TONE.form2, 0.66), [-inner, 0, 0], 0.15);
      for (z = Z1 - 1.4; z > Z0; z -= 2.6) {
        rod([fx - inner * 0.02, 0.19, z], [fx - inner * 0.14, -0.02, z + 0.12], 0.05, TONE.stake, 0.3 + (Z1 - z) * 0.012);
        face([[fx - inner * 0.03, 0.19, z - 0.03], [fx - inner * 0.03, 0.19, z + 0.03],
              [fx - inner * 0.05, 0.22, z + 0.03], [fx - inner * 0.05, 0.22, z - 0.03]], shade(TONE.stakeTop, 1.1), [0, 1, 0], 0.32);
      }
    });

    /* ---- reo mesh sheets on chairs, ahead of the pour ---- */
    var MZ0 = 9.4, MZ1 = 27.0;
    for (z = MZ0; z < MZ1; z += 2.30) {
      var t0s = 0.5 + (z - MZ0) * 0.028;
      for (x = -BAY + 0.35; x < BAY - 0.2; x += 0.20) {
        barZ(x, z, Math.min(z + 2.24, MZ1), 0.075, 0.032, 0.028, (Math.round(x * 5) % 3) ? TONE.steel : TONE.steelDk, t0s);
      }
      for (var zz = z; zz < Math.min(z + 2.24, MZ1); zz += 0.20) {
        barX(-BAY + 0.35, BAY - 0.2, zz, 0.104, 0.030, 0.026, (Math.round(zz * 5) % 3) ? TONE.steelDk : TONE.rust, t0s + 0.06);
      }
      /* lap wire and chairs under the sheet corners */
      [[-BAY + 0.55, z + 0.35], [BAY - 0.6, z + 0.35], [-BAY + 0.55, z + 1.9], [BAY - 0.6, z + 1.9],
       [0.1, z + 0.4], [0.1, z + 1.85]].forEach(function (c) {
        face([[c[0] - 0.05, 0.001, c[1] - 0.05], [c[0] + 0.05, 0.001, c[1] - 0.05],
              [c[0] + 0.05, 0.075, c[1] - 0.05], [c[0] - 0.05, 0.075, c[1] - 0.05]], TONE.chair, [0, 0, -1], t0s - 0.1);
        face([[c[0] - 0.05, 0.001, c[1] - 0.05], [c[0] + 0.05, 0.001, c[1] - 0.05],
              [c[0] + 0.05, 0.001, c[1] + 0.05], [c[0] - 0.05, 0.001, c[1] + 0.05]], TONE.chair, [0, 1, 0], t0s - 0.1);
      });
    }

    /* ---- the screed rail: aluminium edge set true across the bay on clamps ---- */
    var RZ = 7.15, t0r = 0.9;
    face([[-BAY + 0.1, 0.128, RZ - 0.045], [BAY - 0.1, 0.128, RZ - 0.045],
          [BAY - 0.1, 0.128, RZ + 0.045], [-BAY + 0.1, 0.128, RZ + 0.045]], shade(TONE.rail, 1.22), [0, 1, 0], t0r);
    face([[-BAY + 0.1, 0.02, RZ - 0.045], [BAY - 0.1, 0.02, RZ - 0.045],
          [BAY - 0.1, 0.128, RZ - 0.045], [-BAY + 0.1, 0.128, RZ - 0.045]], shade(TONE.railDk, 0.94), [0, 0, -1], t0r);
    face([[-BAY + 0.1, 0.02, RZ + 0.045], [BAY - 0.1, 0.02, RZ + 0.045],
          [BAY - 0.1, 0.128, RZ + 0.045], [-BAY + 0.1, 0.128, RZ + 0.045]], shade(TONE.rail, 0.66), [0, 0, 1], t0r);
    [-BAY + 0.1, BAY - 0.1, -1.5, 1.7].forEach(function (cx) {
      face([[cx - 0.09, 0, RZ - 0.07], [cx + 0.09, 0, RZ - 0.07], [cx + 0.09, 0.15, RZ - 0.07], [cx - 0.09, 0.15, RZ - 0.07]],
        shade(TONE.clamp, 1.0), [0, 0, -1], t0r + 0.1);
      face([[cx - 0.09, 0, RZ + 0.07], [cx + 0.09, 0, RZ + 0.07], [cx + 0.09, 0.15, RZ + 0.07], [cx - 0.09, 0.15, RZ + 0.07]],
        shade(TONE.clamp, 0.7), [0, 0, 1], t0r + 0.1);
      rod([cx, 0.15, RZ], [cx, 0.30, RZ], 0.045, TONE.clamp, t0r + 0.14);
    });

    /* ---- screed board pulled back over the pass, wet grout behind it ---- */
    var SZ = 5.35;
    face([[-1.55, 0.038, SZ - 0.11], [1.55, 0.038, SZ - 0.11], [1.55, 0.038, SZ + 0.11], [-1.55, 0.038, SZ + 0.11]],
      shade(TONE.rail, 1.12), [0, 1, 0], 1.15);
    face([[-1.55, 0.001, SZ + 0.11], [1.55, 0.001, SZ + 0.11], [1.55, 0.038, SZ + 0.11], [-1.55, 0.038, SZ + 0.11]],
      shade(TONE.railDk, 0.72), [0, 0, 1], 1.15);
    rod([-1.42, 0.06, SZ], [-1.15, 0.30, SZ - 0.55], 0.04, TONE.grip, 1.2);
    rod([1.42, 0.06, SZ], [1.15, 0.30, SZ - 0.55], 0.04, TONE.grip, 1.2);

    /* ---- bull float on the finished pass: blade flat, long handle raked back ---- */
    var FX = 2.55, FZ2 = 3.15;
    face([[FX - 0.46, 0.036, FZ2 - 0.12], [FX + 0.46, 0.036, FZ2 - 0.12],
          [FX + 0.46, 0.036, FZ2 + 0.12], [FX - 0.46, 0.036, FZ2 + 0.12]], shade(TONE.blade, 1.24), [0, 1, 0], 1.3);
    face([[FX - 0.46, 0.006, FZ2 - 0.12], [FX + 0.46, 0.006, FZ2 - 0.12],
          [FX + 0.46, 0.006, FZ2 - 0.12], [FX - 0.46, 0.006, FZ2 - 0.12]], shade(TONE.bladeDk, 0.8), [0, 0, -1], 1.3);
    face([[FX - 0.46, 0.006, FZ2 + 0.12], [FX + 0.46, 0.006, FZ2 + 0.12],
          [FX + 0.46, 0.036, FZ2 + 0.12], [FX - 0.46, 0.036, FZ2 + 0.12]], shade(TONE.bladeDk, 0.66), [0, 0, 1], 1.3);
    face([[FX - 0.46, 0.006, FZ2 - 0.12], [FX - 0.46, 0.006, FZ2 + 0.12],
          [FX - 0.46, 0.036, FZ2 + 0.12], [FX - 0.46, 0.036, FZ2 - 0.12]], shade(TONE.blade, 0.9), [-1, 0, 0], 1.3);
    rod([FX, 0.036, FZ2], [FX + 0.02, 0.14, FZ2], 0.05, TONE.bladeDk, 1.36);
    rod([FX + 0.02, 0.14, FZ2], [FX + 0.62, 1.46, FZ2 + 1.12], 0.035, TONE.handle, 1.4);
    rod([FX + 0.62, 1.46, FZ2 + 1.12], [FX + 0.78, 1.72, FZ2 + 1.31], 0.055, TONE.grip, 1.46);
    rod([FX + 0.34, 0.72, FZ2 + 0.6], [FX + 0.40, 0.80, FZ2 + 0.66], 0.03, TONE.mag, 1.44);

    /* ---- a hand float and a trowel left on the pass ---- */
    face([[0.62, 0.028, 3.9], [0.98, 0.028, 3.9], [0.98, 0.028, 4.06], [0.62, 0.028, 4.06]],
      shade(TONE.form, 1.0), [0, 1, 0], 1.5);
    rod([0.80, 0.03, 3.98], [0.94, 0.16, 4.16], 0.03, TONE.handle, 1.54);
    face([[-0.30, 0.02, 2.6], [0.06, 0.02, 2.72], [0.02, 0.02, 2.86], [-0.34, 0.02, 2.74]],
      shade(TONE.blade, 1.1), [0, 1, 0], 1.58);

    /* ---- grout slump against the screed rail, wet enough to read ---- */
    face([[-BAY + 0.1, 0.001, RZ - 0.09], [BAY - 0.1, 0.001, RZ - 0.09],
          [BAY - 0.1, 0.001, RZ - 0.5], [-BAY + 0.1, 0.001, RZ - 0.5]], TONE.wetHi, [0, 1, 0], 1.0);

    return {
      duration: 2.6,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        var ctx = S.ctx;

        var sky = ctx.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#0B0A10');
        sky.addColorStop(0.34, '#151319');
        sky.addColorStop(0.52, '#221E22');
        sky.addColorStop(0.62, '#2C2724');
        sky.addColorStop(1, '#191619');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, S.W, S.H);

        /* magenta site light low over the far end of the bay */
        var glow = ctx.createRadialGradient(S.W * 0.58, S.horizon * 0.86, 0, S.W * 0.58, S.horizon * 0.86, S.W * 0.66);
        glow.addColorStop(0, 'rgba(228,25,146,0.16)');
        glow.addColorStop(0.45, 'rgba(228,25,146,0.05)');
        glow.addColorStop(1, 'rgba(228,25,146,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, S.W, S.H);

        var list = [], i, q, p, pts, sum, mapped, miss;
        for (i = 0; i < faces.length; i++) {
          var f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (q = 0; q < f.pts.length; q++) {
            p = S.project(f.pts[q][0], f.pts[q][1], f.pts[q][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          list.push({
            pts: mapped, dz: sum / mapped.length,
            fill: Projection.mix(shade(f.tone, 0.48 + 0.62 * Math.max(0, d)), FOG, S.fog(sum / mapped.length) * 0.74),
            a: Math.min(1, (t - f.t0) / 0.45) * f.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          ctx.globalAlpha = it.a;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* aggregate and bleed water on the fresh pass */
        var sd = 7.3;
        for (i = 0; i < 120; i++) {
          sd = (sd * 9301 + 49297) % 233280;
          var sx = -3.4 + (sd / 233280) * 6.8;
          sd = (sd * 9301 + 49297) % 233280;
          var sz = 1.2 + (sd / 233280) * 6.0;
          var spt = S.project(sx, 0.004, sz);
          if (!spt) continue;
          ctx.fillStyle = (i % 4 === 0) ? 'rgba(206,200,184,0.24)' : 'rgba(44,42,38,0.20)';
          ctx.beginPath(); ctx.arc(spt[0], spt[1], Math.max(0.5, 26 / spt[2]), 0, 6.2832); ctx.fill();
        }

        /* grout sheen: thin bright lines running with the screed stroke */
        for (i = 0; i < 9; i++) {
          var gx = -2.9 + i * 0.72 + ((i % 3) * 0.11);
          var a1 = 0.05 + 0.05 * Math.sin(time * 0.55 + i * 0.9);
          if (a1 <= 0) continue;
          var g1 = S.project(gx, 0.003, 6.9), g2 = S.project(gx, 0.003, 1.3);
          if (!g1 || !g2) continue;
          ctx.strokeStyle = 'rgba(226,221,205,' + a1.toFixed(3) + ')';
          ctx.lineWidth = Math.max(1, 420 / g2[2]);
          ctx.beginPath(); ctx.moveTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.stroke();
        }

        /* magenta kick off the rail and the float blade */
        var refl = S.project(1.1, 0.004, 3.0);
        if (refl) {
          ctx.save(); ctx.translate(refl[0], refl[1]); ctx.scale(1, 0.26);
          var rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 260);
          rg.addColorStop(0, 'rgba(228,25,146,0.16)');
          rg.addColorStop(1, 'rgba(228,25,146,0)');
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 260, 0, 6.2832); ctx.fill();
          ctx.restore();
        }

        /* contact shadows: form boards and the float */
        [[-BAY, 0], [BAY, 0], [FX, FZ2]].forEach(function (c) {
          var sp = S.project(c[0], 0.002, c[1] + 0.4);
          if (!sp) return;
          var rad = S.focal / sp[2] * 0.7;
          ctx.save(); ctx.translate(sp[0], sp[1]); ctx.scale(1, 0.28);
          var cg = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
          cg.addColorStop(0, 'rgba(10,9,12,0.5)'); cg.addColorStop(1, 'rgba(10,9,12,0)');
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.2832); ctx.fill();
          ctx.restore();
        });

        /* dust drifting over the bay, only while the pour is live */
        if (!Projection.reduced()) {
          for (i = 0; i < 12; i++) {
            var ph = ((time * 0.08 + i * 0.083) % 1);
            var mpx = 1.9 - ph * 2.6 - (i % 3) * 0.3, mpz = 4.4 - (i % 4) * 0.5, mpy = 0.10 + ph * 0.7;
            var mp = S.project(mpx, mpy, mpz);
            if (!mp) continue;
            ctx.fillStyle = 'rgba(214,206,190,' + ((1 - ph) * 0.26).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(mp[0], mp[1], Math.max(0.6, 2.6 * (1 - ph)), 0, 6.2832); ctx.fill();
          }
        }

        /* seat the copy: dark on the left, settled at top and bottom */
        var vg = ctx.createLinearGradient(0, 0, S.W * 0.70, 0);
        vg.addColorStop(0, 'rgba(10,9,13,0.90)');
        vg.addColorStop(0.52, 'rgba(10,9,13,0.44)');
        vg.addColorStop(1, 'rgba(10,9,13,0)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, S.W, S.H);
        var fl2 = ctx.createLinearGradient(0, S.H - 130, 0, S.H);
        fl2.addColorStop(0, 'rgba(10,9,13,0)'); fl2.addColorStop(1, 'rgba(10,9,13,0.92)');
        ctx.fillStyle = fl2; ctx.fillRect(0, S.H - 130, S.W, 130);
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneRoofPlumbing — MH Roof Plumbing. Standing on a Colorbond sheet:
   * corrugations run away to the ridge, a gutter and downpipe at the eave,
   * tin snips, a screw gun and a scatter of roofing screws on the pan.
   * Same contract as the other scenes: world-space faces, one projection,
   * far-to-near sort, depth fog, build-on timing.
   * ------------------------------------------------------------------ */
  Projection.sceneRoofPlumbing = function (S, o) {
    o = o || {};
    var TONE = {
      pan: '#4e5a63', panB: '#57636d', ribLit: '#98a5b0', ribShade: '#2c343b',
      ribTop: '#727f8a', gutter: '#5a6671', gutterIn: '#20262d', lip: '#8e9aa4',
      goldLip: '#d6b52b', fascia: '#2b2622', fasciaHi: '#3a332c', steel: '#8d979f',
      steelDim: '#4a545d', timber: '#8a6a3c', timberHi: '#a8854f', ground: '#2b3227',
      ground2: '#333b2d', path: '#4a4b44', fence: '#39402f', roofFar: '#141a1e',
      tin: '#aab4bc', gold: '#d6b52b', battery: '#c8a728', rubber: '#14171a'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.52, 0.74, -0.42], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#0e1317';
    var faces = [];
    var SLOPE = 0.30, Z0 = 3.70, Z1 = 12.60;

    function Y(z) { return (z - 2.0) * SLOPE; }
    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.45)
        : Projection.mix(tone, '#080b0e', (1 - lit) * 0.82);
    }
    function face(pts, tone, n, t0) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0 });
    }
    /* thin square-section bar between two world points */
    function bar(a, b, w, tone, t0) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz) || 1;
      var ux = dx / L, uy = dy / L, uz = dz / L;
      var px = -uy * w / 2, py = ux * w / 2;
      var qx = -uz * w * 0.35, qz = uy * w * 0.35;
      function P(p, sx, sy, sz) { return [p[0] + sx, p[1] + sy, p[2] + sz]; }
      face([P(a, px, py, 0), P(b, px, py, 0), P(b, -px, -py, 0), P(a, -px, -py, 0)], tone, [-uz, 0, ux], t0);
      face([P(a, qx, 0, qz), P(b, qx, 0, qz), P(b, -qx, 0, -qz), P(a, -qx, 0, -qz)], shade(tone, 1.12), [0, 1, 0], t0);
      face([P(a, px, py, qz), P(b, px, py, qz), P(b, px, py, -qz), P(a, px, py, -qz)], shade(tone, 0.8), [ux, uy, 0], t0);
    }
    function boxAt(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.92), [0, 0, 1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.78), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.04), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.14), [0, 1, 0], t0);
    }
    function discAt(cx, cy, cz, r, seg, tone, t0) {
      var pts = [], s, a;
      for (s = 0; s < seg; s++) { a = (s / seg) * 6.2832; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]); }
      face(pts, tone, [0, 1, 0], t0);
    }

    var i, x, z, zc, z0, z1, k, eaveY = Y(Z0);

    /* ---- the roof: corrugated sheet, pan and rib, receding to the ridge ---- */
    var CH = 4, span = (Z1 - Z0) / CH, cell = 0.19;
    for (x = -5.2; x < 5.2; x += cell) {
      for (i = 0; i < CH; i++) {
        z0 = Z0 + i * span; z1 = z0 + span;
        var t0r = 0.10 + i * 0.16 + (x + 5.2) * 0.035;
        var panTone = (i % 2) ? TONE.pan : TONE.panB;
        /* flat pan between ribs */
        face([[x, Y(z0), z0], [x + 0.13, Y(z0), z0], [x + 0.13, Y(z1), z1], [x, Y(z1), z1]], panTone, [0, 1, 0], t0r);
        /* raised corrugation: lit left flank, shadowed right flank, bright crown */
        face([[x + 0.13, Y(z0), z0], [x + 0.13, Y(z0) + 0.034, z0],
              [x + 0.13, Y(z1) + 0.034, z1], [x + 0.13, Y(z1), z1]], TONE.ribLit, [-1, 0.4, 0], t0r);
        face([[x + 0.19, Y(z0), z0], [x + 0.19, Y(z0) + 0.034, z0],
              [x + 0.19, Y(z1) + 0.034, z1], [x + 0.19, Y(z1), z1]], TONE.ribShade, [1, 0.3, 0], t0r);
        face([[x + 0.13, Y(z0) + 0.034, z0], [x + 0.19, Y(z0) + 0.034, z0],
              [x + 0.19, Y(z1) + 0.034, z1], [x + 0.13, Y(z1) + 0.034, z1]], TONE.ribTop, [0, 1, 0], t0r);
      }
    }

    /* fixing screws along every second pan, and sheet butt seams */
    for (x = -5.1; x < 5.2; x += 0.38) {
      for (z = Z0 + 0.5; z < Z1 - 0.4; z += 0.46) {
        discAt(x + 0.04, Y(z) + 0.008, z, 0.014, 8, TONE.steel, 0.3 + (z - Z0) * 0.06);
      }
    }
    for (x = -4.6; x < 5.2; x += 0.76) {
      face([[x, Y(Z0), Z0], [x, Y(Z0), Z0 + 0.006], [x, Y(Z1), Z1 + 0.006], [x, Y(Z1), Z1]], TONE.ribShade, [1, 0, 0], 0.16);
    }

    /* ridge capping at the top of the run */
    boxAt(0, Y(Z1) - 0.03, Z1 + 0.18, 10.6, 0.11, 0.62, TONE.steelDim, 1.9);
    face([[-5.3, Y(Z1) + 0.085, Z1 - 0.12], [5.3, Y(Z1) + 0.085, Z1 - 0.12],
          [5.3, Y(Z1) + 0.085, Z1 + 0.5], [-5.3, Y(Z1) + 0.085, Z1 + 0.5]], TONE.goldLip, [0, 1, 0], 2.0);

    /* ---- eave: fascia, gutter trough, brackets ---- */
    face([[-5.3, eaveY - 0.38, Z0 + 0.16], [5.3, eaveY - 0.38, Z0 + 0.16],
          [5.3, eaveY - 0.01, Z0 + 0.16], [-5.3, eaveY - 0.01, Z0 + 0.16]], TONE.fascia, [0, 0, 1], 0.06);
    face([[-5.3, eaveY - 0.38, Z0 + 0.155], [5.3, eaveY - 0.38, Z0 + 0.155],
          [5.3, eaveY - 0.30, Z0 + 0.155], [-5.3, eaveY - 0.30, Z0 + 0.155]], TONE.fasciaHi, [0, 0, 1], 0.08);
    face([[-5.3, eaveY - 0.02, Z0 - 0.19], [5.3, eaveY - 0.02, Z0 - 0.19],
          [5.3, eaveY - 0.02, Z0 + 0.14], [-5.3, eaveY - 0.02, Z0 + 0.14]], TONE.gutterIn, [0, 1, 0], 0.12);
    face([[-5.3, eaveY - 0.02, Z0 + 0.14], [5.3, eaveY - 0.02, Z0 + 0.14],
          [5.3, eaveY + 0.10, Z0 + 0.14], [-5.3, eaveY + 0.10, Z0 + 0.14]], TONE.gutter, [0, 0, -1], 0.14);
    face([[-5.3, eaveY - 0.03, Z0 - 0.19], [5.3, eaveY - 0.03, Z0 - 0.19],
          [5.3, eaveY + 0.13, Z0 - 0.19], [-5.3, eaveY + 0.13, Z0 - 0.19]], TONE.gutter, [0, 0, 1], 0.16);
    face([[-5.3, eaveY + 0.12, Z0 - 0.20], [5.3, eaveY + 0.12, Z0 - 0.20],
          [5.3, eaveY + 0.135, Z0 - 0.20], [-5.3, eaveY + 0.135, Z0 - 0.20]], TONE.goldLip, [0, 0.6, 0.6], 0.2);
    for (x = -4.9; x < 5.2; x += 0.62) {
      boxAt(x, eaveY - 0.03, Z0 - 0.185, 0.05, 0.18, 0.05, TONE.steelDim, 0.24 + Math.abs(x) * 0.02);
    }

    /* ---- downpipe off the right end of the gutter, bracketed to the fascia ---- */
    for (i = 0; i < 6; i++) {
      var py = eaveY - 0.05 - i * 0.62;
      face([[0.9, py, Z0 + 0.02], [1.0, py, Z0 + 0.02], [1.0, py + 0.62, Z0 + 0.02], [0.9, py + 0.62, Z0 + 0.02]], TONE.steel, [0, 0, 1], 0.5 + i * 0.07);
      face([[1.0, py, Z0 + 0.08], [1.0, py, Z0 + 0.02], [1.0, py + 0.62, Z0 + 0.02], [1.0, py + 0.62, Z0 + 0.08]], TONE.steelDim, [1, 0, 0], 0.5 + i * 0.07);
      if (i % 2 === 0) boxAt(0.95, py + 0.2, Z0 + 0.12, 0.19, 0.04, 0.05, TONE.steelDim, 0.6 + i * 0.07);
    }
    boxAt(0.95, eaveY - 3.78, Z0 + 0.09, 0.11, 0.1, 0.2, TONE.steelDim, 0.95);
    face([[0.88, eaveY + 0.02, Z0 - 0.19], [1.02, eaveY + 0.02, Z0 - 0.19],
          [1.02, eaveY + 0.03, Z0 - 0.19], [0.88, eaveY + 0.03, Z0 - 0.19]], TONE.gold, [0, 1, 0], 0.3);

    /* ---- the yard below the eave, so the height reads ---- */
    face([[-24, -3.1, 4.6], [24, -3.1, 4.6], [24, -3.1, 34], [-24, -3.1, 34]], TONE.ground, [0, 1, 0], 0);
    for (z = 6; z < 32; z += 2.6) {
      face([[-24, -3.09, z], [24, -3.09, z], [24, -3.09, z + 1.3], [-24, -3.09, z + 1.3]],
        (Math.round(z) % 5 === 0) ? TONE.ground2 : TONE.ground, [0, 1, 0], 0);
    }
    face([[-3.6, -3.08, 6.4], [-2.9, -3.08, 6.4], [-2.9, -3.08, 26], [-3.6, -3.08, 26]], TONE.path, [0, 1, 0], 0.1);
    /* paling fence and two neighbour roofs far out */
    for (x = -20; x < 20; x += 0.34) {
      face([[x, -3.08, 22.5], [x + 0.06, -3.08, 22.5], [x + 0.06, -2.1, 22.5], [x, -2.1, 22.5]], TONE.fence, [0, 0, 1], 0);
    }
    face([[-16, -2.1, 22.4], [16, -2.1, 22.4], [16, -1.98, 22.4], [-16, -1.98, 22.4]], TONE.fence, [0, 0, 1], 0);
    face([[-13, -2.6, 27], [-5, -2.6, 27], [-8.6, -1.1, 27], [-13.6, -1.1, 27]], TONE.roofFar, [0, 0.6, -0.8], 0);
    face([[2.5, -2.7, 30], [11, -2.7, 30], [6.8, -1.2, 30], [1.9, -1.2, 30]], TONE.roofFar, [0, 0.6, -0.8], 0);

    /* ---- ladder hooked over the eave, right of centre ---- */
    var lA = [0.26, -3.06, 6.35], lB = [0.62, eaveY + 0.22, Z0 - 0.12];
    bar([lA[0] - 0.17, lA[1], lA[2]], [lB[0] - 0.17, lB[1], lB[2]], 0.055, TONE.timber, 0.7);
    bar([lA[0] + 0.17, lA[1], lA[2]], [lB[0] + 0.17, lB[1], lB[2]], 0.055, TONE.timber, 0.74);
    for (i = 1; i < 9; i++) {
      var kk = i / 9;
      var rp = [lA[0] + (lB[0] - lA[0]) * kk, lA[1] + (lB[1] - lA[1]) * kk, lA[2] + (lB[2] - lA[2]) * kk];
      bar([rp[0] - 0.17, rp[1], rp[2]], [rp[0] + 0.17, rp[1], rp[2]], 0.042, TONE.timberHi, 0.8 + i * 0.05);
    }

    /* ---- tools on the sheet: tin snips, a screw gun, loose roofing screws ---- */
    var TX = 0.60, TZ = 3.96;
    /* snips: pivot, two blades, two gold handle loops */
    bar([TX, Y(TZ) + 0.02, TZ], [TX - 0.30, Y(TZ) + 0.012, TZ - 0.26], 0.036, TONE.tin, 1.15);
    bar([TX, Y(TZ) + 0.02, TZ], [TX + 0.13, Y(TZ) + 0.012, TZ - 0.33], 0.036, TONE.tin, 1.2);
    discAt(TX, Y(TZ) + 0.026, TZ, 0.022, 10, TONE.steel, 1.24);
    bar([TX, Y(TZ) + 0.02, TZ], [TX - 0.12, Y(TZ) + 0.012, TZ + 0.26], 0.03, TONE.gold, 1.28);
    bar([TX, Y(TZ) + 0.02, TZ], [TX + 0.10, Y(TZ) + 0.012, TZ + 0.28], 0.03, TONE.gold, 1.32);
    discAt(TX - 0.13, Y(TZ) + 0.02, TZ + 0.3, 0.04, 12, TONE.gold, 1.34);
    discAt(TX + 0.11, Y(TZ) + 0.02, TZ + 0.32, 0.04, 12, TONE.gold, 1.36);

    /* screw gun, lying muzzle-up the slope */
    var GX = 1.02, GZ = 4.24, GY = Y(GZ) + 0.02;
    boxAt(GX, GY, GZ, 0.13, 0.1, 0.26, TONE.steelDim, 1.4);
    boxAt(GX, GY + 0.1, GZ + 0.02, 0.05, 0.04, 0.18, TONE.steel, 1.45);
    boxAt(GX, GY + 0.13, GZ - 0.16, 0.09, 0.07, 0.14, TONE.battery, 1.5);
    bar([GX, GY + 0.12, GZ + 0.14], [GX, GY + 0.16, GZ + 0.34], 0.014, TONE.tin, 1.55);
    boxAt(GX, GY - 0.005, GZ - 0.02, 0.1, 0.03, 0.05, TONE.rubber, 1.42);
    /* screws: hex head, washer, shank */
    var screws = [[0.55, 4.42], [0.7, 4.6], [0.95, 4.46], [0.44, 4.66], [1.22, 4.68]];
    for (i = 0; i < screws.length; i++) {
      discAt(screws[i][0], Y(screws[i][1]) + 0.012, screws[i][1], 0.021, 10, TONE.steel, 1.6 + i * 0.04);
      discAt(screws[i][0], Y(screws[i][1]) + 0.017, screws[i][1], 0.009, 8, TONE.tin, 1.62 + i * 0.04);
    }

    /* ---- render ---- */
    function render(t) {
      var ctx = S.ctx, W = S.W, H = S.H, hz = S.horizon;

      S.camX = Projection.reduced() ? 0 : Math.sin(t * 0.10) * 0.10;
      S.camY = 0.51 + (Projection.reduced() ? 0 : Math.sin(t * 0.16) * 0.022);

      var sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, '#060809');
      sky.addColorStop(0.55, '#0e1419');
      sky.addColorStop(1, '#242a2b');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);

      var glow = ctx.createRadialGradient(W * 0.28, hz - H * 0.14, 0, W * 0.28, hz - H * 0.14, H * 0.72);
      glow.addColorStop(0, 'rgba(214,181,43,0.20)');
      glow.addColorStop(0.45, 'rgba(214,181,43,0.07)');
      glow.addColorStop(1, 'rgba(214,181,43,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, hz + H * 0.1);

      var list = [], p, pts, sum, mapped, miss, f, qi, j;
      for (i = 0; i < faces.length; i++) {
        f = faces[i];
        if (t < f.t0) continue;
        mapped = []; sum = 0; miss = false;
        for (qi = 0; qi < f.pts.length; qi++) {
          p = S.project(f.pts[qi][0], f.pts[qi][1], f.pts[qi][2]);
          if (!p) { miss = true; break; }
          mapped.push(p); sum += p[2];
        }
        if (miss) continue;
        var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
        var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
        var dz = sum / mapped.length;
        list.push({ pts: mapped, dz: dz, a: Math.min(1, (t - f.t0) / 0.35),
          fill: Projection.mix(shade(f.tone, 0.84 + 0.62 * Math.max(0, d)), FOG, S.fog(dz) * 0.5) });
      }
      list.sort(function (a, b) { return b.dz - a.dz; });
      for (i = 0; i < list.length; i++) {
        var it = list[i]; pts = it.pts;
        if (it.a <= 0.02) continue;
        ctx.globalAlpha = it.a;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* warm rim along the ridge and the gutter lip */
      if (t > 1.6) {
        var g1 = S.project(0, Y(Z1) + 0.06, Z1 - 0.1), g2 = S.project(0, eaveY + 0.1, Z0 - 0.19);
        if (g1 && g2) {
          var rim = ctx.createLinearGradient(0, g1[1], 0, g2[1]);
          rim.addColorStop(0, 'rgba(214,181,43,0.16)');
          rim.addColorStop(1, 'rgba(214,181,43,0)');
          ctx.fillStyle = rim; ctx.fillRect(0, g1[1], W, Math.max(0, g2[1] - g1[1]));
        }
      }

      /* contact shadows: snips, gun, ladder feet */
      [[TX, TZ, 0.34], [GX, GZ, 0.3], [lA[0], lA[2], 0.4]].forEach(function (c) {
        var sp = S.project(c[0], Y(c[1]) + 0.006, c[1]);
        if (!sp) return;
        var r = S.focal / sp[2] * c[2];
        var sg = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], r);
        sg.addColorStop(0, 'rgba(6,8,10,0.5)'); sg.addColorStop(1, 'rgba(6,8,10,0)');
        ctx.save(); ctx.translate(sp[0], sp[1]); ctx.scale(1, 0.3); ctx.translate(-sp[0], -sp[1]);
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sp[0], sp[1], r, 0, 6.2832); ctx.fill(); ctx.restore();
      });

      /* copy scrim: dark at the left, settled at top and bottom */
      var sg2 = ctx.createLinearGradient(0, 0, W * 0.66, 0);
      sg2.addColorStop(0, 'rgba(8,10,12,0.88)');
      sg2.addColorStop(0.5, 'rgba(8,10,12,0.42)');
      sg2.addColorStop(1, 'rgba(8,10,12,0)');
      ctx.fillStyle = sg2; ctx.fillRect(0, 0, W, H);
      var tb = ctx.createLinearGradient(0, 0, 0, H * 0.3);
      tb.addColorStop(0, 'rgba(8,10,12,0.5)'); tb.addColorStop(1, 'rgba(8,10,12,0)');
      ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H * 0.3);
      var bt = ctx.createLinearGradient(0, H * 0.7, 0, H);
      bt.addColorStop(0, 'rgba(8,10,12,0)'); bt.addColorStop(1, 'rgba(8,10,12,0.34)');
      ctx.fillStyle = bt; ctx.fillRect(0, H * 0.7, W, H * 0.3);
    }

    return { duration: 2.4, render: render };
  };

  /* ------------------------------------------------------------------ *
   * sceneRendering — Millard's Rendering. A brick wall mid-pass: wet
   * float render swept in from the right over a toothed cut, bare brick
   * and a window reveal to the left, scaffold plank above, and the
   * trade's own gear standing in the near field (hawk with a mortar
   * patty, steel trowel, render board on trestles, split cement bag,
   * bucket, sponge float, straight edge) so the depth reads. World
   * faces, one projection, far-to-near sort; one static frame under
   * reduced motion.
   * ------------------------------------------------------------------ */
  Projection.sceneRendering = function (S, o) {
    o = o || {};
    var TONE = {
      path: '#3b3a34', path2: '#43423b', path3: '#33322d',
      sheet: '#c8c0ad', sheet2: '#b4ac99',
      brick: '#8e5b45', brickB: '#7c4f3b', brickC: '#9a6750', joint: '#bdb39f',
      reveal: '#5a382a', revealIn: '#251a14',
      render: '#c3b7a1', render2: '#cec3ad', render3: '#b6a892', wet: '#dbd1bd',
      timber: '#ab7c49', timberDk: '#7b5630', steel: '#b1bac0', steelDk: '#6b747a',
      gold: '#b88a42', sack: '#cbb98f', sackDk: '#a39063', bucket: '#2e393c',
      sponge: '#d5c8a2', coping: '#a99c86'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.46, 0.74, 0.49], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#23221d';
    var WZ = 7.2, CUT = 0.35, TOP = 2.72, RX = 4.7;
    var faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.5)
        : Projection.mix(tone, '#0b0a08', (1 - lit) * 0.74);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.95), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.6), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.8), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.06), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.18), [0, 1, 0], t0);
    }
    function drum(cx, cy, cz, r, h, seg, tone, t0) {
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * 6.2832, a1 = ((s + 1) / seg) * 6.2832;
        var m = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
        face([[cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r],
              [cx + Math.cos(a1) * r, cy + h, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, cy + h, cz + Math.sin(a0) * r]],
          shade(tone, 0.7 + 0.55 * Math.max(0, nz)), [m, 0, nz], t0);
      }
    }
    /* thin square bar between two world points, for handles and rules */
    function bar(a, b, w, tone, t0) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L;
      var px = -uy * w / 2, py = ux * w / 2, qx = -uz * w * 0.35, qz = uy * w * 0.35;
      function P(p, sx, sy, sz) { return [p[0] + sx, p[1] + sy, p[2] + sz]; }
      face([P(a, px, py, 0), P(b, px, py, 0), P(b, -px, -py, 0), P(a, -px, -py, 0)], shade(tone, 0.94), [-uz, 0, ux], t0);
      face([P(a, qx, 0, qz), P(b, qx, 0, qz), P(b, -qx, 0, -qz), P(a, -qx, 0, -qz)], shade(tone, 1.14), [0, 1, 0], t0);
    }

    var i, j, x, y;

    /* ---- ground: mown pavers and a kerb line, running into haze ---- */
    for (var z = 1.0; z < 22; z += 1.3) {
      var alt = Math.round(z) % 2 === 0;
      face([[-16, 0, z], [16, 0, z], [16, 0, z + 1.3], [-16, 0, z + 1.3]],
        (Math.round(z) % 4 === 0) ? TONE.path3 : (alt ? TONE.path : TONE.path2), [0, 1, 0], 0);
    }
    for (i = 0; i < 9; i++) {
      face([[-14 + i * 3.4, 0.004, 1.2], [-13.8 + i * 3.4, 0.004, 1.2],
            [-13.8 + i * 3.4, 0.004, 9.4], [-14 + i * 3.4, 0.004, 9.4]], TONE.sheet2, [0, 1, 0], 0, 0.35);
    }

    /* ---- the wall: joints, brick courses left of the cut, and the
       return wall that turns away at the corner so the depth reads ---- */
    face([[-8, 0, WZ], [RX, 0, WZ], [RX, TOP, WZ], [-8, TOP, WZ]], TONE.joint, [0, 0, 1], 0.02);
    for (y = 0.05; y < TOP - 0.1; y += 0.115) {
      var rowN = Math.round(y / 0.115);
      for (x = -7.9 + (rowN % 2) * 0.15; x < CUT - 0.02; x += 0.31) {
        var bw = Math.min(0.29, CUT - 0.02 - x);
        if (bw < 0.06) continue;
        face([[x, y, WZ - 0.002], [x + bw, y, WZ - 0.002], [x + bw, y + 0.097, WZ - 0.002], [x, y + 0.097, WZ - 0.002]],
          ((rowN * 7 + Math.round(x * 10)) % 3 === 0) ? TONE.brickC : (((rowN + Math.round(x * 10)) % 5 === 0) ? TONE.brickB : TONE.brick),
          [0, 0, 1], 0.05 + (y / TOP) * 0.3);
      }
      /* return wall courses, shaded the other way */
      face([[RX, y, WZ], [RX, y, 15], [RX, y + 0.097, 15], [RX, y + 0.097, WZ]],
        (rowN % 3 === 0) ? TONE.brickB : TONE.brick, [-1, 0, 0], 0.1 + (y / TOP) * 0.3);
    }
    face([[RX, 0, WZ], [RX, 0, 15], [RX, TOP, 15], [RX, TOP, WZ]], TONE.joint, [-1, 0, 0], 0.08);

    /* ---- window reveal: head, jambs, sill slab, dark interior ---- */
    var WX0 = -3.9, WX1 = -2.7, WY0 = 0.98, WY1 = 2.04, WR = 0.26;
    face([[WX0, WY0, WZ], [WX1, WY0, WZ], [WX1, WY1, WZ], [WX0, WY1, WZ]], TONE.revealIn, [0, 0, 1], 0.34);
    face([[WX0, WY0, WZ], [WX0, WY1, WZ], [WX0, WY1, WZ - WR], [WX0, WY0, WZ - WR]], shade(TONE.reveal, 1.32), [1, 0, 0], 0.36);
    face([[WX1, WY0, WZ], [WX1, WY1, WZ], [WX1, WY1, WZ - WR], [WX1, WY0, WZ - WR]], shade(TONE.reveal, 0.92), [-1, 0, 0], 0.36);
    face([[WX0, WY1, WZ], [WX1, WY1, WZ], [WX1, WY1, WZ - WR], [WX0, WY1, WZ - WR]], shade(TONE.reveal, 0.7), [0, -1, 0], 0.38);
    /* projecting sill slab, lit on top so it reads as a sill */
    face([[WX0 - 0.09, WY0 - 0.02, WZ + 0.09], [WX1 + 0.09, WY0 - 0.02, WZ + 0.09],
          [WX1 + 0.09, WY0 + 0.05, WZ + 0.09], [WX0 - 0.09, WY0 + 0.05, WZ + 0.09]], shade(TONE.coping, 1.14), [0, 0, 1], 0.4);
    face([[WX0 - 0.09, WY0 + 0.05, WZ + 0.09], [WX1 + 0.09, WY0 + 0.05, WZ + 0.09],
          [WX1 + 0.09, WY0 + 0.05, WZ - 0.02], [WX0 - 0.09, WY0 + 0.05, WZ - 0.02]], shade(TONE.coping, 1.28), [0, 1, 0], 0.4);

    /* ---- the render pass, swept in over the toothed cut ---- */
    for (i = 0; i < 12; i++) {
      var bx0 = CUT + i * 0.38, bx1 = Math.min(RX, bx0 + 0.385);
      var t0r = 0.55 + i * 0.055;
      face([[bx0, 0, WZ - 0.008], [bx1, 0, WZ - 0.008], [bx1, TOP, WZ - 0.008], [bx0, TOP, WZ - 0.008]],
        (i % 3 === 0) ? TONE.render3 : (i % 3 === 1 ? TONE.render : TONE.render2), [0, 0, 1], t0r);
      /* trowel drag through each band */
      for (j = 0; j < 4; j++) {
        var sy = 0.12 + j * 0.66 + (i % 2) * 0.1;
        face([[bx0 + 0.03, sy, WZ - 0.012], [bx1 - 0.04, sy + 0.02, WZ - 0.012],
              [bx1 - 0.04, sy + 0.07, WZ - 0.012], [bx0 + 0.03, sy + 0.05, WZ - 0.012]], TONE.wet, [0, 0, 1], t0r + 0.05, 0.4);
      }
    }
    /* the pass wraps the corner onto the return wall */
    for (i = 0; i < 5; i++) {
      var rz0 = WZ + i * 0.5 + 0.02;
      face([[RX - 0.008, 0, rz0], [RX - 0.008, 0, rz0 + 0.5], [RX - 0.008, TOP, rz0 + 0.5], [RX - 0.008, TOP, rz0]],
        (i % 2) ? TONE.render2 : TONE.render3, [-1, 0, 0], 1.2 + i * 0.05);
    }
    /* toothed edge where the pass stops, tighter than a saw blade */
    for (j = 0; j < 20; j++) {
      var ty = 0.03 + j * 0.135;
      face([[bx0safe(), ty, WZ - 0.01], [CUT - 0.035 - ((j * 5) % 3) * 0.012, ty + 0.05, WZ - 0.01],
            [CUT, ty + 0.1, WZ - 0.01]], TONE.render2, [0, 0, 1], 0.62, 0.92);
    }
    function bx0safe() { return CUT; }
    /* wall top edge so the wall is not a paper cut */
    face([[-8, TOP, WZ], [RX, TOP, WZ], [RX, TOP, WZ - 0.2], [-8, TOP, WZ - 0.2]], TONE.coping, [0, 1, 0], 0.2);
    face([[RX, TOP, WZ - 0.2], [RX, TOP, 15], [RX, TOP - 0.16, 15], [RX, TOP - 0.16, WZ - 0.2]], TONE.coping, [0, 1, 0], 0.22);

    /* ---- trowel held against the fresh coat at the cut ---- */
    (function () {
      var tx = CUT + 0.1, ty2 = 1.42, tz = WZ - 0.03;
      face([[tx - 0.16, ty2 - 0.11, tz], [tx + 0.17, ty2 - 0.09, tz], [tx + 0.16, ty2 + 0.1, tz], [tx - 0.15, ty2 + 0.09, tz]],
        shade(TONE.steel, 1.22), [0, 0, 1], 2.1);
      face([[tx - 0.16, ty2 - 0.11, tz], [tx + 0.17, ty2 - 0.09, tz], [tx + 0.17, ty2 - 0.09, tz + 0.02], [tx - 0.16, ty2 - 0.11, tz + 0.02]],
        shade(TONE.steel, 0.72), [0, -1, 0], 2.1);
      bar([tx + 0.17, ty2, tz + 0.01], [tx + 0.44, ty2 + 0.02, tz + 0.13], 0.05, TONE.timber, 2.16);
      bar([tx + 0.44, ty2 + 0.02, tz + 0.13], [tx + 0.6, ty2 + 0.03, tz + 0.2], 0.07, TONE.timberDk, 2.2);
      /* fresh smear fanning right of the blade */
      face([[tx - 0.15, ty2 + 0.12, tz - 0.002], [tx - 0.5, ty2 + 0.2, tz - 0.002],
            [tx - 0.5, ty2 + 0.02, tz - 0.002], [tx - 0.15, ty2 - 0.13, tz - 0.002]], TONE.wet, [0, 0, 1], 2.24, 0.6);
    })();

    /* ---- scaffold plank over the right half, standard upright ---- */
    box(4.6, 2.92, 4.0, 8.6, 0.06, 0.3, TONE.timber, 0.5);
    box(4.6, 2.86, 4.0, 8.6, 0.06, 0.3, TONE.timberDk, 0.52);
    box(0.9, 1.45, 4.05, 0.07, 3.0, 0.07, TONE.steelDk, 0.58);
    box(0.9, 2.84, 4.05, 0.16, 0.05, 0.34, TONE.steel, 0.62);

    /* ---- drop sheet in the near field ---- */
    face([[-3.0, 0.012, 2.2], [3.2, 0.012, 2.35], [3.1, 0.012, 4.5], [-2.8, 0.012, 4.3]], TONE.sheet, [0, 1, 0], 0.28, 0.95);
    face([[-2.7, 0.013, 2.6], [2.5, 0.013, 2.7], [2.3, 0.013, 3.6], [-2.4, 0.013, 3.5]], TONE.sheet2, [0, 1, 0], 0.3, 0.6);

    /* ---- hawk: board, patty of mortar, trowel sitting on it ---- */
    (function () {
      var hx = -1.5, hz = 2.75, y0 = 0.2, w = 0.27;
      face([[hx - w, y0 + 0.05, hz + w], [hx + w, y0, hz + w], [hx + w, y0, hz - w], [hx - w, y0 + 0.05, hz - w]], shade(TONE.timber, 1.05), [0, 1, 0], 1.15);
      face([[hx - w, y0 + 0.05, hz + w], [hx + w, y0, hz + w], [hx + w, y0 - 0.035, hz + w], [hx - w, y0 + 0.015, hz + w]], shade(TONE.timberDk, 0.9), [0, 0, 1], 1.15);
      for (var q = 0; q < 14; q++) {
        var a0 = (q / 14) * 6.2832, a1 = ((q + 1) / 14) * 6.2832;
        face([[hx, y0 + 0.06, hz], [hx + Math.cos(a0) * w * 0.78, y0 + 0.055 + Math.sin(a0) * 0.02, hz + Math.sin(a0) * w * 0.78],
              [hx + Math.cos(a1) * w * 0.78, y0 + 0.055 + Math.sin(a1) * 0.02, hz + Math.sin(a1) * w * 0.78]],
          shade(TONE.render, 0.86 + 0.3 * Math.max(0, Math.cos((a0 + a1) / 2 - 2.4))), [0, 1, 0], 1.28);
      }
      /* trowel: blade across the patty, wooden handle toward camera */
      face([[hx - 0.24, y0 + 0.085, hz + 0.1], [hx + 0.05, y0 + 0.08, hz + 0.16],
            [hx + 0.05, y0 + 0.08, hz + 0.02], [hx - 0.24, y0 + 0.085, hz - 0.04]], shade(TONE.steel, 1.16), [0, 1, 0], 1.42);
      bar([hx + 0.05, y0 + 0.082, hz + 0.09], [hx + 0.26, y0 + 0.075, hz + 0.13], 0.036, TONE.timber, 1.46);
    })();

    /* ---- render board on two trestles, load and a float on it ---- */
    (function () {
      var rbx = 1.85, rbz = 3.75, by = 0.74;
      box(rbx, by, rbz, 1.2, 0.05, 0.66, TONE.timber, 1.5);
      box(rbx, by + 0.05, rbz - 0.3, 1.2, 0.03, 0.05, TONE.timberDk, 1.52);
      [[-0.42], [0.42]].forEach(function (lg) {
        bar([rbx + lg[0] - 0.16, 0.02, rbz + 0.2], [rbx + lg[0], by, rbz], 0.045, TONE.timberDk, 1.4);
        bar([rbx + lg[0] + 0.16, 0.02, rbz + 0.2], [rbx + lg[0], by, rbz], 0.045, TONE.timberDk, 1.42);
      });
      for (i = 0; i < 9; i++) {
        var mx = rbx - 0.5 + i * 0.12;
        face([[mx, by + 0.05, rbz + 0.2], [mx + 0.13, by + 0.05, rbz + 0.2], [mx + 0.13, by + 0.075, rbz - 0.2], [mx, by + 0.075, rbz - 0.2]],
          shade(TONE.render, 0.9 + (i % 3) * 0.06), [0, 1, 0], 1.6 + i * 0.02);
      }
      box(rbx + 0.4, by + 0.05, rbz + 0.02, 0.3, 0.03, 0.16, TONE.sponge, 1.72);
    })();

    /* ---- cement bag, split at the top ---- */
    (function () {
      var sx = 3.0, sz = 3.05;
      box(sx, 0.02, sz, 0.54, 0.19, 0.32, TONE.sack, 1.62);
      box(sx, 0.21, sz, 0.5, 0.04, 0.28, TONE.sackDk, 1.66);
      face([[sx - 0.2, 0.24, sz + 0.1], [sx + 0.18, 0.23, sz + 0.14], [sx + 0.16, 0.27, sz - 0.06], [sx - 0.18, 0.28, sz - 0.03]],
        shade(TONE.render, 1.1), [0, 1, 0], 1.7);
    })();

    /* ---- bucket with a wet mix ---- */
    drum(0.5, 0.02, 4.3, 0.17, 0.33, 14, TONE.bucket, 1.45);
    for (i = 0; i < 12; i++) {
      var ba = (i / 12) * 6.2832, bb = ((i + 1) / 12) * 6.2832;
      face([[0.5, 0.34, 4.3], [0.5 + Math.cos(ba) * 0.16, 0.34, 4.3 + Math.sin(ba) * 0.16],
            [0.5 + Math.cos(bb) * 0.16, 0.34, 4.3 + Math.sin(bb) * 0.16]], shade(TONE.wet, 0.95), [0, 1, 0], 1.5);
    }
    /* rims so the bucket reads as a drum, not a disc */
    for (i = 0; i < 14; i++) {
      var ra = (i / 14) * 6.2832, rb = ((i + 1) / 14) * 6.2832;
      face([[0.5 + Math.cos(ra) * 0.17, 0.33, 4.3 + Math.sin(ra) * 0.17], [0.5 + Math.cos(rb) * 0.17, 0.33, 4.3 + Math.sin(rb) * 0.17],
            [0.5 + Math.cos(rb) * 0.17, 0.35, 4.3 + Math.sin(rb) * 0.17], [0.5 + Math.cos(ra) * 0.17, 0.35, 4.3 + Math.sin(ra) * 0.17]],
        shade(TONE.steel, 0.9), [Math.cos(ra), 0, Math.sin(ra)], 1.5);
    }

    /* ---- sponge float and a straight edge leaning on the wall ---- */
    box(-2.45, 0.014, 3.2, 0.3, 0.035, 0.16, TONE.sponge, 1.8);
    box(-2.45, 0.05, 3.2, 0.09, 0.03, 0.09, TONE.timberDk, 1.84);
    bar([-3.6, 0.02, 3.1], [-3.25, 1.62, 6.5], 0.05, TONE.steel, 1.7);
    bar([1.35, 0.02, 6.0], [1.28, 1.1, 6.9], 0.045, TONE.steelDk, 1.76);

    /* ---- spare trowel leaning against the fresh wall ---- */
    bar([0.95, 0.02, 6.7], [0.98, 0.62, 6.94], 0.05, TONE.steel, 1.9);
    face([[0.86, 0.62, 6.92], [1.1, 0.62, 6.92], [1.1, 0.94, 7.0], [0.86, 0.94, 7.0]], shade(TONE.steel, 1.2), [0, 0, 1], 1.94);
    bar([0.98, 0.94, 7.0], [0.98, 1.2, 7.04], 0.03, TONE.timber, 1.98);

    /* ---- render ---- */
    function render(t) {
      var tt = Projection.reduced() ? 99 : t;
      S.camX = Projection.reduced() ? 0 : Math.sin(tt * 0.09) * 0.14;
      S.camY = 1.04 + (Projection.reduced() ? 0 : Math.sin(tt * 0.13) * 0.03);
      S.yaw = Projection.reduced() ? 0 : Math.sin(tt * 0.07) * 0.028;

      var ctx = S.ctx, W = S.W, H = S.H;
      var sky = ctx.createLinearGradient(0, 0, 0, S.horizon + 10);
      sky.addColorStop(0, '#0c0b09');
      sky.addColorStop(0.6, '#1b1a15');
      sky.addColorStop(1, '#2a2823');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, S.horizon + 12);

      var list = [], p, q2, pts, sum, mapped, miss, f2;
      for (var ii = 0; ii < faces.length; ii++) {
        f2 = faces[ii];
        if (tt < f2.t0) continue;
        mapped = []; sum = 0; miss = false;
        for (q2 = 0; q2 < f2.pts.length; q2++) {
          p = S.project(f2.pts[q2][0], f2.pts[q2][1], f2.pts[q2][2]);
          if (!p) { miss = true; break; }
          mapped.push(p); sum += p[2];
        }
        if (miss) continue;
        var n = f2.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
        var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
        var dz = sum / mapped.length;
        list.push({
          pts: mapped, dz: dz,
          fill: Projection.mix(shade(f2.tone, 0.83 + 0.62 * Math.max(0, d)), FOG, S.fog(dz) * 0.55),
          a: Math.min(1, (tt - f2.t0) / 0.4) * f2.a
        });
      }
      list.sort(function (a, b) { return b.dz - a.dz; });
      for (ii = 0; ii < list.length; ii++) {
        var it = list[ii]; pts = it.pts;
        if (it.a <= 0.015) continue;
        ctx.globalAlpha = it.a;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var jj = 1; jj < pts.length; jj++) ctx.lineTo(pts[jj][0], pts[jj][1]);
        ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* wet sheen running down the fresh coat */
      if (tt > 1.4) {
        var sk = Math.min(1, (tt - 1.4) / 0.9);
        for (var s2 = 0; s2 < 7; s2++) {
          var sx2 = CUT + 0.5 + s2 * 1.15;
          var tp = S.project(sx2, TOP, WZ - 0.02), bp = S.project(sx2, 0, WZ - 0.02);
          if (!tp || !bp) continue;
          var sg = ctx.createLinearGradient(tp[0], tp[1], tp[0], bp[1]);
          sg.addColorStop(0, 'rgba(236,229,214,' + (0.16 * sk).toFixed(3) + ')');
          sg.addColorStop(1, 'rgba(236,229,214,0)');
          ctx.fillStyle = sg;
          ctx.fillRect(tp[0] - 5, tp[1], 10, bp[1] - tp[1]);
        }
      }

      /* dust motes hanging in the light near the wall */
      if (!Projection.reduced()) {
        for (i = 0; i < 16; i++) {
          var ph = ((tt * 0.07 + i * 0.061) % 1);
          var mp = S.project(-3.4 + (i * 0.83) % 8, 0.4 + ph * 2.0, 3.2 + (i % 5) * 0.9);
          if (!mp) continue;
          ctx.fillStyle = 'rgba(235,226,206,' + ((1 - ph) * 0.22).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(mp[0], mp[1], 1.4 * (1 - ph) + 0.5, 0, 6.2832); ctx.fill();
        }
      }

      /* grade: scrim for the copy on the left, settled top and bottom */
      var sc = ctx.createLinearGradient(0, 0, W * 0.6, H * 0.22);
      sc.addColorStop(0, 'rgba(10,9,7,0.82)');
      sc.addColorStop(0.5, 'rgba(10,9,7,0.34)');
      sc.addColorStop(1, 'rgba(10,9,7,0.02)');
      ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H);
      var tb = ctx.createLinearGradient(0, 0, 0, H * 0.26);
      tb.addColorStop(0, 'rgba(10,9,7,0.5)'); tb.addColorStop(1, 'rgba(10,9,7,0)');
      ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H * 0.26);
      var bt = ctx.createLinearGradient(0, H * 0.72, 0, H);
      bt.addColorStop(0, 'rgba(10,9,7,0)'); bt.addColorStop(1, 'rgba(10,9,7,0.55)');
      ctx.fillStyle = bt; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    }

    return { duration: 2.6, render: render };
  };

  /* ------------------------------------------------------------------ *
   * scenePainting — RS Painting. A weatherboard wall half stripped, half
   * finished: raw greyed boards left of a taped cut line, fresh chalk paint
   * right of it, a roller on a pole still in the stroke. Tins, brush,
   * sanding gear and a ladder stand on a drop sheet in the near field.
   * Same contract as the other scenes: world faces, one projection,
   * far-to-near sort, build-on timing.
   * ------------------------------------------------------------------ */
  Projection.scenePainting = function (S, o) {
    o = o || {};
    var TONE = {
      sheet: '#b3ab99', sheet2: '#a49c8b', fold: '#8d8577',
      raw: '#6d5a48', raw2: '#7b6650', rawDark: '#4d3e31', gap: '#33291f',
      paint: '#ddd5c0', paint2: '#e8e1ce', tape: '#efe6ca', tapeEdge: '#cbbfa0',
      pole: '#8b9095', poleDk: '#5c6267', sleeve: '#d9d2bd', sleeveDk: '#a9a190',
      steel: '#8d9499', steelDk: '#5a6166', timber: '#9b7647', timberHi: '#b98f57',
      lid: '#7c8288', drip: '#cfc7b1', handle: '#2a2a28', bristle: '#c9bfa4',
      dust: '#8a8272'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [0.62, 0.66, -0.42], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#16120e';
    var faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#fff4df', (lit - 1) * 0.55)
        : Projection.mix(tone, '#0b0906', (1 - lit) * 0.8);
    }

    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }

    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.94), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.6), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.78), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.05), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.16), [0, 1, 0], t0);
    }

    function drum(cx, cy, cz, r, h, seg, tone, t0, capTone) {
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
        var m = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
        face([[cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r],
              [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r],
              [cx + Math.cos(a1) * r, cy + h, cz + Math.sin(a1) * r],
              [cx + Math.cos(a0) * r, cy + h, cz + Math.sin(a0) * r]],
          shade(tone, 0.7 + 0.5 * Math.max(0, nz)), [m, 0, nz], t0);
      }
      var top = [], seg2 = 14;
      for (var q = 0; q < seg2; q++) {
        var ang = (q / seg2) * Math.PI * 2;
        top.push([cx + Math.cos(ang) * r, cy + h, cz + Math.sin(ang) * r]);
      }
      face(top, shade(capTone || tone, 1.14), [0, 1, 0], t0 + 0.04);
    }

    /* ---- drop sheet: canvas on the floor, folds running toward camera ---- */
    var x0 = -12, x1 = 12, z;
    face([[x0, 0, 0.85], [x1, 0, 0.85], [x1, 0, 17], [x0, 0, 17]], TONE.sheet, [0, 1, 0], 0);
    for (z = 17; z > 1; z -= 0.62) {
      var alt = Math.round((17 - z) / 0.62) % 2;
      face([[x0, 0.002, z], [x1, 0.002, z], [x1, 0.002, z - 0.3], [x0, 0.002, z - 0.3]],
        alt ? TONE.sheet2 : TONE.sheet, [0, 1, 0], 0);
    }
    /* a few long folds, and the sheet lip curling at the front */
    for (var f = 0; f < 7; f++) {
      var fx = -7.4 + f * 2.4 + (f % 2) * 0.5;
      face([[fx, 0.004, 1.05], [fx + 0.16, 0.004, 1.05], [fx + 0.3, 0.004, 9.4], [fx + 0.06, 0.004, 9.4]],
        TONE.fold, [0, 1, 0], 0.06);
    }
    face([[x0, 0.006, 1.15], [x1, 0.006, 1.15], [x1, 0.006, 0.92], [x0, 0.006, 0.92]], TONE.sheet2, [0, 1, 0], 0.1);

    /* ---- the wall: raw boards left of the cut, painted right of it ---- */
    var WZ = 7.4, WX0 = -7.2, WX1 = 7.2, CUT = 0.35, BOARD = 0.21;
    for (var b = 0; b < 17; b++) {
      var by = b * BOARD;
      var rawTone = b % 2 ? TONE.raw : TONE.raw2;
      face([[WX0, by, WZ], [CUT, by, WZ], [CUT, by + BOARD - 0.028, WZ], [WX0, by + BOARD - 0.028, WZ]],
        rawTone, [0, 0, -1], 0.05 + b * 0.03);
      face([[CUT, by, WZ], [WX1, by, WZ], [WX1, by + BOARD - 0.028, WZ], [CUT, by + BOARD - 0.028, WZ]],
        b % 2 ? TONE.paint : TONE.paint2, [0, 0, -1], 0.5 + b * 0.028);
      /* shadow gap under each board */
      face([[WX0, by + BOARD - 0.028, WZ - 0.002], [WX1, by + BOARD - 0.028, WZ - 0.002],
            [WX1, by + BOARD, WZ - 0.002], [WX0, by + BOARD, WZ - 0.002]], TONE.gap, [0, 0, -1], 0.05 + b * 0.03);
    }
    /* bare patches where the old finish failed, on the raw side only */
    var PATCH = [[-5.4, 0.72, 0.52, 0.30], [-3.1, 1.52, 0.74, 0.26], [-6.2, 2.35, 0.44, 0.34],
                 [-1.6, 0.46, 0.66, 0.22], [-4.2, 2.86, 0.5, 0.2], [-2.3, 2.1, 0.34, 0.24]];
    for (var p = 0; p < PATCH.length; p++) {
      var pt = PATCH[p];
      face([[pt[0], pt[1], WZ - 0.004], [pt[0] + pt[2], pt[1], WZ - 0.004],
            [pt[0] + pt[2] - 0.08, pt[1] + pt[3], WZ - 0.004], [pt[0] + 0.05, pt[1] + pt[3], WZ - 0.004]],
        TONE.rawDark, [0, 0, -1], 0.34 + p * 0.04);
    }

    /* masking tape down the cut, half peeled at the top */
    face([[CUT - 0.035, 0, WZ - 0.006], [CUT + 0.035, 0, WZ - 0.006],
          [CUT + 0.035, 2.62, WZ - 0.006], [CUT - 0.035, 2.62, WZ - 0.006]], TONE.tape, [0, 0, -1], 1.05);
    face([[CUT - 0.035, 0, WZ - 0.008], [CUT - 0.026, 0, WZ - 0.008],
          [CUT - 0.026, 2.62, WZ - 0.008], [CUT - 0.035, 2.62, WZ - 0.008]], TONE.tapeEdge, [0, 0, -1], 1.05);
    face([[CUT + 0.026, 0, WZ - 0.008], [CUT + 0.035, 0, WZ - 0.008],
          [CUT + 0.035, 2.62, WZ - 0.008], [CUT + 0.026, 2.62, WZ - 0.008]], TONE.tapeEdge, [0, 0, -1], 1.05);
    /* peeled tab lifting off the wall */
    face([[CUT + 0.035, 2.62, WZ - 0.006], [CUT + 0.035, 2.94, WZ - 0.006],
          [CUT + 0.19, 2.98, WZ - 0.10], [CUT + 0.19, 2.66, WZ - 0.10]], TONE.tape, [0.4, 0.2, -1], 1.16);
    face([[CUT - 0.035, 2.62, WZ - 0.006], [CUT - 0.035, 2.94, WZ - 0.006],
          [CUT - 0.12, 2.99, WZ - 0.09], [CUT - 0.12, 2.67, WZ - 0.09]], TONE.tapeEdge, [-0.3, 0.2, -1], 1.16);

    /* wet band under the roller, still glossy */
    face([[CUT + 0.04, 0.92, WZ - 0.009], [CUT + 0.52, 0.92, WZ - 0.009],
          [CUT + 0.52, 2.02, WZ - 0.009], [CUT + 0.04, 2.02, WZ - 0.009]], '#f3ecd8', [0, 0, -1], 1.3, 0.5);

    /* ---- roller on its pole, caught mid stroke ---- */
    var RB = [2.86, 0.05, 1.95], RT = [1.02, 1.78, 6.85];
    (function () {
      var dx = RT[0] - RB[0], dy = RT[1] - RB[1], dz = RT[2] - RB[2];
      var L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
      var ax = -dz, az = dx, am = Math.hypot(ax, az) || 1; ax /= am; az /= am;
      function seg(k0, k1, w, tone, t0) {
        var a = [RB[0] + dx * L * k0, RB[1] + dy * L * k0, RB[2] + dz * L * k0];
        var b2 = [RB[0] + dx * L * k1, RB[1] + dy * L * k1, RB[2] + dz * L * k1];
        var hw = w / 2;
        face([[a[0] - ax * hw, a[1], a[2] - az * hw], [a[0] + ax * hw, a[1], a[2] + az * hw],
              [b2[0] + ax * hw, b2[1], b2[2] + az * hw], [b2[0] - ax * hw, b2[1], b2[2] - az * hw]],
          tone, [-ax * 0.3 + 0.2, 0.7, -az * 0.3], t0);
      }
      seg(0, 0.62, 0.036, shade(TONE.pole, 0.9), 0.95);
      seg(0.62, 1, 0.03, shade(TONE.pole, 1.02), 1.05);
      /* grip sleeve at the butt end */
      seg(0.02, 0.16, 0.05, TONE.handle, 1.1);
      /* frame neck and the sleeve on the wall */
      var neck = [RT[0] - 0.06, RT[1], WZ - 0.11];
      face([[RT[0], RT[1] - 0.03, RT[2]], [RT[0], RT[1] + 0.03, RT[2]],
            [neck[0], neck[1] + 0.03, neck[2]], [neck[0], neck[1] - 0.03, neck[2]]],
        shade(TONE.steel, 1.05), [0.2, 0.4, -1], 1.18);
      drum(RT[0] - 0.09, RT[1] - 0.17, WZ - 0.10, 0.078, 0.34, 12, TONE.sleeve, 1.26, TONE.sleeveDk);
      box(RT[0] - 0.09, RT[1] + 0.17, WZ - 0.10, 0.05, 0.07, 0.05, TONE.steelDk, 1.3);
    })();

    /* ---- tins on the sheet: one open with the lid levered up, one sealed ---- */
    (function () {
      var tx = -2.46, tz = 2.3;
      drum(tx, 0, tz, 0.185, 0.33, 16, TONE.steel, 1.38, TONE.drip);
      face([[tx - 0.16, 0.335, tz], [tx + 0.16, 0.335, tz],
            [tx + 0.16, 0.335, tz - 0.3], [tx - 0.16, 0.335, tz - 0.3]], TONE.drip, [0, 1, 0], 1.42);
      /* rim ring */
      for (var r = 0; r < 14; r++) {
        var ra0 = (r / 14) * Math.PI * 2, ra1 = ((r + 1) / 14) * Math.PI * 2;
        face([[tx + Math.cos(ra0) * 0.195, 0.33, tz + Math.sin(ra0) * 0.195],
              [tx + Math.cos(ra1) * 0.195, 0.33, tz + Math.sin(ra1) * 0.195],
              [tx + Math.cos(ra1) * 0.195, 0.37, tz + Math.sin(ra1) * 0.195],
              [tx + Math.cos(ra0) * 0.195, 0.37, tz + Math.sin(ra0) * 0.195]],
          shade(TONE.lid, 0.9 + 0.4 * Math.cos(ra0)), [Math.cos(ra0), 0.2, Math.sin(ra0)], 1.4);
      }
      /* drip down the side of the tin */
      face([[tx - 0.19, 0.06, tz + 0.03], [tx - 0.155, 0.06, tz + 0.05],
            [tx - 0.14, 0.33, tz + 0.02], [tx - 0.185, 0.33, tz]], TONE.drip, [-1, 0, 0.2], 1.44);
      /* lid leaning against the tin, paint-side out */
      face([[tx - 0.30, 0, tz - 0.26], [tx - 0.02, 0, tz - 0.34],
            [tx - 0.02, 0.30, tz - 0.44], [tx - 0.30, 0.30, tz - 0.36]],
        shade(TONE.lid, 1.08), [-0.4, 0.2, -1], 1.5);
      /* sealed tin behind, taller can of undercoat */
      drum(-1.82, 0, 3.05, 0.155, 0.42, 14, '#6f767c', 1.55, TONE.lid);
      for (var rr = 0; rr < 12; rr++) {
        var qa = (rr / 12) * Math.PI * 2;
        face([[-1.82 + Math.cos(qa) * 0.158, 0.42, 3.05 + Math.sin(qa) * 0.158],
              [-1.82 + Math.cos(qa) * 0.158, 0.47, 3.05 + Math.sin(qa) * 0.158]],
          shade('#8d9398', 1.0), null, 1.58);
      }
      /* brush resting across the open tin */
      var bx = -2.9, bz = 2.44;
      box(bx, 0.365, bz, 0.42, 0.035, 0.055, TONE.timber, 1.62);
      box(bx, 0.365, bz, 0.42, 0.012, 0.055, TONE.timberHi, 1.62);
      box(bx - 0.23, 0.35, bz, 0.12, 0.05, 0.06, TONE.bristle, 1.66);
    })();

    /* ---- sanding block and paper on the sheet, near left ---- */
    box(-3.55, 0.01, 1.62, 0.30, 0.085, 0.14, TONE.timber, 1.7);
    box(-3.55, 0.095, 1.62, 0.31, 0.02, 0.15, TONE.dust, 1.74);
    face([[-3.9, 0.004, 1.5], [-3.36, 0.004, 1.42], [-3.28, 0.004, 1.78], [-3.84, 0.004, 1.86]],
      TONE.bristle, [0, 1, 0], 1.76);

    /* ---- stepladder on the right, leaning to the wall ---- */
    (function () {
      var fx = 4.9, fz = 3.5, tx2 = 4.26, tz2 = WZ - 0.16;
      [[-0.34, 0], [0.34, 0]].forEach(function (side) {
        var ox = side[0];
        face([[fx + ox - 0.035, 0, fz], [fx + ox + 0.035, 0, fz],
              [tx2 + ox + 0.032, 3.32, tz2], [tx2 + ox - 0.032, 3.32, tz2]],
          shade(TONE.timber, 0.92), [0, 0.1, -1], 1.42);
      });
      for (var st = 0; st < 7; st++) {
        var kk = 0.1 + st * 0.128;
        var sx = fx + (tx2 - fx) * kk, sy = 3.32 * kk, sz2 = fz + (tz2 - fz) * kk;
        face([[sx - 0.34, sy, sz2], [sx + 0.34, sy, sz2],
              [sx + 0.34, sy + 0.05, sz2], [sx - 0.34, sy + 0.05, sz2]],
          shade(TONE.timberHi, 1.0), [0, 0.2, -1], 1.5 + st * 0.03);
      }
    })();

    /* dust drifting through the light */
    var motes = [], seed = 51877;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    for (var m = 0; m < 40; m++) {
      motes.push({ x: -5 + rnd() * 11, y: 0.2 + rnd() * 2.6, z: 1.6 + rnd() * 5.4, s: 0.5 + rnd() * 1.4, p: rnd() * 6.283 });
    }

    return {
      duration: 1.9,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        S.yaw = Projection.reduced() ? 0 : Math.sin(time * 0.08) * 0.018;
        var c = S.ctx;

        var sky = c.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#0b0a09');
        sky.addColorStop(0.46, '#14110d');
        sky.addColorStop(1, '#1d1712');
        c.fillStyle = sky; c.fillRect(0, 0, S.W, S.H);

        /* warm window light off the right, behind the wall */
        var glow = c.createRadialGradient(S.W * 0.78, S.horizon * 0.86, 0, S.W * 0.78, S.horizon * 0.86, S.W * 0.66);
        glow.addColorStop(0, 'rgba(232,200,90,0.20)');
        glow.addColorStop(0.45, 'rgba(210,170,80,0.07)');
        glow.addColorStop(1, 'rgba(210,170,80,0)');
        c.fillStyle = glow; c.fillRect(0, 0, S.W, S.H);

        var list = [], i, p, pts, sum, mapped, miss;
        for (i = 0; i < faces.length; i++) {
          var f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (var q = 0; q < f.pts.length; q++) {
            p = S.project(f.pts[q][0], f.pts[q][1], f.pts[q][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss || !mapped.length) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          var dz = sum / mapped.length;
          list.push({
            pts: mapped, dz: dz,
            fill: Projection.mix(shade(f.tone, 0.55 + 0.6 * Math.max(0, d)), FOG, S.fog(dz) * 0.6),
            a: Math.min(1, (t - f.t0) / 0.44) * f.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          if (it.a <= 0.02) continue;
          c.globalAlpha = it.a;
          c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) c.lineTo(pts[j][0], pts[j][1]);
          c.closePath(); c.fillStyle = it.fill; c.fill();
        }
        c.globalAlpha = 1;

        /* contact shadow under the tins and the ladder */
        [[-2.3, 2.5, 0.9, 0.5], [4.9, 3.6, 1.0, 0.4], [-3.55, 1.62, 0.4, 0.35]].forEach(function (sh) {
          var sp = S.project(sh[0], 0.004, sh[1]);
          if (!sp) return;
          var rr = S.focal / sp[2] * sh[2];
          var sg = c.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], rr);
          sg.addColorStop(0, 'rgba(12,9,6,' + sh[3] + ')');
          sg.addColorStop(1, 'rgba(12,9,6,0)');
          c.save(); c.translate(sp[0], sp[1]); c.scale(1, 0.34); c.translate(-sp[0], -sp[1]);
          c.fillStyle = sg; c.beginPath(); c.arc(sp[0], sp[1], rr, 0, 6.2832); c.fill(); c.restore();
        });

        /* wet paint glare along the roller path */
        if (t > 1.3) {
          var wk = Math.min(1, (t - 1.3) / 0.6);
          var w1 = S.project(CUT + 0.08, 2.0, WZ - 0.01), w2 = S.project(CUT + 0.5, 0.95, WZ - 0.01);
          if (w1 && w2) {
            var wg = c.createLinearGradient(w1[0], w1[1], w2[0], w2[1]);
            wg.addColorStop(0, 'rgba(255,248,226,' + (0.3 * wk).toFixed(3) + ')');
            wg.addColorStop(1, 'rgba(255,248,226,0.02)');
            c.fillStyle = wg;
            c.beginPath(); c.moveTo(w1[0], w1[1]);
            c.lineTo(w2[0], w2[1]);
            c.lineTo(w2[0] + 26, w2[1] + 4);
            c.lineTo(w1[0] + 20, w1[1] - 6);
            c.closePath(); c.fill();
          }
        }

        if (!Projection.reduced()) {
          for (i = 0; i < motes.length; i++) {
            var mo = motes[i];
            var ph = ((time * 0.07 + mo.p) % 1);
            var mp = S.project(mo.x + Math.sin(time * 0.26 + mo.p) * 0.14, mo.y + ph * 0.7, mo.z);
            if (!mp) continue;
            var ma = (1 - ph) * 0.34 * (1 - S.fog(mp[2]));
            if (ma <= 0.01) continue;
            c.fillStyle = 'rgba(250,232,196,' + ma.toFixed(3) + ')';
            c.beginPath(); c.arc(mp[0], mp[1], mo.s * 0.8, 0, 6.2832); c.fill();
          }
        }

        /* seat the copy side: left wash, bottom grade, top bar */
        var vg = c.createLinearGradient(0, 0, S.W * 0.62, 0);
        vg.addColorStop(0, 'rgba(11,10,9,0.94)');
        vg.addColorStop(0.5, 'rgba(11,10,9,0.62)');
        vg.addColorStop(1, 'rgba(11,10,9,0)');
        c.fillStyle = vg; c.fillRect(0, 0, S.W, S.H);
        var bt = c.createLinearGradient(0, S.H - 160, 0, S.H);
        bt.addColorStop(0, 'rgba(11,10,9,0)'); bt.addColorStop(1, 'rgba(11,10,9,0.9)');
        c.fillStyle = bt; c.fillRect(0, S.H - 160, S.W, 160);
        var tp = c.createLinearGradient(0, 0, 0, 130);
        tp.addColorStop(0, 'rgba(11,10,9,0.9)'); tp.addColorStop(1, 'rgba(11,10,9,0)');
        c.fillStyle = tp; c.fillRect(0, 0, S.W, 130);
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneTreeMulching — Tree Mulchers Perth. A tow-behind drum chipper
   * standing on a bark yard, its feed table loaded with a felled trunk,
   * the discharge chute throwing fresh mulch onto the mound; sawn log
   * sections stacked to the right, a flushed stump with the saw still
   * lying beside it, treeline in the haze. World-space faces, one
   * projection, far-to-near, so occlusion and fog come out of the maths.
   * ------------------------------------------------------------------ */
  Projection.sceneTreeMulching = function (S, o) {
    o = o || {};
    var TONE = {
      yard: '#2b2419', yard2: '#332b1e', yard3: '#241e15', chip: '#6b4f31',
      chipHi: '#8a6a44', mulch: '#4a341f', mulchHi: '#63472b', mulchDk: '#332313',
      steel: '#7c8279', steelDk: '#4c524c', steelHi: '#a9af9e', dark: '#22261f',
      body: '#d8b02a', bodyHi: '#f1cc52', bodyDk: '#a9831b',
      bark: '#584330', barkHi: '#6d543c', cut: '#b99a6d', cutHi: '#d6b98c',
      tyre: '#151714', hub: '#5b6058', blade: '#c3c8c2', chain: '#8d938a',
      tree: '#1a2418', tree2: '#212d1c', handle: '#2f342c', yellow: '#e8c231'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [0.54, 0.72, -0.44], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#151a12';
    var faces = [];
    var seed = 61807;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#fff6e2', (lit - 1) * 0.55)
        : Projection.mix(tone, '#080a07', (1 - lit) * 0.76);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.96), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.58), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.78), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.08), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.2), [0, 1, 0], t0);
    }
    /* round stock on any axis: barrel faces plus a sawn end disc */
    function tube(a, b, r, seg, tone, t0, endTone) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
      var ux = -dz, uz = dx, um = Math.hypot(ux, uz) || 1; ux /= um; uz /= um;
      var vx = dy * uz, vy = dz * ux - dx * uz, vz = -dy * ux;
      var s, a0, a1, c0, s0, c1, s1, n0;
      function P(p, c, si) { return [p[0] + (ux * c + vx * si) * r, p[1] + (vy * si) * r, p[2] + (uz * c + vz * si) * r]; }
      for (s = 0; s < seg; s++) {
        a0 = (s / seg) * 6.2832; a1 = ((s + 1) / seg) * 6.2832;
        c0 = Math.cos(a0); s0 = Math.sin(a0); c1 = Math.cos(a1); s1 = Math.sin(a1);
        n0 = [ux * c0 + vx * s0, vy * s0, uz * c0 + vz * s0];
        face([P(a, c0, s0), P(a, c1, s1), P(b, c1, s1), P(b, c0, s0)],
          shade(tone, 0.62 + 0.55 * Math.max(0, n0[1])), n0, t0);
      }
      if (endTone) {
        var ring = [], inner = [], j;
        for (j = 0; j < 18; j++) {
          var an = (j / 18) * 6.2832;
          ring.push(P(b, Math.cos(an), Math.sin(an)));
          inner.push([b[0] + Math.cos(an) * r * 0.34, b[1] + Math.sin(an) * r * 0.34, b[2]]);
        }
        face(ring, shade(endTone, 1.0), [dx, dy, dz], t0 + 0.05);
        face(inner, shade(endTone, 1.16), [dx, dy, dz], t0 + 0.05);
      }
    }
    function wheel(cx, cy, cz, r, wdt, t0) {
      var n = 14, i2, a0, a1;
      for (i2 = 0; i2 < n; i2++) {
        a0 = (i2 / n) * 6.2832; a1 = ((i2 + 1) / n) * 6.2832;
        face([[cx, cy + Math.sin(a0) * r, cz - wdt / 2], [cx, cy + Math.sin(a1) * r, cz - wdt / 2],
              [cx, cy + Math.sin(a1) * r, cz + wdt / 2], [cx, cy + Math.sin(a0) * r, cz + wdt / 2]],
          shade(TONE.tyre, 0.72 + 0.5 * Math.cos(a0)), [Math.cos(a0), Math.sin(a0), 0], t0);
      }
      [cz - wdt / 2, cz + wdt / 2].forEach(function (zz, si) {
        var ring = [];
        for (var q = 0; q < 14; q++) {
          var ang = (q / 14) * 6.2832;
          ring.push([cx + Math.cos(ang) * r * 0.44, cy + Math.sin(ang) * r * 0.44, zz]);
        }
        face(ring, shade(TONE.hub, si ? 1.2 : 0.9), [0, 0, si ? 1 : -1], t0);
      });
    }

    /* ---- yard: bark ground receding, chip scatter on the near passes ---- */
    var z, x, i;
    for (z = 40; z > 1.0; z -= 1.05) {
      var pass = Math.round((40 - z) / 1.05) % 2 === 0;
      face([[-24, 0, z], [24, 0, z], [24, 0, z - 1.05], [-24, 0, z - 1.05]],
        pass ? TONE.yard : TONE.yard2, [0, 1, 0], 0);
    }
    face([[-24, 0, 1.05], [24, 0, 1.05], [24, 0, 0.9], [-24, 0,0.9]], TONE.yard3, [0, 1, 0], 0);
    for (i = 0; i < 220; i++) {
      var cxx = -14 + rnd() * 28, czz = 1.2 + Math.pow(rnd(), 0.62) * 21;
      var cw = 0.045 + rnd() * 0.16, ch = 0.03 + rnd() * 0.10;
      face([[cxx, 0.004, czz], [cxx + cw, 0.004, czz + ch * 0.4],
            [cxx + cw * 0.9, 0.004, czz + ch], [cxx - cw * 0.2, 0.004, czz + ch * 0.5]],
        rnd() > 0.55 ? TONE.chip : TONE.chipHi, [0, 1, 0], 0.05);
    }
    /* the worked strip: fresh mulch under the chute, darker where it is old */
    face([[0.2, 0.006, 2.6], [7.4, 0.006, 3.0], [8.4, 0.006, 9.4], [0.4, 0.006, 9.0]], TONE.mulch, [0, 1, 0], 0, 0.85);

    /* ---- treeline in the haze ---- */
    for (i = 0; i < 12; i++) {
      var tx = -21 + i * 3.9 + rnd() * 1.6, th = 3.4 + rnd() * 3.4, tz = 24 + rnd() * 9;
      face([[tx - 1.5, 0, tz], [tx + 1.5, 0, tz], [tx + 0.5, th, tz], [tx - 0.6, th * 0.86, tz]],
        rnd() > 0.5 ? TONE.tree : TONE.tree2, [0, 0.4, -0.9], 0.15);
      face([[tx - 0.13, 0, tz], [tx + 0.13, 0, tz], [tx + 0.13, th * 0.4, tz], [tx - 0.13, th * 0.4, tz]], TONE.bark, [0, 0, -1], 0.15);
    }

    /* ---- the chipper: drawbar, deck, flywheel housing, feed table, chute ---- */
    var CX = 3.05, CZ = 7.4, T = 0.45;
    box(CX - 1.55, 0.30, CZ + 0.1, 1.5, 0.13, 0.16, TONE.steelDk, T);
    box(CX - 2.22, 0.20, CZ + 0.1, 0.2, 0.26, 0.30, TONE.steel, T + 0.04);
    box(CX, 0.30, CZ, 2.1, 0.2, 1.25, TONE.steelDk, T);
    box(CX, 0.5, CZ, 1.95, 0.06, 1.15, TONE.dark, T + 0.04);
    wheel(CX - 0.15, 0.36, CZ - 0.62, 0.36, 0.22, T + 0.02);
    wheel(CX - 0.15, 0.36, CZ + 0.62, 0.36, 0.22, T + 0.06);
    /* rotor housing in the client's yellow, hinge side and latch side */
    box(CX + 0.12, 0.56, CZ, 1.34, 0.86, 1.06, TONE.body, T + 0.1);
    box(CX + 0.12, 1.42, CZ, 1.42, 0.09, 1.12, TONE.bodyDk, T + 0.14);
    box(CX + 0.12, 0.62, CZ - 0.56, 1.1, 0.7, 0.05, TONE.bodyHi, T + 0.16);
    box(CX - 0.4, 1.02, CZ - 0.58, 0.12, 0.24, 0.06, TONE.steelHi, T + 0.2);
    /* feed table raked down toward the camera */
    (function () {
      var ax = CX - 0.42, az = CZ - 0.7, bx = CX - 0.62, bz = CZ - 2.5;
      var w = 0.62;
      face([[ax - w, 1.06, az], [ax + w, 1.06, az], [bx + w, 0.5, bz], [bx - w, 0.5, bz]], TONE.steelDk, [0, 0.6, -0.8], T + 0.18);
      face([[ax - w, 1.06, az], [ax - w, 0.62, az], [bx - w, 0.06, bz], [bx - w, 0.5, bz]], TONE.steel, [-1, 0, 0], T + 0.2);
      face([[ax + w, 1.06, az], [ax + w, 0.62, az], [bx + w, 0.06, bz], [bx + w, 0.5, bz]], TONE.steel, [1, 0, 0], T + 0.2);
      face([[ax - w, 0.62, az], [ax + w, 0.62, az], [bx + w, 0.06, bz], [bx - w, 0.06, bz]], TONE.dark, [0, 1, 0], T + 0.2);
      box(bx - w - 0.03, 0.02, bz + 0.1, 0.1, 0.5, 0.1, TONE.steel, T + 0.22);
      box(bx + w + 0.03, 0.02, bz + 0.1, 0.1, 0.5, 0.1, TONE.steel, T + 0.22);
    })();
    /* discharge chute up and out to the right */
    (function () {
      var a = [CX + 0.7, 1.16, CZ + 0.1], b = [CX + 1.62, 1.86, CZ + 0.34];
      var r = 0.3;
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
      var px = -dz, pz = dx, pm = Math.hypot(px, pz) || 1; px /= pm; pz /= pm;
      function P(p, o2, u2) { return [p[0] + px * o2, p[1] + u2, p[2] + pz * o2]; }
      var q = [[-r, -r], [r, -r], [r, r], [-r, r]];
      for (var s = 0; s < 4; s++) {
        var q0 = q[s], q1 = q[(s + 1) % 4];
        face([P(a, q0[0], q0[1]), P(b, q0[0] * 0.92, q0[1] * 0.92),
              P(b, q1[0] * 0.92, q1[1] * 0.92), P(a, q1[0], q1[1])],
          shade(s === 3 ? TONE.bodyHi : TONE.body, 0.86 + s * 0.06), [px * s, 0.3, pz * s], T + 0.28);
      }
      face([[b[0] + px * r * 0.92, b[1] + r * 0.92, b[2] + pz * r * 0.92],
            [b[0] - px * r * 0.92, b[1] + r * 0.92, b[2] - pz * r * 0.92],
            [b[0] - px * r * 0.92, b[1] - r * 0.92, b[2] - pz * r * 0.92],
            [b[0] + px * r * 0.92, b[1] - r * 0.92, b[2] + pz * r * 0.92]], TONE.dark, [dx, dy, dz], T + 0.32);
    })();
    /* control lever and stop bar */
    face([[CX - 0.95, 0.5, CZ + 0.62], [CX - 0.85, 0.5, CZ + 0.62], [CX - 0.83, 1.32, CZ + 0.66], [CX - 0.93, 1.32, CZ + 0.66]],
      TONE.steelHi, [0, 0, 1], T + 0.26);
    box(CX - 0.88, 1.3, CZ + 0.64, 0.22, 0.07, 0.07, TONE.handle, T + 0.3);

    /* ---- trunk fed into the table, and the lengths already bucked ---- */
    tube([CX - 0.72, 0.72, CZ - 2.9], [CX - 1.55, 0.46, CZ - 0.4], 0.23, 12, TONE.bark, T + 0.36, TONE.cut);
    tube([1.05, 0.28, 4.35], [1.15, 0.28, 6.6], 0.3, 12, TONE.bark, T + 0.4, TONE.cutHi);
    tube([1.0, 0.79, 4.4], [1.12, 0.79, 6.35], 0.26, 12, TONE.barkHi, T + 0.46, TONE.cut);
    tube([1.22, 0.22, 5.2], [1.3, 0.22, 7.9], 0.24, 12, TONE.bark, T + 0.5, TONE.cut);
    /* bark ridges so the trunks are not smooth poles */
    for (i = 0; i < 22; i++) {
      var rx = 0.72 + rnd() * 0.7, rz = 4.3 + rnd() * 3.4, rl = 0.3 + rnd() * 0.7;
      face([[rx, 0.28 + rnd() * 0.5, rz], [rx + 0.02, 0.28 + rnd() * 0.5, rz + rl],
            [rx + 0.02, 0.33 + rnd() * 0.5, rz + rl], [rx, 0.33 + rnd() * 0.5, rz]],
        TONE.chip, [1, 0.2, 0], T + 0.6, 0.8);
    }

    /* ---- mulch mound under the chute ---- */
    var MX = 2.35, MZ = 3.35, RING = [], apex = 0.86;
    for (i = 0; i < 14; i++) {
      var an2 = (i / 14) * 6.2832, rr = 1.3 + rnd() * 0.4;
      RING.push([MX + Math.cos(an2) * rr * 1.2, 0.02, MZ + Math.sin(an2) * rr * 0.66, an2]);
    }
    for (i = 0; i < RING.length; i++) {
      var r1 = RING[i], r2 = RING[(i + 1) % RING.length], mid = (r1[3] + r2[3]) / 2;
      face([[MX + Math.cos(mid) * 0.18, apex + rnd() * 0.16, MZ + Math.sin(mid) * 0.1],
            [r1[0], r1[1], r1[2]], [r2[0], r2[1], r2[2]]],
        shade(i % 3 === 0 ? TONE.mulchHi : (i % 2 ? TONE.mulch : TONE.mulchDk), 0.66 + 0.5 * Math.max(0, Math.cos(mid - 0.7))),
        [Math.cos(mid), 0.6, Math.sin(mid)], 0.95 + i * 0.03);
    }
    for (i = 0; i < 30; i++) {
      var ca = rnd() * 6.2832, cr = rnd() * 1.5, cy = 0.04 + rnd() * 0.5;
      var flx = MX + Math.cos(ca) * cr, flz = MZ + Math.sin(ca) * cr * 0.6, fs = 0.05 + rnd() * 0.09;
      face([[flx - fs, cy, flz], [flx + fs, cy, flz + fs * 0.4], [flx + fs * 0.7, cy + fs, flz],
            [flx - fs * 0.7, cy + fs * 0.6, flz]], shade(TONE.chipHi, 0.8 + rnd() * 0.6), [0.3, 0.8, 0.3], 1.25);
    }

    /* ---- flushed stump, saw on the ground beside it ---- */
    (function () {
      var sx = -1.9, sz = 4.15;
      tube([sx, 0.0, sz], [sx, 0.34, sz], 0.46, 16, TONE.bark, 1.0, null);
      face((function () {
        var out = [], n = 18;
        for (var q2 = 0; q2 < n; q2++) {
          var a2 = (q2 / n) * 6.2832;
          out.push([sx + Math.cos(a2) * 0.46, 0.345, sz + Math.sin(a2) * 0.46]);
        }
        return out;
      })(), shade(TONE.cutHi, 1.06), [0, 1, 0], 1.05);
      for (var g = 0; g < 9; g++) {
        var go = -0.34 + g * 0.085;
        face([[sx + go, 0.348, sz - 0.3], [sx + go + 0.012, 0.348, sz - 0.3],
              [sx + go + 0.012, 0.348, sz + 0.3], [sx + go, 0.348, sz + 0.3]], TONE.cut, [0, 1, 0], 1.1, 0.7);
      }
      /* chainsaw: bar, sprocket cover, top handle */
      box(sx + 0.9, 0.1, sz + 0.15, 0.5, 0.2, 0.28, TONE.bodyDk, 1.3);
      face([[sx + 0.62, 0.10, sz + 0.12], [sx - 0.28, 0.10, sz + 0.04], [sx - 0.28, 0.14, sz + 0.16], [sx + 0.62, 0.18, sz + 0.2]],
        TONE.blade, [0, 1, 0], 1.34);
      box(sx + 0.78, 0.3, sz + 0.15, 0.26, 0.05, 0.05, TONE.handle, 1.38);
      box(sx + 1.0, 0.3, sz + 0.15, 0.05, 0.22, 0.05, TONE.handle, 1.4);
    })();

    /* ---- drifting chips off the chute (drawn in screen space) ---- */
    var CH = [];
    for (i = 0; i < 30; i++) CH.push({ t: i * 0.037, s: 0.5 + rnd() * 1.3, d: rnd() });

    return {
      duration: 1.9,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        S.yaw = Projection.reduced() ? 0 : Math.sin(time * 0.07) * 0.03;
        var ctx = S.ctx;

        var sky = ctx.createLinearGradient(0, 0, 0, S.horizon + S.H * 0.12);
        sky.addColorStop(0, '#080b08');
        sky.addColorStop(0.5, '#111711');
        sky.addColorStop(0.84, '#28301e');
        sky.addColorStop(1, '#3b3b26');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, S.W, S.horizon + S.H * 0.14);
        var sun = ctx.createRadialGradient(S.W * 0.74, S.horizon - S.H * 0.02, 0, S.W * 0.74, S.horizon - S.H * 0.02, S.H * 0.6);
        sun.addColorStop(0, 'rgba(233,214,150,.42)');
        sun.addColorStop(0.34, 'rgba(190,178,120,.15)');
        sun.addColorStop(1, 'rgba(150,140,90,0)');
        ctx.fillStyle = sun; ctx.fillRect(0, 0, S.W, S.horizon + S.H * 0.16);

        var list = [], p, pts, sum, mapped, miss, f, n, nm, d, dz;
        for (i = 0; i < faces.length; i++) {
          f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (var qi = 0; qi < f.pts.length; qi++) {
            p = S.project(f.pts[qi][0], f.pts[qi][1], f.pts[qi][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          n = f.n; nm = Math.hypot(n[0], n[1], n[2]) || 1;
          d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          dz = sum / mapped.length;
          list.push({
            pts: mapped, dz: dz,
            fill: Projection.mix(shade(f.tone, 0.54 + 0.62 * Math.max(0, d)), FOG, S.fog(dz) * 0.72),
            a: Math.min(1, (t - f.t0) / 0.4) * f.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          if (it.a <= 0.02) continue;
          ctx.globalAlpha = it.a;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* chips arcing out of the spout and settling on the heap */
        if (!Projection.reduced() && t > 1.3) {
          var m0 = S.project(MX, 0.35, MZ);
          var spout = S.project(CX + 1.62, 1.86, CZ + 0.34);
          if (m0 && spout) {
            for (i = 0; i < CH.length; i++) {
              var c2 = CH[i];
              var ph = ((time * 0.42 + c2.t) % 1);
              var px2 = spout[0] + (m0[0] - spout[0]) * ph + Math.sin(ph * 7 + c2.d * 6) * 12 * c2.d;
              var py2 = spout[1] + (m0[1] - spout[1]) * ph - Math.sin(ph * Math.PI) * 30 * c2.s;
              ctx.fillStyle = 'rgba(196,150,96,' + (0.8 * (1 - ph * 0.7) * Math.min(1, (t - 1.3) / 0.5)).toFixed(3) + ')';
              ctx.fillRect(px2, py2, c2.s * 2.2, c2.s * 1.4);
            }
          }
        }

        /* dust-haze band over the yard, then the grade for the copy */
        var hz = ctx.createLinearGradient(0, S.horizon - 26, 0, S.horizon + S.H * 0.26);
        hz.addColorStop(0, 'rgba(26,32,20,0)');
        hz.addColorStop(0.5, 'rgba(26,32,20,0.34)');
        hz.addColorStop(1, 'rgba(20,24,16,0)');
        ctx.fillStyle = hz; ctx.fillRect(0, S.horizon - 26, S.W, S.H * 0.3);

        var vg = ctx.createRadialGradient(S.W * 0.6, S.H * 0.46, Math.min(S.W, S.H) * 0.28,
          S.W * 0.6, S.H * 0.46, Math.max(S.W, S.H) * 0.84);
        vg.addColorStop(0, 'rgba(4,6,4,0)');
        vg.addColorStop(1, 'rgba(4,6,4,0.62)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, S.W, S.H);

        var sc = ctx.createLinearGradient(0, 0, S.W * 0.58, S.H * 0.3);
        sc.addColorStop(0, 'rgba(6,8,6,0.9)');
        sc.addColorStop(0.55, 'rgba(6,8,6,0.46)');
        sc.addColorStop(1, 'rgba(6,8,6,0.04)');
        ctx.fillStyle = sc; ctx.fillRect(0, 0, S.W, S.H);
        var bt = ctx.createLinearGradient(0, S.H - 120, 0, S.H);
        bt.addColorStop(0, 'rgba(5,7,5,0)'); bt.addColorStop(1, 'rgba(5,7,5,0.78)');
        ctx.fillStyle = bt; ctx.fillRect(0, S.H - 120, S.W, 120);
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneEliteCore — Elite Chase & Core. A blockwork wall mid-job: a twin
   * blade chase running down the face into a cut box, a rig-mounted
   * diamond core drill boring a 150mm hole with the swivel still wet,
   * slurry running down the wall, a doorway punched through on the left
   * for depth, and the trade's own gear in the near field (core barrels in
   * a rack, wet vac, bucket, hose, chalk line). World faces, one
   * projection, far-to-near sort; one static frame under reduced motion.
   * ------------------------------------------------------------------ */
  Projection.sceneEliteCore = function (S, o) {
    o = o || {};
    var TONE = {
      floor: '#2a2b32', floor2: '#31323a', floor3: '#24252b',
      wall: '#4a4b55', wall2: '#52535e', wall3: '#41424b',
      joint: '#5d5e69', cut: '#787a85', cutIn: '#191a20', void: '#0a0a0e',
      reveal: '#33343c', revealIn: '#131419',
      steel: '#9aa0aa', steelDk: '#5b6068', steelLt: '#c2c7cf',
      brass: '#b08642', hose: '#2c2f36', rubber: '#17181d',
      vac: '#3b3e47', vacDk: '#24262c', water: '#4a5a66', slurry: '#8e8b84',
      timber: '#8a6640', timberDk: '#5d4529', gold: '#e6b800'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.54, 0.74, 0.40], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#0d0d12';
    var WZ = 6.4, WT = 0.22, TOP = 3.02, CH1 = 0.30, CH2 = 0.58;
    var RIGX = 2.62, BOREY = 1.30, faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.5)
        : Projection.mix(tone, '#08080b', (1 - lit) * 0.76);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.96), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.58), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.78), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.08), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.2), [0, 1, 0], t0);
    }
    /* upright drum */
    function drum(cx, cy, cz, r, h, seg, tone, t0) {
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * 6.2832, a1 = ((s + 1) / seg) * 6.2832;
        var m = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
        face([[cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r],
              [cx + Math.cos(a1) * r, cy + h, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, cy + h, cz + Math.sin(a0) * r]],
          shade(tone, 0.72 + 0.5 * Math.max(0, nz)), [m, 0, nz], t0);
      }
      face([[cx + Math.cos(0) * r, cy + h, cz], [cx + Math.cos(1.57) * r, cy + h, cz + r], [cx + Math.cos(3.14) * r, cy + h, cz], [cx + Math.cos(4.71) * r, cy + h, cz - r]],
        shade(tone, 1.24), [0, 1, 0], t0);
    }
    /* drum lying along Z (a core barrel pointing at the wall) */
    function zDrum(cx, cy, z0, z1, r, seg, tone, t0) {
      var s, a0, a1, m, ny;
      for (s = 0; s < seg; s++) {
        a0 = (s / seg) * 6.2832; a1 = ((s + 1) / seg) * 6.2832;
        m = Math.cos((a0 + a1) / 2); ny = Math.sin((a0 + a1) / 2);
        face([[cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, z0], [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, z0],
              [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, z1], [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, z1]],
          shade(tone, 0.68 + 0.55 * Math.max(0, ny)), [m, ny, 0], t0);
      }
      face([[cx + r, cy, z1], [cx, cy + r, z1], [cx - r, cy, z1], [cx, cy - r, z1]], shade(tone, 0.86), [0, 0, 1], t0);
      face([[cx + r, cy, z0], [cx, cy + r, z0], [cx - r, cy, z0], [cx, cy - r, z0]], shade(tone, 1.1), [0, 0, -1], t0);
    }
    function bar(a, b, w, tone, t0) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L;
      var px = -uy * w / 2, py = ux * w / 2, qx = -uz * w * 0.35, qz = uy * w * 0.35;
      function P(p, sx, sy, sz) { return [p[0] + sx, p[1] + sy, p[2] + sz]; }
      face([P(a, px, py, 0), P(b, px, py, 0), P(b, -px, -py, 0), P(a, -px, -py, 0)], shade(tone, 0.92), [-uz, 0, ux], t0);
      face([P(a, qx, 0, qz), P(b, qx, 0, qz), P(b, -qx, 0, -qz), P(a, -qx, 0, -qz)], shade(tone, 1.16), [0, 1, 0], t0);
    }
    /* wet core hole on the wall face: dark bore, cut lip, slurry ring */
    function bore(x, y, r, t0, wet) {
      face([[x + r, y, WZ - 0.002], [x, y + r, WZ - 0.002], [x - r, y, WZ - 0.002], [x, y - r, WZ - 0.002]], TONE.cutIn, [0, 0, -1], t0);
      for (var s = 0; s < 14; s++) {
        var a0 = (s / 14) * 6.2832, a1 = ((s + 1) / 14) * 6.2832;
        face([[x + Math.cos(a0) * r * 1.02, y + Math.sin(a0) * r * 1.02, WZ - 0.003],
              [x + Math.cos(a1) * r * 1.02, y + Math.sin(a1) * r * 1.02, WZ - 0.003],
              [x + Math.cos(a1) * r * 1.30, y + Math.sin(a1) * r * 1.30, WZ - 0.003],
              [x + Math.cos(a0) * r * 1.30, y + Math.sin(a0) * r * 1.30, WZ - 0.003]],
          wet ? shade(TONE.slurry, 1.05) : shade(TONE.cut, 1.0), [0, 0, -1], t0, wet ? 0.9 : 0.7);
      }
    }

    var i, x, y, z;

    /* ---- floor: poured slab, joints, a kerb line running into haze ---- */
    for (z = 0.8; z < 24; z += 1.5) {
      face([[-16, 0, z], [16, 0, z], [16, 0, z + 1.5], [-16, 0, z + 1.5]],
        (Math.round(z * 2) % 3 === 0) ? TONE.floor3 : (Math.round(z) % 2 ? TONE.floor : TONE.floor2), [0, 1, 0], 0);
    }
    for (i = -7; i <= 7; i++) {
      face([[i * 1.8, 0.003, 1.0], [i * 1.8 + 0.03, 0.003, 1.0], [i * 1.8 + 0.03, 0.003, 9.0], [i * 1.8, 0.003, 9.0]], TONE.joint, [0, 1, 0], 0, 0.5);
    }

    /* ---- the wall: block courses, painted face, doorway punched through ---- */
    face([[-8.5, 0, WZ], [8.5, 0, WZ], [8.5, TOP, WZ], [-8.5, TOP, WZ]], TONE.joint, [0, 0, 1], 0.02);
    for (y = 0.02; y < TOP - 0.05; y += 0.2) {
      for (x = -8.4 + (Math.round(y * 5) % 2) * 0.3; x < 8.4; x += 0.6) {
        if (x < -5.55 && x + 0.58 > -5.55 && y < 2.3) continue;
        if (x > -3.95 && x < -3.9 && y < 2.3) continue;
        if (x > -5.6 && x < -3.9 && y < 2.28) continue;
        var bw = Math.min(0.57, 8.4 - x);
        if (bw < 0.1) continue;
        face([[x, y, WZ - 0.001], [x + bw, y, WZ - 0.001], [x + bw, y + 0.185, WZ - 0.001], [x, y + 0.185, WZ - 0.001]],
          (Math.round(x * 3 + y * 7) % 4 === 0) ? TONE.wall3 : (Math.round(x * 5) % 3 === 0 ? TONE.wall2 : TONE.wall), [0, 0, 1], 0.04);
      }
    }
    /* lintel over the doorway and the void behind it */
    face([[-5.78, 2.28, WZ], [-3.72, 2.28, WZ], [-3.72, 2.5, WZ], [-5.78, 2.5, WZ]], shade(TONE.wall2, 0.9), [0, 0, 1], 0.06);
    face([[-5.6, 0, WZ + WT + 1.4], [-3.9, 0, WZ + WT + 1.4], [-3.9, 2.3, WZ + WT + 1.4], [-5.6, 2.3, WZ + WT + 1.4]], TONE.void, [0, 0, 1], 0.08);
    face([[-5.6, 0, WZ], [-5.6, 0, WZ + WT + 1.4], [-5.6, 2.3, WZ + WT + 1.4], [-5.6, 2.3, WZ]], TONE.reveal, [1, 0, 0], 0.08);
    face([[-3.9, 0, WZ], [-3.9, 0, WZ + WT + 1.4], [-3.9, 2.3, WZ + WT + 1.4], [-3.9, 2.3, WZ]], TONE.revealIn, [-1, 0, 0], 0.08);
    face([[-5.6, 0, WZ], [-3.9, 0, WZ], [-3.9, 0, WZ + WT + 1.4], [-5.6, 0, WZ + WT + 1.4]], TONE.revealIn, [0, 1, 0], 0.08);
    face([[-5.6, 2.3, WZ], [-3.9, 2.3, WZ], [-3.9, 2.3, WZ + WT + 1.4], [-5.6, 2.3, WZ + WT + 1.4]], '#0e0f13', [0, -1, 0], 0.08);
    /* right return, so the wall turns away and the corner reads */
    face([[8.5, 0, WZ], [8.5, 0, 3.4], [8.5, TOP, 3.4], [8.5, TOP, WZ]], shade(TONE.wall3, 0.82), [-1, 0, 0], 0.06);

    /* ---- the twin chase: two slots cut into the face, lips still bright ---- */
    [[CH1, 0.28, 2.34], [CH2, 0.28, 2.34]].forEach(function (c, ci) {
      var cx = c[0], y0 = c[1], y1 = c[2];
      face([[cx - 0.024, y0, WZ - 0.001], [cx + 0.024, y0, WZ - 0.001], [cx + 0.024, y1, WZ - 0.001], [cx - 0.024, y1, WZ - 0.001]], TONE.cutIn, [0, 0, -1], 0.9 + ci * 0.05);
      face([[cx - 0.024, y0, WZ], [cx - 0.024, y0, WZ + 0.055], [cx - 0.024, y1, WZ + 0.055], [cx - 0.024, y1, WZ]], TONE.cut, [1, 0, 0], 0.9 + ci * 0.05, 0.85);
    });
    /* cut box at the chase, and the spoil lip on the floor beneath it */
    face([[0.36, 1.06, WZ - 0.001], [0.52, 1.06, WZ - 0.001], [0.52, 1.2, WZ - 0.001], [0.36, 1.2, WZ - 0.001]], TONE.cutIn, [0, 0, -1], 1.0);
    face([[0.3, 0.0, 5.96], [0.6, 0.0, 5.96], [0.62, 0.0, 6.34], [0.28, 0.0, 6.34]], TONE.slurry, [0, 1, 0], 1.1, 0.85);

    /* ---- the core drill: plate, mast, brace, carriage, body, swivel, barrel ---- */
    box(RIGX, 0, 5.52, 0.54, 0.055, 0.5, TONE.steelDk, 0.5);
    box(RIGX, 0.055, 5.30, 0.1, 2.02, 0.1, TONE.steel, 0.58);
    bar([RIGX, 2.02, 5.30], [RIGX, 0.06, 5.74], 0.06, TONE.steelDk, 0.7);
    box(RIGX, 0.055, 5.52, 0.22, 0.16, 0.16, TONE.steelDk, 0.62);
    box(RIGX, 1.16, 5.48, 0.3, 0.3, 0.26, TONE.motor || TONE.vac, 0.82);
    box(RIGX, 1.16, 5.48, 0.34, 0.06, 0.3, TONE.steelDk, 0.84);
    zDrum(RIGX, BOREY, 5.60, 6.02, 0.125, 12, TONE.steel, 0.9);
    zDrum(RIGX, BOREY, 6.02, 6.10, 0.085, 10, TONE.brass, 1.0);
    zDrum(RIGX, BOREY, 6.10, 6.44, 0.075, 12, TONE.steelLt, 1.06);
    /* bit crown: segments on the wall face */
    for (i = 0; i < 8; i++) {
      var ca = (i / 8) * 6.2832;
      face([[RIGX + Math.cos(ca) * 0.075, BOREY + Math.sin(ca) * 0.075, WZ - 0.004],
            [RIGX + Math.cos(ca + 0.5) * 0.075, BOREY + Math.sin(ca + 0.5) * 0.075, WZ - 0.004],
            [RIGX + Math.cos(ca + 0.5) * 0.055, BOREY + Math.sin(ca + 0.5) * 0.055, WZ - 0.004],
            [RIGX + Math.cos(ca) * 0.055, BOREY + Math.sin(ca) * 0.055, WZ - 0.004]],
        shade(TONE.steelLt, 1.1), [0, 0, -1], 1.1);
    }
    /* handle wheel and water hose at the swivel */
    box(RIGX, 1.62, 5.62, 0.05, 0.05, 0.3, TONE.steel, 0.95);
    box(RIGX, 1.30, 5.68, 0.9, 0.04, 0.04, TONE.steelDk, 0.9);
    /* the bore under the bit, and one already finished beside it */
    bore(RIGX, BOREY, 0.086, 1.14, true);
    bore(3.62, 1.06, 0.086, 1.02, true);

    /* ---- near field: barrel rack, wet vac, bucket, hose, chalk line ---- */
    box(0.86, 0, 4.30, 0.62, 0.07, 0.3, TONE.timber, 1.2);
    box(0.58, 0, 4.30, 0.06, 0.3, 0.3, TONE.timberDk, 1.22);
    box(1.14, 0, 4.30, 0.06, 0.3, 0.3, TONE.timberDk, 1.22);
    drum(0.72, 0.07, 4.32, 0.075, 0.5, 10, TONE.steel, 1.26);
    drum(1.0, 0.07, 4.30, 0.055, 0.4, 9, TONE.steelLt, 1.3);
    drum(1.0, 0.07, 4.44, 0.09, 0.34, 10, TONE.brass, 1.34);

    box(4.42, 0, 4.24, 0.52, 0.58, 0.46, TONE.vac, 1.4);
    box(4.42, 0.58, 4.24, 0.56, 0.08, 0.5, TONE.vacDk, 1.44);
    drum(4.42, 0.66, 4.24, 0.14, 0.13, 10, TONE.vacDk, 1.46);
    box(4.42, 0.30, 4.00, 0.3, 0.16, 0.04, TONE.vacDk, 1.42);

    drum(1.62, 0, 3.94, 0.14, 0.3, 12, TONE.steelDk, 1.5);
    face([[1.48, 0.3, 3.94], [1.76, 0.3, 3.94], [1.76, 0.3, 4.08], [1.48, 0.3, 4.08]], TONE.water, [0, 1, 0], 1.52, 0.9);

    /* hose: swivel -> sagging loop -> vac, and the vac feed to the shroud */
    var hosePts = [[RIGX + 0.12, BOREY - 0.1, 5.86], [RIGX + 0.05, 0.62, 5.5], [2.2, 0.16, 4.9], [3.1, 0.07, 4.6], [3.9, 0.1, 4.42], [4.14, 0.28, 4.3]];
    for (i = 0; i < hosePts.length - 1; i++) bar(hosePts[i], hosePts[i + 1], 0.05, TONE.hose, 1.56 + i * 0.03);
    /* chalk line and set-out marks on the slab */
    face([[-1.6, 0.004, 3.58], [2.9, 0.004, 3.52], [2.9, 0.004, 3.56], [-1.6, 0.004, 3.62]], TONE.gold, [0, 1, 0], 1.6, 0.55);
    box(-1.35, 0, 3.6, 0.09, 0.06, 0.06, TONE.gold, 1.62);
    /* a spanner dropped on the slab */
    bar([0.3, 0.012, 3.14], [0.72, 0.012, 3.34], 0.035, TONE.steel, 1.64);

    function render(t) {
      var tt = Projection.reduced() ? 99 : t;
      S.camX = (Projection.reduced() ? 0 : Math.sin(tt * 0.085) * 0.16) - 0.55;
      S.camY = 1.42 + (Projection.reduced() ? 0 : Math.sin(tt * 0.12) * 0.035);
      S.yaw = Projection.reduced() ? 0 : Math.sin(tt * 0.062) * 0.022;

      var ctx = S.ctx, W = S.W, H = S.H;
      var sky = ctx.createLinearGradient(0, 0, 0, S.horizon + 20);
      sky.addColorStop(0, '#0a0a0d');
      sky.addColorStop(0.55, '#15161c');
      sky.addColorStop(1, '#262832');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, S.horizon + 22);

      var list = [], p, q2, pts, sum, mapped, miss, f2, ii;
      for (ii = 0; ii < faces.length; ii++) {
        f2 = faces[ii];
        if (tt < f2.t0) continue;
        mapped = []; sum = 0; miss = false;
        for (q2 = 0; q2 < f2.pts.length; q2++) {
          p = S.project(f2.pts[q2][0], f2.pts[q2][1], f2.pts[q2][2]);
          if (!p) { miss = true; break; }
          mapped.push(p); sum += p[2];
        }
        if (miss) continue;
        var n = f2.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
        var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
        var dz = sum / mapped.length;
        list.push({
          pts: mapped, dz: dz,
          fill: Projection.mix(shade(f2.tone, 0.82 + 0.64 * Math.max(0, d)), FOG, S.fog(dz) * 0.55),
          a: Math.min(1, (tt - f2.t0) / 0.42) * f2.a
        });
      }
      list.sort(function (a, b) { return b.dz - a.dz; });
      for (ii = 0; ii < list.length; ii++) {
        var it = list[ii]; pts = it.pts;
        if (it.a <= 0.015) continue;
        ctx.globalAlpha = it.a;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var jj = 1; jj < pts.length; jj++) ctx.lineTo(pts[jj][0], pts[jj][1]);
        ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* slurry running down the wall from both bores, and out of the chase */
      if (tt > 1.1) {
        var sk = Math.min(1, (tt - 1.1) / 0.8);
        var seeps = [[RIGX, WZ, 0.02], [RIGX - 0.07, WZ, 0.05], [RIGX + 0.05, WZ, 0.035], [3.62, WZ, 0.03], [CH1, WZ, 0.028], [CH2 + 0.02, WZ, 0.03]];
        for (var s2 = 0; s2 < seeps.length; s2++) {
          var tp = S.project(seeps[s2][0], BOREY - 0.06, WZ - 0.02);
          var bp = S.project(seeps[s2][0], 0, WZ - 0.02);
          if (!tp || !bp) continue;
          var sg = ctx.createLinearGradient(0, tp[1], 0, bp[1]);
          sg.addColorStop(0, 'rgba(206,203,193,' + (0.30 * sk).toFixed(3) + ')');
          sg.addColorStop(1, 'rgba(206,203,193,0.02)');
          var wdt = Math.max(2, 8 - s2) * (1 + s2 * 0.2);
          ctx.fillStyle = sg;
          ctx.fillRect(tp[0] - wdt / 2, tp[1], wdt, bp[1] - tp[1]);
        }
        /* wet ring and spray at the bit */
        var hp = S.project(RIGX, BOREY, WZ - 0.03);
        if (hp) {
          ctx.strokeStyle = 'rgba(214,212,204,' + (0.34 * sk).toFixed(3) + ')';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(hp[0], hp[1], S.focal / hp[2] * 0.16, S.focal / hp[2] * 0.16, 0, 0, 6.2832); ctx.stroke();
        }
      }

      /* water spray mist around the bit */
      if (!Projection.reduced() && tt > 1.2) {
        for (i = 0; i < 14; i++) {
          var ph = ((tt * 0.22 + i * 0.094) % 1);
          var mp = S.project(RIGX - 0.12 + Math.sin(i * 2.1) * 0.09, BOREY - 0.05 - ph * 0.5, WZ - 0.06 - ph * 0.18);
          if (!mp) continue;
          ctx.fillStyle = 'rgba(226,224,214,' + ((1 - ph) * 0.30).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(mp[0], mp[1], 1.6 * (1 - ph) + 0.4, 0, 6.2832); ctx.fill();
        }
      }

      /* dust hanging in the light above the chase */
      if (!Projection.reduced()) {
        for (i = 0; i < 12; i++) {
          var dp = ((tt * 0.05 + i * 0.083) % 1);
          var dq = S.project(0.1 + Math.sin(i * 1.7) * 0.5, 1.6 - dp * 1.5, 5.4 - (i % 4) * 0.5);
          if (!dq) continue;
          ctx.fillStyle = 'rgba(232,229,220,' + ((1 - dp) * 0.16).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(dq[0], dq[1], 1.2 * (1 - dp) + 0.4, 0, 6.2832); ctx.fill();
        }
      }

      /* grade: scrim for the copy on the left, settled top and bottom */
      var sc = ctx.createLinearGradient(0, 0, W * 0.72, H * 0.26);
      sc.addColorStop(0, 'rgba(7,7,10,0.92)');
      sc.addColorStop(0.48, 'rgba(7,7,10,0.55)');
      sc.addColorStop(1, 'rgba(7,7,10,0.04)');
      ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H);
      var tb = ctx.createLinearGradient(0, 0, 0, H * 0.22);
      tb.addColorStop(0, 'rgba(7,7,10,0.6)'); tb.addColorStop(1, 'rgba(7,7,10,0)');
      ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H * 0.22);
      var bt = ctx.createLinearGradient(0, H * 0.7, 0, H);
      bt.addColorStop(0, 'rgba(7,7,10,0)'); bt.addColorStop(1, 'rgba(7,7,10,0.62)');
      ctx.fillStyle = bt; ctx.fillRect(0, H * 0.7, W, H * 0.3);
    }

    return { duration: 2.6, render: render };
  };

  /* ------------------------------------------------------------------ *
   * sceneTint — a tint bay. A pane of automotive glass stands on trestles
   * with film half laid and the squeegee caught on the wet edge; the bench
   * beside it carries the roll, the slip solution, the heat gun and knife.
   * World-space faces through one projection, sorted far-to-near, so the
   * occlusion, the wet glare and the fog all fall out of the maths.
   * ------------------------------------------------------------------ */
  Projection.sceneTint = function (S, o) {
    o = o || {};
    var TONE = {
      floor: '#28323d', floor2: '#313d49', floorWet: '#42556567', floorDk: '#1a222a',
      wall: '#1e2833', wall2: '#25303c', seam: '#131a22', boxLit: '#4f7492',
      alum: '#b7c3ce', alumDk: '#78858f', alumHi: '#dde7ef',
      glass: '#16293a', glass2: '#1d3d51', glassHi: '#7db2cf',
      film: '#0b1420', film2: '#101d29', filmEdge: '#215a8a', wet: '#dcefff',
      steel: '#a7b4c1', steelDk: '#6d7a85', steelHi: '#d6e0e9',
      dark: '#0b1117', roll: '#14202c', liner: '#b3c8da',
      accent: '#0f8bf5', bottle: '#0d78c8', bottleHi: '#3ba6f2',
      trigger: '#dde9f3', lampBody: '#202c38', lamp: '#e8f2fa',
      cable: '#151c24', tape: '#c3d6e6', rubber: '#1a222b'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.5, 0.78, -0.36], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#0b1016';
    var faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#eaf4ff', (lit - 1) * 0.8)
        : Projection.mix(tone, '#05080b', (1 - lit) * 0.42);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0, al) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.98), [0, 0, 1], t0, al);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.56), [0, 0, -1], t0, al);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.76), [1, 0, 0], t0, al);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.1), [-1, 0, 0], t0, al);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.2), [0, 1, 0], t0, al);
    }
    /* beam between two world points: a genuine 3D member, not a screen line */
    function beam(a, b, w, h, tone, t0, al) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
      var px = -dz, pz = dx, pm = Math.hypot(px, pz) || 1; px /= pm; pz /= pm;
      var hw = w / 2, hh = h / 2;
      function P(t2, p, q) { return [a[0] + dx * L * t2 + px * p, a[1] + dy * L * t2 + q, a[2] + dz * L * t2 + pz * p]; }
      face([P(0, -hw, -hh), P(0, hw, -hh), P(1, hw, -hh), P(1, -hw, -hh)], shade(tone, 0.72), [px, 0, pz], t0, al);
      face([P(0, -hw, hh), P(0, hw, hh), P(1, hw, hh), P(1, -hw, hh)], shade(tone, 1.12), [px, 0, pz], t0, al);
      face([P(0, -hw, hh), P(0, -hw, -hh), P(1, -hw, -hh), P(1, -hw, hh)], shade(tone, 0.94), [dx, 0, dz], t0, al);
      face([P(0, hw, -hh), P(0, hw, hh), P(1, hw, hh), P(1, hw, -hh)], shade(tone, 0.84), [-dx, 0, -dz], t0, al);
    }
    function drum(cx, cy, cz, r, h, seg, tone, t0, capTone) {
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
        var mz = Math.cos((a0 + a1) / 2), mx = Math.sin((a0 + a1) / 2);
        face([[cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r],
              [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r],
              [cx + Math.cos(a1) * r, cy + h, cz + Math.sin(a1) * r],
              [cx + Math.cos(a0) * r, cy + h, cz + Math.sin(a0) * r]],
          shade(tone, 0.72 + 0.46 * Math.max(0, mz)), [mx, 0, mz], t0);
      }
      var top = [], seg2 = 16;
      for (var q = 0; q < seg2; q++) {
        var ang = (q / seg2) * Math.PI * 2;
        top.push([cx + Math.cos(ang) * r, cy + h, cz + Math.sin(ang) * r]);
      }
      face(top, shade(capTone || tone, 1.16), [0, 1, 0], t0 + 0.04);
    }

    /* ---- floor: sealed concrete, wet where the pane drains ---- */
    face([[-13, 0, 0.9], [13, 0, 0.9], [13, 0, 19], [-13, 0, 19]], TONE.floor, [0, 1, 0], 0);
    for (var fz = 18.6; fz > 1.1; fz -= 1.75) {
      var alt = Math.round((18.6 - fz) / 1.75) % 2;
      face([[-13, 0.002, fz], [13, 0.002, fz], [13, 0.002, fz - 1.75], [-13, 0.002, fz - 1.75]],
        alt ? TONE.floor2 : TONE.floor, [0, 1, 0], 0);
    }
    face([[-13, 0.004, 5.6], [13, 0.004, 5.6], [13, 0.004, 6.9], [-13, 0.004, 6.9]], TONE.floorWet, [0, 1, 0], 0.1);

    /* ---- back wall: racked board, strip light, one lit panel ---- */
    var WZ = 9.3;
    for (var by = 0; by < 9; by++) {
      face([[-10, by * 0.34, WZ], [10, by * 0.34, WZ], [10, by * 0.34 + 0.31, WZ], [-10, by * 0.34 + 0.31, WZ]],
        by % 2 ? TONE.wall : TONE.wall2, [0, 0, -1], 0.06 + by * 0.028);
      face([[-10, by * 0.34 + 0.31, WZ - 0.002], [10, by * 0.34 + 0.31, WZ - 0.002],
            [10, by * 0.34 + 0.34, WZ - 0.002], [-10, by * 0.34 + 0.34, WZ - 0.002]], TONE.seam, [0, 0, -1], 0.06 + by * 0.028);
    }
    face([[2.72, 1.2, WZ - 0.004], [4.55, 1.2, WZ - 0.004], [4.55, 2.62, WZ - 0.004], [2.72, 2.62, WZ - 0.004]],
      TONE.boxLit, [0, 0, -1], 0.5);
    box(3.635, 2.62, WZ - 0.02, 1.9, 0.05, 0.06, TONE.alumHi, 0.58);

    /* ---- the pane: blank glass, film laid up to the wet edge ---- */
    var PX0 = 0.45, PX1 = 3.98, PB = 0.36, PH = 2.68, PZ0 = 6.58, PZ1 = 7.52;
    var FILMV = 0.54;
    function pp(u, v) { return [PX0 + u * (PX1 - PX0), PB + v * PH, PZ0 + v * (PZ1 - PZ0)]; }

    /* glass cells: the reflection gradient is per-cell, so it reads as glass */
    var GU = 5, GV = 7;
    for (var gu = 0; gu < GU; gu++) {
      for (var gv = 0; gv < GV; gv++) {
        var u0 = gu / GU, u1 = (gu + 1) / GU, v0 = gv / GV, v1 = (gv + 1) / GV;
        var onFilm = v1 <= FILMV + 0.06;
        var streak = Math.max(0, 1 - Math.abs(u0 - 0.26) * 3.4) + Math.max(0, 1 - Math.abs(u0 - 0.74) * 4.6) * 0.6;
        var tone = onFilm
          ? (v0 > FILMV - 0.1 ? TONE.filmEdge : TONE.film2)
          : (streak > 0.45 ? TONE.glassHi : (v0 > 0.72 ? TONE.glass2 : TONE.glass));
        face([pp(u0, v0), pp(u1, v0), pp(u1, v1), pp(u0, v1)], tone, [-0.16, 0.22, -1], 0.3 + gv * 0.075 + gu * 0.02);
      }
    }
    /* film is darker and flatter than the glass: one sheet over the top of it */
    face([pp(0.012, 0.004), pp(0.988, 0.004), pp(0.988, FILMV), pp(0.012, FILMV)], TONE.film, [-0.16, 0.22, -1], 0.9, 0.55);
    /* wet line, still catching light */
    face([pp(0.004, FILMV), pp(0.996, FILMV), pp(0.996, FILMV + 0.022), pp(0.004, FILMV + 0.022)], TONE.wet, [-0.16, 0.22, -1], 1.05, 0.5);
    /* frame: aluminium up both edges and across the head */
    beam(pp(0, 0), pp(0, 1), 0.075, 0.09, TONE.alum, 0.22);
    beam(pp(1, 0), pp(1, 1), 0.075, 0.09, TONE.alum, 0.24);
    beam(pp(0, 1), pp(1, 1), 0.075, 0.09, TONE.alumDk, 0.28);
    beam(pp(0, 0), pp(1, 0), 0.08, 0.07, TONE.alumDk, 0.2);
    /* tape lap along the frame edge, half pressed */
    beam(pp(0.02, 0.02), pp(0.02, FILMV - 0.04), 0.045, 0.012, TONE.tape, 1.0);
    /* trestles: timber pads, steel legs */
    [[PX0 + 0.42, 1], [PX1 - 0.42, -1]].forEach(function (tr, ti) {
      var tx = tr[0];
      beam([tx - 0.52, 0.86, 6.3], [tx + 0.52, 0.86, 6.35], 0.1, 0.11, TONE.rubber, 0.12 + ti * 0.02);
      beam([tx - 0.44, 0, 5.72], [tx - 0.36, 0.86, 6.28], 0.06, 0.06, TONE.steelDk, 0.1 + ti * 0.02);
      beam([tx + 0.44, 0, 5.72], [tx + 0.36, 0.86, 6.28], 0.06, 0.06, TONE.steelDk, 0.1 + ti * 0.02);
      beam([tx - 0.4, 0.32, 5.86], [tx + 0.4, 0.32, 5.86], 0.05, 0.04, TONE.steel, 0.16 + ti * 0.02);
    });

    /* ---- squeegee, caught on the wet edge ---- */
    (function () {
      var ey = PB + FILMV * PH, ez = PZ0 + FILMV * (PZ1 - PZ0) - 0.06;
      box(5.22, ey - 0.02, ez, 2.02, 0.055, 0.045, TONE.rubber, 1.12);
      box(5.22, ey + 0.03, ez, 2.02, 0.02, 0.05, TONE.accent, 1.14);
      beam([5.86, ey + 0.05, ez - 0.02], [5.34, ey - 0.5, ez - 0.5], 0.062, 0.05, TONE.trigger, 1.2);
      beam([5.34, ey - 0.5, ez - 0.5], [5.26, ey - 0.62, ez - 0.58], 0.05, 0.045, TONE.steelDk, 1.24);
    })();

    /* ---- bench right of frame ---- */
    var BZ0 = 4.28, BZ1 = 5.05, BX0 = 0.28, BX1 = 3.24, BH = 0.92;
    box((BX0 + BX1) / 2, BH, (BZ0 + BZ1) / 2, BX1 - BX0, 0.06, BZ1 - BZ0, TONE.steel, 0.62);
    box((BX0 + BX1) / 2, BH + 0.06, (BZ0 + BZ1) / 2 - 0.02, BX1 - BX0 - 0.1, 0.02, BZ1 - BZ0 - 0.1, TONE.steelHi, 0.68);
    [[BX0 + 0.12, BZ0 + 0.1], [BX1 - 0.12, BZ0 + 0.1], [BX0 + 0.12, BZ1 - 0.1], [BX1 - 0.12, BZ1 - 0.1]].forEach(function (lg) {
      box(lg[0], 0, lg[1], 0.06, BH, 0.06, TONE.steelDk, 0.58);
    });
    /* film roll standing on the bench, liner tail hanging over the edge */
    drum(2.98, BH + 0.08, 4.6, 0.115, 0.56, 16, TONE.roll, 0.86, TONE.roll);
    drum(2.98, BH + 0.08, 4.6, 0.062, 0.575, 12, TONE.dark, 0.92, TONE.dark);
    face([[2.98, BH + 0.08, 4.6], [3.3, BH + 0.05, 4.72], [3.38, BH - 0.5, 4.8], [3.12, BH - 0.48, 4.68]],
      TONE.liner, [0.4, 0.1, 0.6], 1.0, 0.85);
    /* slip solution: bottle with trigger head */
    drum(1.92, BH + 0.02, 4.5, 0.078, 0.24, 14, TONE.bottle, 0.96, TONE.bottleHi);
    box(1.92, BH + 0.26, 4.5, 0.05, 0.09, 0.05, TONE.trigger, 1.04);
    beam([1.92, BH + 0.33, 4.5], [1.74, BH + 0.31, 4.38], 0.05, 0.04, TONE.trigger, 1.08);
    box(2.14, BH + 0.03, 4.78, 0.2, 0.05, 0.22, TONE.dark, 1.1);
    /* heat gun, nose toward the pane */
    box(1.08, BH + 0.05, 4.56, 0.34, 0.15, 0.15, TONE.lampBody, 1.02);
    drum(1.42, BH + 0.08, 4.56, 0.062, 0.16, 12, TONE.steelDk, 1.06, TONE.dark);
    box(1.02, BH + 0.2, 4.56, 0.11, 0.16, 0.1, TONE.steelDk, 1.08);
    /* knife and a folded blade strip on the bench end */
    box(3.4, BH + 0.06, 4.44, 0.26, 0.03, 0.05, TONE.trigger, 1.12);
    box(3.26, BH + 0.06, 4.44, 0.1, 0.032, 0.055, TONE.accent, 1.14);

    /* ---- work lamp on a stand, throwing a cone across the pane ---- */
    (function () {
      var lx = -0.18, lz = 5.15;
      drum(lx, 0, lz, 0.19, 0.045, 14, TONE.steelDk, 0.9, TONE.steelDk);
      beam([lx, 0.04, lz], [lx + 0.02, 2.18, lz], 0.045, 0.045, TONE.steelDk, 0.94);
      beam([lx + 0.02, 2.16, lz], [lx + 0.46, 2.26, lz - 0.14], 0.04, 0.04, TONE.steel, 0.98);
      box(lx + 0.56, 2.17, lz - 0.18, 0.16, 0.19, 0.1, TONE.lampBody, 1.0);
      face([[lx + 0.68, 2.18, lz - 0.24], [lx + 0.68, 2.18, lz - 0.16],
            [lx + 0.68, 2.32, lz - 0.16], [lx + 0.68, 2.32, lz - 0.24]], TONE.lamp, [1, 0, 0], 1.04);
      /* the cone: three translucent shells, bench to pane */
      [[1.15, 6.9], [1.85, 7.05], [2.4, 7.2]].forEach(function (cn, ci) {
        face([[lx + 0.7, 2.3, lz - 0.2], [cn[0], 0.36, cn[1] + 5.9], [cn[0] + 0.5, 0.36, cn[1] + 6.4],
              [lx + 0.7, 2.24, lz - 0.16]], '#cfe6ff', [0.6, 0.2, -0.6], 1.1 + ci * 0.05, 0.055);
      });
    })();

    /* ---- overhead tube and its spill ---- */
    beam([-1.6, 3.46, 5.1], [4.2, 3.46, 5.1], 0.14, 0.06, TONE.lampBody, 0.8);
    face([[-1.5, 3.44, 5.12], [4.1, 3.44, 5.12], [4.1, 3.44, 5.2], [-1.5, 3.44, 5.2]], TONE.lamp, [0, -1, 0], 0.84, 0.95);

    /* ---- a second pane lying flat-left on trestles, just edge-lit ---- */
    (function () {
      var lx0 = -2.3, lx1 = 0.5, lz0 = 2.05, lz1 = 2.85;
      face([[lx0, 0.86, lz1], [lx1, 0.86, lz1], [lx1, 0.86, lz0], [lx0, 0.86, lz0]], TONE.glass, [0, 1, 0], 0.7);
      face([[lx0, 0.862, lz1], [lx1, 0.862, lz0 + 0.2], [lx1, 0.862, lz0 + 0.12], [lx0, 0.862, lz1 - 0.3]], TONE.glassHi, [0, 1, 0], 0.78, 0.5);
      beam([lx0, 0.86, lz1], [lx1, 0.86, lz1], 0.06, 0.06, TONE.alum, 0.72);
      beam([lx0, 0.86, lz0], [lx1, 0.86, lz0], 0.06, 0.06, TONE.alumDk, 0.74);
      [[lx0 + 0.4], [lx1 - 0.4]].forEach(function (tx2) {
        beam([tx2[0] - 0.3, 0, 2.35], [tx2[0] - 0.3, 0.86, 2.35], 0.05, 0.05, TONE.steelDk, 0.66);
        beam([tx2[0] + 0.3, 0, 2.9], [tx2[0] + 0.3, 0.86, 2.9], 0.05, 0.05, TONE.steelDk, 0.66);
      });
    })();

    /* ---- droplets running off the wet line ---- */
    var drops = [], seed = 90210;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    for (var d = 0; d < 46; d++) {
      drops.push({ u: 0.03 + rnd() * 0.94, v: FILMV + rnd() * 0.44, s: 0.9 + rnd() * 2.1, p: rnd() * 6.283 });
    }

    return {
      duration: 2.1,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        S.yaw = Projection.reduced() ? 0 : Math.sin(time * 0.07) * 0.016;
        var c = S.ctx;

        var sky = c.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#080c11');
        sky.addColorStop(0.5, '#0e151d');
        sky.addColorStop(1, '#141d26');
        c.fillStyle = sky; c.fillRect(0, 0, S.W, S.H);

        var glow = c.createRadialGradient(S.W * 0.7, S.horizon * 0.78, 0, S.W * 0.7, S.horizon * 0.78, S.W * 0.7);
        glow.addColorStop(0, 'rgba(112,180,244,0.32)');
        glow.addColorStop(0.5, 'rgba(70,136,206,0.13)');
        glow.addColorStop(1, 'rgba(40,90,150,0)');
        c.fillStyle = glow; c.fillRect(0, 0, S.W, S.H);

        var list = [], i, p, pts, sum, mapped, miss;
        for (i = 0; i < faces.length; i++) {
          var f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (var q = 0; q < f.pts.length; q++) {
            p = S.project(f.pts[q][0], f.pts[q][1], f.pts[q][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss || !mapped.length) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var dif = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          var dz = sum / mapped.length;
          list.push({
            pts: mapped, dz: dz,
            fill: Projection.mix(shade(f.tone, 0.8 + 0.75 * Math.max(0, dif)), FOG, S.fog(dz) * 0.5),
            a: Math.min(1, (t - f.t0) / 0.42) * f.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          if (it.a <= 0.02) continue;
          c.globalAlpha = it.a;
          c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) c.lineTo(pts[j][0], pts[j][1]);
          c.closePath(); c.fillStyle = it.fill; c.fill();
        }
        c.globalAlpha = 1;

        /* contact shading: floor under the bench and the trestles */
        [[1.9, 4.7, 1.6, 0.5], [1.1, 6.0, 1.0, 0.45], [3.5, 6.0, 1.0, 0.45], [-0.2, 5.1, 0.5, 0.4]].forEach(function (sh) {
          var sp = S.project(sh[0], 0.006, sh[1]);
          if (!sp) return;
          var rr = S.focal / sp[2] * sh[2];
          var sg = c.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], rr);
          sg.addColorStop(0, 'rgba(6,10,14,' + sh[3] + ')');
          sg.addColorStop(1, 'rgba(6,10,14,0)');
          c.save(); c.translate(sp[0], sp[1]); c.scale(1, 0.32); c.translate(-sp[0], -sp[1]);
          c.fillStyle = sg; c.beginPath(); c.arc(sp[0], sp[1], rr, 0, 6.2832); c.fill(); c.restore();
        });

        /* specular streaks down the glass: what makes a pane read as glass */
        [[0.2, 0.02], [0.34, 0.05], [0.62, 0.03], [0.79, 0.02]].forEach(function (sp2) {
          var s1 = S.project(PX0 + sp2[0] * (PX1 - PX0), PB, PZ0);
          var s2 = S.project(PX0 + (sp2[0] + 0.09) * (PX1 - PX0), PB + PH, PZ1);
          if (!s1 || !s2) return;
          var gg = c.createLinearGradient(s1[0], s1[1], s2[0], s2[1]);
          gg.addColorStop(0, 'rgba(214,238,255,' + sp2[1].toFixed(3) + ')');
          gg.addColorStop(0.4, 'rgba(214,238,255,' + (sp2[1] * 1.9).toFixed(3) + ')');
          gg.addColorStop(1, 'rgba(214,238,255,' + (sp2[1] * 0.5).toFixed(3) + ')');
          c.fillStyle = gg; c.beginPath();
          c.moveTo(s1[0], s1[1]); c.lineTo(s2[0], s2[1]);
          c.lineTo(s2[0] + 7, s2[1]); c.lineTo(s1[0] + 9, s1[1]);
          c.closePath(); c.fill();
        });

        /* lamp pool on the floor: the bay light is on */
        (function () {
          var fp = S.project(1.1, 0.008, 5.4);
          if (!fp) return;
          var fr = S.focal / fp[2] * 2.4;
          var fg2 = c.createRadialGradient(fp[0], fp[1], 0, fp[0], fp[1], fr);
          fg2.addColorStop(0, 'rgba(176,214,248,0.16)');
          fg2.addColorStop(0.55, 'rgba(150,196,238,0.06)');
          fg2.addColorStop(1, 'rgba(150,196,238,0)');
          c.save(); c.translate(fp[0], fp[1]); c.scale(1, 0.34); c.translate(-fp[0], -fp[1]);
          c.fillStyle = fg2; c.beginPath(); c.arc(fp[0], fp[1], fr, 0, 6.2832); c.fill(); c.restore();
        })();

        /* wet glare down the film, and the lamp pool on the pane */
        if (t > 1.0) {
          var wk = Math.min(1, (t - 1.0) / 0.7);
          var g1 = S.project(1.85, PB + 0.05, 6.62), g2 = S.project(2.5, PB + FILMV * PH, 7.2);
          if (g1 && g2) {
            var wg = c.createLinearGradient(g1[0], g1[1], g2[0], g2[1]);
            wg.addColorStop(0, 'rgba(186,224,255,0.02)');
            wg.addColorStop(1, 'rgba(186,224,255,' + (0.16 * wk).toFixed(3) + ')');
            c.fillStyle = wg;
            c.beginPath(); c.moveTo(g1[0], g1[1]); c.lineTo(g2[0], g2[1]);
            c.lineTo(g2[0] + 44, g2[1] + 10); c.lineTo(g1[0] + 18, g1[1] + 4);
            c.closePath(); c.fill();
          }
          var lp = S.project(2.6, 1.66, 7.2);
          if (lp) {
            var lg = c.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], S.focal / lp[2] * 1.5);
            lg.addColorStop(0, 'rgba(196,228,255,' + (0.13 * wk).toFixed(3) + ')');
            lg.addColorStop(1, 'rgba(196,228,255,0)');
            c.fillStyle = lg; c.fillRect(0, 0, S.W, S.H);
          }
        }

        /* droplets: beads tracking the wet line, sliding once the film is down */
        if (t > 1.02) {
          for (i = 0; i < drops.length; i++) {
            var dr = drops[i];
            var slide = Projection.reduced() ? 0 : ((time * 0.05 + dr.p * 0.1) % 0.22);
            var dp = S.project(PX0 + dr.u * (PX1 - PX0), PB + (dr.v - slide) * PH, PZ0 + (dr.v - slide) * (PZ1 - PZ0) - 0.03);
            if (!dp) continue;
            var da = 0.5 * (1 - S.fog(dp[2]));
            c.fillStyle = 'rgba(214,238,255,' + da.toFixed(3) + ')';
            c.beginPath(); c.arc(dp[0], dp[1], dr.s * (S.focal / dp[2]) * 0.012, 0, 6.2832); c.fill();
          }
        }

        /* bench dust in the tube light */
        if (!Projection.reduced()) {
          for (i = 0; i < 18; i++) {
            var ph = ((time * 0.06 + i * 0.071) % 1);
            var mp = S.project(0.8 + Math.sin(time * 0.2 + i) * 1.6 + (i % 5) * 1.2, 0.15 + ph * 2.9, 3.4 + (i % 4) * 0.9);
            if (!mp) continue;
            c.fillStyle = 'rgba(206,230,250,' + ((1 - ph) * 0.15).toFixed(3) + ')';
            c.beginPath(); c.arc(mp[0], mp[1], 1.1, 0, 6.2832); c.fill();
          }
        }

        /* grade: hold the left third for the copy, settle the ends */
        var sc = c.createLinearGradient(0, 0, S.W * 0.66, S.H * 0.2);
        sc.addColorStop(0, 'rgba(8,12,17,0.9)');
        sc.addColorStop(0.46, 'rgba(8,12,17,0.48)');
        sc.addColorStop(1, 'rgba(8,12,17,0.02)');
        c.fillStyle = sc; c.fillRect(0, 0, S.W, S.H);
        var topH = S.H * 0.2;
        var tb = c.createLinearGradient(0, 0, 0, topH);
        tb.addColorStop(0, 'rgba(8,12,17,0.7)'); tb.addColorStop(1, 'rgba(8,12,17,0)');
        c.fillStyle = tb; c.fillRect(0, 0, S.W, topH);
        var bt = c.createLinearGradient(0, S.H * 0.72, 0, S.H);
        bt.addColorStop(0, 'rgba(8,12,17,0)'); bt.addColorStop(1, 'rgba(8,12,17,0.68)');
        c.fillStyle = bt; c.fillRect(0, S.H * 0.72, S.W, S.H * 0.28);
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * scenePhoneRepair — FixMy iPhone. A phone face-up in the repair jig,
   * back plate prised off, screws laid in a tray, its glass pane standing
   * off the chassis on a suction cup; spudger, tweezers and driver in the
   * near field on the anti-static mat. World-space faces through one
   * projection, sorted far-to-near, so occlusion and fog come from maths.
   * ------------------------------------------------------------------ */
  Projection.scenePhoneRepair = function (S, o) {
    o = o || {};
    var TONE = {
      bench: '#3a2c24', bench2: '#312520', grain: '#2a1f1a', benchEdge: '#201812',
      wall: '#241d1b', wall2: '#2c2320', peg: '#1a1513',
      mat: '#1f2a31', mat2: '#26333b', matEdge: '#141b20',
      steel: '#b0b7bd', steelDk: '#6c757d', steelHi: '#dde3e8',
      alu: '#9aa1a7', aluDk: '#5e656b', aluHi: '#c6ccd1',
      glass: '#0f1a24', glass2: '#17293a', glassHi: '#6f9dbe', glassEdge: '#33404b',
      board: '#1d3a2c', board2: '#24503a', ribbon: '#b9873f', cell: '#22262b',
      cellLbl: '#c07818', screw: '#c9a25e', tray: '#8d949a',
      accent: '#c07818', accentDk: '#8e5510',
      lampBody: '#2b2422', lamp: '#ffe6bf', cable: '#191d21',
      rubber: '#141719', tweez: '#ced5da'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.48, 0.8, -0.36], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#120e0c';
    var faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#fff3e0', (lit - 1) * 0.72)
        : Projection.mix(tone, '#0a0706', (1 - lit) * 0.46);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0, al) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.98), [0, 0, 1], t0, al);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.56), [0, 0, -1], t0, al);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.76), [1, 0, 0], t0, al);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.1), [-1, 0, 0], t0, al);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.2), [0, 1, 0], t0, al);
    }
    /* beam between two world points: a real 3D member, not a screen line */
    function beam(a, b, w, h, tone, t0, al) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
      var px = -dz, pz = dx, pm = Math.hypot(px, pz) || 1; px /= pm; pz /= pm;
      var hw = w / 2, hh = h / 2;
      function P(t2, p, q) { return [a[0] + dx * L * t2 + px * p, a[1] + dy * L * t2 + q, a[2] + dz * L * t2 + pz * p]; }
      face([P(0, -hw, -hh), P(0, hw, -hh), P(1, hw, -hh), P(1, -hw, -hh)], shade(tone, 0.72), [px, 0, pz], t0, al);
      face([P(0, -hw, hh), P(0, hw, hh), P(1, hw, hh), P(1, -hw, hh)], shade(tone, 1.12), [px, 0, pz], t0, al);
      face([P(0, -hw, hh), P(0, -hw, -hh), P(1, -hw, -hh), P(1, -hw, hh)], shade(tone, 0.94), [dx, 0, dz], t0, al);
      face([P(0, hw, -hh), P(0, hw, hh), P(1, hw, hh), P(1, hw, -hh)], shade(tone, 0.84), [-dx, 0, -dz], t0, al);
    }
    /* disc lying flat, or standing on edge — screws, cups, knobs */
    function disc(cx, cy, cz, r, seg, tone, t0, al) {
      var ring = [];
      for (var s = 0; s < seg; s++) {
        var an = (s / seg) * 6.2832;
        ring.push([cx + Math.cos(an) * r, cy, cz + Math.sin(an) * r]);
      }
      face(ring, shade(tone, 1.16), [0, 1, 0], t0, al);
    }

    /* ---- bench: sealed timber, matting in the working zone ---- */
    face([[-7, 0, 0.55], [7, 0, 0.55], [7, 0, 10], [-7, 0, 10]], TONE.bench, [0, 1, 0], 0);
    for (var bz = 9.7; bz > 0.6; bz -= 0.62) {
      face([[-7, 0.001, bz], [7, 0.001, bz], [7, 0.001, bz - 0.30], [-7, 0.001, bz - 0.30]],
        Math.round(bz * 10) % 2 ? TONE.bench2 : TONE.grain, [0, 1, 0], 0, 0.9);
    }
    /* anti-static mat under the jig, with a stitched edge */
    face([[-2.9, 0.004, 2.1], [2.9, 0.004, 2.1], [2.9, 0.004, 7.0], [-2.9, 0.004, 7.0]], TONE.mat, [0, 1, 0], 0.05);
    for (var gx = -2.9; gx < 2.9; gx += 0.46) {
      face([[gx, 0.006, 2.1], [gx + 0.22, 0.006, 2.1], [gx + 0.22, 0.006, 7.0], [gx, 0.006, 7.0]],
        TONE.mat2, [0, 1, 0], 0.06, 0.55);
    }
    face([[-2.9, 0.008, 2.1], [2.9, 0.008, 2.1], [2.9, 0.008, 2.16], [-2.9, 0.008, 2.16]], TONE.matEdge, [0, 1, 0], 0.08);

    /* ---- back wall: pegboard, tool silhouettes, one lit pane ---- */
    var WZ = 9.4;
    for (var wy = 0; wy < 12; wy++) {
      face([[-7, wy * 0.30, WZ], [7, wy * 0.30, WZ], [7, wy * 0.30 + 0.27, WZ], [-7, wy * 0.30 + 0.27, WZ]],
        wy % 2 ? TONE.wall : TONE.wall2, [0, 0, -1], 0.04 + wy * 0.02);
    }
    for (var px = -5.4; px < 5.6; px += 0.34) {
      for (var py = 0.5; py < 3.1; py += 0.34) {
        disc(px, py === 0.5 ? 0.001 : 0.001, WZ, 0.02, 5, TONE.peg, 0.1);
      }
    }
    /* tools hanging: long driver, side cutters, a roll of tape */
    beam([-2.35, 2.66, WZ - 0.02], [-2.28, 1.5, WZ - 0.02], 0.11, 0.05, TONE.steelDk, 0.3);
    box(-2.35, 2.72, WZ - 0.02, 0.28, 0.1, 0.05, TONE.accent, 0.28);
    beam([-1.62, 2.6, WZ - 0.02], [-1.86, 1.86, WZ - 0.02], 0.06, 0.09, TONE.steelDk, 0.34);
    beam([-1.62, 2.6, WZ - 0.02], [-1.44, 1.9, WZ - 0.02], 0.06, 0.09, TONE.steelDk, 0.35);
    box(1.95, 2.28, WZ - 0.02, 0.3, 0.3, 0.09, TONE.rubber, 0.4);
    box(1.95, 2.44, WZ - 0.02, 0.16, 0.06, 0.1, TONE.accent, 0.42);
    /* lit inspection card pinned to the board */
    face([[-0.62, 1.86, WZ - 0.01], [0.62, 1.86, WZ - 0.01], [0.62, 2.74, WZ - 0.01], [-0.62, 2.74, WZ - 0.01]],
      '#cfc3ad', [0, 0, -1], 0.46);
    for (var cy2 = 0; cy2 < 4; cy2++) {
      face([[-0.48, 2.5 - cy2 * 0.15, WZ - 0.02], [0.42, 2.5 - cy2 * 0.15, WZ - 0.02],
            [0.42, 2.44 - cy2 * 0.15, WZ - 0.02], [-0.48, 2.44 - cy2 * 0.15, WZ - 0.02]],
        '#8e8371', [0, 0, -1], 0.5);
    }
    /* bench lamp on an arm, head over the jig */
    box(-3.35, 0, 7.6, 0.42, 0.1, 0.42, TONE.lampBody, 0.2);
    beam([-3.35, 0.1, 7.6], [-2.95, 2.5, 6.9], 0.09, 0.09, TONE.lampBody, 0.24);
    beam([-2.95, 2.5, 6.9], [-1.15, 2.86, 5.3], 0.08, 0.08, TONE.lampBody, 0.3);
    drumHead();
    function drumHead() {
      for (var s = 0; s < 12; s++) {
        var a0 = (s / 12) * 6.2832, a1 = ((s + 1) / 12) * 6.2832;
        var mx = Math.cos((a0 + a1) / 2), mz = Math.sin((a0 + a1) / 2);
        face([[-1.15 + Math.cos(a0) * 0.34, 2.72, 5.3 + Math.sin(a0) * 0.34],
              [-1.15 + Math.cos(a1) * 0.34, 2.72, 5.3 + Math.sin(a1) * 0.34],
              [-1.15 + Math.cos(a1) * 0.30, 2.52, 5.3 + Math.sin(a1) * 0.30],
              [-1.15 + Math.cos(a0) * 0.30, 2.52, 5.3 + Math.sin(a0) * 0.30]],
          shade(TONE.lampBody, 0.9), [mx, 0.2, mz], 0.34);
      }
      disc(-1.15, 2.525, 5.3, 0.3, 12, TONE.lamp, 0.38);
    }

    /* ---- the jig: a phone face-up, battery bay open ---- */
    var PX = 0.55, PZ = 4.45, PW = 1.58, PD = 2.98, PT = 0.11;
    placeJig();

    function placeJig() {
      /* jig bed: padded aluminium cradle under the phone */
      box(PX, 0, PZ, PW + 0.72, 0.07, PD + 0.7, TONE.alu, 0.5);
      box(PX, 0.07, PZ, PW + 0.5, 0.02, PD + 0.5, TONE.rubber, 0.52);
      /* chassis shell */
      box(PX, 0.09, PZ, PW, PT, PD, TONE.alu, 0.62);
      /* inner bed: board green, shield cans, cell */
      face([[PX - PW / 2 + 0.06, 0.2, PZ + PD / 2 - 0.06], [PX + PW / 2 - 0.06, 0.2, PZ + PD / 2 - 0.06],
            [PX + PW / 2 - 0.06, 0.2, PZ - PD / 2 + 0.06], [PX - PW / 2 + 0.06, 0.2, PZ - PD / 2 + 0.06]],
        TONE.board, [0, 1, 0], 0.7);
      for (var sb = 0; sb < 3; sb++) {
        face([[PX - 0.52 + sb * 0.5, 0.205, PZ + 0.62], [PX - 0.2 + sb * 0.5, 0.205, PZ + 0.62],
              [PX - 0.2 + sb * 0.5, 0.205, PZ + 0.28], [PX - 0.52 + sb * 0.5, 0.205, PZ + 0.28]],
          TONE.board2, [0, 1, 0], 0.74);
      }
      /* battery cell, still seated, orange tab */
      box(PX, 0.205, PZ - 0.44, 1.06, 0.16, 1.1, TONE.cell, 0.84);
      box(PX, 0.365, PZ - 0.44, 1.06, 0.012, 0.24, TONE.cellLbl, 0.9);
      /* ribbon cable folded out of the bay */
      beam([PX + 0.44, 0.23, PZ - 0.9], [PX + 0.84, 0.19, PZ - 1.26], 0.16, 0.012, TONE.ribbon, 0.94);
      /* corner screws, four of them, two still in the shell */
      [[-0.62, 1.14], [0.62, 1.14], [-0.62, -1.14], [0.62, -1.14]].forEach(function (c, ci) {
        disc(PX + c[0], 0.2, PZ + c[1], 0.05, 8, TONE.screw, 0.98 + ci * 0.02);
        disc(PX + c[0], 0.203, PZ + c[1], 0.022, 6, TONE.steelDk, 1.0 + ci * 0.02);
      });
      /* the glass pane: standing off the chassis on a suction cup, tipped back */
      var LX = PX, LZ = PZ - 1.62, LB = 0.42, LH = 1.74, LW = 1.56, TILT = 0.30;
      function gp(u, v) { return [LX + (u - 0.5) * LW, LB + v * LH, LZ + v * TILT]; }
      var GU = 4, GV = 6;
      for (var gu = 0; gu < GU; gu++) {
        for (var gv = 0; gv < GV; gv++) {
          var u0 = gu / GU, u1 = (gu + 1) / GU, v0 = gv / GV, v1 = (gv + 1) / GV;
          var streak = Math.max(0, 1 - Math.abs(u0 - 0.26) * 2.5) + Math.max(0, 1 - Math.abs(u0 - 0.68) * 3.2) * 0.7;
          var tone = streak > 0.45 ? TONE.glassHi : (streak > 0.2 ? TONE.glass2 : (v0 > 0.7 ? TONE.glassEdge : TONE.glass));
          face([gp(u0, v0), gp(u1, v0), gp(u1, v1), gp(u0, v1)], tone, [-0.12, 0.26, -1], 0.44 + gv * 0.06 + gu * 0.02);
        }
      }
      /* impact star: a hit low-right, splinters fanning out, bright at the core */
      (function () {
        var cx0 = 0.63, cy0 = 0.36;
        disc(gp(cx0, cy0)[0], gp(cx0, cy0)[1] + 0.004, gp(cx0, cy0)[2] - 0.006, 0.085, 10, TONE.glassHi, 1.3);
        var rays = [[0.02, 0.99], [0.03, 0.72], [-0.55, 0.86], [0.98, 0.9], [0.99, 0.53], [0.74, 0.02], [0.99, 0.14], [-0.02, 0.42]];
        for (var r2 = 0; r2 < rays.length; r2++) {
          var ax = cx0 + (rays[r2][0] - cx0) * 0.92, ay = cy0 + (rays[r2][1] - cy0) * 0.92;
          face([gp(cx0, cy0), gp(ax, ay), gp(ax, ay - 0.012), gp(cx0, cy0 - 0.012)], TONE.glassHi, [-0.12, 0.26, -1], 1.12 + r2 * 0.02, 0.75);
        }
        /* concentric arcs around the impact */
        for (var r3 = 1; r3 <= 3; r3++) {
          var rad = r3 * 0.07;
          var ring = [];
          for (var a2 = 0; a2 < 14; a2++) {
            var an2 = (a2 / 14) * 6.2832 + 0.3;
            ring.push(gp(cx0 + Math.cos(an2) * rad, cy0 + Math.sin(an2) * rad * 1.25));
          }
          face(ring, TONE.glassHi, [-0.12, 0.26, -1], 1.2 + r3 * 0.04, 0.3);
        }
      })();
      /* pane edge: the cut glass reads as thickness */
      face([gp(0, 0), gp(1, 0), gp(1, 0.012), gp(0, 0.012)], TONE.glassEdge, [0, 1, 0], 0.5);
      /* suction cup on the glass, handle bar back toward the bench */
      disc(LX + 0.02, LB + 0.72, LZ + 0.72 * TILT - 0.02, 0.14, 12, TONE.accentDk, 1.1);
      disc(LX + 0.02, LB + 0.72, LZ + 0.72 * TILT - 0.021, 0.1, 12, TONE.accent, 1.12);
      beam([LX + 0.02, LB + 0.72, LZ + 0.72 * TILT - 0.02], [LX + 0.02, LB + 0.44, LZ + 0.72 * TILT - 0.42],
        0.05, 0.05, TONE.steel, 1.16);
      beam([LX + 0.02, LB + 0.44, LZ + 0.72 * TILT - 0.42], [LX + 0.02, 0.16, LZ + 0.9], 0.04, 0.04, TONE.steelDk, 1.2);
      /* prop under the pane's lower edge so it does not fall */
      box(LX - 0.5, 0, LZ + 0.06, 0.24, LB - 0.02, 0.2, TONE.rubber, 0.56);
      box(LX + 0.5, 0, LZ + 0.06, 0.24, LB - 0.02, 0.2, TONE.rubber, 0.58);
    }

    /* ---- near field: the tools actually in play ---- */
    /* spudger, tip still under the bay edge */
    beam([1.5, 0.03, 3.5], [2.35, 0.03, 3.14], 0.09, 0.045, TONE.rubber, 1.24);
    box(1.44, 0.03, 3.52, 0.18, 0.045, 0.09, TONE.accent, 1.26);
    /* tweezers, open */
    beam([1.72, 0.02, 2.62], [2.42, 0.02, 2.24], 0.035, 0.03, TONE.tweez, 1.3);
    beam([1.78, 0.02, 2.74], [2.46, 0.02, 2.36], 0.035, 0.03, TONE.tweez, 1.32);
    /* precision driver, orange handle */
    beam([-1.62, 0.05, 2.5], [-0.66, 0.05, 2.02], 0.16, 0.16, TONE.accent, 1.36);
    beam([-0.66, 0.05, 2.02], [-0.34, 0.05, 1.88], 0.05, 0.05, TONE.steelHi, 1.4);
    disc(-1.72, 0.05, 2.55, 0.1, 10, TONE.accentDk, 1.38);
    /* screw tray: four screws, one lying loose on the mat */
    box(-1.86, 0, 3.86, 0.92, 0.05, 0.62, TONE.tray, 1.44);
    box(-1.86, 0.05, 3.86, 0.8, 0.02, 0.5, TONE.steelDk, 1.46);
    [[-2.14, 3.98], [-1.94, 4.12], [-1.6, 3.96], [-1.78, 3.74]].forEach(function (s2, si) {
      disc(s2[0], 0.07, s2[1], 0.045, 8, TONE.screw, 1.5 + si * 0.02);
    });
    disc(-2.5, 0.012, 3.2, 0.045, 8, TONE.screw, 1.58);
    /* pick and roll of adhesive strip */
    beam([2.3, 0.01, 4.5], [2.86, 0.01, 4.14], 0.03, 0.02, TONE.steelHi, 1.62);
    box(-2.6, 0, 4.6, 0.8, 0.06, 0.34, TONE.cell, 1.6);
    /* the removed back plate, leaning on the mat edge */
    box(2.55, 0, 5.5, 1.4, 0.06, 2.6, TONE.aluDk, 1.5);
    disc(2.55, 0.062, 5.5, 0.16, 10, TONE.rubber, 1.52);
    /* cable coil slipping off the bench at the right */
    beam([3.4, 0.02, 6.4], [4.3, 0.02, 5.2], 0.05, 0.04, TONE.cable, 1.66);

    function render(t) {
      var tt = Projection.reduced() ? 99 : t;
      S.camX = (Projection.reduced() ? 0 : Math.sin(tt * 0.08) * 0.12) - 0.12;
      S.camY = 1.34 + (Projection.reduced() ? 0 : Math.sin(tt * 0.11) * 0.02);
      S.yaw = Projection.reduced() ? 0 : Math.sin(tt * 0.06) * 0.024;

      var ctx = S.ctx, W = S.W, H = S.H;
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#100c0a');
      bg.addColorStop(0.55, '#191311');
      bg.addColorStop(1, '#221a15');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      var list = [], p, q2, pts, sum, mapped, miss, f2, ii;
      for (ii = 0; ii < faces.length; ii++) {
        f2 = faces[ii];
        if (tt < f2.t0) continue;
        mapped = []; sum = 0; miss = false;
        for (q2 = 0; q2 < f2.pts.length; q2++) {
          p = S.project(f2.pts[q2][0], f2.pts[q2][1], f2.pts[q2][2]);
          if (!p) { miss = true; break; }
          mapped.push(p); sum += p[2];
        }
        if (miss) continue;
        var n = f2.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
        var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
        var dz = sum / mapped.length;
        list.push({
          pts: mapped, dz: dz,
          fill: Projection.mix(shade(f2.tone, 0.8 + 0.68 * Math.max(0, d)), FOG, S.fog(dz) * 0.6),
          a: Math.min(1, (tt - f2.t0) / 0.42) * f2.a
        });
      }
      list.sort(function (a, b) { return b.dz - a.dz; });
      for (ii = 0; ii < list.length; ii++) {
        var it = list[ii]; pts = it.pts;
        if (it.a <= 0.015) continue;
        ctx.globalAlpha = it.a;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var jj = 1; jj < pts.length; jj++) ctx.lineTo(pts[jj][0], pts[jj][1]);
        ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* lamp pool on the bench and the mat */
      var lp = S.project(-1.15, 0.01, 5.0);
      if (lp) {
        var lr = S.focal / lp[2] * 3.0;
        var lg = ctx.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], lr);
        lg.addColorStop(0, 'rgba(255,226,178,0.20)');
        lg.addColorStop(0.5, 'rgba(255,214,150,0.07)');
        lg.addColorStop(1, 'rgba(255,206,140,0)');
        ctx.save(); ctx.translate(lp[0], lp[1]); ctx.scale(1, 0.42); ctx.translate(-lp[0], -lp[1]);
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lp[0], lp[1], lr, 0, 6.2832); ctx.fill(); ctx.restore();
      }
      /* glare sliding down the glass */
      var gp1 = S.project(0.2, 1.1, 3.2), gp2 = S.project(0.62, 2.0, 3.35);
      if (gp1 && gp2) {
        var gg = ctx.createLinearGradient(gp1[0], gp1[1], gp2[0], gp2[1]);
        gg.addColorStop(0, 'rgba(188,224,255,0.02)');
        gg.addColorStop(0.45, 'rgba(188,224,255,0.16)');
        gg.addColorStop(1, 'rgba(188,224,255,0.02)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.moveTo(gp1[0], gp1[1]); ctx.lineTo(gp2[0], gp2[1]);
        ctx.lineTo(gp2[0] + 9, gp2[1]); ctx.lineTo(gp1[0] + 13, gp1[1]);
        ctx.closePath(); ctx.fill();
      }
      /* solder smoke / bench dust drifting through the lamp beam */
      if (!Projection.reduced()) {
        for (var i = 0; i < 16; i++) {
          var ph = ((tt * 0.05 + i * 0.073) % 1);
          var mp = S.project(-0.9 + Math.sin(tt * 0.2 + i) * 1.5 + (i % 5) * 0.8, 0.35 + ph * 2.1, 3.2 + (i % 4) * 0.8);
          if (!mp) continue;
          ctx.fillStyle = 'rgba(255,236,205,' + ((1 - ph) * 0.16).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(mp[0], mp[1], 1.3 * (1 - ph) + 0.4, 0, 6.2832); ctx.fill();
        }
      }
      /* grade: settle the top, darken the foot for the caption */
      var tb = ctx.createLinearGradient(0, 0, 0, H * 0.26);
      tb.addColorStop(0, 'rgba(12,9,7,0.62)'); tb.addColorStop(1, 'rgba(12,9,7,0)');
      ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H * 0.26);
      var bt = ctx.createLinearGradient(0, H * 0.72, 0, H);
      bt.addColorStop(0, 'rgba(12,9,7,0)'); bt.addColorStop(1, 'rgba(12,9,7,0.78)');
      ctx.fillStyle = bt; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.48, Math.min(W, H) * 0.34, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,6,5,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    return { duration: 2.6, render: render };
  };

  /* ------------------------------------------------------------------ *
   * sceneVicWelding — Vic Welding. A fabrication bay in depth: steel
   * bench running away from the camera, a lapped plate joint clamped
   * square, a fresh bead run with the arc still burning at the live end,
   * spatter, rod stubs, wire brush, offcut stack, racked sections behind.
   * Same contract as the other scenes: world-space faces, one projection,
   * far-to-near sort. The bead is the reason the arc exists.
   * ------------------------------------------------------------------ */
  Projection.sceneVicWelding = function (S, o) {
    o = o || {};
    var TONE = {
      floor: '#20242a', floor2: '#252a30', line: '#8b6a1f',
      wall: '#191e24', wall2: '#20262d', column: '#2c333a', rack: '#333b43',
      bench: '#4a525a', benchHi: '#68727b', benchEdge: '#2f353b', leg: '#39414a',
      plate: '#5b656e', plateHi: '#7d8891', plateRust: '#7c5636', plateDark: '#3f474e',
      bead: '#b9c2c8', beadHot: '#f07800', beadWhite: '#ffe6c2', beadCool: '#7c858c',
      clamp: '#3d444b', clampHi: '#5a636b', handle: '#c96806',
      torch: '#23282e', torchHi: '#3b434a', shroud: '#f07800', nozzle: '#8e979e',
      brush: '#2b3036', bristle: '#9aa4ab', cable: '#1b1f24',
      offcut: '#525c65', door: '#2a3038', spark: '#ffc471'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.44, 0.82, -0.36], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#12161b';
    var faces = [];
    var BENCH_Y = 0.92, SEAM_Z = 3.62, ARC = [0.46, 1.0, 3.62];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.55)
        : Projection.mix(tone, '#080a0d', (1 - lit) * 0.72);
    }

    function face(pts, tone, n, t0, a) {
      if (t0 == null) t0 = 0;
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0, a: a == null ? 1 : a });
    }

    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.95), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.6), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.8), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.05), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.18), [0, 1, 0], t0);
    }

    function tube(ax, ay, az, bx, by, bz, r, tone, t0, seg) {
      var dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
      dx /= L; dy /= L; dz /= L;
      var ux = -dz, uz = dx, um = Math.hypot(ux, uz) || 1; ux /= um; uz /= um;
      var vx = dy * uz, vy = dz * ux - dx * uz, vz = -dy * ux;
      seg = seg || 8;
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * 6.2832, a1 = ((s + 1) / seg) * 6.2832;
        var o0x = ux * Math.cos(a0) + vx * Math.sin(a0), o0y = vy * Math.sin(a0), o0z = uz * Math.cos(a0) + vz * Math.sin(a0);
        var o1x = ux * Math.cos(a1) + vx * Math.sin(a1), o1y = vy * Math.sin(a1), o1z = uz * Math.cos(a1) + vz * Math.sin(a1);
        face([[ax + o0x * r, ay + o0y * r, az + o0z * r], [ax + o1x * r, ay + o1y * r, az + o1z * r],
              [bx + o1x * r, by + o1y * r, bz + o1z * r], [bx + o0x * r, by + o0y * r, bz + o0z * r]],
          shade(tone, 0.7 + 0.5 * Math.max(0, o0y)), [o0x, o0y, o0z], t0);
      }
    }

    /* ---- floor, bay line, back wall, columns, racked sections ---- */
    var z, x, i;
    for (z = 24; z > 0.6; z -= 1.1) {
      var alt = Math.round((24 - z) / 1.1) % 2 === 0;
      face([[-9, 0, z], [9, 0, z], [9, 0, z - 1.1], [-9, 0, z - 1.1]],
        alt ? TONE.floor : TONE.floor2, [0, 1, 0], 0);
    }
    for (z = 22; z > 1; z -= 2.2) {
      face([[-2.35, 0.004, z], [-2.2, 0.004, z], [-2.2, 0.004, z - 2.2], [-2.35, 0.004, z - 2.2]], TONE.line, [0, 1, 0], 0, 0.5);
    }
    face([[-9, 0, 12.4], [9, 0, 12.4], [9, 5, 12.4], [-9, 5, 12.4]], TONE.wall, [0, 0, -1], 0.05);
    face([[1.6, 0, 12.36], [4.3, 0, 12.36], [4.3, 3.1, 12.36], [1.6, 3.1, 12.36]], TONE.door, [0, 0, -1], 0.1);
    for (i = 0; i < 7; i++) {
      face([[1.68, 0.22 + i * 0.42, 12.34], [4.22, 0.22 + i * 0.42, 12.34], [4.22, 0.26 + i * 0.42, 12.34], [1.68, 0.26 + i * 0.42, 12.34]], '#161b20', [0, 0, -1], 0.14);
    }
    [-6.4, -3.1, 5.2, 7.2].forEach(function (cx) {
      box(cx, 0, 11.9, 0.34, 5, 0.34, TONE.column, 0.08);
    });
    /* rack of sections, off the wall on the left, in depth */
    (function () {
      var rx = -3.05, i2;
      [1.05, 1.72, 2.39].forEach(function (ry, ri) {
        box(rx, ry, 8.9, 2.6, 0.07, 0.34, TONE.rack, 0.3 + ri * 0.08);
        for (i2 = 0; i2 < 3; i2++) {
          box(rx - 0.95 + i2 * 0.9, ry + 0.075, 8.9, 0.62, 0.1, 0.22, i2 % 2 ? TONE.plateDark : TONE.plate, 0.4 + ri * 0.08 + i2 * 0.04);
        }
      });
      box(rx - 1.32, 0, 8.9, 0.09, 2.6, 0.3, TONE.rack, 0.26);
      box(rx + 1.32, 0, 8.9, 0.09, 2.6, 0.3, TONE.rack, 0.26);
    })();

    /* ---- the bench ---- */
    box(0, BENCH_Y - 0.07, 6.3, 3.6, 0.07, 9.6, TONE.bench, 0.06);
    face([[-1.8, BENCH_Y, 1.5], [1.8, BENCH_Y, 1.5], [1.8, BENCH_Y, 11.1], [-1.8, BENCH_Y, 11.1]], TONE.benchHi, [0, 1, 0], 0.06);
    face([[-1.8, BENCH_Y - 0.02, 1.5], [1.8, BENCH_Y - 0.02, 1.5], [1.8, BENCH_Y, 1.5], [-1.8, BENCH_Y, 1.5]], TONE.benchEdge, [0, 0, -1], 0.06);
    [[-1.66, 2.3], [1.66, 2.3], [-1.66, 9.7], [1.66, 9.7]].forEach(function (l) {
      box(l[0], 0, l[1], 0.12, BENCH_Y - 0.07, 0.12, TONE.leg, 0.1);
    });
    box(0, 0.24, 2.3, 3.3, 0.08, 0.1, TONE.leg, 0.14);

    /* ---- lapped plate joint on the bench ---- */
    face([[-0.98, BENCH_Y + 0.002, 2.28], [0.98, BENCH_Y + 0.002, 2.28], [0.98, BENCH_Y + 0.002, 7.9], [-0.98, BENCH_Y + 0.002, 7.9]], TONE.plate, [0, 1, 0], 0.22);
    face([[-0.98, BENCH_Y + 0.002, SEAM_Z + 0.01], [0.98, BENCH_Y + 0.002, SEAM_Z + 0.01], [0.98, BENCH_Y + 0.002, 8.4], [-0.98, BENCH_Y + 0.002, 8.4]], TONE.plateHi, [0, 1, 0], 0.3);
    /* the lap edge standing proud, so the joint reads as two plates */
    face([[-0.98, BENCH_Y + 0.002, SEAM_Z + 0.012], [0.98, BENCH_Y + 0.002, SEAM_Z + 0.012],
          [0.98, BENCH_Y + 0.042, SEAM_Z + 0.012], [-0.98, BENCH_Y + 0.042, SEAM_Z + 0.012]],
      shade(TONE.plateDark, 1.1), [0, 0, -1], 0.34);
    face([[-0.98, BENCH_Y + 0.042, SEAM_Z + 0.012], [0.98, BENCH_Y + 0.042, SEAM_Z + 0.012],
          [0.98, BENCH_Y + 0.042, SEAM_Z + 0.03], [-0.98, BENCH_Y + 0.042, SEAM_Z + 0.03]],
      shade(TONE.plateHi, 1.2), [0, 1, 0], 0.36);
    /* mill scale and rust bleed on the near plate */
    (function () {
      var seed = 5171;
      function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
      for (var q = 0; q < 26; q++) {
        var px = -0.9 + rnd() * 1.8, pz = 2.4 + rnd() * 4.9, pr = 0.03 + rnd() * 0.09;
        face([[px - pr, BENCH_Y + 0.004, pz], [px + pr, BENCH_Y + 0.004, pz], [px + pr, BENCH_Y + 0.004, pz + pr * 0.7], [px - pr, BENCH_Y + 0.004, pz + pr * 0.7]],
          rnd() > 0.6 ? TONE.plateRust : TONE.plateDark, [0, 1, 0], 0.4, 0.6);
      }
    })();

    /* ---- the bead: overlapping runs along the seam, cooling away from the arc ---- */
    (function () {
      var N = 30, q;
      for (q = 0; q < N; q++) {
        var k = q / (N - 1);
        var bx = -0.9 + k * 1.8;
        var wob = Math.sin(k * 11) * 0.008;
        var r = 0.052 + Math.sin(k * 7.3) * 0.008;
        var pts = [], a;
        for (a = 0; a < 9; a++) {
          var an = (a / 9) * 6.2832;
          pts.push([bx + Math.cos(an) * r, BENCH_Y + 0.048 + Math.sin(an) * r * 0.12, SEAM_Z + wob + Math.sin(an) * r]);
        }
        var near = Math.abs(k - 1);
        var tone = near < 0.13 ? TONE.beadWhite : (near < 0.34 ? TONE.beadHot : (near < 0.62 ? TONE.bead : TONE.beadCool));
        face(pts, tone, [0, 1, 0], 0.6 + k * 1.15, 1);
        /* the ripple shadow on the far side of the run */
        face([[bx - r, BENCH_Y + 0.047, SEAM_Z + wob + r * 0.9], [bx + r, BENCH_Y + 0.047, SEAM_Z + wob + r * 0.9],
              [bx + r, BENCH_Y + 0.047, SEAM_Z + wob + r * 1.5], [bx - r, BENCH_Y + 0.047, SEAM_Z + wob + r * 1.5]],
          'rgba(9,11,14,.42)', [0, 1, 0], 0.6 + k * 1.15, 1);
      }
      /* spatter thrown forward of the run */
      var seed = 9137;
      for (q = 0; q < 40; q++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        var sx = -0.95 + (seed / 2147483648) * 1.9;
        seed = (seed * 1103515245 + 12345) % 2147483648;
        var sz = SEAM_Z - 0.06 - (seed / 2147483648) * 0.55;
        var sr = 0.006 + ((q * 37) % 11) / 900;
        face([[sx - sr, BENCH_Y + 0.045, sz], [sx + sr, BENCH_Y + 0.045, sz], [sx + sr, BENCH_Y + 0.045, sz + sr], [sx - sr, BENCH_Y + 0.045, sz + sr]],
          q % 4 ? TONE.beadCool : TONE.beadHot, [0, 1, 0], 1.0 + (q % 9) * 0.05, 0.85);
      }
    })();
    /* tacks ahead of the run, and the seam line still open */
    [-0.62, -0.18, 0.24].forEach(function (tx, ti) {
      face([[tx - 0.045, BENCH_Y + 0.05, SEAM_Z - 0.02], [tx + 0.045, BENCH_Y + 0.05, SEAM_Z - 0.02],
            [tx + 0.045, BENCH_Y + 0.05, SEAM_Z + 0.05], [tx - 0.045, BENCH_Y + 0.05, SEAM_Z + 0.05]],
        TONE.beadCool, [0, 1, 0], 0.62 + ti * 0.1, 1);
    });

    /* ---- F-clamp holding the lap down, near left ---- */
    (function () {
      var cx = -0.62;
      box(cx, BENCH_Y + 0.004, 3.3, 0.06, 0.03, 0.62, TONE.clamp, 0.9);
      box(cx, BENCH_Y + 0.03, 3.02, 0.1, 0.26, 0.05, TONE.clamp, 0.94);
      box(cx, BENCH_Y + 0.26, 3.0, 0.1, 0.05, 0.24, TONE.clampHi, 0.98);
      box(cx, BENCH_Y + 0.28, 3.58, 0.12, 0.09, 0.05, TONE.clampHi, 1.02);
      tube(cx, BENCH_Y + 0.28, 3.2, cx, BENCH_Y + 0.28, 3.9, 0.012, TONE.clampHi, 1.04, 6);
      tube(cx, BENCH_Y + 0.3, 4.0, cx - 0.2, BENCH_Y + 0.36, 4.24, 0.014, TONE.handle, 1.08, 6);
      tube(cx, BENCH_Y + 0.3, 4.0, cx + 0.2, BENCH_Y + 0.36, 4.24, 0.014, TONE.handle, 1.08, 6);
    })();

    /* ---- MIG torch at the live end of the run, cable off the bench ---- */
    (function () {
      tube(ARC[0] + 0.02, ARC[1] - 0.03, ARC[2] + 0.02, 0.78, 1.03, 3.95, 0.028, TONE.shroud, 1.3, 9);
      tube(0.78, 1.03, 3.95, 1.02, 1.04, 4.26, 0.032, TONE.torch, 1.34, 9);
      tube(1.02, 1.04, 4.26, 1.16, 1.12, 4.62, 0.026, TONE.torch, 1.38, 8);
      box(1.22, 1.0, 4.76, 0.2, 0.1, 0.24, TONE.torch, 1.42);
      box(1.3, 1.06, 4.76, 0.1, 0.16, 0.18, TONE.torchHi, 1.46);
      /* trigger */
      box(1.16, 1.0, 4.5, 0.05, 0.06, 0.12, TONE.torchHi, 1.48);
    })();

    /* ---- wire brush, rod stubs, offcut stack ---- */
    (function () {
      box(-1.28, BENCH_Y + 0.004, 4.62, 0.26, 0.05, 0.12, TONE.brush, 1.5);
      for (var q = 0; q < 8; q++) {
        box(-1.31 + q * 0.028, BENCH_Y + 0.05, 4.62, 0.012, 0.05, 0.1, TONE.bristle, 1.54);
      }
      box(-1.06, BENCH_Y + 0.004, 4.62, 0.3, 0.035, 0.07, TONE.handle, 1.56);
      [[1.3, 5.35], [1.42, 5.6], [1.22, 5.86]].forEach(function (r, ri) {
        tube(r[0], BENCH_Y + 0.05, r[1], r[0] + 0.34, BENCH_Y + 0.05, r[1] + 0.09, 0.008, TONE.nozzle, 1.6 + ri * 0.04, 5);
      });
      for (var s = 0; s < 4; s++) {
        face([[-1.55, BENCH_Y + 0.046 + s * 0.042, 6.3], [-0.95, BENCH_Y + 0.046 + s * 0.042, 6.3],
              [-0.95, BENCH_Y + 0.046 + s * 0.042, 6.95], [-1.55, BENCH_Y + 0.046 + s * 0.042, 6.95]],
          shade(s % 2 ? TONE.offcut : TONE.plateDark, 1.05), [0, 1, 0], 1.7 + s * 0.06);
        face([[-1.55, BENCH_Y + 0.046 + s * 0.042, 6.3], [-0.95, BENCH_Y + 0.046 + s * 0.042, 6.3],
              [-0.95, BENCH_Y + 0.088 + s * 0.042, 6.3], [-1.55, BENCH_Y + 0.088 + s * 0.042, 6.3]],
          shade(TONE.plateDark, 0.85), [0, 0, -1], 1.7 + s * 0.06);
      }
      box(1.34, BENCH_Y + 0.004, 6.9, 0.5, 0.28, 0.34, TONE.offcut, 1.62);
      box(1.34, BENCH_Y + 0.284, 6.9, 0.42, 0.03, 0.28, '#6d777f', 1.66);
    })();

    /* ---- cable from the torch, over the bench edge, onto the floor ---- */
    var CABLE = [[1.28, 1.0, 4.86], [1.5, 0.99, 5.4], [1.72, 0.96, 6.1], [1.9, 0.6, 6.7],
                 [2.1, 0.12, 6.1], [2.4, 0.03, 5.2], [2.2, 0.03, 4.1], [1.6, 0.03, 3.3]];

    /* arc light floor bounce, drawn from the arc */
    var SP = [], seed2 = 4111;
    for (i = 0; i < 26; i++) {
      seed2 = (seed2 * 1103515245 + 12345) % 2147483648;
      SP.push({ a: (seed2 / 2147483648) * 6.2832, v: 0.3 + ((i * 13) % 17) / 22, p: (seed2 / 2147483648) });
    }

    return {
      duration: 2.6,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        var reduced = Projection.reduced();
        S.yaw = reduced ? 0 : Math.sin(time * 0.08) * 0.02;

        var sky = S.ctx.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#0b0d10');
        sky.addColorStop(0.42, '#141a20');
        sky.addColorStop(0.72, '#1c232a');
        sky.addColorStop(1, '#10151a');
        S.ctx.fillStyle = sky; S.ctx.fillRect(0, 0, S.W, S.H);

        var list = [], p, pts, sum, mapped, f, miss;
        for (i = 0; i < faces.length; i++) {
          f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (var q = 0; q < f.pts.length; q++) {
            p = S.project(f.pts[q][0], f.pts[q][1], f.pts[q][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          var dz = sum / mapped.length;
          list.push({
            pts: mapped, dz: dz,
            fill: Projection.mix(shade(f.tone, 0.52 + 0.6 * Math.max(0, d)), FOG, S.fog(dz) * 0.66),
            a: Math.min(1, (t - f.t0) / 0.4) * f.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          if (it.a <= 0.02) continue;
          S.ctx.globalAlpha = it.a;
          S.ctx.beginPath(); S.ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) S.ctx.lineTo(pts[j][0], pts[j][1]);
          S.ctx.closePath(); S.ctx.fillStyle = it.fill; S.ctx.fill();
        }
        S.ctx.globalAlpha = 1;

        /* cable, laid after the solids so it lies on top of the bench and floor */
        if (t > 1.35) {
          var ck = Math.min(1, (t - 1.35) / 0.7), c = S.ctx; c.lineCap = 'round';
          var run = Math.max(2, Math.round(CABLE.length * ck));
          [[9, 'rgba(6,8,10,.55)'], [5, TONE.cable], [1.4, 'rgba(240,120,0,.22)']].forEach(function (pass) {
            c.lineWidth = pass[0]; c.strokeStyle = pass[1]; c.beginPath();
            for (var h = 0; h < run; h++) {
              var hp = S.project(CABLE[h][0], CABLE[h][1], CABLE[h][2]);
              if (!hp) continue;
              if (h === 0) c.moveTo(hp[0], hp[1]); else c.lineTo(hp[0], hp[1]);
            }
            c.stroke();
          });
        }

        /* the arc: core, bleed, bounce on the plate, and a flicker nobody can time */
        var ap = S.project(ARC[0], ARC[1] - 0.02, ARC[2]);
        if (ap && t > 0.75) {
          var flick = reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 27) * Math.sin(time * 7.7);
          var fade = Math.min(1, (t - 0.75) / 0.5);
          var rad = S.focal / ap[2] * 0.95;
          var g = S.ctx.createRadialGradient(ap[0], ap[1], 0, ap[0], ap[1], rad);
          g.addColorStop(0, 'rgba(255,244,224,' + (0.95 * flick * fade).toFixed(3) + ')');
          g.addColorStop(0.16, 'rgba(255,196,113,' + (0.55 * flick * fade).toFixed(3) + ')');
          g.addColorStop(0.46, 'rgba(240,120,0,' + (0.2 * flick * fade).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(240,120,0,0)');
          S.ctx.fillStyle = g; S.ctx.fillRect(ap[0] - rad, ap[1] - rad, rad * 2, rad * 2);
          S.ctx.fillStyle = 'rgba(255,248,236,' + (0.95 * flick * fade).toFixed(3) + ')';
          S.ctx.beginPath(); S.ctx.arc(ap[0], ap[1], Math.max(1.6, rad * 0.055), 0, 6.2832); S.ctx.fill();

          /* bounce: warm pool on the plate under the arc */
          var bp = S.project(ARC[0], BENCH_Y + 0.01, ARC[2] + 0.3);
          if (bp) {
            var br = S.focal / bp[2] * 0.85;
            var bg = S.ctx.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], br);
            bg.addColorStop(0, 'rgba(255,206,142,' + (0.3 * flick * fade).toFixed(3) + ')');
            bg.addColorStop(1, 'rgba(255,206,142,0)');
            S.ctx.save(); S.ctx.translate(bp[0], bp[1]); S.ctx.scale(1, 0.34);
            S.ctx.translate(-bp[0], -bp[1]); S.ctx.fillStyle = bg;
            S.ctx.beginPath(); S.ctx.arc(bp[0], bp[1], br, 0, 6.2832); S.ctx.fill(); S.ctx.restore();
          }
        }

        /* sparks, thrown and falling back to the bench */
        if (!reduced && t > 0.9) {
          var sfade = Math.min(1, (t - 0.9) / 0.6);
          for (i = 0; i < SP.length; i++) {
            var sp = SP[i];
            var ph = ((time * 0.55 + sp.p) % 1);
            var dx = Math.cos(sp.a) * sp.v * ph * 0.75;
            var dz = Math.sin(sp.a) * sp.v * ph * 0.5;
            var sxp = S.project(ARC[0] + dx, ARC[1] - 0.02 + Math.sin(ph * Math.PI) * 0.18 - ph * ph * 0.14, ARC[2] + dz + 0.2);
            if (!sxp) continue;
            var sa = (1 - ph) * 0.85 * sfade;
            S.ctx.fillStyle = 'rgba(255,206,142,' + sa.toFixed(3) + ')';
            S.ctx.beginPath(); S.ctx.arc(sxp[0], sxp[1], Math.max(0.5, 1.9 * (1 - ph)), 0, 6.2832); S.ctx.fill();
          }
        }

        /* haze over the far bay so the background sits back */
        var hz = S.ctx.createLinearGradient(0, S.horizon - S.H * 0.3, 0, S.horizon + S.H * 0.24);
        hz.addColorStop(0, 'rgba(18,23,29,0)');
        hz.addColorStop(0.6, 'rgba(18,23,29,0.4)');
        hz.addColorStop(1, 'rgba(16,21,26,0)');
        S.ctx.fillStyle = hz; S.ctx.fillRect(0, S.horizon - S.H * 0.3, S.W, S.H * 0.54);

        /* seat the copy: left scrim, floor and top falloff */
        var sg = S.ctx.createLinearGradient(0, 0, S.W * 0.78, 0);
        sg.addColorStop(0, 'rgba(9,11,14,0.93)');
        sg.addColorStop(0.44, 'rgba(9,11,14,0.62)');
        sg.addColorStop(1, 'rgba(9,11,14,0)');
        S.ctx.fillStyle = sg; S.ctx.fillRect(0, 0, S.W, S.H);
        var fl = S.ctx.createLinearGradient(0, S.H - 150, 0, S.H);
        fl.addColorStop(0, 'rgba(9,11,14,0)'); fl.addColorStop(1, 'rgba(9,11,14,0.9)');
        S.ctx.fillStyle = fl; S.ctx.fillRect(0, S.H - 150, S.W, 150);
        var tp = S.ctx.createLinearGradient(0, 0, 0, 130);
        tp.addColorStop(0, 'rgba(9,11,14,0.82)'); tp.addColorStop(1, 'rgba(9,11,14,0)');
        S.ctx.fillStyle = tp; S.ctx.fillRect(0, 0, S.W, 130);
      }
    };
  };

  /* ------------------------------------------------------------------ *
   * sceneSealFix — Seal Fix (tiling & waterproofing). A tiled roof plane
   * climbing away from the eave: every course of tiles sits on a batten
   * line, ridge caps run the top, and a membrane roll, trowel and bucket
   * sit on the sheets where the next course is going down. An extension
   * ladder rests against the eave, right of frame.
   * Same contract as the other scenes: world-space faces, one projection,
   * far-to-near sort, depth fog, build-on timing.
   * ------------------------------------------------------------------ */
  Projection.sceneSealFix = function (S, o) {
    o = o || {};
    var TONE = {
      tile: '#8a5a49', tileB: '#7d5041', tileC: '#956351',
      tileLit: '#b07d66', tileShade: '#4f3229', tileNose: '#3d2620',
      batten: '#2f2a26', ridge: '#7e5344', ridgeLit: '#a97a63', ridgeShade: '#48302a',
      gutter: '#5a5f6b', gutterIn: '#1f2228', lip: '#8f95a1', fascia: '#2a2925',
      steel: '#8d97a3', steelDim: '#4b525c', alu: '#9aa3ae', aluDim: '#5c646e',
      timber: '#8a6a3c', timberHi: '#a8854f', ground: '#2b3227', ground2: '#343c2e',
      path: '#4a4b44', fence: '#39402f', roofFar: '#171b1f',
      membrane: '#3f3d55', membraneLit: '#5b5875', membraneEdge: '#2a2938',
      trowel: '#a9b1bc', bucket: '#8f95a1', acc: '#6b6f95'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.46, 0.78, -0.44], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#101317';
    var faces = [];
    var SLOPE = 0.42, Z0 = 3.55, Z1 = 11.40;

    function Y(z) { return (z - 2.0) * SLOPE; }
    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.45)
        : Projection.mix(tone, '#0a0c0f', (1 - lit) * 0.8);
    }
    function face(pts, tone, n, t0) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0 });
    }
    function bar(a, b, w, tone, t0) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      var L = Math.hypot(dx, dy, dz) || 1;
      var ux = dx / L, uy = dy / L, uz = dz / L;
      var px = -uy * w / 2, py = ux * w / 2;
      var qx = -uz * w * 0.3, qz = uy * w * 0.3;
      function P(p, sx, sy, sz) { return [p[0] + sx, p[1] + sy, p[2] + sz]; }
      face([P(a, px, py, 0), P(b, px, py, 0), P(b, -px, -py, 0), P(a, -px, -py, 0)], tone, [-uz, 0, ux], t0);
      face([P(a, qx, 0, qz), P(b, qx, 0, qz), P(b, -qx, 0, -qz), P(a, -qx, 0, -qz)], shade(tone, 1.1), [0, 1, 0], t0);
      face([P(a, px, py, qz), P(b, px, py, qz), P(b, px, py, -qz), P(a, px, py, -qz)], shade(tone, 0.82), [ux, uy, 0], t0);
    }
    function boxAt(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.9), [0, 0, 1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.76), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.02), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.12), [0, 1, 0], t0);
    }
    function discAt(cx, cy, cz, r, seg, tone, t0) {
      var pts = [], s, a;
      for (s = 0; s < seg; s++) { a = (s / seg) * 6.2832; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]); }
      face(pts, tone, [0, 1, 0], t0);
    }

    var i, j, x, z, z0, z1, eaveY = Y(Z0);

    /* ---- tile courses climbing the pitch. Each course is a batten line with a
       row of barrel tiles over it: shaded flank, lit crown, shaded flank, then a
       hard nose shadow at the bottom edge where the course laps the one below. ---- */
    var TILE = 0.235, COURSE = 0.285;
    for (z0 = Z0; z0 < Z1 - 0.02; z0 += COURSE) {
      z1 = Math.min(z0 + COURSE, Z1);
      var rowI = Math.round((z0 - Z0) / COURSE);
      for (x = -5.4; x < 5.4; x += TILE) {
        var t0t = 0.12 + rowI * 0.11 + (x + 5.4) * 0.028;
        var body = (rowI + Math.round(x / TILE)) % 3 === 0 ? TONE.tileB
          : ((rowI + Math.round(x / TILE)) % 3 === 1 ? TONE.tile : TONE.tileC);
        var R = TILE * 0.62, hR = 0.032;
        /* the pan between the tile crowns */
        face([[x, Y(z0) + hR, z0], [x + TILE - R, Y(z0) + hR, z0],
              [x + TILE - R, Y(z1) + hR, z1], [x, Y(z1) + hR, z1]], TONE.tileNose, [0, 1, 0], t0t);
        /* left flank of the crown */
        face([[x + TILE - R, Y(z0) + hR, z0], [x + TILE - R, Y(z0) + hR + 0.012, z0],
              [x + TILE - R, Y(z1) + hR + 0.012, z1], [x + TILE - R, Y(z1) + hR, z1]], body, [-1, 0.5, 0], t0t);
        /* crown */
        face([[x + TILE - R, Y(z0) + hR + 0.012, z0], [x + TILE - R * 0.28, Y(z0) + hR + hR * 0.5 + 0.008, z0],
              [x + TILE - R * 0.28, Y(z1) + hR + hR * 0.5 + 0.008, z1], [x + TILE - R, Y(z1) + hR + 0.012, z1]], TONE.tileLit, [0, 1, 0.2], t0t);
        /* right flank */
        face([[x + TILE - R * 0.28, Y(z0) + hR + hR * 0.5 + 0.008, z0], [x + TILE, Y(z0) + hR, z0],
              [x + TILE, Y(z1) + hR, z1], [x + TILE - R * 0.28, Y(z1) + hR + hR * 0.5 + 0.008, z1]], TONE.tileShade, [1, 0.4, 0], t0t);
        /* butt shadow at the bottom of the course */
        face([[x, Y(z0), z0 + 0.012], [x + TILE, Y(z0), z0 + 0.012],
              [x + TILE, Y(z0) + hR, z0 + 0.012], [x, Y(z0) + hR, z0 + 0.012]], TONE.tileNose, [0, 0.4, -1], t0t + 0.02);
      }
      /* batten shadow gap between courses */
      face([[-5.4, Y(z0) + 0.001, z0 + 0.004], [5.4, Y(z0) + 0.001, z0 + 0.004],
            [5.4, Y(z0) + 0.001, z0 + 0.05], [-5.4, Y(z0) + 0.001, z0 + 0.05]], TONE.batten, [0, 1, 0], t0t);
    }

    /* ---- ridge caps along the top, bedded as a half-round row ---- */
    for (x = -5.5; x < 5.5; x += 0.4) {
      var rc = ((Math.round(x * 10) % 3) + 3) % 3;
      var rcTone = rc === 0 ? TONE.ridge : (rc === 1 ? TONE.ridgeLit : TONE.ridgeShade);
      face([[x, Y(Z1) - 0.03, Z1 - 0.1], [x + 0.4, Y(Z1) - 0.03, Z1 - 0.1],
            [x + 0.4, Y(Z1) + 0.02, Z1 + 0.26], [x, Y(Z1) + 0.02, Z1 + 0.26]],
           rcTone, [0, 1, -0.3], 1.85 + (x + 5.5) * 0.02);
    }
    boxAt(0, Y(Z1) - 0.055, Z1 + 0.22, 11.1, 0.09, 0.55, TONE.ridgeShade, 1.8);
    for (x = -5.2; x < 5.2; x += 0.8) {
      discAt(x, Y(Z1) + 0.026, Z1 - 0.14, 0.012, 8, TONE.steelDim, 2.0);
    }

    /* ---- eave: fascia, gutter trough, brackets, downpipe ---- */
    face([[-5.5, eaveY - 0.34, Z0 + 0.15], [5.5, eaveY - 0.34, Z0 + 0.15],
          [5.5, eaveY - 0.01, Z0 + 0.15], [-5.5, eaveY - 0.01, Z0 + 0.15]], TONE.fascia, [0, 0, 1], 0.06);
    face([[-5.5, eaveY - 0.02, Z0 - 0.17], [5.5, eaveY - 0.02, Z0 - 0.17],
          [5.5, eaveY - 0.02, Z0 + 0.13], [-5.5, eaveY - 0.02, Z0 + 0.13]], TONE.gutterIn, [0, 1, 0], 0.1);
    face([[-5.5, eaveY - 0.02, Z0 + 0.13], [5.5, eaveY - 0.02, Z0 + 0.13],
          [5.5, eaveY + 0.09, Z0 + 0.13], [-5.5, eaveY + 0.09, Z0 + 0.13]], TONE.gutter, [0, 0, -1], 0.12);
    face([[-5.5, eaveY - 0.03, Z0 - 0.17], [5.5, eaveY - 0.03, Z0 - 0.17],
          [5.5, eaveY + 0.12, Z0 - 0.17], [-5.5, eaveY + 0.12, Z0 - 0.17]], TONE.gutter, [0, 0, 1], 0.14);
    face([[-5.5, eaveY + 0.11, Z0 - 0.18], [5.5, eaveY + 0.11, Z0 - 0.18],
          [5.5, eaveY + 0.125, Z0 - 0.18], [-5.5, eaveY + 0.125, Z0 - 0.18]], TONE.lip, [0, 0.6, 0.6], 0.16);
    for (x = -5.1; x < 5.2; x += 0.58) {
      boxAt(x, eaveY - 0.03, Z0 - 0.165, 0.045, 0.16, 0.045, TONE.steelDim, 0.2 + Math.abs(x) * 0.02);
    }
    for (i = 0; i < 6; i++) {
      var dpy = eaveY - 0.06 - i * 0.6;
      face([[-2.35, dpy, Z0 + 0.02], [-2.25, dpy, Z0 + 0.02],
            [-2.25, dpy + 0.6, Z0 + 0.02], [-2.35, dpy + 0.6, Z0 + 0.02]], TONE.steel, [0, 0, 1], 0.45 + i * 0.06);
      face([[-2.25, dpy, Z0 + 0.075], [-2.25, dpy, Z0 + 0.02],
            [-2.25, dpy + 0.6, Z0 + 0.02], [-2.25, dpy + 0.6, Z0 + 0.075]], TONE.steelDim, [1, 0, 0], 0.45 + i * 0.06);
    }

    /* ---- the yard, so the height and pitch read ---- */
    face([[-26, -3.0, 4.5], [26, -3.0, 4.5], [26, -3.0, 36], [-26, -3.0, 36]], TONE.ground, [0, 1, 0], 0);
    for (z = 6; z < 34; z += 2.6) {
      face([[-26, -2.99, z], [26, -2.99, z], [26, -2.99, z + 1.3], [-26, -2.99, z + 1.3]],
        (Math.round(z) % 5 === 0) ? TONE.ground2 : TONE.ground, [0, 1, 0], 0);
    }
    face([[-4.2, -2.98, 6.2], [-3.5, -2.98, 6.2], [-3.5, -2.98, 28], [-4.2, -2.98, 28]], TONE.path, [0, 1, 0], 0.08);
    for (x = -22; x < 22; x += 0.34) {
      face([[x, -2.98, 23.5], [x + 0.06, -2.98, 23.5], [x + 0.06, -2.05, 23.5], [x, -2.05, 23.5]], TONE.fence, [0, 0, 1], 0);
    }
    face([[-18, -2.05, 23.4], [18, -2.05, 23.4], [18, -1.94, 23.4], [-18, -1.94, 23.4]], TONE.fence, [0, 0, 1], 0);
    face([[-14, -2.55, 28], [-6, -2.55, 28], [-9.6, -1.05, 28], [-14.6, -1.05, 28]], TONE.roofFar, [0, 0.6, -0.8], 0);
    face([[3, -2.65, 31], [11.5, -2.65, 31], [7.3, -1.15, 31], [2.4, -1.15, 31]], TONE.roofFar, [0, 0.6, -0.8], 0);

    /* ---- extension ladder against the eave, right of centre ---- */
    var lA = [2.42, -2.96, 6.05], lB = [2.28, eaveY + 0.5, Z0 - 0.1];
    bar([lA[0] - 0.19, lA[1], lA[2]], [lB[0] - 0.19, lB[1], lB[2]], 0.06, TONE.alu, 0.62);
    bar([lA[0] + 0.19, lA[1], lA[2]], [lB[0] + 0.19, lB[1], lB[2]], 0.06, TONE.aluDim, 0.66);
    for (i = 1; i < 11; i++) {
      var kk = i / 11;
      var rp = [lA[0] + (lB[0] - lA[0]) * kk, lA[1] + (lB[1] - lA[1]) * kk, lA[2] + (lB[2] - lA[2]) * kk];
      bar([rp[0] - 0.19, rp[1], rp[2]], [rp[0] + 0.19, rp[1], rp[2]], 0.045, (i % 2 ? TONE.alu : TONE.aluDim), 0.72 + i * 0.045);
    }
    /* feet and the top rung standing proud of the gutter */
    boxAt(lA[0] - 0.19, lA[1] - 0.04, lA[2], 0.1, 0.05, 0.14, TONE.timber, 0.6);
    boxAt(lA[0] + 0.19, lA[1] - 0.04, lA[2], 0.1, 0.05, 0.14, TONE.timber, 0.6);

    /* ---- membrane roll and trowel where the next course is going down ---- */
    var MX = -1.62, MZ = 4.55, MY = Y(MZ);
    for (i = 0; i < 5; i++) {
      var ang = (i / 5) * 6.2832;
      var rr = 0.16;
      var ax1 = MX + Math.cos(ang) * rr, ay1 = MY + 0.17 + Math.sin(ang) * rr;
      var ax2 = MX + Math.cos(ang + 1.2566) * rr, ay2 = MY + 0.17 + Math.sin(ang + 1.2566) * rr;
      face([[ax1, ay1, MZ - 0.4], [ax2, ay2, MZ - 0.4], [ax2, ay2, MZ + 0.4], [ax1, ay1, MZ + 0.4]],
        (Math.sin(ang) > 0 ? TONE.membraneLit : TONE.membraneEdge), [Math.cos(ang), Math.sin(ang), 0], 1.25 + i * 0.03);
    }
    discAt(MX, MY + 0.17, MZ + 0.41, 0.16, 14, TONE.membrane, 1.35);
    discAt(MX, MY + 0.17, MZ + 0.415, 0.055, 10, TONE.membraneEdge, 1.38);
    /* the tail of the roll lying flat, lapped up the pitch */
    face([[MX - 0.16, MY + 0.004, MZ + 0.42], [MX + 0.16, MY + 0.004, MZ + 0.42],
          [MX + 0.15, MY + 0.012, MZ + 1.05], [MX - 0.15, MY + 0.012, MZ + 1.05]], TONE.membrane, [0, 1, 0], 1.4);
    face([[MX - 0.15, MY + 0.012, MZ + 1.05], [MX + 0.15, MY + 0.012, MZ + 1.05],
          [MX + 0.15, MY + 0.016, MZ + 1.09], [MX - 0.15, MY + 0.016, MZ + 1.09]], TONE.acc, [0, 1, 0], 1.42);

    /* trowel set down beside it, blade flat, handle toward the camera */
    var TX = -1.05, TZ = 4.28, TY = Y(TZ) + 0.006;
    face([[TX - 0.13, TY, TZ - 0.2], [TX + 0.13, TY, TZ - 0.2],
          [TX + 0.13, TY + 0.004, TZ + 0.16], [TX - 0.13, TY + 0.004, TZ + 0.16]], TONE.trowel, [0, 1, 0], 1.5);
    bar([TX, TY + 0.008, TZ + 0.16], [TX, TY + 0.03, TZ + 0.34], 0.036, TONE.timber, 1.53);
    boxAt(TX, TY + 0.028, TZ + 0.36, 0.05, 0.04, 0.09, TONE.timberHi, 1.56);

    /* bucket of adhesive, out of the walking line */
    boxAt(-2.15, MY + 0.001, MZ + 0.72, 0.24, 0.24, 0.24, TONE.bucket, 1.6);
    discAt(-2.15, MY + 0.243, MZ + 0.72, 0.12, 12, TONE.gutterIn, 1.62);

    /* ---- render ---- */
    function render(t) {
      var ctx = S.ctx, W = S.W, H = S.H, hz = S.horizon;

      S.camX = Projection.reduced() ? 0 : Math.sin(t * 0.09) * 0.11;
      S.camY = 0.5 + (Projection.reduced() ? 0 : Math.sin(t * 0.15) * 0.02);

      var sky = ctx.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, '#070809');
      sky.addColorStop(0.5, '#101419');
      sky.addColorStop(1, '#2b2c2e');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);

      var glow = ctx.createRadialGradient(W * 0.74, hz - H * 0.2, 0, W * 0.74, hz - H * 0.2, H * 0.8);
      glow.addColorStop(0, 'rgba(163,158,196,0.22)');
      glow.addColorStop(0.45, 'rgba(140,138,180,0.08)');
      glow.addColorStop(1, 'rgba(120,120,170,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, hz + H * 0.12);

      var list = [], p, pts, sum, mapped, miss, f, qi;
      for (i = 0; i < faces.length; i++) {
        f = faces[i];
        if (t < f.t0) continue;
        mapped = []; sum = 0; miss = false;
        for (qi = 0; qi < f.pts.length; qi++) {
          p = S.project(f.pts[qi][0], f.pts[qi][1], f.pts[qi][2]);
          if (!p) { miss = true; break; }
          mapped.push(p); sum += p[2];
        }
        if (miss) continue;
        var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
        var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
        var dz = sum / mapped.length;
        list.push({ pts: mapped, dz: dz, a: Math.min(1, (t - f.t0) / 0.3),
          fill: Projection.mix(shade(f.tone, 0.86 + 0.56 * Math.max(0, d)), FOG, S.fog(dz) * 0.55) });
      }
      list.sort(function (a, b) { return b.dz - a.dz; });
      for (i = 0; i < list.length; i++) {
        var it = list[i]; pts = it.pts;
        if (it.a <= 0.02) continue;
        ctx.globalAlpha = it.a;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* contact shadows under the ladder feet and the set-down gear */
      [[lA[0], lA[2], 0.42], [TX, TZ, 0.32], [MX, MZ, 0.3], [-2.15, MZ + 0.72, 0.3]].forEach(function (c) {
        var sp = S.project(c[0], -2.97, c[2]);
        var tp = S.project(c[0], Y(c[1]) + 0.004, c[1]);
        var anchor = tp || sp;
        if (!anchor) return;
        var r = S.focal / anchor[2] * c[2];
        var sg = ctx.createRadialGradient(anchor[0], anchor[1], 0, anchor[0], anchor[1], r);
        sg.addColorStop(0, 'rgba(6,7,9,0.5)'); sg.addColorStop(1, 'rgba(6,7,9,0)');
        ctx.save(); ctx.translate(anchor[0], anchor[1]); ctx.scale(1, 0.32); ctx.translate(-anchor[0], -anchor[1]);
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(anchor[0], anchor[1], r, 0, 6.2832); ctx.fill(); ctx.restore();
      });

      /* copy scrim: heavy at the left where the words sit */
      var sg2 = ctx.createLinearGradient(0, 0, W * 0.62, 0);
      sg2.addColorStop(0, 'rgba(9,10,13,0.9)');
      sg2.addColorStop(0.55, 'rgba(9,10,13,0.44)');
      sg2.addColorStop(1, 'rgba(9,10,13,0)');
      ctx.fillStyle = sg2; ctx.fillRect(0, 0, W, H);
      var tb = ctx.createLinearGradient(0, 0, 0, H * 0.28);
      tb.addColorStop(0, 'rgba(9,10,13,0.5)'); tb.addColorStop(1, 'rgba(9,10,13,0)');
      ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H * 0.28);
      var bt = ctx.createLinearGradient(0, H * 0.74, 0, H);
      bt.addColorStop(0, 'rgba(9,10,13,0)'); bt.addColorStop(1, 'rgba(9,10,13,0.42)');
      ctx.fillStyle = bt; ctx.fillRect(0, H * 0.74, W, H * 0.26);
    }

    return { duration: 2.4, render: render };
  };

  /* ------------------------------------------------------------------ *
   * sceneSwitchboard — 99 Electrical Solutions. A domestic switchboard on
   * a brick wall with the door swung back: DIN rail of MCBs and an RCD,
   * copper busbar, earth bar with green/yellow conductors, cables entering
   * through the top with conduit runs, and the trade's own gear on the
   * floor in the near field (multimeter with probes, side cutters, driver,
   * TPS cable coil, tape, a step ladder framing the left edge). One
   * projection, far-to-near sort, build-on timing; single frame when the
   * visitor asks for reduced motion.
   * ------------------------------------------------------------------ */
  Projection.sceneSwitchboard = function (S, o) {
    o = o || {};
    var TONE = {
      brick: '#4b4741', brick2: '#565048', brick3: '#423e39',
      mortar: '#6b665d', box: '#5d6167', boxIn: '#3a3d43', boxLid: '#6a6f76',
      din: '#8d9199', brk: '#d5d1c7', brkSide: '#b8b4aa', toggleUp: '#20222a',
      toggleDn: '#31343c', rcd: '#c9c4b8', test: '#9d4231', copper: '#b07a3c',
      copperLt: '#cf9553', earthBar: '#8b8f7a', earth: '#96a34a', neutral: '#8e93a0',
      cable: '#cfc7b4', cableDk: '#a49b88', conduit: '#6e737b', steel: '#9aa0aa',
      handle: '#2a2d33', grip: '#b8883f', rubber: '#1a1c21', red: '#8f3a2c',
      meter: '#c2b23f', meterDk: '#8a7d24', screen: '#2b3a33'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.58, 0.70, 0.42], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#0c0d10';
    var WZ = 6.3, faces = [];

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffffff', (lit - 1) * 0.5)
        : Projection.mix(tone, '#08080b', (1 - lit) * 0.74);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.96), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.56), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.78), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.06), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.18), [0, 1, 0], t0);
    }
    /* round conductor / cable run between two points */
    function tube(a, b, r, tone, t0, seg) {
      seg = seg || 5;
      var vx = b[0] - a[0], vy = b[1] - a[1], vz = b[2] - a[2];
      var L = Math.hypot(vx, vy, vz) || 1;
      var ux = vx / L, uy = vy / L, uz = vz / L;
      var ax = Math.abs(uy) > 0.8 ? 1 : 0, ay = ax ? 0 : 1, az = 0;
      var nx = uy * az - uz * ay, ny = uz * ax - ux * az, nz = ux * ay - uy * ax;
      var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      var bx = uy * nz - uz * ny, by = uz * nx - ux * nz, bz = ux * ny - uy * nx;
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * 6.2832, a1 = ((s + 1) / seg) * 6.2832;
        function P(p, an) { return [p[0] + (nx * Math.cos(an) + bx * Math.sin(an)) * r, p[1] + (ny * Math.cos(an) + by * Math.sin(an)) * r, p[2] + (nz * Math.cos(an) + bz * Math.sin(an)) * r]; }
        face([P(a, a0), P(a, a1), P(b, a1), P(b, a0)], shade(tone, 0.74 + 0.5 * Math.abs(Math.cos((a0 + a1) / 2))), [nx, ny, nz], t0);
      }
    }
    /* flat disc, used for cable ends, buttons, tape */
    function disc(cx, cy, cz, r, seg, tone, t0) {
      var pts = [];
      for (var s = 0; s < seg; s++) {
        var an = (s / seg) * 6.2832;
        pts.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r, cz]);
      }
      face(pts, shade(tone, 1.05), [0, 0, -1], t0);
    }

    /* ---- wall: brick courses, mortar joints, a shadow under the board ---- */
    for (var row = 0, yy = 0; yy < 4.4; yy += 0.115, row++) {
      for (var col = 0, xx = -11; xx < 11; xx += 0.36) {
        var tone = (row + col) % 3 === 0 ? TONE.brick2 : ((row * 7 + col) % 5 === 0 ? TONE.brick3 : TONE.brick);
        face([[xx + 0.012, yy + 0.012, WZ], [xx + 0.348, yy + 0.012, WZ],
              [xx + 0.348, yy + 0.103, WZ], [xx + 0.012, yy + 0.103, WZ]],
          shade(tone, 0.82 + (((row * 13 + col * 5) % 7) * 0.022)), [0, 0, -1], 0.02 + row * 0.006);
        col++;
      }
      col = row % 2;
    }
    /* ---- floor slab ---- */
    face([[-14, 0, WZ], [14, 0, WZ], [14, 0, 0.4], [-14, 0, 0.4]], shade('#33322f', 0.9), [0, 1, 0], 0);
    face([[-14, 0, 3.1], [14, 0, 3.1], [14, 0, 3.14], [-14, 0, 3.14]], '#26251f', [0, 1, 0], 0.1);

    /* ---- the enclosure: recessed box, open door to the right ---- */
    var BX = 0.15, BY0 = 1.24, BW = 1.62, BH = 1.16, BD = 0.28;
    box(BX, BY0, WZ - 0.06, BW + 0.18, BH + 0.18, 0.1, TONE.boxLid, 0.16);
    /* interior void + back pan */
    face([[BX - BW / 2, BY0, WZ - 0.12], [BX + BW / 2, BY0, WZ - 0.12],
          [BX + BW / 2, BY0 + BH, WZ - 0.12], [BX - BW / 2, BY0 + BH, WZ - 0.12]],
      shade(TONE.boxIn, 0.72), [0, 0, -1], 0.24);

    /* door swung open on the right hinge, angled forward */
    (function door() {
      var hx = BX + BW / 2 + 0.09, ang = 1.18, dl = BW + 0.16;
      function dp(u, v) {
        return [hx + Math.cos(ang) * u * dl, BY0 - 0.06 + v * (BH + 0.14), WZ - 0.02 - Math.sin(ang) * u * dl];
      }
      face([dp(0, 0), dp(1, 0), dp(1, 1), dp(0, 1)], shade(TONE.box, 0.98), [0, 0, 1], 0.3);
      face([dp(0.02, 0.02), dp(0.98, 0.02), dp(0.98, 0.14), dp(0.02, 0.14)], shade(TONE.boxLid, 0.86), [0, 0, 1], 0.34);
      /* door interior face with the schedule sticker */
      face([dp(0, 0), dp(0, 1), dp(0.004, 1), dp(0.004, 0)], shade(TONE.boxLid, 0.6), [-1, 0, 0], 0.32);
    })();

    /* ---- DIN rails, breakers, RCD ---- */
    var RX = BX - BW / 2 + 0.1, RR = BW - 0.2;
    [0.30, 0.66, 0.96].forEach(function (ry, ri) {
      box(BX, BY0 + ry, WZ - 0.19, RR, 0.035, 0.06, TONE.din, 0.4 + ri * 0.06);
      var n = ri === 2 ? 6 : 9, w = RR / n;
      for (var b = 0; b < n; b++) {
        var cx = RX + w * (b + 0.5);
        var isRcd = ri === 2 && b < 2;
        box(cx, BY0 + ry + 0.04, WZ - 0.2, w * 0.88, 0.155, 0.09, isRcd ? TONE.rcd : TONE.brk, 0.52 + ri * 0.06 + b * 0.012);
        /* toggle: most up, a couple thrown down like a real board mid-fault */
        var down = (ri === 0 && (b === 4 || b === 7)) || (ri === 1 && b === 2);
        box(cx, BY0 + ry + 0.115, WZ - 0.27, w * 0.34, 0.062, 0.045, down ? TONE.toggleDn : TONE.toggleUp, 0.66 + ri * 0.05 + b * 0.01);
        if (isRcd) disc(cx, BY0 + ry + 0.11, WZ - 0.29, 0.021, 8, TONE.test, 0.7 + b * 0.02);
      }
    });
    /* copper busbar across the tops of the breakers, comb fingers */
    box(BX, BY0 + 0.55, WZ - 0.245, RR, 0.022, 0.014, TONE.copper, 0.78);
    for (var fg = 0; fg < 18; fg++) {
      box(RX + fg * 0.075, BY0 + 0.53, WZ - 0.245, 0.014, 0.02, 0.012, TONE.copperLt, 0.82);
    }
    /* earth bar + neutral bar with conductors peeling off */
    box(BX - 0.1, BY0 + 0.06, WZ - 0.215, RR * 0.5, 0.024, 0.05, TONE.earthBar, 0.86);
    for (var e = 0; e < 5; e++) {
      var ex = BX - BW / 2 + 0.2 + e * 0.115;
      tube([ex, BY0 + 0.085, WZ - 0.215], [ex + 0.02, BY0 + 0.23, WZ - 0.2], 0.008, TONE.earth, 0.94 + e * 0.02);
    }
    /* cables in at the top: grommets, sheaths, conduit drop ---- */
    for (var cbl = 0; cbl < 4; cbl++) {
      var gx = BX - 0.5 + cbl * 0.34;
      tube([gx, BY0 + BH, WZ - 0.16], [gx, BY0 + BH + 0.3, WZ - 0.12], 0.028, TONE.cable, 1.0 + cbl * 0.03);
      tube([gx, BY0 + BH + 0.3, WZ - 0.12], [gx + 0.05, BY0 + BH + 0.95, WZ - 0.05], 0.024, TONE.cableDk, 1.05 + cbl * 0.03);
      disc(gx, BY0 + BH, WZ - 0.12, 0.042, 10, TONE.rubber, 1.02 + cbl * 0.03);
    }
    /* main conduit run on the wall, a bend, and a junction box */
    tube([-1.55, 0.0, WZ - 0.05], [-1.55, 2.9, WZ - 0.05], 0.045, TONE.conduit, 0.9);
    tube([-1.55, 2.9, WZ - 0.05], [-0.6, 3.18, WZ - 0.05], 0.045, TONE.conduit, 0.96);
    box(-1.55, 2.62, WZ - 0.05, 0.16, 0.16, 0.09, TONE.conduit, 1.0);
    box(-0.95, 1.02, WZ - 0.05, 0.15, 0.15, 0.08, TONE.conduit, 1.06);

    /* ---- near field: the gear actually in play, kept right of the copy ---- */
    /* TPS cable coil on the floor, white sheath, copper cores fanned at the cut */
    (function coil() {
      for (var t = 0; t < 5; t++) {
        var r = 0.30 + t * 0.045;
        var prev = null;
        for (var a = 0; a <= 30; a++) {
          var an = (a / 30) * 6.2832;
          var p = [1.24 + Math.cos(an) * r, 0.045 + t * 0.036, 3.22 + Math.sin(an) * r];
          if (prev) tube(prev, p, 0.017, t % 2 ? TONE.cableDk : TONE.cable, 1.12 + t * 0.04, 4);
          prev = p;
        }
      }
      tube([0.94, 0.05, 2.92], [0.5, 0.02, 2.5], 0.017, TONE.cable, 1.3);
      tube([0.98, 0.05, 2.98], [0.4, 0.02, 2.62], 0.016, TONE.cableDk, 1.33);
      /* stripped cores */
      tube([0.5, 0.02, 2.5], [0.24, 0.02, 2.36], 0.007, TONE.copperLt, 1.36);
      tube([0.4, 0.02, 2.62], [0.14, 0.02, 2.52], 0.007, TONE.neutral, 1.38);
      disc(0.24, 0.02, 2.36, 0.009, 6, TONE.copper, 1.4);
    })();
    /* multimeter, probe leads trailing */
    box(0.32, 0, 3.34, 0.34, 0.09, 0.52, TONE.meter, 1.2);
    box(0.32, 0.09, 3.34, 0.26, 0.02, 0.3, TONE.screen, 1.24);
    box(0.32, 0.09, 3.53, 0.2, 0.014, 0.1, TONE.meterDk, 1.26);
    tube([0.32, 0.05, 3.09], [0.44, 0.03, 2.61], 0.01, TONE.red, 1.3);
    tube([0.46, 0.05, 3.09], [0.72, 0.03, 2.67], 0.01, TONE.rubber, 1.32);
    tube([0.44, 0.03, 2.61], [0.48, 0.02, 2.31], 0.008, TONE.steel, 1.36);
    box(0.44, 0.02, 2.61, 0.05, 0.03, 0.06, TONE.red, 1.34);
    /* side cutters, jaws open */
    tube([0.92, 0.02, 2.81], [1.24, 0.02, 2.59], 0.016, TONE.steel, 1.4, 4);
    tube([1.24, 0.02, 2.59], [1.44, 0.02, 2.45], 0.014, TONE.grip, 1.42, 4);
    tube([0.92, 0.02, 2.81], [0.82, 0.02, 2.69], 0.012, TONE.steel, 1.44, 4);
    /* screwdriver */
    tube([1.68, 0.02, 3.6], [2.0, 0.02, 3.44], 0.019, TONE.handle, 1.36, 5);
    tube([2.0, 0.02, 3.44], [2.24, 0.02, 3.32], 0.008, TONE.steel, 1.4, 4);
    /* roll of tape, standing on its edge */
    (function tape() {
      for (var s = 0; s < 10; s++) {
        var a0 = (s / 10) * 6.2832, a1 = ((s + 1) / 10) * 6.2832;
        face([[0.6 + Math.cos(a0) * 0.075, 0.02 + Math.sin(a0) * 0.075, 3.92],
              [0.6 + Math.cos(a1) * 0.075, 0.02 + Math.sin(a1) * 0.075, 3.92],
              [0.6 + Math.cos(a1) * 0.075, 0.02 + Math.sin(a1) * 0.075, 4.06],
              [0.6 + Math.cos(a0) * 0.075, 0.02 + Math.sin(a0) * 0.075, 4.06]],
          shade(TONE.rubber, 0.8 + 0.5 * Math.abs(Math.cos(a0))), [0, 0, 1], 1.34);
      }
      disc(0.6, 0.095, 4.062, 0.05, 10, TONE.handle, 1.38);
    })();
    /* step ladder: two rails climbing out of frame on the right */
    tube([2.15, 0, 2.95], [2.3, 2.9, 2.55], 0.045, TONE.steel, 1.1);
    tube([1.74, 0, 3.1], [1.9, 2.9, 2.7], 0.045, TONE.steel, 1.12);
    for (var rg = 0; rg < 4; rg++) {
      var gy = 0.28 + rg * 0.66, gz = 2.95 - rg * 0.09;
      box(1.96 - rg * 0.02, gy, gz + 0.07, 0.44, 0.05, 0.14, TONE.steel, 1.14 + rg * 0.04);
    }
    /* tool bag corner, far right of frame */
    box(-0.28, 0, 3.9, 0.5, 0.26, 0.36, TONE.handle, 1.2);
    tube([-0.38, 0.26, 3.9], [-0.18, 0.44, 3.9], 0.022, TONE.handle, 1.26);

    function render(t) {
      var tt = Projection.reduced() ? 99 : t;
      S.camX = (Projection.reduced() ? 0 : Math.sin(tt * 0.07) * 0.10) - 0.86;
      S.camY = 1.42 + (Projection.reduced() ? 0 : Math.sin(tt * 0.10) * 0.018);
      S.yaw = Projection.reduced() ? -0.02 : -0.02 + Math.sin(tt * 0.055) * 0.02;

      var ctx = S.ctx, W = S.W, H = S.H;
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#111214');
      bg.addColorStop(0.58, '#191a1c');
      bg.addColorStop(1, '#22211d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      var list = [], p, q2, pts, sum, mapped, miss, f2, ii;
      for (ii = 0; ii < faces.length; ii++) {
        f2 = faces[ii];
        if (tt < f2.t0) continue;
        mapped = []; sum = 0; miss = false;
        for (q2 = 0; q2 < f2.pts.length; q2++) {
          p = S.project(f2.pts[q2][0], f2.pts[q2][1], f2.pts[q2][2]);
          if (!p) { miss = true; break; }
          mapped.push(p); sum += p[2];
        }
        if (miss) continue;
        var n = f2.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
        var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
        var dz = sum / mapped.length;
        list.push({
          pts: mapped, dz: dz,
          fill: Projection.mix(shade(f2.tone, 0.8 + 0.66 * Math.max(0, d)), FOG, S.fog(dz) * 0.58),
          a: Math.min(1, (tt - f2.t0) / 0.4) * f2.a
        });
      }
      list.sort(function (a, b) { return b.dz - a.dz; });
      for (ii = 0; ii < list.length; ii++) {
        var it = list[ii]; pts = it.pts;
        if (it.a <= 0.015) continue;
        ctx.globalAlpha = it.a;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var jj = 1; jj < pts.length; jj++) ctx.lineTo(pts[jj][0], pts[jj][1]);
        ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* work light raking across the board from the left */
      var lp = S.project(-1.4, 1.9, 4.4);
      if (lp) {
        var lr = S.focal / lp[2] * 3.4;
        var lg = ctx.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], lr);
        lg.addColorStop(0, 'rgba(255,232,190,0.16)');
        lg.addColorStop(0.5, 'rgba(255,220,160,0.06)');
        lg.addColorStop(1, 'rgba(255,210,150,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lp[0], lp[1], lr, 0, 6.2832); ctx.fill();
      }
      /* live-test spark flicker at the board mouth */
      if (!Projection.reduced()) {
        for (var i = 0; i < 12; i++) {
          var ph = ((tt * 0.045 + i * 0.081) % 1);
          var mp = S.project(0.2 + Math.sin(tt * 0.18 + i) * 1.1 + (i % 4) * 0.5, 0.5 + ph * 1.9, 2.9 + (i % 5) * 0.7);
          if (!mp) continue;
          ctx.fillStyle = 'rgba(255,238,206,' + ((1 - ph) * 0.14).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(mp[0], mp[1], 1.2 * (1 - ph) + 0.35, 0, 6.2832); ctx.fill();
        }
      }
      var tb = ctx.createLinearGradient(0, 0, 0, H * 0.30);
      tb.addColorStop(0, 'rgba(10,11,13,0.66)'); tb.addColorStop(1, 'rgba(10,11,13,0)');
      ctx.fillStyle = tb; ctx.fillRect(0, 0, W, H * 0.30);
      var bt = ctx.createLinearGradient(0, H * 0.68, 0, H);
      bt.addColorStop(0, 'rgba(10,11,13,0)'); bt.addColorStop(1, 'rgba(10,11,13,0.80)');
      ctx.fillStyle = bt; ctx.fillRect(0, H * 0.68, W, H * 0.32);
      var vg = ctx.createRadialGradient(W * 0.5, H * 0.50, Math.min(W, H) * 0.32, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,7,9,0.46)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    return { duration: 2.4, render: render };
  };


  /* ------------------------------------------------------------------ *
   * scenePetGrooming — Bella's Happy Paws. A groom room in depth: tiled
   * floor with a paw trail, a wash tub at the back with the hose still
   * running, and the grooming table out front with its arm and noose,
   * clippers, scissors, comb, slicker brush and a folded towel. Warm
   * pendant over the table. World faces, one projection, far-to-near.
   * ------------------------------------------------------------------ */
  Projection.scenePetGrooming = function (S, o) {
    o = o || {};
    var TONE = {
      tileA: '#e4ced5', tileB: '#efe7dd', tileC: '#eadfd6', grout: '#c9b3bb',
      wall: '#ded3ca', wall2: '#e9dfd6', wallTop: '#c9bab0', skirting: '#b3a299',
      shelf: '#c0ab9f', steel: '#a3aaaf', steelDk: '#6d7477', steelHi: '#d6dcdf',
      timber: '#b08053', timberDk: '#8a6038', timberHi: '#c99a6c',
      tub: '#f1eae2', tubIn: '#dcd1c6', tubRim: '#f8f3ec', water: '#7fa5ad',
      bottle: '#c33f76', bottle2: '#8d2b53', cap: '#242a2f', label: '#f5ecf0',
      towel: '#d8abb6', towelDk: '#b58692', rubber: '#20262b',
      chrome: '#cdd5d9', lamp: '#ffdcb4', paw: '#c39aa6', dark: '#1d2328',
      blade: '#cbd1d5'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.44, 0.80, -0.42], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#12314a';
    var faces = [];
    var seed = 33077;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#fff8f0', (lit - 1) * 0.5)
        : Projection.mix(tone, '#0c1a24', (1 - lit) * 0.74);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.95), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.6), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.8), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.05), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.2), [0, 1, 0], t0);
    }
    function drum(cx, cy, cz, r, h, seg, tone, t0) {
      for (var s = 0; s < seg; s++) {
        var a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
        var m = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
        face([[cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r],
              [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r],
              [cx + Math.cos(a1) * r, cy + h, cz + Math.sin(a1) * r],
              [cx + Math.cos(a0) * r, cy + h, cz + Math.sin(a0) * r]],
          shade(tone, 0.72 + 0.5 * Math.max(0, nz)), [m, 0, nz], t0);
      }
    }
    function flat(cx, cz, r, y, seg, tone, t0) {
      var pts = [];
      for (var s = 0; s < seg; s++) {
        var a = (s / seg) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
      }
      face(pts, tone, [0, 1, 0], t0);
    }

    /* ---- room: tiled floor, paw trail, skirting, back wall, shelf ---- */
    var X0 = -6.2, X1 = 6.6, ZB = 13.3, i, x, z, t;
    var ti = 0;
    for (z = ZB; z > 0.55; z -= 0.62) {
      var alt = ti % 2 === 0;
      for (x = X0; x < X1; x += 0.92) {
        var tone = alt ? (ti % 4 === 0 ? TONE.tileA : TONE.tileC) : TONE.tileB;
        face([[x, 0, z], [x + 0.9, 0, z], [x + 0.9, 0, z - 0.6], [x, 0, z - 0.6]], tone, [0, 1, 0], 0);
      }
      ti++;
    }
    for (z = ZB; z > 0.55; z -= 0.62) {
      face([[X0, 0.002, z], [X1, 0.002, z], [X1, 0.002, z - 0.035], [X0, 0.002, z - 0.035]], TONE.grout, [0, 1, 0], 0);
    }
    for (x = X0; x < X1; x += 0.92) {
      face([[x, 0.002, ZB], [x + 0.035, 0.002, ZB], [x + 0.035, 0.002, 0.6], [x, 0.002, 0.6]], TONE.grout, [0, 1, 0], 0);
    }
    /* the trail of prints that walks in to the table */
    function paw(px, pz, sc, t0) {
      face([[px - 0.05 * sc, 0.004, pz + 0.05 * sc], [px + 0.05 * sc, 0.004, pz + 0.05 * sc],
            [px + 0.045 * sc, 0.004, pz - 0.03 * sc], [px, 0.004, pz - 0.055 * sc],
            [px - 0.045 * sc, 0.004, pz - 0.03 * sc]], TONE.paw, [0, 1, 0], t0, 0.7);
      var toes = [[-0.07, 0.05], [-0.025, 0.075], [0.025, 0.075], [0.07, 0.05]];
      for (var q = 0; q < toes.length; q++) {
        flat(px + toes[q][0] * sc, pz + toes[q][1] * sc, 0.021 * sc, 0.004, 8, TONE.paw, t0);
      }
    }
    (function () {
      var TRAIL = [[-1.9, 2.0], [-1.4, 2.7], [-1.9, 3.4], [-1.3, 4.1], [0.1, 4.9],
                   [0.7, 5.7], [0.2, 6.5], [1.1, 7.2], [1.9, 7.9], [2.5, 8.7], [2.9, 9.6]];
      for (var p = 0; p < TRAIL.length; p++) paw(TRAIL[p][0], TRAIL[p][1], 1 + (p % 2) * 0.22, 0.5 + p * 0.05);
    })();

    face([[X0, 0, ZB], [X1, 0, ZB], [X1, 2.9, ZB], [X0, 2.9, ZB]], TONE.wall, [0, 0, -1], 0);
    face([[X0, 0, ZB - 0.01], [X1, 0, ZB - 0.01], [X1, 0.12, ZB - 0.01], [X0, 0.12, ZB - 0.01]], TONE.skirting, [0, 0, -1], 0.1);
    face([[X0, 1.02, ZB - 0.015], [X1, 1.02, ZB - 0.015], [X1, 1.1, ZB - 0.015], [X0, 1.1, ZB - 0.015]], TONE.wallTop, [0, 0, -1], 0.14);
    [[X0, 1], [X1, -1]].forEach(function (w) {
      face([[w[0], 0, 0.5], [w[0], 0, ZB], [w[0], 2.9, ZB], [w[0], 2.9, 0.5]], shade(TONE.wall2, w[1] > 0 ? 1 : 0.88), [-w[1], 0, 0], 0);
    });

    /* shelf with product, back wall right */
    box(2.6, 1.52, ZB - 0.14, 2.4, 0.05, 0.26, TONE.shelf, 0.35);
    [[1.85, TONE.bottle, 0.34], [2.34, TONE.label, 0.26], [2.82, TONE.bottle2, 0.3], [3.3, TONE.label, 0.22]].forEach(function (b, bi) {
      drum(b[0], 1.57, ZB - 0.14, 0.055, b[2], 10, b[1], 0.42 + bi * 0.04);
      drum(b[0], 1.57 + b[2], ZB - 0.14, 0.03, 0.06, 8, TONE.cap, 0.44 + bi * 0.04);
    });

    /* ---- wash tub, back right ---- */
    var TX = 2.55, TZ = 9.0;
    (function () {
      var seg = 16;
      for (i = 0; i < seg; i++) {
        var a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        var m = Math.sin((a0 + a1) / 2), nz = Math.cos((a0 + a1) / 2);
        face([[TX + Math.cos(a0) * 0.64, 0.02, TZ + Math.sin(a0) * 0.76],
              [TX + Math.cos(a1) * 0.64, 0.02, TZ + Math.sin(a1) * 0.76],
              [TX + Math.cos(a1) * 0.58, 0.62, TZ + Math.sin(a1) * 0.69],
              [TX + Math.cos(a0) * 0.58, 0.62, TZ + Math.sin(a0) * 0.69]],
          shade(TONE.tub, 0.7 + 0.5 * Math.max(0, nz)), [m, 0, nz], 0.2);
        /* inner wall, a touch lower and darker */
        face([[TX + Math.cos(a1) * 0.54, 0.3, TZ + Math.sin(a1) * 0.64],
              [TX + Math.cos(a0) * 0.54, 0.3, TZ + Math.sin(a0) * 0.64],
              [TX + Math.cos(a0) * 0.54, 0.63, TZ + Math.sin(a0) * 0.64],
              [TX + Math.cos(a1) * 0.54, 0.63, TZ + Math.sin(a1) * 0.64]],
          shade(TONE.tubIn, 0.92), [-m, 0.18, -nz], 0.24);
        /* rim */
        face([[TX + Math.cos(a0) * 0.54, 0.63, TZ + Math.sin(a0) * 0.64],
              [TX + Math.cos(a1) * 0.54, 0.63, TZ + Math.sin(a1) * 0.64],
              [TX + Math.cos(a1) * 0.65, 0.63, TZ + Math.sin(a1) * 0.77],
              [TX + Math.cos(a0) * 0.65, 0.63, TZ + Math.sin(a0) * 0.77]],
          shade(TONE.tubRim, 1.16), [0, 1, 0], 0.26);
      }
      flat(TX, TZ, 0.54, 0.3, 16, TONE.water, 0.3);
      /* legs */
      [[-0.44, -0.5], [0.44, -0.5], [-0.44, 0.5], [0.44, 0.5]].forEach(function (q) {
        box(TX + q[0], 0, TZ + q[1], 0.07, 0.16, 0.07, TONE.chrome, 0.18);
      });
      /* tap on the back rim, spout turned down into the tub */
      box(TX - 0.06, 0.63, TZ + 0.72, 0.09, 0.26, 0.09, TONE.chrome, 0.34);
      box(TX - 0.06, 0.85, TZ + 0.6, 0.07, 0.07, 0.3, TONE.chrome, 0.36);
      drum(TX - 0.06, 0.68, TZ + 0.48, 0.045, 0.18, 8, TONE.chrome, 0.38);
    })();

    /* ---- the table ---- */
    var GX = 1.15, GZ = 4.5, TOP = 0.74;
    (function () {
      box(GX, TOP, GZ, 1.5, 0.07, 0.82, TONE.timberHi, 0.5);
      box(GX, TOP - 0.09, GZ, 1.42, 0.06, 0.74, TONE.timber, 0.48);
      [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].forEach(function (q, qi) {
        box(GX + q[0], 0.02, GZ + q[1], 0.055, TOP - 0.16, 0.055, TONE.steel, 0.42 + qi * 0.02);
      });
      box(GX, 0.28, GZ, 1.24, 0.045, 0.6, TONE.steelDk, 0.6);
      /* arm and crossbar */
      box(GX - 0.6, TOP + 0.03, GZ - 0.3, 0.055, 0.92, 0.055, TONE.steelHi, 0.62);
      box(GX - 0.6, TOP + 0.9, GZ - 0.3, 0.05, 0.05, 0.44, TONE.steelHi, 0.68);
      /* tools, laid out left to right */
      /* clippers */
      box(GX - 0.42, TOP + 0.04, GZ + 0.08, 0.26, 0.075, 0.1, TONE.dark, 0.78);
      box(GX - 0.58, TOP + 0.055, GZ + 0.08, 0.05, 0.05, 0.1, TONE.blade, 0.82);
      box(GX - 0.3, TOP + 0.075, GZ + 0.08, 0.07, 0.03, 0.07, TONE.rubber, 0.84);
      /* scissors, blades crossed */
      [[-0.24, 0.12, 0.14], [-0.2, 0.12, -0.14]].forEach(function (sc, si) {
        box(GX + sc[0], TOP + 0.045, GZ - 0.06, 0.05, sc[1] / 6, 0.26, TONE.blade, 0.9 + si * 0.02);
        flat(GX + sc[0] + 0.045, GZ - 0.22, 0.038, TOP + 0.05, 10, TONE.chrome, 0.94 + si * 0.02);
        flat(GX + sc[0] + 0.045, GZ - 0.22, 0.022, TOP + 0.051, 8, TONE.grout, 0.95 + si * 0.02);
      });
      /* comb */
      box(GX + 0.12, TOP + 0.04, GZ + 0.16, 0.24, 0.02, 0.09, TONE.rubber, 0.86);
      for (i = 0; i < 7; i++) {
        box(GX + 0.02 + i * 0.033, TOP + 0.02, GZ + 0.16, 0.012, 0.02, 0.09, TONE.steelDk, 0.86);
      }
      /* slicker brush */
      box(GX + 0.28, TOP + 0.04, GZ - 0.12, 0.2, 0.04, 0.11, TONE.timber, 0.9);
      box(GX + 0.2, TOP + 0.08, GZ - 0.12, 0.05, 0.03, 0.05, TONE.timberDk, 0.9);
      for (i = 0; i < 8; i++) {
        box(GX + 0.24 + (i % 4) * 0.045, TOP + 0.08, GZ - 0.15 + Math.floor(i / 4) * 0.06, 0.008, 0.014, 0.008, TONE.steelHi, 0.92);
      }
      /* folded towel at the tail of the table */
      box(GX + 0.4, TOP + 0.075, GZ + 0.22, 0.34, 0.045, 0.26, TONE.towel, 0.8);
      box(GX + 0.4, TOP + 0.12, GZ + 0.22, 0.32, 0.04, 0.24, TONE.towelDk, 0.84);
      /* hook marks, not decoration: table edge band */
      box(GX, TOP - 0.02, GZ + 0.42, 1.5, 0.03, 0.02, TONE.timberDk, 0.5);
    })();

    /* pendant lamp over the table */
    var LX = GX, LY = 2.24, LZ = GZ + 0.1;
    box(LX, 2.62, LZ, 0.03, 0.36, 0.03, TONE.steelDk, 0.7);
    (function () {
      var ring = [];
      for (i = 0; i < 14; i++) {
        var a = (i / 14) * Math.PI * 2;
        ring.push([a, LX + Math.cos(a) * 0.2, LZ + Math.sin(a) * 0.2]);
      }
      for (i = 0; i < ring.length; i++) {
        var r1 = ring[i], r2 = ring[(i + 1) % ring.length];
        face([[LX, LY + 0.16, LZ], [r1[1], r1[2], LY], [r2[1], r2[2], LY], [LX, LY + 0.16, LZ]],
          shade(TONE.dark, 1.05), [Math.cos((r1[0] + r2[0]) / 2), 0.4, Math.sin((r1[0] + r2[0]) / 2)], 0.74);
      }
      flat(LX, LZ, 0.085, LY + 0.01, 10, TONE.lamp, 0.76);
    })();

    /* shampoo bottle and spray bottle on the floor, foreground left */
    drum(-1.05, 0.02, 2.3, 0.1, 0.26, 12, TONE.bottle, 1.0);
    drum(-1.05, 0.28, 2.3, 0.045, 0.07, 8, TONE.cap, 1.02);
    face([[-1.13, 0.11, 2.3], [-0.97, 0.11, 2.3], [-0.97, 0.22, 2.3], [-1.13, 0.22, 2.3]], TONE.label, [0, 0, 1], 1.04);
    drum(-0.62, 0.02, 1.45, 0.075, 0.2, 10, '#dfe6ea', 1.06);
    drum(-0.62, 0.22, 1.45, 0.028, 0.09, 8, TONE.cap, 1.08);
    box(-0.55, 0.3, 1.45, 0.1, 0.03, 0.03, TONE.cap, 1.1);

    /* hoses and cords, drawn as runs */
    var HOSE = [[TX + 0.05, 0.82, TZ + 0.5], [TX - 0.4, 0.7, TZ + 0.2], [TX - 0.55, 0.3, TZ - 0.4],
                [TX - 0.3, 0.03, TZ - 0.95], [TX + 0.5, 0.02, TZ - 1.1], [TX + 1.1, 0.02, TZ - 0.4]];
    var CORD = [[GX - 0.46, TOP + 0.06, GZ + 0.06], [GX - 0.5, TOP + 0.02, GZ + 0.5],
                [GX - 0.2, 0.02, GZ + 0.9], [GX + 0.5, 0.02, GZ + 1.2]];

    return {
      duration: 2.3,
      render: function (t, ts) {
        var time = ts == null ? t : ts;
        if (Projection.reduced()) { t = 4; time = 0; }
        S.yaw = Projection.reduced() ? 0 : Math.sin(time * 0.08) * 0.026;

        var sky = S.ctx.createLinearGradient(0, 0, 0, S.H);
        sky.addColorStop(0, '#08202f');
        sky.addColorStop(0.42, '#0e2c40');
        sky.addColorStop(0.72, '#153a4d');
        sky.addColorStop(1, '#12303f');
        S.ctx.fillStyle = sky; S.ctx.fillRect(0, 0, S.W, S.H);

        var glow = S.ctx.createRadialGradient(S.W * 0.56, S.horizon * 0.86, 0, S.W * 0.56, S.horizon * 0.86, S.W * 0.72);
        glow.addColorStop(0, 'rgba(255,196,160,0.18)');
        glow.addColorStop(0.5, 'rgba(255,196,160,0.05)');
        glow.addColorStop(1, 'rgba(255,196,160,0)');
        S.ctx.fillStyle = glow; S.ctx.fillRect(0, 0, S.W, S.H);

        var list = [], p, pts, sum, mapped, miss, f;
        for (i = 0; i < faces.length; i++) {
          f = faces[i];
          if (t < f.t0) continue;
          mapped = []; sum = 0; miss = false;
          for (var qi = 0; qi < f.pts.length; qi++) {
            p = S.project(f.pts[qi][0], f.pts[qi][1], f.pts[qi][2]);
            if (!p) { miss = true; break; }
            mapped.push(p); sum += p[2];
          }
          if (miss) continue;
          var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
          var d = (n[0] / nm) * LIGHT[0] + (n[1] / nm) * LIGHT[1] + (n[2] / nm) * LIGHT[2];
          var dz = sum / mapped.length;
          list.push({
            pts: mapped, dz: dz,
            fill: Projection.mix(shade(f.tone, 0.56 + 0.6 * Math.max(0, d)), FOG, S.fog(dz) * 0.6),
            a: Math.min(1, (t - f.t0) / 0.4) * f.a
          });
        }
        list.sort(function (a, b) { return b.dz - a.dz; });
        for (i = 0; i < list.length; i++) {
          var it = list[i]; pts = it.pts;
          if (it.a <= 0.02) continue;
          S.ctx.globalAlpha = it.a;
          S.ctx.beginPath(); S.ctx.moveTo(pts[0][0], pts[0][1]);
          for (var j = 1; j < pts.length; j++) S.ctx.lineTo(pts[j][0], pts[j][1]);
          S.ctx.closePath(); S.ctx.fillStyle = it.fill; S.ctx.fill();
        }
        S.ctx.globalAlpha = 1;

        /* contact shadows under the table and tub */
        [[GX, GZ, 1.0, 0.5], [TX, TZ, 0.9, 0.42]].forEach(function (sh) {
          var cp = S.project(sh[0], 0.003, sh[1]);
          if (!cp) return;
          var rr = S.focal / cp[2] * sh[2];
          S.ctx.save(); S.ctx.translate(cp[0], cp[1]); S.ctx.scale(1, 0.32);
          var cg = S.ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
          cg.addColorStop(0, 'rgba(14,26,34,' + sh[3] + ')'); cg.addColorStop(1, 'rgba(14,26,34,0)');
          S.ctx.fillStyle = cg; S.ctx.beginPath(); S.ctx.arc(0, 0, rr, 0, 6.2832); S.ctx.fill();
          S.ctx.restore();
        });

        /* the noose hung from the arm: a loop under the crossbar */
        if (t > 0.9) {
          var nk = Math.min(1, (t - 0.9) / 0.5);
          S.ctx.strokeStyle = 'rgba(219,225,229,' + (0.75 * nk).toFixed(2) + ')';
          S.ctx.lineWidth = 2;
          S.ctx.beginPath();
          for (var q2 = 0; q2 <= 26; q2++) {
            var ang = (q2 / 26) * Math.PI * 2;
            var lp = S.project(GX - 0.6 + Math.cos(ang) * 0.11, TOP + 0.68 + Math.sin(ang) * 0.13 * nk, GZ - 0.3);
            if (!lp) continue;
            if (q2 === 0) S.ctx.moveTo(lp[0], lp[1]); else S.ctx.lineTo(lp[0], lp[1]);
          }
          S.ctx.stroke();
          var hp = S.project(GX - 0.6, TOP + 0.92, GZ - 0.3);
          var he = S.project(GX - 0.6, TOP + 0.81, GZ - 0.3);
          if (hp && he) {
            S.ctx.beginPath(); S.ctx.moveTo(hp[0], hp[1]); S.ctx.lineTo(he[0], he[1]); S.ctx.stroke();
          }
        }

        /* water in the tub: a live surface, ripples from the tap */
        var wp = S.project(TX, 0.31, TZ);
        if (wp) {
          var wr = S.focal / wp[2] * 0.5;
          S.ctx.save(); S.ctx.translate(wp[0], wp[1]); S.ctx.scale(1, 0.44);
          var wg = S.ctx.createRadialGradient(0, 0, 0, 0, 0, wr);
          wg.addColorStop(0, 'rgba(126,177,190,0.55)');
          wg.addColorStop(0.7, 'rgba(96,146,162,0.4)');
          wg.addColorStop(1, 'rgba(80,126,142,0.25)');
          S.ctx.fillStyle = wg; S.ctx.beginPath(); S.ctx.arc(0, 0, wr, 0, 6.2832); S.ctx.fill();
          S.ctx.restore();
          for (var r2 = 0; r2 < 3; r2++) {
            var ph = ((time * 0.26 + r2 * 0.33) % 1);
            S.ctx.strokeStyle = 'rgba(198,232,238,' + ((1 - ph) * 0.4).toFixed(3) + ')';
            S.ctx.lineWidth = 1.2;
            S.ctx.beginPath();
            for (var r3 = 0; r3 <= 24; r3++) {
              var ra = (r3 / 24) * Math.PI * 2;
              var rp = S.project(TX - 0.06 + Math.cos(ra) * 0.4 * ph, 0.315, TZ + 0.5 + Math.sin(ra) * 0.4 * ph * 0.9);
              if (!rp) continue;
              if (r3 === 0) S.ctx.moveTo(rp[0], rp[1]); else S.ctx.lineTo(rp[0], rp[1]);
            }
            S.ctx.stroke();
          }
        }

        /* the hose, still hanging into the tub */
        if (t > 0.75) {
          var hk = Math.min(1, (t - 0.75) / 0.6), c = S.ctx; c.lineCap = 'round';
          var run = Math.max(2, Math.round(HOSE.length * hk));
          [[6, 'rgba(10,24,32,.5)'], [3.4, '#9fa8ad'], [1.1, 'rgba(228,235,238,.4)']].forEach(function (pass) {
            c.lineWidth = pass[0]; c.strokeStyle = pass[1]; c.beginPath();
            for (var h = 0; h < run; h++) {
              var hpp = S.project(HOSE[h][0], HOSE[h][1], HOSE[h][2]);
              if (!hpp) continue;
              if (h === 0) c.moveTo(hpp[0], hpp[1]); else c.lineTo(hpp[0], hpp[1]);
            }
            c.stroke();
          });
        }
        /* clipper cord on the table and down to the floor */
        if (t > 0.98) {
          var ck = Math.min(1, (t - 0.98) / 0.55), cc = S.ctx; cc.lineCap = 'round';
          var crun = Math.max(2, Math.round(CORD.length * ck));
          [[4, 'rgba(10,24,32,.45)'], [1.6, TONE.dark]].forEach(function (pass) {
            cc.lineWidth = pass[0]; cc.strokeStyle = pass[1]; cc.beginPath();
            for (var h2 = 0; h2 < crun; h2++) {
              var cp2 = S.project(CORD[h2][0], CORD[h2][1], CORD[h2][2]);
              if (!cp2) continue;
              if (h2 === 0) cc.moveTo(cp2[0], cp2[1]); else cc.lineTo(cp2[0], cp2[1]);
            }
            cc.stroke();
          });
        }

        /* pendant pool on the table top */
        var tp = S.project(LX, TOP + 0.1, LZ);
        if (tp) {
          var tr = S.focal / tp[2] * 0.8;
          var tg = S.ctx.createRadialGradient(tp[0], tp[1], 0, tp[0], tp[1], tr);
          tg.addColorStop(0, 'rgba(255,216,178,0.34)');
          tg.addColorStop(0.6, 'rgba(255,204,160,0.1)');
          tg.addColorStop(1, 'rgba(255,200,150,0)');
          S.ctx.fillStyle = tg; S.ctx.fillRect(tp[0] - tr, tp[1] - tr, tr * 2, tr * 2);
          var bl = S.project(LX, LY + 0.04, LZ);
          if (bl) {
            var bg = S.ctx.createRadialGradient(bl[0], bl[1], 0, bl[0], bl[1], S.H * 0.14);
            bg.addColorStop(0, 'rgba(255,236,206,.9)'); bg.addColorStop(1, 'rgba(255,214,168,0)');
            S.ctx.fillStyle = bg; S.ctx.beginPath(); S.ctx.arc(bl[0], bl[1], S.H * 0.14, 0, 6.2832); S.ctx.fill();
          }
        }

        /* steam off the tub, slow */
        if (!Projection.reduced()) {
          for (i = 0; i < 16; i++) {
            var sp = ((time * 0.06 + i * 0.062) % 1);
            var mp = S.project(TX - 0.2 + Math.sin(time * 0.4 + i) * 0.22, 0.34 + sp * 1.1, TZ + 0.1 - (i % 4) * 0.14);
            if (!mp) continue;
            var ma = (1 - sp) * 0.22;
            if (ma <= 0.01) continue;
            S.ctx.fillStyle = 'rgba(236,244,246,' + ma.toFixed(3) + ')';
            S.ctx.beginPath(); S.ctx.arc(mp[0], mp[1], 5 + sp * 14, 0, 6.2832); S.ctx.fill();
          }
        }

        /* grade: seat the copy left, hold the foot */
        var vg = S.ctx.createLinearGradient(0, 0, S.W * 0.66, 0);
        vg.addColorStop(0, 'rgba(8,24,36,0.92)');
        vg.addColorStop(0.52, 'rgba(8,24,36,0.5)');
        vg.addColorStop(1, 'rgba(8,24,36,0)');
        S.ctx.fillStyle = vg; S.ctx.fillRect(0, 0, S.W, S.H);
        var bt = S.ctx.createLinearGradient(0, S.H - 120, 0, S.H);
        bt.addColorStop(0, 'rgba(8,24,36,0)'); bt.addColorStop(1, 'rgba(8,24,36,0.6)');
        S.ctx.fillStyle = bt; S.ctx.fillRect(0, S.H - 120, S.W, 120);
        var tt = S.ctx.createLinearGradient(0, 0, 0, 110);
        tt.addColorStop(0, 'rgba(8,24,36,0.6)'); tt.addColorStop(1, 'rgba(8,24,36,0)');
        S.ctx.fillStyle = tt; S.ctx.fillRect(0, 0, S.W, 110);
      }
    };
  };

  global.Projection = Projection;

  global.Projection = Projection;

})(window);
