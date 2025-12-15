import "./Tabs.css";
import { Loader } from "./Loader.js";

export function Tabs({ tabs, ctx }) {
  const el = document.createElement("div");
  el.className = "tabs";

  const bar = document.createElement("div");
  bar.className = "tabbar";

  const panel = document.createElement("div");
  panel.className = "panel";
  const inner = document.createElement("div");
  inner.className = "panelInner";
  panel.appendChild(inner);

  el.appendChild(bar);
  el.appendChild(panel);

  let active = tabs[0]?.id || "";
  const btns = new Map();

  function setActive(id) {
    active = id;
    for (const [k, b] of btns.entries()) b.classList.toggle("active", k === id);
    renderTab();
  }

  async function renderTab() {
    inner.innerHTML = "";
    inner.appendChild(Loader(7));

    const tab = tabs.find((t) => t.id === active);
    if (!tab) {
      inner.innerHTML = "Missing tab.";
      return;
    }

    try {
      const mod = await tab.load();
      const view = await mod.render(ctx);
      inner.innerHTML = "";
      inner.appendChild(view);
    } catch (e) {
      inner.innerHTML = "";
      const err = document.createElement("div");
      err.textContent = "Failed to load this tab.";
      inner.appendChild(err);
    }
  }

  for (const t of tabs) {
    const b = document.createElement("button");
    b.className = "tabbtn";
    b.textContent = t.title;
    b.addEventListener("click", () => setActive(t.id));
    btns.set(t.id, b);
    bar.appendChild(b);
  }

  setActive(active);
  return el;
}
