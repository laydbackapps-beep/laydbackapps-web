(() => {
  // 1. Mobile navigation toggle
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    const closeNav = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeNav());
  }

  // 2. Interactive Service Sanctuary Tabs
  const serviceData = {
    blonde: {
      title: "Lived-In Blonde & Foilayage",
      body: "A tailored colour service for soft, natural-looking brightness. Fine micro-foils and hand-swept balayage are mapped to your natural root depth so brightness frames the face while regrowth stays soft.",
      items: [
        "Custom root smudge & multi-zone tonal gloss",
        "Bright creamy, pearl or honey tones without brassiness",
        "Formulated with NAK Hair Professional & hello.bleach",
      ],
      img: "./img/DGJ7jvBTowB-1280.jpg",
      alt: "Cool-toned lived-in blonde balayage waves",
    },
    bronde: {
      title: "Dimensional Bronde & Melts",
      body: "Designed for brunette warmth or transitioning outgrown blonde into rich, ribboned dimension. Seamless root shadows and glossing restore mirror-like shine without a harsh regrowth line.",
      items: [
        "Outgrown-blonde to seamless bronde corrections",
        "Custom tonal root melts & mid-length ribbons",
        "Low-maintenance grow-out built for busy schedules",
      ],
      img: "./img/DdoNZz-E7BJ-1280.jpg",
      alt: "Seamless bronde colour melt from natural dark base",
    },
    styling: {
      title: "Occasion & Bridal Styling",
      body: "Sculpted textured upstyles, romantic tendrils and Cloud Nine waves tailored to weddings, milestone birthdays and special events across Lake Macquarie and Newcastle.",
      items: [
        "Textured effortless upstyles & soft face-framing tendrils",
        "Long-wear prep & humidity-resistant gloss finish",
        "Individual event bookings & bridal party enquiries",
      ],
      img: "./img/DfWmWKnk7F4-1280.jpg",
      alt: "Textured brunette upstyle in front of Aura Hair Collective wall emblem",
    },
    rituals: {
      title: "Cut, Blowout & Salon Care",
      body: "Healthy, luminous colour starts with condition. Pair your gloss refresh or tailored cut with restorative salon treatments and curated NAK Hair take-home care.",
      items: [
        "Signature bouncy blowouts & Cloud Nine wave finishes",
        "In-chair bond & moisture rituals for lightened hair",
        "NAK Hair Professional care sets & Blonde Duo packs in salon",
      ],
      img: "./img/Dei0DSREw24-1280.jpg",
      alt: "Golden honey blonde salon blowout from behind",
    },
  };

  const tabs = document.querySelectorAll(".services__tab");
  const pTitle = document.getElementById("panel-title");
  const pBody = document.getElementById("panel-body");
  const pList = document.getElementById("panel-list");
  const pImg = document.getElementById("panel-img");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.getAttribute("data-service");
      const d = key && serviceData[key];
      if (!d) return;
      tabs.forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
      if (pTitle) pTitle.textContent = d.title;
      if (pBody) pBody.textContent = d.body;
      if (pList) {
        pList.innerHTML = d.items.map((item) => `<li>${item}</li>`).join("");
      }
      if (pImg) {
        pImg.src = d.img;
        pImg.alt = d.alt;
      }
    });
  });

  // 3. Horizontal Lookbook Rail: Mouse Drag + Wheel + Prev/Next Buttons
  const rail = document.getElementById("lookbook-rail");
  const prevBtn = document.getElementById("rail-prev");
  const nextBtn = document.getElementById("rail-next");
  if (rail) {
    const step = () => Math.min(390, rail.clientWidth * 0.85);
    prevBtn?.addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
    nextBtn?.addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    rail.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      isDown = true;
      rail.classList.add("is-dragging");
      startX = e.clientX;
      startScroll = rail.scrollLeft;
    });
    window.addEventListener("pointerup", () => {
      isDown = false;
      rail.classList.remove("is-dragging");
    });
    window.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      rail.scrollLeft = startScroll - dx * 1.15;
    });
    rail.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && rail.scrollWidth > rail.clientWidth) {
          const atStart = rail.scrollLeft <= 2 && e.deltaY < 0;
          const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2 && e.deltaY > 0;
          if (!atStart && !atEnd) {
            e.preventDefault();
            rail.scrollLeft += e.deltaY;
          }
        }
      },
      { passive: false }
    );
  }

  // 4. Burnished Gold Lake-Light Caustic Canvas (auto-pauses off-viewport, respects reduced-motion)
  const canvas = document.getElementById("caustic-canvas");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (canvas instanceof HTMLCanvasElement && !reduced) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, raf = 0, visible = true;
    let mx = 0.5, my = 0.35;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX / Math.max(1, window.innerWidth);
        my = e.clientY / Math.max(1, window.innerHeight);
      },
      { passive: true }
    );

    const draw = (t) => {
      if (!visible || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      const time = t * 0.00035;
      const g1 = ctx.createRadialGradient(
        w * (0.22 + Math.sin(time) * 0.08 + (mx - 0.5) * 0.08),
        h * (0.3 + Math.cos(time * 0.8) * 0.07 + (my - 0.5) * 0.06),
        10,
        w * 0.3,
        h * 0.38,
        Math.max(w, h) * 0.58
      );
      g1.addColorStop(0, "rgba(212, 180, 131, 0.20)");
      g1.addColorStop(0.5, "rgba(166, 124, 68, 0.07)");
      g1.addColorStop(1, "rgba(19, 15, 12, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(
        w * (0.78 + Math.cos(time * 1.1) * 0.06),
        h * (0.62 + Math.sin(time * 0.9) * 0.06),
        10,
        w * 0.76,
        h * 0.6,
        Math.max(w, h) * 0.48
      );
      g2.addColorStop(0, "rgba(229, 202, 160, 0.14)");
      g2.addColorStop(1, "rgba(19, 15, 12, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);
  }

  // 5. Consultation Enquiry Form -> Laydback Quote Endpoint
  const form = document.getElementById("aura-enquiry");
  const statusEl = document.getElementById("aura-status");
  const submitBtn = document.getElementById("aura-submit");
  const reqId = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      if (fd.get("website")) return;
      if (submitBtn) submitBtn.setAttribute("disabled", "true");
      if (statusEl) {
        statusEl.className = "aura-form__status";
        statusEl.textContent = "Sending your salon enquiry…";
      }
      try {
        const apiHost =
          location.hostname === "localhost" || location.hostname === "127.0.0.1"
            ? `${location.protocol}//${location.host}`
            : "https://laydback-hq.tail5b3740.ts.net";
        const res = await fetch(`${apiHost}/functions/v1/quote-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            data: {
              business_slug: "aura-hair-collective",
              service_name: fd.get("preferred_service"),
              preferred_timing: fd.get("preferred_timing"),
              client_name: fd.get("client_name"),
              email: fd.get("email"),
              phone: fd.get("phone"),
              notes: fd.get("notes"),
              request_id: reqId,
              consent: true,
            },
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error || json.detail) throw new Error("Request failed");
        if (statusEl) {
          statusEl.textContent =
            "Thank you — your enquiry is with the Aura Hair Collective team. You can also view live times directly via our online booking calendar.";
        }
        form.reset();
      } catch {
        if (statusEl) {
          statusEl.className = "aura-form__status is-error";
          statusEl.textContent =
            "Couldn’t send just now — please DM @aurahaircollective_ on Instagram, or book directly via our online calendar.";
        }
      } finally {
        if (submitBtn) submitBtn.removeAttribute("disabled");
      }
    });
  }
})();
