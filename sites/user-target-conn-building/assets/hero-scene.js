/* Hero scene: a carpenter's set-out bench. Sawhorse carrying a circular saw,
   hammer, level and tape; stacked studs, a brick pallet and a part-framed wall
   running away into fog. One projection, world-space faces, far-to-near sort. */
(function () {
  var cv = document.getElementById('heroCanvas');
  if (!cv || !window.Projection) return;
  var P = Projection, mix = P.mix;
  var FOG = '#2B3034';
  var S = P.create(cv, { focal: 1.32, horizon: 0.47, camY: 1.54, fogNear: 6.5, fogFar: 34, fogCol: FOG });
  var ctx = S.ctx;

  var T = {
    sand: '#8E8578', sand2: '#7C7468', joint: '#655E54',
    timber: '#B08150', timberD: '#8B6238', plate: '#6E4C2B', cut: '#D8B283',
    steel: '#BFC7C9', steelD: '#8E9799', chrome: '#DCE2E3',
    blade: '#CBD3D4', guard: '#9C1F52', guardHi: '#C93A74',
    plastic: '#2C2C2E', plastic2: '#3A3A3D', case: '#E0483F',
    brick: '#9A5B45', brick2: '#8A4E3A', pallet: '#A98A5C',
    stake: '#C9C2B4', line: '#E9E6DE', dust: '#CFC8BA'
  };

  var L = (function () { var v = [-0.5, 0.8, -0.33], m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; })();
  function sh(col, k) { return k >= 1 ? mix(col, '#ffffff', (k - 1) * 0.42) : mix(col, '#12161A', (1 - k) * 0.5); }

  var faces = [];
  var seed = 90210;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function face(pts, col, n, t0) { faces.push({ p: pts, c: col, n: n || [0, 1, 0], t: t0 || 0 }); }

  function box(cx, cy, cz, w, h, d, col, t0) {
    var x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy, y1 = cy + h, z0 = cz - d / 2, z1 = cz + d / 2;
    face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], sh(col, 1), [0, 0, 1], t0);
    face([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], sh(col, 0.74), [0, 0, -1], t0);
    face([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], sh(col, 0.88), [1, 0, 0], t0);
    face([[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], sh(col, 1.12), [-1, 0, 0], t0);
    face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], sh(col, 1.2), [0, 1, 0], t0);
  }

  /* a bar running between two world points, given a section */
  function bar(a, b, w, d, col, t0) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    var len = Math.hypot(dx, dy, dz) || 1;
    var ux = dx / len, uy = dy / len, uz = dz / len;
    var nx = -uy * w / 2, ny = ux * w / 2;
    var p = [[a[0] - nx, a[1] - ny, a[2] - uz * d / 2], [b[0] - nx, b[1] - ny, b[2] - uz * d / 2],
             [b[0] + nx, b[1] + ny, b[2] + uz * d / 2], [a[0] + nx, a[1] + ny, a[2] + uz * d / 2]];
    face(p, sh(col, 1.06), [nx, ny, 0], t0);
    face([[a[0] + nx, a[1] + ny, a[2] - uz * d / 2], [b[0] + nx, b[1] + ny, b[2] - uz * d / 2],
          [b[0] + nx, b[1] + ny, b[2] + uz * d / 2], [a[0] + nx, a[1] + ny, a[2] + uz * d / 2]],
      sh(col, 0.8), [nx, ny, 0], t0);
    face([[a[0], a[1] + w / 2, a[2] + d / 2], [b[0], b[1] + w / 2, b[2] + d / 2],
          [b[0], b[1] - w / 2, b[2] + d / 2], [a[0], a[1] - w / 2, a[2] + d / 2]], sh(col, 0.92), [0, 0, 1], t0);
  }

  function discZ(cx, cy, cz, r, col, t0, teeth) {
    var pts = [], n = 40;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2, rr = teeth && i % 3 === 0 ? r * 1.09 : r;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cz]);
    }
    face(pts, col, [0, 0, 1], t0);
  }

  /* ---- ground: compacted site, cut lines running away ---- */
  face([[-16, 0, 1.0], [16, 0, 1.0], [16, 0, 30], [-16, 0, 30]], T.sand, [0, 1, 0], 0);
  for (var zz = 1.4; zz < 15; zz += 1.15) {
    face([[-16, 0.002, zz], [16, 0.002, zz], [16, 0.002, zz + 0.1], [-16, 0.002, zz + 0.1]], T.joint, [0, 1, 0], 0);
  }
  face([[-16, 0.004, 1.0], [16, 0.004, 1.0], [16, 0.004, 2.1], [-16, 0.004, 2.1]], T.sand2, [0, 1, 0], 0);

  /* ---- sawhorse ---- */
  var hz = 2.86, hy = 0.78;
  bar([-0.94, hy, hz], [0.94, hy, hz], 0.14, 0.05, T.timber, 0);
  bar([-0.7, 0, hz + 0.55], [-0.56, hy, hz], 0.05, 0.05, T.timberD, 0);
  bar([-0.7, 0, hz - 0.55], [-0.56, hy, hz], 0.05, 0.05, T.timberD, 0);
  bar([0.7, 0, hz + 0.55], [0.56, hy, hz], 0.05, 0.05, T.timberD, 0);
  bar([0.7, 0, hz - 0.55], [0.56, hy, hz], 0.05, 0.05, T.timberD, 0);
  bar([-0.72, 0.34, hz + 0.3], [0.72, 0.34, hz + 0.3], 0.05, 0.03, T.timberD, 0);

  /* ---- circular saw resting on the horse ---- */
  var sx = 0.3, szz = hz - 0.02, sy = hy + 0.075;
  box(sx, sy, szz, 0.34, 0.024, 0.2, T.steel, 0);
  discZ(sx + 0.09, sy + 0.13, szz + 0.075, 0.115, T.blade, 0, true);
  for (var gb = 0; gb < 9; gb++) {
    var a0 = Math.PI * 0.55 + gb * 0.2, a1 = a0 + 0.17;
    face([[sx + 0.09 + Math.cos(a0) * 0.114, sy + 0.13 + Math.sin(a0) * 0.114, szz + 0.082],
          [sx + 0.09 + Math.cos(a0) * 0.137, sy + 0.13 + Math.sin(a0) * 0.137, szz + 0.082],
          [sx + 0.09 + Math.cos(a1) * 0.137, sy + 0.13 + Math.sin(a1) * 0.137, szz + 0.082],
          [sx + 0.09 + Math.cos(a1) * 0.114, sy + 0.13 + Math.sin(a1) * 0.114, szz + 0.082]], T.guardHi, [0, 0, 1], 0);
  }
  box(sx - 0.04, sy + 0.02, szz + 0.06, 0.14, 0.1, 0.12, T.guard, 0);
  bar([sx - 0.1, sy + 0.11, szz - 0.02], [sx - 0.19, sy + 0.2, szz - 0.05], 0.045, 0.05, T.plastic, 0);
  bar([sx - 0.19, sy + 0.2, szz - 0.05], [sx - 0.25, sy + 0.285, szz - 0.05], 0.05, 0.055, T.plastic2, 0);

  /* ---- hammer ---- */
  bar([-0.62, hy + 0.03, hz + 0.14], [-0.16, hy + 0.032, hz + 0.06], 0.032, 0.028, T.cut, 0);
  box(-0.68, hy + 0.012, hz + 0.15, 0.12, 0.05, 0.055, T.steelD, 0);

  /* ---- spirit level ---- */
  bar([-0.88, hy + 0.035, hz - 0.05], [-0.28, hy + 0.035, hz - 0.02], 0.05, 0.03, T.chrome, 0);
  for (var v = 0; v < 3; v++) {
    box(-0.78 + v * 0.24, hy + 0.068, hz - 0.036, 0.035, 0.012, 0.02, T.guardHi, 0);
  }

  /* ---- tape measure ---- */
  box(0.62, hy + 0.045, hz + 0.1, 0.09, 0.09, 0.09, T.plastic, 0);
  box(0.62, hy + 0.045, hz + 0.1, 0.05, 0.05, 0.092, T.case, 0);

  /* ---- stacked studs on the left, receding ---- */
  var stack = [[-2.55, 3.4], [-2.78, 5.0], [-2.4, 6.6]];
  for (var s2 = 0; s2 < stack.length; s2++) {
    for (var c = 0; c < 4; c++) {
      var bx = stack[s2][0] + (rnd() - 0.5) * 0.06, bz = stack[s2][1] + (rnd() - 0.5) * 0.3;
      box(bx, 0.045 + c * 0.05, bz, 0.1, 0.045, 2.2 + rnd() * 0.4, c % 2 ? T.timber : T.timberD, 0);
    }
  }

  /* ---- brick pallet on the right ---- */
  box(2.35, 0.06, 3.9, 0.9, 0.1, 0.62, T.pallet, 0);
  for (var r2 = 0; r2 < 5; r2++) {
    for (var b2 = 0; b2 < 4; b2++) {
      box(2.35 - 0.1 + (r2 % 2) * 0.05, 0.11 + r2 * 0.09, 3.66 + b2 * 0.14, 0.72, 0.085, 0.12, b2 % 2 ? T.brick : T.brick2, 0);
    }
  }

  /* ---- part-framed wall running away, then a gable ---- */
  var wallZ = 11.5;
  bar([-3.4, 0, wallZ], [3.4, 0, wallZ], 0.09, 0.045, T.plate, 0.1);
  bar([-3.4, 2.42, wallZ], [3.4, 2.42, wallZ], 0.09, 0.045, T.plate, 0.15);
  for (var st = 0; st <= 8; st++) {
    var stx = -3.2 + st * 0.8;
    bar([stx, 0.05, wallZ], [stx, 2.42, wallZ], 0.09, 0.045, T.timber, 0.2 + st * 0.06);
  }
  bar([-3.4, 1.3, wallZ - 0.01], [3.4, 1.3, wallZ - 0.01], 0.08, 0.04, T.timberD, 0.5);
  bar([-3.5, 2.5, wallZ], [0, 3.5, wallZ], 0.085, 0.042, T.timber, 0.8);
  bar([3.5, 2.5, wallZ], [0, 3.5, wallZ], 0.085, 0.042, T.timber, 0.85);
  bar([0, 2.5, wallZ], [0, 3.52, wallZ], 0.08, 0.04, T.timberD, 0.9);

  /* second, closer partially clad frame on the far left */
  bar([-4.6, 0, 8.4], [-1.9, 0, 8.4], 0.09, 0.045, T.plate, 0.3);
  for (var st2 = 0; st2 <= 3; st2++) {
    bar([-4.6 + st2 * 0.9, 0.05, 8.4], [-4.6 + st2 * 0.9, 2.4, 8.4], 0.09, 0.045, T.timber, 0.36 + st2 * 0.06);
  }

  /* ---- string line between two pegs, crossing the foreground ---- */
  bar([-1.95, 0, 2.15], [-1.95, 0.6, 2.15], 0.05, 0.05, T.stake, 0);
  bar([1.95, 0, 2.35], [1.95, 0.6, 2.35], 0.05, 0.05, T.stake, 0);
  bar([-1.95, 0.58, 2.15], [0, 0.5, 2.25], 0.012, 0.012, T.line, 0);
  bar([0, 0.5, 2.25], [1.95, 0.58, 2.35], 0.012, 0.012, T.line, 0);

  var motes = [];
  for (var m = 0; m < 34; m++) motes.push({ x: rnd(), y: rnd(), z: 0.3 + rnd(), s: 0.6 + rnd() * 1.6, p: rnd() * 6.28 });

  function draw(t) {
    var g = ctx.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, '#20262A');
    g.addColorStop(0.55, '#2C3237');
    g.addColorStop(1, '#181C1F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S.W, S.H);

    var list = [], i, j;
    for (i = 0; i < faces.length; i++) {
      var f = faces[i];
      if (t < f.t) continue;
      var map = [], sum = 0, ok = true;
      for (j = 0; j < f.p.length; j++) {
        var pr = S.project(f.p[j][0], f.p[j][1], f.p[j][2]);
        if (!pr) { ok = false; break; }
        map.push(pr); sum += pr[2];
      }
      if (!ok) continue;
      var dz = sum / map.length;
      var n = f.n, nm = Math.hypot(n[0], n[1], n[2]) || 1;
      var lit = 0.52 + 0.6 * Math.max(0, (n[0] / nm) * L[0] + (n[1] / nm) * L[1] + (n[2] / nm) * L[2]);
      list.push({ p: map, dz: dz, fill: mix(sh(f.c, lit), FOG, S.fog(dz) * 0.72) });
    }
    list.sort(function (a, b) { return b.dz - a.dz; });
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      ctx.beginPath(); ctx.moveTo(it.p[0][0], it.p[0][1]);
      for (j = 1; j < it.p.length; j++) ctx.lineTo(it.p[j][0], it.p[j][1]);
      ctx.closePath(); ctx.fillStyle = it.fill; ctx.fill();
    }

    /* dust in the light */
    for (i = 0; i < motes.length; i++) {
      var mo = motes[i];
      var y = (mo.y + t * 0.006 * mo.z) % 1;
      var x = mo.x + 0.014 * Math.sin(t * 0.3 + mo.p);
      ctx.fillStyle = 'rgba(223,216,203,' + (0.06 + 0.3 * mo.z * (0.5 + 0.5 * Math.sin(t * 1.1 + mo.p))).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x * S.W, y * S.H, mo.s * (0.5 + mo.z * 0.8), 0, 6.283); ctx.fill();
    }

    var vg = ctx.createRadialGradient(S.W * 0.46, S.H * 0.5, Math.min(S.W, S.H) * 0.28, S.W * 0.46, S.H * 0.5, Math.max(S.W, S.H) * 0.82);
    vg.addColorStop(0, 'rgba(10,13,15,0)'); vg.addColorStop(1, 'rgba(10,13,15,0.62)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, S.W, S.H);
  }

  S.frame(function (t) {
    S.yaw = Projection.reduced() ? 0 : Math.sin(t * 0.17) * 0.02;
    S.camX = Projection.reduced() ? 0 : Math.sin(t * 0.11) * 0.16;
    draw(t);
  });
})();
