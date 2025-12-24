/**
 * Product Form Main Logic
 * Main initialization and form submission
 */

import { generateSlug, setupGalleryField } from './utils.js';
import { uploadFileWithProgress } from './upload.js';
import { collectBase, readMediaFields, fillBaseFields, fillDemoProduct } from './data-handlers.js';
import { initDeliveryTimeAddonSync } from './delivery-sync.js';
import { addDeleteProductButton } from './delete-button.js';

;(async function initProductForm() {
  const params = new URLSearchParams(location.search);
  const productId = params.get('id');

  const form = document.getElementById('product-form');

  if (!form) {
    console.error(' Form not found! Exiting...');
    return;
  }

  setupGalleryField(form);

  if (productId) {
    try {
      const response = await getProduct(productId);
      const { product } = response;
      if (product) {
        fillBaseFields(form, product);
        if (typeof populateSeoForm === 'function') populateSeoForm(form, product);

        const hidden = form.querySelector('#addons-json');
        if (hidden) {
          const addons = Array.isArray(product.addons) ? product.addons : [];
          hidden.value = JSON.stringify(addons);
        }
      } else {
        console.error(' Product not found in response');
      }
    } catch (err) {
      console.error(' Failed to load product:', err);
      alert('Failed to load product: ' + err.message);
    }

    if (typeof initAddonsBuilder === 'function') initAddonsBuilder(form);
    setTimeout(() => initDeliveryTimeAddonSync(form, { applyInitial: true }), 10);
    addDeleteProductButton(form, productId);
  } else {
    if (typeof initAddonsBuilder === 'function') initAddonsBuilder(form);
    fillDemoProduct(form);
    setTimeout(() => initDeliveryTimeAddonSync(form, { applyInitial: true }), 10);
  }

  // Auto-generate slug from title for new products
  form.title.addEventListener('input', () => {
    if (!productId) {
      const suggested = generateSlug(form.title.value);
      form.slug.value = suggested;
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Uploading files...';
    btn.disabled = true;

    try {
      const base = collectBase(form);
      const media = readMediaFields(form);
      const seo = typeof readSeoFields === 'function' ? readSeoFields(form) : { meta: {} };
      const addons = typeof readAddonsConfig === 'function' ? readAddonsConfig(form) : [];

      if (media.files.thumbnail_file) {
        btn.textContent = 'Uploading thumbnail...';
        const uploadedUrl = await uploadFileWithProgress(media.files.thumbnail_file, 'thumbnail', form);
        if (uploadedUrl) media.meta.thumbnail_url = uploadedUrl;
      }

      if (media.files.video_file) {
        btn.textContent = 'Uploading video...';
        const uploadedUrl = await uploadFileWithProgress(media.files.video_file, 'video', form);
        if (uploadedUrl) media.meta.video_url = uploadedUrl;
      }

      if (media.files.gallery_files && media.files.gallery_files.length > 0) {
        btn.textContent = `Uploading gallery images (0/${media.files.gallery_files.length})...`;
        const uploadedGalleryUrls = [];
        for (let i = 0; i < media.files.gallery_files.length; i++) {
          btn.textContent = `Uploading gallery images (${i + 1}/${media.files.gallery_files.length})...`;
          const file = media.files.gallery_files[i];
          const uploadedUrl = await uploadFileWithProgress(file, `gallery-${i}`, form);
          if (uploadedUrl) uploadedGalleryUrls.push(uploadedUrl);
        }
        media.meta.gallery_urls = [...uploadedGalleryUrls, ...media.meta.gallery_urls];
      }

      btn.textContent = 'Saving product...';

      const payload = { ...base, ...media.meta, ...seo.meta, addons };
      if (productId) payload.id = Number(productId);

      const resp = await fetch('/api/product/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Save failed');
      }

      alert('Product saved successfully! ID: ' + data.id);
      if (!productId) {
        window.location.href = `product-form.html?id=${data.id}`;
      }
    } catch (err) {
      console.error('Save error', err);
      alert('Error saving product: ' + (err.message || 'Unknown error'));
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
})();

