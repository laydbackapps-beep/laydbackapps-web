(() => {
  const boot = () => {
    const media = document.querySelector('.hero--alora .hero__media, .hero .hero__media');
    if (!media) return setTimeout(boot, 250);

    if (!media.querySelector('.alora-hero-fx')) {
      const fx = document.createElement('div');
      fx.className = 'alora-hero-fx';
      fx.setAttribute('aria-hidden', 'true');
      fx.innerHTML =
        '<span class="fx-orb fx-orb--1"></span><span class="fx-orb fx-orb--2"></span><span class="fx-orb fx-orb--3"></span>' +
        '<span class="fx-ring"></span><span class="fx-ring fx-ring--2"></span>' +
        Array.from({ length: 18 }, (_, i) => `<i class="fx-particle" style="left:${58 + (i * 2.3) % 40}%;top:${12 + (i * 4.7) % 76}%;animation-delay:-${(i * 1.3).toFixed(1)}s"></i>`).join('');
      media.appendChild(fx);
    }

    if (!media.querySelector('.alora-hero-tools') && !media.querySelector('.alora-kit-stage')) {
      const tools = document.createElement('div');
      tools.className = 'alora-hero-tools';
      tools.setAttribute('aria-hidden', 'true');
      const src = new URL('./assets/hero/alora-salon-kit.webp?v=hero-fx-3', document.baseURI).href;
      tools.innerHTML = `<img src="${src}" width="1600" height="1200" alt="" decoding="async" />`;
      media.appendChild(tools);
    }

    if (!media.querySelector('.alora-swatches')) {
      const sw = document.createElement('div');
      sw.className = 'alora-swatches';
      sw.setAttribute('aria-hidden', 'true');
      sw.innerHTML =
        '<span class="alora-swatch"><i style="background:#d3a15f"></i>Honey</span>' +
        '<span class="alora-swatch"><i style="background:#8a5a37"></i>Bronde</span>' +
        '<span class="alora-swatch"><i style="background:#e7dcc9"></i>Pearl</span>';
      media.appendChild(sw);
    }
  };
  boot();
  new MutationObserver(() => {
    const m = document.querySelector('.hero--alora .hero__media, .hero .hero__media');
    if (m && (!m.querySelector('.alora-hero-fx') || !m.querySelector('.alora-swatches') || (!m.querySelector('.alora-hero-tools') && !m.querySelector('.alora-kit-stage')))) boot();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();