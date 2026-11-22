/* Procedural concrete grain for the hero.
   Generated once with value-noise into a small 2D canvas, then scaled up under a
   soft-light blend. No per-frame JS: the raking light is a CSS animation on a
   sibling element, so the cost is one paint at load and nothing after.
   If the 2D context is unavailable the canvas is removed and the photo stands
   on its own. */
(() => {
  const canvas = document.querySelector('.hero__shader');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); return; }

  const hash = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  };
  const smooth = t => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = smooth(x - ix), fy = smooth(y - iy);
    const a = hash(ix, iy), b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
  const fbm = (x, y) => {
    let v = 0, amp = 0.5, fx = x, fy = y;
    for (let i = 0; i < 4; i++) { v += amp * noise(fx, fy); fx *= 2.03; fy *= 2.03; amp *= 0.5; }
    return v;
  };

  let drawn = 0;
  function paint() {
    const box = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.min(420, Math.round(box.width / 3)));
    const h = Math.max(1, Math.min(240, Math.round(box.height / 3)));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    const img = ctx.createImageData(w, h);
    const data = img.data;
    const aspect = w / h;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = (x / w) * 2.4 * aspect;
        const py = (y / h) * 2.4;
        const grain = fbm(px * 6, py * 6);
        const broad = fbm(px * 1.1, py * 1.1);

        /* raking light out of the top-left, the way sun crosses a poured slab */
        const dx = x / w - 0.18, dy = y / h - 0.08;
        const light = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 1.15);
        const spec = Math.pow(broad, 2.2) * light;

        const v = 0.42 + grain * 0.34 + spec * 0.55;
        const warm = 1 - spec * 0.45;

        const i = (y * w + x) * 4;
        data[i] = Math.min(255, 255 * v * (0.62 + 0.38 * (1 - warm)));
        data[i + 1] = Math.min(255, 255 * v * (0.56 + 0.44 * (1 - warm)));
        data[i + 2] = Math.min(255, 255 * v * (0.47 + 0.53 * (1 - warm)));
        data[i + 3] = Math.min(255, 255 * Math.min(0.85, (grain - 0.3) * 0.9 + spec * 0.6) * 0.85);
      }
    }
    ctx.putImageData(img, 0, 0);
    drawn++;
    canvas.dataset.painted = String(drawn);
  }

  paint();
  let t = 0;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(paint, 180);
  }, { passive: true });
})();