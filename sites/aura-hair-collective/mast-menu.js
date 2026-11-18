(() => {
  const menu = document.querySelector('.mast__menu');
  if (!menu) return;
  document.querySelectorAll('[data-service-link]').forEach(link => {
    link.addEventListener('click', event => {
      const service = link.dataset.serviceLink;
      const tab = document.querySelector(`.services__tab[data-service="${service}"]`);
      if (tab) { event.preventDefault(); tab.click(); document.querySelector('#services')?.scrollIntoView(); }
      menu.open = false;
    });
  });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') menu.open = false; });
})();
