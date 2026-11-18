/* Alora atelier hero: real salon-tool GLB, poster-first, desktop-only motion. */
const mountAloraHero = () => {
  const hero = document.querySelector('.hero--cinema.hero--alora');
  const media = hero?.querySelector('.hero__media');
  if (!hero || !media) return false;
  if (hero.dataset.aloraMounted === 'true' && hero.querySelector('.alora-kit-stage')) return true;
  hero.dataset.aloraMounted = 'true';
  hero.classList.add('alora-hero--atelier');
  document.querySelectorAll('.quotes__item footer a[aria-label]').forEach((link) => {
    const label = link.getAttribute('aria-label');
    if (!label.includes('View on Instagram')) link.setAttribute('aria-label', `View on Instagram — ${label}`);
  });
  const secondary = hero.querySelector('.hero__link');
  if (secondary) secondary.textContent = 'View colour work';
  const headerCta = document.querySelector('.head__cta');
  if (headerCta) headerCta.textContent = 'Book a consultation';
  let stage = hero.querySelector('.alora-kit-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.className = 'alora-kit-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<img class="alora-kit-poster" src="./assets/hero/alora-salon-kit.webp?v=duo-20261118" width="1600" height="1200" alt="" fetchpriority="high" decoding="sync">';
    media.append(stage);
  }
  if (!stage.querySelector('canvas')) stage.insertAdjacentHTML('beforeend', '<canvas class="alora-kit-canvas"></canvas>');
  stage.querySelector('.alora-kit-hint')?.remove();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 900px), (pointer: coarse)');
  if (!reduce.matches && !mobile.matches) {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
      hero.dataset.heroState = 'poster';
    } else {
    Promise.all([
      import('./vendor/three.module.js'),
      import('./vendor/addons/loaders/GLTFLoader.js'),
    ]).then(([THREE, { GLTFLoader }]) => {
      const canvas = stage.querySelector('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.16;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(37, 1, .1, 60);
      camera.position.set(0, .25, 10.8);
      scene.add(new THREE.HemisphereLight(0xffedda, 0x21120c, 2.1));
      const key = new THREE.DirectionalLight(0xffe1b5, 4.4); key.position.set(-4, 6, 7); scene.add(key);
      const rim = new THREE.DirectionalLight(0xd79a55, 3.2); rim.position.set(5, 1, -3); scene.add(rim);
      const fill = new THREE.PointLight(0xfffbee, 32, 22); fill.position.set(4, -1, 5); scene.add(fill);
      const rig = new THREE.Group(); scene.add(rig);
      let ready = false;
      new GLTFLoader().load('./assets/hero/alora-salon-kit.glb?v=duo-20261118', (gltf) => {
        const model = gltf.scene;
        model.rotation.x = -.05;
        model.rotation.y = -.08;
        model.position.set(.15, -.2, 0);
        rig.add(model);
        ready = true;
        resize();
        renderer.render(scene, camera);
        stage.classList.add('is-live');
        hero.dataset.heroState = 'interactive';
      }, undefined, () => { hero.dataset.heroState = 'poster'; });

      let tx = 0, ty = 0, px = 0, py = 0, raf = 0, visible = true, last = 0;
      const resize = () => {
        const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        if (ready) renderer.render(scene, camera);
      };
      new ResizeObserver(resize).observe(stage); resize();
      hero.addEventListener('pointermove', (event) => {
        const b = hero.getBoundingClientRect();
        tx = ((event.clientX - b.left) / b.width - .5) * .55;
        ty = ((event.clientY - b.top) / b.height - .5) * .22;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; }, { passive: true });
      const tick = (now) => {
        raf = 0;
        if (!visible || !ready || now - last < 1000 / 30) { raf = requestAnimationFrame(tick); return; }
        last = now;
        px += (tx - px) * .055; py += (ty - py) * .055;
        rig.rotation.y = px + Math.sin(now * .00022) * .025;
        rig.rotation.x = py + Math.cos(now * .00018) * .012;
        rig.position.y = Math.sin(now * .0005) * .045;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
        if (!visible) { cancelAnimationFrame(raf); raf = 0; }
      }, { threshold: .01 }).observe(hero);
      raf = requestAnimationFrame(tick);
      addEventListener('pagehide', () => { cancelAnimationFrame(raf); renderer.dispose(); }, { once: true });
    }).catch((error) => {
      hero.dataset.heroState = 'poster';
      console.info('Alora 3D enhancement unavailable; static salon poster retained.', error.message);
    });
    }
  } else {
    hero.dataset.heroState = reduce.matches ? 'reduced-motion-poster' : 'mobile-poster';
  }
  return true;
};

const observer = new MutationObserver(mountAloraHero);
observer.observe(document.documentElement, { childList: true, subtree: true });
mountAloraHero();
setTimeout(() => observer.disconnect(), 15000);
