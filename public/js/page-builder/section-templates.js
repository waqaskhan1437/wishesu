function serializeDataEmbed(config) {
  return JSON.stringify(config).replace(/'/g, '&#39;');
}

function buildSelectOptions(options) {
  return options.map(option => (
    `<option value="${option.value}"${option.selected ? ' selected' : ''}>${option.label}</option>`
  )).join('');
}

function buildSelectControl(className, theme, options) {
  return `<select class="pb-widget-select pb-widget-theme-control pb-widget-theme--${theme} ${className}">
    ${buildSelectOptions(options)}
  </select>`;
}

function buildInlineField(label, theme, control, extraClasses = '') {
  return `<label class="pb-widget-field pb-widget-theme-text pb-widget-theme--${theme}${extraClasses ? ` ${extraClasses}` : ''}">
    ${label}
    ${control}
  </label>`;
}

function buildContentWidgetSection({
  title,
  theme,
  widgetContainerClass,
  dataEmbed,
  emptyMessage,
  customIdsLabel,
  customIdsPlaceholder,
  customIdsHelp,
  filterOptions
}) {
  const fields = [
    buildInlineField('Layout:', theme, buildSelectControl('widget-layout', theme, [
      { value: 'grid', label: 'Grid', selected: true },
      { value: 'slider', label: 'Slider' }
    ])),
    buildInlineField('Columns:', theme, buildSelectControl('widget-columns', theme, [
      { value: '2', label: '2' },
      { value: '3', label: '3', selected: true },
      { value: '4', label: '4' }
    ])),
    buildInlineField('Limit:', theme, `${buildSelectControl('widget-limit-select', theme, [
      { value: '3', label: '3' },
      { value: '6', label: '6', selected: true },
      { value: '9', label: '9' },
      { value: '12', label: '12' },
      { value: 'custom', label: 'Custom' }
    ])}
    <input type="number" class="widget-limit-custom pb-widget-input pb-widget-input--compact pb-widget-theme-control pb-widget-theme--${theme}" min="1" max="50" placeholder="e.g. 20" hidden>`),
    buildInlineField('Filter:', theme, buildSelectControl('widget-filter', theme, filterOptions))
  ];

  return `
    <section class="widget-section pb-section-shell">
      <div class="pb-content-shell">
        <h2 class="pb-section-heading" contenteditable="true">${title}</h2>
        <div class="widget-config pb-widget-config pb-widget-config--${theme}">
          <div class="pb-widget-controls">
            ${fields.join('')}
          </div>
          <div class="widget-custom-ids pb-widget-custom-ids" hidden>
            <label class="pb-widget-help-label pb-widget-theme-text pb-widget-theme--${theme}">
              ${customIdsLabel}
            </label>
            <input type="text" class="widget-ids-input pb-widget-input pb-widget-theme-control pb-widget-theme--${theme}" placeholder="${customIdsPlaceholder}">
            <small class="pb-widget-help-text">${customIdsHelp}</small>
          </div>
        </div>
        <div class="${widgetContainerClass}" data-embed='${serializeDataEmbed(dataEmbed)}'>
          <p class="pb-widget-empty">${emptyMessage}</p>
        </div>
      </div>
    </section>
  `;
}

function buildReviewsWidgetSection() {
  return `
    <section class="widget-section pb-section-shell pb-section-shell--alt">
      <div class="pb-content-shell">
        <h2 class="pb-section-heading" contenteditable="true">Customer Reviews</h2>
        <div class="widget-config pb-widget-config pb-widget-config--review">
          <div class="pb-widget-controls">
            ${buildInlineField('Min Rating:', 'review', buildSelectControl('widget-min-rating', 'review', [
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
              { value: '5', label: '5 only', selected: true }
            ]))}
            ${buildInlineField('Columns:', 'review', buildSelectControl('widget-columns', 'review', [
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3', selected: true }
            ]))}
            ${buildInlineField('Limit:', 'review', `${buildSelectControl('widget-limit-select', 'review', [
              { value: '3', label: '3' },
              { value: '6', label: '6', selected: true },
              { value: '9', label: '9' },
              { value: '12', label: '12' },
              { value: 'custom', label: 'Custom' }
            ])}
            <input type="number" class="widget-limit-custom pb-widget-input pb-widget-input--compact pb-widget-theme-control pb-widget-theme--review" min="1" max="50" placeholder="e.g. 20" hidden>`)}
            ${buildInlineField('Product ID:', 'review', '<input type="text" class="widget-product-id pb-widget-input pb-widget-input--narrow pb-widget-theme-control pb-widget-theme--review" placeholder="Optional">')}
            <label class="pb-widget-field pb-widget-field--checkbox pb-widget-theme-text pb-widget-theme--review">
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
          <p class="pb-widget-empty">Review cards will load here...</p>
        </div>
      </div>
    </section>
  `;
}

function buildDefaultHeroSection() {
  return `
    <section class="pbx-0001">
      <h1 contenteditable="true" class="pbx-0002">Welcome to Our Site</h1>
      <p contenteditable="true" class="pbx-0003">Create amazing pages with our easy-to-use builder</p>
      <button contenteditable="true" class="pbx-0004">Get Started</button>
    </section>
  `;
}

function buildHeroSection(featureImageUrl) {
  if (!featureImageUrl) return buildDefaultHeroSection();

  return `<section class="pbx-0005">
    <img src="${featureImageUrl}" alt="Hero background" fetchpriority="high" width="1200" height="630" class="pbx-0006">
    <div class="pbx-0007"></div>
    <div class="pbx-0008">
      <h1 contenteditable="true" class="pbx-0002">Welcome to Our Site</h1>
      <p contenteditable="true" class="pbx-0003">Create amazing pages with our easy-to-use builder</p>
      <button contenteditable="true" class="pbx-0009">Get Started</button>
    </div>
  </section>`;
}

const SECTIONS = {
  hero: buildDefaultHeroSection(),
  features: `
    <section class="pbx-0010">
      <h2 contenteditable="true" class="pbx-0011">Our Features</h2>
      <div class="pbx-0012">
        <div class="pbx-0013">
          <div class="pbx-0014">&#9889;</div>
          <h3 contenteditable="true" class="pbx-0015">Fast</h3>
          <p contenteditable="true" class="pbx-0016">Lightning fast performance</p>
        </div>
        <div class="pbx-0013">
          <div class="pbx-0014">&#128737;</div>
          <h3 contenteditable="true" class="pbx-0015">Secure</h3>
          <p contenteditable="true" class="pbx-0016">Enterprise-grade security</p>
        </div>
        <div class="pbx-0013">
          <div class="pbx-0014">&#128142;</div>
          <h3 contenteditable="true" class="pbx-0015">Premium</h3>
          <p contenteditable="true" class="pbx-0016">Premium quality service</p>
        </div>
      </div>
    </section>
  `,
  cta: `
    <section class="pbx-0017">
      <h2 contenteditable="true" class="pbx-0018">Ready to Get Started?</h2>
      <p contenteditable="true" class="pbx-0019">Join thousands of satisfied customers today</p>
      <button contenteditable="true" class="pbx-0020">Start Free Trial</button>
    </section>
  `,
  text: `
    <section class="pbx-0021">
      <h2 contenteditable="true" class="pbx-0022">About Us</h2>
      <p contenteditable="true" class="pbx-0023">Welcome to our website! We provide the best service in the industry. Our goal is to make sure our customers are 100% satisfied with our high-quality products.</p>
    </section>
  `,
  products: buildContentWidgetSection({
    title: 'Our Products',
    theme: 'product',
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
    theme: 'blog',
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
    <section class="pbx-0024">
      <div class="pbx-0025">
        <h2 contenteditable="true" class="pbx-0011">Community Forum</h2>
        <div id="forum-widget" data-embed='${serializeDataEmbed({ type: 'forum' })}'>
          <p class="pbx-0026">Forum questions will load here...</p>
        </div>
      </div>
    </section>
  `,
  footer: `
    <footer class="pbx-0027">
      <p contenteditable="true" class="pbx-0015">&#169; 2024 Your Company. All rights reserved.</p>
      <p contenteditable="true" class="pbx-0028">Privacy Policy | Terms of Service | Contact</p>
    </footer>
  `,
  faq: `
    <section class="pbx-0029">
      <h2 contenteditable="true" class="pbx-0011">Frequently Asked Questions</h2>
      <div class="faq-container pbx-0030">
        <div class="faq-item pbx-0031">
          <button class="faq-toggle pbx-0032" type="button">
            <span class="faq-question" contenteditable="true">How does your service work?</span>
            <span class="pbx-0033">&#9662;</span>
          </button>
          <div class="faq-answer pbx-0034">
            <p contenteditable="true" class="pbx-0035">We create personalized video messages for any occasion. Simply choose a package, provide your details, and receive your custom video within the delivery timeframe.</p>
          </div>
        </div>
        <div class="faq-item pbx-0031">
          <button class="faq-toggle pbx-0032" type="button">
            <span class="faq-question" contenteditable="true">What is the delivery time?</span>
            <span class="pbx-0033">&#9662;</span>
          </button>
          <div class="faq-answer pbx-0034">
            <p contenteditable="true" class="pbx-0035">Standard delivery is 24-72 hours depending on the package and customization options selected.</p>
          </div>
        </div>
        <div class="faq-item pbx-0031">
          <button class="faq-toggle pbx-0032" type="button">
            <span class="faq-question" contenteditable="true">Can I request revisions?</span>
            <span class="pbx-0033">&#9662;</span>
          </button>
          <div class="faq-answer pbx-0034">
            <p contenteditable="true" class="pbx-0035">Yes, revision policy depends on your package tier. Most packages include at least one free revision.</p>
          </div>
        </div>
      </div>
    </section>
  `,
  columns: `
    <section class="pbx-0036">
      <h2 contenteditable="true" class="pbx-0011">Our Approach</h2>
      <div class="pbx-0037">
        <div class="pbx-0038">
          <h3 contenteditable="true" class="pbx-0039">Column One</h3>
          <p contenteditable="true" class="pbx-0040">Add your content here. This is a two-column layout that works great for comparing features, showing before/after, or organizing related content side by side.</p>
        </div>
        <div class="pbx-0038">
          <h3 contenteditable="true" class="pbx-0039">Column Two</h3>
          <p contenteditable="true" class="pbx-0040">Add your content here. Each column is fully editable. You can add images, text, buttons, or any HTML content inside each column.</p>
        </div>
      </div>
    </section>
  `,
  imagetext: `
    <section class="pbx-0036">
      <div class="pbx-0041">
        <div class="pbx-0042">
          <img src="https://via.placeholder.com/600x450?text=Your+Image" alt="Feature image" loading="lazy" class="pbx-0043">
        </div>
        <div>
          <h2 contenteditable="true" class="pbx-0044">Tell Your Story</h2>
          <p contenteditable="true" class="pbx-0045">Combine images with text to create compelling narratives. This layout is perfect for about sections, feature highlights, or product showcases.</p>
          <a href="/products" contenteditable="true" class="pbx-0046">Learn More</a>
        </div>
      </div>
    </section>
  `,
  gallery: `
    <section class="pbx-0036">
      <h2 contenteditable="true" class="pbx-0011">Gallery</h2>
      <div class="pbx-0047">
        <div class="pbx-0048"><img src="https://via.placeholder.com/400x400?text=Photo+1" alt="Gallery 1" loading="lazy" class="pbx-0043"></div>
        <div class="pbx-0048"><img src="https://via.placeholder.com/400x400?text=Photo+2" alt="Gallery 2" loading="lazy" class="pbx-0043"></div>
        <div class="pbx-0048"><img src="https://via.placeholder.com/400x400?text=Photo+3" alt="Gallery 3" loading="lazy" class="pbx-0043"></div>
        <div class="pbx-0048"><img src="https://via.placeholder.com/400x400?text=Photo+4" alt="Gallery 4" loading="lazy" class="pbx-0043"></div>
        <div class="pbx-0048"><img src="https://via.placeholder.com/400x400?text=Photo+5" alt="Gallery 5" loading="lazy" class="pbx-0043"></div>
        <div class="pbx-0048"><img src="https://via.placeholder.com/400x400?text=Photo+6" alt="Gallery 6" loading="lazy" class="pbx-0043"></div>
      </div>
    </section>
  `,
  video: `
    <section class="pbx-0049">
      <h2 contenteditable="true" class="pbx-0050">Watch Our Story</h2>
      <div class="pbx-0051">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Video" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy" class="pbx-0052"></iframe>
      </div>
      <p contenteditable="true" class="pbx-0053">Replace the embed URL above with your own YouTube or Vimeo video</p>
    </section>
  `,
  testimonials: `
    <section class="pbx-0054">
      <div class="pbx-0055">
        <h2 contenteditable="true" class="pbx-0011">What Our Customers Say</h2>
        <div class="pbx-0056">
          <div class="pbx-0057">
            <div class="pbx-0058">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p contenteditable="true" class="pbx-0059">"Absolutely amazing! The video was perfect for my mom's birthday. She cried happy tears!"</p>
            <div class="pbx-0060">
              <div class="pbx-0061">S</div>
              <div><div contenteditable="true" class="pbx-0062">Sarah M.</div><div contenteditable="true" class="pbx-0063">Birthday Gift</div></div>
            </div>
          </div>
          <div class="pbx-0057">
            <div class="pbx-0058">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p contenteditable="true" class="pbx-0059">"Fast delivery and incredible quality. Will definitely order again for our anniversary!"</p>
            <div class="pbx-0060">
              <div class="pbx-0064">J</div>
              <div><div contenteditable="true" class="pbx-0062">James R.</div><div contenteditable="true" class="pbx-0063">Anniversary</div></div>
            </div>
          </div>
          <div class="pbx-0057">
            <div class="pbx-0058">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p contenteditable="true" class="pbx-0059">"Used it for a corporate event and everyone loved it. Professional and fun!"</p>
            <div class="pbx-0060">
              <div class="pbx-0065">A</div>
              <div><div contenteditable="true" class="pbx-0062">Alex K.</div><div contenteditable="true" class="pbx-0063">Corporate Event</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  stats: `
    <section class="pbx-0066">
      <div class="pbx-0067">
        <div>
          <div contenteditable="true" class="pbx-0068">500+</div>
          <div contenteditable="true" class="pbx-0069">Happy Customers</div>
        </div>
        <div>
          <div contenteditable="true" class="pbx-0068">4.9/5</div>
          <div contenteditable="true" class="pbx-0069">Average Rating</div>
        </div>
        <div>
          <div contenteditable="true" class="pbx-0068">24h</div>
          <div contenteditable="true" class="pbx-0069">Avg Delivery</div>
        </div>
        <div>
          <div contenteditable="true" class="pbx-0068">50+</div>
          <div contenteditable="true" class="pbx-0069">Occasions Covered</div>
        </div>
      </div>
    </section>
  `,
  logos: `
    <section class="pbx-0070">
      <div class="pbx-0071">
        <p contenteditable="true" class="pbx-0072">Trusted by leading brands</p>
        <div class="pbx-0073">
          <div contenteditable="true" class="pbx-0074">Brand 1</div>
          <div contenteditable="true" class="pbx-0074">Brand 2</div>
          <div contenteditable="true" class="pbx-0074">Brand 3</div>
          <div contenteditable="true" class="pbx-0074">Brand 4</div>
          <div contenteditable="true" class="pbx-0074">Brand 5</div>
        </div>
      </div>
    </section>
  `,
  countdown: `
    <section class="pbx-0075">
      <h2 contenteditable="true" class="pbx-0076">Limited Time Offer!</h2>
      <p contenteditable="true" class="pbx-0077">Don't miss out on this exclusive deal</p>
      <div class="countdown-timer pbx-0078" data-end="">
        <div class="pbx-0079">
          <div class="countdown-days pbx-0080">07</div>
          <div class="pbx-0081">Days</div>
        </div>
        <div class="pbx-0079">
          <div class="countdown-hours pbx-0080">12</div>
          <div class="pbx-0081">Hours</div>
        </div>
        <div class="pbx-0079">
          <div class="countdown-mins pbx-0080">30</div>
          <div class="pbx-0081">Minutes</div>
        </div>
        <div class="pbx-0079">
          <div class="countdown-secs pbx-0080">00</div>
          <div class="pbx-0081">Seconds</div>
        </div>
      </div>
      <a href="/products" contenteditable="true" class="pbx-0082">Shop Now</a>
    </section>
  `,
  banner: `
    <section class="pbx-0083">
      <span class="pbx-0084">&#128227;</span>
      <p contenteditable="true" class="pbx-0085">Free shipping on all orders over $50! Use code FREESHIP at checkout.</p>
      <a href="/products" contenteditable="true" class="pbx-0086">Shop Now</a>
    </section>
  `,
  divider: `
    <section class="pbx-0087">
      <hr class="pbx-0088">
    </section>
  `,
  custom: `
    <section class="pbx-0089">
      <p contenteditable="true" class="pbx-0016">Custom HTML section - Click code button to edit</p>
    </section>
  `
};

export function getSectionMarkup(type, featureImageUrl = '') {
  if (type === 'hero') {
    return buildHeroSection(featureImageUrl.trim());
  }
  return SECTIONS[type];
}
