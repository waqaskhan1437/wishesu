export function getSectionMarkup(type, featureImageUrl = '') {
  if (type === 'hero' && featureImageUrl) {
      const featureImg = featureImageUrl.trim();
      if (featureImg) {
        return `<section style="position:relative;color:white;padding:80px 20px;text-align:center;min-height:300px;overflow:hidden;">
          <img src="${featureImg}" alt="Hero background" fetchpriority="high" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;" width="1200" height="630">
          <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:1;"></div>
          <div style="position:relative;z-index:2;">
            <h1 style="font-size:3rem;margin-bottom:20px;font-weight:700;" contenteditable="true">Welcome to Our Site</h1>
            <p style="font-size:1.2rem;opacity:0.9;max-width:600px;margin:0 auto 30px;" contenteditable="true">Create amazing pages with our easy-to-use builder</p>
            <button style="background:white;color:#333;padding:15px 40px;border:none;border-radius:30px;font-weight:700;font-size:1rem;cursor:pointer;" contenteditable="true">Get Started</button>
          </div>
        </section>`;
      }
  }
  return SECTIONS[type];
}

const SECTIONS = {
      hero: `
        <section style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:80px 20px;text-align:center;">
          <h1 style="font-size:3rem;margin-bottom:20px;font-weight:700;" contenteditable="true">Welcome to Our Site</h1>
          <p style="font-size:1.2rem;opacity:0.9;max-width:600px;margin:0 auto 30px;" contenteditable="true">Create amazing pages with our easy-to-use builder</p>
          <button style="background:white;color:#667eea;padding:15px 40px;border:none;border-radius:30px;font-weight:700;font-size:1rem;cursor:pointer;" contenteditable="true">Get Started</button>
        </section>
      `,
      features: `
        <section style="padding:60px 20px;max-width:1000px;margin:0 auto;">
          <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Our Features</h2>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:30px;">
            <div style="text-align:center;padding:30px;">
              <div style="font-size:3rem;margin-bottom:15px;">⚡</div>
              <h3 style="margin-bottom:10px;" contenteditable="true">Fast</h3>
              <p style="color:#6b7280;" contenteditable="true">Lightning fast performance</p>
            </div>
            <div style="text-align:center;padding:30px;">
              <div style="font-size:3rem;margin-bottom:15px;">🛡️</div>
              <h3 style="margin-bottom:10px;" contenteditable="true">Secure</h3>
              <p style="color:#6b7280;" contenteditable="true">Enterprise-grade security</p>
            </div>
            <div style="text-align:center;padding:30px;">
              <div style="font-size:3rem;margin-bottom:15px;">💎</div>
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
      products: `
        <section class="widget-section" style="padding:60px 20px;">
          <div style="max-width:1200px;margin:0 auto;">
            <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Our Products</h2>
            <div class="widget-config" style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:12px;padding:20px;margin-bottom:20px;">
              <div style="display:flex;flex-wrap:wrap;gap:15px;align-items:center;">
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#1e40af;">
                  📊 Layout:
                  <select class="widget-layout" style="padding:8px 12px;border:2px solid #3b82f6;border-radius:6px;font-size:0.85rem;">
                    <option value="grid">Grid</option>
                    <option value="slider">Slider</option>
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#1e40af;">
                  🔢 Columns:
                  <select class="widget-columns" style="padding:8px 12px;border:2px solid #3b82f6;border-radius:6px;font-size:0.85rem;">
                    <option value="2">2</option>
                    <option value="3" selected>3</option>
                    <option value="4">4</option>
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#1e40af;">
                  📦 Limit:
                  <select class="widget-limit-select" style="padding:8px 12px;border:2px solid #3b82f6;border-radius:6px;font-size:0.85rem;">
                    <option value="3">3</option>
                    <option value="6" selected>6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input type="number" class="widget-limit-custom" min="1" max="50" placeholder="e.g. 20" style="display:none;width:70px;padding:8px;border:2px solid #3b82f6;border-radius:6px;font-size:0.85rem;">
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#1e40af;">
                  🏷️ Filter:
                  <select class="widget-filter" style="padding:8px 12px;border:2px solid #3b82f6;border-radius:6px;font-size:0.85rem;">
                    <option value="all">All Products</option>
                    <option value="featured">Featured Only</option>
                    <option value="custom">Custom IDs</option>
                  </select>
                </label>
              </div>
              <div class="widget-custom-ids" style="display:none;margin-top:15px;">
                <label style="font-size:0.9rem;font-weight:600;color:#1e40af;display:block;margin-bottom:8px;">
                  🎯 Product IDs (comma separated):
                </label>
                <input type="text" class="widget-ids-input" placeholder="e.g. 1, 2, 5, 10 or product-slug-1, product-slug-2" style="width:100%;padding:10px;border:2px solid #3b82f6;border-radius:6px;font-size:0.85rem;">
                <small style="color:#6b7280;display:block;margin-top:5px;">Enter product IDs or slugs separated by commas</small>
              </div>
            </div>
            <div class="product-widget-container" data-embed='{"type":"product","limit":6,"columns":3,"layout":"grid","filter":"all","ids":[]}'>
              <p style="text-align:center;color:#6b7280;">Product cards will load here...</p>
            </div>
          </div>
        </section>
      `,
      blogs: `
        <section class="widget-section" style="padding:60px 20px;">
          <div style="max-width:1200px;margin:0 auto;">
            <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Latest Blog Posts</h2>
            <div class="widget-config" style="background:#f0fdf4;border:2px dashed #10b981;border-radius:12px;padding:20px;margin-bottom:20px;">
              <div style="display:flex;flex-wrap:wrap;gap:15px;align-items:center;">
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#065f46;">
                  📊 Layout:
                  <select class="widget-layout" style="padding:8px 12px;border:2px solid #10b981;border-radius:6px;font-size:0.85rem;">
                    <option value="grid">Grid</option>
                    <option value="slider">Slider</option>
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#065f46;">
                  🔢 Columns:
                  <select class="widget-columns" style="padding:8px 12px;border:2px solid #10b981;border-radius:6px;font-size:0.85rem;">
                    <option value="2">2</option>
                    <option value="3" selected>3</option>
                    <option value="4">4</option>
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#065f46;">
                  📦 Limit:
                  <select class="widget-limit-select" style="padding:8px 12px;border:2px solid #10b981;border-radius:6px;font-size:0.85rem;">
                    <option value="3">3</option>
                    <option value="6" selected>6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input type="number" class="widget-limit-custom" min="1" max="50" placeholder="e.g. 20" style="display:none;width:70px;padding:8px;border:2px solid #10b981;border-radius:6px;font-size:0.85rem;">
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#065f46;">
                  🏷️ Filter:
                  <select class="widget-filter" style="padding:8px 12px;border:2px solid #10b981;border-radius:6px;font-size:0.85rem;">
                    <option value="all">All Blogs</option>
                    <option value="custom">Custom IDs</option>
                  </select>
                </label>
              </div>
              <div class="widget-custom-ids" style="display:none;margin-top:15px;">
                <label style="font-size:0.9rem;font-weight:600;color:#065f46;display:block;margin-bottom:8px;">
                  🎯 Blog IDs (comma separated):
                </label>
                <input type="text" class="widget-ids-input" placeholder="e.g. 1, 2, 5 or blog-slug-1, blog-slug-2" style="width:100%;padding:10px;border:2px solid #10b981;border-radius:6px;font-size:0.85rem;">
                <small style="color:#6b7280;display:block;margin-top:5px;">Enter blog IDs or slugs separated by commas</small>
              </div>
            </div>
            <div class="blog-widget-container" data-embed='{"type":"blog","limit":6,"columns":3,"layout":"grid","filter":"all","ids":[]}'>
              <p style="text-align:center;color:#6b7280;">Blog cards will load here...</p>
            </div>
          </div>
        </section>
      `,
      reviews: `
        <section class="widget-section" style="padding:60px 20px;background:#f8fafc;">
          <div style="max-width:1200px;margin:0 auto;">
            <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Customer Reviews</h2>
            <div class="widget-config" style="background:#fff7ed;border:2px dashed #f97316;border-radius:12px;padding:20px;margin-bottom:20px;">
              <div style="display:flex;flex-wrap:wrap;gap:15px;align-items:center;">
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#9a3412;">
                  â­ Min Rating:
                  <select class="widget-min-rating" style="padding:8px 12px;border:2px solid #f97316;border-radius:6px;font-size:0.85rem;">
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5" selected>5 only</option>
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#9a3412;">
                  ðŸ”¢ Columns:
                  <select class="widget-columns" style="padding:8px 12px;border:2px solid #f97316;border-radius:6px;font-size:0.85rem;">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3" selected>3</option>
                  </select>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#9a3412;">
                  ðŸ“¦ Limit:
                  <select class="widget-limit-select" style="padding:8px 12px;border:2px solid #f97316;border-radius:6px;font-size:0.85rem;">
                    <option value="3">3</option>
                    <option value="6" selected>6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="custom">Custom</option>
                  </select>
                  <input type="number" class="widget-limit-custom" min="1" max="50" placeholder="e.g. 20" style="display:none;width:70px;padding:8px;border:2px solid #f97316;border-radius:6px;font-size:0.85rem;">
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#9a3412;">
                  Product ID:
                  <input type="text" class="widget-product-id" placeholder="Optional" style="width:110px;padding:8px 12px;border:2px solid #f97316;border-radius:6px;font-size:0.85rem;">
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;font-weight:600;color:#9a3412;">
                  <input type="checkbox" class="widget-show-avatar" checked>
                  Show Avatar
                </label>
              </div>
            </div>
            <div class="reviews-widget-container" data-embed='{"type":"review","limit":6,"columns":3,"minRating":5,"showAvatar":true}'>
              <p style="text-align:center;color:#6b7280;">Review cards will load here...</p>
            </div>
          </div>
        </section>
      `,
      forum: `
        <section style="padding:60px 20px;">
          <div style="max-width:1000px;margin:0 auto;">
            <h2 style="text-align:center;font-size:2rem;margin-bottom:40px;" contenteditable="true">Community Forum</h2>
            <div id="forum-widget" data-embed='{"type":"forum"}'>
              <p style="text-align:center;color:#6b7280;">Forum questions will load here...</p>
            </div>
          </div>
        </section>
      `,
      footer: `
        <footer style="background:#1f2937;color:white;padding:40px 20px;text-align:center;">
          <p style="margin-bottom:10px;" contenteditable="true">© 2024 Your Company. All rights reserved.</p>
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

    // Full Page Templates
const BASE_TEMPLATES = {
      home: {
        title: 'Home',
        slug: 'home',
        type: 'home',
        sections: ['hero', 'features', 'products', 'cta', 'footer']
      },
      blog_archive: {
        title: 'Blog',
        slug: 'blog',
        type: 'blog_archive',
        content: `
          <section style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:50px 20px;text-align:center;">
            <h1 style="font-size:2.5rem;margin-bottom:10px;">📝 Blog</h1>
            <p style="opacity:0.9;">Latest articles and updates</p>
          </section>
          <section style="padding:40px 20px;">
            <div style="max-width:1200px;margin:0 auto;">
              <div id="blog-archive-container"></div>
            </div>
          </section>
          <script>
            if (typeof BlogCards !== 'undefined') {
              BlogCards.render('blog-archive-container', { limit: 30, pagination: true });
            }
          <\/script>
        `
      },
      forum_archive: {
        title: 'Forum',
        slug: 'forum',
        type: 'forum_archive',
        content: `
          <section style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:50px 20px;text-align:center;">
            <h1 style="font-size:2.5rem;margin-bottom:10px;">💬 Community Forum</h1>
            <p style="opacity:0.9;">Ask questions and share knowledge</p>
          </section>
          <section style="padding:40px 20px;">
            <div style="max-width:1000px;margin:0 auto;">
              <!-- Questions List -->
              <div id="forum-questions-container" style="margin-bottom:40px;"></div>
              
              <!-- Pagination -->
              <div id="forum-pagination" style="display:flex;justify-content:center;gap:8px;margin-bottom:30px;"></div>
              
              <!-- Ask Question Form at Bottom -->
              <div id="ask-question-box" style="background:white;border-radius:16px;padding:30px;box-shadow:0 4px 15px rgba(0,0,0,0.08);">
                <h3 style="margin-bottom:20px;">❓ Ask a Question</h3>
                <form id="quick-ask-form" style="display:flex;flex-direction:column;gap:15px;">
                  <input type="text" id="q-name" placeholder="Your Name" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;">
                  <input type="email" id="q-email" placeholder="Your Email" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;">
                  <input type="text" id="q-title" placeholder="Question Title" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;">
                  <textarea id="q-content" placeholder="Describe your question in detail..." rows="4" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;resize:vertical;"></textarea>
                  <button type="submit" style="background:#10b981;color:white;padding:14px;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;">Submit Question</button>
                  <div id="ask-message" style="display:none;padding:12px;border-radius:8px;text-align:center;"></div>
                </form>
              </div>
            </div>
          </section>
          <script>
            var currentPage = 1;
            var totalPages = 1;
            
            document.getElementById('quick-ask-form').addEventListener('submit', async function(e) {
              e.preventDefault();
              const msg = document.getElementById('ask-message');
              const btn = this.querySelector('button[type="submit"]');
              const data = {
                name: document.getElementById('q-name').value.trim(),
                email: document.getElementById('q-email').value.trim(),
                title: document.getElementById('q-title').value.trim(),
                content: document.getElementById('q-content').value.trim()
              };
              if (!data.name || !data.email || !data.title || !data.content) {
                msg.style.display = 'block';
                msg.style.background = '#fee2e2';
                msg.style.color = '#991b1b';
                msg.textContent = 'Please fill all fields';
                return;
              }
              btn.disabled = true;
              btn.textContent = 'Submitting...';
              try {
                const res = await fetch('/api/forum/submit-question', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) {
                  msg.style.display = 'block';
                  msg.style.background = '#d1fae5';
                  msg.style.color = '#065f46';
                  msg.textContent = '✅ Question submitted! It will appear after approval.';
                  this.reset();
                } else {
                  msg.style.display = 'block';
                  msg.style.background = '#fee2e2';
                  msg.style.color = '#991b1b';
                  msg.textContent = result.error || 'Failed to submit';
                }
              } catch (err) {
                msg.style.display = 'block';
                msg.style.background = '#fee2e2';
                msg.style.color = '#991b1b';
                msg.textContent = 'Error. Please try again.';
              }
              btn.disabled = false;
              btn.textContent = 'Submit Question';
            });
            
            async function loadForumQuestions(page) {
              currentPage = page || 1;
              const container = document.getElementById('forum-questions-container');
              container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading questions...</p>';
              try {
                const res = await fetch('/api/forum/questions?limit=20&page=' + currentPage);
                const data = await res.json();
                if (data.questions && data.questions.length > 0) {
                  totalPages = data.pagination.totalPages || 1;
                  container.innerHTML = '<h3 style="margin-bottom:20px;color:#1f2937;">Recent Questions</h3>' + data.questions.map(q => {
                    var preview = (q.content || '').substring(0, 150);
                    if ((q.content || '').length > 150) preview += '...';
                    var questionHref = q.slug ? '/forum/' + encodeURIComponent(q.slug) : '/forum/question.html?id=' + encodeURIComponent(q.id);
                    return '<a href="' + questionHref + '" style="display:block;background:white;border-radius:12px;padding:20px;margin-bottom:15px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-decoration:none;transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform=\\'translateY(-2px)\\';this.style.boxShadow=\\'0 4px 15px rgba(0,0,0,0.1)\\';" onmouseout="this.style.transform=\\'none\\';this.style.boxShadow=\\'0 2px 8px rgba(0,0,0,0.06)\\';"><h4 style="color:#1f2937;margin-bottom:8px;font-size:1.1rem;">' + escapeHtml(q.title) + '</h4><p style="color:#6b7280;font-size:0.9rem;line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(preview) + '</p><div style="display:flex;gap:15px;font-size:0.85rem;color:#9ca3af;"><span>👤 ' + escapeHtml(q.name) + '</span><span>💬 ' + (q.reply_count || 0) + ' replies</span></div></a>';
                  }).join('');
                  renderPagination();
                } else {
                  container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:40px;background:white;border-radius:12px;">No questions yet. Be the first to ask!</p>';
                  document.getElementById('forum-pagination').innerHTML = '';
                }
              } catch (e) { 
                container.innerHTML = '<p style="text-align:center;color:#ef4444;">Error loading questions</p>'; 
              }
            }
            
            function renderPagination() {
              var pag = document.getElementById('forum-pagination');
              if (totalPages <= 1) { pag.innerHTML = ''; return; }
              var html = '';
              if (currentPage > 1) {
                html += '<button onclick="loadForumQuestions(' + (currentPage-1) + ')" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">← Prev</button>';
              }
              for (var i = 1; i <= totalPages; i++) {
                if (i === currentPage) {
                  html += '<button style="padding:8px 16px;border:none;background:#10b981;color:white;border-radius:8px;">' + i + '</button>';
                } else if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
                  html += '<button onclick="loadForumQuestions(' + i + ')" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">' + i + '</button>';
                } else if (Math.abs(i - currentPage) === 3) {
                  html += '<span style="padding:8px;">...</span>';
                }
              }
              if (currentPage < totalPages) {
                html += '<button onclick="loadForumQuestions(' + (currentPage+1) + ')" style="padding:8px 16px;border:1px solid #e5e7eb;background:white;border-radius:8px;cursor:pointer;">Next →</button>';
              }
              pag.innerHTML = html;
            }
            
            function escapeHtml(t) { if(!t)return ''; var d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
            loadForumQuestions(1);
          <\/script>
        `
      },
      product_grid: {
        title: 'Products',
        slug: 'products',
        type: 'product_grid',
        content: `
          <section style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:50px 20px;text-align:center;">
            <h1 style="font-size:2.5rem;margin-bottom:10px;">🛒 Our Products</h1>
            <p style="opacity:0.9;">Browse our amazing collection</p>
          </section>
          <section style="padding:40px 20px;">
            <div style="max-width:1200px;margin:0 auto;">
              <div id="products-grid-container"></div>
            </div>
          </section>
          <script>
            if (typeof ProductCards !== 'undefined') {
              ProductCards.render('products-grid-container', { limit: 30 });
            }
          <\/script>
        `
      }
    };

    // Advanced templates library (page-focused)
const ADVANCED_TEMPLATES = {
      home: {
        title: 'Home',
        slug: 'home',
        type: 'home',
        content: `
          <section style="background:radial-gradient(900px 420px at 20% 0%,#f59e0b 0%,#ef4444 45%,#111827 100%);color:white;padding:82px 20px;">
            <div style="max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.2fr 0.8fr;gap:18px;align-items:center;">
              <div>
                <p style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.16);margin:0 0 12px;font-size:0.85rem;letter-spacing:0.04em;" contenteditable="true">PERSONALIZED VIDEO WISHES</p>
                <h1 style="font-size:clamp(2rem,4vw,3.3rem);margin:0 0 12px;line-height:1.12;" contenteditable="true">Make every celebration unforgettable</h1>
                <p style="margin:0 0 22px;opacity:0.92;max-width:620px;line-height:1.7;" contenteditable="true">Custom birthday, anniversary and surprise videos delivered with premium quality and fast turnaround.</p>
                <div style="display:flex;flex-wrap:wrap;gap:10px;">
                  <a href="#home-products" style="background:white;color:#111827;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none;">Start Custom Order</a>
                  <a href="/forum" style="background:transparent;color:white;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none;border:1px solid rgba(255,255,255,0.45);">Ask Questions</a>
                </div>
              </div>
              <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:18px;padding:20px;display:grid;gap:10px;">
                <div style="display:flex;justify-content:space-between;"><span>Average delivery</span><strong>24-72 hours</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Video quality</span><strong>HD 1080p</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Personalization</span><strong>100% custom</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Support</span><strong>24/7 help</strong></div>
              </div>
            </div>
          </section>
          <section style="padding:34px 20px;background:#fff;">
            <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;"><strong style="display:block;font-size:1.4rem;color:#9a3412;">500+</strong><span style="color:#7c2d12;">Completed wishes</span></div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;"><strong style="display:block;font-size:1.4rem;color:#1d4ed8;">4.9/5</strong><span style="color:#1e3a8a;">Client satisfaction</span></div>
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:16px;"><strong style="display:block;font-size:1.4rem;color:#047857;">50+</strong><span style="color:#065f46;">Occasions covered</span></div>
              <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;padding:16px;"><strong style="display:block;font-size:1.4rem;color:#6d28d9;">Global</strong><span style="color:#5b21b6;">Worldwide delivery</span></div>
            </div>
          </section>
          <section id="home-products" style="padding:66px 20px;background:white;">
            <div style="max-width:1200px;margin:0 auto;">
              <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:22px;">
                <div>
                  <h2 style="margin:0 0 8px;font-size:2rem;" contenteditable="true">Featured offerings</h2>
                  <p style="margin:0;color:#6b7280;" contenteditable="true">Premium templates for birthdays and surprise reveals</p>
                </div>
                <a href="/products" style="text-decoration:none;font-weight:700;color:#ea580c;">See all products</a>
              </div>
              <div id="home-featured-products"></div>
            </div>
          </section>
          <script>
            if (typeof ProductCards !== 'undefined') {
              ProductCards.render('home-featured-products', { limit: 8, layout: 'grid', columns: 4 });
            }
          <\/script>
        `
      },
      blog_archive: {
        title: 'Blog',
        slug: 'blog',
        type: 'blog_archive',
        content: `
          <section style="background:linear-gradient(130deg,#111827 0%,#1d4ed8 60%,#06b6d4 100%);color:white;padding:72px 20px;">
            <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:16px;align-items:center;">
              <div>
                <p style="font-size:0.82rem;letter-spacing:0.04em;margin:0 0 10px;opacity:0.85;" contenteditable="true">INSIGHTS AND STORYTELLING</p>
                <h1 style="font-size:clamp(2rem,3.8vw,3.1rem);margin:0 0 12px;" contenteditable="true">Ideas to craft unforgettable wishes</h1>
                <p style="margin:0;opacity:0.92;line-height:1.7;max-width:580px;" contenteditable="true">Publishing strategy, scripts and occasion tips to help your brand convert better.</p>
              </div>
              <div style="background:rgba(255,255,255,0.1);padding:18px;border-radius:16px;border:1px solid rgba(255,255,255,0.2);display:flex;flex-wrap:wrap;gap:8px;">
                <span style="padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.14);">Birthday ideas</span>
                <span style="padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.14);">Video scripts</span>
                <span style="padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.14);">Customer stories</span>
              </div>
            </div>
          </section>
          <section style="padding:62px 20px;background:#f8fafc;">
            <div style="max-width:1200px;margin:0 auto;">
              <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:22px;">
                <h2 style="margin:0;font-size:1.9rem;" contenteditable="true">Latest articles</h2>
                <p style="margin:0;color:#6b7280;" contenteditable="true">Fresh content for creators and buyers</p>
              </div>
              <div id="blog-archive-container"></div>
            </div>
          </section>
          <script>
            if (typeof BlogCards !== 'undefined') {
              BlogCards.render('blog-archive-container', { limit: 12, pagination: true, columns: 3, layout: 'grid' });
            }
          <\/script>
        `
      },
      product_grid: {
        title: 'Products',
        slug: 'products',
        type: 'product_grid',
        content: `
          <section style="background:linear-gradient(120deg,#7c2d12 0%,#ea580c 55%,#f97316 100%);color:white;padding:76px 20px;">
            <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:16px;align-items:center;">
              <div>
                <p style="font-size:0.82rem;letter-spacing:0.05em;margin:0 0 10px;opacity:0.85;" contenteditable="true">PRODUCT CATALOG</p>
                <h1 style="font-size:clamp(2rem,3.8vw,3.1rem);margin:0 0 12px;" contenteditable="true">Choose the perfect custom video package</h1>
                <p style="margin:0;opacity:0.9;line-height:1.7;max-width:620px;" contenteditable="true">From quick shout-outs to premium story-led videos with add-ons and rush delivery.</p>
              </div>
              <div style="background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);border-radius:18px;padding:18px;display:grid;gap:10px;">
                <div style="display:flex;justify-content:space-between;"><span>Formats</span><strong>Vertical + Horizontal</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Add-ons</span><strong>Music, subtitles, branding</strong></div>
                <div style="display:flex;justify-content:space-between;"><span>Support</span><strong>Revision available</strong></div>
              </div>
            </div>
          </section>
          <section style="padding:66px 20px;background:white;">
            <div style="max-width:1200px;margin:0 auto;">
              <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:24px;">
                <h2 style="margin:0;font-size:2rem;" contenteditable="true">All packages</h2>
                <p style="margin:0;color:#6b7280;" contenteditable="true">Pick a package and customize from checkout add-ons</p>
              </div>
              <div id="products-grid-container"></div>
            </div>
          </section>
          <script>
            if (typeof ProductCards !== 'undefined') {
              ProductCards.render('products-grid-container', { limit: 24, layout: 'grid', columns: 4 });
            }
          <\/script>
        `
      },
      occasion_campaign: {
        title: 'Birthday Wishes Landing',
        slug: 'birthday-wishes',
        type: 'custom',
        content: `
          <section style="background:linear-gradient(120deg,#ec4899 0%,#f97316 45%,#facc15 100%);padding:86px 20px;color:white;text-align:center;">
            <h1 style="font-size:clamp(2rem,4vw,3.2rem);margin:0 0 14px;" contenteditable="true">Birthday video wishes that feel truly personal</h1>
            <p style="max-width:720px;margin:0 auto 24px;line-height:1.7;" contenteditable="true">Turn every birthday into a share-worthy memory with premium templates and expressive storytelling.</p>
            <a href="/products" style="display:inline-block;background:white;color:#be185d;padding:13px 22px;border-radius:999px;font-weight:700;text-decoration:none;">Explore Birthday Packages</a>
          </section>
        `
      },
      about_story: {
        title: 'About Us',
        slug: 'about-us',
        type: 'custom',
        content: `
          <section style="padding:84px 20px;background:linear-gradient(120deg,#0f172a 0%,#1e293b 45%,#334155 100%);color:white;">
            <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:18px;align-items:center;">
              <div>
                <h1 style="font-size:clamp(2rem,4vw,3.1rem);margin:0 0 14px;" contenteditable="true">We create personalized videos that connect people</h1>
                <p style="margin:0;opacity:0.9;line-height:1.7;" contenteditable="true">Our mission is to make every celebration message look cinematic, personal and unforgettable.</p>
              </div>
              <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:18px;padding:20px;">
                <p style="margin:0 0 10px;">Founded for premium personalization</p>
                <p style="margin:0 0 10px;">Built for birthdays, events and business greetings</p>
                <p style="margin:0;">Powered by fast support and quality control</p>
              </div>
            </div>
          </section>
        `
      },
      faq_contact: {
        title: 'FAQ and Contact',
        slug: 'contact-support',
        type: 'custom',
        content: `
          <section style="padding:72px 20px;background:linear-gradient(120deg,#1d4ed8 0%,#2563eb 55%,#0ea5e9 100%);color:white;text-align:center;">
            <h1 style="font-size:clamp(2rem,4vw,3rem);margin:0 0 12px;" contenteditable="true">Questions? We are here to help</h1>
            <p style="max-width:760px;margin:0 auto;line-height:1.7;opacity:0.92;" contenteditable="true">Delivery times, add-ons, revisions and special requests answered in one place.</p>
          </section>
          <section style="padding:64px 20px;background:white;">
            <div style="max-width:960px;margin:0 auto;display:grid;gap:12px;">
              <div style="border:1px solid #dbeafe;border-radius:14px;padding:18px;"><h3 style="margin:0 0 8px;">How long is delivery?</h3><p style="margin:0;color:#6b7280;line-height:1.6;" contenteditable="true">Standard delivery is 24-72 hours depending on package and add-ons.</p></div>
              <div style="border:1px solid #dbeafe;border-radius:14px;padding:18px;"><h3 style="margin:0 0 8px;">Can I request revisions?</h3><p style="margin:0;color:#6b7280;line-height:1.6;" contenteditable="true">Yes, revision policy depends on package tier and change scope.</p></div>
              <div style="border:1px solid #dbeafe;border-radius:14px;padding:18px;"><h3 style="margin:0 0 8px;">Do you support rush orders?</h3><p style="margin:0;color:#6b7280;line-height:1.6;" contenteditable="true">Yes, rush add-on is available for urgent celebrations.</p></div>
            </div>
          </section>
        `
      },
      creator_profile: {
        title: 'Creator Profile',
        slug: 'our-creator',
        type: 'custom',
        content: `
          <section style="padding:82px 20px;background:linear-gradient(120deg,#1f2937 0%,#111827 40%,#0f172a 100%);color:white;">
            <div style="max-width:1050px;margin:0 auto;display:grid;grid-template-columns:0.9fr 1.1fr;gap:20px;align-items:center;">
              <div style="background:#374151;border-radius:22px;min-height:320px;display:flex;align-items:center;justify-content:center;font-size:1rem;color:#d1d5db;">Replace with creator image/video preview</div>
              <div>
                <p style="margin:0 0 8px;opacity:0.8;" contenteditable="true">FEATURED CREATOR</p>
                <h1 style="margin:0 0 12px;font-size:clamp(2rem,3.8vw,3rem);" contenteditable="true">Your performer profile headline</h1>
                <p style="margin:0 0 16px;line-height:1.7;opacity:0.9;" contenteditable="true">Use this page to show style, voice options, language strengths and proof clips for buyer confidence.</p>
              </div>
            </div>
          </section>
        `
      }
    };

export const TEMPLATES = {
  ...BASE_TEMPLATES,
  ...ADVANCED_TEMPLATES
};


