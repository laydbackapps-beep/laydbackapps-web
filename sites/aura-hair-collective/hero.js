(() => {
  const hero = document.querySelector(".hero--aura");
  if (!hero) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.innerWidth >= 960;
  if (reduced || !desktop) return;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(src, document.baseURI).href;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const title = hero.querySelector(".hero__title");
  if (title) {
    loadScript("./vendor/gsap.min.js")
      .then(() => loadScript("./vendor/SplitText.min.js"))
      .then(() => {
        const { gsap, SplitText } = window;
        if (!gsap || !SplitText) return;
        gsap.registerPlugin(SplitText);
        const originalLines = Array.from(title.querySelectorAll(".hero__line")).map((line) => line.textContent || "");
        const split = new SplitText(title.querySelectorAll(".hero__line"), {
          type: "words,chars",
          wordsClass: "hero-word",
          charsClass: "hero-char",
        });
        gsap.fromTo(
          split.chars,
          { yPercent: 112, opacity: 0, rotateX: -58 },
          {
            yPercent: 0,
            opacity: 1,
            rotateX: 0,
            duration: 1.15,
            stagger: 0.034,
            ease: "expo.out",
            onComplete: () => {
              split.revert();
              title.innerHTML = originalLines.join("<br>");
              title.classList.add("is-complete");
            },
          },
        );
      })
      .catch(() => {});
  }

  const canvas = hero.querySelector(".hero__canvas");
  const image = hero.querySelector(".hero__img");
  if (!canvas || !image) return;

  const init = async () => {
    try {
      const THREE = await import(new URL("./vendor/three.module.js", document.baseURI).href);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const loader = new THREE.TextureLoader();
      const tex1 = loader.load(image.currentSrc || image.src);
      const tex2 = loader.load(new URL("./img/DeY4GB7T0bq-1440.jpg", document.baseURI).href);
      [tex1, tex2].forEach((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
      });

      const uniforms = {
        uTexture1: { value: tex1 },
        uTexture2: { value: tex2 },
        uPlaneResolution: { value: new THREE.Vector2(1, 1) },
        uImageResolution1: { value: new THREE.Vector2(1920, 2428) },
        uImageResolution2: { value: new THREE.Vector2(1440, 1634) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uMouseStrength: { value: 0 },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uFocal: { value: new THREE.Vector2(0.82, 0.42) },
        uGrade: { value: new THREE.Vector3(0.72, 0.55, 0.36) },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
        `,
        fragmentShader: `
          uniform sampler2D uTexture1;
          uniform sampler2D uTexture2;
          uniform vec2 uPlaneResolution;
          uniform vec2 uImageResolution1;
          uniform vec2 uImageResolution2;
          uniform vec2 uMouse;
          uniform float uMouseStrength;
          uniform float uProgress;
          uniform float uTime;
          uniform vec2 uFocal;
          uniform vec3 uGrade;
          varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
          }
          vec2 coverUv(vec2 uv, vec2 screen, vec2 image) {
            float screenA = screen.x / screen.y, imageA = image.x / image.y;
            vec2 s = screenA > imageA ? vec2(1.0, imageA / screenA) : vec2(screenA / imageA, 1.0);
            return (uv - uFocal) * s + uFocal;
          }
          void main() {
            vec2 uv1 = coverUv(vUv, uPlaneResolution, uImageResolution1);
            vec2 uv2 = coverUv(vUv, uPlaneResolution, uImageResolution2);
            vec2 d = vUv - uMouse;
            d.x *= uPlaneResolution.x / max(uPlaneResolution.y, 1.0);
            float dist = length(d);
            float influence = exp(-dist * 7.0) * uMouseStrength;
            float ripple = sin(dist * 42.0 - uTime * 4.0) * 0.007 * influence;
            vec2 displacement = normalize(d + vec2(0.0001)) * ripple;
            float n = noise(vUv * 7.0 + vec2(uTime * 0.025, -uTime * 0.012));
            float n2 = noise(vUv * 14.0 + 8.3);
            vec2 warp = vec2(n - 0.5, n2 - 0.5) * uProgress * 0.14;
            float wipe = smoothstep(n - 0.28, n + 0.28, uProgress);
            vec3 a = texture2D(uTexture1, uv1 + displacement + warp).rgb;
            vec3 b = texture2D(uTexture2, uv2 - displacement - warp * 0.65).rgb;
            vec3 col = mix(a, b, wipe);
            col = mix(col, uGrade, 0.045);
            float vig = smoothstep(0.92, 0.24, length(vUv - 0.5));
            col *= mix(0.82, 1.0, vig);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      const geometry = new THREE.PlaneGeometry(2, 2);
      scene.add(new THREE.Mesh(geometry, material));

      const targetMouse = new THREE.Vector2(0.5, 0.5);
      let targetStrength = 0;
      let targetProgress = 0;
      let visible = true;
      let raf = 0;
      let last = 0;
      const t0 = performance.now();

      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        uniforms.uPlaneResolution.value.set(w, h);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      resize();

      const onPointerMove = (event) => {
        const r = hero.getBoundingClientRect();
        targetMouse.set((event.clientX - r.left) / Math.max(1, r.width), 1 - (event.clientY - r.top) / Math.max(1, r.height));
        targetStrength = 1;
      };
      const onPointerLeave = () => { targetStrength = 0; };
      const onScroll = () => {
        const r = hero.getBoundingClientRect();
        targetProgress = THREE.MathUtils.clamp(-r.top / Math.max(1, r.height * 0.82), 0, 1);
      };
      const io = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; });
      io.observe(hero);
      hero.addEventListener("pointermove", onPointerMove, { passive: true });
      hero.addEventListener("pointerleave", onPointerLeave, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      const frame = (now) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden || now - last < 1000 / 45) return;
        last = now;
        if (tex1.image?.width) uniforms.uImageResolution1.value.set(tex1.image.width, tex1.image.height);
        if (tex2.image?.width) uniforms.uImageResolution2.value.set(tex2.image.width, tex2.image.height);
        uniforms.uTime.value = (now - t0) / 1000;
        uniforms.uMouse.value.lerp(targetMouse, 0.075);
        uniforms.uMouseStrength.value += (targetStrength - uniforms.uMouseStrength.value) * 0.06;
        uniforms.uProgress.value += (targetProgress - uniforms.uProgress.value) * 0.065;
        renderer.render(scene, camera);
      };
      renderer.render(scene, camera);
      canvas.classList.add("is-live");
      raf = requestAnimationFrame(frame);

      window.addEventListener("pagehide", () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        geometry.dispose();
        material.dispose();
        tex1.dispose();
        tex2.dispose();
        renderer.dispose();
      }, { once: true });
    } catch {
      canvas.classList.remove("is-live");
    }
  };

  if (image.complete) init();
  else image.addEventListener("load", init, { once: true });
})();
