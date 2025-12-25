/**
 * Direct Video Player
 * Handles direct video URLs (MP4, WebM, etc.)
 */

import { BasePlayer } from './base-player.js';

export class DirectPlayer extends BasePlayer {
  constructor(url, container, options = {}) {
    super(url, container, options);
  }

  /**
   * Render direct video player
   */
  async render() {
    if (!this.url) {
      this.container.innerHTML = this.buildMessageCard({
        title: 'No Video URL',
        message: 'No video URL was provided.'
      });
      return;
    }

    const mimeType = this.guessMimeType(this.url);

    // Create video element
    const video = document.createElement('video');
    video.controls = true;
    video.style.cssText = 'width: 100%; height: 100%; display: block;';

    // Create source element
    const source = document.createElement('source');
    source.src = this.url;
    if (mimeType) {
      source.type = mimeType;
    }

    video.appendChild(source);

    // Add error message fallback
    const errorText = document.createTextNode(
      'Your browser does not support the video tag or the video format.'
    );
    video.appendChild(errorText);

    this.container.innerHTML = '';
    this.container.appendChild(video);
  }
}

export default DirectPlayer;
