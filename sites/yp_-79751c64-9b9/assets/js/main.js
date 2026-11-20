/**
 * Wrights Plumbing — Main JavaScript
 * 3D Canvas Particle Ribbon Hero + Form Handling + Accessibility
 */

// ============================================================================
// 3D Canvas Particle Ribbon Hero
// ============================================================================

class ParticleRibbonHero {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.ribbons = [];
    this.animationId = null;
    this.isReducedMotion = false;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.time = 0;

    // Configuration
    this.config = {
      particleCount: 120,
      ribbonCount: 60,
      maxRibbonLength: 25,
      particleSize: 2,
      ribbonWidth: 1.5,
      flowSpeed: 0.0008,
      noiseScale: 0.0015,
      noiseStrength: 0.8,
      colors: {
        particles: ['#ff6b1a', '#f0efe8', '#1a1a2e'],
        ribbons: ['rgba(255, 107, 26, 0.4)', 'rgba(240, 239, 232, 0.3)', 'rgba(26, 26, 46, 0.2)']
      }
    };

    this.init();
  }

  init() {
    // real canvas first (the hero is a wrapper div; older builds put the id on a <canvas>)
    this.canvas = document.getElementById('lb3d-stage') || document.getElementById('hero-canvas');
    if (!this.canvas || typeof this.canvas.getContext !== 'function') return;

    // Check for reduced motion preference
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.isReducedMotion) {
      this.canvas.style.display = 'none';
      return;
    }

    // hidden hero (photo hero standard): never run the loop on an invisible canvas
    if (this.canvas.offsetParent === null || this.canvas.clientWidth === 0) return;

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener?.('change', (e) => this.handleReducedMotionChange(e));

    this.resize();
    this.createParticles();
    this.createRibbons();
    this.animate();

    window.addEventListener('resize', () => this.resize());
  }

  handleReducedMotionChange(e) {
    if (e.matches && !this.isReducedMotion) {
      this.isReducedMotion = true;
      this.destroy();
      this.canvas.style.display = 'none';
    } else if (!e.matches && this.isReducedMotion) {
      this.isReducedMotion = false;
      this.canvas.style.display = 'block';
      this.resize();
      this.createParticles();
      this.createRibbons();
      this.animate();
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    if (this.ctx) {
      this.ctx.scale(this.dpr, this.dpr);
    }
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: this.config.particleSize * (0.5 + Math.random() * 0.5),
        color: this.config.colors.particles[Math.floor(Math.random() * this.config.colors.particles.length)],
        opacity: 0.3 + Math.random() * 0.4,
        life: Math.random() * Math.PI * 2
      });
    }
  }

  createRibbons() {
    this.ribbons = [];
    for (let i = 0; i < this.config.ribbonCount; i++) {
      const startX = Math.random() * this.width;
      const startY = Math.random() * this.height;
      const points = [];

      for (let j = 0; j < this.config.maxRibbonLength; j++) {
        points.push({
          x: startX + (Math.random() - 0.5) * 20,
          y: startY + (Math.random() - 0.5) * 20
        });
      }

      this.ribbons.push({
        points,
        color: this.config.colors.ribbons[Math.floor(Math.random() * this.config.colors.ribbons.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
      });
    }
  }

  noise(x, y, t) {
    // Simple pseudo-random noise function
    const n = Math.sin(x * 12.9898 + y * 78.233 + t * 43.534) * 43758.5453;
    return n - Math.floor(n);
  }

  updateParticles(deltaTime) {
    for (const p of this.particles) {
      // Flow field movement
      const angle = this.noise(p.x * this.config.noiseScale, p.y * this.config.noiseScale, this.time) * Math.PI * 2 * this.config.noiseStrength;
      const speed = 0.3 + this.noise(p.x * 0.001, p.y * 0.001, this.time * 0.5) * 0.5;

      p.vx += Math.cos(angle) * speed * deltaTime * 0.01;
      p.vy += Math.sin(angle) * speed * deltaTime * 0.01;

      // Damping
      p.vx *= 0.98;
      p.vy *= 0.98;

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Wrap around screen
      if (p.x < -50) p.x = this.width + 50;
      if (p.x > this.width + 50) p.x = -50;
      if (p.y < -50) p.y = this.height + 50;
      if (p.y > this.height + 50) p.y = -50;

      // Pulse opacity
      p.life += deltaTime * 0.001;
      p.opacity = 0.2 + Math.sin(p.life) * 0.2;
    }
  }

  updateRibbons(deltaTime) {
    for (const r of this.ribbons) {
      r.phase += deltaTime * this.config.flowSpeed * r.speed;

      // Move head of ribbon
      const head = r.points[0];
      const angle = this.noise(head.x * this.config.noiseScale, head.y * this.config.noiseScale, this.time + r.phase) * Math.PI * 2;
      const speed = 0.8 + Math.sin(r.phase) * 0.3;

      head.x += Math.cos(angle) * speed * deltaTime * 0.1;
      head.y += Math.sin(angle) * speed * deltaTime * 0.1;

      // Wrap around
      if (head.x < -50) head.x = this.width + 50;
      if (head.x > this.width + 50) head.x = -50;
      if (head.y < -50) head.y = this.height + 50;
      if (head.y > this.height + 50) head.y = -50;

      // Update trailing points
      for (let i = 1; i < r.points.length; i++) {
        const curr = r.points[i];
        const prev = r.points[i - 1];
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetDist = 8;

        if (dist > targetDist) {
          curr.x += (dx / dist) * (dist - targetDist) * 0.5;
          curr.y += (dy / dist) * (dist - targetDist) * 0.5;
        }
      }
    }
  }

  drawParticles() {
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  drawRibbons() {
    for (const r of this.ribbons) {
      if (r.points.length < 2) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(r.points[0].x, r.points[0].y);

      for (let i = 1; i < r.points.length; i++) {
        const p = r.points[i];
        const prev = r.points[i - 1];
        // Catmull-Rom spline for smooth curves
        const next = r.points[Math.min(i + 1, r.points.length - 1)];
        const cp1x = prev.x + (p.x - (i > 1 ? r.points[i - 2].x : prev.x)) / 6;
        const cp1y = prev.y + (p.y - (i > 1 ? r.points[i - 2].y : prev.y)) / 6;
        const cp2x = p.x - (next.x - prev.x) / 6;
        const cp2y = p.y - (next.y - prev.y) / 6;
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p.x, p.y);
      }

      this.ctx.strokeStyle = r.color;
      this.ctx.lineWidth = this.config.ribbonWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.globalAlpha = 0.5 + Math.sin(r.phase) * 0.2;
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }

  drawGridPattern() {
    // Subtle grid pattern for "stencil" feel
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(26, 26, 46, 0.02)';
    this.ctx.lineWidth = 0.5;

    const gridSize = 40;
    const offsetX = (this.time * 5) % gridSize;
    const offsetY = (this.time * 3) % gridSize;

    for (let x = -offsetX; x < this.width + gridSize; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = -offsetY; y < this.height + gridSize; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  animate(timestamp = 0) {
    if (this.isReducedMotion || !this.ctx) return;

    const deltaTime = timestamp - (this.lastTime || timestamp);
    this.lastTime = timestamp;
    this.time = timestamp;

    // Clear
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw background grid
    this.drawGridPattern();

    // Update and draw
    this.updateParticles(deltaTime);
    this.updateRibbons(deltaTime);
    this.drawRibbons();
    this.drawParticles();

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// ============================================================================
// Quote Form Handler
// ============================================================================

class QuoteForm {
  constructor() {
    this.form = document.getElementById('quote-form');
    this.statusEl = document.getElementById('form-status');
    this.submitBtn = this.form?.querySelector('button[type="submit"]');

    if (this.form) {
      this.init();
    }
  }

  init() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Real-time validation
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearError(input));
    });
  }

  validateField(field) {
    const errorEl = document.getElementById(`${field.id}-error`);
    let isValid = true;
    let message = '';

    // Required check
    if (field.required && !field.value.trim()) {
      isValid = false;
      message = `${field.labels[0]?.textContent?.replace('*', '').trim() || 'This field'} is required`;
    }

    // Type-specific validation
    if (isValid && field.value.trim()) {
      switch (field.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
            isValid = false;
            message = 'Please enter a valid email address';
          }
          break;
        case 'tel':
          if (!/^[\d\s\-\+\(\)]{8,}$/.test(field.value)) {
            isValid = false;
            message = 'Please enter a valid phone number';
          }
          break;
      }
    }

    // Checkbox validation
    if (field.type === 'checkbox' && field.required && !field.checked) {
      isValid = false;
      message = 'You must agree to be contacted';
    }

    field.setAttribute('aria-invalid', !isValid);
    if (errorEl) {
      errorEl.textContent = message;
    }

    return isValid;
  }

  clearError(field) {
    field.setAttribute('aria-invalid', 'false');
    const errorEl = document.getElementById(`${field.id}-error`);
    if (errorEl) errorEl.textContent = '';
  }

  validateForm() {
    const fields = this.form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    fields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    // Honeypot check
    const honeypot = this.form.querySelector('input[name="website"]');
    if (honeypot && honeypot.value) {
      return false; // Bot detected
    }

    return isValid;
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      this.showStatus('Please fix the errors above', 'error');
      const firstInvalid = this.form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    this.setSubmitting(true);
    this.showStatus('Sending...', '');

    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());

    try {
      // In production, this would go to the Supabase edge function
      // For preview, simulate success
      await this.simulateSubmission(data);

      this.showStatus('Thanks! We\'ll be in touch within the hour.', 'success');
      this.form.reset();
    } catch (error) {
      console.error('Form submission error:', error);
      this.showStatus('Something went wrong. Please call us directly at 0415 432 848.', 'error');
    } finally {
      this.setSubmitting(false);
    }
  }

  async simulateSubmission(data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Log for debugging
    console.log('Quote request submitted:', {
      ...data,
      timestamp: new Date().toISOString(),
      lead_id: 'yp_-79751c64-9b9'
    });

    // In production: return fetch('/functions/v1/quote-request', { method: 'POST', body: JSON.stringify(data) });
  }

  setSubmitting(isSubmitting) {
    if (this.submitBtn) {
      this.submitBtn.disabled = isSubmitting;
      this.submitBtn.textContent = isSubmitting ? 'Sending...' : 'Submit Quote Request';
    }
  }

  showStatus(message, type) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      this.statusEl.className = 'form-note';
      if (type) {
        this.statusEl.classList.add(type);
      }
    }
  }
}

