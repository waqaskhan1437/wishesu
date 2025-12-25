import { el } from '../utils.js';
import { safeFetch } from '../api.js';
import { createAddonBuilder } from '../addons/builder.js';
import { ProductAPI } from '../services/product-api.js';

const slugify = (value) =>
  String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const buildMedia = (form) =>
  [...form.querySelectorAll('[name="image_url"]')].map((input) => input.value.trim()).filter(Boolean);

const addUrlRow = (list) => {
  const row = el('div', { class: 'media-row' }, [
    el('input', { name: 'image_url', placeholder: 'https://image-url' }),
    el('button', { type: 'button', class: 'btn-ghost', text: 'Remove' })
  ]);
  row.querySelector('button').addEventListener('click', () => row.remove());
  list.appendChild(row);
};

export function ProductForm({ onSaved }) {
  const wrap = el('div', { class: 'card glass' });
  const form = el('form', { class: 'form-grid' });
  form.innerHTML = `
    <input type="hidden" name="id" />
    <div class="tabbar">
      <button type="button" class="tab-btn active" data-tab="basic">Basic</button>
      <button type="button" class="tab-btn" data-tab="media">Media</button>
      <button type="button" class="tab-btn" data-tab="addons">Addons</button>
      <button type="button" class="tab-btn" data-tab="seo">SEO</button>
    </div>
    <div class="tab-panel active" data-panel="basic">
      <label>Title</label>
      <input name="title" placeholder="Product title" />
      <label>Slug</label>
      <input name="slug" placeholder="auto-generated" />
      <label>Price (PKR)</label>
      <input name="price" type="number" placeholder="2400" />
      <label>Delivery Days</label>
      <input name="delivery_days" type="number" placeholder="2" />
      <div class="toggle-row">
        <span>Instant Delivery</span>
        <input type="checkbox" name="instant" />
      </div>
      <label>Status</label>
      <select name="status">
        <option value="active">Active</option>
        <option value="draft">Draft</option>
      </select>
    </div>
    <div class="tab-panel" data-panel="media">
      <label>Video URL</label>
      <input name="video_url" placeholder="https://..." />
      <label>Image URLs</label>
      <div class="media-url-list" data-media-urls></div>
      <button type="button" class="btn-ghost" data-add-url>Add Image URL</button>
      <label>Upload Image</label>
      <input type="file" name="image_file" accept="image/*" />
      <button type="button" class="btn" data-upload>Upload to R2</button>
      <small class="form-msg" data-upload-msg></small>
    </div>
    <div class="tab-panel" data-panel="addons">
      <div data-addon-builder></div>
    </div>
    <div class="tab-panel" data-panel="seo">
      <label>Meta Title</label>
      <input name="meta_title" placeholder="SEO title" />
      <label>Meta Description</label>
      <textarea name="meta_desc" rows="3" placeholder="Short description"></textarea>
    </div>
    <div class="btn-row">
      <button class="btn" type="submit">Save Product</button>
      <small class="form-msg"></small>
    </div>
  `;
  const mediaList = form.querySelector('[data-media-urls]');
  addUrlRow(mediaList);
  const addonMount = form.querySelector('[data-addon-builder]');
  const addonBuilder = createAddonBuilder();
  addonMount.appendChild(addonBuilder.node);
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn) {
      form.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      form.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === btn.dataset.tab));
      return;
    }
    if (e.target.closest('[data-add-url]')) addUrlRow(mediaList);
  });
  form.querySelector('[name="title"]').addEventListener('input', (e) => {
    const slugField = form.querySelector('[name="slug"]');
    if (!slugField.value.trim()) slugField.value = slugify(e.target.value);
  });
  form.querySelector('[data-upload]').addEventListener('click', async () => {
    const file = form.querySelector('[name="image_file"]').files[0];
    const msg = form.querySelector('[data-upload-msg]');
    if (!file) {
      msg.textContent = 'Select an image first.';
      msg.style.color = '#ffb3b3';
      return;
    }
    msg.textContent = 'Uploading...';
    msg.style.color = 'var(--muted)';
    const key = `products/${Date.now()}_${file.name}`;
    const res = await safeFetch('/api/upload/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, bucket: 'PRODUCT_MEDIA' })
    });
    if (!res.ok) {
      msg.textContent = res.error;
      msg.style.color = '#ffb3b3';
      return;
    }
    const put = await fetch(res.data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' }
    });
    if (!put.ok) {
      msg.textContent = 'Upload failed.';
      msg.style.color = '#ffb3b3';
      return;
    }
    addUrlRow(mediaList);
    mediaList.lastElementChild.querySelector('[name="image_url"]').value = `r2://PRODUCT_MEDIA/${key}`;
    msg.textContent = 'Uploaded';
    msg.style.color = '#b9ffe9';
  });
  const setValues = (product) => {
    if (!product) return;
    form.querySelector('[name="id"]').value = product.id || '';
    form.querySelector('[name="title"]').value = product.title || '';
    form.querySelector('[name="slug"]').value = product.slug || '';
    form.querySelector('[name="price"]').value = product.price || 0;
    form.querySelector('[name="delivery_days"]').value = product.delivery_days || 0;
    form.querySelector('[name="instant"]').checked = !!product.instant;
    form.querySelector('[name="status"]').value = product.status || 'active';
    form.querySelector('[name="video_url"]').value = product.video_url || '';
    mediaList.innerHTML = '';
    const media = Array.isArray(product.media) ? product.media : [];
    if (media.length === 0) addUrlRow(mediaList);
    media.forEach((url) => {
      addUrlRow(mediaList);
      mediaList.lastElementChild.querySelector('[name="image_url"]').value = url;
    });
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const payload = {
      id: data.id || undefined,
      title: data.title,
      slug: data.slug || slugify(data.title),
      price: Number(data.price || 0),
      status: data.status,
      instant: data.instant === 'on' ? 1 : 0,
      delivery_days: Number(data.delivery_days || 2),
      video_url: data.video_url,
      media: buildMedia(form),
      addons: addonBuilder.read()
    };
    const msg = form.querySelector('.form-msg');
    msg.textContent = 'Saving...';
    msg.style.color = 'var(--muted)';
    const res = await ProductAPI.save(payload);
    if (!res.ok) {
      msg.textContent = res.error;
      msg.style.color = '#ffb3b3';
      window.toast?.(res.error);
      return;
    }
    msg.textContent = 'Saved';
    msg.style.color = '#b9ffe9';
    window.toast?.('Product saved');
    onSaved?.();
    form.reset();
    form.querySelector('[name="id"]').value = '';
  });
  wrap.appendChild(form);
  return { node: wrap, setValues };
}
