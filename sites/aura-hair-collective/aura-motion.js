(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 679px)');
  const init = () => {
    const hero = document.querySelector('.hero--aura');
    const work = document.querySelector('.lookbook');
    if (!hero || !work || !window.gsap || !window.ScrollTrigger || document.documentElement.dataset.auraMotion) return !!document.documentElement.dataset.auraMotion;
    document.documentElement.dataset.auraMotion = 'true';
    gsap.registerPlugin(ScrollTrigger);
    work.classList.add('is-aura-motion');
    document.querySelector('.services')?.classList.add('is-aura-motion');
    document.querySelector('.homage')?.classList.add('is-aura-motion');
    document.querySelector('.collective')?.classList.add('is-aura-motion');
    hero.querySelector('.hero__media')?.insertAdjacentHTML('beforeend','<span class="aura-watermark" aria-hidden="true">AURA</span>');
    const rail = document.createElement('div'); rail.className = 'aura-marquee'; rail.setAttribute('aria-hidden','true');
    rail.innerHTML = `<div class="aura-marquee__track">${Array(2).fill('<span>BREATHE <i>◆</i> CONSULT <i>◆</i> COLOUR <i>◆</i> CARE <i>◆</i> LAKE MACQUARIE <i>◆</i></span>').join('')}</div>`;
    hero.after(rail);
    work.querySelectorAll('.lookbook__cap').forEach((cap,i)=>cap.dataset.index=String(i+1).padStart(2,'0'));

    if (reduced.matches || mobile.matches) {
      const targets = document.querySelectorAll('.lookbook__card,.services__tab,.homage__content,.homage__frame,.chair-card');
      targets.forEach(x=>x.classList.add('aura-reveal'));
      const io = new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target);}
      }),{threshold:.1});
      targets.forEach(x=>io.observe(x));
      return true;
    }

    const lenis = new Lenis({duration:1.2,smoothWheel:true,autoRaf:false});
    lenis.on('scroll',ScrollTrigger.update);
    const raf = time => lenis.raf(time*1000);
    gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);

    gsap.timeline({scrollTrigger:{trigger:hero,start:'top top',end:'+=105%',scrub:1.2,pin:true,anticipatePin:1}})
      .to('.hero--aura .hero__media picture',{width:'54%',right:'1vw',borderRadius:'0px',scale:1.035,ease:'none'},0)
      .to('.hero--aura .hero__title',{xPercent:-8,opacity:.22,ease:'none'},0)
      .to('.hero--aura .hero__bottom',{y:60,opacity:0,ease:'none'},0)
      .to('.hero--aura .hero__sanctuary',{y:-55,rotate:-3,scale:1.08,ease:'none'},0)
      .to('.aura-watermark',{xPercent:12,letterSpacing:'0em',ease:'none'},0);

    gsap.utils.toArray('.lookbook__card').forEach((card,i)=>{
      gsap.fromTo(card,{clipPath:'inset(12% 5% 12% 5% round 48%)',y:80},{
        clipPath:'inset(0% 0% 0% 0% round 0px)',y:0,ease:'none',
        scrollTrigger:{trigger:card,start:'top 92%',end:'top 34%',scrub:1}
      });
      gsap.fromTo(card.querySelector('.lookbook__media img'),{yPercent:-8,scale:1.04},{
        yPercent:0,scale:1,ease:'none',
        scrollTrigger:{trigger:card,start:'top bottom',end:'bottom top',scrub:1}
      });
      gsap.from(card.querySelector('.lookbook__cap'),{
        x:i%2?80:-80,opacity:0,
        scrollTrigger:{trigger:card,start:'top 70%',end:'top 38%',scrub:.8}
      });
    });
    gsap.utils.toArray('.services__tab').forEach((item,i)=>{
      gsap.from(item,{x:i%2?90:-90,opacity:0,scrollTrigger:{trigger:item,start:'top 88%',end:'top 48%',scrub:.9}});
    });
    gsap.fromTo('.homage__frame',{clipPath:'inset(12% 8% 12% 8% round 50%)'},{
      clipPath:'inset(0% 0% 0% 0% round 0px)',ease:'none',
      scrollTrigger:{trigger:'.homage',start:'top 85%',end:'center 45%',scrub:1}
    });
    gsap.fromTo('.homage__frame img',{scale:1.15,yPercent:-6},{scale:1,yPercent:6,ease:'none',scrollTrigger:{trigger:'.homage',start:'top bottom',end:'bottom top',scrub:1}});
    gsap.from('.homage__content > *',{y:60,opacity:0,stagger:.08,scrollTrigger:{trigger:'.homage',start:'top 78%',end:'top 38%',scrub:.8}});
    gsap.utils.toArray('.chair-card').forEach((item,i)=>{
      gsap.from(item,{y:100,rotate:i%2?2.5:-2.5,opacity:0,scrollTrigger:{trigger:item,start:'top 92%',end:'top 58%',scrub:.8}});
    });
    document.fonts.ready.then(()=>ScrollTrigger.refresh());
    addEventListener('pagehide',()=>{gsap.ticker.remove(raf);lenis.destroy();},{once:true});
    return true;
  };
  const timer = setInterval(()=>{if(init())clearInterval(timer);},400);
  setTimeout(()=>clearInterval(timer),12000);
})();
