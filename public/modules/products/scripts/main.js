/**
 * Product Form Main Logic (Event-Driven + ESM)
 * - No window globals
 * - Emits events for other modules (SEO/Addons/etc.)
 */

import { generateSlug, setupGalleryField } from './utils.js';
import { uploadFileWithProgress } from './upload.js';
import { collectBase, readMediaFields, fillBaseFields, fillDemoProduct } from './data-handlers.js';
import { initDeliveryTimeAddonSync } from './delivery-sync.js';
import { addDeleteProductButton } from './delete-button.js';

export async function init(ctx = {}) {
  const eventBus = ctx.eventBus;
  const appState = ctx.appState;
  const api = ctx.services?.api;

  const params = new URLSearchParams(location.search);
  const productId = params.get('id');

  const form = document.getElementById('product-form');
  if (!form) return;

  try {
    appState?.set?.('productForm.ready', true);
    eventBus?.emitSync?.('productForm:ready', { form });

    setupGalleryField(form);

    // Load existing product if editing
    if (productId) {
      const response = api?.getProduct ? await api.getProduct(productId) : await fetch(`/api/product/${encodeURIComponent(productId)}`).then(r => r.json());
      const product = response?.product;
      if (!product) throw new Error('Product not found');

      fillBaseFields(form, product);

      const hidden = form.querySelector('#addons-json');
      if (hidden) hidden.value = JSON.stringify(Array.isArray(product.addons) ? product.addons : []);

      // Let SEO/Addons/Other modules react safely
      appState?.set?.('productForm.product', product);
      eventBus?.emitSync?.('productForm:productLoaded', { form, product });

      setTimeout(() => initDeliveryTimeAddonSync(form, { applyInitial: true }), 10);
      addDeleteProductButton(form, productId);
    } else {
      fillDemoProduct(form);
      setTimeout(() => initDeliveryTimeAddonSync(form, { applyInitial: true }), 10);

      eventBus?.emitSync?.('productForm:new', { form });
    }

    // Auto-slug on title change (only when creating)
    if (form.title && form.slug) {
      form.title.addEventListener('input', () => {
        if (!productId) form.slug.value = generateSlug(form.title.value);
      });
    }

    // Save
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';

      const setBtn = (text, disabled) => {
        if (!btn) return;
        btn.textContent = text;
        btn.disabled = !!disabled;
      };

      try {
        setBtn('Uploading files...', true);

        const base = collectBase(form);
        const media = readMediaFields(form);

        // Allow other modules to contribute to payload using events
        const contributions = { seo: {}, addons: null, extra: {} };
        if (eventBus?.emit) {
          await eventBus.emit('productForm:collect', { form, base, media, contributions });
        }

        if (media.files?.thumbnail_file) {
          setBtn('Uploading thumbnail...', true);
          const url = await uploadFileWithProgress(media.files.thumbnail_file, 'thumbnail', form);
          if (url) media.meta.thumbnail_url = url;
        }

        if (media.files?.video_file) {
          setBtn('Uploading video...', true);
          const url = await uploadFileWithProgress(media.files.video_file, 'video', form);
          if (url) media.meta.video_url = url;
        }

        setBtn('Saving product...', true);

        const payload = {
          ...base,
          ...media.meta,
          ...contributions.seo,
          ...contributions.extra
        };

        // Addons: keep hidden JSON as default, allow override
        if (contributions.addons) {
          payload.addons = contributions.addons;
        } else {
          const hidden = form.querySelector('#addons-json');
          if (hidden?.value) {
            try { payload.addons = JSON.parse(hidden.value); } catch { payload.addons = []; }
          }
        }

        if (productId) payload.id = Number(productId);

        const data = api?.saveProduct
          ? await api.saveProduct(payload)
          : await fetch('/api/product/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).then(async (r) => {
              const j = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(j.error || 'Save failed');
              return j;
            });

        if (!data || !data.success) throw new Error(data?.error || 'Save failed');

        eventBus?.emitSync?.('productForm:saved', { id: data.id, payload });
        alert('Product saved successfully! ID: ' + data.id);

        if (!productId) window.location.href = `product-form.html?id=${data.id}`;
      } catch (err) {
        console.error('Save error', err);
        eventBus?.emitSync?.('productForm:error', { err });
        alert('Error saving product: ' + (err.message || 'Unknown error'));
      } finally {
        if (btn) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      }
    });
  } catch (err) {
    console.error('Product form init failed', err);
    eventBus?.emitSync?.('productForm:error', { err });
  }
}
