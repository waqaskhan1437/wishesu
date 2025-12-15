import "./AddonsTab.css";
import { Input } from "../../../../ui/components/Input.js";
import { listAddons, addAddon } from "./addons.logic.js";

export async function render(ctx) {
  const el = document.createElement("div");
  el.className = "col";

  if (!ctx.productId) {
    el.innerHTML = `<div class="small">Create product first in <b>Basic Info</b>.</div>`;
    return el;
  }

  const name = Input({ label: "Addon name", placeholder: "Gift wrap" });
  const price = Input({ label: "Price delta (integer)", placeholder: "500" });

  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Add addon";

  const grid = document.createElement("div");
  grid.className = "grid";
  grid.appendChild(name);
  grid.appendChild(price);

  const list = document.createElement("div");
  list.className = "list";

  btn.addEventListener("click", async () => {
    await addAddon(ctx.productId, {
      name: name.querySelector("input").value,
      price_delta: Number(price.querySelector("input").value || 0),
    });
    await refresh();
  });

  async function refresh() {
    list.innerHTML = `<div class="small">Loading...</div>`;
    const r = await listAddons(ctx.productId);
    if (!r.ok) {
      list.innerHTML = `<div class="small">Failed: ${r.error}</div>`;
      return;
    }
    list.innerHTML = "";
    for (const a of r.data) {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `<div><b>${a.name}</b><div class="small">price_delta: ${a.price_delta}</div></div>
        <div class="small">${new Date(a.created_at).toLocaleString()}</div>`;
      list.appendChild(item);
    }
    if (r.data.length === 0) list.innerHTML = `<div class="small">No addons yet.</div>`;
  }

  el.appendChild(grid);
  el.appendChild(btn);
  el.appendChild(list);

  await refresh();
  return el;
}
