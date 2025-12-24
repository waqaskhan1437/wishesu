/**
 * DOM Helper Utilities
 * Common DOM manipulation functions to reduce repetitive code
 */

/**
 * Create element with attributes and children
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  // Set attributes
  Object.keys(attributes).forEach(key => {
    if (key === 'className') {
      element.className = attributes[key];
    } else if (key === 'innerHTML') {
      element.innerHTML = attributes[key];
    } else if (key === 'textContent') {
      element.textContent = attributes[key];
    } else if (key === 'dataset') {
      Object.keys(attributes[key]).forEach(dataKey => {
        element.dataset[dataKey] = attributes[key][dataKey];
      });
    } else if (key.startsWith('on') && typeof attributes[key] === 'function') {
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, attributes[key]);
    } else {
      element.setAttribute(key, attributes[key]);
    }
  });

  // Append children
  if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
  } else if (typeof children === 'string') {
    element.textContent = children;
  } else if (children instanceof Node) {
    element.appendChild(children);
  }

  return element;
}

/**
 * Query selector with optional parent
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Query selector all with optional parent
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Add class(es) to element
 */
export function addClass(element, ...classes) {
  if (!element) return;
  element.classList.add(...classes);
}

/**
 * Remove class(es) from element
 */
export function removeClass(element, ...classes) {
  if (!element) return;
  element.classList.remove(...classes);
}

/**
 * Toggle class on element
 */
export function toggleClass(element, className, force = undefined) {
  if (!element) return;
  return element.classList.toggle(className, force);
}

/**
 * Check if element has class
 */
export function hasClass(element, className) {
  if (!element) return false;
  return element.classList.contains(className);
}

/**
 * Set multiple attributes on element
 */
export function setAttributes(element, attributes) {
  if (!element) return;
  Object.keys(attributes).forEach(key => {
    element.setAttribute(key, attributes[key]);
  });
}

/**
 * Remove element from DOM
 */
export function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Empty element (remove all children)
 */
export function emptyElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Show element
 */
export function show(element, display = 'block') {
  if (!element) return;
  element.style.display = display;
}

/**
 * Hide element
 */
export function hide(element) {
  if (!element) return;
  element.style.display = 'none';
}

/**
 * Toggle element visibility
 */
export function toggle(element, display = 'block') {
  if (!element) return;
  if (element.style.display === 'none') {
    element.style.display = display;
  } else {
    element.style.display = 'none';
  }
}

/**
 * Check if element is visible
 */
export function isVisible(element) {
  if (!element) return false;
  return element.offsetParent !== null;
}

/**
 * Get/set element data attribute
 */
export function data(element, key, value = undefined) {
  if (!element) return undefined;

  if (value === undefined) {
    return element.dataset[key];
  }

  element.dataset[key] = value;
  return element;
}

/**
 * Add event listener with optional delegation
 */
export function on(element, eventName, selectorOrHandler, handler = null) {
  if (!element) return;

  if (typeof selectorOrHandler === 'function') {
    // Direct event listener
    element.addEventListener(eventName, selectorOrHandler);
  } else {
    // Delegated event listener
    element.addEventListener(eventName, (e) => {
      const target = e.target.closest(selectorOrHandler);
      if (target && element.contains(target)) {
        handler.call(target, e);
      }
    });
  }
}

/**
 * Remove event listener
 */
export function off(element, eventName, handler) {
  if (!element) return;
  element.removeEventListener(eventName, handler);
}

/**
 * Trigger custom event
 */
export function trigger(element, eventName, detail = null) {
  if (!element) return;
  const event = new CustomEvent(eventName, { detail, bubbles: true });
  element.dispatchEvent(event);
}

/**
 * Get element offset position
 */
export function getOffset(element) {
  if (!element) return { top: 0, left: 0 };

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset
  };
}

/**
 * Scroll to element smoothly
 */
export function scrollTo(element, options = {}) {
  if (!element) return;

  const defaultOptions = {
    behavior: 'smooth',
    block: 'start',
    ...options
  };

  element.scrollIntoView(defaultOptions);
}

/**
 * Get element's text content (without HTML tags)
 */
export function getText(element) {
  if (!element) return '';
  return element.textContent || '';
}

/**
 * Set element's text content
 */
export function setText(element, text) {
  if (!element) return;
  element.textContent = text;
}

/**
 * Get element's HTML content
 */
export function getHTML(element) {
  if (!element) return '';
  return element.innerHTML;
}

/**
 * Set element's HTML content
 */
export function setHTML(element, html) {
  if (!element) return;
  element.innerHTML = html;
}

/**
 * Insert HTML at position
 */
export function insertHTML(element, position, html) {
  if (!element) return;
  element.insertAdjacentHTML(position, html);
}

/**
 * Get parent element matching selector
 */
export function closest(element, selector) {
  if (!element) return null;
  return element.closest(selector);
}

/**
 * Get siblings of element
 */
export function siblings(element) {
  if (!element || !element.parentNode) return [];

  return Array.from(element.parentNode.children).filter(child => child !== element);
}

/**
 * Get next sibling matching selector
 */
export function next(element, selector = null) {
  if (!element) return null;

  let sibling = element.nextElementSibling;

  if (!selector) return sibling;

  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.nextElementSibling;
  }

  return null;
}

/**
 * Get previous sibling matching selector
 */
export function prev(element, selector = null) {
  if (!element) return null;

  let sibling = element.previousElementSibling;

  if (!selector) return sibling;

  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.previousElementSibling;
  }

  return null;
}

/**
 * Wait for DOM ready
 */
export function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
