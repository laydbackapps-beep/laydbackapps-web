/* Ritchley hero scene: brick wall rising behind scaffolding, timber frame above. */
(function () {
  'use strict';
  var cv = document.getElementById('heroCanvas');
  if (!cv || !window.Projection) return;

  var S = Projection.create(cv, {
    focal: 1.08, horizon: 0.55, camY: 1.52,
    fogNear: 11, fogFar: 54, fogCol: '#c9cecd'
  });

  var REDUCED = Projection.reduced();
  var BRICK = ['#8b4034', '#94483a', '#9d4f40', '#853a2f', '#a45645', '#7c352b'];
  var TIMBER = '#a9825a';
  var STEEL = '#c2c9cc';
  var GROUND = ['#6e6357', '#79705f', '#645a4f'];

  function hash(a, b) {
    var n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  /* ---------- sky ---------- */
  function sky() {
    var g = S.ctx.createLinearGradient(0, 0, 0, S.H * 0.66);
    g.addColorStop(0, '#7e93a2');
    g.addColorStop(0.55, '#aab6bb');
    g.addColorStop(1, '#d5d8d5');
    S.ctx.fillStyle = g;
    S.ctx.fillRect(0, 0, S.W, S.H * 0.66);
    /* flat overcast cloud bands */
    S.ctx.fillStyle = 'rgba(255,255,255,.16)';
    for (var i = 0; i < 5; i++) {
      var y = S.H * (0.06 + i * 0.085);
      S.ctx.fillRect(0, y, S.W, S.H * 0.018);
    }
    /* distant tree line */
    var z = 74;
    S.poly([[-40, 0, z], [40, 0, z], [40, 3.4, z], [-40, 2.4, z]], '#6f7a72', 1, z);
    for (var k = -38; k < 40; k += 5.5) {
      S.poly([[k, 0, z - 1], [k + 3.4, 0, z - 1], [k + 1.7, 3.2 + hash(k, 3) * 2.6, z - 1]], '#5f6a63', 1, z);
    }
  }

  /* ---------- ground ---------- */
  function ground() {
    var z;
    for (z = 3; z < 92; z += 3.4) {
      S.poly([[-46, 0, z], [46, 0, z], [46, 0, z + 3.4], [-46, 0, z + 3.4]],
        GROUND[Math.floor(hash(z, 1) * GROUND.length)], 1, z);
    }
    /* graded centre strip of the site */
    S.poly([[-5.6, 0.005, 2.4], [7.6, 0.005, 2.4], [7.6, 0.005, 26], [-5.6, 0.005, 26]], '#8b8272', 1, 9);
  }

  /* ---------- slab ---------- */
  function slab() {
    S.poly([[-10.4, 0.34, 19.4], [12.6, 0.34, 19.4], [12.6, 0.34, 27], [-10.4, 0.34, 27]], '#b4b0a4', 1, 19.4);
    S.poly([[-10.4, 0.34, 19.4], [12.6, 0.34, 19.4], [12.6, 0, 19.4], [-10.4, 0, 19.4]], '#8e8a7d', 1, 19.4);
    S.line([-10.4, 0.34, 19.4], [12.6, 0.34, 19.4], 'rgba(90,88,80,.7)', 1.2);
  }

  /* ---------- brick wall, courses rising ---------- */
  function wall(p) {
    var Z = 20, X0 = -10, X1 = 12.4, ROW = 0.185, BW = 0.62;
    var top = 5.6;
    var built = 0.2 + (top - 0.2) * p;

    /* return wall (side) for volume */
    S.poly([[X0, 0, Z], [X0, 0, 26.6], [X0, built, 26.6], [X0, built, Z]], '#6e2d23', 1, Z);

    for (var y = 0.2; y < built; y += ROW) {
      var r = Math.round(y / ROW);
      var off = (r % 2) * BW * 0.5;
      for (var x = X0 - off; x < X1; x += BW) {
        var xa = Math.max(X0, x), xb = Math.min(X1, x + BW - 0.045);
        if (xb <= xa) continue;
        var tone = BRICK[Math.floor(hash(r, xa) * BRICK.length)];
        var lift = hash(r + 4, xa) * 0.1;
        S.poly([[xa, y, Z], [xb, y, Z], [xb, y + ROW - 0.04, Z], [xa, y + ROW - 0.04, Z]], tone, 0.94 + lift, Z);
      }
      /* mortar course */
      S.line([X0, y, Z], [X1, y, Z], 'rgba(206,200,190,.34)', 1);
    }

    /* wet course being laid */
    if (built < top - ROW) {
      var hy = built - ROW;
      S.poly([[X0, hy, Z - 0.02], [X1, hy, Z - 0.02], [X1, hy + 0.05, Z - 0.02], [X0, hy + 0.05, Z - 0.02]], '#d8d2c6', 0.55, Z);
    }

    /* openings cut into the face: door + two windows */
    function opening(x0, x1, y0, y1) {
      S.poly([[x0, y0, Z - 0.03], [x1, y0, Z - 0.03], [x1, y1, Z - 0.03], [x0, y1, Z - 0.03]], '#2a2a2c', 1, Z);
      S.poly([[x0, y1, Z - 0.03], [x1, y1, Z - 0.03], [x1, y1 + 0.1, Z - 0.03], [x0, y1 + 0.1, Z - 0.03]], '#8e8a80', 1, Z);
    }
    opening(0.2, 1.2, 0.2, 2.25);
    opening(4.6, 6.5, 1.05, 2.5);
    opening(8.4, 10.3, 1.05, 2.5);
  }

  /* ---------- timber frame above the wall line ---------- */
  function frame(p) {
    var Z = 20, top = 6.9;
    if (p < 0.55) return;
    var k = Math.min(1, (p - 0.55) / 0.45);
    var h = 5.55 + (top - 5.55) * k;
    for (var x = -9.8; x < 12.2; x += 0.6) {
      S.poly([[x, 5.55, Z], [x + 0.09, 5.55, Z], [x + 0.09, h, Z], [x, h, Z]], TIMBER, 0.95, Z);
    }
    S.poly([[-10, h, Z], [12.4, h, Z], [12.4, h + 0.16, Z], [-10, h + 0.16, Z]], '#96734e', 1, Z);
    /* diagonal brace */
    if (k > 0.6) {
      S.line([2.2, 5.6, Z - 0.01], [4.4, h, Z - 0.01], TIMBER, 3);
    }
  }

  /* ---------- scaffolding in front ---------- */
  function scaffold() {
    var Z = 16.8;
    var xs = [-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2, 9.6, 12];
    for (var i = 0; i < xs.length; i++) {
      S.line([xs[i], 0, Z], [xs[i], 7.4, Z], '#b9c1c4', 2.4);
      S.line([xs[i], 0, Z + 0.45], [xs[i], 7.4, Z + 0.45], '#98a1a4', 1.6);
      S.line([xs[i], 0.02, Z], [xs[i], 0.02, Z + 0.45], '#98a1a4', 1.4);
    }
    var ys = [1.9, 3.9, 5.9, 7.25];
    for (var j = 0; j < ys.length; j++) {
      S.line([[ -7.2, ys[j], Z]][0], [12, ys[j], Z], '#c6ced1', 2);
      S.line([[ -7.2, ys[j], Z + 0.45]][0], [12, ys[j], Z + 0.45], '#a3acaf', 1.4);
      if (j < ys.length - 1) {
        /* plank decks */
        S.poly([[-7.2, ys[j] + 0.02, Z], [12, ys[j] + 0.02, Z], [12, ys[j] + 0.02, Z + 0.5], [-7.2, ys[j] + 0.02, Z + 0.5]], '#a97c4e', 1, Z);
      }
    }
    /* toe boards */
    S.poly([[-7.2, 3.94, Z], [12, 3.94, Z], [12, 4.2, Z], [-7.2, 4.2, Z]], '#8f6a43', 1, Z);
  }

  /* ---------- foreground props ---------- */
  function props() {
    /* brick stack on a pallet */
    var bx = 7.4, bz = 8.2, rows = 7, cols = 5;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = bx - 1.15 + c * 0.46 + (r % 2) * 0.06;
        var y = 0.16 + r * 0.17;
        S.poly([[x, y, bz], [x + 0.42, y, bz], [x + 0.42, y + 0.14, bz], [x, y + 0.14, bz]],
          BRICK[(r + c) % BRICK.length], 1, bz);
      }
    }
    S.poly([[bx - 1.35, 0, bz - 0.1], [bx + 1.45, 0, bz - 0.1], [bx + 1.45, 0.16, bz - 0.1], [bx - 1.35, 0.16, bz - 0.1]], '#8a6844', 1, bz);

    /* sand heap */
    S.poly([[-6.4, 0, 6.6], [-3.6, 0, 6.6], [-5.0, 0.72, 6.6]], '#c8b183', 1, 6.6);
    S.poly([[-6.4, 0, 6.6], [-5.0, 0.72, 6.6], [-6.2, 0, 5.9]], '#b49d72', 1, 6.6);

    /* stack of timber on the ground */
    for (var i = 0; i < 5; i++) {
      S.poly([[3.4, 0.06 + i * 0.11, 6.4], [5.8, 0.06 + i * 0.11, 6.4], [5.8, 0.15 + i * 0.11, 6.4], [3.4, 0.15 + i * 0.11, 6.4]], TIMBER, 0.92, 6.4);
    }
  }

  /* ---------- dust motes ---------- */
  var motes = [];
  for (var i = 0; i < 42; i++) {
    motes.push({ x: Math.random(), y: Math.random(), z: 5 + Math.random() * 20, s: 0.5 + Math.random() * 1.5, p: Math.random() * 6.28 });
  }
  function dust(t) {
    S.ctx.fillStyle = 'rgba(255,246,228,.5)';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var x = (m.x + Math.sin(t * 0.25 + m.p) * 0.012) * S.W;
      var y = (m.y - ((t * 0.008 + m.p) % 0.4)) * S.H * 0.72 + S.H * 0.12;
      S.ctx.beginPath();
      S.ctx.arc(x, y, m.s, 0, 6.2832);
      S.ctx.fill();
    }
  }

  S.frame(function (t) {
    var tt = REDUCED ? 3.4 : t;
    /* slow camera drift */
    S.camX = Math.sin(tt * 0.11) * 0.28;
    S.yaw = Math.sin(tt * 0.07) * 0.012;
    S.camY = 1.52 + Math.sin(tt * 0.6) * 0.008;

    var p = Math.min(1, 0.46 + tt / 3.1);

    sky();
    ground();
    slab();
    wall(p);
    frame(p);
    scaffold();
    props();
    if (!REDUCED) dust(tt);

    /* bottom fade into the page */
    var g = S.ctx.createLinearGradient(0, S.H * 0.82, 0, S.H);
    g.addColorStop(0, 'rgba(23,22,26,0)');
    g.addColorStop(1, 'rgba(23,22,26,.72)');
    S.ctx.fillStyle = g;
    S.ctx.fillRect(0, S.H * 0.82, S.W, S.H * 0.18);
  });
})();
