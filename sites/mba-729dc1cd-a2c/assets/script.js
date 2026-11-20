/* ==========================================================================
   ARC-SEAM — Interaction Layer
   Reveal animations + JS safety net (~1100ms)
   ========================================================================== */

(function () {
  'use strict';

  // Signal that JS is active - enables CSS .js .rv hiding
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  // --------------------------------------------------------------------------
  // INTERSECTION OBSERVER REVEAL
  // --------------------------------------------------------------------------
  const revealElements = document.querySelectorAll('.rv');
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => revealObserver.observe(el));

  // --------------------------------------------------------------------------
  // JS SAFETY NET (~1100ms)
  // Ensures all reveal elements become visible even if IntersectionObserver fails
  // --------------------------------------------------------------------------
  const SAFETY_NET_DELAY = 1100;
  setTimeout(() => {
    revealElements.forEach(el => {
      if (!el.classList.contains('on')) {
        el.classList.add('on');
      }
    });
  }, SAFETY_NET_DELAY);

  // --------------------------------------------------------------------------
  // CURRENT YEAR IN FOOTER
  // --------------------------------------------------------------------------
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // --------------------------------------------------------------------------
  // SMOOTH SCROLL POLYFILL FOR ANCHOR LINKS (fallback)
  // --------------------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 64;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        target.focus({ preventScroll: true });
      }
    });
  });

})();