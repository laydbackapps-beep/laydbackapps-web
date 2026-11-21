(() => {

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
        const base = (t || '').trim().replace(/\/+$/, '');
        const candidate = /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(base) ? base : fallback;
        if (candidate === fallback) { clearTimeout(timer); return settle(fallback); }
        // A dead base in the pointer used to mean every enquiry vanished. Probe it first.
        const ac = new AbortController();
        const pt = setTimeout(() => ac.abort(), 1500);
        fetch(candidate + '/health', { method: 'GET', mode: 'no-cors', signal: ac.signal })
          .then(() => { clearTimeout(pt); clearTimeout(timer); settle(candidate); })
          .catch(() => { clearTimeout(pt); clearTimeout(timer); settle(fallback); });
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
          site_id: 'ohplastering', business_name: 'OH Plastering',
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
      status.innerHTML = 'Could not send just now. Call <a href="tel:tel:+61475036670"><strong>0475 036 670</strong></a>.';
      status.classList.add('error'); status.hidden = false;
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Send the details';
    }
  });
})();