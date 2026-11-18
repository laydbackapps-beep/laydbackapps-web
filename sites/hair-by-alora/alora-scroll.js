(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  addEventListener('load', () => setTimeout(() => {
    const items = document.querySelectorAll('.work__card,.craft__item,.era__fig,.quotes__item');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    items.forEach((el, i) => {
      el.classList.add('alora-reveal');
      el.style.setProperty('--reveal-delay', `${i % 2 * 90}ms`);
      observer.observe(el);
    });
  }, 100));
})();
