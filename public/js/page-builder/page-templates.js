function serializeDataEmbed(config) {
  return JSON.stringify(config).replace(/'/g, '&#39;');
}

function buildProductWidgetContainer(config, message = 'Product cards will load here...') {
  return `<div class="product-widget-container" data-embed='${serializeDataEmbed(config)}'>
    <p class="pbx-0026">${message}</p>
  </div>`;
}

function buildBlogWidgetContainer(config, message = 'Blog cards will load here...') {
  return `<div class="blog-widget-container" data-embed='${serializeDataEmbed(config)}'>
    <p class="pbx-0026">${message}</p>
  </div>`;
}

function buildForumArchiveContent() {
  return `
    <section class="pbx-0090">
      <h1 class="pbx-0091">Community Forum</h1>
      <p class="pbx-0092">Ask questions and share knowledge</p>
    </section>
    <section class="pbx-0093">
      <div data-page-builder-forum-archive="true" class="pbx-0025">
        <div data-forum-questions class="pbx-0094">
          <p class="pbx-0095">Forum questions will load here...</p>
        </div>
        <div data-forum-pagination class="pbx-0096"></div>
        <div class="pbx-0097">
          <h3 class="pbx-0022">Ask a Question</h3>
          <form data-forum-ask-form class="pbx-0098">
            <input type="text" data-forum-name placeholder="Your Name" required class="pbx-0099">
            <input type="email" data-forum-email placeholder="Your Email" required class="pbx-0099">
            <input type="text" data-forum-title placeholder="Question Title" required class="pbx-0099">
            <textarea data-forum-content placeholder="Describe your question in detail..." rows="4" required class="pbx-0100"></textarea>
            <button type="submit" data-forum-submit class="pbx-0101">Submit Question</button>
            <div data-forum-ask-message class="page-builder-message" hidden></div>
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
      <section class="pbx-0102">
        <h1 class="pbx-0091">Blog</h1>
        <p class="pbx-0092">Latest articles and updates</p>
      </section>
      <section class="pbx-0093">
        <div class="pbx-0103">
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
      <section class="pbx-0104">
        <h1 class="pbx-0091">Our Products</h1>
        <p class="pbx-0092">Browse our amazing collection</p>
      </section>
      <section class="pbx-0093">
        <div class="pbx-0103">
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
      <section class="pbx-0105">
        <div class="pbx-0106">
          <div>
            <p contenteditable="true" class="pbx-0107">PERSONALIZED VIDEO WISHES</p>
            <h1 contenteditable="true" class="pbx-0108">Make every celebration unforgettable</h1>
            <p contenteditable="true" class="pbx-0109">Custom birthday, anniversary and surprise videos delivered with premium quality and fast turnaround.</p>
            <div class="pbx-0110">
              <a href="#home-products" class="pbx-0111">Start Custom Order</a>
              <a href="/forum" class="pbx-0112">Ask Questions</a>
            </div>
          </div>
          <div class="pbx-0113">
            <div class="pbx-0114"><span>Average delivery</span><strong>24-72 hours</strong></div>
            <div class="pbx-0114"><span>Video quality</span><strong>HD 1080p</strong></div>
            <div class="pbx-0114"><span>Personalization</span><strong>100% custom</strong></div>
            <div class="pbx-0114"><span>Support</span><strong>24/7 help</strong></div>
          </div>
        </div>
      </section>
      <section class="pbx-0115">
        <div class="pbx-0116">
          <div class="pbx-0117"><strong class="pbx-0118">500+</strong><span class="pbx-0119">Completed wishes</span></div>
          <div class="pbx-0120"><strong class="pbx-0121">4.9/5</strong><span class="pbx-0122">Client satisfaction</span></div>
          <div class="pbx-0123"><strong class="pbx-0124">50+</strong><span class="pbx-0125">Occasions covered</span></div>
          <div class="pbx-0126"><strong class="pbx-0127">Global</strong><span class="pbx-0128">Worldwide delivery</span></div>
        </div>
      </section>
      <section id="home-products" class="pbx-0129">
        <div class="pbx-0103">
          <div class="pbx-0130">
            <div>
              <h2 contenteditable="true" class="pbx-0131">Featured offerings</h2>
              <p contenteditable="true" class="pbx-0132">Premium templates for birthdays and surprise reveals</p>
            </div>
            <a href="/products" class="pbx-0133">See all products</a>
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
      <section class="pbx-0134">
        <div class="pbx-0135">
          <div>
            <p contenteditable="true" class="pbx-0136">INSIGHTS AND STORYTELLING</p>
            <h1 contenteditable="true" class="pbx-0137">Ideas to craft unforgettable wishes</h1>
            <p contenteditable="true" class="pbx-0138">Publishing strategy, scripts and occasion tips to help your brand convert better.</p>
          </div>
          <div class="pbx-0139">
            <span class="pbx-0140">Birthday ideas</span>
            <span class="pbx-0140">Video scripts</span>
            <span class="pbx-0140">Customer stories</span>
          </div>
        </div>
      </section>
      <section class="pbx-0141">
        <div class="pbx-0103">
          <div class="pbx-0130">
            <h2 contenteditable="true" class="pbx-0142">Latest articles</h2>
            <p contenteditable="true" class="pbx-0132">Fresh content for creators and buyers</p>
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
      <section class="pbx-0143">
        <div class="pbx-0135">
          <div>
            <p contenteditable="true" class="pbx-0144">PRODUCT CATALOG</p>
            <h1 contenteditable="true" class="pbx-0137">Choose the perfect custom video package</h1>
            <p contenteditable="true" class="pbx-0145">From quick shout-outs to premium story-led videos with add-ons and rush delivery.</p>
          </div>
          <div class="pbx-0146">
            <div class="pbx-0114"><span>Formats</span><strong>Vertical + Horizontal</strong></div>
            <div class="pbx-0114"><span>Add-ons</span><strong>Music, subtitles, branding</strong></div>
            <div class="pbx-0114"><span>Support</span><strong>Revision available</strong></div>
          </div>
        </div>
      </section>
      <section class="pbx-0129">
        <div class="pbx-0103">
          <div class="pbx-0147">
            <h2 contenteditable="true" class="pbx-0148">All packages</h2>
            <p contenteditable="true" class="pbx-0132">Pick a package and customize from checkout add-ons</p>
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
      <section class="pbx-0149">
        <h1 contenteditable="true" class="pbx-0150">Birthday video wishes that feel truly personal</h1>
        <p contenteditable="true" class="pbx-0151">Turn every birthday into a share-worthy memory with premium templates and expressive storytelling.</p>
        <a href="/products" class="pbx-0152">Explore Birthday Packages</a>
      </section>
    `
  },
  about_story: {
    title: 'About Us',
    slug: 'about-us',
    type: 'custom',
    content: `
      <section class="pbx-0153">
        <div class="pbx-0154">
          <div>
            <h1 contenteditable="true" class="pbx-0155">We create personalized videos that connect people</h1>
            <p contenteditable="true" class="pbx-0156">Our mission is to make every celebration message look cinematic, personal and unforgettable.</p>
          </div>
          <div class="pbx-0157">
            <p class="pbx-0158">Founded for premium personalization</p>
            <p class="pbx-0158">Built for birthdays, events and business greetings</p>
            <p class="pbx-0159">Powered by fast support and quality control</p>
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
      <section class="pbx-0160">
        <h1 contenteditable="true" class="pbx-0161">Questions? We are here to help</h1>
        <p contenteditable="true" class="pbx-0162">Delivery times, add-ons, revisions and special requests answered in one place.</p>
      </section>
      <section class="pbx-0163">
        <div class="pbx-0164">
          <div class="pbx-0165"><h3 class="pbx-0166">How long is delivery?</h3><p contenteditable="true" class="pbx-0167">Standard delivery is 24-72 hours depending on package and add-ons.</p></div>
          <div class="pbx-0165"><h3 class="pbx-0166">Can I request revisions?</h3><p contenteditable="true" class="pbx-0167">Yes, revision policy depends on package tier and change scope.</p></div>
          <div class="pbx-0165"><h3 class="pbx-0166">Do you support rush orders?</h3><p contenteditable="true" class="pbx-0167">Yes, rush add-on is available for urgent celebrations.</p></div>
        </div>
      </section>
    `
  },
  creator_profile: {
    title: 'Creator Profile',
    slug: 'our-creator',
    type: 'custom',
    content: `
      <section class="pbx-0168">
        <div class="pbx-0169">
          <div class="pbx-0170">Replace with creator image/video preview</div>
          <div>
            <p contenteditable="true" class="pbx-0171">FEATURED CREATOR</p>
            <h1 contenteditable="true" class="pbx-0172">Your performer profile headline</h1>
            <p contenteditable="true" class="pbx-0173">Use this page to show style, voice options, language strengths and proof clips for buyer confidence.</p>
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