// ============================================================================
// Smooth Scroll for Anchor Links
// ============================================================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 72;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Focus for accessibility
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });
}

// ============================================================================
// Scroll Reveal with IntersectionObserver + JS Safety Net
// ============================================================================

function initScrollReveal() {
  // Immediately mark JS as active
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  // Check for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Show all immediately
    document.querySelectorAll('.rv').forEach(el => {
      el.classList.add('on');
    });
    return;
  }

  // Elements to reveal
  const revealElements = document.querySelectorAll('.service-card, .about-list li, .contact-item, .quote-form, .section-header, .footer-brand, .footer-nav-group');

  revealElements.forEach((el, index) => {
    el.classList.add('rv');
    el.style.transitionDelay = `${index * 0.08}s`;
  });

  // IntersectionObserver for scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  document.querySelectorAll('.rv').forEach(el => observer.observe(el));

  // JS SAFETY NET: reveal all after ~1100ms if IntersectionObserver didn't fire
  // This handles cases where elements are already in viewport on load
  setTimeout(() => {
    document.querySelectorAll('.rv:not(.on)').forEach(el => {
      el.classList.add('on');
    });
  }, 1100);
}

// ============================================================================
// Initialize Everything
// ============================================================================

// Add no-js class immediately (removed by JS on load)
document.documentElement.classList.add('no-js');

document.addEventListener('DOMContentLoaded', () => {
  // Initialize hero canvas — never let a hero failure stop the rest of the page
  let hero = null;
  try { hero = new ParticleRibbonHero(); } catch (err) { console.warn('Hero init skipped:', err); }

  // Initialize form
  const quoteForm = new QuoteForm();

  // Initialize smooth scroll
  initSmoothScroll();

  // Initialize scroll reveal
  initScrollReveal();

  // Expose for debugging
  window.wrightsPlumbing = { hero, quoteForm };
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
  if (window.wrightsPlumbing?.hero) {
    if (document.hidden) {
      window.wrightsPlumbing.hero.destroy();
    } else if (!window.wrightsPlumbing.hero.isReducedMotion) {
      window.wrightsPlumbing.hero.animate();
    }
  }
});