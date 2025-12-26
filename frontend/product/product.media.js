const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else node.setAttribute(key, value);
  });
  ([]).concat(children).forEach((child) => {
    if (child === null || child === undefined) return;
    node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch (_) { return []; }
};

export const buildMediaItems = (product) => {
  const items = [];
  const media = parseJsonArray(product.media);
  const gallery = parseJsonArray(product.gallery_images);
  const fallbackMedia = media.length ? media : gallery;
  const thumb = product.thumbnail_url || '';

  if (product.video_url) {
    items.push({ type: 'video', url: product.video_url, poster: fallbackMedia[0] || thumb || '' });
  }
  fallbackMedia.forEach((url) => items.push({ type: 'image', url }));
  if (!fallbackMedia.length && thumb) items.push({ type: 'image', url: thumb });
  return items.length ? items : [{ type: 'image', url: '' }];
};

export const renderMedia = (items) => {
  const stage = el('div', { class: 'media-stage' });
  const thumbs = el('div', { class: 'media-thumbs' });
  let activeIndex = 0;

  const renderStage = (item) => {
    stage.innerHTML = '';
    if (item.type === 'video') {
      const shell = el('div', { class: 'media-video', style: item.poster ? `background-image:url(${item.poster})` : '' });
      const play = el('button', { class: 'media-play', text: 'Play' });
      play.addEventListener('click', () => {
        const video = el('video', { class: 'media-player', controls: true });
        video.src = item.url;
        video.playsInline = true;
        if (item.poster) video.poster = item.poster;
        stage.innerHTML = '';
        stage.appendChild(video);
        video.play().catch(() => {});
      });
      shell.appendChild(play);
      stage.appendChild(shell);
      return;
    }
    if (item.url) {
      stage.appendChild(el('img', { class: 'media-image', src: item.url, alt: 'Product media' }));
      return;
    }
    stage.appendChild(el('div', { class: 'media-placeholder', text: 'No media yet' }));
  };

  const setActive = (index) => {
    activeIndex = index;
    renderStage(items[activeIndex]);
    [...thumbs.children].forEach((btn, idx) => {
      btn.classList.toggle('active', idx === activeIndex);
    });
  };

  items.forEach((item, idx) => {
    const thumb = el('button', { class: 'media-thumb' });
    if (item.type === 'video') {
      thumb.appendChild(el('span', { class: 'thumb-tag', text: 'Video' }));
      if (item.poster) thumb.appendChild(el('img', { src: item.poster, alt: 'Video thumb' }));
    } else if (item.url) {
      thumb.appendChild(el('img', { src: item.url, alt: 'Thumb' }));
    } else {
      thumb.appendChild(el('span', { text: 'No media' }));
    }
    thumb.addEventListener('click', () => setActive(idx));
    thumbs.appendChild(thumb);
  });

  setActive(0);
  return el('div', { class: 'media-wrap' }, [stage, thumbs]);
};
