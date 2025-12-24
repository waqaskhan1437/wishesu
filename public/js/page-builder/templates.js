export const SECTION_TEMPLATES = {
      // A simple header template.  You can edit the title and nav links in place.
      header: `
 <header style="padding: 20px; background: #ffffff; border-bottom: 1px solid #e5e7eb;">
 <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
 <h1 style="font-size: 1.5rem; color: #1f2937;">My Site</h1>
 <nav>
 <a href="#" style="margin-right: 15px; color: #3b82f6; text-decoration: none;">Home</a>
 <a href="#" style="margin-right: 15px; color: #3b82f6; text-decoration: none;">Blog</a>
 <a href="#" style="color: #3b82f6; text-decoration: none;">Contact</a>
 </nav>
 </div>
 </header>
      `,
      hero: `
 <section style="padding: 80px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center; color: white;">
 <h1 style="font-size: 3rem; font-weight: bold; margin-bottom: 20px;">Amazing Product</h1>
 <p style="font-size: 1.2rem; margin-bottom: 30px;">Transform your business with our solution</p>
 <a href="#" style="display: inline-block; padding: 15px 40px; background: white; color: #667eea; border-radius: 8px; text-decoration: none; font-weight: bold;">Get Started</a>
 </section>
      `,
      features: `
 <section style="padding: 60px 20px; background: #f9fafb;">
 <div style="max-width: 1200px; margin: 0 auto;">
 <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 50px; color: #1f2937;">Features</h2>
 <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px;">
 <div style="text-align: center; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
 <div style="font-size: 3rem; margin-bottom: 15px;"></div>
 <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #1f2937;">Fast</h3>
 <p style="color: #6b7280;">Lightning fast performance</p>
 </div>
 <div style="text-align: center; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
 <div style="font-size: 3rem; margin-bottom: 15px;"></div>
 <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #1f2937;">Premium</h3>
 <p style="color: #6b7280;">High quality materials</p>
 </div>
 <div style="text-align: center; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
 <div style="font-size: 3rem; margin-bottom: 15px;"></div>
 <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #1f2937;">Secure</h3>
 <p style="color: #6b7280;">Banklevel security</p>
 </div>
 </div>
 </div>
 </section>
      `,
      pricing: `
 <section style="padding: 60px 20px; background: white;">
 <div style="max-width: 1200px; margin: 0 auto;">
 <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 50px; color: #1f2937;">Pricing</h2>
 <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;">
 <div style="padding: 40px; border: 2px solid #e5e7eb; border-radius: 12px; text-align: center;">
 <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #1f2937;">Basic</h3>
 <div style="font-size: 3rem; font-weight: bold; color: #3b82f6; margin: 20px 0;">$29</div>
 <p style="color: #6b7280; margin-bottom: 30px;">Per month</p>
 <a href="#" style="display: block; padding: 12px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Choose Plan</a>
 </div>
 <div style="padding: 40px; border: 2px solid #3b82f6; border-radius: 12px; text-align: center; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);">
 <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #1f2937;">Pro</h3>
 <div style="font-size: 3rem; font-weight: bold; color: #3b82f6; margin: 20px 0;">$59</div>
 <p style="color: #6b7280; margin-bottom: 30px;">Per month</p>
 <a href="#" style="display: block; padding: 12px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Choose Plan</a>
 </div>
 <div style="padding: 40px; border: 2px solid #e5e7eb; border-radius: 12px; text-align: center;">
 <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #1f2937;">Enterprise</h3>
 <div style="font-size: 3rem; font-weight: bold; color: #3b82f6; margin: 20px 0;">$99</div>
 <p style="color: #6b7280; margin-bottom: 30px;">Per month</p>
 <a href="#" style="display: block; padding: 12px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Choose Plan</a>
 </div>
 </div>
 </div>
 </section>
      `,
      cta: `
 <section style="padding: 80px 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); text-align: center;">
 <h2 style="font-size: 2.5rem; color: white; margin-bottom: 20px;">Ready to Get Started?</h2>
 <p style="font-size: 1.2rem; color: white; margin-bottom: 30px; opacity: 0.9;">Join thousands of satisfied customers</p>
 <a href="#" style="display: inline-block; padding: 15px 40px; background: white; color: #f5576c; border-radius: 8px; text-decoration: none; font-weight: bold;">Start Free Trial</a>
 </section>
      `,
      footer: `
 <footer style="padding: 40px 20px; background: #1f2937; color: white; text-align: center;">
 <p>&copy; 2025 Your Company. All rights reserved.</p>
 <div style="margin-top: 20px;">
 <a href="#" style="color: white; margin: 0 10px; text-decoration: none;">Privacy</a>
 <a href="#" style="color: white; margin: 0 10px; text-decoration: none;">Terms</a>
 <a href="#" style="color: white; margin: 0 10px; text-decoration: none;">Contact</a>
 </div>
 </footer>
      `
};
