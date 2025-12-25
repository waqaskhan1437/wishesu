export function createRouter({ routes, outlet }) {
  const getPath = () => location.hash.replace('#', '') || '/';

  const render = () => {
    const path = getPath();
    const view = routes[path] || routes['/'];
    outlet.innerHTML = '';
    outlet.appendChild(view());
    setActive(path);
  };

  const setActive = (path) => {
    document.querySelectorAll('[data-route]').forEach((link) => {
      link.classList.toggle('active', link.dataset.route === path);
    });
  };

  window.addEventListener('hashchange', render);
  return { init: render, go: (p) => (location.hash = p) };
}
