import { el } from '../utils.js';
import { rules, validate } from '../validation.js';
import { SettingsAPI } from '../services/settings-api.js';

export function SettingsView() {
  const wrap = el('div', { class: 'section fade-in' });
  wrap.appendChild(el('h2', { text: 'Analytics Control Room' }));
  wrap.appendChild(el('p', { text: 'Unify tracking, funnels, and live campaign visibility.' }));

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
  wrap.appendChild(form);
  wrap.appendChild(insight);
  return wrap;
}
