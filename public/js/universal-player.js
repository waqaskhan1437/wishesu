// Universal Video Player - Supports YouTube, Vimeo, Archive.org, Cloudinary, Bunny.net, Direct URLs
(function () {
  const archiveExistenceCache = new Map();

  function buildMessageCard({ title, message, href, linkText }) {
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

  function safeParseUrl(url) {
    try {
      return new URL(url, window.location.origin);
    } catch (_) {
      return null;
    }
  }

  function getFileExtension(url) {
    const parsed = safeParseUrl(url);
    const pathname = parsed ? parsed.pathname : (url || '');
    const last = pathname.split('/').pop() || '';
    const clean = last.split('?')[0].split('#')[0];
    const match = clean.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : '';
  }

  function guessMimeTypeFromUrl(url) {
    const ext = getFileExtension(url);
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

  async function checkArchiveItemExists(itemId) {
    const trimmed = (itemId || '').trim();
    if (!trimmed) return false;

    if (archiveExistenceCache.has(trimmed)) {
      return archiveExistenceCache.get(trimmed);
    }

    const promise = (async () => {
      try {
        const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(trimmed)}`);
        if (!res.ok) return false;
        const data = await res.json().catch(() => ({}));
        if (data && (data.error || data.err)) return false;
        return true;
      } catch (_) {
        return true;
      }
    })();

    archiveExistenceCache.set(trimmed, promise);
    return promise;
  }

  function normalizeTrack(track) {
    if (!track || typeof track !== 'object') return null;
    if (!track.src) return null;

    return {
      kind: track.kind || 'subtitles',
      src: track.src,
      srclang: track.srclang || track.lang || 'en',
      label: track.label || track.srclang || track.lang || 'Subtitles',
      default: !!track.default
    };
  }

  window.UniversalPlayer = {
    detect: function (url) {
      const raw = (url || '').toString().trim();
      if (!raw) return { type: 'none' };

      const lowered = raw.toLowerCase();

      // Bunny Stream (iframe embed or play URL)
      if (lowered.includes('iframe.mediadelivery.net/embed/')) {
        const match = raw.match(/iframe\.mediadelivery\.net\/embed\/([^\/\?]+)\/([^\/\?]+)/i);
        const libraryId = match ? match[1] : null;
        const videoId = match ? match[2] : null;
        return {
          type: 'bunny-embed',
          url: raw,
          libraryId,
          videoId,
          embedUrl: libraryId && videoId ? `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}` : raw
        };
      }

      if (lowered.includes('video.bunnycdn.com/play/')) {
        const match = raw.match(/video\.bunnycdn\.com\/play\/([^\/\?]+)\/([^\/\?]+)/i);
        const libraryId = match ? match[1] : null;
        const videoId = match ? match[2] : null;
        const embedUrl = libraryId && videoId ? `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}` : null;
        return {
          type: 'bunny-embed',
          url: raw,
          libraryId,
          videoId,
          embedUrl: embedUrl || raw
        };
      }

      // YouTube
      if (lowered.includes('youtube.com') || lowered.includes('youtu.be')) {
        const videoId = this.extractYouTubeId(raw);
        return { type: 'youtube', id: videoId, url: raw };
      }

      // Vimeo
      if (lowered.includes('vimeo.com')) {
        const videoId = this.extractVimeoId(raw);
        return { type: 'vimeo', id: videoId, url: raw };
      }

      // Archive.org (embed/details pages only)
      if (lowered.includes('archive.org') || lowered.includes('s3.us.archive.org')) {
        const itemId = this.extractArchiveId(raw);
        return { type: 'archive', url: raw, itemId, embedUrl: itemId ? `https://archive.org/embed/${itemId}` : null };
      }

      // Direct video URLs
      if (lowered.match(/\.(mp4|webm|ogg|ogv|mov|avi|mkv|m3u8|mpd)(\?|$)/i)) {
        return { type: 'direct', url: raw };
      }

      // Cloudinary (may be mp4/webm/m3u8)
      if (lowered.includes('cloudinary.com')) {
        return { type: 'cloudinary', url: raw };
      }

      // Bunny CDN pull zones (mp4 etc)
      if (lowered.includes('bunny.net') || lowered.includes('b-cdn.net') || lowered.includes('bunnycdn.com')) {
        return { type: 'bunny', url: raw };
      }

      // Default
      return { type: 'direct', url: raw };
    },

    extractYouTubeId: function (url) {
      const patterns = [
        /youtube\.com\/watch\?v=([^&]+)/i,
        /youtube\.com\/embed\/([^?&/]+)/i,
        /youtube\.com\/shorts\/([^?&/]+)/i,
        /youtube\.com\/live\/([^?&/]+)/i,
        /youtu\.be\/([^?&/]+)/i
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },

    extractVimeoId: function (url) {
      const patterns = [
        /vimeo\.com\/(\d+)/i,
        /player\.vimeo\.com\/video\/(\d+)/i,
        /vimeo\.com\/manage\/videos\/(\d+)/i
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    },

    extractArchiveId: function (url) {
      const patterns = [
        /archive\.org\/download\/([^/]+)/i,
        /archive\.org\/stream\/([^/]+)/i,
        /archive\.org\/details\/([^/]+)/i,
        /archive\.org\/embed\/([^/]+)/i,
        /s3\.us\.archive\.org\/([^/]+)/i
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }

      const fallbackMatch = url.match(/archive\.org\/(?:[^/]+\/)?([^/?#]+)/i);
      return fallbackMatch ? fallbackMatch[1] : null;
    },

    render: function (containerId, videoUrl, metadata) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const detected = this.detect(videoUrl);
      const video = Object.assign({}, detected);

      if (metadata) {
        Object.assign(video, metadata);
      }

      const token = Math.random().toString(36).slice(2);
      container.dataset.universalPlayerToken = token;

      const safeSetHTML = (html) => {
        if (container.dataset.universalPlayerToken !== token) return;
        container.innerHTML = html;
      };

      const safeSetElement = (el) => {
        if (container.dataset.universalPlayerToken !== token) return;
        container.innerHTML = '';
        container.appendChild(el);
      };

      switch (video.type) {
        case 'youtube': {
          if (!video.id) {
            safeSetHTML(
              buildMessageCard({
                title: 'Video unavailable',
                message: 'We could not determine the YouTube video ID for this link.',
                href: video.url,
                linkText: 'Open on YouTube'
              })
            );
            break;
          }

          const params = new URLSearchParams({
            rel: '0',
            modestbranding: '1'
          });

          safeSetHTML(
            `<iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/${encodeURIComponent(video.id)}?${params.toString()}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>`
          );
          break;
        }

        case 'vimeo': {
          if (!video.id) {
            safeSetHTML(
              buildMessageCard({
                title: 'Video unavailable',
                message: 'We could not determine the Vimeo video ID for this link.',
                href: video.url,
                linkText: 'Open on Vimeo'
              })
            );
            break;
          }

          safeSetHTML(
            `<iframe
              src="https://player.vimeo.com/video/${encodeURIComponent(video.id)}"
              width="100%"
              height="100%"
              frameborder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
            ></iframe>`
          );
          break;
        }

        case 'bunny-embed': {
          const embedUrl = (video.embedUrl || '').trim() || video.url;
          safeSetHTML(
            `<iframe
              src="${embedUrl}"
              width="100%"
              height="100%"
              frameborder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
            ></iframe>`
          );
          break;
        }

        case 'archive': {
          const itemId = (video.itemId || this.extractArchiveId(video.url) || '').trim();
          if (!itemId) {
            safeSetHTML(
              buildMessageCard({
                title: 'Video unavailable',
                message: 'We could not determine the Archive.org item ID for this video.',
                href: video.url,
                linkText: 'Open on Archive.org'
              })
            );
            break;
          }

          // Try to use direct video URL if available
          const isDirectUrl = video.url && (
            video.url.includes('/download/') ||
            video.url.includes('s3.us.archive.org') ||
            video.url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)
          );

          if (isDirectUrl) {
            // Use HTML5 video player for direct URLs
            const videoEl = document.createElement('video');
            videoEl.controls = true;
            videoEl.preload = 'metadata';
            videoEl.style.cssText = 'width: 100%; height: 100%; background: #000;';

            const source = document.createElement('source');
            source.src = video.url;
            source.type = guessMimeTypeFromUrl(video.url) || 'video/mp4';

            videoEl.appendChild(source);

            videoEl.onerror = () => {
              const detailsUrl = `https://archive.org/details/${encodeURIComponent(itemId)}`;
              safeSetHTML(
                buildMessageCard({
                  title: 'Video processing',
                  message: 'This video is still being processed by Archive.org. Please try again in a few minutes.',
                  href: detailsUrl,
                  linkText: 'View on Archive.org'
                })
              );
            };

            safeSetElement(videoEl);
            break;
          }

          // Use embed for non-direct URLs
          const detailsUrl = `https://archive.org/details/${encodeURIComponent(itemId)}`;
          const embedUrl = `https://archive.org/embed/${encodeURIComponent(itemId)}`;
          safeSetHTML(
            `<iframe
              src="${embedUrl}?autostart=false"
              width="100%"
              height="100%"
                frameborder="0"
                allow="fullscreen"
                style="border-radius: 12px;"
              >
                <p>Your browser does not support iframes.
                <a href="${detailsUrl}" target="_blank" rel="noopener">View on Archive.org</a></p>
              </iframe>`
            );

          break;
        }

        case 'cloudinary':
        case 'bunny':
        case 'direct': {
          const sources = [];

          if (Array.isArray(video.sources) && video.sources.length > 0) {
            for (const s of video.sources) {
              if (!s || !s.src) continue;
              sources.push({
                src: s.src,
                type: s.type || guessMimeTypeFromUrl(s.src)
              });
            }
          } else if (video.url) {
            sources.push({
              src: video.url,
              type: video.typeHint || guessMimeTypeFromUrl(video.url)
            });
          }

          if (sources.length === 0) {
            safeSetHTML(
              buildMessageCard({
                title: 'Video unavailable',
                message: 'No playable video sources were found.',
                href: video.url,
                linkText: 'Open video link'
              })
            );
            break;
          }

          const videoEl = document.createElement('video');
          videoEl.controls = true;
          videoEl.preload = 'metadata';
          videoEl.playsInline = true;
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
          videoEl.style.borderRadius = '12px';

          const poster = video.poster || video.thumbnailUrl || video.thumbnail_url;
          if (poster) {
            videoEl.poster = poster;
          }

          for (const s of sources) {
            const source = document.createElement('source');
            source.src = s.src;
            if (s.type) source.type = s.type;
            videoEl.appendChild(source);
          }

          const tracks = [];

          if (video.subtitlesUrl || video.subtitles_url) {
            tracks.push(
              normalizeTrack({
                src: video.subtitlesUrl || video.subtitles_url,
                kind: 'subtitles',
                srclang: 'en',
                label: 'Subtitles',
                default: true
              })
            );
          }

          if (Array.isArray(video.tracks)) {
            for (const t of video.tracks) {
              tracks.push(normalizeTrack(t));
            }
          }

          for (const t of tracks.filter(Boolean)) {
            const trackEl = document.createElement('track');
            trackEl.kind = t.kind;
            trackEl.src = t.src;
            trackEl.srclang = t.srclang;
            trackEl.label = t.label;
            if (t.default) trackEl.default = true;
            videoEl.appendChild(trackEl);
          }

          videoEl.addEventListener('error', () => {
            safeSetHTML(
              buildMessageCard({
                title: 'Video unavailable',
                message:
                  'This video could not be loaded.\n\n' +
                  (getFileExtension(video.url) === 'm3u8'
                    ? 'Note: .m3u8 (HLS) playback depends on your browser.'
                    : ''),
                href: video.url,
                linkText: 'Open video link'
              })
            );
          });

          safeSetElement(videoEl);
          break;
        }

        default: {
          safeSetHTML(
            buildMessageCard({
              title: 'Video URL not supported',
              message: 'We could not determine how to play this video URL.',
              href: videoUrl,
              linkText: 'Open video link'
            })
          );
        }
      }
    }
  };
})();
