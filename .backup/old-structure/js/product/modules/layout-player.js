/**
 * Product player initializer.
 */

const PLAYER_OPTIONS = {
  controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
  ratio: '16:9',
  clickToPlay: true,
  youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
};

export function initializePlayer(hasVideo) {
  if (!hasVideo) return;
  setTimeout(() => {
    if (document.getElementById('player') && window.Plyr) {
      try {
        if (window.productPlayer && typeof window.productPlayer.destroy === 'function') {
          window.productPlayer.destroy();
        }
      } catch (_) {}

      window.productPlayer = new window.Plyr('#player', PLAYER_OPTIONS);
    }
  }, 100);
}
