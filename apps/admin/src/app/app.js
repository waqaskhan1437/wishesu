import { api } from "../core/apiClient.js";
import { AdminLayout } from "../ui/layout/AdminLayout.js";
import { ProductFormPage } from "../features/productForm/ProductFormPage.js";

export function mountApp(root) {
  const layout = AdminLayout();

  root.innerHTML = "";
  root.appendChild(layout.el);

  async function render() {
    const token = api.getToken();
    if (!token) return layout.showLogin();

    const ok = await api.pingMe();
    if (!ok) return layout.showLogin();

    layout.showPage(ProductFormPage());
  }

  layout.onLogin(async (email, password) => {
    const res = await api.login(email, password);
    if (!res.ok) return layout.showError(res.error || "Login failed");
    layout.clearError();
    await render();
  });

  layout.onLogout(() => {
    api.setToken("");
    render();
  });

  render();
}
