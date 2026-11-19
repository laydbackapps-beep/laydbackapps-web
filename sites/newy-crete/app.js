(() => {
  const bar = document.getElementById('bar');
  const hero = document.querySelector('.hero');
  const name = document.getElementById('heroName');
  const menu = document.querySelector('.menu');

  // Let the name behave like a poured slab: always full width, never wrap.
  const fitName = () => {
    if (!name) return;
    name.style.setProperty('--fit', '1');
    const spans = [...name.querySelectorAll('span')];
    const target = name.clientWidth;
    const widest = Math.max(...spans.map(s => s.scrollWidth));
    if (!target || !widest) return;
    name.style.setProperty('--fit', Math.min(1.65, target / widest).toFixed(4));
  };
  document.fonts?.ready.then(fitName);
  addEventListener('resize', fitName, { passive: true });
  fitName();

  const setBar = () => {
    if (!bar || !hero) return;
    const past = scrollY > hero.offsetHeight - 90;
    bar.classList.toggle('is-stuck', past);
  };
  addEventListener('scroll', setBar, { passive: true });
  setBar();

  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.removeAttribute('open')));
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const priceForm = document.getElementById('priceForm');
  const rates = { broom: [105, 135], exposed: [140, 175], honed: [165, 210] };
  const depthFactor = { 100: 1, 125: 1.1, 150: 1.2 };
  const jobFactor = { driveway: 1, pathway: 1.05, slab: 1, footing: 1.15 };
  const round50 = n => Math.round(n / 50) * 50;
  const money = n => '$' + n.toLocaleString('en-AU');

  const calc = () => {
    if (!priceForm) return;
    const len = Math.min(80, Math.max(1, parseFloat(document.getElementById('len').value) || 0));
    const wid = Math.min(40, Math.max(1, parseFloat(document.getElementById('wid').value) || 0));
    const depth = document.getElementById('depth').value;
    const finish = document.getElementById('finish').value;
    const job = document.getElementById('job').value;
    const area = len * wid;
    if (!area) return;
    const billable = Math.max(area, 8);
    const [lo, hi] = rates[finish];
    const factor = (depthFactor[depth] || 1) * (jobFactor[job] || 1);
    const low = round50(billable * lo * factor);
    const high = round50(billable * hi * factor);
    document.getElementById('outArea').textContent = area.toFixed(1) + ' m²';
    document.getElementById('outVol').textContent = (area * (Number(depth) / 1000)).toFixed(2) + ' m³';
    document.getElementById('outPrice').textContent = money(low) + ' – ' + money(high);
    document.getElementById('outNote').textContent = area < 8
      ? 'Priced from the 8 m² minimum · ex GST'
      : 'Indicative supply and finish range · ex GST';
  };
  priceForm?.addEventListener('input', calc);
  priceForm?.addEventListener('change', calc);
  calc();

  const pointer = 'https://gist.githubusercontent.com/laydbackapps-beep/48ff985c786b72a1637d7875f4df79b8/raw/api-base.txt';
  const fallback = 'https://laydback-hq.tail5b3740.ts.net';
  function apiBase() {
    if (window.__LAYDBACK_API_BASE) return Promise.resolve(window.__LAYDBACK_API_BASE);
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    return new Promise(resolve => {
      let done = false;
      const settle = v => { if (!done) { done = true; resolve(v); } };
      const timer = setTimeout(() => settle(local ? 'http://' + location.host : fallback), 2200);
      if (local) return;
      fetch(pointer + '?_=' + Date.now()).then(r => r.ok ? r.text() : Promise.reject()).then(t => {
        clearTimeout(timer);
        const base = (t || '').trim().replace(/\/+$/, '');
        settle(/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(base) ? base : fallback);
      }).catch(() => { clearTimeout(timer); settle(fallback); });
    });
  }

  const form = document.getElementById('quoteForm');
  const status = document.getElementById('formStatus');
  const submit = form?.querySelector('button[type="submit"]');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    status.hidden = true;
    status.className = 'form-status';
    if (!form.reportValidity()) {
      status.textContent = 'Complete the required fields so we can call you back.';
      status.classList.add('error'); status.hidden = false; return;
    }
    const data = new FormData(form);
    if (data.get('website')) return;
    const suburb = String(data.get('suburb') || '').trim();
    const notes = String(data.get('message') || '').trim();
    submit.disabled = true;
    submit.querySelector('span').textContent = 'Sending…';
    try {
      const base = await apiBase();
      const res = await fetch(base + '/functions/v1/quote-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          site_id: 'newy-crete', business_name: 'Newy Concrete Solutions Pty Ltd',
          name: data.get('name'), phone: data.get('phone'), email: data.get('email') || '',
          service: data.get('service'), message: 'Project location: ' + suburb + (notes ? ' — ' + notes : ''),
          consent: data.get('consent') === 'on'
        })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.success === false) throw new Error(result.error || 'Enquiry failed');
      form.reset();
      status.textContent = "Sent. We'll call you about the site.";
      status.classList.add('success'); status.hidden = false;
    } catch (err) {
      status.innerHTML = 'Could not send just now. Call <a href="tel:+614****6214"><strong>0436 486 214</strong></a>.';
      status.classList.add('error'); status.hidden = false;
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Send the details';
    }
  });
})();