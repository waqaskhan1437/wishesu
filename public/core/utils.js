export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'class') node.className = val;
    else if (key === 'text') node.textContent = val;
    else if (key.startsWith('on') && typeof val === 'function') node.addEventListener(key.slice(2), val);
    else node.setAttribute(key, val);
  });
  [].concat(children).filter(Boolean).forEach((child) => {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

export const formatMoney = (n) => `?${Number(n || 0).toLocaleString('en-IN')}`;
export const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
export const uid = () => Math.random().toString(36).slice(2, 9);
