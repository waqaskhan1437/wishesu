import { el } from '../../utils/utils.js';
import { rules, validate } from '../../validation/validation.js';
import { SettingsAPI } from '../../services/settings-api/settings-api.js';

export function SettingsView() {
  const wrap = el('div', { class: 'section fade-in' });
  wrap.appendChild(el('h2', { text: 'Settings' }));
  wrap.appendChild(el('p', { text: 'Configure payments, tracking, and integrations.' }));

  const cards = el('div', { class: 'grid-2' }, [
    el('div', { class: 'card glass' }, [
      el('small', { text: 'Active Visitors' }),
      el('strong', { text: '128' }),
      el('p', { text: 'Realtime users across storefront + admin.' })
    ]),
    el('div', { class: 'card glass' }, [
      el('small', { text: 'Conversion Lift' }),
      el('strong', { text: '+18.4%' }),
      el('p', { text: 'Based on checkout completions this week.' })
    ])
  ]);

  // Whop Settings Form
  const whopForm = el('form', { class: 'card glass' });
  whopForm.innerHTML = `
    <h3>Whop Payment Settings</h3>
    <label>Default Whop Product ID</label>
    <input name="whop_product_id" placeholder="prod_XXXXXXX" />
    <small style="color:var(--muted);margin-top:-8px;display:block;">Used for all products without a specific Whop ID. Get from dash.whop.com</small>
    <label>Whop API Key (optional)</label>
    <input name="whop_api_key" type="password" placeholder="whop_XXXXXXX" />
    <label>Whop Webhook Secret (optional)</label>
    <input name="whop_webhook_secret" type="password" placeholder="whsec_XXXXXXX" />
    <div class="btn-row">
      <button class="btn" type="submit">Save Whop Settings</button>
    </div>
    <small class="form-msg"></small>
  `;

  whopForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(whopForm);
    const fields = Object.fromEntries(fd.entries());
    const msg = whopForm.querySelector('.form-msg');
    
    if (!fields.whop_product_id?.trim()) {
      msg.textContent = 'Whop Product ID is required';
      msg.style.color = '#ffb3b3';
      return;
    }
    
    msg.textContent = 'Saving...';
    msg.style.color = 'var(--muted)';
    
    const res = await SettingsAPI.saveWhop({
      whop_product_id: fields.whop_product_id.trim(),
      whop_api_key: fields.whop_api_key?.trim() || '',
      whop_webhook_secret: fields.whop_webhook_secret?.trim() || ''
    });
    
    if (!res.ok) {
      msg.textContent = res.error || 'Save failed';
      msg.style.color = '#ffb3b3';
      window.toast?.(res.error || 'Save failed');
      return;
    }
    msg.textContent = 'Saved';
    msg.style.color = '#b9ffe9';
    window.toast?.('Whop settings saved');
  });

  // Load existing Whop settings
  SettingsAPI.getWhop().then((res) => {
    if (res.ok && res.data) {
      whopForm.querySelector('[name="whop_product_id"]').value = res.data.whop_product_id || '';
      whopForm.querySelector('[name="whop_api_key"]').value = res.data.whop_api_key || '';
      whopForm.querySelector('[name="whop_webhook_secret"]').value = res.data.whop_webhook_secret || '';
    }
  });

  // Analytics Form
  const form = el('form', { class: 'card glass' });
  form.innerHTML = `
    <h3>Tracking Setup</h3>
    <label>Google Tag Manager ID</label>
    <input name="gtm" placeholder="GTM-XXXXXXX" />
    <label>Google Analytics ID</label>
    <input name="ga" placeholder="G-XXXXXXX" />
    <label>Meta Pixel ID</label>
    <input name="meta" placeholder="1234567890" />
    <div class="toggle-row">
      <span>Auto-inject scripts on public pages</span>
      <input type="checkbox" name="inject" checked />
    </div>
    <div class="btn-row">
      <button class="btn" type="submit">Save</button>
      <button class="btn btn-ghost" type="button" data-test>Test Signal</button>
    </div>
    <small class="form-msg"></small>
  `;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const fields = Object.fromEntries(fd.entries());
    const errors = validate(fields, {
      gtm: [rules.required],
      ga: [rules.required]
    });
    const msg = form.querySelector('.form-msg');
    if (Object.keys(errors).length) {
      msg.textContent = Object.values(errors)[0];
      msg.style.color = '#ffb3b3';
      return;
    }
    msg.textContent = 'Saving...';
    msg.style.color = 'var(--muted)';
    const res = await SettingsAPI.saveAnalytics({
      gtm_id: fields.gtm,
      ga_id: fields.ga,
      meta_id: fields.meta,
      auto_inject: fields.inject === 'on'
    });
    if (!res.ok) {
      msg.textContent = res.error;
      msg.style.color = '#ffb3b3';
      window.toast?.(res.error);
      return;
    }
    msg.textContent = 'Saved';
    msg.style.color = '#b9ffe9';
    window.toast?.('Analytics updated');
  });

  form.querySelector('[data-test]').addEventListener('click', async () => {
    const res = await fetch('/api/health').then((r) => r.json()).catch(() => ({ ok: false }));
    window.toast?.(res.ok ? 'Signal OK' : res.error);
  });

  const insight = el('div', { class: 'card glass' }, [
    el('h3', { text: 'Funnel Insight' }),
    el('div', { class: 'funnel' }),
    el('p', { text: 'Preview: ad click -> product view -> checkout -> delivery.' })
  ]);

  wrap.appendChild(cards);
  wrap.appendChild(whopForm);
  wrap.appendChild(form);
  wrap.appendChild(insight);
  return wrap;
}

