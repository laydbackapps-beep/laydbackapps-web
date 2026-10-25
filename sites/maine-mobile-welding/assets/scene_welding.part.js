  /* ------------------------------------------------------------------ *
   * sceneWelding — a steel joint mid-run under the arc.
   * Arc light is the only key: bloom, spill on bench and slab, sparks on
   * ballistic paths that die on the floor, smoke lifting off the pool.
   * A mask silhouette sits near the lens so the frame reads at a glance.
   * ------------------------------------------------------------------ */
  Projection.sceneWelding = function (S, o) {
    o = o || {};
    var TONE = {
      slab: '#23262b', slab2: '#1c1f23', mottle: '#2b2f34', wall: '#282c31',
      wall2: '#1e2226', seam: '#15181b', steel: '#868c93', steelLo: '#5d646b',
      steelHi: '#b9c0c6', plate: '#6d747b', tack: '#c9a97e', mask: '#12151a',
      maskHi: '#1d2228', lens: '#3a2a1c', cable: '#24272c', tan: '#a08068',
      cut: '#41322a', offcut: '#4b525a'
    };
    for (var k in (o.tone || {})) TONE[k] = o.tone[k];

    var LIGHT = (function () {
      var l = [-0.2, 0.86, -0.5], m = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / m, l[1] / m, l[2] / m];
    })();
    var FOG = o.fogCol || '#101216';
    var faces = [];
    var X0 = -4.6, X1 = 4.6, ZFAR = 12.4;
    /* aspect shaper: keeps the subject right-of-centre on narrow screens */
    var ASP = 1;

    function shade(tone, lit) {
      return lit >= 1 ? Projection.mix(tone, '#ffd9b0', (lit - 1) * 0.7)
        : Projection.mix(tone, '#07080a', (1 - lit) * 0.82);
    }
    function face(pts, tone, n, t0, a) {
      faces.push({ pts: pts, tone: tone, n: n || [0, 1, 0], t0: t0 || 0, a: a == null ? 1 : a });
    }
    function box(cx, cy, cz, w, h, d, tone, t0) {
      var hw = w / 2, hd = d / 2;
      face([[cx - hw, cy, cz + hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 0.94), [0, 0, 1], t0);
      face([[cx - hw, cy, cz - hd], [cx + hw, cy, cz - hd], [cx + hw, cy + h, cz - hd], [cx - hw, cy + h, cz - hd]], shade(tone, 0.6), [0, 0, -1], t0);
      face([[cx + hw, cy, cz - hd], [cx + hw, cy, cz + hd], [cx + hw, cy + h, cz + hd], [cx + hw, cy + h, cz - hd]], shade(tone, 0.78), [1, 0, 0], t0);
      face([[cx - hw, cy, cz - hd], [cx - hw, cy, cz + hd], [cx - hw, cy + h, cz + hd], [cx - hw, cy + h, cz - hd]], shade(tone, 1.02), [-1, 0, 0], t0);
      face([[cx - hw, cy + h, cz - hd], [cx + hw, cy + h, cz - hd], [cx + hw, cy + h, cz + hd], [cx - hw, cy + h, cz + hd]], shade(tone, 1.16), [0, 1, 0], t0);
    }

    /* slab, mottle, back wall, left return */
    face([[X0, 0, -0.8], [X1, 0, -0.8], [X1, 0, ZFAR], [X0, 0, ZFAR]], TONE.slab, [0, 1, 0], 0);
    (function () {
      var s = 918273, i, w, h2, x, z;
      function rnd() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
      for (i = 0; i < 26; i++) {
        x = X0 + rnd() * (X1 - X0); z = 0.4 + rnd() * (ZFAR - 0.6);
        w = 0.3 + rnd() * 1.5; h2 = 0.2 + rnd() * 0.7;
        face([[x, 0.006, z], [x + w, 0.006, z], [x + w, 0.006, z - h2], [x, 0.006, z - h2]],
          rnd() > 0.5 ? TONE.mottle : TONE.slab2, [0, 1, 0], 0, 0.5);
      }
    })();
    face([[X0, 0.01, ZFAR], [X1, 0.01, ZFAR], [X1, 2.9, ZFAR], [X0, 2.9, ZFAR]], TONE.wall, [0, 0, -1], 0);
    for (var sx = X0 + 0.9; sx < X1; sx += 0.92) {
      face([[sx, 0, ZFAR - 0.01], [sx + 0.05, 0, ZFAR - 0.01], [sx + 0.05, 2.9, ZFAR - 0.01], [sx, 2.9, ZFAR - 0.01]], TONE.seam, [0, 0, -1], 0, 0.85);
    }
    face([[X0, 0, -0.6], [X0, 0, ZFAR], [X0, 2.9, ZFAR], [X0, 2.9, -0.6]], shade(TONE.wall2, 0.88), [1, 0, 0], 0);

    /* last job still on the slab: offcuts against the wall */
    (function () {
      var i, rows = [[-1.55, 0.35], [-0.95, 0.5], [-1.25, 0.28], [0.55, 0.42], [1.05, 0.24]];
      for (i = 0; i < rows.length; i++) {
        for (var lvl = 0; lvl < 3; lvl++) {
          box(rows[i][0], 0.04 + lvl * 0.09, 10.6 + rows[i][1], 1.1 - lvl * 0.1, 0.08, 0.24, TONE.offcut, 0.2 + i * 0.04);
        }
      }
      box(1.85, 0, 10.2, 0.14, 2.6, 0.14, TONE.steelLo, 0.3);
      box(2.55, 0, 10.6, 0.9, 1.1, 0.06, TONE.steelLo, 0.34);
    })();

    /* bench */
    var BZ = 4.9, BT = 0.94, BJX = 1.02;
    (function () {
      var bx = BJX, i;
      box(bx, BT, BZ, 2.5, 0.07, 0.78, TONE.plate, 0.1);
      for (i = 0; i < 4; i++) {
        box(bx - 1.05 + (i % 2) * 2.1, 0, BZ - 0.28 + Math.floor(i / 2) * 0.56, 0.08, BT, 0.08, TONE.steelLo, 0.14);
      }
      /* feet shadow */
      face([[bx - 1.3, 0.005, BZ + 0.42], [bx + 1.3, 0.005, BZ + 0.42], [bx + 1.3, 0.005, BZ - 0.42], [bx - 1.3, 0.005, BZ - 0.42]], '#121417', [0, 1, 0], 0.05, 0.55);
    })();

    /* the joint: two sections butted, gusset tacked, underside weld pool */
    (function () {
      var top = BT + 0.08, jx = BJX, jz = BZ + 0.02;
      /* lay-flat leg, runs to the left */
      box(jx - 0.86, top, jz, 1.28, 0.13, 0.2, TONE.steel, 0.2);
      /* upright leg */
      box(jx - 0.06, top, jz, 0.2, 0.86, 0.2, TONE.steel, 0.26);
      /* gusset plate, front face catching the arc */
      face([[jx - 0.16, top + 0.02, jz + 0.105], [jx + 0.42, top + 0.02, jz + 0.105],
            [jx + 0.42, top + 0.56, jz + 0.105], [jx - 0.16, top + 0.56, jz + 0.105]], shade(TONE.plate, 1.12), [0, 0, 1], 0.3);
      face([[jx - 0.16, top + 0.56, jz + 0.105], [jx + 0.42, top + 0.56, jz + 0.105],
            [jx + 0.42, top + 0.56, jz + 0.075], [jx - 0.16, top + 0.56, jz + 0.075]], shade(TONE.plate, 1.24), [0, 1, 0], 0.3);
      /* tacks and the bead already run along the inside corner */
      [[0.055, 0.1], [0.055, 0.3], [0.055, 0.5]].forEach(function (p, q) {
        box(jx + p[0], top + p[1], jz + 0.11, 0.1, 0.05, 0.03, TONE.tack, 0.36 + q * 0.03);
      });
      face([[jx - 0.2, top + 0.135, jz + 0.1], [jx + 0.52, top + 0.135, jz + 0.1],
            [jx + 0.52, top + 0.175, jz + 0.1], [jx - 0.2, top + 0.175, jz + 0.1]], TONE.cut, [0, 0, 1], 0.42, 0.9);
    })();

    /* torch in, from the right, cable looping off the bench */
    (function () {
      var top = BT + 0.08, jx = BJX, jz = BZ + 0.02;
      var hx = jx + 0.86, hy = top + 0.52, hz = jz + 0.42;
      var t0 = { x: jx + 0.30, y: top + 0.22, z: jz + 0.16 };
      var pts = [], i;
      for (i = 0; i <= 10; i++) {
        var u = i / 10;
        pts.push([Projection.lerp(hx, t0.x, u), Projection.lerp(hy, t0.y, u) + Math.sin(u * 3.1) * 0.06,
                  Projection.lerp(hz, t0.z, u)]);
      }
      for (i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1], w = 0.075 - i * 0.004;
        var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        var nn = [dy, -dx, 0], nm = Math.hypot(nn[0], nn[1]) || 1;
        face([[a[0] + nn[0] / nm * w, a[1] + nn[1] / nm * w, a[2] + dz * 0.1],
              [b[0] + nn[0] / nm * w, b[1] + nn[1] / nm * w, b[2] - dz * 0.1],
              [b[0] - nn[0] / nm * w, b[1] - nn[1] / nm * w, b[2] - dz * 0.1],
              [a[0] - nn[0] / nm * w, a[1] - nn[1] / nm * w, a[2] + dz * 0.1]],
          shade(i > 7 ? TONE.steelHi : TONE.steelLo, 1.05), [0, 0, 1], 0.4 + i * 0.006);
      }
      /* nozzle cap */
      box(t0.x + 0.02, t0.y - 0.02, t0.z, 0.09, 0.16, 0.09, TONE.maskHi, 0.46);
      /* cable off the back of the torch, dropping past the bench edge */
      var cab = [];
      for (i = 0; i <= 8; i++) {
        var v = i / 8;
        cab.push([hx + v * 0.5, hy - v * 0.85 - v * v * 0.2, hz + 0.1 + v * 0.12]);
      }
      for (i = 0; i < cab.length - 1; i++) {
        S.line(cab[i], cab[i + 1], TONE.cable, 3.2);
      }
      /* earth clamp biting the bench edge */
      box(BJX - 1.28, 0, BZ + 0.34, 0.12, 0.3, 0.3, TONE.steelLo, 0.5);
      S.line([BJX - 1.28, 0.3, BZ + 0.2], [BJX - 1.7, 0.02, BZ + 0.9], TONE.cable, 3);
    })();

    /* smoke, deterministic, lifting off the pool */
    var HY = 0, mokes = [], ms = 4411;
    function mrnd() { ms = (ms * 1103515245 + 12345) % 2147483648; return ms / 2147483648; }
    for (var q = 0; q < 22; q++) {
      mokes.push({ d: mrnd(), r: 10 + mrnd() * 30, p: mrnd() * 6.283, s: 0.5 + mrnd() });
    }

    var JOINT = [BJX + 0.06, BT + 0.16, BZ + 0.12];
    var sparks = [], ss = 20261023;
    function srnd() { ss = (ss * 1103515245 + 12345) % 2147483648; return ss / 2147483648; }
    for (var i2 = 0; i2 < 74; i2++) {
      sparks.push({
        vx: (srnd() - 0.28) * 2.9, vy: 0.5 + srnd() * 3.1, vz: (srnd() - 0.5) * 1.5,
        life: 0.42 + srnd() * 0.62, ph: srnd(), sz: 0.7 + srnd() * 1.5
      });
    }

    function glow(x, y, r, stops) {
      var g = S.ctx.createRadialGradient(x, y, 0, x, y, r);
      for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
      S.ctx.fillStyle = g;
      S.ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    return {
      duration: 2.2,
      render: function (t) {
        var i, j, f, p, a, time = t;
        ASP = Math.min(1, (S.W / S.H) / 1.5);
        S.camX = 0.02 * Math.sin(time * 0.28) * ASP;
        S.camY = 1.16 + 0.012 * Math.sin(time * 0.44);
        S.camZ = 0;
        HY = S.horizon;

        var out = [];
        for (i = 0; i < faces.length; i++) {
          f = faces[i];
          var q2 = Projection.clamp((time - f.t0) / 0.34, 0, 1);
          if (q2 <= 0) continue;
          var pts = [], vz = 0, behind = false;
          for (j = 0; j < f.pts.length; j++) {
            p = S.project(f.pts[j][0], f.pts[j][1], f.pts[j][2]);
            if (!p) { behind = true; break; }
            pts.push(p); vz += p[2];
          }
          if (behind || !pts.length) continue;
          out.push({ p: pts, tone: f.tone, a: f.a, vz: vz / pts.length, q: q2 });
        }
        out.sort(function (A, B) { return B.vz - A.vz; });

        for (i = 0; i < out.length; i++) {
          var s2 = out[i], ap = s2.q < 1 ? 0.35 + s2.q * 0.65 : 1;
          var col = Projection.mix(s2.tone, FOG, S.fog(s2.vz) * 0.82);
          S.ctx.beginPath();
          S.ctx.moveTo(s2.p[0][0], s2.p[0][1]);
          for (j = 1; j < s2.p.length; j++) S.ctx.lineTo(s2.p[j][0], s2.p[j][1]);
          S.ctx.closePath();
          S.ctx.fillStyle = col;
          S.ctx.globalAlpha = ap * (s2.a == null ? 1 : s2.a);
          S.ctx.fill();
          S.ctx.globalAlpha = 1;
        }

        var jp = S.project(JOINT[0], JOINT[1], JOINT[2]);
        if (!jp) return;
        var flk = 0.74 + 0.19 * Math.sin(time * 41) + 0.07 * Math.sin(time * 13.3 + 1.7);
        var R = Math.max(46, S.focal * 0.30);

        /* pooled light on bench and slab, and a wash on the wall */
        S.ctx.globalCompositeOperation = 'lighter';
        glow(jp[0], jp[1], R * 2.5, [[0, 'rgba(255,196,120,' + (0.20 * flk).toFixed(3) + ')'],
          [0.45, 'rgba(224,132,52,0.06)'], [1, 'rgba(180,96,30,0)']]);
        glow(jp[0], jp[1] + R * 0.5, R * 5.6, [[0, 'rgba(255,178,104,' + (0.10 * flk).toFixed(3) + ')'],
          [1, 'rgba(150,80,26,0)']]);
        glow(jp[0], HY, R * 6.5, [[0, 'rgba(255,186,112,' + (0.10 * flk).toFixed(3) + ')'],
          [1, 'rgba(120,64,20,0)']]);

        /* the arc itself: hot core, wings, hard inner ring */
        glow(jp[0], jp[1], R * 1.05, [[0, 'rgba(255,255,252,' + (0.95 * flk).toFixed(3) + ')'],
          [0.16, 'rgba(255,238,206,' + (0.78 * flk).toFixed(3) + ')'],
          [0.42, 'rgba(255,178,96,' + (0.32 * flk).toFixed(3) + ')'],
          [1, 'rgba(255,138,52,0)']]);
        glow(jp[0], jp[1], R * 0.30, [[0, 'rgba(255,255,255,' + (0.98 * flk).toFixed(3) + ')'], [1, 'rgba(255,246,226,0)']]);

        /* splatter: sparks on ballistic paths, trails, cooling */
        var g2 = 5.4;
        for (i = 0; i < sparks.length; i++) {
          var sp = sparks[i];
          var age = ((time * 0.9 + sp.ph) % sp.life);
          var px = JOINT[0] + sp.vx * age;
          var py = JOINT[1] + sp.vy * age - 0.5 * g2 * age * age;
          var pz = JOINT[2] + sp.vz * age;
          if (py < 0.02) continue;
          var hp = S.project(px, py, pz);
          if (!hp) continue;
          var k = age / sp.life;
          var ha = (1 - k) * 0.95;
          var hc = k < 0.18 ? '255,252,238' : k < 0.5 ? '255,206,128' : '236,138,58';
          S.ctx.strokeStyle = 'rgba(' + hc + ',' + (ha * 0.85).toFixed(3) + ')';
          S.ctx.lineWidth = Math.max(0.7, sp.sz * (1 - k) * 1.5);
          S.ctx.lineCap = 'round';
          S.ctx.beginPath();
          S.ctx.moveTo(hp[0], hp[1]);
          S.ctx.lineTo(hp[0] - sp.vx * age * 0.06 * S.focal / (hp[2] * 12),
                       hp[1] + (sp.vy - g2 * age) * 0.05 * S.focal / (hp[2] * 12));
          S.ctx.stroke();
          if (k < 0.35) {
            S.ctx.fillStyle = 'rgba(' + hc + ',' + ha.toFixed(3) + ')';
            S.ctx.beginPath(); S.ctx.arc(hp[0], hp[1], Math.max(0.5, sp.sz * (1 - k)), 0, 6.2832); S.ctx.fill();
          }
        }
        S.ctx.globalCompositeOperation = 'source-over';

        /* smoke lifting off the pool, warm on the underside */
        for (i = 0; i < mokes.length; i++) {
          var mk = mokes[i];
          var life = 3.4;
          var ma = ((time + mk.d * life) % life) / life;
          var mp = S.project(JOINT[0] + Math.sin(ma * 4 + mk.p) * 0.5, JOINT[1] + 0.06 + ma * 1.5, JOINT[2] + 0.12);
          if (!mp) continue;
          var rr = mk.r * (0.45 + ma * 1.7);
          var al = Math.sin(ma * Math.PI) * 0.13 * mk.s;
          if (al <= 0.004) continue;
          var S2 = S.ctx.createRadialGradient(mp[0], mp[1], 0, mp[0], mp[1], rr);
          S2.addColorStop(0, 'rgba(196,176,150,' + al.toFixed(3) + ')');
          S2.addColorStop(1, 'rgba(150,132,112,0)');
          S.ctx.fillStyle = S2;
          S.ctx.beginPath(); S.ctx.arc(mp[0], mp[1], rr, 0, 6.2832); S.ctx.fill();
        }

        /* foreground mask silhouette, near right, rimmed by the arc */
        (function () {
          var mz = 2.05, mx = 0.80 * (0.55 + 0.45 * ASP);
          var shell = [[-0.20, 0.98], [-0.24, 0.66], [-0.20, 0.40], [-0.06, 0.24], [0.12, 0.22],
                       [0.26, 0.36], [0.29, 0.62], [0.25, 0.96], [0.14, 1.06], [-0.07, 1.08]];
          var mapped = [], ok = true;
          for (var v = 0; v < shell.length; v++) {
            var mp2 = S.project(mx + shell[v][0], 0.60 + shell[v][1], mz);
            if (!mp2) { ok = false; break; } mapped.push(mp2);
          }
          if (!ok) return;
          S.ctx.beginPath();
          S.ctx.moveTo(mapped[0][0], mapped[0][1]);
          for (var w = 1; w < mapped.length; w++) S.ctx.lineTo(mapped[w][0], mapped[w][1]);
          S.ctx.closePath();
          S.ctx.fillStyle = TONE.mask;
          S.ctx.fill();
          /* lens */
          var l1 = S.project(mx - 0.15, 1.58, mz), l2 = S.project(mx + 0.19, 1.30, mz);
          if (l1 && l2) {
            var lg = S.ctx.createLinearGradient(l1[0], l1[1], l2[0], l2[1]);
            lg.addColorStop(0, 'rgba(255,196,124,' + (0.55 * flk).toFixed(3) + ')');
            lg.addColorStop(0.5, '#2b2320'); lg.addColorStop(1, '#191512');
            S.ctx.fillStyle = lg;
            S.ctx.beginPath();
            S.ctx.moveTo(l1[0], l1[1]); S.ctx.lineTo(l2[0], l1[1]); S.ctx.lineTo(l2[0], l2[1]); S.ctx.lineTo(l1[0], l2[1]);
            S.ctx.closePath(); S.ctx.fill();
            S.ctx.strokeStyle = 'rgba(160,128,104,0.55)'; S.ctx.lineWidth = 1.6; S.ctx.stroke();
          }
          /* rim light down the arc-facing edge */
          S.ctx.strokeStyle = 'rgba(255,206,150,' + (0.34 * flk).toFixed(3) + ')';
          S.ctx.lineWidth = 2;
          S.ctx.beginPath();
          S.ctx.moveTo(mapped[1][0], mapped[1][1]);
          for (var r2 = 2; r2 < 5; r2++) S.ctx.lineTo(mapped[r2][0], mapped[r2][1]);
          S.ctx.stroke();
          /* shoulder, cropped by the frame */
          var s3 = S.project(mx - 0.34, 0.62, mz + 0.05), s4 = S.project(mx + 0.42, 0.34, mz + 0.05);
          if (s3 && s4) {
            S.ctx.beginPath();
            S.ctx.moveTo(mapped[0][0], mapped[0][1]);
            S.ctx.lineTo(s3[0], s3[1]); S.ctx.lineTo(s4[0], s4[1]);
            S.ctx.lineTo(mapped[7][0], mapped[7][1]);
            S.ctx.closePath();
            S.ctx.fillStyle = TONE.mask; S.ctx.fill();
          }
        })();

        /* grade */
        var vg = S.ctx.createRadialGradient(S.W * 0.66, S.H * 0.42, Math.min(S.W, S.H) * 0.28,
          S.W * 0.66, S.H * 0.42, Math.max(S.W, S.H) * 0.86);
        vg.addColorStop(0, 'rgba(8,9,12,0)');
        vg.addColorStop(1, 'rgba(8,9,12,0.62)');
        S.ctx.fillStyle = vg; S.ctx.fillRect(0, 0, S.W, S.H);

        var left = S.ctx.createLinearGradient(0, 0, S.W * 0.72, 0);
        left.addColorStop(0, 'rgba(12,14,17,0.62)');
        left.addColorStop(0.55, 'rgba(12,14,17,0.22)');
        left.addColorStop(1, 'rgba(12,14,17,0)');
        S.ctx.fillStyle = left; S.ctx.fillRect(0, 0, S.W * 0.72, S.H);
      }
    };
  };

  global.Projection = Projection;
