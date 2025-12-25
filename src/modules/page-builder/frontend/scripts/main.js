import { addSection, enableEditing, attachControls } from './editor.js';
import { addPageListSection, addCustomHtmlSection, addImageSection } from './widgets.js';
import { generateOutputHtml } from './output.js';

function updateTopBarHeight() {
  const topBar = document.querySelector('.top-bar');
  if (!topBar) return;
  document.documentElement.style.setProperty('--page-builder-top-bar-height', topBar.offsetHeight + 'px');
}

function bindSeoPromptOverrides() {
  const origPrompt = window.prompt;
  window.prompt = function(message, defaultValue) {
    if (typeof message === 'string' && message.indexOf('Enter SEO title for this page') === 0) {
      const titleInput = document.getElementById('seo-title');
      const title = titleInput ? titleInput.value.trim() : '';
      if (!title) {
        alert('Please enter a Page Title in SEO Settings before saving.');
        const panel = document.getElementById('seo-panel');
        if (panel) panel.style.display = 'block';
        return null;
      }
      return title;
    }
    if (typeof message === 'string' && message.indexOf('Enter page URL slug') === 0) {
      const slugInput = document.getElementById('seo-slug');
      const titleInput = document.getElementById('seo-title');
      let slug = slugInput ? slugInput.value.trim() : '';
      if (!slug && titleInput) {
        slug = titleInput.value.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '') || 'page';
        if (slugInput) slugInput.value = slug;
      }
      slug = slug
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) {
        alert('Slug cannot be empty.');
        return null;
      }
      return slug;
    }
    if (typeof message === 'string' && message.indexOf('Enter SEO description for this page') === 0) {
      const descInput = document.getElementById('seo-desc');
      return descInput ? descInput.value.trim() : '';
    }
    return origPrompt.apply(window, arguments);
  };
}

function wrapCanvasChildren(canvas) {
  const elementsToWrap = [];
  Array.from(canvas.children).forEach(child => {
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') {
      return;
    }
    if (child.classList && child.classList.contains('section-wrapper')) {
      elementsToWrap.push({ element: child, needsWrap: false });
    } else {
      elementsToWrap.push({ element: child, needsWrap: true });
    }
  });

  canvas.innerHTML = '';

  elementsToWrap.forEach(item => {
    if (item.needsWrap) {
      const wrapper = document.createElement('div');
      wrapper.className = 'section-wrapper';
      wrapper.appendChild(item.element);
      canvas.appendChild(wrapper);

      const embedData = item.element.getAttribute('data-embed');
      if (embedData) {
        try {
          const info = JSON.parse(embedData);
          if (info.type === 'product') {
            ProductCards.render(info.id, info.options);
          } else if (info.type === 'reviews') {
            ReviewsWidget.render(info.id, info.options);
          }
        } catch (e) {
          console.error('Failed to reinitialise dynamic widget:', e);
        }
      }

      enableEditing(wrapper);
      attachControls(wrapper);
    } else {
      canvas.appendChild(item.element);

      const embedData = item.element.getAttribute('data-embed');
      if (embedData) {
        try {
          const info = JSON.parse(embedData);
          if (info.type === 'product') {
            ProductCards.render(info.id, info.options);
          } else if (info.type === 'reviews') {
            ReviewsWidget.render(info.id, info.options);
          }
        } catch (e) {
          console.error('Failed to reinitialise dynamic widget:', e);
        }
      }

      enableEditing(item.element);
      attachControls(item.element);
    }
  });
}

async function loadPageByName(name) {
  try {
    const res = await fetch(`/api/pages/load?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    if (data.success) {
      const canvas = document.getElementById('builder-canvas');
      canvas.innerHTML = data.html || '';
      wrapCanvasChildren(canvas);
      alert('... Loaded page for editing!');
    } else {
      alert(' Failed to load page: ' + data.error);
    }
  } catch (err) {
    alert(' Error loading page: ' + err.message);
  }
}

function bindSave() {
  document.getElementById('save-btn').addEventListener('click', async () => {
    const html = generateOutputHtml();
    const titleInput = document.getElementById('seo-title');
    const slugInput = document.getElementById('seo-slug');
    const descInput = document.getElementById('seo-desc');
    const seoTitle = titleInput ? titleInput.value.trim() : '';
    if (!seoTitle) {
      alert('Please enter a Page Title in the SEO panel before saving.');
      const panel = document.getElementById('seo-panel');
      if (panel) panel.style.display = 'block';
      return;
    }
    let slug = slugInput ? slugInput.value.trim() : '';
    if (!slug) {
      slug = seoTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'page';
      if (slugInput) slugInput.value = slug;
    }
    slug = slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      alert('Slug cannot be empty.');
      return;
    }
    const seoDesc = descInput ? descInput.value.trim() : '';
    const fullHTML = `<!DOCTYPE html>\n<html lang="en">\n<head>\n <meta charset="UTF-8">\n <meta name="viewport" content="width=device-width, initial-scale=1.0">\n <title>${seoTitle}</title>\n <meta name="description" content="${seoDesc.replace(/"/g, '&quot;')}">\n</head>\n<body>\n${html}\n</body>\n</html>`;
    try {
      const res = await fetch('/api/pages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: slug, html: fullHTML })
      });
      const data = await res.json();
      if (data.success) {
        alert(`... Page saved!\n\nURL: ${window.location.origin}/${slug}.html`);
      } else {
        alert(' Save failed: ' + data.error);
      }
    } catch (err) {
      alert(' Error: ' + err.message);
    }
  });
}

function bindPreview() {
  document.getElementById('preview-btn').addEventListener('click', () => {
    const html = generateOutputHtml();
    const previewWindow = window.open('', 'preview', 'width=1200,height=800');
    previewWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${html}</body></html>`);
    previewWindow.document.close();
  });
}

function bindLoad() {
  document.getElementById('load-btn').addEventListener('click', async () => {
    const pageName = prompt('Enter page name to load:');
    if (!pageName) return;
    await loadPageByName(pageName);
  });
}

function bindSectionButtons() {
  document.querySelectorAll('.sidebar button[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-section');
      if (key === 'page-list') {
        addPageListSection();
      } else if (key === 'custom-html') {
        addCustomHtmlSection();
      } else if (key === 'image') {
        addImageSection();
      } else {
        addSection(key);
      }
    });
  });
}

function bindSeoToggle() {
  const seoToggle = document.getElementById('seo-toggle-btn');
  if (seoToggle) {
    seoToggle.addEventListener('click', () => {
      const panel = document.getElementById('seo-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
      }
    });
  }
}

function initPrefill() {
  const urlParams = new URLSearchParams(window.location.search);
  const prefillName = urlParams.get('name');
  if (prefillName) {
    const slugInput = document.getElementById('seo-slug');
    if (slugInput) slugInput.value = prefillName;
    loadPageByName(prefillName);
  }
}

window.loadView = function(view) {
  if (window.opener && window.opener.location.href.includes('dashboard.html')) {
    window.opener.postMessage({ action: 'loadView', view: view }, '*');
    window.close();
  }
};

updateTopBarHeight();
window.addEventListener('resize', updateTopBarHeight);

document.addEventListener('DOMContentLoaded', () => {
  bindSectionButtons();
  bindSeoToggle();
  bindSeoPromptOverrides();
  initPrefill();
  bindSave();
  bindPreview();
  bindLoad();
});
