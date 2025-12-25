/**
 * Base Player Class
 * Common functionality for all video players
 */

export class BasePlayer {
  constructor(url, container, options = {}) {
    this.url = url;
    this.container = container;
    this.options = options;
  }

  /**
   * Render player (to be implemented by subclasses)
   */
  async render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Destroy player
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Build message card for errors/info
   */
  buildMessageCard({ title, message, href, linkText }) {
    const safeTitle = title || 'Unavailable';
    const safeMessage = message || '';

    return `
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-sizing: border-box;
      ">
        <div style="max-width: 640px; text-align: center;">
          <h3 style="margin: 0 0 12px; color: #111827; font-size: 1.25rem;">${safeTitle}</h3>
          <div style="margin: 0; color: #6b7280; line-height: 1.6; white-space: pre-line;">${safeMessage}</div>
          ${href ? `
            <div style="margin-top: 16px;">
              <a
                href="${href}"
                target="_blank"
                rel="noopener"
                style="
                  display: inline-block;
                  background: #4f46e5;
                  color: #ffffff;
                  padding: 10px 16px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                "
              >
                ${linkText || 'Open link'}
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Safe URL parsing
   */
  safeParseUrl(url) {
    try {
      return new URL(url, window.location.origin);
    } catch (_) {
      return null;
    }
  }

  /**
   * Get file extension from URL
   */
  getFileExtension(url) {
    const parsed = this.safeParseUrl(url);
    const pathname = parsed ? parsed.pathname : (url || '');
    const last = pathname.split('/').pop() || '';
    const clean = last.split('?')[0].split('#')[0];
    const match = clean.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Guess MIME type from URL
   */
  guessMimeType(url) {
    const ext = this.getFileExtension(url);
    switch (ext) {
      case 'mp4':
      case 'm4v':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
      case 'ogv':
        return 'video/ogg';
      case 'mov':
        return 'video/quicktime';
      case 'mkv':
        return 'video/x-matroska';
      case 'avi':
        return 'video/x-msvideo';
      case 'm3u8':
        return 'application/x-mpegURL';
      case 'mpd':
        return 'application/dash+xml';
      case 'vtt':
        return 'text/vtt';
      default:
        return '';
    }
  }
}

export default BasePlayer;
