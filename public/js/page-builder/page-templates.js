function serializeDataEmbed(config) {
  return JSON.stringify(config).replace(/'/g, '&#39;');
}

function buildProductWidgetContainer(config, message = 'Product cards will load here...') {
  return `<div class="product-widget-container" data-embed='${serializeDataEmbed(config)}'>
    <p style="text-align:center;color:#6b7280;">${message}</p>
  </div>`;
}

function buildBlogWidgetContainer(config, message = 'Blog cards will load here...') {
  return `<div class="blog-widget-container" data-embed='${serializeDataEmbed(config)}'>
    <p style="text-align:center;color:#6b7280;">${message}</p>
  </div>`;
}

function buildForumArchiveContent() {
  return `
    <section style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:50px 20px;text-align:center;">
      <h1 style="font-size:2.5rem;margin-bottom:10px;">Community Forum</h1>
      <p style="opacity:0.9;">Ask questions and share knowledge</p>
    </section>
    <section style="padding:40px 20px;">
      <div data-page-builder-forum-archive="true" style="max-width:1000px;margin:0 auto;">
        <div data-forum-questions style="margin-bottom:40px;">
          <p style="text-align:center;color:#6b7280;padding:20px;">Forum questions will load here...</p>
        </div>
        <div data-forum-pagination style="display:flex;justify-content:center;gap:8px;margin-bottom:30px;"></div>
        <div style="background:white;border-radius:16px;padding:30px;box-shadow:0 4px 15px rgba(0,0,0,0.08);">
          <h3 style="margin-bottom:20px;">Ask a Question</h3>
          <form data-forum-ask-form style="display:flex;flex-direction:column;gap:15px;">
            <input type="text" data-forum-name placeholder="Your Name" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;">
            <input type="email" data-forum-email placeholder="Your Email" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;">
            <input type="text" data-forum-title placeholder="Question Title" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;">
            <textarea data-forum-content placeholder="Describe your question in detail..." rows="4" required style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;resize:vertical;"></textarea>
            <button type="submit" data-forum-submit style="background:#10b981;color:white;padding:14px;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;">Submit Question</button>
            <div data-forum-ask-message style="display:none;padding:12px;border-radius:8px;text-align:center;"></div>
          </form>
        </div>
      </div>
    </section>
  `;
}

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
        <h1 style="font-size:2.5rem;margin-bottom:10px;">Blog</h1>
        <p style="opacity:0.9;">Latest articles and updates</p>
      </section>
      <section style="padding:40px 20px;">
        <div style="max-width:1200px;margin:0 auto;">
          ${buildBlogWidgetContainer({
            type: 'blog',
            limit: 30,
            columns: 3,
            layout: 'grid',
            filter: 'all',
            ids: [],
            showPagination: true
          })}
        </div>
      </section>
    `
  },
  forum_archive: {
    title: 'Forum',
    slug: 'forum',
    type: 'forum_archive',
    content: buildForumArchiveContent()
  },
  product_grid: {
    title: 'Products',
    slug: 'products',
    type: 'product_grid',
    content: `
      <section style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:50px 20px;text-align:center;">
        <h1 style="font-size:2.5rem;margin-bottom:10px;">Our Products</h1>
        <p style="opacity:0.9;">Browse our amazing collection</p>
      </section>
      <section style="padding:40px 20px;">
        <div style="max-width:1200px;margin:0 auto;">
          ${buildProductWidgetContainer({
            type: 'product',
            limit: 30,
            columns: 3,
            layout: 'grid',
            filter: 'all',
            ids: []
          })}
        </div>
      </section>
    `
  }
};

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
          ${buildProductWidgetContainer({
            type: 'product',
            limit: 8,
            columns: 4,
            layout: 'grid',
            filter: 'all',
            ids: []
          })}
        </div>
      </section>
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
          ${buildBlogWidgetContainer({
            type: 'blog',
            limit: 12,
            columns: 3,
            layout: 'grid',
            filter: 'all',
            ids: [],
            showPagination: true
          })}
        </div>
      </section>
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
          ${buildProductWidgetContainer({
            type: 'product',
            limit: 24,
            columns: 4,
            layout: 'grid',
            filter: 'all',
            ids: []
          })}
        </div>
      </section>
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
