function serializeDataEmbed(config) {
  return JSON.stringify(config).replace(/'/g, '&#39;');
}

function buildSelectOptions(options) {
  return options.map(option => (
    `<option value="${option.value}"${option.selected ? ' selected' : ''}>${option.label}</option>`
  )).join('');
}

function buildSelectControl(className, borderColor, options) {
  return `<select class="${className}" style="padding:8px 12px;border:2px solid ${borderColor};border-radius:6px;font-size:0.85rem;">
    ${buildSelectOptions(options)}
  </select>`;
}

function buildInlineField(label, textColor, control) {
  return `<label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:${textColor};">
    ${label}
    ${control}
  </label>`;
}

function buildContentWidgetSection({
  title,
  configBackground,
  configBorder,
  textColor,
  widgetContainerClass,
  dataEmbed,
  emptyMessage,
  customIdsLabel,
  customIdsPlaceholder,
  customIdsHelp,
  filterOptions
}) {
  const fields = [
    buildInlineField('Layout:', textColor, buildSelectControl('widget-layout', configBorder, [
      { value: 'grid', label: 'Grid', selected: true },
      { value: 'slider', label: 'Slider' }
    ])),
    buildInlineField('Columns:', textColor, buildSelectControl('widget-columns', configBorder, [
      { value: '2', label: '2' },
      { value: '3', label: '3', selected: true },
      { value: '4', label: '4' }
    ])),
    buildInlineField('Limit:', textColor, `${buildSelectControl('widget-limit-select', configBorder, [
      { value: '3', label: '3' },
      { value: '6', label: '6', selected: true },
      { value: '9', label: '9' },
      { value: '12', label: '12' },
      { value: 'custom', label: 'Custom' }
    ])}
    <input type="number" class="widget-limit-custom" min="1" max="50" placeholder="e.g. 20" style="display:none;width:70px;padding:8px;border:2px solid ${configBorder};border-radius:6px;font-size:0.85rem;">`),
    buildInlineField('Filter:', textColor, buildSelectControl('widget-filter', configBorder, filterOptions))
  ];

  return `
    <section class="widget-section" style="padding:60px 20px;">
      <div style="max-width:1200px;margin:0 auto;">
        <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">${title}</h2>
        <div class="widget-config" style="background:${configBackground};border:2px dashed ${configBorder};border-radius:12px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;flex-wrap:wrap;gap:15px;align-items:center;">
            ${fields.join('')}
          </div>
          <div class="widget-custom-ids" style="display:none;margin-top:15px;">
            <label style="font-size:0.9rem;font-weight:600;color:${textColor};display:block;margin-bottom:8px;">
              ${customIdsLabel}
            </label>
            <input type="text" class="widget-ids-input" placeholder="${customIdsPlaceholder}" style="width:100%;padding:10px;border:2px solid ${configBorder};border-radius:6px;font-size:0.85rem;">
            <small style="color:#6b7280;display:block;margin-top:5px;">${customIdsHelp}</small>
          </div>
        </div>
        <div class="${widgetContainerClass}" data-embed='${serializeDataEmbed(dataEmbed)}'>
          <p style="text-align:center;color:#6b7280;">${emptyMessage}</p>
        </div>
      </div>
    </section>
  `;
}

function buildReviewsWidgetSection() {
  return `
    <section class="widget-section" style="padding:60px 20px;background:#f8fafc;">
      <div style="max-width:1200px;margin:0 auto;">
        <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Customer Reviews</h2>
        <div class="widget-config" style="background:#fff7ed;border:2px dashed #f97316;border-radius:12px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;flex-wrap:wrap;gap:15px;align-items:center;">
            ${buildInlineField('Min Rating:', '#9a3412', buildSelectControl('widget-min-rating', '#f97316', [
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
              { value: '5', label: '5 only', selected: true }
            ]))}
            ${buildInlineField('Columns:', '#9a3412', buildSelectControl('widget-columns', '#f97316', [
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3', selected: true }
            ]))}
            ${buildInlineField('Limit:', '#9a3412', `${buildSelectControl('widget-limit-select', '#f97316', [
              { value: '3', label: '3' },
              { value: '6', label: '6', selected: true },
              { value: '9', label: '9' },
              { value: '12', label: '12' },
              { value: 'custom', label: 'Custom' }
            ])}
            <input type="number" class="widget-limit-custom" min="1" max="50" placeholder="e.g. 20" style="display:none;width:70px;padding:8px;border:2px solid #f97316;border-radius:6px;font-size:0.85rem;">`)}
            ${buildInlineField('Product ID:', '#9a3412', '<input type="text" class="widget-product-id" placeholder="Optional" style="width:110px;padding:8px 12px;border:2px solid #f97316;border-radius:6px;font-size:0.85rem;">')}
            <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#9a3412;">
              <input type="checkbox" class="widget-show-avatar" checked>
              Show Avatar
            </label>
          </div>
        </div>
        <div class="reviews-widget-container" data-embed='${serializeDataEmbed({
          type: 'review',
          limit: 6,
          columns: 3,
          minRating: 5,
          showAvatar: true
        })}'>
          <p style="text-align:center;color:#6b7280;">Review cards will load here...</p>
        </div>
      </div>
    </section>
  `;
}

function buildDefaultHeroSection() {
  return `
    <section style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:80px 20px;text-align:center;">
      <h1 style="font-size:3rem;margin-bottom:20px;font-weight:700;" contenteditable="true">Welcome to Our Site</h1>
      <p style="font-size:1.2rem;opacity:0.9;max-width:600px;margin:0 auto 30px;" contenteditable="true">Create amazing pages with our easy-to-use builder</p>
      <button style="background:white;color:#667eea;padding:15px 40px;border:none;border-radius:30px;font-weight:700;font-size:1rem;cursor:pointer;" contenteditable="true">Get Started</button>
    </section>
  `;
}

function buildHeroSection(featureImageUrl) {
  if (!featureImageUrl) return buildDefaultHeroSection();

  return `<section style="position:relative;color:white;padding:80px 20px;text-align:center;min-height:300px;overflow:hidden;">
    <img src="${featureImageUrl}" alt="Hero background" fetchpriority="high" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;" width="1200" height="630">
    <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:1;"></div>
    <div style="position:relative;z-index:2;">
      <h1 style="font-size:3rem;margin-bottom:20px;font-weight:700;" contenteditable="true">Welcome to Our Site</h1>
      <p style="font-size:1.2rem;opacity:0.9;max-width:600px;margin:0 auto 30px;" contenteditable="true">Create amazing pages with our easy-to-use builder</p>
      <button style="background:white;color:#333;padding:15px 40px;border:none;border-radius:30px;font-weight:700;font-size:1rem;cursor:pointer;" contenteditable="true">Get Started</button>
    </div>
  </section>`;
}

const SECTIONS = {
  hero: buildDefaultHeroSection(),
  features: `
    <section style="padding:60px 20px;max-width:1000px;margin:0 auto;">
      <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Our Features</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:30px;">
        <div style="text-align:center;padding:30px;">
          <div style="font-size:3rem;margin-bottom:15px;">&#9889;</div>
          <h3 style="margin-bottom:10px;" contenteditable="true">Fast</h3>
          <p style="color:#6b7280;" contenteditable="true">Lightning fast performance</p>
        </div>
        <div style="text-align:center;padding:30px;">
          <div style="font-size:3rem;margin-bottom:15px;">&#128737;</div>
          <h3 style="margin-bottom:10px;" contenteditable="true">Secure</h3>
          <p style="color:#6b7280;" contenteditable="true">Enterprise-grade security</p>
        </div>
        <div style="text-align:center;padding:30px;">
          <div style="font-size:3rem;margin-bottom:15px;">&#128142;</div>
          <h3 style="margin-bottom:10px;" contenteditable="true">Premium</h3>
          <p style="color:#6b7280;" contenteditable="true">Premium quality service</p>
        </div>
      </div>
    </section>
  `,
  cta: `
    <section style="background:#1f2937;color:white;padding:60px 20px;text-align:center;">
      <h2 style="font-size:2rem;margin-bottom:15px;" contenteditable="true">Ready to Get Started?</h2>
      <p style="opacity:0.8;margin-bottom:30px;" contenteditable="true">Join thousands of satisfied customers today</p>
      <button style="background:#10b981;color:white;padding:15px 40px;border:none;border-radius:30px;font-weight:700;cursor:pointer;" contenteditable="true">Start Free Trial</button>
    </section>
  `,
  text: `
    <section style="padding:40px 20px;max-width:800px;margin:0 auto;">
      <h2 style="margin-bottom:20px;" contenteditable="true">About Us</h2>
      <p style="line-height:1.8;color:#374151;" contenteditable="true">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    </section>
  `,
  products: buildContentWidgetSection({
    title: 'Our Products',
    configBackground: '#f0f9ff',
    configBorder: '#3b82f6',
    textColor: '#1e40af',
    widgetContainerClass: 'product-widget-container',
    dataEmbed: { type: 'product', limit: 6, columns: 3, layout: 'grid', filter: 'all', ids: [] },
    emptyMessage: 'Product cards will load here...',
    customIdsLabel: 'Product IDs (comma separated):',
    customIdsPlaceholder: 'e.g. 1, 2, 5, 10 or product-slug-1, product-slug-2',
    customIdsHelp: 'Enter product IDs or slugs separated by commas',
    filterOptions: [
      { value: 'all', label: 'All Products', selected: true },
      { value: 'featured', label: 'Featured Only' },
      { value: 'custom', label: 'Custom IDs' }
    ]
  }),
  blogs: buildContentWidgetSection({
    title: 'Latest Blog Posts',
    configBackground: '#f0fdf4',
    configBorder: '#10b981',
    textColor: '#065f46',
    widgetContainerClass: 'blog-widget-container',
    dataEmbed: { type: 'blog', limit: 6, columns: 3, layout: 'grid', filter: 'all', ids: [], showPagination: false },
    emptyMessage: 'Blog cards will load here...',
    customIdsLabel: 'Blog IDs (comma separated):',
    customIdsPlaceholder: 'e.g. 1, 2, 5 or blog-slug-1, blog-slug-2',
    customIdsHelp: 'Enter blog IDs or slugs separated by commas',
    filterOptions: [
      { value: 'all', label: 'All Blogs', selected: true },
      { value: 'custom', label: 'Custom IDs' }
    ]
  }),
  reviews: buildReviewsWidgetSection(),
  forum: `
    <section style="padding:60px 20px;">
      <div style="max-width:1000px;margin:0 auto;">
        <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Community Forum</h2>
        <div id="forum-widget" data-embed='${serializeDataEmbed({ type: 'forum' })}'>
          <p style="text-align:center;color:#6b7280;">Forum questions will load here...</p>
        </div>
      </div>
    </section>
  `,
  footer: `
    <footer style="background:#1f2937;color:white;padding:40px 20px;text-align:center;">
      <p style="margin-bottom:10px;" contenteditable="true">&#169; 2024 Your Company. All rights reserved.</p>
      <p style="opacity:0.7;font-size:0.9rem;" contenteditable="true">Privacy Policy | Terms of Service | Contact</p>
    </footer>
  `,
  faq: `
    <section style="padding:60px 20px;max-width:900px;margin:0 auto;">
      <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Frequently Asked Questions</h2>
      <div class="faq-container" style="display:flex;flex-direction:column;gap:12px;">
        <div class="faq-item" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <button class="faq-toggle" type="button" style="width:100%;padding:18px 20px;background:#f9fafb;border:none;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:1rem;font-weight:600;color:#1f2937;">
            <span class="faq-question" contenteditable="true">How does your service work?</span>
            <span style="transition:transform 0.2s;font-size:1.2rem;">&#9662;</span>
          </button>
          <div class="faq-answer" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;padding:0 20px;">
            <p style="padding:15px 0;color:#6b7280;line-height:1.7;" contenteditable="true">We create personalized video messages for any occasion. Simply choose a package, provide your details, and receive your custom video within the delivery timeframe.</p>
          </div>
        </div>
        <div class="faq-item" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <button class="faq-toggle" type="button" style="width:100%;padding:18px 20px;background:#f9fafb;border:none;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:1rem;font-weight:600;color:#1f2937;">
            <span class="faq-question" contenteditable="true">What is the delivery time?</span>
            <span style="transition:transform 0.2s;font-size:1.2rem;">&#9662;</span>
          </button>
          <div class="faq-answer" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;padding:0 20px;">
            <p style="padding:15px 0;color:#6b7280;line-height:1.7;" contenteditable="true">Standard delivery is 24-72 hours depending on the package and customization options selected.</p>
          </div>
        </div>
        <div class="faq-item" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <button class="faq-toggle" type="button" style="width:100%;padding:18px 20px;background:#f9fafb;border:none;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:1rem;font-weight:600;color:#1f2937;">
            <span class="faq-question" contenteditable="true">Can I request revisions?</span>
            <span style="transition:transform 0.2s;font-size:1.2rem;">&#9662;</span>
          </button>
          <div class="faq-answer" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;padding:0 20px;">
            <p style="padding:15px 0;color:#6b7280;line-height:1.7;" contenteditable="true">Yes, revision policy depends on your package tier. Most packages include at least one free revision.</p>
          </div>
        </div>
      </div>
      <style>.faq-item.open .faq-answer{max-height:500px !important;}.faq-item.open .faq-toggle span:last-child{transform:rotate(180deg);}</style>
    </section>
  `,
  columns: `
    <section style="padding:60px 20px;max-width:1200px;margin:0 auto;">
      <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Our Approach</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
        <div style="padding:30px;background:#f9fafb;border-radius:12px;">
          <h3 style="margin-bottom:12px;color:#1f2937;" contenteditable="true">Column One</h3>
          <p style="color:#6b7280;line-height:1.7;" contenteditable="true">Add your content here. This is a two-column layout that works great for comparing features, showing before/after, or organizing related content side by side.</p>
        </div>
        <div style="padding:30px;background:#f9fafb;border-radius:12px;">
          <h3 style="margin-bottom:12px;color:#1f2937;" contenteditable="true">Column Two</h3>
          <p style="color:#6b7280;line-height:1.7;" contenteditable="true">Add your content here. Each column is fully editable. You can add images, text, buttons, or any HTML content inside each column.</p>
        </div>
      </div>
    </section>
  `,
  imagetext: `
    <section style="padding:60px 20px;max-width:1200px;margin:0 auto;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center;">
        <div style="border-radius:16px;overflow:hidden;background:#f3f4f6;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;">
          <img src="https://via.placeholder.com/600x450?text=Your+Image" alt="Feature image" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
        </div>
        <div>
          <h2 style="font-size:2rem;margin-bottom:16px;color:#1f2937;" contenteditable="true">Tell Your Story</h2>
          <p style="color:#6b7280;line-height:1.8;margin-bottom:20px;" contenteditable="true">Combine images with text to create compelling narratives. This layout is perfect for about sections, feature highlights, or product showcases.</p>
          <a href="/products" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;" contenteditable="true">Learn More</a>
        </div>
      </div>
    </section>
  `,
  gallery: `
    <section style="padding:60px 20px;max-width:1200px;margin:0 auto;">
      <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Gallery</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        <div style="border-radius:12px;overflow:hidden;aspect-ratio:1;background:#f3f4f6;"><img src="https://via.placeholder.com/400x400?text=Photo+1" alt="Gallery 1" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>
        <div style="border-radius:12px;overflow:hidden;aspect-ratio:1;background:#f3f4f6;"><img src="https://via.placeholder.com/400x400?text=Photo+2" alt="Gallery 2" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>
        <div style="border-radius:12px;overflow:hidden;aspect-ratio:1;background:#f3f4f6;"><img src="https://via.placeholder.com/400x400?text=Photo+3" alt="Gallery 3" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>
        <div style="border-radius:12px;overflow:hidden;aspect-ratio:1;background:#f3f4f6;"><img src="https://via.placeholder.com/400x400?text=Photo+4" alt="Gallery 4" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>
        <div style="border-radius:12px;overflow:hidden;aspect-ratio:1;background:#f3f4f6;"><img src="https://via.placeholder.com/400x400?text=Photo+5" alt="Gallery 5" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>
        <div style="border-radius:12px;overflow:hidden;aspect-ratio:1;background:#f3f4f6;"><img src="https://via.placeholder.com/400x400?text=Photo+6" alt="Gallery 6" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>
      </div>
    </section>
  `,
  video: `
    <section style="padding:60px 20px;max-width:900px;margin:0 auto;text-align:center;">
      <h2 style="font-size:2rem;margin-bottom:30px;" contenteditable="true">Watch Our Story</h2>
      <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:16px;overflow:hidden;background:#000;">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Video" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      <p style="margin-top:20px;color:#6b7280;" contenteditable="true">Replace the embed URL above with your own YouTube or Vimeo video</p>
    </section>
  `,
  testimonials: `
    <section style="padding:60px 20px;background:#f9fafb;">
      <div style="max-width:1100px;margin:0 auto;">
        <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">What Our Customers Say</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
          <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="color:#fbbf24;font-size:1.2rem;margin-bottom:12px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p style="color:#4b5563;line-height:1.7;margin-bottom:16px;" contenteditable="true">"Absolutely amazing! The video was perfect for my mom's birthday. She cried happy tears!"</p>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">S</div>
              <div><div style="font-weight:600;color:#1f2937;" contenteditable="true">Sarah M.</div><div style="font-size:0.85rem;color:#9ca3af;" contenteditable="true">Birthday Gift</div></div>
            </div>
          </div>
          <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="color:#fbbf24;font-size:1.2rem;margin-bottom:12px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p style="color:#4b5563;line-height:1.7;margin-bottom:16px;" contenteditable="true">"Fast delivery and incredible quality. Will definitely order again for our anniversary!"</p>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#f093fb,#f5576c);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">J</div>
              <div><div style="font-weight:600;color:#1f2937;" contenteditable="true">James R.</div><div style="font-size:0.85rem;color:#9ca3af;" contenteditable="true">Anniversary</div></div>
            </div>
          </div>
          <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="color:#fbbf24;font-size:1.2rem;margin-bottom:12px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p style="color:#4b5563;line-height:1.7;margin-bottom:16px;" contenteditable="true">"Used it for a corporate event and everyone loved it. Professional and fun!"</p>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">A</div>
              <div><div style="font-weight:600;color:#1f2937;" contenteditable="true">Alex K.</div><div style="font-size:0.85rem;color:#9ca3af;" contenteditable="true">Corporate Event</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  stats: `
    <section style="padding:60px 20px;background:linear-gradient(135deg,#1f2937 0%,#374151 100%);color:white;">
      <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:30px;text-align:center;">
        <div>
          <div style="font-size:3rem;font-weight:800;margin-bottom:8px;" contenteditable="true">500+</div>
          <div style="opacity:0.8;font-size:1rem;" contenteditable="true">Happy Customers</div>
        </div>
        <div>
          <div style="font-size:3rem;font-weight:800;margin-bottom:8px;" contenteditable="true">4.9/5</div>
          <div style="opacity:0.8;font-size:1rem;" contenteditable="true">Average Rating</div>
        </div>
        <div>
          <div style="font-size:3rem;font-weight:800;margin-bottom:8px;" contenteditable="true">24h</div>
          <div style="opacity:0.8;font-size:1rem;" contenteditable="true">Avg Delivery</div>
        </div>
        <div>
          <div style="font-size:3rem;font-weight:800;margin-bottom:8px;" contenteditable="true">50+</div>
          <div style="opacity:0.8;font-size:1rem;" contenteditable="true">Occasions Covered</div>
        </div>
      </div>
    </section>
  `,
  logos: `
    <section style="padding:40px 20px;background:#f9fafb;">
      <div style="max-width:1000px;margin:0 auto;text-align:center;">
        <p style="font-size:0.9rem;color:#9ca3af;margin-bottom:24px;text-transform:uppercase;letter-spacing:0.05em;" contenteditable="true">Trusted by leading brands</p>
        <div style="display:flex;justify-content:center;align-items:center;gap:40px;flex-wrap:wrap;opacity:0.5;">
          <div style="font-size:1.5rem;font-weight:700;color:#374151;" contenteditable="true">Brand 1</div>
          <div style="font-size:1.5rem;font-weight:700;color:#374151;" contenteditable="true">Brand 2</div>
          <div style="font-size:1.5rem;font-weight:700;color:#374151;" contenteditable="true">Brand 3</div>
          <div style="font-size:1.5rem;font-weight:700;color:#374151;" contenteditable="true">Brand 4</div>
          <div style="font-size:1.5rem;font-weight:700;color:#374151;" contenteditable="true">Brand 5</div>
        </div>
      </div>
    </section>
  `,
  countdown: `
    <section style="padding:60px 20px;background:linear-gradient(135deg,#ef4444 0%,#f97316 100%);color:white;text-align:center;">
      <h2 style="font-size:2rem;margin-bottom:10px;" contenteditable="true">Limited Time Offer!</h2>
      <p style="opacity:0.9;margin-bottom:30px;" contenteditable="true">Don't miss out on this exclusive deal</p>
      <div class="countdown-timer" data-end="" style="display:flex;justify-content:center;gap:20px;margin-bottom:30px;">
        <div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:16px 24px;min-width:80px;">
          <div class="countdown-days" style="font-size:2.5rem;font-weight:800;">07</div>
          <div style="font-size:0.8rem;opacity:0.8;">Days</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:16px 24px;min-width:80px;">
          <div class="countdown-hours" style="font-size:2.5rem;font-weight:800;">12</div>
          <div style="font-size:0.8rem;opacity:0.8;">Hours</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:16px 24px;min-width:80px;">
          <div class="countdown-mins" style="font-size:2.5rem;font-weight:800;">30</div>
          <div style="font-size:0.8rem;opacity:0.8;">Minutes</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:16px 24px;min-width:80px;">
          <div class="countdown-secs" style="font-size:2.5rem;font-weight:800;">00</div>
          <div style="font-size:0.8rem;opacity:0.8;">Seconds</div>
        </div>
      </div>
      <a href="/products" style="display:inline-block;background:white;color:#ef4444;padding:14px 32px;border-radius:30px;font-weight:700;text-decoration:none;font-size:1.1rem;" contenteditable="true">Shop Now</a>
    </section>
  `,
  banner: `
    <section style="background:#eff6ff;border:1px solid #bfdbfe;padding:16px 24px;display:flex;align-items:center;justify-content:center;gap:12px;">
      <span style="font-size:1.2rem;">&#128227;</span>
      <p style="margin:0;color:#1e40af;font-weight:600;" contenteditable="true">Free shipping on all orders over $50! Use code FREESHIP at checkout.</p>
      <a href="/products" style="background:#3b82f6;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600;font-size:0.85rem;white-space:nowrap;" contenteditable="true">Shop Now</a>
    </section>
  `,
  divider: `
    <section style="padding:20px 0;">
      <hr style="max-width:200px;margin:0 auto;border:none;border-top:2px solid #e5e7eb;">
    </section>
  `,
  custom: `
    <section style="padding:40px 20px;text-align:center;">
      <p style="color:#6b7280;" contenteditable="true">Custom HTML section - Click code button to edit</p>
    </section>
  `
};

export function getSectionMarkup(type, featureImageUrl = '') {
  if (type === 'hero') {
    return buildHeroSection(featureImageUrl.trim());
  }
  return SECTIONS[type];
}
