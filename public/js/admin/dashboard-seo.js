/**
 * Dashboard SEO - Advanced SEO Management Panel
 * Features: Indexing control, robots.txt, sitemap.xml, Schema validator, Health checks
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
        <td style="padding:10px;"><span style="padding:4px 10px; border-radius:999px; font-size:12px; background:${p.status==='active'?'#d1fae5':'#f3f4f6'}; color:${p.status==='active'?'#065f46':'#6b7280'};">${esc(p.status||'')}</span></td>
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
        tr.remove();
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

  // Schema test function
  async function testProductSchema(panel, productId) {
    const resultDiv = panel.querySelector('#schema-test-result');
    resultDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#6b7280;">Testing schema...</div>';
    
    try {
      const data = await jfetch(`/api/product/${productId}`);
      const product = data.product;
      
      if (!product) {
        resultDiv.innerHTML = '<div style="padding:16px; background:#fef2f2; border-radius:10px; color:#991b1b;">Product not found</div>';
        return;
      }
      
      // Check for common SEO issues
      const issues = [];
      const warnings = [];
      const success = [];
      
      // Title check
      if (!product.title || product.title.length < 10) {
        issues.push('Title is too short (should be 10+ characters)');
      } else if (product.title.length > 60) {
        warnings.push('Title is longer than 60 characters (may be truncated in search results)');
      } else {
        success.push('Title length is optimal');
      }
      
      // Description check
      const desc = product.seo_description || product.description || '';
      if (!desc || desc.length < 50) {
        issues.push('Meta description is too short (should be 50+ characters)');
      } else if (desc.length > 160) {
        warnings.push('Meta description is longer than 160 characters');
      } else {
        success.push('Meta description length is optimal');
      }
      
      // Image check
      if (!product.thumbnail_url) {
        issues.push('No thumbnail image set (required for rich snippets)');
      } else {
        success.push('Thumbnail image is set');
      }
      
      // Price check
      const price = parseFloat(product.sale_price || product.normal_price || 0);
      if (price <= 0) {
        warnings.push('Price is 0 or not set');
      } else {
        success.push('Price is configured');
      }
      
      // Reviews check
      if (!product.review_count || product.review_count < 1) {
        warnings.push('No reviews yet (affects rich snippet eligibility)');
      } else {
        success.push(`Has ${product.review_count} reviews`);
      }
      
      // Slug check
      if (!product.slug) {
        issues.push('No slug set (affects URL readability)');
      } else {
        success.push('SEO-friendly slug is set');
      }
      
      let html = `
        <div style="padding:16px;">
          <div style="font-weight:700; font-size:16px; margin-bottom:12px;">${esc(product.title)}</div>
          <div style="font-size:13px; color:#6b7280; margin-bottom:16px;">ID: ${product.id} | Slug: ${esc(product.slug || 'not set')}</div>
      `;
      
      if (issues.length > 0) {
        html += `<div style="background:#fef2f2; padding:12px; border-radius:8px; margin-bottom:12px;">
          <div style="font-weight:600; color:#991b1b; margin-bottom:8px;">❌ Issues (${issues.length})</div>
          ${issues.map(i => `<div style="color:#991b1b; font-size:13px; margin-bottom:4px;">• ${esc(i)}</div>`).join('')}
        </div>`;
      }
      
      if (warnings.length > 0) {
        html += `<div style="background:#fffbeb; padding:12px; border-radius:8px; margin-bottom:12px;">
          <div style="font-weight:600; color:#92400e; margin-bottom:8px;">⚠️ Warnings (${warnings.length})</div>
          ${warnings.map(w => `<div style="color:#92400e; font-size:13px; margin-bottom:4px;">• ${esc(w)}</div>`).join('')}
        </div>`;
      }
      
      if (success.length > 0) {
        html += `<div style="background:#f0fdf4; padding:12px; border-radius:8px;">
          <div style="font-weight:600; color:#166534; margin-bottom:8px;">✅ Passed (${success.length})</div>
          ${success.map(s => `<div style="color:#166534; font-size:13px; margin-bottom:4px;">• ${esc(s)}</div>`).join('')}
        </div>`;
      }
      
      html += `
        <div style="margin-top:16px; padding-top:16px; border-top:1px solid #e5e7eb;">
          <div style="font-weight:600; margin-bottom:8px;">External Tools:</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="https://search.google.com/test/rich-results?url=${encodeURIComponent(location.origin + '/product-' + product.id + '/' + (product.slug || ''))}" target="_blank" style="padding:8px 14px; background:#4285f4; color:#fff; border-radius:8px; text-decoration:none; font-size:13px;">Google Rich Results Test</a>
            <a href="https://validator.schema.org/#url=${encodeURIComponent(location.origin + '/product-' + product.id + '/' + (product.slug || ''))}" target="_blank" style="padding:8px 14px; background:#ff6d00; color:#fff; border-radius:8px; text-decoration:none; font-size:13px;">Schema.org Validator</a>
            <a href="https://pagespeed.web.dev/analysis?url=${encodeURIComponent(location.origin + '/product-' + product.id + '/' + (product.slug || ''))}" target="_blank" style="padding:8px 14px; background:#0d9488; color:#fff; border-radius:8px; text-decoration:none; font-size:13px;">PageSpeed Insights</a>
          </div>
        </div>
      </div>`;
      
      resultDiv.innerHTML = html;
      
    } catch (err) {
      resultDiv.innerHTML = `<div style="padding:16px; background:#fef2f2; border-radius:10px; color:#991b1b;">Error: ${esc(err.message)}</div>`;
    }
  }

  // Tab switching
  function switchTab(panel, tabName) {
    panel.querySelectorAll('.seo-tab-btn').forEach(btn => {
      btn.style.background = btn.dataset.tab === tabName ? '#111827' : '#fff';
      btn.style.color = btn.dataset.tab === tabName ? '#fff' : '#374151';
    });
    panel.querySelectorAll('.seo-tab-content').forEach(content => {
      content.style.display = content.dataset.tab === tabName ? 'block' : 'none';
    });
  }

  AD.loadSEO = async function(panel) {
    panel.innerHTML = `
      <div id="seo-toast" style="display:none; padding:12px 14px; border-radius:12px; color:#fff; margin-bottom:14px;"></div>

      <!-- Tab Navigation -->
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="seo-tab-btn" data-tab="settings" style="padding:10px 20px; border-radius:10px; border:1px solid #e5e7eb; background:#111827; color:#fff; font-weight:600; cursor:pointer; transition:all 0.2s;">⚙️ Settings</button>
        <button class="seo-tab-btn" data-tab="pages" style="padding:10px 20px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#374151; font-weight:600; cursor:pointer; transition:all 0.2s;">📄 Page Rules</button>
        <button class="seo-tab-btn" data-tab="products" style="padding:10px 20px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#374151; font-weight:600; cursor:pointer; transition:all 0.2s;">📦 Product Rules</button>
        <button class="seo-tab-btn" data-tab="tools" style="padding:10px 20px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#374151; font-weight:600; cursor:pointer; transition:all 0.2s;">🛠️ SEO Tools</button>
      </div>

      <!-- Settings Tab -->
      <div class="seo-tab-content" data-tab="settings" style="display:block;">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap:16px;">
          
          <!-- General Settings -->
          <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <div style="width:40px; height:40px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">🌐</div>
              <div>
                <div style="font-size:16px; font-weight:700;">General Settings</div>
                <div style="color:#6b7280; font-size:12px;">Configure base URL and templates</div>
              </div>
            </div>
            
            <div style="display:grid; gap:14px;">
              <div>
                <label style="font-size:12px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Base URL (canonical + sitemap)</label>
                <input id="seo-base-url" placeholder="https://yourdomain.com" style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:10px; font-size:14px;">
                <div style="font-size:11px; color:#9ca3af; margin-top:4px;">Leave blank to auto-detect from current domain</div>
              </div>
              
              <div>
                <label style="font-size:12px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Product URL Template</label>
                <input id="seo-prod-template" placeholder="/product-{id}/{slug}" style="width:100%; padding:12px; border:1px solid #e5e7eb; border-radius:10px; font-size:14px;">
                <div style="font-size:11px; color:#9ca3af; margin-top:4px;">Use {id} and {slug} placeholders</div>
              </div>
            </div>
          </div>
          
          <!-- Sitemap Settings -->
          <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <div style="width:40px; height:40px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">🗺️</div>
              <div>
                <div style="font-size:16px; font-weight:700;">Sitemap Settings</div>
                <div style="color:#6b7280; font-size:12px;">Control sitemap.xml generation</div>
              </div>
            </div>
            
            <div style="display:grid; gap:12px;">
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer; padding:10px; background:#f9fafb; border-radius:8px;">
                <input id="seo-sitemap-enabled" type="checkbox" style="width:18px; height:18px; accent-color:#10b981;">
                <div>
                  <div style="font-weight:600; font-size:14px;">Enable sitemap.xml</div>
                  <div style="font-size:12px; color:#6b7280;">Generate XML sitemap for search engines</div>
                </div>
              </label>
              
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <label style="display:flex; gap:8px; align-items:center; cursor:pointer; padding:8px 12px; background:#f9fafb; border-radius:8px; flex:1;">
                  <input id="seo-sitemap-pages" type="checkbox" style="width:16px; height:16px;">
                  <span style="font-size:13px;">Include Pages</span>
                </label>
                <label style="display:flex; gap:8px; align-items:center; cursor:pointer; padding:8px 12px; background:#f9fafb; border-radius:8px; flex:1;">
                  <input id="seo-sitemap-products" type="checkbox" style="width:16px; height:16px;">
                  <span style="font-size:13px;">Include Products</span>
                </label>
              </div>
              
              <div>
                <label style="font-size:12px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Max URLs per file</label>
                <input id="seo-sitemap-max" type="number" min="1000" max="50000" step="100" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:8px;">
              </div>
            </div>
          </div>
          
          <!-- Robots.txt Settings -->
          <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <div style="width:40px; height:40px; background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">🤖</div>
              <div>
                <div style="font-size:16px; font-weight:700;">Robots.txt Settings</div>
                <div style="color:#6b7280; font-size:12px;">Control crawler access</div>
              </div>
            </div>
            
            <div style="display:grid; gap:12px;">
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer; padding:10px; background:#f9fafb; border-radius:8px;">
                <input id="seo-robots-enabled" type="checkbox" style="width:18px; height:18px; accent-color:#f59e0b;">
                <div>
                  <div style="font-weight:600; font-size:14px;">Enable robots.txt</div>
                  <div style="font-size:12px; color:#6b7280;">Generate robots.txt file</div>
                </div>
              </label>
              
              <label style="display:flex; gap:10px; align-items:center; cursor:pointer; padding:10px; background:#fef3c7; border-radius:8px;">
                <input id="seo-force-noindex" type="checkbox" style="width:18px; height:18px; accent-color:#d97706;">
                <div>
                  <div style="font-weight:600; font-size:14px;">Force NOINDEX on workers.dev</div>
                  <div style="font-size:12px; color:#92400e;">Prevent staging URLs from being indexed</div>
                </div>
              </label>
              
              <div>
                <label style="font-size:12px; font-weight:600; color:#374151; display:block; margin-bottom:6px;">Extra robots.txt rules</label>
                <textarea id="seo-robots-extra" rows="4" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:8px; font-family:monospace; font-size:12px; resize:vertical;" placeholder="Allow: /assets/&#10;Disallow: /tmp/"></textarea>
              </div>
            </div>
          </div>
          
          <!-- Quick Links -->
          <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <div style="width:40px; height:40px; background:linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">🔗</div>
              <div>
                <div style="font-size:16px; font-weight:700;">Quick Links</div>
                <div style="color:#6b7280; font-size:12px;">View generated files</div>
              </div>
            </div>
            
            <div style="display:grid; gap:10px;">
              <a href="/robots.txt" target="_blank" style="display:flex; align-items:center; gap:10px; padding:12px; background:#f9fafb; border-radius:8px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:20px;">📄</span>
                <div>
                  <div style="font-weight:600;">robots.txt</div>
                  <div style="font-size:12px; color:#6b7280;">View current robots.txt file</div>
                </div>
                <span style="margin-left:auto; color:#9ca3af;">→</span>
              </a>
              
              <a href="/sitemap.xml" target="_blank" style="display:flex; align-items:center; gap:10px; padding:12px; background:#f9fafb; border-radius:8px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:20px;">🗺️</span>
                <div>
                  <div style="font-weight:600;">sitemap.xml</div>
                  <div style="font-size:12px; color:#6b7280;">View generated sitemap</div>
                </div>
                <span style="margin-left:auto; color:#9ca3af;">→</span>
              </a>
              
              <a href="https://search.google.com/search-console" target="_blank" style="display:flex; align-items:center; gap:10px; padding:12px; background:#f9fafb; border-radius:8px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:20px;">🔍</span>
                <div>
                  <div style="font-weight:600;">Google Search Console</div>
                  <div style="font-size:12px; color:#6b7280;">Monitor search performance</div>
                </div>
                <span style="margin-left:auto; color:#9ca3af;">→</span>
              </a>
            </div>
          </div>
        </div>
        
        <div style="margin-top:16px; display:flex; justify-content:flex-end;">
          <button id="seo-save-settings" style="padding:14px 28px; border-radius:12px; border:none; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; font-weight:700; cursor:pointer; font-size:15px; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">💾 Save Settings</button>
        </div>
      </div>

      <!-- Page Rules Tab -->
      <div class="seo-tab-content" data-tab="pages" style="display:none;">
        <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
            <div>
              <div style="font-size:18px; font-weight:700;">Page Rules</div>
              <div style="color:#6b7280; font-size:13px;">Control indexing, follow, and sitemap inclusion for specific paths</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button id="seo-add-page" style="padding:10px 16px; border-radius:10px; border:1px solid #d1d5db; background:#fff; cursor:pointer; font-weight:600;">➕ Add Rule</button>
              <button id="seo-save-pages" style="padding:10px 16px; border-radius:10px; border:none; background:#111827; color:#fff; font-weight:700; cursor:pointer;">💾 Save All</button>
            </div>
          </div>

          <div style="overflow:auto; border:1px solid #e5e7eb; border-radius:12px;">
            <table style="width:100%; border-collapse:collapse; min-width:900px;">
              <thead>
                <tr style="background:#f9fafb; text-align:left; font-size:12px; color:#374151; text-transform:uppercase; letter-spacing:0.5px;">
                  <th style="padding:12px;">Path</th>
                  <th style="padding:12px; text-align:center;">Index</th>
                  <th style="padding:12px; text-align:center;">Follow</th>
                  <th style="padding:12px; text-align:center;">Sitemap</th>
                  <th style="padding:12px;">Canonical Override</th>
                  <th style="padding:12px;">Frequency</th>
                  <th style="padding:12px;">Priority</th>
                  <th style="padding:12px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody id="seo-page-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Product Rules Tab -->
      <div class="seo-tab-content" data-tab="products" style="display:none;">
        <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
            <div>
              <div style="font-size:18px; font-weight:700;">Product Rules</div>
              <div style="color:#6b7280; font-size:13px;">Control indexing per product. Changes affect SEO meta and sitemap.</div>
            </div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <input id="seo-prod-search" placeholder="🔍 Search products..." style="padding:10px 14px; border:1px solid #e5e7eb; border-radius:10px; min-width:220px;">
              <button id="seo-prod-load" style="padding:10px 16px; border-radius:10px; border:1px solid #d1d5db; background:#fff; cursor:pointer; font-weight:600;">🔄 Load</button>
            </div>
          </div>

          <div style="overflow:auto; border:1px solid #e5e7eb; border-radius:12px;">
            <table style="width:100%; border-collapse:collapse; min-width:1000px;">
              <thead>
                <tr style="background:#f9fafb; text-align:left; font-size:12px; color:#374151; text-transform:uppercase; letter-spacing:0.5px;">
                  <th style="padding:12px;">ID</th>
                  <th style="padding:12px;">Product</th>
                  <th style="padding:12px;">Status</th>
                  <th style="padding:12px; text-align:center;">Index</th>
                  <th style="padding:12px; text-align:center;">Follow</th>
                  <th style="padding:12px; text-align:center;">Sitemap</th>
                  <th style="padding:12px;">Canonical Override</th>
                  <th style="padding:12px; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody id="seo-prod-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SEO Tools Tab -->
      <div class="seo-tab-content" data-tab="tools" style="display:none;">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:16px;">
          
          <!-- Schema Tester -->
          <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <div style="width:40px; height:40px; background:linear-gradient(135deg, #ec4899 0%, #be185d 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">🧪</div>
              <div>
                <div style="font-size:16px; font-weight:700;">Schema Tester</div>
                <div style="color:#6b7280; font-size:12px;">Check product schema for SEO issues</div>
              </div>
            </div>
            
            <div style="display:flex; gap:10px; margin-bottom:16px;">
              <input id="schema-test-id" type="number" placeholder="Enter Product ID" style="flex:1; padding:12px; border:1px solid #e5e7eb; border-radius:10px;">
              <button id="schema-test-btn" style="padding:12px 20px; border-radius:10px; border:none; background:#ec4899; color:#fff; font-weight:700; cursor:pointer;">Test Schema</button>
            </div>
            
            <div id="schema-test-result" style="min-height:100px; background:#f9fafb; border-radius:10px; padding:16px;">
              <div style="text-align:center; color:#9ca3af;">Enter a product ID and click "Test Schema" to check for SEO issues</div>
            </div>
          </div>
          
          <!-- External Tools -->
          <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <div style="width:40px; height:40px; background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">🔧</div>
              <div>
                <div style="font-size:16px; font-weight:700;">External SEO Tools</div>
                <div style="color:#6b7280; font-size:12px;">Validate with Google and other services</div>
              </div>
            </div>
            
            <div style="display:grid; gap:10px;">
              <a href="https://search.google.com/test/rich-results" target="_blank" style="display:flex; align-items:center; gap:12px; padding:14px; background:#f9fafb; border-radius:10px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:24px;">🎯</span>
                <div style="flex:1;">
                  <div style="font-weight:600;">Google Rich Results Test</div>
                  <div style="font-size:12px; color:#6b7280;">Test structured data for rich snippets</div>
                </div>
                <span style="color:#3b82f6;">→</span>
              </a>
              
              <a href="https://pagespeed.web.dev/" target="_blank" style="display:flex; align-items:center; gap:12px; padding:14px; background:#f9fafb; border-radius:10px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:24px;">⚡</span>
                <div style="flex:1;">
                  <div style="font-weight:600;">PageSpeed Insights</div>
                  <div style="font-size:12px; color:#6b7280;">Check performance and Core Web Vitals</div>
                </div>
                <span style="color:#3b82f6;">→</span>
              </a>
              
              <a href="https://validator.schema.org/" target="_blank" style="display:flex; align-items:center; gap:12px; padding:14px; background:#f9fafb; border-radius:10px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:24px;">✅</span>
                <div style="flex:1;">
                  <div style="font-weight:600;">Schema.org Validator</div>
                  <div style="font-size:12px; color:#6b7280;">Validate JSON-LD structured data</div>
                </div>
                <span style="color:#3b82f6;">→</span>
              </a>
              
              <a href="https://www.bing.com/webmasters" target="_blank" style="display:flex; align-items:center; gap:12px; padding:14px; background:#f9fafb; border-radius:10px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:24px;">🔷</span>
                <div style="flex:1;">
                  <div style="font-weight:600;">Bing Webmaster Tools</div>
                  <div style="font-size:12px; color:#6b7280;">Monitor Bing search performance</div>
                </div>
                <span style="color:#3b82f6;">→</span>
              </a>
              
              <a href="https://developers.facebook.com/tools/debug/" target="_blank" style="display:flex; align-items:center; gap:12px; padding:14px; background:#f9fafb; border-radius:10px; text-decoration:none; color:#374151; transition:all 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f9fafb'">
                <span style="font-size:24px;">📘</span>
                <div style="flex:1;">
                  <div style="font-weight:600;">Facebook Sharing Debugger</div>
                  <div style="font-size:12px; color:#6b7280;">Preview Open Graph appearance</div>
                </div>
                <span style="color:#3b82f6;">→</span>
              </a>
            </div>
          </div>
          
          <!-- SEO Tips -->
          <div style="background:#fff; border-radius:14px; padding:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); grid-column: 1 / -1;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
              <div style="width:40px; height:40px; background:linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">💡</div>
              <div>
                <div style="font-size:16px; font-weight:700;">SEO Best Practices</div>
                <div style="color:#6b7280; font-size:12px;">Tips for better search rankings</div>
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
              <div style="padding:14px; background:#f0fdfa; border-radius:10px; border-left:4px solid #14b8a6;">
                <div style="font-weight:600; margin-bottom:4px;">📝 Titles</div>
                <div style="font-size:13px; color:#6b7280;">Keep titles between 50-60 characters. Include main keyword at the start.</div>
              </div>
              
              <div style="padding:14px; background:#fef3c7; border-radius:10px; border-left:4px solid #f59e0b;">
                <div style="font-weight:600; margin-bottom:4px;">📋 Descriptions</div>
                <div style="font-size:13px; color:#6b7280;">Meta descriptions should be 150-160 characters with a clear call-to-action.</div>
              </div>
              
              <div style="padding:14px; background:#fce7f3; border-radius:10px; border-left:4px solid #ec4899;">
                <div style="font-weight:600; margin-bottom:4px;">🖼️ Images</div>
                <div style="font-size:13px; color:#6b7280;">All products should have high-quality thumbnail images for rich snippets.</div>
              </div>
              
              <div style="padding:14px; background:#e0e7ff; border-radius:10px; border-left:4px solid #6366f1;">
                <div style="font-weight:600; margin-bottom:4px;">⭐ Reviews</div>
                <div style="font-size:13px; color:#6b7280;">Products with 5+ reviews are more likely to show star ratings in search.</div>
              </div>
              
              <div style="padding:14px; background:#dcfce7; border-radius:10px; border-left:4px solid #22c55e;">
                <div style="font-weight:600; margin-bottom:4px;">🔗 URLs</div>
                <div style="font-size:13px; color:#6b7280;">Use descriptive slugs with keywords. Avoid special characters and numbers.</div>
              </div>
              
              <div style="padding:14px; background:#fee2e2; border-radius:10px; border-left:4px solid #ef4444;">
                <div style="font-weight:600; margin-bottom:4px;">⚠️ CDN Errors</div>
                <div style="font-size:13px; color:#6b7280;">Check PageSpeed for failed resources. Broken CDN links (like b-cdn.net) hurt SEO.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Tab switching
    panel.querySelectorAll('.seo-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(panel, btn.dataset.tab));
    });

    try {
      await loadSettings(panel);
      await loadPageRules(panel);

      panel.querySelector('#seo-save-settings').addEventListener('click', async () => {
        try {
          await saveSettings(panel);
          toast(panel, '✅ Settings saved successfully');
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
          toast(panel, '✅ Page rules saved');
          await loadPageRules(panel);
        } catch (err) {
          toast(panel, err.message || 'Failed to save page rules', false);
        }
      });

      panel.querySelector('#seo-prod-load').addEventListener('click', async () => {
        try {
          await loadProducts(panel);
          toast(panel, '✅ Products loaded');
        } catch (err) {
          toast(panel, err.message || 'Failed to load products', false);
        }
      });
      
      // Schema test button
      panel.querySelector('#schema-test-btn').addEventListener('click', async () => {
        const productId = panel.querySelector('#schema-test-id').value.trim();
        if (!productId) {
          toast(panel, 'Please enter a product ID', false);
          return;
        }
        await testProductSchema(panel, productId);
      });

      // Initial product load
      await loadProducts(panel);
    } catch (err) {
      panel.innerHTML = `<div style="background:#fff; padding:20px; border-radius:12px; color:#991b1b;">SEO view failed: ${esc(err.message || err)}</div>`;
    }
  };

  console.log('✅ Dashboard SEO module loaded (Advanced)');
})(window.AdminDashboard);
