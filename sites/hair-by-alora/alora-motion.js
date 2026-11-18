(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 679px)');
  const start = () => {
    const hero = document.querySelector('.hero--alora');
    const work = document.querySelector('.work');
    if (!hero || !work || !window.gsap || !window.ScrollTrigger) return false;
    if (document.documentElement.dataset.aloraMotion) return true;
    document.documentElement.dataset.aloraMotion = 'true';
    gsap.registerPlugin(ScrollTrigger);
    work.classList.add('is-motion');
    document.querySelector('.craft')?.classList.add('is-motion');
    document.querySelector('.era')?.classList.add('is-motion');
    document.querySelector('.quotes')?.classList.add('is-motion');
    document.querySelector('.visit')?.classList.add('is-motion');

    const kinetic = document.createElement('span');
    kinetic.className = 'hero__kinetic'; kinetic.textContent = 'ALORA'; kinetic.setAttribute('aria-hidden', 'true');
    hero.append(kinetic);
    const rail = document.createElement('div');
    rail.className = 'alora-marquee'; rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = `<div class="alora-marquee__track">${Array(2).fill('<span>LIVED-IN BLONDE <i>◆</i> DIMENSIONAL BALAYAGE <i>◆</i> SEAMLESS ROOT MELTS <i>◆</i> CAREY BAY <i>◆</i></span>').join('')}</div>`;
    hero.after(rail);
    work.querySelectorAll('.work__cap').forEach((cap, i) => cap.dataset.index = String(i + 1).padStart(2, '0'));
    const progress = document.createElement('div');
    progress.className = 'work__progress'; progress.innerHTML = '<span></span>'; work.append(progress);

    if (reduced.matches || mobile.matches) {
      const targets = document.querySelectorAll('.craft__item,.era__text,.era__fig,.quotes__item,.visit__grid>*');
      targets.forEach(x => x.classList.add('motion-reveal'));
      const io = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      }), { threshold: .12 });
      targets.forEach(x => io.observe(x));
      return true;
    }

    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = time => lenis.raf(time * 1000);
    gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);

    const heroTimeline = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=110%', scrub: 1.1, pin: true, anticipatePin: 1 }
    });
    heroTimeline
      .to('.hero--alora .hero__media picture', { scale: 1.09, yPercent: -5, rotate: 1.5, ease: 'none' }, 0)
      .to('.hero--alora .hero__title .hero__line:first-child', { xPercent: -14, opacity: .12, ease: 'none' }, 0)
      .to('.hero--alora .hero__title .hero__line:last-child', { xPercent: 14, opacity: .12, ease: 'none' }, 0)
      .to('.alora-kit-stage', { rotate: -7, scale: 1.12, xPercent: 5, ease: 'none' }, 0)
      .to('.hero--alora .hero__bottom', { y: 80, opacity: 0, ease: 'none' }, 0)
      .to('.hero__kinetic', { yPercent: 24, letterSpacing: '.02em', ease: 'none' }, 0);

    const grid = work.querySelector('.work__grid');
    const distance = () => Math.max(0, grid.scrollWidth - innerWidth + innerWidth * .08);
    gsap.to(grid, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: work, start: 'top top', end: () => `+=${Math.max(innerWidth * 2.2, distance() * 1.05)}`,
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: self => { progress.firstElementChild.style.width = `${self.progress * 100}%`; }
      }
    });
    gsap.utils.toArray('.work__card').forEach((card, i) => {
      gsap.fromTo(card.querySelector('.work__img'), { scale: 1.1 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: work, start: 'top top', end: '+=250%', scrub: 1 }
      });
    });

    gsap.utils.toArray('.craft__item').forEach((item, i) => {
      gsap.from(item, {
        x: i % 2 ? 90 : -90, rotate: i % 2 ? 2 : -2, opacity: 0,
        scrollTrigger: { trigger: item, start: 'top 88%', end: 'top 52%', scrub: .8 }
      });
    });
    gsap.fromTo('.era__fig', { clipPath: 'inset(14% 10% 14% 10% round 32px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: '.era', start: 'top 88%', end: 'center 45%', scrub: 1 }
    });
    gsap.fromTo('.era__img', { scale: 1.16, yPercent: -5 }, {
      scale: 1, yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: '.era', start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
    gsap.from('.era__text > *', {
      y: 70, opacity: 0, stagger: .08,
      scrollTrigger: { trigger: '.era', start: 'top 78%', end: 'top 38%', scrub: .8 }
    });
    gsap.utils.toArray('.quotes__item').forEach((item, i) => {
      gsap.from(item, {
        y: 110, rotate: i % 2 ? 3 : -3, opacity: 0,
        scrollTrigger: { trigger: item, start: 'top 92%', end: 'top 58%', scrub: .8 }
      });
    });
    gsap.from('.visit__grid > *', {
      y: 70, opacity: 0, stagger: .1,
      scrollTrigger: { trigger: '.visit', start: 'top 85%', end: 'top 50%', scrub: .8 }
    });
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('pagehide', () => { gsap.ticker.remove(raf); lenis.destroy(); }, { once: true });
    return true;
  };
  const timer = setInterval(() => { if (start()) clearInterval(timer); }, 500);
  setTimeout(() => clearInterval(timer), 12000);
})();
