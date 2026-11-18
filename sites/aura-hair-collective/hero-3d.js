(() => {
  const hero = document.querySelector('.hero--aura');
  if (!hero) return;
  const image = hero.querySelector('.hero__img');
  const canvas = hero.querySelector('.hero__canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const title = hero.querySelector('.hero__title');
  if (title && !reduced.matches) {
    [...title.querySelectorAll('.hero__line')].forEach((line, i) => line.animate(
      [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
      { duration: 1050, delay: i * 130, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }
    ));
  }

  const button = hero.querySelector('.hero__actions .btn--gold');
  if (button && !reduced.matches) {
    button.addEventListener('pointermove', (e) => {
      const r = button.getBoundingClientRect();
      button.style.transform = `translate(${(e.clientX-r.left-r.width/2)*.11}px, ${(e.clientY-r.top-r.height/2)*.11}px)`;
    }, { passive: true });
    button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    button.addEventListener('pointerdown', () => { button.style.transform = 'scale(.97)'; });
    button.addEventListener('pointerup', () => { button.style.transform = ''; });
  }
  if (!canvas || !image) return;
  if (reduced.matches || matchMedia('(max-width: 679px)').matches) {
    hero.dataset.heroState = reduced.matches ? 'reduced-motion-static' : 'mobile-static';
    return;
  }
  const probe = document.createElement('canvas');
  if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
    hero.dataset.heroState = 'static-no-webgl';
    return;
  }

  // One quad, transparent above the hair photograph. Its source is 5KB;
  // the existing Three module is shared with the other salon hero layer.
  import('./vendor/three.module.js').then((THREE) => {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uPointer: { value: new THREE.Vector2(.5, .5) },
      uTime: { value: 0 },
      uAspect: { value: 1 }
    };
    const material = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `precision mediump float;uniform vec2 uPointer;uniform float uTime,uAspect;varying vec2 vUv;
        void main(){vec2 p=vUv-.5; p.x*=uAspect;vec2 mouse=(uPointer-.5)*vec2(uAspect,1.);
        float d=length(p-mouse); float bend=exp(-d*4.)*.11;
        float waves=sin(p.x*8.+sin(p.y*8.+uTime*.21)*1.8+uTime*.16+bend);
        float folds=smoothstep(.58,.95,waves*.5+.5);
        float caustics=pow(max(0.,sin(p.y*14.-p.x*5.+uTime*.22+bend*5.)),6.);
        vec3 champagne=vec3(.969,.953,.933),pearl=vec3(.937,.902,.847),honey=vec3(.875,.769,.608);
        vec3 col=mix(champagne,pearl,folds*.72);col=mix(col,honey,caustics*.45);
        gl_FragColor=vec4(col,.06+folds*.065+caustics*.035);}`
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
    scene.add(quad);
    let raf = 0, visible = true, desiredX = .5, desiredY = .5, velocityX = 0, velocityY = 0, last = 0;
    let pointerX = .5, pointerY = .5, scrollProgress = 0;
    const resize = () => {
      const w=canvas.clientWidth, h=canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w,h,false);
      uniforms.uAspect.value=w/h;
    };
    const updateScroll = () => {
      const r=hero.getBoundingClientRect();
      scrollProgress=Math.max(0,Math.min(1,-r.top/Math.max(1,r.height)));
      image.style.transform=`translate3d(0,${(-scrollProgress*18).toFixed(1)}px,0) scale(${(1.08-scrollProgress*.08).toFixed(3)})`;
    };
    const frame=(now)=>{
      if (!visible || document.hidden || reduced.matches) { raf=0;return; }
      const dt=Math.min(.04,Math.max(.001,(now-last)/1000||.016));last=now;
      const k=90,d=25;
      velocityX+=((desiredX-pointerX)*k-velocityX*d)*dt;
      velocityY+=((desiredY-pointerY)*k-velocityY*d)*dt;
      pointerX+=velocityX*dt;pointerY+=velocityY*dt;
      uniforms.uPointer.value.set(pointerX,pointerY);
      uniforms.uTime.value=now*.001;
      renderer.render(scene,camera);
      raf=requestAnimationFrame(frame);
    };
    const start=()=>{if(!raf&&visible&&!document.hidden&&!reduced.matches){last=performance.now();raf=requestAnimationFrame(frame);}};
    hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();desiredX=(e.clientX-r.left)/r.width;desiredY=1-(e.clientY-r.top)/r.height;},{passive:true});
    addEventListener('scroll',updateScroll,{passive:true});
    document.addEventListener('visibilitychange',start);
    new ResizeObserver(resize).observe(canvas);
    const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else{cancelAnimationFrame(raf);raf=0;}},{threshold:.01});
    io.observe(hero);resize();updateScroll();renderer.render(scene,camera);canvas.classList.add('is-live');hero.dataset.heroState='interactive';start();
    addEventListener('pagehide',()=>{cancelAnimationFrame(raf);io.disconnect();quad.geometry.dispose();material.dispose();renderer.dispose();},{once:true});
  }).catch((error)=>{window.__auraShaderError=String(error);hero.dataset.heroState='static-error';canvas.classList.remove('is-live');});
})();
