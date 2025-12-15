import "./SeoTab.css";
import { Input, Textarea } from "../../../../ui/components/Input.js";
import { getSeo, saveSeo } from "./seo.logic.js";

export async function render(ctx) {
  const el = document.createElement("div");
  el.className = "col";

  if (!ctx.productId) {
    el.innerHTML = `<div class="small">Create product first in <b>Basic Info</b>.</div>`;
    return el;
  }

  const metaTitle = Input({ label: "Meta title", placeholder: "Product title for search" });
  const metaDesc = Textarea({ label: "Meta description", placeholder: "Short SEO description" });
  const canonical = Input({ label: "Canonical URL", placeholder: "https://example.com/products/my-product" });
  const og = Input({ label: "OG image R2 key (optional)", placeholder: "products/<id>/<key>" });

  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Save SEO";

  const msg = document.createElement("div");
  msg.className = "msg";

  btn.addEventListener("click", async () => {
    msg.textContent = "Saving...";
    msg.className = "msg";
    const r = await saveSeo(ctx.productId, {
      meta_title: metaTitle.querySelector("input").value,
      meta_description: metaDesc.querySelector("textarea").value,
      canonical_url: canonical.querySelector("input").value,
      og_image_r2_key: og.querySelector("input").value,
    });
    if (!r.ok) {
      msg.textContent = r.error || "Failed";
      msg.className = "msg bad";
      return;
    }
    msg.textContent = "Saved.";
    msg.className = "msg ok";
  });

  async function load() {
    const r = await getSeo(ctx.productId);
    if (!r.ok || !r.data) return;
    metaTitle.querySelector("input").value = r.data.meta_title || "";
    metaDesc.querySelector("textarea").value = r.data.meta_description || "";
    canonical.querySelector("input").value = r.data.canonical_url || "";
    og.querySelector("input").value = r.data.og_image_r2_key || "";
  }

  el.appendChild(metaTitle);
  el.appendChild(metaDesc);
  el.appendChild(canonical);
  el.appendChild(og);
  el.appendChild(btn);
  el.appendChild(msg);

  await load();
  return el;
}
