import { Connector } from "../../core/connector.js";
import { Tabs } from "../../ui/components/Tabs.js";

export function ProductFormPage() {
  const wrap = document.createElement("div");
  wrap.className = "col";

  const head = document.createElement("div");
  head.innerHTML = `<div class="h1">Create Product</div>
    <div class="small">Step 1: Basic Info → Media → Addons → SEO</div>`;

  wrap.appendChild(head);
  wrap.appendChild(document.createElement("div")).className = "hr";

  const connector = new Connector();

  connector.registerTab({
    id: "basic",
    title: "Basic Info",
    load: () => import("./tabs/basicInfo/BasicInfoTab.js"),
  });
  connector.registerTab({
    id: "media",
    title: "Media",
    load: () => import("./tabs/media/MediaTab.js"),
  });
  connector.registerTab({
    id: "addons",
    title: "Addons",
    load: () => import("./tabs/addons/AddonsTab.js"),
  });
  connector.registerTab({
    id: "seo",
    title: "SEO",
    load: () => import("./tabs/seo/SeoTab.js"),
  });

  const ctx = {
    productId: "",
    setProductId(id) { ctx.productId = id; },
  };

  wrap.appendChild(Tabs({ tabs: connector.getTabs(), ctx }));
  return wrap;
}
