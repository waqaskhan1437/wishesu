/**
 * Archive.org Player
 * Handles Archive.org video embedding
 */

import { BasePlayer } from './base-player.js';

// Cache for Archive.org item existence checks
const archiveExistenceCache = new Map();

export class ArchivePlayer extends BasePlayer {
  constructor(url, container, options = {}) {
    super(url, container, options);
    this.itemId = this.extractItemId(url);
  }

  /**
   * Extract Archive.org item ID from URL
   */
  extractItemId(url) {
    if (!url) return null;

    // Handle archive.org URLs
    if (url.includes('archive.org')) {
      const match = url.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/);
      return match ? match[1] : null;
    }

    // Handle direct item ID
    return url;
  }

  /**
   * Check if Archive.org item exists
   */
  async checkItemExists(itemId) {
    const trimmed = (itemId || '').trim();
    if (!trimmed) return false;

    // Check cache first
    if (archiveExistenceCache.has(trimmed)) {
      return archiveExistenceCache.get(trimmed);
    }

    try {
      const metaUrl = `https://archive.org/metadata/${trimmed}`;
      const response = await fetch(metaUrl);
      const exists = response.ok;

      // Cache result
      archiveExistenceCache.set(trimmed, exists);

      return exists;

    } catch (error) {
      console.error('Archive.org check failed:', error);
      return false;
    }
  }

  /**
   * Render Archive.org player
   */
  async render() {
    if (!this.itemId) {
      this.container.innerHTML = this.buildMessageCard({
        title: 'Invalid Archive.org URL',
        message: 'Could not extract item ID from the provided URL.'
      });
      return;
    }

    // Check if item exists
    const exists = await this.checkItemExists(this.itemId);

    if (!exists) {
      this.container.innerHTML = this.buildMessageCard({
        title: 'Archive.org Item Not Found',
        message: `The item "${this.itemId}" does not exist or is not accessible.`,
        href: `https://archive.org/details/${this.itemId}`,
        linkText: 'Visit Archive.org'
      });
      return;
    }

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `https://archive.org/embed/${this.itemId}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'border: none; display: block;';

    this.container.innerHTML = '';
    this.container.appendChild(iframe);
  }
}

export default ArchivePlayer;
