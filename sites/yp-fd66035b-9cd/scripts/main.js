/* Tahbony Training & Assessment — Main JavaScript */
/* JS Safety Net: setTimeout ~1100ms reveals all content */
/* IntersectionObserver for scroll-triggered animations */

(function() {
  'use strict';

  // Remove .no-js, add .js for CSS reveal gating
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  // JS Safety Net: reveal all after ~1100ms regardless of IntersectionObserver
  const SAFETY_NET_DELAY = 1100;

  function revealAll() {
    document.querySelectorAll('.rv').forEach(function(el) {
      el.classList.add('on');
    });
    // Also mark all criteria rows as complete
    document.querySelectorAll('.criteria-row').forEach(function(row) {
      row.classList.add('is-complete');
    });
  }

  // Set safety net timeout
  var safetyNetTimer = setTimeout(revealAll, SAFETY_NET_DELAY);

  // IntersectionObserver for scroll reveals
  var observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
  };

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        // If it's a module, also animate its criteria ticks
        var module = entry.target.closest('.module');
        if (module) {
          animateCriteriaTicks(module);
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all reveal elements
  document.querySelectorAll('.rv').forEach(function(el) {
    observer.observe(el);
  });

  // Animate criteria ticks with stagger
  function animateCriteriaTicks(module) {
    var rows = module.querySelectorAll('.criteria-row');
    rows.forEach(function(row, index) {
      setTimeout(function() {
        row.classList.add('is-complete');
      }, index * 150 + 200);
    });
  }

  // Hero rubric plates - add hover parallax (respects reduced-motion)
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    var plates = document.querySelectorAll('.rubric-plate__inner');
    plates.forEach(function(plate) {
      plate.addEventListener('mousemove', function(e) {
        var rect = plate.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        var rotateX = (y / rect.height) * 8;
        var rotateY = -(x / rect.width) * 8;
        plate.style.transform = 'perspective(400px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
      });
      plate.addEventListener('mouseleave', function() {
        plate.style.transform = '';
      });
    });
  }

  // Competency strip boxes - subtle hover
  var stripBoxes = document.querySelectorAll('.competency-strip__box');
  stripBoxes.forEach(function(box) {
    box.addEventListener('mouseenter', function() {
      box.style.borderColor = 'var(--clr-assessor)';
      box.style.color = 'var(--clr-assessor)';
    });
    box.addEventListener('mouseleave', function() {
      if (!box.hasAttribute('data-tick')) {
        box.style.borderColor = '';
        box.style.color = '';
      }
    });
  });

  // Clear safety net if all content revealed naturally
  function checkAllRevealed() {
    var unrevealed = document.querySelectorAll('.rv:not(.on)');
    if (unrevealed.length === 0) {
      clearTimeout(safetyNetTimer);
    }
  }

  // Check periodically
  setInterval(checkAllRevealed, 500);

  // Initial check for hero content (already in view)
  document.querySelectorAll('.hero .rv').forEach(function(el) {
    el.classList.add('on');
  });

  // Animate hero criteria rows if any
  var heroModule = document.querySelector('#module-1');
  if (heroModule) {
    // Delay slightly for hero to settle
    setTimeout(function() {
      animateCriteriaTicks(heroModule);
    }, 800);
  }

})();