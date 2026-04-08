/**
 * Shared Bootstrap Utilities
 * Common SSR bootstrap parsing functions used across the application
 * Refactored to eliminate code duplication
 */

(function() {
  if (window.BootstrapUtils) return;

  /**
   * Get bootstrap data from a container's SSR script tag
   * @param {HTMLElement} container - Container element with data-ssr-bootstrap-id attribute
   * @returns {Object|null} Parsed bootstrap data or null
   */
  function getBootstrap(container) {
    const bootstrapId = container?.dataset?.ssrBootstrapId;
    if (!bootstrapId) return null;
    
    const script = document.getElementById(bootstrapId);
    if (!script) return null;
    
    try {
      return JSON.parse(script.textContent || '{}');
    } catch (err) {
      console.error('Failed to parse bootstrap:', err);
      return null;
    }
  }

  /**
   * Read product bootstrap from script tag
   * @returns {Object|null} Product bootstrap data
   */
  function readProductBootstrap() {
    const script = document.getElementById('product-bootstrap-data');
    if (!script) return null;
    try {
      return JSON.parse(script.textContent || '{}');
    } catch (err) {
      return null;
    }
  }

  /**
   * Get inline JSON bootstrap for generic use
   * @param {string} bootstrapId - ID of the bootstrap script element
   * @returns {Object|null}
   */
  function getInlineJsonBootstrap(bootstrapId) {
    const script = document.getElementById(bootstrapId);
    if (!script) return null;
    try {
      return JSON.parse(script.textContent || '{}');
    } catch (err) {
      return null;
    }
  }

  window.BootstrapUtils = {
    getBootstrap,
    readProductBootstrap,
    getInlineJsonBootstrap
  };
})();