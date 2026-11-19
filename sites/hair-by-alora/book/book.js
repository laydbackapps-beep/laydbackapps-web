(() => {
  const API = (window.ALORA_API || "").replace(/\/$/, "");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
  const state = { services: [], category: "All", query: "", selected: new Map(), dates: [], date: null, slot: null, step: 1 };

  const el = {
    list: $("#service-list"), tabs: $("#category-tabs"), count: $("#service-count"), search: $("#service-search"),
    items: $("#cart-items"), total: $("#cart-total"), duration: $("#cart-duration"), dot: $("#cart-dot"),
    toTime: $("#to-time"), dates: $("#date-strip"), slots: $("#slots"), hint: $("#time-hint"),
    form: $("#booking-form"), error: $("#form-error"), confirm: $("#confirm-btn"),
    done: $("#step-done"), doneSummary: $("#done-summary"), doneRef: $("#done-ref"), calendar: $("#calendar-link"),
    cartTime: $("#cart-time"), mobileTotal: $("#mobile-total"), mobileDuration: $("#mobile-duration"),
    mobileNext: $("#mobile-next"), mobileBar: $("#mobile-bar")
  };

  const selectedServices = () => [...state.selected.values()];
  const cartTotal = () => selectedServices().reduce((n, s) => n + s.price, 0);
  const cartDuration = () => selectedServices().reduce((n, s) => n + s.duration, 0);
  const fmtDuration = (m) => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? " " + (m % 60) + "m" : ""}` : `${m} min`;

  async function api(path, opts = {}) {
    const res = await fetch(API + path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.detail || "Something went wrong."), { status: res.status });
    return body;
  }

  function showStep(n) {
    state.step = n;
    $$(".step").forEach((s) => (s.hidden = s.id !== `step-${["", "services", "time", "details", "done"][n]}`));
    $$("[data-step-dot]").forEach((li) => {
      const k = +li.dataset.stepDot;
      li.classList.toggle("is-active", k === n);
      li.classList.toggle("is-done", k < n);
    });
    el.mobileBar.hidden = n === 3 || n === 4;
    el.mobileNext.textContent = n === 1 ? "Continue" : "Choose a time";
    $(".panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderTabs() {
    const cats = ["All", ...new Set(state.services.map((s) => s.category))];
    el.tabs.innerHTML = cats.map((c) => `<button type="button" role="tab" class="tab ${c === state.category ? "is-active" : ""}" data-cat="${c}" aria-selected="${c === state.category}">${c}</button>`).join("");
    $$(".tab", el.tabs).forEach((b) => b.addEventListener("click", () => { state.category = b.dataset.cat; renderTabs(); renderServices(); }));
  }

  function renderServices() {
    const q = state.query.trim().toLowerCase();
    const rows = state.services.filter((s) => (state.category === "All" || s.category === state.category) && (!q || (s.name + " " + s.category).toLowerCase().includes(q)));
    el.count.textContent = `${rows.length} service${rows.length === 1 ? "" : "s"}${state.category === "All" ? "" : " · " + state.category}`;
    if (!rows.length) { el.list.innerHTML = `<div class="no-slots">No services match that search. Try “balayage”, “cut” or “blow dry”.</div>`; return; }
    el.list.innerHTML = rows.map((s) => {
      const on = state.selected.has(s.id);
      return `<button type="button" class="service ${on ? "is-selected" : ""}" data-id="${s.id}" aria-pressed="${on}">
        <span class="service__check" aria-hidden="true">${on ? "✓" : ""}</span>
        <span><span class="service__name">${esc(s.name)}</span><span class="service__desc">${esc(s.desc)}</span></span>
        <span class="service__meta"><span class="service__price">${money.format(s.price)}</span><span class="service__time">${fmtDuration(s.duration)}</span></span>
      </button>`;
    }).join("");
    $$(".service", el.list).forEach((b) => b.addEventListener("click", () => toggle(b.dataset.id)));
  }

  function toggle(id) {
    const s = state.services.find((x) => x.id === id);
    if (!s) return;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.set(id, s);
    renderServices(); renderCart();
  }

  function renderCart() {
    const rows = selectedServices();
    el.dot.textContent = rows.length;
    el.total.textContent = money.format(cartTotal());
    el.duration.textContent = rows.length ? fmtDuration(cartDuration()) : "—";
    el.mobileTotal.textContent = money.format(cartTotal());
    el.mobileDuration.textContent = rows.length ? fmtDuration(cartDuration()) : "0 min";
    el.toTime.disabled = !rows.length;
    el.mobileNext.disabled = !rows.length;
    if (!rows.length) { el.items.innerHTML = `<p class="muted">No services selected yet.</p>`; el.cartTime.hidden = true; return; }
    el.items.innerHTML = rows.map((s) => `<div class="cart-item"><div><b>${esc(s.name)}</b><small>${fmtDuration(s.duration)} · ${money.format(s.price)}</small></div><button type="button" data-remove="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></div>`).join("");
    $$("[data-remove]", el.items).forEach((b) => b.addEventListener("click", () => toggle(b.dataset.remove)));
    if (state.slot) el.cartTime.innerHTML = `<b>${prettyDate(state.date)} · ${state.slot}</b><br>${fmtDuration(cartDuration())} reserved`;
    el.cartTime.hidden = !state.slot;
  }

  async function loadDates() {
    state.dates = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let available = null;
    try {
      const d = await api(`/availability/dates?services=${encodeURIComponent(selectedServices().map((s) => s.id).join(","))}`);
      available = new Set(d.dates || []);
    } catch (e) { available = null; }
    for (let i = 1; i < 29; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      state.dates.push(d);
    }
    const isOpen = (d) => available ? available.has(isoDate(d)) : [2, 4, 5].includes(d.getDay());
    el.dates.innerHTML = state.dates.map((d) => {
      const open = isOpen(d);
      const iso = isoDate(d);
      return `<button type="button" class="date ${open ? "" : "is-closed"} ${state.date === iso ? "is-active" : ""}" data-date="${iso}" ${open ? "" : "disabled"} aria-label="${d.toDateString()}${open ? "" : " no availability"}"><span>${d.toLocaleDateString("en-AU", { weekday: "short" })}</span><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-AU", { month: "short" })}</small></button>`;
    }).join("");
    $$(".date:not([disabled])", el.dates).forEach((b) => b.addEventListener("click", () => { state.date = b.dataset.date; state.slot = null; renderCart(); loadDates(); loadSlots(); }));
    if (!state.date || !$$(".date[data-date='" + state.date + "']:not([disabled])").length) {
      const first = $$(".date:not([disabled])", el.dates)[0];
      if (first) { state.date = first.dataset.date; renderCart(); loadDates(); }
    }
    if (state.date) loadSlots();
  }

  async function loadSlots() {
    state.slot = null;
    el.slots.innerHTML = `<p class="loading">Checking Alora's chair…</p>`;
    el.hint.textContent = "";
    el.hint.className = "hint";
    try {
      const data = await api(`/availability?date_str=${state.date}&services=${encodeURIComponent(selectedServices().map((s) => s.id).join(","))}`);
      if (!data.slots.length) {
        el.slots.innerHTML = `<div class="no-slots">No online slots left for ${prettyDate(state.date)}. <a href="tel:+61476427024">Call 0476 427 024</a> or choose another day.</div>`;
        return;
      }
      el.hint.textContent = `${fmtDuration(data.duration)} appointment · ${data.slots.length} times available`;
      el.slots.innerHTML = data.slots.map((t) => `<button type="button" class="slot" data-time="${t}">${prettyTime(t)}</button>`).join("");
      $$(".slot", el.slots).forEach((b) => b.addEventListener("click", () => {
        state.slot = b.dataset.time;
        renderCart();
        showStep(3);
        $("#booking-form input[name=name]")?.focus();
      }));
    } catch (e) {
      el.slots.innerHTML = `<div class="no-slots">Live availability is temporarily unavailable. <a href="tel:+61476427024">Call 0476 427 024</a> and we'll book you in.</div>`;
    }
  }

  function prettyDate(iso) {
    if (!iso) return "";
    return new Date(iso + "T12:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  }
  function prettyTime(t) {
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
  }
  function isoDate(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  el.search.addEventListener("input", () => { state.query = el.search.value; renderServices(); });
  el.toTime.addEventListener("click", () => { if (!state.selected.size) return; showStep(2); loadDates(); });
  el.mobileNext.addEventListener("click", () => { if (!state.selected.size) return; showStep(2); loadDates(); });
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => { showStep(+b.dataset.back); if (+b.dataset.back === 2) loadSlots(); }));

  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    el.error.textContent = "";
    const fd = new FormData(el.form);
    const payload = {
      name: String(fd.get("name") || "").trim(), email: String(fd.get("email") || "").trim(), phone: String(fd.get("phone") || "").trim(),
      service_ids: selectedServices().map((s) => s.id), date: state.date, start_time: state.slot,
      notes: String(fd.get("notes") || ""), consent: !!fd.get("consent"), marketing: !!fd.get("marketing")
    };
    if (!payload.name || !payload.email || !payload.phone || !payload.consent) { el.error.textContent = "Name, email, mobile and the policy checkbox are required."; return; }
    el.confirm.disabled = true; el.confirm.textContent = "Confirming…";
    try {
      const data = await api("/bookings", { method: "POST", body: JSON.stringify(payload) });
      const b = data.booking;
      el.doneSummary.innerHTML = `<strong>${prettyDate(b.date)} · ${prettyTime(b.start_time)}–${prettyTime(b.end_time)}</strong><br>${b.services.map(esc).join("<br>")}<br><span class="hint">${fmtDuration(b.duration)} · ${money.format(b.price)}</span>`;
      el.doneRef.textContent = b.ref;
      const d = b.date.replaceAll("-", ""), s = b.start_time.replace(":", "") + "00", en = b.end_time.replace(":", "") + "00";
      el.calendar.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Hair+by+Alora&dates=${d}T${s}/${d}T${en}&details=Ref+${b.ref}&location=Shop+7%2F17+Laycock+Street+Carey+Bay+NSW+2283`;
      showStep(4);
    } catch (err) {
      el.error.textContent = err.message;
      if (err.status === 409) { showStep(2); loadSlots(); }
    } finally {
      el.confirm.disabled = false; el.confirm.innerHTML = 'Confirm booking <span aria-hidden="true">→</span>';
    }
  });

  $("#book-another").addEventListener("click", () => {
    state.selected.clear(); state.slot = null; state.date = null; el.form.reset();
    renderServices(); renderCart(); showStep(1);
  });

  $("#voucher-open").addEventListener("click", () => { $("#voucher-panel").hidden = false; $("#voucher-panel").scrollIntoView({ behavior: "smooth" }); });
  $("#voucher-close").addEventListener("click", () => { $("#voucher-panel").hidden = true; });
  $("#voucher-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    $("#voucher-error").textContent = ""; $("#voucher-done").hidden = true;
    try {
      const data = await api("/vouchers", { method: "POST", body: JSON.stringify({
        amount: Number(fd.get("amount")), purchaser: fd.get("purchaser"), email: fd.get("email"), phone: fd.get("phone") || "",
        recipient: fd.get("recipient") || "", message: fd.get("message") || ""
      }) });
      $("#voucher-done").textContent = `Reserved. Reference ${data.ref}. We'll email payment and delivery details.`;
      $("#voucher-done").hidden = false;
      e.target.reset(); $("input[name=amount]", e.target).value = 100;
    } catch (err) { $("#voucher-error").textContent = err.message; }
  });

  (async function init() {
    renderCart();
    try {
      const data = await api("/services");
      state.services = data.services;
      const pre = new URLSearchParams(location.search).get("service");
      if (pre) { const s = state.services.find((x) => x.id === pre); if (s) state.selected.set(s.id, s); }
      renderTabs(); renderServices(); renderCart();
    } catch (e) {
      el.list.innerHTML = `<div class="no-slots">The live menu couldn't load. Please <a href="tel:+61476427024">call 0476 427 024</a> — Alora will book you in personally.</div>`;
      $("#to-time").disabled = true;
    }
  })();
})();