const builderDependencyScripts = [
  '/js/product-cards.js',
  '/js/blog-cards.js',
  '/js/reviews-widget.js',
  '/js/instant-upload.js'
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.pbReady === '1') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.pbLoader = '1';
    script.addEventListener('load', () => {
      script.dataset.pbReady = '1';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

await Promise.all(builderDependencyScripts.map(loadScript));
await import('./app.js?v=30');
