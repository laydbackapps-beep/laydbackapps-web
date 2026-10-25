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

  global.Projection = Projection;
})(window);
