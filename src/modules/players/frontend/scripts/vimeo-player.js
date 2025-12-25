/**
 * Vimeo Player
 * Handles Vimeo video embedding
 */

import { BasePlayer } from './base-player.js';

export class VimeoPlayer extends BasePlayer {
  constructor(url, container, options = {}) {
    super(url, container, options);
    this.videoId = this.extractVideoId(url);
  }

  /**
   * Extract Vimeo video ID from URL
   */
  extractVideoId(url) {
    if (!url) return null;

    // Handle vimeo.com URLs
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) {
      return match[1];
    }

    // Handle direct video ID (all digits)
    if (/^\d+$/.test(url)) {
      return url;
    }

    return null;
  }

  /**
   * Render Vimeo player
   */
  async render() {
    if (!this.videoId) {
      this.container.innerHTML = this.buildMessageCard({
        title: 'Invalid Vimeo URL',
        message: 'Could not extract video ID from the provided URL.'
      });
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${this.videoId}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'border: none; display: block;';

    this.container.innerHTML = '';
    this.container.appendChild(iframe);
  }
}

export default VimeoPlayer;
