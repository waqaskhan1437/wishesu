/**
 * Dashboard SEO - Indexing control, robots.txt + sitemap.xml settings
 */

(function(AD) {
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function toast(panel, msg, ok=true) {
    const el = panel.querySelector('#seo-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = ok ? '#10b981' : '#ef4444';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
  }

  async function jfetch(url, opts={}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
      ...opts
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
    if (!res.ok) {
      const msg = (data && data.error) ? data.error : ('Request failed: ' + res.status);
      throw new Error(msg);
    }
    return data;
  }

  function makePageRow(rule) {
    const r = rule || {};
    const path = esc(r.path || '');
    const idx = (r.allow_index ?? 1) !== 0;
    const fol = (r.allow_follow ?? 1) !== 0;
    const sm = (r.include_in_sitemap ?? 1) !== 0;
    const canon = esc(r.canonical_override || '');
    const freq = esc(r.changefreq || 'weekly');
    const pr = (typeof r.priority === 'number') ? r.priority : (r.priority ? Number(r.priority) : 0.6);

    return `
      <tr>
        <td style="padding:10px;">
          <input class="seo-path" value="${path}" placeholder="/about.html" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px;">
        </td>
        <td style="padding:10px; text-align:center;">
          <input class="seo-idx" type="checkbox" ${idx?'checked':''} style="width:18px; height:18px;">
        </td>
        <td style="padding:10px; text-align:center;">
          <input class="seo-fol" type="checkbox" ${fol?'checked':''} style="width:18px; height:18px;">
        </td>
        <td style="padding:10px; text-align:center;">
          <input class="seo-sm" type="checkbox" ${sm?'checked':''} style="width:18px; height:18px;">
        </td>
        <td style="padding:10px;">
          <input class="seo-canon" value="${canon}" placeholder="https://example.com/custom" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px;">
        </td>
        <td style="padding:10px;">
          <select class="seo-freq" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px;">
            ${['always','hourly','daily','weekly','monthly','yearly','never'].map(v => `<option value="${v}" ${v===freq?'selected':''}>${v}</option>`).join('')}
          </select>
        </td>
        <td style="padding:10px;">
          <input class="seo-pr" type="number" min="0" max="1" step="0.1" value="${Number.isFinite(pr)?pr:0.6}" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px;">
        </td>
        <td style="padding:10px; text-align:center;">
          <button class="seo-del" style="padding:8px 12px; border-radius:10px; border:1px solid #fecaca; background:#fff; color:#991b1b; cursor:pointer;">Delete</button>
        </td>
      </tr>
    `;
  }

  function readPageRules(tbody) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const out = [];
    for (const tr of rows) {
      const path = (tr.querySelector('.seo-path')?.value || '').trim();
      if (!path) continue;
      out.push({
        path,
        allow_index: tr.querySelector('.seo-idx')?.checked ? 1 : 0,
        allow_follow: tr.querySelector('.seo-fol')?.checked ? 1 : 0,
        include_in_sitemap: tr.querySelector('.seo-sm')?.checked ? 1 : 0,
        canonical_override: (tr.querySelector('.seo-canon')?.value || '').trim(),
        changefreq: tr.querySelector('.seo-freq')?.value || 'weekly',
        priority: Number(tr.querySelector('.seo-pr')?.value || 0.6)
      });
    }
    return out;
  }

  function productRow(p) {
    const idx = (p.rule_allow_index ?? 1) !== 0;
    const fol = (p.rule_allow_follow ?? 1) !== 0;
    const sm = (p.rule_include_in_sitemap ?? 1) !== 0;
    return `
      <tr data-pid="${esc(p.id)}">
        <td style="padding:10px; font-variant-numeric: tabular-nums;">${esc(p.id)}</td>
        <td style="padding:10px;">
          <div style="font-weight:600;">${esc(p.title)}</div>
          <div style="font-size:12px; color:#6b7280;">/${esc(p.slug || '')}</div>
        </td>
        <td style="padding:10px;"><span style="padding:4px 10px; border-radius:999px; font-size:12px; background:#f3f4f6;">${esc(p.status||'')}</span></td>
        <td style="padding:10px; text-align:center;"><input class="p-idx" type="checkbox" ${idx?'checked':''} style="width:18px; height:18px;"></td>
        <td style="padding:10px; text-align:center;"><input class="p-fol" type="checkbox" ${fol?'checked':''} style="width:18px; height:18px;"></td>
        <td style="padding:10px; text-align:center;"><input class="p-sm" type="checkbox" ${sm?'checked':''} style="width:18px; height:18px;"></td>
        <td style="padding:10px;">
          <input class="p-canon" value="${esc(p.rule_canonical_override||'')}" placeholder="Leave blank for auto-canonical" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:10px;">
        </td>
        <td style="padding:10px; text-align:center;">
          <button class="p-save" style="padding:8px 12px; border-radius:10px; border:1px solid #d1d5db; background:#fff; cursor:pointer;">Save</button>
        </td>
      </tr>
    `;
  }

  async function loadSettings(panel) {
    const s = await jfetch('/api/admin/seo/settings');
    panel.querySelector('#seo-base-url').value = s.base_url || '';
    panel.querySelector('#seo-prod-template').value = s.product_url_template || '/product-{id}/{slug}';
    panel.querySelector('#seo-sitemap-enabled').checked = !!s.sitemap_enabled;
    panel.querySelector('#seo-sitemap-pages').checked = !!s.sitemap_include_pages;
    panel.querySelector('#seo-sitemap-products').checked = !!s.sitemap_include_products;
    panel.querySelector('#seo-sitemap-max').value = s.sitemap_max_urls || 45000;
    panel.querySelector('#seo-force-noindex').checked = !!s.force_noindex_on_workers_dev;
    panel.querySelector('#seo-robots-enabled').checked = !!s.robots_enabled;
    panel.querySelector('#seo-robots-extra').value = s.robots_extra || '';
  }

  async function saveSettings(panel) {
    const body = {
      base_url: panel.querySelector('#seo-base-url').value.trim(),
      product_url_template: panel.querySelector('#seo-prod-template').value.trim(),
      sitemap_enabled: panel.querySelector('#seo-sitemap-enabled').checked,
      sitemap_include_pages: panel.querySelector('#seo-sitemap-pages').checked,
      sitemap_include_products: panel.querySelector('#seo-sitemap-products').checked,
      sitemap_max_urls: Number(panel.querySelector('#seo-sitemap-max').value || 45000),
      force_noindex_on_workers_dev: panel.querySelector('#seo-force-noindex').checked,
      robots_enabled: panel.querySelector('#seo-robots-enabled').checked,
      robots_extra: panel.querySelector('#seo-robots-extra').value
    };
    await jfetch('/api/admin/seo/settings', { method: 'POST', body: JSON.stringify(body) });
  }

  async function loadPageRules(panel) {
    const rules = await jfetch('/api/admin/seo/pages');
    const tbody = panel.querySelector('#seo-page-tbody');
    tbody.innerHTML = (rules || []).map(makePageRow).join('');
    bindPageRowActions(panel);
  }

  function bindPageRowActions(panel) {
    const tbody = panel.querySelector('#seo-page-tbody');
    tbody.querySelectorAll('.seo-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const tr = btn.closest('tr');
        const path = (tr.querySelector('.seo-path')?.value || '').trim();
        // remove from DOM first (fast)
        tr.remove();
        // if it existed, also delete from DB (best effort)
        if (path) {
          try { await jfetch('/api/admin/seo/pages?path=' + encodeURIComponent(path), { method: 'DELETE' }); } catch(_) {}
        }
      });
    });
  }

  async function savePageRules(panel) {
    const tbody = panel.querySelector('#seo-page-tbody');
    const pages = readPageRules(tbody);
    await jfetch('/api/admin/seo/pages', { method: 'POST', body: JSON.stringify({ pages }) });
  }

  async function loadProducts(panel) {
    const q = panel.querySelector('#seo-prod-search').value.trim();
    const list = await jfetch('/api/admin/seo/products?limit=60&search=' + encodeURIComponent(q));
    const tbody = panel.querySelector('#seo-prod-tbody');
    tbody.innerHTML = (list || []).map(productRow).join('');
    bindProductActions(panel);
  }

  function bindProductActions(panel) {
    const tbody = panel.querySelector('#seo-prod-tbody');
    tbody.querySelectorAll('.p-save').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const tr = btn.closest('tr');
        const product_id = tr.getAttribute('data-pid');
        const patch = {
          allow_index: tr.querySelector('.p-idx')?.checked ? 1 : 0,
          allow_follow: tr.querySelector('.p-fol')?.checked ? 1 : 0,
          include_in_sitemap: tr.querySelector('.p-sm')?.checked ? 1 : 0,
          canonical_override: (tr.querySelector('.p-canon')?.value || '').trim()
        };
        btn.textContent = 'Saving...';
        btn.disabled = true;
        try {
          await jfetch('/api/admin/seo/products', { method: 'POST', body: JSON.stringify({ product_id, patch }) });
          btn.textContent = 'Saved';
          setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 900);
        } catch (err) {
          btn.textContent = 'Save';
          btn.disabled = false;
          toast(panel, err.message || 'Failed to save', false);
        }
      });
    });
  }

  AD.loadSEO = async function(panel) {
    panel.innerHTML = `
      <div id="seo-toast" style="display:none; padding:12px 14px; border-radius:12px; color:#fff; margin-bottom:14px;"></div>

      <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:14px;">
        <div style="flex:1; min-width:320px; background:#fff; border-radius:14px; padding:18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="font-size:18px; font-weight:700; margin-bottom:6px;">SEO Settings</div>
          <div style="color:#6b7280; font-size:13px; margin-bottom:14px;">
            Control indexing, robots.txt and sitemap.xml from here. Changes usually take ~5 minutes to show because pages are cached.
          </div>

          <div style="display:grid; grid-template-columns: 1fr; gap:12px;">
            <div>
              <div style="font-size:12px; font-weight:600; color:#374151; margin-bottom:6px;">Base URL (canonical + sitemap)</div>
              <input id="seo-base-url" placeholder="https://yourdomain.com" style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
              <div style="font-size:12px; color:#6b7280; margin-top:6px;">Leave blank to auto-detect from the current domain.</div>
            </div>

            <div>
              <div style="font-size:12px; font-weight:600; color:#374151; margin-bottom:6px;">Product URL template (sitemap + canonicals)</div>
              <input id="seo-prod-template" placeholder="/product-{id}/{slug}" style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
              <div style="font-size:12px; color:#6b7280; margin-top:6px;">Use {id} and {slug}. Default matches your canonical redirect: /product-123/slug</div>
            </div>

            <div style="display:flex; gap:14px; flex-wrap:wrap;">
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer;">
                <input id="seo-sitemap-enabled" type="checkbox" style="width:18px; height:18px;">
                <span style="font-weight:600;">Enable sitemap.xml</span>
              </label>
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer;">
                <input id="seo-sitemap-pages" type="checkbox" style="width:18px; height:18px;">
                <span style="font-weight:600;">Include pages</span>
              </label>
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer;">
                <input id="seo-sitemap-products" type="checkbox" style="width:18px; height:18px;">
                <span style="font-weight:600;">Include products</span>
              </label>
            </div>

            <div style="display:flex; gap:14px; flex-wrap:wrap;">
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer;">
                <input id="seo-robots-enabled" type="checkbox" style="width:18px; height:18px;">
                <span style="font-weight:600;">Enable robots.txt</span>
              </label>
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer;">
                <input id="seo-force-noindex" type="checkbox" style="width:18px; height:18px;">
                <span style="font-weight:600;">Force NOINDEX on workers.dev</span>
              </label>
            </div>

            <div style="display:flex; gap:12px; align-items:end; flex-wrap:wrap;">
              <div style="flex:1; min-width:220px;">
                <div style="font-size:12px; font-weight:600; color:#374151; margin-bottom:6px;">Sitemap max URLs per file</div>
                <input id="seo-sitemap-max" type="number" min="1000" max="50000" step="100" style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
              </div>
              <button id="seo-save-settings" style="padding:12px 16px; border-radius:12px; border:none; background:#111827; color:#fff; font-weight:700; cursor:pointer;">Save Settings</button>
            </div>

            <div>
              <div style="font-size:12px; font-weight:600; color:#374151; margin-bottom:6px;">robots.txt extra rules</div>
              <textarea id="seo-robots-extra" rows="5" style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;" placeholder="Allow: /assets/\nDisallow: /tmp/"></textarea>
              <div style="font-size:12px; color:#6b7280; margin-top:6px;">Tip: put one directive per line. Sitemap line is added automatically.</div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:13px;">
              <a href="/robots.txt" target="_blank" style="color:#2563eb; text-decoration:none;">Open robots.txt</a>
              <a href="/sitemap.xml" target="_blank" style="color:#2563eb; text-decoration:none;">Open sitemap.xml</a>
            </div>
          </div>
        </div>

        <div style="flex:1.2; min-width:360px; background:#fff; border-radius:14px; padding:18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px;">
            <div>
              <div style="font-size:18px; font-weight:700;">Page Rules</div>
              <div style="color:#6b7280; font-size:13px;">Add paths and control index/follow/sitemap. Defaults are pre-seeded.</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button id="seo-add-page" style="padding:10px 12px; border-radius:12px; border:1px solid #d1d5db; background:#fff; cursor:pointer;">Add</button>
              <button id="seo-save-pages" style="padding:10px 12px; border-radius:12px; border:none; background:#111827; color:#fff; font-weight:700; cursor:pointer;">Save</button>
            </div>
          </div>

          <div style="overflow:auto; border:1px solid #e5e7eb; border-radius:12px;">
            <table style="width:100%; border-collapse:collapse; min-width:880px;">
              <thead>
                <tr style="background:#f9fafb; text-align:left; font-size:12px; color:#374151;">
                  <th style="padding:10px;">Path</th>
                  <th style="padding:10px; text-align:center;">Index</th>
                  <th style="padding:10px; text-align:center;">Follow</th>
                  <th style="padding:10px; text-align:center;">Sitemap</th>
                  <th style="padding:10px;">Canonical override</th>
                  <th style="padding:10px;">Changefreq</th>
                  <th style="padding:10px;">Priority</th>
                  <th style="padding:10px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody id="seo-page-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div style="background:#fff; border-radius:14px; padding:18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px;">
          <div>
            <div style="font-size:18px; font-weight:700;">Product Rules</div>
            <div style="color:#6b7280; font-size:13px;">Search and control indexing per product. Only affects SEO meta and sitemap.</div>
          </div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input id="seo-prod-search" placeholder="Search title or slug..." style="padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; min-width:220px;">
            <button id="seo-prod-load" style="padding:10px 12px; border-radius:12px; border:1px solid #d1d5db; background:#fff; cursor:pointer;">Load</button>
          </div>
        </div>

        <div style="overflow:auto; border:1px solid #e5e7eb; border-radius:12px;">
          <table style="width:100%; border-collapse:collapse; min-width:980px;">
            <thead>
              <tr style="background:#f9fafb; text-align:left; font-size:12px; color:#374151;">
                <th style="padding:10px;">ID</th>
                <th style="padding:10px;">Product</th>
                <th style="padding:10px;">Status</th>
                <th style="padding:10px; text-align:center;">Index</th>
                <th style="padding:10px; text-align:center;">Follow</th>
                <th style="padding:10px; text-align:center;">Sitemap</th>
                <th style="padding:10px;">Canonical override</th>
                <th style="padding:10px; text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody id="seo-prod-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    try {
      await loadSettings(panel);
      await loadPageRules(panel);

      panel.querySelector('#seo-save-settings').addEventListener('click', async () => {
        try {
          await saveSettings(panel);
          toast(panel, 'Settings saved');
        } catch (err) {
          toast(panel, err.message || 'Failed to save settings', false);
        }
      });

      panel.querySelector('#seo-add-page').addEventListener('click', (e) => {
        e.preventDefault();
        const tbody = panel.querySelector('#seo-page-tbody');
        tbody.insertAdjacentHTML('beforeend', makePageRow({ path:'/new-page.html', allow_index:1, allow_follow:1, include_in_sitemap:0, changefreq:'weekly', priority:0.5 }));
        bindPageRowActions(panel);
      });

      panel.querySelector('#seo-save-pages').addEventListener('click', async () => {
        try {
          await savePageRules(panel);
          toast(panel, 'Page rules saved');
          await loadPageRules(panel);
        } catch (err) {
          toast(panel, err.message || 'Failed to save page rules', false);
        }
      });

      panel.querySelector('#seo-prod-load').addEventListener('click', async () => {
        try {
          await loadProducts(panel);
          toast(panel, 'Products loaded');
        } catch (err) {
          toast(panel, err.message || 'Failed to load products', false);
        }
      });

      // initial product load
      await loadProducts(panel);
    } catch (err) {
      panel.innerHTML = `<div style="background:#fff; padding:16px; border-radius:12px;">SEO view failed: ${esc(err.message || err)}</div>`;
    }
  };

  console.log('✅ Dashboard SEO module loaded');
})(window.AdminDashboard);
