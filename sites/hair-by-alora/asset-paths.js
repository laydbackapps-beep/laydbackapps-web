// Static fallback for GitHub Pages/subpath deployments.
const repairAssetPaths = () => {
  document.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (!src) return;
    const asset = src.match(/(?:DeY4GB7T0bq-1920\.jpg|DGJ7jvBTowB-1440\.jpg|Dei0DSREw24-1920\.jpg|DdoNZz-E7BJ-1920\.jpg|DD20wAXTtpy-864\.jpg|DfWmWKnk7F4-1920\.jpg|alora-mark\.png|alora-tile\.jpg|Dd0sfqUFKw2-1920\.jpg)$/)?.[0];
    if (asset && (src.startsWith('/') || src.includes('/sites/'))) {
      img.removeAttribute('srcset');
      img.onerror = null;
      img.src = asset === 'DeY4GB7T0bq-1920.jpg' ? './img/alora-hero-v3.png' : `./img/${asset}`;
    }
  });
};
new MutationObserver(repairAssetPaths).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
repairAssetPaths();
