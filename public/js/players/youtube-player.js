/**
 * YouTube Player
 * Handles YouTube video embedding
 */

import { BasePlayer } from './base-player.js';

export class YouTubePlayer extends BasePlayer {
  constructor(url, container, options = {}) {
    super(url, container, options);
    this.videoId = this.extractVideoId(url);
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractVideoId(url) {
    if (!url) return null;

    // Handle youtu.be short URLs
    if (url.includes('youtu.be/')) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }

    // Handle youtube.com URLs
    if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }

    // Handle direct video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    return null;
  }

  /**
   * Render YouTube player
   */
  async render() {
    if (!this.videoId) {
      this.container.innerHTML = this.buildMessageCard({
        title: 'Invalid YouTube URL',
        message: 'Could not extract video ID from the provided URL.'
      });
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${this.videoId}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'border: none; display: block;';

    this.container.innerHTML = '';
    this.container.appendChild(iframe);
  }
}

export default YouTubePlayer;
