/**
 * Player Factory
 * Creates appropriate player based on URL/provider
 * Replaces monolithic universal-player.js
 */

import { YouTubePlayer } from './youtube-player.js';
import { VimeoPlayer } from './vimeo-player.js';
import { ArchivePlayer } from './archive-player.js';
import { DirectPlayer } from './direct-player.js';

export class PlayerFactory {
  /**
   * Detect provider from URL
   */
  static detectProvider(url) {
    if (!url) return 'unknown';

    const urlLower = url.toLowerCase();

    // YouTube detection
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'youtube';
    }

    // Vimeo detection
    if (urlLower.includes('vimeo.com')) {
      return 'vimeo';
    }

    // Archive.org detection
    if (urlLower.includes('archive.org')) {
      return 'archive';
    }

    // Cloudinary detection
    if (urlLower.includes('cloudinary.com')) {
      return 'direct';
    }

    // Bunny.net detection
    if (urlLower.includes('b-cdn.net') || urlLower.includes('bunny.net')) {
      return 'direct';
    }

    // Check for video file extensions
    const videoExtensions = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'mkv', 'avi', 'm4v', 'm3u8', 'mpd'];
    const ext = url.split('.').pop().split('?')[0].toLowerCase();
    if (videoExtensions.includes(ext)) {
      return 'direct';
    }

    // Default to direct player
    return 'direct';
  }

  /**
   * Create player instance based on provider
   */
  static createPlayer(url, container, options = {}) {
    const provider = options.provider || PlayerFactory.detectProvider(url);

    switch (provider) {
      case 'youtube':
        return new YouTubePlayer(url, container, options);

      case 'vimeo':
        return new VimeoPlayer(url, container, options);

      case 'archive':
        return new ArchivePlayer(url, container, options);

      case 'direct':
      default:
        return new DirectPlayer(url, container, options);
    }
  }

  /**
   * Render player (convenience method)
   */
  static async render(url, container, options = {}) {
    const player = PlayerFactory.createPlayer(url, container, options);
    await player.render();
    return player;
  }
}

// Backward compatibility: Export as global function
window.renderUniversalPlayer = async function(url, containerId, options = {}) {
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  if (!container) {
    console.error('Player container not found:', containerId);
    return null;
  }

  return await PlayerFactory.render(url, container, options);
};

export default PlayerFactory;
