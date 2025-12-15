import "./MediaTab.css";
import { Dropzone } from "../../../../ui/components/Dropzone.js";
import { Input } from "../../../../ui/components/Input.js";
import { listMedia, uploadMedia } from "./media.logic.js";

export async function render(ctx) {
  const el = document.createElement("div");
  el.className = "col";

  if (!ctx.productId) {
    el.innerHTML = `<div class="small">Create product first in <b>Basic Info</b>.</div>`;
    return el;
  }

  const alt = Input({ label: "Alt text (optional)", placeholder: "Image description" });

  const dz = Dropzone({
    title: "Upload image/video",
    note: "Uploads to R2 via the Worker. Allowed: image or video.",
    accept: "image/*,video/*",
    onPick: async (file) => {
      const kind = file.type.startsWith("video/") ? "video" : "image";
      await uploadMedia(ctx.productId, file, kind, alt.querySelector("input").value);
      await refresh();
    },
  });

  const list = document.createElement("div");
  list.className = "mediaList";

  async function refresh() {
    list.innerHTML = `<div class="small">Loading...</div>`;
    const r = await listMedia(ctx.productId);
    if (!r.ok) {
      list.innerHTML = `<div class="small">Failed: ${r.error}</div>`;
      return;
    }
    list.innerHTML = "";
    for (const m of r.data) {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `<div>
          <div><b>${m.kind}</b> <span class="k">${m.r2_key}</span></div>
          <div class="k">${m.alt || ""}</div>
        </div>
        <div class="k">${new Date(m.created_at).toLocaleString()}</div>`;
      list.appendChild(item);
    }
    if (r.data.length === 0) list.innerHTML = `<div class="small">No media yet.</div>`;
  }

  el.appendChild(alt);
  el.appendChild(dz);
  el.appendChild(list);

  await refresh();
  return el;
}
