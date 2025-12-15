import "./BasicInfoTab.css";
import { Input, Textarea } from "../../../../ui/components/Input.js";
import { createProduct } from "./basicInfo.logic.js";

export async function render(ctx) {
  const el = document.createElement("div");
  el.className = "col";

  const title = Input({ label: "Title", placeholder: "My Product" });
  const slug = Input({ label: "Slug", placeholder: "my-product", help: "Unique. Used in URLs." });
  const price = Input({ label: "Price (integer)", placeholder: "4999", help: "Example: 4999 = $49.99" });
  const currency = Input({ label: "Currency", placeholder: "USD" });
  const desc = Textarea({ label: "Description", placeholder: "Short details..." });

  const actions = document.createElement("div");
  actions.className = "actions";

  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Create draft";

  const note = document.createElement("div");
  note.className = "note";
  note.textContent = "After create, use other tabs to upload media, addons, and SEO.";

  const msg = document.createElement("div");
  msg.className = "msg";

  btn.addEventListener("click", async () => {
    msg.textContent = "Saving...";
    msg.className = "msg";

    const input = {
      title: title.querySelector("input").value.trim(),
      slug: slug.querySelector("input").value.trim(),
      price: Number(price.querySelector("input").value || 0) || undefined,
      currency: currency.querySelector("input").value.trim() || "USD",
      description: desc.querySelector("textarea").value,
    };

    const r = await createProduct(input);
    if (!r.ok) {
      msg.textContent = r.error || "Failed";
      msg.className = "msg bad";
      return;
    }
    ctx.setProductId(r.data.id);
    msg.textContent = `Created: ${r.data.id} (draft)`;
    msg.className = "msg ok";
  });

  actions.appendChild(btn);

  el.appendChild(title);
  el.appendChild(slug);
  el.appendChild(desc);

  const grid = document.createElement("div");
  grid.className = "grid";
  grid.appendChild(price);
  grid.appendChild(currency);
  el.appendChild(grid);

  el.appendChild(actions);
  el.appendChild(note);
  el.appendChild(msg);
  return el;
}
